# Phase 18: IoT & AI UI Wireframes — Research

**Researched:** 2026-06-28
**Domain:** Next.js 15 + shadcn/ui + Recharts 3.8 dashboard pages — IoT Monitoring, AI Predictive Maintenance, Notification Center, Audit Log, User Management
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UX-05 | IoT Monitoring wireframe: asset selector sidebar with live status dots, sensor tile grid (current value + unit + threshold color), time-series LineCharts with time window selector (1h/6h/24h/7d), threshold violation indicators, connection status indicator | §IoT Page Architecture; DESIGN_SYSTEM §5.2 LineChart+ReferenceLine pattern verified in codebase |
| UX-06 | AI Predictive Maintenance wireframe: recommendation cards with risk band chips, health score + failure risk, top 3 factors, Manager-only Approve/Defer gate, SLA countdown for High-risk, escalation notice for overdue approvals | §AI Page Architecture; existing `/dashboard/predictive/page.tsx` is the canonical reference implementation |
| UX-07 | Notification Center: header bell icon with unread badge, dropdown showing latest 5 notifications with deep-link, full `/notifications` page with pagination and mark-as-read / mark-all-read | §Notification Center Architecture; topbar.tsx currently has no bell icon — bell must be added |
| UX-08 | Audit Log wireframe: immutable event table (actor/action/entity/before-after/timestamp/correlation_id), category filter (Business/Security/AI-assisted), expandable row for full event details | §Audit Log Architecture; `/dashboard/audit/page.tsx` already fully implements this — wireframe confirms existing design |
| UX-09 | User Management wireframe (Admin only): user list with role badge, create/edit user form with role assignment, deactivate (soft-delete) with no hard-delete option | §User Management Architecture; new page, no existing implementation |
</phase_requirements>

---

## Summary

Phase 18 produces wireframes for five dashboard pages. The research reveals a critical route-mapping gap: the navigation system (`navigation-access.ts`) already declares the canonical routes `/dashboard/iot`, `/dashboard/ai`, `/dashboard/notifications`, and `/dashboard/users` — but only `/dashboard/audit/` exists as an actual page file. The AI Predictive page is currently at the **old** path `/dashboard/predictive/`, which doesn't match the canonical nav route `/dashboard/ai`. Three pages (IoT Monitoring, Notification Center, User Management) are entirely new with no existing implementation to reference. The Audit Log page is fully implemented and the wireframe should confirm its existing design.

The codebase has a production-quality AI Predictive implementation (`/dashboard/predictive/page.tsx`) that serves as the authoritative reference for the new `/dashboard/ai` wireframe. The design system is fully documented in `DESIGN_SYSTEM.md` with exact chart components (§5.2 LineChart+ReferenceLine for IoT), color tokens, component rules, and spacing. All wireframes must use components from `frontend/components/ui/` — no MUI imports.

**Primary recommendation:** Treat the existing `/dashboard/predictive/page.tsx` implementation as the gold standard for the AI Predictive wireframe. For IoT Monitoring, use the 2-panel layout (left: asset selector sidebar, right: sensor tile grid + charts) documented in SDD §1.3 and IA Flow 5.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| IoT live sensor display | Frontend (Client) | Backend (WebSocket) | React polls WS `assets/{id}/sensors/live`; 5s aggregation window; backend writes to PostgreSQL via MQTT subscriber |
| AI recommendation approval gate | API / Backend | Frontend (Client) | RBAC enforced server-side; frontend role check is UX only, never security boundary |
| Notification unread badge | Frontend (Client) | Backend (SSE) | Browser EventSource subscription to `/notifications/stream`; badge count driven by store |
| Audit log display | Frontend (Client) | API / Backend | Read-only; append-only writes are backend-only; no frontend mutation |
| User management CRUD | API / Backend | Frontend (Client) | Admin-only RBAC enforced server-side; soft-delete via `is_active=false` |
| Sensor tile threshold coloring | Frontend (Client) | — | Pure UI decision: compare `currentValue` vs `threshold` config; color via Tailwind destructive tokens |
| SLA countdown timer | Frontend (Client) | — | Client-side countdown from `slaDueAt` ISO string; existing `getHighRiskSlaState()` in `lib/predictive.ts` |

---

## Existing Codebase Inventory

### Pages That EXIST (prior art)

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/dashboard/predictive` | `app/dashboard/predictive/page.tsx` | ✅ Fully implemented | **OLD path** — sidebar nav points to `/dashboard/ai` (MISMATCH). Wireframe for `/dashboard/ai` derives from this |
| `/dashboard/audit` | `app/dashboard/audit/page.tsx` | ✅ Fully implemented | Correct canonical path. UX-08 wireframe confirms existing design |
| `/dashboard/ocr` | `app/dashboard/ocr/page.tsx` | ✅ Fully implemented | Not in phase 18 scope |
| `/dashboard/assistant` | `app/dashboard/assistant/page.tsx` | ✅ Fully implemented | Not in phase 18 scope |

### Pages That DON'T EXIST (new wireframes required)

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/dashboard/iot` | `app/dashboard/iot/page.tsx` | ❌ Missing | UX-05 — full new page |
| `/dashboard/iot/[assetId]` | `app/dashboard/iot/[assetId]/page.tsx` | ❌ Missing | UX-05 — asset detail view |
| `/dashboard/ai` | `app/dashboard/ai/page.tsx` | ❌ Missing | UX-06 — rename/replace of `/predictive` |
| `/dashboard/notifications` | `app/dashboard/notifications/page.tsx` | ❌ Missing | UX-07 — full page |
| `/dashboard/users` | `app/dashboard/users/page.tsx` | ❌ Missing | UX-09 — Admin only |
| `/dashboard/users/new` | `app/dashboard/users/new/page.tsx` | ❌ Missing | UX-09 |
| `/dashboard/users/[id]/edit` | `app/dashboard/users/[id]/edit/page.tsx` | ❌ Missing | UX-09 |

### Lib Files for New Pages

