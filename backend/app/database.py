from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Engine configuration
engine = create_engine(
    settings.DATABASE_URL,
    # pool_pre_ping checks connection health before executing queries
    pool_pre_ping=True
)

# Relational session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Declarative base model
Base = declarative_base()

# Database session dependency generator
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
