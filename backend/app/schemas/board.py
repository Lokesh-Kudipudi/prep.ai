from datetime import datetime
from pydantic import BaseModel, Field

class BoardBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None

class BoardCreate(BoardBase):
    pass

class BoardRead(BoardBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BoardStats(BaseModel):
    active_boards: int
    sources_indexed: int
    cards_reviewed: int
