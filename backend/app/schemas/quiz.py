from datetime import datetime
from pydantic import BaseModel, Field

class QuizQuestionRead(BaseModel):
    id: str
    quiz_id: str
    question_text: str
    options: list[str]
    correct_option_index: int
    reasoning: str
    created_at: datetime

    class Config:
        from_attributes = True

class QuizCreate(BaseModel):
    max_questions: int = Field(default=10, ge=1, le=50)

class QuizRead(BaseModel):
    id: str
    board_id: str
    max_questions: int
    status: str
    created_at: datetime
    updated_at: datetime
    questions: list[QuizQuestionRead] = []

    class Config:
        from_attributes = True

class AttemptCreate(BaseModel):
    user_answers: dict[str, int] = Field(..., description="Map of question_id -> chosen option index")

class AttemptRead(BaseModel):
    id: str
    quiz_id: str
    user_answers: dict[str, int]
    score: int
    completed_at: datetime

    class Config:
        from_attributes = True
