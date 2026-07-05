# Feature Landscape

**Domain:** Smart AI-Powered Asset Management System with IoT + AI Predictive Maintenance
**Researched:** 2026-06-28
**Milestone:** v1.2 SDD — Design-only. No implementation code.

---

## Context: Existing vs. New Features

### Already Designed (v1.0 / v1.1 — Do Not Re-Research)

| Feature | Status |
|---------|--------|
| Asset CRUD with lifecycle states (registered → available → assigned → maintenance → retired) | ✅ Designed |
| Assignment request / approve / return workflow | ✅ Designed |
| Maintenance schedule and warranty tracking | ✅ Designed |
| Role-based navigation (Administrator, Manager, Staff) | ✅ Designed |
| Basic dashboard with KPI cards and charts | ✅ Designed |
| AI Assistant (NLP query panel) | ✅ Designed |
| OCR Invoice Intake | ✅ Designed |

### New Features for v1.2 (This Research)

1. **IoT Monitoring Dashboard** — Real-time sensor telemetry per asset
2. **AI Predictive Maintenance** — Health score + failure risk + Manager approval gate
3. **Notification Center** — In-app alert hub for all system events
4. **Audit Log** — Immutable event log with full provenance
5. **User Management** — Admin-only user CRUD with role assignment

---

## Feature 1: IoT Monitoring Dashboard

### What It Is
A real-time dashboard showing live sensor telemetry for individual assets: temperature, humidity,
power consumption, current draw, vibration, and running hours. Data flows from an IoT simulator
via MQTT → backend → WebSocket/SSE → frontend chart components.

### Table Stakes
Must-have behaviors and UI patterns. Missing any = product feels incomplete.

| Behavior | UI Pattern | Notes |
|----------|------------|-------|
| Per-asset sensor panel showing current readings for all sensor types | Metric tiles / stat cards (like Grafana "Stat" panels) with current value + unit + color-coded status | One tile per sensor type: °C, %, W, A, mm/s, hours |
| Time-series line chart for each sensor dimension | Multi-line time-series chart (like Grafana "Time series" panel or Recharts LineChart) with configurable time window (1h, 6h, 24h, 7d) | X-axis = timestamp; Y-axis = sensor value; smooth curves |
| Threshold violation indicators | Red/yellow highlight on tile or chart band when value crosses configured threshold | e.g., temperature > 80°C shows red tile |
| Asset selector / asset list sidebar | Left panel listing monitored assets with live status dot (green = normal, yellow = warning, red = critical) | Clicking asset loads its sensor panel |
| Last-updated timestamp per sensor | Small "Updated Xs ago" label under each metric tile | Signals data freshness to operator |
| Connection status indicator | Banner or icon showing MQTT/WebSocket connection state (connected, reconnecting, offline) | Critical for real-time systems |

### Differentiators
Enterprise-quality patterns that elevate UX beyond table stakes.

| Pattern | Description | UI Reference | Academic Scope |
|---------|-------------|--------------|----------------|
| Sensor trend sparklines in asset list | Tiny inline sparkline chart next to each asset in the list showing last 24h trend for the primary sensor | Like Datadog host list mini-graphs | Medium — add if time permits |
| Threshold configuration UI | Inline editable threshold values per sensor per asset with save confirmation | Like Grafana alert threshold editor | Skip in SDD — defer to implementation |
| Historical data comparison overlay | Toggle to overlay historical average on current reading chart | Like Azure Monitor time-shift feature | Skip — over-scoped for academic |
| Auto-refresh rate control | User-selectable refresh rate (5s, 10s, 30s) with live indicator | Standard in monitoring dashboards | Low effort — include |
| Sensor health heatmap | Grid of assets × sensor types showing worst-case status color | Like AWS CloudWatch cross-account heatmap | Include in SDD wireframe as aspirational view |

