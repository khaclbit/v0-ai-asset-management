# Architecture Patterns — IoT + AI Asset Management System

**Domain:** Smart AI-Powered Asset Management with IoT + ML integration
**Researched:** 2026-06-28
**Milestone:** v1.2 — Software Design Document (SDD)
**Confidence:** HIGH
**Audience:** Software architect writing SDD; small university implementation team

---

## 1. System Context Diagram

### System Boundary

The Smart AI-Powered Asset Management System sits at the intersection of three external domains:
human users managing organizational assets, physical IoT sensors embedded in assets, and
machine learning inference providing predictive recommendations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Smart Asset Management System                            │
│                                                                             │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────────────┐    │
│  │  Frontend    │   │  FastAPI         │   │  PostgreSQL              │    │
│  │  React/TS   │◄──┤  Backend         ├──►│  (Assets + Telemetry)    │    │
│  │  Material UI │   │  (Modular        │   │                          │    │
│  └──────────────┘   │   Monolith)      │   └──────────────────────────┘    │
│                      └────────┬────────┘                                    │
│                               │                                             │
│              ┌────────────────┼────────────────┐                           │
│              ▼                ▼                ▼                            │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐            │
│  │  MQTT Broker     │  │  AI/ML       │  │  Notification     │            │
│  │  (Mosquitto)     │  │  Service     │  │  Service (SSE)    │            │
│  └──────────────────┘  │  (Sklearn)   │  └──────────────────┘            │
│                         └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────┘
         ▲                          ▲
         │                          │
┌─────────────────┐        ┌──────────────────┐
│  Python Sensor  │        │  Human Actors     │
│  Simulator      │        │  Admin/Manager    │
│  (IoT Device)   │        │  /Staff           │
└─────────────────┘        └──────────────────┘
```

### External Actors

| Actor | Type | Interaction |
|-------|------|-------------|
| Administrator | Human user | Full system management via React frontend |
| Manager | Human user | Approves AI recommendations, views IoT dashboard |
| Staff | Human user | Views assigned assets, submits maintenance requests |
| Python Sensor Simulator | Software agent | Publishes MQTT telemetry (temperature, battery, vibration) |
| MQTT Broker (Mosquitto) | Infrastructure | Routes sensor messages to backend subscriber |
| Docker Compose | Deployment | Orchestrates all services for local development |

### What the System Does NOT Interact With (Scope Boundary)

- External cloud IoT platforms (AWS IoT, Azure IoT Hub) — not in scope for university project
- Real physical hardware sensors — simulated only
- External identity providers (OIDC/SSO) — simple JWT auth is sufficient for SDD scope
- Email/SMS notification channels — in-app notifications only

---

## 2. Module Decomposition

### Existing Modules (from v1.0 — carry forward, extend only)

| Module | Owned Responsibilities | v1.2 Changes |
|--------|----------------------|--------------|
| Identity & Access | JWT auth, RBAC policy, role-based routing | No change |
| Asset Lifecycle | Registration, assignment, return, disposal | Add `sensor_id` FK to assets table |
| Maintenance & Warranty | Maintenance scheduling, warranty tracking | Add AI-generated ticket creation path |
| Reporting & Insights | KPI aggregations, dashboard charts | Add IoT telemetry charts |
| AI Orchestration | Assistant/OCR/predictive routing | Extend: add Scikit-learn prediction endpoint |
| Audit & Compliance | Immutable audit event ledger | Add IoT events and AI recommendation events |

### NEW Modules for v1.2

| Module | Responsibility | Boundary Rule |
|--------|---------------|---------------|
| **IoT Module** | MQTT subscription, sensor telemetry ingestion, time-series storage, live streaming to frontend | Owns `sensor_readings` table; no direct write to `assets` table |
| **AI Predictive Module** | Feature engineering from sensor history, Scikit-learn model scoring, recommendation output, confidence routing | Reads from `sensor_readings`; writes to `ai_recommendations`; never directly creates maintenance tickets |
| **Notification Module** | Event subscription, in-app notification creation, SSE push delivery to connected clients | Reads events from all modules; owns `notifications` table; pushes via SSE |

### Module Dependency Map

```
Identity & Access
      ↑ (all modules use RBAC checks)

Asset Lifecycle ──── Maintenance & Warranty
      │                      ▲
      │ (sensor_id FK)        │ (creates ticket)
      ▼                      │
