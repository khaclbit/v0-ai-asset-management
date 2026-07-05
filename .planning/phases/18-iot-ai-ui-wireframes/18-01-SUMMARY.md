# Phase 18 — IoT & AI UI Wireframes: Completion Summary

**Phase:** 18  
**Plan:** 18-01-PLAN.md  
**Status:** ✅ COMPLETE  
**Date:** 2026-06-28  

---

## Deliverables Produced

### Primary Design Document
- **`WIREFRAMES_2.md`** — 47,385 chars, 5 sections (§6–§10), complete annotated ASCII wireframe spec

| Section | Requirement | Content |
|---------|-------------|---------|
| §6 IoT Monitoring (UX-05) | ✅ | 2-panel layout, asset selector sidebar with 4-state dots, SENSOR_CATEGORY_MAP table (Laptop:5/Printer:6/Forklift:5/Monitor:4/OE:4), sensor tile anatomy with threshold colors, LineChart+ReferenceLine charts, chart color→sensor mapping |
| §7 AI Predictive (UX-06) | ✅ | Predictive Summary Card, High-risk card (SLA+escalation+approval buttons) vs Medium/Low card, state machine (pending→approved\|deferred→expired), SLA constants, canAct role check |
| §8 Notification Center (UX-07) | ✅ | CRITICAL NOTE: bell is navigation not dropdown, topbar bell spec (Button+Link+Bell+Badge), full /notifications page (unread dot, deep-link, mark-read, pagination), 4-type reference table |
| §9 Audit Log (UX-08) | ✅ | CONFIRMED existing implementation, category filter, 8-column immutable table, colSpan=8 expandable row, immutability constraints checklist |
| §10 User Management (UX-09) | ✅ | User list (role badge mapping, opacity-60 inactive), create form (5 fields), edit form (no password + Account Status toggle), deactivate dialog ("This action can be reversed"), no-hard-delete prohibition |

---

## Verification Results (Wave 4)

| Check | Count | Result |
|-------|-------|--------|
| UX-05-VERIFIED marker | 1 | ✅ |
| UX-06-VERIFIED marker | 1 | ✅ |
| UX-07-VERIFIED marker | 1 | ✅ |
| UX-08-VERIFIED marker | 1 | ✅ |
| UX-09-VERIFIED marker | 1 | ✅ |
| Route Migration TODO | 2 | ✅ |
| SENSOR_CATEGORY_MAP / Sensor Tile Grid | 2 | ✅ |
| Connection status (Reconnecting/Disconnected) | 3 | ✅ |
| SLA countdown (getHighRiskSlaState/formatSlaCountdown) | 4 | ✅ |
| Approval gate (canAct/isAssetManager) | 2 | ✅ |
| Bell is navigation (not dropdown) | 2 | ✅ |
| Notification types (×4) | 6 | ✅ |
| Audit colSpan=8 expandable row | 1 | ✅ |
| Audit immutability (append-only) | 4 | ✅ |
| No hard-delete constraint | 8 | ✅ |
| Deactivate dialog ("This action can be reversed") | 2 | ✅ |
| Document Status table | 1 | ✅ |
| All 5 sections present | 10 | ✅ |

---

## Key Design Decisions

1. **Bell navigates full-page** — `/dashboard/notifications` (not a dropdown/popover). Critical accessibility and shareability requirement per IA §1.4.
2. **Route migration TODO documented** — `/dashboard/predictive` → `/dashboard/ai` is a 3-step implementation task deferred to Phase 19.
3. **SENSOR_CATEGORY_MAP strictly enforced** — Humidity absent for Forklift/Monitor; Vibration absent for Laptop/Monitor/OE. Grid built from category map, never hard-coded.
4. **AI approval gate** — `canAct = role === "Asset Manager" || role === "Admin"`. Admin has full access (SDD §2.1 superset rule).
5. **Audit Log confirmed** — existing `audit/page.tsx` implementation already matches UX-08. No changes needed.
6. **No hard-delete on users** — PATCH `is_active: false` only. User records must persist for audit trail integrity (AuditEvents.actor FK).

---

## Decisions Deferred to Phase 19 (Implementation)

- Route migration: create `app/dashboard/ai/page.tsx` + add redirect from `/dashboard/predictive`
- Create `app/dashboard/iot/page.tsx` (new, no existing implementation)
- Create `app/dashboard/notifications/page.tsx` (new, no existing implementation)
- Create `app/dashboard/users/page.tsx` (new, no existing implementation)
- Add bell icon to `components/topbar.tsx`

---

## Next Phase

**Phase 19 — Data Design, API Overview & Folder Architecture** (DATA-01, DATA-02, FOLD-01, FOLD-02)
- Conceptual ER diagram (no SQL DDL)
- API module overview (9 modules, responsibility statements, no endpoint paths)
- React folder structure (`src/` — 8 required directories)
- FastAPI folder structure (`app/` — 8 required modules)
