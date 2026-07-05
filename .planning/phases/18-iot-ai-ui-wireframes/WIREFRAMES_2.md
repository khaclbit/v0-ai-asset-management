---
phase: 18
document: WIREFRAMES_2
status: complete
date: 2026-06-28
requirements: UX-05, UX-06, UX-07, UX-08, UX-09
depends_on:
  - Phase 14 SDD.md (sensor category map §2.6, AI state machine §2.4, notification pipeline §1.5, audit §1.6)
  - Phase 15 IA.md (routes, user flows §5 IoT, §6 AI, §7 Notifications)
  - Phase 16 DESIGN_SYSTEM.md (§5.2 LineChart+ReferenceLine, §1 color tokens)
  - Phase 17 WIREFRAMES.md (§1–§5; shell constant, component conventions)
  - frontend/app/dashboard/predictive/page.tsx (AI Predictive gold standard)
  - frontend/app/dashboard/audit/page.tsx (Audit Log confirmed implementation)
---

# AssetIQ — IoT & AI UI Wireframes (WIREFRAMES_2)

> **Scope:** Annotated ASCII wireframes for five dashboard pages: IoT Monitoring (§6),
> AI Predictive Maintenance (§7), Notification Center (§8), Audit Log (§9), and
> User Management (§10). Continues WIREFRAMES.md (Phase 17). All shell constants,
> component library rules, and annotation conventions from WIREFRAMES.md §1 apply here.
>
> **Shell constant:** Sidebar (w-64, bg-sidebar #0E1825) + Topbar (h-16, sticky,
> border-b) + Page Content (p-6, space-y-6, overflow-y-auto). Wireframes below show
> only the PAGE CONTENT zone unless stated otherwise.
>
> **Component library:** shadcn/ui + Recharts 3.8. No MUI imports. No raw hex colors —
> always use var(--chart-N) or Tailwind token classes.

---

## ⚠ Route Migration TODO

**Identified Gap:** The sidebar navigation (`lib/navigation-access.ts`) declares the
canonical AI Predictive route as `/dashboard/ai`, but the current implementation lives
at `app/dashboard/predictive/page.tsx`. The sidebar nav item "AI Predictive" therefore
produces a 404.

**Required Actions (Phase 19 implementation):**

1. Create `app/dashboard/ai/page.tsx` — move implementation from `predictive/page.tsx`
   (change `<Topbar title="Predictive Maintenance" />` to `<Topbar title="AI Predictive" />`
   and update `subtitle` to match). The component logic is identical.
2. Create `app/dashboard/predictive/page.tsx` redirect:
   ```tsx
   // app/dashboard/predictive/page.tsx
   import { redirect } from "next/navigation"
   export default function PredictiveLegacyRedirect() {
     redirect("/dashboard/ai")
   }
   ```
3. Do NOT delete `app/dashboard/predictive/` until redirect is confirmed working in
   production. Keep both files until Phase 20 cleanup.

**Impact:** UX-06 wireframe in §7 targets `/dashboard/ai` as the canonical route.
All deep-links in notifications (§8) also use `/dashboard/ai?assetId={id}`.

---

## §6 IoT Monitoring (/dashboard/iot) (UX-05)

**Route:** `/dashboard/iot` and `/dashboard/iot/[assetId]`
**Roles:** Admin, Manager (Staff → /403 per navigation-access.ts)
**Data:** WebSocket `WS /api/iot/{assetId}/stream` (5s aggregation window, FastAPI MQTT consumer → PostgreSQL)

### Topbar

```
TOPBAR:
┌────────────────────────────────────────────────────────────┐
│  "IoT Monitoring"  (h4)   "Live sensor telemetry"  (caption)│
│                                           [🔔 N]  [👤 ▾]  │
└────────────────────────────────────────────────────────────┘
```

### Full 2-Panel Page Layout

```
PAGE CONTENT (p-6, flex gap-6):
┌──────────────────────────┬──────────────────────────────────────────────────────┐
│  ASSET SELECTOR          │  CONTENT PANEL                                       │
│  (aside, w-64, border-r, │                                                      │
│   overflow-y-auto)       │  HEADER ROW (flex justify-between items-center mb-4)│
│                          │  ┌──────────────────────────────────────────────┐   │
│  p className="text-xs    │  │ h2 "Dell Latitude 5540"  text-lg font-semibold│  │
│  font-semibold uppercase │  │ "SN-ABC1234 · Laptop"  text-sm text-muted    │  │
│  tracking-wide           │  └──────────────────────────────────────────────┘  │
│  text-muted-foreground   │  ┌───────────────────────────────────────────┐     │
│  px-2 pb-2"              │  │ [Badge] ● Live  (bg-chart-3/15 text-chart-3│     │
│  "ASSETS"                │  │   OR    ◌ Reconnecting... (bg-chart-4/15)  │     │
│  ─────────────           │  │   OR    ✕ Disconnected  (bg-destructive/15)│     │
│  ● Dell L7420     [✓]    │  │ Data: WS connection state                  │     │
│  ✕ Forklift FL-01        │  └───────────────────────────────────────────┘     │
│  ◌ Canon Printer         │                                                      │
│  ● HP Monitor            │  TIME WINDOW SELECTOR (flex gap-1 mb-4)             │
│  ● Ricoh OE              │  [1h] [6h] [24h] [7d]  ← Button group;             │
│                          │  active variant="default", inactive variant="outline"│
│  ──────────────────────  │  Controls X-axis domain for all charts below        │
│  TIME WINDOW             │                                                      │
│  ┌────────────────────┐  │  SENSOR TILE GRID (see §6.1 Tile Grid below)        │
│  │ ○ 1h  ● 6h  ○ 24h │  │                                                      │
│  │ ○ 7d              │  │  SENSOR CHARTS (see §6.2 Charts below)               │
│  └────────────────────┘  │                                                      │
└──────────────────────────┴──────────────────────────────────────────────────────┘
```