IoT Module ──────► AI Predictive Module
      │                      │
      │                      ▼
      └──────────► Notification Module ◄──── Audit & Compliance
                             │
                             ▼
                       Frontend (SSE)

Reporting & Insights ◄── (reads from all)
```

### Forbidden Dependencies

- IoT Module must NOT write directly to `assets` table (go through Asset Lifecycle module)
- AI Predictive Module must NOT create maintenance tickets directly (must route through Maintenance module with human approval gate)
- Frontend must NOT subscribe to MQTT directly (all IoT data served via backend WebSocket/SSE)
- Notification Module must NOT own business logic (subscribe to events only)

---

## 3. IoT Data Pipeline Architecture

### End-to-End Flow

```
[Python Sensor Simulator]
        │
        │  MQTT publish
        │  Topic: assets/sensors/{asset_id}/telemetry
        │  Payload: { asset_id, timestamp, temperature_c,
        │             battery_pct, vibration_ms2, uptime_hrs }
        ▼
[Mosquitto MQTT Broker]  (port 1883)
        │
        │  MQTT subscribe (aiomqtt async client)
        │  runs inside FastAPI lifespan background task
        ▼
[FastAPI MQTT Consumer]  (background task in main.py lifespan)
        │  1. Parse and validate payload (Pydantic)
        │  2. Persist to sensor_readings table
        │  3. Check thresholds → emit alert event if breached
        │  4. Broadcast to WebSocket channel for this asset_id
        ▼
[PostgreSQL — sensor_readings table]
        │  Columns: id, asset_id (FK), recorded_at (timestamptz),
        │           temperature_c, battery_pct, vibration_ms2,
        │           uptime_hrs, created_at
        │  Index: (asset_id, recorded_at DESC)
        ▼
[FastAPI WebSocket Endpoint]  GET /ws/telemetry/{asset_id}
        │  - React frontend connects per monitored asset
        │  - Backend holds per-asset subscriber list
        │  - Fan-out: incoming MQTT message → all subscribers for that asset_id
        ▼
[React Frontend — IoT Monitoring Dashboard]
        │  - recharts LineChart consuming live WebSocket stream
        │  - rolling 60-point window per metric
        │  - threshold bands rendered as reference lines
```

### Sensor Simulator Design

```python
# simulator/main.py  (conceptual, not implementation)
# Runs as separate Docker service
# Publishes every N seconds per configured asset_id list
# Payload shape:
{
  "asset_id": "ASSET-001",
  "timestamp": "2026-06-28T10:00:00Z",
  "temperature_c": 72.4,
  "battery_pct": 87.0,
  "vibration_ms2": 0.12,
  "uptime_hrs": 1203.5
}
```

### MQTT Topic Convention

```
assets/sensors/{asset_id}/telemetry    ← normal readings
assets/sensors/{asset_id}/alert        ← threshold breach (published by backend)
assets/sensors/+/telemetry             ← wildcard subscription (backend uses this)
```

### Threshold Rules (configured in IoT Module)

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|-------------------|
| temperature_c | > 80°C | > 90°C |
| battery_pct | < 30% | < 15% |
| vibration_ms2 | > 1.5 | > 3.0 |

When critical threshold breached → IoT Module emits `sensor.alert.critical` event → Notification Module picks up → in-app notification to Manager.

### Key Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| MQTT Broker | Eclipse Mosquitto | Lightweight, standard, Docker-friendly |
| Python MQTT client | aiomqtt (async) | Native async, compatible with FastAPI event loop |
| Time-series storage | PostgreSQL (standard) | No extra service needed; index on (asset_id, recorded_at) sufficient for university scale |
| Live streaming | WebSocket (FastAPI built-in) | See Section 5 for full rationale |

---

## 4. AI Pipeline Architecture

### End-to-End Flow

```
[PostgreSQL — sensor_readings]
        │
        │  Batch query: last N readings per asset
        │  Triggered: scheduled (cron every hour) OR on-demand via API
        ▼
[Feature Engineering Layer]  (Python module inside AI Predictive Module)
        │  Per-asset feature vector:
        │  - avg_temp_24h, max_temp_24h, temp_trend_slope
        │  - avg_battery_24h, battery_drop_rate
        │  - avg_vibration_24h, vibration_spike_count
        │  - uptime_hrs (raw)
        │  - days_since_last_maintenance
        ▼
