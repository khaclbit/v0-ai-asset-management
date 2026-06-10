# Phase 6: Asset Registry UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 06-asset-registry-ui
**Areas discussed:** list behavior, form behavior, retire rules, search/filter UX

---

## List behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Server-style pagination UX | Page size selector (10/25/50), sticky filters, clickable row for edit | ✓ |
| Simple client pagination only | Fixed size 10, edit from actions menu only | |
| No pagination | Long scrolling table | |

**User's choice:** Server-style pagination UX with page size selector (10/25/50), sticky filters, and clickable row for edit.
**Notes:** Selected recommended option.

---

## Form behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Required core fields + editable lifecycle | Require name/category/serial/purchase date/price/status; auto-generate ID on create; lifecycle editable in create/edit | ✓ |
| Minimal required fields | Only name and serial required | |
| Strict role-based form restrictions | Admin edits all fields; Asset Manager cannot change lifecycle | |

**User's choice:** Require name/category/serial/purchase date/price/status, auto-generate ID on create, and keep lifecycle editable in create/edit.
**Notes:** Selected recommended option.

---

## Retire rules

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-only retire with confirmation | Confirmation dialog required; retire clears assignee and moves to Disposal Storage | ✓ |
| Admin + Asset Manager retire | Both roles allowed, with confirmation | |
| Soft-retire without confirmation | Toggle status only, no confirmation dialog | |

**User's choice:** Only Admin can retire; always show confirmation; set status to retired, clear assignee, set location to Disposal Storage.
**Notes:** Selected recommended option.

---

## Search/filter UX

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced search + combinable filters + clear action | Search by name/ID/serial with debounce; category and status combine; one-click clear | ✓ |
| Search-on-submit + apply button | Search on Enter; filters apply on explicit action | |
| Instant filtering without clear control | Current behavior with no dedicated clear action | |

**User's choice:** Debounced search on name/ID/serial, combinable category/status filters, one-click clear filters.
**Notes:** Selected recommended option.

---

## the agent's Discretion

- Debounce duration and pagination control micro-UX.
- Table layout details across viewport sizes.

## Deferred Ideas

None captured during this discussion.
