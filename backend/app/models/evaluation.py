import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Float, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, running, completed, failed
    num_questions: Mapped[int] = mapped_column(Integer, default=10)
    
    # Ragas Quality Metrics (Baseline vs Improved RAG)
    faithfulness_baseline: Mapped[float | None] = mapped_column(Float, nullable=True)
    faithfulness_improved: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    answer_relevance_baseline: Mapped[float | None] = mapped_column(Float, nullable=True)
    answer_relevance_improved: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    context_recall_baseline: Mapped[float | None] = mapped_column(Float, nullable=True)
    context_recall_improved: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Cumulative Token Costs
    token_cost_baseline: Mapped[float | None] = mapped_column(Float, nullable=True)
    token_cost_improved: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
