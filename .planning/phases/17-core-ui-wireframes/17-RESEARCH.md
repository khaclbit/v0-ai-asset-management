# Phase 17: Core UI Wireframes — Research

**Researched:** 2026-06-28
**Domain:** React / Next.js 15 UI wireframe specification — Dashboard, Asset Management, Assignment Workflow, Maintenance Management, Sidebar Navigation
**Confidence:** HIGH — derived exclusively from live codebase inspection plus authoritative SDD.md, IA.md, and DESIGN_SYSTEM.md

---

## Summary

Phase 17 produces wireframe specifications — annotated ASCII/structured descriptions with component mappings, data sources, and role-permission annotations — for the five primary daily-use surfaces of the AssetIQ system. The project already has working prototype implementations for all five areas in `frontend/app/dashboard/`, but the wireframes must upgrade these prototypes to the full v1.2 IoT + AI specification defined in Phase 14 SDD and Phase 15 IA.

The existing prototypes use a **mock-data Zustand store** pattern (`@/lib/store`, `@/lib/data`). The wireframes must describe pages that consume **live backend REST APIs** (FastAPI, `VITE_API_URL=http://localhost:8000`) and real-time channels (WebSocket for sensor data, SSE for notifications). The primary gap between prototype and wireframe target is: (1) Dashboard lacks the AI Risk Donut chart, real-time sensor summary panel, and proper KPI wiring; (2) Asset list lacks sensor status indicator dots; (3) Sidebar lacks the full v1.2 role-aware nav items, notification count badge, and Administration divider; (4) Maintenance lacks the Maintenance Schedule Timeline bar chart.

**Primary recommendation:** Wireframes should describe the complete v1.2 target pages — treat existing prototype code as confirmed component patterns to reuse, but override any mock-data assumptions in favor of backend API data flows.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard KPI aggregation | API / Backend (Reporting & Insights module) | Frontend (display + skeleton) | KPIs are server-computed aggregations — never compute from raw list on client |
| Asset distribution bar chart | API / Backend | Frontend (Recharts render) | Chart data is a grouped COUNT query — backend owns aggregation |
| AI risk donut chart | API / Backend (AI Orchestration) | Frontend (Recharts render) | Risk band counts come from `ai_recommendations` table via `/ai/stats` |
| Real-time sensor summary panel | Frontend (WebSocket consumer) | Backend (IoT Ingestion WS broadcaster) | Live tile grid; values pushed via `assets/{id}/sensors/live` WS endpoint |
| Recent alerts list on Dashboard | API / Backend (Notification Hub) | Frontend SSE consumer | Alerts drawn from `notifications` table via GET + SSE unread push |
| Asset list (table + filters) | API / Backend (Asset Lifecycle) | Frontend (filter UI, pagination) | Server-side filtering for Staff role (own only) |
| Asset sensor status dot | Frontend Server (derive from last WS reading) | IoT Ingestion WS | Green/amber/red dot = time since last sensor reading; no separate API call needed |
| Asset detail sensor readings panel | Frontend (WebSocket consumer) | API (last-N readings REST) | Live panel for sensor tiles; initial load from REST, then WS updates |
| Assignment request form | Frontend (form) | API / Backend (Assignment Workflow) | POST `/assignments` — client constructs, backend validates + creates |
| Pending queue (Manager view) | API / Backend | Frontend (role guard) | GET `/assignments?status=requested` — Manager/Admin only |
| Assignment status badges | Frontend | — | All 5 statuses via `<StatusBadge>` — no server logic in UI |
| Maintenance schedule list | API / Backend (Maintenance & Warranty) | Frontend (grouped table) | GET `/maintenance` — Admin/Manager only |
| Maintenance state update | API / Backend | Frontend (select + confirm) | PATCH `/maintenance/{id}` — Manager/Admin enforced server-side |
| Warranty tracker | API / Backend (Asset Lifecycle) | Frontend (table + sort) | GET `/assets?warranty_expiry=soon`; expiry warning computed server-side |
| Sidebar role-aware nav | Frontend (client component) | — | `getVisibleNavigation(role)` hides items — UX layer only (RBAC enforced by backend) |
| Notification count badge | Frontend (SSE consumer) | Backend SSE | `unreadCount` from SSE event pushed by Notification Hub |
| Auth RBAC enforcement | API / Backend (Identity & Access) | Frontend (route guard + sidebar hide) | Backend is the security boundary; frontend is UX convenience |

---

## Existing Codebase Inventory

### Dashboard Shell Files (confirmed present via filesystem scan)

| File | Status | Notes |
|------|--------|-------|
| `frontend/app/dashboard/layout.tsx` | ✅ Exists | Shell layout — wraps Sidebar + main content area |
| `frontend/app/dashboard/page.tsx` | ✅ Exists (prototype) | Has KPI cards, Category bar chart, Warranty alerts, High-Risk list, Recent Assignments |
| `frontend/app/dashboard/assets/page.tsx` | ✅ Exists (prototype) | Asset list table with filters, pagination, retire dialog, `AssetFormDialog` |
| `frontend/app/dashboard/borrow/page.tsx` | ✅ Exists (prototype) | Assignment pending queue, active list, history, create dialog, reject dialog |
| `frontend/app/dashboard/maintenance/page.tsx` | ✅ Exists (prototype) | Maintenance grouped table, warranty tracker, expiry warnings card |
| `frontend/app/dashboard/predictive/page.tsx` | ✅ Exists (unknown) | Likely AI Predictive prototype |
| `frontend/app/dashboard/reports/page.tsx` | ✅ Exists (prototype) | Reports page |
| `frontend/app/dashboard/audit/page.tsx` | ✅ Exists | Audit log page |
| `frontend/app/dashboard/ocr/page.tsx` | ✅ Exists | OCR page (v1.0 feature) |
| `frontend/app/dashboard/assistant/page.tsx` | ✅ Exists | AI assistant page (v1.0 feature) |
| `frontend/app/page.tsx` | ✅ Exists | Login / root redirect page |

### Component Files (confirmed present)

| File | Status | Notes |
|------|--------|-------|
| `frontend/components/sidebar.tsx` | ✅ Exists | Dark navy sidebar, role-filtered nav via `getVisibleNavigation`, Logout button |
| `frontend/components/topbar.tsx` | ✅ Exists | Title + subtitle header, Avatar + role badge, user name |
| `frontend/components/status-badge.tsx` | ✅ Exists | CVA-driven `<StatusBadge>` — all lifecycle/assignment/maintenance/AI states |
| `frontend/components/asset-form-dialog.tsx` | ✅ Exists | Create/edit asset form dialog |
| `frontend/components/ai-trace-panel.tsx` | ✅ Exists | AI trace panel component |

### shadcn/ui Components Available (`frontend/components/ui/`)

| Component | File | Key Usage in Wireframes |
|-----------|------|------------------------|
| `<Card>` / `<CardHeader>` / `<CardContent>` | `card.tsx` | KPI cards, chart containers, list containers |
| `<Table>` and sub-components | `table.tsx` | All list/tabular views |
| `<Badge>` | `badge.tsx` | Notification count badges, role labels |
| `<StatusBadge>` | `../status-badge.tsx` | All lifecycle state chips |
| `<Button>` | `button.tsx` | All CTAs, row actions |
| `<Dialog>` + sub-components | `dialog.tsx` | Confirm dialogs, create forms, reject reason |
| `<Select>` | `select.tsx` | Filters, status update dropdowns |
| `<Input>` | `input.tsx` | Search fields, date fields, form fields |
| `<Textarea>` | `textarea.tsx` | Notes fields, reject reason |
| `<Label>` | `label.tsx` | Form field labels |
| `<Avatar>` / `<AvatarFallback>` | `avatar.tsx` | Topbar user avatar |
| `<Skeleton>` | `skeleton.tsx` | Loading states for all sections |
| `<Tabs>` | `tabs.tsx` | Assignment page tabs (All / Pending / Active / History) |
| `<ScrollArea>` | `scroll-area.tsx` | Overflow content areas |
| `<Separator>` | `separator.tsx` | Sidebar section dividers |
| `<DropdownMenu>` | `dropdown-menu.tsx` | Asset row actions (Edit / Retire), topbar user menu |
| `<ChartContainer>` / `<ChartTooltip>` etc. | `chart.tsx` | All Recharts chart wrappers |
| `<ChartEmptyState>` | `chart-empty-state.tsx` | No-data chart fallback |
| Sonner `<Toaster>` | `sonner.tsx` | Toast notifications for form feedback |

