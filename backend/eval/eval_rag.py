import os
import sys
import asyncio
import logging
import random
from typing import List, Dict
from sqlalchemy.orm import Session
from datasets import Dataset
from ragas import evaluate
from ragas.run_config import RunConfig
from ragas.metrics import _faithfulness as faithfulness, _answer_relevancy as answer_relevance, _context_recall as context_recall
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Set path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.board import Board
from app.models.source import Source
from app.models.chunk import Chunk
from app.config import settings
from app.services.agents.rag_graph import run_rag
from app.services.agents.baseline_rag import run_baseline_rag
from app.services.vectorstore import get_retriever
from app.services.rate_limiter import async_limiter, parse_retry_delay, RateLimitedChatLLM

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("eval_rag")

# 15 Static QA pairs about prep.ai system design and invariants
STATIC_QA_DATASET = [
    {
        "question": "What is prep.ai?",
        "ground_truth": "prep.ai is a workspace-driven active-learning platform that turns learning materials into active-learning study plans like Quizzes, Flashcards, and Tutor Sessions."
    },
    {
        "question": "What are the three pillars of preparation in prep.ai?",
        "ground_truth": "The three preparation pillars are Quiz (MCQ with reasoning), Flashcards (active-recall SRS cards), and Tutor Session (interactive dialog with code editor sidebar)."
    },
    {
        "question": "What technology stack is used for the backend server?",
        "ground_truth": "The backend server is built using FastAPI, Python 3.12, UV package manager, SQLAlchemy 2, Alembic, and PostgreSQL."
    },
    {
        "question": "Which database stores relational data and which stores vector embeddings?",
        "ground_truth": "Relational data is stored in PostgreSQL, and vector embeddings are stored in Qdrant."
    },
    {
        "question": "What AI frameworks are used to run the RAG pipeline?",
        "ground_truth": "The RAG pipeline is orchestrated using LlamaIndex (for document scraping, chunking, indexing, and retrieval) and LangGraph (for stateful conversational dialogue, critic nodes, and sandboxes), powered by Google Gemini API."
    },
    {
        "question": "What model is used for generating vector embeddings in prep.ai?",
        "ground_truth": "The embedding model used is models/text-embedding-004 via the Google GenAI SDK."
    },
    {
        "question": "What model is used for LLM orchestrations in RAG and Tutor sessions?",
        "ground_truth": "The model used is models/gemini-flash-lite-latest via the Google GenAI SDK."
    },
    {
        "question": "What is the role of the Critic node in the LangGraph RAG workflow?",
        "ground_truth": "The Critic node validates the faithfulness of candidate answers to verify if there is any hallucination, triggering a self-correcting loop to regenerate answers if needed."
    },
    {
        "question": "How does prep.ai prevent vector database leakage between boards?",
        "ground_truth": "Every Qdrant vector retrieval query is strictly filtered by metadata board_id to enforce board isolation."
    },
    {
        "question": "How are database schemas managed and updated in the backend?",
        "ground_truth": "Database schema updates must only be performed via Alembic database migration scripts."
    },
    {
        "question": "What sandbox tool executes user code during tutor coding assignments?",
        "ground_truth": "All user code execution runs inside a Dockerized containerized Piston sandbox API on port 2000."
    },
    {
        "question": "What spacing repetition algorithm is used for flashcard reviews?",
        "ground_truth": "The SuperMemo-2 (SM-2) algorithm is used to dynamically update review schedules based on ratings (Again, Hard, Good, Easy)."
    },
    {
        "question": "What is the default threshold required to pass a coding assignment in a tutor session?",
        "ground_truth": "The default passing threshold for a coding assignment is 0.7, defined as TUTOR_PASS_THRESHOLD."
    },
    {
        "question": "Where does all frontend HTTP request traffic route through?",
        "ground_truth": "All frontend API calls must route exclusively through the central Axios instance in frontend/src/lib/apiClient.ts."
    },
    {
        "question": "Are agents allowed to mutate relational tables like users, boards, sources, or chunks?",
        "ground_truth": "No. The users, boards, sources, and chunks tables are immutable to agents; only the ingestion service or routers can write to them."
    }
]

