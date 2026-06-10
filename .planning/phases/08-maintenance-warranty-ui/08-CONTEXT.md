# Phase 8: Maintenance & Warranty UI - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver maintenance and warranty UI so users can view maintenance schedules with status badges, Asset Manager can update maintenance status, and users can track warranty states with visible expiry warnings for assets within 30 days.

</domain>

<decisions>
## Implementation Decisions

### Maintenance list UX
- **D-01:** Group maintenance records by status sections rather than using one flat table.
- **D-02:** Each row shows asset, maintenance type, priority, scheduled date, status, and a short note snippet.
- **D-03:** Within each status group, sort by earliest scheduled date first.
- **D-04:** Blocked records use red-tinted row treatment, blocked badge, and inline blocking-note visibility.

### State update flow
- **D-05:** Asset Manager updates maintenance status inline per row; optional detail modal is available for notes.
- **D-06:** Enforce logical transitions: `scheduled -> in_progress -> completed`, and allow `blocked -> in_progress`.
- **D-07:** Notes are optional for general status changes but required when setting status to `blocked`.
- **D-08:** Status changes update row badges immediately and show a success toast.

### Warranty tracker behavior
- **D-09:** Default ordering is urgency-first: `expiring_soon -> expired -> active -> void`.
- **D-10:** Include search (asset/provider), status filter, and clear-filters control.
- **D-11:** Show end date and relative timing badge (`days left` or `Expired X days ago`).
- **D-12:** `void` warranties remain in the same list with muted styling and reason text.

### Expiry warning style
- **D-13:** Show expiry warnings in both a top summary alert and highlighted tracker rows.
- **D-14:** Use urgency tiers inside the 30-day window: `0-7 days = critical`, `8-30 days = warning`.
- **D-15:** Warnings are visible to all roles with access to maintenance/warranty surfaces.
- **D-16:** Clicking a warning item jumps/filters the tracker to the related asset.

### the agent's Discretion
- Exact copy and iconography for warning/blocked messaging.
- Exact visual intensity values for warning row/background styling within existing design tokens.
- Minor table density and spacing adjustments that do not change decided behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` (Phase 8: Maintenance & Warranty UI) — Scope boundary and success criteria.
- `.planning/REQUIREMENTS.md` (MAINT-01, MAINT-02, MAINT-03, MAINT-04) — Requirement-level acceptance targets for this phase.

### Cross-phase continuity
- `.planning/phases/06-asset-registry-ui/06-CONTEXT.md` — Prior list/filter patterns and role-gating conventions.
- `.planning/phases/07-assignment-return-workflow-ui/07-CONTEXT.md` — Prior status rendering and immediate state-update UX patterns.
- `.planning/STATE.md` — Current milestone context and carried-forward constraints.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `v0-ai-asset-management/lib/data.ts` — `maintenanceRecords`, `warrantyRecords`, and status types already defined for this phase.
- `v0-ai-asset-management/lib/store.tsx` — `maintenanceRecords`, `warrantyRecords`, and `updateMaintenanceStatus` mutation are available for UI wiring.
- `v0-ai-asset-management/components/status-badge.tsx` — Already supports maintenance and warranty status label/styling variants.
- `v0-ai-asset-management/components/sidebar.tsx` — Maintenance navigation item already exists (`/dashboard/maintenance`).

### Established Patterns
- Route pages use client-side table/filter/dialog composition and toast feedback.
- Role checks are page-level and derived from `user.role`.
- Status visuals are centralized through `StatusBadge`.

### Integration Points
- Primary new route target: `v0-ai-asset-management/app/dashboard/maintenance/page.tsx`.
- Shared state source: `StoreProvider` in `v0-ai-asset-management/lib/store.tsx`.
- Header/summary alert patterns can mirror `v0-ai-asset-management/app/dashboard/page.tsx`.

</code_context>

<specifics>
## Specific Ideas

No external visual reference requested; keep consistency with existing dashboard cards/tables/alerts and status-badge language.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-maintenance-warranty-ui*
*Context gathered: 2026-06-10*
