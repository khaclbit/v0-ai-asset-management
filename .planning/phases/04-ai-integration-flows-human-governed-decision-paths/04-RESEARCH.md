# Phase 4: AI Integration Flows & Human-Governed Decision Paths - Research

**Researched:** 2026-06-09  
**Domain:** AI orchestration workflow architecture (assistant, OCR, predictive maintenance)  
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Claude's Discretion
- Diagram notation and sequence presentation style for AI and approval flows.
- Exact naming and partitioning of orchestrator services as long as Phase 1/2/3 boundaries remain consistent.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AINT-01 | Assistant query workflow from natural language input to grounded data response | Grounding boundary, read-only contract, insufficient-data path, trace metadata contract |
| AINT-02 | OCR-assisted ingestion with human confirmation and error handling | 3-band OCR confidence routing, mandatory field verification, rejection/rescan branch, evidence retention |
| AINT-03 | Predictive maintenance with confidence handling and human checkpoint | 3-band risk/confidence routing, approval/escalation checkpoints, explainability + audit linkage |
</phase_requirements>

## Summary

Phase 4 is tightly constrained by locked decisions and should be planned as **governed orchestration design**, not model design. [VERIFIED: `.planning/phases/04-ai-integration-flows-human-governed-decision-paths/04-CONTEXT.md`]  
The strongest reusable foundation is already present in Phase 1/2/3 artifacts: versioned contracts, sync/async split, RBAC boundary matrix, append-only audit model, and lifecycle workflow anchors. [VERIFIED: `01-interface-contract-catalog.md`; `02-rbac-enforcement-boundary-matrix.md`; `02-audit-traceability-event-model.md`; `03-registration-categorization-workflow.md`; `03-maintenance-warranty-workflow.md`]

Current prototype code also demonstrates relevant UI interaction patterns (assistant query trace display, OCR confidence display/edit-before-create, store mutation authority) that should be formalized into architecture contracts. [VERIFIED: `v0-ai-asset-management/lib/assistant.ts`; `app/dashboard/assistant/page.tsx`; `app/dashboard/ocr/page.tsx`; `lib/store.tsx`]

**Primary recommendation:** Plan Phase 4 as three explicit sequence specs (Assistant, OCR, Predictive) plus one shared approval/audit control model that reuses Phase 1/2 contracts and enforcement boundaries. [VERIFIED: phase artifacts above]

## Standard Stack

