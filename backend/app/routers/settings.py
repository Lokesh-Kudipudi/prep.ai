import logging
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.board import Board
from app.models.flashcard import Flashcard
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("/integrations")
async def get_integrations_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check health and connection status for external integrations."""
    logger.info("[router:settings] Checking integrations status for user: %s", current_user.email)
    
    # 1. Piston Health check
    piston_status = "Unreachable"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.PISTON_URL}/api/v2/runtimes")
            if resp.status_code == 200:
                piston_status = "Healthy"
    except Exception as e:
        logger.warning("[router:settings] Piston integration health check failed: %s", e)
        
    # 2. LangSmith check
    langsmith_status = "Not configured"
    if settings.LANGSMITH_API_KEY and settings.LANGSMITH_API_KEY.strip():
        langsmith_status = "Connected"
        
    # 3. Anki Export check (based on whether the user has generated any flashcards)
    anki_status = "Not configured"
    try:
        has_cards = db.query(Flashcard).join(Board).filter(Board.user_id == current_user.id).first() is not None
        if has_cards:
            anki_status = "Available"
    except Exception as e:
        logger.warning("[router:settings] Failed to check flashcards for Anki status: %s", e)

    return {
        "piston": piston_status,
        "langsmith": langsmith_status,
        "anki": anki_status
    }
