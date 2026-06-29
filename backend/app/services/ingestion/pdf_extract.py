import logging
from llama_index.core import Document
from app.config import settings

logger = logging.getLogger(__name__)

async def extract_pdf(file_path: str) -> list[Document]:
    """
    Extracts text/markdown content from a PDF file on disk using LlamaParse
    if LLAMA_CLOUD_API_KEY is set, falling back to LlamaIndex SimpleDirectoryReader (pypdf).
    """
    if settings.LLAMA_CLOUD_API_KEY:
        logger.info("[ingest:pdf] LLAMA_CLOUD_API_KEY found, parsing via LlamaParse: %s", file_path)
        try:
            from llama_parse import LlamaParse
            parser = LlamaParse(
                api_key=settings.LLAMA_CLOUD_API_KEY,
                result_type="markdown",
                verbose=False
            )
            # aload_data is the async method to parse the file
            documents = await parser.aload_data(file_path)
            return documents
        except Exception as parse_exc:
            logger.warning("[ingest:pdf] LlamaParse failed, falling back to local reader: %s", parse_exc)
            # Fall through to local reader
    
    logger.info("[ingest:pdf] Parsing via local SimpleDirectoryReader (fallback): %s", file_path)
    from llama_index.core import SimpleDirectoryReader
    reader = SimpleDirectoryReader(input_files=[file_path])
    # load_data is synchronous, run in executor if necessary, but SimpleDirectoryReader is fast enough
    documents = reader.load_data()
    return documents
