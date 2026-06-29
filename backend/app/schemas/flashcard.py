from datetime import datetime
from pydantic import BaseModel, Field

class FlashcardRead(BaseModel):
    id: str
    board_id: str
    front: str
    back: str
    srs_interval: int
    srs_ease_factor: float
    srs_repetitions: int
    next_review_due: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FlashcardReview(BaseModel):
    rating: str = Field(..., pattern="^(again|hard|good|easy)$")
