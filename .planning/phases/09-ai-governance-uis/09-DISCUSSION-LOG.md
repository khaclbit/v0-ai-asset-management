# Phase 9: AI Governance UIs - Discussion Log

> **Audit trail only.** Decisions are canonicalized in `09-CONTEXT.md`.

**Date:** 2026-06-10  
**Areas discussed:** Assistant response UX, OCR confidence routing UX, Predictive recommendation actions, Cross-module consistency

## Assistant response UX
- Selected: single structured response card + expandable trace panel.
- Selected: low-confidence path = "insufficient data" + clarifying suggestions.
- Selected: source/confidence inline; filters/correlation_id always visible in compact metadata row.
- Selected: trace panel collapsed by default.

## OCR confidence routing UX
- Selected: confidence score/band prominently displayed.
- Selected: High confidence = read-only summary + one confirm.
- Selected: Medium confidence = strict mandatory-field confirmation before submit.
- Selected: Low confidence = reject/rescan guidance, submit blocked.

## Predictive recommendation actions
- Selected: order by risk desc then confidence desc.
- Selected: high-risk approve/defer permission = Asset Manager only.
- Selected: SLA countdown chips per high-risk card + overdue escalation banner.
- Selected: always-visible metadata = risk, confidence, top factors, correlation_id.

## Cross-module consistency
- Selected: unified correlation_id formatting and labeling across Assistant/OCR/Predictive.
- Selected: shared confidence badge colors/thresholds across modules.
- Selected: collapsed provenance detail sections in OCR and Predictive, matching Assistant.
- Selected: consistent page hierarchy across all AI governance pages.

## the agent's Discretion
- Final microcopy and iconography details.
- Fine-grained spacing/tone polish within design-system tokens.

## Deferred Ideas

None.
