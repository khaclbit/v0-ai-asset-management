# 04 OCR Confidence Human Gate Workflow

## Purpose

Define OCR-assisted intake orchestration with confidence-band routing, mandatory human confirmation, and error-handling safeguards.

## Scope Mapping

- **Requirement:** AINT-02
- **Locked decisions:** D-05, D-06, D-07, D-08, D-13, D-14, D-16

## Confidence Policy Table

| Band | Threshold | Action |
|---|---|---|
| High | `>=95%` | Prefill extracted fields and require quick human confirmation |
| Medium | `80-94%` | Require field-by-field human review before submission |
| Low | `<80%` | Reject extraction and trigger rescan path |

## Mandatory Human-Confirmed Fields

- Name
- Category
- Serial
- Purchase date
- Vendor
- Price

Asset creation is blocked until all required fields are explicitly confirmed by a permitted human approver.

## Sequence

1. **Invoice upload event** enters OCR Intake Orchestrator.
2. **OCR Extractor** returns extracted fields and confidence score.
3. **Confidence Router** maps score into High/Medium/Low policy branch.
4. **Human Review UI** enforces required-field confirmation before create.
5. **Authorization Check** verifies role-based approver eligibility.
6. **On approval:** registration payload is forwarded to the registration lifecycle workflow anchor.
7. **On low confidence or failed review:** route to rescan/error-handling path.
8. **Audit Emitter** records extraction snapshot, approver decision, and immutable correlation chain.

## Evidence Retention Model

For each OCR intake attempt, retain:

- Invoice file reference ID
- Extraction snapshot payload
- Confidence score and band
- Approver identity and role
- Decision rationale and timestamp
- Correlation ID for downstream lifecycle linkage

## Error Handling Paths

- **Low confidence:** hard stop -> rescan required.
- **Missing mandatory field confirmation:** hard stop -> review incomplete.
- **Unauthorized approver:** hard stop -> reject approval attempt.

## Requirement Traceability

| Requirement | Evidence in this artifact |
|---|---|
| AINT-02 | Confidence routing table, mandatory human confirmation, low-confidence rescan path, and retained evidence model |

