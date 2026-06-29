import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.board import Board
from app.models.chunk import Chunk
from app.models.evaluation import EvaluationRun
from app.schemas.evaluation import EvaluationRunCreate, EvaluationRunRead
from app.services.evaluation_service import run_evaluation_task
from app.database import SessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evaluation", tags=["evaluation"])

@router.get("/runs", response_model=List[EvaluationRunRead])
def list_evaluation_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[EvaluationRunRead]:
    """Retrieve historical evaluation runs for the authenticated user."""
    logger.info("[router:evaluation] Listing evaluation runs for user: %s", current_user.email)
    runs = db.query(EvaluationRun).filter(EvaluationRun.user_id == current_user.id).order_by(EvaluationRun.created_at.desc()).all()
    return runs

@router.post("/runs", response_model=EvaluationRunRead, status_code=status.HTTP_201_CREATED)
def trigger_evaluation_run(
    background_tasks: BackgroundTasks,
    payload: EvaluationRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> EvaluationRunRead:
    """Trigger a new RAG pipeline evaluation run in the background."""
    logger.info("[router:evaluation] Triggering new evaluation run for user: %s", current_user.email)
    
    # 1. Enforce validation check: must have at least one indexed chunk in user's boards
    boards = db.query(Board).filter(Board.user_id == current_user.id).all()
    has_sources = False
    for board in boards:
        has_chunks = db.query(Chunk).filter(Chunk.board_id == board.id).first()
        if has_chunks:
            has_sources = True
            break
            
    if not has_sources:
        logger.warning("[router:evaluation] Trigger rejected: no indexed chunks found for user %s", current_user.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload and index a document in one of your boards first to run evaluation."
        )
    
    # 2. Create the EvaluationRun record
    new_run = EvaluationRun(
        user_id=current_user.id,
        status="pending",
        num_questions=payload.num_questions or 10
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)
    
    # 3. Queue the background task
    background_tasks.add_task(
        run_evaluation_task,
        db_session_factory=SessionLocal,
        run_id=new_run.id,
        user_id=current_user.id
    )
    
    logger.info("[router:evaluation] Queued background evaluation task with run ID: %s", new_run.id)
    return new_run
