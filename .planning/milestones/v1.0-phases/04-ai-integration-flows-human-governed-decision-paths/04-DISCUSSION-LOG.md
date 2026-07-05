# Phase 4: AI Integration Flows & Human-Governed Decision Paths - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 04-ai-integration-flows-human-governed-decision-paths
**Areas discussed:** Assistant flow grounding and response boundaries, OCR confidence thresholds and human-review gates, Predictive maintenance confidence and escalation path, Audit/approval checkpoints and override policy

---

## Assistant flow grounding and response boundaries

| Option | Description | Selected |
|--------|-------------|----------|
| Strictly grounded in internal asset data only | Constrain assistant outputs to system-owned data and contracts | ✓ |
| Grounded + limited static policy docs | Blend internal data with static policy references | |
| Grounded + external web/source fetch | Allow external retrieval sources in answers | |

**User's choice:** Strictly grounded in internal asset data only.
**Notes:** Phase 4 keeps safety-first grounding and avoids external-source drift.

| Option | Description | Selected |
|--------|-------------|----------|
| Return "insufficient data" and ask clarifying follow-up | No speculative answer when data support is weak | ✓ |
| Return best-effort answer with uncertainty note | Allow tentative response | |
| Escalate directly to human operator review queue | Route every uncertain response to humans | |

**User's choice:** Return insufficient-data response with clarification prompt.
**Notes:** This creates explicit confidence-aware behavior without over-escalation.

| Option | Description | Selected |
|--------|-------------|----------|
| Always include trace info (data source + query/filters) in response metadata | Strong transparency and auditability | ✓ |
| Show trace info only on demand | Reduced response verbosity | |
| No trace details in normal responses | Minimal transparency | |

**User's choice:** Always include trace metadata.
**Notes:** Traceability is required across all AI responses.

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only recommendations only; all mutations stay human-initiated | Assistant cannot mutate assets directly | ✓ |
| Allow low-risk mutations with approval | Assistant can trigger limited changes | |
| Allow autonomous mutations by policy | Assistant can perform direct actions | |

**User's choice:** Read-only recommendations only.
**Notes:** Human-owned mutation authority is preserved.

---

## OCR confidence thresholds and human-review gates

| Option | Description | Selected |
|--------|-------------|----------|
| >=95% high, 80-94% medium, <80% low | Three-level confidence gating | ✓ |
| Two-band only: >=90% acceptable, <90% review | Simplified confidence model | |
| Fixed threshold only (single cutoff) | Single decision boundary | |

**User's choice:** Three-band OCR confidence model.
**Notes:** Enables differentiated handling for prefill, review, and rejection.

| Option | Description | Selected |
|--------|-------------|----------|
| High: prefill + quick confirm, Medium: mandatory field-by-field review, Low: reject and rescan | Risk-calibrated workflow actions | ✓ |
| High: auto-create, Medium: quick confirm, Low: manual full entry | More aggressive automation | |
| All bands require identical manual review | No confidence-based differentiation | |

**User's choice:** Risk-calibrated high/medium/low action policy.
**Notes:** Human checkpoint remains mandatory before creation.

| Option | Description | Selected |
|--------|-------------|----------|
| Name, category, serial, purchase date, vendor, and price | Full critical-field confirmation | ✓ |
| Name, category, and price only | Partial verification | |
| Only fields below confidence threshold | Dynamic selective review | |

**User's choice:** Full critical-field confirmation.
**Notes:** Required before OCR-created asset submission.

| Option | Description | Selected |
|--------|-------------|----------|
| Retain file reference + extraction snapshot + approver identity | Complete OCR audit evidence | ✓ |
| Retain extraction snapshot only | No file-link retention | |
| No retention requirements | Minimal traceability | |

**User's choice:** Retain full OCR audit evidence.
**Notes:** Supports reconstruction and compliance audits.

---

## Predictive maintenance confidence and escalation path

| Option | Description | Selected |
|--------|-------------|----------|
| Three levels: High risk + high confidence, Medium risk/uncertain, Low risk | Structured triage model | ✓ |
| Binary: Action now vs no action | Simplified classifier behavior | |
| Continuous score only without bands | No explicit decision bands | |

**User's choice:** Three-level risk/confidence model.
**Notes:** Allows clear policy routing and approvals.

| Option | Description | Selected |
|--------|-------------|----------|
| High: mandatory maintenance ticket + manager approval, Medium: reviewer triage queue, Low: monitor only | Human-governed escalation flow | ✓ |
| High/Medium: auto-create tickets, Low: ignore | Automation-first path | |
| All bands require identical manual handling | Undifferentiated process | |

**User's choice:** Human-governed differentiated flow.
**Notes:** High-risk always invokes explicit approval.

| Option | Description | Selected |
|--------|-------------|----------|
| Explainability required for all recommendations | Full transparency | ✓ |
| Explainability required only for high-risk | Partial transparency | |
| Explainability optional | Lowest overhead | |

**User's choice:** Explainability required for all predictions.
**Notes:** Include confidence and key factors every time.

| Option | Description | Selected |
|--------|-------------|----------|
| Escalate to asset manager after SLA breach with audit event | Time-bound control mechanism | ✓ |
| Escalate only in periodic review meetings | Low-urgency governance | |
| No explicit escalation rule | Unbounded unresolved risk | |

**User's choice:** SLA-breach escalation with audit event.
**Notes:** High-risk non-action is explicitly governed.

---

## Audit/approval checkpoints and override policy

| Option | Description | Selected |
|--------|-------------|----------|
| Actor, role, decision, rationale, timestamp, affected entity, correlation ID | Full approval audit payload | ✓ |
| Actor, decision, timestamp only | Minimal payload | |
| Minimal event with free-text note | Weak structure | |

**User's choice:** Full approval audit payload.
**Notes:** Matches prior traceability expectations from Phase 2.

| Option | Description | Selected |
|--------|-------------|----------|
| Role-based approvers only (manager/asset-admin), never request initiator alone | Segregation of duties | ✓ |
| Any authenticated staff user | Broad authorization | |
| Only system administrator | Narrow operational bottleneck | |

**User's choice:** Role-based approvers with segregation of duties.
**Notes:** Prevents single-actor self-approval.

| Option | Description | Selected |
|--------|-------------|----------|
| Dual-control required for high-impact overrides | Two-person integrity check | ✓ |
| Single approver sufficient for all cases | Faster flow, weaker control | |
| Decide later in implementation | Deferred governance decision | |

**User's choice:** Dual-control for high-impact overrides.
**Notes:** Enforces stronger governance at critical boundaries.

| Option | Description | Selected |
|--------|-------------|----------|
| Append-only immutable audit log | Tamper-evident historical record | ✓ |
| Soft-immutable with justification | Editable with rationale | |
| Not required in this phase | No immutability constraint | |

**User's choice:** Append-only immutable audit log.
**Notes:** Locks audit integrity for AI-assisted decisions.

---

## the agent's Discretion

- Sequence/diagram notation style for architecture artifacts.
- Internal naming for orchestrator services and flow steps.

## Deferred Ideas

None — no out-of-scope items were raised during discussion.
