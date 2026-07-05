# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript (5.7.3) - Application and UI code in `v0-ai-asset-management/app/**/*.tsx`, `v0-ai-asset-management/components/**/*.tsx`, and `v0-ai-asset-management/lib/**/*.ts`.

**Secondary:**
- JavaScript (ES modules) - Tooling/config files in `v0-ai-asset-management/next.config.mjs` and `v0-ai-asset-management/postcss.config.mjs`.
- CSS - Global styles and design tokens in `v0-ai-asset-management/app/globals.css`.

## Runtime

**Environment:**
- Node.js runtime required by Next.js (`next` 16.2.6 in `v0-ai-asset-management/package.json`, engines not explicitly pinned).
- Browser runtime for all app features; pages are client components (`"use client"`) in `v0-ai-asset-management/app/page.tsx` and dashboard pages.

**Package Manager:**
- npm/yarn/pnpm commands are documented in `v0-ai-asset-management/README.md`.
- `pnpm-lock.yaml` is present at `v0-ai-asset-management/pnpm-lock.yaml` (lockfile present; indicates pnpm was used for dependency resolution).
- `packageManager` field is not set in `v0-ai-asset-management/package.json` (exact required PM version is uncertain).

## Frameworks

**Core:**
- Next.js 16.2.6 - App framework and routing (`v0-ai-asset-management/package.json`, `v0-ai-asset-management/app/`).
- React 19.x / React DOM 19.x - UI runtime (`v0-ai-asset-management/package.json`).

**Testing:**
- Not detected. No Jest/Vitest/Playwright/Cypress config files and no `*.test.*`/`*.spec.*` files found in `v0-ai-asset-management/`.

**Build/Dev:**
- TypeScript 5.7.3 (`v0-ai-asset-management/package.json`, compiler options in `v0-ai-asset-management/tsconfig.json`).
- Tailwind CSS 4 + PostCSS (`v0-ai-asset-management/package.json`, `v0-ai-asset-management/postcss.config.mjs`, `v0-ai-asset-management/app/globals.css`).
- shadcn UI tooling + Base UI primitives (`v0-ai-asset-management/components.json`, `v0-ai-asset-management/components/ui/*`).
- ESLint is invoked by script (`"lint": "eslint ."` in `v0-ai-asset-management/package.json`), but explicit eslint config file is not detected.

## Key Dependencies

**Critical:**
- `next` 16.2.6 - framework, routing, production build (`v0-ai-asset-management/package.json`).
- `react` / `react-dom` 19 - rendering and hooks (`v0-ai-asset-management/package.json`).
- `@base-ui/react` - primitive UI controls used throughout `v0-ai-asset-management/components/ui/*.tsx`.
- `recharts` 3.8.0 - dashboard charts in `v0-ai-asset-management/app/dashboard/page.tsx` and `v0-ai-asset-management/app/dashboard/reports/page.tsx`.
- `sonner` - toast notifications in `v0-ai-asset-management/app/dashboard/borrow/page.tsx` and `v0-ai-asset-management/app/dashboard/ocr/page.tsx`.

**Infrastructure:**
- `@vercel/analytics` 1.6.1 - production analytics script in `v0-ai-asset-management/app/layout.tsx`.
- `next-themes` - theme-aware toast rendering in `v0-ai-asset-management/components/ui/sonner.tsx`.
- `clsx` + `tailwind-merge` - className composition helper in `v0-ai-asset-management/lib/utils.ts`.

## Configuration

**Environment:**
- Runtime environment check uses `process.env.NODE_ENV` in `v0-ai-asset-management/app/layout.tsx` to gate analytics.
- `.env*.local` is ignored per `v0-ai-asset-management/.gitignore`; no concrete env var keys are declared in the codebase beyond `NODE_ENV`.

**Build:**
- Next config in `v0-ai-asset-management/next.config.mjs`:
  - `typescript.ignoreBuildErrors: true`
  - `images.unoptimized: true`
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

**Development:**
- Node.js + package manager (npm/yarn/pnpm) to run `dev`, `build`, `start`, `lint` scripts in `v0-ai-asset-management/package.json`.
- Modern browser for client-side features (all main pages are client components).

**Production:**
- Next.js-compatible Node hosting. Edge/serverless-specific adapters are not configured in repository files.

## Notable Versioning Constraints

- Exact pins: `next` 16.2.6, `recharts` 3.8.0, `typescript` 5.7.3, `@vercel/analytics` 1.6.1 (`v0-ai-asset-management/package.json`).
- Major-range deps: React `^19`, Node typings `^24`, Tailwind `^4.2.0`.
- Build tolerates TypeScript errors due to `ignoreBuildErrors: true` in `v0-ai-asset-management/next.config.mjs`.

---

*Stack analysis: 2026-06-09*