**NOT available (need to be added or hand-composed):**
- `<Breadcrumb>` — referenced in IA.md §1.4 and DESIGN_SYSTEM.md §4.10 but NOT found in `frontend/components/ui/`. Wireframe must note this as a missing component.
- `<Tooltip>` — may be needed for sensor status dots; not found in ui/ directory.
- `<Progress>` — may be needed for health score bar; not found.

---

## Layout Architecture Constants

### Shell Structure (from DESIGN_SYSTEM.md §3.2 + live `sidebar.tsx`)

```
┌──────────────────────────────────────────────────────────────────────┐
│  SIDEBAR  (w-64 = 256px)  │  MAIN LAYOUT (flex-col, flex-1)          │
│  bg-sidebar  #0E1825       │                                          │
│  hidden md:flex            │  TOPBAR (h-16 = 64px, sticky, border-b) │
│  flex-col                  ├──────────────────────────────────────────┤
│                            │  PAGE CONTENT (flex-1, overflow-y-auto)  │
│                            │  p-6 (24px padding all sides)            │
│                            │  space-y-6 between sections              │
└──────────────────────────────────────────────────────────────────────┘
```

| Zone | Class | Value |
|------|-------|-------|
| Sidebar width | `w-64` | 256 px (fixed) |
| Sidebar hidden on mobile | `hidden md:flex` | < 768 px |
| Top bar height | `h-16` | 64 px |
| Content outer padding | `p-6` | 24 px all sides |
| Between page sections | `space-y-6` | 24 px |
| KPI card grid gap | `gap-4` | 16 px |
| KPI grid responsive | `sm:grid-cols-2 xl:grid-cols-4` | 1 → 2 → 4 columns |
| Chart fixed height | `h-[280px]` | 280 px |
| Card default padding | `p-4` | 16 px |

### Topbar Upgrade Requirements (v1.2 target vs. existing prototype)

Current `topbar.tsx` shows: title + subtitle on left, name + department + role badge + avatar on right.

**v1.2 additions required:**
1. **Bell icon** with unread count badge (destructive variant) — click navigates to `/dashboard/notifications`
2. **Breadcrumb** replacing static title for nested pages (asset detail, assignment detail, maintenance detail)
3. **User dropdown** on avatar click — items: "Settings" → `/dashboard/settings`, "Logout"

---

## Per-Page Wireframe Requirements

---

### PAGE 1: Dashboard (`/dashboard`)

**Route:** `/dashboard` · **Roles:** All (Administrator, Manager, Staff)
**Existing prototype:** `frontend/app/dashboard/page.tsx` — partially complete, needs AI Donut + Sensor Summary

#### Layout Structure

```
TOPBAR: "Overview" | subtitle: "Asset status at a glance"  | 🔔[N] | 👤▾

CONTENT (p-6, space-y-6):
┌────────────────────────────────────────────────────────────────┐
│  KPI CARDS  (grid gap-4, sm:grid-cols-2 xl:grid-cols-4)       │
│  [Total Assets] [Active Assignments] [In Maintenance] [High Risk]│
└────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┐  ┌───────────────────────────┐
│  ASSET DISTRIBUTION           │  │  AI RISK DISTRIBUTION     │
│  Bar chart (lifecycle states) │  │  Donut chart (H/M/L)      │
│  lg:col-span-2 · h-[280px]   │  │  h-[280px]                │
└───────────────────────────────┘  └───────────────────────────┘
(3-col grid on lg: left=2, right=1)

┌────────────────────────────────────────────────────────────────┐
│  REAL-TIME SENSOR SUMMARY PANEL                                │
│  (3–4 tile grid, one per active sensor type)                   │
│  Each tile: sensor name, latest value + unit, status dot       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  RECENT ALERTS LIST  (latest 5 notifications from backend)     │
│  Each row: icon | title | message | timestamp | read/unread dot│
└────────────────────────────────────────────────────────────────┘
```

#### KPI Cards Specification

| Card | Icon | Value Source | API Endpoint | Data Field |
|------|------|-------------|-------------|------------|
| Total Assets | `<Package size-5>` | Count of non-retired assets | `GET /api/dashboard/kpis` | `total_assets` |
| Active Assignments | `<ArrowLeftRight size-5>` | Count where status = active or overdue | `GET /api/dashboard/kpis` | `active_assignments` |
| Assets in Maintenance | `<AlertTriangle size-5>` | Count where lifecycle_state = maintenance | `GET /api/dashboard/kpis` | `assets_in_maintenance` |
| High Risk Assets | `<ShieldAlert size-5>` | Count where AI failure_risk > 80% | `GET /api/dashboard/kpis` | `high_risk_assets` |

**KPI card anatomy** (from live `page.tsx` pattern — confirmed):
```
<Card>
  <CardContent className="flex items-start justify-between gap-3 p-5">
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>  ← trend or context
    </div>
    <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
      {icon}
    </div>
  </CardContent>
</Card>
```

#### Asset Distribution Bar Chart (existing — upgrade data source)

- **Chart type:** `BarChart` (single series, lifecycle state on X-axis)
- **Data source:** `GET /api/dashboard/asset-distribution` → `[{ state: "available", count: 42 }, ...]`
- **Color:** `fill="var(--chart-1)"` (Azure Blue) — single series, no legend
- **X-axis categories:** registered, available, assigned, maintenance, retired
- **Empty state:** `<ChartEmptyState message="No assets found" />`
- **Reference:** DESIGN_SYSTEM.md §5.3

#### AI Risk Distribution Donut Chart (NEW — not in prototype)

