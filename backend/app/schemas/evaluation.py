from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class EvaluationRunCreate(BaseModel):
    num_questions: Optional[int] = 10

class EvaluationRunRead(BaseModel):
    id: str
    user_id: str
    status: str
    num_questions: int
    
    faithfulness_baseline: Optional[float] = None
    faithfulness_improved: Optional[float] = None
    
    answer_relevance_baseline: Optional[float] = None
    answer_relevance_improved: Optional[float] = None
    
    context_recall_baseline: Optional[float] = None
    context_recall_improved: Optional[float] = None
    
    token_cost_baseline: Optional[float] = None
    token_cost_improved: Optional[float] = None
    
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
