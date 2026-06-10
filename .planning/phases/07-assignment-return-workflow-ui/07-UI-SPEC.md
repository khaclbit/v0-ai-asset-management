---
phase: 7
slug: assignment-return-workflow-ui
status: approved
created: 2026-06-10
reviewed_at: 2026-06-10
---

# Phase 7 — UI Design Contract

## Copy and Interaction Contract

- Primary CTA: **New Assignment Request**
- Request modal fields: asset, assignee, expected return date (required)
- New requests appear in **Pending** with status `requested`
- Pending queue actions (Asset Manager): **Approve** / **Reject**
- Return flow: **Initiate Return** (Staff, Asset Manager), **Close Return** (Asset Manager only)
- Overdue treatment: overdue badge + subtle red row tint + overdue count in summary stats

## Visual Contract

- Reuse existing cards/tables/dialog components from dashboard pattern.
- Keep status chips consistent with `StatusBadge` styles.
- Keep overdue highlight subtle: tinted row background with readable text contrast.

## Typography and Spacing

- Reuse existing app typography scale and spacing system from Phase 6.
- Maintain compact table-density for assignment list readability.

## Role Visibility Rules

- Staff: can create request, see own relevant actions, can initiate return.
- Asset Manager: can create, approve/reject pending, initiate return, close return.
- Admin/Auditor: read-only unless explicitly mapped by requirements in this phase.
