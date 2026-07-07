from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sensor_reading import SensorReading
from app.schemas.sensor_reading import SensorReadingOut
from app.services.websocket_manager import connection_manager

router = APIRouter(prefix="/iot", tags=["IoT"])


# ─── WebSocket endpoint ─────────────────────────────────────────────────────

@router.websocket("/ws/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str):
    """
    IOT-WS-02: Stream live sensor readings for a device.
    Client connects; server pushes {ts, value, metric, device_id, unit} on each reading.
    Subscribes to device_id channel AND global "*" channel.
    """
    await connection_manager.connect(websocket, device_id)
    try:
        while True:
            # Receive keeps the connection alive and detects client-initiated close.
            # This is a server-push stream; client messages are not used.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket, device_id)
    except Exception:
        # Network error, client crash — treat as disconnect
        await connection_manager.disconnect(websocket, device_id)


# ─── REST history endpoint ───────────────────────────────────────────────────

@router.get("/readings/{device_id}", response_model=list[SensorReadingOut])
def get_readings(
    device_id: str,
    metric: Optional[str] = Query(default=None, description="Filter by metric name"),
    limit: int = Query(default=200, ge=1, le=2000),
    hours: Optional[int] = Query(
        default=None, ge=1, le=168,
        description="Return readings from the last N hours (1–168). "
                    "When set, limit is applied within the time window.",
    ),
    db: Session = Depends(get_db),
):
    """
    IOT-WS-03: Return last N readings for a device (cold-start backfill).
    Optionally filter by metric and/or time window.
    Returns in ascending order (oldest first) for chart rendering.
    """
    query = db.query(SensorReading).filter(SensorReading.device_id == device_id)
    if metric:
        query = query.filter(SensorReading.metric == metric)
    if hours is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = query.filter(SensorReading.recorded_at >= cutoff)

    readings = (
        query.order_by(SensorReading.recorded_at.desc()).limit(limit).all()
    )
    # Reverse so oldest reading is first — frontend charts render left-to-right
    return list(reversed(readings))
