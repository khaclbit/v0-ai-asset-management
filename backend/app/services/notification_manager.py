"""
notification_manager.py — SSE per-user notification delivery.

Mirrors ConnectionManager's design (asyncio.Queue per user, asyncio.Lock,
snapshot-before-iterate, module-level singleton) but uses asyncio.Queue
instead of WebSocket sets — one queue per connected browser tab per user.

PITFALL NOTE (SSE-2): A single queue per user would starve a second browser
tab. We keep set-of-queues per user_id, same pattern as
ConnectionManager._channels.

PITFALL NOTE (SSE-3): Never hold the lock during queue.put_nowait() — that
blocks the MQTT consumer task for the full iteration of all user queues.
Snapshot under lock, then release before iterating.
"""

import asyncio
import json
from typing import Optional


class NotificationManager:
    """
    SSE notification delivery manager.

    user_id (str) → set of asyncio.Queue objects (one per connected tab)

    push() delivers to all queues for a user.
    stream() is an async generator that yields SSE-formatted strings.
    """

    def __init__(self) -> None:
        self._channels: dict[str, set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str) -> asyncio.Queue:
        """Register a new SSE connection for user_id. Returns the queue to read from."""
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._channels.setdefault(user_id, set()).add(q)
        return q

    async def disconnect(self, user_id: str, q: asyncio.Queue) -> None:
        """Remove a queue on SSE disconnect."""
        async with self._lock:
            self._channels.get(user_id, set()).discard(q)

    async def push(self, user_id: str, event: dict) -> None:
        """
        Deliver a notification event to all SSE connections for user_id.
        Snapshot under lock, put_nowait outside lock (SSE-3 safety).
        """
        async with self._lock:
            queues = self._channels.get(user_id, set()).copy()
        payload = json.dumps(event)
        for q in queues:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass  # slow consumer — drop rather than block

    async def push_to_all(self, event: dict) -> None:
        """Deliver a notification to ALL connected users (e.g., system alerts)."""
        async with self._lock:
            all_users = list(self._channels.keys())
        for user_id in all_users:
            await self.push(user_id, event)

    async def stream(self, user_id: str, q: asyncio.Queue):
        """
        Async generator yielding SSE-formatted strings from the user's queue.
        Sends a keepalive comment every 15 seconds to prevent proxy timeouts.
        The finally: block is the ONLY reliable cleanup point on disconnect.
        """
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    # SSE keepalive — prevents nginx/proxy from closing idle connections
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            raise
        finally:
            await self.disconnect(user_id, q)

    async def close_all(self) -> None:
        """Called during lifespan shutdown to unblock all waiting generators."""
        async with self._lock:
            all_queues: list[asyncio.Queue] = [
                q for qs in self._channels.values() for q in qs
            ]
        sentinel = None  # None signals generators to stop
        for q in all_queues:
            try:
                q.put_nowait(sentinel)
            except asyncio.QueueFull:
                pass


# Module-level singleton — imported by routers/notifications.py and trigger points
notification_manager = NotificationManager()
