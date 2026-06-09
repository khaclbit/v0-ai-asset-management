# Technology Stack

**Project:** AI-Powered Asset Management System  
**Researched:** 2026-06-09  
**Scope:** Architecture-first production stack (prototype to production)

## Recommended Stack

| Layer | Technology | Version Band | Why |
|---|---|---|---|
| Frontend | React + TypeScript (Next.js acceptable for web shell) | React 19.x, TS 5.7+ | Mature dashboard ecosystem and strong team velocity |
| Backend API | FastAPI + Pydantic v2 | FastAPI 0.136.x, Pydantic 2.13.x | Typed contracts, async IO, Python-native AI integration |
| Data Access | SQLAlchemy + Alembic + psycopg | SQLAlchemy 2.0.x, Alembic 1.18.x, psycopg 3.3.x | Reliable schema evolution and transactional safety |
| Primary DB | PostgreSQL + pgvector | PostgreSQL 17/18, pgvector 0.4.x | One operational store for OLTP + retrieval |
| Cache/Rate Limit | Redis | 8.x | Standard low-latency cache and transient state |
| Async Workflows | Temporal (or queue + workers) | Temporal 1.31.x | Durable OCR/predictive jobs with retries |
| AI Gateway | LiteLLM + provider SDK adapters | LiteLLM 1.88.x | Multi-provider routing and failover |
| Observability | OpenTelemetry + Prometheus/Grafana + Sentry | Current stable | Traces, metrics, and error visibility |
| Identity | OIDC enterprise IdP | Current LTS | SSO + enforceable RBAC/claims |

## Prescriptive Decisions

1. Start with a **modular monolith backend** with strict module boundaries.
2. Keep PostgreSQL as source-of-truth; use pgvector before adding a separate vector DB.
3. Treat AI as an augmentation layer; do not let model output directly mutate critical state.
4. Put authorization at backend boundaries, never UI-only.

## What Not to Use (Now)

| Avoid | Why | Use Instead |
|---|---|---|
| Client-only state as system of record | Non-durable and non-auditable | Backend-owned transactional state |
| Frontend-only authz checks | Bypassable | Server-side RBAC/policy checks |
| Microservices from day 1 | Ops overhead | Modular monolith with extraction path |
| Separate vector DB immediately | Extra complexity early | pgvector first, split later if needed |

## Confidence

- Version guidance: **High**
- Architecture pattern fit: **Medium-High**

