# Requirements: AI-Powered Asset Management System

**Defined:** 2026-06-10
**Core Value:** Give teams a production-aligned UI for asset lifecycle operations with AI governance flows — English, mock data, architecture-accurate.

## v1.1 Requirements

Requirements for v1.1 UI Rebuild milestone. All requirements target `v0-ai-asset-management` (Next.js + shadcn/ui + Tailwind). Mock data only.

### Foundation & Navigation

- [ ] **FNDN-01**: User sees a login page with all text in English (no Vietnamese)
- [ ] **FNDN-02**: User can pick one of four roles on the login page: Admin, Asset Manager, Staff, Auditor
- [ ] **FNDN-03**: User is redirected to a role-appropriate dashboard after login
- [ ] **FNDN-04**: User sees a sidebar with module labels matching the v1.0 architecture (Assets, Assignments, Maintenance, AI Assistant, OCR Intake, Predictive, Reports, Audit Log)
- [ ] **FNDN-05**: User sees navigation items filtered by their role (Staff cannot see Audit Log; Auditor cannot see create/edit actions)
- [ ] **FNDN-06**: User can log out and return to the login page

### Dashboard Overview

- [ ] **DASH-01**: User sees KPI cards: Total Assets, Active Assignments, Assets in Maintenance, Warranty Expiring Soon
- [ ] **DASH-02**: User sees an asset-by-category bar chart with English labels
- [ ] **DASH-03**: User sees a "Warranty Expiring Soon" alert panel (≤ 3 months)
- [ ] **DASH-04**: User sees a "High Failure Risk" AI alert panel with risk scores
- [ ] **DASH-05**: User sees a "Recent Assignments" list with status badges

### Asset Registry

- [x] **ASSET-01**: User can view a paginated list of all assets with lifecycle state badges (registered, available, assigned, maintenance, retired)
- [x] **ASSET-02**: Admin/Asset Manager can open a create-asset form and submit a new asset (mock save)
- [x] **ASSET-03**: Admin/Asset Manager can open an edit-asset form pre-filled with existing data
- [x] **ASSET-04**: Admin can mark an asset as retired via a confirmation dialog
- [x] **ASSET-05**: User can filter assets by category and lifecycle state
- [x] **ASSET-06**: User can search assets by name or serial number

### Assignment & Return Workflow

- [ ] **ASGN-01**: Staff/Asset Manager can create an assignment request form (asset, assignee, expected return date)
- [ ] **ASGN-02**: Asset Manager can approve or reject a pending assignment request
- [ ] **ASGN-03**: User sees assignment state badges: requested, active, overdue, closed, rejected
- [ ] **ASGN-04**: Asset Manager/Staff can initiate a return from an active assignment
- [ ] **ASGN-05**: Asset Manager can validate and close a return (close assignment)
- [ ] **ASGN-06**: Overdue assignments are visually distinguished in the assignment list

### Maintenance & Warranty

- [x] **MAINT-01**: User can view a maintenance schedule list with state badges (scheduled, in_progress, completed, blocked)
- [x] **MAINT-02**: Asset Manager can open a maintenance record and update its state
- [x] **MAINT-03**: User can view a warranty tracker list with state badges (active, expiring_soon, expired, void)
- [x] **MAINT-04**: User sees a notification-style warning for assets with warranty expiring within 30 days

### AI Assistant

- [x] **AIST-01**: User can type a natural-language question in an assistant panel
- [x] **AIST-02**: User sees a mock grounded response with answer, source, filters, confidence, and correlation_id fields
- [x] **AIST-03**: User sees an "insufficient data" response variant with clarifying questions when confidence is low
- [x] **AIST-04**: User sees a read-only trace panel showing provenance metadata for each response

### OCR Invoice Intake

- [x] **OCR-01**: User can upload a mock invoice file in an OCR intake panel
- [x] **OCR-02**: User sees extracted fields populated with a mock confidence score and band (High/Medium/Low)
- [x] **OCR-03**: High-confidence intake shows a pre-filled quick-confirm form
- [x] **OCR-04**: Medium-confidence intake shows a field-by-field review form
- [x] **OCR-05**: Low-confidence intake shows a rejection message with a rescan prompt
- [x] **OCR-06**: User must confirm all mandatory fields (Name, Category, Serial, Purchase Date, Vendor, Price) before submit is enabled

### Predictive Maintenance