[Scikit-learn Model]  (loaded at FastAPI startup from saved .pkl file)
        │  Model type: RandomForestClassifier or GradientBoostingClassifier
        │  Output: { risk_score: float 0-1, risk_band: LOW|MEDIUM|HIGH,
        │            confidence: float 0-1, top_features: list[str] }
        ▼
[Confidence + Risk Router]  (existing pattern from v1.0 Phase 04)
        │
        ├── LOW risk  → store recommendation, no action
        ├── MEDIUM    → store recommendation, notify Manager for review
        └── HIGH      → store recommendation + create pending maintenance
                        ticket (state: PENDING_APPROVAL)
        ▼
[ai_recommendations table]
        │  Columns: id, asset_id, generated_at, risk_band, risk_score,
        │           confidence, top_features (JSON), status
        │           (PENDING|APPROVED|REJECTED|ESCALATED)
        ▼
[Manager Approval Flow]
        │  Manager sees recommendation in AI Predictive dashboard panel
        │  Approve → maintenance ticket transitions to SCHEDULED
        │  Reject  → recommendation status = REJECTED, reason stored
        │  No action by SLA deadline → escalation event emitted
        ▼
[Maintenance & Warranty Module]
        │  Maintenance ticket created/updated via module API
        │  Standard lifecycle: PENDING_APPROVAL → SCHEDULED →
        │                      IN_PROGRESS → COMPLETED
        ▼
[Audit & Compliance Module]
        │  Immutable event: ai_recommendation.created
        │                   ai_recommendation.approved / rejected
        │                   maintenance.created_from_ai
        │  ai_action_links table: links audit_event ↔ ai_recommendation
```

### Model Training (Offline, Separate Script)

```
training/
  generate_synthetic_data.py   ← creates labeled sensor history
  train_model.py               ← fits sklearn model, outputs model.pkl
  evaluate_model.py            ← prints classification report
  model.pkl                    ← serialized model (committed to repo for SDD)
```

Training is offline only. The backend loads `model.pkl` at startup via `joblib.load()`. No online learning or model retraining in scope for v1.2.

### API Endpoints in AI Predictive Module

```
POST /ai/predict/{asset_id}        ← on-demand prediction for one asset
GET  /ai/recommendations           ← list recommendations (paginated, role-filtered)
GET  /ai/recommendations/{id}      ← single recommendation detail
POST /ai/recommendations/{id}/approve  ← Manager approves (RBAC: manager only)
POST /ai/recommendations/{id}/reject   ← Manager rejects
```

### Scikit-learn Model Choice Rationale

Use **RandomForestClassifier** because:
- Handles small-to-medium tabular sensor data without normalization
- Built-in feature importance for explainability (required by Phase 04 contract)
- No GPU required
- Fits in memory easily
- Familiar to university teams

Avoid neural networks at this stage — unnecessary complexity, poor explainability for this use case.

---

## 5. Real-Time Data Delivery to Frontend

### Recommendation: Hybrid WebSocket (telemetry) + SSE (notifications)

| Concern | WebSocket | SSE | Polling |
|---------|-----------|-----|---------|
| IoT live telemetry (high frequency, per-asset) | ✅ Best fit | ❌ One channel per connection | ❌ Too much lag/load |
| Notifications (low frequency, per-user) | ✅ Works | ✅ Simpler | ✅ Acceptable |
| Browser support | ✅ Universal | ✅ Universal | ✅ Universal |
| FastAPI support | ✅ Native `WebSocket` | ✅ `StreamingResponse` | ✅ Standard |
| Reconnection handling | Manual (library helps) | ✅ Built into browser EventSource | Manual |
| Firewall/proxy friendliness | ⚠ Some proxies block | ✅ Pure HTTP | ✅ Pure HTTP |

**Decision: WebSocket for IoT telemetry, SSE for notifications.**

Rationale:
- IoT telemetry needs per-asset channels with fan-out from MQTT consumer. WebSocket naturally models this bidirectional subscription.
- Notifications are one-way server-push per user. SSE is simpler to implement and debug (plain HTTP), browser `EventSource` API handles reconnect automatically.
- Polling is acceptable for non-real-time data (AI recommendations list) — use standard REST + React Query with 30-second refetch interval.

### WebSocket Architecture (Telemetry)

```
FastAPI ConnectionManager (singleton)
  connections: Dict[asset_id, Set[WebSocket]]

