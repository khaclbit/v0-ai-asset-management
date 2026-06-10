---
phase: 8
slug: maintenance-warranty-ui
status: partial
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler + Next build checks (documented in phase plans) |
| **Quick run command** | `cd v0-ai-asset-management && npx tsc --noEmit` |
| **Build command** | `cd v0-ai-asset-management && npm run build` |
| **Evidence source** | `08-01-PLAN.md`, `08-02-PLAN.md`, `08-01/02-SUMMARY.md` |
| **Estimated runtime** | Not preserved in summary logs |

---

## Sampling Rate

- **After each task (planned):** `npx tsc --noEmit` and/or `npm run build` per task verify block
- **Before final sign-off:** combined typecheck + build and interactive warning/jump walkthrough
- **Max feedback latency target:** not explicitly logged

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Threat Ref | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | MAINT-01 | T-08-02 | static/type | `cd v0-ai-asset-management && npx tsc --noEmit` | ✅ | ⚠️ evidence-only |
| 08-01-02 | 01 | MAINT-02 | T-08-02 | static/type | `cd v0-ai-asset-management && npx tsc --noEmit` | ✅ | ⚠️ evidence-only |
| 08-01-03 | 01 | MAINT-01, MAINT-02 | T-08-01, T-08-03 | build | `cd v0-ai-asset-management && npm run build` | ✅ | ⚠️ evidence-only |
| 08-02-01 | 02 | MAINT-03 | T-08-05 | static/type | `cd v0-ai-asset-management && npx tsc --noEmit` | ✅ | ⚠️ evidence-only |
| 08-02-02 | 02 | MAINT-04 | T-08-05, T-08-08 | build | `cd v0-ai-asset-management && npm run build` | ✅ | ⚠️ evidence-only |
| 08-02-03 | 02 | MAINT-03, MAINT-04 | T-08-05 | static+build | `cd v0-ai-asset-management && npx tsc --noEmit && npm run build` | ✅ | ⚠️ evidence-only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ evidence-only*

---

## Wave 0 Requirements

Wave 0 is incomplete because task-level command outputs were not preserved in 08 summaries; only objective/change summaries and self-check pass markers are present.

---

## Manual-Only Verifications

1. Visual immediacy of maintenance badge updates after state transitions.
2. Clarity of blocked-without-note validation UX and toast copy.
3. Warranty warning summary click-to-jump/focus behavior.

---

## Validation Audit 2026-06-10

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved | 0 |
| Escalated | 0 |

---

## Validation Sign-Off

- [x] Per-task map covers all tasks from 08-01 and 08-02 plans
- [x] Requirement mapping included for MAINT-01..04
- [x] Threat references anchored from plan threat model
- [ ] Preserved green command outputs per task in summary artifacts
- [ ] Human interaction sign-off checklist completed
- [x] `nyquist_compliant: false` set in frontmatter truthfully

**Approval:** pending (artifact backfilled; Nyquist evidence needs fresh validation run)
