---
phase: 07-assignment-return-workflow-ui
plan: 02
status: complete
commit: 2f9a77e
---

## Summary

Wave 2 tasks were fully covered by the Wave 1 borrow page implementation. No additional code changes required.

### Task 1 — Role-gated return initiation and manager-only close
Already implemented in borrow/page.tsx:
- `canInitiateReturn = role === "Asset Manager" || role === "Staff"`
- `canManage = role === "Asset Manager"` — enforced in `handleClose` handler
- `closeAssignment` syncs asset back to `"available"`

### Task 2 — Overdue auto-highlighting and summary count
Already implemented in borrow/page.tsx:
- `isOverdue: due < today` derived at render-time (no status mutation)
- `TableRow className={cn(r.isOverdue && "bg-destructive/5")}`
- `StatusBadge status={r.isOverdue ? "overdue" : r.status}`
- `overdueCount` shown in Topbar subtitle and StatCard

### Verification
`npm run build` — ✅ clean (all 9 static routes generated)