- **Chart type:** `PieChart` with `Pie` + `Cell` (donut)
- **Data source:** `GET /api/dashboard/ai-risk-distribution` → `[{ band: "high", count: 5 }, ...]`
- **Donut dimensions:** `innerRadius={60} outerRadius={90}`
- **Colors:**
  - `high` → `fill="var(--destructive)"` (#DE2125)
  - `medium` → `fill="var(--chart-4)"` (#ED980E)
  - `low` → `fill="var(--chart-3)"` (#43A74C)
- **Legend:** `verticalAlign="bottom" align="center"` (below donut)
- **Empty state:** `<ChartEmptyState message="No AI recommendations yet" hint="Recommendations will appear after asset analysis" />`
- **Reference:** DESIGN_SYSTEM.md §5.4

#### Real-Time Sensor Summary Panel (NEW — IoT feature)

```
<Card>
  <CardHeader>
    <CardTitle>Live Sensor Overview</CardTitle>
    <CardDescription>Fleet-wide latest readings · updates every 5s</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {sensorTypes.map(type => <SensorTile key={type} ... />)}
    </div>
  </CardContent>
</Card>
```

**SensorTile anatomy:**
```
<div className="rounded-lg border bg-muted/30 p-3">
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-muted-foreground uppercase">{sensorType}</span>
    <StatusDot status={isAlive ? "online" : "stale"} />  ← green / amber dot
  </div>
  <p className="mt-2 text-xl font-semibold font-mono">{latestValue}<span className="text-xs ml-1">{unit}</span></p>
  <p className="text-xs text-muted-foreground mt-1">Fleet avg across {assetCount} assets</p>
</div>
```

**StatusDot variants:**
- `online` (reading within 30s): `bg-chart-3` green circle `size-2 rounded-full`
- `stale` (30–120s): `bg-chart-4` amber circle
- `offline` (> 120s): `bg-destructive` red circle

**Data source:** WebSocket connection to `ws://localhost:8000/iot/stream` — subscribe to all-assets summary channel.

#### Recent Alerts List (upgrade from prototype)

- **Data source:** `GET /api/notifications?limit=5&sort=created_at:desc` (paginated, latest 5)
- **Real-time:** SSE `EventSource("/api/notifications/stream")` — new notifications prepend to list
- **Row anatomy:**
```
<div className="flex items-start gap-3 rounded-lg border p-3 text-sm">
  <NotificationIcon type={alert.type} />   ← colored lucide icon per type
  <div className="flex-1 min-w-0">
    <p className="font-medium">{alert.title}</p>
    <p className="text-xs text-muted-foreground">{alert.message}</p>
  </div>
  <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeTime(alert.created_at)}</span>
  {!alert.is_read && <span className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />}
</div>
```
- **Notification type → icon mapping:**

| Type | Icon | Color |
|------|------|-------|
| `high_failure_risk` | `<ShieldAlert>` | `text-destructive` |
| `warranty_expiry_warning` | `<AlertTriangle>` | `text-chart-4` |
| `upcoming_maintenance` | `<Wrench>` | `text-primary` |
| `overdue_return` | `<Clock>` | `text-destructive` |

---

### PAGE 2: Asset Management

#### 2A: Asset List (`/dashboard/assets`)

**Route:** `/dashboard/assets` · **Roles:** All (Staff: own assignments only via server-side filter)
**Existing prototype:** `frontend/app/dashboard/assets/page.tsx` — solid baseline; add sensor status dot column

```
TOPBAR: "Asset Registry" | subtitle: "{count} assets"  | 🔔[N] | 👤▾

CONTENT (p-6, space-y-4):
┌────────────────────────────────────────────────────────────────────┐
│  TOOLBAR (sticky, z-10, bg-background/95 backdrop-blur)            │
│  [🔍 Search name/ID/serial] [Category▾] [Status▾] [Clear Filters] │
│                                              [+ Create Asset] ──→   │
│                              Admin/Manager only; Lock icon if Staff │
└────────────────────────────────────────────────────────────────────┘

<Card className="overflow-hidden p-0">
  <Table>
    <TableHeader>
      <TableRow>
        ID | Asset Name | Category | Lifecycle State | Sensor Status | Assignee | [Actions]
      </TableRow>
    </TableHeader>
    <TableBody>
      {assets.map(a => (
        <TableRow onClick→ /assets/{a.id}>
          <TableCell font-mono text-xs>{a.id}</TableCell>
          <TableCell>
            <p font-medium>{a.name}</p>
            <p text-xs text-muted>{a.serial_number}</p>
          </TableCell>
          <TableCell>{a.category.name}</TableCell>
          <TableCell><StatusBadge status={a.lifecycle_state} /></TableCell>
          <TableCell><SensorStatusDot sensor_device_id={a.sensor_device_id} /></TableCell>
          <TableCell>{a.current_assignee?.name ?? "—"}</TableCell>
          {canCreateEdit && <TableCell><DropdownMenu>Edit | Retire</DropdownMenu></TableCell>}
        </TableRow>
      ))}
      {empty: <TableCell colSpan={7} className="h-32 text-center text-muted-foreground" />}
    </TableBody>
  </Table>
  <PaginationFooter showing="{start}-{end} of {total}" | rows-per-page | prev/next />
</Card>
```

**SensorStatusDot component:**
- Render only if `sensor_device_id` is non-null (asset has IoT sensor linked)
- 3 states: green (data < 30s old), amber (30–120s), red (> 120s or no data)
- Null `sensor_device_id` → display `—` text (no sensor linked)
- Tooltip: last reading timestamp (requires `<Tooltip>` component — mark as Wave 0 gap)

**Role-gated actions:**
| Action | Admin | Manager | Staff |
|--------|:-----:|:-------:|:-----:|
| Create Asset button (+ icon) | ✅ | ✅ | 🔒 hidden |
| Edit via row click / dropdown | ✅ | ✅ | 🔒 disabled |
| Retire via dropdown | ✅ | 🔒 | 🔒 |
| View asset detail (row click) | ✅ | ✅ | ✅ (own) |

**Columns that need data from new API (v1.2 additions):**
- `Sensor Status` dot: last reading timestamp from `GET /api/assets/{id}/sensor-status` or derived from WS heartbeat
- `Lifecycle State` column uses correct SDD enum values: `registered | available | assigned | maintenance | retired`

#### 2B: Asset Detail (`/dashboard/assets/[id]`)

**Route:** `/dashboard/assets/[id]` · **Roles:** All (Staff: own only)

```
TOPBAR breadcrumb: Dashboard / Assets / {asset.name}

CONTENT (p-6, space-y-6):
┌─────────────────────────────────────────┐
│  ASSET HEADER CARD                       │
│  {Asset Name}  <StatusBadge lifecycle>   │
│  ID: ASSET-001  Serial: SN-XXXX         │
│  Category: Laptop  Purchase: 2024-01-15 │
│  Warranty expiry: 2027-01-15            │
│  Assigned to: {user.name} or Unassigned │
│  [Edit Asset] ← Admin/Manager only      │
└─────────────────────────────────────────┘

GRID 2-col (lg:grid-cols-2):
┌─────────────────────────┐ ┌──────────────────────────┐
│  SENSOR READINGS PANEL  │ │  RECENT ASSIGNMENTS       │
│  (live tile grid)       │ │  Last 5 assignments for   │
│  per-sensor tile:       │ │  this asset; StatusBadge  │
│  name | value | unit |  │ │  per row                  │
│  status dot | timestamp │ │                           │
└─────────────────────────┘ └──────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  MAINTENANCE HISTORY  (table, latest 5 records)        │
│  Scheduled Date | Type | Status | Completed | Notes    │
└────────────────────────────────────────────────────────┘
```

**Sensor readings panel data source:** `GET /api/assets/{id}/sensors/latest` (last reading per type) + WS subscription to `assets/{id}/sensors/live`.

#### 2C: Create / Edit Asset Form (`/dashboard/assets/new` + `/dashboard/assets/[id]/edit`)

**Route:** `/dashboard/assets/new` (new) · `/dashboard/assets/[id]/edit` (edit) · **Roles:** Admin, Manager
**Existing:** `frontend/components/asset-form-dialog.tsx` — used as an inline dialog in prototype; v1.2 should be a full page or large dialog per IA.md.

```
TOPBAR breadcrumb: Dashboard / Assets / New Asset (or Asset Name / Edit)

CONTENT:
<Card>
  <CardHeader>
    <CardTitle>Create Asset</CardTitle>
    <CardDescription>All fields marked * are required</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Asset Name *</Label>
        <Input id="name" placeholder="e.g. Dell Latitude 5540" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="serial">Serial Number *</Label>
        <Input id="serial" placeholder="SN-XXXXXXXXX" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select><SelectItem> Laptop | Monitor | Printer | Forklift | Office Equipment </SelectItem></Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="purchase_date">Purchase Date *</Label>
        <Input id="purchase_date" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="warranty_expiry">Warranty Expiry Date</Label>
        <Input id="warranty_expiry" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sensor_device_id">Sensor Device ID</Label>
        <Input id="sensor_device_id" placeholder="ASSET-001 (must match IoT simulator)" />
        <p className="text-xs text-muted-foreground">Leave blank if no IoT sensor linked.</p>
      </div>
    </form>
  </CardContent>
  <CardFooter>
    <Button variant="outline" onClick={router.back}>Cancel</Button>
    <Button type="submit">Save Asset</Button>
  </CardFooter>
</Card>

← EDIT ONLY: Lifecycle State Change section (Admin/Manager) →
<Card>
  <CardHeader><CardTitle>Lifecycle State</CardTitle></CardHeader>
  <CardContent>
    Current state: <StatusBadge status={asset.lifecycle_state} />
    <p>Valid transitions: [Activate → Available] [Retire → Retired] ← Admin only retire</p>
    <Button variant="outline">Activate</Button>  ← only shown if state = registered
    <Button variant="destructive">Retire Asset</Button>  ← only shown to Admin
    → Retire triggers confirmation <Dialog>
  </CardContent>
</Card>
```

**Asset form field validation (from SDD ER Diagram):**
| Field | Required | Constraints |
|-------|:--------:|------------|
| name | ✅ | string, non-empty |
| serial_number | ✅ | string, unique per API validation |
| category_id | ✅ | FK to Categories (5 options) |
| purchase_date | ✅ | date, must be past |
| warranty_expiry_date | ❌ | date, must be > purchase_date |
| sensor_device_id | ❌ | string, must match IoT simulator device ID or blank |

---

### PAGE 3: Assignment Workflow

#### 3A: Assignment List (`/dashboard/assignments`)

**Route:** `/dashboard/assignments` · **Roles:** All (Staff: own requests only)
**Existing prototype:** `frontend/app/dashboard/borrow/page.tsx` — rename route to `/assignments`; add tab navigation

```
TOPBAR: "Assignments" | subtitle: "{active} active · {overdue} overdue"  | 🔔[N] | 👤▾

CONTENT (p-6, space-y-6):
┌────────────────────────────────────────────────────────────┐
│  SUMMARY STATS (3 cards: Available / Pending / Overdue)    │
│  sm:grid-cols-3 gap-4                                      │
└────────────────────────────────────────────────────────────┘

<Tabs defaultValue="pending">
  <TabsList>
    <TabsTrigger value="all">All</TabsTrigger>
    <TabsTrigger value="pending">Pending {pendingCount}</TabsTrigger>
    <TabsTrigger value="active">Active {activeCount}</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>

  <TabsContent value="pending">   ← Manager/Admin see this; Staff see own requests only
    [Pending Requests Queue — see 3B below]
  </TabsContent>

  <TabsContent value="active">
    [Active + Overdue table — see existing borrow page pattern]
  </TabsContent>

  <TabsContent value="history">
    [Closed + Rejected history table]
  </TabsContent>
</Tabs>
```

**[+ New Assignment Request] button:** Top-right of page header. Opens form at `/dashboard/assignments/new` (all roles).

#### 3B: Pending Requests Queue (Manager view, Pending tab)

```
<Card>
  <CardHeader>
    <CardTitle>Pending Requests</CardTitle>
    <CardDescription>Requests awaiting Manager approval</CardDescription>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
      <TableHeader>
        ID | Asset | Assignee | Requested By | Expected Return | Requested On | Status | Actions
      </TableHeader>
      <TableBody>
        {pending.map(r => (
          <TableRow>
            <TableCell font-mono text-xs>{r.id}</TableCell>
            <TableCell font-medium>{r.asset.name}</TableCell>
            <TableCell>{r.assignee.name}</TableCell>
            <TableCell text-muted-foreground>{r.requested_by.name}</TableCell>
            <TableCell>{formatDate(r.expected_return_date)}</TableCell>
            <TableCell>{formatDate(r.created_at)}</TableCell>
            <TableCell><StatusBadge status="requested" /></TableCell>
            <TableCell>  ← Manager/Admin only
              <Button size="sm" variant="outline" className="text-chart-3">
                <CheckCircle /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-destructive">
                <XCircle /> Reject
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

**Reject → Dialog with `<Textarea>` for rejection reason (optional per existing prototype pattern)**

#### 3C: Assignment Request Form (`/dashboard/assignments/new`)

**Route:** `/dashboard/assignments/new` · **Roles:** All

```
TOPBAR breadcrumb: Dashboard / Assignments / New Request

<Card className="sm:max-w-lg mx-auto">
  <CardHeader>
    <CardTitle>New Assignment Request</CardTitle>
    <CardDescription>Only assets with status "Available" can be assigned.</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="grid gap-4">
      <div className="space-y-2">
        <Label>Asset *</Label>
        <Select> {available assets: "{name} ({id})"} </Select>
        <p text-xs text-muted>Only showing available assets.</p>
      </div>
      <div className="space-y-2">
        <Label>Assignee *</Label>
        <Select> {users: "{name} — {department}"} </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="return-date">Expected Return Date *</Label>
        <Input id="return-date" type="date" min={today} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" rows={3} placeholder="Purpose of assignment, special instructions..." />
      </div>
    </form>
  </CardContent>
  <CardFooter>
    <Button variant="outline">Cancel</Button>
    <Button type="submit" disabled={!asset || !assignee || !date}>Submit Request</Button>
  </CardFooter>
</Card>
```

#### 3D: All 5 Status Badges (must be visible in UI)

Status badges used in assignment views (confirmed in `status-badge.tsx`):

| Status | Badge Color | Where Shown |
|--------|------------|-------------|
| `requested` | Teal (chart-2) | Pending queue, assignment detail |
| `active` | Blue (chart-1) | Active list, assignment detail |
| `overdue` | Red (destructive) | Active list (overdue row), assignment detail |
| `closed` | Green (chart-3) | History table |
| `rejected` | Grey (muted) | History table |

**Overdue visual treatment (confirmed from borrow/page.tsx):**
- Overdue rows: `className="bg-destructive/5"` row background tint
- Status badge: `<StatusBadge status="overdue" />` (derived at render time — `overdue` is NOT stored as a DB status, it is computed from `due_date < today && status == 'active'`)

#### 3E: Return Initiation Flow (`/dashboard/assignments/[id]/return`)

```
TOPBAR breadcrumb: Dashboard / Assignments / {assignmentId} / Return

<Card>
  <CardHeader>
    <CardTitle>Initiate Return</CardTitle>
    <CardDescription>Asset: {asset.name} · Assignee: {assignee.name}</CardDescription>
  </CardHeader>
  <CardContent className="grid gap-4">
    <div>
      <Label>Return Condition</Label>
      <Select>
        <SelectItem value="good">Good — No damage</SelectItem>
        <SelectItem value="minor_damage">Minor Damage</SelectItem>
        <SelectItem value="damaged">Significant Damage</SelectItem>
      </Select>
    </div>
    <div className="space-y-2">
      <Label htmlFor="return-notes">Notes</Label>
      <Textarea id="return-notes" rows={3} placeholder="Describe condition on return..." />
    </div>
    <!-- Warning if overdue -->
    {isOverdue && (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <XCircle className="inline size-4 mr-2" />
        This assignment is overdue. Return date was {expectedReturn}.
      </div>
    )}
  </CardContent>
  <CardFooter>
    <Button variant="outline">Cancel</Button>
    <Button>Initiate Return</Button>  ← sets returnDate, notifies Manager
  </CardFooter>
</Card>
```

#### 3F: Close Return Flow (Manager action on assignment detail)

The "Close Return" action appears in the active assignment table row when `returnDate` is non-null:
- Manager clicks **Close Return** button → confirmation `<Dialog>`:
  - Title: "Close Assignment Return"
  - Body: "Confirm asset {name} has been received and inspected."
  - "Damage noted? → Create Maintenance Ticket" checkbox (optional)
  - Buttons: `Cancel` + `Close Assignment` (default variant)
- On confirm: PATCH `/api/assignments/{id}/close` → system sets `status = closed`, `asset.lifecycle_state = available`

---

### PAGE 4: Maintenance Management

#### 4A: Maintenance Schedule List (`/dashboard/maintenance`)

**Route:** `/dashboard/maintenance` · **Roles:** Admin, Manager (Staff → /403)
**Existing prototype:** `frontend/app/dashboard/maintenance/page.tsx` — solid baseline; needs `+ Create Ticket` button and Maintenance Timeline chart

```
TOPBAR: "Maintenance & Warranty" | subtitle: "{count} records · {expiring} expiring in 30 days"

CONTENT (p-6, space-y-6):
┌─────────────────────────────────────────────────────────────────┐
│  STATS CARDS (3): Scheduled+In Progress | Blocked | Expiring≤30d│
│  sm:grid-cols-3 gap-4                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  WARRANTY EXPIRY WARNINGS (conditional: shown if > 0 warnings) │
│  Border: border-chart-4/40 when warnings exist                  │
│  Each item: button row — assetName | "{N} days left" | →        │
│  Critical (≤7d): bg-destructive/10 | Warning (≤30d): bg-chart-4/10│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  MAINTENANCE SCHEDULE TIMELINE  (bar chart — NEW in v1.2)       │
│  Stacked bar chart: Scheduled / In Progress / Completed per week│
│  h-[280px], lg:col-span-2  (occupies 2/3 of a 3-col grid)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  MAINTENANCE SCHEDULE TABLE                                     │
│  Header: [+ Create Maintenance Ticket] button (Admin/Manager)  │
│  Grouped by status: Scheduled / In Progress / Completed / Blocked│
│  Each group = collapsible section header + table                │
│  Columns: Asset | Scheduled Date | Type | Status | Notes | Update│
└─────────────────────────────────────────────────────────────────┘
```

**Maintenance Table — Create Ticket button (NEW):**
```
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle>Maintenance Schedule</CardTitle>
    <Button size="sm" onClick={() => router.push('/dashboard/maintenance/new')}>
      <Plus className="size-4 mr-2" />
      Create Ticket
    </Button>
  </CardHeader>
  ...
```

#### 4B: State Update UI (in-table select, Manager/Admin)

Current prototype pattern (confirmed from `maintenance/page.tsx`) — preserve this:
```
<Select value={record.status} onValueChange={...} disabled={!canManage}>
  <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="scheduled">Scheduled</SelectItem>
    <SelectItem value="in_progress" disabled={!canTransition(current, 'in_progress')}>In Progress</SelectItem>
    <SelectItem value="completed" disabled={!canTransition(current, 'completed')}>Completed</SelectItem>
    <SelectItem value="blocked" disabled={!canTransition(current, 'blocked')}>Blocked</SelectItem>
  </SelectContent>
</Select>
```

**Valid transition matrix (from SDD §2.3):**

| From | To | Valid? |
|------|-----|:-----:|
| scheduled | in_progress | ✅ |
| in_progress | completed | ✅ |
| in_progress | blocked | ✅ |
| blocked | in_progress | ✅ |
| Any | (terminal) | — |

**Blocked state requires note** (enforced in existing prototype via `requiresBlockedNote()` logic).

#### 4C: Maintenance State Badges (confirmed from DESIGN_SYSTEM.md §1.5)

| Status | Badge Color | Visual |
|--------|------------|--------|
| `scheduled` | Teal (chart-2) | `<StatusBadge status="scheduled" />` |
| `in_progress` | Amber (chart-4) | `<StatusBadge status="in_progress" />` |
| `completed` | Green (chart-3) | `<StatusBadge status="completed" />` |
| `blocked` | Red (destructive) | `<StatusBadge status="blocked" />` — row `bg-destructive/5` tint |

#### 4D: Maintenance Timeline Chart (NEW — DESIGN_SYSTEM.md §5.5)

```
<Card>
  <CardHeader>
    <CardTitle>Maintenance Activity by Week</CardTitle>
  </CardHeader>
  <CardContent>
    <ChartContainer config={maintenanceChartConfig} className="h-[280px] w-full">
      <BarChart data={weeklyData} margin={{ left: -10, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="top" align="right" />
        <Bar dataKey="scheduled" stackId="m" fill="var(--chart-2)" />
        <Bar dataKey="in_progress" stackId="m" fill="var(--chart-4)" />
        <Bar dataKey="completed" stackId="m" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  </CardContent>
</Card>
```

**Data source:** `GET /api/maintenance/timeline?weeks=8` → `[{ week: "2026-W25", scheduled: 3, in_progress: 1, completed: 2 }, ...]`

#### 4E: Warranty Tracker (from existing prototype — preserve pattern)

```
<Card>
  <CardHeader>
    <CardTitle>Warranty Tracker</CardTitle>
    <div>  ← filter toolbar
      [🔍 Search asset/provider] [Status filter▾] [Clear]
    </div>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
      Asset | Provider | End Date | Timing | Status | Coverage Notes
    </Table>
  </CardContent>
</Card>
```

**Warranty expiry visual indicators:**
- Critical (≤ 7 days): Row `bg-destructive/5`, timing text `text-destructive`
- Warning (8–30 days): Row `bg-chart-4/5`, timing text `text-chart-4`
- OK (> 30 days): Default styling
- Expired (< 0 days): Row muted, timing "Expired N days ago"

**Data source:** `GET /api/assets?include_warranty=true&sort=warranty_expiry_date:asc`

---

### PAGE 5: Sidebar Navigation

**Component:** `frontend/components/sidebar.tsx`
**Existing prototype:** Present and functional with `getVisibleNavigation(role)` — needs upgrade to v1.2 nav items

#### Full v1.2 Sidebar Structure

```
┌──────────────────────────────┐
│  h-16 flex items-center px-6  │  ← Logo row (same height as Topbar)
│  [◼ AssetIQ logo]             │
│  "AssetIQ"  text-base font-semibold  │
└──────────────────────────────┘

nav (flex-1, overflow-y-auto, px-3 py-4, space-y-1):
  ── PRIMARY ────────────────────
  [🏠 Dashboard]          /dashboard
  [📦 Assets]             /dashboard/assets
  [🔄 Assignments]        /dashboard/assignments    ← rename from /borrow
  [🔧 Maintenance]        /dashboard/maintenance    ← Manager/Admin only
  [📡 IoT Monitor]        /dashboard/iot            ← Manager/Admin only (NEW)
  [🤖 AI Predictive]      /dashboard/ai             ← Manager/Admin only (rename from /predictive)
  [🔔 Notifications  [3]] /dashboard/notifications  ← All roles; badge NEW
  [📊 Reports]            /dashboard/reports        ← Manager/Admin only

  ── ADMINISTRATION ──────────── ← Separator + label, Admin only
  [📋 Audit Log]          /dashboard/audit          ← Admin only
  [👥 Users]              /dashboard/users          ← Admin only (NEW)

bottom (border-t border-sidebar-border p-3):
  [⚙️ Settings]           /dashboard/settings
  [🚪 Log Out]            (button, handleLogout)
```

#### Nav Item Active/Hover/Collapsed States

| State | Classes |
|-------|---------|
| **Active** | `bg-sidebar-primary text-sidebar-primary-foreground` (#3283EF bg, #F8FAFB text) |
| **Hover** | `hover:bg-sidebar-accent hover:text-sidebar-foreground` (#1A2535 bg, #DFE5EB text) |
| **Default** | `text-sidebar-foreground/70` — 70% opacity on text, no bg |
| **Collapsed (mobile < md)** | Sidebar `hidden` — no icon rail in current design; full sidebar hidden |

**Active state matching rules (from IA.md §1.4):**
- Top-level exact match: `pathname === item.href` (e.g. `/dashboard` ↔ `/dashboard`)
- Module with sub-routes: `pathname.startsWith(item.href + '/')` (e.g. `/dashboard/assets/ASSET-001` activates Assets)
- Special case: `/dashboard/assets/new` activates Assets, not a new item

#### Notification Badge on Sidebar Item

```jsx
<Link href="/dashboard/notifications" className={cn(navItemClasses, active ? activeClass : defaultClass)}>
  <Bell className="size-4" />
  <span className="flex-1">Notifications</span>
  {unreadCount > 0 && (
    <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1">
      {unreadCount > 99 ? "99+" : unreadCount}
    </Badge>
  )}
</Link>
```

**Badge data source:** Zustand store `unreadNotifications` count — populated from SSE push on `EventSource("/api/notifications/stream")`.

#### Administration Section Divider (Admin only)

```jsx
{role === "admin" && (
  <>
    <div className="my-2 px-3">
      <Separator className="bg-sidebar-border" />
      <p className="mt-2 px-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/40">
        Administration
      </p>
    </div>
    <NavItem href="/dashboard/audit" label="Audit Log" icon={ScrollText} />
    <NavItem href="/dashboard/users" label="Users" icon={Users} />
  </>
)}
```

#### Role Visibility Map for Sidebar

| Nav Item | Admin | Manager | Staff |
|----------|:-----:|:-------:|:-----:|
| Dashboard | ✅ | ✅ | ✅ |
| Assets | ✅ | ✅ | ✅ (own) |
| Assignments | ✅ | ✅ | ✅ (own) |
| Maintenance | ✅ | ✅ | 🔒 hidden |
| IoT Monitor | ✅ | ✅ | 🔒 hidden |
| AI Predictive | ✅ | ✅ | 🔒 hidden |
| Notifications | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | 🔒 hidden |
| — Administration divider — | ✅ | 🔒 | 🔒 |
| Audit Log | ✅ | 🔒 | 🔒 |
| Users | ✅ | 🔒 | 🔒 |
| Settings (bottom) | ✅ | ✅ | ✅ |
| Logout (bottom) | ✅ | ✅ | ✅ |

**Hide-not-disable rule:** Items are REMOVED from the DOM for unauthorized roles — never grayed out or shown with a lock icon. (IA.md §1.3, confirmed)

---

## Role-Permission Matrix (Summary for All 5 Pages)

| Page / Action | Administrator | Manager | Staff |
|--------------|:-------------:|:-------:|:-----:|
| **Dashboard** | Full view | Full view | Full view |
| Dashboard — KPI cards | ✅ | ✅ | ✅ |
| Dashboard — AI Risk Donut | ✅ | ✅ | ✅ |
| Dashboard — Sensor Summary | ✅ | ✅ | ✅ (own assets) |
| **Asset List** | Full | Full | Own assignments |
| Create asset | ✅ | ✅ | 🔒 |
| Edit asset | ✅ | ✅ | 🔒 |
| Retire asset | ✅ | 🔒 | 🔒 |
| **Assignment Workflow** | | | |
| Submit request | ✅ | ✅ | ✅ |
| Approve/reject (Pending queue) | ✅ | ✅ | 🔒 hidden |
| Initiate return | ✅ | ✅ | ✅ (own) |
| Close return | ✅ | ✅ | 🔒 |
| **Maintenance** | | | |
| View schedule | ✅ | ✅ | → /403 |
| Create ticket | ✅ | ✅ | 🔒 |
| Update state | ✅ | ✅ | 🔒 |
| View warranty tracker | ✅ | ✅ | → /403 |
| **Sidebar Nav** | All items | No Admin section | 4 items only |

---

## Component Mapping (Per Section → shadcn/ui + Custom)

| Wireframe Section | Components Used |
|-------------------|----------------|
| KPI Cards | `<Card>`, `<CardContent>`, lucide icons, `<Skeleton>` (loading) |
| Asset Distribution Bar Chart | `<ChartContainer>`, `<BarChart>`, `<Bar>`, `<ChartTooltip>`, `<ChartEmptyState>` |
| AI Risk Donut Chart | `<ChartContainer>`, `<PieChart>`, `<Pie>`, `<Cell>`, `<ChartLegend>`, `<ChartEmptyState>` |
| Real-Time Sensor Tiles | Custom `<SensorTile>` (new), `<StatusDot>` (new), `<Card>` |
| Recent Alerts List | `<Card>`, lucide icons, `<Badge>` (unread dot), `<Skeleton>` |
| Asset List Table | `<Card>`, `<Table>` + all sub-components, `<StatusBadge>`, `<Input>`, `<Select>`, `<Button>`, `<DropdownMenu>` |
| Asset Sensor Status Dot | Custom `<SensorStatusDot>` (new), Tooltip (not yet in ui/) |
| Asset Form | `<Card>`, `<Input>`, `<Select>`, `<Label>`, `<Button>`, `<Textarea>` |
| Asset Retire Dialog | `<Dialog>`, `<Button variant="destructive">` |
| Assignment List (tabs) | `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Table>`, `<StatusBadge>` |
| Pending Queue | `<Card>`, `<Table>`, `<Button>` (Approve/Reject), `<StatusBadge status="requested">` |
| Assignment Request Form | `<Dialog>` or full page `<Card>`, `<Select>`, `<Input type="date">`, `<Label>`, `<Button>` |
| Reject Dialog | `<Dialog>`, `<Textarea>`, `<Button variant="destructive">` |
| Return Initiation | `<Card>`, `<Select>`, `<Textarea>`, Alert banner (warning if overdue) |
| Close Return Dialog | `<Dialog>`, `<Button>` |
| Maintenance Stats | `<Card>`, `<CardContent>` (number display) |
| Warranty Warnings Card | `<Card>`, conditional `border-chart-4/40`, button rows |
| Maintenance Timeline Chart | `<ChartContainer>`, `<BarChart>`, `<Bar>` ×3 stacked, `<ChartLegend>`, `<ChartEmptyState>` |
| Maintenance Table | `<Card>`, `<Table>`, `<StatusBadge>`, `<Select>` (state update), `<Button>` (Note) |
| Warranty Table | `<Card>`, `<Table>`, `<Input>` (search), `<Select>` (filter), `<StatusBadge>` |
| Sidebar Nav | `<aside>`, `<Link>`, `<Separator>`, `<Badge>` (notification count), lucide icons |
| Topbar | `<header>`, `<Avatar>`, `<Badge>`, Bell icon, `<DropdownMenu>` (user menu) |

---

## Data Source Annotations

| UI Section | API Module | Endpoint Pattern | Real-Time? |
|------------|------------|------------------|:----------:|
| Dashboard KPIs | Reporting & Insights | `GET /api/dashboard/kpis` | ❌ (poll on mount) |
| Asset Distribution data | Reporting & Insights | `GET /api/dashboard/asset-distribution` | ❌ |
| AI Risk Donut data | AI Orchestration | `GET /api/dashboard/ai-risk-distribution` | ❌ |
| Sensor Summary tiles | IoT Ingestion | `WS /api/iot/stream` (all-asset summary) | ✅ WS 5s |
| Recent Alerts list | Notification Hub | `GET /api/notifications?limit=5` + SSE | ✅ SSE |
| Notification unread count (sidebar badge) | Notification Hub | SSE `EventSource("/api/notifications/stream")` | ✅ SSE |
| Asset list | Asset Lifecycle | `GET /api/assets?page=N&size=M&...filters` | ❌ |
| Asset sensor status dot | IoT Ingestion | Last timestamp from WS heartbeat or `GET /api/assets/{id}/sensor-status` | ✅ WS derived |
| Asset detail sensor readings | IoT Ingestion | `GET /api/assets/{id}/sensors/latest` + `WS assets/{id}/sensors/live` | ✅ WS 5s |
| Assignment list | Asset Lifecycle (Assignment) | `GET /api/assignments?status=...` | ❌ |
| Pending queue | Asset Lifecycle | `GET /api/assignments?status=requested` | ❌ |
| Assignment approve/reject | Asset Lifecycle | `PATCH /api/assignments/{id}/approve` or `/reject` | ❌ |
| Return initiation | Asset Lifecycle | `PATCH /api/assignments/{id}/return` | ❌ |
| Close return | Asset Lifecycle | `PATCH /api/assignments/{id}/close` | ❌ |
| Maintenance schedule | Maintenance & Warranty | `GET /api/maintenance` | ❌ |
| Maintenance timeline chart | Reporting & Insights | `GET /api/maintenance/timeline?weeks=8` | ❌ |
| Maintenance state update | Maintenance & Warranty | `PATCH /api/maintenance/{id}` | ❌ |
| Warranty tracker | Asset Lifecycle | `GET /api/assets?include_warranty=true` | ❌ |

---

## Edge Cases and Empty States

### Dashboard Empty States

| Section | Empty State | Component |
|---------|-------------|-----------|
| Asset Distribution chart | No assets registered | `<ChartEmptyState message="No assets found" hint="Assets will appear once imported" />` |
| AI Risk Donut | No AI recommendations | `<ChartEmptyState message="No AI recommendations yet" hint="Recommendations will appear after asset analysis" />` |
| Sensor Summary panel | No IoT sensors linked | Show "No sensors configured" text with `text-muted-foreground` |
| Recent Alerts list | No notifications | `<p className="text-sm text-muted-foreground text-center py-4">No recent alerts.</p>` |
| KPI cards loading | Fetching data | `<Skeleton>` pattern per §4.9 |

### Asset Management Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Asset in `maintenance` state — edit form | Block state field; show info banner: "Asset is in maintenance — state managed by maintenance module" |
| Asset has no `sensor_device_id` | Sensor status column shows `—` (em dash), not a colored dot |
| Staff tries to access `/dashboard/assets/new` | Redirect to `/403` |
| Staff tries to open another user's asset detail | Backend returns 403; frontend shows error state |
| Asset filter returns 0 results | Table empty state: "No assets match your filters." with Clear Filters button prominent |
| Retire confirmation on assigned asset | Dialog warns: "Asset is currently assigned. Retiring will force-close the active assignment." |

### Assignment Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| No available assets when creating request | `<Select>` shows empty + disabled; Alert banner: "No assets currently available for assignment." |
| Assignment is overdue | Row `bg-destructive/5` tint; badge `<StatusBadge status="overdue" />`; overdue banner in detail view |
| Staff tries to access another user's assignment | 403 redirect |
| Manager tries to approve already-active assignment | API returns conflict; toast error: "Asset already has an active assignment" |
| Return condition = damaged | Close dialog shows additional checkbox: "Create maintenance ticket for this asset?" |
| Empty pending queue | Table row: "No pending requests." (colSpan) |

### Maintenance Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Transition to `blocked` without note | Inline error: "A note is required when setting status to Blocked." (from existing prototype) |
| AI-triggered maintenance ticket | Record shows `correlation_id` badge: "AI-triggered · Rec #{id}" in Notes column |
| Warranty expired (days < 0) | Row `bg-destructive/5`; timing: "Expired N days ago" in `text-destructive` |
| Maintenance in `completed` state — no further transitions | `<Select>` disabled; tooltip: "Terminal state" |
| Staff accesses `/dashboard/maintenance` directly | Redirect to `/403` |
| Empty maintenance schedule | Each status group table shows: "No records in {status}." |

### Sidebar Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| No unread notifications | Bell badge hidden (not shown at all) |
| Unread count > 99 | Badge shows "99+" |
| Staff role | 4 items only (Dashboard, Assets, Assignments, Notifications) + Settings + Logout |
| Manager role | 8 items (no Admin section) + Settings + Logout |
| Active route = sub-route (e.g. `/dashboard/assets/ASSET-001`) | Assets nav item highlighted via `startsWith` match |

---

## Common Pitfalls

### Pitfall 1: `overdue` Status Stored vs. Derived
**What goes wrong:** Storing `overdue` as a DB status value. It does NOT exist in `Assignments.status` enum per SDD §2.5. The DB only stores `requested | active | closed | rejected`.
**Why it happens:** UI shows "overdue" badge, devs assume it's a DB state.
**How to avoid:** `overdue` is computed at render time: `status === 'active' && expected_return_date < today`. The existing prototype (`borrow/page.tsx`) already implements this correctly with `isOverdue` flag.

### Pitfall 2: AI Must Not Create Maintenance Tickets
**What goes wrong:** Wiring an "auto-create maintenance" API call from the AI service or from the Predictive page without Manager authentication.
**Why it happens:** Convenience — AI surfaces a recommendation, tempting direct creation.
**How to avoid:** The maintenance creation endpoint (`POST /api/maintenance`) always requires a Manager or Admin JWT. The Approve button on the AI Recommendations page triggers this via the authenticated user's session — never via a background service call.

### Pitfall 3: Sensor Status Dot Polling vs. WebSocket
**What goes wrong:** Polling `GET /api/assets/{id}/sensor-status` on every asset in the list every N seconds — creates N×interval API hammering for a 50-asset list.
**Why it happens:** Simpler to implement than WS subscription.
**How to avoid:** Asset list page subscribes to a single fleet-summary WebSocket channel; individual asset status dots derive from the WS message timestamps locally.

### Pitfall 4: Role Check in Sidebar ≠ Security
**What goes wrong:** Assuming sidebar `hidden` means unauthorized users cannot access the route.
**Why it happens:** Confusing UX convenience with security.
**How to avoid:** Every sensitive route must have both: (1) sidebar item hidden via `getVisibleNavigation(role)` AND (2) FastAPI `Depends(require_role(...))` on the endpoint. The frontend route guard redirects to `/403` for direct URL access.

### Pitfall 5: Recharts Colors Must Use CSS Variables
**What goes wrong:** Hardcoding hex colors in `<Bar fill="#0864CD">` instead of `fill="var(--chart-1)"`.
**Why it happens:** Developers copy hex values from design tokens and hardcode them.
**How to avoid:** DESIGN_SYSTEM.md §5.1 Rule 6: "Never use hardcoded hex colors in `<Line>`, `<Bar>`, or `<Cell>` — always reference `var(--chart-N)` CSS variable references."

### Pitfall 6: Route Name Mismatch (borrow → assignments)
**What goes wrong:** Keeping the prototype route `/dashboard/borrow` in the v1.2 build.
**Why it happens:** Prototype was built with a provisional route name.
**How to avoid:** IA.md §2.1 specifies `/dashboard/assignments` as the canonical route. Sidebar nav must point to `/dashboard/assignments`. The existing `frontend/app/dashboard/borrow/page.tsx` must be migrated to `frontend/app/dashboard/assignments/page.tsx`.

---

## Validation Architecture

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | File |
|--------|----------|-----------|------|
| UX-01 | Dashboard renders all 4 KPI cards | Unit (component render) | `app/dashboard/page.test.tsx` (exists) |
| UX-01 | Dashboard renders Asset Distribution bar chart | Unit | `app/dashboard/page.test.tsx` (exists — extend) |
| UX-01 | Dashboard renders AI Risk Donut chart (empty state OK) | Unit | `app/dashboard/page.test.tsx` (exists — extend) |
| UX-02 | Asset list renders lifecycle state badge per row | Unit | `app/dashboard/assets/page.test.tsx` (needs creation) |
| UX-02 | Asset form opens for Admin/Manager, hidden for Staff | Unit | `app/dashboard/assets/page.test.tsx` |
| UX-03 | Assignment list renders all 5 status badges | Unit | `app/dashboard/borrow/page.test.tsx` (exists — extend) |
| UX-03 | Pending queue visible to Manager, hidden from Staff | Unit | `app/dashboard/borrow/page.test.tsx` |
| UX-03 | Overdue rows show `bg-destructive/5` tint | Unit | `app/dashboard/borrow/page.test.tsx` |
| UX-04 | Maintenance table renders 4 state badge types | Unit | `app/dashboard/maintenance/page.test.tsx` (needs creation) |
| UX-04 | State update Select disabled for non-Manager | Unit | same |
| UX-04 | Warranty table shows expiry warning rows | Unit | same |
| UX-10 | Sidebar hides Admin section for Manager/Staff roles | Unit | `components/sidebar.test.tsx` (exists — extend) |
| UX-10 | Sidebar shows notification badge when unread > 0 | Unit | `components/sidebar.test.tsx` |
| UX-10 | Active nav item receives sidebar-primary classes | Unit | `components/sidebar.test.tsx` |

**Test framework:** Vitest (Next.js 15 project standard) — config and existing test files confirm this.

**Quick run command:** `cd frontend && npx vitest run --reporter=verbose`
**Full suite command:** `cd frontend && npx vitest run`

### Wave 0 Gaps

- [ ] `frontend/app/dashboard/assets/page.test.tsx` — needs creation (covers UX-02)
- [ ] `frontend/app/dashboard/maintenance/page.test.tsx` — needs creation (covers UX-04)
- [ ] `frontend/app/dashboard/assignments/page.test.tsx` — needs creation at new route (covers UX-03)
- [ ] `frontend/components/ui/breadcrumb.tsx` — `<Breadcrumb>` component referenced in DESIGN_SYSTEM.md §4.10 but NOT present in `frontend/components/ui/`; must be added as a Wave 0 task before topbar breadcrumb can be implemented

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|:-------:|-----------------|
| V2 Authentication | Yes | JWT token in Authorization header; `get_current_user()` FastAPI dependency |
| V3 Session Management | Yes | JWT expiry enforced; `/auth/refresh` for token refresh |
| V4 Access Control | Yes | `Depends(require_role("manager", "admin"))` on every protected endpoint; frontend hides only (not security) |
| V5 Input Validation | Yes | Pydantic schemas on all POST/PATCH endpoints; frontend form validation (HTML5 + custom) |
| V6 Cryptography | No | No crypto operations in UI layer |

### Frontend-Specific Security Rules

| Pattern | Threat | Mitigation |
|---------|--------|-----------|
| Staff accessing `/dashboard/maintenance` directly | Unauthorized access | Route guard `getVisibleNavigation` (UX) + FastAPI 403 (security) |
| Asset retirement without Admin role | Privilege escalation | Retire action gated server-side: `require_role("admin")` |
| AI recommendation approval without Manager role | AI mutation prohibition bypass | Server-side RBAC on `/api/maintenance` POST endpoint |
| Injection via search input | XSS / SQLi | Backend parameterized queries; React auto-escapes JSX rendering |

---

## Environment Availability Audit

| Dependency | Required By | Available | Notes |
|------------|------------|:---------:|-------|
| Node.js | Next.js 15 frontend | ✅ (inferred) | Project has `frontend/node_modules/` present |
| Next.js 15 | Frontend build | ✅ | `package.json` in `frontend/` |
| Recharts 3.8.0 | Chart components | ✅ | Listed in project context; `chart.tsx` uses it |
| Tailwind CSS v4 | Styling | ✅ | Listed in project context; `globals.css` uses OKLCH tokens |
| shadcn/ui | UI components | ✅ | `frontend/components/ui/` confirmed |
| `<Breadcrumb>` component | Topbar nested routes | ❌ | Not in `frontend/components/ui/` — must be added |
| Tooltip component | Sensor status dot | ❌ | Not in `frontend/components/ui/` — needed for hover state |
| FastAPI backend | API data | Not verified | Backend directory exists at `backend/`; dev server state unknown |
| PostgreSQL | Data persistence | Not verified | Defined in docker-compose; dev env status unknown |

**Missing dependencies with no fallback:**
- `<Breadcrumb>` — must be added before implementing topbar breadcrumbs (shadcn CLI: `npx shadcn@latest add breadcrumb`)
- `<Tooltip>` — must be added before sensor status dot hover (shadcn CLI: `npx shadcn@latest add tooltip`)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `overdue` is derived at render time (not stored in DB) | Assignment Workflow edge cases | If stored, badge logic may show stale state |
| A2 | `frontend/app/dashboard/borrow/` route should be migrated to `assignments/` | Route Name Mismatch pitfall | Route collision or 404 if not migrated |
| A3 | Breadcrumb component is not present — needs shadcn CLI install | Environment Availability | If it IS present but in a different location, Wave 0 task is unnecessary |
| A4 | Vitest is the test runner (not Jest) | Validation Architecture | Commands would differ |
| A5 | The backend API prefix is `/api/` (e.g. `GET /api/dashboard/kpis`) | Data Source Annotations | Actual prefix may differ; all API path annotations would need updating |

**Note on A2:** The existing code in `frontend/app/dashboard/borrow/` does appear to be the assignment page by content. The sidebar.tsx maps `/dashboard/borrow` to `ArrowLeftRight` icon, but IA.md specifies `/dashboard/assignments`. This requires a directory rename.

---

## Sources

### Primary (HIGH confidence — live codebase inspection)
- `frontend/app/dashboard/page.tsx` — Dashboard prototype patterns
- `frontend/app/dashboard/assets/page.tsx` — Asset list prototype
- `frontend/app/dashboard/borrow/page.tsx` — Assignment prototype
- `frontend/app/dashboard/maintenance/page.tsx` — Maintenance prototype
- `frontend/components/sidebar.tsx` — Sidebar component
- `frontend/components/topbar.tsx` — Topbar component
- `frontend/components/status-badge.tsx` — StatusBadge component
- `frontend/components/ui/` — All 18 shadcn/ui components confirmed

### Primary (HIGH confidence — project documents)
- `.planning/phases/14-system-architecture-domain-model/SDD.md` — State machines, permission matrix, ER diagram, sensor types
- `.planning/phases/15-information-architecture-user-flows-navigation/IA.md` — Navigation map, routes, user flows, sidebar behavior
- `.planning/phases/16-design-system-component-catalog/DESIGN_SYSTEM.md` — Color tokens, typography, spacing, component catalog, chart standards

---

## Metadata

**Confidence breakdown:**
- Existing codebase inventory: HIGH — direct filesystem scan
- Layout constants: HIGH — from DESIGN_SYSTEM.md §3 (authoritative)
- Per-page wireframe requirements: HIGH — synthesized from SDD + IA.md authoritative documents
- Role-permission matrix: HIGH — from SDD §2.1 permission table (authoritative)
- Component mapping: HIGH — confirmed against live `frontend/components/ui/` directory
- Data source annotations: MEDIUM — API endpoint paths are assumed (`/api/` prefix, endpoint naming) pending backend route inspection
- Edge cases: HIGH — derived from existing prototype code + SDD business rules

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (30 days — stable architecture docs)
