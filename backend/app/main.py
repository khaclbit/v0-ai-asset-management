import asyncio
import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.mqtt import start_mqtt_consumer
from app.routers import auth, assets, users, assignments, maintenance, iot, ai, notifications
from app.routers import alert_rules, alert_events
from app.routers import anomaly_detections
from app.services.anomaly_detector import run_anomaly_job
from app.services.websocket_manager import connection_manager
from app.services.notification_manager import notification_manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch MQTT consumer as permanent background task (IOT-CONS-04)
    mqtt_task = asyncio.create_task(start_mqtt_consumer())

    # Startup: launch APScheduler for periodic anomaly detection
    scheduler = BackgroundScheduler()
    if settings.OPENAI_API_KEY is None:
        logger.warning(
            "OPENAI_API_KEY is not configured — anomaly detection scheduler job will not be registered. "
            "Set OPENAI_API_KEY in your .env file to enable AI anomaly detection."
        )
    else:
        scheduler.add_job(
            run_anomaly_job,
            trigger="interval",
            minutes=settings.AI_ANOMALY_INTERVAL_MINUTES,
            id="anomaly_detection_job",
            replace_existing=True,
        )
        logger.info(
            "Anomaly detection scheduler registered — interval: %d minutes, model: %s",
            settings.AI_ANOMALY_INTERVAL_MINUTES,
            settings.AI_ANOMALY_MODEL,
        )
    scheduler.start()

    yield  # app is running

    # Shutdown: cancel consumer, stop scheduler, close all WebSocket and SSE connections
    mqtt_task.cancel()
    scheduler.shutdown(wait=False)
    await connection_manager.close_all()
    await notification_manager.close_all()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass  # expected — start_mqtt_consumer raised CancelledError cleanly


app = FastAPI(
    title="AI Asset Management System API",
    description="REST API for Smart AI-Powered Asset Management System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(assets.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(assignments.router, prefix=API_PREFIX)
app.include_router(maintenance.router, prefix=API_PREFIX)
app.include_router(iot.router, prefix=API_PREFIX)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(alert_rules.router, prefix=API_PREFIX)
app.include_router(alert_events.router, prefix=API_PREFIX)
app.include_router(anomaly_detections.router, prefix=API_PREFIX)
app.include_router(anomaly_detections.system_settings_router, prefix=API_PREFIX)


@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "2.0.0"}
