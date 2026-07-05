# Roadmap: AI-Powered Asset Management System

## Milestones

- ✅ **v1.0 milestone** — shipped 2026-06-09 (4 phases, 5 plans). Full archive: `.planning/milestones/v1.0-ROADMAP.md`
- ✅ **v2.0 Backend Foundation** — shipped 2026-07-05 (6 phases, 6 plans). Full archive: `.planning/milestones/v2.0-ROADMAP.md`

---

## Milestone v1.1: UI Rebuild

**Goal:** Rebuild the entire frontend in English with mock data, aligned to v1.0 architecture modules, lifecycle states, roles, and AI governance flows.
**Phases:** 9 (Phase 5–13)
**Requirements mapped:** 47

## Phases

- [x] **Phase 5: Foundation, Layout & Dashboard** — English shell, 4-role login, role-aware sidebar, and dashboard overview with KPIs and alerts (completed 2026-06-10)
- [x] **Phase 6: Asset Registry UI** — Paginated asset list, create/edit forms, lifecycle state badges, filter and search (completed 2026-06-10)
- [ ] **Phase 7: Assignment & Return Workflow UI** — Request form, approval flow, status badges, return initiation, and close flow
- [x] **Phase 8: Maintenance & Warranty UI** — Maintenance schedule list, state update form, warranty tracker, expiry warnings (completed 2026-06-10)
- [x] **Phase 9: AI Governance UIs** — AI assistant panel, OCR intake with confidence routing, predictive maintenance risk cards and escalation (completed 2026-06-10)
- [x] **Phase 10: Reporting & Audit Log UI** — Role-scoped report views and immutable audit event log with filtering (completed 2026-06-10)
- [x] **Phase 11: Navigation & Access Control Gap Closure** — Fix broken audit navigation target and enforce route-level RBAC for restricted modules (completed 2026-06-10)
- [x] **Phase 12: Assignment Approval Integrity Gap Closure** — Fix assignment approval side-effect desynchronization in conflict paths (completed 2026-06-10)
- [x] **Phase 13: Verification & Validation Artifact Backfill** — Add missing verification/validation artifacts for Phases 5, 8, and 9 (completed 2026-06-10)

## Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 5 | Foundation, Layout & Dashboard | Users can log in as any role, see a role-filtered sidebar, and view the dashboard overview | FNDN-01–06, DASH-01–05 | 5 |
| 6 | Asset Registry UI | 2/2 | Complete    | 2026-06-10 |
| 7 | Assignment & Return Workflow UI | Users can create assignment requests, approve/reject them, track status badges, and close returns | ASGN-01–06 | 5 |
| 8 | Maintenance & Warranty UI | 2/2 | Complete    | 2026-06-10 |
| 9 | AI Governance UIs | Users can query the AI assistant, run OCR intake with confidence routing, and review predictive risk recommendations | AIST-01–04, OCR-01–06, PRED-01–05 | 5 |
| 10 | Reporting & Audit Log UI | 1/3 | In Progress|  |
| 11 | Navigation & Access Control Gap Closure | 2/2 | Complete   | 2026-06-10 |
| 12 | Assignment Approval Integrity Gap Closure | 1/1 | Complete   | 2026-06-10 |
| 13 | Verification & Validation Artifact Backfill | 2/2 | Complete   | 2026-06-10 |

## Phase Details

### Phase 5: Foundation, Layout & Dashboard

**Goal:** Users can log in as any of the four roles, navigate a role-aware sidebar with v1.0 module labels, and view a dashboard with live-looking KPI cards, charts, and alert panels.
**Depends on:** Nothing (first phase of v1.1)
**Requirements:** FNDN-01, FNDN-02, FNDN-03, FNDN-04, FNDN-05, FNDN-06, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):

  1. Login page renders entirely in English with a 4-role picker (Admin, Asset Manager, Staff, Auditor); selecting a role and clicking Login navigates to the dashboard
  2. Sidebar displays all v1.0 module labels (Assets, Assignments, Maintenance, AI Assistant, OCR Intake, Predictive, Reports, Audit Log) and hides role-restricted items — Staff has no Audit Log, Auditor sees no create/edit actions
  3. Dashboard shows four KPI cards (Total Assets, Active Assignments, Assets in Maintenance, Warranty Expiring Soon) with mock numeric values
  4. Dashboard shows an asset-by-category bar chart with English labels and a "Warranty Expiring Soon" alert panel (≤ 3 months)
  5. Dashboard shows a "High Failure Risk" AI alert panel with risk scores and a "Recent Assignments" list with status badges; Logout returns the user to the login page

**Plans:** 3/3 plans complete
Plans:

- [x] 05-01-PLAN.md — Foundation dashboard shell, role-aware navigation, and overview baseline
- [x] 05-02-PLAN.md — DASH-01 KPI contract closure with warranty-soon KPI and regression tests
- [x] 05-03-PLAN.md — Phase 5 tracker and verification/validation synchronization

**UI hint**: yes

### Phase 6: Asset Registry UI

**Goal:** Users can browse the full asset list with lifecycle state badges, and Admin/Asset Manager can create, edit, and retire assets via forms and confirmation dialogs.
**Depends on:** Phase 5
**Requirements:** ASSET-01, ASSET-02, ASSET-03, ASSET-04, ASSET-05, ASSET-06
**Success Criteria** (what must be TRUE):

  1. Asset list page shows a paginated table with lifecycle state badges: registered, available, assigned, maintenance, retired
  2. Admin/Asset Manager sees a "Create Asset" button that opens a form; submitting the form mock-saves and adds the asset to the list
  3. Admin/Asset Manager can click an asset row to open an edit form pre-filled with existing data; saving mock-updates the record
  4. Admin can trigger a "Mark as Retired" action on any asset; a confirmation dialog appears before the state change is applied
  5. Filter controls allow narrowing the list by category and lifecycle state; a search field filters by asset name or serial number

**Plans:** 2/2 plans complete
**UI hint**: yes

### Phase 7: Assignment & Return Workflow UI

