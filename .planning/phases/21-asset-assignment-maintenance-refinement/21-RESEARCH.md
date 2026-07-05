---
phase: "21-asset-assignment-maintenance-refinement"
type: research
---

# Phase 21 Research — Asset, Assignment & Maintenance Refinement

## Scope
14 requirements: ASSET2-01–04, ASGN2-01–06, MAINT2-01–04

---

## Existing Codebase State

### Assets (`frontend/app/dashboard/assets/page.tsx`, 337 lines)
**What exists:**
- Table columns: ID, Name(+serial), Category, Purchase Price, Book Value, Status, Assignee, Actions
- Filters: search (name/ID/serial), category select, status select — ASSET2-04 ✅
- Pagination (10/25/50 per page) ✅
- AssetFormDialog (edit/create) — uses Dialog pattern, Edit triggered by row click
- Retire confirmation Dialog ✅

**Gaps (ASSET2-01):** WIREFRAMES §3A expects columns: ID, Asset Name+Serial, Category, Lifecycle State, Sensor Status (SensorStatusDot), Assignee, Actions. Need to drop "Purchase Price" and "Book Value" and replace with "Sensor Status" column. Also need "Location" per REQUIREMENTS.

**Gap (ASSET2-02):** No `/dashboard/assets/[id]` detail page exists. Row click currently opens edit form in Dialog — this must become: row click → navigate to `/dashboard/assets/{id}` (detail page).

**Gap (ASSET2-03):** `Asset` type has no `sensorDeviceId` field. `AssetFormDialog` has no sensor device ID field.

**Gap (ASSET2-04):** Already satisfied — search by name/serial + filter by category + filter by status all work simultaneously ✅

### `Asset` Type (frontend/lib/data.ts)
```ts
export type Asset = {
  id: string; name: string; category: AssetCategory; serial: string;
  purchaseDate: string; price: number; usefulLifeYears: number; warrantyMonths: number;
  status: AssetStatus; location: string; assignee: string | null;
  repairCount: number; usageHoursPerWeek: number;
}
```
**Missing:** `sensorDeviceId?: string | null`
**Note:** `location` already exists but not shown in table.

### Assignments (`frontend/app/dashboard/assignments/page.tsx`, 460 lines)
**What exists:**
- 3 section cards: Pending Requests, Active Assignments, Assignment History
- Request form in Dialog (has asset, assignee, dueDate but NO notes field)
- Approve/Reject with reason — ASGN2-04 ✅
- Return initiation — ASGN2-05 ✅
- Overdue row highlight (bg-destructive/5) — ASGN2-02 ✅
- History shows closed+rejected — ASGN2-06 ✅ (effectively satisfies history tab)

**Gap (ASGN2-01):** No `<Tabs>` layout. WIREFRAMES §4A requires: All, Pending ({count}), Active ({count}), History tabs. Currently shows all sections inline. Need to restructure to tabbed UI.

**Gap (ASGN2-03):** Request form in Dialog has no `notes` field. WIREFRAMES §4C requires "Notes (optional)" Textarea.

### Store (`frontend/lib/store.tsx`)
```ts
// No addMaintenanceRecord action exists
updateMaintenanceStatus: (id, {status, notes}) => boolean
```
**Missing:** `addMaintenanceRecord(record: MaintenanceRecord) => void`

### Maintenance (`frontend/app/dashboard/maintenance/page.tsx`, 434 lines)
**What exists:**
- Stats cards (3): Scheduled+In Progress, Blocked, Expiring ≤30 days ✅
- Warranty Expiry Warnings card ✅
- Maintenance Schedule grouped by status (Blocked, Scheduled, In Progress, Completed) ✅
- Inline select for state transitions (MAINT2-04 ✅)
- Note dialog for maintenance records ✅
- Warranty Tracker table with filter ✅

**Gap (MAINT2-02):** `MaintenanceRecord` type has no `aiCorrelationId` field. WIREFRAMES §5D shows "AI · Rec #7" badge in Notes column. Currently `notes` is a plain string — but AI correlation needs to be a separate optional field.

**Gap (MAINT2-03):** No "Create Ticket" button/form. WIREFRAMES §5D CardHeader shows `[+ Create Ticket]` button. Needs Dialog with: asset picker, description/notes, scheduledDate, type, priority.

**Gap (MAINT2-04):** Transition logic already complete (canTransitionMaintenance, requiresBlockedNote) ✅

### `MaintenanceRecord` Type
```ts
export type MaintenanceRecord = {
  id: string; assetId: string; assetName: string;
  type: "scheduled" | "risk_based" | "warranty";
  priority: "high" | "medium" | "low";
  status: MaintenanceStatus;
  scheduledDate: string; completedDate: string | null; notes: string;
}
```
**Missing:** `aiCorrelationId?: string | null`

