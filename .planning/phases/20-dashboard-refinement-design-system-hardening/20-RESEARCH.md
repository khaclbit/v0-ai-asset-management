# Phase 20 Research — Dashboard Refinement & Design System Hardening

**Researched:** 2026-06-28
**Domain:** Next.js / React dashboard UI — Recharts, shadcn/ui, TypeScript
**Confidence:** HIGH (all findings verified directly from codebase files)

---

## Summary

Phase 20 aligns the dashboard page to WIREFRAMES.md §2 and enforces cross-cutting DX
standards (ChartContainer, StatusBadge, ChartEmptyState, responsive layout) across all app
pages.

The current dashboard page.tsx is about **50% complete** against the 6 DASH2 requirements.
KPI cards exist but use wrong labels (4th KPI is "Warranty Expiring Soon" instead of
"Available"). The bar chart shows assets-by-category instead of the required asset-health
bands. Three widgets are entirely missing: AI Risk Distribution donut, Recent Alerts section,
Maintenance Schedule list, and Equipment Status mini table. The existing "Recent Assignments"
card must be replaced by "Equipment Status" (DASH2-06).

DX standard compliance is mostly good. No raw `ResponsiveContainer` usage was found in any
app page — DX-02 is largely satisfied. The main DX-03 violations are in
`predictive/page.tsx` (action state outcomes displayed as custom divs instead of StatusBadge)
and `reports/page.tsx` (raw `{record.status}` text in table cells). All new widgets must use
mock data computed from the existing `lib/data.ts` helpers — no new seed files are needed.

**Primary recommendation:** Rewrite `app/dashboard/page.tsx` top-to-bottom against the 6
DASH2 widget specs, update `lib/dashboard-kpis.ts` to swap the 4th KPI, then fix the two
DX-03 violations in `predictive` and `reports` pages.

---

## 1. Current Dashboard vs Wireframe Gap Analysis

> Source: `frontend/app/dashboard/page.tsx` (verified) vs
> `WIREFRAMES.md §2` + `REQUIREMENTS.md DASH2-01–06` (verified).

| Widget | DASH2 ID | Current Status | Wireframe / Requirement | Gap |
|--------|----------|---------------|-------------------------|-----|
| KPI stat cards (4×) | DASH2-01 | ✅ Present — 4 cards | Total Assets \| **Assigned** \| In Maintenance \| **Available** | 4th card is "Warranty Expiring Soon"; needs to become "Available" (assets w/ `status === "available"`). Label "Active Assignments" → "Assigned" is a minor relabelling. |
| Asset Health Overview chart | DASH2-02 | ❌ Missing | Bar or donut — bands: Healthy / At Risk / Critical (from `failureRisk()`) | Current bar chart shows "Assets by Category" (category X-axis). Must be replaced or renamed to show health bands (Low/Medium/High risk mapped to Healthy/At Risk/Critical). |
| AI Risk Distribution card | DASH2-03 | ❌ Missing | Donut chart (PieChart) — High/Medium/Low counts from `failureRisk()` | No donut chart exists on dashboard. Needs new card. |
| Recent Alerts section | DASH2-04 | ⚠️ Partial | Unified "Recent Alerts" list: high failure risk, overdue returns, warranty expiry alerts | Current: two separate small cards ("Warranty Expiring Soon" + "High Failure Risk AI"). Must be replaced by a single unified Alerts card with icon-per-type and timestamp. |
| Maintenance Schedule list | DASH2-05 | ❌ Missing | Upcoming maintenance items list: asset name, scheduled date, StatusBadge | Not present. Must be added as a new card below charts row. |
| Equipment Status mini table | DASH2-06 | ❌ Missing | Mini table: asset name, category, StatusBadge for status | Current: "Recent Assignments" card. Must be replaced with Equipment Status mini table. |

**Net work:** 1 update (KPI 4th card), 1 replacement (Category bar → Health bar), 4 new/replaced widgets, plus delete the two existing alert cards.

