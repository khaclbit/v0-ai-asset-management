# Phase 7: Assignment & Return Workflow UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves alternatives considered.

**Date:** 2026-06-10
**Phase:** 07-assignment-return-workflow-ui
**Areas discussed:** request form UX, approval queue behavior, return/closure permissions, overdue visual treatment

---

## Request form UX

| Option | Description | Selected |
|--------|-------------|----------|
| Single modal form | Asset + assignee + expected return date, inline validation, immediate `requested` row creation | ✓ |
| Full page wizard | Multi-step flow | |
| Quick drawer | Minimal fields first | |

**User's choice:** Single modal form with inline validation and immediate `requested` row creation.
**Notes:** Selected recommended option.

---

## Approval queue behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated pending section | Inline approve/reject actions with optional reject reason note | ✓ |
| Single mixed list | Approve/reject via row menu | |
| Detail-first approvals | Must open detail drawer first | |

**User's choice:** Dedicated pending section with inline approve/reject and optional reject reason.
**Notes:** Selected recommended option.

---

## Return and closure permissions

| Option | Description | Selected |
|--------|-------------|----------|
| Staff/Asset Manager initiate; Manager closes | Role split for return lifecycle | ✓ |
| Manager only for both steps | Strict manager-only flow | |
| Any role may do both | Broad permissions | |

**User's choice:** Staff or Asset Manager initiate return; only Asset Manager validates/closes.
**Notes:** Selected recommended option.

---

## Overdue visual treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Badge + subtle red row tint + header count | Overdue signal in list and summary area | ✓ |
| Badge only | No row styling | |
| Separate overdue card section only | Pulls overdue rows out of main list | |

**User's choice:** Overdue badge + subtle red row tint + header overdue count.
**Notes:** Selected recommended option.

---

## the agent's Discretion

- Exact reject-reason note microcopy.
- Exact overdue tint intensity token choice.

## Deferred Ideas

None captured during this discussion.
