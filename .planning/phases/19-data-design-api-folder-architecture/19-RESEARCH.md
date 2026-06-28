# Phase 19: Data Design, API Overview & Folder Architecture - Research

**Researched:** 2026-06-28
**Domain:** Conceptual ER design, API module catalogue, and folder structure documentation for SDD completion
**Confidence:** HIGH — all findings sourced directly from SDD.md and live codebase inspection

---

## Summary

Phase 19 completes the SDD artifact set by producing three documentation deliverables: (1) a conceptual ER diagram with entity-level field notes and relationship cardinality, (2) an API module overview naming all nine modules with one-line responsibility statements, and (3) folder structure definitions for both the Next.js `src/` layout and the FastAPI `app/` layout.

All nine entities are fully specified in SDD §2.5 with explicit cardinality notation already defined in Mermaid `erDiagram` syntax. The nine API modules are named and responsibility-scoped in SDD §1.2 Module Decomposition. The frontend folder structure must be inferred from the existing `frontend/` codebase (which uses a flat Next.js App Router layout, not a canonical `src/` structure) and mapped to the eight required directories. The backend `app/` layout does not yet exist — it must be designed from the SDD's module decomposition, the MQTT ingestion architecture (§1.3), the AI pipeline (§1.4), and FastAPI project conventions.

**Primary recommendation:** Produce all three artifacts as pure documentation — no SQL DDL, no endpoint paths, no implementation code. Use the SDD as the single source of truth for entities and module names; use the existing frontend codebase to inform the `src/` mapping; derive the FastAPI `app/` layout from the nine SDD modules.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| ER entity definitions | Database / Storage | API / Backend | Entities map directly to PostgreSQL tables; API schemas are projections of them |
| API module boundaries | API / Backend | — | Modules are FastAPI router groupings; each owns its own routes, models, schemas, services |
| Frontend `src/` structure | Frontend Server (SSR) | Browser / Client | Next.js App Router owns page routing; `src/` directories support that layer |
| MQTT ingestion (`mqtt/`) | API / Backend | — | Backend-only concern; IoT simulator publishes, FastAPI subscribes |
| AI/ML inference (`ai/`) | API / Backend | — | Feature engineering and model loading runs inside the FastAPI process |
| State store (`store/`) | Browser / Client | — | Client-side React Context/Zustand state; not server-rendered |
| Type definitions (`types/`) | Frontend Server (SSR) | Browser / Client | Shared TypeScript types used across both server and client components |

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | ER diagram documents all entities, relationships, cardinality, and field-level design notes for non-obvious choices — NO SQL DDL | SDD §2.5 provides complete entity list, Mermaid cardinality, and entity notes table. Research confirms 9 entities and all FK relationships. |
| DATA-02 | API module overview names all 9 modules with one-line responsibility statements and no endpoint paths or HTTP verbs | SDD §1.2 Module Responsibility Table provides all 9 module names and responsibility descriptions. Research maps them to FastAPI router naming. |
| FOLD-01 | React folder structure under `src/` defines all 8 required directories each with a description | Existing `frontend/` codebase confirms current layout; research maps actual directories to the 8 canonical `src/` directories. |
| FOLD-02 | FastAPI folder structure under `app/` defines all 8 required modules each with a module responsibility description | SDD §1.2, §1.3, §1.4 provide all module requirements. Research derives the `app/` layout from module decomposition. |

---

## Complete Entity Reference

> Source: SDD §2.5 [VERIFIED: SDD.md — codebase inspection]

All nine entities confirmed present in SDD §2.5 Mermaid `erDiagram`. Entities and their key design notes follow.

### 1. Users

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `username` | string | Unique constraint required |
| `email` | string | Login identifier; unique constraint |
| `hashed_password` | string | **Never store plaintext** — bcrypt hash only |
| `role` | enum | `admin`, `manager`, `staff` — three-tier RBAC |
| `is_active` | boolean | **Soft-delete flag** — users are never hard-deleted |
| `created_at` | datetime | — |

**Non-obvious design note:** `is_active = false` is the only deletion mechanism. Hard-deleting users would break audit_events FK references (every event has an `actor_id → Users`). Soft-delete preserves the audit chain. [VERIFIED: SDD §2.1 "Deactivate users (soft-delete)"]

---

### 2. Categories

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `name` | string | e.g., `Laptop`, `Forklift`, `Printer` |
| `description` | string | — |
| `sensor_types` | JSON | **Active sensor type list** for this category — drives IoT Simulator configuration |
| `created_at` | datetime | — |

**Non-obvious design note:** `sensor_types` is a JSON array, not a separate join table. Categories are seeded at startup (5–10 rows total) and almost never change, making denormalization acceptable and simpler. The IoT Simulator reads this field to know which sensors to activate per asset category. [VERIFIED: SDD §2.6]

