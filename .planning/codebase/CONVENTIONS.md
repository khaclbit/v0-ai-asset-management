# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**Files:**
- Use route-convention filenames in `app/` (`page.tsx`, `layout.tsx`) and kebab-case component filenames such as `components/asset-form-dialog.tsx` and `components/status-badge.tsx`.
- Use lower-case utility UI filenames under `components/ui/` such as `components/ui/button.tsx` and `components/ui/dialog.tsx`.

**Functions:**
- Use PascalCase for React components (for example `DashboardPage` in `app/dashboard/page.tsx`, `AssetFormDialog` in `components/asset-form-dialog.tsx`).
- Use camelCase for helpers and handlers (for example `formatVND` in `lib/data.ts`, `handleSubmit` in `app/page.tsx`, `runAssistant` in `lib/assistant.ts`).

**Variables:**
- Use camelCase for local variables/state (`borrowRecords`, `disposeTarget`, `defaultDue`) in files like `lib/store.tsx` and `app/dashboard/borrow/page.tsx`.
- Use UPPER_SNAKE_CASE for constants (`CATEGORIES`, `SAMPLE_INVOICES`, `NAV`) in `lib/data.ts`, `app/dashboard/ocr/page.tsx`, `components/sidebar.tsx`.

**Types:**
- Use PascalCase for types and aliases (`Asset`, `BorrowRecord`, `AssistantResult`, `StoreContextValue`) in `lib/data.ts`, `lib/assistant.ts`, `lib/store.tsx`.
- Use string-literal unions for domain states (`AssetStatus`, `Role`) in `lib/data.ts`, `app/page.tsx`.

## Code Style

**Formatting:**
- No Prettier config detected at project root (`v0-ai-asset-management/.prettierrc*` not found).
- Most app/domain files follow semicolon-free formatting and double-quoted strings (for example `app/dashboard/assets/page.tsx`, `lib/store.tsx`).
- Generated UI primitives use many single-quoted strings in some files (for example `components/ui/button.tsx`, `lib/utils.ts`), so quote style is currently mixed.

**Linting:**
- `package.json` defines `"lint": "eslint ."` in `v0-ai-asset-management/package.json`.
- No explicit ESLint config file detected (`.eslintrc*` and `eslint.config.*` absent at repo root).
- Inline suppression appears in `app/dashboard/ocr/page.tsx` (`// eslint-disable-next-line @next/next/no-img-element`).
- Uncertainty: `eslint` is not declared in `package.json` dependencies/devDependencies, so lint runtime behavior depends on external/tooling context.

## Import Organization

**Order:**
1. React/Next or external packages first (for example `react`, `next/navigation`, `lucide-react`) in `app/dashboard/assets/page.tsx` and `app/layout.tsx`.
2. Internal alias imports (`@/components/...`, `@/lib/...`) next.
3. `type` imports are used inline when needed (for example `type AssistantResult` in `app/dashboard/assistant/page.tsx`, `type Metadata` in `app/layout.tsx`).

**Path Aliases:**
- Use `@/*` alias via `tsconfig.json` (`"paths": { "@/*": ["./*"] }`).
- Additional alias conventions documented in `components.json` (`components`, `ui`, `lib`, `utils`, `hooks`).

## Error Handling

**Patterns:**
- Prefer guard clauses and early returns (`if (!text || thinking) return` in `app/dashboard/assistant/page.tsx`; `if (!fields) return` in `app/dashboard/ocr/page.tsx`).
- Throw explicit invariant error for missing provider (`useStore must be used within StoreProvider`) in `lib/store.tsx`.
- No `try/catch`-based error recovery patterns detected in `app/`, `components/`, or `lib/`.

## Logging

**Framework:** console

**Patterns:**
- No active `console.*` logging found in `app/`, `components/`, `lib/`.
- Use UI toast notifications (`toast.success`) for user-visible operation feedback in `app/dashboard/assets/page.tsx`, `app/dashboard/borrow/page.tsx`, and `app/dashboard/ocr/page.tsx`.

## Comments

**When to Comment:**
- Use brief section comments for UI grouping (for example `/* Toolbar */`, `/* Active borrows */`) in `app/dashboard/assets/page.tsx` and `app/dashboard/borrow/page.tsx`.
- Use short Vietnamese explanatory comments for demo logic (for example OCR simulation in `app/dashboard/ocr/page.tsx`, AI simulation in `lib/assistant.ts`).

**JSDoc/TSDoc:**
- Not detected in inspected TypeScript files (`app/`, `components/`, `lib/`).

## Function Design

**Size:**
- Keep feature pages as large orchestrator components with local helper functions (for example `AssetsPage` in `app/dashboard/assets/page.tsx`, `ReportsPage` in `app/dashboard/reports/page.tsx`).
- Keep shared utility functions compact and single-purpose (`cn` in `lib/utils.ts`, `formatDate` in `lib/data.ts`).

**Parameters:**
- Pass props as typed object parameters for components (`{ title, subtitle }`, `{ open, onOpenChange, initial, onSave }`) in `components/topbar.tsx`, `components/asset-form-dialog.tsx`.
- Use generic keyed updaters for typed form state (`updateField<K extends keyof ExtractedFields>`) in `app/dashboard/ocr/page.tsx`.

**Return Values:**
- Return JSX for components and plain objects for domain helpers (for example `depreciation`, `failureRisk` in `lib/data.ts`).
- Return unchanged state when preconditions fail in reducers/setters (for example `if (!asset) return prev` in `lib/store.tsx`).

## Module Design

**Exports:**
- Use default exports for route pages (`app/**/page.tsx`).
- Use named exports for shared modules/components (`lib/data.ts`, `components/status-badge.tsx`, `components/ui/button.tsx`).

**Barrel Files:**
- Not detected; modules import direct file paths (for example `@/components/ui/button`, `@/lib/store`).

## Config Management Patterns

- Keep compile/runtime config in root config files (`tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`).
- Keep UI and seed/demo config as TypeScript constants (`lib/data.ts`, `components/sidebar.tsx`, `app/dashboard/ocr/page.tsx`).
- Use environment checks minimally; only `process.env.NODE_ENV` usage detected in `app/layout.tsx`.

## Inconsistencies to Watch

- Mixed quote style between generated UI primitives (`components/ui/button.tsx`, `lib/utils.ts`) and app pages (`app/dashboard/*.tsx`).
- Type safety is weakened at build time because `next.config.mjs` sets `typescript.ignoreBuildErrors: true`.
- Lint command exists in `package.json` but project-level ESLint config is not present; treat lint setup as uncertain until verified in runtime.

---

*Convention analysis: 2026-06-09*
