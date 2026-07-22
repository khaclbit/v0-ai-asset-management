# AI-Powered Asset Management System
### One-Page Project Summary · HCMUS · AI Management Systems Course

---

## 🎯 Project Goal

Build a **production-grade enterprise asset management platform** that unifies physical asset lifecycle tracking, real-time IoT sensor monitoring, and AI-driven predictive maintenance into a single web application — eliminating reactive failures through data-driven, human-approved maintenance decisions.

> *"Know the state of every asset, anticipate failures before they happen, and give the right people the right information at the right time."*

---

## ⚙️ What Was Built

### Core Platform
| Feature | Description |
|---------|-------------|
| 🗂️ Asset Registry | Full CRUD + enforced state machine (Registered → Available → Assigned → Maintenance → Retired) |
| 📋 Assignment Workflow | Borrow/return request system with Manager approval gate and deadline tracking |
| 🔧 Maintenance Tracking | Work orders with Scheduled → In Progress → Completed lifecycle |
| 🔐 RBAC | 4-role JWT authentication (Admin / Asset Manager / Staff / Auditor) enforced at every API endpoint |
| 📜 Audit Log | Append-only, immutable event ledger for compliance traceability |

### AI & IoT Intelligence
| Feature | Description |
|---------|-------------|
| 📡 IoT Pipeline | MQTT → PostgreSQL → WebSocket live sensor charts (6 metrics × 5 devices × 5 sec) |
| 🤖 Predictive Maintenance | Random Forest model · 18 engineered features · risk levels: Low/Medium/High/Critical |
| 🔔 Real-Time Alerts | SSE push notifications for threshold breaches, assignment events, maintenance changes |
| 🧠 LLM Anomaly Detection | OpenAI GPT-4o-mini explains unusual sensor patterns in plain language *(v2.3)* |
| ⚡ Smart Alert Rules | Multi-category rule engine: Value / Temporal / Composite / Delivery *(v2.3)* |

---

## 🛠️ Tech Stack Highlights

```
Frontend:  Next.js 15 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts
Backend:   FastAPI (Python 3.12) · SQLAlchemy · Alembic · PostgreSQL 16
IoT:       Eclipse Mosquitto MQTT · aiomqtt · WebSocket
AI / ML:   scikit-learn RandomForest · 18-feature engineering · joblib
Realtime:  Server-Sent Events (SSE) · asyncio.Queue per user
LLM:       OpenAI API (GPT-4o-mini, configurable)
Infra:     Docker Compose · JWT (python-jose) · bcrypt
```

---

## 🏆 Standout Technical Achievements

1. **End-to-end async IoT pipeline** — MQTT consumer uses `asyncio.to_thread` for non-blocking DB writes while simultaneously broadcasting to WebSocket clients and evaluating alert thresholds in a single event loop pass.

2. **Human-in-the-loop AI governance** — Every AI recommendation (Random Forest risk score + LLM anomaly flag) requires explicit Manager approval before triggering any maintenance action. No autonomous actuation.

3. **Multi-tab safe SSE notifications** — `NotificationManager` maintains a separate `asyncio.Queue` per user per connection, ensuring all open browser tabs receive the same real-time event without duplication or missed delivery.

4. **Stateless demo fallback** — Frontend gracefully degrades to in-memory mock data when the backend is unavailable, enabling full UI demonstration without infrastructure.

5. **OpenAI anomaly explanation** *(v2.3)* — LLM receives a structured sensor window and returns a plain-language explanation of anomalies (e.g., *"temperature 3× above 7-day baseline, correlated with elevated vibration"*), making AI outputs understandable to non-technical operators.

---

## 📊 System at a Glance

```
Users: 4 roles · JWT auth          AI Engine: Random Forest · 18 features
Assets: full lifecycle state machine    IoT: 6 metrics · 5 devices · 5s cadence  
Notifications: SSE · real-time push     LLM: GPT-4o-mini anomaly detection
API: 60+ REST endpoints             DB: PostgreSQL · 8 tables · Alembic migrations
```

---

## 📁 Deliverables

| Item | Location |
|------|----------|
| Source Code | `/backend` (FastAPI) · `/frontend` (Next.js) |
| Full Report | `docs/report/REPORT.md` |
| Architecture Diagrams | `docs/uml/` (PlantUML + ASCII) |
| Demo Video | `presentations/` |
| API Docs | `http://localhost:8000/docs` (Swagger UI) |

---

*AI Management System · v2.2 Shipped · v2.3 In Progress · Built with Next.js 15 + FastAPI + PostgreSQL + MQTT + scikit-learn + OpenAI*
