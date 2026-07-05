import asyncio
import json

from fastapi import WebSocket


class ConnectionManager:
    """
    Asyncio-safe WebSocket connection manager.

    Channels:
      device_id (str) → set of WebSockets subscribed to that device
      "*"             → set of WebSockets subscribed to ALL devices (global)

    Every connect() registers to BOTH the device channel AND "*".
    broadcast() sends to the union of device-specific + global subscribers,
    deduplicated via set union.

    Critical invariant: the lock is NEVER held across await ws.send_text()
    calls — holding it during send would block concurrent connect/disconnect
    for the full broadcast duration.
    """

    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, device_id: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._channels.setdefault(device_id, set()).add(websocket)
            self._channels.setdefault("*", set()).add(websocket)

    async def disconnect(self, websocket: WebSocket, device_id: str) -> None:
        async with self._lock:
            self._channels.get(device_id, set()).discard(websocket)
            self._channels.get("*", set()).discard(websocket)

    async def broadcast(self, device_id: str, payload: dict) -> None:
        """
        Broadcast JSON payload to all subscribers of device_id and global channel.
        Dead connections are silently removed (no exception propagation).
        """
        text = json.dumps(payload)
        # Snapshot under lock, then release before await
        async with self._lock:
            targets: set[WebSocket] = (
                self._channels.get(device_id, set()).copy()
                | self._channels.get("*", set()).copy()
            )
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._channels.get(device_id, set()).discard(ws)
                    self._channels.get("*", set()).discard(ws)

    async def close_all(self) -> None:
        """Called during lifespan shutdown to send close frames to all clients."""
        async with self._lock:
            all_ws: set[WebSocket] = set()
            for ws_set in self._channels.values():
                all_ws |= ws_set
        for ws in all_ws:
            try:
                await ws.close()
            except Exception:
                pass


# Module-level singleton — imported by both consumer.py and routers/iot.py
connection_manager = ConnectionManager()