### Anti-Features (Do Not Build — Academic Scope)
Complexity traps for this project scope.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real MQTT broker integration in design phase | Requires live broker, network config, device provisioning — all out of scope for SDD | Design the architecture conceptually: Simulator → MQTT → Backend → WS → Frontend. Use mock data in wireframes |
| Custom charting library from scratch | Recharts, Chart.js, or Nivo already solve this; bespoke charts waste time | Pick Recharts (already in React ecosystem) and show it in STACK.md |
| Configurable dashboard layout (drag/drop widgets) | Grafana-level complexity; requires grid layout engine (react-grid-layout) | Use fixed 2×3 sensor tile layout. No drag-drop in v1.2 |
| Real-time anomaly detection in chart UI | Requires streaming ML pipeline; not in scope | Show pre-computed health score from AI module instead |
| Multi-asset comparison view (multiple assets in same chart) | Axis normalization, legend complexity, confusing UX | Single-asset view only. Fleet-level view deferred |

### UI Pattern Reference
- **Metric tiles:** Grafana Stat panel, Datadog metric widget, AWS CloudWatch metric widget
- **Time-series chart:** Grafana Time series panel → implement with Recharts `<LineChart>` or `<AreaChart>`
- **Asset list with status:** Datadog host map list view, Azure Monitor resource list
- **Threshold bands:** Grafana threshold fill → implement as Recharts `<ReferenceLine>` or `<ReferenceArea>`
- **Design system:** Material Design 3 Cards for sensor tiles; MD3 color tokens for status (error/warning/success)

---

## Feature 2: AI Predictive Maintenance

### What It Is
An AI-driven module that computes a **Health Score** (0–100) and **Failure Risk** (High/Medium/Low) per
asset using sensor telemetry + maintenance history. The system generates **Recommendation Cards**
that require **Manager approval** before triggering a maintenance workflow. This is the human-in-the-
loop governance gate.

### Table Stakes

| Behavior | UI Pattern | Notes |
|----------|------------|-------|
| Per-asset health score display | Circular gauge / radial progress (0–100) with color coding: 0–30 red, 31–60 yellow, 61–100 green | Like a fitness tracker ring or Grafana Gauge panel |
| Failure risk band badge | Chip/badge: "HIGH RISK" (red), "MEDIUM RISK" (amber), "LOW RISK" (green) | MD3 AssistChip or FilterChip with semantic color |
| AI Recommendation Card per at-risk asset | Card showing: asset name + health score + risk band + top 3 contributing factors + recommended action + confidence score + AI model reference | Like a Jira task card or ServiceNow incident card |
| Contributing factor list | Ordered list of sensor readings that most influenced the prediction, with each factor's relative weight | "1. Running hours (72h overdue) — 45% weight" |
| Manager approval gate | Two-button action row on card: "Approve → Create Maintenance" / "Defer" with a required reason field on defer | Confirms human stays in the loop; required for governance |
| Pending approval queue | List/table of all recommendations awaiting Manager decision, sortable by risk and age | Like a ticket queue in ServiceNow or Jira Service Management |
| SLA countdown for High-risk items | Countdown timer or urgency indicator showing time remaining before escalation | "Action required in 2d 4h" |
| Approval history | Read-only log of past decisions: approved/deferred, by whom, when, with reason | Traceability requirement |

### Differentiators

| Pattern | Description | UI Reference | Academic Scope |
|---------|-------------|--------------|----------------|
| Health score trend sparkline on asset card | Show 7-day health score trend as a mini line chart inside the recommendation card | Like a stock ticker on a finance dashboard | Include in SDD wireframe — low effort |
| Confidence interval visualization | Show prediction confidence range (e.g., 78% ± 12%) not just point estimate | Like ML model cards in Google Model Cards | Include in SDD as data label — no extra component |
| "What changed?" diff tooltip | Tooltip on recommendation card showing what sensor values changed since last assessment | Like Git diff but for sensor readings | Include conceptually in SDD — skip detailed wireframe |
| Escalation path visualization | If Manager defers >2x, show escalation warning and notify Administrator | Enterprise workflow escalation pattern | Include in approval workflow diagram |
| Batch approve/defer actions | Select multiple low-risk cards and defer all at once | Like bulk actions in Gmail or Jira | Defer to implementation — skip in SDD wireframe |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| AI directly triggering maintenance without approval | Removes human governance; violates AI accountability requirements | Always route through Manager approval gate; AI recommends, human decides |
| Displaying raw model weights or SHAP values | Overwhelming for non-technical Managers; causes decision paralysis | Translate to plain-English factor labels: "High vibration detected for 3 consecutive days" |
| Real-time prediction on every sensor tick | Computationally expensive; ML inference every 5s is wasteful | Batch-compute health scores on a schedule (e.g., every hour) and cache results |
| Editable AI thresholds by Manager | Risk of managers gaming the system; model integrity issue | Admin-only configuration; Manager sees outputs only |
| Multi-model A/B testing UI | MLOps complexity; not an SDD concern | Note as future architecture extension in SDD |

