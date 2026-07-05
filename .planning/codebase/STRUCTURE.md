# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
AI_Management_System/
├── .planning/codebase/            # Generated analysis docs consumed by GSD workflows
└── v0-ai-asset-management/         # Main Next.js application source
    ├── app/                        # App Router routes, layouts, global CSS
    ├── components/                 # Shared feature components + UI primitives
    │   └── ui/                     # Reusable shadcn-style primitive components
    ├── lib/                        # Shared state, domain models/data, helpers
    ├── public/                     # Static assets/icons/placeholders
    ├── package.json                # Scripts and dependency manifest
    ├── tsconfig.json               # TypeScript config + `@/*` alias
    ├── next.config.mjs             # Next.js config
    └── postcss.config.mjs          # Tailwind PostCSS plugin config
```

## Directory Purposes

**`v0-ai-asset-management/app`:**
- Purpose: Route tree and page-level composition.
- Contains: Root layout/login page (`app/layout.tsx`, `app/page.tsx`), dashboard layout and feature routes under `app/dashboard/`.
- Key files: `v0-ai-asset-management/app/layout.tsx`, `v0-ai-asset-management/app/dashboard/layout.tsx`, `v0-ai-asset-management/app/dashboard/assets/page.tsx`.

**`v0-ai-asset-management/components`:**
- Purpose: Reusable presentation and shell components.
- Contains: Business-shared widgets (`sidebar.tsx`, `topbar.tsx`, `asset-form-dialog.tsx`, `status-badge.tsx`).
- Key files: `v0-ai-asset-management/components/sidebar.tsx`, `v0-ai-asset-management/components/asset-form-dialog.tsx`.

**`v0-ai-asset-management/components/ui`:**
- Purpose: Low-level design-system primitives.
- Contains: Button/input/dialog/select/table/chart wrappers and other primitives.
- Key files: `v0-ai-asset-management/components/ui/button.tsx`, `v0-ai-asset-management/components/ui/dialog.tsx`, `v0-ai-asset-management/components/ui/chart.tsx`.

**`v0-ai-asset-management/lib`:**
- Purpose: Shared state, domain types/data, utility and assistant logic.
- Contains: Context store (`store.tsx`), domain models + seed data (`data.ts`), assistant simulation (`assistant.ts`), class helper (`utils.ts`).
- Key files: `v0-ai-asset-management/lib/store.tsx`, `v0-ai-asset-management/lib/data.ts`, `v0-ai-asset-management/lib/assistant.ts`.

**`v0-ai-asset-management/public`:**
- Purpose: Static files served directly by Next.js.
- Contains: Icons, logos, placeholder images.
- Key files: `v0-ai-asset-management/public/icon.svg`, `v0-ai-asset-management/public/placeholder-user.jpg`.

## Key File Locations

**Entry Points:**
- `v0-ai-asset-management/app/layout.tsx`: Global app wrapper and provider registration.
- `v0-ai-asset-management/app/page.tsx`: Login route (`/`).
- `v0-ai-asset-management/app/dashboard/layout.tsx`: Dashboard auth gate and shell.
- `v0-ai-asset-management/app/dashboard/page.tsx`: Dashboard overview route.

**Configuration:**
- `v0-ai-asset-management/package.json`: Scripts/dependencies.
- `v0-ai-asset-management/tsconfig.json`: Strict TS and alias `@/*`.
- `v0-ai-asset-management/next.config.mjs`: Next.js build/image/typescript behavior.
- `v0-ai-asset-management/components.json`: shadcn alias/style registry.
- `v0-ai-asset-management/postcss.config.mjs`: Tailwind PostCSS pipeline.

**Core Logic:**
- `v0-ai-asset-management/lib/store.tsx`: In-memory auth + asset/borrow mutation API.
- `v0-ai-asset-management/lib/data.ts`: Domain types, seed data, finance/risk helpers.
- `v0-ai-asset-management/lib/assistant.ts`: NL-query simulation engine.

**Testing:**
- Not detected: no `*.test.*`, `*.spec.*`, or test config files found under `v0-ai-asset-management/`.

## Naming Conventions

**Files:**
- Route files follow App Router convention: `page.tsx` and `layout.tsx` (e.g., `v0-ai-asset-management/app/dashboard/reports/page.tsx`).
- Shared component files use kebab-case (e.g., `v0-ai-asset-management/components/status-badge.tsx`).
- Utility/domain files in `lib/` use short lowercase names (e.g., `v0-ai-asset-management/lib/data.ts`).

**Directories:**
- Feature routes are path-based and nested by URL segment under `app/dashboard/*`.
- Shared UI primitives are centralized in `components/ui`.

## Where to Add New Code

**New Feature:**
- Primary code: add route/page under `v0-ai-asset-management/app/dashboard/<feature>/page.tsx` for dashboard functionality, or under `v0-ai-asset-management/app/<segment>/page.tsx` for top-level routes.
- Tests: no existing test location pattern detected; uncertainty: establish a new convention before adding tests.

**New Component/Module:**
- Implementation: place reusable business component in `v0-ai-asset-management/components/`; place primitive/generic UI in `v0-ai-asset-management/components/ui/`.

**Utilities:**
- Shared helpers/domain logic: `v0-ai-asset-management/lib/`.
- Stateful app-wide behavior: extend `v0-ai-asset-management/lib/store.tsx` (current pattern), while noting current tight coupling.

## Entry Points and Initialization Flow

1. Next.js bootstraps `v0-ai-asset-management/app/layout.tsx`.
2. `StoreProvider` from `v0-ai-asset-management/lib/store.tsx` wraps all routes.
3. User lands on `v0-ai-asset-management/app/page.tsx` and triggers login.
4. Navigation to `/dashboard` activates `v0-ai-asset-management/app/dashboard/layout.tsx` guard.
5. Feature route (`assets`, `borrow`, `reports`, `assistant`, `ocr`) renders and consumes shared store/helpers.

## Cross-Cutting Utilities/Shared Code

- `v0-ai-asset-management/lib/utils.ts`: `cn()` utility used broadly across UI and components.
- `v0-ai-asset-management/components/status-badge.tsx`: shared status rendering across dashboard views.
- `v0-ai-asset-management/components/topbar.tsx` and `v0-ai-asset-management/components/sidebar.tsx`: consistent app shell.
- `v0-ai-asset-management/components/ui/chart.tsx`: shared chart wrapper used in dashboard/reports pages.

## Special Directories

**`.planning/codebase`:**
- Purpose: GSD-generated reference documents.
- Generated: Yes.
- Committed: Yes (existing `STACK.md`, `INTEGRATIONS.md` are present).

**`v0-ai-asset-management/public`:**
- Purpose: Static assets served as-is.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-06-09*
