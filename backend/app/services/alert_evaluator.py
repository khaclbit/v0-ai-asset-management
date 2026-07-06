"""
alert_evaluator.py — Rule evaluation engine for sensor-based alert rules.

Architecture notes
------------------
* All functions are SYNC — callers in async context (MQTT consumer) wrap via
  asyncio.to_thread().
* One DB session is passed in per evaluation call (same session opened by the
  MQTT consumer's _write_to_db helper).
* In-process TTL cache (30 s) avoids a full DB round-trip per MQTT message when
  no rules exist for a device.
* Failures are caught at the top-level `evaluate_all_sync` boundary — an
  evaluator crash MUST NOT propagate to the MQTT consumer loop.

Condition categories
--------------------
A – Value rules  : threshold, range, enum_match
B – Temporal rules: rate_of_change, flatline, window_aggregate
C – Composite     : and, or, not, seq  (recursive over condition tree)
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from statistics import mean
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.alert_rule import AlertEvent, AlertRule, AlertRuleChannel, AlertRuleCondition
from app.models.notification import Notification
from app.models.sensor_reading import SensorReading

logger = logging.getLogger(__name__)

# ─── TTL rule cache ────────────────────────────────────────────────────────────
# Maps device_id → (list[AlertRule], cached_at_monotonic)
_RULE_CACHE: dict[str, tuple[list[AlertRule], float]] = {}
_CACHE_TTL_SECS = 30.0
_CACHE_LOCK = threading.Lock()


def _load_rules(device_id: str, db: Session) -> list[AlertRule]:
    """Return enabled alert rules for *device_id*, using a 30-second TTL cache."""
    now = time.monotonic()
    with _CACHE_LOCK:
        if device_id in _RULE_CACHE:
            rules, cached_at = _RULE_CACHE[device_id]
            if now - cached_at < _CACHE_TTL_SECS:
                return rules

    # Cache miss or expired — query DB
    stmt = (
        select(AlertRule)
        .where(
            AlertRule.sensor_device_id == device_id,
            AlertRule.is_enabled == True,  # noqa: E712
        )
    )
    rules = list(db.execute(stmt).scalars().all())

    with _CACHE_LOCK:
        _RULE_CACHE[device_id] = (rules, now)

    return rules


def invalidate_rule_cache(device_id: str | None = None) -> None:
    """Evict one or all device entries from the rule cache (called after rule edits)."""
    with _CACHE_LOCK:
        if device_id is None:
            _RULE_CACHE.clear()
        else:
            _RULE_CACHE.pop(device_id, None)


# ─── Cooldown check ───────────────────────────────────────────────────────────

def _check_cooldown(rule: AlertRule, db: Session) -> bool:
    """Return True if the rule is still in its cooldown window (should NOT fire)."""
    if rule.cooldown_minutes <= 0:
        return False
    cutoff = datetime.now(tz=timezone.utc) - timedelta(minutes=rule.cooldown_minutes)
    stmt = (
        select(func.count())
        .select_from(AlertEvent)
        .where(
            AlertEvent.rule_id == rule.id,
            AlertEvent.triggered_at >= cutoff,
        )
    )
    count: int = db.execute(stmt).scalar_one()
    return count > 0


# ─── Asset lookup ─────────────────────────────────────────────────────────────

def _resolve_asset_id(rule: AlertRule, device_id: str, db: Session) -> uuid.UUID | None:
    """
    Resolve a concrete asset UUID for the AlertEvent.asset_id column (NOT NULL).
    Priority: rule.asset_id → Asset.sensor_device_id lookup.
    Returns None when no asset can be found; caller should skip firing.
    """
    if rule.asset_id is not None:
        return rule.asset_id

    # Lazy import to avoid circular deps
    from app.models.asset import Asset  # type: ignore[attr-defined]

    stmt = select(Asset).where(Asset.sensor_device_id == device_id).limit(1)
    asset = db.execute(stmt).scalars().first()
    if asset:
        return asset.id
    return None


# ─── Fire alert ───────────────────────────────────────────────────────────────

def _fire_alert(
    rule: AlertRule,
    device_id: str,
    reading_snapshot: dict[str, Any],
    db: Session,
) -> AlertEvent | None:
    """
    Insert an AlertEvent row and return it.
    Returns None when no asset can be resolved (event skipped).
    """
    asset_id = _resolve_asset_id(rule, device_id, db)
    if asset_id is None:
        logger.warning(
            "alert_evaluator: cannot fire alert for rule %s — no asset linked to device %s",
            rule.id,
            device_id,
        )
        return None

    event = AlertEvent(
        id=uuid.uuid4(),
        rule_id=rule.id,
        asset_id=asset_id,
        sensor_device_id=device_id,
        reading_snapshot=reading_snapshot,
        severity=rule.severity,
    )
    db.add(event)
    db.flush()  # get event.id without committing yet
    return event


# ─── Channel dispatch ─────────────────────────────────────────────────────────

def _dispatch_in_app(
    rule: AlertRule,
    event: AlertEvent,
    channel: AlertRuleChannel,
    db: Session,
) -> None:
    """Create Notification rows for all managers/admins."""
    from app.services.notification_service import create_and_push, get_managers_and_admins

    title = f"[{rule.severity.upper()}] {rule.name}"
    message = (
        f"Alert rule '{rule.name}' fired for device {event.sensor_device_id}. "
        f"Snapshot: {event.reading_snapshot}"
    )
    href = "/dashboard/alerts"

    managers = get_managers_and_admins(db)
    for user in managers:
        notif = Notification(
            id=uuid.uuid4(),
            user_id=user.id,
            type="alert",
            title=title,
            message=message,
            is_read=False,
            href=href,
        )
        db.add(notif)


def _dispatch_email(
    rule: AlertRule,
    event: AlertEvent,
    channel: AlertRuleChannel,
) -> None:
    """Stub email dispatch — logs to Python logger (v2.3 will wire SMTP/SendGrid)."""
    recipients = channel.config.get("recipients", [])
    logger.info(
        "alert_evaluator: [EMAIL STUB] rule=%s device=%s severity=%s recipients=%s",
        rule.name,
        event.sensor_device_id,
        event.severity,
        recipients,
    )


def _dispatch_webhook(
    rule: AlertRule,
    event: AlertEvent,
    channel: AlertRuleChannel,
) -> None:
    """POST alert payload to the configured webhook URL using httpx (sync)."""
    url: str | None = channel.config.get("url")
    if not url:
        logger.warning("alert_evaluator: webhook channel for rule %s has no URL", rule.id)
        return

    try:
        import httpx  # lazy import — not in requirements before Phase 43

        payload = {
            "event_id": str(event.id),
            "rule_id": str(event.rule_id),
            "rule_name": rule.name,
            "device_id": event.sensor_device_id,
            "severity": event.severity,
            "triggered_at": event.triggered_at.isoformat() if event.triggered_at else None,
            "reading_snapshot": event.reading_snapshot,
        }
        headers = channel.config.get("headers", {})
        timeout = float(channel.config.get("timeout_seconds", 5.0))

        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, json=payload, headers=headers)
            logger.info(
                "alert_evaluator: webhook %s → HTTP %s", url, resp.status_code
            )
    except Exception:
        logger.exception("alert_evaluator: webhook dispatch failed for rule %s url=%s", rule.id, url)


def _dispatch_channels(
    rule: AlertRule,
    event: AlertEvent,
    db: Session,
) -> None:
    """Dispatch alert to all enabled channels configured on the rule."""
    stmt = (
        select(AlertRuleChannel)
        .where(
            AlertRuleChannel.rule_id == rule.id,
            AlertRuleChannel.is_enabled == True,  # noqa: E712
        )
    )
    channels = list(db.execute(stmt).scalars().all())

    for ch in channels:
        try:
            if ch.channel == "in_app":
                _dispatch_in_app(rule, event, ch, db)
            elif ch.channel == "email":
                _dispatch_email(rule, event, ch)
            elif ch.channel == "webhook":
                _dispatch_webhook(rule, event, ch)
            else:
                logger.warning(
                    "alert_evaluator: unknown channel type %r for rule %s", ch.channel, rule.id
                )
        except Exception:
            logger.exception(
                "alert_evaluator: channel dispatch error (channel=%s rule=%s)", ch.channel, rule.id
            )


# ─── Category A: Value evaluators ────────────────────────────────────────────

_OPERATORS = {
    ">": lambda a, b: a > b,
    ">=": lambda a, b: a >= b,
    "<": lambda a, b: a < b,
    "<=": lambda a, b: a <= b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}


def _eval_threshold(
    cond: AlertRuleCondition,
    metric: str,
    value: float,
) -> bool:
    """
    params: {metric: str, operator: str (> >= < <= == !=), value: float}
    Returns True when the reading matches the metric and satisfies the operator.
    """
    p = cond.parameters
    if p.get("metric") != metric:
        return False
    op_fn = _OPERATORS.get(p.get("operator", ">"))
    if op_fn is None:
        logger.warning("alert_evaluator: unknown operator %r in condition %s", p.get("operator"), cond.id)
        return False
    try:
        return bool(op_fn(value, float(p["value"])))
    except (KeyError, TypeError, ValueError):
        logger.warning("alert_evaluator: bad threshold params in condition %s: %s", cond.id, p)
        return False


def _eval_range(
    cond: AlertRuleCondition,
    metric: str,
    value: float,
) -> bool:
    """
    params: {metric: str, min: float, max: float}
    Fires (True) when value < min OR value > max (outside the safe range).
    """
    p = cond.parameters
    if p.get("metric") != metric:
        return False
    try:
        return not (float(p["min"]) <= value <= float(p["max"]))
    except (KeyError, TypeError, ValueError):
        logger.warning("alert_evaluator: bad range params in condition %s: %s", cond.id, p)
        return False


def _eval_enum_match(
    cond: AlertRuleCondition,
    metric: str,
    value: float,
) -> bool:
    """
    params: {metric: str, values: list[str|float]}
    Fires when the reading value (as string) matches any entry in the list.
    """
    p = cond.parameters
    if p.get("metric") != metric:
        return False
    allowed = [str(v) for v in p.get("values", [])]
    return str(value) in allowed or str(int(value)) in allowed


# ─── Category B: Temporal evaluators ─────────────────────────────────────────

def _eval_rate_of_change(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    value: float,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """
    params: {metric: str, max_delta: float, window_seconds: int}
    Fires when |current_value - oldest_value_in_window| > max_delta.
    Queries the oldest reading within the window to compute the delta.
    """
    p = cond.parameters
    if p.get("metric") != metric:
        return False
    try:
        max_delta = float(p["max_delta"])
        window_secs = int(p["window_seconds"])
    except (KeyError, TypeError, ValueError):
        logger.warning("alert_evaluator: bad rate_of_change params in condition %s: %s", cond.id, p)
        return False

    window_start = recorded_at - timedelta(seconds=window_secs)

    stmt = (
        select(SensorReading.value)
        .where(
            SensorReading.device_id == device_id,
            SensorReading.metric == metric,
            SensorReading.recorded_at >= window_start,
            SensorReading.recorded_at < recorded_at,
        )
        .order_by(SensorReading.recorded_at.asc())
        .limit(1)
    )
    row = db.execute(stmt).scalar_one_or_none()
    if row is None:
        # No historical data — cannot compute delta
        return False
    return abs(value - float(row)) > max_delta


def _eval_flatline(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """
    params: {metric: str, interval_seconds: int}
    Fires when no reading has arrived within *interval_seconds* before *recorded_at*.
    (i.e., the gap between the previous reading and now is too large.)
    """
    p = cond.parameters
    if p.get("metric") != metric:
        return False
    try:
        interval_secs = int(p["interval_seconds"])
    except (KeyError, TypeError, ValueError):
        logger.warning("alert_evaluator: bad flatline params in condition %s: %s", cond.id, p)
        return False

    # Query the most recent reading BEFORE this one
    stmt = (
        select(SensorReading.recorded_at)
        .where(
            SensorReading.device_id == device_id,
            SensorReading.metric == metric,
            SensorReading.recorded_at < recorded_at,
        )
        .order_by(SensorReading.recorded_at.desc())
        .limit(1)
    )
    prev_ts = db.execute(stmt).scalar_one_or_none()
    if prev_ts is None:
        # First reading ever — not a flatline condition
        return False
    gap = (recorded_at - prev_ts).total_seconds()
    return gap > interval_secs


def _eval_window_aggregate(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """
    params: {metric: str, window_seconds: int, aggregation: avg|min|max,
             operator: str, value: float}
    Queries readings within the rolling window, computes the aggregate, and
    applies the operator comparison.
    """
    p = cond.parameters
    if p.get("metric") != metric:
        return False
    try:
        window_secs = int(p["window_seconds"])
        aggregation = str(p["aggregation"]).lower()
        op_fn = _OPERATORS.get(p.get("operator", ">"))
        threshold_val = float(p["value"])
    except (KeyError, TypeError, ValueError):
        logger.warning("alert_evaluator: bad window_aggregate params in condition %s: %s", cond.id, p)
        return False

    if op_fn is None:
        return False

    window_start = recorded_at - timedelta(seconds=window_secs)
    stmt = (
        select(SensorReading.value)
        .where(
            SensorReading.device_id == device_id,
            SensorReading.metric == metric,
            SensorReading.recorded_at >= window_start,
            SensorReading.recorded_at <= recorded_at,
        )
    )
    readings = [float(r) for r in db.execute(stmt).scalars().all()]
    if not readings:
        return False

    if aggregation == "avg":
        agg_val = mean(readings)
    elif aggregation == "min":
        agg_val = min(readings)
    elif aggregation == "max":
        agg_val = max(readings)
    else:
        logger.warning("alert_evaluator: unknown aggregation %r in condition %s", aggregation, cond.id)
        return False

    return bool(op_fn(agg_val, threshold_val))


# ─── Category C: Composite evaluators ────────────────────────────────────────

def _eval_condition(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    value: float,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """Dispatch to the correct category evaluator for a single condition."""
    t = cond.type.lower()

    # Category A
    if t == "threshold":
        return _eval_threshold(cond, metric, value)
    if t == "range":
        return _eval_range(cond, metric, value)
    if t == "enum_match":
        return _eval_enum_match(cond, metric, value)

    # Category B
    if t == "rate_of_change":
        return _eval_rate_of_change(cond, device_id, metric, value, recorded_at, db)
    if t == "flatline":
        return _eval_flatline(cond, device_id, metric, recorded_at, db)
    if t == "window_aggregate":
        return _eval_window_aggregate(cond, device_id, metric, recorded_at, db)

    # Category C — composite
    if t == "and":
        return _eval_and(cond, device_id, metric, value, recorded_at, db)
    if t == "or":
        return _eval_or(cond, device_id, metric, value, recorded_at, db)
    if t == "not":
        return _eval_not(cond, device_id, metric, value, recorded_at, db)
    if t == "seq":
        return _eval_seq(cond, device_id, metric, value, recorded_at, db)

    logger.warning("alert_evaluator: unknown condition type %r (condition %s)", t, cond.id)
    return False


def _get_children(
    cond: AlertRuleCondition, db: Session
) -> list[AlertRuleCondition]:
    """Load child conditions ordered by sort_order."""
    stmt = (
        select(AlertRuleCondition)
        .where(AlertRuleCondition.parent_id == cond.id)
        .order_by(AlertRuleCondition.sort_order)
    )
    return list(db.execute(stmt).scalars().all())


def _eval_and(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    value: float,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """AND: all children must be True."""
    children = _get_children(cond, db)
    if not children:
        return False
    return all(
        _eval_condition(c, device_id, metric, value, recorded_at, db)
        for c in children
    )


def _eval_or(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    value: float,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """OR: at least one child must be True."""
    children = _get_children(cond, db)
    if not children:
        return False
    return any(
        _eval_condition(c, device_id, metric, value, recorded_at, db)
        for c in children
    )


def _eval_not(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    value: float,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """NOT: inverts the single child condition."""
    children = _get_children(cond, db)
    if not children:
        return False
    return not _eval_condition(children[0], device_id, metric, value, recorded_at, db)


def _eval_seq(
    cond: AlertRuleCondition,
    device_id: str,
    metric: str,
    value: float,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """
    SEQ: all children must fire, evaluated sequentially (short-circuits on first False).
    This implementation checks all conditions are simultaneously satisfied in order.
    A richer SEQ that tracks temporal ordering across multiple readings is a v2 concern.
    """
    children = _get_children(cond, db)
    if not children:
        return False
    for child in children:
        if not _eval_condition(child, device_id, metric, value, recorded_at, db):
            return False
    return True


# ─── Top-level rule evaluation ────────────────────────────────────────────────

def _evaluate_rule(
    rule: AlertRule,
    device_id: str,
    metric: str,
    value: float,
    recorded_at: datetime,
    db: Session,
) -> bool:
    """
    Evaluate ALL root conditions for a rule (those with parent_id = NULL).
    If the rule has the logic_op 'AND' (default), all root conditions must pass.
    If 'OR', any root condition firing is enough.
    If there are no conditions, the rule never fires.
    """
    stmt = (
        select(AlertRuleCondition)
        .where(
            AlertRuleCondition.rule_id == rule.id,
            AlertRuleCondition.parent_id.is_(None),
        )
        .order_by(AlertRuleCondition.sort_order)
    )
    root_conditions = list(db.execute(stmt).scalars().all())

    if not root_conditions:
        return False

    # Determine rule-level logic: default is AND across root conditions
    # The first root condition's logic_op drives the rule-level combination.
    rule_logic = (root_conditions[0].logic_op or "AND").upper()

    results = [
        _eval_condition(c, device_id, metric, value, recorded_at, db)
        for c in root_conditions
    ]

    if rule_logic == "OR":
        return any(results)
    return all(results)


def evaluate_all_sync(
    device_id: str,
    metric: str,
    value: float,
    unit: str,
    recorded_at: datetime,
    db: Session,
) -> None:
    """
    Main entry point — called from MQTT consumer (inside asyncio.to_thread).
    Loads all enabled rules for *device_id*, evaluates each, and fires alerts.
    Exceptions are caught per-rule to avoid aborting the whole evaluation pass.

    Args:
        device_id:   MQTT device identifier (e.g. "DEVICE-001")
        metric:      Sensor metric name (e.g. "temperature")
        value:       Numeric reading value
        unit:        Unit string (e.g. "°C")
        recorded_at: UTC timestamp of the reading
        db:          Sync SQLAlchemy session (already open, caller commits)
    """
    try:
        rules = _load_rules(device_id, db)
    except Exception:
        logger.exception("alert_evaluator: failed to load rules for device %s", device_id)
        return

    if not rules:
        return

    reading_snapshot: dict[str, Any] = {
        "device_id": device_id,
        "metric": metric,
        "value": value,
        "unit": unit,
        "recorded_at": recorded_at.isoformat(),
    }

    for rule in rules:
        try:
            fired = _evaluate_rule(rule, device_id, metric, value, recorded_at, db)
            if not fired:
                continue

            if _check_cooldown(rule, db):
                logger.debug(
                    "alert_evaluator: rule %s (%s) in cooldown — skipping", rule.id, rule.name
                )
                continue

            event = _fire_alert(rule, device_id, reading_snapshot, db)
            if event is None:
                continue

            _dispatch_channels(rule, event, db)
            db.commit()

            logger.info(
                "alert_evaluator: rule '%s' fired for device=%s metric=%s value=%s",
                rule.name,
                device_id,
                metric,
                value,
            )

        except Exception:
            logger.exception(
                "alert_evaluator: unhandled error evaluating rule %s (%s) for device %s",
                rule.id,
                getattr(rule, "name", "?"),
                device_id,
            )
            try:
                db.rollback()
            except Exception:
                pass
