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

### Active

- [ ] Scaffold FastAPI backend project structure (routers, models, schemas, services, dependencies) — v2.0
- [ ] Docker Compose dev environment: FastAPI + PostgreSQL + pgAdmin + hot-reload uvicorn — v2.0
- [ ] SQLAlchemy ORM models + Alembic migrations for all core domain entities — v2.0
- [ ] JWT authentication endpoints (login, logout, refresh token) with RBAC middleware — v2.0
- [ ] Asset API: CRUD + lifecycle state machine endpoints — v2.0
- [ ] User management API: list, create, edit role, deactivate (Admin-only) — v2.0
- [ ] Assignment API: request, approve, reject, initiate-return, close workflow — v2.0
- [ ] Maintenance API: create ticket, update status, list by asset — v2.0
- [ ] Frontend API wiring: replace in-memory mock store with real HTTP API calls — v2.0

### Out of Scope

- IoT MQTT pipeline and sensor simulator — deferred to v2.1
- AI predictive maintenance backend (ML model, inference endpoint) — deferred to v2.1
- Notification delivery pipeline — deferred to v2.1
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
| Use Alembic for DB migrations | Standard FastAPI/PostgreSQL production practice; version-controlled schema | 🔄 v2.0 |
| Docker Compose dev environment | Matches real-world IoT/AI deployment model; no manual DB setup | 🔄 v2.0 |

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

v1.0 shipped: architecture/workflow blueprint. v1.1 shipped: full English frontend rebuild with mock data. v1.2 shipped: complete SDD artifact set (272KB, 6 documents). v1.3 shipped: complete frontend UI — 24 phases, all 10 dashboard sections (Dashboard, Assets, Assignments, Maintenance, IoT Monitoring, AI Predictive Maintenance, Notifications, Audit Log, User Management, Reports) with 0 TypeScript errors.

## Current Milestone: v2.0 Backend Foundation

**Goal:** Build a production-grade FastAPI + PostgreSQL backend with Docker Compose dev environment, JWT/RBAC authentication, and core domain APIs — then wire the existing frontend to consume real data instead of mock data.

**Target features:**
- FastAPI project structure (routers/models/schemas/services pattern)
- Docker Compose: FastAPI + PostgreSQL + pgAdmin + hot-reload uvicorn
- SQLAlchemy ORM models + Alembic migrations (Asset, User, Assignment, Maintenance)
- JWT Authentication + RBAC (Admin / Asset Manager / Staff / Auditor)
- Asset API — CRUD + lifecycle state machine
- User API — user management (Admin-only)
- Assignment API — request/approve/reject/return workflow
- Maintenance API — ticket creation + status transitions
- Frontend wiring — replace mock store with real API calls

**Constraints:**
- No IoT, AI, or notification backends in this milestone (v2.1+)
- Frontend UI stays the same — only data source changes
- Alembic migrations for all schema changes

---
*Last updated: 2026-06-30 after v1.3 milestone completion, v2.0 started*