---

### 3. Assets

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `name` | string | Human-readable asset name |
| `serial_number` | string | Unique hardware identifier |
| `category_id` | UUID FK → Categories | — |
| `lifecycle_state` | enum | `registered`, `available`, `assigned`, `maintenance`, `retired` |
| `purchase_date` | date | Used by AI feature engineering: asset age calculation |
| `warranty_expiry_date` | date | Triggers `warranty_expiry_warning` notification when ≤ 30 days away |
| `sensor_device_id` | string | **IoT link field** — maps this asset to the Python Sensor Simulator's device ID |
| `current_assignee_id` | UUID FK → Users (nullable) | Null when not assigned |
| `created_at` | datetime | — |
| `updated_at` | datetime | — |

**Non-obvious design note — `sensor_device_id`:** This field is the bridge between the relational asset registry and the IoT simulator. The simulator uses `sensor_device_id` as the `{asset_id}` segment in MQTT topic `assets/{asset_id}/sensors/{type}`. It is intentionally a string (not a UUID FK) because the simulator may use a device alias format (e.g., `ASSET-001`) that doesn't match the PostgreSQL UUID. Nullable — assets without IoT monitoring leave this field blank. [VERIFIED: SDD §1.2 "Add sensor_device_id FK linking asset to IoT simulator", SDD §1.3 MQTT payload contract]

---

### 4. Assignments

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `asset_id` | UUID FK → Assets | — |
| `assignee_id` | UUID FK → Users | The user receiving the asset |
| `approved_by` | UUID FK → Users (nullable) | Null until approved; records the approving Manager/Admin |
| `status` | enum | `requested`, `active`, `overdue`, `closed`, `rejected` |
| `expected_return_date` | date | — |
| `actual_return_date` | date (nullable) | Null until return is processed |
| `created_at` | datetime | — |
| `updated_at` | datetime | — |

**Non-obvious design note — `overdue` status:** `overdue` is a **derived** status — it is not stored as a persistent enum value in the database. It is computed at query time: `status = 'active' AND expected_return_date < CURRENT_DATE`. The SDD notes this explicitly: "overdue is derived at query time — not stored as a status value." The enum value exists in the frontend type system for display convenience but the backend computes it dynamically. [VERIFIED: SDD §2.5 Entity Notes]

---

### 5. MaintenanceRecords

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `asset_id` | UUID FK → Assets | — |
| `created_by` | UUID FK → Users | Manager or Admin who created the record |
| `status` | enum | `scheduled`, `in_progress`, `completed`, `blocked` |
| `description` | string | Work description |
| `blocked_reason` | string (nullable) | Required when transitioning to `blocked` state |
| `correlation_id` | UUID (nullable) | **AI audit chain field** — references `ai_recommendations.id` if this record was triggered by AI recommendation approval |
| `scheduled_date` | date | — |
| `completed_date` | date (nullable) | Null until completed |
| `created_at` | datetime | — |
| `updated_at` | datetime | — |

**Non-obvious design note — `correlation_id`:** When a Manager approves an AI recommendation, the system calls MaintenanceService to create a `Scheduled` record and passes the `ai_recommendation.id` as `correlation_id`. This field is the **audit traceability link** that allows auditors to trace from sensor reading → ML inference → recommendation → manager approval → maintenance execution. It is nullable because most maintenance records are created manually without AI involvement. [VERIFIED: SDD §2.3, §2.5]

---

### 6. SensorReadings

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `asset_id` | UUID FK → Assets | — |
| `sensor_type` | enum | `temperature`, `humidity`, `power_consumption`, `current`, `vibration`, `running_hours` |
| `value` | float | Raw sensor reading |
| `unit` | string | e.g., `°C`, `%`, `W`, `A`, `mm/s`, `hours` |
| `timestamp` | datetime | Simulator-side timestamp (not insertion time) |
| `message_id` | string | **MQTT deduplication key** — unique constraint; QoS 1 can deliver duplicates on broker reconnect |

**Non-obvious design note — `message_id` unique constraint:** MQTT QoS 1 guarantees at-least-once delivery, meaning the same message can arrive twice during broker reconnection events. The `message_id` field (a UUID included in every MQTT payload) carries a unique constraint so duplicate inserts are rejected silently. Without this, rolling-average feature calculations for the ML model would be corrupted by duplicate readings. [VERIFIED: SDD §1.3, §1.7 "Deduplication contract"]

**Index note:** Must be indexed on `(asset_id, sensor_type, timestamp DESC)` — this table is the highest-volume in the system (millions of rows/year) and all AI feature engineering queries filter by this composite. [VERIFIED: SDD §2.5 Entity Notes]

