# Phase 7: Assignment & Return Workflow UI - Research

**Researched:** 2026-06-10

## Key Findings

- Existing foundation already lives in `v0-ai-asset-management/app/dashboard/borrow/page.tsx` and `lib/store.tsx`.
- Current create flow sets new records to `active`; Phase 7 requires new requests to start at `requested`.
- Existing store already provides lifecycle methods: `createAssignment`, `approveAssignment`, `rejectAssignment`, `initiateReturn`, `closeAssignment`.
- Existing `StatusBadge` already supports assignment states (`requested`, `active`, `overdue`, `closed`, `rejected`).

## Locked-Decision Alignment

- Use modal request form with inline validation.
- Create request enters `requested` state immediately.
- Keep dedicated pending queue for manager inline approve/reject.
- Allow Staff/Asset Manager return initiation, but manager-only close.
- Highlight overdue via badge + row tint + overdue count summary.

## Risks

1. Request state bug if creation remains `active`.
2. Missing role guards on approval/closure actions.
3. Overdue display can drift if not derived consistently from status/date rules.

## Recommended Sequence

1. Fix request creation state + pending queue model.
2. Apply role-gated approve/reject/close actions.
3. Add overdue visuals and header summary.
4. Run lint/build and manual requirement checks for ASGN-01..06.

## Validation Architecture

- Quick check per task: `npm run lint`
- Full check per wave: `npm run build`
- Manual acceptance checklist required for ASGN-01..06 interaction flows

## RESEARCH COMPLETE
