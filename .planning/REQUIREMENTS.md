# Requirements: AI-Powered Asset Management System

**Defined:** 2026-06-10 (v1.1) | **Updated:** 2026-06-28 (v1.3)
**Core Value:** Give teams a production-aligned UI for asset lifecycle operations with AI governance flows — English, mock data, architecture-accurate.

## v1.1 Requirements

Requirements for v1.1 UI Rebuild milestone. All requirements target `v0-ai-asset-management` (Next.js + shadcn/ui + Tailwind). Mock data only.

### Foundation & Navigation

- [x] **FNDN-01**: User sees a login page with all text in English (no Vietnamese)
- [x] **FNDN-02**: User can pick one of four roles on the login page: Admin, Asset Manager, Staff, Auditor
- [x] **FNDN-03**: User is redirected to a role-appropriate dashboard after login
- [x] **FNDN-04**: User sees a sidebar with module labels matching the v1.0 architecture (Assets, Assignments, Maintenance, AI Assistant, OCR Intake, Predictive, Reports, Audit Log)
- [x] **FNDN-05**: User sees navigation items filtered by their role (Staff cannot see Audit Log; Auditor cannot see create/edit actions)
- [x] **FNDN-06**: User can log out and return to the login page

### Dashboard Overview

- [x] **DASH-01**: User sees KPI cards: Total Assets, Active Assignments, Assets in Maintenance, Warranty Expiring Soon
- [x] **DASH-02**: User sees an asset-by-category bar chart with English labels
- [x] **DASH-03**: User sees a "Warranty Expiring Soon" alert panel (≤ 3 months)
- [x] **DASH-04**: User sees a "High Failure Risk" AI alert panel with risk scores
- [x] **DASH-05**: User sees a "Recent Assignments" list with status badges

### Asset Registry

- [x] **ASSET-01**: User can view a paginated list of all assets with lifecycle state badges (registered, available, assigned, maintenance, retired)
- [x] **ASSET-02**: Admin/Asset Manager can open a create-asset form and submit a new asset (mock save)
- [x] **ASSET-03**: Admin/Asset Manager can open an edit-asset form pre-filled with existing data
- [x] **ASSET-04**: Admin can mark an asset as retired via a confirmation dialog
- [x] **ASSET-05**: User can filter assets by category and lifecycle state
- [x] **ASSET-06**: User can search assets by name or serial number

### Assignment & Return Workflow

- [ ] **ASGN-01**: Staff/Asset Manager can create an assignment request form (asset, assignee, expected return date)
- [x] **ASGN-02**: Asset Manager can approve or reject a pending assignment request
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

- [x] **PRED-01**: User sees a list of AI-generated predictive maintenance recommendations with risk band badges (High, Medium, Low)
- [x] **PRED-02**: Each recommendation card shows: risk band, confidence score, top contributing factors, correlation_id
- [x] **PRED-03**: Asset Manager can approve or defer a High-risk recommendation (mock action)
- [x] **PRED-04**: User sees a mock SLA countdown for unresolved High-risk items
- [x] **PRED-05**: User sees an escalation notice for items past SLA deadline

### Reporting

- [x] **RPT-01**: User can view an asset overview report: count by category, count by lifecycle state
- [x] **RPT-02**: User can view an assignment report: active/historical assignments
- [x] **RPT-03**: User can view a maintenance schedule report: upcoming and overdue items
- [x] **RPT-04**: Staff user sees a scoped view of their own assignments only (role-filtered)

### Audit Log

- [x] **AUDT-01**: Admin/Auditor can view an immutable audit event log with: actor, action, entity, before/after state, timestamp, correlation_id
- [x] **AUDT-02**: User can filter audit events by category: Business, Security, AI-assisted
- [x] **AUDT-03**: User can expand an audit event row to see full event details including AI recommendation linkage

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

---

## v1.2 Requirements

**Milestone:** v1.2 IoT System Design
**Core Value:** Act as a Senior Software Architect and Enterprise UX Designer — produce a complete Software Design Document (SDD) before any implementation begins.
**Defined:** 2026-06-28
**Scope:** Design artifacts only — architecture diagrams, domain models, workflows, wireframes, design system, folder structure. No implementation code.

