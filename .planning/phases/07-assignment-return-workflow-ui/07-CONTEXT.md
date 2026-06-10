# Phase 7: Assignment & Return Workflow UI - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver assignment and return workflow UI covering request creation, manager approval/rejection, lifecycle status badges, return initiation/closure, and overdue visual distinction.

</domain>

<decisions>
## Implementation Decisions

### Request form UX
- **D-01:** Use a single modal form with inline validation for asset, assignee, and expected return date.
- **D-02:** Submitting the form immediately creates a new row in `requested` status.

### Approval queue behavior
- **D-03:** Use a dedicated pending requests section for Asset Manager actions.
- **D-04:** Provide inline approve/reject actions in queue rows.
- **D-05:** Rejection supports an optional reason note.

### Return and closure permissions
- **D-06:** Staff and Asset Manager can initiate returns for active assignments.
- **D-07:** Only Asset Manager can validate and close a return.

### Overdue visual treatment
- **D-08:** Overdue assignments use both an overdue badge and subtle red-tinted row background.
- **D-09:** Show overdue count summary in the page header/stat area.

### the agent's Discretion
- Exact copy for optional reject reason capture and display.
- Exact shade intensity for overdue row tint within existing theme tokens.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and acceptance
- `.planning/ROADMAP.md` (Phase 7: Assignment & Return Workflow UI) — Goal and success criteria.
- `.planning/REQUIREMENTS.md` (ASGN-01 to ASGN-06) — Requirement-level acceptance targets.

### Cross-phase continuity
- `.planning/phases/06-asset-registry-ui/06-CONTEXT.md` — Prior role-gating and UI interaction conventions carried into assignment workflow.
- `.planning/STATE.md` — Current milestone and sequence context.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `v0-ai-asset-management/app/dashboard/borrow/page.tsx` — Existing assignment list, dialog form, status badges, and return action shell.
- `v0-ai-asset-management/lib/store.tsx` — Existing assignment lifecycle methods: `createAssignment`, `approveAssignment`, `rejectAssignment`, `initiateReturn`, `closeAssignment`.
- `v0-ai-asset-management/components/status-badge.tsx` — Existing assignment status badge styling (`requested`, `active`, `overdue`, `closed`, `rejected`).

### Established Patterns
- Role checks derived from `user.role` in page-level components.
- Dialog + form actions with `sonner` feedback.
- Base UI select null-guard pattern `onValueChange={(v) => v && setX(v)}`.

### Integration Points
- Route surface: `v0-ai-asset-management/app/dashboard/borrow/page.tsx`.
- Assignment state source: `assignmentRecords` and related mutators in `StoreProvider`.
- Asset status synchronization on assignment close in `lib/store.tsx`.

</code_context>

<specifics>
## Specific Ideas

No external visual reference requested; maintain consistency with existing dashboard cards/tables/dialog patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-assignment-return-workflow-ui*
*Context gathered: 2026-06-10*
