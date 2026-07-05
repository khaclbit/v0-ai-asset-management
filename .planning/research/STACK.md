# Technology Stack

**Project:** Smart AI-Powered Asset Management System (v1.2 IoT Design Milestone)
**Researched:** 2026-06-28
**Scope:** SDD-level design stack — IoT + AI + Web for university academic project
**Confidence:** HIGH (all versions verified from npm/PyPI registries, 2026-06-28)

---

## Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND                                                   │
│  React 19 + TypeScript 5 + Material UI v6 + Recharts 2     │
│  Vite 6 (build) · React Router 6 · Zustand · React Query   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST/HTTP (Axios)
┌────────────────────────▼────────────────────────────────────┐
│  BACKEND API                                                │
│  FastAPI 0.115+ · SQLAlchemy 2.0 · Alembic 1.18            │
│  PyJWT 2.13 · Passlib 1.7 · Uvicorn 0.34                   │
└──────────┬──────────────────────────┬───────────────────────┘
           │ psycopg2                  │ paho-mqtt subscribe
┌──────────▼──────────┐  ┌────────────▼──────────────────────┐
│  PostgreSQL 16      │  │  Mosquitto MQTT Broker 2.x        │
│  (pgAdmin optional) │  │  eclipse-mosquitto:2              │
└─────────────────────┘  └────────────┬──────────────────────┘
                                      │ paho-mqtt publish
┌─────────────────────────────────────▼──────────────────────┐
│  IOT SIMULATOR (Python)                                     │
│  paho-mqtt 2.1 · random / time · JSON payloads             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  AI/ML WORKER (Python)                                      │
│  scikit-learn 1.5 · XGBoost 2.1 · pandas 2.2 · joblib 1.4  │
│  Triggered by FastAPI background tasks                      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  DEPLOYMENT                                                 │
│  Docker Compose 3.9 · 5 services                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommended Stack

### Frontend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.x (19.2.7) | UI framework | Current stable; Concurrent Mode enabled; no breaking change from v18 SPA patterns |
| TypeScript | 5.x (5.7+) | Type safety | Avoid TS 6.x — too new, fewer tutorials, same SDD value with TS 5 |
| Material UI (`@mui/material`) | v6.x (6.5.0) | Component library | v6 is stable, MD3-aligned, Emotion-based (simpler than Pigment CSS in v7+). v5 is also acceptable — patterns are identical |
| `@emotion/react` + `@emotion/styled` | 11.14.x | MUI peer dep | Required by MUI v6; zero config with Vite |
| Recharts | 2.x (2.15.4) | Charting | v2 is the most documented, widest tutorial coverage. v3 exists but has fewer examples — avoid for a uni project |
| Vite | 6.x (6.4.3) | Build tool | Fast HMR, zero-config TypeScript, replaces CRA. v8 is latest but v6 is the stable "previous" with more ecosystem support |
| React Router DOM | 6.x (6.28+) | Client routing | v6 is the stable SPA standard; v7 is framework-mode (server-side) — avoid for plain SPA |
| Zustand | 5.x (5.0.14) | Client state | Minimal boilerplate, no Provider wrapping needed. Use for UI state only (auth token, filters, sidebar) |
| TanStack React Query | 5.x (5.101.x) | Server state | Handles loading/error/cache for API calls. Eliminates `useEffect`+`useState` fetch patterns |
| Axios | 1.x (1.18.1) | HTTP client | Interceptors for JWT attach/refresh; better than raw `fetch` for enterprise patterns |

**What NOT to use in frontend:**
- `Redux` / `Redux Toolkit` — overkill for this scope; Zustand + React Query covers all needs
- `Next.js` — SSR is not needed; SPA with Vite is simpler for a design-first academic project
- `MUI v5` Emotion vs `MUI v7+` Pigment CSS — stick with v6 Emotion; simpler mental model

---

