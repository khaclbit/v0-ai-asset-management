---
phase: 07-assignment-return-workflow-ui
verified: 2025-07-14T00:00:00Z
status: gaps_found
score: 8/8 truths verified in code — 1 routing gap blocks goal delivery
gaps:
  - truth: "Assignment & Return Workflow UI is reachable via app navigation"
    status: failed
    reason: >
      Sidebar hard-links to /dashboard/assignments but the page lives at
      /dashboard/borrow. No /dashboard/assignments/page.tsx exists. Clicking
      the nav item results in a Next.js 404. The feature cannot be accessed
      through normal navigation.
    artifacts:
      - path: "components/sidebar.tsx"
        issue: "href: \"/dashboard/assignments\" — route does not exist"
      - path: "app/dashboard/borrow/page.tsx"
        issue: "Correct implementation, wrong URL segment"
    missing:
      - "Either rename app/dashboard/borrow/ → app/dashboard/assignments/, OR update sidebar href to /dashboard/borrow"
human_verification:
  - test: "Overdue row visual tint"
    expected: "Active assignments with dueDate < today get a perceptible red/rose tint (bg-destructive/5)"
    why_human: "CSS utility opacity rendering depends on theme tokens — can only confirm visually in browser"
  - test: "Overdue stat card danger styling"
    expected: "When overdueCount > 0 the 'Overdue' stat card number renders in destructive (red) colour"
    why_human: "Conditional className requires browser rendering to confirm visual outcome"
  - test: "Pending queue visibility per role"
    expected: "Staff user with no pending items sees the 'New Assignment Request' button but NOT the Approve/Reject columns"
    why_human: "Role-conditional column rendering requires interactive session to confirm per-role views"
---

# Phase 7: Assignment & Return Workflow UI — Verification Report

**Phase Goal:** Deliver the Assignment & Return Workflow UI with full lifecycle from request creation through approval, return, and overdue highlighting.
**Verified:** 2025-07-14
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | New assignment requests created with `status: "requested"` | ✅ VERIFIED | `page.tsx:101` passes `status: "requested"` in `createAssignment()`; `store.tsx:112` enforces `status: "requested" as const` unconditionally |
| 2 | Pending queue visible with approve/reject actions for Asset Manager | ✅ VERIFIED | `page.tsx:157–230` — section renders when `pending.length > 0 \|\| canManage`; Approve/Reject buttons gated by `canManage` check |
| 3 | Reject dialog captures optional rejection reason via Textarea | ✅ VERIFIED | `page.tsx:421–427` — `<Textarea id="reject-reason">` with placeholder; reason passed to `rejectAssignment(id, rejectReason.trim() \|\| undefined)` |
| 4 | Approved assignments sync asset status to `"assigned"` | ✅ VERIFIED | `store.tsx:115–138` — `approveAssignment` sets record to `"active"` then calls `setAssets` patching `status: "assigned" as const, assignee: rec.assignee` |
| 5 | Staff and Asset Manager can initiate returns from active assignments | ✅ VERIFIED | `page.tsx:54` — `canInitiateReturn = role === "Asset Manager" \|\| role === "Staff"`; button shown at line 275 when `canInitiateReturn && !r.returnDate` |
| 6 | Only Asset Manager can close return workflow | ✅ VERIFIED | `page.tsx:286` — "Close Return" button gated by `canManage && r.returnDate`; `canManage = user?.role === "Asset Manager"` only |
| 7 | Overdue items visually distinguished (row tint + badge) | ✅ VERIFIED | `page.tsx:265` — `className={cn(r.isOverdue && "bg-destructive/5")}`; `page.tsx:271` — `<StatusBadge status={r.isOverdue ? "overdue" : r.status} />`; StatusBadge maps "overdue" to `bg-destructive/15 text-destructive` |
| 8 | Overdue count shown in summary area | ✅ VERIFIED | `page.tsx:153` — `<StatCard label="Overdue" value={overdueCount} danger />`; `page.tsx:146` — Topbar subtitle includes `· N overdue` when count > 0 |

**Logic score:** 8/8 truths verified in implementation code.

---

### 🛑 Routing Gap — Goal Delivery Blocked

All 8 feature truths pass at the code level, but the implemented page is **unreachable** via normal application navigation.

| File | Issue |
|------|-------|
| `components/sidebar.tsx:43` | `href: "/dashboard/assignments"` |
| `app/dashboard/borrow/page.tsx` | Page lives at `/dashboard/borrow` |
| `app/dashboard/assignments/` | **Directory does not exist** — Next.js serves 404 |

The sidebar "Assignments" nav item (visible to Admin, Asset Manager, Staff) routes to `/dashboard/assignments`, which has no corresponding `page.tsx`. The feature implementation is at `/dashboard/borrow`. Clicking the nav link produces a Next.js 404 error.

