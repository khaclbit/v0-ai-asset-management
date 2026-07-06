"""Alert Rules router — CRUD + test dry-run endpoint."""
import uuid
from datetime import timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.alert_rule import AlertEvent, AlertRule, AlertRuleChannel, AlertRuleCondition
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.schemas.alert_rule import (
    AlertRuleCreateRequest,
    AlertRuleRead,
    AlertRuleUpdate,
    PaginatedAlertRules,
)

router = APIRouter(prefix="/alert-rules", tags=["Alert Rules"])

# ── helpers ───────────────────────────────────────────────────────────────────

def _get_rule_or_404(rule_id: uuid.UUID, db: Session) -> AlertRule:
    stmt = (
        select(AlertRule)
        .where(AlertRule.id == rule_id)
        .options(
            selectinload(AlertRule.conditions).selectinload(AlertRuleCondition.children),
            selectinload(AlertRule.channels),
        )
    )
    rule = db.execute(stmt).scalars().first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return rule


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=AlertRuleRead, status_code=201)
def create_alert_rule(
    body: AlertRuleCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """
    ALR-API-01: Create an alert rule with nested conditions and channels.
    Admin / Asset Manager only.
    """
    # Create the rule record
    rule = AlertRule(
        name=body.name,
        description=body.description,
        sensor_device_id=body.sensor_device_id,
        asset_id=body.asset_id,
        is_enabled=body.is_enabled,
        severity=body.severity,
        cooldown_minutes=body.cooldown_minutes,
        escalation_minutes=body.escalation_minutes,
        created_by=current_user.id,
    )
    db.add(rule)
    db.flush()  # get rule.id before inserting children

    # Create conditions
    for cond_input in body.conditions:
        condition = AlertRuleCondition(
            rule_id=rule.id,
            category=cond_input.category,
            type=cond_input.type,
            parameters=cond_input.parameters,
            logic_op=cond_input.logic_op,
            parent_id=cond_input.parent_id,
            sort_order=cond_input.sort_order,
        )
        db.add(condition)

    # Create channels
    for chan_input in body.channels:
        channel = AlertRuleChannel(
            rule_id=rule.id,
            channel=chan_input.channel,
            config=chan_input.config,
            is_enabled=chan_input.is_enabled,
        )
        db.add(channel)

    db.commit()

    # Invalidate cache if evaluator is available
    try:
        from app.services.alert_evaluator import invalidate_rule_cache
        invalidate_rule_cache(rule.sensor_device_id)
    except Exception:
        pass

    return _get_rule_or_404(rule.id, db)


@router.get("", response_model=PaginatedAlertRules)
def list_alert_rules(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    asset_id: Optional[uuid.UUID] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    is_enabled: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ALR-API-02: Paginated list of alert rules.
    All authenticated users can list rules.
    Filter by asset_id, severity, is_enabled.
    """
    stmt = select(AlertRule)
    if asset_id is not None:
        stmt = stmt.where(AlertRule.asset_id == asset_id)
    if severity is not None:
        stmt = stmt.where(AlertRule.severity == severity)
    if is_enabled is not None:
        stmt = stmt.where(AlertRule.is_enabled == is_enabled)

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(total_stmt).scalar_one()

    stmt = (
        stmt.options(
            selectinload(AlertRule.conditions).selectinload(AlertRuleCondition.children),
            selectinload(AlertRule.channels),
        )
        .order_by(AlertRule.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    items = list(db.execute(stmt).scalars().all())

    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/{rule_id}", response_model=AlertRuleRead)
def get_alert_rule(
    rule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ALR-API-03: Get a single alert rule with nested conditions tree and channels.
    All authenticated users.
    """
    return _get_rule_or_404(rule_id, db)


@router.put("/{rule_id}", response_model=AlertRuleRead)
def update_alert_rule(
    rule_id: uuid.UUID,
    body: AlertRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """
    ALR-API-04: Update alert rule metadata.
    Admin / Asset Manager only.
    """
    rule = _get_rule_or_404(rule_id, db)

    update_data = body.model_dump(exclude_unset=True)
    old_device_id = rule.sensor_device_id

    for field, value in update_data.items():
        setattr(rule, field, value)

    # Bump updated_at manually (server_default only fires on INSERT)
    from datetime import datetime as dt
    rule.updated_at = dt.now(tz=timezone.utc)

    db.commit()

    # Invalidate cache for old and new device IDs
    try:
        from app.services.alert_evaluator import invalidate_rule_cache
        invalidate_rule_cache(old_device_id)
        if rule.sensor_device_id != old_device_id:
            invalidate_rule_cache(rule.sensor_device_id)
    except Exception:
        pass

    return _get_rule_or_404(rule_id, db)


@router.delete("/{rule_id}", status_code=204)
def delete_alert_rule(
    rule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """
    ALR-API-05: Delete an alert rule.
    Cascades to conditions and channels via FK ON DELETE CASCADE.
    Admin / Asset Manager only. Returns 204 No Content.
    """
    # Use a plain select (no eager loads needed — just need to confirm existence)
    rule = db.execute(
        select(AlertRule).where(AlertRule.id == rule_id)
    ).scalars().first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Alert rule not found")

    device_id = rule.sensor_device_id
    db.delete(rule)
    db.commit()

    try:
        from app.services.alert_evaluator import invalidate_rule_cache
        invalidate_rule_cache(device_id)
    except Exception:
        pass


@router.post("/{rule_id}/test")
def test_alert_rule(
    rule_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ALR-API-06: Dry-run — evaluate rule against the most recent sensor reading.
    Does NOT insert an AlertEvent.
    Returns: {matched: bool, explanation: str, reading: dict | null}
    """
    rule = _get_rule_or_404(rule_id, db)

    # Find the most recent sensor reading for this device
    latest = db.execute(
        select(SensorReading)
        .where(SensorReading.device_id == rule.sensor_device_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(1)
    ).scalars().first()

    if latest is None:
        return {
            "matched": False,
            "explanation": f"No sensor readings found for device '{rule.sensor_device_id}'",
            "reading": None,
        }

    reading_dict = {
        "id": str(latest.id),
        "device_id": latest.device_id,
        "metric": latest.metric,
        "value": latest.value,
        "unit": latest.unit,
        "recorded_at": latest.recorded_at.isoformat(),
    }

    try:
        from app.services.alert_evaluator import _evaluate_rule
        matched = _evaluate_rule(
            rule=rule,
            device_id=latest.device_id,
            metric=latest.metric,
            value=latest.value,
            recorded_at=latest.recorded_at,
            db=db,
        )
        explanation = (
            f"Rule {'MATCHED' if matched else 'did not match'} against "
            f"reading: {latest.metric}={latest.value}{latest.unit} "
            f"at {latest.recorded_at.isoformat()}"
        )
    except Exception as exc:
        matched = False
        explanation = f"Evaluation error: {exc}"

    return {
        "matched": matched,
        "explanation": explanation,
        "reading": reading_dict,
    }