### System Architecture Design

- [ ] **ARCH-01**: Architect produces a System Context Diagram showing all external actors (Administrator, Manager, Staff, Python Sensor Simulator, MQTT Broker) and the system boundary
- [ ] **ARCH-02**: Architect produces a Module Decomposition diagram showing all modules, their owned responsibilities, and integration boundaries
- [ ] **ARCH-03**: Architect produces an IoT data pipeline design: Python Sensor Simulator → MQTT (Mosquitto, QoS 1) → FastAPI MQTT consumer → PostgreSQL `sensor_readings` → WebSocket → React dashboard; includes MQTT topic schema (`assets/{asset_id}/sensors/{sensor_type}`) and payload contract
- [ ] **ARCH-04**: Architect produces an AI pipeline design: `sensor_readings` → Feature Engineering → Scikit-learn model (Random Forest/XGBoost, trained on synthetic labeled data) → `ai_recommendations` table → Manager approval gate → `maintenance_records`; AI boundary is strictly `ai_recommendations` — AI never writes to business tables
- [ ] **ARCH-05**: Architect produces a Notification pipeline design: event triggers (high failure risk, warranty expiry, upcoming maintenance, overdue return) → Notification service → SSE endpoint → in-app notification center
- [ ] **ARCH-06**: Architect produces a Docker Compose topology diagram with 5 services: frontend, backend, postgres, mosquitto, iot-simulator; includes inter-service network boundaries and port assignments
- [ ] **ARCH-07**: Architect defines the MQTT topic naming convention, QoS 1 delivery contract, JSON payload schema per sensor type, and simulator publish interval rule (configurable, default 10s)

### Business Domain Design

- [ ] **DOMAIN-01**: Architect defines all business actors (Administrator, Manager, Staff) with a full permission matrix covering every module
- [ ] **DOMAIN-02**: Architect produces the asset lifecycle state machine diagram (Registered → Available → Assigned → Maintenance → Retired) with all valid transitions, guards, and business rules per transition
- [ ] **DOMAIN-03**: Architect produces the maintenance lifecycle diagram (Scheduled → In Progress → Completed | Blocked) with the AI-generated ticket creation path and approval workflow
- [ ] **DOMAIN-04**: Architect produces the AI recommendation state machine (Pending → Approved | Deferred) with RBAC enforcement rules (Manager-only approval) and the prohibition on AI autonomous mutation
- [ ] **DOMAIN-05**: Architect produces a conceptual ER diagram with all entities (Assets, Categories, Assignments, MaintenanceRecords, SensorReadings, AIRecommendations, Notifications, AuditEvents, Users), primary keys, foreign keys, and cardinality (no SQL DDL)
- [ ] **DOMAIN-06**: Architect defines the sensor category mapping: which of the 6 sensor types (temperature, humidity, power consumption, current, vibration, running hours) are active per asset category

### Information Architecture & Navigation

- [ ] **IA-01**: Designer produces the full navigation map with page hierarchy and role-based visibility rules for Administrator, Manager, and Staff
- [ ] **IA-02**: Designer produces the sitemap showing all pages, parent routes, and per-role access control
- [ ] **IA-03**: Designer produces user flow diagrams for 5 core journeys: (1) asset lifecycle transitions, (2) assignment request→approval→return, (3) maintenance ticket creation via AI recommendation, (4) AI recommendation approval by Manager, (5) IoT sensor alert response workflow

### UI/UX Wireframes

