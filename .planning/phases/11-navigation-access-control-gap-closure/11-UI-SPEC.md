---
phase: 11
slug: navigation-access-control-gap-closure
status: approved
shadcn_initialized: true
preset: b2fA
created: 2026-06-10
reviewed_at: 2026-06-10
---

# Phase 11 — UI Design Contract

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | b2fA (base-nova, neutral, lucide, geist) |
| Component library | base-ui (via shadcn wrappers) |
| Icon library | lucide-react |
| Font | Geist Sans, Geist Mono |

## Typography and Spacing

- Reuse existing dashboard typography scale and spacing tokens.
- Access-denied messaging should use standard alert/banner styling already present in dashboard pages.
- Placeholder page should use the standard page header + body card pattern (summary/body hierarchy).

## Color Contract

- Access-denied feedback uses `--destructive` accents for message emphasis.
- Placeholder informational copy uses `--muted-foreground` and `--secondary` surfaces.
- Avoid introducing any new custom color tokens in this phase.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Access-denied feedback | Access denied for this module. Redirecting to dashboard. |
| Audit placeholder heading | Audit Log module is scheduled for Phase 10 |
| Audit placeholder body | This page is a temporary placeholder to keep navigation consistent until full audit log functionality is delivered. |
| Primary action on placeholder | Back to Dashboard |

## Interaction Contract (Locked)

1. Sidebar navigation should never route to a missing page (no 404 from visible nav item).
2. `/dashboard/audit` exists as read-only placeholder and must not expose editable/log simulation controls.
3. Unauthorized direct-route access redirects to `/dashboard` and shows access-denied feedback.
4. Route-level access checks must follow the same role matrix semantics as sidebar visibility.
5. Login/logout and standard dashboard navigation interactions must remain unchanged.

## Registry Safety

Use existing primitives only: layout shell, card, button, alert/toast components, and existing role state from store context.

## UI-SPEC COMPLETE