# Sample document text to seed the evaluation index
SAMPLE_DOCUMENT_TEXT = """
prep.ai Platform Architecture and System Design Invariants:
1. Product Definition: prep.ai is a workspace-driven active-learning platform helping students prepare for interviews and exams. It organizes learning material in Board workspaces.
2. Three Pillars:
   - Quiz: Configurable multiple choice questions with reasoning feedback.
   - Flashcards: Spaced repetition active-recall cards using the SuperMemo-2 (SM-2) algorithm. Allows rating Again, Hard, Good, Easy.
   - Tutor Session: Interactive tutorial dialogue. Supports coding assignments, launching an editor sidebar.
3. Tech Stack:
   - Frontend: React, Vite, TS, Tailwind CSS v4. Standardized API client is lib/apiClient.ts.
   - Backend: FastAPI (Python 3.12, UV package manager), SQLAlchemy 2, Alembic, PostgreSQL.
   - Vector Store: Qdrant. Cosine similarity. Collection named chunks. Scoped by board_id.
   - Orchestration: LlamaIndex for loading/chunking, LangGraph for stateful dialogue, and Google GenAI SDK for Gemini API (using models/gemini-flash-lite-latest and models/gemini-embedding-001).
   - Code Execution: Piston sandbox container API running on port 2000.
4. Core Invariants:
   - Strict board isolation is enforced on every Qdrant search by filtering on board_id.
   - Relational source-of-truth tables (users, boards, sources, chunks) are immutable to agents. Only routers and ingestion pipelines write to them.
   - The default grade threshold for passing tutor sessions is defined as TUTOR_PASS_THRESHOLD = 0.7.
"""

