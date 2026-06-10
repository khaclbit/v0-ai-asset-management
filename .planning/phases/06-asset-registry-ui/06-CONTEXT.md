# Phase 6: Asset Registry UI - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the Asset Registry UI so users can browse assets with lifecycle badges, and Admin/Asset Manager can create/edit assets while Admin can retire assets with confirmation, plus category/status filters and search by name/serial.

</domain>

<decisions>
## Implementation Decisions

### List behavior
- **D-01:** Use pagination UI with page size selector (10/25/50), sticky filters, and row click to open edit.

### Form behavior
- **D-02:** Require name, category, serial, purchase date, price, and lifecycle status.
- **D-03:** Auto-generate asset ID on create.
- **D-04:** Keep lifecycle status editable in both create and edit flows.

### Retire action and permissions
- **D-05:** Only Admin can retire assets.
- **D-06:** Always show a retirement confirmation dialog before applying state changes.
- **D-07:** Retire action sets `status=retired`, clears `assignee`, and sets location to `Disposal Storage`.

### Search and filter UX
- **D-08:** Search across asset name, asset ID, and serial with debounced input.
- **D-09:** Category and lifecycle filters are combinable.
- **D-10:** Provide one-click "clear filters" behavior.

### the agent's Discretion
- Exact debounce duration and pagination control placement in toolbar.
- Table density and responsive column collapsing behavior.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance targets
- `.planning/ROADMAP.md` (Phase 6: Asset Registry UI) — Goal, dependency, and success criteria for paginated list, forms, retirement flow, filters, and search.
- `.planning/REQUIREMENTS.md` (ASSET-01 to ASSET-06) — Requirement-level acceptance criteria for asset registry behaviors.

### Cross-phase constraints
- `.planning/STATE.md` — Current milestone status and carry-forward decisions from Phase 5.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `v0-ai-asset-management/app/dashboard/assets/page.tsx` — Existing registry page shell with toolbar, filters, table, row actions, and confirmation dialog.
- `v0-ai-asset-management/components/asset-form-dialog.tsx` — Reusable create/edit asset dialog with typed fields and required inputs.
- `v0-ai-asset-management/components/status-badge.tsx` — Shared badge rendering for lifecycle states.
- `v0-ai-asset-management/lib/store.tsx` — In-memory mutation API (`addAsset`, `updateAsset`, `retireAsset`) and role-aware user context.
- `v0-ai-asset-management/lib/data.ts` — Domain types (`Asset`, `AssetStatus`, `AssetCategory`) and constants (`CATEGORIES`).

### Established Patterns
- Role gating via derived booleans in page components (`canEdit`) based on `user.role`.
- UI feedback via `sonner` toasts for create/update/retire actions.
- Local filtering with `useMemo` and controlled inputs/selects.
- Base UI select guard pattern: `onValueChange={(v) => v && setter(v)}`.

### Integration Points
- Route surface: `v0-ai-asset-management/app/dashboard/assets/page.tsx`.
- Dialog/form integration: `AssetFormDialog` + store mutations.
- State source of truth: `StoreProvider` in `v0-ai-asset-management/lib/store.tsx`.

</code_context>

<specifics>
## Specific Ideas

No specific visual reference requirements — prioritize consistency with the current dashboard UI and existing component patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-asset-registry-ui*
*Context gathered: 2026-06-10*
