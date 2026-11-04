# Primary SP Reviews the Result (no "Accept as primary") — Design

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-review-not-accept` |
| **Requirements** | `requirements.md` (`PRA-R-1..5`) |
| **Depth** | Standard |
| **Status** | approved (Santiago Sanchez, 2026-10-07) |
| **Date** | 2026-10-07 |
| **Reversion challenge (Step 2.3)** | Run inline (time-boxed, deadline 15:00): outcome recorded per DD in §10 |

---

## 2. Executive Summary

Reuse, do not build. Every primitive already exists:

| Need | Existing piece |
|---|---|
| Make an SP the owner atomically, retire all primary rows, seed ToC stub | `PrimaryProgramRequestService.transferPrimary(resultId, spId, user, manager, { releaseContributors })` (RRC) |
| Announce to the owner SP + informational contributor tag | `BilateralService.announcePendingReview` |
| Release contributor requests on approve | `results.service.ts` `_updateTocMapping` → `releaseContributors` |
| Bridge for legacy pending rows | `PrimaryProgramRequestService.accept()` (via the existing request-decision PATCH) |
| Deep link to the review drawer | `NotificationNavigationService.reviewRequestUrl()` → `buildReviewDrawerRoute` |

Server: 2 methods change in `bilateral-center.service.ts`. Client: request-decision helpers, inbox row, bell card, 2 copy files.

## 3. Architecture Overview

```
Center Submit ──► assertSubmittable (no owner: draft OR pending choice ok)
              └─► tx: lock Result ─► QA decision ─► status 5 ─► history
                                  └─► no owner: transferPrimary(choice, releaseContributors:false)
              └─► post-commit: announcePendingReview (always)

Center swap (owner exists, Editing/Draft) ──► transferPrimary(new, releaseContributors:false)

SP inbox/bell "Review result" ──► PATCH accept (legacy row) ──► 200 or 409
                               ──► status 5 → navigate review drawer
                               ──► else → toast "You will be notified…"
```

## 4. Extended Directory Structure (touched files only)

```
onecgiar-pr-server/src/api/bilateral/services/
  bilateral-center.service.ts            # assertSubmittable, submitForReview, updatePrimaryAssignment
  bilateral-center.service.spec.ts       # new + updated cases
onecgiar-pr-client/src/app/
  internationalization/contribution-request-drawer.copy.ts   # reviewResult label, chip, toast
  internationalization/bilateral-primary-assignment.copy.ts  # PRA-R-5 banner
  pages/bilateral/components/section-zero-dashboard/section-zero-dashboard.component.ts  # submitBlockedReason
  pages/results/.../results-notifications/utils/request-decision.ts (+ .spec)
  pages/results/.../components/notification-item/notification-item.component.{ts,html} (+ .spec)
  shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.{ts,html} (+ .spec)