### UI Pattern Reference
- **Health score gauge:** Recharts `<RadialBarChart>` or a simple SVG arc; like Grafana Gauge or Datadog SLO widget
- **Recommendation card:** MD3 Elevated Card with header (asset + risk chip), body (factors list), footer (approve/defer actions)
- **Approval queue:** MD3 Data Table with sortable columns + row-level action buttons
- **Risk band chips:** MD3 `Chip` component — use `error`, `warning`, `success` color tokens
- **Contributing factors:** Ordered list with percentage bars — MD3 LinearProgressIndicator per factor row
- **Pattern reference:** ServiceNow Predictive Intelligence recommendation panel, Maximo AI-powered work order suggestions

---

## Feature 3: Notification Center

### What It Is
A centralized in-app alert hub that aggregates all system-generated notifications: high failure risk
alerts, warranty expiry warnings, upcoming maintenance reminders, overdue return alerts, and AI
recommendation status changes. Accessed via a bell icon in the app header.

### Table Stakes

| Behavior | UI Pattern | Notes |
|----------|------------|-------|
| Bell icon in header with unread count badge | Notification bell with red badge count (like Gmail, Slack, GitHub) | Use MD3 Badge on IconButton |
| Notification panel / drawer | Click bell → slide-in panel or dropdown showing notification list | MD3 NavigationDrawer or custom Popover |
| Per-notification item showing: title, message, timestamp, category icon, read/unread state | List item with icon (category), bold title for unread, relative timestamp ("2 hours ago") | Like Slack notification list or Linear notification panel |
| Notification categories | Visual differentiation by type: AI Risk Alert (🤖), Warranty Warning (🛡️), Maintenance Reminder (🔧), Overdue Return (⚠️) | Category icon + color coding |
| Mark as read / mark all as read | Single-click read state toggle + "Mark all read" action at panel header | Standard in all notification systems |
| Click-through to source record | Clicking a notification navigates to the relevant asset, maintenance record, or recommendation card | Deep linking is critical for usability |
| Empty state | "All caught up" illustration when no unread notifications | MD3 empty state illustration |
| Notifications page (full list view) | Separate page `/notifications` with full history, filters by category and date | For reviewing older notifications |

### Differentiators

| Pattern | Description | UI Reference | Academic Scope |
|---------|-------------|--------------|----------------|
| Notification grouping by asset | Group multiple alerts for the same asset under a collapsible header | Like GitHub notification grouping by repository | Include in SDD wireframe |
| Priority sorting | Critical notifications (High Risk AI alert) float to top regardless of time | Like PagerDuty incident severity sorting | Include in SDD — simple sort logic |
| Notification preferences panel | User can toggle which notification types they receive | Like Slack notification preferences | Defer to implementation — skip in SDD |
| Sound / browser push notifications | Browser Notification API for desktop alerts | Standard in enterprise apps | Skip — out of academic scope |
| Digest mode (daily summary email) | Email digest of pending notifications | Requires email service | Skip — out of scope |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time WebSocket-pushed notifications in design phase | Requires persistent WS connection management; design complexity | Design as polling (GET /notifications every 30s) for SDD; note WS as production upgrade |
| Per-user notification preferences in v1.2 | Adds user settings schema, preference storage, UI panel — high cost for low v1.2 value | Show all notification types to all eligible roles; preferences deferred |
| Email / SMS notification channel | Requires email service (SendGrid, SES), phone number collection, opt-out compliance | In-app only for v1.2; external channels noted as future extension |
| Toast spam (one toast per event) | Showing a toast for every new notification floods the UI | Use badge count + panel only; reserve toasts for critical real-time alerts (AI High Risk only) |
| Notification sound effects | Distracting in office environments; adds complexity | Visual only |

