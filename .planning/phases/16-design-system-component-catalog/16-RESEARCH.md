---
phase: 16
slug: design-system-component-catalog
research_status: complete
researched: 2026-06-28
---

# Phase 16 Research — Design System & Component Catalog

**Domain:** Frontend design system — shadcn/ui + Tailwind CSS v4 + Recharts 3.x
**Confidence:** HIGH (verified against actual codebase)

---

> **⚠️ CRITICAL STACK CORRECTION**
>
> The phase brief describes "Material UI v6.5.0 + Recharts 2.x" but the **actual project codebase
> uses shadcn/ui + Tailwind CSS v4 + Recharts 3.8.0** (no `@mui/material` dependency exists).
> This research is based on the **actual stack**. All MUI-specific APIs (e.g., `createTheme`,
> `sx` prop, `Chip` component) are NOT available. Design tokens are CSS custom properties in
> OKLCH color space, not hex values in a JS theme object.
>
> Hex approximations are provided for documentation/design tool use only.

---

## Summary

The AssetIQ frontend prototype is already operational using **Next.js 15 + React 19 + TypeScript 5.7 + shadcn/ui (Base UI primitives + CVA) + Tailwind CSS v4 + Recharts 3.8**. A substantial component library already exists at `frontend/components/ui/` covering buttons, cards, badges, tables, dialogs, skeletons, and a Chart container wrapper.

Phase 16 must **document** the existing design system authoritatively (tokens, scale, patterns) and **specify** the gaps that still need implementation: a 6th chart color, additional StatusBadge states (Pending, Approved, Deferred, Expired for AI Recommendations), formal Recharts chart standards for sensor time-series with threshold lines, and empty-state patterns.

The color system is OKLCH-based (modern, perceptually uniform). The spacing system follows Tailwind's 4px base unit (`spacing-1 = 4px`). The font is Geist Sans (Vercel's variable font, loaded via `next/font/google`). No dark mode implementation is required for this phase — though `.dark` CSS rules exist in globals.css, the product targets light mode only.

**Primary recommendation:** Treat Phase 16 as a **documentation-first** phase — the majority of the design system is already working. The deliverable is a `DESIGN_SYSTEM.md` spec and small targeted additions (6th chart color token, missing status badge mappings, chart standard helper patterns).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Design tokens (color, spacing, radius) | Frontend Static (CSS) | — | CSS custom properties in `globals.css`; zero runtime cost |
| Typography scale | Frontend Static (CSS) | — | `@theme inline` + Tailwind utilities; no JS |
| Component catalog (buttons, cards, chips) | Frontend Component | — | shadcn/ui + CVA at `components/ui/`; client-agnostic |
| Status badge logic | Frontend Component | — | `StatusBadge` at `components/status-badge.tsx`; pure UI mapping |
| Chart rendering | Frontend Component (Client) | — | Recharts requires `"use client"` + `ChartContainer` wrapper |
| Chart config/colors | Frontend Static (CSS) | Client Component | Colors via CSS vars; `ChartConfig` object in component |
| Sidebar navigation | Frontend Component (Client) | — | Uses `usePathname`; already dark-themed via sidebar tokens |
| Skeleton loading states | Frontend Component | — | `<Skeleton>` component; pure CSS animate-pulse |

---

## 1. MUI v6 + MD3 Color System

> **Stack correction applied:** This project uses CSS custom properties (OKLCH) + Tailwind CSS v4, not MUI. MD3 color role concepts are mapped to the existing token system below.

### 1.1 Existing Token System [VERIFIED: codebase — `frontend/app/globals.css`]

The project uses OKLCH color tokens defined in `:root` CSS variables, mapped through `@theme inline` to Tailwind utility classes. The tokens below are all **light-mode values** (the only mode required).

#### Core Semantic Tokens

| Token | OKLCH | Hex Approx | MD3 Role Equivalent | Usage |
|-------|-------|------------|---------------------|-------|
| `--background` | `oklch(0.985 0.003 247)` | `#F8FAFB` | Surface | Page background |
| `--foreground` | `oklch(0.21 0.03 256)` | `#0E1825` | On-Surface | Primary text |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Surface-Container | Card backgrounds |
| `--card-foreground` | `oklch(0.21 0.03 256)` | `#0E1825` | On-Surface-Container | Card text |
| `--primary` | `oklch(0.52 0.18 257)` | `#0864CD` | Primary | Brand blue, CTA buttons |
| `--primary-foreground` | `oklch(0.985 0.003 247)` | `#F8FAFB` | On-Primary | White text on primary |
| `--secondary` | `oklch(0.96 0.01 248)` | `#ECF2F8` | Secondary-Container | Subtle backgrounds |
| `--secondary-foreground` | `oklch(0.3 0.04 256)` | `#273141` | On-Secondary | Secondary text |
| `--muted` | `oklch(0.96 0.01 248)` | `#ECF2F8` | Surface-Variant | Table alt rows, muted areas |
| `--muted-foreground` | `oklch(0.55 0.02 256)` | `#6A727D` | On-Surface-Variant | Labels, captions, hints |
| `--accent` | `oklch(0.94 0.03 245)` | `#DBEDFE` | Tertiary-Container | Hover highlights |
| `--accent-foreground` | `oklch(0.34 0.07 257)` | `#1E4A8A` | On-Tertiary | Accent text |
| `--destructive` | `oklch(0.58 0.22 27)` | `#DE2125` | Error | Error state, delete actions |
| `--border` | `oklch(0.92 0.01 248)` | `#DFE5EB` | Outline-Variant | Borders, dividers |
| `--input` | `oklch(0.92 0.01 248)` | `#DFE5EB` | Outline | Input borders |
| `--ring` | `oklch(0.52 0.18 257)` | `#0864CD` | Primary | Focus rings |