---

### 7. AIRecommendations

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `asset_id` | UUID FK → Assets | The asset this recommendation concerns |
| `health_score` | float | 0–100 score from ML model |
| `failure_risk` | float | 0–100 percentage — key trigger field for notifications (>80 → critical alert) |
| `confidence` | float | 0–100 model confidence percentage |
| `top_factors` | JSON | List of contributing feature names from ML inference |
| `status` | enum | `pending`, `approved`, `deferred`, `expired` |
| `reviewed_by` | UUID FK → Users (nullable) | Null until a Manager/Admin reviews |
| `defer_reason` | string (nullable) | Required when deferring |
| `sla_deadline` | datetime | Deadline for Manager action — visible as countdown in UI |
| `correlation_id` | string | **AI-to-audit link** — carried into `maintenance_records.correlation_id` on approval |
| `created_at` | datetime | — |
| `reviewed_at` | datetime (nullable) | Null until reviewed |

**Non-obvious design note — write boundary:** Only the Predictive ML service (`app/ai/`) may INSERT into this table. All other modules are read-only consumers. The API middleware enforces this — no Manager-authenticated endpoint can directly create a row in `ai_recommendations`. [VERIFIED: SDD §1.4 "AI Mutation Prohibition (Hard Rule)"]

**Non-obvious design note — `expired` status:** Recommendations that reach `deferred` state and remain unactioned for 30 days are transitioned to `expired` by a background scheduler. This prevents stale recommendations from cluttering the Manager's queue indefinitely. [VERIFIED: SDD §2.4]

---

### 8. Notifications

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `user_id` | UUID FK → Users | The user who receives this notification |
| `type` | enum | `high_failure_risk`, `warranty_expiry_warning`, `upcoming_maintenance`, `overdue_return` |
| `title` | string | Short display title |
| `message` | string | Full notification message body |
| `asset_id` | UUID FK → Assets (nullable) | The asset this notification concerns; nullable for system notifications |
| `is_read` | boolean | Read state tracked per-user per-notification |
| `created_at` | datetime | — |
| `expires_at` | datetime | **Auto-cleanup field** — old notifications are purged after this date by a scheduler task |

**Non-obvious design note — `expires_at`:** Notifications accumulate quickly (four trigger types, many assets, many users). The `expires_at` field allows a background cleanup job to purge old notifications without requiring manual admin intervention. Deduplication (one alert per asset per day) is enforced at the Notification Hub level before INSERT, not at the DB constraint level. [VERIFIED: SDD §1.5, §2.5 Entity Notes]

---

### 9. AuditEvents

| Field | Type | Design Note |
|-------|------|-------------|
| `id` | UUID PK | — |
| `actor_id` | UUID FK → Users | User who performed the action (or system for automated events) |
| `action` | string | e.g., `asset.assigned`, `ai_recommendation.approved` — dot-notation naming convention |
| `entity_type` | string | `assets`, `assignments`, `maintenance_records`, `ai_recommendations` |
| `entity_id` | UUID | ID of the affected record |
| `before_state` | JSON | Snapshot of the record state before the action |
| `after_state` | JSON | Snapshot of the record state after the action |
| `correlation_id` | string | **Cross-event traceability** — links related events (e.g., sensor reading → AI recommendation → maintenance record) |
| `category` | enum | `business`, `security`, `ai_assisted` |
| `timestamp` | datetime | — |

**Non-obvious design note — append-only constraint:** This table must NEVER receive UPDATE or DELETE operations. It is an **immutable event ledger**. Any "correction" to an audit record must be modelled as a new event, not a modification of an existing one. The API layer must enforce this — the AuditService exposes only an `append()` method; there is no `update()` or `delete()` method. [VERIFIED: SDD §2.5 "audit_events is append-only — no UPDATE or DELETE operations are ever performed"]

**Non-obvious design note — `correlation_id`:** Audit events within the same business transaction (e.g., AI recommendation approval triggering maintenance record creation) share the same `correlation_id`. Auditors can filter by `correlation_id` to reconstruct the complete event chain. [VERIFIED: SDD §2.5, §2.3]

---

## ER Relationships (Cardinality Reference)

> Source: SDD §2.5 Mermaid erDiagram relationship lines [VERIFIED: SDD.md]