### UI Pattern Reference
- **Bell icon + badge:** MD3 `Badge` on `IconButton` — reference: GitHub, Linear, Notion header patterns
- **Notification dropdown panel:** MD3 `Menu` or custom `Popover` with `List` component inside
- **Notification item:** MD3 `ListItem` with `leadingIcon` (category), `headline`, `supportingText`, `trailingContent` (timestamp)
- **Full notifications page:** MD3 `DataTable` or `List` with filter chips at top — reference: Linear Notifications page, Jira notification inbox
- **Empty state:** MD3 empty state pattern with icon + heading + subtext — reference: Material Design 3 Empty States guideline

---

## Feature 4: Audit Log

### What It Is
An immutable chronological event log recording every significant action in the system. Each event
captures: actor (who), action (what), entity (on what), before/after state snapshot (what changed),
timestamp (when), and correlation_id (traceability chain). Read-only for all roles; Admin-only for
full history; Managers see asset/maintenance events; Staff see only their own actions.

### Table Stakes

| Behavior | UI Pattern | Notes |
|----------|------------|-------|
| Paginated audit event table with columns: Timestamp, Actor, Action, Entity Type, Entity ID, Category | MD3 Data Table with sortable timestamp column; default sort = newest first | Like Stripe Dashboard event log or AWS CloudTrail |
| Expandable row showing full event detail | Click row → inline expand or side panel showing: full before/after JSON diff, correlation_id, IP address, user agent | Like Stripe event detail drawer |
| Before/After state diff view | Side-by-side or unified diff showing field-level changes | Like GitHub PR diff view — highlight changed fields in green/red |
| Filter bar: by category (Business, Security, AI-assisted), by actor, by entity type, by date range | Filter chips + date range picker at top of table | Standard audit log filters |
| Audit event categories with icons | Business (📋), Security (🔒), AI-assisted (🤖) — color-coded row left border | Like Datadog event stream category colors |
| Correlation ID display and copy | Show truncated correlation_id (first 8 chars) with copy-to-clipboard button | Enables trace lookups in logs/monitoring |
| Search by correlation_id or entity_id | Search field that matches exact correlation_id or asset serial number | Critical for incident investigation |
| Role-scoped visibility | Admin sees all events; Manager sees asset/maintenance/AI events; Staff sees their own events only | Backend-enforced, not just UI-filtered |

### Differentiators

| Pattern | Description | UI Reference | Academic Scope |
|---------|-------------|--------------|----------------|
| AI recommendation linkage | AI-assisted events include a "View Recommendation" link that navigates to the source AI recommendation card | Like Jira issue links | Include in SDD — important for traceability story |
| Export to CSV/JSON | Button to export filtered audit log to CSV for compliance reporting | Standard in enterprise audit logs | Include in SDD wireframe — mark as future implementation |
| Audit event severity classification | Color-code rows: red for security events, amber for AI mutations, gray for routine business events | Like Splunk event severity coloring | Include in SDD |
| Timeline view for a single entity | Given an asset_id, show a vertical timeline of all events affecting that asset | Like Stripe customer event timeline | Include in SDD as the asset detail "Activity" tab |
| Immutability indicator | UI note or lock icon stating "This log is append-only and cannot be modified" | Trust signal for compliance | Include — simple text/icon addition |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Editable or deletable audit records | Defeats the purpose of an audit log; compliance risk | Backend must enforce append-only; no delete/edit UI exists at all |
| Real-time streaming audit feed (live-updating table) | Complexity of WebSocket + pagination conflicts; confusing UX when rows insert mid-view | Use manual refresh or "N new events" banner that user clicks to refresh |
| Storing full request/response body in before/after | Huge storage cost; sensitive data leak risk | Store only changed field key/value pairs, not full HTTP payload |
| Complex JSON diff renderer with collapsible trees | Heavy UI component; before/after for asset management is simple (a few fields) | Simple key-value list: "name: 'Laptop A' → 'Laptop Pro A'" |
| Audit log as the primary navigation entry point for all users | Audit log is a compliance/admin tool, not a daily workflow tool | Keep audit log in sidebar but behind Admin/Manager role gate; Staff role does not see it |

