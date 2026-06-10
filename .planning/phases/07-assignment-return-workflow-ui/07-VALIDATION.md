---
phase: 7
slug: assignment-return-workflow-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
---

# Phase 7 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | none detected |
| Config file | none |
| Quick run command | `npm run lint` |
| Full suite command | `npm run build` |
| Estimated runtime | ~60 seconds |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | ASGN-01 | build + manual | `npm run lint` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | ASGN-02/03 | build + manual | `npm run build` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | ASGN-04/05 | build + manual | `npm run lint` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | ASGN-06 | build + manual | `npm run build` | ❌ W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] Create manual test checklist for ASGN-01..06 interactions.
- [ ] Add lightweight automated tests for assignment lifecycle transitions.

## Validation Sign-Off

- [ ] All planned tasks have explicit verify commands
- [ ] Wave 0 gaps documented
- [ ] `nyquist_compliant: true` set after execution evidence

**Approval:** pending
