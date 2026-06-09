# Phase 01 Artifact: Module Boundaries, Component View, and Sequence Flows

## Domain-Based Module Ownership

| Module | Owned Responsibilities | Non-Owned Responsibilities |
|---|---|---|
| Identity & Access | Authentication integration, RBAC policy checks | Asset business state transitions |
| Asset Lifecycle | Registration, assignment, return, disposal | User identity lifecycle |
| Maintenance & Warranty | Maintenance scheduling and warranty tracking | Role policy definitions |
| Reporting & Insights | Reporting views and aggregations | Direct mutation of transactional state |
| AI Orchestration | Assistant/OCR/predictive request routing and confidence handling | Direct ownership of core transactional truth |
| Audit & Compliance | Immutable audit event records, traceability links | Business decision policy ownership |

## Allowed and Forbidden Dependency Rules

### Allowed

- Reporting -> Asset Lifecycle (read models)
- AI Orchestration -> Asset Lifecycle (read context + governed write recommendations)
- Audit & Compliance <- all mutation modules (event ingestion)

### Forbidden

- Frontend direct write to data boundary
- Cross-module direct data access bypassing contracts
- AI Orchestration direct writes to core transactional tables without policy and approval path

## Component View

- **Presentation components**: frontend route and interaction components
- **API components**: controller, policy, orchestration handlers
- **Domain components**: module services and validators per domain
- **Persistence components**: repository and schema boundaries
- **Integration components**: provider adapters and messaging connectors

## Key Sequence Flows

### Sequence: Asset Assignment (synchronous)
1. Frontend submits assignment request to backend API.
2. Backend validates request and authorization.
3. Asset Lifecycle module executes transition.
4. Audit module records transition.
5. Backend returns response schema to frontend.

### Sequence: OCR Intake (async event flow)
1. Frontend submits document for OCR processing.
2. Backend validates and stores intake metadata.
3. AI Orchestration emits async OCR event.
4. Worker processes OCR and returns candidate extraction.
5. Backend presents human confirmation step before final registration.

## Interaction-to-Contract Traceability

| Interaction | Contract |
|---|---|
| Asset registration | `POST /assets` |
| Assignment flow | `POST /assignments` |
| Return flow | `POST /returns` |
| Reporting query | `GET /reports/overview` |
| Assistant query | `POST /assistant/query` |
| OCR async request | `ocr.intake.requested` |
| OCR async completion | `ocr.intake.completed` |
| Predictive scoring event | `maintenance.risk.scored` |

## ADR References

- ADR-01 (domain-based modules)
- ADR-02 (ownership and forbidden dependencies)
- ADR-04 (sync/async interaction strategy)
