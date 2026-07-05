# Requirements: AI-Powered Asset Management System — v2.1

**Defined:** 2026-07-05
**Milestone:** v2.1 IoT Pipeline & Real-Time Data
**Core Value:** Live IoT sensor telemetry flowing from physical devices through MQTT into PostgreSQL and streamed in real-time to the frontend dashboard, replacing all mock sensor data.

## v2.1 Requirements

### Data Foundation

- [ ] **IOT-DB-01**: `sensor_readings` table with columns: `id` (UUID PK), `device_id` (string), `asset_id` (nullable string, matches `asset.sensor_device_id`), `metric` (string: temperature/humidity/power/current/vibration/running_hours), `value` (float), `unit` (string), `recorded_at` (timestamp with timezone)
- [ ] **IOT-DB-02**: Alembic migration `0002_sensor_readings.py` creating `sensor_readings` with composite index on `(device_id, metric, recorded_at DESC)` for fast time-range queries
- [ ] **IOT-DB-03**: `sensor_readings` has no FK to `assets` table — `device_id` string-matches `asset.sensor_device_id` at query time to keep ingestion path write-optimized

### MQTT Broker

- [ ] **IOT-MQTT-01**: `mosquitto` Docker Compose service added using `eclipse-mosquitto:2.0.22` image with explicit `listener 1883` and `allow_anonymous true` in `config/mosquitto/mosquitto.conf`
- [ ] **IOT-MQTT-02**: `docker-compose.yml` updated: `mosquitto` service with volume mounts for config and data; `api` service gains `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT` env vars; `.env.example` updated accordingly
- [ ] **IOT-MQTT-03**: MQTT broker is confirmed healthy (reachable on port 1883) before MQTT consumer or simulator attempt connection

### MQTT Consumer

- [ ] **IOT-CONS-01**: `backend/app/mqtt/consumer.py` implements async MQTT consumer using `aiomqtt==2.5.1` subscribing to topic pattern `sensors/+/+` (wildcard: `sensors/{device_id}/{metric}`)
- [ ] **IOT-CONS-02**: Consumer parses incoming MQTT payload `{"value": float, "unit": string, "ts": int}`, persists `SensorReading` row using `asyncio.to_thread()` to avoid blocking the event loop (sync SQLAlchemy bridge pattern)
- [ ] **IOT-CONS-03**: Consumer broadcasts each reading to connected WebSocket clients via shared `ConnectionManager` instance after DB write
- [ ] **IOT-CONS-04**: MQTT consumer launched as `asyncio.create_task()` in FastAPI `lifespan` context manager (NOT as `BackgroundTask`) and cancelled cleanly on shutdown

### WebSocket & REST IoT API

- [ ] **IOT-WS-01**: `backend/app/services/websocket_manager.py` implements `ConnectionManager` using `set` of active connections + `asyncio.Lock` for thread-safe broadcast with per-send try/except to remove dead connections
- [ ] **IOT-WS-02**: WebSocket endpoint `GET /api/v1/iot/ws/{device_id}` — accepts client connections, registers with `ConnectionManager`, streams messages shaped as `{"ts": int, "value": float, "metric": string, "device_id": string}`
- [ ] **IOT-WS-03**: REST endpoint `GET /api/v1/iot/readings/{device_id}` returns last N readings (default 100) for cold-start backfill, queryable by `?metric=temperature&limit=200`
- [ ] **IOT-WS-04**: New router `backend/app/routers/iot.py` registered in `main.py` with prefix `/api/v1/iot`

### Sensor Simulator

- [ ] **IOT-SIM-01**: `scripts/sensor_simulator.py` publishes synthetic readings for all 6 metrics matching frontend `SENSOR_CONFIG` exactly: `temperature` (°C), `humidity` (%RH), `power` (W), `current` (A), `vibration` (mm/s), `running_hours` (h)
- [ ] **IOT-SIM-02**: Simulator targets seeded asset device IDs (read from environment or hardcoded to match `seed.py` values), publishes each metric every 5 seconds with realistic value ranges per metric type
- [ ] **IOT-SIM-03**: Simulator uses `aiomqtt` for async publishing; supports graceful shutdown on SIGINT

