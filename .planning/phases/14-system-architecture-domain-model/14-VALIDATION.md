---
phase: 14
slug: system-architecture-domain-model
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-28
---

# Phase 14 — Validation Strategy

> Phase 14 is a documentation-only phase. All deliverables are Markdown + Mermaid diagram artifacts.
> There is no runnable test suite. Validation uses checklist-based grep verification instead of automated tests.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Grep-based checklist (documentation phase — no test runner) |
| **Config file** | none |
| **Quick run command** | `grep -c "## 1. System Architecture" .planning/phases/14-system-architecture-domain-model/SDD.md` |
| **Full suite command** | See Per-Task Verification Map below |
| **Estimated runtime** | < 5 seconds |

---

## Sampling Rate

- **After every task:** Run the task's `<verify>` grep command — must return count ≥ 1
- **After Plan 01:** Verify all §1.x subsections present in SDD.md
- **After Plan 02:** Verify all §2.x subsections present in SDD.md
- **Before verification:** Full checklist must pass (all greps return ≥ 1)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Validation Method | Automated Command | Status |
|---------|------|------|-------------|-------------------|-------------------|--------|
| T1 | 14-01 | 1 | ARCH-01, ARCH-02 | §1.1 has 5 named actors; §1.2 has 9+ modules | `grep -c "Administrator\|Manager\|Staff\|Python Sensor Simulator\|MQTT Broker" .planning/phases/14-system-architecture-domain-model/SDD.md` | ✅ Done (62) |
| T2 | 14-01 | 1 | ARCH-03, ARCH-04 | §1.3 has all 6 IoT hops; §1.4 has AI prohibition node | `grep -c "sensor_readings\|ai_recommendations\|NEVER WRITES\|⛔\|PROHIBIT" .planning/phases/14-system-architecture-domain-model/SDD.md` | ✅ Done (13) |
| T3 | 14-01 | 1 | ARCH-05, ARCH-06, ARCH-07 | §1.5 has 4 triggers; §1.6 has 5 services; §1.7 has QoS 1 + paho-mqtt v2 | `grep -c "reason_code\|properties\|QoS 1\|mosquitto\|iot-simulator" .planning/phases/14-system-architecture-domain-model/SDD.md` | ✅ Done (12) |
| T1 | 14-02 | 2 | DOMAIN-01, DOMAIN-02 | §2.1 permission matrix ≥12 rows; §2.2 has 5 lifecycle states | `grep -c "## 2\. Business Domain Model\|### 2\.1\|Permission Matrix\|stateDiagram-v2" .planning/phases/14-system-architecture-domain-model/SDD.md` | ✅ Done (5) |
| T2 | 14-02 | 2 | DOMAIN-03, DOMAIN-04 | §2.3 has Blocked state + AI ticket path; §2.4 has Manager-only guard + prohibition note | `grep -c "Blocked\|AI-triggered\|RBAC: Manager\|AI NEVER\|note right of" .planning/phases/14-system-architecture-domain-model/SDD.md` | ✅ Done (26) |
| T3 | 14-02 | 2 | DOMAIN-05, DOMAIN-06 | §2.5 erDiagram has 9 entities; §2.6 maps all 5 asset categories | `grep -c "erDiagram\|AuditEvents\|SensorReadings\|AIRecommendations\|Forklift\|Laptop\|Monitor\|Printer" .planning/phases/14-system-architecture-domain-model/SDD.md` | ✅ Done (20) |

---

## Full Suite Checklist (run before `/gsd-verify-work`)

| Req ID | Artifact | Validation Method | Pass Condition |
|--------|----------|-------------------|----------------|
| ARCH-01 | §1.1 System Context Diagram | Mermaid graph TB present; all 5 actors named | `grep -c "Administrator\|Manager\|Staff\|Python Sensor Simulator\|MQTT Broker" SDD.md` ≥ 5 |
| ARCH-02 | §1.2 Module Decomposition | Mermaid graph LR present; 9+ modules shown; forbidden deps annotated | `grep -c "forbidden\|NEVER\|module\|Module" SDD.md` ≥ 4 |
| ARCH-03 | §1.3 IoT Pipeline | Flowchart TD; all 6 hops; topic schema table; JSON payload block | `grep -c "assets/{asset_id}/sensors\|message_id\|sensor_type\|QoS" SDD.md` ≥ 4 |
| ARCH-04 | §1.4 AI Pipeline | ai_recommendations boundary explicit; prohibition node visible in diagram | `grep -c "ai_recommendations\|NEVER WRITES\|⛔\|PROHIBIT\|mutation" SDD.md` ≥ 3 |
| ARCH-05 | §1.5 Notification Pipeline | 4+ event trigger types listed; SSE endpoint named | `grep -c "high failure risk\|warranty expir\|overdue\|SSE\|EventSource" SDD.md` ≥ 3 |
| ARCH-06 | §1.6 Docker Topology | Exactly 5 services with port mappings | `grep -c "frontend\|backend\|postgres\|mosquitto\|iot-simulator" SDD.md` ≥ 5 |
| ARCH-07 | §1.7 MQTT Contract | Topic pattern; QoS 1; 6-field payload; paho-mqtt v2 5-arg signature | `grep -c "reason_code\|properties\|QoS 1\|5-arg\|on_connect" SDD.md` ≥ 3 |
| DOMAIN-01 | §2.1 Permission Matrix | Table; 3 role columns; ≥12 module rows; no blank cells | `grep -c "Administrator\|Manager\|Staff" SDD.md` ≥ 12 (rows) |
| DOMAIN-02 | §2.2 Asset Lifecycle SM | stateDiagram-v2; 5 states; companion transition table | `grep -c "Registered\|Available\|Assigned\|Maintenance\|Retired" SDD.md` ≥ 5 |
| DOMAIN-03 | §2.3 Maintenance Lifecycle SM | stateDiagram-v2; Blocked state; AI ticket creation path | `grep -c "Blocked\|AI-triggered\|Scheduled\|InProgress\|Completed" SDD.md` ≥ 5 |
| DOMAIN-04 | §2.4 AI Recommendation SM | Manager-only guard on Approve; AI mutation prohibition note | `grep -c "RBAC: Manager\|AI NEVER\|note right of\|Pending\|Approved\|Deferred" SDD.md` ≥ 4 |
| DOMAIN-05 | §2.5 Conceptual ER Diagram | erDiagram; all 9 entities; PKs/FKs; cardinality; no SQL DDL | `grep -c "erDiagram\|Assets\|Categories\|Assignments\|MaintenanceRecords\|SensorReadings\|AIRecommendations\|Notifications\|AuditEvents\|Users" SDD.md` ≥ 9 |
| DOMAIN-06 | §2.6 Sensor Category Mapping | Table; all 5 categories; all 6 sensor types; rationale | `grep -c "Laptop\|Monitor\|Printer\|Forklift\|Office Equipment\|temperature\|vibration" SDD.md` ≥ 7 |

---

## Wave 0 Gaps

- No test framework needed — documentation phase only.
- All verification is grep-based; no runtime environment required.
