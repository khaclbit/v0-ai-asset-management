# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**Analytics/Telemetry:**
- Vercel Analytics - Client analytics loaded only in production.
  - SDK/Client: `@vercel/analytics` imported in `v0-ai-asset-management/app/layout.tsx`
  - Auth: Not detected (no API key usage in repository code)

**UI/Icon Libraries (package integrations):**
- Lucide icon library - icon components imported across `v0-ai-asset-management/app/**/*.tsx` and `v0-ai-asset-management/components/**/*.tsx`.
  - SDK/Client: `lucide-react`
  - Auth: Not applicable
- Base UI primitives - component primitives imported in `v0-ai-asset-management/components/ui/*.tsx`.
  - SDK/Client: `@base-ui/react`
  - Auth: Not applicable

## Data Storage

**Databases:**
- Not detected.
  - Connection: Not applicable
  - Client: Not applicable

**File Storage:**
- Browser local object URLs for uploaded files in OCR page (`URL.createObjectURL` in `v0-ai-asset-management/app/dashboard/ocr/page.tsx`).
- No remote file storage SDK/client detected.

**Caching:**
- None detected.

## Authentication & Identity

**Auth Provider:**
- Custom demo-only client auth (no external identity provider).
  - Implementation: `login(email, role)` in `v0-ai-asset-management/lib/store.tsx` stores user in React state only.
  - Route protection: Dashboard layout redirects unauthenticated users in `v0-ai-asset-management/app/dashboard/layout.tsx`.
  - Credentials are not validated against backend/API (`v0-ai-asset-management/app/page.tsx`).

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Bugsnag/Datadog imports).

**Logs:**
- Dedicated logging framework not detected.
- User-facing notifications use toast messages via `sonner` in `v0-ai-asset-management/app/dashboard/borrow/page.tsx` and `v0-ai-asset-management/app/dashboard/ocr/page.tsx`.

## CI/CD & Deployment

**Hosting:**
- Vercel-linked workflow is indicated in `v0-ai-asset-management/README.md` (auto deploy on merge to `main`).
- `.vercel/` is ignored in `v0-ai-asset-management/.gitignore`.

**CI Pipeline:**
- Not detected in repository (no GitHub Actions/workflow files or other CI config in current tree snapshot).

## Internal Module Boundaries and Key Interfaces

**Presentation Layer:**
- Route pages in `v0-ai-asset-management/app/**/page.tsx` handle user interactions and rendering.
- Shared UI components in `v0-ai-asset-management/components/` and `v0-ai-asset-management/components/ui/`.

**State/Domain Layer:**
- `StoreProvider` and `useStore()` in `v0-ai-asset-management/lib/store.tsx` are the central in-memory data interface.
- Domain models and seed data are defined in `v0-ai-asset-management/lib/data.ts` (`Asset`, `BorrowRecord`, `Employee`).

**AI/OCR Feature Layer (simulated):**
- Assistant logic is local and synchronous in `v0-ai-asset-management/lib/assistant.ts`.
- OCR flow is simulated client-side with static samples in `v0-ai-asset-management/app/dashboard/ocr/page.tsx`.

## Environment Configuration

**Required env vars:**
- `NODE_ENV` is read in `v0-ai-asset-management/app/layout.tsx` to enable analytics in production.
- No additional required env vars are explicitly referenced in source files.

**Secrets location:**
- `.env*.local` pattern is ignored in `v0-ai-asset-management/.gitignore`.
- No committed secret files are used by runtime code in this repository snapshot.

## Inbound/Outbound Data Flows

**Incoming:**
- User form input enters via login form (`v0-ai-asset-management/app/page.tsx`), asset forms (`v0-ai-asset-management/components/asset-form-dialog.tsx`), borrow/return flows (`v0-ai-asset-management/app/dashboard/borrow/page.tsx`), and OCR upload (`v0-ai-asset-management/app/dashboard/ocr/page.tsx`).
- Uploaded file data is handled locally in browser memory; no upload request is sent to an external API.

**Outgoing:**
- Analytics events are sent through Vercel Analytics when running in production (`v0-ai-asset-management/app/layout.tsx`).
- No `fetch`/`axios`/GraphQL/RPC calls detected in `v0-ai-asset-management/app`, `v0-ai-asset-management/components`, or `v0-ai-asset-management/lib`.

## Failure and Retry/Error Boundaries

**Current boundaries:**
- Store hook enforces provider usage by throwing if context is missing (`useStore` in `v0-ai-asset-management/lib/store.tsx`).
- Several guards short-circuit on invalid state (e.g., missing asset/fields in `v0-ai-asset-management/lib/store.tsx` and `v0-ai-asset-management/app/dashboard/ocr/page.tsx`).
- Dashboard access fallback is handled by redirect + temporary loading state in `v0-ai-asset-management/app/dashboard/layout.tsx`.

**Retry behavior:**
- No network retry logic is implemented because network calls are not present.
- Simulated async operations (`setTimeout`) in assistant/OCR features do not include timeout cancellation or retry policies (`v0-ai-asset-management/app/dashboard/assistant/page.tsx`, `v0-ai-asset-management/app/dashboard/ocr/page.tsx`).

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook endpoints or API routes under `v0-ai-asset-management/app/api`).

**Outgoing:**
- None explicitly implemented. External callback behavior is limited to analytics integration in `v0-ai-asset-management/app/layout.tsx`.

---

*Integration audit: 2026-06-09*
