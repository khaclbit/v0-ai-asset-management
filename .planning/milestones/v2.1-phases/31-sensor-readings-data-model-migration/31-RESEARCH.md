# Phase 31: Sensor Readings Data Model & Migration — Research

**Researched:** 2026-07-05
**Domain:** PostgreSQL schema design, SQLAlchemy ORM model, Alembic migration
**Confidence:** HIGH — all findings based on direct codebase inspection of the existing models and migrations

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOT-DB-01 | `sensor_readings` table with columns: `id` (UUID PK), `device_id` (string), `asset_id` (nullable string, matches `asset.sensor_device_id`), `metric` (string), `value` (float), `unit` (string), `recorded_at` (timestamp with timezone) | SQLAlchemy model pattern documented — mirrors existing models exactly |
| IOT-DB-02 | Alembic migration `0002_sensor_readings.py` creating `sensor_readings` with composite index on `(device_id, metric, recorded_at DESC)` | Composite index syntax verified against existing `0001_initial.py` pattern |
| IOT-DB-03 | `sensor_readings` has **no FK to `assets` table** — `device_id` string-matches `asset.sensor_device_id` at query time | Plain nullable `String` column pattern documented; no `ForeignKeyConstraint` needed |

</phase_requirements>

---

## Summary

Phase 31 is a pure data-layer phase: create one new SQLAlchemy model (`SensorReading`), one Alembic migration (`0002_sensor_readings.py`), and register the model in `alembic/env.py`. No route, no service, no schema change to existing tables.

The existing codebase uses **synchronous SQLAlchemy 2.0** with `Mapped[T]` / `mapped_column()` ORM syntax (confirmed in `Asset`, `Assignment`, `MaintenanceRecord`). The new `SensorReading` model must follow this pattern exactly — UUID PK, `DateTime(timezone=True)`, composite index in `__table_args__`, no FK constraint on `asset_id`.

The critical design decision is `asset_id`: IOT-DB-03 explicitly forbids an FK to `assets`. This is intentional for write-throughput — MQTT ingestion should never block waiting for a FK lookup. The column is a plain nullable `String(100)` that matches `assets.sensor_device_id` at query time only.

**Primary recommendation:** Model `SensorReading` as a standalone write-optimised table. Use plain `String(50)` for `metric` (not a PostgreSQL ENUM) so adding new metric types never requires a DDL migration. Use `op.create_index(..., [sa.text("device_id"), sa.text("metric"), sa.text("recorded_at DESC")])` in the Alembic migration to satisfy the DESC requirement.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SensorReading SQLAlchemy model | Database / Storage | — | ORM model owns persistence contract |
| Alembic migration 0002 | Database / Storage | — | DDL change belongs at DB layer |
| Composite index on (device_id, metric, recorded_at) | Database / Storage | — | Query optimisation lives at DB tier |
| No-FK design for write path | API / Backend | Database | Business decision enforced by omitting FK |
| env.py model registration | API / Backend | — | Alembic autogenerate support requires explicit import |

---

## Standard Stack

### Core (no new installs — everything already in `requirements.txt`)

| Library | Current Version | Purpose | Confirmed In |
|---------|----------------|---------|--------------|
| `sqlalchemy` | 2.0.36 | ORM model + `Mapped` type annotations | `backend/requirements.txt` [VERIFIED: codebase] |
| `alembic` | 1.14.0 | Migration management | `backend/requirements.txt` [VERIFIED: codebase] |
| `psycopg2-binary` | 2.9.10 | PostgreSQL driver (sync) | `backend/requirements.txt` [VERIFIED: codebase] |
| `sqlalchemy.dialects.postgresql` | (bundled) | `UUID(as_uuid=True)` dialect type | Used in all existing models [VERIFIED: codebase] |

**Phase 31 requires zero new package installs.** All dependencies are already present.

---

## Package Legitimacy Audit

> No new packages are installed in this phase. Existing packages are already running in production-equivalent Docker Compose. Audit not required.

---

## Architecture Patterns

### Existing SQLAlchemy Model Pattern (from codebase inspection)