### Backend API

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| FastAPI | 0.115.x (latest: 0.138.1) | Web framework | Async-native, auto-generates OpenAPI docs, Pydantic v2 built in. Fastest Python API framework for IoT ingestion patterns |
| Pydantic | v2 (ships with FastAPI) | Request/response validation | v2 is 5–50× faster than v1; model validation handles JSON sensor payloads cleanly |
| SQLAlchemy | 2.0.x (2.0.51) | ORM | 2.0 style (`select()` syntax) with type annotations. Use sync engine + `psycopg2` for simplicity in a uni project |
| Alembic | 1.18.x (1.18.5) | DB migrations | Official SQLAlchemy migration tool. Autogenerate migrations from model diffs |
| psycopg2-binary | 2.9.x (2.9.12) | PostgreSQL driver | Synchronous driver, zero-config with SQLAlchemy 2.0. Use `asyncpg` only if you need full async DB — complexity not warranted here |
| PyJWT | 2.x (2.13.0) | JWT generation/validation | Actively maintained; `python-jose` is stale (last updated 2022). Use PyJWT for access + refresh tokens |
| Passlib | 1.7.x (1.7.4) | Password hashing | `bcrypt` backend via Passlib. Industry-standard; no alternative needed |
| python-multipart | 0.0.32 | Form data / file upload | Required by FastAPI for file upload endpoints (OCR intake) |
| python-dotenv | 1.x (1.2.2) | Environment config | Loads `.env` files for Docker Compose secret injection |
| Uvicorn | 0.34.x (0.49.0 latest) | ASGI server | Production-grade ASGI server; use with `--workers 1` for uni docker setup |
| httpx | 0.28.x | Async HTTP client | Used in FastAPI background tasks to call AI worker endpoints if separated |

**ORM Pattern Decision: SQLAlchemy 2.0 sync over async**

> For a university project with a single worker, synchronous SQLAlchemy with psycopg2 is correct. The complexity cost of `async_session_maker` + `asyncpg` is not justified unless IoT ingestion rate exceeds ~500 messages/second. Design the schema as if async were planned (no blocking ORM calls in route bodies), but implement sync for the SDD.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16.x | Primary datastore | JSONB for sensor payloads (schema-flexible), TimescaleDB-compatible if telemetry grows, strong transactional guarantees |
| pgAdmin | 4.x (optional) | DB GUI | Docker Compose sidekick for development; helps students inspect tables without CLI |

**Schema design notes for IoT data:**
- Store normalized asset/user/maintenance records in relational tables.
- Store raw MQTT sensor payloads as `JSONB` in a `sensor_readings` table with a `device_id`, `timestamp`, and `payload` column.
- Add a `predictions` table (asset_id, predicted_failure_date, confidence_score, model_version, created_at).
- Alembic migrations are the only way schema changes are applied — no manual `ALTER TABLE` in SDD diagrams.

---

### IoT Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Eclipse Mosquitto | 2.x (Docker: `eclipse-mosquitto:2`) | MQTT broker | Lightweight, battle-tested, Docker-native, zero-config for local QoS 0/1 patterns |
| paho-mqtt (Python) | 2.x (2.1.0) | MQTT client (publisher + subscriber) | Official Eclipse Paho client. v2 API changed `on_connect` callback signatures from v1 — use v2 patterns exclusively |

**MQTT Integration Pattern:**

```
IoT Simulator (Python)
  └─ paho-mqtt Client (publisher)
       └─ Topic: assets/{device_id}/telemetry
            └─ Payload: {"device_id": "...", "temperature": 72.3,
                         "cpu_load": 0.45, "timestamp": "ISO-8601"}
            
Mosquitto Broker (port 1883)
  └─ Subscribers receive published messages
  
FastAPI Backend (MQTT Subscriber Worker)
  └─ paho-mqtt Client in background thread
       └─ on_message() → parse JSON → write to sensor_readings table
       └─ Trigger prediction check if reading exceeds threshold
```

**Topic naming convention:** `assets/{device_id}/telemetry` for sensor data, `assets/{device_id}/alerts` for backend-to-device commands (if needed).

