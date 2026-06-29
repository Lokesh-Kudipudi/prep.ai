import logging
import asyncio
import json
import random
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from datasets import Dataset
from ragas import evaluate
from ragas.run_config import RunConfig
from ragas.metrics import _faithfulness as faithfulness, _answer_relevancy as answer_relevance, _context_recall as context_recall
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from pydantic import BaseModel, Field
from google.genai import types

from app.config import settings
from app.models.evaluation import EvaluationRun
from app.models.board import Board
from app.models.chunk import Chunk
from app.services.agents.gemini_client import client
from app.services.agents.rag_graph import rag_graph
from app.services.vectorstore import get_retriever
from app.services.rate_limiter import (
    thread_limiter,
    async_limiter,
    parse_retry_delay,
    RateLimitedChatLLM,
)

logger = logging.getLogger(__name__)


async def _call_llm(fn, *args, **kwargs):
    """Rate-limited LLM call with 429-aware back-off (async pipeline context)."""
    for attempt in range(20):
        await async_limiter.acquire()
        loop = asyncio.get_running_loop()
        try:
            return await loop.run_in_executor(None, lambda: fn(*args, **kwargs))
        except Exception as e:
            err = str(e)
            if "429" in err or "resource_exhausted" in err.lower():
                delay = parse_retry_delay(err)
                logger.warning(
                    "[eval_service] 429 received. Waiting %.0f s (attempt %d/20)…",
                    delay, attempt + 1
                )
                await asyncio.sleep(delay)
            else:
                raise
    raise RuntimeError("Exceeded 20 retries on rate-limit")

# Pydantic schemas for QA pair generation
class QAPairSchema(BaseModel):
    question: str = Field(description="A specific, technically accurate question about the material.")
    ground_truth: str = Field(description="The correct, factual answer based on the material.")

class QAPairListSchema(BaseModel):
    qa_pairs: List[QAPairSchema] = Field(description="List of QA pairs.")

