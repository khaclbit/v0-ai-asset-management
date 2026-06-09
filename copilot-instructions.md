<!-- GSD:project-start source:PROJECT.md -->
## Project

**AI-Powered Asset Management System**

AI-Powered Asset Management System is a web application for managing organizational assets such as laptops, monitors, printers, and related equipment. It supports core lifecycle operations (registration, assignment/return, maintenance, warranty, notifications, and reporting) and augments them with AI capabilities including assistant-style querying, OCR-assisted intake, and predictive maintenance insights. This initialization milestone is architecture-first and flow-first, intended as an engineering handoff with no implementation work.

**Core Value:** Give teams a clear, implementation-ready system architecture and workflow blueprint for asset lifecycle operations with practical AI augmentation.

### Constraints

- **Scope**: Architecture and flow artifacts only — no coding in this phase
- **Audience**: Engineering implementation handoff
- **AI Depth**: Integration/workflow level only — no deep model design yet
- **Starting Point**: Existing brownfield prototype must be acknowledged when defining target architecture
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript (5.7.3) - Application and UI code in `v0-ai-asset-management/app/**/*.tsx`, `v0-ai-asset-management/components/**/*.tsx`, and `v0-ai-asset-management/lib/**/*.ts`.
- JavaScript (ES modules) - Tooling/config files in `v0-ai-asset-management/next.config.mjs` and `v0-ai-asset-management/postcss.config.mjs`.
- CSS - Global styles and design tokens in `v0-ai-asset-management/app/globals.css`.
## Runtime
- Node.js runtime required by Next.js (`next` 16.2.6 in `v0-ai-asset-management/package.json`, engines not explicitly pinned).
- Browser runtime for all app features; pages are client components (`"use client"`) in `v0-ai-asset-management/app/page.tsx` and dashboard pages.
- npm/yarn/pnpm commands are documented in `v0-ai-asset-management/README.md`.
- `pnpm-lock.yaml` is present at `v0-ai-asset-management/pnpm-lock.yaml` (lockfile present; indicates pnpm was used for dependency resolution).
- `packageManager` field is not set in `v0-ai-asset-management/package.json` (exact required PM version is uncertain).
## Frameworks
- Next.js 16.2.6 - App framework and routing (`v0-ai-asset-management/package.json`, `v0-ai-asset-management/app/`).
- React 19.x / React DOM 19.x - UI runtime (`v0-ai-asset-management/package.json`).
- Not detected. No Jest/Vitest/Playwright/Cypress config files and no `*.test.*`/`*.spec.*` files found in `v0-ai-asset-management/`.
- TypeScript 5.7.3 (`v0-ai-asset-management/package.json`, compiler options in `v0-ai-asset-management/tsconfig.json`).
- Tailwind CSS 4 + PostCSS (`v0-ai-asset-management/package.json`, `v0-ai-asset-management/postcss.config.mjs`, `v0-ai-asset-management/app/globals.css`).
- shadcn UI tooling + Base UI primitives (`v0-ai-asset-management/components.json`, `v0-ai-asset-management/components/ui/*`).
- ESLint is invoked by script (`"lint": "eslint ."` in `v0-ai-asset-management/package.json`), but explicit eslint config file is not detected.
## Key Dependencies
- `next` 16.2.6 - framework, routing, production build (`v0-ai-asset-management/package.json`).
- `react` / `react-dom` 19 - rendering and hooks (`v0-ai-asset-management/package.json`).
- `@base-ui/react` - primitive UI controls used throughout `v0-ai-asset-management/components/ui/*.tsx`.
- `recharts` 3.8.0 - dashboard charts in `v0-ai-asset-management/app/dashboard/page.tsx` and `v0-ai-asset-management/app/dashboard/reports/page.tsx`.
- `sonner` - toast notifications in `v0-ai-asset-management/app/dashboard/borrow/page.tsx` and `v0-ai-asset-management/app/dashboard/ocr/page.tsx`.
- `@vercel/analytics` 1.6.1 - production analytics script in `v0-ai-asset-management/app/layout.tsx`.
- `next-themes` - theme-aware toast rendering in `v0-ai-asset-management/components/ui/sonner.tsx`.
- `clsx` + `tailwind-merge` - className composition helper in `v0-ai-asset-management/lib/utils.ts`.
## Configuration
- Runtime environment check uses `process.env.NODE_ENV` in `v0-ai-asset-management/app/layout.tsx` to gate analytics.
- `.env*.local` is ignored per `v0-ai-asset-management/.gitignore`; no concrete env var keys are declared in the codebase beyond `NODE_ENV`.
- Next config in `v0-ai-asset-management/next.config.mjs`:
- TypeScript config in `v0-ai-asset-management/tsconfig.json` with `strict: true` and alias `@/*`.
- PostCSS config in `v0-ai-asset-management/postcss.config.mjs` using `@tailwindcss/postcss`.
## Data Stores and Messaging
- Persistent database: Not detected.
- External cache/queue/message broker: Not detected.
- State is in-memory React context in `v0-ai-asset-management/lib/store.tsx`, seeded from static arrays in `v0-ai-asset-management/lib/data.ts`.
## Deployment/Runtime Assumptions
- App is structured for Next.js server + browser deployment (`v0-ai-asset-management/app/layout.tsx`, `v0-ai-asset-management/package.json` scripts).
- `v0-ai-asset-management/README.md` states merges to `main` auto-deploy via linked v0 workflow (hosting platform inferred as Vercel; explicit `vercel.json` not present).
- `v0-ai-asset-management/.gitignore` includes `.vercel/`, consistent with Vercel-based deployment tooling.
## Platform Requirements
- Node.js + package manager (npm/yarn/pnpm) to run `dev`, `build`, `start`, `lint` scripts in `v0-ai-asset-management/package.json`.
- Modern browser for client-side features (all main pages are client components).
- Next.js-compatible Node hosting. Edge/serverless-specific adapters are not configured in repository files.
## Notable Versioning Constraints
- Exact pins: `next` 16.2.6, `recharts` 3.8.0, `typescript` 5.7.3, `@vercel/analytics` 1.6.1 (`v0-ai-asset-management/package.json`).
- Major-range deps: React `^19`, Node typings `^24`, Tailwind `^4.2.0`.
- Build tolerates TypeScript errors due to `ignoreBuildErrors: true` in `v0-ai-asset-management/next.config.mjs`.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Use route-convention filenames in `app/` (`page.tsx`, `layout.tsx`) and kebab-case component filenames such as `components/asset-form-dialog.tsx` and `components/status-badge.tsx`.
- Use lower-case utility UI filenames under `components/ui/` such as `components/ui/button.tsx` and `components/ui/dialog.tsx`.
- Use PascalCase for React components (for example `DashboardPage` in `app/dashboard/page.tsx`, `AssetFormDialog` in `components/asset-form-dialog.tsx`).
- Use camelCase for helpers and handlers (for example `formatVND` in `lib/data.ts`, `handleSubmit` in `app/page.tsx`, `runAssistant` in `lib/assistant.ts`).
- Use camelCase for local variables/state (`borrowRecords`, `disposeTarget`, `defaultDue`) in files like `lib/store.tsx` and `app/dashboard/borrow/page.tsx`.
- Use UPPER_SNAKE_CASE for constants (`CATEGORIES`, `SAMPLE_INVOICES`, `NAV`) in `lib/data.ts`, `app/dashboard/ocr/page.tsx`, `components/sidebar.tsx`.
- Use PascalCase for types and aliases (`Asset`, `BorrowRecord`, `AssistantResult`, `StoreContextValue`) in `lib/data.ts`, `lib/assistant.ts`, `lib/store.tsx`.
- Use string-literal unions for domain states (`AssetStatus`, `Role`) in `lib/data.ts`, `app/page.tsx`.
## Code Style
- No Prettier config detected at project root (`v0-ai-asset-management/.prettierrc*` not found).
- Most app/domain files follow semicolon-free formatting and double-quoted strings (for example `app/dashboard/assets/page.tsx`, `lib/store.tsx`).
- Generated UI primitives use many single-quoted strings in some files (for example `components/ui/button.tsx`, `lib/utils.ts`), so quote style is currently mixed.
- `package.json` defines `"lint": "eslint ."` in `v0-ai-asset-management/package.json`.
- No explicit ESLint config file detected (`.eslintrc*` and `eslint.config.*` absent at repo root).
- Inline suppression appears in `app/dashboard/ocr/page.tsx` (`// eslint-disable-next-line @next/next/no-img-element`).
- Uncertainty: `eslint` is not declared in `package.json` dependencies/devDependencies, so lint runtime behavior depends on external/tooling context.
## Import Organization
- Use `@/*` alias via `tsconfig.json` (`"paths": { "@/*": ["./*"] }`).
- Additional alias conventions documented in `components.json` (`components`, `ui`, `lib`, `utils`, `hooks`).
## Error Handling
- Prefer guard clauses and early returns (`if (!text || thinking) return` in `app/dashboard/assistant/page.tsx`; `if (!fields) return` in `app/dashboard/ocr/page.tsx`).
- Throw explicit invariant error for missing provider (`useStore must be used within StoreProvider`) in `lib/store.tsx`.
- No `try/catch`-based error recovery patterns detected in `app/`, `components/`, or `lib/`.
## Logging
- No active `console.*` logging found in `app/`, `components/`, `lib/`.
- Use UI toast notifications (`toast.success`) for user-visible operation feedback in `app/dashboard/assets/page.tsx`, `app/dashboard/borrow/page.tsx`, and `app/dashboard/ocr/page.tsx`.
## Comments
- Use brief section comments for UI grouping (for example `/* Toolbar */`, `/* Active borrows */`) in `app/dashboard/assets/page.tsx` and `app/dashboard/borrow/page.tsx`.
- Use short Vietnamese explanatory comments for demo logic (for example OCR simulation in `app/dashboard/ocr/page.tsx`, AI simulation in `lib/assistant.ts`).
- Not detected in inspected TypeScript files (`app/`, `components/`, `lib/`).
## Function Design
- Keep feature pages as large orchestrator components with local helper functions (for example `AssetsPage` in `app/dashboard/assets/page.tsx`, `ReportsPage` in `app/dashboard/reports/page.tsx`).
- Keep shared utility functions compact and single-purpose (`cn` in `lib/utils.ts`, `formatDate` in `lib/data.ts`).
- Pass props as typed object parameters for components (`{ title, subtitle }`, `{ open, onOpenChange, initial, onSave }`) in `components/topbar.tsx`, `components/asset-form-dialog.tsx`.
- Use generic keyed updaters for typed form state (`updateField<K extends keyof ExtractedFields>`) in `app/dashboard/ocr/page.tsx`.
- Return JSX for components and plain objects for domain helpers (for example `depreciation`, `failureRisk` in `lib/data.ts`).
- Return unchanged state when preconditions fail in reducers/setters (for example `if (!asset) return prev` in `lib/store.tsx`).
## Module Design
- Use default exports for route pages (`app/**/page.tsx`).
- Use named exports for shared modules/components (`lib/data.ts`, `components/status-badge.tsx`, `components/ui/button.tsx`).
- Not detected; modules import direct file paths (for example `@/components/ui/button`, `@/lib/store`).
## Config Management Patterns
- Keep compile/runtime config in root config files (`tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`).
- Keep UI and seed/demo config as TypeScript constants (`lib/data.ts`, `components/sidebar.tsx`, `app/dashboard/ocr/page.tsx`).
- Use environment checks minimally; only `process.env.NODE_ENV` usage detected in `app/layout.tsx`.
## Inconsistencies to Watch
- Mixed quote style between generated UI primitives (`components/ui/button.tsx`, `lib/utils.ts`) and app pages (`app/dashboard/*.tsx`).
- Type safety is weakened at build time because `next.config.mjs` sets `typescript.ignoreBuildErrors: true`.
- Lint command exists in `package.json` but project-level ESLint config is not present; treat lint setup as uncertain until verified in runtime.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Route-driven UI using Next.js App Router pages in `v0-ai-asset-management/app/`.
- Global client state/context for auth and domain data in `v0-ai-asset-management/lib/store.tsx`.
- Domain logic implemented as pure helper modules (`v0-ai-asset-management/lib/data.ts`, `v0-ai-asset-management/lib/assistant.ts`) consumed directly by UI routes.
## Layers
- Purpose: Define route tree, global providers, and shell layout.
- Location: `v0-ai-asset-management/app/layout.tsx`, `v0-ai-asset-management/app/page.tsx`, `v0-ai-asset-management/app/dashboard/layout.tsx`, `v0-ai-asset-management/app/dashboard/*/page.tsx`
- Contains: App metadata, route components, navigation gating.
- Depends on: Store/context (`@/lib/store`), feature components (`@/components/*`).
- Used by: Next.js runtime entrypoints.
- Purpose: Hold mutable app state and business operations for assets/borrowing/auth.
- Location: `v0-ai-asset-management/lib/store.tsx`, `v0-ai-asset-management/lib/data.ts`, `v0-ai-asset-management/lib/assistant.ts`
- Contains: React context provider/hooks, seed data, calculations (depreciation/risk/warranty), assistant query simulation.
- Depends on: React hooks/types.
- Used by: All dashboard pages and shared UI components (e.g., `v0-ai-asset-management/components/topbar.tsx`, `v0-ai-asset-management/app/dashboard/assets/page.tsx`).
- Purpose: Implement business screens and interactions.
- Location: `v0-ai-asset-management/app/dashboard/assets/page.tsx`, `v0-ai-asset-management/app/dashboard/borrow/page.tsx`, `v0-ai-asset-management/app/dashboard/reports/page.tsx`, `v0-ai-asset-management/app/dashboard/assistant/page.tsx`, `v0-ai-asset-management/app/dashboard/ocr/page.tsx`
- Contains: Page-specific filtering, forms, charts, dialogs, toasts.
- Depends on: State/domain layer and shared components.
- Used by: App Router route rendering.
- Purpose: Reusable shell components and UI primitives.
- Location: `v0-ai-asset-management/components/`, `v0-ai-asset-management/components/ui/`
- Contains: Sidebar/topbar/status badges/asset form dialog and shadcn-based primitives.
- Depends on: `@/lib/utils`, external UI libs (`lucide-react`, `recharts`, Base UI wrappers).
- Used by: All route pages.
## Data Flow
- Single React Context (`StoreProvider`) in `v0-ai-asset-management/lib/store.tsx` wraps entire app from `v0-ai-asset-management/app/layout.tsx`.
- No persistence layer detected; state resets on refresh and is seeded from static arrays in `v0-ai-asset-management/lib/data.ts`.
## Key Abstractions
- Purpose: Central in-memory application state and commands.
- Examples: `v0-ai-asset-management/lib/store.tsx`
- Pattern: Context Provider + custom hook; command-style mutator functions.
- Purpose: Keep calculations and formatting outside view components.
- Examples: `v0-ai-asset-management/lib/data.ts` (`depreciation`, `warrantyMonthsLeft`, `failureRisk`, `formatVND`, `formatDate`)
- Pattern: Pure functions over typed domain objects.
- Purpose: Normalize assistant output as `answer + query + assets`.
- Examples: `v0-ai-asset-management/lib/assistant.ts`, consumer in `v0-ai-asset-management/app/dashboard/assistant/page.tsx`
- Pattern: Stateless deterministic evaluator over current assets.
## Entry Points
- Location: `v0-ai-asset-management/app/layout.tsx`
- Triggers: Every request/render in Next.js App Router.
- Responsibilities: Metadata/fonts/global CSS, global `StoreProvider`, global toast container, conditional Vercel analytics in production.
- Location: `v0-ai-asset-management/app/page.tsx`
- Triggers: Initial navigation to `/`.
- Responsibilities: Demo role selection, login state creation, redirect to dashboard.
- Location: `v0-ai-asset-management/app/dashboard/layout.tsx`
- Triggers: Any `/dashboard*` route render.
- Responsibilities: Client-side auth guard, shell composition (`Sidebar` + content area).
## Error Handling
- Guard clauses for missing inputs/records (e.g., `if (!asset) return prev` in `v0-ai-asset-management/lib/store.tsx`, `if (!assetId || !borrower) return` in `v0-ai-asset-management/app/dashboard/borrow/page.tsx`).
- Runtime hook-usage protection (`useStore must be used within StoreProvider`) in `v0-ai-asset-management/lib/store.tsx`.
## Cross-Cutting Concerns
- No centralized logging layer detected in `v0-ai-asset-management/`; runtime feedback is mostly user toasts via `sonner`.
- UI-level required fields and input types in forms (`v0-ai-asset-management/app/page.tsx`, `v0-ai-asset-management/components/asset-form-dialog.tsx`, `v0-ai-asset-management/app/dashboard/ocr/page.tsx`).
- No schema-based validation library detected.
- Demo/client-only auth state in `v0-ai-asset-management/lib/store.tsx` and route gating in `v0-ai-asset-management/app/dashboard/layout.tsx`.
- No backend/session/JWT integration detected.
## Known Architectural Risks/Debt
- **No persistent data boundary:** All domain state is client memory (`v0-ai-asset-management/lib/store.tsx`) seeded from static data (`v0-ai-asset-management/lib/data.ts`), causing data loss on refresh and preventing multi-user consistency.
- **No server/API layer:** Features call state mutations directly from pages without service/repository abstraction, increasing coupling between UI and domain updates (`v0-ai-asset-management/app/dashboard/*/page.tsx` → `v0-ai-asset-management/lib/store.tsx`).
- **Client-side access control only:** Role checks are in UI components (`v0-ai-asset-management/components/sidebar.tsx`, `v0-ai-asset-management/app/dashboard/assets/page.tsx`) and can’t enforce true authorization.
- **Build safety risk:** TypeScript build errors are ignored in `v0-ai-asset-management/next.config.mjs` (`typescript.ignoreBuildErrors: true`).
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.github/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
