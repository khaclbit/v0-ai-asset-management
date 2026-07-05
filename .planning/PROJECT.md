# AI-Powered Asset Management System

## What This Is

AI-Powered Asset Management System is a full-stack web application for managing organizational assets (laptops, monitors, printers, servers, industrial equipment) through their complete lifecycle. It combines traditional asset management with IoT monitoring and AI-driven predictive maintenance. The system is backed by a FastAPI REST API, PostgreSQL database, JWT-based authentication, and role-based access control (RBAC).

## Core Value

Give teams a production-grade, enterprise-style asset management platform with real persistent data, authenticated multi-role access, and a foundation ready for IoT/AI extension.

## Requirements

### Validated

- ✓ Existing web dashboard supports role-aware login gating and routed dashboard navigation — existing
- ✓ Existing frontend supports asset CRUD, borrow/return tracking, and reporting views in a demo flow — existing
- ✓ Existing frontend includes assistant-style natural-language query simulation and OCR-assisted asset intake simulation — existing
- ✓ Produced architecture blueprint, module boundaries, and interface contracts — v1.0
- ✓ Produced data model, security boundary, and audit traceability architecture — v1.0
- ✓ Produced lifecycle workflows and AI integration governance workflows — v1.0
- ✓ Define v1.2 software design requirements: system architecture, domain model, business workflows — v1.2
- ✓ Define v1.2 UI/UX design scope: wireframes, design system, page hierarchy for all modules — v1.2
- ✓ Define v1.2 conceptual architecture scope: IoT pipeline, AI pipeline, ER diagram, folder structure — v1.2
- ✓ Implement all 10 frontend UI sections with mock/static data aligned to SDD wireframes — v1.3
- ✓ Extend existing v1.1 pages (Dashboard, Assets, Assignments, Maintenance) per WIREFRAMES.md §2–§5 — v1.3
- ✓ Build new pages: IoT Monitoring, AI Predictive, Notifications, Audit Log, User Management — v1.3
- ✓ FastAPI backend scaffold: project structure, Docker Compose, .env.example, Alembic, seed script — v2.0
- ✓ SQLAlchemy ORM models + Alembic initial migration for all core domain entities — v2.0
- ✓ JWT authentication: login, refresh token, /auth/me, get_current_user, require_role RBAC — v2.0
- ✓ Asset API: paginated CRUD + lifecycle state machine with 409 guards — v2.0
- ✓ User, Assignment & Maintenance APIs: full workflow with asset.status sync, business rule enforcement — v2.0
- ✓ Frontend wired to real FastAPI backend with graceful demo-mode fallback — v2.0

### Active

- [ ] IoT MQTT pipeline: Python sensor simulator → Mosquitto broker → FastAPI MQTT consumer → `sensor_readings` PostgreSQL table — v2.1
- [ ] WebSocket real-time sensor data: FastAPI WebSocket endpoint pushing `sensor_readings` to IoT Monitoring page — v2.1

### Out of Scope

- AI predictive maintenance backend (ML model, inference endpoint) — deferred to v2.2
- Notification delivery pipeline (SSE endpoint, in-app notification center) — deferred to v2.2
- Production deployment / CI/CD — deferred until all features implemented

## Context

v1.3 shipped: complete frontend UI with 24 phases, all 10 dashboard sections implemented (Dashboard, Assets, Assignments, Maintenance, IoT Monitoring, AI Predictive, Notifications, Audit Log, User Management, Reports). Frontend uses Next.js 15 + shadcn/ui + Tailwind v4 + Recharts with in-memory mock data. The v2.0 backend milestone replaces mock data with a real FastAPI + PostgreSQL backend, preserving all existing frontend UI.

## Constraints

- **Scope**: Backend APIs + frontend wiring — no new UI changes in this milestone
- **Auth**: JWT with python-jose; RBAC enforced server-side via FastAPI dependencies
- **Database**: PostgreSQL + SQLAlchemy async ORM + Alembic
- **Environment**: Docker Compose for local dev; no production deployment yet
- **API style**: REST (JSON); follow SDD DATA_ARCH.md entity relationships

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start with architecture blueprint + module overview + end-to-end workflows | User explicitly requested non-coding architectural foundation first | ✅ Shipped v1.0 |
| Optimize artifacts for engineering handoff | Primary audience is implementation team, not stakeholder-only deck | ✅ Shipped v1.0–v1.2 |
| Keep AI specification at integration boundary level | Reduces early overdesign while preserving actionable system flow | ✅ Applied v1.0–v1.2 |
| Build full frontend with mock data before backend | Validate UX/flows before committing to API contracts | ✅ Shipped v1.3 |
| Use Alembic for DB migrations | Standard FastAPI/PostgreSQL production practice; version-controlled schema | ✅ Shipped v2.0 |
| Docker Compose dev environment | Matches real-world IoT/AI deployment model; no manual DB setup | ✅ Shipped v2.0 |
| Build full frontend with mock data before backend | Validate UX/flows before committing to API contracts | ✅ Shipped v1.3 — frontend wired in v2.0 |
| bcrypt via direct calls (not passlib) | passlib compatibility issues with bcrypt 4.x; direct bcrypt API is stable | ✅ Shipped v2.0 |
| Graceful demo-mode fallback in frontend | Backend unavailability should not break demo/dev workflow | ✅ Shipped v2.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

## Current State

**v2.1 shipped (2026-07-05):** Full IoT sensor telemetry pipeline live. `sensor_simulator.py` publishes 6 metrics for 5 device IDs via Mosquitto MQTT → FastAPI consumer persists to `sensor_readings` table (PostgreSQL) via `asyncio.to_thread()` → WebSocket broadcast to `useIotWebSocket` hook → live line charts on `/dashboard/iot`. `generateReadings()` mock fully removed. 0 TypeScript errors.

**Prior milestones:** v1.0 architecture → v1.1 English frontend → v1.2 SDD artifacts → v1.3 mock dashboards → v2.0 real backend → v2.1 live IoT pipeline.

## Next Milestone: v2.2 AI Predictive Maintenance & Notifications

**Goal:** Add AI-driven maintenance recommendations powered by sensor history, plus real-time in-app notification delivery via SSE.

**Target features:**
- Scikit-learn Random Forest model trained on `sensor_readings` → `ai_recommendations` table
- `POST /api/v1/ai/recommendations` inference endpoint + Manager approval gate
- AI Predictive Maintenance page wired to real `ai_recommendations` API
- SSE endpoint `/api/v1/notifications/stream` for real-time notification delivery
- Notification bell badge + Notifications page replace mock data

**Deferred from v2.1:**
- WebSocket auth (`?token=` query param)
- Sensor simulator as Docker Compose service
- `sensor_device_id` in `GET /assets` API response
- MQTT threshold alerting (breach events → alerts table)

---
*Last updated: 2026-07-05 after v2.1 milestone completion*