def generate_eval_qa_pairs(board_id: str, db: Session, size: int = 10) -> List[Dict[str, str]]:
    """
    Generates a set of size (at least 10) QA pairs from the board's indexed sources using Gemini.
    """
    logger.info("[service:evaluation] Generating %d QA pairs for board: %s", size, board_id)
    
    # 1. Fetch chunks for this board
    chunks = db.query(Chunk).filter(Chunk.board_id == board_id).all()
    if not chunks:
        raise ValueError("No indexed sources found for this board. Please upload a PDF or fetch documentation first.")
    
    # 2. Select a representative sample of chunks to fit within context limits
    sampled_chunks = chunks
    if len(chunks) > 15:
        # Sort or sample chunks randomly but maintain some order
        sampled_chunks = random.sample(chunks, 15)
        sampled_chunks.sort(key=lambda c: (c.source_id, c.chunk_index))
        
    context_text = "\n\n".join([
        f"--- Content Section {i} ---\n{chunk.content}"
        for i, chunk in enumerate(sampled_chunks)
    ])
    
    prompt = f"""
You are an expert technical evaluator. Generate exactly {size} challenging, factual QA pairs based on the provided material.
Each question should be direct and focus on core technical concepts, APIs, rules, or details found in the material.
Provide a clear, detailed, and factually correct ground-truth reference answer for each question based ONLY on the material.

[Material]
{context_text}
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-flash-lite-latest',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=QAPairListSchema
            )
        )
        parsed = QAPairListSchema.model_validate_json(response.text)
        qa_list = [{"question": qa.question, "ground_truth": qa.ground_truth} for qa in parsed.qa_pairs]
        
        # Ensure we meet the size constraint
        if len(qa_list) < size:
            logger.warning("[service:evaluation] Gemini generated only %d QA pairs, expected %d", len(qa_list), size)
            
        return qa_list
    except Exception as e:
        logger.error("[service:evaluation] QA generation failed: %s", e)
        raise ValueError(f"Failed to generate evaluation dataset: {str(e)}")

def calculate_token_cost(prompt_chars: int, response_chars: int) -> float:
    """
    Approximates token costs for Gemini 2.0 Flash.
    Pricing: $0.075 / 1M input tokens, $0.30 / 1M output tokens.
    Assumption: 1 token ≈ 4 characters.
    """
    input_tokens = prompt_chars / 4
    output_tokens = response_chars / 4
    cost = (input_tokens / 1_000_000) * 0.075 + (output_tokens / 1_000_000) * 0.30
    return cost

async def execute_baseline_rag_eval(board_id: str, question: str) -> Tuple[str, List[str], float]:
    """
    Executes a simple single-shot RAG query, returns the answer, contexts, and estimated token cost.
    """
    prompt_template = (
        "Context information is below.\n"
        "---------------------\n"
        "{context}\n"
        "---------------------\n"
        "Given the context information and not prior knowledge, answer the query.\n"
        "Query: {query}\n"
        "Answer: "
    )
    
    # 1. Retrieve
    retriever = get_retriever(board_id)
    loop = asyncio.get_running_loop()
    chunks = await loop.run_in_executor(None, lambda: retriever.retrieve(question))
    
    context_text = "\n\n".join([
        f"--- Source Chunk {i} ---\n{chunk.node.get_content()}" 
        for i, chunk in enumerate(chunks)
    ])
    
    prompt = prompt_template.format(context=context_text, query=question)
    
    # 2. Call LLM (rate-limited)
    response = await _call_llm(
        client.models.generate_content,
        model='gemini-flash-lite-latest',
        contents=prompt,
    )
    
    answer = response.text.strip()
    contexts = [chunk.node.get_content() for chunk in chunks]
    
    # 3. Calculate Cost
    cost = calculate_token_cost(len(prompt), len(answer))
    return answer, contexts, cost

async def execute_improved_rag_eval(board_id: str, question: str) -> Tuple[str, List[str], float]:
    """
    Executes the stateful LangGraph RAG query, returns the answer, contexts, and cumulative token cost.
    """
    prompt_template = (
        "Context information is below.\n"
        "---------------------\n"
        "{context}\n"
        "---------------------\n"
        "Given the context information and not prior knowledge, answer the query.\n"
        "Query: {query}\n"
        "Answer: "
    )
    
    initial_state = {
        "board_id": board_id,
        "query": question,
        "prompt_template": prompt_template,
        "retrieved_chunks": [],
        "candidate_answer": None,
        "critic_verdict": None,
        "critic_reason": None,
        "correction_count": 0,
        "final_answer": None
    }
    
    loop = asyncio.get_running_loop()
    # Pre-acquire rate-limit slots for generate + critic nodes
    await _limiter.acquire()  # generate node
    await _limiter.acquire()  # critic node
    result = await loop.run_in_executor(None, lambda: rag_graph.invoke(initial_state))
    
    answer = result.get("final_answer") or ""
    contexts = [chunk.node.get_content() for chunk in result.get("retrieved_chunks", [])]
    
    # Cost approximation
    # Prompt + Answer + Critic Node tokens
    # Generative call prompt length (approximate)
    context_text = "\n\n".join(contexts)
    gen_prompt = prompt_template.format(context=context_text, query=question)
    gen_response = result.get("candidate_answer") or ""
    
    prompt_chars = len(gen_prompt)
    response_chars = len(gen_response)
    
    # Critic check prompt length
    # Critic inputs query, answer, and context. Let's add that to prompt chars
    critic_prompt_chars = len(question) + len(gen_response) + len(context_text) + 200
    critic_response_chars = len(result.get("critic_verdict") or "") + len(result.get("critic_reason") or "") + 50
    
    prompt_chars += critic_prompt_chars
    response_chars += critic_response_chars
    
    # If self-correction occurred, double the generation cost
    if result.get("correction_count", 0) > 0:
        prompt_chars += len(gen_prompt) + 200
        response_chars += len(answer)
        
    cost = calculate_token_cost(prompt_chars, response_chars)
    return answer, contexts, cost

async def run_evaluation_task(db_session_factory, run_id: str, user_id: str):
    """
    Background worker that runs the comparative evaluation.
    """
    # Open direct session using factory to prevent session-closing bugs in background tasks
    db = db_session_factory()
    run = db.query(EvaluationRun).filter(EvaluationRun.id == run_id).first()
    if not run:
        db.close()
        return
        
    logger.info("[service:evaluation] Starting background evaluation run: %s", run_id)
    
    try:
        run.status = "running"
        db.commit()
        
        # 1. Locate the latest active board containing indexed sources
        boards = db.query(Board).filter(Board.user_id == user_id).all()
        active_board_id = None
        for board in sorted(boards, key=lambda b: b.updated_at, reverse=True):
            has_chunks = db.query(Chunk).filter(Chunk.board_id == board.id).first()
            if has_chunks:
                active_board_id = board.id
                break
                
        if not active_board_id:
            raise ValueError("No indexed source files found in any board. Please upload a PDF or fetch documentation first.")
            
        # 2. Generate QA pairs (at least 10)
        num_questions = run.num_questions or 10
        qa_pairs = generate_eval_qa_pairs(active_board_id, db, size=num_questions)
        
        # 3. Query both pipelines
        baseline_answers = []
        baseline_contexts_list = []
        baseline_costs = []
        
        improved_answers = []
        improved_contexts_list = []
        improved_costs = []
        
        questions = [qa["question"] for qa in qa_pairs]
        ground_truths = [qa["ground_truth"] for qa in qa_pairs]
        
        for qa in qa_pairs:
            q = qa["question"]
            # Baseline
            b_ans, b_ctxs, b_cost = await execute_baseline_rag_eval(active_board_id, q)
            baseline_answers.append(b_ans)
            baseline_contexts_list.append(b_ctxs)
            baseline_costs.append(b_cost)
            
            # Improved
            i_ans, i_ctxs, i_cost = await execute_improved_rag_eval(active_board_id, q)
            improved_answers.append(i_ans)
            improved_contexts_list.append(i_ctxs)
            improved_costs.append(i_cost)
            
        # 4. Ragas evaluations using ChatGoogleGenAI
        logger.info("[service:evaluation] Formatting datasets and triggering Ragas metrics evaluation")
        llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=settings.GOOGLE_API_KEY)
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=settings.GOOGLE_API_KEY)
        
        # Dataset Baseline
        dataset_b = Dataset.from_dict({
            "question": questions,
            "answer": baseline_answers,
            "contexts": baseline_contexts_list,
            "ground_truth": ground_truths
        })
        
        # Dataset Improved
        dataset_i = Dataset.from_dict({
            "question": questions,
            "answer": improved_answers,
            "contexts": improved_contexts_list,
            "ground_truth": ground_truths
        })
        
        # RunConfig: max_workers=1 prevents concurrent LLM bursts during Ragas scoring
        run_cfg = RunConfig(max_workers=1, max_wait=180, timeout=120)
        # RateLimitedChatLLM enforces 13 RPM inside _generate/_agenerate
        llm = RateLimitedChatLLM(
            model="gemini-flash-lite-latest",
            google_api_key=settings.GOOGLE_API_KEY,
            max_retries=0,
        )
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.GOOGLE_API_KEY,
        )

        # Run Ragas evaluations (rate-limited via RateLimitedChatLLM adapter)
        loop = asyncio.get_running_loop()
        score_b = await loop.run_in_executor(
            None,
            lambda: evaluate(
                dataset=dataset_b,
                metrics=[faithfulness, answer_relevance, context_recall],
                llm=llm,
                embeddings=embeddings,
                run_config=run_cfg,
            )
        )

        score_i = await loop.run_in_executor(
            None,
            lambda: evaluate(
                dataset=dataset_i,
                metrics=[faithfulness, answer_relevance, context_recall],
                llm=llm,
                embeddings=embeddings,
                run_config=run_cfg,
            )
        )
        
        # 5. Save results to the run
        import numpy as np
        
        def safe_mean(score_obj, metric):
            if metric not in score_obj._scores_dict:
                return 0.0
            val = np.nanmean(score_obj[metric])
            return float(val) if not np.isnan(val) else 0.0

        run.faithfulness_baseline = safe_mean(score_b, "faithfulness")
        run.faithfulness_improved = safe_mean(score_i, "faithfulness")
        
        run.answer_relevance_baseline = safe_mean(score_b, "answer_relevance")
        run.answer_relevance_improved = safe_mean(score_i, "answer_relevance")
        
        run.context_recall_baseline = safe_mean(score_b, "context_recall")
        run.context_recall_improved = safe_mean(score_i, "context_recall")
        
        run.token_cost_baseline = sum(baseline_costs)
        run.token_cost_improved = sum(improved_costs)
        
        run.status = "completed"
        logger.info("[service:evaluation] Background evaluation completed successfully for run: %s", run_id)
        
    except Exception as e:
        logger.error("[service:evaluation] Background evaluation run failed: %s", e)
        run.status = "failed"
        run.error_message = str(e)
        
    finally:
        db.commit()
        db.close()