---

## 2. ChartContainer Compliance Audit (DX-02)

> Searched all `frontend/app/**/*.tsx` for `ResponsiveContainer` import. Result: **zero hits** outside `components/ui/chart.tsx` itself.

| File | Uses ChartContainer? | Raw ResponsiveContainer? | Action |
|------|---------------------|--------------------------|--------|
| `app/dashboard/page.tsx` | ✅ Yes — "Assets by Category" BarChart | No | None (chart will be replaced by new widgets in Phase 20) |
| `app/dashboard/reports/page.tsx` | — No charts | No | None |
| `app/dashboard/maintenance/page.tsx` | — No charts | No | None |
| `app/dashboard/predictive/page.tsx` | — No charts | No | None |
| All new DASH2 charts | — | — | Must use `ChartContainer` per DX-02 |

**Verdict:** DX-02 is fully satisfied in existing code. Phase 20 must maintain this for all new charts.

---

## 3. StatusBadge Compliance Audit (DX-03)

> Searched all `frontend/app/**/*.tsx` for inline color classes used as status indicators.
> `components/status-badge.tsx` covers: asset lifecycle states, assignment states, maintenance
> states, AI recommendation states (`pending|approved|deferred`), warranty states, risk levels
> (`High|Medium|Low`).

### Confirmed Violations

| File | Line(s) | Current Code | Status Value | Fix |
|------|---------|-------------|-------------|-----|
| `app/dashboard/predictive/page.tsx` | 138–139 | `<div className="... bg-chart-3/10 ... text-chart-3">Approved by Asset Manager</div>` | `actionState === "approved"` | Replace with `<StatusBadge status="approved" />` |
| `app/dashboard/predictive/page.tsx` | 143 | `<div className="... bg-chart-4/10 ... text-chart-4">Deferred by Asset Manager</div>` | `actionState === "deferred"` | Replace with `<StatusBadge status="deferred" />` |
| `app/dashboard/reports/page.tsx` | 148 | `<TableCell>{record.status}</TableCell>` (assignment record) | assignment status string | Replace with `<TableCell><StatusBadge status={record.status} /></TableCell>` |
| `app/dashboard/reports/page.tsx` | 195 | `<TableCell>{record.status}</TableCell>` (maintenance record) | maintenance status string | Replace with `<TableCell><StatusBadge status={record.status} /></TableCell>` |

### Non-violations (intentional styling)

| File | Line(s) | Code | Reason NOT a violation |
|------|---------|------|------------------------|
| `app/dashboard/page.tsx:131` | 131 | `<span className="text-chart-4">{warrantyMonthsLeft(a)} mo</span>` | Numeric metric display, not a status badge |
| `app/dashboard/page.tsx:152` | 152 | `<span className="text-destructive">{failureRisk(a).score}%</span>` | Numeric metric display, not a status badge |
| `app/dashboard/assignments/page.tsx` | 207, 216 | `<Button className="text-chart-3">Approve</Button>` | Action BUTTON styling, not a status indicator |

### New DX-03 requirement for Phase 20

All new dashboard widgets that display entity states (maintenance status, asset status, risk level) must use `<StatusBadge />`. All covered values are already in `status-badge.tsx` STYLES map.

---

## 4. Recharts Chart Types Needed

> Source: `DESIGN_SYSTEM.md §5.3` (Asset Distribution Bar) and `§5.4` (AI Risk Donut) — verified.

### DASH2-02 — Asset Health Overview

**Chart type:** `BarChart` (horizontal categories on X-axis)

**Why BarChart, not PieChart:** DASH2-03 already uses PieChart. Using two donuts side by side creates visual confusion. A bar chart is the standard for DESIGN_SYSTEM §5.3 asset distribution charts.

