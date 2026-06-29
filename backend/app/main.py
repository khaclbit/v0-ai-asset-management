from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, assets, users, assignments, maintenance


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing needed for now (Alembic handles migrations separately)
    yield
    # Shutdown: cleanup if needed


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


@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "2.0.0"}
