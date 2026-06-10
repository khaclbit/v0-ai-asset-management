# Phase 8: Maintenance & Warranty UI - Research

**Researched:** 2026-06-10
**Confidence:** High

## Scope alignment
- Goal and requirements MAINT-01..04 are UI-focused and compatible with existing mock-data architecture.
- No backend or persistence changes are needed for this phase.

## Codebase findings

### Reusable assets
- `v0-ai-asset-management/lib/data.ts`
  - Provides `MaintenanceRecord`, `WarrantyRecord`, and statuses:
    - Maintenance: `scheduled`, `in_progress`, `completed`, `blocked`
    - Warranty: `active`, `expiring_soon`, `expired`, `void`
  - Includes seeded `maintenanceRecords` and `warrantyRecords`.
- `v0-ai-asset-management/lib/store.tsx`
  - Exposes `maintenanceRecords`, `warrantyRecords`, and `updateMaintenanceStatus`.
- `v0-ai-asset-management/components/status-badge.tsx`
  - Already styles/labels maintenance and warranty states.
- `v0-ai-asset-management/components/sidebar.tsx`
  - Already includes `/dashboard/maintenance` nav item.

### Established patterns to reuse
- Role-gated actions based on `user.role`.
- Table/filter/search patterns from assets and borrow pages.
- Immediate UI feedback with `toast.success`.
- Base UI select handler null-guard pattern: `onValueChange={(v) => v && setX(v)}`.

## Planning implications

### Must enforce in UI logic
- Transition rules from context:
  - `scheduled -> in_progress -> completed`
  - `blocked -> in_progress`
- Note policy from context:
  - Notes optional generally
  - Note required when setting `blocked`

### Warranty warning behavior
- Compute warning urgency from `endDate` for <= 30 days.
- Render both:
  - Top summary warning area
  - Highlighted rows in tracker
- Severity tiers:
  - 0-7 days critical
  - 8-30 days warning
- Clicking warning item should filter/jump to the relevant record.

## Risks
- `updateMaintenanceStatus` currently accepts any status; without UI guards, invalid transitions can be introduced.
- If warning logic relies only on stored status instead of date calculation, 30-day requirement can drift.

## Recommendation
- Build a single route page at `app/dashboard/maintenance/page.tsx` with:
  - grouped maintenance sections,
  - inline manager status updates with note handling,
  - warranty tracker with search/filter,
  - top warning summary + row-level highlighting.

## RESEARCH COMPLETE