**Goal:** Users can create and track assignment requests through their full lifecycle — from request through approval, active use, return initiation, and closure — with clear status badges and overdue highlighting.
**Depends on:** Phase 6
**Requirements:** ASGN-01, ASGN-02, ASGN-03, ASGN-04, ASGN-05, ASGN-06
**Success Criteria** (what must be TRUE):

  1. Staff/Asset Manager can open a "New Assignment Request" form with fields for asset, assignee, and expected return date; submitting creates a record with status "requested"
  2. Asset Manager sees a pending requests queue and can approve (→ active) or reject (→ rejected) each request
  3. Assignment list displays all five status badges — requested, active, overdue, closed, rejected — correctly applied to matching records
  4. Asset Manager or Staff can initiate a return from an active assignment; Asset Manager can then validate and close the return (status → closed)
  5. Overdue assignments are visually distinguished in the list (e.g., red row highlight or overdue badge) without any manual action required

**Plans:** TBD
**UI hint**: yes

### Phase 8: Maintenance & Warranty UI

**Goal:** Users can view scheduled maintenance records with state badges, Asset Manager can update maintenance state, and all users see warranty expiry warnings for at-risk assets.
**Depends on:** Phase 7
**Requirements:** MAINT-01, MAINT-02, MAINT-03, MAINT-04
**Success Criteria** (what must be TRUE):

  1. Maintenance schedule page shows a list of maintenance records with state badges: scheduled, in_progress, completed, blocked
  2. Asset Manager can open a maintenance record and change its state via a dropdown or button group; the badge updates immediately (mock)
  3. Warranty tracker page shows a list of assets with warranty state badges: active, expiring_soon, expired, void
  4. Assets with warranty expiring within 30 days surface a notification-style warning (banner, badge, or alert row) visible without navigating away from the tracker

**Plans:** 2/2 plans complete
Plans:

- [x] 08-01-PLAN.md — Maintenance grouped schedule + guarded inline state updates
- [x] 08-02-PLAN.md — Warranty tracker filters + <=30 day warning summary/jump behavior

**UI hint**: yes

### Phase 9: AI Governance UIs

**Goal:** Users can interact with the AI assistant panel, run OCR invoice intake with confidence-routed review forms, and browse predictive maintenance risk cards with approval and escalation flows.
**Depends on:** Phase 8
**Requirements:** AIST-01, AIST-02, AIST-03, AIST-04, OCR-01, OCR-02, OCR-03, OCR-04, OCR-05, OCR-06, PRED-01, PRED-02, PRED-03, PRED-04, PRED-05
**Success Criteria** (what must be TRUE):

  1. AI Assistant panel accepts a typed natural-language question; the response shows answer, source, filters, confidence score, and correlation_id fields; a low-confidence query returns an "insufficient data" variant with clarifying questions; a read-only trace panel shows provenance metadata for every response
  2. OCR Intake panel accepts a mock file upload and displays extracted fields with a confidence score and band (High / Medium / Low)
  3. Confidence routing displays the correct review form: High → quick-confirm pre-filled form, Medium → field-by-field review form, Low → rejection message with rescan prompt; Submit button is disabled until all mandatory fields (Name, Category, Serial, Purchase Date, Vendor, Price) are confirmed
  4. Predictive Maintenance page lists AI-generated recommendations with risk band badges (High, Medium, Low); each card shows risk band, confidence score, top contributing factors, and correlation_id
  5. Asset Manager can approve or defer a High-risk recommendation (mock action); High-risk items show an SLA countdown and items past deadline show an escalation notice

**Plans:** 3/3 plans complete
Plans:

- [x] 09-01-PLAN.md — Assistant governance response contract + collapsed trace panel
- [x] 09-02-PLAN.md — OCR confidence routing + hierarchy/provenance alignment
- [x] 09-03-PLAN.md — Predictive recommendations + role-gated escalation actions

**UI hint**: yes

### Phase 10: Reporting & Audit Log UI

**Goal:** Users can view role-appropriate summary reports and Admin/Auditor users can read a fully filterable, expandable, immutable audit event log.
**Depends on:** Phase 9
**Requirements:** RPT-01, RPT-02, RPT-03, RPT-04, AUDT-01, AUDT-02, AUDT-03
**Success Criteria** (what must be TRUE):

  1. Reports page shows an asset overview report (count by category, count by lifecycle state), an assignment report (active and historical), and a maintenance schedule report (upcoming and overdue)
  2. A Staff user viewing reports sees only their own assignments — not the full organizational data visible to Admin/Asset Manager
  3. Audit Log page (Admin/Auditor only) shows a table of immutable events with columns: actor, action, entity, before/after state, timestamp, and correlation_id
  4. Audit log supports category filtering (Business, Security, AI-assisted) and clicking a row expands full event details including any AI recommendation linkage

**Plans:** 3/3 plans complete
Plans:

- [x] 10-01-PLAN.md — Reporting selectors + full reports UI coverage and staff scoping
- [x] 10-02-PLAN.md — Immutable audit event contract + read-only dataset selectors
- [x] 10-03-PLAN.md — Audit table UI with category filter and expandable details

**UI hint**: yes

### Phase 11: Navigation & Access Control Gap Closure

**Goal:** Restore valid dashboard navigation targets and enforce route-level role access controls so restricted modules cannot be accessed through direct URL bypass.
**Depends on:** Phase 10
**Requirements:** FNDN-03, FNDN-04, FNDN-06
**Gap Closure:** Closes milestone audit integration/flow gaps for broken audit navigation and route-level RBAC bypass.
**Success Criteria** (what must be TRUE):

  1. Sidebar links only point to existing dashboard routes (no 404 for audit navigation)
  2. Route-level guards deny unauthorized roles from accessing restricted pages via direct URL
  3. Login/logout and role-appropriate navigation behavior remain intact after access-control changes

**Plans:** 2/2 plans complete
**UI hint**: yes

### Phase 12: Assignment Approval Integrity Gap Closure

