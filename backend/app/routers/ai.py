"""AI Predictive Maintenance router — inference + approval endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.ai_recommendation import (
    AiRecommendationResponse,
    DeferRequest,
    InferenceRequest,
)
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI Predictive Maintenance"])


@router.post("/recommendations", response_model=AiRecommendationResponse, status_code=201)
def trigger_inference(
    body: InferenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI-03: Trigger ML inference for a given asset_id.
    Loads the trained model, engineers features from sensor_readings,
    and persists a new AiRecommendation row.
    All authenticated users can trigger inference.
    """
    return ai_service.run_inference(db, str(body.asset_id), current_user)


@router.get("/recommendations", response_model=list[AiRecommendationResponse])
def list_recommendations(
    asset_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI-04: List all recommendations sorted by risk level (High first) then
    confidence descending. Optionally filter by ?asset_id=.
    """
    return ai_service.list_recommendations(db, asset_id=asset_id)


@router.post("/recommendations/run-now", response_model=list[AiRecommendationResponse])
def run_recommendations_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """Run predictive inference across all assets and return fresh alert-only results."""
    return ai_service.run_inference_for_all_assets(db, current_user, alerts_only=True)


@router.post(
    "/recommendations/{rec_id}/approve",
    response_model=AiRecommendationResponse,
)
def approve_recommendation(
    rec_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """
    AI-05: Approve a pending recommendation. Manager/Admin only.
    Sets action_state="approved" and records approved_by + approved_at.
    Returns 409 if already approved or deferred.
    """
    return ai_service.approve_recommendation(db, rec_id, current_user)


@router.post(
    "/recommendations/{rec_id}/defer",
    response_model=AiRecommendationResponse,
)
def defer_recommendation(
    rec_id: str,
    body: DeferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """
    AI-05: Defer a pending recommendation. Manager/Admin only.
    Sets action_state="deferred" with optional defer_reason.
    Returns 409 if already approved or deferred.
    """
    return ai_service.defer_recommendation(db, rec_id, body.defer_reason, current_user)
