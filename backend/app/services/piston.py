import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

async def execute_code(language: str, source: str, stdin: str = "") -> dict:
    """
    Executes raw code inside the Dockerized Piston sandbox container.
    Returns standard execution payload containing stdout, stderr, and run code status.
    """
    logger.info("[service:piston] Posting code execution task for language: %s", language)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{settings.PISTON_URL}/api/v2/execute",
                json={
                    "language": language,
                    "version": "*",
                    "files": [{"content": source}],
                    "stdin": stdin
                }
            )
        resp.raise_for_status()
        data = resp.json()
        
        # Piston response format:
        # { "run": { "stdout": "...", "stderr": "...", "code": 0, "signal": null, "output": "..." } }
        run_data = data.get("run", {})
        return {
            "stdout": run_data.get("stdout", ""),
            "stderr": run_data.get("stderr", ""),
            "code": run_data.get("code", 0),
            "output": run_data.get("output", "")
        }
    except Exception as e:
        logger.error("[service:piston] Connection failed to Piston sandbox container at %s: %s", settings.PISTON_URL, e)
        # Return structured error to caller
        return {
            "stdout": "",
            "stderr": f"Compilation/Execution Sandbox Error: Sandbox container at {settings.PISTON_URL} is currently unreachable. {str(e)}",
            "code": -1,
            "output": ""
        }
