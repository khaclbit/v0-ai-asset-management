# AI-Powered Asset Management System

## What This Is

AI-Powered Asset Management System is a web application for managing organizational assets such as laptops, monitors, printers, and related equipment. It supports core lifecycle operations (registration, assignment/return, maintenance, warranty, notifications, and reporting) and augments them with AI capabilities including assistant-style querying, OCR-assisted intake, and predictive maintenance insights. This initialization milestone is architecture-first and flow-first, intended as an engineering handoff with no implementation work.

## Core Value

Give teams a clear, implementation-ready system architecture and workflow blueprint for asset lifecycle operations with practical AI augmentation.

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

### Active

- [ ] Implement all 10 frontend UI sections with mock/static data aligned to SDD wireframes — v1.3
- [ ] Extend existing v1.1 pages (Dashboard, Assets, Assignments, Maintenance) per WIREFRAMES.md §2–§5 — v1.3
- [ ] Build new pages: IoT Monitoring, AI Predictive, Notifications, Audit Log, User Management — v1.3

### Out of Scope

- Backend connectivity (FastAPI/PostgreSQL) — deferred to next milestone
- Writing or modifying product implementation code — architecture-only milestone requested (v1.0–v1.2)
- Detailed model training/evaluation/MLOps design — deferred; current scope is integration/workflow level AI
- Production deployment execution — deferred until implementation phases

## Context

The current repository includes a mapped brownfield frontend prototype (`v0-ai-asset-management`) built with Next.js/React and in-memory state. Codebase mapping documents were created under `.planning/codebase/` and indicate that the current app demonstrates core flows but lacks persistent backend services, production-grade authentication/authorization, and durable data handling. The user’s target direction is React + FastAPI + PostgreSQL with AI/ML components for NLP assistant behavior, OCR extraction, and predictive maintenance.

## Constraints

- **Scope**: Architecture and flow artifacts only — no coding in this phase
- **Audience**: Engineering implementation handoff
- **AI Depth**: Integration/workflow level only — no deep model design yet
- **Starting Point**: Existing brownfield prototype must be acknowledged when defining target architecture

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Start with architecture blueprint + module overview + end-to-end workflows | User explicitly requested non-coding architectural foundation first | — Pending |
| Optimize artifacts for engineering handoff | Primary audience is implementation team, not stakeholder-only deck | — Pending |
| Keep AI specification at integration boundary level | Reduces early overdesign while preserving actionable system flow | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

## Current State

v1.0 shipped: architecture/workflow blueprint. v1.1 shipped: full English frontend rebuild with mock data. v1.2 shipped: complete SDD artifact set (272KB, 6 documents — SDD.md, IA.md, DESIGN_SYSTEM.md, WIREFRAMES.md, WIREFRAMES_2.md, DATA_ARCH.md, 35/35 requirements satisfied).

## Current Milestone: v1.3 Frontend UI Implementation

**Goal:** Implement all 10 frontend UI sections with mock/static data, extending existing v1.1 pages and building new IoT/AI/Notifications/Audit/User Management pages — fully aligned to the SDD wireframes, using shadcn/ui + Tailwind v4 + Recharts.

**Target features:**
- Refine Dashboard — align to WIREFRAMES.md §2 (stats cards, charts, AI risk widget, real-time sensor preview)
- Refine Assets — full lifecycle table, status badges, create/edit drawers (§3)
- Refine Assignments — request/approve/return workflow pages (§4)
- Refine Maintenance — tickets list, status flow, scheduled view (§5)
- NEW IoT Monitoring — live sensor charts per asset, device telemetry grid (§6 WIREFRAMES_2.md)
- NEW AI Predictive Maintenance — health scores, risk cards, recommendation approval workflow (§7)
- NEW Notifications Center — inbox, read/unread, filter by type (§8)
- NEW Audit Log — append-only event table, category filter (§9)
- NEW User Management — user list, role assignment, soft-deactivate (§10)

**Constraints:**
- Mock/static data only — no FastAPI backend connection
- Extend v1.1 pages; do NOT rewrite from scratch
- shadcn/ui + Tailwind v4 (DESIGN_SYSTEM.md); Recharts via ChartContainer pattern

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

---
*Last updated: 2026-06-28 after v1.2 milestone completion, v1.3 started*