On MQTT message received for asset_id X:
  → ConnectionManager.broadcast(asset_id=X, message=payload)
  → iterates all WebSocket connections subscribed to X
  → sends JSON payload to each

Frontend:
  const ws = new WebSocket(`ws://api/ws/telemetry/${assetId}`)
  ws.onmessage = (e) => updateChart(JSON.parse(e.data))
```

### SSE Architecture (Notifications)

```
FastAPI SSE Endpoint: GET /notifications/stream
  Headers: Content-Type: text/event-stream
  Authenticated: JWT token in query param or header

Per-user notification queue (in-memory dict for university scope):
  queues: Dict[user_id, asyncio.Queue]

On notification event:
  → put into target user's queue
  → SSE generator yields "data: {...}

"

Frontend:
  const es = new EventSource(`/notifications/stream?token=${jwt}`)
  es.onmessage = (e) => addToast(JSON.parse(e.data))
```

### What NOT to Use

- **Redis Pub/Sub for WebSocket fan-out**: Not needed for single-server university deployment. Add only if multi-instance deployment is required.
- **Socket.IO**: Extra abstraction layer not needed when FastAPI native WebSocket is sufficient.
- **GraphQL Subscriptions**: Over-engineered for this use case.

---

## 6. Integration Points Between All Modules

### Complete Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Integration Point                │ From            → To                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ MQTT message ingestion           │ Mosquitto       → IoT Module             │
│ Sensor storage                   │ IoT Module      → PostgreSQL             │
│ WebSocket fan-out                │ IoT Module      → Frontend (WS)          │
│ Threshold alert event            │ IoT Module      → Notification Module    │
│ Sensor history read              │ AI Predictive   ← PostgreSQL (read only) │
│ Recommendation storage           │ AI Predictive   → PostgreSQL             │
│ Maintenance ticket creation      │ AI Predictive   → Maintenance Module     │
│ Approval/rejection action        │ Frontend        → AI Predictive Module   │
│ AI audit event                   │ AI Predictive   → Audit Module           │
│ Notification creation            │ Notification Module → PostgreSQL         │
│ SSE delivery                     │ Notification Module → Frontend (SSE)     │
│ Asset sensor binding             │ Asset Lifecycle ↔ IoT Module             │
│ Maintenance ticket update        │ Maintenance     → Audit Module           │
│ RBAC enforcement                 │ Identity        → All modules (middleware)│
│ Reporting aggregation            │ Reporting       ← all tables (read only) │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Event Contracts (Internal)

| Event Name | Producer | Consumer | Payload |
|------------|----------|----------|---------|
| `sensor.reading.stored` | IoT Module | AI Predictive (optional trigger) | `{asset_id, recorded_at}` |
| `sensor.alert.critical` | IoT Module | Notification Module | `{asset_id, metric, value, threshold}` |
| `ai.recommendation.created` | AI Predictive | Notification Module, Audit | `{recommendation_id, asset_id, risk_band}` |
| `ai.recommendation.approved` | AI Predictive | Maintenance, Audit | `{recommendation_id, approved_by, maintenance_id}` |
| `ai.recommendation.rejected` | AI Predictive | Audit | `{recommendation_id, rejected_by, reason}` |
| `maintenance.ticket.created` | Maintenance | Notification Module, Audit | `{ticket_id, asset_id, source: "ai"|"manual"}` |
| `notification.created` | Notification Module | SSE delivery task | `{user_id, message, type, link}` |

For university scope: these events are function calls within the modular monolith (not a message bus). Extract to Redis Streams or a message broker only if async workers are needed.

### Data Boundary Summary

| Table | Owner Module | Readers |
|-------|-------------|---------|
| `assets` | Asset Lifecycle | All (read), AI Predictive (read) |
| `sensor_readings` | IoT Module | AI Predictive, Reporting, Frontend (via WS) |
| `ai_recommendations` | AI Predictive | Frontend, Notification, Audit, Reporting |
| `maintenance_records` | Maintenance & Warranty | Reporting, Audit, AI Predictive |
| `notifications` | Notification Module | Frontend, Identity |
| `audit_events` | Audit & Compliance | Reporting, Frontend (read-only view) |
| `ai_action_links` | Audit & Compliance | Reporting |

---

## 7. Docker Compose Multi-Service Topology

```yaml
# Conceptual service topology (not full compose file)

