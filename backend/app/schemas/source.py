from datetime import datetime
from pydantic import BaseModel

class SourceBase(BaseModel):
    title: str
    type: str  # "PDF" or "WEB"

class SourceRead(SourceBase):
    id: str
    board_id: str
    path: str | None
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SourceStatusRead(BaseModel):
    id: str
    status: str
    error_message: str | None

    class Config:
        from_attributes = True
