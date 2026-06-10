# Architecture

**Analysis Date:** 2026-06-09

## Pattern Overview

**Overall:** Client-heavy Next.js App Router SPA-style dashboard with in-memory state container

**Key Characteristics:**
- Route-driven UI using Next.js App Router pages in `v0-ai-asset-management/app/`.
- Global client state/context for auth and domain data in `v0-ai-asset-management/lib/store.tsx`.
- Domain logic implemented as pure helper modules (`v0-ai-asset-management/lib/data.ts`, `v0-ai-asset-management/lib/assistant.ts`) consumed directly by UI routes.

## Layers

**Routing/Layout Layer:**
- Purpose: Define route tree, global providers, and shell layout.
- Location: `v0-ai-asset-management/app/layout.tsx`, `v0-ai-asset-management/app/page.tsx`, `v0-ai-asset-management/app/dashboard/layout.tsx`, `v0-ai-asset-management/app/dashboard/*/page.tsx`
- Contains: App metadata, route components, navigation gating.
- Depends on: Store/context (`@/lib/store`), feature components (`@/components/*`).
- Used by: Next.js runtime entrypoints.

**State & Domain Layer:**
- Purpose: Hold mutable app state and business operations for assets/borrowing/auth.
- Location: `v0-ai-asset-management/lib/store.tsx`, `v0-ai-asset-management/lib/data.ts`, `v0-ai-asset-management/lib/assistant.ts`
- Contains: React context provider/hooks, seed data, calculations (depreciation/risk/warranty), assistant query simulation.
- Depends on: React hooks/types.
- Used by: All dashboard pages and shared UI components (e.g., `v0-ai-asset-management/components/topbar.tsx`, `v0-ai-asset-management/app/dashboard/assets/page.tsx`).

**Feature UI Layer:**
- Purpose: Implement business screens and interactions.
- Location: `v0-ai-asset-management/app/dashboard/assets/page.tsx`, `v0-ai-asset-management/app/dashboard/borrow/page.tsx`, `v0-ai-asset-management/app/dashboard/reports/page.tsx`, `v0-ai-asset-management/app/dashboard/assistant/page.tsx`, `v0-ai-asset-management/app/dashboard/ocr/page.tsx`
- Contains: Page-specific filtering, forms, charts, dialogs, toasts.
- Depends on: State/domain layer and shared components.
- Used by: App Router route rendering.

**Shared Component Layer:**
- Purpose: Reusable shell components and UI primitives.
- Location: `v0-ai-asset-management/components/`, `v0-ai-asset-management/components/ui/`
- Contains: Sidebar/topbar/status badges/asset form dialog and shadcn-based primitives.
- Depends on: `@/lib/utils`, external UI libs (`lucide-react`, `recharts`, Base UI wrappers).
- Used by: All route pages.

## Data Flow

**Authentication and dashboard access flow:**

1. User submits demo login form in `v0-ai-asset-management/app/page.tsx`; `login()` from `useStore()` sets context user in `v0-ai-asset-management/lib/store.tsx`.
2. Router navigates to `/dashboard`; `v0-ai-asset-management/app/dashboard/layout.tsx` checks `user` and redirects unauthenticated users to `/`.
3. Authenticated users receive the dashboard shell with `Sidebar` and route content.

**Asset lifecycle flow (CRUD/borrow/return):**

1. Page components call store actions (`addAsset`, `updateAsset`, `disposeAsset`, `borrowAsset`, `returnAsset`) from `v0-ai-asset-management/lib/store.tsx`.
2. Store mutates in-memory arrays via `useState`, including cross-update behavior between assets and borrow records.
3. Derived values are recalculated in pages using helpers from `v0-ai-asset-management/lib/data.ts` and rendered in tables/charts.

**AI assistant/OCR demo flow:**

1. Assistant page sends text to `runAssistant()` in `v0-ai-asset-management/lib/assistant.ts`, which pattern-matches questions and returns synthetic query + results.
2. OCR page simulates extraction with `setTimeout` and local sample invoice data in `v0-ai-asset-management/app/dashboard/ocr/page.tsx`.
3. OCR-confirmed asset creation calls `addAsset` in store, updating shared state for all pages.

