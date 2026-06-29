import logging
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.board import Board
from app.models.source import Source
from app.schemas.source import SourceRead, SourceStatusRead
from app.services.ingestion.pipeline import run_ingestion_task

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sources"])

# Input schema for fetching tech documentation
class TechDocFetch(BaseModel):
    query: str


@router.post("/boards/{board_id}/sources/pdf", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
async def upload_pdf_source(
    board_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SourceRead:
    """Upload a learning source PDF file and queue background parsing"""
    # Verify board ownership
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
    
    # Save the file to disk locally at /app/uploads
    upload_dir = "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_hex = uuid_filename(file.filename)
    save_path = os.path.join(upload_dir, file_hex)
    
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error("[router:sources] Failed to save uploaded PDF: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file on server."
        )
    
    new_source = Source(
        board_id=board_id,
        title=file.filename,
        type="PDF",
        path=f"/uploads/{file_hex}",
        status="pending"
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    
    # Delegate parsing/ingestion to background tasks
    from app.database import SessionLocal
    background_tasks.add_task(
        run_ingestion_task,
        new_source.id,
        SessionLocal
    )
    
    logger.info("[router:sources] PDF source uploaded: %s for board %s", new_source.id, board_id)
    return new_source


@router.post("/boards/{board_id}/sources/fetch", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
async def fetch_tech_docs(
    board_id: str,
    payload: TechDocFetch,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SourceRead:
    """Instruct the web agent scraper to fetch technical documentation"""
    # Verify board ownership
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
    
    # Title is the user query (or target url)
    title = payload.query
    if len(title) > 60:
        title = title[:57] + "..."

    new_source = Source(
        board_id=board_id,
        title=title,
        type="WEB",
        status="pending"
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    
    # Delegate web crawling to background tasks
    from app.database import SessionLocal
    background_tasks.add_task(
        run_ingestion_task,
        new_source.id,
        SessionLocal
    )
    
    logger.info("[router:sources] Tech docs fetch queued: %s for board %s", new_source.id, board_id)
    return new_source


@router.get("/boards/{board_id}/sources", response_model=list[SourceRead])
def list_board_sources(
    board_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[SourceRead]:
    """List all sources added to a specific Board"""
    # Verify board ownership
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
        
    sources = db.query(Source).filter(Source.board_id == board_id).order_by(Source.created_at.desc()).all()
    return sources


@router.get("/sources/{source_id}", response_model=SourceStatusRead)
def get_source_status(
    source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SourceStatusRead:
    """Retrieve status of an ingestion task by source ID"""
    source = (
        db.query(Source)
        .join(Board, Source.board_id == Board.id)
        .filter(Source.id == source_id, Board.user_id == current_user.id)
        .first()
    )
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source task not found or access denied"
        )
    return source


def uuid_filename(filename: str) -> str:
    import uuid
    ext = filename.split(".")[-1] if "." in filename else ""
    return f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
