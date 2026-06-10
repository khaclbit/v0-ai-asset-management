---
phase: 9
slug: ai-governance-uis
status: approved
shadcn_initialized: true
preset: b2fA
created: 2026-06-10
reviewed_at: 2026-06-10
---

# Phase 9 — UI Design Contract

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
| xs | 4px | badge/icon gap, inline metadata separators |
| sm | 8px | compact control spacing, card metadata rows |
| md | 16px | default section/content spacing |
| lg | 24px | panel section spacing |
| xl | 32px | page area separation |
| 2xl | 48px | major route-level separation |

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
| Secondary (30%) | `--card`, `--secondary`, `--muted` | cards, trace panels, metadata strips |
| Accent (10%) | `--primary` | primary CTAs, active state highlights, focus rings |
| Critical | `--destructive` | overdue SLA escalation, blocked low-confidence submission surfaces |

Accent is reserved for interactive emphasis only, not passive descriptive text.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Assistant CTA | Ask Assistant |
| OCR CTA | Analyze Document |
| Predictive High-risk CTA | Approve Recommendation |
| Predictive Alternate CTA | Defer Recommendation |
| Empty state heading | No AI records available |
| Empty state body | No matching AI responses or recommendations were found. Adjust filters or submit a new request to continue. |
| Error/low-confidence state | Insufficient data to provide a reliable answer. Review clarifying questions or provide additional details. |
| Destructive confirmation | Defer Recommendation: This will postpone action and keep the item visible in escalation tracking. |

## Interaction Contract (Locked)

1. **Shared contracts across Assistant/OCR/Predictive**
   - `correlation_id` uses one shared label (`Correlation ID`) and compact monospace style.
   - Confidence band thresholds are shared and fixed across all pages:
     - High: `>= 0.85`
     - Medium: `>= 0.60 and < 0.85`
     - Low: `< 0.60`
   - Provenance/trace sections are collapsed by default and expandable on demand.
   - Every page follows the same hierarchy: top summary area, primary interaction area, secondary detail area.

2. **Assistant response contract**
   - Use a single response card containing: answer (or insufficient-data message), source, filters, confidence score + band, and correlation_id.
   - Low-confidence path must not claim a definitive answer and must include clarifying suggestions.
   - Trace panel is read-only and displays provenance metadata for each response.

3. **OCR confidence-routing contract**
   - Upload result always displays confidence score + band at top of extraction area.
   - High confidence renders read-only extracted summary plus a single confirm action.
   - Medium confidence renders field-by-field review for mandatory fields before enabling submit.
   - Low confidence blocks submit and shows rejection/rescan guidance.
   - Submit stays disabled until Name, Category, Serial, Purchase Date, Vendor, and Price are confirmed.

4. **Predictive recommendations contract**
   - Card order is deterministic: risk descending, then confidence descending.
   - Each card always shows risk band, confidence score, top factors, and correlation_id.
   - High-risk cards include SLA countdown and escalation notice once overdue.
   - Approve/Defer actions for high-risk cards are visible and active only for Asset Manager.
   - Non-Asset-Manager roles see read-only state for these actions.

## Registry Safety

Use existing shadcn/base-ui components already in repo: card, badge, button, input, textarea, table, select, dialog, collapsible/accordion, sonner toast.

## UI-SPEC COMPLETE
