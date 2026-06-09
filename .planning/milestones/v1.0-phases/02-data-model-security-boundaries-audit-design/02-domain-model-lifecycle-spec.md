# Phase 02 Artifact: Domain Model and Lifecycle Specification

## Normalized Domain Entities

| Entity | Purpose | Key Relationships |
|---|---|---|
| `assets` | Canonical asset inventory record | 1:N assignments, 1:N maintenance_records, 1:N warranty_records |
| `asset_assignments` | Assignment lifecycle events | N:1 assets, N:1 users |
| `asset_returns` | Return lifecycle and condition outcomes | N:1 asset_assignments |
| `maintenance_records` | Maintenance lifecycle and scheduling history | N:1 assets |
| `warranty_records` | Warranty coverage windows and provider metadata | N:1 assets |
| `audit_events` | Immutable event ledger for state-changing actions | links to any domain entity via entity_type + entity_id |
| `ai_action_links` | Trace link for AI-assisted recommendation context | N:1 audit_events |

## Lifecycle State Vocabulary

- `AssetLifecycleState`: registered, available, assigned, maintenance, retired
- `AssignmentState`: requested, approved, active, overdue, closed
- `ReturnState`: initiated, received, validated, closed
- `MaintenanceState`: scheduled, in_progress, completed, blocked
- `WarrantyState`: active, expiring_soon, expired, void

## Normalization Rules

1. State-changing events are modeled as separate lifecycle entities.
2. Derived reporting projections are out of scope for this phase.
3. Cross-module data access is contract-mediated via module boundaries from Phase 1.

## Traceability to Phase 1 Contracts

- Mutation and query boundaries align with ownership in `01-interface-contract-catalog.md`.
- Entity ownership follows Phase 1 domain module partitioning.