Every existing model in `backend/app/models/` uses this exact structure [VERIFIED: codebase]:

```python
# Source: backend/app/models/maintenance.py (canonical reference)
import uuid
from datetime import datetime
from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class SomeModel(Base):
    __tablename__ = "some_table"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )

    some_field: Mapped[str] = mapped_column(String(50), nullable=False)
    nullable_field: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_some_model_field1_field2", "field1", "field2"),
    )
```

**Key conventions confirmed in every existing model:**
- UUID PK: `server_default=func.gen_random_uuid(), default=uuid.uuid4` — both server-side and Python-side
- DateTime always: `DateTime(timezone=True)` — never timezone-naive
- Nullable optional fields: `Mapped[str | None]` with `nullable=True`
- Composite indexes: defined in `__table_args__` as a tuple of `Index(...)` objects
- No `__repr__` is required but existing models include one as a convenience

### SensorReading Model — Full Pattern

```python
# Source: pattern derived from backend/app/models/maintenance.py + IOT-DB requirements
# File: backend/app/models/sensor_reading.py
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )

    # IOT-DB-01: device_id — the MQTT hardware identifier
    device_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # IOT-DB-03: asset_id is a plain string — NO FK to assets table.
    # Matches assets.sensor_device_id at query time only.
    # Nullable because a reading may arrive before the asset is registered.
    asset_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # IOT-DB-01: metric name — plain string, NOT a PostgreSQL ENUM (see pitfalls)
    metric: Mapped[str] = mapped_column(String(50), nullable=False)

    # IOT-DB-01: sensor float value
    value: Mapped[float] = mapped_column(Float, nullable=False)

    # IOT-DB-01: unit string e.g. "°C", "%RH", "W", "A", "mm/s", "h"
    unit: Mapped[str] = mapped_column(String(20), nullable=False)

    # IOT-DB-01: when the sensor recorded the reading (from MQTT payload)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # IOT-DB-02: composite index on (device_id, metric, recorded_at) for time-range queries
    # DESC on recorded_at handled in migration via sa.text() — see migration pattern below
    __table_args__ = (
        Index("ix_sensor_readings_device_metric_recorded", "device_id", "metric", "recorded_at"),
    )

    def __repr__(self) -> str:
        return f"<SensorReading id={self.id} device={self.device_id!r} metric={self.metric!r}>"
```

> **Note on `recorded_at` server default:** IOT-DB-01 specifies `recorded_at` as a timestamp — the MQTT consumer will supply this from the payload `"ts"` field. Do NOT add `server_default=func.now()` on this column. The consumer passes the sensor's timestamp explicitly. If you want to track DB insert time separately, that would be a different column (e.g. `ingested_at`) which is NOT in scope for this phase.

### Alembic Migration 0002 — Full Pattern

```python
# Source: derived from backend/alembic/versions/0001_initial.py pattern
# File: backend/alembic/versions/0002_sensor_readings.py
"""add sensor_readings table

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-05 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sensor_readings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("device_id", sa.String(length=100), nullable=False),
        # IOT-DB-03: plain nullable string — NO ForeignKeyConstraint
        sa.Column("asset_id", sa.String(length=100), nullable=True),
        sa.Column("metric", sa.String(length=50), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    # IOT-DB-02: composite index for fast time-range queries per device+metric
    # DESC on recorded_at: PostgreSQL can backward-scan a regular B-tree index
    # but explicit DESC on the column avoids a sort step for ORDER BY recorded_at DESC
    op.create_index(
        "ix_sensor_readings_device_metric_recorded",
        "sensor_readings",
        ["device_id", "metric", sa.text("recorded_at DESC")],
    )
    # Secondary index: fast time-range queries for a single device (all metrics)
    op.create_index(
        "ix_sensor_readings_device_id",
        "sensor_readings",
        ["device_id"],
    )
    # Tertiary index: global recorded_at queries (retention cleanup, admin queries)
    op.create_index(
        "ix_sensor_readings_recorded_at",
        "sensor_readings",
        ["recorded_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_sensor_readings_recorded_at", table_name="sensor_readings")
    op.drop_index("ix_sensor_readings_device_id", table_name="sensor_readings")
    op.drop_index("ix_sensor_readings_device_metric_recorded", table_name="sensor_readings")
    op.drop_table("sensor_readings")
```