**Goal:** Ensure assignment approval logic updates assignment and related asset state atomically and only when approval actually succeeds.
**Depends on:** Phase 11
**Requirements:** ASGN-02
**Gap Closure:** Closes milestone audit integration/flow gap for assignment approval conflict desynchronization.
**Success Criteria** (what must be TRUE):

  1. Conflicting approval paths do not mutate asset assignment side effects when assignment state remains unapproved
  2. Successful approvals still transition assignment to active and sync asset status/assignee correctly

**Plans:** 1/1 plans complete
**UI hint**: no

### Phase 13: Verification & Validation Artifact Backfill

**Goal:** Backfill milestone gating artifacts so all completed v1.1 phases have required verification and Nyquist validation coverage records.
**Depends on:** Phase 12
**Requirements:** N/A (artifact backfill phase)
**Gap Closure:** Closes milestone audit gaps for missing phase-level verification/validation artifacts.
**Success Criteria** (what must be TRUE):

  1. Phase 5 and Phase 9 each have a current VERIFICATION.md with explicit requirement coverage and evidence
  2. Missing VALIDATION.md artifacts for audited phases are created or updated with Nyquist status and per-task mapping
  3. Milestone re-audit no longer reports missing verification/validation artifacts for Phases 5, 8, and 9

**Plans:** 2/2 plans complete
Plans:

- [x] 13-01-PLAN.md — Backfill 05/09 VERIFICATION and 05/08 VALIDATION artifacts
- [x] 13-02-PLAN.md — Re-audit milestone artifact gaps and record Phase 13 verification evidence

**UI hint**: no

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Foundation, Layout & Dashboard | 3/3 | Complete | 2026-06-10 |
| 6. Asset Registry UI | 0/? | Not started | - |
| 7. Assignment & Return Workflow UI | 0/? | Not started | - |
| 8. Maintenance & Warranty UI | 0/? | Not started | - |
| 9. AI Governance UIs | 3/3 | Complete | 2026-06-10 |
| 10. Reporting & Audit Log UI | 3/3 | Complete | 2026-06-10 |
| 11. Navigation & Access Control Gap Closure | 2/2 | Complete | 2026-06-10 |
| 12. Assignment Approval Integrity Gap Closure | 0/? | Not started | - |
| 13. Verification & Validation Artifact Backfill | 2/2 | Complete | 2026-06-10 |

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDN-01 | Phase 5 | Complete |
| FNDN-02 | Phase 5 | Complete |
| FNDN-03 | Phase 5 | Complete |
| FNDN-04 | Phase 5 | Complete |
| FNDN-05 | Phase 5 | Complete |
| FNDN-06 | Phase 5 | Complete |
| DASH-01 | Phase 5 | Complete |
| DASH-02 | Phase 5 | Complete |
| DASH-03 | Phase 5 | Complete |
| DASH-04 | Phase 5 | Complete |
| DASH-05 | Phase 5 | Complete |
| ASSET-01 | Phase 6 | Pending |
| ASSET-02 | Phase 6 | Pending |
| ASSET-03 | Phase 6 | Pending |
| ASSET-04 | Phase 6 | Pending |
| ASSET-05 | Phase 6 | Pending |
| ASSET-06 | Phase 6 | Pending |
| ASGN-01 | Phase 7 | Pending |
| ASGN-02 | Phase 7 | Pending |
| ASGN-03 | Phase 7 | Pending |
| ASGN-04 | Phase 7 | Pending |
| ASGN-05 | Phase 7 | Pending |
| ASGN-06 | Phase 7 | Pending |
| MAINT-01 | Phase 8 | Pending |
| MAINT-02 | Phase 8 | Pending |
| MAINT-03 | Phase 8 | Pending |
| MAINT-04 | Phase 8 | Pending |
| AIST-01 | Phase 9 | Pending |
| AIST-02 | Phase 9 | Pending |
| AIST-03 | Phase 9 | Pending |
| AIST-04 | Phase 9 | Pending |
| OCR-01 | Phase 9 | Pending |
| OCR-02 | Phase 9 | Pending |
| OCR-03 | Phase 9 | Pending |
| OCR-04 | Phase 9 | Pending |
| OCR-05 | Phase 9 | Pending |
| OCR-06 | Phase 9 | Pending |
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

**v1.1 Coverage: 47/47 requirements mapped ✓**

---
*Roadmap created: 2026-06-10 for milestone v1.1 UI Rebuild*

---

## Milestone v1.2: IoT System Design

**Goal:** Act as a Senior Software Architect and Enterprise UX Designer — produce a complete Software Design Document (SDD) for the Smart AI-Powered Asset Management System before any implementation begins. This is an architecture-and-design-only milestone that produces an enterprise-grade software blueprint.
**Phases:** 6 (Phase 14–19)
**Requirements mapped:** 35

## Phases

- [x] **Phase 14: System Architecture & Domain Model** — Architecture diagrams covering all pipelines (IoT, AI, Notification, Docker) and domain state machines with ER overview
- [x] **Phase 15: Information Architecture, User Flows & Navigation** — Complete navigation map, sitemap, and 5 core user flow diagrams with role-based visibility
- [x] **Phase 16: Design System & Component Catalog** — Material Design 3 color palette, typography, spacing, full component catalog, and chart standards
- [x] **Phase 17: Core UI Wireframes** — Dashboard, Asset Management, Assignment Workflow, Maintenance, and sidebar navigation wireframes
- [x] **Phase 18: IoT & AI UI Wireframes** — IoT Monitoring, AI Predictive, Notification Center, Audit Log, and User Management wireframes
- [x] **Phase 19: Data Design, API Overview & Folder Architecture** — Conceptual ER diagram, API module overview, React and FastAPI folder structures

## Phase Details

### Phase 14: System Architecture & Domain Model

