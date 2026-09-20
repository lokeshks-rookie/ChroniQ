"""Server-Sent Events (SSE) Pub/Sub broadcaster."""
import asyncio
from dataclasses import dataclass
import json
from typing import Any, AsyncGenerator, Dict, List, Optional


@dataclass
class SSEEvent:
    event: str
    data: str
    id: Optional[str] = None

    def encode(self) -> str:
        lines = []
        if self.id:
            lines.append(f"id: {self.id}")
        if self.event:
            lines.append(f"event: {self.event}")
        lines.append(f"data: {self.data}")
        return "\n".join(lines) + "\n\n"


class EventBroadcaster:
    def __init__(self):
        # Maps channel name to list of asyncio.Queue instances
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}

    async def subscribe(self, channel: str) -> AsyncGenerator[str, None]:
        queue: asyncio.Queue = asyncio.Queue()
        if channel not in self._subscribers:
            self._subscribers[channel] = []
        self._subscribers[channel].append(queue)

        try:
            # Yield initial connection heartbeat
            yield SSEEvent(event="connected", data=json.dumps({"channel": channel, "status": "active"})).encode()
            while True:
                try:
                    # 15s timeout to send keep-alive comment
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield event.encode()
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            if channel in self._subscribers and queue in self._subscribers[channel]:
                self._subscribers[channel].remove(queue)
                if not self._subscribers[channel]:
                    del self._subscribers[channel]

    async def publish(self, channel: str, event_name: str, data: Any, event_id: Optional[str] = None):
        if channel not in self._subscribers:
            return

        payload = json.dumps(data) if not isinstance(data, str) else data
        sse_event = SSEEvent(event=event_name, data=payload, id=event_id)

        for queue in list(self._subscribers[channel]):
            await queue.put(sse_event)


broadcaster = EventBroadcaster()
