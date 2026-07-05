---
phase: 17
document: WIREFRAMES
status: complete
date: 2026-06-28
requirements: UX-01, UX-02, UX-03, UX-04, UX-10
depends_on:
  - Phase 14 SDD.md (state machines, permission matrix)
  - Phase 15 IA.md (routes, nav items, user flows)
  - Phase 16 DESIGN_SYSTEM.md (color tokens, components, chart standards)
---

# AssetIQ — Core UI Wireframes

> **Scope:** Annotated ASCII wireframes for the 5 primary daily-use surfaces of the AssetIQ
> v1.2 system. Each section includes layout diagrams, component mapping, data source
> annotations, and role-permission notes. These wireframes describe the **v1.2 target state**
> (live backend API, IoT real-time, AI risk) — not the current mock-data prototype.
>
> **Shell constant:** All pages share the same shell: Sidebar (w-64, bg-sidebar #0E1825,
> hidden md:flex) + Topbar (h-16, sticky, border-b) + Page Content (p-6, space-y-6,
> overflow-y-auto). Wireframes below show only the PAGE CONTENT zone unless otherwise noted.
>
> **Component library:** shadcn/ui + Recharts 3.8. See DESIGN_SYSTEM.md §4 for all component
> usage rules and §5 for chart standards.

---

## §1 Sidebar Navigation (UX-10)

