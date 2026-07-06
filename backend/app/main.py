import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.mqtt import start_mqtt_consumer
from app.routers import auth, assets, users, assignments, maintenance, iot, ai, notifications
from app.routers import alert_rules, alert_events
from app.services.websocket_manager import connection_manager
from app.services.notification_manager import notification_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch MQTT consumer as permanent background task (IOT-CONS-04)
    mqtt_task = asyncio.create_task(start_mqtt_consumer())

    yield  # app is running

    # Shutdown: cancel consumer, close all WebSocket and SSE connections, wait for clean exit
    mqtt_task.cancel()
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


@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "2.0.0"}