| Relationship | Cardinality | Notes |
|-------------|------------|-------|
| Assets → Assignments | one-to-many (`||--o{`) | An asset can have many assignment records over its lifetime |
| Assets → MaintenanceRecords | one-to-many (`||--o{`) | An asset can have many maintenance records |
| Assets → SensorReadings | one-to-many (`||--o{`) | Described as "has many time-series" — highest cardinality relationship |
| Assets → AIRecommendations | one-to-many (`||--o{`) | Asset can receive multiple AI recommendations over time |
| Assets → Notifications | one-to-many (`||--o{`) | Described as "referenced by" — an asset can appear in many notifications |
| Categories → Assets | one-to-many (`||--o{`) via `Assets }o--|| Categories` | Many assets belong to one category |
| Users → Assignments | one-to-many (`||--o{`) | A user can be assignee on many assignment records |
| Users → AuditEvents | one-to-many (`||--o{`) | A user performs many audit events |
| Users → Notifications | one-to-many (`||--o{`) | A user receives many notifications |
| AIRecommendations → MaintenanceRecords | one-to-zero-or-one (`||--o\|`) | An AI recommendation **may** trigger exactly one maintenance record on approval; before approval, no record exists |

**Special relationship notes:**

- **AIRecommendations → MaintenanceRecords is one-way:** The arrow goes from AIRecommendations to MaintenanceRecords. The MaintenanceRecords entity does NOT have a direct FK to AIRecommendations — the link is carried by `maintenance_records.correlation_id` (a string, not a UUID FK). This is a deliberate design choice to avoid coupling the maintenance module to the AI module at the database FK level. The audit trail is preserved via the correlation_id string, not a hard FK constraint.
- **Assignments has two FK references to Users:** `assignee_id` (the user receiving the asset) and `approved_by` (the Manager/Admin who approved the request). Both are FK→Users but serve different roles.
- **Users soft-delete rationale:** `actor_id` in AuditEvents must always be resolvable — hard-deleting a User would break FK integrity on historical audit records.

---

## API Module Overview (9 Modules)

> Source: SDD §1.2 Module Decomposition [VERIFIED: SDD.md]

All nine modules confirmed. Six carry forward from v1.0/v1.1; three are new in v1.2.

| # | Module Name | One-Line Responsibility |
|---|-------------|------------------------|
| 1 | **Auth** | Issues JWT access tokens, validates tokens on every request, and enforces role-based route guards via FastAPI `Depends()`. |
| 2 | **Assets** | Manages the full asset lifecycle: creation, field editing, state transitions (registered → available → assigned → maintenance → retired), and category association. |
| 3 | **Assignments** | Orchestrates the request-approve-return workflow for asset assignments, enforcing the five-state lifecycle (requested → active → overdue → closed → rejected). |
| 4 | **Maintenance** | Manages maintenance record creation, state transitions (scheduled → in_progress → completed / blocked), and the AI-triggered ticket creation path from approved recommendations. |
| 5 | **IoT Telemetry** | Subscribes to the Mosquitto MQTT broker, deserializes and deduplicates sensor payloads, persists readings to `sensor_readings`, and broadcasts live updates to connected WebSocket clients. |
| 6 | **AI Predictions** | Reads historical sensor data from PostgreSQL, engineers the 9-feature vector per asset, runs inference through the pre-trained Scikit-learn/XGBoost model, and writes results exclusively to `ai_recommendations`. |
| 7 | **Notifications** | Aggregates trigger events from four source modules (AI, Assets, Maintenance, Assignments), creates notification records, and delivers them to connected clients via Server-Sent Events (SSE). |
| 8 | **Audit** | Provides an append-only service that records every business, security, and AI-assisted event to `audit_events`, with no UPDATE or DELETE capability exposed. |
| 9 | **Users** | Handles user account management: creation, role assignment, profile updates, and soft-deactivation — accessible only to the Administrator role. |

**Module naming rationale (SDD vs. API naming):**
The SDD §1.2 uses descriptive module names for the architecture diagram (`Identity & Access`, `Asset Lifecycle`, `Reporting & Insights`, etc.). The API module names above use shorter, endpoint-aligned names (`Auth`, `Assets`, `Assignments`) as these will become FastAPI router prefixes. The SDD's `Reporting & Insights` module is not listed as a standalone API module in the nine-module catalogue — reporting queries are served through the Assets, Assignments, and Maintenance modules respectively. The nine listed modules align with the success criteria specification.

---

## Frontend Folder Structure: Existing → Required Mapping

> Source: Live codebase inspection [VERIFIED: codebase grep]

### Current Frontend Layout (Next.js App Router)

