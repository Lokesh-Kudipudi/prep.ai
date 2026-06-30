from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Relational Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/prepai"
    
    # Vector Database
    QDRANT_URL: str = "http://qdrant:6333"
    
    # Code Sandbox
    PISTON_URL: str = "http://piston:2000"
    
    # Authentication Settings
    JWT_SECRET: str = "prepai_super_secret_key_12345_67890"
    JWT_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # Third-Party Keys / Integrations
    GOOGLE_API_KEY: str = ""
    LLAMA_CLOUD_API_KEY: str | None = None
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "prep-ai"
    LANGCHAIN_TRACING_V2: str = "false"
    
    # App-Specific Constants
    TUTOR_PASS_THRESHOLD: float = 0.7
    DEFAULT_QUIZ_QUESTIONS: int = 10
    RETRIEVAL_TOP_K: int = 8
    CRITIC_MAX_CORRECTIONS: int = 2
    MAX_PDF_MB: int = 50
    MAX_DOC_PAGES: int = 10
    QDRANT_COLLECTION: str = "chunks"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
