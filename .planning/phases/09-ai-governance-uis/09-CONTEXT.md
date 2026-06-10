# Phase 9: AI Governance UIs - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver AI governance interfaces for assistant query responses, OCR confidence-routed intake, and predictive maintenance recommendations with approval/escalation controls.

</domain>

<decisions>
## Implementation Decisions

### Assistant response UX
- **D-01:** Use a single response card showing answer, source, filters, confidence, and correlation_id.
- **D-02:** Low-confidence responses use an "insufficient data" variant with clarifying question suggestions and no definitive answer claim.
- **D-03:** Trace/provenance panel is collapsed by default and expands on demand.

### OCR confidence routing UX
- **D-04:** Confidence score + High/Medium/Low band is prominently displayed at top of extraction result.
- **D-05:** High-confidence flow uses read-only extracted summary with one confirm action.
- **D-06:** Medium-confidence flow requires mandatory-field confirmation/correction before submit.
- **D-07:** Low-confidence flow shows rejection/rescan guidance and blocks submit.

### Predictive recommendation actions
- **D-08:** Default recommendation order is highest risk first, then highest confidence.
- **D-09:** Only Asset Manager can approve/defer high-risk recommendations.
- **D-10:** Show per-card SLA countdown chips and overdue escalation banner.
- **D-11:** Predictive cards always show risk band, confidence score, top factors, and correlation_id.

### Cross-module consistency
- **D-12:** correlation_id follows one consistent label/format across Assistant, OCR, and Predictive pages.
- **D-13:** Confidence badges use shared color/threshold contract across all AI governance pages.
- **D-14:** OCR and Predictive use collapsed trace/provenance detail sections matching Assistant behavior.
- **D-15:** All AI governance pages follow a consistent hierarchy: top summary area, primary interaction body, secondary detail area.

### the agent's Discretion
- Exact wording and icon usage for confidence/explanation copy.
- Exact spacing and card density values within the approved design system.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and scope
- `.planning/ROADMAP.md` (Phase 9: AI Governance UIs) — phase goal and success criteria.
- `.planning/REQUIREMENTS.md` (AIST-01..AIST-04, OCR-01..OCR-06, PRED-01..PRED-05) — acceptance requirements.

### Existing module surfaces
- `v0-ai-asset-management/app/dashboard/assistant/page.tsx` — current assistant UX baseline.
- `v0-ai-asset-management/app/dashboard/ocr/page.tsx` — current OCR confidence-routing UI baseline.
- `v0-ai-asset-management/app/dashboard/page.tsx` — existing high-risk summary patterns.
- `.planning/phases/08-maintenance-warranty-ui/08-CONTEXT.md` — carry-forward status/alert consistency decisions.
- `.planning/STATE.md` — milestone sequencing and phase continuity.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/status-badge.tsx` already supports shared state badges and can extend to risk/confidence labels.
- `lib/store.tsx` and `lib/assistant.ts` provide mock data/state primitives for AI-governance UI behavior.
- Existing `assistant/page.tsx` and `ocr/page.tsx` provide reusable panel, card, form, and toast patterns.

### Established Patterns
- Role-gated actions are derived from `user.role`.
- Confidence/risk messaging uses badges + subtle row/card highlights.
- Form submit gates use disabled button states until required fields are satisfied.

### Integration Points
- Route targets: `/dashboard/assistant`, `/dashboard/ocr`, and new `/dashboard/predictive`.
- Shared metadata contract (`correlation_id`, provenance fields) should be normalized across all three routes.

</code_context>

<specifics>
## Specific Ideas

No external product reference requested. Prioritize internal consistency and clarity of AI confidence/explainability signals over decorative UI changes.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 09-ai-governance-uis*
*Context gathered: 2026-06-10*
