"""In-memory sliding window rate limiter."""
from collections import defaultdict
from datetime import datetime, timezone
import time
from typing import Dict, List
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    def __init__(self):
        self._history: Dict[str, List[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.time()
        window_start = now - window_seconds
        timestamps = self._history[key]

        # Clean expired timestamps
        self._history[key] = [t for t in timestamps if t > window_start]

        if len(self._history[key]) >= max_requests:
            return False

        self._history[key].append(now)
        return True


rate_limiter = SlidingWindowRateLimiter()


def rate_limit(max_requests: int, window_seconds: int = 60, key_prefix: str = ""):
    async def dependency(request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        key = f"{key_prefix}:{client_ip}"
        allowed = rate_limiter.check(key, max_requests, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {window_seconds} seconds.",
            )
        return True

    return dependency
