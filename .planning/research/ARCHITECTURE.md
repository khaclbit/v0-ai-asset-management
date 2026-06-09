# Architecture Patterns

**Domain:** AI-powered asset management  
**Researched:** 2026-06-09

## Recommended System Shape

Use a **modular monolith** backend with explicit module boundaries and AI adapters:

Frontend (React)  
-> API Layer (FastAPI)  
-> Modules: Auth/RBAC, Asset Lifecycle, Maintenance/Warranty, Reporting, AI Orchestration, Audit  
-> PostgreSQL (system of record) + Object Storage + Async Workers/Queue

## Component Boundaries

| Component | Responsibility | Talks To |
|---|---|---|
| Frontend | UX, form validation, workflow execution | API only |
| API/BFF | Validation, orchestration, authorization | Domain modules |
| Asset Lifecycle | CRUD, assignment/return invariants | PostgreSQL, Audit |
| Maintenance/Warranty | schedules and status tracking | PostgreSQL, Notifications |
| Reporting | KPIs and aggregates | PostgreSQL |
| AI Orchestration | NLP/OCR/prediction adapters and confidence handling | Workers, model providers, DB |
| Audit/Eventing | Immutable action history | All mutation modules |

## Data Flow Principles

1. UI never writes directly to data store.
2. All critical mutations pass authorization + invariant checks.
3. AI outputs are advisory unless explicitly approved.
4. Long-running AI/OCR work is asynchronous with retries.

## Build Order

1. Auth/RBAC + core schema + migrations
2. Asset lifecycle transactional APIs
3. Audit trail and reporting reads
4. Async infrastructure for OCR/prediction
5. AI adapter layer and confidence/approval flows
6. Hardening: observability, SLOs, policy tests

## Key Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Prototype logic leaks into frontend-only enforcement | Backend-first domain and policy enforcement |
| AI hallucinations affecting records | Confidence thresholds + human approval + audit links |
| External AI latency/outage | Async jobs, retry policy, fallbacks |
| State inconsistency across modules | Transaction boundaries and event/outbox pattern |

