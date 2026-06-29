import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.board import Board
from app.models.flashcard import Flashcard
from app.schemas.flashcard import FlashcardRead, FlashcardReview
from app.services import flashcard_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["flashcards"])

@router.post("/boards/{board_id}/flashcards/generate", response_model=list[FlashcardRead], status_code=status.HTTP_201_CREATED)
def generate_board_flashcards(
    board_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[FlashcardRead]:
    """Generates a batch of 5-8 new study flashcards from board source contexts."""
    # Verify board ownership
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
    
    try:
        cards = flashcard_service.generate_flashcards(db, board_id)
        return cards
    except ValueError as val_err:
        logger.warning("[router:flashcards] Generation failed: %s", val_err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error("[router:flashcards] Internal error during flashcard generation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate flashcards due to an unexpected error."
        )


@router.get("/boards/{board_id}/flashcards", response_model=list[FlashcardRead])
def list_board_flashcards(
    board_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[FlashcardRead]:
    """Lists all flashcards associated with a workspace board."""
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
        
    cards = db.query(Flashcard).filter(Flashcard.board_id == board_id).order_by(Flashcard.created_at.desc()).all()
    return cards


@router.post("/flashcards/{card_id}/review", response_model=FlashcardRead)
def submit_flashcard_review(
    card_id: str,
    payload: FlashcardReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> FlashcardRead:
    """Updates a card's SRS recall multipliers and review interval using the SM-2 algorithm."""
    # Verify card ownership via board user linkage
    card = (
        db.query(Flashcard)
        .join(Board, Flashcard.board_id == Board.id)
        .filter(Flashcard.id == card_id, Board.user_id == current_user.id)
        .first()
    )
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found or access denied"
        )
        
    try:
        updated_card = flashcard_service.review_flashcard(db, card_id, payload.rating)
        return updated_card
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
