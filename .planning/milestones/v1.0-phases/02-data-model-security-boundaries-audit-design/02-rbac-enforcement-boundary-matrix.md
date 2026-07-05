# Phase 02 Artifact: RBAC Enforcement Boundary Matrix

## Backend-First Authorization Contract

No UI-only authorization assumptions are accepted. Every mutation path enforces permissions at:
1. Endpoint boundary
2. Domain-operation boundary

## Resource/Action Permission Matrix

| Resource | Action | Endpoint-Level Check | Domain-Operation Check | Owner Module |
|---|---|---|---|---|
| assets | create | `asset:create` | registration rule validation | Asset Lifecycle |
| assignments | create | `assignment:create` | lifecycle precondition validation | Asset Lifecycle |
| assignments | approve | `assignment:approve` | state transition authorization | Asset Lifecycle |
| returns | create | `return:create` | assignment closure permission | Asset Lifecycle |
| maintenance | update | `maintenance:update` | maintenance state transition checks | Maintenance & Warranty |
| warranty | update | `warranty:update` | warranty policy checks | Maintenance & Warranty |
| reports | read | `report:read` | scoped visibility enforcement | Reporting & Insights |
| assistant | query | `assistant:query` | data-scope guard before orchestration | AI Orchestration |

## Critical Mutation Path Control Points

- Endpoint policy evaluation precedes business logic execution.
- Domain-operation guard validates context-specific authorization and state invariants.
- Audit event emission required after successful state-changing authorization path.

