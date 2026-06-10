---
phase: 5
plan: 1
name: Foundation, Layout & Dashboard
status: complete
completed_at: "2026-06-10"
---

# Phase 5 Summary: Foundation, Layout & Dashboard

## One-liner

Complete UI foundation rewrite — English, 4-role RBAC, v1.0 lifecycle states, 0 TypeScript errors.

## What Was Built

### Core Data & State (`lib/`)
- **`lib/data.ts`** — Full rewrite: `AssetStatus` (registered/available/assigned/maintenance/retired), `AssignmentStatus` (requested/active/overdue/closed/rejected), `MaintenanceStatus`, `WarrantyStatus`, `UserRole` (Admin/Asset Manager/Staff/Auditor), `AssignmentRecord`, `MaintenanceRecord`, `WarrantyRecord`, `formatCurrency` (USD, en-US), English mock data for all types
- **`lib/store.tsx`** — 4-role `DEMO_USERS`, new store API: `createAssignment(record)`, `approveAssignment(id)`, `rejectAssignment(id)`, `initiateReturn(id)`, `closeAssignment(id)`, `retireAsset(id)`, `updateMaintenanceStatus(id, status)`
- **`lib/assistant.ts`** — English NL→query engine with pattern matching for warranty, risk, category, assignments, value/depreciation, most-expensive; `formatCurrency`; `confidence`/`trace` fields on `AssistantResult`; English `SUGGESTED_QUESTIONS`

### Layout & Navigation
- **`components/sidebar.tsx`** — 9 v1.0 module nav items (Overview, Assets, Assignments, Maintenance, AI Assistant, OCR Intake, Predictive, Reports, Audit Log); role-based visibility (Staff hides Maintenance/OCR/Predictive/Audit; Auditor hides Assignments/Maintenance/OCR/Predictive)
- **`components/topbar.tsx`** — 4-role badge variant support
- **`components/status-badge.tsx`** — English status keys, LABELS display map (`in_progress` → "In Progress", `expiring_soon` → "Expiring Soon")

### Pages
- **`app/page.tsx`** — English login, 2×2 role picker (Admin/Asset Manager/Staff/Auditor)
- **`app/dashboard/layout.tsx`** — English redirect message
- **`app/dashboard/page.tsx`** — English dashboard with KPIs, charts, alert panels; `assignmentRecords`, `formatCurrency`
- **`app/dashboard/assets/page.tsx`** — English, `retireAsset`, status filter, base-ui `onValueChange` fix
- **`app/dashboard/borrow/page.tsx`** — Rewritten as Assignments page using `assignmentRecords` API, English
- **`app/dashboard/assistant/page.tsx`** — English UI, `formatCurrency`, "AI-generated query" label
- **`app/dashboard/ocr/page.tsx`** — English categories (Printer/Forklift/Office Equipment), confidence-band UX (High ≥95% quick confirm, Medium 80–94% field-by-field, Low <80% rejection), `formatCurrency`
- **`app/dashboard/reports/page.tsx`** — English labels, `formatCurrency`, `status !== "retired"`
- **`components/asset-form-dialog.tsx`** — English form labels/values

## Key Decisions
- `formatVND` fully removed — all currency uses `formatCurrency` (USD, Intl.NumberFormat en-US)
- `borrowRecords` API replaced by `assignmentRecords` with full lifecycle states
- base-ui `Select.onValueChange` wrapped with null-guard `(v) => v && setter(v)` throughout
- `DropdownMenuTrigger asChild` pattern replaced with inline styling (base-ui doesn't support asChild)
- OCR confidence routing: Low confidence rejects extraction rather than showing broken data

## Verification Results
- **TypeScript:** 0 errors (`tsc --noEmit` clean)
- **English:** 0 Vietnamese strings in any .ts/.tsx file
- **Commit:** `e5fd6c7` — 17 files changed, 7086 insertions