### §6.1 Asset Selector Sidebar

Each asset row is a button (`w-full flex items-center gap-2 px-2 py-1.5 rounded-md`):

```
ASSET ROW:
┌─────────────────────────────────────────────────┐
│  [●]  Dell Latitude 5540          [selected bg] │  ← bg-accent when active
│       text-sm font-medium                       │
│       text-xs text-muted-foreground "Laptop"    │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│▌ [✕]  Forklift FL-01                            │  ← border-l-4 border-destructive
│       "Equipment"                               │    when threshold violation active
└─────────────────────────────────────────────────┘
```

**Status dot color rules** (`w-2 h-2 rounded-full span`):
```
● bg-chart-3  (green)       = Connected, reading < 30s old
✕ bg-destructive (red)      = Threshold violation active on this asset
◌ bg-chart-4  (amber)       = Stale (no reading > 60s)
○ bg-muted-foreground (grey) = Offline / no sensor device linked
```

Default: first asset pre-selected on page load (IA Flow 5).

### §6.1 Sensor Tile Grid (category-aware)

```
Grid: className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
```

**Category → sensor tile mapping** (VERIFIED: SDD §2.6):

```
| Asset Category   | Tiles Shown (count)                                          |
|------------------|--------------------------------------------------------------|
| Laptop           | Temperature, Humidity, Power, Current, Running Hours (5)     |
| Monitor          | Temperature, Power, Current, Running Hours (4)               |
| Printer          | Temperature, Humidity, Power, Current, Vibration, Hours (6)  |
| Forklift         | Temperature, Power, Current, Vibration, Running Hours (5)    |
| Office Equipment | Temperature, Humidity, Power, Running Hours (4)              |
```

⚠ PITFALL: Humidity tile is **ABSENT** for Forklift and Monitor. Vibration tile is **ABSENT**
for Laptop, Monitor, and Office Equipment. Build tile list from `SENSOR_CATEGORY_MAP[asset.category]`.

**Each tile** (Card, p-3, no CardHeader):

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ TEMPERATURE          │   │ HUMIDITY             │   │ POWER                │
│ text-xs uppercase    │   │ text-xs uppercase    │   │ text-xs uppercase    │
│ tracking-wide        │   │ tracking-wide        │   │ tracking-wide        │
│ text-muted-fgrd      │   │ text-muted-fgrd      │   │ text-muted-fgrd      │
│                      │   │                      │   │                      │
│  72°C                │   │  68%                 │   │  450W                │
│  text-2xl font-bold  │   │  text-2xl font-bold  │   │  text-2xl font-bold  │
│  font-mono           │   │  font-mono           │   │  font-mono           │
│  text-destructive    │   │  text-foreground     │   │  text-foreground     │
│                      │   │                      │   │                      │
│  ⚠ Above limit       │   │  Normal              │   │  Normal              │
│  text-xs             │   │  text-xs             │   │  text-xs             │
│                      │   │                      │   │                      │
│  Updated 5s ago      │   │  Updated 5s ago      │   │  Updated 5s ago      │
│  text-xs text-muted  │   │  text-xs text-muted  │   │  text-xs text-muted  │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
↑ border-destructive        ↑ no accent border           ↑ no accent border
  (violation: value > threshold)
```

**Threshold color logic:**
```
Normal (value ≤ threshold):           text-foreground, no border accent
Near-threshold (> 80% of limit):      text-chart-4 (amber), no border accent
Violation (value > threshold):        text-destructive, border-destructive on Card
```

Unit display: from MQTT payload `unit` field (°C, %, W, A, mm/s, hours).
Data: `WS /api/iot/{assetId}/stream`

### §6.2 Time-Series Line Charts

One chart per active sensor type, stacked vertically (`space-y-6`):

```
CHART: Temperature over time
┌────────────────────────────────────────────────────────────────────────────┐
│  ChartContainer className="h-[280px]"                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 90 ─│                                                                │  │
│  │ 80 ─│                    /\           /\                             │  │
│  │ 70 ─│- - - - - - - - - -/--\- - - - -/--\- - - - -  ← ReferenceLine│  │
│  │ 60 ─│               /\/      \   /\/      \/\                        │  │
│  │ 50 ─│           /\/                            \                     │  │
│  │ 40 ─│       /\/                                 \                    │  │
│  │     └─────────────────────────────────────────────────────           │  │
│  │      10:00  10:30  11:00  11:30  12:00  12:30         ← X-axis      │  │
│  │  ─── Temperature (°C)     ─ ─ Threshold (70°C)        ← Legend      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

**Components used** (VERIFIED: DESIGN_SYSTEM §5.2):
```tsx
<ChartContainer className="h-[280px]">
  <LineChart data={readings}>
    <Line dataKey="value" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
    <ReferenceLine y={threshold} stroke="var(--destructive)" strokeDasharray="4 4" strokeWidth={1.5} />
    <XAxis dataKey="ts" tickFormatter={formatXAxis} />
    <YAxis tickFormatter={(v) => `${v}${unit}`} width={48} />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
  </LineChart>
</ChartContainer>
// Empty state: <ChartEmptyState message="No sensor readings in this time window" />
```