| File | Contents | Used By |
|------|----------|---------|
| `lib/predictive.ts` | `PredictiveRecommendation`, `buildRecommendations()`, `getHighRiskSlaState()`, `formatSlaCountdown()`, `PredictiveActionState` | AI Predictive page |
| `lib/audit-log.ts` | `AuditEvent`, `AuditCategory`, `getAuditEventsByCategory()`, `AUDIT_CATEGORIES` | Audit Log page |
| `lib/ai-governance.ts` | `ConfidenceBand`, `CORRELATION_LABEL`, `formatConfidenceScore()` | AI Predictive + Audit |
| `lib/navigation-access.ts` | `DASHBOARD_NAV` (canonical route/role mapping), `getVisibleNavigation()` | Sidebar, all pages |
| `lib/data.ts` | `UserRole`, `Employee`, `AssetCategory`, `Asset`, `failureRisk()` | User Management, all pages |
| `lib/store.tsx` | `StoreProvider`, `useStore()` — global auth + data | All pages |

### Components Available

| Component | Location | Used In |
|-----------|----------|---------|
| `<Topbar>` | `components/topbar.tsx` | All pages — currently has NO bell icon (must be added for UX-07) |
| `<Sidebar>` | `components/sidebar.tsx` | Shell layout — already has Bell icon nav to `/dashboard/notifications` |
| `<StatusBadge>` | `components/status-badge.tsx` | Risk bands, lifecycle states, AI states |
| `<AiTracePanel>` | `components/ai-trace-panel.tsx` | AI Predictive, OCR pages |
| `<AssetFormDialog>` | `components/asset-form-dialog.tsx` | Assets page — pattern for User form dialog |
| `<ChartContainer>` + `<ChartEmptyState>` | `components/ui/chart.tsx`, `components/ui/chart-empty-state.tsx` | IoT charts |
| All shadcn/ui primitives | `components/ui/` | All pages |

---

## IoT Monitoring Page Architecture (UX-05)

### Layout: 2-Panel Shell

```
┌─────────────────────────────────────────────────────────────────────┐
│  Topbar: "IoT Monitoring"  subtitle: "Live sensor telemetry"        │
├────────────────────┬────────────────────────────────────────────────┤
│  ASSET SELECTOR    │  SENSOR TILE GRID + CHARTS                     │
│  SIDEBAR (w-64)    │                                                │
│  ─────────────     │  [Connection Status Indicator]                │
│  🟢 Dell L7420     │                                                │
│  🔴 Forklift FL-01 │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│  🟡 Canon Printer  │  │temp │ │humid│ │power│ │ curr│            │
│  🟢 HP Monitor     │  │72°C │ │ 68% │ │450W │ │ 8A  │            │
│  🟢 Ricoh OE       │  │🔴HI │ │ OK  │ │ OK  │ │ OK  │            │
│                    │  └─────┘ └─────┘ └─────┘ └─────┘            │
│  [Time Window]     │                                                │
│  ○1h ●6h ○24h ○7d  │  [LineChart: temperature over time]           │
│                    │  ┌────────────────────────────────────────┐   │
│                    │  │ ─── ─── threshold dashed red line      │   │
│                    │  │         /\/\sensor line                │   │
│                    │  └────────────────────────────────────────┘   │
│                    │  [LineChart: current active sensors...]       │
└────────────────────┴────────────────────────────────────────────────┘
```

### Asset Selector Sidebar

- **Component:** scrollable `<aside>` (not the main nav sidebar — this is an in-page panel)
- **Pattern:** list of buttons/rows, one per asset in the system
- **Live status dot:** `w-2 h-2 rounded-full` colored indicator:
  - `bg-chart-3` (green) = Connected, readings current (< 30s ago)
  - `bg-destructive` (red) = Threshold violation active
  - `bg-chart-4` (amber) = Stale (no reading in > 60s)
  - `bg-muted-foreground` (grey) = Offline / no sensor device linked
- **Active state:** selected asset row highlighted `bg-accent`
- **Alert highlight:** asset with threshold violation gets `border-l-4 border-destructive`
- **Default selection:** first asset pre-selected on page load (per IA Flow 5)
- **Role note:** Admin/Manager see all assets; Staff would see own assigned assets only (per SDD §2.1)

### Connection Status Indicator

- **Position:** top-right of the content area, inline with section header
- **Component:** `<Badge>` with colored dot
- **States:** "Live" (`bg-chart-3/15 text-chart-3`) | "Reconnecting..." (`bg-chart-4/15 text-chart-4`) | "Disconnected" (`bg-destructive/15 text-destructive`)
- **Data source:** WebSocket connection state (`/api/iot/stream` per SDD §1.3)

### Sensor Tile Grid

- **Layout:** `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4`
  - Renders only tiles for active sensor types per asset category (see mapping below)
- **Tile structure (Card Variant A — compact):**
  ```
  <Card className={thresholdViolation ? "border-destructive" : ""}>
    <CardContent className="p-3">
      <p className="text-xs text-muted-foreground uppercase">{sensorLabel}</p>
      <p className="text-2xl font-bold font-mono">{value}{unit}</p>
      <p className="text-xs">{thresholdViolation ? "⚠ Above limit" : "Normal"}</p>
      <p className="text-xs text-muted-foreground">Updated {timeAgo}</p>
    </CardContent>
  </Card>
  ```
- **Threshold color logic:**
  - Normal: `text-foreground` value, no border accent
  - Violation: `text-destructive` value, `border-destructive` card border
  - Near-threshold (> 80% of limit): `text-chart-4` (amber) value
- **Unit display:** per MQTT payload `unit` field (°C, %, W, A, mm/s, hours)
- **Sensor tiles per category:** [VERIFIED: SDD §2.6]