**Data mapping:** Compute health bands from existing `failureRisk()` helper:
- `Healthy` → `failureRisk(a).level === "Low"` (score < 40)
- `At Risk` → `failureRisk(a).level === "Medium"` (score 40–69)
- `Critical` → `failureRisk(a).level === "High"` (score ≥ 70)

**Recharts components:** `BarChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Bar`, `ChartTooltip`

**Color:** Single series — `fill="var(--chart-1)"` (Azure Blue, matches §5.3 standard).
Alternative: tri-color (green/amber/red) for visual severity indication — this is a planner
discretion decision.

**ChartConfig:**
```ts
const healthChartConfig = {
  count: { label: "Assets", color: "var(--chart-1)" },
} satisfies ChartConfig
```

**Empty state:** `<ChartEmptyState message="No asset health data" hint="Assets will appear once added" />`

---

### DASH2-03 — AI Risk Distribution

**Chart type:** `PieChart` with `Pie` + `Cell` (donut style) — per DESIGN_SYSTEM.md §5.4

**Data mapping:** Group assets by `failureRisk(a).level`:

```ts
const riskData = [
  { band: "High",   count: assets.filter(a => failureRisk(a).level === "High").length },
  { band: "Medium", count: assets.filter(a => failureRisk(a).level === "Medium").length },
  { band: "Low",    count: assets.filter(a => failureRisk(a).level === "Low").length },
]
```

**Recharts components:** `PieChart`, `Pie`, `Cell`, `ChartTooltip`, `ChartLegend`

**Donut dimensions:** `innerRadius={60} outerRadius={90}` (per §5.4)

**Color assignment (exact, per §5.4):**
```ts
const riskChartConfig = {
  high:   { label: "High",   color: "var(--destructive)" },
  medium: { label: "Medium", color: "var(--chart-4)" },
  low:    { label: "Low",    color: "var(--chart-3)" },
} satisfies ChartConfig
```

**Legend:** `<ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" align="center" />`

**Empty state:** `<ChartEmptyState message="No AI risk data" hint="Appears after asset analysis" />`

---

## 5. Missing shadcn/ui Components

> Verified against `frontend/components/ui/` directory listing.

**Installed components:** avatar, badge, breadcrumb, button, card, chart, chart-empty-state, dialog, dropdown-menu, input, label, scroll-area, select, separator, skeleton, sonner, table, tabs, textarea, tooltip.

| Component | Needed For | Status |
|-----------|-----------|--------|
| `card` | All widgets | ✅ Installed |
| `badge` | StatusBadge (already uses it) | ✅ Installed |
| `table` | Equipment Status mini table (DASH2-06) | ✅ Installed |
| `separator` | Section dividers if needed | ✅ Installed |
| `skeleton` | Loading states | ✅ Installed |
| `sheet` | Mobile sidebar drawer | ❌ NOT installed — but DX-05 only requires `hidden md:flex` (no drawer required) |

**Verdict:** No new shadcn/ui components need to be installed for Phase 20.

The `Sheet` component would enable a mobile hamburger drawer for the sidebar, but DX-05 spec
("sidebar hidden md:flex, content stacks on mobile") does not require a mobile drawer — the
sidebar simply hides below `md` breakpoint. No install needed.

---

## 6. Mock Data Structures Needed

> All new dashboard widgets derive from existing seed data in `frontend/lib/data.ts` using
> existing helpers (`failureRisk`, `warrantyMonthsLeft`). No new seed constants needed.
> Computed types to add to `lib/dashboard-kpis.ts` or a new `lib/dashboard-widgets.ts`.

### 6a. KPI Type Update (DASH2-01)

`dashboard-kpis.ts` must add `available_assets` key and remove or rename `warranty_expiring_soon`:

```ts
// UPDATE dashboard-kpis.ts
export type DashboardKpi = {
  key:
    | "total_assets"
    | "assigned_assets"        // was "active_assignments" — data: assets w/ status="assigned"
    | "assets_in_maintenance"  // unchanged
    | "available_assets"       // NEW — was "warranty_expiring_soon"
  label: string
  value: string
  hint: string
}

export type DashboardKpiMetrics = {
  totalAssets: number
  retiredAssets: number
  assignedAssets: number       // assets.filter(a => a.status === "assigned").length
  assetsInMaintenance: number
  availableAssets: number      // assets.filter(a => a.status === "available").length
}
```

### 6b. Asset Health Band (DASH2-02)

```ts
// Computed inline in page.tsx — no separate type file needed
type AssetHealthBand = {
  band: "Healthy" | "At Risk" | "Critical"
  count: number
}
// Derive:
const healthData: AssetHealthBand[] = [
  { band: "Healthy",  count: assets.filter(a => failureRisk(a).level === "Low").length },
  { band: "At Risk",  count: assets.filter(a => failureRisk(a).level === "Medium").length },
  { band: "Critical", count: assets.filter(a => failureRisk(a).level === "High").length },
]
```

### 6c. AI Risk Distribution (DASH2-03)

```ts
// Computed inline in page.tsx
type RiskBand = { band: "High" | "Medium" | "Low"; count: number }
const riskData: RiskBand[] = [
  { band: "High",   count: assets.filter(a => a.status !== "retired" && failureRisk(a).level === "High").length },
  { band: "Medium", count: assets.filter(a => a.status !== "retired" && failureRisk(a).level === "Medium").length },
  { band: "Low",    count: assets.filter(a => a.status !== "retired" && failureRisk(a).level === "Low").length },
]
```

### 6d. Recent Alerts (DASH2-04)

```ts
// Computed inline in page.tsx — no separate type file needed
type AlertSeverity = "high" | "medium" | "low"
type AlertType = "high_failure_risk" | "overdue_return" | "warranty_expiry"

type DashboardAlert = {
  id: string
  type: AlertType
  assetName: string
  message: string
  severity: AlertSeverity
}

// Derive from existing data:
const alerts: DashboardAlert[] = [
  // High failure risk: assets where failureRisk(a).level === "High"
  ...highRiskAssets.map(a => ({
    id: `risk-${a.id}`,
    type: "high_failure_risk" as const,
    assetName: a.name,
    message: `${failureRisk(a).score}% failure probability`,
    severity: "high" as const,
  })),
  // Overdue returns: assignmentRecords where status === "overdue"
  ...overdueAssignments.map(r => ({
    id: `overdue-${r.id}`,
    type: "overdue_return" as const,
    assetName: r.assetName,
    message: `Return overdue since ${r.dueDate}`,
    severity: "high" as const,
  })),
  // Warranty expiry: assets where warrantyMonthsLeft(a) >= 0 && <= 3
  ...warrantySoonAssets.map(a => ({
    id: `warranty-${a.id}`,
    type: "warranty_expiry" as const,
    assetName: a.name,
    message: `Warranty expires in ${warrantyMonthsLeft(a)} months`,
    severity: "medium" as const,
  })),
]
```

**Icon map for alerts (per WIREFRAMES.md §2.4):**
```ts
const ALERT_ICONS = {
  high_failure_risk: ShieldAlert,  // text-destructive
  overdue_return:    Clock,        // text-destructive
  warranty_expiry:   AlertTriangle, // text-chart-4
} as const
```

### 6e. Maintenance Schedule (DASH2-05)

No new type needed — filter existing `MaintenanceRecord[]`:

```ts
// Filter to upcoming (not completed), sort by scheduledDate asc
const upcomingMaintenance = maintenanceRecords
  .filter(r => r.status === "scheduled" || r.status === "in_progress")
  .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  .slice(0, 5)
// Display: assetName | scheduledDate | <StatusBadge status={r.status} />
```

### 6f. Equipment Status Mini Table (DASH2-06)

No new type needed — filter from existing `Asset[]`:

```ts
// Active assets only (non-retired), take first 6 for mini table
const equipmentStatus = assets
  .filter(a => a.status !== "retired")
  .slice(0, 6)
// Display columns: asset.name | asset.category | <StatusBadge status={a.status} />
```

---

## 7. Responsive Layout Analysis

> Source: `frontend/app/dashboard/layout.tsx`, `frontend/components/sidebar.tsx`,
> `frontend/app/dashboard/page.tsx` — all verified.

### Current State (all DX-05 compliant)

| Element | Current Classes | DX-05 Requirement | Status |
|---------|----------------|-------------------|--------|
| Dashboard layout shell | `flex min-h-screen bg-background` | — | ✅ |
| Sidebar | `hidden w-64 shrink-0 flex-col ... md:flex` | `hidden md:flex` pattern | ✅ |
| Main content area | `flex min-w-0 flex-1 flex-col` | Fills remaining width | ✅ |
| KPI grid | `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` | Stacks on mobile | ✅ |
| Charts row | `grid gap-6 lg:grid-cols-3` | Stacks on mobile | ✅ |
| Page padding | `p-6 space-y-6` | Consistent spacing | ✅ |

### What Needs Attention in Phase 20

1. **New widgets layout:** The 3 new widget rows (Alerts, Maintenance Schedule, Equipment Status) must follow the same responsive grid pattern. Suggested layout:
   - Alerts + Maintenance Schedule: `grid gap-6 lg:grid-cols-2` (side by side on desktop, stacked on mobile)
   - Equipment Status: full-width card beneath

2. **Table responsiveness (DASH2-06):** The mini Equipment Status table should use `overflow-x-auto` wrapper on mobile to prevent horizontal overflow. Pattern already used in `assets/page.tsx`.

3. **No mobile sidebar hamburger needed:** DX-05 spec only requires `hidden md:flex`. On mobile, users navigate via back-navigation or the login page. No `Sheet` drawer component required.

---

## 8. Key Implementation Decisions

### Decision 1: KPI 4th Card — Available Assets (not Assigned)

**Current:** `key: "warranty_expiring_soon"`, label "Warranty Expiring Soon"
**Required:** DASH2-01 says "Total Assets, Assigned, In Maintenance, **Available**"

**Impact:** Must update `lib/dashboard-kpis.ts`:
- Change `DashboardKpi.key` union type
- Change `DashboardKpiMetrics` interface (add `availableAssets: number`)
- Update `buildDashboardKpis()` function  
- Update `dashboard/page.tsx` stats computation and icon assignment (Package icon fits "Available")

The "Active Assignments" → "Assigned" label change should also be made for accuracy (counts assets with `status === "assigned"`, not the assignment records count).

---

### Decision 2: Replace "Assets by Category" with "Asset Health Overview"

DASH2-02 explicitly requires "Asset Health Overview" (Healthy/At Risk/Critical health bands
computed from `failureRisk()`), NOT assets-by-category. The existing bar chart title, data,
and config must all change. The Recharts component structure stays the same (BarChart), only
the data derivation and config change — low-risk migration.

---

### Decision 3: WIREFRAMES.md §2.5 and §2.6 Are Phantom References

**Critical finding:** The WIREFRAMES.md document does NOT contain sections `§2.5` or `§2.6`.
The REQUIREMENTS.md items DASH2-05 and DASH2-06 reference "per WIREFRAMES.md §2.5" and "per
WIREFRAMES.md §2.6" but those sections do not exist in the wireframe file. The wireframe
document's §2 ends after the "Recent Alerts" section and the role-differences table.

**Impact on planning:** The planner must design DASH2-05 (Maintenance Schedule) and DASH2-06
(Equipment Status) layout from first principles using only the REQUIREMENTS.md descriptions.
The design decisions above (Section 6e, 6f) are based on REQUIREMENTS.md descriptions +
consistent application of DESIGN_SYSTEM.md component standards.

