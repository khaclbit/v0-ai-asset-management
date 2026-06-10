# Codebase Concerns

**Analysis Date:** 2026-06-09

## Summary of Top Concerns

1. Authentication and authorization are demo-level and bypassable (`app/page.tsx`, `lib/store.tsx`, `components/sidebar.tsx`).
2. Core data is not persisted and is lost on refresh (`lib/store.tsx`).
3. Type safety is weakened because TypeScript build errors are ignored (`next.config.mjs`).
4. No automated tests were detected in the repository (`v0-ai-asset-management/` scan).
5. CI and deployment controls are unclear from repository files (`README.md`, no `.github/workflows/*` detected).

## Tech Debt

**Client only domain logic and state:**
- Issue: Business rules and mutations are in client store/components.
- Files: `lib/store.tsx`, `app/dashboard/assets/page.tsx`, `app/dashboard/borrow/page.tsx`, `app/dashboard/reports/page.tsx`
- Impact: Hard to secure, audit, and scale for multi-user behavior.
- Fix approach: Move critical logic to server APIs/actions and keep client store as UI cache.

**Build allows TypeScript errors:**
- Issue: `ignoreBuildErrors` is enabled.
- Files: `next.config.mjs`
- Impact: Runtime defects can ship while type errors exist.
- Fix approach: Disable `ignoreBuildErrors` and fail CI on type errors.

## Known Bugs

**Overdue status is not derived from due date:**
- Symptoms: Borrow records are overdue only when status is explicitly set to `Quá hạn`.
- Files: `lib/data.ts`, `app/dashboard/borrow/page.tsx`, `lib/store.tsx`
- Trigger: Borrow with past `dueDate`; record can remain `Đang mượn`.
- Workaround: Manual status updates in data.

**Object URL cleanup missing in OCR upload preview:**
- Symptoms: `URL.createObjectURL` is used without explicit revoke.
- Files: `app/dashboard/ocr/page.tsx`
- Trigger: Repeated uploads in long sessions.
- Workaround: Refresh page.

## Security Considerations

**No credential verification at login:**
- Risk: Form submit logs in without password validation.
- Files: `app/page.tsx`, `lib/store.tsx`
- Current mitigation: None detected.
- Recommendations: Add server auth, session management, and credential checks.

**Authorization enforced in UI only:**
- Risk: Admin functions are hidden in UI but not enforced by backend checks.
- Files: `components/sidebar.tsx`, `app/dashboard/assets/page.tsx`, `app/dashboard/ocr/page.tsx`, `lib/store.tsx`
- Current mitigation: Role-based rendering.
- Recommendations: Enforce permissions on server endpoints/actions for each privileged mutation.

**Business and identity-like data committed as source data:**
- Risk: Employee emails and asset inventory details are stored in code.
- Files: `lib/data.ts`
- Current mitigation: None detected.
- Recommendations: Move to protected data storage and sanitize demo records for public distribution.

## Performance Bottlenecks

**Repeated derived calculations in render paths:**
- Problem: Depreciation and risk metrics are recomputed across pages and tables.
- Files: `app/dashboard/page.tsx`, `app/dashboard/assets/page.tsx`, `app/dashboard/reports/page.tsx`, `lib/data.ts`
- Cause: Per-render iteration over in-memory arrays with repeated function calls.
- Improvement path: Centralize memoized selectors and precompute metrics on data change.

**All reporting and assistant logic executes on client:**
- Problem: No server aggregation, pagination, or query delegation.
- Files: `app/dashboard/page.tsx`, `app/dashboard/reports/page.tsx`, `app/dashboard/assistant/page.tsx`
- Cause: Fully client-rendered architecture.
- Improvement path: Move heavy data operations to backend APIs.

## Fragile Areas

**Borrow and return consistency relies on nested state updates:**
- Files: `lib/store.tsx`
- Why fragile: `assets` and `borrowRecords` are updated in coupled callbacks.
- Safe modification: Use reducer with explicit action invariants and transition tests.
- Test coverage: No automated tests detected.

**Identifier generation with random numbers:**
- Files: `lib/store.tsx`, `components/asset-form-dialog.tsx`, `app/dashboard/ocr/page.tsx`
- Why fragile: Collisions are possible and uniqueness is not validated.
- Safe modification: Use UUIDs and uniqueness checks.
- Test coverage: No collision tests detected.

## Scaling Limits

**Session-local in-memory state only:**
- Current capacity: Small dataset in one browser session.
- Limit: Data loss on refresh and no cross-user consistency.
- Scaling path: Add persistent database and API.

**Client-side filtering and sorting for all records:**
- Current capacity: Works for demo-sized arrays.
- Limit: Slower UI with larger datasets.
- Scaling path: Implement backend pagination, search, and server-side aggregates.

## Dependencies at Risk

**Quality gate toolchain is incomplete in repo:**
- Risk: No test scripts/config and no detected test framework files.
- Impact: Regressions can ship undetected.
- Migration plan: Add test runner, coverage, and CI quality gates.

**Framework stack safety is reduced by current build settings:**
- Risk: `next@16.2.6` + `react@19` with ignored TS build errors increases uncertainty.
- Impact: Compatibility or regression issues are harder to catch early.
- Migration plan: Pin known-good versions and enforce CI checks.

## Missing Critical Features

**Persistent backend data layer:**
- Problem: Asset and borrow workflows are not durable.
- Blocks: Reliable multi-user operation and auditability.

**Server-side auth and audit trail:**
- Problem: No backend permission enforcement or audit log.
- Blocks: Production-grade security and compliance workflows.

## Test Coverage Gaps

**Core workflows untested:**
- What is not tested: Login flow, role gating, asset CRUD, borrow-return transitions, depreciation-risk calculations, OCR asset creation.
- Files: `app/page.tsx`, `lib/store.tsx`, `lib/data.ts`, `app/dashboard/assets/page.tsx`, `app/dashboard/borrow/page.tsx`, `app/dashboard/ocr/page.tsx`
- Risk: Critical behavior can regress silently.
- Priority: High

**Uncertainty note:**
- No `*.test.*` or `*.spec.*` files were detected.
- No CI workflow files were detected in `.github/workflows/`.
- External pipelines may exist but are not visible in this repository snapshot.

---

*Concerns audit: 2026-06-09*
