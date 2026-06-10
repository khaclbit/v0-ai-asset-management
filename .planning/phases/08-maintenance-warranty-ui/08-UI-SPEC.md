---
phase: 8
slug: maintenance-warranty-ui
status: approved
shadcn_initialized: true
preset: b2fA
created: 2026-06-10
---

# Phase 8 — UI Design Contract

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn |
| Preset | b2fA (base-nova, neutral, lucide, geist) |
| Component library | base-ui (via shadcn wrappers) |
| Icon library | lucide-react |
| Font | Geist Sans, Geist Mono |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | icon gaps, tight badge spacing |
| sm | 8px | compact row/control spacing |
| md | 16px | default card/table/filter spacing |
| lg | 24px | section spacing |
| xl | 32px | major section separation |
| 2xl | 48px | page-level block separation |

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | 28px | 600 | 1.2 |

## Color Contract

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--background` | page and base surfaces |
| Secondary (30%) | `--card`, `--secondary`, `--muted` | grouped sections and filter bars |
| Accent (10%) | `--primary` | active controls, focus rings, selected warning item |
| Critical | `--destructive` | blocked maintenance rows and critical (0-7 day) warranty warnings |

Accent is reserved for interactive emphasis only, not passive table text.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Update Status |
| Empty state heading | No maintenance or warranty records found |
| Empty state body | No records match your current search or filters. Clear filters or adjust status criteria to continue. |
| Error state | We could not apply this status change. Check transition rules and add a blocking note when setting status to Blocked. |
| Destructive confirmation | Not used in this phase |

## Interaction Contract (Locked)

1. **Maintenance list**
   - Group by status sections: `scheduled`, `in_progress`, `completed`, `blocked`.
   - Row shows asset, type, priority, scheduled date, status badge, note snippet.
   - Sort each group by earliest scheduled date first.
   - `blocked` rows use red-tinted style + blocked badge + inline blocking note.

2. **Maintenance state update**
   - Asset Manager updates status inline; optional detail modal for notes.
   - Enforce transitions: `scheduled -> in_progress -> completed`, `blocked -> in_progress`.
   - Notes optional generally, required when setting `blocked`.
   - Immediate badge update + success toast.

3. **Warranty tracker**
   - Default order: `expiring_soon -> expired -> active -> void`.
   - Controls: search (asset/provider), status filter, clear filters.
   - Show end date + relative badge (`X days left` / `Expired X days ago`).
   - Keep `void` in main list with muted style and reason text.

4. **Expiry warnings (<=30 days)**
   - Show top summary alert and highlighted warranty rows.
   - Severity tiers: `0-7 days = critical`, `8-30 days = warning`.
   - Visible to all roles with maintenance/warranty page access.
   - Clicking warning item jumps/filters to the related tracker row.

## Registry Safety

Use only existing shadcn/base-ui components already present in repo: card, table, badge, select, input, button, dialog, sonner.

## UI-SPEC COMPLETE
