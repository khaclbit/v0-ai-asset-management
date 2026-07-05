# Phase 2: Data Model, Security Boundaries & Audit Design - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md.

**Date:** 2026-06-09  
**Phase:** 02-data-model-security-boundaries-audit-design  
**Areas discussed:** Data model strategy, authorization model, audit traceability

---

## Data Model Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Highly normalized relational model | Explicit lifecycle states and constraints | ✓ |
| Hybrid with denormalized reporting from day one | Operational + reporting mixed early | |
| Document-style flexible schema | Faster early changes, weaker constraints | |

**User's choice:** Highly normalized relational model with explicit lifecycle states

| Option | Description | Selected |
|--------|-------------|----------|
| Backend state machine + DB constraints | Service and database guardrails | ✓ |
| Service checks only | No DB-level transition guards | |
| UI checks only | Client-enforced state logic | |

**User's choice:** Backend state-machine enforcement with DB constraints

---

## Authorization Model

| Option | Description | Selected |
|--------|-------------|----------|
| RBAC resource/action matrix | Structured backend permission model | ✓ |
| RBAC + ABAC hybrid | More dynamic policy from start | |
| Coarse role checks | Low-detail authorization model | |

**User's choice:** RBAC with resource/action permission matrix

| Option | Description | Selected |
|--------|-------------|----------|
| Endpoint + domain-operation granularity | Detailed enforceable policy mapping | ✓ |
| Module-level only | High-level permission grouping | |
| Role descriptions only | Non-actionable policy level | |

**User's choice:** Endpoint-level + domain-operation-level permissions

---

## Audit and Traceability

| Option | Description | Selected |
|--------|-------------|----------|
| Immutable append-only for all state changes | Full compliance-grade trail | ✓ |
| Audit only sensitive actions | Partial event history | |
| Basic activity logs | Non-immutable operational logs | |

**User's choice:** Immutable append-only audit events for all state-changing actions

| Option | Description | Selected |
|--------|-------------|----------|
| Actor/action/entity/before-after/timestamp/correlation ID | Full traceability payload | ✓ |
| Actor/action/timestamp only | Minimal trace metadata | |
| Entity/change summary only | Partial context only | |

**User's choice:** Full metadata including correlation ID

---

## the agent's Discretion

- Schema naming conventions and internal naming style.
- Presentation structure of permission matrix.

## Deferred Ideas

None.