### UI Pattern Reference
- **Audit table:** MD3 Data Table — reference: Stripe Dashboard Events, AWS CloudTrail event history
- **Expandable row detail:** MD3 inline expansion or right-side `NavigationDrawer` for detail — reference: Stripe event detail panel
- **Before/After diff:** Simple two-column table: "Field | Before | After" — reference: GitHub PR file diff (simplified for field-level)
- **Event timeline per entity:** Vertical `Stepper` component (MD3) or custom timeline — reference: Stripe customer timeline, Linear issue activity
- **Category chips:** MD3 `FilterChip` row above table — reference: Linear notification filters

---

## Feature 5: User Management

### What It Is
An Admin-only module for creating, viewing, editing, and deactivating user accounts with role
assignment. The three system roles are: Administrator, Manager (Asset Manager), Staff. No
self-service registration — all accounts are Admin-provisioned.

### Table Stakes

| Behavior | UI Pattern | Notes |
|----------|------------|-------|
| User list table: Name, Email, Role, Status (active/inactive), Last Login, Created Date | MD3 Data Table, sortable by name/role/status | Like GitHub org member list or Google Admin user list |
| Create user form: Full Name, Email, Role selector, initial password or invite link | MD3 Dialog or dedicated page with form fields and role radio/select | Role selector = MD3 `Select` with 3 options |
| Edit user form: Change name, change role, change status (activate/deactivate) | Pre-filled MD3 form, same layout as create | Cannot change email (identity anchor) |
| Role assignment selector | Dropdown or radio group: Administrator / Manager / Staff | Visible only to Admin |
| Deactivate / Reactivate user (no hard delete) | Toggle button "Deactivate" with confirmation dialog; deactivated users shown in gray with "Inactive" chip | Soft delete = best practice; preserves audit trail integrity |
| No hard-delete of users | Remove the delete button entirely from the UI | Hard delete breaks foreign key references in audit log |
| Role-gating: this entire module is Admin-only | If non-Admin navigates to /users, redirect to 403 or dashboard | Backend enforces; UI hides the nav item for non-Admin roles |
| Search/filter users | Search by name/email; filter by role chip | Standard for any user list > 20 users |

### Differentiators

| Pattern | Description | UI Reference | Academic Scope |
|---------|-------------|--------------|----------------|
| User activity summary on user detail | Show last 5 audit events for this user: "Approved maintenance for Asset X", "Approved AI recommendation" | Like GitHub user contribution history | Include in SDD — reuses audit log data |
| Bulk role assignment | Select multiple users and change role in one action | Like Google Workspace bulk role change | Skip — academic scope; single-user edit sufficient |
| Password reset flow | Admin-triggered "Send password reset email" action | Standard admin capability | Note in SDD as placeholder; skip detailed wireframe |
| Avatar / profile photo upload | User profile photo for humanizing the list | Nice-to-have | Skip — pure cosmetic; no functional value |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Self-service user registration | No open registration in an internal asset management system | Admin creates all accounts; note OIDC/SSO as future extension |
| User permission matrix (granular permissions beyond roles) | Turns 3-role RBAC into a permission spreadsheet nightmare | Keep 3 fixed roles; permissions are role-derived, not per-user |
| User groups / teams / departments | Organizational hierarchy management is a separate HR system concern | Tag assets to department via asset.department field; don't build org chart here |
| Hard delete of users | Breaks foreign keys in asset assignments, audit logs, approval history | Deactivate only; soft delete with is_active flag |
| User impersonation / acting-as | Security risk; audit trail confusion | Not in scope |

### UI Pattern Reference
- **User list:** MD3 Data Table with leading avatar/initials, role chip, status chip — reference: GitHub org members, Google Admin SDK user list
- **Create/Edit form:** MD3 `Dialog` (for simple creates) or full page `/users/new` — reference: Linear team member invite modal
- **Role selector:** MD3 `Select` dropdown — 3 options only
- **Deactivate confirmation:** MD3 `AlertDialog` — "This user will lose access immediately. This action can be undone."
- **Status chip:** MD3 `AssistChip` — "Active" (green), "Inactive" (gray)

---

## Feature Dependencies