**Goal:** A complete architectural blueprint is produced documenting all system boundaries, service pipelines, Docker topology, and domain state machines with a conceptual entity overview.
**Depends on:** Nothing (first phase of v1.2)
**Requirements:** ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, DOMAIN-01, DOMAIN-02, DOMAIN-03, DOMAIN-04, DOMAIN-05, DOMAIN-06
**Success Criteria** (what must be TRUE):

  1. System Context Diagram shows all 5 external actors (Administrator, Manager, Staff, Python Sensor Simulator, MQTT Broker) and the full system boundary
  2. Module Decomposition diagram covers every module with owned responsibilities and explicit integration boundary contracts
  3. IoT data pipeline design traces the full path: Python Sensor Simulator → MQTT (Mosquitto, QoS 1) → FastAPI MQTT consumer → PostgreSQL `sensor_readings` → WebSocket → React dashboard; topic schema (`assets/{asset_id}/sensors/{sensor_type}`) and JSON payload contract are specified
  4. AI pipeline design defines the complete flow: `sensor_readings` → Feature Engineering → Scikit-learn model → `ai_recommendations` → Manager approval gate → `maintenance_records`; the boundary rule (AI never writes to business tables) is explicitly diagrammed
  5. All domain state machines are diagrammed (asset lifecycle, maintenance lifecycle, AI recommendation) with valid transitions, guards, and business rules; notification and Docker topology diagrams are produced; conceptual ER diagram shows all 9 entities (Assets, Categories, Assignments, MaintenanceRecords, SensorReadings, AIRecommendations, Notifications, AuditEvents, Users) with primary keys, foreign keys, and cardinality

**Plans:** TBD

### Phase 15: Information Architecture, User Flows & Navigation

**Goal:** A complete navigation map, sitemap, and user flow diagrams for all 5 core journeys are produced, grounded in the actor and role model from Phase 14.
**Depends on:** Phase 14
**Requirements:** IA-01, IA-02, IA-03
**Success Criteria** (what must be TRUE):

  1. Navigation map shows all modules with page hierarchy and explicit role-based visibility rules for Administrator, Manager, and Staff (identifying what each role can and cannot see)
  2. Sitemap covers all pages, parent routes, and per-role access control annotations
  3. All 5 user flow diagrams are produced: (1) asset lifecycle transitions, (2) assignment request→approval→return, (3) maintenance ticket creation via AI recommendation, (4) AI recommendation approval by Manager, (5) IoT sensor alert response workflow
  4. Each user flow is traceable to the actors, roles, and state machines defined in Phase 14

**Plans:** TBD
**UI hint**: yes

### Phase 16: Design System & Component Catalog

**Goal:** A complete Material Design 3–based design system is documented with color palette, typography, spacing system, component catalog, and Recharts chart standards.
**Depends on:** Phase 15
**Requirements:** DS-01, DS-02, DS-03, DS-04, DS-05
**Success Criteria** (what must be TRUE):

  1. Color palette defines primary, secondary, semantic tokens (success/warning/error/info), and neutral surface tokens — each with hex values and explicit usage rules
  2. Typography spec defines font family, full type scale (Display, Headline, Title, Body, Label, Caption), line-height and letter-spacing rules per level
  3. Spacing system defines base unit (4px or 8px), layout grid, responsive breakpoints, card padding, and section margin rules
  4. Component catalog documents all variants: Button (primary/secondary/ghost/danger), Input/Select, Card (metric + content), Table, Status Chip (all lifecycle states + risk bands), Badge, Alert/Banner, Modal/Dialog, and Skeleton loader — with visual states (default, hover, disabled, error)
  5. Chart standards define color series palette, axis label formatting, threshold reference line styling, legend placement rules, and empty-state design for Recharts components

**Plans:** TBD
**UI hint**: yes

### Phase 17: Core UI Wireframes

**Goal:** Wireframes for the Dashboard, Asset Management, Assignment Workflow, Maintenance Management, and sidebar navigation are produced — covering the primary daily-use surfaces of the system.
**Depends on:** Phase 16
**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-10
**Success Criteria** (what must be TRUE):

  1. Dashboard wireframe shows KPI cards (Total Assets, Active Assignments, Assets in Maintenance, High Risk Assets count), asset distribution chart, AI risk distribution chart, real-time sensor summary panel, and recent alerts list — all annotated with data sources
  2. Asset Management wireframes cover: asset list (with lifecycle state badge and sensor status dot), asset detail page (with associated sensor readings panel), and create/edit asset form
  3. Assignment Workflow wireframes cover: assignment request form, pending requests queue (Manager view), assignment list with all 5 status badges (Requested/Active/Overdue/Closed/Rejected), return initiation flow, and close flow
  4. Maintenance Management wireframes cover: maintenance schedule list with state badges, state update UI (Asset Manager), and warranty tracker with expiry warning indicators
  5. Sidebar navigation wireframe shows role-aware module list with active, hover, collapsed, and expanded states

**Plans:** TBD
**UI hint**: yes

### Phase 18: IoT & AI UI Wireframes

**Goal:** Wireframes for IoT Monitoring, AI Predictive Maintenance, Notification Center, Audit Log, and User Management pages are produced — covering the IoT, AI governance, and administrative surfaces.
**Depends on:** Phase 17
**Requirements:** UX-05, UX-06, UX-07, UX-08, UX-09
**Success Criteria** (what must be TRUE):

  1. IoT Monitoring wireframe shows: asset selector sidebar with live status dots, per-asset sensor tile grid (one tile per active sensor type showing current value + unit + threshold color), time-series line charts with time window selector (1h/6h/24h/7d), threshold violation indicators, and connection status indicator
  2. AI Predictive Maintenance wireframe shows: recommendation cards with risk band chips (High/Medium/Low), health score and failure risk display, top 3 contributing factors, Manager-only approval gate (Approve | Defer with reason), SLA countdown for High-risk items, and escalation notice for overdue approvals
  3. Notification Center wireframes cover: header bell icon with unread badge, dropdown panel showing latest 5 notifications with deep-link, and full `/notifications` page with pagination and mark-as-read / mark-all-read actions
  4. Audit Log wireframe shows: immutable event table (columns: actor / action / entity / before-after state / timestamp / correlation_id), category filter (Business / Security / AI-assisted), and expandable row for full event details
  5. User Management wireframes (Administrator only) show: user list with role badge, create/edit user form with role assignment, and deactivate (soft-delete) action with no hard-delete option

