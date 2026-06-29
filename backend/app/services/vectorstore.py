import logging
from qdrant_client import QdrantClient
from llama_index.core import VectorStoreIndex
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.gemini import GeminiEmbedding

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
    embed_model = GeminiEmbedding(
        model_name="models/gemini-embedding-001",
        api_key=settings.GOOGLE_API_KEY
    )
    
    # 2. Connect to Qdrant client and load vector store
    client = QdrantClient(url=settings.QDRANT_URL)
    vector_store = QdrantVectorStore(
        collection_name=settings.QDRANT_COLLECTION,
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
