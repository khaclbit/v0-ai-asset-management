## issues_found

Three issues found and fixed in commit 3461911.

### WR-01 — FIXED: setAssets nested inside setAssignmentRecords updater
`approveAssignment` and `closeAssignment` called `setAssets` from inside functional updaters passed to `setAssignmentRecords`. React StrictMode double-invokes updaters, causing double asset state mutations.
**Fix:** Extracted asset sync to top-level `setAssignmentRecords` call after the records update.

### WR-02 — FIXED: Double-approval conflict not guarded
Two pending requests for the same asset could both be approved, producing two concurrent `active` records.
**Fix:** `approveAssignment` now checks `rec.status === "requested"` and no concurrent `active`/`overdue` record exists for the same asset before proceeding.

### WR-03 — FIXED: Narrow random ID space (9000 values)
Assignment IDs used `AR-${Math.floor(1000 + Math.random() * 9000)}` — only 9000 possible values.
**Fix:** Changed to `AR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` for collision-resistant IDs.
