import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.board import Board
from app.models.tutor import TutorSession, TutorMessage
from app.schemas.tutor import (
    TutorSessionCreate, TutorSessionRead, TutorSessionDetail,
    UserMessageCreate, TutorMessageRead, CodeSubmissionCreate, CodingSubmissionRead
)
from app.services import tutor_service, piston

logger = logging.getLogger(__name__)
router = APIRouter(tags=["tutor"])

@router.post("/boards/{board_id}/tutor/sessions", response_model=TutorSessionRead, status_code=status.HTTP_201_CREATED)
async def create_board_tutor_session(
    board_id: str,
    payload: TutorSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TutorSessionRead:
    """Creates a new interviewer dialogue session for a board topic."""
    # Verify board ownership
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
        
    try:
        session = await tutor_service.start_tutor_session(db, board_id, payload.topic)
        return session
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )


@router.get("/boards/{board_id}/tutor/sessions", response_model=list[TutorSessionRead])
def list_board_tutor_sessions(
    board_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[TutorSessionRead]:
    """Lists all tutor chat sessions associated with a board."""
    board = db.query(Board).filter(Board.id == board_id, Board.user_id == current_user.id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found or access denied"
        )
        
    sessions = db.query(TutorSession).filter(TutorSession.board_id == board_id).order_by(TutorSession.created_at.desc()).all()
    return sessions


@router.get("/tutor/sessions/{session_id}", response_model=TutorSessionDetail)
def get_tutor_session_details(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TutorSessionDetail:
    """Retrieves session details along with complete message logs."""
    # Verify ownership
    session = (
        db.query(TutorSession)
        .join(Board, TutorSession.board_id == Board.id)
        .filter(TutorSession.id == session_id, Board.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor session not found or access denied"
        )
        
    messages = db.query(TutorMessage).filter(TutorMessage.session_id == session_id).order_by(TutorMessage.created_at.asc()).all()
    session.messages = messages
    return session


@router.post("/tutor/sessions/{session_id}/message", response_model=TutorMessageRead, status_code=status.HTTP_201_CREATED)
async def send_reply_to_tutor(
    session_id: str,
    payload: UserMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TutorMessageRead:
    """Sends the user message reply to the active tutor loop and returns tutor next steps."""
    # Verify ownership
    session = (
        db.query(TutorSession)
        .join(Board, TutorSession.board_id == Board.id)
        .filter(TutorSession.id == session_id, Board.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor session not found or access denied"
        )
        
    try:
        tutor_response = await tutor_service.send_user_message(db, session_id, payload.content)
        return tutor_response
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )


@router.post("/tutor/sessions/{session_id}/run-code", response_model=dict)
async def run_assignment_code(
    session_id: str,
    payload: CodeSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Runs code in the Piston sandbox and returns output without saving or reviewing."""
    session = (
        db.query(TutorSession)
        .join(Board, TutorSession.board_id == Board.id)
        .filter(TutorSession.id == session_id, Board.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor session not found or access denied"
        )
        
    run_result = await piston.execute_code(payload.language, payload.code)
    return run_result


@router.post("/tutor/sessions/{session_id}/submit-code", response_model=CodingSubmissionRead, status_code=status.HTTP_201_CREATED)
async def submit_assignment_code(
    session_id: str,
    payload: CodeSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> CodingSubmissionRead:
    """Submits code from sidebar editor, runs it in Piston, and gets Gemini review comments."""
    # Verify ownership
    session = (
        db.query(TutorSession)
        .join(Board, TutorSession.board_id == Board.id)
        .filter(TutorSession.id == session_id, Board.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor session not found or access denied"
        )
        
    try:
        submission = await tutor_service.submit_coding_assignment(
            db=db,
            session_id=session_id,
            code=payload.code,
            language=payload.language
        )
        return submission
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )


@router.post("/tutor/sessions/{session_id}/stop", response_model=TutorSessionRead)
def stop_tutor_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> TutorSessionRead:
    """Marks a tutor chat session as completed and closed."""
    session = (
        db.query(TutorSession)
        .join(Board, TutorSession.board_id == Board.id)
        .filter(TutorSession.id == session_id, Board.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor session not found or access denied"
        )
        
    session.status = "stopped"
    db.commit()
    db.refresh(session)
    logger.info("[router:tutor] Session %s marked as stopped", session_id)
    return session


@router.delete("/tutor/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutor_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a tutor session and all its associated messages/submissions."""
    session = (
        db.query(TutorSession)
        .join(Board, TutorSession.board_id == Board.id)
        .filter(TutorSession.id == session_id, Board.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor session not found or access denied"
        )
        
    db.delete(session)
    db.commit()
    logger.info("[router:tutor] Session %s deleted", session_id)
