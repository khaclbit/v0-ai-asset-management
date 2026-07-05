# FLOW-01 Workflow: Asset Registration and Categorization

## Workflow Steps

1. Intake registration request.
2. Validate required fields and asset uniqueness preconditions.
3. Apply categorization rules and ownership attribution.
4. Persist lifecycle entry as `registered` then transition to `available` when checks pass.
5. Emit audit event for registration and categorization decisions.

## Validation and Audit Checkpoints

- validation gate before lifecycle creation
- categorization policy validation
- audit emission on successful transition

