# Phase 17 — Core UI Wireframes: Completion Summary

**Phase:** 17  
**Plan:** 17-01-PLAN.md  
**Status:** ✅ COMPLETE  
**Date:** 2026-06-28  

---

## Deliverables Produced

### Primary Design Document
- **`WIREFRAMES.md`** — 44,945 chars, 5 sections, complete annotated ASCII wireframe spec

  | Section | Content |
  |---------|---------|
  | §1 Sidebar Navigation (UX-10) | Admin/Manager/Staff role views, 4-state table, active route matching, notification badge pattern, Administration conditional render |
  | §2 Dashboard (UX-01) | 4 KPI cards + API source, Asset Distribution bar chart, AI Risk Donut (new), Real-Time Sensor Summary Panel (WS), Recent Alerts (SSE + REST) |
  | §3 Asset Management (UX-02) | Asset list with lifecycle badge + SensorStatusDot, asset detail with live sensor readings panel, create/edit form with 6 fields + validation |
  | §4 Assignment Workflow (UX-03) | All 5 status badges (requested/active/overdue/closed/rejected), pending queue, request form, return initiation (overdue banner), close return dialog |
  | §5 Maintenance Management (UX-04) | Stats cards, warranty expiry warnings (conditional amber border), timeline stacked bar chart, schedule table (grouped, 4 badges, blocked tint), state update Select (transition matrix), warranty tracker (4 color rules) |

### Code Changes (Wave 0)
- **`frontend/components/ui/breadcrumb.tsx`** — installed via shadcn CLI
- **`frontend/components/ui/tooltip.tsx`** — installed via shadcn CLI
- **`frontend/app/dashboard/assignments/`** — renamed from `borrow/` (canonical v1.2 route)
- **`frontend/lib/navigation-access.ts`** — v1.2 DASHBOARD_NAV (10 items, 3 roles, correct routes)
- **`frontend/components/sidebar.tsx`** — NAV_ICONS updated; sub-route active matching added

---

## Requirements Coverage

| Req ID | Description | Status |
|--------|-------------|--------|
| UX-01 | Dashboard wireframe (KPIs, charts, sensor panel, alerts) | ✅ |
| UX-02 | Asset Management wireframes (list, detail, create/edit) | ✅ |
| UX-03 | Assignment Workflow wireframes (all 5 states, queue, forms, return, close) | ✅ |
| UX-04 | Maintenance wireframes (schedule, state update, warranty tracker) | ✅ |
| UX-10 | Sidebar navigation wireframe (role-aware, 4 states) | ✅ |

---

## Verification Results (Wave 4)

| Success Criterion | Key Markers | Result |
|-------------------|-------------|--------|
| SC1: Dashboard | GET /api/dashboard/kpis (×2), ai-risk-distribution (×1), iot/stream (×2), GET /api/notifications (×1) | ✅ PASS |
| SC2: Asset Management | lifecycle_state (×8), Sensor Status (×2), sensors/latest (×1), Create/Edit/Save Asset (×7) | ✅ PASS |
| SC3: Assignment Workflow | "requested" (×1), "overdue" (×3), "closed" (×3), "rejected" (×2), Initiate Return (×3), Close Assignment (×6) | ✅ PASS |
| SC4: Maintenance | Valid transition (×6), Warranty Tracker (×2), days left (×7) | ✅ PASS |
| SC5: Sidebar | Admin/Manager/Staff views (×2 each), bg-sidebar-primary (×1), hover:bg-sidebar-accent (×1), mobile hidden (×2) | ✅ PASS |

---

## Key Design Decisions

1. **`overdue` is derived, never stored** — Assignment DB has `requested|active|closed|rejected` only. Computed at render: `status === 'active' && expected_return_date < today`. Prominently annotated in §4 to prevent regression.
2. **Administration section conditional render** — DOM-removed for non-Admin (hide-not-disable per IA.md §1.3)
3. **SensorStatusDot** — green/amber/red based on time since last WS reading; uses fleet-wide WS stream, not per-asset polling
4. **AI Risk Donut** — new v1.2 component, data from `GET /api/dashboard/ai-risk-distribution`
5. **Maintenance Timeline** — stacked bar chart using `var(--chart-N)` CSS vars (DESIGN_SYSTEM §5.1 Rule 6)
6. **Blocked transition** — requires inline note field (UX enforcement of SDD §2.3 rule)

---

## Next Phase

**Phase 18 — IoT & AI UI Wireframes** (UX-05–09)
- IoT Monitoring page (asset selector sidebar, sensor tile grid, time-series charts)
- AI Predictive Maintenance page (recommendation cards, approval gate, SLA countdown)
- Notification Center (bell dropdown + full /notifications page)
- Audit Log page (immutable event table, category filter, expandable rows)
- User Management pages (user list, create/edit, deactivate)
