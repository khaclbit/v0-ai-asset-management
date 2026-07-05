# Research Summary — v1.2 IoT System Design

**Project:** Smart AI-Powered Asset Management System
**Milestone:** v1.2 — Software Design Document (SDD)
**Synthesized:** 2026-06-28
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Stack Additions

| Layer | Technology | Version | Key Note |
|-------|-----------|---------|----------|
| Frontend | React + TypeScript | 19.x / 5.x | Continue from v1.1 direction |
| Frontend | Material UI | v6.5.0 | MD3-aligned, Emotion-based; avoid v7+ (Pigment CSS) |
| Frontend | Recharts | 2.x | Best tutorial coverage; v3 is too new for academic project |
| Frontend | Zustand | 5.x | UI state (auth, filters, sidebar); no Redux overhead |
| Frontend | React Query | 5.x | Server state, cache, polling for REST data |
| Backend | FastAPI + SQLAlchemy | 0.115+ / 2.0 | Async-native; use Alembic 1.18 for migrations |
| Backend | PyJWT | 2.13.0 | Replaces stale `python-jose`; use for JWT auth |
| IoT | paho-mqtt | 2.1.0 | ⚠ v2 has breaking `on_connect` signature (5-arg) |
| IoT | Mosquitto Broker | 2.x | Docker: `eclipse-mosquitto:2`; port 1883 dev, 8883 TLS prod |
| AI/ML | scikit-learn + XGBoost | 1.5.x / 2.1.x | Pin these versions — latest (1.9/3.3) outpaces tutorials |
| AI/ML | joblib | 1.4.x | Model persistence (.pkl serialization) |
| Deployment | Docker Compose | 3.9 | 5 services: frontend, backend, postgres, mosquitto, simulator |

---

## Feature Table Stakes vs Differentiators

### IoT Monitoring Dashboard
**Table stakes (must-have):**
- Per-asset metric tiles (current sensor value + unit + threshold color) — 6 sensor types
- Time-series LineChart per sensor dimension (Recharts) with time window selector
- Asset list sidebar with live status dot (green/yellow/red)
- Threshold violation indicators (red tile when crossed)
- Last-updated timestamp per sensor tile
- Connection status indicator (MQTT/WebSocket state)

**Differentiators (include in wireframes):**
- Sensor health heatmap (assets × sensor types grid)
- Auto-refresh rate selector (5s / 10s / 30s)

**Anti-features (do NOT design):** drag-drop widget layout, multi-asset comparison charts, real-time anomaly detection in UI

### AI Predictive Maintenance
**Table stakes (must-have):**
- Recommendation card: health score (radial/numeric), failure risk %, confidence %, top 3 contributing factors
- Risk band chip: High / Medium / Low with color coding
- Manager approval gate: Approve → create maintenance ticket | Defer with reason
- SLA countdown on High-risk items; escalation notice when past deadline
- Correlation ID on every recommendation (audit traceability)
- AI never mutates business state directly — recommendations only

**Differentiator:** explainability panel (factor weight breakdown)

### Notification Center
**Table stakes:** bell icon + unread badge, header dropdown panel (latest 5), full `/notifications` page with pagination, deep-link click-through to source record, mark-as-read / mark-all-read

**Anti-features:** email/SMS channels, push notifications, WebSocket per notification (use polling)

### Audit Log
**Table stakes:** immutable append-only table, columns: actor / action / entity / before-after state / timestamp / correlation_id, category filter (Business / Security / AI-assisted), expandable row for full details, no delete button ever

**Differentiator:** per-asset entity timeline view

### User Management
**Table stakes:** user list with role badge, create/edit user form, role assignment (3 fixed roles), soft-delete only (deactivate), Admin-only access

**Anti-features:** granular permission matrix, custom role builder

---

## Recommended Architecture

### Build Order (strict dependency chain)
1. **Foundation** — Docker Compose topology + PostgreSQL schema + Alembic migrations + FastAPI skeleton + JWT auth
2. **IoT Ingestion** — Mosquitto broker + Python simulator + MQTT subscriber in FastAPI + `sensor_readings` table ← **gating phase for AI**
3. **Real-time Frontend** — WebSocket endpoint + React IoT dashboard with Recharts
4. **AI Pipeline** — Feature engineering from `sensor_readings` → Scikit-learn model → `ai_recommendations` table + `/predict` endpoint
5. **Maintenance Integration** — Manager approval → maintenance ticket creation → full audit chain
6. **Notification Pipeline** — SSE endpoint + in-app notification center (can parallelize with phase 5)
7. **Reporting + Polish** — Role-scoped reports, user management, audit log UI

### Real-time Delivery Pattern
- **IoT telemetry → WebSocket** (per-asset subscription fan-out from MQTT)
- **Notifications → SSE** (per-user push, simpler reconnect via `EventSource`)
- **AI recommendations → REST polling** (low frequency, no streaming needed)

### Key Module Boundaries
- `ai_recommendations` table is the strict boundary — AI writes here only
- Manager approval endpoint is the only gate to `maintenance_records`
- `audit_events` table is append-only, never updated or deleted
- Sensor simulator is a standalone Python container, not part of the backend

---

## Top 7 Watch Out For

| # | Pitfall | Severity | Prevention |
|---|---------|----------|-----------|
| 1 | **MQTT QoS 0 message loss** — gaps in telemetry silently miss health score windows | 🔴 Critical | Specify QoS 1 + `message_id` dedup in IoT payload schema in SDD |
| 2 | **No MQTT topic naming convention** — wildcard `#` subscription breaks on schema change | 🔴 Critical | Define topic hierarchy: `assets/{id}/sensors/{type}` as formal contract in SDD |
| 3 | **Simulator publishes with no sleep interval** — floods backend, causes deadlock | 🔴 Critical | Specify `PUBLISH_INTERVAL_SEC=10` default; async ingest handler returning 202 |
| 4 | **Approval gate not a state machine** — manager gate exists only in UI, not server-enforced | 🔴 Critical | Define recommendation state machine (pending → approved/deferred) with RBAC in SDD before wireframes |
| 5 | **Random train/test split** on time-series sensor data — excellent metrics, terrible demo | 🔴 Critical | Specify temporal split (train on old data, test on recent) in AI Architecture section |
| 6 | **WebSocket firehose** — MQTT ingest broadcasts every message to every connected client | 🟡 High | Design aggregation layer: batch updates per asset per 5s window before WS broadcast |
| 7 | **Scope creep into MLOps** — CI/CD for model retraining, drift detection, model registry | 🟡 High | Hard boundary in SDD preface: model is pre-trained offline, served via joblib `.pkl` file |

---

## Open Questions (Resolve Before Requirements)

1. **Sensor set fixed or configurable?** — 6 fixed sensor types (temp/humidity/power/current/vibration/running hours) or per-asset-category configurable? → Recommendation: fix 6 types for SDD scope
2. **Training data source** — synthetic labeled data from simulator, or historical maintenance records as labels? → Affects AI Architecture section depth
3. **Mosquitto deployment** — local Docker only, or shared demo server? → Affects IoT-5 (reconnect) severity and TLS requirement in SDD
4. **Notification retention** — how long are notifications kept before auto-expiry? → Affects pagination design
5. **Report scope** — asset/assignment/maintenance reports only, or include IoT sensor summary reports?
