import logging
import urllib.parse
from bs4 import BeautifulSoup
import httpx
from llama_index.core import Document
from app.config import settings

logger = logging.getLogger(__name__)

async def fetch_docs(query: str) -> list[Document]:
    """
    Crawls documentation starting from a query or URL up to depth 1, 
    limited to settings.MAX_DOC_PAGES.
    """
    # 1. Resolve starting URL
    start_url = query.strip()
    if not (start_url.startswith("http://") or start_url.startswith("https://")):
        if "." in start_url:
            start_url = "https://" + start_url
        else:
            # Assume it's a library name and fallback to readthedocs or similar standard docs site
            start_url = f"https://{start_url.lower()}.readthedocs.io/"

    logger.info("[ingest:doc_agent] Resolving start URL: %s", start_url)
    
    parsed_start = urllib.parse.urlparse(start_url)
    start_domain = parsed_start.netloc
    
    # 2. Fetch the starting page to extract links
    urls_to_crawl = [start_url]
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            response = await client.get(start_url)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract links
                for a_tag in soup.find_all('a', href=True):
                    href = a_tag['href']
                    # Resolve relative URL
                    full_url = urllib.parse.urljoin(start_url, href)
                    parsed_full = urllib.parse.urlparse(full_url)
                    
                    # Ensure same domain and HTTP/HTTPS protocol
                    if (parsed_full.netloc == start_domain and 
                        parsed_full.scheme in ('http', 'https')):
                        # Strip query params, fragment to avoid duplicates
                        clean_url = urllib.parse.urlunparse((
                            parsed_full.scheme,
                            parsed_full.netloc,
                            parsed_full.path,
                            '', '', ''
                        ))
                        if clean_url not in urls_to_crawl:
                            urls_to_crawl.append(clean_url)
                            if len(urls_to_crawl) >= settings.MAX_DOC_PAGES:
                                break
    except Exception as e:
        logger.warning("[ingest:doc_agent] Failed to crawl links from index page %s: %s", start_url, e)
        # Keep urls_to_crawl as just the start_url

    logger.info("[ingest:doc_agent] URLs to fetch (count=%d): %s", len(urls_to_crawl), urls_to_crawl)
    
    # 3. Load pages using SimpleWebPageReader
    try:
        from llama_index.readers.web import SimpleWebPageReader
        # SimpleWebPageReader expects a list of URLs
        reader = SimpleWebPageReader(html_to_text=True)
        # SimpleWebPageReader is synchronous, run it safely
        documents = reader.load_data(urls=urls_to_crawl)
        
        # Inject source metadata
        for doc in documents:
            if 'url' in doc.metadata:
                doc.metadata['source_url'] = doc.metadata['url']
                
        return documents
    except Exception as e:
        logger.error("[ingest:doc_agent] Failed to fetch content via SimpleWebPageReader: %s", e)
        raise