### env.py Registration Pattern

`alembic/env.py` uses **manual model registration** — models are NOT auto-discovered. [VERIFIED: codebase]

```python
# Current env.py (lines 12–15):
from app.models.user import User  # noqa: F401
from app.models.asset import Asset  # noqa: F401
from app.models.assignment import Assignment  # noqa: F401
from app.models.maintenance import MaintenanceRecord  # noqa: F401

# Phase 31 adds:
from app.models.sensor_reading import SensorReading  # noqa: F401
```

The `# noqa: F401` comment is already the project convention for these imports. Follow it.

Also: `backend/app/models/__init__.py` currently exports all models via `__all__`. Add `SensorReading` there too for consistency.

### Recommended Project Structure Addition

```
backend/app/models/
├── __init__.py          ← add SensorReading to __all__
├── base.py
├── user.py
├── asset.py
├── assignment.py
├── maintenance.py
└── sensor_reading.py    ← NEW (Phase 31)

backend/alembic/versions/
├── 0001_initial.py      ← existing
└── 0002_sensor_readings.py  ← NEW (Phase 31)
```

### Anti-Patterns to Avoid

- **Do NOT add FK constraint on `asset_id`**: IOT-DB-03 is explicit — no FK. Adding `ForeignKeyConstraint(["asset_id"], ["assets.id"])` would break write throughput and require all sensor readings to reference an existing asset row.
- **Do NOT use PostgreSQL ENUM for `metric`**: See Pitfall 3 below.
- **Do NOT use `server_default=func.now()` on `recorded_at`**: The MQTT consumer supplies the sensor timestamp from the payload — server default would silently discard sensor time and use DB insert time instead.
- **Do NOT forget `down_revision = "0001"`**: Missing this makes Alembic think there are two migration heads and `alembic upgrade head` will fail with "Multiple head revisions".
- **Do NOT omit the `SensorReading` import in `env.py`**: Alembic autogenerate only detects models that have been imported into `env.py`. Missing this means `alembic revision --autogenerate` will offer to DROP the table on the next run.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom UUID logic | `server_default=func.gen_random_uuid(), default=uuid.uuid4` | Already used in all 4 existing models — consistent pattern |
| Composite DESC index | Raw SQL `CREATE INDEX` in a separate script | `op.create_index(..., [sa.text("recorded_at DESC")])` in migration | Alembic manages index lifecycle — drop/recreate on downgrade |
| Model auto-discovery | Glob-based model importer | Manual `from app.models.X import X  # noqa: F401` in env.py | Project convention: explicit imports prevent import-order bugs |

---

## Common Pitfalls

### Pitfall 1: Missing DESC on the composite index
**What goes wrong:** The REST endpoint `GET /api/v1/iot/readings/{device_id}` and the WebSocket cold-start will query `ORDER BY recorded_at DESC LIMIT N`. Without DESC on the index, PostgreSQL must sort the result set after the index scan, adding a `Sort` node. At small data volumes this is invisible but becomes noticeable at >100k rows.
**Why it happens:** `op.create_index("...", ["device_id", "metric", "recorded_at"])` creates an ASC index. PostgreSQL can backward-scan it, but an explicit DESC avoids the extra `Sort` step for the primary query pattern.
**How to avoid:** Use `sa.text("recorded_at DESC")` as the third column in `op.create_index(...)`.
**Warning signs:** `EXPLAIN ANALYZE` shows a `Sort` node after the index scan instead of a direct `Index Scan Backward`.

### Pitfall 2: Multiple Alembic heads (missing `down_revision`)
**What goes wrong:** If `0002_sensor_readings.py` has `down_revision = None` instead of `down_revision = "0001"`, Alembic sees two separate migration chains. `alembic upgrade head` fails with: `Multiple head revisions are present for given argument 'head'`.
**Why it happens:** Copy-paste from template leaves `down_revision = None`.
**How to avoid:** Always verify `down_revision: Union[str, None] = "0001"` (the revision ID of the previous migration).
**Warning signs:** `alembic history` shows two separate chains instead of a linear sequence.