- [ ] **PRED-01**: User sees a list of AI-generated predictive maintenance recommendations with risk band badges (High, Medium, Low)
- [ ] **PRED-02**: Each recommendation card shows: risk band, confidence score, top contributing factors, correlation_id
- [ ] **PRED-03**: Asset Manager can approve or defer a High-risk recommendation (mock action)
- [ ] **PRED-04**: User sees a mock SLA countdown for unresolved High-risk items
- [ ] **PRED-05**: User sees an escalation notice for items past SLA deadline

### Reporting

- [ ] **RPT-01**: User can view an asset overview report: count by category, count by lifecycle state
- [ ] **RPT-02**: User can view an assignment report: active/historical assignments
- [ ] **RPT-03**: User can view a maintenance schedule report: upcoming and overdue items
- [ ] **RPT-04**: Staff user sees a scoped view of their own assignments only (role-filtered)

### Audit Log

- [ ] **AUDT-01**: Admin/Auditor can view an immutable audit event log with: actor, action, entity, before/after state, timestamp, correlation_id
- [ ] **AUDT-02**: User can filter audit events by category: Business, Security, AI-assisted
- [ ] **AUDT-03**: User can expand an audit event row to see full event details including AI recommendation linkage

## v2 Requirements

Deferred to a future milestone.

### Backend Integration

- **BACK-01**: Connect asset registry to a real FastAPI + PostgreSQL backend
- **BACK-02**: Replace mock authentication with OIDC/SSO identity provider
- **BACK-03**: Wire assignment workflows to persistent backend state

### Real AI Flows

- **AIRT-01**: Connect AI assistant to a real LLM with grounding retrieval
- **AIRT-02**: Connect OCR intake to a real OCR service
- **AIRT-03**: Connect predictive maintenance to a real risk scoring model

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend API implementation | UI-only milestone; mock data only |
| Real authentication / session persistence | Mock login sufficient for UI demonstration |
| Real database or persistence layer | Deferred to v2 backend milestone |
| Mobile-responsive optimization | Desktop-first for this milestone |
| Internationalization / i18n system | English-only for this milestone |
| Unit or integration tests | UI build-first; testing deferred |
| Dark mode | Not requested in this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDN-01 | Phase 5 | Pending |
| FNDN-02 | Phase 5 | Pending |
| FNDN-03 | Phase 5 | Pending |
| FNDN-04 | Phase 5 | Pending |
| FNDN-05 | Phase 5 | Pending |
| FNDN-06 | Phase 5 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| DASH-05 | Phase 5 | Pending |
| ASSET-01 | Phase 6 | Complete |
| ASSET-02 | Phase 6 | Complete |
| ASSET-03 | Phase 6 | Complete |
| ASSET-04 | Phase 6 | Complete |
| ASSET-05 | Phase 6 | Complete |
| ASSET-06 | Phase 6 | Complete |
| ASGN-01 | Phase 7 | Pending |
| ASGN-02 | Phase 7 | Pending |
| ASGN-03 | Phase 7 | Pending |
| ASGN-04 | Phase 7 | Pending |
| ASGN-05 | Phase 7 | Pending |
| ASGN-06 | Phase 7 | Pending |
| MAINT-01 | Phase 8 | Complete |
| MAINT-02 | Phase 8 | Complete |
| MAINT-03 | Phase 8 | Complete |
| MAINT-04 | Phase 8 | Complete |
| AIST-01 | Phase 9 | Complete |
| AIST-02 | Phase 9 | Complete |
| AIST-03 | Phase 9 | Complete |
| AIST-04 | Phase 9 | Complete |
| OCR-01 | Phase 9 | Complete |
| OCR-02 | Phase 9 | Complete |
| OCR-03 | Phase 9 | Complete |
| OCR-04 | Phase 9 | Complete |
| OCR-05 | Phase 9 | Complete |
| OCR-06 | Phase 9 | Complete |
| PRED-01 | Phase 9 | Pending |
| PRED-02 | Phase 9 | Pending |
| PRED-03 | Phase 9 | Pending |
| PRED-04 | Phase 9 | Pending |
| PRED-05 | Phase 9 | Pending |
| RPT-01 | Phase 10 | Pending |
| RPT-02 | Phase 10 | Pending |
| RPT-03 | Phase 10 | Pending |
| RPT-04 | Phase 10 | Pending |
| AUDT-01 | Phase 10 | Pending |
| AUDT-02 | Phase 10 | Pending |
| AUDT-03 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-10 after v1.1 milestone start*