services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://...
      MQTT_BROKER_HOST: mosquitto
      MQTT_BROKER_PORT: 1883
    depends_on: [postgres, mosquitto]

  postgres:
    image: postgres:17
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: asset_mgmt
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    ports: ["5432:5432"]

  mosquitto:
    image: eclipse-mosquitto:2
    volumes:
      - ./mosquitto/mosquitto.conf:/mosquitto/config/mosquitto.conf
    ports: ["1883:1883", "9001:9001"]

  sensor-simulator:
    build: ./simulator
    environment:
      MQTT_BROKER_HOST: mosquitto
      PUBLISH_INTERVAL_SECONDS: 5
      ASSET_IDS: "ASSET-001,ASSET-002,ASSET-003"
    depends_on: [mosquitto]

volumes:
  postgres_data:
```

### Service Responsibilities

| Service | Runtime | Role |
|---------|---------|------|
| frontend | Node (Vite/React) | SPA served to browser |
| backend | Python/FastAPI | All business logic, MQTT consumer, WS/SSE server |
| postgres | PostgreSQL 17 | All persistent data |
| mosquitto | Eclipse Mosquitto 2 | MQTT broker |
| sensor-simulator | Python | Generates synthetic IoT sensor data |

### Why No Redis in Base Topology

Redis is intentionally omitted from the base Docker Compose. In-memory queues (`asyncio.Queue`) inside FastAPI are sufficient for single-instance university deployment. If multi-instance or session sharing becomes needed, add Redis as an optional compose profile.

---

## 8. Suggested Build Order

Build order respects hard dependencies: each phase can only start after its dependencies are running and tested.

### Phase 1 — Infrastructure Foundation
**Build first.** Everything depends on this.
- Docker Compose with postgres + mosquitto + backend skeleton
- Database schema: all tables including `sensor_readings`, `ai_recommendations`, `notifications`
- Alembic migrations setup
- FastAPI project structure with module folders
- JWT auth middleware (carry from v1.0 design)

**Deliverable:** `docker-compose up` brings up all infrastructure; DB migrations run clean.

### Phase 2 — IoT Ingestion Pipeline
**Depends on:** Phase 1
- Python sensor simulator publishing to Mosquitto
- FastAPI MQTT consumer (aiomqtt background task in lifespan)
- Sensor reading storage to PostgreSQL
- Threshold detection logic
- IoT Module complete (no frontend yet)

**Verification:** `mosquitto_sub -t "assets/sensors/+/telemetry"` shows live messages; DB rows appear in `sensor_readings`.

### Phase 3 — Real-Time Frontend Delivery
**Depends on:** Phase 2
- FastAPI WebSocket endpoint (`/ws/telemetry/{asset_id}`)
- ConnectionManager fan-out implementation
- React IoT Monitoring page: recharts live charts consuming WebSocket
- Asset detail panel showing live metrics

**Verification:** React dashboard shows live telemetry updating every 5 seconds.

### Phase 4 — AI Predictive Pipeline
**Depends on:** Phase 2 (needs `sensor_readings` data)
- Feature engineering module (Python, reads from DB)
- Scikit-learn model training script + `model.pkl`
- Prediction API endpoints (on-demand + scheduled)
- `ai_recommendations` table + confidence/risk routing
- Manager approval endpoints (RBAC: manager role only)

**Verification:** POST `/ai/predict/ASSET-001` returns `{risk_band, risk_score, confidence, top_features}`.

### Phase 5 — Maintenance Ticket Integration
**Depends on:** Phase 4
- Wire AI approval → Maintenance module ticket creation
- Maintenance ticket state machine (PENDING_APPROVAL → SCHEDULED → IN_PROGRESS → COMPLETED)
- Audit events for AI recommendation lifecycle
- `ai_action_links` traceability records

**Verification:** Approving a HIGH risk recommendation creates a maintenance ticket visible in Maintenance module.

### Phase 6 — Notification Pipeline
**Depends on:** Phase 3, Phase 4
- `notifications` table
- Notification Module (event → notification record → SSE delivery)
- SSE endpoint (`/notifications/stream`)
- React Notification Center (bell icon + dropdown + notification page)
- Toast on critical sensor alert

**Verification:** Simulating a critical threshold breach produces in-app notification within 2 seconds.

### Phase 7 — Reporting + Polish
**Depends on:** All previous phases
- Extend Reporting module with IoT metrics (avg temp, alert count)
- AI prediction accuracy tracking (if labeled ground truth available)
- Dashboard KPI cards for IoT health
- Audit log UI for AI events
- End-to-end integration testing

**Verification:** Dashboard shows complete picture: asset health, live IoT data, AI recommendations, maintenance status.

### Dependency Graph Summary

```
Phase 1 (Infrastructure)
    └── Phase 2 (IoT Ingestion)
            ├── Phase 3 (Real-time Frontend)
            │       └── Phase 6 (Notifications)
            └── Phase 4 (AI Predictive)
                    ├── Phase 5 (Maintenance Integration)
                    │       └── Phase 6 (Notifications)
                    └── Phase 7 (Reporting + Polish)
