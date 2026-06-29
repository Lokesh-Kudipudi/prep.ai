import logging
from typing import Optional
from app.services.vectorstore import get_retriever
from app.services.agents.gemini_client import client

logger = logging.getLogger(__name__)

async def run_baseline_rag(board_id: str, query: str, prompt_template: Optional[str] = None) -> str:
    """
    Executes a simple single-shot RAG pipeline (no critic, no loops).
    """
    logger.info("[agent:baseline_rag] Executing simple single-shot RAG")
    if prompt_template is None:
        prompt_template = (
            "Context information is below.\n"
            "---------------------\n"
            "{context}\n"
            "---------------------\n"
            "Given the context information and not prior knowledge, answer the query.\n"
            "Query: {query}\n"
            "Answer: "
        )

    # 1. Retrieve chunks
    retriever = get_retriever(board_id)
    chunks = retriever.retrieve(query)
    
    # 2. Format context
    context_text = "\n\n".join([
        f"--- Source Chunk {i} ---\n{chunk.node.get_content()}" 
        for i, chunk in enumerate(chunks)
    ])
    
    # 3. Format prompt
    try:
        prompt = prompt_template.format(
            context=context_text,
            query=query
        )
    except KeyError as e:
        logger.warning("[agent:baseline_rag] Formatting prompt template failed: %s", e)
        prompt = f"Context:\n{context_text}\n\nQuery: {query}"
        
    # 4. Generate answer via Gemini
    response = client.models.generate_content(
        model='gemini-flash-lite-latest',
        contents=prompt,
    )
    
    return response.text.strip()