**QoS Level:** Use QoS 1 (at-least-once) for sensor telemetry. QoS 0 drops messages under load; QoS 2 is heavyweight for a simulator. QoS 1 is the correct balance for academic demo.

**paho-mqtt v2 breaking change to document:**
```python
# v1 pattern (BROKEN in v2):
def on_connect(client, userdata, flags, rc): ...

# v2 pattern (CORRECT):
def on_connect(client, userdata, flags, reason_code, properties): ...
```

**What NOT to use:**
- MQTT over WebSockets for the IoT simulator-to-broker path — raw TCP (port 1883) is simpler
- AMQP/RabbitMQ — heavyweight for a 3-device simulator
- Kafka — enterprise-scale, not appropriate for a university IoT demo

---

### AI / ML Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| scikit-learn | 1.5.x (1.9.0 latest) | ML pipeline | RandomForest, preprocessing pipelines, cross-validation — all in one package. Use 1.5.x for tutorial compatibility |
| XGBoost | 2.x (2.1.x; 3.3.0 latest) | Gradient boosting | Better than RandomForest on tabular IoT data (temperature, CPU, uptime). Use 2.x not 3.x — fewer breaking changes in examples |
| pandas | 2.x (2.2.x) | Feature engineering | DataFrame operations for sensor data aggregation, rolling window features |
| numpy | 1.x or 2.x | Numerical ops | pandas 2.x works with both; pick numpy 1.26.x for widest compatibility |
| joblib | 1.4.x (1.5.3 latest) | Model persistence | Ships with scikit-learn; `joblib.dump(model, 'model.pkl')` is the standard persistence pattern |

**Model Persistence Pattern:**

```python
# Training (one-time or scheduled)
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import joblib

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', RandomForestClassifier(n_estimators=100, random_state=42))
])
pipeline.fit(X_train, y_train)
joblib.dump(pipeline, 'models/predictive_maintenance_v1.pkl')

# Serving (in FastAPI endpoint)
pipeline = joblib.load('models/predictive_maintenance_v1.pkl')
prediction = pipeline.predict(feature_vector)
```

**Model Serving Pattern for FastAPI:**
- Load model at application startup (not per request): use FastAPI `lifespan` context manager.
- Expose a `/predict` endpoint that accepts a JSON feature vector and returns `{ "risk_score": 0.73, "recommendation": "Schedule maintenance" }`.
- Store prediction results in `predictions` table for audit trail.

**Feature Engineering for Predictive Maintenance:**
- Rolling window features: `mean`, `std`, `max` over last 24h of temperature/CPU/voltage.
- Days since last maintenance (from asset records in PostgreSQL).
- Asset age in days.
- Binary label: `will_fail_in_30_days` (for supervised training with synthetic data).

**What NOT to use:**
- TensorFlow / PyTorch — overkill for tabular IoT data; RandomForest/XGBoost achieves better results with less complexity
- MLflow / MLOps platforms — deferred; not needed for design-only milestone
- Online learning (incremental `partial_fit`) — adds complexity; batch retraining is sufficient for academic scope
- Separate AI microservice — integrate as a FastAPI background task or same-process module for university simplicity

---

### Authentication & Authorization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PyJWT | 2.13.0 | JWT creation + validation | Access token (15min) + refresh token (7d) pattern |
| Passlib + bcrypt | 1.7.4 | Password hashing | `bcrypt` rounds=12 is the standard; Passlib wraps bcrypt cleanly |
| FastAPI `Depends` | (built-in) | RBAC enforcement | `get_current_user` dependency injected per-route; role checked against `UserRole` enum |

**RBAC Roles:** `ADMIN`, `MANAGER`, `STAFF`

**JWT Flow:**
```
POST /auth/login → validate password → return { access_token, refresh_token }
Authorization: Bearer <access_token>  (on every protected request)
POST /auth/refresh → validate refresh_token → return new access_token
```

**What NOT to use:**
- OAuth2 / OIDC external providers — over-complex for a university single-tenant system
- Session cookies — JWT is simpler for a React SPA + REST API pattern
- `python-jose` — maintenance stalled in 2022; replaced by PyJWT