```

---

## 9. Anti-Patterns to Avoid

### Anti-Pattern 1: Frontend Subscribing to MQTT Directly
**What:** React app connects directly to Mosquitto WebSocket port (9001).
**Why bad:** Exposes broker to internet; no auth enforcement; bypasses business logic layer; CORS nightmare.
**Instead:** All IoT data flows through FastAPI, which fans out via authenticated WebSocket.

### Anti-Pattern 2: AI Model Directly Writing to Core Tables
**What:** Scikit-learn prediction directly inserts into `maintenance_records`.
**Why bad:** Breaks human-in-the-loop governance; untraceable; no audit link.
**Instead:** AI writes to `ai_recommendations`; human approval required to create maintenance ticket.

### Anti-Pattern 3: Storing All Raw Sensor Data Forever
**What:** Every 5-second reading kept indefinitely in PostgreSQL.
**Why bad:** Database bloat; query slowdown after weeks of simulation.
**Instead:** Keep last 30 days of raw readings; aggregate older data into hourly summaries. For university scope, simply document this retention policy even if not implemented.

### Anti-Pattern 4: Synchronous ML Inference Blocking Request Thread
**What:** `POST /ai/predict` loads model, runs inference synchronously in the request handler, takes 500ms+.
**Why bad:** Blocks FastAPI worker; degrades all concurrent requests.
**Instead:** Load model once at startup (`app.state.model = joblib.load(...)`); inference itself is fast (milliseconds) when model is pre-loaded. Only offload to background task if batch inference over many assets.

### Anti-Pattern 5: Using Redis Pub/Sub Before Needed
**What:** Adding Redis to Docker Compose "just in case" for WebSocket fan-out.
**Why bad:** Extra service, extra complexity, extra failure point for a single-server university project.
**Instead:** Start with in-process `asyncio.Queue` and `ConnectionManager` dict. Document the Redis upgrade path in the SDD as a future scalability concern.

---

## 10. Scalability Considerations (For SDD Documentation)

| Concern | University Scale (1 server) | Production Scale |
|---------|----------------------------|-----------------|
| MQTT message rate | 3–10 assets × 1 msg/5s = trivial | Use MQTT ACL + broker cluster |
| WebSocket connections | 10–20 concurrent users | Add Redis Pub/Sub for multi-instance |
| Sensor data storage | ~500 rows/hour, trivial | Add TimescaleDB hypertables + retention policy |
| ML inference | Pre-loaded model, < 10ms | Serve via dedicated ML microservice |
| Notification delivery | In-process queue, fine | Redis Streams or Celery for persistence |

---

## Sources

- Existing Phase 01 architecture: `.planning/milestones/v1.0-phases/01-architecture-foundation-module-contracts/`
- Existing Phase 04 AI governance: `.planning/milestones/v1.0-phases/04-ai-integration-flows-human-governed-decision-paths/`
- FastAPI WebSocket docs: https://fastapi.tiangolo.com/advanced/websockets/
- FastAPI SSE via StreamingResponse: standard FastAPI pattern
- aiomqtt (async MQTT): https://aiomqtt.bo-peng.de/
- Eclipse Mosquitto: https://mosquitto.org/
- Scikit-learn RandomForest: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- MQTT topic naming conventions: industry standard pattern `{domain}/{device-type}/{device-id}/{event}`
