# Phase 12: Assignment Approval Integrity Gap Closure - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix assignment approval integrity so approval-side effects on assets only occur when approval succeeds, eliminating conflict-path desynchronization.

</domain>

<decisions>
## Implementation Decisions

### Conflict behavior
- **D-01:** On approval conflict, keep assignment in pending/requested state.
- **D-02:** Show explicit error toast for the conflict.
- **D-03:** Do not mutate related asset status/assignee on conflict path.

### State mutation integrity
- **D-04:** Use a single guarded store transition that updates assignment and related asset together only on successful approval.
- **D-05:** Preserve existing successful approval behavior: assignment -> active and asset sync to assigned with matching assignee.

### the agent's Discretion
- Exact toast message copy.
- Internal helper naming for guarded transition logic.

</decisions>

<canonical_refs>
## Canonical References

### Gap source and acceptance
- `.planning/v1.1-MILESTONE-AUDIT.md` — root cause and integration-flow gap evidence.
- `.planning/ROADMAP.md` (Phase 12) — goal and success criteria.
- `.planning/REQUIREMENTS.md` — ASGN-02 requirement intent.

### Code surfaces
- `v0-ai-asset-management/lib/store.tsx` — current approval and asset side-effect logic.
- `v0-ai-asset-management/app/dashboard/borrow/page.tsx` — approve/reject UI actions and feedback behavior.

</canonical_refs>

<specifics>
## Specific Ideas

Keep this phase narrowly focused on approval integrity and regression safety. Do not expand scope into broader assignment UX redesign.

</specifics>

<deferred>
## Deferred Ideas

None beyond phase scope.

</deferred>

---

*Phase: 12-assignment-approval-integrity-gap-closure*
*Context gathered: 2026-06-10*