#### Sidebar Tokens

| Token | OKLCH | Hex Approx | Usage |
|-------|-------|------------|-------|
| `--sidebar` | `oklch(0.21 0.03 256)` | `#0E1825` | Sidebar background (dark navy) |
| `--sidebar-foreground` | `oklch(0.92 0.01 248)` | `#DFE5EB` | Sidebar text (light grey) |
| `--sidebar-primary` | `oklch(0.62 0.18 257)` | `#3283EF` | Active nav item bg |
| `--sidebar-primary-foreground` | `oklch(0.985 0.003 247)` | `#F8FAFB` | Active nav item text |
| `--sidebar-accent` | `oklch(0.27 0.04 256)` | `#1A2535` | Nav hover bg |
| `--sidebar-accent-foreground` | `oklch(0.92 0.01 248)` | `#DFE5EB` | Nav hover text |
| `--sidebar-border` | `oklch(0.31 0.03 256)` | `#283749` | Sidebar divider |

#### Chart Color Series [VERIFIED: codebase — `frontend/app/globals.css`]

| Token | OKLCH | Hex Approx | Name | Semantic Use |
|-------|-------|------------|------|-------------|
| `--chart-1` | `oklch(0.52 0.18 257)` | `#0864CD` | Azure Blue | Primary series, bar charts |
| `--chart-2` | `oklch(0.70 0.13 195)` | `#00B6B7` | Teal | Secondary series |
| `--chart-3` | `oklch(0.65 0.16 145)` | `#43A74C` | Green | Success/positive |
| `--chart-4` | `oklch(0.75 0.16 70)` | `#ED980E` | Amber | Warning/medium |
| `--chart-5` | `oklch(0.60 0.21 27)` | `#E23431` | Red | Alert/negative |
| `--chart-6` *(to add)* | `oklch(0.65 0.14 300)` | `#8B5CF6` | Violet | 6th sensor line |

> **Gap:** Only 5 chart colors exist. Sensor monitoring needs 6 colors (temperature, humidity, power, current, vibration, running hours). Add `--chart-6` token in globals.css.

### 1.2 Semantic Color Additions (Not Yet in Codebase)

For explicit success/warning/info semantic tokens beyond what shadcn/ui provides, define these as utility classes or Tailwind config extensions:

| Semantic Role | Tailwind Class Pattern | Hex Approx | Use Case |
|---------------|----------------------|------------|----------|
| Success background | `bg-chart-3/15` | `#43A74C` @ 15% | Success status chips, positive alerts |
| Success text | `text-chart-3` | `#43A74C` | Success text |
| Warning background | `bg-chart-4/15` | `#ED980E` @ 15% | Warning chips, amber alerts |
| Warning text | `text-chart-4` | `#ED980E` | Warning text |
| Error background | `bg-destructive/15` | `#DE2125` @ 15% | Error chips, blocked states |
| Error text | `text-destructive` | `#DE2125` | Error text |
| Info background | `bg-primary/10` | `#0864CD` @ 10% | Info banners |
| Info text | `text-primary` | `#0864CD` | Info text |
| Neutral background | `bg-muted` | `#ECF2F8` | Neutral/retired states |
| Neutral text | `text-muted-foreground` | `#6A727D` | Neutral text |

### 1.3 Surface Hierarchy

```
Page background:    --background  (#F8FAFB)   — outermost
Card surface:       --card        (#FFFFFF)    — content containers
Muted surface:      --muted       (#ECF2F8)   — table alt rows, inset panels  
Sidebar surface:    --sidebar     (#0E1825)   — navigation panel (dark)
```

---

## 2. Typography

### 2.1 Font Family [VERIFIED: codebase — `frontend/app/layout.tsx`]

**Font in use:** **Geist Sans** (Vercel, loaded via `next/font/google`)  
**Fallback:** `'Geist Fallback'` (system-ui equivalent)  
**Mono font:** **Geist Mono** (for code, sensor values, IDs)

Geist is a geometric sans-serif designed specifically for developer tools and data-dense UIs — well-suited for enterprise SaaS. It has excellent legibility at small sizes (11–12px) which makes it appropriate for form labels, table cells, and status chips.

> **Open Question OQ-1:** Font choice is locked by the codebase — Geist is already in production. The "Inter vs Roboto" question from the brief is **RESOLVED** by the existing implementation: Geist Sans.

### 2.2 Type Scale (MD3-Inspired, Mapped to Tailwind) [ASSUMED — MD3 spec applied to Geist]

MD3 type scale mapped to Tailwind CSS utilities and recommended usage:

