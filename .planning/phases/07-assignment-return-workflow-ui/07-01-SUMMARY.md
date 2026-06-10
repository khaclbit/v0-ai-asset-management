---
phase: 07-assignment-return-workflow-ui
plan: 01
status: complete
commit: 2f9a77e
---

## Summary

Wave 1 delivered the data model updates and the full borrow page rewrite.

### Task 1 — Data & Store Changes
- `lib/data.ts`: Added `rejectReason?: string` to `AssignmentRecord`
- `lib/store.tsx`: `createAssignment` normalized to always set `status: "requested"` (not `"active"`)
- `lib/store.tsx`: `approveAssignment` now syncs asset `status → "assigned"` on approval
- `lib/store.tsx`: `rejectAssignment(id, reason?)` accepts and persists optional rejection reason

### Task 2 — Borrow Page Rewrite
- Removed old single-modal approach; replaced with full lifecycle UI
- Pending queue card with inline approve/reject actions (Manager only)
- Reject dialog with optional `Textarea` reason input
- Active assignments table with `canInitiateReturn` and `canManage` close actions
- Overdue computed at render-time: `isOverdue: due < today`; row tinted `bg-destructive/5`
- StatCard summary: Available / Pending / Overdue counts in header

### Verification
`npx tsc --noEmit` — ✅ clean
`npm run build` — ✅ clean