---

### Deployment (Docker Compose)

**Service topology — 5 containers:**

```yaml
# docker-compose.yml topology (conceptual)
services:
  postgres:
    image: postgres:16-alpine
    environment: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
    volumes: postgres_data:/var/lib/postgresql/data
    healthcheck: pg_isready

  mosquitto:
    image: eclipse-mosquitto:2
    ports: 1883:1883
    volumes: mosquitto.conf, data, log

  backend:
    build: ./backend
    depends_on: [postgres, mosquitto]
    environment: DATABASE_URL, MQTT_BROKER_HOST, JWT_SECRET
    ports: 8000:8000

  iot-simulator:
    build: ./iot_simulator
    depends_on: [mosquitto]
    environment: MQTT_BROKER_HOST, DEVICE_COUNT, PUBLISH_INTERVAL_SEC

  frontend:
    build: ./frontend
    depends_on: [backend]
    ports: 3000:80
    # Nginx serves Vite build artifact
```

**Why this topology:**
- `postgres` starts first (healthcheck gate); `backend` waits for DB readiness.
- `mosquitto` starts independently; both `backend` (subscriber) and `iot-simulator` (publisher) connect to it.
- `frontend` is a Nginx-served static build — NOT `npm run dev` in production.
- `iot-simulator` is a standalone Python process that publishes every N seconds.
- No Redis needed for a university-scale demo (rate limiting, caching deferred).

**Mosquitto config (`mosquitto.conf`):**
```
listener 1883
allow_anonymous true   # acceptable for local academic demo; document as non-prod
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
```

**What NOT to include:**
- Kubernetes / Helm — not appropriate for a 5-service academic demo
- Traefik / Nginx reverse proxy for multi-domain — single-machine docker-compose is sufficient
- Redis — add only if caching becomes a demonstrable requirement
- Separate AI worker container — integrate AI as a FastAPI module for simplicity

---

## Alternatives Considered

| Category | Recommended | Alternative Considered | Why Not Recommended |
|----------|-------------|----------------------|---------------------|
| Frontend framework | React 19 + Vite | Next.js 15 | SSR overhead not needed; SPA is simpler design for IoT dashboard |
| UI component library | MUI v6 | Ant Design, Chakra UI | MUI has the widest Material Design 3 alignment and academic tutorial coverage |
| Chart library | Recharts 2.x | Chart.js, Nivo, Tremor | Recharts is React-native, component-based, no canvas abstraction needed |
| Backend framework | FastAPI | Django REST, Flask | FastAPI is async-native, auto-docs, and Pydantic v2 validation is the modern Python API standard |
| ORM | SQLAlchemy 2.0 | Django ORM, Tortoise ORM | SQLAlchemy 2.0 is framework-agnostic and the industry standard; Django ORM ties you to Django |
| DB driver | psycopg2-binary | asyncpg | psycopg2 is sync but simpler; asyncpg worth it only if full async stack is needed |
| MQTT broker | Mosquitto | HiveMQ, EMQX | Mosquitto is the lightest-weight, Docker-smallest, and most-documented for local dev |
| ML framework | scikit-learn + XGBoost | PyTorch, TensorFlow | Tabular IoT data is dominated by tree-based models; neural nets add training complexity for no accuracy gain here |
| State management | Zustand | Redux, Context API | Zustand has minimal boilerplate; Redux is enterprise-scale overkill; raw Context causes unnecessary re-renders |
| Auth token | JWT (PyJWT) | Sessions, python-jose | JWT is stateless and SPA-friendly; python-jose is unmaintained |
| Client routing | React Router v6 | TanStack Router | RRv6 is the dominant documented standard; TanStack Router is more powerful but has steeper learning curve |

---

## Version Pinning Summary