```

## 5. Data Model

No schema change, no migration. After `PRA-R-1` / `PRA-R-2` a result carries the same rows a Rejected-result transfer already produces: one active role-1 `results_by_inititiatives` row and one active ACCEPTED `primary` `share_result_request` row; all older primary rows `is_active = 0`.

## 6. API Design

No new endpoint, no payload change. Behavior changes only:

| Endpoint | Change |
|---|---|
| Endpoint backed by `BilateralCenterService.submitForReview` (route unchanged) | Ownerless + pending choice no longer 400; owner written at submit |
| Endpoint backed by `BilateralCenterService.updatePrimaryAssignment` (route unchanged) | Swap writes owner directly |
| Existing request-decision PATCH (accept) | Unchanged; the client now treats its 409 "already answered" on a primary row as "go to the result" |

## 7. Backend Module Design

### 7.1 `assertSubmittable` (`PRA-R-1`)
- No owner → choice = `findDraftPrimaryInitiativeId ?? findPendingPrimaryInitiativeId`. Null → today's 400.
- The "pending request blocks submit" guard runs **only when an owner exists** (safety net; new code never creates owner + pending).

### 7.2 `submitForReview` (`PRA-R-1`)
- First statement inside the transaction: lock the `Result` row (`pessimistic_write`, same pattern as `updatePrimaryAssignment` L265-270), so a concurrent swap/accept cannot interleave.
- Replace `sendDraft` with: resolve choice (draft ?? pending) **through `manager`**; none → throw (rolls back; guards a race after `assertSubmittable`); else `transferPrimary(..., { releaseContributors: false })`.
- `isResubmission` branch unchanged (it has an owner).
- Post-commit: call `announcePendingReview` unconditionally (remove the `hasOwner` gate). `hasOwner` variable kept only if still used.
- Log one line on the ownerless transfer: result id, initiative id, user id (ids only).

### 7.3 `updatePrimaryAssignment` (`PRA-R-2`)
- In the non-Rejected branch, when `changed && currentPrimaryId !== 0` (swap): alignment check via `isAligned` (400 with today's not-aligned message on false, unless an earlier guard in the method already validates `primaryInitiative` against the lead project — implementer verifies and reuses it), then `transferPrimary(..., { releaseContributors: false })`. No `request()`.
- `currentPrimaryId === 0` (first pick / ownerless re-pick): unchanged (`request(..., { asDraft })`).
- The `else` (re-pick current owner) branch that retires open rounds: unchanged.

### 7.4 Untouched
`accept()`, `decline()`, `stateFor`, `releaseContributors`, review approve/reject, API ingest, RRC resubmission.

## 8. Frontend / UX Component Architecture

### 8.1 `request-decision.ts`
- `acceptLabelFor(primary)` → `footer.reviewResult` ("Review result").
- New pure helper `primaryReviewTarget(row)` → `'review-drawer'` when `row.obj_result.status_id == 5`, else `'notify-later'`.
- `declineMode` primary branch no longer reachable from the UI; keep the function (no dead-branch removal today).

### 8.2 Inbox row (`notification-item`) and its drawer
- Primary row: chip "Needs your review"; one button "Review result"; **no Decline**, no confirm dialog.
- Click: busy flag → existing accept PATCH. On success **or** 409 → if target is review drawer, `router.navigateByUrl(navigation.reviewRequestUrl(row))`; otherwise success toast with `copy.primaryNotifyLater`. Other errors → existing error toast. Refresh the list after.
- `reviewRequestUrl` needs the SP code: for a primary row it is the requested SP (`getProgramCode` — implementer confirms it resolves the shared initiative's official code for primary rows; if not, pass it explicitly).

### 8.3 Bell card (`pop-up-notification-item`)
- Primary card: label "Review result", single click (remove the BELL-T-11 double-click confirm for primary only), no Decline; same handler logic as 8.2 (share it through `request-decision.ts` / navigation service, not duplicated).
- Contribution cards: unchanged.

### 8.4 Center banner (`PRA-R-5`)
- `banner.draft` and `banner.pending` → "`{code}` will review this result when you submit it for review".
- `submitBlockedReason` returns null for `pending` when the result has **no owner**.

UI uses existing Spartan `hlmBtn` buttons already in these templates; no new component.

## 9. Shared Contracts

None. Labels in copy files only.

## 10. Design Decisions

| ID | Decision | Rejected alternative | Reversion challenge: "what does removing this break?" |
|---|---|---|---|
| PRA-DD-1 | Submit uses `transferPrimary` instead of `sendDraft` | New "make owner" method | Breaks PNS tests asserting `sendDraft` (update them). `PNS-R-2` "refuse review until accept" guard becomes unreachable — intended. PDR decline outcome no longer reachable for new results — reject in the drawer replaces it (Angel). No breakage left unaddressed |
| PRA-DD-2 | Pending (legacy) choice counts at submit | SQL backfill | Removes the submit block for ownerless + pending. That block existed so a submit would not bypass the SP's answer — that answer no longer exists. Unblocks prod 9737/9738 |
| PRA-DD-3 | `announcePendingReview` always after submit | Keep gate + call later | SP02 gets the informational "tagged" notice at submit (as owned results already do). Actionable request still waits for approve. Accepted (proposal R-1) |
| PRA-DD-4 | Swap = direct transfer | Keep swap request | Breaks PSR swap tests; the Center can swap without SP consent — consistent with the new rule (SP reviews at submit). Old owner loses the result before submit: harmless (Editing results are not in the review queue) |
| PRA-DD-5 | "Review result" calls accept, then navigates | Navigate only | Without accept, a legacy ownerless result cannot be reviewed (no owner). 409 treated as success because the row may have been closed by submit |
| PRA-DD-6 | Remove Decline on primary rows | Keep Decline | Legacy SP loses "decline before submit"; it can reject with justification in the drawer after submit. Accepted |

## 11. Budget (Step 2.4 tripwire)

| Metric | Expected |
|---|---|
| Tasks | 2 (T-1 server, T-2 client) + 1 manual verification task |
| LOC | ~120 server (incl. specs) + ~180 client (incl. specs) ≈ 300 |
| Review rounds | 1 per task (2 max) |

Matches Standard depth. Exceeding 2 rounds on either task or ~450 LOC → stop and escalate.