| Asset Category | Tiles Shown |
|---------------|-------------|
| Laptop | Temperature, Humidity, Power, Current, Running Hours (5 tiles) |
| Monitor | Temperature, Power, Current, Running Hours (4 tiles) |
| Printer | Temperature, Humidity, Power, Current, Vibration, Running Hours (6 tiles) |
| Forklift | Temperature, Power, Current, Vibration, Running Hours (5 tiles) |
| Office Equipment | Temperature, Humidity, Power, Running Hours (4 tiles) |

### Time-Series Line Chart

- **Component:** `LineChart` + `ReferenceLine` inside `<ChartContainer>` [VERIFIED: DESIGN_SYSTEM §5.2]
- **One chart per active sensor type** (stacked below sensor tiles)
- **Time window selector:** Button group `1h | 6h | 24h | 7d` — controls X-axis domain
- **X-axis:** timestamp formatting per DESIGN_SYSTEM §5.6:
  - 1h/6h → `toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })`
  - 24h/7d → `format(new Date(ts), 'MM/dd HH:mm')` (date-fns)
- **Y-axis:** `tickFormatter={(val) => \`${val}${unit}\`}` with `width={48}`
- **Threshold line:** `<ReferenceLine y={threshold} stroke="var(--destructive)" strokeDasharray="4 4" strokeWidth={1.5}>`
- **Color assignment:** sensor-specific chart tokens per DESIGN_SYSTEM §1.6
- **Height:** `h-[280px]` fixed per design system rules
- **Empty state:** `<ChartEmptyState message="No sensor readings in this time window" />`

### Chart Color → Sensor Mapping [VERIFIED: DESIGN_SYSTEM §1.6]

| chart-1 `#0864CD` | Temperature |
| chart-2 `#00B6B7` | Humidity |
| chart-3 `#43A74C` | Power Consumption |
| chart-4 `#ED980E` | Current |
| chart-5 `#E23431` | Vibration |
| chart-6 `#8B5CF6` | Running Hours |

### WebSocket Data Flow (for wireframe annotation)

```
Python Sensor Simulator
  → MQTT Broker (Mosquitto port 1883)
  → FastAPI MQTT Consumer (aiomqtt, deduplicated)
  → PostgreSQL sensor_readings
  → FastAPI WebSocket broadcaster (5s aggregation window)
  → React IoT page (useEffect WS hook → sensor state)
  → Sensor tiles + LineChart re-render
```
Data source annotation for wireframe: **"WS: /api/iot/[assetId]/stream"**

---

## AI Predictive Maintenance Page Architecture (UX-06)

### Reference Implementation [VERIFIED: codebase]

`/dashboard/predictive/page.tsx` is the authoritative reference for the new `/dashboard/ai` wireframe. It implements all UX-06 requirements. Key structure:

```
<Topbar title="Predictive Maintenance" />
<PredictiveSummary card> ← total, pending high-risk, action policy
<section "Recommendations">
  grid xl:grid-cols-2
    [RecommendationCard] × N
```

### Recommendation Card Structure [VERIFIED: predictive/page.tsx]

```
<Card className={isHighRisk ? "border-destructive/30" : ""}>
  <CardHeader>
    <CardTitle>{assetName}</CardTitle>
    <StatusBadge status={risk.level} />        ← High/Medium/Low risk band chip
    <Badge variant="outline">Risk: {score}%</Badge>
  </CardHeader>
  <CardContent>
    ├─ Correlation ID row (font-mono text-xs)
    ├─ Top Factors list (3 items, ul.list-disc)
    └─ [High-risk section — conditional]
         ├─ SLA countdown: Clock3 icon + formatSlaCountdown()
         ├─ Overdue badge: <Badge variant="destructive">Overdue</Badge>
         ├─ Escalation banner: AlertTriangle + destructive/10 bg
         ├─ Approval state display (approved/deferred visual)
         └─ [Manager only] Approve + Defer buttons
              Approve: <Button size="sm">Approve Recommendation</Button>
              Defer:   <Button size="sm" variant="outline">Defer Recommendation</Button>
         └─ [Non-Manager] <Badge variant="outline">Read-only for role: {role}</Badge>
    └─ AiTracePanel (collapsed, provenance metadata)
```

### AI Recommendation State Machine [VERIFIED: SDD §2.4, lib/predictive.ts]

```
pending → approved  (Manager/Admin ONLY — triggers maintenance record creation)
pending → deferred  (Manager/Admin ONLY — defer_reason optional)
deferred → pending  (re-open)
deferred → expired  (system, 30 days)
```
`PredictiveActionState = "pending" | "approved" | "deferred"` (no "expired" in frontend type — expired handled as filter)

### SLA Logic [VERIFIED: lib/predictive.ts]

- **SLA window:** `HIGH_RISK_SLA_MINUTES = 120` (2 hours for High-risk pending recommendations)
- **`slaDueAt`:** set on recommendation creation for High-risk items only
- **`getHighRiskSlaState(rec, now)`** returns `{ countdownMinutes, isOverdue, overdueMinutes }`
- **Escalation trigger:** `isOverdue = true` → show escalation banner with destructive styling

### Role Gate

| Role | Can See Recommendations | Approve Button | Defer Button |
|------|------------------------|----------------|--------------|
| Administrator | ✅ | ✅ | ✅ |
| Asset Manager (Manager) | ✅ | ✅ | ✅ |
| Staff | ❌ (route blocked, /403) | — | — |

`isAssetManager = user?.role === "Asset Manager"` — also check `Admin` for full access per SDD §2.1

### Health Score / Failure Risk Display

- **health_score**: 0–100 (higher = healthier)
- **failure_risk**: `risk.score` as a percentage (existing `risk.score` in `PredictiveRecommendation`)
- **Confidence band:** `formatConfidenceScore(confidence.score)` + `confidence.band` (High/Medium/Low)
- **Wireframe placement:** `CardDescription` area below asset name

---

## Notification Center Architecture (UX-07)

### Two-Surface Design (per SDD §1.5, IA §1.2 Nav table)

| Surface | Where | Behavior |
|---------|-------|----------|
| Header Bell Icon | `<Topbar>` — right side | Badge with unread count; click navigates to `/dashboard/notifications` |
| Full Page | `/dashboard/notifications` | Pagination, mark-as-read, mark-all-read |

