"""
app/services/rate_limiter.py
============================
Shared rate-limiting utilities for all Gemini API callers.

Provides:
  - ThreadSafeRateLimiter  — blocking, for sync contexts (Ragas evaluate threads)
  - AsyncRateLimiter       — non-blocking, for async contexts (pipeline queries)
  - RateLimitedChatLLM     — LangChain ChatGoogleGenerativeAI subclass that
                             injects rate-limiting into every _generate / _agenerate
                             call, so Ragas evaluate() is fully controlled.

Default limits: 13 req/min, 1 s minimum gap between calls.
"""

import re
import time
import threading
import asyncio
import logging
from collections import deque
from typing import Any, Deque, List, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatResult
from langchain_core.callbacks.manager import (
    CallbackManagerForLLMRun,
    AsyncCallbackManagerForLLMRun,
)

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_RPM: int   = 13
MIN_GAP_S: float = 1.0
WINDOW_S: float  = 60.0


# ── Helpers ───────────────────────────────────────────────────────────────────
def parse_retry_delay(err_str: str) -> float:
    """Extract the retryDelay value (seconds) from a 429 or 409 error response body."""
    # 1. Search for retryDelay: '42s' or "42" in JSON response
    m = re.search(r"retryDelay['\"\s]*:\s*['\"\s]*(\d+(?:\.\d+)?)s?['\"\s]*", err_str)
    if m:
        return float(m.group(1))
        
    # 2. Search for raw message format: "Please retry in 42.100421558s"
    m_retry = re.search(r"Please retry in\s+(\d+(?:\.\d+)?)s?", err_str)
    if m_retry:
        return float(m_retry.group(1))
        
    return 60.0


# ══════════════════════════════════════════════════════════════════════════════
# Thread-safe rate limiter (for sync contexts — Ragas evaluate() thread)
# ══════════════════════════════════════════════════════════════════════════════
class ThreadSafeRateLimiter:
    """
    Sliding-window rate limiter safe to use from synchronous threads.

    Enforces:
      - At most MAX_RPM calls within any 60-second window.
      - A minimum of MIN_GAP_S between consecutive calls.
    """

    def __init__(self, max_rpm: int = MAX_RPM, min_gap: float = MIN_GAP_S, window: float = WINDOW_S):
        self._max_rpm  = max_rpm
        self._min_gap  = min_gap
        self._window   = window
        self._ts: Deque[float] = deque()
        self._last: float = 0.0
        self._lock = threading.Lock()

    def acquire(self) -> None:
        """Block until a rate-limit slot is available, then claim it."""
        with self._lock:
            now = time.monotonic()

            # Enforce minimum inter-call gap
            gap = self._min_gap - (now - self._last)
            if gap > 0:
                time.sleep(gap)
                now = time.monotonic()

            # Drop expired timestamps
            while self._ts and now - self._ts[0] >= self._window:
                self._ts.popleft()

            # Wait until under cap (loop in case multiple windows needed)
            while len(self._ts) >= self._max_rpm:
                wait = self._window - (now - self._ts[0]) + 0.1
                logger.info(
                    "[ThreadRateLimiter] %d/%d slots used. Waiting %.1f s for window reset…",
                    len(self._ts), self._max_rpm, wait
                )
                # Release lock while sleeping so other threads can check too
                self._lock.release()
                time.sleep(wait)
                self._lock.acquire()
                now = time.monotonic()
                while self._ts and now - self._ts[0] >= self._window:
                    self._ts.popleft()

            self._ts.append(now)
            self._last = now


