# Domain Pitfalls

**Domain:** AI-powered enterprise asset management  
**Researched:** 2026-06-09

## Critical Pitfalls

| Pitfall | Warning Signs | Prevention | Phase |
|---|---|---|---|
| AI directly mutates transactional state | Unreviewed AI-driven state changes | Keep AI advisory + approval gates | Architecture |
| No canonical lifecycle invariants | Conflicting asset/borrow states | Define state machine + DB constraints | Domain foundation |
| UI-only authorization | Hidden UI controls but bypassable endpoints | Server-side RBAC/policy checks | Security foundation |
| Missing data isolation strategy | Cross-team data visibility leaks | Tenant/org scoping + policy filters | Security foundation |
| No AI action lineage | Cannot explain AI-driven recommendations | Prompt/result metadata + immutable audit events | Compliance |
| Synchronous OCR/LLM in request path | Timeouts, retries, duplicate writes | Async workers + idempotency keys | Reliability |

## Moderate Pitfalls

| Pitfall | Prevention |
|---|---|
| Frontend used as business source of truth | Move domain rules to backend APIs |
| Duplicate entities from retries/imports | UUIDs + unique constraints + idempotent commands |
| Client-only heavy reporting | Server-side aggregates and pagination |

## Planning Guardrails

1. Treat data correctness and auditability as non-negotiable.
2. Model security and policy boundaries before AI feature depth.
3. Introduce predictive maintenance only after data quality and workflow discipline are stable.