```
frontend/
├── app/                         # Next.js App Router pages
│   ├── dashboard/
│   │   ├── assets/page.tsx
│   │   ├── assignments/page.tsx
│   │   ├── assistant/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── maintenance/page.tsx
│   │   ├── ocr/page.tsx
│   │   ├── predictive/page.tsx
│   │   ├── reports/page.tsx
│   │   └── layout.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                  # Shared UI components
│   ├── ui/                      # shadcn/ui primitives
│   ├── ai-trace-panel.tsx
│   ├── asset-form-dialog.tsx
│   ├── sidebar.tsx
│   ├── status-badge.tsx
│   └── topbar.tsx
├── lib/                         # Business logic / data layer
│   ├── ai-governance.ts
│   ├── assignment-approval.ts
│   ├── assistant.ts
│   ├── audit-log.ts
│   ├── dashboard-kpis.ts
│   ├── data.ts                  # Type definitions + seed data
│   ├── maintenance-warranty.ts
│   ├── navigation-access.ts
│   ├── predictive.ts
│   ├── reporting.ts
│   ├── store.tsx                # React Context global state
│   └── utils.ts
└── public/                      # Static assets
```

### Required `src/` Directory Mapping

The phase requires documenting a canonical `src/` structure with 8 directories. This maps the existing `lib/` and `components/` conventions to the canonical structure.

```
src/
├── components/     # Reusable UI components (domain + shadcn/ui primitives)
├── pages/          # Next.js App Router page components (currently under app/)
├── hooks/          # Custom React hooks (data fetching, WebSocket, SSE, auth state)
├── services/       # API client functions that communicate with the FastAPI backend
├── store/          # Global state management (React Context or Zustand)
├── types/          # Shared TypeScript type and interface definitions
├── utils/          # Pure utility functions (formatting, calculations, transforms)
└── theme/          # Tailwind CSS v4 design tokens, CSS variables, theme configuration
```

**Mapping from existing to canonical:**

| Existing Path | Maps To `src/` Directory | Notes |
|--------------|--------------------------|-------|
| `frontend/components/` | `src/components/` | Direct mapping; `components/ui/` stays as a subdirectory |
| `frontend/app/dashboard/*/page.tsx` | `src/pages/` | App Router pages live under `app/`; `src/pages/` documents their logical grouping |
| `frontend/lib/store.tsx` | `src/store/` | React Context provider and consumer hook |
| `frontend/lib/data.ts` (type exports) | `src/types/` | TypeScript type definitions (Asset, Assignment, etc.) |
| `frontend/lib/utils.ts` | `src/utils/` | Pure utilities: formatCurrency, formatDate, depreciation, failureRisk |
| `frontend/lib/*.ts` (logic files) | `src/services/` | Business logic that will become API client calls post-backend integration |
| `frontend/app/globals.css`, `postcss.config.mjs` | `src/theme/` | Tailwind CSS v4 config and CSS variable definitions |
| *(not yet created)* | `src/hooks/` | Custom hooks for data fetching, WebSocket (IoT), SSE (notifications), auth |

**Key observation:** The current `frontend/lib/` directory conflates three future concerns: `types/` (TypeScript interfaces), `utils/` (pure helper functions), and `services/` (data fetching that will call the FastAPI backend). The `src/` structure separates these cleanly. The `hooks/` directory is entirely new — it will hold `useAuth`, `useAssets`, `useWebSocket` (IoT live telemetry), and `useNotifications` (SSE stream) hooks that don't exist yet because the current frontend is self-contained with mock data.

---

## FastAPI Backend Folder Structure: `app/` Module Breakdown

> Source: SDD §1.2 Module Decomposition, §1.3 IoT Pipeline, §1.4 AI Pipeline [VERIFIED: SDD.md]

The backend directory is currently empty (`backend/` exists but contains no files). The `app/` structure below is designed from the SDD module decomposition.

```
app/
├── routers/        # FastAPI APIRouter definitions — one file per API module
├── models/         # SQLAlchemy ORM model classes — one file per entity
├── schemas/        # Pydantic request/response schema classes — one file per domain
├── services/       # Business logic layer — one service class per module
├── core/           # Cross-cutting concerns: config, security, RBAC dependencies
├── db/             # Database connection, session factory, Alembic migration support
├── mqtt/           # MQTT subscriber lifespan task, message handler, dedup logic
└── ai/             # Feature engineering pipeline, model loading (joblib), inference runner
```

### Module-by-Module Responsibility Descriptions

**`routers/`**
Contains one APIRouter file per API module (`auth.py`, `assets.py`, `assignments.py`, `maintenance.py`, `iot.py`, `predictions.py`, `notifications.py`, `audit.py`, `users.py`). Routers define URL prefixes and attach FastAPI `Depends()` guards for RBAC. No business logic belongs here — routers call service layer functions only.

**`models/`**
Contains SQLAlchemy declarative ORM class definitions for all nine entities: `User`, `Category`, `Asset`, `Assignment`, `MaintenanceRecord`, `SensorReading`, `AIRecommendation`, `Notification`, `AuditEvent`. Each model file maps directly to its database table schema. The `SensorReading` model includes the composite index hint `(asset_id, sensor_type, timestamp DESC)`.

