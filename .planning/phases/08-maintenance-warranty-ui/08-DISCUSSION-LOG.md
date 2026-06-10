# Phase 8: Maintenance & Warranty UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 8-Maintenance & Warranty UI
**Areas discussed:** Maintenance list UX, State update flow, Warranty tracker behavior, Expiry warning style

---

## Maintenance list UX

| Option | Description | Selected |
|--------|-------------|----------|
| Group by status with section headers | Organize records under status blocks. | ✓ |
| Single flat table sorted by nearest scheduled date | Single list view without section grouping. | |
| Group by priority (High/Medium/Low) | Organize by priority buckets first. | |

**User's choice:** Group by status with section headers  
**Notes:** Keep list scannable by state progression.

| Option | Description | Selected |
|--------|-------------|----------|
| Asset + type + priority + scheduled date + status + short note | Balanced detail level in row. | ✓ |
| Minimal row | Asset + status + scheduled date only. | |
| Dense row | Include full notes and completed date inline. | |

**User's choice:** Asset + type + priority + scheduled date + status + short note  
**Notes:** Enough context without forcing modal opens.

| Option | Description | Selected |
|--------|-------------|----------|
| Earliest scheduled date first | Timeline-first sorting. | ✓ |
| High priority first, then date | Priority-first sorting. | |
| Newest created first | Recency-first sorting. | |

**User's choice:** Earliest scheduled date first  
**Notes:** Supports operational scheduling flow.

| Option | Description | Selected |
|--------|-------------|----------|
| Red-tinted row + blocked badge + inline blocking note | Strong emphasis with reason visible. | ✓ |
| Blocked badge only | Lightweight status-only signal. | |
| Separate blocked tab | Isolate blocked items into another view. | |

**User's choice:** Red-tinted row + blocked badge + show blocking note inline  
**Notes:** Blockers should be obvious and actionable in-place.

---

## State update flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline status control + optional detail modal for notes | Fast status changes with optional deeper edit. | ✓ |
| Detail modal only | All updates done in modal. | |
| Bulk toolbar actions | Multi-row status updates from toolbar. | |

**User's choice:** Inline status control in each row + optional detail modal for notes  
**Notes:** Prefer speed for common updates.

| Option | Description | Selected |
|--------|-------------|----------|
| Enforce logical transitions | `scheduled -> in_progress -> completed`, `blocked -> in_progress`. | ✓ |
| Allow any transition | No lifecycle constraints. | |
| Only prevent scheduled -> completed | Partial rule enforcement. | |

**User's choice:** Enforce logical transitions  
**Notes:** Keep lifecycle realistic and predictable.

| Option | Description | Selected |
|--------|-------------|----------|
| Optional notes generally; required when blocked | Lightweight default with enforced blocker rationale. | ✓ |
| Always require note | Full audit note requirement. | |
| Never ask for note | No update comments captured. | |

**User's choice:** Optional note for all changes; required when setting blocked  
**Notes:** Capture blocker cause without overloading normal updates.

| Option | Description | Selected |
|--------|-------------|----------|
| Instant badge update + success toast | Immediate feedback and confirmation. | ✓ |
| Success toast only | No instant row visual refresh expectation. | |
| Soft full-list refresh only | Refresh list after update without toast. | |

**User's choice:** Instant row badge update + success toast  
**Notes:** Preserve current UI feedback pattern.

---

## Warranty tracker behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Urgency-first (`expiring_soon -> expired -> active -> void`) | Puts action-needed assets first. | ✓ |
| Alphabetical by asset name | Name-based browsing. | |
| Latest end date first | Longest remaining warranty first. | |

**User's choice:** Urgency-first ordering  
**Notes:** Prioritize operational risk visibility.

| Option | Description | Selected |
|--------|-------------|----------|
| Search + status filter + clear filters | Full basic tracker controls. | ✓ |
| Status filter only | Reduced controls. | |
| No controls | Static list only. | |

**User's choice:** Search (asset/provider) + status filter + clear filters  
**Notes:** Matches prior list UX conventions.

| Option | Description | Selected |
|--------|-------------|----------|
| End date + days-left / expired-days label | Date plus urgency context. | ✓ |
| End date only | Date context without relative urgency. | |
| Status badge only | Minimal state-only visibility. | |

**User's choice:** Show end date + days left badge (or "Expired X days ago")  
**Notes:** Keep urgency interpretable at a glance.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep void entries in same list with muted style + reason | Preserve full record visibility. | ✓ |
| Hide void by default | Show only if filtered. | |
| Separate void table | Dedicated segment for void items. | |

**User's choice:** Show in same list with muted styling and reason text  
**Notes:** Avoid hidden lifecycle records.

---

## Expiry warning style

| Option | Description | Selected |
|--------|-------------|----------|
| Top summary alert + highlighted tracker rows | Dual-surface visibility. | ✓ |
| Top summary alert only | Single global warning surface. | |
| Row highlight only | In-table warning only. | |

**User's choice:** Both top summary alert + highlighted rows in tracker  
**Notes:** Ensure warnings are visible in overview and detail contexts.

| Option | Description | Selected |
|--------|-------------|----------|
| Two tiers: 0-7 critical, 8-30 warning | Severity gradient within 30-day window. | ✓ |
| One style for all <=30 days | No severity differentiation. | |
| Critical only <=7 days | Ignore medium urgency range. | |

**User's choice:** Two urgency tiers (0-7 critical, 8-30 warning)  
**Notes:** Supports escalation prioritization.

| Option | Description | Selected |
|--------|-------------|----------|
| All authorized maintenance/warranty viewers | Broad visibility for relevant users. | ✓ |
| Asset Manager only | Restrict warnings to manager role. | |
| Admin + Asset Manager only | Management-only visibility. | |

**User's choice:** All roles who can view maintenance/warranty data  
**Notes:** Warning awareness should not be siloed.

| Option | Description | Selected |
|--------|-------------|----------|
| Click warning to jump/filter tracker row | Direct path to actionable record. | ✓ |
| Open detail modal | Alert opens modal details. | |
| No click action | Informational only. | |

**User's choice:** Jump/filter tracker to selected asset  
**Notes:** Optimize for fast follow-up action.

---

## the agent's Discretion

- Exact wording and icon choices for warning/blocked messages.
- Final visual token intensity values for warning row and alert emphasis.
- Minor table density/layout polish that preserves the chosen behavior.

## Deferred Ideas

None.
