# Phase 12: Assignment Approval Integrity Gap Closure - Research

**Researched:** 2026-06-10
**Confidence:** High

## Scope alignment
- Phase 12 targets `ASGN-02` integrity: approval should mutate assignment+asset only on true success.
- Current gap source is milestone audit finding on approval conflict side-effects.

## Codebase findings

### Existing assets to reuse
- `v0-ai-asset-management/lib/store.tsx`
  - Contains `approveAssignment` and related assignment/asset mutations.
- `v0-ai-asset-management/app/dashboard/borrow/page.tsx`
  - Contains approve action UI and toast feedback path.

### Verified gap evidence
- Approval flow lacks an explicit structured success/failure contract.
- UI currently assumes approval success path too broadly and needs explicit conflict handling feedback.

## Locked decisions (from 12-CONTEXT.md)
- Conflict path keeps assignment pending/requested.
- Conflict path shows error toast and must not mutate asset side effects.
- Use one guarded transition that updates assignment + asset together only on successful approval.
- Preserve existing successful approval semantics.

## Planning implications
- Introduce explicit `approveAssignment` result contract (`ok`/failure reason).
- Refactor store approval flow to enforce atomic success-only side effects.
- Update borrow page approve handler to branch toasts by result.
- Add tests for success and conflict paths to prevent regression.

## Risks
- Splitting mutation logic across multiple setters can reintroduce desync.
- Missing UI failure branch can hide conflicts from users.

## Recommendation
- Plan in one focused wave:
  1. Guarded store transition + tests.
  2. Borrow page handler/result feedback + tests.

## RESEARCH COMPLETE
