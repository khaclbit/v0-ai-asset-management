# Phase 11: Navigation & Access Control Gap Closure - Research

**Researched:** 2026-06-10
**Confidence:** High

## Scope alignment
- Phase 11 cleanly targets the three audited gaps: broken `/dashboard/audit` navigation, direct-URL RBAC bypass, and preserving login/logout behavior.
- Required requirements are limited to `FNDN-03`, `FNDN-04`, `FNDN-06`.

## Codebase findings

### Existing assets to reuse
- `v0-ai-asset-management/components/sidebar.tsx`
  - Already contains role-based module visibility matrix and logout action.
- `v0-ai-asset-management/app/dashboard/layout.tsx`
  - Already contains authentication gate and redirect hook point for route-level authorization.
- `v0-ai-asset-management/lib/data.ts` and `lib/store.tsx`
  - Provide canonical `UserRole` source for guard checks.

### Verified gap evidence
- Sidebar includes `/dashboard/audit` navigation but route did not exist.
- Dashboard layout validates auth presence but not route authorization, allowing direct URL bypass.

## Locked implementation decisions (from 11-CONTEXT.md)
- Create a temporary `/dashboard/audit` placeholder route in this phase.
- Enforce route-level RBAC using the same access matrix semantics as sidebar visibility.
- Unauthorized direct-route access redirects to `/dashboard` with access-denied feedback.
- Keep login/logout and role-aware navigation behavior unchanged.

## Planning implications
- Introduce one shared route-access helper as source of truth for path-role permissions.
- Refactor sidebar to consume shared matrix to prevent policy drift.
- Extend dashboard layout with route-level authorization guard (pathname + role check).
- Add read-only audit placeholder page with explicit “full module in Phase 10” messaging.
- Add focused tests for route guard behavior and navigation integrity.

## Risks
- Matrix duplication across files can reintroduce drift; centralize policy.
- Guard side effects can create redirect loops if not gated correctly.
- Placeholder page must remain read-only and non-functional to avoid scope creep into Phase 10.

## Recommendation
- Plan Phase 11 in two waves:
  1. Shared route-access contract + sidebar/audit-route integrity.
  2. Layout guard + access-denied UX + regression tests.

## RESEARCH COMPLETE
