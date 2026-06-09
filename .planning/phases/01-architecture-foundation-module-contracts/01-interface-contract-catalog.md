# Phase 01 Artifact: Interface Contract Catalog

## Versioning Policy

- Contract version format: `v1`, `v1.1`, `v2`
- Breaking schema changes require major version increment.
- Each contract defines owner, consumer, request schema, response schema, and error semantics.

## Synchronous Contracts (API First)

| Contract | Owner | Consumer | Version | Request Schema | Response Schema | Error Semantics |
|---|---|---|---|---|---|---|
| `POST /assets` | Asset Lifecycle | Frontend | v1 | AssetCreateRequest | AssetResponse | ValidationError, AuthorizationError |
| `POST /assignments` | Asset Lifecycle | Frontend | v1 | AssignmentRequest | AssignmentResponse | ValidationError, ConflictError, AuthorizationError |
| `POST /returns` | Asset Lifecycle | Frontend | v1 | ReturnRequest | ReturnResponse | ValidationError, ConflictError |
| `GET /reports/overview` | Reporting | Frontend | v1 | ReportQuery | ReportSummary | ValidationError |
| `POST /assistant/query` | AI Orchestration | Frontend | v1 | AssistantQueryRequest | AssistantQueryResponse | ValidationError, UpstreamProviderError |

## Async Contracts (where needed)

| Event Contract | Owner | Consumer | Version | Schema Boundary | Error Semantics |
|---|---|---|---|---|---|
| `ocr.intake.requested` | AI Orchestration | OCR Worker | v1 | OCRIntakePayload | RetryableProcessingError |
| `ocr.intake.completed` | OCR Worker | Asset Lifecycle | v1 | OCRExtractionPayload | SchemaValidationError |
| `maintenance.risk.scored` | Predictive Worker | Maintenance Module | v1 | RiskScorePayload | RetryableProcessingError |

## Authorization Boundary Statements

- Each mutation contract enforces RBAC authorization before domain execution.
- Contract owner module is responsible for policy checks and audit emission.
- Consumer modules cannot bypass owner validations.

## Traceability Matrix

| Requirement | Covered In |
|---|---|
| ARCH-01 | System boundaries reflected by API and event contract boundaries |
| ARCH-02 | Owner/consumer assignments and module responsibility separation |
| ARCH-03 | Versioned request/response schemas and explicit error semantics |

## ADR References

- ADR-02 (strict ownership boundaries)
- ADR-03 (versioned contract catalog)
- ADR-04 (sync-first with explicit async contracts)
