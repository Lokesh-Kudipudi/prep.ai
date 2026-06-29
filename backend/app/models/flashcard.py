import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Text, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: uuid.uuid4().hex)
    board_id: Mapped[str] = mapped_column(String(36), ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Spaced Repetition (SM-2) variables
    srs_interval: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # in days
    srs_ease_factor: Mapped[float] = mapped_column(Float, default=2.5, nullable=False)
    srs_repetitions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    next_review_due: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
