import logging
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from google.genai import types

from app.models.flashcard import Flashcard
from app.services.vectorstore import get_retriever
from app.services.agents.gemini_client import client

logger = logging.getLogger(__name__)

# Pydantic schemas for structured Gemini flashcard outputs
class FlashcardSchema(BaseModel):
    front: str = Field(description="The question, prompt, or technical concept on the front.")
    back: str = Field(description="The answer, definition, or code snippet on the back.")

class FlashcardListSchema(BaseModel):
    cards: List[FlashcardSchema] = Field(description="List of flashcards.")


def generate_flashcards(db: Session, board_id: str) -> list[Flashcard]:
    """
    Generates a batch of 5-8 flashcards from the board's indexed sources.
    Excludes topics already covered by existing flashcards.
    """
    logger.info("[service:flashcard] Starting flashcards generation for board %s", board_id)

    # 1. Fetch existing card titles to prevent duplicates
    existing_cards = db.query(Flashcard).filter(Flashcard.board_id == board_id).all()
    existing_fronts = [card.front for card in existing_cards]

    duplicate_instruction = ""
    if existing_fronts:
        existing_list_text = "\n".join([f"- {front}" for front in existing_fronts])
        duplicate_instruction = (
            f"\nCRITICAL: Do NOT generate flashcards covering any of the following already existing concepts:\n"
            f"{existing_list_text}\nFocus on completely different API features, terms, or conceptual details."
        )

    # 2. Retrieve chunks from vector store
    retriever = get_retriever(board_id, top_k=15)
    chunks = retriever.retrieve("Extract definitions, key APIs, terms, and conceptual details.")
    if not chunks:
        raise ValueError("No learning sources found or indexed yet. Please upload a PDF or fetch documentation first.")

    context_text = "\n\n".join([
        f"Source Context:\n{chunk.node.get_content()}"
        for chunk in chunks
    ])

    # 3. Call Gemini to generate card list
    prompt = f"""
You are an expert study assistant. Generate a list of exactly 5 to 8 high-quality study flashcards based on the provided context.

[Context]
{context_text}
{duplicate_instruction}

Instructions:
- Write cards with a clear, concise question/concept on the 'front' and a clear, descriptive answer/definition on the 'back' (which can include short code snippets where appropriate).
- Focus on technical accuracy, API signatures, structural rules, and core concepts.
- Ensure new cards cover concepts distinct from any existing ones listed above.
"""

    try:
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FlashcardListSchema
            )
        )
        parsed_data = FlashcardListSchema.model_validate_json(response.text)
        logger.info("[service:flashcard] Flashcards generated successfully via Gemini")
    except Exception as e:
        logger.error("[service:flashcard] Failed to generate flashcards via Gemini: %s", e)
        raise ValueError(f"Failed to generate flashcards: {str(e)}")

    # 4. Save to database
    db_cards = []
    for c in parsed_data.cards:
        db_card = Flashcard(
            board_id=board_id,
            front=c.front,
            back=c.back
        )
        db.add(db_card)
        db_cards.append(db_card)

    db.commit()
    logger.info("[service:flashcard] Saved %d flashcards to database for board %s", len(db_cards), board_id)
    return db_cards


def review_flashcard(db: Session, card_id: str, rating: str) -> Flashcard:
    """
    Applies the SuperMemo-2 (SM-2) algorithm to recalculate spaced-repetition schedules
    based on ratings: 'again', 'hard', 'good', 'easy'.
    """
    logger.info("[service:flashcard] Reviewing card %s with rating %s", card_id, rating)

    card = db.query(Flashcard).filter(Flashcard.id == card_id).first()
    if not card:
        raise ValueError("Flashcard not found")

    # Map ratings to SM-2 scores (q: 0 to 5)
    # again (1: incorrect), hard (3: correct with hesitation), good (4: correct), easy (5: immediate recall)
    score_map = {
        "again": 1,
        "hard": 3,
        "good": 4,
        "easy": 5
    }
    q = score_map.get(rating, 4)

    # SM-2 logic
    if q < 3:
        # User failed to recall, reset repetition counter and set interval to 1 day
        card.srs_repetitions = 0
        card.srs_interval = 1
    else:
        # User recalled successfully
        if card.srs_repetitions == 0:
            card.srs_interval = 1
        elif card.srs_repetitions == 1:
            card.srs_interval = 6
        else:
            card.srs_interval = int(card.srs_interval * card.srs_ease_factor)
            
        card.srs_repetitions += 1

    # Ease factor update
    card.srs_ease_factor = card.srs_ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    card.srs_ease_factor = max(1.3, card.srs_ease_factor)  # Minimum ease factor is 1.3

    # Schedule next review
    card.next_review_due = datetime.utcnow() + timedelta(days=card.srs_interval)
    
    db.commit()
    db.refresh(card)
    logger.info(
        "[service:flashcard] Card %s updated. Reps: %d, Interval: %d, Ease: %.2f, Next Due: %s",
        card_id, card.srs_repetitions, card.srs_interval, card.srs_ease_factor, card.next_review_due
    )
    return card
