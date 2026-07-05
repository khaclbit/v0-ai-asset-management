---
project: AssetIQ — Smart AI-Powered Asset Management System
version: 1.0.0
stack: Next.js 15 · React 19 · shadcn/ui · Tailwind CSS v4 · Recharts 3.8 · Geist Sans
scope: Light mode only. Dark mode CSS rules exist in globals.css but are not a deliverable.
status: authoritative
phase: 16
requirements: DS-01, DS-02, DS-03, DS-04, DS-05
---

# AssetIQ Design System

> Single authoritative reference for colors, typography, spacing, component variants, and chart standards. All values are sourced from the live codebase (`frontend/app/globals.css`, `frontend/components/ui/`). When this document conflicts with the codebase, the codebase wins — file a correction.

---

## Table of Contents

1. [§1 Color Palette](#1-color-palette)
2. [§2 Typography](#2-typography)
3. [§3 Spacing System](#3-spacing-system)
4. [§4 Component Catalog](#4-component-catalog)
5. [§5 Recharts Chart Standards](#5-recharts-chart-standards)
6. [§6 Design Token Quick Reference](#6-design-token-quick-reference)

---

## §1 Color Palette

### 1.1 Core Semantic Tokens

All tokens are CSS custom properties defined in `frontend/app/globals.css` using OKLCH color space. Hex values are browser-equivalent approximations for design tools.

| CSS Variable | OKLCH | Hex | Primary Usage |
|---|---|---|---|
| `--background` | `oklch(0.985 0.003 247)` | `#F8FAFB` | Page background — outermost surface |
| `--foreground` | `oklch(0.21 0.03 256)` | `#0E1825` | Primary body text, headings |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Card backgrounds — elevated surface |
| `--card-foreground` | `oklch(0.21 0.03 256)` | `#0E1825` | Text inside cards |
| `--primary` | `oklch(0.52 0.18 257)` | `#0864CD` | Brand blue — CTAs, active nav, focus rings |
| `--primary-foreground` | `oklch(0.985 0.003 247)` | `#F8FAFB` | White text on primary backgrounds |
| `--secondary` | `oklch(0.96 0.01 248)` | `#ECF2F8` | Secondary/subtle backgrounds |
| `--secondary-foreground` | `oklch(0.3 0.04 256)` | `#273141` | Text on secondary backgrounds |
| `--muted` | `oklch(0.96 0.01 248)` | `#ECF2F8` | Table alt rows, inset panels, disabled backgrounds |
| `--muted-foreground` | `oklch(0.55 0.02 256)` | `#6A727D` | Placeholder text, captions, helper text |
| `--accent` | `oklch(0.94 0.03 245)` | `#DBEDFE` | Hover highlight backgrounds |
| `--accent-foreground` | `oklch(0.34 0.07 257)` | `#1E4A8A` | Text on accent backgrounds |
| `--destructive` | `oklch(0.58 0.22 27)` | `#DE2125` | Error states, delete actions, critical alerts |
| `--border` | `oklch(0.92 0.01 248)` | `#DFE5EB` | Card borders, dividers, row separators |
| `--input` | `oklch(0.92 0.01 248)` | `#DFE5EB` | Input field borders |
| `--ring` | `oklch(0.52 0.18 257)` | `#0864CD` | Focus rings (matches --primary) |

---

### 1.2 Sidebar Tokens

The sidebar uses a separate dark-navy token set. Do not use these tokens outside the sidebar component.

| CSS Variable | Hex | Usage |
|---|---|---|
| `--sidebar` | `#0E1825` | Sidebar background (dark navy) |
| `--sidebar-foreground` | `#DFE5EB` | Sidebar text (light grey) |
| `--sidebar-primary` | `#3283EF` | Active nav item background |
| `--sidebar-primary-foreground` | `#F8FAFB` | Active nav item text |
| `--sidebar-accent` | `#1A2535` | Nav item hover background |
| `--sidebar-accent-foreground` | `#DFE5EB` | Nav item hover text |
| `--sidebar-border` | `#283749` | Sidebar internal dividers |

---

### 1.3 Semantic Color Additions

These semantic roles are derived from existing chart tokens using Tailwind opacity modifiers. They are NOT separate CSS variables — use the class patterns below directly.

| Semantic Role | Tailwind Class Pattern | Hex (base) | Use Case |
|---|---|---|---|
| Success background | `bg-chart-3/15` | `#43A74C` @ 15% | Success status chips, positive alerts |
| Success text | `text-chart-3` | `#43A74C` | Success state text |
| Warning background | `bg-chart-4/15` | `#ED980E` @ 15% | Warning chips, amber alerts |
| Warning text | `text-chart-4` | `#ED980E` | Warning state text |
| Error background | `bg-destructive/15` | `#DE2125` @ 15% | Error chips, blocked/overdue states |
| Error text | `text-destructive` | `#DE2125` | Error state text |
| Info background | `bg-primary/10` | `#0864CD` @ 10% | Info banners, neutral notifications |
| Info text | `text-primary` | `#0864CD` | Info state text |
| Neutral background | `bg-muted` | `#ECF2F8` | Retired/closed/rejected neutral states |
| Neutral text | `text-muted-foreground` | `#6A727D` | Neutral state text |

---

### 1.4 Surface Hierarchy

```text
Level 0 — Page:    var(--background)  #F8FAFB  Outermost container
Level 1 — Card:    var(--card)        #FFFFFF  Content containers, modal surfaces
Level 2 — Muted:   var(--muted)       #ECF2F8  Table alt rows, inset panels
Sidebar:           var(--sidebar)     #0E1825  Navigation panel (dark, separate context)
```

---

### 1.5 Status Chip Color Map

Used by `<StatusBadge>` in `frontend/components/status-badge.tsx`. Each chip uses Tailwind utility classes via CVA. Risk band chips include an icon prefix; lifecycle state chips are color-only.

**Asset Lifecycle States:**

| State | Category | Background Class | Text Class | Border Class | Icon |
|---|---|---|---|---|---|
| `registered` | Asset lifecycle | `bg-chart-2/15` | `text-chart-2` | `border-chart-2/30` | — |
| `available` | Asset lifecycle | `bg-chart-3/15` | `text-chart-3` | `border-chart-3/30` | — |
| `assigned` | Asset lifecycle | `bg-chart-1/15` | `text-chart-1` | `border-chart-1/30` | — |
| `maintenance` | Asset lifecycle | `bg-chart-5/15` | `text-chart-5` | `border-chart-5/30` | — |
| `retired` | Asset lifecycle | `bg-muted` | `text-muted-foreground` | `border-border` | — |

**Assignment States:**

| State | Category | Background Class | Text Class | Border Class | Icon |
|---|---|---|---|---|---|
| `requested` | Assignment | `bg-chart-2/15` | `text-chart-2` | `border-chart-2/30` | — |
| `active` | Assignment | `bg-chart-1/15` | `text-chart-1` | `border-chart-1/30` | — |
| `overdue` | Assignment | `bg-destructive/15` | `text-destructive` | `border-destructive/30` | — |
| `closed` | Assignment | `bg-chart-3/15` | `text-chart-3` | `border-chart-3/30` | — |
| `rejected` | Assignment | `bg-muted` | `text-muted-foreground` | `border-border` | — |

**Maintenance States:**

| State | Category | Background Class | Text Class | Border Class | Icon |
|---|---|---|---|---|---|
| `scheduled` | Maintenance | `bg-chart-2/15` | `text-chart-2` | `border-chart-2/30` | — |
| `in_progress` | Maintenance | `bg-chart-4/15` | `text-chart-4` | `border-chart-4/30` | — |
| `completed` | Maintenance | `bg-chart-3/15` | `text-chart-3` | `border-chart-3/30` | — |
| `blocked` | Maintenance | `bg-destructive/15` | `text-destructive` | `border-destructive/30` | — |

**AI Recommendation States (NEW — added in Phase 16):**

| State | Category | Background Class | Text Class | Border Class | Icon |
|---|---|---|---|---|---|
| `pending` | AI Recommendation | `bg-chart-2/15` | `text-chart-2` | `border-chart-2/30` | — |
| `approved` | AI Recommendation | `bg-chart-3/15` | `text-chart-3` | `border-chart-3/30` | — |
| `deferred` | AI Recommendation | `bg-chart-4/15` | `text-chart-4` | `border-chart-4/30` | — |
| `expired` | AI Recommendation | `bg-muted` | `text-muted-foreground` | `border-border` | — |

**Risk Band Chips (with icon):**

| State | Category | Background Class | Text Class | Border Class | Icon |
|---|---|---|---|---|---|
| `High` | Risk band | `bg-destructive/15` | `text-destructive` | `border-destructive/30` | `⚠️ ShieldAlert size-3` |
| `Medium` | Risk band | `bg-chart-4/15` | `text-chart-4` | `border-chart-4/30` | `⚠️ AlertTriangle size-3` |
| `Low` | Risk band | `bg-chart-3/15` | `text-chart-3` | `border-chart-3/30` | `ℹ️ ShieldCheck size-3` |

> **Rule:** Risk band chips MUST include the icon prefix. All other chips are color-only (no icon). Chip sizing is always `text-xs font-medium h-5 px-2 rounded-4xl` (pill shape, ~26px border-radius).

---

### 1.6 Chart Color Series

Six chart tokens are required to support all sensor types in IoT Monitoring. `--chart-6` is new — added to `frontend/app/globals.css` in Phase 16.

| Token | CSS Variable | OKLCH | Hex | Color Name | Assigned Sensor Type |
|---|---|---|---|---|---|
| chart-1 | `var(--chart-1)` | `oklch(0.52 0.18 257)` | `#0864CD` | Azure Blue | Temperature |
| chart-2 | `var(--chart-2)` | `oklch(0.70 0.13 195)` | `#00B6B7` | Teal | Humidity |
| chart-3 | `var(--chart-3)` | `oklch(0.65 0.16 145)` | `#43A74C` | Green | Power Consumption |
| chart-4 | `var(--chart-4)` | `oklch(0.75 0.16 70)` | `#ED980E` | Amber | Current |
| chart-5 | `var(--chart-5)` | `oklch(0.60 0.21 27)` | `#E23431` | Red | Vibration |
| chart-6 *(NEW)* | `var(--chart-6)` | `oklch(0.65 0.14 300)` | `#8B5CF6` | Violet | Running Hours |

> All 6 colors pass WCAG AA contrast as chart lines on `#F8FAFB` background. Never use raw hex values in component code — always use `var(--chart-N)` CSS variable references.

---

## §2 Typography

### 2.1 Font Family

```text
Primary font:  Geist Sans (Vercel)
Loaded via:    next/font/google in frontend/app/layout.tsx
CSS variable:  var(--font-geist-sans)
Fallback:      'Geist Fallback' (system-ui equivalent)
Mono font:     Geist Mono — used for sensor values, asset IDs, code snippets
```

> **Locked:** Geist Sans is the only permitted typeface. Do not substitute Inter, Roboto, or system-ui in production UI.

---

### 2.2 Type Scale

| Level | Tailwind Classes | rem | px | Line Height | Letter Spacing | Weight | Usage |
|---|---|---|---|---|---|---|---|
| Display | `text-4xl font-bold tracking-tight` | 2.25rem | 36px | 1.2 | -0.025em | 700 | Page hero titles (rare) |
| Headline 1 | `text-3xl font-bold tracking-tight` | 1.875rem | 30px | 1.25 | -0.02em | 700 | Section heroes, report headings |
| Headline 2 | `text-2xl font-semibold` | 1.5rem | 24px | 1.3 | -0.01em | 600 | Page titles in Topbar |
| Title 1 | `text-xl font-semibold` | 1.25rem | 20px | 1.35 | -0.005em | 600 | Card section headings |
| Title 2 | `text-base font-medium` | 1rem | 16px | 1.5 | 0 | 500 | Card titles (`CardTitle`) |
| Title 3 | `text-sm font-medium` | 0.875rem | 14px | 1.43 | 0.01em | 500 | Navigation labels, dialog titles |
| Body 1 | `text-base` | 1rem | 16px | 1.5 | 0 | 400 | Primary body text, form inputs |
| Body 2 | `text-sm` | 0.875rem | 14px | 1.43 | 0 | 400 | Table cells, secondary content (most common) |
| Label | `text-sm font-medium` | 0.875rem | 14px | 1.43 | 0 | 500 | Form labels, button text |
| Caption | `text-xs text-muted-foreground` | 0.75rem | 12px | 1.33 | 0 | 400 | Timestamps, helper text, sensor units |
| Micro | `text-[11px] font-medium` | 0.6875rem | 11px | 1.27 | 0.05em | 500 | Axis tick labels, data point annotations |

---

### 2.3 Verified Codebase Usage Patterns

```text
CardTitle:           text-base leading-snug font-medium
CardDescription:     text-sm text-muted-foreground
Sidebar brand name:  text-base font-semibold tracking-tight
Nav link labels:     text-sm font-medium
Section sub-headers: text-sm font-semibold uppercase tracking-wide text-muted-foreground
Table cells:         text-sm (Body 2)
Badge/chip text:     text-xs font-medium (Label Medium)
Chart axis ticks:    font-size 11px (Micro)
```

---

## §3 Spacing System

### 3.1 Base Unit

```text
Tailwind CSS v4 base unit: 4px
  spacing-1  =  4px
  spacing-2  =  8px
  spacing-3  = 12px
  spacing-4  = 16px
  spacing-5  = 20px
  spacing-6  = 24px
  spacing-8  = 32px

Design intent (8px grid): Prefer even multiples of spacing-2 (8px) for layout and component sizing.
Use spacing-1 (4px) only for tight inline gaps (icon+label, badge-row).
```

---

### 3.2 Layout Grid

```text
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar  (w-64 = 256px)  │  Main Content Area (flex-1)         │
│  bg-sidebar  #0E1825       │  overflow-y-auto  p-6 (24px)       │
│  hidden md:flex            │  max-width: none (fluid)           │
└─────────────────────────────────────────────────────────────────┘
  Top bar height:  h-16 = 64px  (sticky, border-b)
```

| Layout Zone | Class | Value | Notes |
|---|---|---|---|
| Sidebar width | `w-64` | 256px | Fixed; hidden on mobile (`hidden md:flex`) |
| Content padding | `p-6` | 24px all sides | Outer padding of main content area |
| Top-bar height | `h-16` | 64px | Sticky; `border-b` divider |
| Between page sections | `space-y-6` | 24px | Dashboard sections, page layout |
| Card grid gap | `gap-4` | 16px | Between KPI metric cards |
| KPI grid columns | `sm:grid-cols-2 xl:grid-cols-4` | — | 2-col → 4-col responsive |
| Chart fixed height | `h-[280px]` | 280px | Bar/line chart containers |
| Between form groups | `gap-3` | 12px | Form layouts |
| Between list items | `space-y-4` | 16px | Recommendation card lists |
| Inline icon+label gap | `gap-2` | 8px | Button icon, badge row |
| Tight icon gap | `gap-1.5` | 6px | Compact icon+label |

---

### 3.3 Breakpoints

| Name | Min-width | Tailwind Prefix | Primary Usage |
|---|---|---|---|
| xs | 0px | (none) | Mobile — not a primary target |
| sm | 640px | `sm:` | 2-col grids, show/hide elements |
| md | 768px | `md:` | Sidebar becomes visible (`md:flex`) |
| lg | 1024px | `lg:` | 3-col grids (`lg:grid-cols-3`) |
| xl | 1280px | `xl:` | 4-col KPI grids, 2-col recommendation layout |
| 2xl | 1536px | `2xl:` | Ultra-wide; not yet specifically used |

---

### 3.4 Card Padding Rules

| Card Size | CSS Token | Padding | Usage |
|---|---|---|---|
| Default | `--spacing(4)` = 16px | `p-4` on content area | Standard metric and content cards |
| Small (`size="sm"`) | `--spacing(3)` = 12px | `p-3` on content area | Compact data cards, sidebar cards |
| Outer card container | — | `rounded-xl border bg-card shadow-sm` | Applied to every `<Card>` |

---

### 3.5 Section and Form Spacing Rules

| Context | Class | Value | Usage |
|---|---|---|---|
| Between major page sections | `space-y-6` or `mb-6` | 24px | Dashboard layout, page content |
| Between sub-sections | `mb-4` | 16px | Within a page section |
| Between form fields | `space-y-4` | 16px | Standard form field groups |
| Between label and input | `space-y-2` | 8px | Label → Input pair |
| Grid layouts | `gap-4` or `gap-6` | 16–24px | Card grids, flex rows |

---

### 3.6 Border Radius System

```text
--radius:     0.625rem = 10px  (base)
--radius-sm:  6px              Inputs: rounded-sm
--radius-md:  8px              Dropdowns, popovers
--radius-lg:  10px             Buttons (rounded-lg)
--radius-xl:  14px             Cards (rounded-xl) — default for all <Card>
--radius-2xl: 18px             Large modals
--radius-4xl: 26px             Badges and chips — pill shape (rounded-4xl)
```

---

## §4 Component Catalog

All components are shadcn/ui primitives from `frontend/components/ui/`. Radix UI / Base UI headless primitives underpin interaction behaviour. CVA (class-variance-authority) drives variant resolution. Never import from `@mui/material` — it is not a project dependency.

---

### 4.1 Button

The primary interactive element. Uses CVA for variant+size resolution.

**Variants:**

| Variant | Prop | Core Classes | Usage |
|---|---|---|---|
| Primary | `default` | `bg-primary text-primary-foreground hover:bg-primary/90` | CTAs: Save, Submit, Create, Approve |
| Outline | `outline` | `border border-input bg-background hover:bg-muted` | Secondary: Cancel, Edit, Export |
| Secondary | `secondary` | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | Tertiary: Filters, toggles |
| Ghost | `ghost` | `hover:bg-muted hover:text-foreground` | Icon-only buttons, nav toolbar actions |
| Destructive | `destructive` | `bg-destructive/10 text-destructive hover:bg-destructive/20` | Delete, Remove, Reject |
| Link | `link` | `text-primary underline-offset-4 hover:underline` | Inline text links |

**Sizes:**

| Size | Prop | Height | Usage |
|---|---|---|---|
| Extra-small | `xs` | h-6 (24px) | Compact chip-action buttons |
| Small | `sm` | h-7 (28px) | Table row action buttons |
| Default | `default` | h-8 (32px) | Standard form actions |
| Large | `lg` | h-9 (36px) | Primary page-level actions |
| Icon | `icon` | size-8 (32×32px) | Icon-only standard |
| Icon small | `icon-sm` | size-7 (28×28px) | Compact icon-only |

**States and rules:**
- **Disabled:** `disabled:opacity-50 disabled:pointer-events-none` — always applied, never override
- **Focus ring:** `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` — keyboard-accessible
- **Active press:** `active:translate-y-px` — subtle feedback
- **Loading:** Wrap button content with a `Loader2 animate-spin size-4` icon + disabled state; do not remove button from DOM while loading

**Usage rules:**
1. One `default` (primary) button per action group maximum.
2. Confirmation dialogs for destructive actions MUST use `variant="destructive"` on the confirm button.
3. Never place two primary buttons side-by-side; use `outline` for the secondary action.

---

### 4.2 Input / Select / Textarea

Form input primitives. All share the same border (`--border` #DFE5EB) and focus ring (`--ring` #0864CD).

**Component inventory:**
- `<Input>` — standard text input, `h-8`, `border-input`, `text-sm`, placeholder `text-muted-foreground`
- `<Select>` — dropdown built on Base UI Select primitive; uses `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>`
- `<Textarea>` — multiline text, resizable; same border/focus rules as Input
- `<Label>` — always paired with `htmlFor` matching the input `id`; `text-sm font-medium`

**States:**

| State | Appearance | Implementation |
|---|---|---|
| Default | `border-input` grey border | Base class |
| Focus | `ring-2 ring-ring/50 border-ring` blue ring | `focus-visible:ring-3` |
| Error | `border-destructive ring-destructive/50` red ring + helper text below | Add `aria-invalid="true"` + `<p className="text-xs text-destructive mt-1">` |
| Disabled | `opacity-50 cursor-not-allowed` | `disabled` attribute |

**Usage rules:**
1. ALWAYS pair every `<Input>` with `<Label>` — never use placeholder text as the only label.
2. Error helper text goes below the input in `text-xs text-destructive`.
3. `<Select>` trigger width should match adjacent inputs for visual alignment.
4. Use `<Textarea rows={3}>` as the default minimum row count.

---

### 4.3 Card

The primary content container. Two semantic variants used throughout the app.

**Shared base classes:** `rounded-xl border bg-card shadow-sm`

**Variant A — Metric KPI Card:**

Used on Dashboard for total assets, active alerts, etc.

```text
<Card>
  <CardHeader>
    <CardDescription>{label}</CardDescription>   ← text-sm text-muted-foreground
    <CardTitle className="text-2xl font-bold">{value}</CardTitle>  ← large number
  </CardHeader>
  <CardContent>
    <p className="text-xs text-muted-foreground">{hint/trend}</p>
  </CardContent>
</Card>
```

Optional left-border accent: `className="border-l-4 border-l-primary"`
Trend delta: use `text-chart-3` (green) for positive, `text-destructive` for negative.

**Variant B — Content Card:**

Used for lists, charts, tables.

```text
<Card>
  <CardHeader>
    <CardTitle>{title}</CardTitle>
    <CardDescription>{subtitle}</CardDescription>
    <CardAction><Button size="sm">Action</Button></CardAction>  ← optional
  </CardHeader>
  <CardContent>{children}</CardContent>
  <CardFooter className="bg-muted/50 border-t">{footer}</CardFooter>  ← optional
</Card>
```

High-risk recommendation card accent: `className="border-destructive/30"`

**Usage rules:**
1. Default padding is `p-4` (16px); compact variant uses `p-3` (12px).
2. `<CardAction>` is positioned top-right — do not use flex hacks.
3. Never nest `<Card>` inside `<Card>` more than one level deep.

---

### 4.4 Table

shadcn/ui `<Table>` built on semantic HTML. Use for all tabular data; never use div-grid for data tables.

**Component composition:** `<Table>` → `<TableHeader>` → `<TableRow>` → `<TableHead>` + `<TableBody>` → `<TableRow>` → `<TableCell>`

| Aspect | Class | Value |
|---|---|---|
| Font size | `text-sm` | 14px (Body 2) |
| Header row height | `h-10` | 40px |
| Header font | `font-medium text-foreground` | Medium weight |
| Row hover | `hover:bg-muted/50` | 50% opacity muted |
| Selected row | `data-[state=selected]:bg-muted` | Full muted |
| Row separator | `border-b` | On each `<TableRow>` |
| Horizontal scroll | `overflow-x-auto` wrapper | Always wrap table |

Sticky header (tables > 10 rows): add `sticky top-0 bg-card z-10` to `<TableHeader>`.

Empty state pattern:
```text
<TableRow>
  <TableCell colSpan={columnCount} className="h-32 text-center text-muted-foreground">
    No {entityName} found.
  </TableCell>
</TableRow>
```

**Usage rules:**
1. Always set `colSpan` on the empty state cell to match exact column count.
2. Do NOT use `<table>` directly — always use `<Table>` component.
3. Sort indicators go inside `<TableHead>` as a `<Button variant="ghost" size="sm">` wrapper.

---

### 4.5 Status Chip (StatusBadge)

`<StatusBadge>` in `frontend/components/status-badge.tsx` wraps `<Badge variant="outline">` with CVA-driven color classes. Covers all lifecycle states documented in §1.5.

**Sizing:** Always `text-xs font-medium h-5 px-2 rounded-4xl` (pill shape). Never override size.

**Variant logic:**
- **Lifecycle state chips** (registered, available, assigned, maintenance, retired, requested, active, overdue, closed, rejected, scheduled, in_progress, completed, blocked, pending, approved, deferred, expired): color-only — no icon.
- **Risk band chips** (High, Medium, Low): icon prefix required:
  - HIGH → `<ShieldAlert className="size-3 mr-1" />` + text "HIGH"
  - MEDIUM → `<AlertTriangle className="size-3 mr-1" />` + text "MEDIUM"
  - LOW → `<ShieldCheck className="size-3 mr-1" />` + text "LOW"

**Usage rules:**
1. Import `<StatusBadge status="available" />` — pass the raw status string; component resolves colors.
2. Never apply status colors manually in page components — always delegate to `<StatusBadge>`.
3. Risk band: use `<StatusBadge status="High" />` (capital first letter to match enum).

---

### 4.6 Badge (Count Badge)

The base `<Badge>` component for non-status label use cases including notification count indicators.

| Variant | Background | Text | Use Case |
|---|---|---|---|
| `default` | `bg-primary` (#0864CD) | `text-primary-foreground` | Primary labels |
| `secondary` | `bg-secondary` (#ECF2F8) | `text-secondary-foreground` | Secondary labels |
| `destructive` | `bg-destructive/10` (#DE2125 @ 10%) | `text-destructive` | Error/danger counts |
| `outline` | transparent | `text-foreground` | Neutral outline labels |
| `ghost` | transparent (hover: muted) | contextual | Soft labels |

**Notification count badge rules:**
- Use `variant="destructive"` for unread notification counts
- Minimum width: `min-w-[18px]` to keep single digits circular
- Overflow display: Show `"99+"` when count > 99 (not `"100"`)
- Sizing: `h-5 min-w-5 text-xs` — always pill-shaped

---

### 4.7 Alert / Banner

Static inline alert banners for page-level messaging. Transient notifications use `<Toaster>` (Sonner) — these patterns are for persistent inline alerts only.

Four variants with consistent structure: icon + optional title + message + optional dismiss button.

| Variant | Outer div Classes | Lucide Icon | Usage |
|---|---|---|---|
| Info | `rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary` | `Info size-4` | Informational notices, tips |
| Warning | `rounded-lg border border-chart-4/30 bg-chart-4/10 px-4 py-3 text-sm text-chart-4` | `AlertTriangle size-4` | Caution messages, pending actions |
| Error | `rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive` | `XCircle size-4` | Validation errors, failed operations |
| Success | `rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm text-chart-3` | `CheckCircle size-4` | Successful operations |

Structure: `<div className={outerClasses}><Icon className="inline size-4 mr-2 shrink-0" /><span>{title}: {message}</span>{dismissButton}</div>`

Dismissible variant: add `<button onClick={onDismiss} className="ml-auto shrink-0"><X className="size-4" /></button>` inside a `flex items-start gap-2` wrapper.

**Usage rules:**
1. Use Sonner `toast()` for ephemeral feedback (< 5 seconds); use Alert/Banner for persistent page-level alerts.
2. Never show more than two simultaneous inline banners on a page.
3. Error banners should appear at the top of the form/section they relate to — not at the page top.

---

### 4.8 Modal / Dialog

`<Dialog>` from `frontend/components/ui/dialog.tsx`, built on `@base-ui/react/dialog`. Used for forms, confirmations, and content overlays.

**Standard composition:**

```text
<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Supporting context text</DialogDescription>
    </DialogHeader>
    {/* Content area */}
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button>Confirm Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Width variants:**

| Type | Max-width | Usage |
|---|---|---|
| Form dialog | `sm:max-w-[425px]` | Create/edit forms (1–2 column fields) |
| Content dialog | `sm:max-w-[600px]` | Larger content, multi-step workflows |
| Confirmation dialog | `sm:max-w-[380px]` | Destructive action confirmations |

Overlay: `bg-black/10 backdrop-blur-xs`. Animation: fade-in + zoom-in on open.

**Usage rules — MANDATORY:**
1. **Confirmation dialogs for destructive actions are REQUIRED** (per Phase 14 SDD): asset retirement, AI recommendation approval, bulk operations. The confirm button MUST use `variant="destructive"`.
2. ALWAYS include `<DialogDescription>` — it provides accessible context for screen readers.
3. ALWAYS include Cancel + primary action in `<DialogFooter>`. Never have a dialog with only one button.
4. Never use `alert()` or `confirm()` browser dialogs — always use `<Dialog>`.

---

### 4.9 Skeleton Loader

`<Skeleton>` from `frontend/components/ui/skeleton.tsx`. Uses `animate-pulse bg-muted` — the `--muted` token (#ECF2F8) as the shimmer base. Replace each loading region with a skeleton that matches the expected content shape.

**KPI card skeleton:**
```text
Three <Skeleton> inside <CardContent className="space-y-2 pt-4">:
  <Skeleton className="h-3 w-24" />   ← label line
  <Skeleton className="h-7 w-16" />   ← large number
  <Skeleton className="h-3 w-32" />   ← hint line
```

**Table skeleton (repeat 5–10 rows):**
```text
<TableRow>
  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
  ...one cell per column
</TableRow>
```

**Chart skeleton:**
```text
<Skeleton className="h-[280px] w-full rounded-xl" />
```

**Usage rules:**
1. Match skeleton dimensions to the actual content they replace — prevents layout shift.
2. For tables, show skeleton rows equal to expected first-page count (typically 5–10).
3. Chart skeleton height must match the chart's fixed height (`h-[280px]`).
4. Remove skeleton immediately on data load — do not show both skeleton and content simultaneously.

---

### 4.10 Breadcrumb

`<Breadcrumb>` from `frontend/components/ui/breadcrumb.tsx`. Shows current location in the app hierarchy. Integrated with Next.js `usePathname()` in the Topbar.

**Composition:** `<Breadcrumb>` → `<BreadcrumbList>` → `<BreadcrumbItem>` → `<BreadcrumbLink>` + `<BreadcrumbSeparator>` + `<BreadcrumbPage>` (current, not a link)

**Rules:**
- Maximum 3 levels deep. If deeper, collapse middle segments with `<BreadcrumbEllipsis>`.
- Separator: `/` (rendered by `<BreadcrumbSeparator />`).
- Current page: `<BreadcrumbPage>` — NOT wrapped in a link.
- Top-level is always "Dashboard" linking to `/dashboard`.

Example for Asset Detail page: `Dashboard / Assets / ASSET-00123`

---

## §5 Recharts Chart Standards

All charts MUST use `<ChartContainer>` from `frontend/components/ui/chart.tsx` — never import `ResponsiveContainer` directly. This wrapper injects CSS variables via a scoped `<style>` tag, applies axis tick styling, and sets consistent dimensions. Recharts version in use: **3.8.0**.

### 5.1 ChartContainer Wrapper Rules

1. Import: `import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"`
2. Always pass a `config` prop typed as `ChartConfig` — maps data keys to labels and CSS color variables.
3. Always set explicit height class: `className="h-[280px] w-full"` (or match chart's design height).
4. Never hand-roll chart tooltips — always use `<ChartTooltipContent />`.
5. Never hand-roll chart legends — always use `<ChartLegendContent />`.
6. Never use hardcoded hex colors in `<Line>`, `<Bar>`, or `<Cell>` — always reference `var(--chart-N)`.

**Standard ChartConfig pattern for sensor monitoring:**
```text
const sensorChartConfig = {
  temperature:  { label: "Temperature (°C)", color: "var(--chart-1)" },
  humidity:     { label: "Humidity (%)",      color: "var(--chart-2)" },
  power:        { label: "Power (W)",         color: "var(--chart-3)" },
  current:      { label: "Current (A)",       color: "var(--chart-4)" },
  vibration:    { label: "Vibration (g)",     color: "var(--chart-5)" },
  running_hrs:  { label: "Running Hours",     color: "var(--chart-6)" },
} satisfies ChartConfig
```

---

### 5.2 Chart Type 1 — Sensor Time-Series Line Chart

**Page:** IoT Monitoring (`/dashboard/iot`)
**Purpose:** Multi-sensor readings over time with threshold alert line.

**Recharts components:** `LineChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Line`, `ReferenceLine`, `ChartTooltip`, `ChartLegend`

**Color assignment:** one `--chart-N` token per active sensor (see §1.6 mapping table).

**Axis specifications:**
- X-axis: `dataKey="timestamp"` (Unix ms). Formatter: `(ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })` for 1h window; `format(new Date(ts), 'MM/dd HH:mm')` (date-fns) for 24h+ windows.
- Y-axis: `tickFormatter={(val) => \`${val}${unit}\`}` where `unit` is sensor unit string (e.g., `"°C"`, `"W"`, `"A"`, `"g"`, `"hrs"`). Set `width={48}`.
- Both axes: `tickLine={false} axisLine={false} tick={{ fontSize: 11 }}`
- Chart margins: `margin={{ top: 8, right: 16, left: -10, bottom: 0 }}`

**Threshold reference line (mandatory for sensor monitoring):**
```text
<ReferenceLine
  y={threshold}
  stroke="var(--destructive)"
  strokeDasharray="4 4"
  strokeWidth={1.5}
  label={{ value: `Limit: ${threshold}${unit}`, fill: 'var(--destructive)', fontSize: 11, position: 'insideTopRight' }}
/>
```

**Legend:** `<ChartLegend content={<ChartLegendContent />} verticalAlign="top" align="right" />`
**Tooltip:** `<ChartTooltip content={<ChartTooltipContent />} />`
**Grid:** `<CartesianGrid strokeDasharray="3 3" vertical={false} />`
**Line:** `<Line dataKey={sensorKey} dot={false} strokeWidth={2} stroke="var(--chart-N)" />`
**Empty state:** `<ChartEmptyState message="No sensor readings in this time window" />`

---

### 5.3 Chart Type 2 — Asset Distribution Bar Chart

**Page:** Dashboard (`/dashboard`)
**Purpose:** Count of assets by lifecycle state.

**Recharts components:** `BarChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Bar`, `ChartTooltip`

**Color:** Single series — `fill="var(--chart-1)"` (Azure Blue). No legend for single-series.

**Axis specifications:**
- X-axis: `dataKey="category"` (lifecycle state string). `tickLine={false} axisLine={false} tick={{ fontSize: 11 }}`
- Y-axis: `allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }}`
- Margins: `margin={{ left: -10, right: 8 }}`

**Bar:** `<Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />`
**Grid:** `<CartesianGrid vertical={false} />`
**Empty state:** `<ChartEmptyState message="No assets found" hint="Assets will appear once imported" />`

---

### 5.4 Chart Type 3 — AI Risk Distribution Donut Chart

**Page:** Dashboard (`/dashboard`)
**Purpose:** Count of AI recommendations by risk band (HIGH, MEDIUM, LOW).

**Recharts components:** `PieChart`, `Pie`, `Cell`, `ChartTooltip`, `ChartLegend`

**Color assignment:**
```text
HIGH   → fill="var(--destructive)"  (#DE2125 red)
MEDIUM → fill="var(--chart-4)"      (#ED980E amber)
LOW    → fill="var(--chart-3)"      (#43A74C green)
```

**ChartConfig:**
```text
const riskChartConfig = {
  high:   { label: "High",   color: "var(--destructive)" },
  medium: { label: "Medium", color: "var(--chart-4)" },
  low:    { label: "Low",    color: "var(--chart-3)" },
} satisfies ChartConfig
```

**Donut dimensions:** `innerRadius={60} outerRadius={90}`
**Legend:** `<ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" align="center" />`
**Tooltip:** `<ChartTooltip content={<ChartTooltipContent hideLabel />} />`
**Empty state:** `<ChartEmptyState message="No AI recommendations yet" hint="Recommendations will appear after asset analysis" />`

---

### 5.5 Chart Type 4 — Maintenance Schedule Timeline Bar Chart

**Page:** Maintenance (`/dashboard/maintenance`)
**Purpose:** Scheduled vs. In-Progress vs. Completed work orders per week (stacked bars).

**Recharts components:** `BarChart`, `CartesianGrid`, `XAxis`, `YAxis`, `Bar` (×3, stacked), `ChartTooltip`, `ChartLegend`

**Color assignment:**
```text
Scheduled   → fill="var(--chart-2)"  (#00B6B7 teal)
In Progress → fill="var(--chart-4)"  (#ED980E amber)
Completed   → fill="var(--chart-3)"  (#43A74C green)
```

**Stacked bars:** add `stackId="maintenance"` to each `<Bar>`.
**X-axis:** `dataKey="week"` (ISO week string). `tickLine={false} axisLine={false} tick={{ fontSize: 11 }}`
**Y-axis:** `allowDecimals={false}` · margins: `margin={{ left: -10, right: 8 }}`
**Bar radius:** Apply `radius={[4, 4, 0, 0]}` only to the top-most stacked bar.
**Legend:** `<ChartLegend content={<ChartLegendContent />} verticalAlign="top" align="right" />`
**Empty state:** `<ChartEmptyState message="No maintenance scheduled" hint="Work orders will appear here once created" />`

---

### 5.6 Axis Formatting Quick Reference

| Axis Type | tickFormatter | Additional Props |
|---|---|---|
| Timestamp (1h window) | `(ts) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })` | `dataKey="timestamp"` |
| Timestamp (24h+ window) | `(ts) => format(new Date(ts), 'MM/dd HH:mm')` | requires date-fns |
| Category string | None | `dataKey="category"` |
| Count (integer) | None | `allowDecimals={false}` |
| Value + unit | `(val) => \`${val}${unit}\`` | `width={48}` |
| Percentage | `(val) => \`${val}%\`` | — |

**Shared axis props (apply to all axes):** `tickLine={false} axisLine={false} tick={{ fontSize: 11 }}`
**Left margin compensation:** `margin={{ left: -10 }}` to reduce Y-axis whitespace.

---

### 5.7 Threshold Reference Line Standard

```text
Component:      <ReferenceLine>
Stroke color:   stroke="var(--destructive)"   (#DE2125 red)
Stroke style:   strokeDasharray="4 4"
Stroke width:   strokeWidth={1.5}
Label position: label={{ position: 'insideTopRight' }}
Label font:     fontSize: 11  (matches axis tick)
Label color:    fill: 'var(--destructive)'
Label text:     `Limit: ${value}${unit}`
Applies to:     Sensor time-series charts only (IoT Monitoring page)
```

---

### 5.8 Legend Placement Reference

| Chart Type | verticalAlign | align | Notes |
|---|---|---|---|
| Sensor time-series (multi-line) | `"top"` | `"right"` | Horizontal legend above chart |
| Asset distribution bar (single) | Omit legend | — | Single series needs no legend |
| AI risk donut | `"bottom"` | `"center"` | Below the donut ring |
| Maintenance timeline (stacked bar) | `"top"` | `"right"` | Shows 3 status bands |

---

### 5.9 Empty State Standard

`<ChartEmptyState>` from `frontend/components/ui/chart-empty-state.tsx` is the single standard for all "no data" chart states.

**Props:**
- `message` (string, default: `"No data available"`) — primary message
- `hint` (string, default: `"Data will appear when readings are received"`) — secondary helper text
- `height` (string, default: `"h-[280px]"`) — must match the chart's container height

**Usage pattern:**
```text
if (data.length === 0) {
  return <ChartEmptyState
    message="No sensor readings in this time window"
    hint="Select a different time range or wait for new data"
    height="h-[280px]"
  />
}
// ... render ChartContainer
```

Do NOT use ad-hoc "No data" text, null renders, or inline empty state markup — always use `<ChartEmptyState>`.

---

### 5.10 Chart Decision Table

| Chart Type | Page | Recharts Components | Color Tokens | Threshold Line | Empty State |
|---|---|---|---|---|---|
| Sensor Time-Series | IoT Monitoring | `LineChart`, `Line`, `ReferenceLine` | chart-1 through chart-6 | Yes — `var(--destructive)` dashed | `<ChartEmptyState>` |
| Asset Distribution | Dashboard | `BarChart`, `Bar` | chart-1 (single) | No | `<ChartEmptyState>` |
| AI Risk Donut | Dashboard | `PieChart`, `Pie`, `Cell` | destructive / chart-4 / chart-3 | No | `<ChartEmptyState>` |
| Maintenance Timeline | Maintenance | `BarChart`, `Bar` (×3 stacked) | chart-2 / chart-4 / chart-3 | No | `<ChartEmptyState>` |

---

## §6 Design Token Quick Reference

Compact reference of all CSS custom properties. Source of truth: `frontend/app/globals.css` `:root` block.

| CSS Variable | Hex | OKLCH | Primary Usage |
|---|---|---|---|
| `--background` | `#F8FAFB` | `oklch(0.985 0.003 247)` | Page background |
| `--foreground` | `#0E1825` | `oklch(0.21 0.03 256)` | Primary text |
| `--card` | `#FFFFFF` | `oklch(1 0 0)` | Card surface |
| `--card-foreground` | `#0E1825` | `oklch(0.21 0.03 256)` | Card text |
| `--primary` | `#0864CD` | `oklch(0.52 0.18 257)` | Brand blue — CTAs, focus rings |
| `--primary-foreground` | `#F8FAFB` | `oklch(0.985 0.003 247)` | Text on primary |
| `--secondary` | `#ECF2F8` | `oklch(0.96 0.01 248)` | Subtle backgrounds |
| `--secondary-foreground` | `#273141` | `oklch(0.3 0.04 256)` | Text on secondary |
| `--muted` | `#ECF2F8` | `oklch(0.96 0.01 248)` | Table alt rows, muted areas |
| `--muted-foreground` | `#6A727D` | `oklch(0.55 0.02 256)` | Captions, hints, labels |
| `--accent` | `#DBEDFE` | `oklch(0.94 0.03 245)` | Hover highlight |
| `--accent-foreground` | `#1E4A8A` | `oklch(0.34 0.07 257)` | Text on accent |
| `--destructive` | `#DE2125` | `oklch(0.58 0.22 27)` | Errors, delete actions |
| `--border` | `#DFE5EB` | `oklch(0.92 0.01 248)` | Borders, dividers |
| `--input` | `#DFE5EB` | `oklch(0.92 0.01 248)` | Input field borders |
| `--ring` | `#0864CD` | `oklch(0.52 0.18 257)` | Focus rings |
| `--sidebar` | `#0E1825` | `oklch(0.21 0.03 256)` | Sidebar background |
| `--sidebar-foreground` | `#DFE5EB` | `oklch(0.92 0.01 248)` | Sidebar text |
| `--sidebar-primary` | `#3283EF` | `oklch(0.62 0.18 257)` | Active nav item bg |
| `--sidebar-accent` | `#1A2535` | `oklch(0.27 0.04 256)` | Nav hover bg |
| `--sidebar-border` | `#283749` | `oklch(0.31 0.03 256)` | Sidebar dividers |
| `--chart-1` | `#0864CD` | `oklch(0.52 0.18 257)` | Temperature / primary series |
| `--chart-2` | `#00B6B7` | `oklch(0.70 0.13 195)` | Humidity / secondary series |
| `--chart-3` | `#43A74C` | `oklch(0.65 0.16 145)` | Power / success / positive |
| `--chart-4` | `#ED980E` | `oklch(0.75 0.16 70)` | Current / warning / medium |
| `--chart-5` | `#E23431` | `oklch(0.60 0.21 27)` | Vibration / alert / negative |
| `--chart-6` | `#8B5CF6` | `oklch(0.65 0.14 300)` | Running Hours *(NEW — Phase 16)* |
| `--radius` | 10px | — | Base border-radius |

> Font: Geist Sans — loaded via `next/font/google` in `frontend/app/layout.tsx`. CSS variable: `var(--font-geist-sans)`.
> All OKLCH values are the canonical source; hex values are design-tool approximations only.
> Generated in Phase 16 of the AssetIQ SDD — v1.2 IoT System Design milestone.