```
IoT Monitoring Dashboard ──────────────────────────────────────────────┐
    └─ Provides sensor telemetry data                                   │
                                                                        ▼
AI Predictive Maintenance ◄── Sensor Data + Maintenance History ──► Notification Center
    └─ Manager Approval Gate ──► Maintenance Workflow (existing)        │
    └─ Approval events ──────────────────────────────────────────────► Audit Log
                                                                        │
Asset CRUD + Lifecycle (existing) ─────────────────────────────────► Audit Log
Assignment Workflow (existing) ─────────────────────────────────────► Audit Log
Maintenance Tracking (existing) ────────────────────────────────────► Audit Log
                                                                        │
User Management ─── Admin creates users ────────────────────────────► Audit Log
    └─ User accounts required by all above modules (actor identity)
```

**Critical dependencies:**
1. **User Management must be designed before all other modules** — every audit event, approval, and notification references an actor (user).
2. **Audit Log is a cross-cutting concern** — it receives events from all other modules; its schema must be finalized before implementing business modules.
3. **AI Predictive Maintenance depends on IoT data** — the health score calculation requires sensor telemetry; IoT monitoring must produce data for the AI module to consume.
4. **Notification Center depends on events from all modules** — it is a fan-in of AI alerts, maintenance reminders, warranty warnings, and assignment overdues.

---

## Table Stakes vs. Differentiators vs. Anti-Features: Quick Reference

| Feature | Table Stakes Count | Differentiators Count | Anti-Features Count |
|---------|-------------------|----------------------|---------------------|
| IoT Monitoring Dashboard | 6 | 5 | 5 |
| AI Predictive Maintenance | 8 | 5 | 5 |
| Notification Center | 8 | 5 | 5 |
| Audit Log | 8 | 5 | 5 |
| User Management | 8 | 4 | 5 |

---

## MVP Recommendation for SDD Wireframe Coverage

The SDD must wireframe all 5 new modules. Prioritize in this order:

1. **User Management** — Simplest; foundational (actor identity for all other modules).
2. **Audit Log** — Cross-cutting; schema decisions affect all other modules.
3. **Notification Center** — Medium complexity; bell icon visible in all pages.
4. **AI Predictive Maintenance** — Core differentiator; approval gate is the most important interaction to wireframe.
5. **IoT Monitoring Dashboard** — Highest visual complexity; do wireframes in fixed layout only (no drag-drop).

**Defer in SDD wireframes (note as future):**
- Notification preferences panel
- Bulk actions in User Management and Notification Center
- Export to CSV in Audit Log
- Real MQTT broker configuration screens
- Password reset email flow

---

## Academic Scope Guidance

| Concern | Academic Approach | Enterprise Approach |
|---------|------------------|---------------------|
| IoT data source | Simulated MQTT publisher (Python script) | Physical IoT devices with provisioning |
| AI model | Pre-trained sklearn/XGBoost model with mock training data | MLOps pipeline with continuous retraining |
| Real-time updates | HTTP polling every 30s | WebSocket with reconnect logic |
| Notifications | In-app only (no email/SMS) | Multi-channel with preference management |
| Audit immutability | Append-only DB table (no delete policy) | WORM storage, tamper-evident log chain |
| User authentication | JWT session tokens | OIDC/SSO with MFA |
| Role complexity | 3 fixed roles, role-derived permissions | Granular permission matrix, groups, teams |

---

## Sources

- Material Design 3 Guidelines — components.material.io (HIGH confidence — official documentation)
- Grafana Dashboard UX Patterns — grafana.com/docs (HIGH confidence — official documentation)
- ServiceNow Predictive Intelligence UX — docs.servicenow.com (HIGH confidence — official documentation)
- IBM Maximo Asset Management patterns — ibm.com/docs/maximo (HIGH confidence — official documentation)
- Datadog Dashboard Design Patterns — docs.datadoghq.com (HIGH confidence — official documentation)
- Stripe Dashboard Event Log pattern — stripe.com/docs/dashboard/events (HIGH confidence — official documentation)
- Enterprise Audit Log best practices — OWASP Logging Cheat Sheet (HIGH confidence — authoritative security reference)
- AWS CloudTrail UX patterns — docs.aws.amazon.com/cloudtrail (HIGH confidence — official documentation)
- Linear notification and audit patterns — linear.app (MEDIUM confidence — product observation)