**State Management:**
- Single React Context (`StoreProvider`) in `v0-ai-asset-management/lib/store.tsx` wraps entire app from `v0-ai-asset-management/app/layout.tsx`.
- No persistence layer detected; state resets on refresh and is seeded from static arrays in `v0-ai-asset-management/lib/data.ts`.

## Key Abstractions

**StoreContext / useStore:**
- Purpose: Central in-memory application state and commands.
- Examples: `v0-ai-asset-management/lib/store.tsx`
- Pattern: Context Provider + custom hook; command-style mutator functions.

**Domain helper functions:**
- Purpose: Keep calculations and formatting outside view components.
- Examples: `v0-ai-asset-management/lib/data.ts` (`depreciation`, `warrantyMonthsLeft`, `failureRisk`, `formatVND`, `formatDate`)
- Pattern: Pure functions over typed domain objects.

**AssistantResult abstraction:**
- Purpose: Normalize assistant output as `answer + query + assets`.
- Examples: `v0-ai-asset-management/lib/assistant.ts`, consumer in `v0-ai-asset-management/app/dashboard/assistant/page.tsx`
- Pattern: Stateless deterministic evaluator over current assets.

## Entry Points

**Root App Layout:**
- Location: `v0-ai-asset-management/app/layout.tsx`
- Triggers: Every request/render in Next.js App Router.
- Responsibilities: Metadata/fonts/global CSS, global `StoreProvider`, global toast container, conditional Vercel analytics in production.

**Login Route:**
- Location: `v0-ai-asset-management/app/page.tsx`
- Triggers: Initial navigation to `/`.
- Responsibilities: Demo role selection, login state creation, redirect to dashboard.

**Dashboard Layout Gate:**
- Location: `v0-ai-asset-management/app/dashboard/layout.tsx`
- Triggers: Any `/dashboard*` route render.
- Responsibilities: Client-side auth guard, shell composition (`Sidebar` + content area).

## Error Handling

**Strategy:** Minimal defensive checks with optimistic UI and toast feedback.

**Patterns:**
- Guard clauses for missing inputs/records (e.g., `if (!asset) return prev` in `v0-ai-asset-management/lib/store.tsx`, `if (!assetId || !borrower) return` in `v0-ai-asset-management/app/dashboard/borrow/page.tsx`).
- Runtime hook-usage protection (`useStore must be used within StoreProvider`) in `v0-ai-asset-management/lib/store.tsx`.

## Cross-Cutting Concerns

**Logging:**
- No centralized logging layer detected in `v0-ai-asset-management/`; runtime feedback is mostly user toasts via `sonner`.

**Validation:**
- UI-level required fields and input types in forms (`v0-ai-asset-management/app/page.tsx`, `v0-ai-asset-management/components/asset-form-dialog.tsx`, `v0-ai-asset-management/app/dashboard/ocr/page.tsx`).
- No schema-based validation library detected.

**Authentication:**
- Demo/client-only auth state in `v0-ai-asset-management/lib/store.tsx` and route gating in `v0-ai-asset-management/app/dashboard/layout.tsx`.
- No backend/session/JWT integration detected.

## Known Architectural Risks/Debt

- **No persistent data boundary:** All domain state is client memory (`v0-ai-asset-management/lib/store.tsx`) seeded from static data (`v0-ai-asset-management/lib/data.ts`), causing data loss on refresh and preventing multi-user consistency.
- **No server/API layer:** Features call state mutations directly from pages without service/repository abstraction, increasing coupling between UI and domain updates (`v0-ai-asset-management/app/dashboard/*/page.tsx` → `v0-ai-asset-management/lib/store.tsx`).
- **Client-side access control only:** Role checks are in UI components (`v0-ai-asset-management/components/sidebar.tsx`, `v0-ai-asset-management/app/dashboard/assets/page.tsx`) and can’t enforce true authorization.
- **Build safety risk:** TypeScript build errors are ignored in `v0-ai-asset-management/next.config.mjs` (`typescript.ignoreBuildErrors: true`).

---

*Architecture analysis: 2026-06-09*
