---
phase: 9
slug: ai-governance-uis
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-10
---

# Phase 9 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| User input -> assistant evaluator | Untrusted natural-language query enters assistant response generation path. | User-provided text, query context |
| Uploaded file metadata -> OCR extraction flow | Untrusted upload metadata and extracted values flow into confirmation/submission UX. | File metadata, extracted asset fields |
| Store role state -> predictive action controls | Role context controls mutation capability for high-risk recommendations. | Role identity, action intents |
| Recommendation metadata -> escalation rendering | Computed SLA and risk metadata determines escalation visibility. | Risk score, confidence score, SLA timestamps |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-01 | Tampering | `lib/assistant.ts` | mitigate | Enforced typed response variants and fixed metadata fields. | closed |
| T-09-02 | Information Disclosure | `components/ai-trace-panel.tsx`, `assistant/page.tsx` | mitigate | Render only known provenance fields in collapsed read-only panel. | closed |
| T-09-03 | Spoofing/Semantics Drift | `lib/ai-governance.ts` | mitigate | Centralized confidence thresholds and `Correlation ID` labeling. | closed |
| T-09-04 | Denial of Service | `assistant/page.tsx` | accept | Mock in-memory bounded assistant interactions accepted for v1.1 UI-only scope. | closed |
| T-09-05 | Tampering | `ocr/page.tsx` | mitigate | Submit disabled until mandatory fields explicitly confirmed. | closed |
| T-09-06 | Elevation of Privilege | `ocr/page.tsx` | mitigate | Low-confidence branch is submit-blocked with explicit guards. | closed |
| T-09-07 | Repudiation | `ocr/page.tsx` | mitigate | Deterministic branch toasts and visible confidence-state messaging. | closed |
| T-09-08 | Information Disclosure | `ocr/page.tsx`, `ai-trace-panel.tsx` | mitigate | Provenance rendered read-only in collapsed trace panel. | closed |
| T-09-09 | Elevation of Privilege | `predictive/page.tsx` | mitigate | Role checks in both button visibility and action handlers. | closed |
| T-09-10 | Tampering | `lib/predictive.ts` | mitigate | Explicit deterministic comparator (risk desc -> confidence desc). | closed |
| T-09-11 | Information Disclosure | `predictive/page.tsx` | accept | Non-PII mock dataset accepted for UI-governance demonstration scope. | closed |
| T-09-12 | Repudiation | `lib/predictive.ts`, `predictive/page.tsx` | mitigate | Deterministic SLA/overdue computation with explicit escalation status rendering. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-09-04 | Assistant DoS concern is low for bounded mock data in v1.1; no production backend exposure in this phase. | User | 2026-06-10 |
| AR-09-02 | T-09-11 | Predictive metadata is non-PII mock data and intentionally visible for governance UX validation. | User | 2026-06-10 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-10 | 12 | 12 | 0 | gsd-security-auditor + orchestrator |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-10