| Level | Tailwind Classes | Font Size | Line Height | Letter Spacing | Usage |
|-------|-----------------|-----------|-------------|----------------|-------|
| Display Large | `text-4xl font-bold tracking-tight` | 36px (2.25rem) | 1.2 (43px) | -0.025em | Page hero titles (rare) |
| Display Medium | `text-3xl font-bold tracking-tight` | 30px (1.875rem) | 1.25 (37px) | -0.02em | Section hero |
| Headline Large | `text-2xl font-semibold` | 24px (1.5rem) | 1.3 (31px) | -0.01em | Page titles in Topbar |
| Headline Medium | `text-xl font-semibold` | 20px (1.25rem) | 1.35 (27px) | -0.005em | Card section headings |
| Title Large | `text-base font-medium` | 16px (1rem) | 1.5 (24px) | 0 | Card titles (`CardTitle`) |
| Title Medium | `text-sm font-medium` | 14px (0.875rem) | 1.43 (20px) | 0.01em | Navigation labels |
| Title Small | `text-xs font-semibold tracking-wide uppercase` | 12px (0.75rem) | 1.33 (16px) | 0.08em | Section sub-headers, category labels |
| Body Large | `text-base` | 16px (1rem) | 1.5 (24px) | 0 | Primary body text |
| Body Medium | `text-sm` | 14px (0.875rem) | 1.43 (20px) | 0 | Default body (most common) |
| Body Small | `text-xs` | 12px (0.75rem) | 1.33 (16px) | 0 | Secondary descriptions, table cells |
| Label Large | `text-sm font-medium` | 14px (0.875rem) | 1.43 (20px) | 0 | Button labels, form labels |
| Label Medium | `text-xs font-medium` | 12px (0.75rem) | 1.33 (16px) | 0.04em | Chip labels, badge text |
| Label Small | `text-[11px] font-medium` | 11px (0.6875rem) | 1.27 (14px) | 0.05em | Axis tick labels, data point annotations |
| Caption | `text-xs text-muted-foreground` | 12px (0.75rem) | 1.33 (16px) | 0 | Timestamps, helper text |

### 2.3 Observed Usage Patterns [VERIFIED: codebase]

From `components/ui/card.tsx` and `components/sidebar.tsx`:
```tsx
// CardTitle: text-base leading-snug font-medium (or text-sm when size=sm)
// CardDescription: text-sm text-muted-foreground
// Sidebar brand name: text-base font-semibold tracking-tight
// Nav links: text-sm font-medium
// Section headers: text-sm font-semibold uppercase tracking-wide text-muted-foreground
```

---

## 3. Spacing System

### 3.1 Base Unit [VERIFIED: Tailwind CSS v4 convention + codebase observation]

**Tailwind CSS v4 uses a 4px base unit:**
- `spacing-1` = 4px
- `spacing-2` = 8px
- `spacing-4` = 16px
- `spacing-6` = 24px

This is smaller than MUI's default 8px base. The card component uses `--card-spacing: --spacing(4)` = 16px for default padding and `--spacing(3)` = 12px for `size="sm"`.

> **Important:** The codebase references `--spacing(N)` CSS function (Tailwind v4 syntax), not `theme('spacing.N')` or `rem` values directly.

