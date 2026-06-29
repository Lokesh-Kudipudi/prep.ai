import logging
from sqlalchemy.orm import Session
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from llama_index.core.schema import TextNode
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.core import StorageContext, VectorStoreIndex

from app.config import settings
from app.models.chunk import Chunk

logger = logging.getLogger(__name__)

async def index_nodes(
    nodes: list[TextNode],
    board_id: str,
    source_id: str,
    db: Session
) -> None:
    """
    Indexes semantic chunks in both Qdrant (vectors) and PostgreSQL (metadata/text).
    """
    logger.info("[ingest:indexing] Setting up Qdrant client for host: %s", settings.QDRANT_URL)
    
    # 1. Initialize Qdrant client and ensure collection exists
    client = QdrantClient(url=settings.QDRANT_URL)
    collection_name = settings.QDRANT_COLLECTION
    
    # 768 is the vector dimension for models/text-embedding-004
    vector_size = 768
    
    try:
        # qdrant-client v1.9.0 supports collection_exists
        if not client.collection_exists(collection_name):
            logger.info("[ingest:indexing] Collection '%s' does not exist. Creating it...", collection_name)
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )
    except Exception as e:
        logger.warning("[ingest:indexing] Failed to verify/create collection '%s': %s", collection_name, e)
        # Attempt to proceed regardless (might already exist or client has issues)

    # 2. Inject board and source mapping to each node's metadata
    for node in nodes:
        node.metadata["board_id"] = board_id
        node.metadata["source_id"] = source_id
        # Exclude metadata fields from being embedded if necessary, 
        # but storing them as payload is required for filtering.

    # 3. Create LlamaIndex QdrantVectorStore and run embedding pipeline
    embed_model = GeminiEmbedding(
        model_name="models/text-embedding-004",
        api_key=settings.GOOGLE_API_KEY
    )
    
    vector_store = QdrantVectorStore(
        collection_name=collection_name,
        client=client
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    
    logger.info("[ingest:indexing] Generating embeddings and indexing to Qdrant vector store")
    
    # VectorStoreIndex.from_documents or VectorStoreIndex (with nodes list)
    # automatically computes embeddings using the provided embed_model and saves to Qdrant.
    VectorStoreIndex(
        nodes,
        storage_context=storage_context,
        embed_model=embed_model
    )
    
    # 4. Write Chunk rows to PostgreSQL for relational context
    logger.info("[ingest:indexing] Writing %d chunk records to PostgreSQL", len(nodes))
    for idx, node in enumerate(nodes):
        # Read page label or page number if exists
        page_num = node.metadata.get("page_label") or node.metadata.get("page_number")
        try:
            if page_num is not None:
                page_num = int(page_num)
        except (ValueError, TypeError):
            page_num = None

        db_chunk = Chunk(
            id=node.id_,
            board_id=board_id,
            source_id=source_id,
            content=node.text,
            chunk_index=idx,
            page_number=page_num,
            token_count=None
        )
        db.add(db_chunk)
    
    db.commit()
    logger.info("[ingest:indexing] Ingest and index completed successfully for source: %s", source_id)