**Chart color → sensor mapping** (DESIGN_SYSTEM §1.6):
```
var(--chart-1) #0864CD → Temperature
var(--chart-2) #00B6B7 → Humidity
var(--chart-3) #43A74C → Power Consumption
var(--chart-4) #ED980E → Current
var(--chart-5) #E23431 → Vibration
var(--chart-6) #8B5CF6 → Running Hours
```

**X-axis timestamp formatting:**
```
1h/6h  → toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
24h/7d → format(new Date(ts), 'MM/dd HH:mm')  (date-fns)
```

**Data sources:**
- Initial load: `GET /api/iot/{assetId}/readings?window={1h|6h|24h|7d}`
- Live append: `WS /api/iot/{assetId}/stream` (5s batches push new data points)
- Threshold config: `GET /api/iot/thresholds` (per-category threshold config)

### Role-Action Table

```
| Action                     | Admin | Manager | Staff        |
|----------------------------|:-----:|:-------:|:-------------|
| View IoT page              | ✅    | ✅      | 🔒 /403      |
| See all asset sensors      | ✅    | ✅      | — (blocked)  |
| Time window selection      | ✅    | ✅      | — (blocked)  |
```

<!-- UX-05-VERIFIED -->

---

## §7 AI Predictive Maintenance (/dashboard/ai) (UX-06)

**Route:** `/dashboard/ai` (canonical per navigation-access.ts; old `/dashboard/predictive` → redirect — see Route Migration TODO)
**Roles:** Admin, Manager (Staff → /403)
**Note:** Approve/Defer buttons are role-gated UI convenience — RBAC enforced server-side at `POST /api/ai/recommendations/{id}/approve` (SDD §2.4)

### Topbar

```
TOPBAR:
┌────────────────────────────────────────────────────────────────────────────────────┐
│  "AI Predictive"  (h4)   "Deterministic risk-ranked recommendations"  (caption)   │
│                                                                [🔔 N]  [👤 ▾]     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Predictive Summary Card (full-width, always at top)

```
PREDICTIVE SUMMARY CARD (Card, full-width):
┌───────────────────────────────────────────────────────────────────────────┐
│ CardHeader:                                                               │
│  [TrendingUp icon]  "Predictive Summary"  (CardTitle text-base)          │
│  "Recommendations sorted by risk first, then confidence. High-risk items  │
│   include SLA monitoring and escalation state."  (CardDescription)       │
├───────────────────────────────────────────────────────────────────────────┤
│ CardContent: grid gap-3 sm:grid-cols-3                                    │
│ ┌───────────────────────────────┐ ┌───────────────────────────┐ ┌──────┐ │
│ │ "Total recommendations"       │ │ "Pending high-risk"       │ │"Act" │ │
│ │  text-xs text-muted           │ │  text-xs text-muted       │ │ pol" │ │
│ │  12                           │ │  3                        │ │"You  │ │
│ │  text-lg font-semibold        │ │  text-lg font-semibold    │ │can   │ │
│ │  rounded-lg border bg-muted/30│ │  rounded-lg border        │ │appr" │ │
│ │  p-3                          │ │  bg-muted/30 p-3          │ │      │ │
│ └───────────────────────────────┘ └───────────────────────────┘ └──────┘ │
│   Data: recommendations.length     pending high-risk count                │
│                                                     ↑ "Read-only for      │
│                                                       role: {role}"       │
│                                                       if not Manager/Admin│
└───────────────────────────────────────────────────────────────────────────┘
```

### Recommendations Grid

```
Section header: h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
"RECOMMENDATIONS"
Grid: div className="grid gap-4 xl:grid-cols-2"
```

**HIGH-RISK card** (left) vs **MEDIUM/LOW card** (right):

```
HIGH-RISK RECOMMENDATION CARD                    MEDIUM/LOW-RISK CARD
(Card border-destructive/30)                     (Card — default border)
┌─────────────────────────────────────────┐      ┌──────────────────────────────────┐
│ CardHeader space-y-2:                   │      │ CardHeader space-y-2:            │
│  flex justify-between items-center gap-2│      │  flex justify-between gap-2:     │
│  "Dell Latitude 5540"  (CardTitle base) │      │  "HP LaserJet Pro M404"          │
│  ┌──────────┐ ┌───────────────────────┐ │      │  ┌───────────┐ ┌──────────────┐ │
│  │ [High]   │ │Risk score: 94%        │ │      │  │ [Medium]  │ │Risk: 58%     │ │
│  │StatusBadge│ │Badge variant="outline"│ │      │  │StatusBadge│ │Badge outline │ │
│  └──────────┘ └───────────────────────┘ │      │  └───────────┘ └──────────────┘ │
│  "Confidence: 87% (High)"  CardDesc     │      │  "Confidence: 62% (Medium)"      │
│  formatConfidenceScore(score) + band    │      │  formatConfidenceScore(score)     │
├─────────────────────────────────────────┤      ├──────────────────────────────────┤
│ CardContent space-y-4 text-sm:          │      │ CardContent space-y-4 text-sm:   │
│                                         │      │                                  │
│  Correlation ID row:                    │      │  Correlation ID row:             │
│  ┌─────────────────────────────────┐    │      │  CORR-2024-0987                  │
│  │ "AI Correlation ID:"            │    │      │  font-mono text-xs               │
│  │ font-medium                     │    │      │  rounded-lg border bg-muted/30   │
│  │ CORR-2024-0042                  │    │      │                                  │
│  │ font-mono text-xs               │    │      │  Top Factors:                    │
│  │ rounded-lg border bg-muted/30 p-3│   │      │  "TOP FACTORS" label             │
│  └─────────────────────────────────┘    │      │  ul.list-disc.pl-5               │
│                                         │      │  · High print volume (30d)       │
│  Top Factors:                           │      │  · Drum wear indicator 68%       │
│  "TOP FACTORS" text-xs uppercase        │      │  · Toner low warnings ×3         │
│  ul className="list-disc space-y-1 pl-5 │      │                                  │
│     text-muted-foreground":             │      │  [No SLA section — not High]     │
│  · High temperature variance (72°C avg) │      │                                  │
│  · Running hours 2,840 (threshold 2k)   │      │  Separator                       │
│  · Humidity sensitivity alert           │      │  <AiTracePanel> (collapsed)      │
│                                         │      └──────────────────────────────────┘
│  HIGH-RISK SLA + APPROVAL SECTION:      │
│  div rounded-lg border bg-muted/20 p-3  │
│  ┌─────────────────────────────────┐    │
│  │ [Clock3 icon]  SLA: 1h 43m      │    │
│  │ font-medium ← formatSlaCountdown│    │
│  │ [Badge destructive "Overdue"]   │    │
│  │ ← shown only when isOverdue=true│    │
│  ├─────────────────────────────────┤    │
│  │ ESCALATION BANNER (conditional):│    │
│  │ div border border-destructive/40│    │
│  │     bg-destructive/10           │    │
│  │ [AlertTriangle icon]            │    │
│  │ "Escalation required: SLA       │    │
│  │  overdue by {formatSlaCountdown}│    │
│  ├─────────────────────────────────┤    │
│  │ APPROVAL STATE (conditional):   │    │
│  │ • approved:                     │    │
│  │   bg-chart-3/10 border-chart-3  │    │
│  │   [ShieldCheck] "Approved by AM"│    │
│  │ • deferred:                     │    │
│  │   bg-chart-4/10 border-chart-4  │    │
│  │   "Deferred by Asset Manager"   │    │
│  ├─────────────────────────────────┤    │
│  │ MANAGER/ADMIN-ONLY BUTTONS:     │    │
│  │ [Button sm "Approve Recommend."]│    │  ← disabled when actionState=approved
│  │ [Button sm outline "Defer Rec."]│    │  ← disabled when actionState=deferred
│  │ API: POST /api/ai/recs/{id}/approve  │  ← Auth: Manager/Admin JWT only
│  │ API: POST /api/ai/recs/{id}/defer│   │
│  ├─────────────────────────────────┤    │
│  │ NON-MANAGER READ-ONLY INDICATOR:│    │
│  │ <Badge variant="outline">       │    │
│  │  "Read-only for role: {role}"   │    │  ← shown for non-canAct roles
│  └─────────────────────────────────┘    │
│                                         │
│  Separator                              │
│  "TRACE & PROVENANCE" text-xs uppercase │
│  <AiTracePanel trace={{                 │
│    source: "predictive_maintenance",    │
│    filters: "risk>=High; conf>=High",   │
│    correlation_id, generated_at }} />   │
└─────────────────────────────────────────┘
```

### §7.1 AI Recommendation State Machine

```
State machine (SDD §2.4, lib/predictive.ts):
  pending → approved  (Manager/Admin ONLY — triggers maintenance record creation)
  pending → deferred  (Manager/Admin ONLY — defer_reason optional, 30-day expiry)
  deferred → pending  (re-open after review)
  deferred → expired  (system-auto, 30 days without action)

