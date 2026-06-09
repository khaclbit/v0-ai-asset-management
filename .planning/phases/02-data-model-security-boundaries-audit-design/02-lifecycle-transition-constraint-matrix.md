# Phase 02 Artifact: Lifecycle Transition and Constraint Matrix

## State Machine Enforcement

Transition control is enforced through:
1. Backend domain-operation state machine checks.
2. Database constraints guarding invalid state combinations.

## Allowed Transition Matrix

| Flow | From | To | Allowed Transition | Constraint/Invariants |
|---|---|---|---|---|
| Assignment | requested | approved | yes | approver role required |
| Assignment | approved | active | yes | asset state must be available |
| Assignment | active | overdue | yes | due date exceeded |
| Assignment | active/overdue | closed | yes | return record required |
| Asset | registered | available | yes | registration validation complete |
| Asset | available | assigned | yes | active assignment exists |
| Asset | assigned | maintenance | yes | return completed with maintenance flag |
| Asset | maintenance | available | yes | maintenance completion recorded |
| Asset | any | retired | conditional | no active assignment/maintenance in progress |

## Forbidden Transitions

- `assigned -> available` without return closure
- `maintenance -> assigned` without maintenance completion
- `retired -> assigned` in all cases

## DB Constraint Strategy

- CHECK constraints for allowed state values
- Foreign key constraints for lifecycle record continuity
- Unique constraints preventing duplicate active assignment per asset
- Not-null constraints for lifecycle critical fields

## Failure Semantics

- Invalid transition -> validation error (domain layer)
- Constraint breach -> conflict/integrity error (persistence layer)
- Unauthorized operation -> authorization error before transition evaluation

