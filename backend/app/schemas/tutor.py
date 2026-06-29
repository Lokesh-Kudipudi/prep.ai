from datetime import datetime
from pydantic import BaseModel, Field

class TutorSessionCreate(BaseModel):
    topic: str = Field(..., min_length=1, max_length=255)

class TutorSessionRead(BaseModel):
    id: str
    board_id: str
    topic: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TutorMessageRead(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    code_assignment: str | None = None
    code_submission: str | None = None
    code_language: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class TutorSessionDetail(TutorSessionRead):
    messages: list[TutorMessageRead] = []

    class Config:
        from_attributes = True

class UserMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)

class CodeSubmissionCreate(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1, max_length=50)

class CodingSubmissionRead(BaseModel):
    id: str
    session_id: str
    code: str
    language: str
    stdout: str | None
    stderr: str | None
    passed: bool
    score: int
    review_feedback: str
    created_at: datetime

    class Config:
        from_attributes = True
