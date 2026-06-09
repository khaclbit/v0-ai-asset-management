# Phase 02 Artifact: Audit and Traceability Event Model

## Append-Only Immutable Audit Policy

- Audit events are append-only and immutable.
- No update/delete semantics on audit history.

## Mandatory Event Metadata

Each audit event must include:
- actor
- action
- entity
- before_state
- after_state
- timestamp
- correlation ID

## Event Categories

| Category | Example Actions | Notes |
|---|---|---|
| Business state changes | asset.create, assignment.approve, return.close | Must include before/after |
| Security actions | permission.denied, role.change | Must include actor and target entity |
| AI-assisted actions | assistant.recommendation, ocr.suggestion, risk.score.generated | Must include recommendation context and human decision linkage |

## Correlation and Causality

- Correlation ID ties endpoint request -> domain transition -> audit emission.
- AI-assisted events include link to originating recommendation and final human decision.