- [ ] **UX-01**: Designer produces wireframe for the Dashboard: KPI cards (Total Assets, Active Assignments, Assets in Maintenance, High Risk Assets count), asset distribution chart, AI risk distribution chart, real-time sensor summary panel, recent alerts list
- [ ] **UX-02**: Designer produces wireframes for Asset Management pages: asset list (with lifecycle state badge + sensor status dot), asset detail page (with associated sensor readings panel), create/edit asset form
- [ ] **UX-03**: Designer produces wireframes for Assignment Workflow pages: assignment request form, pending requests queue (Manager view), assignment list with all status badges (Requested / Active / Overdue / Closed / Rejected), return initiation flow, close flow
- [ ] **UX-04**: Designer produces wireframes for Maintenance Management pages: maintenance schedule list with state badges, state update UI (Asset Manager), warranty tracker with expiry warning indicators
- [ ] **UX-05**: Designer produces wireframes for IoT Monitoring pages: asset selector sidebar with live status dots, per-asset sensor tile grid (one metric tile per active sensor type showing current value + unit + threshold color), time-series line charts with time window selector (1h/6h/24h/7d), threshold violation indicators, connection status indicator
- [ ] **UX-06**: Designer produces wireframes for AI Predictive Maintenance pages: recommendation card list with risk band chips (High/Medium/Low), health score and failure risk display, top 3 contributing factors, Manager approval gate (Approve | Defer with reason), SLA countdown for High-risk items, escalation notice for overdue approvals
- [ ] **UX-07**: Designer produces wireframes for the Notification Center: header bell icon + unread badge, dropdown panel showing latest 5 notifications with deep-link, full `/notifications` page with pagination and mark-as-read / mark-all-read actions
- [ ] **UX-08**: Designer produces wireframe for the Audit Log page: immutable event table (columns: actor / action / entity / before-after state / timestamp / correlation_id), category filter (Business / Security / AI-assisted), expandable row for full event details
- [ ] **UX-09**: Designer produces wireframes for User Management pages (Administrator only): user list with role badge, create/edit user form with role assignment, deactivate (soft-delete) action — no hard-delete
- [ ] **UX-10**: Designer produces wireframe for the sidebar navigation: role-aware module list, active/hover states, collapsed/expanded states

### Design System

- [ ] **DS-01**: Designer defines the color palette following Material Design 3: primary, secondary, semantic tokens (success/warning/error/info), neutral surface tokens, with hex values and usage rules
- [ ] **DS-02**: Designer defines typography: font family selection, type scale (Display, Headline, Title, Body, Label, Caption levels), line height and letter spacing rules
- [ ] **DS-03**: Designer defines spacing system: base unit (4px or 8px), layout grid, breakpoints, card padding, section margins
- [ ] **DS-04**: Designer defines the component catalog: Button variants, Input/Select, Card (metric card, content card), Table, Status Chip (all lifecycle states + risk bands), Badge, Alert/Banner, Modal/Dialog, Skeleton loader
- [ ] **DS-05**: Designer defines chart design standards for Recharts: color series palette, axis label formatting, threshold reference line styling, legend placement rules, empty state design

### Conceptual Data & API Design

- [ ] **DATA-01**: Architect documents the conceptual ER diagram with all entities, relationships, cardinality notation, and field-level notes for non-obvious design choices (no SQL DDL, no CREATE TABLE statements)
- [ ] **DATA-02**: Architect documents the future API module overview: Auth, Assets, Assignments, Maintenance, IoT Telemetry, AI Predictions, Notifications, Audit, Users — module name + responsibility only (no endpoint paths, no HTTP verbs)

### Folder Architecture

- [ ] **FOLD-01**: Architect designs the React project folder structure under `src/`: components/, pages/, hooks/, services/, store/, types/, utils/, theme/ — with description of what belongs in each directory
- [ ] **FOLD-02**: Architect designs the FastAPI project folder structure under `app/`: routers/, models/, schemas/, services/, core/, db/, mqtt/, ai/ — with description of module responsibility

## Out of Scope (v1.2)

