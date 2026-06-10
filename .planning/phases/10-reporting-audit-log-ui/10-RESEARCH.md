# Phase 10: Reporting & Audit Log UI - Research

**Researched:** 2026-06-10
**Domain:** Next.js App Router reporting + audit-log UI (mock-data, client-state)
**Confidence:** HIGH

## Summary

Phase 10 is currently a true functional gap: reporting is partial and audit log remains a placeholder route.

Primary recommendation: implement Phase 10 in 3 plans over 2 waves — first complete reporting data coverage plus staff scoping, then deliver audit event data contract and interactive audit UI.

## Requirement-Gap Inventory

| ID | Current Gap | Root Cause | Evidence |
|---|---|---|---|
| RPT-01 | Missing full asset overview slices | Reports page only covers value/depreciation focus | `app/dashboard/reports/page.tsx`, `.planning/REQUIREMENTS.md` |
| RPT-02 | Missing assignment report (active/historical) | Reports page does not consume `assignmentRecords` | `app/dashboard/reports/page.tsx`, `lib/store.tsx` |
| RPT-03 | Missing maintenance report (upcoming/overdue) | Reports page does not consume `maintenanceRecords` | `app/dashboard/reports/page.tsx`, `lib/store.tsx` |
| RPT-04 | Missing staff scoping | Reports page does not read `user` for role-based filtering | `app/dashboard/reports/page.tsx`, `lib/store.tsx` |
| AUDT-01 | No immutable audit table | Audit page is placeholder only | `app/dashboard/audit/page.tsx` |
| AUDT-02 | No category filter | No audit event dataset/filter state | `app/dashboard/audit/page.tsx` |
| AUDT-03 | No row expansion/details linkage | No expandable table/details model | `app/dashboard/audit/page.tsx` |

## Reusable Components and Data

- `useStore()` already exposes `assets`, `assignmentRecords`, `maintenanceRecords`, and `user`.
- `formatDate` and `formatCurrency` in `lib/data.ts` can be reused for report/audit presentation.
- Existing dashboard UI patterns (`Card`, `Table`, `Topbar`, `StatusBadge`) should be reused.
- `CORRELATION_LABEL` in `lib/ai-governance.ts` can provide consistent AI linkage labeling.

## Recommended Plan Decomposition

### Wave 1
1. **10-01** Reports completeness + role scoping (`RPT-01..04`).

### Wave 2
2. **10-02** Audit event data contract + read-only seed pipeline.
3. **10-03** Audit log UI table + category filters + expandable details (`AUDT-01..03`).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Staff scoping inconsistently applied across report widgets | RPT-04 failure | Centralize `scopedAssignmentRecords` selector and reuse |
| Audit event schema under-specified | AUDT drift | Define strict typed `AuditEvent` contract before UI wiring |
| Treating placeholder as complete audit | AUDT-01..03 remain unsatisfied | Require concrete table/filter/expand acceptance tests in plan |

## Scope Guardrails

**In scope**
- Reports page completion for `RPT-01..04`
- Audit log implementation for `AUDT-01..03`
- Mock/in-memory dataset only

**Out of scope**
- Backend API or persistence
- Auth/session redesign
- Non-Phase-10 documentation debt (e.g., stale Phase 7 verification)

## Confirmed Decisions from Planning Inputs

1. Staff reports scope = only records where `assignee == current user`.
2. Auditor retains full reports visibility.
3. Read-only audit table is sufficient to satisfy immutability for this milestone.

## Sources

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/v1.1-MILESTONE-AUDIT.md`
- `v0-ai-asset-management/app/dashboard/reports/page.tsx`
- `v0-ai-asset-management/app/dashboard/audit/page.tsx`
- `v0-ai-asset-management/lib/store.tsx`
- `v0-ai-asset-management/lib/data.ts`
- `v0-ai-asset-management/lib/navigation-access.ts`