**Component:** `frontend/components/sidebar.tsx` · Fixed left panel, w-64 (256px), dark navy
bg-sidebar (#0E1825), hidden on mobile (< 768px).

### Admin Role View (all items visible)

```
┌──────────────────────────────────────────────┐
│  SIDEBAR — ADMIN ROLE (all items visible)     │
├──────────────────────────────────────────────┤
│  h-16 flex items-center px-6                 │  ← logo row matches Topbar height
│  [◼] AssetIQ  (text-base font-semibold)      │
├──────────────────────────────────────────────┤
│  PRIMARY NAVIGATION (flex-1, px-3 py-4)      │
│                                              │
│  [🏠] Overview         /dashboard            │  ← text-sidebar-foreground/70 (default)
│  [📦] Assets           /dashboard/assets     │
│  [🔄] Assignments      /dashboard/assignments│  ← renamed from /borrow (Wave 0)
│  [🔧] Maintenance      /dashboard/maintenance│
│  [📡] IoT Monitor      /dashboard/iot        │
│  [🤖] AI Predictive    /dashboard/ai         │
│  [🔔] Notifications [3]/dashboard/notifs     │  ← Badge: destructive, h-5 min-w-5
│  [📊] Reports          /dashboard/reports    │
│                                              │
│  ── Administration ──────────────────────── │  ← Separator + label; Admin only
│     text-xs uppercase tracking-wide          │
│     text-sidebar-foreground/40               │
│  [📋] Audit Log        /dashboard/audit      │
│  [👥] Users            /dashboard/users      │
│                                              │
├──────────────────────────────────────────────┤
│  BOTTOM ZONE (border-t border-sidebar-border)│
│  [⚙] Settings          /dashboard/settings  │
│  [→] Log Out           (handleLogout)        │
└──────────────────────────────────────────────┘
```

### Manager (Asset Manager) Role View

```
┌──────────────────────────────────────────────┐
│  SIDEBAR — MANAGER (Asset Manager) ROLE       │
│  [◼] AssetIQ                                 │
│  ─────────────────────────────────────────── │
│  [🏠] Overview                               │
│  [📦] Assets                                 │
│  [🔄] Assignments                            │
│  [🔧] Maintenance                            │
│  [📡] IoT Monitor                            │
│  [🤖] AI Predictive                          │
│  [🔔] Notifications [3]                      │
│  [📊] Reports                                │
│  ← NO Administration divider or items →      │
│  ─────────────────────────────────────────── │
│  [⚙] Settings  [→] Log Out                  │
└──────────────────────────────────────────────┘
```

### Staff Role View (4 primary items only)

```
┌──────────────────────────────────────────────┐
│  SIDEBAR — STAFF ROLE                         │
│  [◼] AssetIQ                                 │
│  ─────────────────────────────────────────── │
│  [🏠] Overview                               │
│  [📦] Assets          ← own assignments only │
│  [🔄] Assignments     ← own requests only    │
│  [🔔] Notifications                          │
│  ← Maintenance, IoT, AI, Reports: hidden →   │
│  ← Administration section: hidden →          │
│  ─────────────────────────────────────────── │
│  [⚙] Settings  [→] Log Out                  │
└──────────────────────────────────────────────┘
```

### Nav Item States

```
| State     | Tailwind Classes                                          | Visual                  |
|-----------|-----------------------------------------------------------|-------------------------|
| Default   | text-sidebar-foreground/70                                | 70% opacity grey text   |
| Hover     | hover:bg-sidebar-accent hover:text-sidebar-foreground     | #1A2535 bg, #DFE5EB text|
| Active    | bg-sidebar-primary text-sidebar-primary-foreground        | #3283EF bg, #F8FAFB text|
| Mobile    | hidden (entire sidebar hidden below md breakpoint)        | No icon rail; full hide |
```

### Active Route Matching Rules (from IA.md §1.4)

```
Exact match:    pathname === item.href           → /dashboard activates Overview
Prefix match:   pathname.startsWith(item.href+"/") → /dashboard/assets/ASSET-001 activates Assets
Special cases:  /dashboard/assets/new → activates Assets (not a separate nav entry)
                /dashboard/assignments/new → activates Assignments
```

Implementation:
```tsx
const active = pathname === item.href ||
  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
```

### Notification Badge Pattern

```tsx
{unreadCount > 0 && (
  <Badge variant="destructive" className="h-5 min-w-5 text-xs px-1">
    {unreadCount > 99 ? "99+" : unreadCount}
  </Badge>
)}
// Data: Zustand unreadNotifications — populated from SSE EventSource("/api/notifications/stream")
// Edge case: badge hidden entirely when unreadCount === 0
```

### Administration Section Conditional Render

```tsx
{role === "Admin" && (
  <>
    <Separator className="bg-sidebar-border my-2" />
    <p className="px-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/40">
      Administration
    </p>
    <NavItem href="/dashboard/audit" label="Audit Log" icon={ScrollText} />
    <NavItem href="/dashboard/users" label="Users" icon={Users} />
  </>
)}
// Items are DOM-removed for non-Admin roles — NOT disabled/greyed (IA.md §1.3 hide-not-disable rule)
```

---

## §2 Dashboard (/dashboard) (UX-01)

**Route:** `/dashboard` · **Roles:** All (Admin, Manager, Staff)

### Topbar

```
TOPBAR:
┌────────────────────────────────────────────────────────────┐
│  "Overview"  (h4)    "Asset status at a glance"  (caption) │
│                                           [🔔 N]  [👤 ▾]  │
│                                        ← Bell: Badge destructive, click → /dashboard/notifications
│                                        ← Avatar dropdown: Settings | Logout
└────────────────────────────────────────────────────────────┘
```

### Full Page Layout

```
PAGE CONTENT (p-6 space-y-6):
┌─────────────────────────────────────────────────────────────────────┐
│  KPI CARDS  (grid gap-4, sm:grid-cols-2 xl:grid-cols-4)             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌──────┐ │
│  │ Total Assets    │ │ Active Assign.  │ │ In Mainten.  │ │ High │ │
│  │ [📦]            │ │ [⇄]             │ │ [⚠]          │ │ Risk │ │
│  │  142            │ │  28             │ │  7           │ │  3   │ │
│  │  Non-retired    │ │  Active+overdue │ │  state=maint │ │ >80% │ │
│  └─────────────────┘ └─────────────────┘ └──────────────┘ └──────┘ │
│  Data: GET /api/dashboard/kpis → { total_assets, active_assignments,│
│         assets_in_maintenance, high_risk_assets }                   │
│  Loading: <Skeleton> per card (h-20)                                │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐ ┌─────────────────────────────┐
│  ASSET DISTRIBUTION CHART            │ │  AI RISK DISTRIBUTION CHART  │
│  (lg:col-span-2 in 3-col grid)       │ │  (lg:col-span-1)             │
│                                      │ │                              │
│  Bar chart — lifecycle states X-axis │ │  Donut chart (PieChart)      │
│  h-[280px]                           │ │  h-[280px]                   │
│  ┌──────────────────────────────┐    │ │  ┌────────────────────────┐  │
│  │ 50│                          │    │ │  │        ████            │  │
│  │ 40│    ███                   │    │ │  │      ██    ██          │  │
│  │ 30│    ███  ███              │    │ │  │     ██      ██         │  │
│  │ 20│    ███  ███  ███         │    │ │  │      ██    ██          │  │
│  │ 10│ ██ ███  ███  ███  ██    │    │ │  │        ████            │  │
│  │    reg avail  asgn  maint ret│    │ │  │  ● High  ● Med  ● Low  │  │
│  └──────────────────────────────┘    │ │  └────────────────────────┘  │
│  fill: var(--chart-1) Azure Blue    │ │  High: var(--destructive)    │
│  Data: GET /api/dashboard/           │ │  Med:  var(--chart-4) amber  │
│        asset-distribution            │ │  Low:  var(--chart-3) green  │
│  Empty: <ChartEmptyState             │ │  Data: GET /api/dashboard/   │
│    message="No assets found" />      │ │        ai-risk-distribution  │
│  X: registered|available|assigned|   │ │  → [{ band, count }]         │
│     maintenance|retired              │ │  Empty: <ChartEmptyState     │
│                                      │ │    message="No AI recs yet"  │
│                                      │ │    hint="After asset         │
│                                      │ │    analysis" />              │
└──────────────────────────────────────┘ └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  REAL-TIME SENSOR SUMMARY PANEL                                      │
│  CardTitle: "Live Sensor Overview"                                   │
│  CardDescription: "Fleet-wide latest readings · updates every 5s"   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ TEMPERATURE  │ │  HUMIDITY    │ │  VIBRATION   │ │  POWER     │ │
│  │           [●]│ │           [●]│ │           [●]│ │          [◐]│ │
│  │  24.2 °C     │ │  63.1 %      │ │  0.42 g      │ │  1.02 kW   │ │
│  │ Fleet avg    │ │ Fleet avg    │ │ Fleet avg    │ │ Fleet avg  │ │
│  │ 12 assets    │ │ 12 assets    │ │ 8 assets     │ │ 6 assets   │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│  StatusDot: [●] green = online (<30s)  [◐] amber = stale (30-120s) │
│             [✕] red = offline (>120s or no data)                    │
│  Data: WS ws://localhost:8000/iot/stream (all-asset summary channel) │
│  Empty: "No sensors configured" (text-muted-foreground, centered)    │
│  Grid: grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  RECENT ALERTS  (CardTitle: "Recent Alerts")                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ [🛡✕] High failure risk · ASSET-042 shows 94% failure prob.  │  │
│  │        2 min ago                                          [●] │  │  ← blue unread dot
│  │ [⚠] Warranty expiry · Dell Latitude warranty expires in 8d   │  │
│  │        15 min ago                                         [●] │  │
│  │ [🔧] Upcoming maintenance · Scheduled for ASSET-011 tomorrow  │  │
│  │        1 hr ago                                               │  │
│  │ [⏰] Overdue return · ASSET-033 return was 2 days ago         │  │
│  │        3 hr ago                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  Data: GET /api/notifications?limit=5&sort=created_at:desc           │
│  Real-time: SSE EventSource("/api/notifications/stream") — new items │
│             prepend to list without page reload                      │
│  Icon map:  high_failure_risk → <ShieldAlert> text-destructive       │
│             warranty_expiry_warning → <AlertTriangle> text-chart-4   │
│             upcoming_maintenance → <Wrench> text-primary             │
│             overdue_return → <Clock> text-destructive                │
│  Unread dot: size-2 rounded-full bg-primary (shown if !is_read)      │
│  Empty: <p className="text-sm text-muted-foreground text-center      │
│           py-4">No recent alerts.</p>                                │
└─────────────────────────────────────────────────────────────────────┘
```

### KPI Card Anatomy

```tsx
<Card>
  <CardContent className="flex items-start justify-between gap-3 p-5">
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
    <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
      {icon}
    </div>
  </CardContent>
</Card>
// Loading: replace entire CardContent with <Skeleton className="h-20 m-5" />
```

### Role Differences on Dashboard

```
| Section                | Admin | Manager | Staff                      |
|------------------------|:-----:|:-------:|:---------------------------|
| KPI Cards              |  ✅   |   ✅    | ✅                          |
| Asset Distribution     |  ✅   |   ✅    | ✅ (own assets only in data)|
| AI Risk Donut          |  ✅   |   ✅    | ✅                          |
| Sensor Summary Panel   |  ✅   |   ✅    | ✅ (own-asset sensors only) |
| Recent Alerts          |  ✅   |   ✅    | ✅ (own alerts only)        |
```

---

## §3 Asset Management (UX-02)

### 3A — Asset List (`/dashboard/assets`)

**Route:** `/dashboard/assets` · **Roles:** All (Staff: own assignments only via server-side filter)

**Topbar:**
```
TOPBAR: "Asset Registry"  |  subtitle: dynamically "{count} assets"  |  [🔔 N]  [👤 ▾]
```

**Full page layout:**
```
PAGE CONTENT (p-6 space-y-4):

TOOLBAR (sticky z-10 bg-background/95 backdrop-blur-sm, flex gap-2):
┌──────────────────────────────────────────────────────────────────────┐
│ [🔍 Search name / ID / serial number...]  [Category ▾] [Status ▾]   │
│ [Clear Filters]                                   [+ Create Asset]   │
│                                     ← Create Asset: Admin/Manager only
│                                       Staff sees this button HIDDEN  │
└──────────────────────────────────────────────────────────────────────┘

<Card className="overflow-hidden p-0">
  <Table>
    ┌────────┬──────────────────────┬──────────────┬──────────────────┬───────────────┬────────────┬─────────┐
    │ ID     │ Asset Name           │ Category     │ Lifecycle State  │ Sensor Status │ Assignee   │ Actions │
    ├────────┼──────────────────────┼──────────────┼──────────────────┼───────────────┼────────────┼─────────┤
    │ AST-01 │ Dell Latitude 5540   │ Laptop       │ [available]      │ [●] green     │ —          │ ⋯       │
    │        │ SN-ABC1234           │              │                  │               │            │         │
    ├────────┼──────────────────────┼──────────────┼──────────────────┼───────────────┼────────────┼─────────┤
    │ AST-02 │ HP LaserJet Pro 4001 │ Printer      │ [assigned]       │ —             │ John Doe   │ ⋯       │
    │        │ SN-DEF5678           │              │                  │               │            │         │
    ├────────┼──────────────────────┼──────────────┼──────────────────┼───────────────┼────────────┼─────────┤
    │ AST-03 │ Forklift FL-220      │ Equipment    │ [maintenance]    │ [◐] amber     │ —          │ ⋯       │
    └────────┴──────────────────────┴──────────────┴──────────────────┴───────────────┴────────────┴─────────┘

  Lifecycle State column: <StatusBadge status={a.lifecycle_state} />
    Values: registered | available | assigned | maintenance | retired
    (IMPORTANT: "overdue" is an Assignment status, NOT an asset lifecycle state)

  Sensor Status column (SensorStatusDot component):
    ● green  = bg-chart-3 circle, size-2 rounded-full → data < 30s old
    ◐ amber  = bg-chart-4 circle                      → 30–120s old
    ✕ red    = bg-destructive circle                  → >120s or no data
    —        = em dash (not a dot) if sensor_device_id is null (no IoT sensor)
    Tooltip (requires <Tooltip> component from Wave 0): shows "Last reading: {relativeTime}"
    Data: derived from fleet WS heartbeat (ws://localhost:8000/iot/stream) — NOT individual polling

  Actions column (⋯ DropdownMenu):
    Admin + Manager: [Edit] → /dashboard/assets/{id}/edit  |  [Retire] → confirmation Dialog
    Staff: Actions column HIDDEN entirely (not disabled — DOM removed)
    Retire option: Admin only (Manager sees Edit only)

  Row click → navigate to /dashboard/assets/{id} (all roles who can see the row)

  Empty state (zero results):
    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
      No assets match your filters.
    </TableCell>
    + prominent Clear Filters button below

  Pagination footer:
    "Showing {start}–{end} of {total} assets"  |  Rows per page: [10 ▾]  |  [←] [→]
  Data: GET /api/assets?page={n}&size={m}&search={q}&category={c}&status={s}

  Loading: <Skeleton> rows (5 rows × full row height)
  </Table>
</Card>
```

**Role-action table:**
```
| Action                  | Admin | Manager | Staff         |
|-------------------------|:-----:|:-------:|:--------------|
| See Create Asset button | ✅    | ✅      | 🔒 hidden     |
| Edit via dropdown       | ✅    | ✅      | 🔒 hidden     |
| Retire via dropdown     | ✅    | 🔒      | 🔒 hidden     |
| View detail (row click) | ✅    | ✅      | ✅ own only   |
```

---

### 3B — Asset Detail (`/dashboard/assets/[id]`)

**Route:** `/dashboard/assets/[id]` · **Roles:** All (Staff: own assignments only)

**Topbar breadcrumb:**
```
TOPBAR BREADCRUMB: Dashboard / Assets / {asset.name}
← Uses <Breadcrumb> component (installed Wave 0): BreadcrumbList → BreadcrumbItem × 3
```

**Page layout:**
```
PAGE CONTENT (p-6 space-y-6):

ASSET HEADER CARD (full width):
┌──────────────────────────────────────────────────────────────────┐
│  Dell Latitude 5540               <StatusBadge status="assigned">│
│  ID: ASSET-001  ·  Serial: SN-ABC1234                           │
│  Category: Laptop  ·  Purchase: 2024-01-15                      │
│  Warranty Expiry: 2027-01-15  ·  Sensor: ASSET-001 (IoT linked) │
│  Assigned to: John Doe (Engineering)                            │
│                                          [Edit Asset] ← Admin/Mgr│
└──────────────────────────────────────────────────────────────────┘

2-COLUMN GRID (lg:grid-cols-2, gap-6):

┌────────────────────────────────────────┐ ┌──────────────────────────────────────┐
│  LIVE SENSOR READINGS PANEL            │ │  RECENT ASSIGNMENTS (last 5)         │
│  CardTitle: "Sensor Readings"          │ │  CardTitle: "Assignment History"     │
│  ┌──────────────┐ ┌──────────────┐    │ │  ┌──────┬──────────┬────────┬──────┐ │
│  │ TEMPERATURE  │ │  HUMIDITY    │    │ │  │ ID   │ Assignee │ Status │ Ret. │ │
│  │           [●]│ │           [●]│    │ │  ├──────┼──────────┼────────┼──────┤ │
│  │  23.8 °C     │ │  61.2 %      │    │ │  │A-042 │ J. Doe   │[active]│2026  │ │
│  │ 14s ago      │ │ 14s ago      │    │ │  │A-031 │ M. Lee   │[closed]│2025  │ │
│  └──────────────┘ └──────────────┘    │ │  └──────┴──────────┴────────┴──────┘ │
│  Initial load: GET /api/assets/{id}/  │ │  Data: GET /api/assignments?          │
│    sensors/latest                     │ │        asset_id={id}&limit=5          │
│  Real-time: WS assets/{id}/sensors/   │ │  StatusBadge per row                 │
│    live (5s heartbeat)                │ │                                      │
└────────────────────────────────────────┘ └──────────────────────────────────────┘

MAINTENANCE HISTORY (full width):
┌──────────────────────────────────────────────────────────────────┐
│  CardTitle: "Maintenance History"  (latest 5 records)            │
│  ┌────────────────┬───────────────┬────────────┬───────────┬───┐ │
│  │ Scheduled Date │ Type          │ Status     │ Completed │ 💬│ │
│  ├────────────────┼───────────────┼────────────┼───────────┼───┤ │
│  │ 2026-03-10     │ Preventive    │[completed] │ 2026-03-12│   │ │
│  │ 2026-06-01     │ AI-triggered  │[scheduled] │ —         │ * │ │  ← * = AI badge
│  └────────────────┴───────────────┴────────────┴───────────┴───┘ │
│  AI-triggered rows: show badge "AI · Rec #{correlation_id}"      │
│  Data: GET /api/maintenance?asset_id={id}&limit=5                │
└──────────────────────────────────────────────────────────────────┘
```

---

### 3C — Create/Edit Asset Form

```
ROUTES:
  /dashboard/assets/new       → Create  (Admin/Manager; Staff → redirect /403)
  /dashboard/assets/[id]/edit → Edit    (Admin/Manager; Staff → redirect /403)

TOPBAR BREADCRUMB:
  Create: Dashboard / Assets / New Asset
  Edit:   Dashboard / Assets / {asset.name} / Edit

PAGE CONTENT:

<Card className="sm:max-w-2xl mx-auto">
  <CardHeader>
    <CardTitle>Create Asset</CardTitle>   (or "Edit Asset" for edit mode)
    <CardDescription>All fields marked * are required</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="grid gap-4 sm:grid-cols-2">
      ┌────────────────────────────────┐  ┌────────────────────────────────┐
      │ Asset Name *                   │  │ Serial Number *                │
      │ [Dell Latitude 5540        ]   │  │ [SN-XXXXXXXXX              ]   │
      └────────────────────────────────┘  └────────────────────────────────┘
      ┌────────────────────────────────┐  ┌────────────────────────────────┐
      │ Category *                     │  │ Purchase Date *                │
      │ [Laptop                     ▾] │  │ [2024-01-15               📅] │
      │  Options: Laptop|Monitor|       │  │  type="date", must be past     │
      │  Printer|Forklift|Office Equip │  │                                │
      └────────────────────────────────┘  └────────────────────────────────┘
      ┌────────────────────────────────┐  ┌────────────────────────────────┐
      │ Warranty Expiry Date           │  │ Sensor Device ID               │
      │ [2027-01-15               📅] │  │ [ASSET-001                 ]   │
      │  optional; must be > purchase  │  │  Leave blank if no sensor      │
      └────────────────────────────────┘  └────────────────────────────────┘
    </form>
  </CardContent>
  <CardFooter className="justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save Asset</Button>
  </CardFooter>
</Card>

← EDIT MODE ONLY: Lifecycle State Management Card (Admin/Manager) →

<Card className="sm:max-w-2xl mx-auto">
  <CardHeader><CardTitle>Lifecycle State</CardTitle></CardHeader>
  <CardContent>
    Current: <StatusBadge status={asset.lifecycle_state} />
    Valid transitions shown as buttons:
    [Activate → Available]  ← shown only if state = registered
    [Retire Asset]          ← shown only to Admin (destructive variant)
    → Retire triggers <Dialog>: "Confirm retire {asset.name}?"
    → If asset is assigned: Dialog warns "Active assignment will be force-closed."
  </CardContent>
</Card>

Validation rules (per SDD §2.5 ER):
  name:               required, non-empty string
  serial_number:      required, unique (API validates)
  category_id:        required, one of 5 fixed options
  purchase_date:      required, must be past date
  warranty_expiry_date: optional, must be > purchase_date if provided
  sensor_device_id:   optional, must match IoT simulator device ID format or blank

Error display: Inline below each field (text-sm text-destructive) on submit or blur.
  Toast on success: "Asset created successfully" (Sonner toaster, success variant).
  Toast on API error: "Failed to save asset. {error.detail}" (destructive variant).
```

---

## §4 Assignment Workflow (UX-03)

### 4A — Assignment List with Tabs (`/dashboard/assignments`)

**Route:** `/dashboard/assignments` · **Roles:** All (Staff: own requests only)

**Topbar:**
```
TOPBAR: "Assignments"  |  subtitle: "{active} active · {overdue} overdue"  |  [🔔 N]  [👤 ▾]
                                                         [+ New Request] ← top-right, all roles
```

**Summary stats:**
```
STATS CARDS (sm:grid-cols-3 gap-4):
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Assets Available │  │ Pending Requests │  │ Overdue Returns  │
│      89          │  │       4          │  │       2          │
│ Available to asgn│  │ Awaiting approval│  │ Past return date │
└──────────────────┘  └──────────────────┘  └──────────────────┘
Data: GET /api/dashboard/kpis (reuse fields or GET /api/assignments/summary)
```

**Tabs:**
```
<Tabs defaultValue="pending">
  <TabsList>
    <TabsTrigger value="all">All</TabsTrigger>
    <TabsTrigger value="pending">Pending {pendingCount}</TabsTrigger>
    <TabsTrigger value="active">Active {activeCount}</TabsTrigger>
    <TabsTrigger value="history">History</TabsTrigger>
  </TabsList>

  ── All tab ──────────────────────────────────────────────────────
  Table with all assignments; all 5 StatusBadge variants visible:
    [requested] = Teal bg-chart-2/15   text-chart-2
    [active]    = Blue bg-chart-1/15   text-chart-1
    [overdue]   = Red  bg-destructive/15 text-destructive  ← computed: active + past due
    [closed]    = Green bg-chart-3/15  text-chart-3
    [rejected]  = Grey bg-muted       text-muted-foreground
  IMPORTANT: "overdue" is NOT stored in DB (DB only has: requested|active|closed|rejected)
  Overdue is computed at render: status === 'active' && expected_return_date < today

  Overdue rows: <TableRow className="bg-destructive/5"> row background tint

  ── Pending tab (Manager/Admin) ──────────────────────────────────
  [See 4B below — Pending Requests Queue]

  ── Active tab ───────────────────────────────────────────────────
  Active + overdue assignments; [Initiate Return] button per row (assignee or Admin/Mgr)
  If returnDate set and status still active: [Close Return] button (Manager/Admin only)

  ── History tab ──────────────────────────────────────────────────
  Closed + Rejected records; read-only; <StatusBadge status="closed" /> or "rejected"
```

**ALL 5 STATUS BADGE REFERENCE:**
```
┌───────────────────────────────────────────────────────────────┐
│  Assignment Status Badge Reference                            │
│  ┌────────────────┬──────────────────────────────────────┐   │
│  │ <StatusBadge   │  Visual                              │   │
│  │  status=.../>  │                                      │   │
│  ├────────────────┼──────────────────────────────────────┤   │
│  │ "requested"    │ [requested] Teal chip                │   │
│  │ "active"       │ [active]    Blue chip                │   │
│  │ "overdue"      │ [overdue]   Red chip (derived)       │   │
│  │ "closed"       │ [closed]    Green chip               │   │
│  │ "rejected"     │ [rejected]  Grey chip                │   │
│  └────────────────┴──────────────────────────────────────┘   │
│  Source: frontend/components/status-badge.tsx (CVA variants) │
└───────────────────────────────────────────────────────────────┘
```

---

### 4B — Pending Requests Queue (Manager/Admin, Pending tab)

```
<Card>
  <CardHeader>
    <CardTitle>Pending Requests</CardTitle>
    <CardDescription>Requests awaiting Manager approval</CardDescription>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
      ┌────┬──────────────────┬──────────────┬──────────────┬──────────────┬───────────┬───────────┬──────────────────────┐
      │ ID │ Asset            │ Assignee     │ Requested By │ Return Date  │ Req. On   │ Status    │ Actions              │
      ├────┼──────────────────┼──────────────┼──────────────┼──────────────┼───────────┼───────────┼──────────────────────┤
      │A-05│ Dell Latitude    │ John Doe     │ John Doe     │ 2026-07-15   │ 2026-06-28│[requested]│ [✓ Approve] [✕ Reject]│
      │A-06│ HP Monitor 24"  │ Jane Smith   │ Manager Kim  │ 2026-07-01   │ 2026-06-27│[requested]│ [✓ Approve] [✕ Reject]│
      └────┴──────────────────┴──────────────┴──────────────┴──────────────┴───────────┴───────────┴──────────────────────┘
      Approve button: size="sm" variant="outline" className="text-chart-3" → PATCH /api/assignments/{id}/approve
      Reject button:  size="sm" variant="outline" className="text-destructive" → opens Reject Dialog
    </Table>
  </CardContent>
</Card>

Reject Dialog:
  <Dialog>
    <DialogTitle>Reject Assignment Request</DialogTitle>
    <DialogDescription>Asset: {asset.name} · Requested by: {user.name}</DialogDescription>
    <Textarea placeholder="Reason for rejection (optional)" rows={3} />
    <Button variant="outline">Cancel</Button>
    <Button variant="destructive">Reject Request</Button>
  </Dialog>
  → PATCH /api/assignments/{id}/reject with { reason: textarea.value }

Actions column: DOM-removed for Staff role (not disabled, not greyed)
Empty queue: <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No pending requests.</TableCell>
Data: GET /api/assignments?status=requested (Manager/Admin only; backend enforces)
```

---

### 4C — Assignment Request Form (`/dashboard/assignments/new`)

```
ROUTE: /dashboard/assignments/new · Roles: All

TOPBAR BREADCRUMB: Dashboard / Assignments / New Request

<Card className="sm:max-w-lg mx-auto">
  <CardHeader>
    <CardTitle>New Assignment Request</CardTitle>
    <CardDescription>Only assets with status "Available" can be assigned.</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="grid gap-4">
      ┌──────────────────────────────────────────────────────┐
      │ Asset *                                              │
      │ [Select available asset...                       ▾] │
      │  Options: "{name} ({id})" — filtered: lifecycle=available
      │  Empty: Alert banner "No assets currently available" │
      └──────────────────────────────────────────────────────┘
      ┌──────────────────────────────────────────────────────┐
      │ Assignee *                                           │
      │ [Select user...                                  ▾] │
      │  Options: "{name} — {department}"                   │
      └──────────────────────────────────────────────────────┘
      ┌──────────────────────────────────────────────────────┐
      │ Expected Return Date *                               │
      │ [2026-07-15                                     📅] │
      │  type="date"  min={today}                           │
      └──────────────────────────────────────────────────────┘
      ┌──────────────────────────────────────────────────────┐
      │ Notes (optional)                                     │
      │ [Purpose of assignment, special instructions...    ] │
      │  <Textarea rows={3} />                              │
      └──────────────────────────────────────────────────────┘
    </form>
  </CardContent>
  <CardFooter className="justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button type="submit" disabled={!asset || !assignee || !date}>Submit Request</Button>
  </CardFooter>
</Card>

Data:
  Available assets: GET /api/assets?lifecycle_state=available
  Users list: GET /api/users
  Submit: POST /api/assignments → { asset_id, assignee_id, expected_return_date, notes }
  On success: Toast "Request submitted" + navigate back to /dashboard/assignments
```

---

### 4D — Return Initiation Flow (`/dashboard/assignments/[id]/return`)

```
ROUTE: /dashboard/assignments/[id]/return · Roles: Assignee + Admin + Manager
TOPBAR BREADCRUMB: Dashboard / Assignments / {assignmentId} / Return

<Card className="sm:max-w-lg mx-auto">
  <CardHeader>
    <CardTitle>Initiate Return</CardTitle>
    <CardDescription>Asset: {asset.name} · Assignee: {assignee.name}</CardDescription>
  </CardHeader>
  <CardContent className="grid gap-4">
    ┌───────────────────────────────────────┐
    │ Return Condition                      │
    │ [Good — No damage                 ▾] │
    │  Options: Good | Minor Damage | Damaged
    └───────────────────────────────────────┘
    ┌───────────────────────────────────────┐
    │ Notes                                 │
    │ [Describe condition on return...    ] │
    │  <Textarea rows={3} />               │
    └───────────────────────────────────────┘

    ← CONDITIONAL: shown only if isOverdue (expected_return_date < today) →
    ┌───────────────────────────────────────────────────────┐
    │ ⚠ OVERDUE WARNING                                    │
    │ border border-destructive/30 bg-destructive/10        │
    │ text-destructive text-sm                              │
    │ [✕] This assignment is overdue.                      │
    │     Return date was {expectedReturn}.                 │
    └───────────────────────────────────────────────────────┘
  </CardContent>
  <CardFooter className="justify-end gap-2">
    <Button variant="outline">Cancel</Button>
    <Button>Initiate Return</Button>  ← PATCH /api/assignments/{id}/return
  </CardFooter>
</Card>
Sets returnDate on assignment; sends notification to Manager.
```

---

### 4E — Close Return Flow (Manager action)

```
Trigger: "Close Return" button appears in Active tab row when returnDate is non-null.
Button: size="sm" variant="outline"  → opens Dialog inline.

Close Return Dialog:
┌──────────────────────────────────────────────────────┐
│ DialogTitle: "Close Assignment Return"               │
│ DialogDescription: "Confirm {asset.name} has been   │
│   received and inspected."                           │
│                                                      │
│ ☐ Damage noted? Create a maintenance ticket for     │
│   this asset after closing.                          │
│   (checkbox — optional; if checked, redirect to     │
│    /dashboard/maintenance/new?asset_id={id} after)  │
│                                                      │
│ [Cancel]          [Close Assignment]                 │
└──────────────────────────────────────────────────────┘

On confirm: PATCH /api/assignments/{id}/close
  → Sets status = "closed"; asset.lifecycle_state = "available"
  → If checkbox checked: navigate to /dashboard/maintenance/new?asset_id={id}
```

---

## §5 Maintenance Management (UX-04)

**Route:** `/dashboard/maintenance` · **Roles:** Admin, Manager only (Staff → redirect /403)

**Topbar:**
```
TOPBAR: "Maintenance & Warranty"  |  subtitle: "{count} records · {expiring} expiring in 30d"
         |  [🔔 N]  [👤 ▾]           [+ Create Ticket] ← Admin/Manager; top-right
```

### 5A — Page Layout Overview

```
PAGE CONTENT (p-6 space-y-6):

STATS CARDS (sm:grid-cols-3 gap-4):
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Scheduled+In Prog.  │  │ Blocked             │  │ Expiring ≤ 30 days  │
│        12           │  │        1            │  │        3            │
│ Active maintenance  │  │ Needs attention     │  │ Warranty warnings   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
Data: GET /api/maintenance/summary → { scheduled_count, in_progress_count, blocked_count }
      GET /api/assets?include_warranty=true → count expiry ≤ 30d
```

---

### 5B — Warranty Expiry Warnings Card (conditional: only shown when expiry_count > 0)

```
<Card className="border-chart-4/40">  ← amber border when warnings exist
  <CardHeader>
    <CardTitle>Warranty Expiry Warnings</CardTitle>
    <CardDescription>{count} assets expiring within 30 days</CardDescription>
  </CardHeader>
  <CardContent className="space-y-2">
    ┌────────────────────────────────────────────────────────────────┐
    │ [bg-destructive/10] Dell Latitude 5540       3 days left   →  │  ← critical ≤7d
    │ [bg-chart-4/10]     HP LaserJet Pro 4001     18 days left  →  │  ← warning 8-30d
    │ [bg-chart-4/10]     Forklift FL-220          25 days left  →  │  ← warning 8-30d
    └────────────────────────────────────────────────────────────────┘
    Each row: <button className="flex items-center justify-between w-full rounded-lg px-3 py-2">
                {asset.name}  |  "{N} days left"  |  → (ChevronRight)
              </button>
    Critical (≤7 days):  bg-destructive/10, timing text text-destructive
    Warning (8–30 days): bg-chart-4/10,     timing text text-chart-4
    Row click → /dashboard/assets/{id}
  </CardContent>
</Card>

Data: GET /api/assets?include_warranty=true&sort=warranty_expiry_date:asc
      Filter: warranty_expiry_date ≤ today+30d AND lifecycle_state != "retired"
```

---

### 5C — Maintenance Timeline Chart (NEW in v1.2)

```
LAYOUT: 3-column grid (lg:grid-cols-3); this chart takes lg:col-span-2

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
        <Bar dataKey="scheduled"   stackId="m" fill="var(--chart-2)" />          ← Teal
        <Bar dataKey="in_progress" stackId="m" fill="var(--chart-4)" />          ← Amber
        <Bar dataKey="completed"   stackId="m" fill="var(--chart-3)"             ← Green
             radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  </CardContent>
</Card>

Stacked bar chart: X-axis = week label (e.g. "W25", "W26"); Y-axis = ticket count
Stacks: scheduled (chart-2 teal) | in_progress (chart-4 amber) | completed (chart-3 green)
Data: GET /api/maintenance/timeline?weeks=8 → [{ week: "2026-W25", scheduled:3, in_progress:1, completed:2 }, ...]
Empty: <ChartEmptyState message="No maintenance data" hint="Records will appear once tickets are created" />
IMPORTANT: Use var(--chart-N) CSS variables — never hardcode hex colors (DESIGN_SYSTEM §5.1 Rule 6)
```

---

### 5D — Maintenance Schedule Table

```
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle>Maintenance Schedule</CardTitle>
      <CardDescription>Grouped by status</CardDescription>
    </div>
    <Button size="sm" onClick={() => router.push('/dashboard/maintenance/new')}>
      <Plus className="size-4 mr-2" /> Create Ticket
    </Button>
  </CardHeader>
  <CardContent className="p-0">

  Groups rendered in order: Blocked → Scheduled → In Progress → Completed
  Each group = collapsible section header + embedded table rows

  ┌─────── [blocked] (1) ──────────────────────────────────────────────────────┐
  │ Asset           │ Scheduled   │ Type        │ Status     │ Notes   │ Update │
  ├─────────────────┼─────────────┼─────────────┼────────────┼─────────┼────────┤
  │ Forklift FL-220 │ 2026-06-20  │ Corrective  │[blocked]   │ "Parts" │ [Note] │
  │ row: bg-destructive/5  ←────────────────────────────────────────────────── │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌─────── [scheduled] (3) ────────────────────────────────────────────────────┐
  │ Dell Latitude   │ 2026-07-01  │ Preventive  │[scheduled] │ —       │        │
  │ HP Monitor 24"  │ 2026-07-08  │ AI-triggered│[scheduled] │ ⚙ AI·7  │        │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌─────── [in_progress] (2) ──────────────────────────────────────────────────┐
  │ Server Rack X1  │ 2026-06-25  │ Preventive  │[in_progress]│ —       │        │
  └────────────────────────────────────────────────────────────────────────────┘

  ┌─────── [completed] (7) ────────────────────────────────────────────────────┐
  │ Dell Laptop 01  │ 2026-03-10  │ Preventive  │[completed] │ —       │        │
  └────────────────────────────────────────────────────────────────────────────┘

  State badges:
    [scheduled]   = Teal   bg-chart-2/15  text-chart-2
    [in_progress] = Amber  bg-chart-4/15  text-chart-4
    [completed]   = Green  bg-chart-3/15  text-chart-3  (terminal — no further transitions)
    [blocked]     = Red    bg-destructive/15 text-destructive  + row bg-destructive/5

  AI-triggered badge in Notes: "AI · Rec #{correlation_id}" (small badge, secondary variant)

  Empty group: <TableCell colSpan={6}>No records in {status}.</TableCell>
```

---

### 5E — Maintenance State Update UI (in-table select, Admin/Manager)

```
Update column shows inline <Select> for non-completed records:

<Select value={record.status} onValueChange={handleStatusChange} disabled={!canManage}>
  <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="scheduled">   Scheduled    </SelectItem>
    <SelectItem value="in_progress"
      disabled={!isValidTransition(record.status, 'in_progress')}>
      In Progress
    </SelectItem>
    <SelectItem value="completed"
      disabled={!isValidTransition(record.status, 'completed')}>
      Completed
    </SelectItem>
    <SelectItem value="blocked"
      disabled={!isValidTransition(record.status, 'blocked')}>
      Blocked
    </SelectItem>
  </SelectContent>
</Select>

Valid transition matrix (SDD §2.3):
  scheduled   → in_progress ✅
  in_progress → completed   ✅
  in_progress → blocked     ✅
  blocked     → in_progress ✅
  completed   → (any)       ❌  Select disabled; Tooltip: "Terminal state"

Blocked transition requires note:
  When user selects "blocked" → inline text field appears below Select:
  <Input placeholder="Required: reason for blocked status" className="mt-2 text-sm" />
  Error if empty on confirm: inline "A note is required when setting status to Blocked."
  On confirm: PATCH /api/maintenance/{id} with { status, notes }

Role gate: Select disabled (disabled={true}) for Staff — but Staff cannot access /maintenance at all.
           For Manager/Admin: Select enabled.
           Completed records: Select always disabled regardless of role.
```

---

### 5F — Warranty Tracker (full width, below schedule table)

```
<Card>
  <CardHeader>
    <CardTitle>Warranty Tracker</CardTitle>
    <div className="flex gap-2">   ← filter toolbar inside CardHeader
      <Input placeholder="Search asset / provider..." className="w-64" />
      <Select placeholder="Status...">
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="expiring">Expiring ≤30d</SelectItem>
        <SelectItem value="expired">Expired</SelectItem>
      </Select>
      <Button variant="ghost" size="sm">Clear</Button>
    </div>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
      ┌──────────────────┬────────────────┬────────────┬──────────────────┬──────────┬─────────────────┐
      │ Asset            │ Provider       │ End Date   │ Timing           │ Status   │ Coverage Notes  │
      ├──────────────────┼────────────────┼────────────┼──────────────────┼──────────┼─────────────────┤
      │ Dell Latitude    │ Dell Warranty  │ 2027-01-15 │ 201 days left    │[active]  │ 3-year ProSupport│
      │ HP Monitor 24"   │ HP Care Pack   │ 2026-07-06 │ 8 days left      │[expiring]│ On-site service │  ← warning row
      │ Server Rack X1   │ IBM Support    │ 2026-06-20 │ Expired 8d ago   │[expired] │ —               │  ← expired row
      └──────────────────┴────────────────┴────────────┴──────────────────┴──────────┴─────────────────┘

      Row color rules:
        Critical (≤7 days): <TableRow className="bg-destructive/5"> · timing text-destructive
        Warning (8–30 days): <TableRow className="bg-chart-4/5">   · timing text-chart-4
        Expired (<0 days):   <TableRow className="bg-muted/50">    · timing "Expired N days ago" text-destructive
        OK (>30 days):       default row styling

      Data: GET /api/assets?include_warranty=true&sort=warranty_expiry_date:asc
      (warranty expiry warnings computed server-side; "expiring" flag in response)

      Pagination: if > 10 rows, same footer pattern as asset list
    </Table>
  </CardContent>
</Card>
```

---

### 5G — Role Summary for Maintenance

```
| Action                   | Admin | Manager | Staff       |
|--------------------------|:-----:|:-------:|:------------|
| View /maintenance page   | ✅    | ✅      | → /403      |
| Create ticket button     | ✅    | ✅      | 🔒 N/A      |
| Update state (Select)    | ✅    | ✅      | 🔒 N/A      |
| View warranty tracker    | ✅    | ✅      | → /403      |
| Staff sees maintenance   | via asset detail page only (read-only last 5 records) |
```