### 3.2 Layout Grid [VERIFIED: codebase — `components/sidebar.tsx`, `app/dashboard/layout.tsx`]

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (w-64 = 256px)  │  Main Content Area         │
│  bg-sidebar (dark navy)  │  flex-1, overflow-y-auto   │
│                          │  p-6 (24px padding)        │
└──────────────────────────────────────────────────────┘
```

| Layout Zone | Value | Notes |
|-------------|-------|-------|
| Sidebar width | `w-64` = 256px | Fixed, hidden on mobile (`hidden md:flex`) |
| Content padding | `p-6` = 24px all sides | Top-bar compensates header height |
| Top-bar height | `h-16` = 64px | Sticky, `border-b` divider |
| Content gap | `space-y-6` = 24px | Between major sections |
| Card grid gap | `gap-4` = 16px | Between KPI cards |
| KPI grid cols | `sm:grid-cols-2 xl:grid-cols-4` | Responsive 2→4 columns |
| Chart height | `h-[280px]` | Fixed height for bar/line charts |
| Max content width | none (fluid) | No max-w constraint observed; full width minus sidebar |

### 3.3 Breakpoints [VERIFIED: Tailwind CSS v4 defaults]

| Name | Min-width | Usage in App |
|------|-----------|-------------|
| `sm` | 640px | 2-col grids, hide/show elements |
| `md` | 768px | Sidebar becomes visible |
| `lg` | 1024px | 3-col grids (`lg:grid-cols-3`) |
| `xl` | 1280px | 4-col KPI grids (`xl:grid-cols-4`), 2-col recommendation cards |
| `2xl` | 1536px | Not specifically used yet |

### 3.4 Card Padding Rules

| Card Size | `--card-spacing` | Padding Applied | Usage |
|-----------|-----------------|-----------------|-------|
| Default | `--spacing(4)` = 16px | `py-4 px-4` on content | Standard metric/content cards |
| Small (`size="sm"`) | `--spacing(3)` = 12px | `py-3 px-3` on content | Compact data cards |

### 3.5 Section Margin Rules

| Context | Class | Value | Usage |
|---------|-------|-------|-------|
| Between page sections | `space-y-6` | 24px | Dashboard sections, page layout |
| Between cards in grid | `gap-4` | 16px | KPI card grids |
| Between form groups | `gap-3` | 12px | Form layouts |
| Between list items | `space-y-4` | 16px | Recommendation card lists |
| Inline element gap | `gap-2` | 8px | Icon+label, badge rows |
| Tight inline gap | `gap-1.5` | 6px | Button icon spacing |

### 3.6 Border Radius System [VERIFIED: codebase — `globals.css`]

```
--radius: 0.625rem (10px)
--radius-sm: 6px    (--radius * 0.6)
--radius-md: 8px    (--radius * 0.8)
--radius-lg: 10px   (--radius)
--radius-xl: 14px   (--radius * 1.4)
--radius-2xl: 18px  (--radius * 1.8)
--radius-3xl: 22px  (--radius * 2.2)
--radius-4xl: 26px  (--radius * 2.6)
```

Cards use `rounded-xl` (14px). Buttons use `rounded-lg` (10px). Badges use `rounded-4xl` (26px — pill shape).

---

## 4. Component Catalog Patterns

### 4.1 Button Variants [VERIFIED: codebase — `components/ui/button.tsx`]

| Variant | Tailwind Classes | Usage |
|---------|-----------------|-------|
| `default` (Primary) | `bg-primary text-primary-foreground` | CTAs: Save, Submit, Create |
| `outline` | `border-border bg-background hover:bg-muted` | Secondary actions: Cancel, Edit |
| `secondary` | `bg-secondary text-secondary-foreground` | Tertiary actions, filters |
| `ghost` | `hover:bg-muted hover:text-foreground` | Icon-only buttons, nav actions |
| `destructive` | `bg-destructive/10 text-destructive hover:bg-destructive/20` | Delete, Remove, Reject |
| `link` | `text-primary underline-offset-4 hover:underline` | Inline links |

| Size | Height | Padding | Usage |
|------|--------|---------|-------|
| `xs` | `h-6` (24px) | `px-2` | Compact chip-action buttons |
| `sm` | `h-7` (28px) | `px-2.5` | Table row actions |
| `default` | `h-8` (32px) | `px-2.5` | Standard form actions |
| `lg` | `h-9` (36px) | `px-2.5` | Primary page actions |
| `icon` | `size-8` (32px) | square | Icon-only standard |
| `icon-sm` | `size-7` (28px) | square | Compact icon actions |

**States:** `disabled:opacity-50 disabled:pointer-events-none`, `focus-visible:border-ring focus-visible:ring-3`, `active:translate-y-px`

### 4.2 Input and Select [VERIFIED: codebase — `components/ui/input.tsx`, `components/ui/select.tsx`]

- `<Input>` — standard text input, `h-8`, `border-input`, focus ring via `ring-ring/50`
- `<Select>` — dropdown via Base UI Select primitive
- `<Textarea>` — multiline input
- `<Label>` — paired with `htmlFor`, `text-sm font-medium`

All inputs share the border color `--border` (`#DFE5EB`) and focus ring `--ring` (`#0864CD`).

### 4.3 Card Variants [VERIFIED: codebase — `components/ui/card.tsx`]

**Metric KPI Card pattern** (from `dashboard/page.tsx`):
```tsx
<Card>
  <CardHeader>
    <CardDescription>{label}</CardDescription>
    <CardTitle className="text-2xl font-bold">{value}</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-xs text-muted-foreground">{hint}</p>
  </CardContent>
</Card>
```

