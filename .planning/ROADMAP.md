# Roadmap: AI-Powered Asset Management System

## Milestones

- ✅ **v1.0 milestone** — shipped 2026-06-09 (4 phases, 5 plans). Full archive: `.planning/milestones/v1.0-ROADMAP.md`

---

## Milestone v1.1: UI Rebuild

**Goal:** Rebuild the entire frontend in English with mock data, aligned to v1.0 architecture modules, lifecycle states, roles, and AI governance flows.
**Phases:** 9 (Phase 5–13)
**Requirements mapped:** 47

## Phases

- [ ] **Phase 5: Foundation, Layout & Dashboard** — English shell, 4-role login, role-aware sidebar, and dashboard overview with KPIs and alerts
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
| 5. Foundation, Layout & Dashboard | 3/3 | Planned | - |
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