**Plans:** TBD
**UI hint**: yes

### Phase 19: Data Design, API Overview & Folder Architecture

**Goal:** Conceptual ER diagram, API module overview, and project folder structures for the React frontend and FastAPI backend are documented — completing the SDD artifact set.
**Depends on:** Phase 18
**Requirements:** DATA-01, DATA-02, FOLD-01, FOLD-02
**Success Criteria** (what must be TRUE):

  1. ER diagram documents all entities, relationships, cardinality notation, and field-level design notes for non-obvious choices — with no SQL DDL or CREATE TABLE statements
  2. API module overview names all 9 modules (Auth, Assets, Assignments, Maintenance, IoT Telemetry, AI Predictions, Notifications, Audit, Users) each with a one-line responsibility statement and no endpoint paths or HTTP verbs
  3. React folder structure under `src/` defines all 8 required directories (components/, pages/, hooks/, services/, store/, types/, utils/, theme/) each with a description of what belongs there
  4. FastAPI folder structure under `app/` defines all 8 required modules (routers/, models/, schemas/, services/, core/, db/, mqtt/, ai/) each with a module responsibility description

**Plans:** TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 14. System Architecture & Domain Model | 0/? | Not started | - |
| 15. Information Architecture, User Flows & Navigation | 0/? | Not started | - |
| 16. Design System & Component Catalog | 0/? | Not started | - |
| 17. Core UI Wireframes | 0/? | Not started | - |
| 18. IoT & AI UI Wireframes | 0/? | Not started | - |
| 19. Data Design, API Overview & Folder Architecture | 0/? | Not started | - |

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 14 | ✅ Complete |
| ARCH-02 | Phase 14 | ✅ Complete |
| ARCH-03 | Phase 14 | ✅ Complete |
| ARCH-04 | Phase 14 | ✅ Complete |
| ARCH-05 | Phase 14 | ✅ Complete |
| ARCH-06 | Phase 14 | ✅ Complete |
| ARCH-07 | Phase 14 | ✅ Complete |
| DOMAIN-01 | Phase 14 | ✅ Complete |
| DOMAIN-02 | Phase 14 | ✅ Complete |
| DOMAIN-03 | Phase 14 | ✅ Complete |
| DOMAIN-04 | Phase 14 | ✅ Complete |
| DOMAIN-05 | Phase 14 | ✅ Complete |
| DOMAIN-06 | Phase 14 | ✅ Complete |
| IA-01 | Phase 15 | ✅ Complete |
| IA-02 | Phase 15 | ✅ Complete |
| IA-03 | Phase 15 | ✅ Complete |
| DS-01 | Phase 16 | ✅ Complete |
| DS-02 | Phase 16 | ✅ Complete |
| DS-03 | Phase 16 | ✅ Complete |
| DS-04 | Phase 16 | ✅ Complete |
| DS-05 | Phase 16 | ✅ Complete |
| UX-01 | Phase 17 | ✅ Complete |
| UX-02 | Phase 17 | ✅ Complete |
| UX-03 | Phase 17 | ✅ Complete |
| UX-04 | Phase 17 | ✅ Complete |
| UX-10 | Phase 17 | ✅ Complete |
| UX-05 | Phase 18 | ✅ Complete |
| UX-06 | Phase 18 | ✅ Complete |
| UX-07 | Phase 18 | ✅ Complete |
| UX-08 | Phase 18 | ✅ Complete |
| UX-09 | Phase 18 | ✅ Complete |
| DATA-01 | Phase 19 | ✅ Complete |
| DATA-02 | Phase 19 | ✅ Complete |
| FOLD-01 | Phase 19 | ✅ Complete |
| FOLD-02 | Phase 19 | ✅ Complete |

**v1.2 Coverage: 35/35 requirements satisfied ✅**

---
*v1.2 roadmap appended: 2026-06-28 for milestone v1.2 IoT System Design*

---

## Milestone v1.3: Frontend UI Implementation

**Goal:** Implement all 10 frontend UI sections with mock/static data, extending existing v1.1 pages and building new IoT/AI/Notifications/Audit/User Management pages — fully aligned to SDD wireframes, using shadcn/ui + Tailwind v4 + Recharts.
**Phases:** 5 (Phase 20–24)
**Requirements mapped:** 42

## Phases

- [x] **Phase 20: Dashboard Refinement & Design System Hardening** — Align dashboard to WIREFRAMES.md §2 layout, add Asset Health, AI Risk Distribution, Recent Alerts, Maintenance Schedule, Equipment Status widgets; harden all cross-cutting DX requirements
- [ ] **Phase 21: Asset, Assignment & Maintenance Refinement** — Extend all three existing v1.1 pages to match WIREFRAMES.md §3–§5: add missing columns, overdue derived state, full assignment state lifecycle UI, maintenance state transitions
- [ ] **Phase 22: IoT Monitoring Page** — Build `/dashboard/iot` page with device grid, sensor value chips, per-sensor telemetry charts with threshold reference lines (WIREFRAMES_2.md §6)
- [x] **Phase 23: AI Predictive Maintenance Page** — Build `/dashboard/ai` page (fix `/predictive` route gap), health score leaderboard, recommendation cards with Approve/Defer workflow (WIREFRAMES_2.md §7)
- [x] **Phase 24: Notifications, Audit Log & User Management** — Build `/dashboard/notifications` inbox, `/dashboard/audit` append-only log, `/dashboard/users` admin-only user management (WIREFRAMES_2.md §8–§10)

---

### Phase 20: Dashboard Refinement & Design System Hardening

**Goal:** Dashboard page matches WIREFRAMES.md §2 exactly; all cross-cutting DX requirements enforced across the app.
**Depends on:** Nothing (first phase of v1.3)

**Success criteria:**