| Feature | Reason |
|---------|--------|
| Any implementation code (frontend or backend) | Design-only milestone by explicit user request |
| SQL DDL / CREATE TABLE statements | Conceptual ER only — no schema implementation |
| API endpoint design (paths, HTTP verbs, request/response bodies) | Module-level overview only; endpoint design deferred to implementation milestone |
| MLOps: model retraining pipelines, CI/CD for models, drift detection | Scope boundary: model is pre-trained offline, served via joblib `.pkl` |
| Real MQTT broker integration or running simulator | Architecture design only; no live infrastructure |
| Mobile responsive optimization | Desktop-first enterprise UI |
| Email/SMS notification channels | In-app notifications only |
| External identity providers (OIDC/SSO) | JWT auth is sufficient for academic project scope |
| Physical IoT hardware integration | Simulated sensor data only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 14 | Pending |
| ARCH-02 | Phase 14 | Pending |
| ARCH-03 | Phase 14 | Pending |
| ARCH-04 | Phase 14 | Pending |
| ARCH-05 | Phase 14 | Pending |
| ARCH-06 | Phase 14 | Pending |
| ARCH-07 | Phase 14 | Pending |
| DOMAIN-01 | Phase 14 | Pending |
| DOMAIN-02 | Phase 14 | Pending |
| DOMAIN-03 | Phase 14 | Pending |
| DOMAIN-04 | Phase 14 | Pending |
| DOMAIN-05 | Phase 14 | Pending |
| DOMAIN-06 | Phase 14 | Pending |
| IA-01 | Phase 15 | Pending |
| IA-02 | Phase 15 | Pending |
| IA-03 | Phase 15 | Pending |
| UX-01 | Phase 17 | Pending |
| UX-02 | Phase 17 | Pending |
| UX-03 | Phase 17 | Pending |
| UX-04 | Phase 17 | Pending |
| UX-05 | Phase 18 | Pending |
| UX-06 | Phase 18 | Pending |
| UX-07 | Phase 18 | Pending |
| UX-08 | Phase 18 | Pending |
| UX-09 | Phase 18 | Pending |
| UX-10 | Phase 17 | Pending |
| DS-01 | Phase 16 | Pending |
| DS-02 | Phase 16 | Pending |
| DS-03 | Phase 16 | Pending |
| DS-04 | Phase 16 | Pending |
| DS-05 | Phase 16 | Pending |
| DATA-01 | Phase 19 | Pending |
| DATA-02 | Phase 19 | Pending |
| FOLD-01 | Phase 19 | Pending |
| FOLD-02 | Phase 19 | Pending |

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
| FNDN-01 | Phase 5 | Complete |
| FNDN-02 | Phase 5 | Complete |
| FNDN-03 | Phase 11 | Complete |
| FNDN-04 | Phase 11 | Complete |
| FNDN-05 | Phase 5 | Complete |
| FNDN-06 | Phase 11 | Complete |
| DASH-01 | Phase 5 | Complete |
| DASH-02 | Phase 5 | Complete |
| DASH-03 | Phase 5 | Complete |
| DASH-04 | Phase 5 | Complete |
| DASH-05 | Phase 5 | Complete |
| ASSET-01 | Phase 6 | Complete |
| ASSET-02 | Phase 6 | Complete |
| ASSET-03 | Phase 6 | Complete |
| ASSET-04 | Phase 6 | Complete |
| ASSET-05 | Phase 6 | Complete |
| ASSET-06 | Phase 6 | Complete |
| ASGN-01 | Phase 7 | Pending |
| ASGN-02 | Phase 12 | Complete |
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
| PRED-01 | Phase 9 | Complete |
| PRED-02 | Phase 9 | Complete |
| PRED-03 | Phase 9 | Complete |
| PRED-04 | Phase 9 | Complete |
| PRED-05 | Phase 9 | Complete |
| RPT-01 | Phase 10 | Complete |
| RPT-02 | Phase 10 | Complete |
| RPT-03 | Phase 10 | Complete |
| RPT-04 | Phase 10 | Complete |
| AUDT-01 | Phase 10 | Complete |
| AUDT-02 | Phase 10 | Complete |
| AUDT-03 | Phase 10 | Complete |

**Coverage:**
- v1.1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0 ✓

---

## v1.3 Requirements

Requirements for **v1.3 Frontend UI Implementation**. All requirements target the existing Next.js 15 / shadcn/ui / Tailwind v4 / Recharts 3 frontend. Mock/static data only — no backend connectivity. Grounded in WIREFRAMES.md + WIREFRAMES_2.md + DESIGN_SYSTEM.md.

### Dashboard Refinement

