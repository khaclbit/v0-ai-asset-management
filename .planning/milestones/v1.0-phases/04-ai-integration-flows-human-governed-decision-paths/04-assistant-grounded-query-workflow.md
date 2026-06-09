# 04 Assistant Grounded Query Workflow

## Purpose

Define the architecture-level assistant flow from natural-language input to grounded, traceable, read-only response.

## Scope Mapping

- **Requirement:** AINT-01
- **Locked decisions:** D-01, D-02, D-03, D-04, D-13, D-14, D-16

## Sequence

1. **User submits NL query** through Assistant UI surface.
2. **Assistant Orchestrator** normalizes intent and builds allowed data query constraints.
3. **Grounding Guard** validates request scope against internal asset data domains only.
4. **Read Adapter** executes read-only retrieval against internal data interfaces.
5. **Sufficiency Evaluator** checks whether retrieved evidence is enough to answer.
6. **If sufficient:** Response Composer returns answer with provenance metadata.
7. **If insufficient:** Response Composer returns `insufficient data` and clarifying follow-up prompts.
8. **Audit Emitter** appends immutable recommendation event (query intent, provenance, correlation ID).

## Read-Only Enforcement Contract

- Assistant path MUST NOT invoke mutation interfaces.
- Any detected mutation intent is routed to a **human-initiated workflow requirement**.
- Backend authorization layer enforces mutation denial for assistant actor context.

## Response Contract (Required Fields)

```yaml
answer:
trace:
  source: internal-asset-data
  query: <generated data query statement or expression>
  filters: <effective constraints>
  correlation_id: <trace link key>
  generated_at: <iso timestamp>
confidence:
  sufficient_data: true|false
clarifying_questions: []
```

## Insufficient Data Branch

- Set `confidence.sufficient_data=false`.
- Populate `clarifying_questions` with minimum fields needed to proceed.
- Do not provide speculative assertions beyond grounded evidence.

## Security and Governance

- Approval operations are external to this flow and require role-based human actors.
- Every assistant recommendation event is append-only and correlation-linked to later human decisions.

## Requirement Traceability

| Requirement | Evidence in this artifact |
|---|---|
| AINT-01 | End-to-end NL->grounded-response flow with read-only boundary and trace metadata |

