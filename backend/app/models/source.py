import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: uuid.uuid4().hex)
    board_id: Mapped[str] = mapped_column(String(36), ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # "PDF" or "WEB"
    path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # "pending", "processing", "indexed", "failed"
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