- [ ] **DASH2-01**: Dashboard shows summary stat cards (Total Assets, Assigned, In Maintenance, Available) with accurate mock counts aligned to WIREFRAMES.md §2.1
- [ ] **DASH2-02**: Dashboard shows an "Asset Health Overview" donut or bar chart (Healthy / At Risk / Critical) using `ChartContainer` + Recharts
- [ ] **DASH2-03**: Dashboard shows an "AI Risk Distribution" card (distribution of failure risk levels across monitored assets) per WIREFRAMES.md §2.3
- [ ] **DASH2-04**: Dashboard shows a "Recent Alerts" section: high failure risk, overdue returns, warranty expiry per WIREFRAMES.md §2.4
- [ ] **DASH2-05**: Dashboard shows a "Maintenance Schedule" upcoming items list with date + status per WIREFRAMES.md §2.5
- [ ] **DASH2-06**: Dashboard shows an "Equipment Status" mini table with asset name, category, sensor status per WIREFRAMES.md §2.6

### Asset Management Refinement

- [ ] **ASSET2-01**: Asset list table shows all columns from WIREFRAMES.md §3.1: Name, Serial, Category, Status, Location, Assigned To, Last Updated
- [ ] **ASSET2-02**: Asset detail page/drawer shows full lifecycle state machine display and sensor device ID per §3.2
- [ ] **ASSET2-03**: Asset create/edit form validates all required fields (name, serial, category, purchase date, warranty date) per §3.3
- [ ] **ASSET2-04**: Asset list supports search by name or serial + filter by category + filter by lifecycle state simultaneously

### Assignment Workflow Refinement

- [ ] **ASGN2-01**: Assignment list shows all 5 states (requested, active, overdue [derived], closed, rejected) with correct status badges per WIREFRAMES.md §4.1
- [ ] **ASGN2-02**: "Overdue" visual distinction: row highlight or badge when `status === 'active' && expected_return_date < today` (computed client-side, not stored)
- [ ] **ASGN2-03**: Assignment request form: asset picker, assignee picker, expected return date, notes per §4.2
- [ ] **ASGN2-04**: Approval action available to Manager/Admin on `requested` assignments; reject action with reason per §4.3
- [ ] **ASGN2-05**: Return initiation available to Staff/Manager on `active` assignments per §4.4
- [ ] **ASGN2-06**: Assignment history tab shows previous assignments for a selected asset per §4.5

### Maintenance Refinement

- [ ] **MAINT2-01**: Maintenance list shows all 4 states (scheduled, in_progress, completed, blocked) with status badges per WIREFRAMES.md §5.1
- [ ] **MAINT2-02**: Maintenance detail page shows: description, scheduled date, blocked reason (if blocked), linked AI correlation ID (if AI-triggered) per §5.2
- [ ] **MAINT2-03**: Manager/Admin can create a maintenance ticket with asset, description, scheduled date per §5.3
- [ ] **MAINT2-04**: Manager/Admin can advance state (scheduled → in_progress → completed) or mark blocked per §5.4

### IoT Monitoring (NEW)

- [ ] **IOT-01**: IoT Monitoring page (`/dashboard/iot`) shows a device grid with one card per monitored asset — card shows asset name, category, last seen, and a status badge (Online/Offline/Warning) per WIREFRAMES_2.md §6.1
- [ ] **IOT-02**: Each device card shows 3–6 sensor readings as mini value chips (temperature, humidity, power, current, vibration, running hours) per §6.2
- [ ] **IOT-03**: Selecting a device opens a telemetry detail view with per-sensor sparkline/line charts using `ChartContainer` + Recharts LineChart per §6.3
- [ ] **IOT-04**: Telemetry charts show reference lines for warning and critical thresholds per DESIGN_SYSTEM.md §5 chart standards
- [ ] **IOT-05**: Mock telemetry data uses realistic static values per sensor category mapping (SDD §2.6 — Laptop: no vibration; Printer: all 6; etc.)

### AI Predictive Maintenance (NEW)