### Core
| Library / Artifact | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Interface Contract Catalog | v1 artifacts | Contract owner/consumer/schema/error baseline | Already canonical for sync/async boundaries and versioning. [VERIFIED: `01-interface-contract-catalog.md`] |
| RBAC Enforcement Matrix | Phase 2 artifact | Endpoint + domain-operation authorization model | Required to enforce human-approval gates at backend boundaries. [VERIFIED: `02-rbac-enforcement-boundary-matrix.md`] |
| Audit Event Model | Phase 2 artifact | Immutable traceability for AI-assisted decisions | Aligns with locked append-only decision logging. [VERIFIED: `02-audit-traceability-event-model.md`; `04-CONTEXT.md`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next | 16.2.7 (registry) / 16.2.6 (repo) | Frontend flow/UX reference implementation | Use existing UI flow patterns for architecture examples only. [VERIFIED: npm registry + `package.json`] |
| react / react-dom | 19.2.7 | Assistant/OCR interaction pattern baseline | Use current page interaction style for flow checkpoints. [VERIFIED: npm registry + `package.json`] |
| sonner | 2.0.7 | User feedback pattern for confidence/review states | Reuse notification semantics in architecture sequence outputs. [VERIFIED: npm registry + `package.json`; `ocr/page.tsx`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New orchestration pattern | Existing Phase 1/2/3 contracts | Reuse is lower risk and required for cross-phase consistency. [VERIFIED: roadmap/context canonical refs] |

**Installation (only if local diagram/validation tooling is needed):**
```bash
npm install next react react-dom sonner
```

**Version verification run:**
```bash
npm view next version time.modified
npm view react version time.modified
npm view react-dom version time.modified
npm view sonner version time.modified
```
[VERIFIED: npm registry]

## Architecture Patterns

### Recommended Project Structure
```text
.planning/phases/04-ai-integration-flows-human-governed-decision-paths/
├── 04-assistant-grounded-query-workflow.md
├── 04-ocr-confidence-human-gate-workflow.md
├── 04-predictive-maintenance-escalation-workflow.md
└── 04-ai-approval-audit-control-model.md
```
[ASSUMED]

### Pattern 1: Grounded Read-Only Assistant Orchestration
**What:** Natural-language query -> scoped data retrieval -> grounded response + trace metadata; no direct mutation path. [VERIFIED: `04-CONTEXT.md`, D-01..D-04; `01-interface-contract-catalog.md`]  
**When to use:** Every assistant request (AINT-01). [VERIFIED: `REQUIREMENTS.md`]  
**Anti-risk controls:** insufficient-data fallback and clarifying follow-up instead of speculation. [VERIFIED: `04-CONTEXT.md`, D-02]

### Pattern 2: OCR Confidence Band Router + Mandatory Human Confirmation
**What:** OCR result routed by confidence band (>=95, 80-94, <80) with required confirmation fields before asset creation. [VERIFIED: `04-CONTEXT.md`, D-05..D-07]  
**When to use:** OCR-assisted intake (AINT-02). [VERIFIED: `REQUIREMENTS.md`]  
**Anti-risk controls:** reject low-confidence, require evidence retention (file ref + extraction snapshot + approver identity). [VERIFIED: `04-CONTEXT.md`, D-08]

### Pattern 3: Predictive Recommendation Governance Flow
**What:** Risk/confidence triage -> route to monitor/triage/approval-ticket path -> SLA-based escalation for unacted high-risk. [VERIFIED: `04-CONTEXT.md`, D-09..D-12; `03-maintenance-warranty-workflow.md`]  
**When to use:** Predictive maintenance recommendations (AINT-03). [VERIFIED: `REQUIREMENTS.md`]  
**Anti-risk controls:** explainability always attached, approval checkpoints enforced by role and dual-control where high-impact. [VERIFIED: `04-CONTEXT.md`, D-11, D-14, D-15]

### Anti-Patterns to Avoid
- **AI direct write to transactional truth:** forbidden by module boundary rules. [VERIFIED: `01-module-boundaries-component-sequences.md`]  
- **UI-only approval logic:** violates backend-first authorization contract. [VERIFIED: `02-rbac-enforcement-boundary-matrix.md`]  
- **Missing correlation linkage from AI recommendation to human decision:** breaks Phase 2 traceability model. [VERIFIED: `02-audit-traceability-event-model.md`; `02-security-audit-cross-module-traceability.md`]

## Don’t Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Contract governance | Ad-hoc unversioned flow docs | Existing versioned contract style (`owner/consumer/schema/error`) | Maintains Phase 1 compatibility. [VERIFIED: `01-interface-contract-catalog.md`] |
| Authorization in AI approvals | Frontend-only role checks | Endpoint + domain-operation dual checks | Required by Phase 2 security model. [VERIFIED: `02-rbac-enforcement-boundary-matrix.md`] |
| Audit evidence chain | Free-text logs | Mandatory structured payload + correlation ID + append-only model | Needed for AI decision reconstruction. [VERIFIED: `02-audit-traceability-event-model.md`; `04-CONTEXT.md`] |

**Key insight:** Phase 4 should compose existing governance primitives, not invent new ones. [VERIFIED: prior phase artifacts]

## Common Pitfalls

### Pitfall 1: “Grounded” assistant that still returns unscoped answers
**What goes wrong:** Assistant answers beyond internal data boundary. [VERIFIED: D-01 boundary exists in `04-CONTEXT.md`]  
**Why it happens:** Missing explicit “insufficient data” branch or missing provenance metadata in response contract. [VERIFIED: D-02, D-03 in `04-CONTEXT.md`]  
**How to avoid:** Make insufficient-data path and provenance fields mandatory in sequence/contract artifacts. [VERIFIED: D-02, D-03]  
**Warning signs:** Responses without query/filter source metadata. [VERIFIED: D-03]

### Pitfall 2: OCR confidence shown but not policy-enforced
**What goes wrong:** Same handling for all confidence bands. [VERIFIED: current demo only displays/edit confidence in UI `ocr/page.tsx`]  
**Why it happens:** Confidence thresholds not codified in orchestration decision table. [ASSUMED]  
**How to avoid:** Add explicit policy table and branch outcomes per band. [VERIFIED: D-05, D-06]  
**Warning signs:** Low-confidence results still reaching create-asset step without rescan. [VERIFIED: D-06]

### Pitfall 3: Predictive recommendation without accountable decision owner
**What goes wrong:** High-risk recommendation stalls without approval/escalation. [VERIFIED: D-10, D-12 imply required path]  
**Why it happens:** Missing SLA timer + escalation event in design artifacts. [VERIFIED: D-12]  
**How to avoid:** Include SLA breach trigger, escalation target, and audit emission in flow. [VERIFIED: D-12, D-13]  
**Warning signs:** No manager/asset-admin checkpoint in high-risk branch. [VERIFIED: D-10, D-14]

## Code Examples

### Existing assistant response shape (trace-ready extension point)
```typescript
export type AssistantResult = {
  answer: string
  query: string
  assets: Asset[]
}
```
Source: `v0-ai-asset-management/lib/assistant.ts` [VERIFIED: codebase]

### Existing OCR confidence capture + human field correction before create
```typescript
type ExtractedFields = {
  name: string
  category: AssetCategory
  serial: string
  price: number
  purchaseDate: string
  vendor: string
  confidence: number
}
```
Source: `v0-ai-asset-management/app/dashboard/ocr/page.tsx` [VERIFIED: codebase]

## Dependencies & Integration Contracts with Prior Phases

- **Depends on Phase 1** contract ownership/versioning + sync/async contract split. [VERIFIED: `01-interface-contract-catalog.md`]  
- **Depends on Phase 2** RBAC enforcement points and immutable audit payload/correlation model. [VERIFIED: `02-rbac-enforcement-boundary-matrix.md`; `02-audit-traceability-event-model.md`]  
- **Depends on Phase 3** registration flow anchor for OCR finalization and maintenance flow anchor for predictive escalation. [VERIFIED: `03-registration-categorization-workflow.md`; `03-maintenance-warranty-workflow.md`]  
- **Current prototype integration touchpoints** are assistant/OCR pages and store mutation entrypoints. [VERIFIED: `assistant/page.tsx`; `ocr/page.tsx`; `lib/store.tsx`]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UI-demonstration AI simulation in frontend-only logic | Architecture-governed backend orchestration with human approval checkpoints | Phase 4 scope | Moves from demo behavior to enforceable control boundaries. [VERIFIED: roadmap + context + current code] |

**Deprecated/outdated for planning context:**
- Direct AI-to-mutation behavior for this phase (not allowed). [VERIFIED: D-04, D-14, D-15]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Recommend splitting Phase 4 into four artifact files (assistant/ocr/predictive/shared-controls) | Architecture Patterns | Medium: planner task granularity may need adjustment |
| A2 | OCR threshold misses often stem from absent decision tables | Common Pitfalls | Low: still safe to enforce explicit policy table |

## Open Questions (RESOLVED)

1. **What exact schema fields define assistant provenance metadata?**
   - What we know: must include data source + query/filter provenance. [VERIFIED: D-03]
   - RESOLVED: Use contract fields `trace.source`, `trace.query`, `trace.filters`, `trace.correlation_id`, and `trace.generated_at` in Phase 4 artifacts.

2. **What qualifies as “high-impact override” for dual-control?**
   - What we know: dual-control is mandatory for high-impact overrides. [VERIFIED: D-15]
   - RESOLVED: Treat override as high-impact when any of these are true: affects critical asset class, carries high-risk predictive classification, or can materially change compliance/audit posture; the policy table will be codified in `04-ai-approval-audit-control-model.md`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | planning doc tooling + repo scripts | ✓ | v25.9.0 | — |
| npm | package/version verification | ✓ | 11.12.1 | — |
| python3 | optional analysis tooling | ✓ | 3.13.12 | — |
| mermaid CLI (`mmdc`) | optional diagram rendering | ✗ | — | keep diagrams in Markdown/mermaid text only |

**Missing dependencies with no fallback:**
- None. [VERIFIED: local audit commands]

**Missing dependencies with fallback:**
- Mermaid CLI missing; use raw Mermaid blocks without local rendering. [VERIFIED: `mmdc` probe]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in repository test configs/scripts [VERIFIED: config scan + package scripts] |
| Config file | none — see Wave 0 |
| Quick run command | `npm run lint` (available script; quality proxy, not behavior test) [VERIFIED: `package.json`] |
| Full suite command | `npm run lint` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AINT-01 | Grounded assistant + insufficient-data + trace metadata + read-only boundary | architecture-doc verification checklist | `npm run lint` + manual artifact checklist | ❌ Wave 0 |
| AINT-02 | OCR 3-band routing + mandatory field confirmation + rejection path + evidence retention | architecture-doc verification checklist | `npm run lint` + manual artifact checklist | ❌ Wave 0 |
| AINT-03 | Predictive triage + approval/escalation + explainability + audit linkage | architecture-doc verification checklist | `npm run lint` + manual artifact checklist | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run lint`
- **Per wave merge:** `npm run lint` + manual requirements-to-artifact trace check
- **Phase gate:** All Phase 4 artifacts exist and map cleanly to AINT-01/02/03 + locked decisions

### Wave 0 Gaps
- [ ] `/.planning/phases/04.../validation-checklist.md` — explicit pass/fail checklist per AINT and D-01..D-16 [ASSUMED]
- [ ] Requirement trace table embedded in each Phase 4 artifact [ASSUMED]
- [ ] No automated architecture test harness exists; manual checklist must be created [VERIFIED: no test infra detected]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Role identity provided by Identity & Access boundary before approval actions. [VERIFIED: Phase 1/2 artifacts] |
| V3 Session Management | no (phase artifact-level only) | N/A in this architecture-only phase. [ASSUMED] |
| V4 Access Control | yes | Endpoint + domain-operation authorization; role-based approver segregation. [VERIFIED: `02-rbac...`; D-14] |
| V5 Input Validation | yes | Contract-level request schema validation before orchestration. [VERIFIED: `01-interface-contract-catalog.md`] |
| V6 Cryptography | no explicit scope in this phase | Keep provider/API secrets out of artifacts; no custom crypto. [ASSUMED] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AI recommendation accepted without authorization | Elevation of Privilege | Enforce backend approval role checks + dual-control for high-impact overrides. [VERIFIED: D-14, D-15; Phase 2 RBAC] |
| Decision repudiation | Repudiation | Append-only immutable audit events with actor/decision/rationale/timestamp/correlation ID. [VERIFIED: D-13, D-16; Phase 2 audit model] |
| Untraceable AI-to-human decision linkage | Tampering/Repudiation | Correlation model linking recommendation event to human decision event. [VERIFIED: `02-audit-traceability-event-model.md`] |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/04-ai-integration-flows-human-governed-decision-paths/04-CONTEXT.md` — locked decisions and scope boundaries
- `.planning/phases/01-architecture-foundation-module-contracts/01-interface-contract-catalog.md` — contract/versioning baseline
- `.planning/phases/01-architecture-foundation-module-contracts/01-module-boundaries-component-sequences.md` — ownership and forbidden dependencies
- `.planning/phases/02-data-model-security-boundaries-audit-design/02-rbac-enforcement-boundary-matrix.md` — backend enforcement model
- `.planning/phases/02-data-model-security-boundaries-audit-design/02-audit-traceability-event-model.md` — immutable audit schema baseline
- `.planning/phases/03-core-asset-lifecycle-workflow-design/03-registration-categorization-workflow.md` and `03-maintenance-warranty-workflow.md` — OCR/predictive lifecycle anchors
- `v0-ai-asset-management/lib/assistant.ts`, `app/dashboard/assistant/page.tsx`, `app/dashboard/ocr/page.tsx`, `lib/store.tsx` — reusable prototype interaction patterns
- npm registry (`npm view`) — current package versions and modified timestamps

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md` — phase goals and cross-phase dependency intent

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — based mostly on locked context + existing project artifacts + npm verification.
- Architecture: HIGH — constrained by explicit D-01..D-16 decisions and prior phase contracts.
- Pitfalls: MEDIUM — some causal explanations are assumed even though controls are locked.

**Research date:** 2026-06-09  
**Valid until:** 2026-07-09

---
