# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:**
- Not detected.
- Config: Not detected (`jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*` not found in `v0-ai-asset-management/`).

**Assertion Library:**
- Not detected.

**Run Commands:**
```bash
# Not available: no "test" script in `v0-ai-asset-management/package.json`
npm run lint          # Only defined automated quality script
npm run build         # Build-level smoke validation
npm run dev           # Fast manual validation loop
```

## Test File Organization

**Location:**
- No test files detected (`find . -name "*.test.*" -o -name "*.spec.*"` returned no results in `v0-ai-asset-management/`).

**Naming:**
- Not applicable (no test files detected).

**Structure:**
```
No dedicated test directories (e.g., __tests__) detected.
```

## Test Structure

**Suite Organization:**
```typescript
// Not applicable: no describe()/it()/test() usage found in `app/`, `components/`, or `lib/`.
```

**Patterns:**
- Setup pattern: Not detected.
- Teardown pattern: Not detected.
- Assertion pattern: Not detected.

## Mocking

**Framework:** Not detected

**Patterns:**
```typescript
// Not applicable: no mocking framework usage detected.
```

**What to Mock:**
- No repository pattern established yet.

**What NOT to Mock:**
- No repository pattern established yet.

## Fixtures and Factories

**Test Data:**
```typescript
// No formal test fixtures/factories.
// Demo seed data is embedded in runtime modules:
// - `lib/data.ts` (assets, employees, borrowRecords)
// - `app/dashboard/ocr/page.tsx` (SAMPLE_INVOICES)
```

**Location:**
- Runtime demo data in `lib/data.ts` and `app/dashboard/ocr/page.tsx`; no test-only fixture directory detected.

## Coverage

**Requirements:** None enforced (no coverage tooling or thresholds detected).

**View Coverage:**
```bash
# Not available: no coverage command configured
```

## Test Types

**Unit Tests:**
- Not used (no unit test files/config detected).

**Integration Tests:**
- Not used (no integration test framework/config detected).

**E2E Tests:**
- Not used (Playwright/Cypress config not detected).

## Quality and Coverage Signals

- TypeScript strict mode is enabled in `tsconfig.json` (`"strict": true`) but build enforcement is reduced by `typescript.ignoreBuildErrors: true` in `next.config.mjs`.
- Core business logic currently has no automated checks, including:
  - State mutations in `lib/store.tsx` (`borrowAsset`, `returnAsset`, `disposeAsset`).
  - Domain calculations in `lib/data.ts` (`depreciation`, `warrantyMonthsLeft`, `failureRisk`).
  - NL query branching in `lib/assistant.ts` (`runAssistant`).

## Gaps and High-Risk Untested Areas

- `lib/store.tsx`: state-transition regressions can silently break borrow/return/disposal flows.
- `lib/assistant.ts`: keyword-matching and query text generation have many branches and no branch coverage.
- `app/dashboard/assets/page.tsx`: role-gated destructive actions (dispose/update) are only manually guarded in UI.
- `app/dashboard/ocr/page.tsx`: OCR simulation and asset creation flow rely on asynchronous timers and random IDs with no deterministic checks.
- `app/dashboard/reports/page.tsx`: derived aggregations/charts can drift without snapshot/value assertions.

## Common Patterns

**Async Testing:**
```typescript
// Not applicable: no async tests implemented.
```

**Error Testing:**
```typescript
// Not applicable: no error-path tests implemented.
```

## Fastest Way to Run Core Test Loops

1. Run `npm run dev` from `v0-ai-asset-management/`.
2. Manually validate login and role gating via `app/page.tsx` and `app/dashboard/layout.tsx`.
3. Smoke-check critical flows in browser:
   - Asset CRUD/disposal in `app/dashboard/assets/page.tsx`
   - Borrow/return in `app/dashboard/borrow/page.tsx`
   - Assistant responses in `app/dashboard/assistant/page.tsx`
   - OCR create-asset flow in `app/dashboard/ocr/page.tsx`
4. Run `npm run build` and `npm run lint` as final automated checks.

---

*Testing analysis: 2026-06-09*
