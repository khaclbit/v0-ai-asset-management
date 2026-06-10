# Phase 5: Foundation, Layout & Dashboard - Research (Gap Closure)

**Researched:** 2026-06-10  
**Confidence:** High  
**Discovery Level:** 0 (existing codebase patterns only, no new dependencies)

## Summary

Milestone audit confirms a single remaining functional Phase 5 gap: `DASH-01` KPI-card contract mismatch.  
Current dashboard KPI set includes `Original Value` instead of required `Warranty Expiring Soon`.

The needed closure is low-risk and localized:
1. Update KPI card contract/rendering in `app/dashboard/page.tsx`.
2. Add targeted automated regression tests for KPI labels.
3. Refresh Phase 5 requirement and verification/validation artifacts to align narrative after fix.

## Evidence Snapshot

- **Audit gap source:** `.planning/v1.1-MILESTONE-AUDIT.md`
  - `DASH-01` marked partial; warranty KPI missing from card set.
- **Current implementation source:** `v0-ai-asset-management/app/dashboard/page.tsx`
  - KPI cards: Total Assets, Original Value, Active Assignments, In Maintenance
  - Warranty appears in separate alert panel (`<= 3 months`) and can be reused for KPI metric.
- **Tracker drift source:** `.planning/REQUIREMENTS.md`
  - Phase 5 rows remain pending for multiple FNDN/DASH items; closure docs need synchronization after fix.

## Recommended Implementation Shape

1. Define/lock KPI card contract in a typed helper with test coverage.
2. Render KPI cards from contract-driven data in dashboard page.
3. Remove KPI-slot usage of `Original Value` and use warranty-expiry count instead.
4. Keep warranty alert panel unchanged.
5. Update `.planning` artifacts to reflect post-fix requirement status and verification/validation narrative.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| KPI labels drift again later | Reopens `DASH-01` | Add focused regression tests asserting exact KPI labels and count |
| Over-claiming closure in docs | Invalid sign-off | Anchor verification/validation updates to explicit command evidence |
| Scope creep into other phases | Delays closure | Enforce Phase-5-only file targets |

## Decision Coverage Matrix (for this planning set)

| Decision | Plan | Task | Coverage | Notes |
|---|---|---|---|---|
| D-01 | 05-02 | 1,2 | Full | Strict KPI set implemented + tested |
| D-02 | 05-02 | 2 | Full | Warranty alert panel preserved |
| D-03 | 05-03 | 1,2 | Full | Requirement + verification/validation refresh |
| D-04 | 05-02,05-03 | all | Full | File scope restricted to dashboard + Phase 5 artifacts |
| D-05 | 05-02 | 1,2 | Full | Vitest/tsc automated checks |

## Sources

- `.planning/v1.1-MILESTONE-AUDIT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/05-foundation-layout-dashboard/05-01-PLAN.md`
- `.planning/phases/05-foundation-layout-dashboard/05-01-SUMMARY.md`
- `.planning/phases/05-foundation-layout-dashboard/05-VERIFICATION.md`
- `.planning/phases/05-foundation-layout-dashboard/05-VALIDATION.md`
- `v0-ai-asset-management/app/dashboard/page.tsx`
- `v0-ai-asset-management/vitest.config.ts`