**`schemas/`**
Contains Pydantic v2 model classes for all request bodies (Create/Update) and response shapes. Separate from ORM models to enforce the API contract boundary — e.g., `hashed_password` is on the ORM model but never appears in any response schema. Schemas handle field validation, enum coercion, and response serialization.

**`services/`**
Contains the business logic layer — one service class per module (e.g., `AssetService`, `AssignmentService`, `MaintenanceService`, `AuditService`, `RecommendationService`). Services contain state transition guards (e.g., lifecycle validation), cross-module calls (e.g., MaintenanceService calls AuditService on every state change), and database queries. The `AuditService` exposes only an `append()` method — no `update()` or `delete()`.

**`core/`**
Houses cross-cutting infrastructure: application configuration (loaded from environment variables via Pydantic Settings), JWT token issuance and validation utilities, the `get_current_user()` FastAPI dependency, and the `require_role()` RBAC dependency factory. Every router imports from `core/` for authentication and authorization — no module implements its own auth logic.

**`db/`**
Contains the SQLAlchemy async engine factory, session factory (`AsyncSession`), the `Base` declarative base (imported by all models), and Alembic migration configuration. The `get_db()` dependency (async generator) is defined here and injected into all service layer calls via FastAPI `Depends()`.

**`mqtt/`**
Contains the aiomqtt async subscriber that runs as a FastAPI lifespan task. Responsibilities: connecting to the Mosquitto broker, subscribing to `assets/+/sensors/+` with QoS 1, deserializing JSON payloads, checking `message_id` against the deduplication window (in-memory set with TTL), inserting valid readings via `SensorReadings` INSERT, and triggering WebSocket broadcast. The paho-mqtt v2 callback signature change (`reason_code` not `rc`) is a critical implementation note.

**`ai/`**
Contains the predictive maintenance pipeline: feature engineering functions that query `sensor_readings` and `maintenance_records`, the model loader (using `joblib` to load pre-trained `.pkl` files), the inference runner that produces `health_score`, `failure_risk`, `confidence`, and `top_factors`, and the scheduler task that periodically runs inference and writes results to `ai_recommendations`. The AI write boundary is enforced here — this module's only database write target is `ai_recommendations`.

---

## Non-Obvious Design Decisions (ER Annotation Guide)

The following decisions are non-obvious and require annotation in the ER diagram to explain the "why" to a reader who hasn't read the full SDD.

| Decision | Entity/Field | Why Non-Obvious | Annotation Text |
|----------|-------------|-----------------|-----------------|
| Soft-delete only | `Users.is_active` | Looks like a simple boolean; actually a hard constraint | "Never hard-delete — AuditEvents.actor_id FK would break historical records" |
| Derived overdue status | `Assignments.status` | `overdue` appears in frontend types but isn't stored persistently | "`overdue` is computed at query time (status=active AND expected_return_date < today), not stored" |
| String FK for IoT link | `Assets.sensor_device_id` | Looks like a missing UUID FK — is deliberate | "String (not UUID FK) — links to IoT simulator device alias; may differ from PostgreSQL UUID" |
| Correlation_id as string | `MaintenanceRecords.correlation_id` | Looks like it should be a UUID FK → AIRecommendations | "String, not FK — avoids coupling maintenance module to AI module at DB level; traceability via string match" |
| message_id unique constraint | `SensorReadings.message_id` | Looks like a standard text field | "UNIQUE constraint — MQTT QoS 1 can deliver duplicates; this field is the dedup key" |
| AI append-only boundary | `AIRecommendations` (whole entity) | Nothing on the schema itself signals the write restriction | "Only Predictive ML service may INSERT — enforced at API middleware, not DB constraint" |
| Audit append-only | `AuditEvents` (whole entity) | Standard tables allow UPDATE/DELETE | "No UPDATE or DELETE ever — immutable ledger; 'corrections' are new events" |
| SLA deadline on AI recs | `AIRecommendations.sla_deadline` | Unusual for a business data table | "High-risk items (failure_risk > 80%) have an SLA countdown visible in Manager UI; escalation notification fires on breach" |
| `expires_at` on Notifications | `Notifications.expires_at` | Unusual field | "Background scheduler purges notifications after this date; prevents unbounded table growth" |
| `top_factors` as JSON | `AIRecommendations.top_factors` | Could be a separate join table | "JSON array of contributing feature names from ML inference; low cardinality, read-only — no benefit to normalization" |

---

## Architecture Patterns

### Pattern 1: Modular Monolith with Module Isolation