**CRITICAL GAP FOUND:** The current `topbar.tsx` has NO bell icon and NO unread badge. The wireframe must specify adding this to `<Topbar>`. The sidebar already has a Bell icon nav item pointing to `/dashboard/notifications` — the topbar bell is the additional dropdown surface.

> Per IA §1.4: "Click navigates to `/dashboard/notifications` (full page). Does NOT open a modal — full page navigation for accessibility and link-shareability."

### Topbar Bell Icon Specification

```
<header>
  ...existing title...
  <div className="flex items-center gap-3">
    [NEW] <button onClick={() => router.push('/dashboard/notifications')}>
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 text-xs absolute -top-1 -right-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </button>
    ...user avatar...
  </div>
</header>
```
`unreadCount` sourced from store (updated via SSE `/notifications/stream`)

### Notification Types [VERIFIED: SDD §1.5]

| Type | Priority | Icon | Target Roles |
|------|----------|------|--------------|
| `high_failure_risk` | 🔴 Critical | `AlertTriangle text-destructive` | Manager, Admin |
| `warranty_expiry_warning` | 🟡 Warning | `Shield text-chart-4` | Manager, Admin |
| `upcoming_maintenance` | 🔵 Info | `Wrench text-primary` | Manager, Staff |
| `overdue_return` | 🔴 Critical | `Clock text-destructive` | Manager, Admin |

### Full Notifications Page Layout

```
<Topbar title="Notification Center" />
<div class="flex-1 overflow-y-auto p-6">
  <Card>
    <CardHeader>
      <CardTitle>Notifications</CardTitle>
      <CardAction>
        <Button variant="outline" size="sm">Mark All Read</Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      [NotificationList]  ← list of notification rows
      [Pagination]        ← prev/next, page N of M
    </CardContent>
  </Card>
</div>
```

### Notification Row Structure

```
<div className="flex items-start gap-3 p-3 border-b hover:bg-muted/50">
  <div className={`mt-0.5 rounded-full p-1.5 ${typeColorBg}`}>
    <TypeIcon className="size-4" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">{title}</p>
    <p className="text-xs text-muted-foreground">{message}</p>
    <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
  </div>
  {!isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
  <Button variant="ghost" size="icon-sm" asChild>
    <Link href={deepLink}>→</Link>  ← deep-link to asset/maintenance page
  </Button>
</div>
```

### Deep-link Targets by Notification Type

| Type | Deep Link |
|------|-----------|
| `high_failure_risk` | `/dashboard/ai?assetId={asset_id}` |
| `warranty_expiry_warning` | `/dashboard/assets/{asset_id}` |
| `upcoming_maintenance` | `/dashboard/maintenance` |
| `overdue_return` | `/dashboard/assignments/{assignment_id}` |

### Mark Actions

- **Mark as read (individual):** button on each unread row — sets `is_read = true`
- **Mark all read:** button in `CardHeader CardAction` slot
- **Unread indicator:** blue dot `w-2 h-2 rounded-full bg-primary` on right side of unread rows

---

## Audit Log Architecture (UX-08)

### Existing Implementation [VERIFIED: audit/page.tsx]

The audit page is **fully implemented** at `/dashboard/audit`. The wireframe should confirm the existing design matches UX-08 requirements. Full column set already present:

| Column | Data Key | Notes |
|--------|----------|-------|
| Actor | `event.actor` | User display name |
| Action | `event.action` | e.g. `assignment.approved` |
| Entity | `event.entity` | e.g. `Assignment REQ-300` |
| Before | `event.before` | State snapshot string |
| After | `event.after` | State snapshot string |
| Timestamp | `event.timestamp` | Formatted via `formatDate()` |
| Correlation ID | `event.correlation_id` | `font-mono text-xs` |
| Details | expand button | "View details" / "Hide details" toggle |

### Category Filter [VERIFIED: lib/audit-log.ts]

```
AUDIT_CATEGORIES = ["Business", "Security", "AI-assisted"] as const
```
Filter buttons render one per category + "All" as `<Button variant={active ? "default" : "outline"} size="sm">`.

### Expandable Row Pattern [VERIFIED: audit/page.tsx]

```jsx
<Fragment key={event.id}>
  <TableRow>...</TableRow>
  {expandedEventId === event.id && (
    <TableRow>
      <TableCell colSpan={8}>
        <div className="space-y-2 rounded-md bg-muted/40 p-3">
          <Badge variant="outline">{event.category}</Badge>
          <p>Before: {event.before}</p>
          <p>After: {event.after}</p>
          <p>Correlation ID: {event.correlation_id}</p>
          <p>AI Recommendation: {event.aiRecommendation?.summary ?? "None"}</p>
        </div>
      </TableCell>
    </TableRow>
  )}
</Fragment>
```

### Immutability Constraints [VERIFIED: SDD §2.5]

- `AuditEvents` table is **append-only** — no UPDATE or DELETE ever
- No edit/delete buttons on any audit row
- No "clear logs" or "archive" actions in the UI
- The category filter is the only mutation the user can make (client-side filter, no server mutation)

### Audit Log Role Access

| Role | Access |
|------|--------|
| Administrator | Full access — all categories |
| Manager | → /403 |
| Staff | → /403 |

[VERIFIED: navigation-access.ts — `{ href: "/dashboard/audit", roles: ["Admin"] }`]

---

## User Management Architecture (UX-09)

### New Pages Required

| Route | Purpose |
|-------|---------|
| `/dashboard/users` | User list with role badges and actions |
| `/dashboard/users/new` | Create user form |
| `/dashboard/users/[id]/edit` | Edit user / deactivate |

### User List Page Layout

```
<Topbar title="User Management" subtitle="Administrator only" />
<div class="flex-1 overflow-y-auto p-6">
  <Card>
    <CardHeader>
      <CardTitle>Users</CardTitle>
      <CardAction>
        <Button asChild><Link href="/dashboard/users/new"><Plus /> Add User</Link></Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      [Search/filter bar] — text search by name/email
      [User Table]
    </CardContent>
  </Card>
</div>
```