### Pitfall 3: Using PostgreSQL ENUM for `metric`
**What goes wrong:** Defining `metric` as a PostgreSQL ENUM (e.g. `sa.Enum('temperature', 'humidity', ..., name='metric_type')`) provides DB-level enforcement but creates significant migration pain. Adding a new metric value (e.g. `fuel_level` in v2.2) requires `ALTER TYPE metric_type ADD VALUE '...'` which is NOT transactional in PostgreSQL — it cannot be rolled back within a transaction block, breaking Alembic's transactional migration model.
**Why it happens:** ENUMs look clean for fixed-value columns.
**How to avoid:** Use `String(50)` — matches the existing pattern for `AssetCategory`, `AssetStatus`, `AssignmentStatus` which are all stored as plain strings.
**Warning signs:** Future migration fails with `ERROR: ALTER TYPE ... ADD VALUE cannot run inside a transaction block`.

### Pitfall 4: `SensorReading` not imported in `env.py`
**What goes wrong:** `alembic revision --autogenerate` in a future phase detects that `sensor_readings` exists in the DB but NOT in `Base.metadata` (because the model was never imported). It generates a migration that DROPs the table.
**Why it happens:** `env.py` uses manual model registration. Each new model must be explicitly imported.
**How to avoid:** Add `from app.models.sensor_reading import SensorReading  # noqa: F401` to `alembic/env.py` in the same wave as creating the model.
**Warning signs:** Running `alembic revision --autogenerate` after the migration produces a new migration containing `op.drop_table("sensor_readings")`.

### Pitfall 5: Float precision for sensor values
**What goes wrong:** Using `Float` stores values as IEEE 754 double-precision, which can produce rounding artefacts (e.g. `42.7` stored as `42.700000000000003`). This surfaces in JSON serialisation to the frontend.
**Why it matters:** The REQUIREMENTS.md specifies `value (float)` — this is acceptable for sensor data where 2–3 decimal places of precision is sufficient and perfect decimal representation is not needed (unlike monetary values which use `Numeric`).
**How to avoid:** `Float` is correct for this use case. If exact decimal representation is ever needed, change to `Numeric(10, 4)` — but do NOT do this without a reason.
**Warning signs:** Not a bug for sensor data — acceptable behaviour.

---

## Code Examples

### Verified: UUID PK pattern (from existing model)
```python
# Source: backend/app/models/asset.py [VERIFIED: codebase]
id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True),
    primary_key=True,
    server_default=func.gen_random_uuid(),
    default=uuid.uuid4,
)
```

### Verified: Composite index in `__table_args__` (from existing model)
```python
# Source: backend/app/models/assignment.py [VERIFIED: codebase]
__table_args__ = (
    Index("ix_assignments_asset_id", "asset_id"),
    Index("ix_assignments_assignee_id", "assignee_id"),
    Index("ix_assignments_asset_status", "asset_id", "status"),
)
```

### Verified: Composite index in Alembic migration (from 0001_initial.py)
```python
# Source: backend/alembic/versions/0001_initial.py [VERIFIED: codebase]
op.create_index("ix_assignments_asset_status", "assignments", ["asset_id", "status"])
```

### Verified: env.py manual import pattern
```python
# Source: backend/alembic/env.py [VERIFIED: codebase]
from app.models.user import User  # noqa: F401
from app.models.asset import Asset  # noqa: F401
from app.models.assignment import Assignment  # noqa: F401
from app.models.maintenance import MaintenanceRecord  # noqa: F401
# Phase 31 adds:
from app.models.sensor_reading import SensorReading  # noqa: F401
```

