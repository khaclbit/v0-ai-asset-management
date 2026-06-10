# Phase 7 Human UAT Items

## H-01: Overdue row tint visibility
- Navigate to `/dashboard/borrow` with an active assignment whose due date is in the past
- **Expected**: Row has a subtle red wash (`bg-destructive/5`)
- **Verify**: Red tint is visible but not overwhelming

## H-02: Overdue stat card colour
- On the same page, verify the "Overdue" stat card number is rendered in `text-destructive` (red) colour
- **Expected**: Overdue number appears red when > 0

## H-03: Per-role pending queue
- Log in as **Staff** — should see pending rows but NO Approve/Reject columns
- Log in as **Asset Manager** — should see Approve/Reject buttons in pending queue
- **Expected**: Correct column visibility per role
