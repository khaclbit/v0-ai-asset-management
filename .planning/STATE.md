---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: AI Predictive Maintenance & Notifications
status: complete
last_updated: "2026-07-06"
last_activity: 2026-07-06
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-30)

**Core value:** Production-grade FastAPI + PostgreSQL backend with JWT/RBAC auth, core domain APIs, and frontend wired to real data.
**Current focus:** Phase null

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-07-05 — Milestone v2.2 started

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (this milestone)
- Average duration: —
- Total execution time: —

## Accumulated Context

### Decisions

- [v1.0 Phase 1]: Use architecture-first, no implementation code in v1.0 milestone.
- [v1.0 Phase 1]: Use modular-monolith target with explicit domain and integration boundaries.
- [v1.1 Start]: Rebuild entire frontend in English with mock data aligned to v1.0 architecture.
- [v1.1 Start]: Phase numbering continues from v1.0 — v1.1 starts at Phase 5.
- [Phase 5]: `formatVND` fully removed — all currency uses `formatCurrency` (USD, en-US).
- [Phase 5]: `borrowRecords` API replaced by `assignmentRecords` with full lifecycle states.
- [Phase 5]: Dashboard KPI contract now derives and enforces the exact DASH-01 set via `lib/dashboard-kpis.ts`.
- [Phase 6]: `canCreateEdit` and `canRetire` are split roles (Admin-only retire).
- [Phase 7]: Assignment lifecycle: requested → active (on approval) → closed (on return close).
- [Phase 7]: Overdue is derived at render-time from due date comparison, not stored as status.
- [Phase 7]: `setAssets` must not be called nested inside `setAssignmentRecords` updaters.
- [Phase 11]: Store route visibility and route access checks in lib/navigation-access.ts to prevent sidebar policy drift.
- [Phase 12]: Model assignment approval as a typed decision result with explicit failure reasons and transition patches.
- [v1.2 Phase 16]: shadcn/ui is the actual component library — NOT Material UI v6.5.0 (original spec was wrong).
- [v1.2 Phase 16]: Role model changed v1.1→v1.2: 4 roles → 3 roles (Administrator, Manager, Staff; Auditor absorbed into Admin).
- [v1.2 Phase 17]: `overdue` is a DERIVED state — never stored in DB, computed as `status === 'active' && expected_return_date < today`.
- [v1.2 Phase 17]: Bell icon navigates full-page to `/dashboard/notifications` — NOT a dropdown.
- [v1.2 Phase 17]: `/borrow` renamed to `/assignments` in navigation.
- [v1.2 Phase 18]: `/dashboard/predictive` route gap — fixed in Phase 23 (redirect to `/dashboard/ai`).
- [v1.2 Phase 19]: AI NEVER writes to business tables — only writes to `ai_recommendations`. Enforced at API middleware.
- [v1.2 Phase 19]: paho-mqtt v2 breaking: `on_connect` requires 5 args with `reason_code` parameter.
- [v1.2 Phase 19]: Recharts always uses `ChartContainer` wrapper from `components/ui/chart.tsx` — never raw `ResponsiveContainer`.
- [v1.2 Phase 19]: `AuditEvents` is append-only — no UPDATE or DELETE ever. `AuditService.append()` only.
- [v1.3 Complete]: All 24 phases shipped. Frontend uses Next.js 15 + shadcn/ui + Tailwind v4 with @base-ui/react/button (no asChild prop).
- [v2.0 Start]: Backend stack confirmed: FastAPI + PostgreSQL + SQLAlchemy + Alembic + JWT (python-jose) + Docker Compose.
- [v2.0 Start]: No IoT/AI backend in this milestone. Notification delivery deferred to v2.1.
- [v2.0 Start]: Frontend wiring (replace mock store) is IN SCOPE for this milestone.

### Pending Todos

- None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-30T00:50:00.000Z
Stopped at: Milestone v2.0 started
Resume file: None
Next action: `/gsd-plan-phase 25`

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