PredictiveActionState frontend type = "pending" | "approved" | "deferred"
(expired is handled as a server-side filter; expired items excluded from GET response)

SLA constants (lib/predictive.ts):
  HIGH_RISK_SLA_MINUTES = 120  (2-hour window for High-risk pending items)
  slaDueAt set at recommendation creation time (High-risk only)
  getHighRiskSlaState(rec, now) → { countdownMinutes, isOverdue, overdueMinutes }
```

### Role-Action Table

```
| Action                          | Admin | Manager | Staff        |
|---------------------------------|:-----:|:-------:|:-------------|
| View recommendations            | ✅    | ✅      | 🔒 /403      |
| See Approve button              | ✅    | ✅      | 🔒 hidden    |
| See Defer button                | ✅    | ✅      | 🔒 hidden    |
| Approve via API (RBAC enforced) | ✅    | ✅      | 🔒 403       |
| View AiTracePanel               | ✅    | ✅      | 🔒 /403      |
```

Role gate: `const canAct = user?.role === "Asset Manager" || user?.role === "Admin"`

<!-- UX-06-VERIFIED -->

---

## §8 Notification Center (/dashboard/notifications) (UX-07)

### ⚠ CRITICAL NOTE: BELL IS NAVIGATION, NOT DROPDOWN

```
The bell icon in Topbar MUST navigate to /dashboard/notifications using router.push()
or a Link href. It must NOT open a Popover, DropdownMenu, or Sheet.
Reason: "Full page navigation for accessibility and link-shareability." (IA §1.4)

Anti-pattern: <Popover><PopoverTrigger><Bell /></PopoverTrigger><PopoverContent>...</>
Correct:      <Button asChild variant="ghost" size="icon"><Link href="/dashboard/notifications">
```

### §8.1 Topbar Bell Icon (Modification to `components/topbar.tsx`)

```
TOPBAR — CURRENT STATE (no bell):
[≡ mobile menu]  "Page Title"  (caption)                        [👤 role badge ▾]