---

### Decision 4: Layout of New Widgets

**Current dashboard bottom section:** One full-width "Recent Assignments" card.

**After Phase 20:** Replace with three sections:
```
Row 3 (new): grid lg:grid-cols-2
  ├── Recent Alerts card (DASH2-04)
  └── Maintenance Schedule card (DASH2-05)
Row 4 (new): full-width
  └── Equipment Status mini table (DASH2-06)
```

This follows the wireframe's increasing-detail pattern (summary → alerts → schedule → detail).

---

### Decision 5: Alert Computation — No Backend Required

WIREFRAMES.md §2.4 references `GET /api/notifications` but since Phase 20 is a mock-data
phase (no backend), alerts must be computed from Zustand store data using existing helpers.
The three alert types map cleanly to existing data:

| Alert Type | Data Source | Trigger |
|-----------|------------|---------|
| `high_failure_risk` | `assets` + `failureRisk()` | `level === "High"` |
| `overdue_return` | `assignmentRecords` | `status === "overdue"` |
| `warranty_expiry` | `assets` + `warrantyMonthsLeft()` | `months >= 0 && months <= 3` |

Limit displayed alerts to 5 (slice after merging and sorting by severity).

---

### Decision 6: dashboard-kpis.ts Update Scope

The `DashboardKpi` type is used in `dashboard/page.tsx` only (no other consumers found).
Safe to modify in place. However, the test file `app/dashboard/page.test.tsx` likely imports
or tests KPI rendering — the planner should include a test update task.

---

### Decision 7: predictive/page.tsx Action State — DX-03 Fix Scope

The `approved`/`deferred` action state inline divs (lines 138, 143) in `predictive/page.tsx`
are semantic status indicators and match the `StatusBadge` STYLES map entries (`approved`,
`deferred`). However, they currently render as full-width info banners (not inline badges).
The DX-03 fix should replace the inline div with `<StatusBadge status={recommendation.actionState} />`
inline, not try to recreate the banner layout with StatusBadge. If the banner layout is
important UX, this is a minor divergence from strict DX-03 compliance — the planner should
note this tradeoff.

---

## Sources

### Verified from codebase (HIGH confidence)
- `frontend/app/dashboard/page.tsx` — current dashboard widget inventory
- `frontend/components/sidebar.tsx` — responsive sidebar implementation
- `frontend/components/ui/chart.tsx` — ChartContainer API and exports
- `frontend/components/ui/chart-empty-state.tsx` — ChartEmptyState props
- `frontend/components/status-badge.tsx` — all covered status values and styling
- `frontend/lib/data.ts` — Asset, AssignmentRecord, MaintenanceRecord types and seed data
- `frontend/lib/dashboard-kpis.ts` — current KPI type definitions
- `frontend/app/dashboard/predictive/page.tsx` — DX-03 violations (lines 138, 143)
- `frontend/app/dashboard/reports/page.tsx` — DX-03 violations (lines 148, 195)
- `frontend/app/dashboard/layout.tsx` — shell layout structure
- `frontend/components/ui/` directory listing — installed shadcn/ui components

### Verified from planning docs (HIGH confidence)
- `.planning/phases/17-core-ui-wireframes/WIREFRAMES.md §1, §2` — sidebar spec, dashboard layout
- `.planning/phases/16-design-system-component-catalog/DESIGN_SYSTEM.md §5` — chart type standards
- `.planning/REQUIREMENTS.md DASH2-01–06, DX-01–05` — requirement definitions

### Notable gaps (ASSUMED)
- WIREFRAMES.md §2.5 and §2.6 do not exist — DASH2-05/06 designs inferred from REQUIREMENTS.md descriptions. [ASSUMED]
- No explicit WIREFRAMES layout spec for Maintenance Schedule or Equipment Status widgets. Proposed layouts follow DESIGN_SYSTEM.md component patterns. [ASSUMED]
