from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db

# Dependency to retrieve the authenticated user
# Stub for Feature 03
def get_current_user(db: Session = Depends(get_db)):
    """Retrieve current logged in user from database. Stub for auth features."""
    return None
