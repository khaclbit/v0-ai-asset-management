# FLOW-02 Workflow: Assignment and Return Lifecycle

## State Transition Model

requested -> approved -> active -> overdue -> closed

## Assignment Flow

1. Create assignment request (`requested`).
2. Run approval policy (`approved`).
3. Activate assignment (`active`).
4. Mark overdue when deadline exceeded (`overdue`).

## Return and Closure Flow

1. Initiate return from active or overdue state.
2. Validate return conditions.
3. Close assignment (`closed`) and apply closure invariants.

## Control Points

- approval gate
- overdue branch
- closure criteria

