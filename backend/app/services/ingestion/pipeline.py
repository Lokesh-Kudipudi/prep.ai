import logging
import traceback
from sqlalchemy.orm import Session

from app.models.source import Source
from app.services.ingestion.pdf_extract import extract_pdf
from app.services.ingestion.doc_agent import fetch_docs
from app.services.ingestion.chunking import chunk_documents
from app.services.ingestion.indexing import index_nodes

logger = logging.getLogger(__name__)

async def run_ingestion_task(source_id: str, db_session_creator) -> None:
    """
    Background worker task that orchestrates the document ingestion pipeline.
    Runs text extraction, semantic chunking, and Qdrant/Postgres indexing.
    """
    logger.info("[ingest:pipeline] Initiating ingestion workflow for source: %s", source_id)
    
    # 1. Open a new database session
    db: Session = db_session_creator()
    
    try:
        # Fetch the source record
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            logger.error("[ingest:pipeline] Source ID %s not found in relational database", source_id)
            return
            
        # 2. Transition status to "processing"
        source.status = "processing"
        db.commit()
        logger.info("[ingest:pipeline] Source %s status updated to 'processing'", source_id)
        
        # 3. Perform document extraction
        documents = []
        if source.type == "PDF":
            # Map standard /uploads/ URL to local directory /app/uploads/
            abs_path = f"/app{source.path}"
            logger.info("[ingest:pipeline] Extracting PDF from local file: %s", abs_path)
            documents = await extract_pdf(abs_path)
        elif source.type == "WEB":
            logger.info("[ingest:pipeline] Scraper fetching web query: %s", source.title)
            documents = await fetch_docs(source.title)
        else:
            raise ValueError(f"Unsupported source type: {source.type}")
            
        if not documents:
            raise ValueError("No text or content could be extracted from the source.")
            
        # 4. Perform semantic chunking
        logger.info("[ingest:pipeline] Semantic chunking documents...")
        nodes = chunk_documents(documents)
        
        if not nodes:
            raise ValueError("Document parsing yielded zero semantic chunks.")
            
        # 5. Embed and index nodes
        logger.info("[ingest:pipeline] Indexing chunks in databases...")
        await index_nodes(
            nodes=nodes,
            board_id=source.board_id,
            source_id=source.id,
            db=db
        )
        
        # 6. Final status transition to "indexed"
        source.status = "indexed"
        db.commit()
        logger.info("[ingest:pipeline] Ingestion task completed successfully for source: %s", source_id)
        
    except Exception as exc:
        # Roll back any active transaction
        db.rollback()
        
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        logger.error("[ingest:pipeline] Pipeline failure: %s\n%s", error_msg, traceback.format_exc())
        
        # Reload source record to write error status
        try:
            source = db.query(Source).filter(Source.id == source_id).first()
            if source:
                source.status = "failed"
                source.error_message = error_msg
                db.commit()
                logger.info("[ingest:pipeline] Source %s status updated to 'failed'", source_id)
        except Exception as db_exc:
            logger.error("[ingest:pipeline] Failed to record error status for source %s: %s", source_id, db_exc)
            
    finally:
        db.close()