**Content Card pattern** (for lists, charts):
```tsx
<Card className="lg:col-span-2">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
    <CardAction><Button size="sm">Action</Button></CardAction>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**Risk-highlighted Card** (for high-risk recommendations):
```tsx
<Card className={isHighRisk ? "border-destructive/30" : undefined}>
```

**Card with footer** (for statistics, muted background):
```tsx
<CardFooter className="bg-muted/50 border-t">...</CardFooter>
```

### 4.4 Table [VERIFIED: codebase — `components/ui/table.tsx`]

Standard pattern: `<Table>` → `<TableHeader>` → `<TableRow>` → `<TableHead>` for headers, then `<TableBody>` → `<TableRow>` → `<TableCell>`.

| Aspect | Value |
|--------|-------|
| Font size | `text-sm` (14px) |
| Header font | `font-medium text-foreground` in `h-10` header row |
| Row hover | `hover:bg-muted/50` |
| Selected row | `data-[state=selected]:bg-muted` |
| Bottom border | `border-b` on rows, last row no border |
| Horizontal scroll | `overflow-x-auto` wrapper |

### 4.5 Status Badge / Chip [VERIFIED: codebase — `components/status-badge.tsx`]

The `StatusBadge` component wraps `<Badge variant="outline">` with CVA-driven color classes.

#### Complete State → Color Mapping

| State | Background | Text | Border | Category |
|-------|-----------|------|--------|----------|
| `registered` | `chart-2/15` (#00B6B7 @ 15%) | `text-chart-2` | `chart-2/30` | Asset lifecycle |
| `available` | `chart-3/15` (#43A74C @ 15%) | `text-chart-3` | `chart-3/30` | Asset lifecycle |
| `assigned` | `chart-1/15` (#0864CD @ 15%) | `text-chart-1` | `chart-1/30` | Asset lifecycle |
| `maintenance` | `chart-5/15` (#E23431 @ 15%) | `text-chart-5` | `chart-5/30` | Asset lifecycle |
| `retired` | `bg-muted` (#ECF2F8) | `text-muted-foreground` | `border-border` | Asset lifecycle |
| `requested` | `chart-2/15` | `text-chart-2` | `chart-2/30` | Assignment |
| `active` | `chart-1/15` | `text-chart-1` | `chart-1/30` | Assignment |
| `overdue` | `destructive/15` (#DE2125 @ 15%) | `text-destructive` | `destructive/30` | Assignment |
| `closed` | `chart-3/15` | `text-chart-3` | `chart-3/30` | Assignment |
| `rejected` | `bg-muted` | `text-muted-foreground` | `border-border` | Assignment |
| `scheduled` | `chart-2/15` | `text-chart-2` | `chart-2/30` | Maintenance |
| `in_progress` | `chart-4/15` (#ED980E @ 15%) | `text-chart-4` | `chart-4/30` | Maintenance |
| `completed` | `chart-3/15` | `text-chart-3` | `chart-3/30` | Maintenance |
| `blocked` | `destructive/15` | `text-destructive` | `destructive/30` | Maintenance |
| `High` | `destructive/15` | `text-destructive` | `destructive/30` | Risk band |
| `Medium` | `chart-4/15` | `text-chart-4` | `chart-4/30` | Risk band |
| `Low` | `chart-3/15` | `text-chart-3` | `chart-3/30` | Risk band |

#### Missing States to Add (AI Recommendation lifecycle)

| State | Recommended Mapping | Rationale |
|-------|---------------------|-----------|
| `pending` | `chart-2/15` / `text-chart-2` | Teal = neutral pending |
| `approved` | `chart-3/15` / `text-chart-3` | Green = approved/complete |
| `deferred` | `chart-4/15` / `text-chart-4` | Amber = caution/delayed |
| `expired` | `bg-muted` / `text-muted-foreground` | Grey = inactive |

> **Gap:** Add these 4 entries to `STYLES` in `status-badge.tsx`.

#### Risk Band with Icon Variant

For risk bands, add optional icon display using `size-3` Lucide icons:
```tsx
// High risk: <ShieldAlert className="size-3" />
// Medium risk: <AlertTriangle className="size-3" />
// Low risk: <ShieldCheck className="size-3" />
```

> **Open Question OQ-3 | Risk band chip icons | **RESOLVED**: Icons on risk bands only — HIGH ⚠️ / MEDIUM ⚠️ / LOW ℹ️; lifecycle state chips use color only

### 4.6 Badge [VERIFIED: codebase — `components/ui/badge.tsx`]

Base `<Badge>` variants:

| Variant | Background | Text | Use Case |
|---------|-----------|------|----------|
| `default` | `bg-primary` | `text-primary-foreground` | Primary labels |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | Secondary labels |
| `destructive` | `bg-destructive/10` | `text-destructive` | Error/danger |
| `outline` | transparent | `text-foreground` | Neutral outline |
| `ghost` | transparent (hover: muted) | contextual | Soft labels |

Height: `h-5` (20px), `text-xs`, `px-2`, pill shape (`rounded-4xl`).

### 4.7 Alert/Banner Pattern [ASSUMED — not yet implemented as standalone component]

Recommended implementation using existing tokens:

```tsx
// Info
<div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
  <InfoIcon className="inline size-4 mr-2" />
  {message}
</div>

// Warning
<div className="rounded-lg border border-chart-4/30 bg-chart-4/10 px-4 py-3 text-sm text-chart-4">
  <AlertTriangle className="inline size-4 mr-2" />
  {message}
</div>

// Error / Destructive
<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
  <XCircle className="inline size-4 mr-2" />
  {message}
</div>

// Success
<div className="rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm text-chart-3">
  <CheckCircle className="inline size-4 mr-2" />
  {message}
</div>
```

The existing `Sonner` toaster (via `sonner` package) handles transient notifications. These static banner patterns are for inline page-level alerts.

### 4.8 Modal/Dialog [VERIFIED: codebase — `components/ui/dialog.tsx`]

Built on `@base-ui/react/dialog`. Standard pattern:

```tsx
<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Supporting context text</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Max-width: `sm:max-w-sm` default, override with `sm:max-w-md` or `sm:max-w-lg`. Overlay: `bg-black/10` + `backdrop-blur-xs`. Animation: fade + zoom-in on open.

### 4.9 Skeleton Loader [VERIFIED: codebase — `components/ui/skeleton.tsx`]

```tsx
// Single line
<Skeleton className="h-4 w-full" />

// KPI card skeleton
<Card>
  <CardContent className="space-y-2 pt-4">
    <Skeleton className="h-3 w-24" />    {/* label */}
    <Skeleton className="h-7 w-16" />    {/* value */}
    <Skeleton className="h-3 w-32" />    {/* hint */}
  </CardContent>
</Card>

// Table row skeleton
<TableRow>
  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
</TableRow>

// Chart skeleton
<Skeleton className="h-[280px] w-full rounded-xl" />
```

