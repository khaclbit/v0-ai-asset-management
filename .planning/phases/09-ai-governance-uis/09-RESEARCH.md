# Phase 9: AI Governance UIs - Research

**Researched:** 2026-06-10
**Confidence:** High

## Scope alignment
- Goal and requirements (AIST-01..04, OCR-01..06, PRED-01..05) align with current UI-only mock-data architecture.
- No backend/API integration is required in this phase; all behaviors can be implemented with client-state and deterministic mock logic.

## Codebase findings

### Existing assets to reuse
- `v0-ai-asset-management/app/dashboard/assistant/page.tsx`
  - Already provides question input, message timeline, and assistant response rendering shell.
- `v0-ai-asset-management/lib/assistant.ts`
  - Already returns grounded response payload with `answer`, `query`, `confidence.sufficient_data`, and `trace` containing `source`, `filters`, `correlation_id`, `generated_at`.
- `v0-ai-asset-management/app/dashboard/ocr/page.tsx`
  - Already implements file intake, confidence banding (`high|medium|low`), and mandatory-field confirmation gate before submit.
- `v0-ai-asset-management/components/status-badge.tsx`
  - Already supports risk level badges (`High`, `Medium`, `Low`) and can be extended for shared confidence-band styling contract.
- `v0-ai-asset-management/lib/data.ts`
  - Includes `failureRisk(asset)` utility and maintenance seed records with risk-based notes, useful for predictive recommendation generation.
- `v0-ai-asset-management/components/sidebar.tsx`
  - Predictive route nav entry (`/dashboard/predictive`) is already present for Admin/Asset Manager roles.

### Established patterns to follow
- Role-gated actions are page-level checks from `user.role` in store context.
- Top summary + body + secondary details layout pattern is already used in dashboard pages and should be mirrored across assistant/OCR/predictive per D-15.
- Interaction feedback uses disabled-state gating and toasts rather than server errors.
- Status/risk semantics are expressed with badges plus subtle tinted backgrounds.

## User decision fidelity implications (locked)
- Assistant UI must consolidate answer/source/filters/confidence/correlation_id into one response card (D-01), with low-confidence "insufficient data" variant and clarifying prompts (D-02), and collapsed-by-default trace panel (D-03).
- OCR must preserve confidence-first routing with explicit top confidence display (D-04), quick-confirm for high (D-05), mandatory field-by-field review for medium (D-06), and blocked submit + rescan guidance for low (D-07).
- Predictive must sort cards by risk desc then confidence desc (D-08), restrict approve/defer actions to Asset Manager for high-risk cards (D-09), include SLA countdown and overdue escalation surfaces (D-10), and always show risk/confidence/factors/correlation_id per card (D-11).
- Cross-module consistency must normalize `correlation_id` label/format and confidence badge contract (D-12, D-13), with collapsed trace behavior in OCR and predictive too (D-14).

## Planning implications
- Extract shared AI governance display helpers/types into a focused module (confidence band mapping, correlation label formatter, trace panel primitive) to enforce D-12..D-14 consistently across three routes.
- Extend `lib/assistant.ts` response shape minimally (if needed) to expose clarifying prompts for low-confidence branch without duplicating response logic in page components.
- Introduce a new `app/dashboard/predictive/page.tsx` route using existing `failureRisk` and store data to generate mock recommendation cards and role-gated actions.
- Keep existing OCR mandatory-field gate, but restructure layout/content to satisfy the phase hierarchy and collapsed trace parity with assistant.

## Risks
- Divergent confidence color thresholds across pages would violate D-13 unless centralized.
- Independent per-page correlation label formatting can drift and break D-12.
- Predictive sorting can become unstable if implemented ad hoc rather than explicit risk/score comparator.
- Role-gating done only at button visibility (without guard in handler) may allow accidental unauthorized state changes from future refactors.

## Recommendation
- Plan phase 9 as three implementation tracks with one shared-contract track:
  1. Shared AI governance contract and display primitives.
  2. Assistant response-card + trace/low-confidence behavior alignment.
  3. OCR confidence-routing UX alignment with collapsed trace.
  4. Predictive recommendations page with ordering, SLA, escalation, and manager-only high-risk actions.

## RESEARCH COMPLETE