TOPBAR — TARGET STATE (with bell):
[≡ mobile menu]  "Page Title"  (caption)           [🔔 3]      [👤 role badge ▾]
                                                    ↑ Bell icon
                                                    ↑ Badge destructive (DOM-removed if 0)
```

Bell icon component spec (add to right-side flex div in `topbar.tsx`):
```tsx
<Button variant="ghost" size="icon" className="relative" asChild>
  <Link href="/dashboard/notifications">
    <Bell className="size-5" />
    {unreadCount > 0 && (
      <Badge
        variant="destructive"
        className="absolute -top-1 -right-1 h-5 min-w-5 text-xs px-1"
      >
        {unreadCount > 99 ? "99+" : unreadCount}
      </Badge>
    )}
  </Link>
</Button>
// Data: unreadCount from useStore() → populated via SSE EventSource("/api/notifications/stream")
// Position: insert BEFORE the user avatar button in the right-side flex div
// Badge: DOM-removed (not hidden) when unreadCount === 0
```

### §8.2 Full Notifications Page (`/dashboard/notifications`)

**Route:** `/dashboard/notifications` · **Roles:** All (server filters to own notifications)

**Topbar:**
```
TOPBAR:
┌────────────────────────────────────────────────────────────────────────────────────┐
│  "Notification Center"  (h4)   "Your recent alerts and updates"  (caption)        │
│                                                            [🔔 N]  [👤 ▾]         │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Page layout:**
```
PAGE CONTENT (p-6):
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Card (full-width):                                                                │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │ CardHeader:                                                                   │ │
│ │   CardTitle: "Notifications"                                                  │ │
│ │   CardAction: [Button outline sm "Mark All Read"]                             │ │
│ │               API: POST /api/notifications/read-all                           │ │
│ ├───────────────────────────────────────────────────────────────────────────────┤ │
│ │ CardContent:                                                                  │ │
│ │                                                                               │ │
│ │  NOTIFICATION ROWS (list, divide-y):                                         │ │
│ │                                                                               │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │  │ UNREAD ROW:                                                             │ │ │
│ │  │ flex items-start gap-3 p-3 border-b hover:bg-muted/50                  │ │ │
│ │  │ ┌────────────┐  ┌────────────────────────────────────────────┐  [●] [→]│ │ │
│ │  │ │ bg-destr/10│  │ "High failure risk detected"               │  ↑   ↑  │ │ │
│ │  │ │ rounded-full│  │ text-sm font-medium                        │  │   │  │ │ │
│ │  │ │ p-1.5      │  │ "Dell Latitude 5540 shows 94% fail prob"   │  │   └─ Link│ │
│ │  │ │[AlertTriangle│ │ text-xs text-muted-foreground              │  │     deep │ │
│ │  │ │ text-destr]│  │ "2 min ago" · text-xs text-muted           │  │     link │ │
│ │  │ └────────────┘  └────────────────────────────────────────────┘  └─ w-2 h-2 │ │
│ │  │                                                                    rounded  │ │ │
│ │  │                                                                    bg-primary│ │ │
│ │  │                                                                    (unread   │ │ │
│ │  │                                                                    dot)      │ │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                               │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │  │ READ ROW (no blue dot):                                                 │ │ │
│ │  │ ┌────────────┐  ┌────────────────────────────────────────────┐      [→]│ │ │
│ │  │ │ bg-chart-4/ │  │ "Warranty expiry warning"                 │         │ │ │
│ │  │ │ 10 rounded  │  │ "Dell L7420 warranty expires in 8 days"   │         │ │ │
│ │  │ │[Shield      │  │ "15 min ago"                              │         │ │ │
│ │  │ │ text-chart-4│  └────────────────────────────────────────────┘         │ │ │
│ │  │ └────────────┘                                               no blue dot │ │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                               │ │
│ │  PAGINATION FOOTER:                                                           │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │  │  "Showing 1–10 of 47 notifications"   [← Prev]  Page 1 of 5  [Next →] │ │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘ │ │
│ │  Data: GET /api/notifications?page=N (REST; 10 per page default)             │ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### §8.3 Notification Type Reference Table

```
| Type                   | Priority  | Icon                      | Deep-Link Target                           |
|------------------------|-----------|---------------------------|--------------------------------------------|
| high_failure_risk      | 🔴 Crit.  | AlertTriangle text-destr  | /dashboard/ai?assetId={asset_id}           |
| warranty_expiry_warning| 🟡 Warn.  | Shield text-chart-4       | /dashboard/assets/{asset_id}               |
| upcoming_maintenance   | 🔵 Info   | Wrench text-primary       | /dashboard/maintenance                     |
| overdue_return         | 🔴 Crit.  | Clock text-destructive    | /dashboard/assignments/{assignment_id}     |
```

```
Mark-as-read (individual): PATCH /api/notifications/{id}/read → sets is_read=true
Mark-all-read: POST /api/notifications/read-all → sets all is_read=true for this user
Unread dot: w-2 h-2 rounded-full bg-primary; DOM-removed (not invisible) when is_read=true
```

### Role-Action Table

```
| Action                    | Admin | Manager | Staff             |
|---------------------------|:-----:|:-------:|:------------------|
| View /notifications page  | ✅    | ✅      | ✅                |
| See bell icon in topbar   | ✅    | ✅      | ✅                |
| See high_failure_risk type| ✅    | ✅      | 🔒 server-filtered|
| See overdue_return type   | ✅    | ✅      | 🔒 server-filtered|
| Mark individual read      | ✅    | ✅      | ✅ (own only)     |
| Mark all read             | ✅    | ✅      | ✅ (own only)     |
```

<!-- UX-07-VERIFIED -->

---

## §9 Audit Log (/dashboard/audit) (UX-08)

> **Implementation Status: CONFIRMED ✅**
> `/dashboard/audit/page.tsx` is fully implemented and matches all UX-08 requirements.
> This wireframe section documents the design for reference and confirms immutability
> constraints. No changes to existing implementation are needed.

**Route:** `/dashboard/audit` · **Roles:** Admin ONLY
**VERIFIED:** `navigation-access.ts` — `{ href: "/dashboard/audit", roles: ["Admin"] }`

### Topbar

```
TOPBAR:
┌────────────────────────────────────────────────────────────────────────────────────┐
│  "Audit Log"  (h4)   "Immutable event trail with category filters"  (caption)     │
│                                                            [🔔 N]  [👤 ▾]         │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Full Page Layout

