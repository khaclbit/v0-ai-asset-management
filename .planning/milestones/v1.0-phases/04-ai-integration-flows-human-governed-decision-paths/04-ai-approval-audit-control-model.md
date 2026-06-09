# 04 AI Approval Audit Control Model

## Purpose

Define shared approval, override, and audit controls used by assistant, OCR, and predictive AI workflows.

## Governance Constraints

- Approvals and overrides are **human-governed** and **role-restricted**.
- Audit chain is **append-only** and **immutable**.
- High-impact overrides require **dual-control**.

## Mandatory Approval Payload

Every approval/override event must include:

- Actor
- Role
- Decision
- Rationale
- Timestamp
- Affected entity
- Correlation ID

## Authorization Policy

| Rule | Requirement |
|---|---|
| Approver role | Manager or Asset Admin only |
| Self-approval restriction | Request initiator cannot be sole approver |
| High-impact override | Requires two-person approval |

## High-Impact Override Definition

Treat an override as high-impact when any condition is met:

1. It affects a critical asset class.
2. It overrides a high-risk predictive recommendation.
3. It materially changes compliance or audit posture.

## Event Model Linkage

All AI-influenced events are chained through `correlation_id`:

1. Recommendation emitted.
2. Human approval/override decision recorded.
3. Escalation (if any) linked to the same decision lineage.

## Control Interactions by Flow

| Flow | Approval Control | Audit Requirements |
|---|---|---|
| Assistant | Read-only output; no mutation approval path in assistant itself | Recommendation + provenance + correlation ID |
| OCR Intake | Human confirmation before create, role-based approver check | File ref, extraction snapshot, approver decision chain |
| Predictive Maintenance | Risk-band-driven approvals with escalation on SLA breach | Recommendation, approval, override, escalation events linked |

## Requirement Traceability

| Requirement | Evidence in this artifact |
|---|---|
| AINT-01 | Assistant read-only governance and trace chain controls |
| AINT-02 | Human-approved OCR create gate and retained evidence contract |
| AINT-03 | Predictive approval/override/escalation control policy |