**What:** Single deployable FastAPI application with nine logically isolated modules. Cross-module access only via explicit service interfaces — never via direct table access from another module's router.

**Forbidden dependency rules (from SDD §1.2):**
1. `ai/` module → NEVER → `assets/` table direct write
2. `mqtt/` module → NEVER → `ai/` module direct call
3. `notifications/` module → NEVER → `assets/` table write
4. Any module → NEVER → `core/` auth internals (only via `get_current_user()` dependency)

### Pattern 2: Three-Tier Frontend Separation

**What:** The `src/` structure enforces clean separation between presentation (`components/`, `pages/`), state (`store/`), data access (`services/`, `hooks/`), and cross-cutting concerns (`types/`, `utils/`, `theme/`).

**Why:** The current frontend conflates types, utilities, and mock data in `lib/`. The new structure prepares for the backend integration phase where `lib/data.ts` seed data is replaced by real API calls in `services/` and data-fetching hooks in `hooks/`.

### Pattern 3: AI Write Boundary Enforcement

**What:** The AI module writes exclusively to `ai_recommendations`. The Manager approval gate is the only path that crosses from AI recommendations into business tables (creating a `MaintenanceRecord`).

**Why:** This prevents AI from directly altering physical asset status, assignment state, or maintenance records without human oversight. The boundary is enforced at the service layer (AuditService checks caller identity), not as a DB constraint.

---

## Common Pitfalls

### Pitfall 1: Including SQL DDL in ER Documentation
**What goes wrong:** The phase explicitly requires NO `CREATE TABLE` statements or SQL DDL. Adding DDL conflates conceptual design with physical implementation.
**How to avoid:** Use Mermaid `erDiagram` notation only. Field types in `erDiagram` are conceptual (`uuid`, `string`, `enum`, `float`, `json`, `datetime`) — not PostgreSQL-specific (`VARCHAR(255)`, `TIMESTAMPTZ`).

### Pitfall 2: Including Endpoint Paths in API Module Overview
**What goes wrong:** The API overview must show module *responsibilities* only — no `/api/v1/assets/{id}` paths, no `GET`/`POST` verbs. Those belong in the OpenAPI spec phase.
**How to avoid:** Write one-line responsibility statements in plain English. "Manages asset lifecycle state transitions" not "POST /assets/{id}/retire".

### Pitfall 3: Conflating `overdue` as a Stored Status
**What goes wrong:** Frontend type system includes `overdue` as an `AssignmentStatus` enum value, leading designers to model it as a stored database value.
**How to avoid:** Document explicitly in ER notes that `overdue` is computed at query time. The database stores only `active` + `expected_return_date`; the API layer computes `overdue` before returning responses.

### Pitfall 4: Missing the `correlation_id` Design Pattern
**What goes wrong:** `correlation_id` appears on both `MaintenanceRecords` and `AuditEvents` — easy to miss the significance.
**How to avoid:** Document both as the AI audit chain link. The `MaintenanceRecords.correlation_id` stores the `ai_recommendations.id` that triggered it; `AuditEvents.correlation_id` groups all events from the same business transaction. These are separate uses of the same field name.

### Pitfall 5: Treating `sensor_device_id` as a UUID FK
**What goes wrong:** It looks like a missing FK relationship to a `Devices` table. It is intentionally a plain string.
**How to avoid:** Annotate in the ER diagram explicitly. The IoT Simulator uses a device alias format; the field is a soft reference to the simulator config, not a hard DB FK.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `types.ts` monolith | Domain-split `types/` directory | Standard since TypeScript 4.x project scaling | Easier code-splitting and tree-shaking |
| Pydantic v1 `class Config` | Pydantic v2 `model_config = ConfigDict(...)` | Pydantic v2 (2023) | Breaking change — all schema classes use new API |
| paho-mqtt v1 `on_connect(client, userdata, flags, rc)` | paho-mqtt v2 `on_connect(client, userdata, flags, reason_code, properties)` | paho-mqtt 2.0 (2023) | **Critical** — v1 signature raises TypeError silently at runtime with v2.x |
| SQLAlchemy 1.x `session.query()` | SQLAlchemy 2.x `select()` statement style | SQLAlchemy 2.0 (2023) | 1.x legacy query API removed in 2.0 |

---

## Environment Availability

> Step 2.6: Backend directory is empty — FastAPI stack not yet installed. Frontend stack is present.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | ✓ | Confirmed (package.json present, `.next/` built) | — |
| Next.js | Frontend pages | ✓ | ^16.2.9 (package.json) | — |
| Python 3.11 | FastAPI backend | ✗ | Not confirmed | Install via Docker `python:3.11-slim` |
| FastAPI | Backend API | ✗ | Not installed | Will be installed in backend implementation phase |
| PostgreSQL | Data layer | ✗ | Not confirmed | Docker `postgres:16` as per SDD §1.6 |
| Mosquitto | MQTT broker | ✗ | Not confirmed | Docker `eclipse-mosquitto:2` as per SDD §1.6 |