### Verified: Nullable string column (no FK) in migration
```python
# Pattern: asset_id as plain nullable String in op.create_table()
# IOT-DB-03 forbids FK — just a String column, no ForeignKeyConstraint
sa.Column("asset_id", sa.String(length=100), nullable=True),
# Compare with FK pattern in 0001_initial.py:
# sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="RESTRICT")
# ← We deliberately do NOT add this for sensor_readings
```

---

## Key Design Decision: `metric` as String vs ENUM

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| `String(50)` | Matches existing pattern; adding new metrics is a code-only change; write-optimised | No DB-level constraint on values | **USE THIS** |
| `PostgreSQL ENUM` | DB enforces allowed values; slight storage saving (~4 bytes vs 50 bytes) | `ALTER TYPE ADD VALUE` is non-transactional; breaks Alembic migrations; mismatches project conventions | DO NOT USE |

**Conclusion:** Use `String(50)`. The 6 fixed values from `SENSOR_CONFIG` are enforced at the application layer (MQTT consumer validates before insert). DB-level ENUM adds migration pain with no meaningful benefit at this data volume. [ASSUMED — no explicit requirement for DB-level metric enforcement]

---

## Key Design Decision: `recorded_at` vs two timestamps

REQUIREMENTS.md specifies only `recorded_at` (one timestamp). The ARCHITECTURE.md research suggested two timestamps (`timestamp` + `recorded_at`). **REQUIREMENTS.md wins** — use only `recorded_at` from the sensor payload.

The MQTT consumer (Phase 33) will parse `{"ts": int}` from the payload and store it as `recorded_at`. No server-default on this column.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `db.Column` (SQLAlchemy 1.x) | `Mapped[T]` + `mapped_column()` (SQLAlchemy 2.0) | Type-safe ORM; IDE autocomplete works on model instances |
| `Integer` PK | `UUID` PK with `gen_random_uuid()` | No auto-increment coordination; safe for distributed insert; matches existing project models |
| `Float` for sensor values | `Float` still standard for IoT telemetry | `Numeric(10,4)` only if exact decimal required (e.g. currency) |

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| PostgreSQL | Alembic migration execution | ✓ (Docker Compose) | `postgres:16` in `docker-compose.yml` |
| `alembic` 1.14.0 | Migration | ✓ | In `requirements.txt` |
| `sqlalchemy` 2.0.36 | ORM model | ✓ | In `requirements.txt` |
| `psycopg2-binary` 2.9.10 | Alembic DB connection | ✓ | In `requirements.txt` |

**No missing dependencies.** This phase requires only file creation + `alembic upgrade head` inside the Docker container.

