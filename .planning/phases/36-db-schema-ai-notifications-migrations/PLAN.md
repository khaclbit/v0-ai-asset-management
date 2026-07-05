# Phase 36 Plan: DB Schema — AI & Notifications Migrations

**Goal:** Add `ai_recommendations` and `notifications` database tables via Alembic migrations 0003 and 0004, plus matching SQLAlchemy ORM models registered in `app/models/__init__.py`. Both tables must be live in the running PostgreSQL container before Phase 37 (training script) and Phase 39 (SSE infrastructure) can begin.

**Requirements:** AI-01, NOTIF-01
**Phase dir:** `.planning/phases/36-db-schema-ai-notifications-migrations/`

---

## Plan 36-01: ai_recommendations Migration + ORM Model

### Task 36-01-A: Alembic migration 0003 — ai_recommendations

**File:** `backend/alembic/versions/0003_ai_recommendations.py`

```
down_revision = "0002"
revision = "0003"
```

Columns (use raw SQLAlchemy + postgresql dialect — no app.models imports in migration files):
- `id`: `postgresql.UUID(as_uuid=True)`, PK, `server_default=sa.text("gen_random_uuid()")`
- `asset_id`: `postgresql.UUID(as_uuid=True)`, NOT NULL, FK → `assets.id` ON DELETE CASCADE
- `recommendation`: `sa.Text()`, NOT NULL
- `confidence`: `sa.Float()`, NOT NULL
- `risk_level`: `sa.String(10)`, NOT NULL, `server_default=sa.text("'Low'")`
- `risk_score`: `sa.Float()`, NOT NULL, `server_default=sa.text("0.0")`
- `top_factors`: `postgresql.JSONB()`, NOT NULL, `server_default=sa.text("'[]'::jsonb")`
- `correlation_id`: `sa.String(100)`, NOT NULL, `server_default=sa.text("''")`
- `approved_by`: `postgresql.UUID(as_uuid=True)`, nullable, FK → `users.id` ON DELETE SET NULL
- `approved_at`: `sa.DateTime(timezone=True)`, nullable
- `action_state`: `sa.String(20)`, NOT NULL, `server_default=sa.text("'pending'")`
- `defer_reason`: `sa.Text()`, nullable
- `sla_due_at`: `sa.DateTime(timezone=True)`, nullable
- `created_at`: `sa.DateTime(timezone=True)`, NOT NULL, `server_default=sa.text("now()")`

After `create_table`, add index:
```python
op.create_index("ix_ai_recommendations_asset_id", "ai_recommendations", ["asset_id"])
```

`downgrade()`: `op.drop_index(...)` then `op.drop_table("ai_recommendations")`

### Task 36-01-B: SQLAlchemy ORM model — AiRecommendation

**File:** `backend/app/models/ai_recommendation.py`

Follow `SensorReading` / `User` patterns exactly (Mapped[] typed columns, func.gen_random_uuid(), func.now()):

```python
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AiRecommendation(Base):
    __tablename__ = "ai_recommendations"
    __table_args__ = (
        Index("ix_ai_recommendations_asset_id", "asset_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
        server_default=func.gen_random_uuid(), default=uuid.uuid4)
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False, default="Low")
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    top_factors: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    action_state: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    defer_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sla_due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
        server_default=func.now())
```

---

## Plan 36-02: notifications Migration + ORM Model

### Task 36-02-A: Alembic migration 0004 — notifications

**File:** `backend/alembic/versions/0004_notifications.py`

```
down_revision = "0003"
revision = "0004"
```

Columns:
- `id`: `postgresql.UUID(as_uuid=True)`, PK, `server_default=sa.text("gen_random_uuid()")`
- `user_id`: `postgresql.UUID(as_uuid=True)`, NOT NULL, FK → `users.id` ON DELETE CASCADE
- `type`: `sa.String(50)`, NOT NULL
- `title`: `sa.String(255)`, NOT NULL
- `message`: `sa.Text()`, NOT NULL
- `is_read`: `sa.Boolean()`, NOT NULL, `server_default=sa.text("false")`
- `href`: `sa.String(500)`, nullable
- `created_at`: `sa.DateTime(timezone=True)`, NOT NULL, `server_default=sa.text("now()")`

After `create_table`, add composite index for per-user queries:
```python
op.create_index("ix_notifications_user_id_created_at", "notifications", ["user_id", "created_at"])
```

`downgrade()`: drop index, then `op.drop_table("notifications")`

### Task 36-02-B: SQLAlchemy ORM model — Notification

**File:** `backend/app/models/notification.py`

```python
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_id_created_at", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
        server_default=func.gen_random_uuid(), default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    href: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
        server_default=func.now())
```

---

## Plan 36-03: Register Models + Apply Migration

### Task 36-03-A: Update `backend/app/models/__init__.py`

Add imports and `__all__` entries for both new models:

```python
from app.models.ai_recommendation import AiRecommendation
from app.models.notification import Notification
```

And extend `__all__` with `"AiRecommendation"`, `"Notification"`.

### Task 36-03-A2: Update `backend/alembic/env.py`

`env.py` uses explicit per-model imports (not auto-discovery via Base.metadata scan). Add:

```python
from app.models.ai_recommendation import AiRecommendation  # noqa: F401
from app.models.notification import Notification  # noqa: F401
```

This ensures `alembic revision --autogenerate` in future phases detects schema changes on these tables.

### Task 36-03-B: Apply migration

```bash
docker compose exec api alembic upgrade head
```

### Task 36-03-C: Verify migration applied

```bash
# Check migration chain
docker compose exec api alembic current

# Check tables exist
docker compose exec db psql -U postgres -d asset_management -c "\dt"

# Spot-check ai_recommendations columns
docker compose exec db psql -U postgres -d asset_management -c "\d ai_recommendations"

# Spot-check notifications columns
docker compose exec db psql -U postgres -d asset_management -c "\d notifications"
```

Expected: `alembic current` shows `0004 (head)`, both tables visible in `\dt` output.

---

## UAT Criteria

- [ ] `alembic upgrade head` completes without error
- [ ] `alembic current` shows `0004 (head)`
- [ ] `\dt` shows `ai_recommendations` and `notifications` tables
- [ ] `\d ai_recommendations` shows all 14 columns with correct types and FK constraints
- [ ] `\d notifications` shows all 8 columns with correct types and FK constraint to users
- [ ] Downgrade is reversible: `alembic downgrade -1` removes `notifications`; second `-1` removes `ai_recommendations`; `alembic upgrade head` re-applies both cleanly
- [ ] `app/models/__init__.py` exports `AiRecommendation` and `Notification`
- [ ] `alembic/env.py` explicitly imports `AiRecommendation` and `Notification` (required for future autogenerate)

---

## Commit

```
feat(36): add ai_recommendations and notifications DB migrations and ORM models
```
