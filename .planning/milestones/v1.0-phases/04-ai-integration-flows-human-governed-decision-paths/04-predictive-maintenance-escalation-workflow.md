# 04 Predictive Maintenance Escalation Workflow

## Purpose

Define predictive-maintenance recommendation governance with confidence-aware routing, approval checkpoints, and SLA escalation.

## Scope Mapping

- **Requirement:** AINT-03
- **Locked decisions:** D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16

## Risk and Confidence Routing

| Band | Condition | Required Path |
|---|---|---|
| High risk + high confidence | Recommendation indicates urgent risk | Create maintenance ticket + manager approval checkpoint |
| Medium risk / uncertain | Recommendation needs review | Route to reviewer triage queue |
| Low risk | Recommendation is non-urgent | Monitor-only, no immediate ticket |

## Sequence

1. **Predictive engine output** is received by Predictive Orchestrator.
2. **Risk Classifier** assigns High/Medium/Low band.
3. **Explainability Packager** attaches contributing factors and confidence explanation.
4. **Policy Router** triggers required path per band table.
5. **Approval Service** enforces role-based approval and dual-control rules for high-impact overrides.
6. **SLA Monitor** tracks unresolved high-risk recommendations.
7. **On SLA breach:** escalation to asset manager is emitted and recorded.
8. **Audit Emitter** appends immutable event chain linking recommendation, approvals, overrides, and escalation outcomes.

## Explainability Contract

Each recommendation must include:

- Risk band
- Confidence score
- Top contributing factors
- Correlation ID

## SLA Escalation Rule

- High-risk items not acted upon before SLA deadline automatically trigger escalation event.
- Escalation event includes target actor, breach timestamp, and linked recommendation correlation ID.

## Requirement Traceability

| Requirement | Evidence in this artifact |
|---|---|
| AINT-03 | Risk/confidence routing, mandatory approval checkpoints, explainability attachment, and SLA breach escalation |

