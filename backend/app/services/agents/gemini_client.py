import os
from google import genai
from app.config import settings

# Unified client initialization for Gemini API using the official Google GenAI SDK
# Fallback to "DUMMY_KEY" if key is empty to avoid instantiation errors during uvicorn startup.
api_key = settings.GOOGLE_API_KEY or "DUMMY_KEY"
client = genai.Client(api_key=api_key)