1. Dashboard shows all 6 widget sections: stat cards, Asset Health chart, AI Risk Distribution card, Recent Alerts, Maintenance Schedule, Equipment Status
2. All charts use `ChartContainer` pattern — no raw `ResponsiveContainer` anywhere in the codebase
3. All status badges use `status-badge.tsx` — no inline colored spans
4. Empty states on all list pages use `ChartEmptyState` or equivalent component
5. Sidebar responsive collapse (`hidden md:flex`) works on viewport < 768px

**Requirements:** DASH2-01, DASH2-02, DASH2-03, DASH2-04, DASH2-05, DASH2-06, DX-01, DX-02, DX-03, DX-04, DX-05

---

### Phase 21: Asset, Assignment & Maintenance Refinement

**Goal:** Three existing pages fully aligned to WIREFRAMES.md §3–§5 with all missing columns, filters, state badges, and workflow actions.
**Depends on:** Phase 20

**Success criteria:**

1. Asset list shows all columns from WIREFRAMES.md §3.1; detail drawer shows sensor_device_id and lifecycle state machine display
2. Assignment list shows all 5 states with correct badges; overdue rows are visually distinguished using client-side derived logic
3. Assignment request form, approval flow, and return initiation all work end-to-end with mock data
4. Maintenance list shows all 4 states; detail page shows blocked reason and AI correlation ID when present
5. Manager/Admin can advance maintenance state through all transitions

**Requirements:** ASSET2-01, ASSET2-02, ASSET2-03, ASSET2-04, ASGN2-01, ASGN2-02, ASGN2-03, ASGN2-04, ASGN2-05, ASGN2-06, MAINT2-01, MAINT2-02, MAINT2-03, MAINT2-04

---

### Phase 22: IoT Monitoring Page

**Goal:** A fully functional `/dashboard/iot` page with device grid and per-sensor telemetry charts.
**Depends on:** Phase 20

**Success criteria:**

1. Device grid shows one card per monitored asset with Online/Offline/Warning status badge
2. Each card shows 3–6 sensor reading value chips with correct sensor types per category (Laptop: no vibration; Printer: all 6)
3. Selecting a device shows per-sensor line charts with realistic mock time-series data
4. Charts include warning and critical reference lines per DESIGN_SYSTEM.md §5 chart standards
5. Page is accessible from sidebar `/dashboard/iot` link with correct role filtering (Admin + Manager visible)

**Requirements:** IOT-01, IOT-02, IOT-03, IOT-04, IOT-05

---

### Phase 23: AI Predictive Maintenance Page

**Goal:** `/dashboard/ai` page fully implemented with health score leaderboard and Approve/Defer recommendation workflow.
**Depends on:** Phase 20

**Success criteria:**

1. `/dashboard/ai/page.tsx` exists and renders — old `/dashboard/predictive` route redirects to `/dashboard/ai`
2. Health score leaderboard shows assets sorted by failure risk with health %, risk %, confidence %
3. Recommendation cards show all fields: health gauge, risk badge, confidence, top factors list
4. Approve and Defer actions are only visible to Manager/Admin; each shows a confirmation dialog
5. Approve dialog explains maintenance ticket creation; Defer dialog has reason input field
6. Status badges use the already-implemented `pending`/`approved`/`deferred`/`expired` states

**Requirements:** AIPM-01, AIPM-02, AIPM-03, AIPM-04, AIPM-05, AIPM-06, AIPM-07

---

### Phase 24: Notifications, Audit Log & User Management

**Goal:** Three new pages (`/dashboard/notifications`, `/dashboard/audit`, `/dashboard/users`) all fully functional with mock data.
**Depends on:** Phase 20

**Success criteria:**

1. Notifications inbox shows all 4 notification types; unread items are visually distinct; mark-as-read and mark-all-as-read work
2. Notification type filter works client-side; notification bell in top nav shows unread count badge
3. Audit log table is display-only with all columns; clicking a row expands before/after JSON panel
4. Audit log category filter (business/security/ai_assisted) works client-side
5. User list shows username, email, role badge, active status; Admin can create user, edit role, and deactivate (soft-delete with confirmation)
6. User Management page returns 403-style redirect for non-Admin roles

**Requirements:** NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, USER-01, USER-02, USER-03, USER-04, USER-05

---

### v1.3 Requirement Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH2-01 | Phase 20 | ✅ Complete |
| DASH2-02 | Phase 20 | ✅ Complete |
| DASH2-03 | Phase 20 | ✅ Complete |
| DASH2-04 | Phase 20 | ✅ Complete |
| DASH2-05 | Phase 20 | ✅ Complete |
| DASH2-06 | Phase 20 | ✅ Complete |
| DX-01 | Phase 20 | ✅ Complete |
| DX-02 | Phase 20 | ✅ Complete |
| DX-03 | Phase 20 | ✅ Complete |
| DX-04 | Phase 20 | ✅ Complete |
| DX-05 | Phase 20 | ✅ Complete |
| ASSET2-01 | Phase 21 | Pending |
| ASSET2-02 | Phase 21 | Pending |
| ASSET2-03 | Phase 21 | Pending |
| ASSET2-04 | Phase 21 | Pending |
| ASGN2-01 | Phase 21 | Pending |
| ASGN2-02 | Phase 21 | Pending |
| ASGN2-03 | Phase 21 | Pending |
| ASGN2-04 | Phase 21 | Pending |
| ASGN2-05 | Phase 21 | Pending |
| ASGN2-06 | Phase 21 | Pending |
| MAINT2-01 | Phase 21 | Pending |
| MAINT2-02 | Phase 21 | Pending |
| MAINT2-03 | Phase 21 | Pending |
| MAINT2-04 | Phase 21 | Pending |
| IOT-01 | Phase 22 | Pending |
| IOT-02 | Phase 22 | Pending |
| IOT-03 | Phase 22 | Pending |
| IOT-04 | Phase 22 | Pending |
| IOT-05 | Phase 22 | Pending |
| AIPM-01 | Phase 23 | ✅ Complete |
| AIPM-02 | Phase 23 | ✅ Complete |
| AIPM-03 | Phase 23 | ✅ Complete |
| AIPM-04 | Phase 23 | ✅ Complete |
| AIPM-05 | Phase 23 | ✅ Complete |
| AIPM-06 | Phase 23 | ✅ Complete |
| AIPM-07 | Phase 23 | ✅ Complete |
| NOTIF-01 | Phase 24 | ✅ Complete |
| NOTIF-02 | Phase 24 | ✅ Complete |
| NOTIF-03 | Phase 24 | ✅ Complete |
| NOTIF-04 | Phase 24 | ✅ Complete |
| NOTIF-05 | Phase 24 | ✅ Complete |
| AUDIT-01 | Phase 24 | ✅ Complete |
| AUDIT-02 | Phase 24 | ✅ Complete |
| AUDIT-03 | Phase 24 | ✅ Complete |
| AUDIT-04 | Phase 24 | ✅ Complete |
| USER-01 | Phase 24 | ✅ Complete |
| USER-02 | Phase 24 | ✅ Complete |
| USER-03 | Phase 24 | ✅ Complete |
| USER-04 | Phase 24 | ✅ Complete |
| USER-05 | Phase 24 | ✅ Complete |

