from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, boards, sources, quiz, flashcards, tutor

app = FastAPI(
    title="prep.ai API",
    description="Backend API for prep.ai active-learning platform",
    version="0.1.0"
)

# Enable CORS for the frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(boards.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(flashcards.router, prefix="/api")
app.include_router(tutor.router, prefix="/api")

@app.get("/api/health")
def health_check():
    """Service health verification endpoint"""
    return {
        "status": "healthy",
        "service": "prep-ai-backend"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
