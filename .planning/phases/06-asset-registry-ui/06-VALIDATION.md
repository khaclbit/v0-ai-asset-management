---
phase: 6
slug: asset-registry-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none detected (manual checks + Next build) |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build` + manual ASSET-01..06 checklist |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build` + manual ASSET checklist for changed behaviors
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | ASSET-01 | T-06-01 | Lifecycle badges visible in paginated list | build + manual | `npm run build` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | ASSET-05 | T-06-02 | Category/status filters combine correctly | build + manual | `npm run build` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | ASSET-06 | T-06-03 | Search by name/serial works with debounce | build + manual | `npm run build` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | ASSET-02 | T-06-04 | Create form enforces required fields by role | build + manual | `npm run build` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | ASSET-03 | T-06-05 | Edit form prefilled and saves changes | build + manual | `npm run build` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | ASSET-04 | T-06-06 | Admin-only retire with confirmation dialog | build + manual | `npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `v0-ai-asset-management/tests/manual-asset-registry-checklist.md` — manual verification checklist for ASSET-01..06
- [ ] Validate whether lint should be restored before execution (`npm run lint` currently may be unavailable in local toolchain)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Row click opens edit dialog with prefilled data | ASSET-03 | UI interaction flow | Open assets page, click row, verify form shows existing values |
| Admin-only retire visibility and action | ASSET-04 | Role-gated UI behavior | Login as Admin/Asset Manager/Staff and verify retire control availability |
| Combined filter + debounced search behavior | ASSET-05, ASSET-06 | Interaction timing/state behavior | Apply both filters and search; verify results update correctly and clear resets all |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