# ══════════════════════════════════════════════════════════════════════════════
# Async rate limiter (for async pipeline queries)
# ══════════════════════════════════════════════════════════════════════════════
class AsyncRateLimiter:
    """
    Sliding-window rate limiter for async/await contexts.

    Enforces:
      - At most MAX_RPM calls within any 60-second window.
      - A minimum of MIN_GAP_S between consecutive calls.
    """

    def __init__(self, max_rpm: int = MAX_RPM, min_gap: float = MIN_GAP_S, window: float = WINDOW_S):
        self._max_rpm = max_rpm
        self._min_gap = min_gap
        self._window  = window
        self._ts: Deque[float] = deque()
        self._last: float = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Async-await until a rate-limit slot is available, then claim it."""
        async with self._lock:
            now = time.monotonic()

            gap = self._min_gap - (now - self._last)
            if gap > 0:
                await asyncio.sleep(gap)
                now = time.monotonic()

            while self._ts and now - self._ts[0] >= self._window:
                self._ts.popleft()

            while len(self._ts) >= self._max_rpm:
                wait = self._window - (now - self._ts[0]) + 0.1
                logger.info(
                    "[AsyncRateLimiter] %d/%d slots used. Waiting %.1f s for window reset…",
                    len(self._ts), self._max_rpm, wait
                )
                await asyncio.sleep(wait)
                now = time.monotonic()
                while self._ts and now - self._ts[0] >= self._window:
                    self._ts.popleft()

            self._ts.append(now)
            self._last = now


# ── Module-level singletons (shared across all callers in the same process) ──
thread_limiter = ThreadSafeRateLimiter()
async_limiter  = AsyncRateLimiter()

# Rate limiters for embeddings (max 90 RPM, minimum gap of 0.66 seconds)
thread_embeddings_limiter = ThreadSafeRateLimiter(max_rpm=90, min_gap=0.66)
async_embeddings_limiter  = AsyncRateLimiter(max_rpm=90, min_gap=0.66)


# ══════════════════════════════════════════════════════════════════════════════
# Rate-limited LangChain LLM adapter (wraps ChatGoogleGenerativeAI for Ragas)
# ══════════════════════════════════════════════════════════════════════════════
class RateLimitedChatLLM(ChatGoogleGenerativeAI):
    """
    Drop-in replacement for ChatGoogleGenerativeAI that intercepts every
    _generate / _agenerate call with rate limiting + 429-aware retries.

    Pass this to ragas.evaluate(llm=...) instead of bare ChatGoogleGenerativeAI.

    Usage:
        from app.services.rate_limiter import RateLimitedChatLLM
        llm = RateLimitedChatLLM(
            model="gemini-flash-lite-latest",
            google_api_key=settings.GOOGLE_API_KEY,
            max_retries=0,   # disable LangChain's own retry — we handle it here
        )
    """

    # ── Sync generation (used by Ragas internally) ────────────────────────────
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        for attempt in range(20):
            thread_limiter.acquire()
            try:
                return super()._generate(messages, stop, run_manager, **kwargs)
            except Exception as e:
                err = str(e)
                if "429" in err or "resource_exhausted" in err.lower():
                    delay = parse_retry_delay(err)
                    logger.warning(
                        "[RateLimitedChatLLM] 429 received. Waiting %.0f s (attempt %d/20)…",
                        delay, attempt + 1
                    )
                    time.sleep(delay)
                else:
                    raise
        raise RuntimeError("[RateLimitedChatLLM] Exceeded 20 retries on rate-limit")

    # ── Async generation (used when Ragas is awaited) ─────────────────────────
    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        for attempt in range(20):
            await async_limiter.acquire()
            try:
                return await super()._agenerate(messages, stop, run_manager, **kwargs)
            except Exception as e:
                err = str(e)
                if "429" in err or "resource_exhausted" in err.lower():
                    delay = parse_retry_delay(err)
                    logger.warning(
                        "[RateLimitedChatLLM] 429 received. Waiting %.0f s (attempt %d/20)…",
                        delay, attempt + 1
                    )
                    await asyncio.sleep(delay)
                else:
                    raise
        raise RuntimeError("[RateLimitedChatLLM] Exceeded 20 retries on rate-limit")
