import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.board import Board
from app.models.source import Source
from app.schemas.board import BoardCreate, BoardRead, BoardStats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/boards", tags=["boards"])

@router.post("", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
def create_board(
    payload: BoardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BoardRead:
    """Create a new study workspace Board"""
    new_board = Board(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description
    )
    db.add(new_board)
    db.commit()
    db.refresh(new_board)
    logger.info("[router:boards] board created: %s by user %s", new_board.id, current_user.email)
    return new_board


@router.get("", response_model=list[BoardRead])
def list_boards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[BoardRead]:
    """List all study Boards owned by the authenticated user"""
    boards = db.query(Board).filter(Board.user_id == current_user.id).order_by(Board.created_at.desc()).all()
    return boards


@router.get("/stats", response_model=BoardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BoardStats:
    """Retrieve aggregate workspace metrics across all user Boards"""
    # Count user's boards
    active_boards = db.query(Board).filter(Board.user_id == current_user.id).count()
    
    # Count indexed sources across all user's boards
    sources_indexed = (
        db.query(Source)
        .join(Board, Source.board_id == Board.id)
        .filter(Board.user_id == current_user.id, Source.status == "indexed")
        .count()
    )
    
    # Cards reviewed mocked as 0 for now
    cards_reviewed = 0
    
    return BoardStats(
        active_boards=active_boards,
        sources_indexed=sources_indexed,
        cards_reviewed=cards_reviewed
    )


@router.get("/{board_id}", response_model=BoardRead)
def get_board(
    board_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BoardRead:
    """Retrieve details of a specific Board by ID"""
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        logger.warning("[router:boards] board not found: %s for user %s", board_id, current_user.email)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
    return board
