import logging
import json
from typing import List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from google.genai import types

from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.services.vectorstore import get_retriever
from app.services.agents.gemini_client import client

logger = logging.getLogger(__name__)

# Pydantic schemas for structured Gemini generation output
class MCQOptionSchema(BaseModel):
    question_text: str = Field(description="The body of the multiple choice question.")
    options: List[str] = Field(description="Exactly 4 potential answer options.")
    correct_option_index: int = Field(description="The 0-based index of the correct option (0 to 3).")
    reasoning: str = Field(description="Explanation describing why the correct option is correct based on the source.")

class QuizOutputSchema(BaseModel):
    questions: List[MCQOptionSchema] = Field(description="List of multiple-choice questions.")


def get_active_quiz(db: Session, board_id: str) -> Quiz | None:
    """Returns the current active (incomplete) quiz for a board, if one exists."""
    return db.query(Quiz).filter(Quiz.board_id == board_id, Quiz.status == "active").first()


def generate_quiz(db: Session, board_id: str, max_questions: int) -> Quiz:
    """
    Generates a new MCQ quiz based on the board's indexed vector chunks.
    Reuses existing active quiz if present.
    """
    # 1. Check for active quiz first to enforce single active quiz constraint
    active_quiz = get_active_quiz(db, board_id)
    if active_quiz:
        logger.info("[service:quiz] Active quiz found for board %s, returning it", board_id)
        return active_quiz

    logger.info("[service:quiz] Starting quiz generation for board %s (questions=%d)", board_id, max_questions)

    # 2. Retrieve context from Qdrant vector store
    retriever = get_retriever(board_id, top_k=15)
    # Search for general learning concepts to extract comprehensive quiz material
    chunks = retriever.retrieve("Retrieve key technical concepts, API usages, and definitions.")
    if not chunks:
        raise ValueError("No learning sources found or indexed yet. Please upload a PDF or fetch documentation first.")

    context_text = "\n\n".join([
        f"Context Chunk {i}:\n{chunk.node.get_content()}"
        for i, chunk in enumerate(chunks)
    ])

    # 3. Request structured MCQs from Gemini
    prompt = f"""
You are an expert interviewer and academic coordinator. Based on the following source materials, generate exactly {max_questions} distinct multiple-choice questions (MCQs) to test a student's knowledge.

[Source Materials]
{context_text}

Instructions:
1. Generate exactly {max_questions} questions.
2. Each question must have exactly 4 options.
3. Ground every question strictly in the provided context. Avoid testing trivial details; focus on key engineering principles, syntax, configurations, or facts.
4. Set the correct_option_index to match the correct choice.
5. Provide a detailed, context-grounded explanation in the reasoning field.
"""

    try:
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=QuizOutputSchema
            )
        )
        
        # Parse the structured JSON output
        parsed_data = QuizOutputSchema.model_validate_json(response.text)
        logger.info("[service:quiz] Structured MCQ response generated successfully")
        
    except Exception as e:
        logger.error("[service:quiz] Failed to generate quiz questions via Gemini: %s", e)
        raise ValueError(f"Failed to generate quiz: {str(e)}")

    # 4. Save to relational database
    db_quiz = Quiz(
        board_id=board_id,
        max_questions=max_questions,
        status="active"
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)

    for q in parsed_data.questions:
        db_question = QuizQuestion(
            quiz_id=db_quiz.id,
            question_text=q.question_text,
            options=q.options,
            correct_option_index=q.correct_option_index,
            reasoning=q.reasoning
        )
        db.add(db_question)

    db.commit()
    logger.info("[service:quiz] Quiz %s created with %d questions", db_quiz.id, len(parsed_data.questions))
    return db_quiz


def submit_attempt(db: Session, quiz_id: str, user_answers: dict[str, int]) -> QuizAttempt:
    """
    Submits user answers for a quiz, scores it, marks the quiz as completed, 
    and saves the attempt.
    """
    logger.info("[service:quiz] Submitting attempt for quiz: %s", quiz_id)
    
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise ValueError("Quiz not found")
        
    if quiz.status == "completed":
        raise ValueError("This quiz has already been submitted and completed.")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    if not questions:
        raise ValueError("No questions found in this quiz")

    # Score calculation
    correct_count = 0
    for q in questions:
        chosen_idx = user_answers.get(q.id)
        if chosen_idx is not None and chosen_idx == q.correct_option_index:
            correct_count += 1

    score = correct_count  # Keep raw score (number of correct questions)

    # Save the attempt
    db_attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_answers=user_answers,
        score=score
    )
    db.add(db_attempt)

    # Mark the parent quiz as completed
    quiz.status = "completed"
    db.commit()
    db.refresh(db_attempt)

    logger.info("[service:quiz] Attempt graded. Score: %d/%d", score, len(questions))
    return db_attempt