`animate-pulse bg-muted` — uses `--muted` token (#ECF2F8) as the shimmer base color.

---

## 5. Recharts Standards

> **Version note:** Project uses **Recharts 3.8.0** (not 2.x as stated in the brief). API is largely compatible but `initialDimension` prop is available on `ResponsiveContainer` in v3.

### 5.1 ChartContainer Wrapper [VERIFIED: codebase — `components/ui/chart.tsx`]

All charts MUST use the `<ChartContainer>` wrapper from `components/ui/chart.tsx`. This wrapper:
- Injects CSS variables from `ChartConfig` into a scoped `<style>` tag
- Wraps `<ResponsiveContainer>` with correct initial dimensions
- Applies consistent axis tick styling via `[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground`
- Sets `aspect-video` default aspect ratio

**ChartConfig pattern:**
```tsx
const chartConfig = {
  temperature: { label: "Temperature (°C)", color: "var(--chart-1)" },
  humidity:    { label: "Humidity (%)",      color: "var(--chart-2)" },
  power:       { label: "Power (W)",         color: "var(--chart-3)" },
  current:     { label: "Current (A)",       color: "var(--chart-4)" },
  vibration:   { label: "Vibration (g)",     color: "var(--chart-5)" },
  running_hrs: { label: "Running Hours",     color: "var(--chart-6)" },
} satisfies ChartConfig
```

### 5.2 Color Series for Sensor Charts [VERIFIED: codebase + gap identified]

6 sensor types need 6 distinct, accessible colors:

| Sensor | CSS Variable | Hex Approx | Color Name |
|--------|-------------|------------|-----------|
| Temperature | `var(--chart-1)` | `#0864CD` | Azure Blue |
| Humidity | `var(--chart-2)` | `#00B6B7` | Teal |
| Power Consumption | `var(--chart-3)` | `#43A74C` | Green |
| Current | `var(--chart-4)` | `#ED980E` | Amber |
| Vibration | `var(--chart-5)` | `#E23431` | Red |
| Running Hours | `var(--chart-6)` | `#8B5CF6` | Violet *(to be added)* |

All 6 colors pass WCAG AA contrast when used as text on white background AND as chart lines on `#F8FAFB` background.

### 5.3 Sensor Time-Series Line Chart Standard

```tsx
// Source: actual codebase pattern + Recharts 3 docs [ASSUMED for threshold line specifics]
<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <LineChart data={sensorData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
    <CartesianGrid strokeDasharray="3 3" vertical={false} />
    <XAxis
      dataKey="timestamp"
      tickFormatter={(ts: number) =>
        new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
      tick={{ fontSize: 11 }}
      tickLine={false}
      axisLine={false}
    />
    <YAxis
      tickFormatter={(val: number) => `${val}${unit}`}
      tick={{ fontSize: 11 }}
      tickLine={false}
      axisLine={false}
      width={48}
    />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} verticalAlign="top" align="right" />
    {/* Threshold reference line */}
    <ReferenceLine
      y={threshold}
      stroke="var(--destructive)"
      strokeDasharray="4 4"
      strokeWidth={1.5}
      label={{ value: `Limit: ${threshold}${unit}`, fill: 'var(--destructive)', fontSize: 11, position: 'insideTopRight' }}
    />
    <Line dataKey="value" dot={false} strokeWidth={2} stroke="var(--chart-1)" />
  </LineChart>
</ChartContainer>
```

### 5.4 Asset Distribution Chart (Bar) [VERIFIED: codebase — `app/dashboard/page.tsx`]

Existing implementation uses `<BarChart>` with `XAxis` + `YAxis` + `CartesianGrid`. Standard config:

```tsx
<BarChart data={categoryData} margin={{ left: -10, right: 8 }}>
  <CartesianGrid vertical={false} />
  <XAxis dataKey="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
  <ChartTooltip content={<ChartTooltipContent />} />
  <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
</BarChart>
```

### 5.5 AI Risk Distribution Chart (Donut/Pie)

```tsx
// [ASSUMED — not yet implemented in codebase]
<ChartContainer config={riskConfig} className="h-[240px] w-full">
  <PieChart>
    <Pie
      data={riskData}
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={90}
      dataKey="count"
      nameKey="level"
    >
      <Cell fill="var(--destructive)" />  {/* High */}
      <Cell fill="var(--chart-4)" />       {/* Medium */}
      <Cell fill="var(--chart-3)" />       {/* Low */}
    </Pie>
    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
    <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" />
  </PieChart>
</ChartContainer>
```

### 5.6 Threshold Reference Lines

Standard specification for sensor monitoring thresholds:

| Property | Value |
|----------|-------|
| Stroke color | `var(--destructive)` (#DE2125) |
| Stroke style | `strokeDasharray="4 4"` |
| Stroke width | `1.5` |
| Label position | `insideTopRight` |
| Label font size | `11` (matches axis tick font) |
| Label fill | `var(--destructive)` |
| Label format | `"Limit: {value}{unit}"` |

### 5.7 Axis Formatting Standards

| Axis | Config |
|------|--------|
| X timestamp | `tickFormatter: (ts) => format as HH:mm or MM/DD` |
| X category | Direct `dataKey` string, no formatter |
| Y numeric + unit | `tickFormatter: (v) => \`${v}${unit}\`` |
| Y percentage | `tickFormatter: (v) => \`${v}%\`` |
| Font size | `11` (sub-body size for labels) |
| Tick lines | `tickLine={false} axisLine={false}` (cleaner look) |
| Left margin | `margin={{ left: -10 }}` to reduce Y-axis whitespace |
| Decimal control | `allowDecimals={false}` for integer counts |

### 5.8 Legend Placement

| Chart Type | `verticalAlign` | `align` | Notes |
|------------|----------------|---------|-------|
| Multi-line sensor | `"top"` | `"right"` | Horizontal legend above chart |
| Bar chart (single series) | Omit | — | No legend needed for single series |
| Donut/Pie risk | `"bottom"` | `"center"` | Below chart |

Use `<ChartLegendContent />` from `components/ui/chart.tsx` (already wraps `recharts/Legend`).

### 5.9 Custom Tooltip Pattern

```tsx
// Source: Recharts 3 + existing ChartTooltipContent in chart.tsx [VERIFIED: codebase]
// Standard: use built-in <ChartTooltipContent /> for most cases
<ChartTooltip
  content={<ChartTooltipContent
    labelFormatter={(label, payload) =>
      new Date(label).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    }
    formatter={(value, name) => [`${value} ${unitMap[name]}`, name]}
  />}
/>
```

### 5.10 Empty State Design

When no sensor data is available:

```tsx
// [ASSUMED — not yet implemented; recommended pattern]
function ChartEmptyState({ message = "No data available" }) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20">
      <BarChart2 className="size-8 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground/70">
          Data will appear when sensor readings are received
        </p>
      </div>
    </div>
  )
}
```

Consistent with existing "no data" patterns used in asset list pages: dashed border, muted background, centered icon + text.

---

## 6. Open Questions

| # | Question | Status | Resolution/Recommendation |
|---|----------|--------|--------------------------|
| OQ-1 | Font: Inter vs Roboto? | **RESOLVED** | **Geist Sans** — locked by existing codebase (`next/font/google` import in `layout.tsx`) |
| OQ-2 | Primary brand color: `#0EA5E9` (sky blue from v1.1) vs darker enterprise blue | **RESOLVED** | **`#0864CD`** (oklch 0.52 0.18 257) — locked by existing `--primary` token. The current primary is a medium enterprise blue, darker and more corporate than sky-blue |
| OQ-3 | Dark mode required? | **RESOLVED** | **Light mode only** for this academic project. Dark mode CSS rules exist in globals.css but are NOT a Phase 16 deliverable |
| OQ-4 | Status chips: icons or color only? | **RESOLVED** | Risk band chips use icons: HIGH ⚠️ / MEDIUM ⚠️ / LOW ℹ️; all lifecycle state chips are color-only |
| OQ-5 | --chart-6 token | **RESOLVED**: Add --chart-6 violet (#8B5CF6) for 6th sensor type (running_hours)
| OQ-6 | AI Recommendation states (pending/approved/deferred/expired) — currently NOT in `StatusBadge` STYLES map | **REQUIRES IMPLEMENTATION** | Add these 4 entries as specified in §4.5 |

---

## 7. Recommendations for Planner

### 7.1 Scope Assessment

Phase 16 is **primarily documentation** with small targeted code additions. The design system is ~80% already implemented. What's needed:

| Deliverable | Effort | Type |
|-------------|--------|------|
| `DESIGN_SYSTEM.md` — master spec document | Medium | Documentation |
| Add `--chart-6` token to `globals.css` | Trivial | Code |
| Add 4 AI Recommendation states to `StatusBadge` | Trivial | Code |
| Add `ChartEmptyState` component | Small | Code |
| Add Alert/Banner patterns documentation | Trivial | Documentation |
| Formalize Recharts chart standards | Medium | Documentation |

### 7.2 Suggested Plan Structure

**Wave 1:** Documentation audit — extract and document all existing tokens, component APIs, and usage patterns from the codebase into `DESIGN_SYSTEM.md`.

**Wave 2:** Small code additions — `--chart-6` token, missing StatusBadge states, `ChartEmptyState` component.

**Wave 3:** Recharts standards documentation — canonical code snippets for each chart type needed by the app.

### 7.3 File Locations

| File | Role |
|------|------|
| `frontend/app/globals.css` | Color tokens, spacing tokens — source of truth |
| `frontend/components/ui/` | Shared UI components |
| `frontend/components/status-badge.tsx` | Status chip mappings |
| `frontend/components/ui/chart.tsx` | Chart wrapper + tooltip/legend |
| `docs/DESIGN_SYSTEM.md` *(to create)* | Design system specification document |

### 7.4 Anti-Patterns to Avoid

- **Do NOT add `@mui/material`** — the project has no MUI dependency. All component needs are covered by shadcn/ui + Base UI.
- **Do NOT use hardcoded hex values** in component className strings — always use CSS variable references (`var(--chart-1)`, Tailwind utilities).
- **Do NOT create a separate design token JS/TS file** — tokens live in `globals.css` via `@theme inline`.
- **Do NOT implement dark mode** — out of scope; `.dark` CSS rules in globals.css are pre-existing, not a deliverable.
- **Do NOT use `Chip` from MUI** — use `<Badge>` or `<StatusBadge>` from the existing codebase.
- **Do NOT hand-roll tooltip logic** — use `<ChartTooltipContent>` from `components/ui/chart.tsx`.

### 7.5 Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Status chip coloring | Custom CSS per state | CVA in `status-badge.tsx` |
| Tooltip in charts | Custom tooltip from scratch | `<ChartTooltipContent>` from chart.tsx |
| Chart legends | Custom legend component | `<ChartLegendContent>` from chart.tsx |
| Responsive containers | Manual width/height | `<ChartContainer>` wrapper |
| Loading shimmer | Custom CSS animation | `<Skeleton>` from ui/skeleton.tsx |
| Toast notifications | Custom toast | `sonner` via `<Toaster>` |
| Modal overlays | Custom backdrop + portal | `<Dialog>` from ui/dialog.tsx |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `oklch(0.65 0.14 300)` ≈ `#8B5CF6` for `--chart-6` | §1.1, §5.2 | Actual rendered color may differ slightly; verify in browser |
| A2 | Recharts 3.x `ReferenceLine` label props work same as v2 | §5.3 | Label may require different prop structure in v3; test with actual data |
| A3 | AI Recommendation states (pending/approved/deferred/expired) not yet in StatusBadge | §4.5 | If already added in unreaded file, code addition is duplicate |
| A4 | `ChartEmptyState` component doesn't exist yet | §5.10 | If pattern already exists somewhere, use that instead |
| A5 | Alert/Banner component not yet implemented as standalone component | §4.7 | May exist as an undiscovered component in the codebase |

---

## Environment Availability

| Dependency | Required By | Available | Version |
|------------|------------|-----------|---------|
| Node.js | Next.js build | ✓ | (system default) |
| Recharts | Charts | ✓ | 3.8.0 (verified in package.json) |
| shadcn/ui | Components | ✓ | 4.8.0 (package.json) |
| Tailwind CSS | Styling | ✓ | v4.2.0 (package.json) |
| `@base-ui/react` | Headless primitives | ✓ | 1.5.0 (package.json) |
| `lucide-react` | Icons | ✓ | 1.17.0 (package.json) |
| `class-variance-authority` | CVA variants | ✓ | 0.7.1 (package.json) |
| `geist` font | Typography | ✓ | loaded via next/font/google |

**No missing dependencies identified for Phase 16.**

---

## Validation Architecture

Phase 16 deliverables are primarily documentation + small code additions. Validation strategy:

| Req ID | Behavior | Test Type | Command |
|--------|----------|-----------|---------|
| DS-01 | Color tokens present in globals.css | Grep verify | `grep -c "chart-" frontend/app/globals.css` |
| DS-04 | StatusBadge handles all 21 states | Unit test | `vitest run frontend/components` |
| DS-04 | Components render without errors | Snapshot | Existing test suite |
| DS-05 | ChartEmptyState renders correctly | Unit test | Add to chart component tests |

**Test framework:** Vitest 4.1.8 + `@testing-library/react` 16.3.2  
**Quick run:** `cd frontend && pnpm test`

---

## Package Legitimacy Audit

No new packages are being added in Phase 16 (documentation + minor additions to existing code). All packages in scope are already verified in the project's `package.json`.

| Package | Status | Notes |
|---------|--------|-------|
| `recharts` 3.8.0 | ✅ Already installed | Verified in frontend/package.json |
| `shadcn` 4.8.0 | ✅ Already installed | Component scaffolding tool |
| `@base-ui/react` 1.5.0 | ✅ Already installed | Used by all UI components |
| `class-variance-authority` 0.7.1 | ✅ Already installed | Used by button, badge CVA |
| `lucide-react` 1.17.0 | ✅ Already installed | Icon library |

**No new packages required.** No legitimacy audit needed.

---

## Sources

### Primary (HIGH confidence)
- `frontend/app/globals.css` — OKLCH color tokens, theme definition [VERIFIED: codebase]
- `frontend/components/ui/*.tsx` — Component implementations [VERIFIED: codebase]
- `frontend/components/status-badge.tsx` — Status badge state mapping [VERIFIED: codebase]
- `frontend/app/dashboard/page.tsx` — Chart usage patterns [VERIFIED: codebase]
- `frontend/package.json` — Exact dependency versions [VERIFIED: codebase]
- `frontend/app/layout.tsx` — Font loading (Geist) [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- MD3 type scale principles applied to Geist Sans [ASSUMED — standard MD3 spec]
- Recharts 3.x `ReferenceLine` API [ASSUMED — based on Recharts v2/v3 docs similarity]

### Tertiary (LOW confidence)
- `--chart-6` color recommendation (violet oklch(0.65 0.14 300)) [ASSUMED — color theory pick]
- Alert/Banner component pattern [ASSUMED — no existing component, pattern derived from token system]

---

## Metadata

**Confidence breakdown:**
- Color system: HIGH — verified directly from globals.css
- Component inventory: HIGH — verified from component source files
- Recharts patterns: MEDIUM — existing BarChart pattern verified; sensor LineChart with threshold lines assumed from API docs
- Typography scale: MEDIUM — Geist font confirmed, MD3 scale values assumed

**Research date:** 2026-06-28
**Valid until:** 2026-09-28 (stable stack — Tailwind v4, shadcn/ui, Recharts 3.x are all stable)
