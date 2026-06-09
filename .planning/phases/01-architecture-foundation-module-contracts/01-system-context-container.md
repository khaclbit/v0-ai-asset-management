# Phase 01 Artifact: System Context and Container Architecture

## Context Diagram

### System Boundary

AI-Powered Asset Management System provides architecture governance for asset lifecycle operations with AI-assisted analysis.

### External Actors and Integrations

- **Admin / Manager / Staff** (frontend users)
- **Identity Provider (OIDC/SSO)** for authentication
- **Notification channels** (email/in-app gateway)
- **AI provider endpoints** (LLM/OCR/predictive adapters)

### Core Boundaries

- **Frontend boundary**: React-based application shell and user workflows
- **Backend boundary**: FastAPI domain orchestration and policy enforcement
- **Data boundary**: PostgreSQL source of truth + storage for artifacts
- **AI boundary**: AI orchestration module with governed input/output contracts
- **Integration boundary**: external identity, notification, and provider connections

## Container Diagram

| Container | Responsibility | Primary Interfaces | Notes |
|---|---|---|---|
| Frontend App | User interaction, view rendering, input capture | HTTPS API calls | No direct data store writes |
| API Gateway / Backend App | Validation, orchestration, authorization, domain dispatch | REST/JSON API | Synchronous API pathways are primary |
| Domain Modules | Asset lifecycle, maintenance/warranty, reporting, audit | Internal module APIs | Domain-based module structure |
| AI Orchestration | Assistant/OCR/predictive integration control | Internal API + async events | Human-governed decision checkpoints |
| PostgreSQL | System-of-record data and audit persistence | SQL | Enforced through backend ownership |
| Event/Async Worker Plane | OCR/predictive and notification async flows | Event contracts | Async only where needed |

## Interaction Principles

1. Backend owns business truth and authorization.
2. Synchronous API paths are default for deterministic business operations.
3. Async integration paths are explicit for OCR/predictive/background workflows.
4. C4 naming and structure is used consistently across artifacts.

