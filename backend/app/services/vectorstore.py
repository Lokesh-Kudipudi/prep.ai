import logging
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from llama_index.core import VectorStoreIndex
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

from app.config import settings

logger = logging.getLogger(__name__)

def get_retriever(board_id: str, top_k: int = None) -> VectorIndexRetriever:
    """
    Returns a LlamaIndex VectorIndexRetriever for the chunks collection,
    enforcing isolation by filtering strictly on board_id.
    """
    if top_k is None:
        top_k = settings.RETRIEVAL_TOP_K

    logger.info("[service:vectorstore] Creating retriever for board_id: %s (top_k=%d)", board_id, top_k)
    
    # 1. Initialize embedding model for query projection
    embed_model = RateLimitedGoogleGenAIEmbedding(
        model_name="models/gemini-embedding-2",
        api_key=settings.GOOGLE_API_KEY,
        embedding_config={"output_dimensionality": 768}
    )
    
    # 2. Connect to Qdrant client and load vector store
    client = QdrantClient(url=settings.QDRANT_URL, check_compatibility=False)
    
    # Ensure collection exists to avoid 404 errors on empty boards
    collection_name = settings.QDRANT_COLLECTION
    try:
        if not client.collection_exists(collection_name):
            logger.info("[service:vectorstore] Collection '%s' does not exist. Creating empty collection...", collection_name)
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
    except Exception as e:
        logger.warning("[service:vectorstore] Failed to verify/create collection '%s': %s", collection_name, e)

    vector_store = QdrantVectorStore(
        collection_name=collection_name,
        client=client
    )
    
    # 3. Load Vector Store Index
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model
    )
    
    # 4. Enforce strict board isolation filter
    filters = MetadataFilters(
        filters=[
            MetadataFilter(key="board_id", value=board_id)
        ]
    )
    
    # 5. Build retriever
    retriever = VectorIndexRetriever(
        index=index,
        similarity_top_k=top_k,
        filters=filters
    )
    
    return retriever


class RateLimitedGoogleGenAIEmbedding(GoogleGenAIEmbedding):
    """
    Subclass of GoogleGenAIEmbedding that enforces a maximum rate limit of 90 RPM
    and a minimum gap of 0.66 seconds between embedding calls, with dynamic retries on 429/409 errors.
    """
    def _run_with_retry(self, func, *args, **kwargs):
        from app.services.rate_limiter import thread_embeddings_limiter, parse_retry_delay
        import time
        for attempt in range(15):
            thread_embeddings_limiter.acquire()
            try:
                return func(*args, **kwargs)
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "409" in err_str or "resource_exhausted" in err_str.lower():
                    delay = parse_retry_delay(err_str)
                    logger.warning(
                        "[RateLimitedEmbedding] Rate limit hit. Waiting %.2fs (attempt %d/15)... Detail: %s",
                        delay, attempt + 1, err_str[:150]
                    )
                    time.sleep(delay)
                else:
                    raise
        raise RuntimeError("[RateLimitedEmbedding] Exceeded max retries on embedding rate-limit.")

    async def _arun_with_retry(self, func, *args, **kwargs):
        from app.services.rate_limiter import async_embeddings_limiter, parse_retry_delay
        import asyncio
        for attempt in range(15):
            await async_embeddings_limiter.acquire()
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "409" in err_str or "resource_exhausted" in err_str.lower():
                    delay = parse_retry_delay(err_str)
                    logger.warning(
                        "[RateLimitedEmbedding] Async rate limit hit. Waiting %.2fs (attempt %d/15)... Detail: %s",
                        delay, attempt + 1, err_str[:150]
                    )
                    await asyncio.sleep(delay)
                else:
                    raise
        raise RuntimeError("[RateLimitedEmbedding] Exceeded max retries on embedding rate-limit.")

    def _get_query_embedding(self, query: str):
        return self._run_with_retry(super()._get_query_embedding, query)

    def _get_text_embedding(self, text: str):
        return self._run_with_retry(super()._get_text_embedding, text)

    def _get_text_embeddings(self, texts: list[str]):
        return self._run_with_retry(super()._get_text_embeddings, texts)

    async def _aget_query_embedding(self, query: str):
        return await self._arun_with_retry(super()._aget_query_embedding, query)

    async def _aget_text_embedding(self, text: str):
        return await self._arun_with_retry(super()._aget_text_embedding, text)

    async def _aget_text_embeddings(self, texts: list[str]):
        return await self._arun_with_retry(super()._aget_text_embeddings, texts)