```
PAGE CONTENT (p-6):
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Card:                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │ CardHeader:  CardTitle: "Audit Event Log"                                     │ │
│ ├───────────────────────────────────────────────────────────────────────────────┤ │
│ │ CardContent space-y-4:                                                        │ │
│ │                                                                               │ │
│ │  CATEGORY FILTER BAR (flex flex-wrap gap-2):                                 │ │
│ │  [All ●] [Business] [Security] [AI-assisted]                                 │ │
│ │   ↑ active = variant="default"  ↑ inactive = variant="outline"  size="sm"   │ │
│ │  AUDIT_CATEGORIES = ["Business", "Security", "AI-assisted"] (lib/audit-log)  │ │
│ │  Client-side filter only — no server mutation, no API call on category change│ │
│ │                                                                               │ │
│ │  TABLE (overflow-x-auto rounded-md border):                                  │ │
│ │  ┌──────────┬──────────────────────┬────────────────┬───────┬──────┬──────────────────┬─────────────────┬──────────┐
│ │  │ Actor    │ Action               │ Entity         │ Before│ After│ Timestamp        │ Correlation ID  │ Details  │
│ │  ├──────────┼──────────────────────┼────────────────┼───────┼──────┼──────────────────┼─────────────────┼──────────┤
│ │  │ Jane Doe │ assignment.approved  │ Assign REQ-300 │pending│active│ 2026-06-28 09:14 │ CORR-2024-0042  │[View det]│
│ │  ├──────────┼──────────────────────┼────────────────┼───────┼──────┼──────────────────┼─────────────────┼──────────┤
│ │  │ System   │ ai.recommendation    │ Asset AST-012  │pending│appr'd│ 2026-06-28 09:02 │ CORR-2024-0041  │[View det]│
│ │  ├──────────┼──────────────────────┼────────────────┼───────┼──────┼──────────────────┼─────────────────┼──────────┤
│ │  │ Admin    │ user.login           │ User USR-007   │ —     │active│ 2026-06-28 08:55 │ CORR-2024-0039  │[View det]│
│ │  └──────────┴──────────────────────┴────────────────┴───────┴──────┴──────────────────┴─────────────────┴──────────┘
│ │                                                                               │ │
│ │  Column details:                                                              │ │
│ │    Actor:          event.actor (user display name) — text-sm                 │ │
│ │    Action:         event.action ("assignment.approved") — font-mono text-xs  │ │
│ │    Entity:         event.entity ("Assignment REQ-300") — text-sm             │ │
│ │    Before/After:   state snapshot strings — text-sm text-muted-foreground    │ │
│ │    Timestamp:      formatDate(event.timestamp) — text-sm                     │ │
│ │    Correlation ID: event.correlation_id — font-mono text-xs                  │ │
│ │    Details:        <Button variant="outline" size="sm">                      │ │
│ │                    "View details" / "Hide details" — toggleExpanded(event.id)│ │
│ └───────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### §9.1 Expandable Row Detail Panel

```
EXPANDED ROW (when expandedEventId === event.id):
┌───────────────────────────────────────────────────────────────────────────────────┐
│ <TableRow>                                                                        │
│   <TableCell colSpan={8}>                                                         │
│     div className="space-y-2 rounded-md bg-muted/40 p-3":                        │
│     ┌─────────────────────────────────────────────────────────────────────────┐   │
│     │ [Badge variant="outline"]{event.category}[/Badge]  ← "Business" etc     │   │
│     │ "Before: {event.before}"    text-sm                                     │   │
│     │ "After: {event.after}"      text-sm                                     │   │
│     │ "Correlation ID: {event.correlation_id}"  text-sm font-mono             │   │
│     │ "AI Recommendation: {event.aiRecommendation?.summary ?? "None"}"        │   │
│     └─────────────────────────────────────────────────────────────────────────┘   │
│   </TableCell>                                                                    │
│ </TableRow>                                                                       │
└───────────────────────────────────────────────────────────────────────────────────┘
Only one row expanded at a time (expandedEventId state — last click toggles).
```

### §9.2 Immutability Constraints

```
IMMUTABILITY RULES (VERIFIED: SDD §2.5 — AuditEvents table is append-only):
✓ No edit button on any audit row — no <DropdownMenu> with "Edit" option
✓ No delete button on any audit row — no trash icon, no "Archive" option
✓ No "Clear logs" or "Export and delete" actions anywhere on the page
✓ No column-click sort — table columns are not sortable (no sort chevrons)
✓ Category filter is the ONLY user interaction beyond row expand/collapse
✓ Category filter is CLIENT-SIDE only — no server mutation, no PATCH/DELETE API call
✗ ANTI-PATTERN: <DropdownMenu> with Edit/Delete in the Actions column → forbidden
✗ ANTI-PATTERN: Reusing assets/assignments table pattern (which has edit actions) → forbidden