**Fix (one of two options):**
```
Option A — rename directory:
  mv app/dashboard/borrow app/dashboard/assignments

Option B — update sidebar href:
  sidebar.tsx line 43: href: "/dashboard/borrow"
```

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `app/dashboard/borrow/page.tsx` | ✅ VERIFIED | 452 lines, full implementation — all 8 truths present |
| `lib/store.tsx` | ✅ VERIFIED | 220 lines — `createAssignment`, `approveAssignment`, `rejectAssignment`, `initiateReturn`, `closeAssignment` all substantively implemented |
| `lib/data.ts` | ✅ VERIFIED | `AssignmentStatus` type covers `requested \| active \| overdue \| closed \| rejected`; seed data includes one `requested` and one `overdue` record |
| `components/status-badge.tsx` | ✅ VERIFIED | Handles "overdue" → `bg-destructive/15 text-destructive`; "requested" → `bg-chart-2/15 text-chart-2` |
| `components/sidebar.tsx` | ❌ ROUTING MISMATCH | Links to `/dashboard/assignments` — page does not exist at that path |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sidebar.tsx` | `/dashboard/assignments` | `href` | ❌ NOT_WIRED | Route 404 — page at `/dashboard/borrow` |
| `page.tsx` | `store.tsx` | `useStore()` import | ✅ WIRED | `import { useStore } from "@/lib/store"` line 34 |
| `page.tsx` | `lib/data.ts` | `formatDate` import | ✅ WIRED | `import { formatDate } from "@/lib/data"` line 35 |
| `approveAssignment` | `setAssets` | nested setter | ✅ WIRED | `store.tsx:128–136` syncs asset status on approval |
| `closeAssignment` | `setAssets` | nested setter | ✅ WIRED | `store.tsx:153–163` syncs asset to "available" on close |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `page.tsx` — pending table | `assignmentRecords` | `seedAssignments` in `store.tsx:84` | ✅ Seed includes `status: "requested"` record (AS-REC-005) | ✅ FLOWING |
| `page.tsx` — active table | `active` (derived) | `assignmentRecords` filtered by `status` | ✅ Seed includes "active" (AS-REC-001) + "overdue" (AS-REC-002) | ✅ FLOWING |
| `page.tsx` — overdueCount | `active.filter(r => r.isOverdue)` | dueDate comparison vs `new Date()` | ✅ Runtime computed — AS-REC-002 dueDate 2026-05-15 will register overdue | ✅ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — page requires browser rendering and logged-in session; no runnable CLI entry points exist for this Next.js app.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `store.tsx:127–137` | Nested `setAssignmentRecords` inside another `setAssignmentRecords` updater to fire `setAssets` side effect | ⚠️ Warning | Technically works but fragile — two sequential React state batches instead of one atomic update. Low risk in demo context. |

No placeholder returns, empty handlers, or TODO stubs found in phase files.

---

### Human Verification Required

#### 1. Overdue row visual tint
**Test:** Log in as any role, navigate to `/dashboard/borrow` (directly, not via sidebar). With seed data, "Epson EB-X51 Projector" (AS-REC-002, `status: "overdue"`, dueDate 2026-05-15) should show a red-tinted row.
**Expected:** Row has a visible rose/red background wash distinct from normal rows.
**Why human:** `bg-destructive/5` is a 5%-opacity utility — theme token rendering requires visual browser confirmation.

#### 2. Overdue stat card danger colour
**Test:** With same session, check the summary cards at the top.
**Expected:** The "Overdue" stat card's numeric value renders in destructive (red) colour when count > 0.
**Why human:** `${danger && value > 0 ? "text-destructive" : ""}` — conditional className confirmed in code but visual outcome requires browser.

#### 3. Per-role pending queue behaviour
**Test:** Log in as Staff (James Walker). Submit a new assignment request. Verify the "Pending Requests" section shows the request with Status badge but WITHOUT Approve/Reject columns.
**Expected:** Staff sees the pending row but has no action buttons; only Asset Manager login shows approve/reject actions.
**Why human:** Role-gated column rendering requires an interactive session to confirm both role views.

---

## Gaps Summary

**1 routing gap** blocks delivery of the phase goal in the running application.

The implementation is complete and correct — all 8 required truths are verified at the code level. The assignment request lifecycle (requested → active → return initiated → closed), role-gated actions, overdue detection, and summary counts are all properly implemented and wired.

However, the page is **unreachable via the sidebar** because `components/sidebar.tsx` links to `/dashboard/assignments` while the page lives at `app/dashboard/borrow/`. Navigating via the sidebar produces a Next.js 404. The fix is a one-line change (rename directory or update `href`).

---

*Verified: 2025-07-14*
*Verifier: Claude (gsd-verifier)*