```
# requirements.txt (backend)
fastapi==0.115.12
pydantic==2.11.7        # ships with FastAPI
uvicorn==0.34.0
sqlalchemy==2.0.51
alembic==1.18.5
psycopg2-binary==2.9.12
pyjwt==2.13.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.32
python-dotenv==1.2.2
paho-mqtt==2.1.0
scikit-learn==1.5.2     # use 1.5.x not 1.9.x for tutorial stability
xgboost==2.1.4          # use 2.x not 3.x for tutorial stability
pandas==2.2.3
numpy==1.26.4           # 1.26 for widest scikit/XGBoost compatibility
joblib==1.4.2
httpx==0.28.1

# package.json (frontend)
react: ^18.3.1           # or ^19.2.7; both acceptable
react-dom: ^18.3.1
typescript: ^5.7.3
vite: ^6.4.3
@mui/material: ^6.5.0
@mui/icons-material: ^6.5.0
@emotion/react: ^11.14.0
@emotion/styled: ^11.14.1
recharts: ^2.15.4
react-router-dom: ^6.28.1
zustand: ^5.0.14
@tanstack/react-query: ^5.101.1
axios: ^1.18.1
```

> **Version stability rationale:** Where the "latest" version shows a major jump (scikit-learn 1.9, XGBoost 3.3), the pinned version is the most recent that has broad tutorial coverage. An SDD targeting a university implementation should choose the version with the most worked examples, not the most recent patch.

---

## Integration Points Between Services

| From | To | Protocol | Data | Notes |
|------|----|----------|------|-------|
| IoT Simulator | Mosquitto | MQTT TCP 1883 | JSON sensor payload | QoS 1, topic `assets/{id}/telemetry` |
| FastAPI Backend | Mosquitto | MQTT TCP 1883 | Subscribe to sensor topics | Background thread subscriber |
| FastAPI Backend | PostgreSQL | TCP 5432 (psycopg2) | SQL queries | SQLAlchemy session per request |
| Frontend | FastAPI Backend | HTTP/REST 8000 | JSON (Pydantic-validated) | JWT Bearer token on all protected routes |
| FastAPI (AI module) | PostgreSQL | TCP 5432 | Read sensor_readings, write predictions | Triggered post-ingestion |
| Docker Compose | All services | Bridge network | DNS by service name | `mosquitto`, `postgres`, `backend` as hostnames |

---

## Security Considerations for IoT + AI Data Flows

### IoT Layer
1. **MQTT anonymous allowed in dev** — document in SDD as "non-production only." Production would require TLS + username/password auth on Mosquitto.
2. **Validate sensor payload schema** in FastAPI `on_message` handler before writing to DB — reject malformed JSON, clamp out-of-range values.
3. **Device ID whitelist** — only accept messages from known `device_id` values to prevent spoofed sensor injection.

### API Layer
4. **JWT secret rotation** — inject via Docker Compose environment variable, never hardcoded.
5. **RBAC on AI endpoints** — only `ADMIN` and `MANAGER` can view prediction results; `STAFF` sees only assigned asset status.
6. **Input validation** — Pydantic v2 models reject unexpected fields by default (`model_config = ConfigDict(extra='forbid')`).

### AI Layer
7. **AI output is advisory only** — predictions write to a `predictions` table; no automated maintenance order is created without `MANAGER` approval in the workflow.
8. **Model version tracking** — store `model_version` string in the `predictions` table to trace which model produced each result.
9. **No PII in feature vectors** — feature engineering uses device metrics only, not user identifiers.

---

## Sources

- npm registry: https://registry.npmjs.org (verified 2026-06-28)
- PyPI JSON API: https://pypi.org/pypi/{package}/json (verified 2026-06-28)
- FastAPI docs: https://fastapi.tiangolo.com
- MUI v6 docs: https://mui.com/material-ui/getting-started/
- paho-mqtt v2 migration: https://eclipse.dev/paho/files/paho.mqtt.python/html/migrations.html
- Mosquitto Docker: https://hub.docker.com/_/eclipse-mosquitto
- scikit-learn model persistence: https://scikit-learn.org/stable/model_persistence.html
- Confidence: HIGH (registry-verified versions, well-established integration patterns)