Data source: GET /api/audit?category={Business|Security|AI-assisted|All} (REST, Admin JWT)
Writes: backend-only via event publishers — no frontend write path to AuditEvents table
```

### Role-Access Table

```
| Access                    | Admin | Manager | Staff  |
|---------------------------|:-----:|:-------:|:-------|
| View /dashboard/audit     | ✅    | 🔒 /403 | 🔒 /403|
| Filter by category        | ✅    | —       | —      |
| Expand row details        | ✅    | —       | —      |
| Any write/edit action     | ✗ N/A | —       | —      |
```

<!-- UX-08-VERIFIED -->

---

## §10 User Management (/dashboard/users) (UX-09)

**Routes:** `/dashboard/users` (list), `/dashboard/users/new` (create), `/dashboard/users/[id]/edit` (edit)
**Roles:** Admin ONLY (Manager → /403, Staff → /403)
**VERIFIED:** `navigation-access.ts` — `{ href: "/dashboard/users", roles: ["Admin"] }`
**VERIFIED:** SDD §2.1 — "Create/edit users: Admin Full, Manager —, Staff —"

### §10.1 User List Page (`/dashboard/users`)

**Topbar:**
```
TOPBAR:
┌────────────────────────────────────────────────────────────────────────────────────┐
│  "User Management"  (h4)   "Administrator only"  (caption)                        │
│                                                            [🔔 N]  [👤 ▾]         │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Page layout:**
```
PAGE CONTENT (p-6):
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Card:                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────────────┐ │
│ │ CardHeader:                                                                   │ │
│ │   CardTitle: "Users"                                                          │ │
│ │   CardAction: [Button asChild] <Link href="/dashboard/users/new">             │ │
│ │               <Plus className="size-4" />  "Add User"  [/Link][/Button]      │ │
│ ├───────────────────────────────────────────────────────────────────────────────┤ │
│ │ CardContent space-y-4:                                                        │ │
│ │                                                                               │ │
│ │  SEARCH BAR:                                                                  │ │
│ │  ┌──────────────────────────────────────────────────────────────────────┐    │ │
│ │  │ [🔍 Search by name or email...]  ← <Input type="search">             │    │ │
│ │  └──────────────────────────────────────────────────────────────────────┘    │ │
│ │  Data: client-side filter on GET /api/users response                          │ │
│ │                                                                               │ │
│ │  TABLE:                                                                       │ │
│ │  ┌────────────────┬──────────────────────────┬─────────────────┬──────────────┬────────────┬────────────┐
│ │  │ Name           │ Email                    │ Role            │ Department   │ Status     │ Actions    │
│ │  ├────────────────┼──────────────────────────┼─────────────────┼──────────────┼────────────┼────────────┤
│ │  │ Jane Admin     │ jane@company.com         │ [Admin]         │ IT           │ [Active]   │     ⋯      │
│ │  ├────────────────┼──────────────────────────┼─────────────────┼──────────────┼────────────┼────────────┤
│ │  │ Bob Manager    │ bob@company.com          │ [Asset Manager] │ Operations   │ [Active]   │     ⋯      │
│ │  ├────────────────┼──────────────────────────┼─────────────────┼──────────────┼────────────┼────────────┤
│ │  │ Alice Staff    │ alice@company.com        │ [Staff]         │ Warehouse    │ [Active]   │     ⋯      │
│ │  ├────────────────┼──────────────────────────┼─────────────────┼──────────────┼────────────┼────────────┤
│ │  │ Tom Former     │ tom@company.com          │ [Staff]         │ Sales        │ [Inactive] │     ⋯      │
│ │  │ (opacity-60 row│                          │                 │              │            │            │
│ │  └────────────────┴──────────────────────────┴─────────────────┴──────────────┴────────────┴────────────┘
│ └───────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**Role badge mapping:**
```
Admin:         <Badge variant="default">Admin</Badge>           ← blue pill
Asset Manager: <Badge variant="secondary">Asset Manager</Badge> ← subtle bg
Staff:         <Badge variant="outline">Staff</Badge>           ← outline

Status badges:
Active:   <Badge variant="outline" className="text-foreground">Active</Badge>
Inactive: <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
Inactive rows: className="opacity-60" on <TableRow>
```

**Actions column (⋯ DropdownMenu):**
```tsx
<DropdownMenuItem asChild>
  <Link href={`/dashboard/users/${id}/edit`}>Edit</Link>
</DropdownMenuItem>
<DropdownMenuSeparator />
<DropdownMenuItem
  className="text-destructive focus:text-destructive"
  onClick={() => openDeactivateDialog(user)}
>
  Deactivate  {/* NOTE: no "Delete" option anywhere */}
</DropdownMenuItem>
// Show "Reactivate" instead of "Deactivate" when user.is_active === false
```

Data: `GET /api/users` (REST, Admin JWT required — 403 for other roles)

---

### §10.2 Create User Page (`/dashboard/users/new`)

```
TOPBAR: "Add User"  |  subtitle: "Create a new system account"  |  [🔔 N]  [👤 ▾]

