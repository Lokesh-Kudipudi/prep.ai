import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, func, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: uuid.uuid4().hex)
    board_id: Mapped[str] = mapped_column(String(36), ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
