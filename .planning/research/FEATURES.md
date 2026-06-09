# Feature Landscape

**Domain:** AI-powered enterprise asset management  
**Researched:** 2026-06-09

## Table Stakes

| Feature | Complexity | Dependency Highlights |
|---|---|---|
| Asset registry and lifecycle states | Medium | Foundational for all modules |
| Assignment and return workflows | Medium | Depends on asset state model |
| Role-based access control | High | Required by all mutation APIs |
| Search, filters, bulk actions | Medium | Depends on indexed backend queries |
| Maintenance and warranty tracking | Medium | Depends on asset timelines/events |
| Audit trail/history | High | Cross-cutting for compliance |
| Reporting dashboards/exports | Medium | Depends on stable transactional data |
| Notifications (due/overdue/warranty) | Medium | Depends on scheduler + eventing |

## Differentiators

| Feature | Complexity | Notes |
|---|---|---|
| Natural-language assistant over asset data | High | Must be grounded in authoritative DB data |
| OCR-assisted document intake | High | Human confirmation gate required |
| Predictive maintenance risk scoring | High | Needs reliable historical data quality |
| Repair-vs-replace recommendations | Medium | Uses cost, failure, and warranty context |

## Anti-Features (Defer)

| Feature | Reason |
|---|---|
| Full custom model training platform | Over-scoped for architecture-first phase |
| Autonomous AI actions on critical state | Governance and safety risk |
| IoT real-time telemetry as first milestone | High integration burden before core stability |
| Multi-tenant federation in initial scope | Security and isolation complexity too early |

## Dependency Chain

Asset Registry + RBAC -> Assignment/Return -> Audit Trail -> Reporting  
Asset Registry -> Maintenance/Warranty -> Notifications  
Clean structured data -> Assistant accuracy -> Predictive models

## Recommended Initial Focus

1. Core asset lifecycle + RBAC + auditability
2. Reporting and notification foundations
3. Assistant integration as first AI feature (read-first)
4. OCR and predictive features after durable workflow foundation

