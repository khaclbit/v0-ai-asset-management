# Phase 31 Summary — Sensor Readings Data Model & Migration

**Status:** Complete (Docker verification deferred — run `alembic upgrade head` on next Docker start)
**Completed:** 2026-07-05
**Requirements:** IOT-DB-01 ✅, IOT-DB-02 ✅, IOT-DB-03 ✅

## Delivered

- `backend/app/models/sensor_reading.py` — SensorReading ORM model (7 columns, composite index, no FK)
- `backend/alembic/versions/0002_sensor_readings.py` — DDL migration with 3 indexes, down_revision="0001"
- `backend/alembic/env.py` — SensorReading import added for autogenerate
- `backend/app/models/__init__.py` — SensorReading exported

## Key Decisions

- `metric` → String(50) not PostgreSQL ENUM (ALTER TYPE non-transactional pitfall avoided)
- `asset_id` → nullable String(100), zero FK constraints (IOT-DB-03 write-optimised path)
- Composite index `ix_sensor_readings_device_metric_recorded` on (device_id, metric, recorded_at DESC)
- `recorded_at` has no server_default — MQTT consumer supplies sensor timestamp from payload `ts`

## Verification Notes

T01–T03: Passed (py_compile + AST-level guards). T04/T05 deferred pending Docker start.
Run `docker compose exec api alembic upgrade head` to apply migration on next startup.