**v1.3 Coverage: 42/42 requirements mapped ✓**

---
*v1.3 roadmap appended: 2026-06-28 for milestone v1.3 Frontend UI Implementation*

---

<details>
<summary>✅ v2.0 Backend Foundation (Phases 25–30) — SHIPPED 2026-07-05</summary>

- [x] Phase 25: Backend Scaffold & Docker Environment (1/1 plan) — completed 2026-07-05
- [x] Phase 26: Database Models & Migrations (1/1 plan) — completed 2026-07-05
- [x] Phase 27: Authentication & Authorization (1/1 plan) — completed 2026-07-05
- [x] Phase 28: Asset API (1/1 plan) — completed 2026-07-05
- [x] Phase 29: User, Assignment & Maintenance APIs (1/1 plan) — completed 2026-07-05
- [x] Phase 30: Frontend Wiring (1/1 plan) — completed 2026-07-05

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

---
*v2.0 roadmap archived: 2026-07-05*

---

## Milestone v2.1: IoT Pipeline & Real-Time Data

**Goal:** Build the end-to-end IoT sensor telemetry pipeline — Python sensor simulator → Mosquitto MQTT broker → FastAPI MQTT consumer → `sensor_readings` PostgreSQL table → WebSocket broadcast → Next.js IoT Monitoring page — replacing all mock sensor data with real live readings.
**Phases:** 5 (Phase 31–35)
**Requirements mapped:** 21

## Phases

- [x] **Phase 31: Sensor Readings Data Model & Migration** — SQLAlchemy `SensorReading` model and Alembic migration `0002_sensor_readings.py` with composite index; no FK to assets (string-match at query time) (completed 2026-07-05)
- [x] **Phase 32: Mosquitto Broker & Docker Compose Integration** — Add `eclipse-mosquitto:2.0.22` Docker Compose service with explicit `listener 1883 / allow_anonymous true` config; wire `MQTT_HOST`/`MQTT_PORT` into api service and config.py (completed 2026-07-05)
- [ ] **Phase 33: WebSocket ConnectionManager + MQTT Consumer + IoT Router** — `ConnectionManager` (set + asyncio.Lock), aiomqtt consumer launched via lifespan `asyncio.create_task`, WebSocket endpoint `/api/v1/iot/ws/{device_id}`, REST backfill endpoint `/api/v1/iot/readings/{device_id}`
- [ ] **Phase 34: Sensor Simulator** — `scripts/sensor_simulator.py` publishing all 6 `SENSOR_CONFIG` metrics every 5 s over aiomqtt; `seed.py` updated with `sensor_device_id` values; end-to-end pipeline smoke-tested
- [ ] **Phase 35: Frontend IoT Wiring** — `useIotWebSocket` hook with reconnect + cleanup, `iotApi` namespace in `frontend/lib/api.ts`, IoT Monitoring page replaces `generateReadings()` mock with hook + history backfill

---

### Phase 31: Sensor Readings Data Model & Migration

**Goal:** The `sensor_readings` table exists in PostgreSQL, is indexed for fast time-range queries, and is intentionally decoupled from `assets` to keep the ingestion path write-optimised.
**Depends on:** Phase 30 (existing Alembic baseline `0001`)
**Requirements:** IOT-DB-01, IOT-DB-02, IOT-DB-03

**Success Criteria** (what must be TRUE):

  1. `docker compose exec api alembic upgrade head` completes without error and `\d sensor_readings` shows all seven columns (`id` UUID PK, `device_id`, `asset_id` nullable, `metric`, `value` float, `unit`, `recorded_at` timestamptz)
  2. `EXPLAIN` on `SELECT … WHERE device_id = ? AND metric = ? AND recorded_at > ?` uses the composite index `(device_id, metric, recorded_at DESC)` — no sequential scan
  3. A manual INSERT into `sensor_readings` with a `device_id` that has no matching row in `assets` succeeds without FK violation — confirming the intentional no-FK design

**Plans:** 1/1 plans complete

Plans:

- [x] 31-01-PLAN.md — Create SensorReading model, migration 0002, register in env.py, verify all three IOT-DB requirements

---

### Phase 32: Mosquitto Broker & Docker Compose Integration

**Goal:** The Mosquitto 2.x broker runs as a Docker Compose service, accepts anonymous MQTT connections on port 1883, and the FastAPI api service has MQTT connection settings available via environment variables.
**Depends on:** Phase 31
**Requirements:** IOT-MQTT-01, IOT-MQTT-02, IOT-MQTT-03

**Success Criteria** (what must be TRUE):

  1. `docker compose up mosquitto` starts cleanly; `docker logs mosquitto` shows `Opening ipv4 listen socket on port 1883` — confirming the listener is active (not the Mosquitto 2.x silent-refusal default)
  2. `mosquitto_pub -h localhost -p 1883 -t test/ping -m hello` published from the host is echoed back by `mosquitto_sub -h localhost -p 1883 -t test/ping` — confirming anonymous connections are accepted
  3. `docker compose up api` starts without missing-env errors; `GET /api/v1/health` (or equivalent) returns 200 — confirming `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT` are present in config