PAGE CONTENT (p-6, max-w-lg mx-auto):
┌────────────────────────────────────────────────────────────────────────────┐
│ Card:                                                                      │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │ CardHeader: CardTitle "New User"  CardDescription "Fill in details"  │  │
│ ├──────────────────────────────────────────────────────────────────────┤  │
│ │ CardContent space-y-4:                                               │  │
│ │                                                                      │  │
│ │  Name * ────────────────────────────────────────                     │  │
│ │  ┌────────────────────────────────────────────────────────────┐     │  │
│ │  │ Full name                            (Input, required)     │     │  │
│ │  └────────────────────────────────────────────────────────────┘     │  │
│ │                                                                      │  │
│ │  Email * ───────────────────────────────────────                     │  │
│ │  ┌────────────────────────────────────────────────────────────┐     │  │
│ │  │ email@company.com                    (Input type="email")  │     │  │
│ │  └────────────────────────────────────────────────────────────┘     │  │
│ │                                                                      │  │
│ │  Role * ────────────────────────────────────────                     │  │
│ │  ┌────────────────────────────────────────────────────────────┐     │  │
│ │  │ Select role...                                    ▾ Select │     │  │
│ │  │   Admin / Asset Manager / Staff                            │     │  │
│ │  └────────────────────────────────────────────────────────────┘     │  │
│ │                                                                      │  │
│ │  Department * ──────────────────────────────────────                 │  │
│ │  ┌────────────────────────────────────────────────────────────┐     │  │
│ │  │ Department name                      (Input, required)     │     │  │
│ │  └────────────────────────────────────────────────────────────┘     │  │
│ │                                                                      │  │
│ │  Password * ────────────────────────────────────────                 │  │
│ │  ┌────────────────────────────────────────────────────────────┐     │  │
│ │  │ ••••••••••                          (Input type="password")│     │  │
│ │  └────────────────────────────────────────────────────────────┘     │  │
│ │  Note: Password field on CREATE form only — absent on edit form      │  │
│ │                                                                      │  │
│ ├──────────────────────────────────────────────────────────────────────┤  │
│ │ CardFooter (flex justify-end gap-2):                                 │  │
│ │  [Button variant="outline" asChild]<Link href="/dashboard/users">    │  │
│ │    Cancel</Link>[/Button]                                            │  │
│ │  [Button type="submit"]  Save User  [/Button]                        │  │
│ │  API: POST /api/users (Admin JWT required)                           │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### §10.2b Edit User Page (`/dashboard/users/[id]/edit`)

Same layout as Create, with these differences:
- Topbar: "Edit User" title
- Fields pre-populated from `GET /api/users/{id}` response
- **Password field is ABSENT** (use separate "Change Password" flow if needed — not in v1.2 scope)
- Additional **Account Status toggle**:

```
Account Status ─────────────────────────────────────────────
┌──────────────────────────────────────────────────────────┐
│  [Switch] Active                                         │
│   toggle off = is_active: false  (reactivate: toggle on) │
└──────────────────────────────────────────────────────────┘
Save button: PATCH /api/users/{id} (Admin JWT required)
```

---

### §10.3 Deactivate Confirmation Dialog

Triggered from ⋯ → "Deactivate" in user list:

```
DEACTIVATE DIALOG:
┌────────────────────────────────────────────────────────────┐
│  Dialog (open=isDeactivateDialogOpen):                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DialogHeader:                                        │  │
│  │   DialogTitle: "Deactivate User"                     │  │
│  │   DialogDescription:                                 │  │
│  │     "{userName} will no longer be able to log in.    │  │
│  │      This action can be reversed."                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ DialogFooter:                                        │  │
│  │  [Button variant="outline"]Cancel[/Button]           │  │
│  │  [Button variant="destructive"]Deactivate[/Button]   │  │
│  │  API: PATCH /api/users/{id}  { is_active: false }    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

### §10.4 No-Hard-Delete Constraint

```
HARD-DELETE PROHIBITION (VERIFIED: SDD §2.5 ER, 18-RESEARCH.md §Anti-Patterns):
✗ No "Delete" menu item in the Actions DropdownMenu — EVER
✗ No "Permanently Delete" button on edit form
✗ No DELETE /api/users/{id} API call from frontend
✗ No trash icon (🗑) on user rows
✓ Only soft-delete: PATCH /api/users/{id} { is_active: false }
✓ Deactivated users remain visible in the list with opacity-60 + Inactive badge
✓ Reactivate is available via edit form Account Status toggle (is_active: true)

Reason: User records are referenced by AuditEvents.actor — deleting a user would break
audit trail integrity. The append-only AuditEvents table requires user records to persist.
```

### Role-Action Table

```
| Action                         | Admin | Manager | Staff  |
|--------------------------------|:-----:|:-------:|:-------|
| View /dashboard/users          | ✅    | 🔒 /403 | 🔒 /403|
| Create user (POST /api/users)  | ✅    | 🔒 403  | 🔒 403 |
| Edit user (PATCH /api/users)   | ✅    | 🔒 403  | 🔒 403 |
| Deactivate (is_active=false)   | ✅    | 🔒 403  | 🔒 403 |
| Hard-delete                    | ✗ N/A | —       | —      |
```

<!-- UX-09-VERIFIED -->

---

## Document Status

| Section | Requirement | Status |
|---------|-------------|--------|
| §6 IoT Monitoring   | UX-05 | ✅ Complete |
| §7 AI Predictive    | UX-06 | ✅ Complete |
| §8 Notification Ctr | UX-07 | ✅ Complete |
| §9 Audit Log        | UX-08 | ✅ Complete (confirms existing implementation) |
| §10 User Management | UX-09 | ✅ Complete |

*Next phase (Phase 19): Data Design, API Overview & Folder Architecture.*
*Implementation priority: `/dashboard/ai` (route migration) → `/dashboard/iot` → `/dashboard/notifications` → `/dashboard/users`*
