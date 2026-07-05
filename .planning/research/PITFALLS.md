# Domain Pitfalls

**Domain:** Smart AI-Powered Asset Management System — IoT + AI + Real-time UI  
**Milestone:** v1.2 IoT System Design (SDD)  
**Researched:** 2026-06-28  
**Confidence:** HIGH — grounded in IoT/ML/WebSocket production patterns and academic project constraints

---

## Overview

This document catalogs pitfalls specific to designing and building an IoT + AI Asset Management System with:
- IoT Sensor Simulator → MQTT Broker → FastAPI Backend
- AI Predictive Maintenance with Manager approval gate
- Real-time sensor dashboards over WebSocket
- Audit Log, Notifications, RBAC

Pitfalls are organized by category, ordered by severity. Each includes: **what goes wrong**, **warning sign**, and **prevention strategy** as a design decision.

---

## 1. IoT Integration Pitfalls (MQTT + Sensor Simulator + Data Ingestion)

### 🔴 CRITICAL — IoT-1: MQTT QoS 0 Message Loss Treated as Reliable Delivery

**What goes wrong:** The default MQTT QoS level (0, "fire-and-forget") drops messages when the broker restarts, the subscriber is offline, or the network has packet loss. Teams design dashboards and AI pipelines assuming every published message is received — gaps in telemetry are silently missed, health scores are computed on incomplete time windows, and dashboards show stale data with no indication.

**Warning sign:** Simulator publishes N messages but backend ingests fewer than N. Gap is only discovered during testing when someone manually counts.

**Prevention (design decision):** Specify QoS 1 (at-least-once) for all telemetry topics in the MQTT broker configuration section of the SDD. Document the consequence: duplicate detection is required in the ingestion handler. Define a `message_id` field in the MQTT payload schema and make the ingestion endpoint idempotent on it. Note this in the IoT Architecture diagram as "dedup layer."

---

### 🔴 CRITICAL — IoT-2: No Topic Naming Convention → Unfiltered Wildcard Subscriptions

**What goes wrong:** Simulator publishes to ad-hoc topics (`sensor/data`, `asset/temp`, `iot/readings`) and the backend subscribes with `#` (all topics). As new sensor types are added, the wildcard subscription delivers unrelated messages to all handlers. Schema changes in one sensor type break other sensor processors.

**Warning sign:** Backend has a single `on_message` handler with a long `if/elif` chain that checks topic strings.

**Prevention (design decision):** Define a topic hierarchy in the SDD before any simulator or backend code is written:
```
assets/{asset_id}/sensors/{sensor_type}
# Example:
assets/ASSET-001/sensors/temperature
assets/ASSET-001/sensors/vibration
assets/ASSET-001/sensors/power
```
Specify that backend subscribes to `assets/+/sensors/+` (single-level wildcards, not `#`). Document the topic schema as a formal contract table in the IoT Architecture section.

---

### 🔴 CRITICAL — IoT-3: Simulator Publishes at Backend Ingest Rate, Not Sensor Rate

**What goes wrong:** The simulator is written to publish as fast as Python can loop — sometimes 1000 messages/second. The FastAPI endpoint, PostgreSQL write, and WebSocket broadcast all happen synchronously per message. The database becomes the bottleneck; MQTT broker buffers overflow; the entire system deadlocks under simulated load. This only surfaces during integration testing, which is too late in a design milestone.

**Warning sign:** Simulator code uses `while True: publish(...)` with no sleep interval. Ingest endpoint is synchronous (`def` not `async def`).

**Prevention (design decision):** Specify in the SDD:
1. Simulator publish interval: 5–30 seconds per sensor per asset (configurable via `PUBLISH_INTERVAL_SEC` env var, default 10s).
2. Ingestion handler is async. It writes to a background task queue (Celery task or FastAPI `BackgroundTasks`) and returns HTTP 202 immediately.
3. The SDD IoT Architecture diagram must show the async boundary explicitly: MQTT → Ingest API → Background Worker → PostgreSQL/TimescaleDB → WebSocket Publisher.

---

### 🟡 MODERATE — IoT-4: Simulator Clock Drift vs. Server Timestamp

**What goes wrong:** The simulator embeds its own `timestamp` in the MQTT payload using `datetime.now()`. When the simulator runs on a different machine or in a Docker container with clock skew, timestamps are out of order or in the future. AI feature engineering (rolling windows, time-since-last-reading) produces nonsense values. Dashboards show negative durations or future readings.