### User Table Columns

| Column | Content |
|--------|---------|
| Name | User display name |
| Email | email address |
| Role | `<StatusBadge>` with role — see role badge mapping below |
| Department | department string |
| Status | `<Badge>` Active / Inactive (is_active) |
| Actions | `<DropdownMenu>` with Edit / Deactivate options |

### Role Badge Mapping

| Role | StatusBadge Status | Visual |
|------|-------------------|--------|
| Admin | Not in StatusBadge — use `<Badge variant="default">Admin</Badge>` | Blue pill |
| Asset Manager | `<Badge variant="secondary">Asset Manager</Badge>` | Subtle bg |
| Staff | `<Badge variant="outline">Staff</Badge>` | Outline |

(Reference: `topbar.tsx` uses this exact same pattern)

### Create/Edit User Form

```
<Dialog> or full-page form at /users/new
  Fields:
  - Name (required) — <Input>
  - Email (required, type="email") — <Input>
  - Role (required) — <Select> with options: Admin, Asset Manager, Staff
  - Department (required) — <Input> or <Select>
  - Password (create only) — <Input type="password">

  Footer:
  - <Button variant="outline">Cancel</Button>
  - <Button>Save User</Button>
```

### Deactivate (Soft-Delete) Action [VERIFIED: SDD §2.5 ER]

- **Field:** `users.is_active = false`
- **No hard-delete** — no DELETE API call, no "Permanently Delete" button anywhere
- **Confirmation dialog required** (per DESIGN_SYSTEM §4.8 mandatory rule for destructive actions):
  ```
  <Dialog>
    <DialogTitle>Deactivate User</DialogTitle>
    <DialogDescription>
      {userName} will no longer be able to log in. This action can be reversed.
    </DialogDescription>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Deactivate</Button>
    </DialogFooter>
  </Dialog>
  ```
- **Visual state:** Deactivated users shown with `opacity-60` row + `<Badge variant="outline" className="text-muted-foreground">Inactive</Badge>`
- **Reactivate option:** Edit user form includes toggle to re-enable (`is_active = true`)

### User Management Role Access

| Role | Access |
|------|--------|
| Administrator | Full CRUD + Deactivate |
| Manager | → /403 |
| Staff | → /403 |

[VERIFIED: navigation-access.ts — `{ href: "/dashboard/users", roles: ["Admin"] }`]
[VERIFIED: SDD §2.1 Permission Matrix — "Create/edit users: Admin Full, Manager —, Staff —"]

---

## Per-Page Role & Permission Summary

| Page | Route | Roles with Access | Key Capability Difference |
|------|-------|------------------|--------------------------|
| IoT Monitoring | `/dashboard/iot` | Admin, Manager | Staff → /403; per SDD §2.1 "Staff: own assets only" note exists but nav hides entirely |
| AI Predictive | `/dashboard/ai` | Admin, Manager | Approve/Defer buttons shown only to Admin/Manager; Staff → /403 |
| Notifications | `/dashboard/notifications` | Admin, Manager, Staff | All see own notifications; Critical types target Manager+Admin only (filtered server-side) |
| Audit Log | `/dashboard/audit` | Admin only | Manager/Staff → /403 |
| User Management | `/dashboard/users` | Admin only | Manager/Staff → /403 |

**Hide-not-disable rule:** [VERIFIED: IA §1.3] Role-restricted items are hidden entirely from sidebar via `getVisibleNavigation(role)`. Never show disabled/greyed nav items.

---

## Component Mapping by Page

### IoT Monitoring (`/dashboard/iot`)

| UI Element | Component |
|-----------|-----------|
| Page header | `<Topbar>` |
| Asset selector panel | in-page `<aside>` with `<Button>` rows |
| Status dot | `<span className="w-2 h-2 rounded-full ...">` |
| Sensor tile | `<Card>` (Variant A compact, `p-3`) |
| Time window selector | `<Button>` group (1h/6h/24h/7d) |
| Line chart | `<ChartContainer>` + `<LineChart>` + `<ReferenceLine>` |
| Chart tooltip | `<ChartTooltip content={<ChartTooltipContent />}>` |
| Chart legend | `<ChartLegend content={<ChartLegendContent />}>` |
| Empty chart | `<ChartEmptyState>` |
| Connection status | `<Badge>` with colored dot |

### AI Predictive Maintenance (`/dashboard/ai`)

| UI Element | Component |
|-----------|-----------|
| Summary card | `<Card>` Variant B with 3-col grid stats |
| Risk band chip | `<StatusBadge status="High|Medium|Low" />` |
| Recommendation card | `<Card className="border-destructive/30">` (high-risk) |
| SLA countdown | `<Clock3>` + `formatSlaCountdown()` text |
| Overdue badge | `<Badge variant="destructive">Overdue</Badge>` |
| Escalation banner | `<div className="border border-destructive/40 bg-destructive/10">` + `<AlertTriangle>` |
| Approve button | `<Button size="sm">Approve Recommendation</Button>` |
| Defer button | `<Button size="sm" variant="outline">Defer Recommendation</Button>` |
| Read-only indicator | `<Badge variant="outline">Read-only for role: {role}</Badge>` |
| AI provenance | `<AiTracePanel>` |
| Top factors list | `<ul className="list-disc pl-5">` |

### Notification Center (`/dashboard/notifications`)

| UI Element | Component |
|-----------|-----------|
| Bell icon in topbar | `<Bell>` (lucide) + `<Badge variant="destructive">` — ADD to `topbar.tsx` |
| Notification row | Custom div with icon, text, unread dot, deep-link button |
| Mark all read | `<Button variant="outline" size="sm">` in `<CardAction>` |
| Pagination | prev/next `<Button>` + page info text |
| Type icon | `<AlertTriangle>` / `<Shield>` / `<Wrench>` / `<Clock>` per type |