**Plans:** 1/1 plans complete

---

### Phase 33: WebSocket ConnectionManager + MQTT Consumer + IoT Router

**Goal:** The FastAPI backend subscribes to `sensors/+/+`, persists every received reading to PostgreSQL without blocking the event loop, and immediately broadcasts each reading to all connected WebSocket clients — all wired into the application lifespan so the consumer survives indefinitely.
**Depends on:** Phase 32
**Requirements:** IOT-CONS-01, IOT-CONS-02, IOT-CONS-03, IOT-CONS-04, IOT-WS-01, IOT-WS-02, IOT-WS-03, IOT-WS-04

**Success Criteria** (what must be TRUE):

  1. Publishing a test MQTT message to `sensors/DEV-001/temperature` (value 42.0) results in a new row in `sensor_readings` within 1 second — confirming the consumer receives, parses, and persists via `asyncio.to_thread()` without blocking
  2. A WebSocket client connected to `ws://localhost:8000/api/v1/iot/ws/DEV-001` receives a JSON frame `{"device_id":"DEV-001","metric":"temperature","value":42.0,"ts":<ms>}` immediately after the MQTT publish — confirming the broadcast path
  3. `GET /api/v1/iot/readings/DEV-001?metric=temperature&limit=10` returns a JSON array of up to 10 readings in descending `recorded_at` order — confirming the REST backfill endpoint
  4. `docker compose stop api && docker compose start api` — MQTT consumer restarts cleanly via lifespan without zombie tasks or `CancelledError` tracebacks in logs

**Plans:** 2 plans

Plans:
- [ ] 33-01-PLAN.md — Foundation: ConnectionManager singleton, MQTT consumer package, SensorReadingOut schema
- [ ] 33-02-PLAN.md — Router + Wiring: IoT router (WS + REST endpoints), lifespan task lifecycle, aiomqtt dependency
**UI hint**: yes

---

### Phase 34: Sensor Simulator

**Goal:** A local Python script publishes realistic synthetic sensor data for all 6 `SENSOR_CONFIG` metrics at 5-second intervals across all seeded device IDs, providing a fully observable end-to-end pipeline from simulator through broker, consumer, database, and WebSocket.
**Depends on:** Phase 33
**Requirements:** IOT-SIM-01, IOT-SIM-02, IOT-SIM-03

**Success Criteria** (what must be TRUE):

  1. `python scripts/sensor_simulator.py` connects to Mosquitto and begins publishing; `docker logs` for the `api` service shows INSERT confirmations for all 6 metric keys (`temperature`, `humidity`, `power`, `current`, `vibration`, `running_hours`) within 30 seconds — confirming metric coverage matches `SENSOR_CONFIG`
  2. After 60 seconds of simulator running, `SELECT COUNT(*) FROM sensor_readings GROUP BY metric` shows ≥ 6 rows per metric per seeded device — confirming the 5-second interval and all device IDs are targeted
  3. `SIGINT` (Ctrl-C) on the simulator exits cleanly within 2 seconds with no `asyncio` exception traceback — confirming graceful `aiomqtt` shutdown

**Plans:** 1 plan

Plans:
- [ ] 34-01-PLAN.md — Create sensor_simulator.py + extend seed.py with seed_iot_assets()

---

### Phase 35: Frontend IoT Wiring

**Goal:** The IoT Monitoring page sources all sensor data from the live backend — WebSocket stream for real-time updates and REST history fetch for cold-start backfill — with `generateReadings()` mock fully removed and the hook surviving `docker compose restart api`.
**Depends on:** Phase 34
**Requirements:** IOT-FE-01, IOT-FE-02, IOT-FE-03, IOT-FE-04

**Success Criteria** (what must be TRUE):

  1. Loading `/dashboard/iot` with the simulator running shows live-updating line charts within 5 seconds — `generateReadings()` import is absent from `iot/page.tsx` and charts populate from `useIotWebSocket` hook state
  2. On fresh page load (before the first WebSocket message), charts show historical data backfilled from `GET /api/v1/iot/readings/{device_id}` — no empty chart flash on initial mount
  3. `docker compose restart api` while the IoT page is open causes a momentary disconnect; the page auto-reconnects within 10 seconds and resumes streaming without a browser refresh
  4. Opening two browser tabs on `/dashboard/iot` with the same `deviceId` and publishing a single MQTT message results in exactly one new data point on each tab's chart — confirming no duplicate subscriptions from React StrictMode double-mount

**Plans:** TBD
**UI hint**: yes

---

### v2.1 Requirement Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IOT-DB-01 | Phase 31 | Pending |
| IOT-DB-02 | Phase 31 | Pending |
| IOT-DB-03 | Phase 31 | Pending |
| IOT-MQTT-01 | Phase 32 | Pending |
| IOT-MQTT-02 | Phase 32 | Pending |
| IOT-MQTT-03 | Phase 32 | Pending |
| IOT-CONS-01 | Phase 33 | Pending |
| IOT-CONS-02 | Phase 33 | Pending |
| IOT-CONS-03 | Phase 33 | Pending |
| IOT-CONS-04 | Phase 33 | Pending |
| IOT-WS-01 | Phase 33 | Pending |
| IOT-WS-02 | Phase 33 | Pending |
| IOT-WS-03 | Phase 33 | Pending |
| IOT-WS-04 | Phase 33 | Pending |
| IOT-SIM-01 | Phase 34 | Pending |
| IOT-SIM-02 | Phase 34 | Pending |
| IOT-SIM-03 | Phase 34 | Pending |
| IOT-FE-01 | Phase 35 | Pending |
| IOT-FE-02 | Phase 35 | Pending |
| IOT-FE-03 | Phase 35 | Pending |
| IOT-FE-04 | Phase 35 | Pending |

**v2.1 Coverage: 21/21 requirements mapped ✓**

---
*v2.1 roadmap appended: 2026-07-05 for milestone v2.1 IoT Pipeline & Real-Time Data*
