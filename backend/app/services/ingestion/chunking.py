import logging
from llama_index.core import Document
from llama_index.core.schema import TextNode
from llama_index.core.node_parser import SemanticSplitterNodeParser
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from app.config import settings

logger = logging.getLogger(__name__)

def chunk_documents(docs: list[Document]) -> list[TextNode]:
    """
    Splits LlamaIndex documents into semantic chunks using SemanticSplitterNodeParser
    and text-embedding-004.
    """
    logger.info("[ingest:chunking] Initializing SemanticSplitterNodeParser with Gemini embeddings")
    
    # 1. Initialize Gemini embedding model
    from app.services.vectorstore import RateLimitedGoogleGenAIEmbedding
    embed_model = RateLimitedGoogleGenAIEmbedding(
        model_name="models/gemini-embedding-2",
        api_key=settings.GOOGLE_API_KEY,
        embedding_config={"output_dimensionality": 768}
    )
    
    # 2. Configure semantic splitter
    parser = SemanticSplitterNodeParser(
        buffer_size=1,
        breakpoint_percentile_threshold=95,
        embed_model=embed_model
    )
    
    # 3. Parse and chunk documents
    nodes = parser.get_nodes_from_documents(docs)
    logger.info("[ingest:chunking] Generated %d semantic chunk nodes", len(nodes))
    return nodes