### Audit Log (`/dashboard/audit`) — Already Implemented

| UI Element | Component |
|-----------|-----------|
| Category filter | `<Button variant="default|outline" size="sm">` |
| Data table | `<Table>` + `<TableHeader>` + `<TableBody>` + `<TableRow>` + `<TableCell>` |
| Expand button | `<Button variant="outline" size="sm">View details</Button>` |
| Expanded detail | `<TableRow>` with full-width `<TableCell colSpan={8}>` + muted panel |
| Category badge | `<Badge variant="outline">{event.category}</Badge>` |

### User Management (`/dashboard/users`)

| UI Element | Component |
|-----------|-----------|
| Add User button | `<Button>` in `<CardAction>` |
| User table | `<Table>` |
| Role badge | `<Badge variant="default|secondary|outline">` |
| Status badge | `<Badge variant="outline">Active/Inactive</Badge>` |
| Actions dropdown | `<DropdownMenu>` with Edit + Deactivate items |
| Edit: Deactivate separator | `<DropdownMenuSeparator>` before destructive actions |
| Deactivate confirm | `<Dialog>` with `<Button variant="destructive">Deactivate</Button>` |
| Create/Edit form | `<Dialog sm:max-w-[425px]>` or dedicated page |

---

## Data Source Annotations (Per Wireframe Section)

| Wireframe Section | Data Source | Transport |
|-------------------|-------------|-----------|
| IoT asset list | `GET /api/assets?has_sensor=true` | REST |
| IoT live sensor values | `WS /api/iot/{assetId}/stream` | WebSocket (5s batches) |
| IoT historical chart data | `GET /api/iot/{assetId}/readings?window=1h` | REST |
| IoT threshold config | `GET /api/iot/thresholds` | REST |
| AI recommendations list | `GET /api/ai/recommendations?status=pending&sort=risk:desc` | REST |
| AI recommendation approval | `POST /api/ai/recommendations/{id}/approve` | REST (Auth: Manager/Admin JWT) |
| AI recommendation defer | `POST /api/ai/recommendations/{id}/defer` | REST (Auth: Manager/Admin JWT) |
| Notifications list | `GET /api/notifications?page=N` | REST |
| Notifications unread count | `EventSource /api/notifications/stream` | SSE |
| Mark notification read | `PATCH /api/notifications/{id}/read` | REST |
| Mark all read | `POST /api/notifications/read-all` | REST |
| Audit events list | `GET /api/audit?category=Business|Security|AI-assisted` | REST |
| User list | `GET /api/users` | REST (Admin JWT required) |
| Create user | `POST /api/users` | REST (Admin JWT required) |
| Update user | `PATCH /api/users/{id}` | REST (Admin JWT required) |
| Deactivate user | `PATCH /api/users/{id}` `{is_active: false}` | REST (Admin JWT required) |

---

## Architecture Patterns

### Pattern 1: Recommendation Card (reference from existing `predictive/page.tsx`)

```typescript
// Source: frontend/app/dashboard/predictive/page.tsx (verified in codebase)
function RecommendationCard({ recommendation, isAssetManager }) {
  const slaState = getHighRiskSlaState(recommendation)
  const isHighRisk = recommendation.risk.level === "High"

  return (
    <Card className={isHighRisk ? "border-destructive/30" : undefined}>
      <CardHeader>
        <CardTitle>{recommendation.assetName}</CardTitle>
        <StatusBadge status={recommendation.risk.level} />
        <Badge variant="outline">Risk score: {recommendation.risk.score}%</Badge>
      </CardHeader>
      <CardContent>
        {/* Top factors */}
        <ul className="list-disc pl-5">
          {recommendation.topFactors.map(f => <li key={f}>{f}</li>)}
        </ul>
        {/* SLA + approval gate (High-risk only) */}
        {isHighRisk && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <Clock3 /> SLA: {formatSlaCountdown(slaState.countdownMinutes)}
            {slaState.isOverdue && <Badge variant="destructive">Overdue</Badge>}
            {isAssetManager ? (
              <>
                <Button size="sm">Approve Recommendation</Button>
                <Button size="sm" variant="outline">Defer Recommendation</Button>
              </>
            ) : (
              <Badge variant="outline">Read-only for role: {user?.role}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### Pattern 2: Sensor Tile Grid

```typescript
// Derived from design system — new pattern for IoT page
function SensorTile({ sensorType, value, unit, threshold, lastUpdated }) {
  const isViolation = value > threshold
  const isNearLimit = value > threshold * 0.8 && !isViolation

  return (
    <Card className={isViolation ? "border-destructive" : ""}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{sensorType}</p>
        <p className={cn(
          "text-2xl font-bold font-mono",
          isViolation ? "text-destructive" : isNearLimit ? "text-chart-4" : "text-foreground"
        )}>
          {value}{unit}
        </p>
        <p className="text-xs mt-1">
          {isViolation ? "⚠ Above limit" : "Normal"}
        </p>
        <p className="text-xs text-muted-foreground">Updated {timeAgo}</p>
      </CardContent>
    </Card>
  )
}
```

### Pattern 3: Expandable Table Row (from audit/page.tsx)

```typescript
// Source: frontend/app/dashboard/audit/page.tsx (verified in codebase)
{events.map(event => (
  <Fragment key={event.id}>
    <TableRow>
      {/* standard cells */}
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={() => toggleExpanded(event.id)}>
          {expandedEventId === event.id ? "Hide details" : "View details"}
        </Button>
      </TableCell>
    </TableRow>
    {expandedEventId === event.id && (
      <TableRow>
        <TableCell colSpan={8}>
          <div className="space-y-2 rounded-md bg-muted/40 p-3">
            {/* expanded content */}
          </div>
        </TableCell>
      </TableRow>
    )}
  </Fragment>
))}
```

### Anti-Patterns to Avoid

- **Hard-delete users:** User records must NEVER be deleted — only `is_active = false`. No trash/delete icon in user management.
- **Audit log mutation:** No edit, delete, or archive buttons on audit rows — append-only display only.
- **AI approval without RBAC:** Approve/Defer buttons visible only for `Admin` or `Asset Manager` roles. Staff who navigates to `/dashboard/ai` sees read-only view (or is blocked at route level).
- **Direct MUI import:** `@mui/material` is not a project dependency. Never import from it.
- **Raw hex colors in components:** Always use `var(--chart-N)` or Tailwind token classes — never hardcode `#43A74C`.
- **Custom chart tooltip/legend:** Always use `<ChartTooltipContent>` and `<ChartLegendContent>` — never hand-roll.
- **Bell as modal:** Per IA §1.4, bell click navigates to full `/notifications` page — NOT a dropdown modal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sensor time-series chart | Custom SVG/canvas chart | `<LineChart>` + `<ReferenceLine>` in `<ChartContainer>` | Threshold lines, tooltips, responsive sizing handled |
| Chart tooltips | Custom tooltip overlay | `<ChartTooltipContent />` | Consistent styling, accessibility |
| Risk/status coloring | Custom color logic | `<StatusBadge status="High|Medium|Low" />` | CVA-driven, all states pre-defined in status-badge.tsx |
| SLA countdown | Custom timer | `getHighRiskSlaState()` + `formatSlaCountdown()` from `lib/predictive.ts` | Already tested, edge cases handled |
| Empty chart state | Ad-hoc "No data" text | `<ChartEmptyState>` from `components/ui/chart-empty-state.tsx` | Standard pattern, required by design system |
| User role check | Inline `if (role === ...)` everywhere | `canAccessDashboardRoute(role, pathname)` from `lib/navigation-access.ts` | Centralized; already tested |
| Confidence score display | Custom formatting | `formatConfidenceScore(score)` from `lib/ai-governance.ts` | Consistent `"XX%"` format |

