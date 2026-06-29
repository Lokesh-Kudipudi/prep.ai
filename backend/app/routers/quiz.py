import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.board import Board
from app.models.quiz import Quiz, QuizQuestion
from app.schemas.quiz import QuizCreate, QuizRead, AttemptCreate, AttemptRead
from app.services import quiz_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["quiz"])

@router.post("/boards/{board_id}/quizzes/generate", response_model=QuizRead, status_code=status.HTTP_201_CREATED)
def generate_board_quiz(
    board_id: str,
    payload: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> QuizRead:
    """
    Generates a multiple-choice quiz from the board's indexed sources.
    If an active quiz already exists, it is returned instead.
    """
    # Verify board ownership
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
    
    try:
        quiz = quiz_service.generate_quiz(db, board_id, payload.max_questions)
        
        # Load questions to populate the response
        questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
        quiz.questions = questions
        return quiz
    except ValueError as val_err:
        logger.warning("[router:quiz] Generation failed: %s", val_err)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error("[router:quiz] Internal error during quiz generation: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate quiz due to an unexpected error."
        )


@router.get("/boards/{board_id}/quizzes/active", response_model=QuizRead | None)
def get_active_board_quiz(
    board_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> QuizRead | None:
    """Retrieves the current active quiz for a board, if one exists."""
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
        
    quiz = quiz_service.get_active_quiz(db, board_id)
    if quiz:
        questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
        quiz.questions = questions
    return quiz


@router.get("/quizzes/{quiz_id}", response_model=QuizRead)
def get_quiz_by_id(
    quiz_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> QuizRead:
    """Retrieves a specific quiz and its questions, verifying user ownership."""
    quiz = (
        db.query(Quiz)
        .join(Board, Quiz.board_id == Board.id)
        .filter(Quiz.id == quiz_id, Board.user_id == current_user.id)
        .first()
    )
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or access denied"
        )
        
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    quiz.questions = questions
    return quiz


@router.post("/quizzes/{quiz_id}/attempts", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
def submit_quiz_attempt(
    quiz_id: str,
    payload: AttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> AttemptRead:
    """Submits answers for a quiz, scores it, and returns the attempt summary."""
    # Verify ownership of parent board
    quiz = (
        db.query(Quiz)
        .join(Board, Quiz.board_id == Board.id)
        .filter(Quiz.id == quiz_id, Board.user_id == current_user.id)
        .first()
    )
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or access denied"
        )
        
    try:
        attempt = quiz_service.submit_attempt(db, quiz_id, payload.user_answers)
        return attempt
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
