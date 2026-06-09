# Phase 02 Artifact: Security and Audit Cross-Module Traceability

## Contract -> Enforcement -> Audit Mapping

| Mutation Path | Permission Enforcement | Audit Emission | Correlation |
|---|---|---|---|
| POST /assets | endpoint + domain-operation checks | asset.create event | request correlation ID |
| POST /assignments | endpoint + domain-operation checks | assignment.create/approve events | request correlation ID |
| POST /returns | endpoint + domain-operation checks | return.close event | request correlation ID |
| PATCH /maintenance/{id} | endpoint + domain-operation checks | maintenance.update event | request correlation ID |
| PATCH /warranty/{id} | endpoint + domain-operation checks | warranty.update event | request correlation ID |
| POST /assistant/query (state-changing recommendation acceptance) | endpoint + scope checks + domain-operation checks | assistant.recommendation.accepted event | recommendation correlation ID |

## Threat-Aware Checkpoints

- **Repudiation:** immutable actor/action audit lineage on every mutation path
- **Tampering:** append-only audit model and constrained transition controls
- **Privilege misuse:** dual-layer permission checks with owner-module accountability

## Business and AI-Assisted Traceability

- Business actions and AI-assisted actions share a common correlation model.
- Every AI-assisted accepted action must link back to originating recommendation event.
- Human decision checkpoints are represented in audit chain for compliance reconstruction.

## Interface Contract Alignment

- `/assets`, `/assignments`, `/returns`, `/assistant/query` align to Phase 1 contract catalog.
- `PATCH /maintenance/{id}` and `PATCH /warranty/{id}` are Phase 2 contract additions that follow the same owner/consumer/versioned-contract model.