### Navigation & Routing
- Current sidebar links: dashboard, assets, assignments, maintenance, predictive, reports, audit, users, assistant, ocr
- `/dashboard/assets/[id]` route does not exist yet — needs new `app/dashboard/assets/[id]/page.tsx`
- `/dashboard/assets/[id]` is dynamic route, Next.js App Router style

### Available UI Components (verified)
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs` ✅
- `Badge` from `@/components/ui/badge` ✅
- `Separator` from `@/components/ui/separator` ✅
- `Breadcrumb` family from `@/components/ui/breadcrumb` ✅
- `StatusBadge` from `@/components/status-badge` ✅

---

## Key Technical Decisions

### 1. Sensor Status Column (ASSET2-01)
- Add `sensorDeviceId?: string | null` to `Asset` type
- Show sensor status dot: **green** (`bg-chart-3`) if `sensorDeviceId != null`, **dash** `—` if null
- No real-time WS data in Phase 21 (IoT is Phase 22) — dot shows "linked" vs "unlinked"
- This is simpler and correct: Phase 22 will upgrade to live status dot

### 2. "Last Updated" column (ASSET2-01)
- `Asset` type has no `updatedAt`. Options:
  a) Add `updatedAt: string` to type + seed data (date-heavy change)
  b) Derive from `purchaseDate` (misrepresents meaning)
  c) Show "—" in the column as placeholder
- **Decision:** Add `lastUpdated?: string` optional field to `Asset` type. Seed data gets recent dates. The `updateAsset` store action patches it with today's date. Form sets it on save.

### 3. Asset list column changes (ASSET2-01)
- Remove: "Purchase Price", "Book Value" (these are financial details → moved to detail page)
- Add: "Location", "Sensor" (dot column)
- Keep: ID, Name+Serial, Category, Status, Assignee, Actions
- Final columns: ID | Name+Serial | Category | Location | Status | Sensor | Assignee | Actions

### 4. Asset detail page (ASSET2-02) — `/dashboard/assets/[id]/page.tsx`
- Shows: header card (name, ID, serial, category, status, location, purchaseDate, sensor ID)
- Assignment history (last 5 assignments for this asset from `assignmentRecords`)
- Maintenance history (last 5 from `maintenanceRecords` for this asset)
- Mock sensor reading panel with static values (no WS in Phase 21)
- Row click in asset list → `router.push('/dashboard/assets/' + a.id)` (not open form)
- Edit button on detail page → opens AssetFormDialog

### 5. Assignments tabs (ASGN2-01)
- Use `<Tabs defaultValue="pending">` wrapping the 3 existing sections
- Tab values: "all" | "pending" | "active" | "history"
- "All" tab shows combined table of ALL records (all statuses), sorted by requestDate desc
- Badge counts in TabsTrigger: pending={pending.length} active={active.length}
- Move "New Request" button to Topbar or above tabs (accessible from all tabs)

### 6. Assignment request notes (ASGN2-03)
- Add `notes?: string` to `AssignmentRecord` type
- Add Textarea to the request form Dialog
- Rename Dialog → separate page `/dashboard/assignments/new` is optional; Dialog is fine per WIREFRAMES "4C" (it's a Card page but we keep it as Dialog to avoid routing complexity)

### 7. Maintenance Create Ticket (MAINT2-03)
- Add `addMaintenanceRecord(record: MaintenanceRecord) => void` to store
- Add Dialog form triggered by "+ Create Ticket" button in Maintenance Schedule CardHeader
- Fields: asset (Select from assets), type (scheduled/risk_based/warranty), priority (high/medium/low), scheduledDate, notes (optional)

### 8. AI Correlation ID (MAINT2-02)
- Add `aiCorrelationId?: string | null` to `MaintenanceRecord`
- In Notes column: if `aiCorrelationId` is set, show `<Badge variant="secondary" className="text-xs">AI · Rec #{aiCorrelationId}</Badge>` next to notes text
- Seed: give 1-2 existing records an aiCorrelationId value

---

## Wave Plan Preview

**Wave 0 — Data model additions** (no UI, must be first)
- `lib/data.ts`: add `sensorDeviceId`, `lastUpdated` to Asset; `aiCorrelationId` to MaintenanceRecord; `notes` to AssignmentRecord
- Update seed data
- `lib/store.tsx`: add `addMaintenanceRecord` action + `lastUpdated` update in `updateAsset`

**Wave 1 — Assets**
- `components/sensor-status-dot.tsx`: new component
- `app/dashboard/assets/page.tsx`: column changes + row click navigation
- `components/asset-form-dialog.tsx`: add sensorDeviceId field
- `app/dashboard/assets/[id]/page.tsx`: new detail page

**Wave 2 — Assignments**
- `app/dashboard/assignments/page.tsx`: Tabs layout + notes field in request form

**Wave 3 — Maintenance**
- `app/dashboard/maintenance/page.tsx`: Create Ticket button + Dialog; AI badge in rows

**Wave 4 — Verification**
- `tsc --noEmit` must pass
- All 14 requirements spot-checked
