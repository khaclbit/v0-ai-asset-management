# Phase 4: AI Integration Flows & Human-Governed Decision Paths - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Define architecture-level AI orchestration workflows for assistant query handling, OCR-assisted ingestion, and predictive maintenance recommendations with explicit confidence handling and human approval checkpoints.

</domain>

<decisions>
## Implementation Decisions

### Assistant flow grounding and response boundaries
- **D-01:** Assistant responses are strictly grounded in internal asset-management data only.
- **D-02:** If confidence or data sufficiency is low, assistant must return "insufficient data" and ask clarifying follow-up questions.
- **D-03:** Every assistant response includes trace metadata (data source plus query/filter provenance).
- **D-04:** Assistant remains read-only in this phase; all asset mutations are human-initiated.

### OCR confidence thresholds and human-review gates
- **D-05:** OCR confidence is triaged into three bands: High (>=95%), Medium (80-94%), Low (<80%).
- **D-06:** High confidence allows prefill with quick human confirm; Medium requires mandatory field-by-field human review; Low is rejected with rescan required.
- **D-07:** Human confirmation is mandatory for name, category, serial, purchase date, vendor, and price before asset creation.
- **D-08:** OCR workflow must retain invoice file reference, extraction snapshot, and approver identity for traceability.

### Predictive maintenance confidence and escalation
- **D-09:** Predictive outputs use three bands: high-risk/high-confidence, medium-risk/uncertain, and low-risk.
- **D-10:** High-risk requires maintenance ticket plus manager approval; medium-risk routes to reviewer triage; low-risk remains monitor-only.
- **D-11:** All predictive recommendations must include explainability signals and confidence.
- **D-12:** Unacted high-risk recommendations escalate to asset manager on SLA breach, with audit event emission.

### Audit, approval, and override policy
- **D-13:** Mandatory audit payload includes actor, role, decision, rationale, timestamp, affected entity, and correlation ID.
- **D-14:** Only role-based approvers (manager/asset-admin) can approve or override AI-suggested actions; initiator alone cannot self-approve.
- **D-15:** High-impact overrides require dual-control (two-person approval).
- **D-16:** AI decision logs are append-only and immutable.

### the agent's Discretion
- Diagram notation and sequence presentation style for AI and approval flows.
- Exact naming and partitioning of orchestrator services as long as Phase 1/2/3 boundaries remain consistent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirement sources
- `.planning/PROJECT.md` — architecture-only constraints and AI-integration depth boundary.
- `.planning/ROADMAP.md` — Phase 4 scope, dependencies, and success criteria.
- `.planning/REQUIREMENTS.md` — AINT-01, AINT-02, AINT-03 requirement definitions.

### Prior architecture and workflow contracts
- `.planning/phases/01-architecture-foundation-module-contracts/01-interface-contract-catalog.md` — contract style and module interface boundaries.
- `.planning/phases/02-data-model-security-boundaries-audit-design/02-rbac-enforcement-boundary-matrix.md` — backend authorization boundaries for decision gates.
- `.planning/phases/02-data-model-security-boundaries-audit-design/02-audit-traceability-event-model.md` — audit payload and traceability baseline.
- `.planning/phases/03-core-asset-lifecycle-workflow-design/03-registration-categorization-workflow.md` — intake lifecycle workflow anchor for OCR integration.
- `.planning/phases/03-core-asset-lifecycle-workflow-design/03-maintenance-warranty-workflow.md` — maintenance lifecycle anchor for predictive escalation.

### Existing prototype AI surfaces (for integration alignment)
- `v0-ai-asset-management/lib/assistant.ts` — current NL-to-query simulation behavior to be formalized architecturally.
- `v0-ai-asset-management/app/dashboard/assistant/page.tsx` — current assistant UX and trace display touchpoint.
- `v0-ai-asset-management/app/dashboard/ocr/page.tsx` — current OCR intake and confidence-confirmation UX touchpoint.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `v0-ai-asset-management/lib/assistant.ts`: Existing assistant mapping logic and query-style output can anchor grounded-response contract examples.
- `v0-ai-asset-management/app/dashboard/assistant/page.tsx`: Existing message/trace UI pattern can inform assistant response metadata expectations.
- `v0-ai-asset-management/app/dashboard/ocr/page.tsx`: Existing confidence display and manual field-correction pattern can inform human-gate workflow design.
- `v0-ai-asset-management/lib/store.tsx`: Current mutation entry points indicate where human-approved actions must remain authoritative.

### Established Patterns
- AI features are currently presented as guided assistive flows with explicit user interaction, not autonomous backend mutation.
- Toast and status-driven UI feedback patterns already exist for action outcomes.
- Asset lifecycle state is centrally managed in store logic, providing a clear place to map approval checkpoints conceptually.

### Integration Points
- Assistant recommendations connect to read/query surfaces only; actionable decisions route through human-owned mutation flows.
- OCR ingestion connects into registration and asset creation workflows defined in Phase 3.
- Predictive recommendations connect into maintenance/warranty workflow checkpoints and SLA/escalation rules.

</code_context>

<specifics>
## Specific Ideas

- Keep AI integration behavior-safe: grounded answers, explicit confidence handling, and human-governed approval checkpoints.
- Preserve audit-grade traceability for all AI-influenced recommendations and overrides.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-ai-integration-flows-human-governed-decision-paths*
*Context gathered: 2026-06-09*