- [ ] **AIPM-01**: AI Predictions page (`/dashboard/ai`) — fix the `/dashboard/predictive` route gap by creating the page at `/dashboard/ai/page.tsx` per WIREFRAMES_2.md §7.1
- [ ] **AIPM-02**: AI dashboard shows an asset health score leaderboard: sorted by failure risk, showing health score %, failure risk %, confidence % per §7.2
- [ ] **AIPM-03**: Each AI recommendation card shows: asset name, health score gauge or bar, failure risk badge, confidence %, top contributing factors list per §7.3
- [ ] **AIPM-04**: Recommendations in `pending` state show Approve / Defer action buttons (Manager/Admin only) per §7.4
- [ ] **AIPM-05**: Approving a recommendation shows a confirmation dialog explaining that a maintenance ticket will be created per §7.5
- [ ] **AIPM-06**: Deferred recommendations show a defer-reason input before confirmation per §7.6
- [ ] **AIPM-07**: Status badges use the `pending` / `approved` / `deferred` / `expired` states from `status-badge.tsx` (already implemented in Phase 16)

### Notification Center (NEW)

- [ ] **NOTIF-01**: Notifications page (`/dashboard/notifications`) shows a full inbox with all notification types: high_failure_risk, warranty_expiry_warning, upcoming_maintenance, overdue_return per WIREFRAMES_2.md §8.1
- [ ] **NOTIF-02**: Unread notifications are visually distinct (bold title, dot indicator, unread background) per §8.2
- [ ] **NOTIF-03**: User can mark individual notifications as read; "Mark all as read" bulk action available per §8.3
- [ ] **NOTIF-04**: Notification list can be filtered by type (All, Risk Alerts, Warranty, Maintenance, Returns) per §8.4
- [ ] **NOTIF-05**: Notification bell in the top nav shows unread count badge; clicking navigates to `/dashboard/notifications` (not a dropdown) per IA §1.4

### Audit Log (NEW)

- [ ] **AUDIT-01**: Audit Log page (`/dashboard/audit`) shows an append-only event table with columns: Timestamp, Actor, Action, Entity Type, Entity ID, Category per WIREFRAMES_2.md §9.1
- [ ] **AUDIT-02**: Audit events are display-only — no edit, delete, or mutation actions anywhere on the page per §9.2
- [ ] **AUDIT-03**: Audit log can be filtered by category (business / security / ai_assisted) client-side only per §9.3
- [ ] **AUDIT-04**: Clicking an audit event row expands a detail panel showing before_state and after_state JSON per §9.4

### User Management (NEW)

- [ ] **USER-01**: User Management page (`/dashboard/users`) is accessible to Administrator role only per WIREFRAMES_2.md §10.1
- [ ] **USER-02**: User list shows: Username, Email, Role badge, Status (Active/Inactive), Created At per §10.2
- [ ] **USER-03**: Admin can create a new user with username, email, role, password fields per §10.3
- [ ] **USER-04**: Admin can edit a user's role (admin / manager / staff) per §10.4
- [ ] **USER-05**: Admin can deactivate a user (soft-delete: set is_active = false) with a confirmation dialog — no hard-delete per §10.5

### Cross-Cutting / Design System

- [ ] **DX-01**: All new pages use the shared sidebar (`components/sidebar.tsx`) and top nav layout; no new layout files introduced
- [ ] **DX-02**: All charts use `ChartContainer` from `components/ui/chart.tsx` — no raw `ResponsiveContainer` per DESIGN_SYSTEM.md §5
- [ ] **DX-03**: Status badges for all entity states use `components/status-badge.tsx` (no inline colored spans)
- [ ] **DX-04**: Empty states on all list pages use `ChartEmptyState` or equivalent empty-state component per DESIGN_SYSTEM.md §4.6
- [ ] **DX-05**: All pages are responsive — sidebar collapses on mobile (`hidden md:flex` pattern), content stacks vertically per DESIGN_SYSTEM.md §3

### Coverage

**v1.3 requirements: 42 total**
- Dashboard Refinement: 6 (DASH2-01–06)
- Asset Refinement: 4 (ASSET2-01–04)
- Assignment Refinement: 6 (ASGN2-01–06)
- Maintenance Refinement: 4 (MAINT2-01–04)
- IoT Monitoring: 5 (IOT-01–05)
- AI Predictive: 7 (AIPM-01–07)
- Notification Center: 5 (NOTIF-01–05)
- Audit Log: 4 (AUDIT-01–04)
- User Management: 5 (USER-01–05)
- Cross-Cutting: 5 (DX-01–05)

Mapped to phases: 42
Unmapped: 0 ✓

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-28 after v1.3 milestone start*