async def run_reproduction_eval():
    logger.info("Initializing reproduction evaluation Ragas script...")
    db = SessionLocal()
    
    try:
        # 1. Create a dummy reproduction user and board if not exists
        eval_user = db.query(User).filter(User.email == "eval.runner@prep.ai").first()
        if not eval_user:
            eval_user = User(
                full_name="Evaluation Script Runner",
                email="eval.runner@prep.ai",
                password_hash="dummy_hashed_password"
            )
            db.add(eval_user)
            db.commit()
            db.refresh(eval_user)
            
        eval_board = db.query(Board).filter(Board.name == "Reproduction Evaluation Board").first()
        if not eval_board:
            eval_board = Board(
                user_id=eval_user.id,
                name="Reproduction Evaluation Board",
                description="Sandbox board containing architectural documentation for Ragas reproduction."
            )
            db.add(eval_board)
            db.commit()
            db.refresh(eval_board)
            
        # 2. Add sample chunks to PostgreSQL and Qdrant if none exist
        has_chunks = db.query(Chunk).filter(Chunk.board_id == eval_board.id).first() is not None
        if not has_chunks:
            logger.info("Seeding Reproduction Board with architectural chunks...")
            eval_source = Source(
                board_id=eval_board.id,
                title="System Design Invariants",
                type="WEB",
                status="indexed"
            )
            db.add(eval_source)
            db.commit()
            db.refresh(eval_source)
            
            # Seed local text chunks
            paragraphs = [p.strip() for p in SAMPLE_DOCUMENT_TEXT.strip().split("\n\n") if p.strip()]
            
            # Upsert into PostgreSQL Chunks table
            db_chunks = []
            for idx, para in enumerate(paragraphs):
                c = Chunk(
                    board_id=eval_board.id,
                    source_id=eval_source.id,
                    content=para,
                    chunk_index=idx,
                    page_number=1,
                    token_count=len(para) // 4
                )
                db.add(c)
                db_chunks.append(c)
            db.commit()
            
            # Index into Qdrant using LlamaIndex VectorStoreIndex wrapper
            from qdrant_client import QdrantClient
            from llama_index.vector_stores.qdrant import QdrantVectorStore
            from llama_index.core import VectorStoreIndex, Document, StorageContext
            from llama_index.embeddings.gemini import GeminiEmbedding
            
            q_client = QdrantClient(url=settings.QDRANT_URL)
            vector_store = QdrantVectorStore(collection_name=settings.QDRANT_COLLECTION, client=q_client)
            embed_model = GeminiEmbedding(model_name="models/gemini-embedding-001", api_key=settings.GOOGLE_API_KEY)
            
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            
            # Create LlamaIndex Document nodes with metadata filters
            documents = [
                Document(text=c.content, metadata={"board_id": eval_board.id, "source_id": eval_source.id, "chunk_id": c.id})
                for c in db_chunks
            ]
            VectorStoreIndex.from_documents(documents, storage_context=storage_context, embed_model=embed_model)
            logger.info("Successfully indexed %d chunks in Qdrant for board %s", len(db_chunks), eval_board.id)

        # 3. Query both pipelines on the 15 static QA pairs
        logger.info("Running 15 static queries against Baseline RAG and Improved Agentic RAG...")
        baseline_answers = []
        baseline_contexts = []
        
        improved_answers = []
        improved_contexts = []
        
        questions = [item["question"] for item in STATIC_QA_DATASET]
        ground_truths = [item["ground_truth"] for item in STATIC_QA_DATASET]
        
        retriever = get_retriever(eval_board.id)
        
        # ── rate-limited async wrapper (uses shared AsyncRateLimiter) ───────
        async def retry_async(func, *args, **kwargs):
            for attempt in range(20):
                await async_limiter.acquire()
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
                        delay = parse_retry_delay(err_str)
                        logger.warning(
                            "429 received. Waiting %.0f s as instructed by API (attempt %d/20)…",
                            delay, attempt + 1
                        )
                        await asyncio.sleep(delay)
                    else:
                        raise e
            raise RuntimeError("Exceeded 20 retries on rate-limit")

        for idx, item in enumerate(STATIC_QA_DATASET):
            q = item["question"]
            logger.info("[%d/15] Query: %s", idx + 1, q)
            
            # Run Baseline RAG
            b_ans = await retry_async(run_baseline_rag, eval_board.id, q)
            baseline_answers.append(b_ans)
            b_chunks = retriever.retrieve(q)
            baseline_contexts.append([c.node.get_content() for c in b_chunks])
            
            # Run Improved Agentic RAG (LangGraph)
            i_ans = await retry_async(run_rag, eval_board.id, q)
            improved_answers.append(i_ans)
            i_chunks = retriever.retrieve(q)
            improved_contexts.append([c.node.get_content() for c in i_chunks])

        # 4. Score both runs using Ragas
        logger.info("Running Ragas metrics scoring...")
        # RateLimitedChatLLM enforces 13 RPM + 1 s gap inside _generate/_agenerate
        # max_retries=0: disable LangChain's own retry — our adapter handles it
        llm = RateLimitedChatLLM(
            model="gemini-flash-lite-latest",
            google_api_key=settings.GOOGLE_API_KEY,
            max_retries=0,
        )
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.GOOGLE_API_KEY,
        )
        
        # Baseline dataset
        ds_b = Dataset.from_dict({
            "question": questions,
            "answer": baseline_answers,
            "contexts": baseline_contexts,
            "ground_truth": ground_truths
        })
        
        # Improved dataset
        ds_i = Dataset.from_dict({
            "question": questions,
            "answer": improved_answers,
            "contexts": improved_contexts,
            "ground_truth": ground_truths
        })
        
        # RunConfig: max_workers=1 forces Ragas to call the LLM one at a time
        # (prevents the 45-concurrent-call burst that causes 429 storms)
        run_cfg = RunConfig(max_workers=1, max_wait=180, timeout=120)
        score_b = evaluate(
            dataset=ds_b,
            metrics=[faithfulness, answer_relevance, context_recall],
            llm=llm,
            embeddings=embeddings,
            run_config=run_cfg,
        )
        score_i = evaluate(
            dataset=ds_i,
            metrics=[faithfulness, answer_relevance, context_recall],
            llm=llm,
            embeddings=embeddings,
            run_config=run_cfg,
        )
        
        # 5. Output comparison results in a beautiful table format
        print("\n" + "="*80)
        print(" RAGAS EVALUATION METRICS REPORT (15 STATIC QA PAIRS REPRODUCTION)")
        print("="*80)
        print(f"{'Metric':<25} | {'Baseline (Simple RAG)':<25} | {'Improved (Agentic RAG)':<25}")
        print("-"*80)
        for metric in ["faithfulness", "answer_relevance", "context_recall"]:
            import numpy as np
            val_b = float(np.nanmean(score_b[metric])) if metric in score_b._scores_dict else 0.0
            val_i = float(np.nanmean(score_i[metric])) if metric in score_i._scores_dict else 0.0
            diff = val_i - val_b
            trend = f"▲ +{diff:.2f}" if diff >= 0 else f"▼ {diff:.2f}"
            print(f"{metric.replace('_', ' ').title():<25} | {val_b:<25.2f} | {val_i:<21.2f} ({trend})")
        print("="*80 + "\n")
        
    except Exception as e:
        logger.error("Reproduction evaluation run failed: %s", e)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_reproduction_eval())