---

## Common Pitfalls

### Pitfall 1: Wrong Route for AI Page

**What goes wrong:** Wiring the AI predictive wireframe/page to `/dashboard/predictive` instead of the canonical `/dashboard/ai`
**Why it happens:** Existing implementation is at `/dashboard/predictive/` but `navigation-access.ts` points to `/dashboard/ai`
**How to avoid:** New page file MUST be at `app/dashboard/ai/page.tsx`. The old `/dashboard/predictive/` page may need to be renamed/removed or redirected.
**Warning signs:** Sidebar nav "AI Predictive" link shows 404 after implementation

### Pitfall 2: Missing Bell Icon in Topbar

**What goes wrong:** Notification bell exists in sidebar nav but not in the topbar header
**Why it happens:** `topbar.tsx` was built before the Notification Center was scoped
**How to avoid:** Phase 18 wireframe for Notification Center MUST specify topbar modification. Bell icon in topbar + unread count badge is required per IA §1.4 and SDD §1.5
**Warning signs:** Users can only access notifications via sidebar link, no badge count visible in header

### Pitfall 3: Hard-Coding Sensor Tile Count

**What goes wrong:** Rendering all 6 sensor tiles for every asset regardless of category
**Why it happens:** Not accounting for the category-sensor mapping from SDD §2.6
**How to avoid:** IoT page must filter tiles to `activeSensors = SENSOR_CATEGORY_MAP[asset.category]`; never show 6 tiles for a Monitor (which has only 4 active sensors)
**Warning signs:** Monitor tiles showing "humidity" and "vibration" with zero/null values

### Pitfall 4: AI Approval as UI-Only Guard

**What goes wrong:** Showing/hiding Approve button based only on frontend role check without server-side RBAC
**Why it happens:** Treating `isAssetManager` check in component as the security boundary
**How to avoid:** Frontend role check is UX convenience only — API endpoint `/api/ai/recommendations/{id}/approve` must also enforce RBAC server-side per SDD §2.4 "enforced at API middleware"
**Warning signs:** Cypress test with Staff JWT can POST to approval endpoint successfully

### Pitfall 5: Notification Bell as Dropdown

**What goes wrong:** Building bell as a `<Popover>` / `<DropdownMenu>` with notification preview inside
**Why it happens:** Common pattern assumption; many apps do this
**How to avoid:** Per IA §1.4, bell MUST navigate to `/dashboard/notifications` full page, NOT open a dropdown. "Full page navigation for accessibility and link-shareability."
**Warning signs:** Bell click opens a popover instead of navigating

### Pitfall 6: Audit Table Editing

**What goes wrong:** Adding edit buttons, row actions, or sort-by-click on audit table columns
**Why it happens:** Reusing the assets/assignments table pattern which has edit actions
**How to avoid:** Audit table is read-only + expand-only. The only interaction is the expand/collapse button per row. No sort, no filter on table columns (only the category filter buttons above).
**Warning signs:** DropdownMenu or "Edit" button appears in audit row actions column

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Predictive page at `/dashboard/predictive` | Canonical route is `/dashboard/ai` per IA v1.2 | New page file must be created at the canonical path |
| No IoT monitoring page | New `/dashboard/iot` with WS data flow | Asset management system now includes live sensor monitoring |
| Bell icon absent from topbar | Bell + badge required in topbar for UX-07 | `topbar.tsx` needs modification as part of Notification Center wireframe |
| paho-mqtt v1 callback (4 args) | paho-mqtt v2.1.0 requires 5-arg `on_connect` | Critical for backend IoT integration — see SDD §1.7 breaking change warning |
| Staff in IoT dashboard | Staff excluded per SDD §2.1 (route-level guard) | Sidebar hides IoT nav item from Staff |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | IoT page at `/dashboard/iot/[assetId]` shows per-asset sensor detail as a sub-page rather than same-page panel swap | IoT Layout | Plan may over-scope; could stay single-page with sidebar select |
| A2 | Notification bell in topbar navigates to full page (not dropdown) | Notification Center | If dropdown is needed, topbar component needs more complex state management |
| A3 | User Management uses `Dialog` for create/edit form (not separate page) | User Management | Could be full pages at `/users/new` and `/users/[id]/edit` per IA sitemap |
| A4 | `/dashboard/predictive` will be replaced/redirected to `/dashboard/ai` not kept in parallel | AI Page | If kept in parallel, both routes may confuse navigation |