**Warning sign:** Payload schema defines `timestamp` as a field that the simulator populates. Backend stores it verbatim.

**Prevention (design decision):** Define two timestamps in the payload schema: `simulator_ts` (simulator-generated, stored for traceability) and `ingested_at` (server-assigned on receipt, used for all business logic and queries). Specify in the SDD data model that `ingested_at` is the authoritative time column. Mark `simulator_ts` as informational only.

---

### 🟡 MODERATE — IoT-5: No Reconnect / Backoff Strategy → Thundering Herd on Broker Restart

**What goes wrong:** The simulator and backend MQTT client both reconnect immediately on disconnect. After a broker restart, hundreds of clients simultaneously reconnect and re-subscribe, overloading the broker at startup. In a simulated classroom environment (multiple students running brokers), this causes cascading failures.

**Warning sign:** Reconnect logic in simulator is `client.reconnect()` with no delay.

**Prevention (design decision):** Specify in the SDD that both the simulator and the backend MQTT client must implement exponential backoff with jitter on reconnect: `delay = min(2^attempt * base_ms + random_jitter_ms, max_delay_ms)`. Include a configuration table with `MQTT_RECONNECT_BASE_MS=500`, `MQTT_RECONNECT_MAX_MS=30000`. This is a design contract, not implementation — the SDD should include it in the IoT component spec.

---

### 🟡 MODERATE — IoT-6: No Payload Schema Validation → Malformed Data Silently Stored

**What goes wrong:** Simulator publishes JSON with missing fields, wrong types, or extra keys. Backend stores raw values without validation. AI feature engineering then receives `null` or unexpected string values, produces `NaN` health scores, and the system either crashes or silently shows incorrect predictions.

**Warning sign:** Ingestion handler calls `json.loads(payload)` and accesses keys directly without validation.

**Prevention (design decision):** Define a formal MQTT payload schema in the SDD (use a table or JSON Schema block, not prose). Example:
```json
{
  "asset_id": "string (UUID)",
  "sensor_type": "temperature | humidity | power | vibration | running_hours",
  "value": "number",
  "unit": "string",
  "simulator_ts": "ISO 8601 string"
}
```
Specify that the backend validates against this schema on ingest and rejects (logs + discards) invalid payloads. Valid/invalid counts are exposed as metrics.

---

## 2. AI / ML Pitfalls (Predictive Maintenance, Synthetic Data, Approval Workflow)

### 🔴 CRITICAL — AI-1: Model Trained on Perfectly Regular Synthetic Data → Zero Generalization

**What goes wrong:** The simulator generates sensor values with smooth sinusoidal patterns or linear degradation curves. The AI model trains on this data, achieves 99% accuracy, and appears to work in demo. When real sensor data is used (or when the simulator is run with different random seeds), the model fails completely. For an academic project, the grader may alter simulator parameters to test the system — the model breaks.

**Warning sign:** Simulator always generates the same failure pattern (e.g., "temperature rises 0.5°C per hour until failure at 85°C"). Training data has no noise, no anomalous but non-failure readings, no gradual drift.

**Prevention (design decision):** The SDD must specify the simulator's noise model alongside its publish schema:
- Add a `noise_std_dev` parameter per sensor type
- Add a `random_failure_injection` flag that randomly inserts out-of-distribution readings unrelated to failure
- Specify that the AI training section uses data from at least 3 simulator runs with different seeds

Include a note in the AI Architecture section: "Model must generalize to unseen simulator seeds. A temporal train/test split (train on months 1-3, test on month 4) is required. Random splits are prohibited due to temporal autocorrelation."

---

### 🔴 CRITICAL — AI-2: No Temporal Train/Test Split → Data Leakage Inflates Metrics

**What goes wrong:** The team uses `train_test_split(shuffle=True)` from scikit-learn. Because sensor readings are time-correlated (reading at T+1 depends on reading at T), shuffled splits allow future readings to appear in the training set. The model implicitly learns future states and reports artificially high accuracy. The system looks production-ready in the SDD review but fails in demo when real-time data flows.

**Warning sign:** AI Architecture section says "80/20 random split." No mention of temporal ordering.

**Prevention (design decision):** Specify in the AI Architecture section: "Training/validation split is strictly temporal: the first 70% of chronological readings form the training set, the next 15% form validation, the final 15% form the test set. No shuffling. This is a hard constraint on the ML pipeline contract."