**Migration run command:**
```bash
docker compose exec api alembic upgrade head
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (not yet installed — Wave 0 gap) |
| Config file | None detected — `backend/tests/` does not exist |
| Quick run command | `docker compose exec api pytest tests/ -x -q` |
| Full suite command | `docker compose exec api pytest tests/ -v` |

> **Note:** No `backend/tests/` directory exists. The project has no test infrastructure yet. Phase 31 is the first phase that could benefit from a minimal DB test. Wave 0 must create the test scaffold.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| IOT-DB-01 | `sensor_readings` table has all required columns | Integration (DB) | `pytest tests/test_sensor_reading_model.py -x` | ❌ Wave 0 |
| IOT-DB-02 | Composite index `ix_sensor_readings_device_metric_recorded` exists in DB | Integration (DB) | `pytest tests/test_sensor_reading_model.py::test_indexes -x` | ❌ Wave 0 |
| IOT-DB-03 | No FK from `sensor_readings` to `assets` in DB schema | Integration (DB) | `pytest tests/test_sensor_reading_model.py::test_no_fk -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `docker compose exec api alembic check` (verifies migration applied)
- **Per wave merge:** `docker compose exec api pytest tests/test_sensor_reading_model.py -v`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/__init__.py` — empty file to make tests a package
- [ ] `backend/tests/conftest.py` — DB session fixture pointing to test DB
- [ ] `backend/tests/test_sensor_reading_model.py` — covers IOT-DB-01, IOT-DB-02, IOT-DB-03
- [ ] Framework install: `pip install pytest pytest-sqlalchemy` (or add to `requirements.txt` dev section)

> **Simpler alternative for this phase:** Since Phase 31 is DDL-only (no application logic), the "test" can be `alembic upgrade head` succeeding + a manual `\d sensor_readings` in psql. Formal pytest can be deferred to Phase 33 when the consumer logic needs unit tests. Planner may choose to keep Wave 0 test scaffold minimal.

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Table-level DDL only |
| V3 Session Management | No | No request handling |
| V4 Access Control | No | No API endpoints |
| V5 Input Validation | Partial — note for Phase 33 | `metric` values should be validated in the MQTT consumer (Phase 33), not at DB level |
| V6 Cryptography | No | No secrets involved |

**Security note for this phase:** No direct security concerns. The intentional absence of the FK (IOT-DB-03) is a performance design, not a security concern — the FK absence does not create an injection vector since `device_id` and `asset_id` are string lookups controlled by the MQTT consumer.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `recorded_at` should NOT have `server_default=func.now()` — the MQTT consumer supplies sensor timestamp from payload `"ts"` field | SensorReading Model Pattern | If consumer does NOT supply `recorded_at`, inserts will fail with NOT NULL violation. Planner must ensure Phase 33 consumer maps payload `"ts"` → `recorded_at`. |
| A2 | `metric` as `String(50)` is preferred over PostgreSQL ENUM | Design Decision section | If strict DB-level enforcement is required, `Enum` would need to be used and the migration pattern would change significantly |
| A3 | `sa.text("recorded_at DESC")` syntax works in `op.create_index` for Alembic 1.14.0 | Alembic migration pattern | If this syntax is rejected, use `postgresql_ops={"recorded_at": "DESC"}` as fallback |

---

## Open Questions

1. **Does `asset_id` in `SensorReading` match `assets.id` (UUID) or `assets.sensor_device_id` (string)?**
   - REQUIREMENTS.md says: `asset_id (nullable string, matches asset.sensor_device_id)` — this is the string identifier from `SENSOR_CONFIG`, NOT the UUID primary key.
   - **Confirmed:** `asset_id` in `sensor_readings` is a `String(100)` matching `assets.sensor_device_id` (also `String(100)`). Both columns are plain strings. The query at read time is: `JOIN assets ON assets.sensor_device_id = sensor_readings.asset_id`.
   - No ambiguity — use `String(100)`.

2. **Should `value` be `Float` or `Numeric(10,4)`?**
   - REQUIREMENTS.md says "float". ARCHITECTURE.md research suggested `Numeric(10,4)`.
   - **Recommendation:** Use `Float` per REQUIREMENTS.md. Sensor telemetry does not need exact decimal precision. `Numeric` adds storage overhead and is appropriate for monetary values only.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `backend/app/models/maintenance.py` — canonical model pattern (Mapped, mapped_column, __table_args__, Index)
- `backend/app/models/assignment.py` — composite index pattern in `__table_args__`
- `backend/alembic/versions/0001_initial.py` — migration file structure, `op.create_index` syntax, `sa.text("gen_random_uuid()")` pattern
- `backend/alembic/env.py` — manual model registration, `target_metadata = Base.metadata`
- `backend/app/database.py` — sync `create_engine` + `SessionLocal` confirmed
- `backend/requirements.txt` — package versions confirmed
- `.planning/REQUIREMENTS.md` — locked requirements IOT-DB-01, IOT-DB-02, IOT-DB-03

### Secondary (MEDIUM confidence — prior research artifacts)
- `.planning/research/ARCHITECTURE.md` — sensor_readings schema notes (used for context, REQUIREMENTS.md takes precedence for column names)
- `.planning/research/PITFALLS.md` — DB-1 through DB-4 index pitfalls, Strategy C migration checklist

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in requirements.txt
- Architecture: HIGH — model and migration patterns verified against existing codebase
- Pitfalls: HIGH — derived from direct inspection of existing migration pattern

**Research date:** 2026-07-05
**Valid until:** 2026-08-05 (stable — SQLAlchemy/Alembic patterns change slowly; only update if SQLAlchemy 3.0 releases)
