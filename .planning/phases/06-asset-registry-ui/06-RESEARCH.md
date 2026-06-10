# Phase 6: Asset Registry UI - Research

**Researched:** 2026-06-10  
**Scope:** List, create/edit, retire, filter/search behaviors for ASSET-01..06

## Existing Assets to Reuse

- `v0-ai-asset-management/app/dashboard/assets/page.tsx` already contains asset table, search, category/status filters, edit dialog wiring, and retire dialog shell.
- `v0-ai-asset-management/components/asset-form-dialog.tsx` already supports create/edit with typed fields and required inputs.
- `v0-ai-asset-management/components/status-badge.tsx` already renders lifecycle badges.
- `v0-ai-asset-management/lib/store.tsx` already provides `addAsset`, `updateAsset`, `retireAsset`.
- `v0-ai-asset-management/lib/data.ts` already provides `Asset`, `AssetStatus`, `CATEGORIES`, and `formatCurrency`.

## Gap Analysis vs Context Decisions

1. **Pagination missing:** list is currently filtered only; no page state / page size controls.
2. **Debounce + clear missing:** search updates instantly; no explicit clear-filters action.
3. **Retire permission mismatch:** retire UI currently follows `canEdit` (Admin + Asset Manager), but context locks retire to Admin only.
4. **Row click edit missing:** edit exists in dropdown action; context locks clickable row edit.

## Recommended Implementation Sequence

1. Split permissions (`canCreateEdit` vs `canRetireAdminOnly`).
2. Add debounced search + clear filters action.
3. Add pagination state and controls (10/25/50).
4. Add row-click edit behavior while keeping explicit retire action.
5. Run build + manual checks against ASSET-01..06.

## Risks and Mitigations

- **Accidental scope creep:** keep changes inside assets route + existing shared components/store APIs.
- **Role regression:** lock retire action to Admin-only in UI logic and action visibility.
- **Inconsistent UX patterns:** keep existing select null-guard pattern `onValueChange={(v) => v && setX(v)}` and existing toast pattern.

## Validation Architecture

- No repository test suite is currently established for this module.
- Primary automated gate: `npm run build`.
- Manual acceptance checklist must explicitly cover ASSET-01..06, especially:
  - paginated table with lifecycle badges
  - create/edit flows by role
  - Admin-only retire with confirmation
  - combinable filters + search by name/serial (+id support remains acceptable)

## Security Notes (UI Layer)

- Enforce UI access control for retire action (Admin only).
- Preserve required field validation in form inputs.
- No backend/auth persistence changes in this phase (mock data milestone).

## RESEARCH COMPLETE