**Phase 19 is a documentation phase only** — no code installation or execution is required. Missing backend dependencies are noted for downstream implementation phases.

---

## Validation Architecture

> `nyquist_validation` is enabled (not set to false in config.json).

Phase 19 is a **pure documentation phase** — its outputs are Markdown files (ER diagram, API module overview, folder structure definitions), not executable code. There are no automated test targets.

| Property | Value |
|----------|-------|
| Framework | N/A — documentation phase |
| Test type | Human review gate (SDD completeness check) |
| Quick run command | N/A |
| Full suite command | `cat .planning/phases/19-*/19-PLAN.md` (human review) |

**Wave 0 Gaps:** None — no test infrastructure needed for a documentation phase.

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (documentation phase) | JWT — documented in Auth module responsibility |
| V4 Access Control | No (documentation phase) | RBAC matrix documented in SDD §2.1 |
| V5 Input Validation | No (documentation phase) | Pydantic schemas — documented in `schemas/` module |
| V6 Cryptography | No (documentation phase) | bcrypt for password hashing — noted in Users entity |

**Security-relevant documentation requirements:**
- `Users.hashed_password` must be annotated in ER as "never store plaintext — bcrypt hash"
- Auth module responsibility statement must mention JWT issuance AND validation
- RBAC note: AI recommendation approval is Manager/Admin only — must be stated in AI Predictions module responsibility

---

## Sources

### Primary (HIGH confidence)
- SDD.md (`.planning/phases/14-system-architecture-domain-model/SDD.md`) — all entity definitions, module responsibilities, ER relationships, cardinality, design decisions
- `frontend/lib/data.ts` — confirmed TypeScript type definitions matching SDD entities
- `frontend/lib/store.tsx` — confirmed global state structure (maps to `src/store/`)
- `frontend/lib/predictive.ts` — confirmed AI recommendation type structure
- `frontend/lib/audit-log.ts` — confirmed AuditEvent type structure
- `frontend/package.json` — confirmed Next.js 15 + React 19 + Tailwind CSS v4 + shadcn/ui stack

### Secondary (MEDIUM confidence)
- Frontend directory listing (codebase inspection) — confirmed existing folder layout for `src/` mapping
- Backend directory listing — confirmed empty (no existing implementation)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The nine API modules required by the success criteria map to the SDD's nine architectural modules (Auth=IAM, Assets=Asset Lifecycle, Assignments part of Asset Lifecycle, etc.) | API Module Overview | Minor naming discrepancy — easily corrected in review |
| A2 | `app/` is the canonical FastAPI root package name (not `src/` or the project name) | FastAPI Folder Structure | Naming only — no functional impact |
| A3 | Next.js App Router continues to use `app/` directory; `src/` is the *canonical design* directory, not a literal filesystem migration | Frontend Folder Structure | If literal migration is intended, page file locations would need updating |

---

## Open Questions

1. **Does `src/` represent a literal filesystem change or a conceptual design document?**
   - What we know: The existing frontend uses `app/`, `components/`, `lib/` at the root. The success criteria asks for `src/` directory definitions.
   - What's unclear: Whether the SDD deliverable shows `src/` as a proposed refactor of the existing structure, or as the design for the fully-rebuilt backend-connected frontend.
   - Recommendation: Document `src/` as the **target architecture** for the backend-connected frontend rebuild, with a note that the current `app/`-rooted structure will be migrated.

2. **Should `SensorReadings` be called `IoTReadings` in the ER diagram?**
   - What we know: SDD §2.5 uses `SensorReadings` as the entity name. The phase success criteria mentions "IoTReadings" in the entity list.
   - What's unclear: Whether this is an intentional rename or a documentation inconsistency.
   - Recommendation: Use `SensorReadings` to match SDD §2.5 exactly; note the `IoTReadings` alias in the entity notes.

---

## Metadata

**Confidence breakdown:**
- Entity list and fields: HIGH — sourced directly from SDD §2.5 Mermaid ERD
- API module names and responsibilities: HIGH — sourced directly from SDD §1.2 Module Responsibility Table
- Frontend `src/` structure: HIGH — derived from live codebase inspection + Next.js App Router conventions
- FastAPI `app/` structure: HIGH — derived from SDD §1.2, §1.3, §1.4 module decomposition
- Non-obvious design decisions: HIGH — all cross-referenced to specific SDD sections

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (SDD is the source of truth; valid until SDD v1.3 is published)