### Frontend Wiring

- [ ] **IOT-FE-01**: `frontend/app/dashboard/iot/page.tsx` replaces `generateReadings()` mock with `useIotWebSocket(deviceId)` hook connecting to `/api/v1/iot/ws/{device_id}` and appending incoming readings to chart state
- [ ] **IOT-FE-02**: `useIotWebSocket` hook includes `useEffect` cleanup (`ws.close()` on unmount) and auto-reconnect on close/error to survive `docker compose restart api`
- [ ] **IOT-FE-03**: IoT page fetches reading history on mount via `iotApi.getHistory(deviceId)` before WebSocket connects (prevents empty charts on page load)
- [ ] **IOT-FE-04**: `frontend/lib/api.ts` extended with `iotApi` namespace: `getHistory(deviceId, metric?, limit?)` and `getWsUrl(deviceId)` helper

## v2.2 Requirements (Deferred)

### AI Predictive Maintenance

- **AI-01**: Scikit-learn ML model (Random Forest) trained on `sensor_readings` to predict maintenance needs
- **AI-02**: `ai_recommendations` table: `id`, `asset_id`, `recommendation`, `confidence`, `created_at`, `approved_by`, `approved_at`
- **AI-03**: POST `/api/v1/ai/recommendations` — trigger inference for an asset
- **AI-04**: Manager approval gate: GET/POST `/api/v1/ai/recommendations/{id}/approve`
- **AI-05**: AI Predictive Maintenance page wired to real `ai_recommendations` API

### Notification Delivery

- **NOTIF-01**: Event trigger system — MQTT threshold breach, assignment created/returned, maintenance status change emit notification events
- **NOTIF-02**: SSE endpoint `GET /api/v1/notifications/stream` delivers real-time notification events per authenticated user
- **NOTIF-03**: Notifications page replaces mock data with real SSE stream
- **NOTIF-04**: Notification bell badge updates in real-time via SSE

## Out of Scope

| Feature | Reason |
|---------|--------|
| Threshold alert storage / `alerts` table | Deferred to v2.2 alongside notification pipeline |
| WebSocket authentication (`?token=` query param) | v2.1 leaves WS unauthenticated for dev simplicity; add in v2.2 |
| Sensor Simulator as Docker service | Run as local script in v2.1; containerize in v2.2 if needed |
| Time-series DB (InfluxDB, TimescaleDB) | Not needed — PostgreSQL handles ~5M rows/7 days at 5s interval × 8 devices × 6 metrics |
| Downsampling / rollup aggregations | Not needed at v2.1 data volumes |
| Production deployment / CI/CD | Deferred until all features implemented |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IOT-DB-01 | Phase 31 | Pending |
| IOT-DB-02 | Phase 31 | Pending |
| IOT-DB-03 | Phase 31 | Pending |
| IOT-MQTT-01 | Phase 32 | Pending |
| IOT-MQTT-02 | Phase 32 | Pending |
| IOT-MQTT-03 | Phase 32 | Pending |
| IOT-CONS-01 | Phase 33 | Pending |
| IOT-CONS-02 | Phase 33 | Pending |
| IOT-CONS-03 | Phase 33 | Pending |
| IOT-CONS-04 | Phase 33 | Pending |
| IOT-WS-01 | Phase 33 | Pending |
| IOT-WS-02 | Phase 33 | Pending |
| IOT-WS-03 | Phase 33 | Pending |
| IOT-WS-04 | Phase 33 | Pending |
| IOT-SIM-01 | Phase 34 | Pending |
| IOT-SIM-02 | Phase 34 | Pending |
| IOT-SIM-03 | Phase 34 | Pending |
| IOT-FE-01 | Phase 35 | Pending |
| IOT-FE-02 | Phase 35 | Pending |
| IOT-FE-03 | Phase 35 | Pending |
| IOT-FE-04 | Phase 35 | Pending |

**Coverage:**
- v2.1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-05*
*Last updated: 2026-07-05 after v2.1 milestone start*
