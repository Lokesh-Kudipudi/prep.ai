import logging
import json
from sqlalchemy.orm import Session
from app.models.tutor import TutorSession, TutorMessage, CodingSubmission
from app.services.agents.tutor_agent import run_tutor_turn
from app.services.agents.reviewer import review_code_submission
from app.services import piston

logger = logging.getLogger(__name__)

async def start_tutor_session(db: Session, board_id: str, topic: str) -> TutorSession:
    """
    Creates a new tutor session, triggers the initial dialogue question
    from Gemini, and returns the session.
    """
    logger.info("[service:tutor] Starting session for board %s, topic: %s", board_id, topic)
    
    # 1. Create and save the session
    session = TutorSession(
        board_id=board_id,
        topic=topic,
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    try:
        # 2. Run the tutor agent for the first turn (empty history)
        turn_data = await run_tutor_turn(board_id, topic, [])
        
        # 3. Create the initial system message
        assignment_str = json.dumps(turn_data["code_task"]) if turn_data["code_task"] else None
        initial_msg = TutorMessage(
            session_id=session.id,
            role="system",
            content=turn_data["message"],
            code_assignment=assignment_str
        )
        db.add(initial_msg)
        db.commit()
        logger.info("[service:tutor] Initial tutor question saved for session %s", session.id)
    except Exception as e:
        logger.error("[service:tutor] Failed to generate first question: %s", e)
        # Add basic fallback message to prevent blank start
        fallback_msg = TutorMessage(
            session_id=session.id,
            role="system",
            content=f"Hello! Let's start learning about {topic}. Tell me, what do you know about this topic so far?"
        )
        db.add(fallback_msg)
        db.commit()
        
    return session


async def send_user_message(db: Session, session_id: str, content: str) -> TutorMessage:
    """
    Appends a user answer, invokes the Tutor Agent, and returns the new tutor response.
    """
    logger.info("[service:tutor] Processing user message for session: %s", session_id)
    
    session = db.query(TutorSession).filter(TutorSession.id == session_id).first()
    if not session:
        raise ValueError("Tutor session not found")
        
    if session.status == "stopped":
        raise ValueError("This tutor session has already been completed.")

    # 1. Save user reply
    user_msg = TutorMessage(
        session_id=session_id,
        role="user",
        content=content
    )
    db.add(user_msg)
    db.commit()

    # 2. Fetch entire history to build LangGraph context
    messages = db.query(TutorMessage).filter(TutorMessage.session_id == session_id).order_by(TutorMessage.created_at.asc()).all()
    history = [
        {"role": m.role, "content": m.content}
        for m in messages
    ]

    # 3. Request next turn from Tutor Agent
    turn_data = await run_tutor_turn(session.board_id, session.topic, history)

    # 4. Save and return tutor response
    assignment_str = json.dumps(turn_data["code_task"]) if turn_data["code_task"] else None
    tutor_msg = TutorMessage(
        session_id=session_id,
        role="system",
        content=turn_data["message"],
        code_assignment=assignment_str
    )
    db.add(tutor_msg)
    db.commit()
    db.refresh(tutor_msg)
    
    return tutor_msg


async def submit_coding_assignment(
    db: Session,
    session_id: str,
    code: str,
    language: str
) -> CodingSubmission:
    """
    Executes user code in Piston, evaluates correctness with Code Reviewer Agent,
    and appends execution outcome & tutor next steps directly to the session messages.
    """
    logger.info("[service:tutor] Evaluating code submission for session: %s", session_id)
    
    session = db.query(TutorSession).filter(TutorSession.id == session_id).first()
    if not session:
        raise ValueError("Tutor session not found")
        
    if session.status == "stopped":
        raise ValueError("Session is completed.")

    # 1. Locate the active task description from the message history
    last_assignment_msg = (
        db.query(TutorMessage)
        .filter(TutorMessage.session_id == session_id, TutorMessage.code_assignment != None)
        .order_by(TutorMessage.created_at.desc())
        .first()
    )
    
    task_desc = "Implement the requested coding task."
    if last_assignment_msg and last_assignment_msg.code_assignment:
        try:
            task_data = json.loads(last_assignment_msg.code_assignment)
            task_desc = f"Title: {task_data.get('title')}\nDescription: {task_data.get('description')}"
        except Exception:
            task_desc = last_assignment_msg.code_assignment

    # 2. Compile/Execute code via Piston
    run_result = await piston.execute_code(language, code)
    
    # 3. Grade submission with Code Reviewer Agent
    review = review_code_submission(
        code=code,
        language=language,
        assignment_desc=task_desc,
        stdout=run_result["stdout"],
        stderr=run_result["stderr"],
        exit_code=run_result["code"]
    )
    
    # 4. Save CodingSubmission record
    db_submission = CodingSubmission(
        session_id=session_id,
        code=code,
        language=language,
        stdout=run_result["stdout"],
        stderr=run_result["stderr"],
        passed=review.passed,
        score=review.score,
        review_feedback=review.feedback
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)

    # 5. Save Reviewer message in thread transcript
    reviewer_msg = TutorMessage(
        session_id=session_id,
        role="reviewer",
        content=review.feedback,
        code_submission=code,
        code_language=language
    )
    db.add(reviewer_msg)
    db.commit()

    # 6. Immediately trigger the next conversational question from Interviewer Agent
    # Fetch full history including the reviewer response we just wrote
    messages = db.query(TutorMessage).filter(TutorMessage.session_id == session_id).order_by(TutorMessage.created_at.asc()).all()
    history = [
        {"role": m.role, "content": m.content}
        for m in messages
    ]
    
    try:
        tutor_turn = await run_tutor_turn(session.board_id, session.topic, history)
        assignment_str = json.dumps(tutor_turn["code_task"]) if tutor_turn["code_task"] else None
        next_tutor_msg = TutorMessage(
            session_id=session_id,
            role="system",
            content=tutor_turn["message"],
            code_assignment=assignment_str
        )
        db.add(next_tutor_msg)
        db.commit()
    except Exception as e:
        logger.error("[service:tutor] Failed to generate tutor next steps after code review: %s", e)
        # Fallback question
        fallback = TutorMessage(
            session_id=session_id,
            role="system",
            content="I've received the evaluation feedback. What questions do you have about these comments, or shall we move to another concept?"
        )
        db.add(fallback)
        db.commit()

    return db_submission