---

## Open Questions

1. **IoT page: single-page or sub-page for asset detail?**
   - IA §1.5 lists both `/dashboard/iot` (hub, asset selector) and `/dashboard/iot/[assetId]` as separate routes
   - What we know: The IA sub-nav table shows two routes
   - Recommendation: Implement as 2-panel on `/dashboard/iot` with selected asset detail inline; `/dashboard/iot/[assetId]` can redirect to parent with pre-selected asset

2. **User form: Dialog or dedicated page?**
   - IA §2.1 sitemap shows `/dashboard/users/new` and `/dashboard/users/[id]/edit` as separate routes
   - What we know: `AssetFormDialog` pattern uses Dialog for assets
   - Recommendation: Follow IA sitemap — dedicated pages for user create/edit (more space for form fields)

3. **Does `/dashboard/predictive` need to be deleted or just shadowed?**
   - The nav already points to `/dashboard/ai` but the implementation is at `/dashboard/predictive`
   - Recommendation: Create `/dashboard/ai/page.tsx` as the canonical implementation; add redirect from `/dashboard/predictive` → `/dashboard/ai`

---

## Environment Availability

No external dependencies beyond the project stack — this is a wireframe/UI phase.

| Dependency | Required By | Available | Version |
|------------|------------|-----------|---------|
| Next.js | All pages | ✓ | 15 |
| shadcn/ui | All components | ✓ | Latest |
| Tailwind CSS | Styling | ✓ | v4 |
| Recharts | IoT charts | ✓ | 3.8.0 |
| lucide-react | Icons | ✓ | Latest |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `frontend/vitest.config.ts` (inferred from existing `*.test.tsx` files) |
| Quick run | `npx vitest run --reporter=verbose` |
| Full suite | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-05 | IoT page renders sensor tiles for correct sensor types per category | unit | `vitest run app/dashboard/iot/page.test.tsx` | ❌ Wave 0 |
| UX-06 | AI page shows Approve/Defer only for Manager/Admin role | unit | `vitest run app/dashboard/ai/page.test.tsx` | ❌ Wave 0 |
| UX-07 | Notification page renders unread indicators + mark-as-read action | unit | `vitest run app/dashboard/notifications/page.test.tsx` | ❌ Wave 0 |
| UX-08 | Audit page filter by category + expandable row behavior | unit | `vitest run app/dashboard/audit/page.test.tsx` | ✅ (exists at audit/page.test.tsx) |
| UX-09 | User management shows deactivate (not delete) only for Admin | unit | `vitest run app/dashboard/users/page.test.tsx` | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] `app/dashboard/iot/page.test.tsx` — covers UX-05 sensor tile rendering
- [ ] `app/dashboard/ai/page.test.tsx` — covers UX-06 role gate for approve/defer
- [ ] `app/dashboard/notifications/page.test.tsx` — covers UX-07 mark-as-read flow
- [ ] `app/dashboard/users/page.test.tsx` — covers UX-09 deactivate guard

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | JWT handled by existing `lib/store.tsx` auth layer |
| V4 Access Control | Yes | Role checks via `getVisibleNavigation(role)` + server-side RBAC. AI approval endpoint requires Manager/Admin JWT |
| V5 Input Validation | Yes | User Management create/edit form validates name, email, role — use HTML `required` + server validation |
| V6 Cryptography | No | No new crypto in these pages |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Staff accessing `/dashboard/iot` via direct URL | Elevation of Privilege | FastAPI route guard `Depends(require_role(["Admin", "Asset Manager"]))` |
| Staff approving AI recommendation via direct API call | Elevation of Privilege | API middleware RBAC check on `/api/ai/recommendations/{id}/approve` — UI is not the guard |
| Admin deleting users (hard delete) | Tampering | API endpoint accepts only `PATCH {is_active: false}` — no DELETE endpoint in user management |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `frontend/app/dashboard/predictive/page.tsx` — canonical AI Predictive implementation
- Codebase: `frontend/app/dashboard/audit/page.tsx` — canonical Audit Log implementation
- Codebase: `frontend/lib/predictive.ts` — SLA logic, recommendation types
- Codebase: `frontend/lib/audit-log.ts` — audit event types, categories
- Codebase: `frontend/lib/navigation-access.ts` — canonical routes and role permissions
- Codebase: `frontend/components/status-badge.tsx` — status chip color map
- Phase 14 SDD.md §1.3 IoT Data Pipeline, §1.4 AI Pipeline, §1.5 Notification Pipeline, §2.1 Permission Matrix, §2.4 AI Recommendation State Machine, §2.5 ER Diagram, §2.6 Sensor Category Mapping
- Phase 15 IA.md §1.2–1.5 Navigation, §2.1–2.3 Sitemap, Flow 4 (AI Approval), Flow 5 (IoT Alert Response)
- Phase 16 DESIGN_SYSTEM.md §1.5 Status Chip Map, §1.6 Chart Color Series, §4.x Component Rules, §5.2 LineChart+ReferenceLine, §5.6 Axis Formatting, §5.7 Threshold Reference Line

### Secondary (MEDIUM confidence)
- `frontend/components/topbar.tsx` — confirmed bell icon is absent (needs addition)
- `frontend/components/sidebar.tsx` — confirmed Bell/Users nav icons already present in sidebar

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified in codebase
- Architecture: HIGH — derived from SDD, IA, and existing implementations
- Role/permission rules: HIGH — verified against navigation-access.ts and SDD §2.1
- Pitfalls: HIGH — identified from direct codebase inspection (route gap, missing bell, sensor mapping)
- Chart specifics: HIGH — DESIGN_SYSTEM.md §5.2 is authoritative with code examples

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stable design system; safe for 30 days)