---

### 🔴 CRITICAL — AI-3: Manager Approval Gate Is Decoration, Not a State Machine Gate

**What goes wrong:** The approval workflow is described in the SDD as "Manager sees recommendation and clicks Approve or Defer." But no state machine is defined. The backend has no enforcement: a Staff member can call the approve endpoint directly, or the maintenance record is created before Manager approval, or approval creates a duplicate maintenance record. The gate exists in the UI only.

**Warning sign:** SDD approval workflow section says "Manager can approve" but has no state transition table. No mention of who can call the approval API, what the pre-condition states are, or what happens if approval is rejected.

**Prevention (design decision):** Define the predictive maintenance recommendation state machine explicitly in the SDD:
```
PENDING_REVIEW → APPROVED (by Manager/Admin) → MAINTENANCE_CREATED
PENDING_REVIEW → DEFERRED (by Manager/Admin) → [re-evaluated at next AI run]
PENDING_REVIEW → EXPIRED (if SLA countdown elapses without action) → escalation notification
```
Specify: only roles `Manager` and `Admin` may transition `PENDING_REVIEW → APPROVED`. The backend enforces this with RBAC middleware — not just UI hiding.

---

### 🟡 MODERATE — AI-4: Health Score Opaque → Manager Approval Is Theater

**What goes wrong:** The AI outputs a health score (e.g., 0.72) and a failure risk band (High/Medium/Low). The Manager sees the number but has no context: What does 0.72 mean? What pushed it to "High"? Without explainability, Managers either rubber-stamp every recommendation (defeating the gate's purpose) or reject all of them (AI provides no value).

**Warning sign:** AI Architecture section describes outputs as `{ health_score: float, risk_band: string }` with no contributing factors or feature importance breakdown.

**Prevention (design decision):** Specify in the AI output contract that every recommendation includes:
```json
{
  "health_score": 0.72,
  "risk_band": "High",
  "top_factors": [
    { "feature": "avg_vibration_7d", "contribution": 0.45, "direction": "above_threshold" },
    { "feature": "running_hours", "contribution": 0.31, "direction": "exceeds_recommended" }
  ],
  "confidence": 0.84,
  "model_version": "v1.2.0"
}
```
The SDD's AI output schema section must define `top_factors` as a required field, not optional. The Manager approval screen wireframe must show these factors.

---

### 🟡 MODERATE — AI-5: No Model Versioning → Silent Prediction Changes

**What goes wrong:** The model is retrained with new data during the project. Old recommendations were made by model v1, new ones by model v2. When a Manager reviews a recommendation generated 3 days ago, the explanation shown is from the current model — not the model that generated it. The audit trail cannot reproduce why a recommendation was made. In academic evaluation, this makes it impossible to explain the system's decisions.

**Warning sign:** Recommendation records store `asset_id` and `risk_score` but not `model_version`. No model artifact versioning in the design.

**Prevention (design decision):** Specify in the ER diagram that the `ai_recommendations` table includes a `model_version` column (string). Define in the AI Architecture section that model artifacts are versioned (e.g., `models/predictive_maintenance_v1.pkl`) and the version string stored with every prediction. This enables reproducibility for audit review.

---

### 🟡 MODERATE — AI-6: Class Imbalance Ignored → Model Always Predicts "Healthy"

**What goes wrong:** In a simulated environment, most sensor readings indicate normal operation. If the simulator runs 1000 hours and injects 10 failure events, the training data is 99% "healthy" and 1% "at-risk." A naive classifier achieves 99% accuracy by always predicting "healthy." Health scores never reach "High" risk. Predictive maintenance module appears broken in demo.

**Warning sign:** AI Architecture section has no mention of class balancing strategy. Training metrics show only accuracy, not precision/recall/F1 per class.

**Prevention (design decision):** Specify in the AI Architecture section:
1. Simulator must be configured to generate failure events at a minimum 15% rate during training data collection runs (controlled by `failure_rate` parameter).
2. Training pipeline uses SMOTE oversampling or class-weight adjustment (`class_weight='balanced'`).
3. Evaluation metrics reported in the SDD are F1-score and recall for the "at-risk" class — not overall accuracy.

---

## 3. Real-time UI Pitfalls (WebSocket, Dashboard, Charts)

### 🔴 CRITICAL — UI-1: WebSocket Fan-Out Every MQTT Message → Browser Firehose

**What goes wrong:** The backend receives MQTT messages (10 sensors × N assets × 1 message/10 sec = manageable) and immediately broadcasts each to all connected WebSocket clients. As assets scale from 5 to 50, the dashboard receives 500+ messages/minute. React re-renders on every message. CPU usage spikes to 100% on the client. Browser tab crashes or becomes unresponsive. This is the single most common IoT dashboard performance failure.

**Warning sign:** WebSocket handler calls `websocket.send(message)` directly in the MQTT `on_message` callback, with no throttling or aggregation layer.

**Prevention (design decision):** Define in the Architecture section a "dashboard aggregation layer" between MQTT ingestion and WebSocket broadcast:
- Backend aggregates sensor readings into per-asset snapshots every N seconds (configurable, default 5s)
- WebSocket sends one aggregated message per asset per interval, not one message per sensor reading
- Specify the WebSocket message schema: `{ asset_id, timestamp, sensors: { temperature: {...}, vibration: {...} } }` — all sensors in one message per asset, not separate messages per sensor

---

### 🟡 MODERATE — UI-2: Chart Re-Renders on Every Data Point → UI Jank

**What goes wrong:** A time-series chart (e.g., Recharts `<LineChart>`) is placed in a React component that receives the full dataset as a prop. Every new sensor reading appends to the dataset array and triggers a full chart re-render. For a 24-hour history with 6 readings/minute, that's 8640 points. The chart recalculates all 8640 points on every new reading. Frame rates drop below 15fps. The dashboard looks broken.

**Warning sign:** Chart component receives a growing array from state. No `useMemo`, no windowing, no max-points cap.

**Prevention (design decision):** Specify in the UI Architecture section:
1. Time-series charts display a **rolling window** only: last 60 readings (configurable `CHART_WINDOW_SIZE`).
2. Chart dataset is capped at `CHART_WINDOW_SIZE` in the state update function — older points are discarded.
3. Specify `React.memo` on chart components to prevent re-renders unrelated to the sensor's own data stream.
This should appear in the Frontend Architecture constraints section of the SDD.

---

### 🟡 MODERATE — UI-3: No Stale Data Indicator → Silent Staleness After Disconnection

**What goes wrong:** The WebSocket disconnects (broker restart, network blip). The frontend displays the last received sensor values indefinitely. Users see temperature "72°C" with no indication it was received 10 minutes ago. Operators make decisions based on stale readings. In a demo, the presenter doesn't notice the dashboard froze.

**Warning sign:** Dashboard UI design shows only the current sensor value. No "last updated" timestamp or connection status indicator in the wireframes.

**Prevention (design decision):** Specify in every sensor dashboard wireframe:
1. A `"Last updated: Xs ago"` label next to each sensor value
2. Sensor value card turns amber after 30s without update, red after 60s
3. A WebSocket connection status badge (green/amber/red) in the dashboard header
Define these as a UI design rule in the Design System section: "Stale data must always be visually indicated. Never display sensor data without a timestamp."

---

### 🟡 MODERATE — UI-4: Browser Memory Leak from Unbounded Time-Series State

**What goes wrong:** The frontend stores all sensor readings received since the session started. After 2 hours of use (common during a demo or grading session), the in-memory store holds 72,000+ readings. React state updates slow down. The browser tab eventually crashes (OOM). This is invisible in 5-minute dev tests.

**Warning sign:** Frontend state for sensor history is an array that only grows — no eviction or windowing.

**Prevention (design decision):** Specify in the Frontend Architecture section: "Sensor history in browser state is bounded to `CHART_WINDOW_SIZE` entries per sensor per asset. New readings replace old readings using a ring buffer pattern. The backend is the source of truth for historical data; the frontend holds only the display window."

---

### 🟢 MINOR — UI-5: WebSocket Reconnection Not Handled

**What goes wrong:** The browser's native WebSocket does not automatically reconnect after disconnection. When the broker restarts or the server redeploys, the dashboard shows stale data silently (see UI-3). No error is shown to the user.

**Warning sign:** WebSocket initialization in the component is `new WebSocket(url)` with no reconnection logic.

**Prevention (design decision):** Specify in the SDD Frontend section that the WebSocket client library implements reconnect with exponential backoff. Recommend `reconnecting-websocket` or an equivalent pattern. Define the reconnect behavior in the component contract: "Attempts reconnect up to 10 times with base 1s, max 30s backoff. Displays 'Reconnecting...' status during attempts."

---

## 4. Design-Phase Pitfalls (SDD Production)

### 🔴 CRITICAL — DESIGN-1: SDD Describes Implementation Instead of Contracts

**What goes wrong:** The SDD author writes SQL DDL statements, Python function signatures, and React component props directly in the document. The document becomes 150+ pages. Readers skip sections. The implementation diverges from the document because implementation details are wrong (guessed) or become outdated. The SDD's value — communicating design intent — is destroyed.

**Warning sign:** The SDD has sections titled "Implementation Details" or includes code blocks with type annotations, variable names, or database migrations.

**Prevention (design decision):** Enforce a document scope rule at the start of the SDD authoring process: "This document defines contracts and constraints, not implementations. Permitted content: interface tables, state machines, data flow diagrams, conceptual ER diagrams, component responsibility descriptions. Prohibited: code blocks, SQL DDL, function signatures, file paths with line numbers."

---

### 🔴 CRITICAL — DESIGN-2: RBAC Defined Vaguely → Implementation Diverges

**What goes wrong:** The SDD says "Manager can approve maintenance recommendations" and "Staff cannot access Admin functions." Without an explicit permission matrix, each developer interprets "Admin functions" differently. The backend enforces one set of rules, the frontend hides a different set, and the API layer enforces yet another set. During integration, inconsistencies cause either over-permission (security risk) or under-permission (feature broken).

**Warning sign:** The SDD User Roles section lists role descriptions in prose paragraphs with no table mapping roles to specific actions.

**Prevention (design decision):** Include a mandatory permission matrix table in the SDD with every module as a column and every role as a row. Use symbols: ✓ (full access), 👁 (read-only), ✗ (no access), 🔒 (approval required). Example partial:

| Action | Admin | Manager | Staff |
|---|---|---|---|
| View asset list | ✓ | ✓ | ✓ |
| Create/edit asset | ✓ | ✓ | ✗ |
| Approve AI recommendation | ✓ | ✓ | ✗ |
| View audit log | ✓ | 👁 | ✗ |
| Manage users | ✓ | ✗ | ✗ |

This table is the authoritative contract. Backend and frontend are both bound to it.

---

### 🔴 CRITICAL — DESIGN-3: IoT Pipeline Described in Prose, Not Data Flow Diagram

**What goes wrong:** The SDD IoT Architecture section says "The simulator publishes data to the MQTT broker, which the backend subscribes to, processes the data, and updates the dashboard." This sentence hides 5 critical design decisions: async vs sync processing, message buffering, WebSocket aggregation, error handling path, and persistence order. Two developers reading the same prose will build different systems.

**Warning sign:** IoT architecture section has no diagram. All pipeline steps are in a numbered list.

**Prevention (design decision):** Require a formal data flow diagram (DFD or sequence diagram) in the IoT Architecture section. The diagram must show:
1. Simulator → MQTT Broker (with topic name)
2. MQTT Broker → Backend Subscriber (with QoS level)
3. Backend → Validation → Async Queue
4. Async Worker → PostgreSQL (persistence)
5. Async Worker → WebSocket Hub → Frontend
6. Error path: invalid payload → Dead Letter Log

No prose description is acceptable as a substitute for this diagram.

---

### 🟡 MODERATE — DESIGN-4: Conceptual ER Diagram Includes SQL Implementation Details

**What goes wrong:** The SDD ER diagram includes column types (`VARCHAR(255)`, `TIMESTAMP WITH TIME ZONE`), foreign key constraint syntax (`REFERENCES assets(id) ON DELETE CASCADE`), and index definitions. When the implementation team uses a different ORM or database dialect, they change these details and the SDD is immediately stale. The document becomes a maintenance liability.

**Warning sign:** ER diagram section is titled "Database Schema" and includes SQL CREATE TABLE statements.

**Prevention (design decision):** Label the section "Conceptual Entity Model" and restrict content to: entity names, attribute names and semantic types (`id: UUID`, `created_at: datetime`, `status: enum`), and relationship cardinalities. No SQL syntax. No constraint definitions. No index design.

---

### 🟡 MODERATE — DESIGN-5: Business Rules for Edge Cases Left Implicit

**What goes wrong:** The SDD defines the happy path for the AI approval workflow but omits edge cases: What happens to a `PENDING_REVIEW` recommendation when the asset is retired? What if the same asset has two concurrent `PENDING_REVIEW` recommendations? What if the Manager defers indefinitely and the SLA countdown never expires? These gaps are discovered during implementation and resolved inconsistently by different developers.

**Warning sign:** Business Workflow section has only happy-path BPMN flows. No "error flows" or "exception handling" branches.

**Prevention (design decision):** For every state machine in the SDD, include an edge case table:

| Scenario | Current State | Trigger | Result |
|---|---|---|---|
| Asset retired | PENDING_REVIEW | Asset status → retired | Recommendation auto-cancelled, notification sent |
| Duplicate recommendation | — | AI generates new recommendation | Previous PENDING_REVIEW auto-superseded |
| SLA elapsed | PENDING_REVIEW | Timer fires | Status → EXPIRED, escalation notification |

This table is compact and high-value. Require it for every workflow with a state machine.

---

### 🟢 MINOR — DESIGN-6: Notification Center "Types" Undefined → Frontend Guesses Layout

**What goes wrong:** The SDD says "Notification Center shows alerts for high failure risk, warranty expiry, and overdue returns." The frontend designer creates three different notification card layouts (one per type). The backend generates notifications with slightly different structures per type. Integration requires rework.

**Warning sign:** Notification section lists notification types by name but has no shared schema or severity model.

**Prevention (design decision):** Define a unified notification schema in the SDD:
```
{
  "id": UUID,
  "type": "HIGH_FAILURE_RISK | WARRANTY_EXPIRY | OVERDUE_RETURN | ...",
  "severity": "CRITICAL | WARNING | INFO",
  "entity_type": "asset | assignment | ...",
  "entity_id": UUID,
  "message": string,
  "created_at": datetime,
  "read_at": datetime | null
}
```
All notification types share this schema. The `type` field drives frontend icon/color treatment; the `severity` field drives sort order. One card component handles all types.

---

## 5. Academic Project-Specific Pitfalls

### 🔴 CRITICAL — ACAD-1: Scope Creep from Integration-Level AI to Full MLOps Pipeline

**What goes wrong:** The team starts designing the AI architecture and gets drawn into model training infrastructure: MLflow experiment tracking, feature stores, hyperparameter optimization, model serving with versioned endpoints, A/B testing. This is fascinating engineering but consumes the entire time budget. The SDD is 60% AI pipeline design and 40% everything else. Core features (Audit Log, User Management, RBAC) get one-page descriptions. The grader scores the system as incomplete.

**Warning sign:** AI Architecture section is longer than all other sections combined. SDD review meeting spends 45 minutes on model training and 5 minutes on IoT pipeline.

**Prevention (design decision):** Set a hard scope boundary in the SDD preface: "AI integration scope is inference-only. The system calls a pre-trained model artifact (`.pkl` or ONNX file). Model training, experiment tracking, and MLOps infrastructure are out of scope for v1.2. Training is done once offline using the simulator data generator." Reference this boundary in every AI-adjacent section to prevent scope drift.

---

### 🔴 CRITICAL — ACAD-2: Simulator Realism Over SDD Quality

**What goes wrong:** The team spends 3 weeks perfecting the simulator (realistic vibration FFT patterns, correlated sensor degradation, stochastic failure injection) and 3 days writing the SDD. The simulator is impressive in isolation but the SDD lacks component boundaries, permission matrices, and workflow diagrams. In academic review, the SDD is graded — not the simulator.

**Warning sign:** Team meeting agendas focus on simulator parameters. SDD is "being worked on in parallel" but no sections are draft-complete.

**Prevention (design decision):** Lock simulator scope to minimum viable fidelity: 5 sensor types, configurable publish interval, configurable failure rate, configurable noise. Define these in the SDD's "IoT Simulator Specification" section as a 1-page table. Treat the simulator as a supporting tool for the SDD, not a deliverable in its own right.

---

### 🟡 MODERATE — ACAD-3: Over-Engineering the Stack for a 3-Month Academic Project

**What goes wrong:** The architecture design includes Apache Kafka for message streaming, Redis for real-time pub/sub, TimescaleDB for time-series, Celery with multi-worker queues, and Kubernetes deployment. Each component adds operational complexity and integration surface area. In a 3-month project, the team spends 70% of time on infrastructure wiring and 30% on actual features. The demo shows a Kubernetes dashboard, not asset management workflows.

**Warning sign:** Architecture diagram has more infrastructure components than application modules. The rationale for each component is "we might need to scale later."

**Prevention (design decision):** Apply the "minimum viable stack" rule in the SDD: choose the simplest component that fulfills the functional requirement.

| Requirement | Minimum Viable Choice | Over-Engineering |
|---|---|---|
| MQTT message queue | MQTT QoS 1 + async FastAPI handler | Kafka |
| Async task processing | FastAPI BackgroundTasks | Celery + Redis |
| Time-series storage | PostgreSQL with `ingested_at` index | TimescaleDB |
| WebSocket broadcasting | FastAPI WebSocket manager | Redis pub/sub |
| Auth | JWT + RBAC middleware | OIDC/SSO |

Document these choices with explicit "why not" rationale so team members stop relitigating them.

---

### 🟡 MODERATE — ACAD-4: "Simulated" Scope Not Documented → Grader Misalignment

**What goes wrong:** The SDD describes a production-grade IoT system with real sensor hardware integration. The actual implementation uses a Python script that generates fake data. When the grader asks "can we plug in a real temperature sensor?", the team has no documented answer. If the SDD promised real IoT, the project is graded as incomplete.

**Warning sign:** SDD IoT Architecture section says "IoT sensors publish telemetry" without a "Simulation Boundary" callout box.

**Prevention (design decision):** Include a clearly labeled "System Boundary" section in the SDD with a callout:
> **Simulation Boundary:** This system uses a software-based IoT Sensor Simulator to generate synthetic telemetry data. Real hardware sensor integration is architecturally supported (via the defined MQTT topic schema) but is outside the v1.2 scope. The simulator is the sole data source for all IoT-dependent features.

This single paragraph prevents scope ambiguity in grading, demos, and future implementation phases.

---

### 🟡 MODERATE — ACAD-5: No "Definition of Done" for SDD Sections → Review Is Fuzzy

**What goes wrong:** The team submits an SDD for review. Different reviewers (team members, supervisor, grader) have different expectations. One reviewer thinks "Architecture section" means a diagram; another thinks it means a prose description. Without criteria, feedback is subjective ("this section feels thin") and revisions are infinite.

**Warning sign:** SDD review sessions produce comments like "we should add more here" without specifying what "more" means. Revision cycles don't converge.

**Prevention (design decision):** Define acceptance criteria for each SDD section in a "Document Standards" page:

| Section | Done When |
|---|---|
| System Architecture | Has: component diagram, component responsibility table, communication protocol table |
| RBAC | Has: role descriptions + permission matrix table |
| IoT Architecture | Has: data flow diagram, topic schema table, payload schema, QoS specification |
| AI Architecture | Has: pipeline diagram, input/output contract table, model boundary, approval state machine |
| ER Diagram | Has: all entities, all relationships with cardinality, all key attributes |
| Wireframes | Has: all 8 modules, all role variants, annotated with component names |

---

### 🟢 MINOR — ACAD-6: Audit Log Treated as "Just a Table" → Business Value Lost

**What goes wrong:** The Audit Log section says "all actions are logged to an `audit_events` table." No immutability guarantee, no specification of what constitutes an "event" (every DB write? Only business actions?), no AI recommendation linkage. During grading, the grader asks "show me the audit trail for this maintenance approval" and the team can't filter by correlation.

**Warning sign:** Audit Log section is one paragraph. No event taxonomy. No `correlation_id` defined.

**Prevention (design decision):** Define an audit event taxonomy in the SDD:

| Category | Example Events |
|---|---|
| Asset lifecycle | asset.created, asset.assigned, asset.returned, asset.retired |
| Maintenance | maintenance.scheduled, maintenance.completed |
| AI | ai.recommendation.generated, ai.recommendation.approved, ai.recommendation.deferred |
| Security | user.login, user.role_changed, permission.denied |
| IoT | sensor.alert.triggered, iot.connection.lost |

Specify: every event includes `correlation_id` (linking AI → approval → maintenance → notification). Specify immutability: `audit_events` rows are insert-only (no UPDATE, no DELETE). This makes the audit trail a defensible design decision, not an afterthought.

---

## Summary Table

| ID | Category | Severity | Problem | Prevention |
|----|----------|----------|---------|------------|
| IoT-1 | IoT | 🔴 | MQTT QoS 0 message loss | Specify QoS 1 + dedup by message_id |
| IoT-2 | IoT | 🔴 | No topic naming convention | Define topic hierarchy in SDD contract |
| IoT-3 | IoT | 🔴 | Simulator floods ingest | Specify publish interval + async ingest |
| IoT-4 | IoT | 🟡 | Clock drift / timestamp ordering | Two timestamps: simulator_ts + ingested_at |
| IoT-5 | IoT | 🟡 | No reconnect backoff | Specify exponential backoff in component spec |
| IoT-6 | IoT | 🟡 | No payload schema validation | Define formal payload schema + reject policy |
| AI-1 | AI/ML | 🔴 | Model trained on clean synthetic data | Specify noise + failure injection in simulator spec |
| AI-2 | AI/ML | 🔴 | Random train/test split → data leakage | Mandate temporal split in AI pipeline contract |
| AI-3 | AI/ML | 🔴 | Approval gate not a state machine | Define full state machine with RBAC enforcement |
| AI-4 | AI/ML | 🟡 | Health score opaque | Require top_factors in AI output contract |
| AI-5 | AI/ML | 🟡 | No model versioning | Include model_version in recommendation schema |
| AI-6 | AI/ML | 🟡 | Class imbalance ignored | Specify 15% failure rate + balanced training |
| UI-1 | Real-time UI | 🔴 | WebSocket firehose | Aggregation layer: one msg/asset/interval |
| UI-2 | Real-time UI | 🟡 | Chart re-renders on every point | Specify rolling window + React.memo |
| UI-3 | Real-time UI | 🟡 | No stale data indicator | Require timestamp + color state in wireframes |
| UI-4 | Real-time UI | 🟡 | Browser memory leak | Bounded ring buffer in Frontend Architecture |
| UI-5 | Real-time UI | 🟢 | No WebSocket reconnect | Specify reconnect library + backoff |
| DESIGN-1 | SDD Design | 🔴 | SDD describes impl, not contracts | Scope rule: no code blocks, no SQL DDL |
| DESIGN-2 | SDD Design | 🔴 | RBAC vague → divergence | Mandatory permission matrix table |
| DESIGN-3 | SDD Design | 🔴 | IoT pipeline in prose only | Require formal data flow diagram |
| DESIGN-4 | SDD Design | 🟡 | ER diagram includes SQL | Conceptual entity model only |
| DESIGN-5 | SDD Design | 🟡 | Edge cases left implicit | Edge case table for every state machine |
| DESIGN-6 | SDD Design | 🟢 | Notification schema undefined | Unified notification schema in SDD |
| ACAD-1 | Academic | 🔴 | Scope creep to MLOps | Hard boundary: inference-only, no training infra |
| ACAD-2 | Academic | 🔴 | Simulator over SDD quality | Lock simulator scope to 1-page spec |
| ACAD-3 | Academic | 🟡 | Over-engineering stack | Minimum viable stack table with "why not" rationale |
| ACAD-4 | Academic | 🟡 | Simulated scope undocumented | "Simulation Boundary" callout in SDD |
| ACAD-5 | Academic | 🟡 | No definition of done | Per-section acceptance criteria table |
| ACAD-6 | Academic | 🟢 | Audit log undertreated | Event taxonomy + correlation_id + immutability |

---

## Phase-Specific Warnings

| SDD Section Being Written | Most Likely Pitfall | Mitigation |
|---|---|---|
| IoT Architecture | IoT-3 (simulator floods), IoT-2 (no topic convention) | Write topic schema + publish interval table first |
| AI Architecture | AI-2 (data leakage), AI-3 (gate not enforced) | Temporal split + approval state machine are mandatory |
| Real-time Dashboard Wireframes | UI-1 (firehose), UI-3 (no stale indicator) | Aggregation architecture before wireframe |
| User Roles & Permissions | DESIGN-2 (vague RBAC) | Permission matrix table, not prose |
| ER Diagram | DESIGN-4 (SQL in diagram) | Conceptual only — no types, no constraints |
| Business Workflows | DESIGN-5 (no edge cases) | Edge case table for AI approval and overdue return |
| Scope Definition | ACAD-1 (MLOps creep), ACAD-4 (real IoT expectation) | Simulation Boundary callout + inference-only boundary |

---

## Sources

- Production IoT system post-mortems: MQTT message loss patterns, QoS misconfiguration  
- ML engineering best practices: temporal validation splits, class imbalance for maintenance prediction  
- React performance patterns: WebSocket throttling, chart rendering optimization  
- Academic software project failure modes: scope creep, overconfident AI metrics, stack over-engineering  
- Confidence: HIGH — patterns are well-established and cross-verified across IoT, ML, and UI engineering literature
