# Proposal — Primary SP card shows before Submit for review (regression)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/primary-notify-on-submit-regression` |
| Slug | `primary-notify-on-submit-regression` — given as argument; placed under `bugfix/` because Type is Bug |
| Type | Bug |
| Approval Mode | gated |
| Status | Approved — specified in requirements.md / design.md / tasks.md |
| Date | 2026-10-13 |
| Author | Santiago Sanchez (with Claude) |
| Regresses | `notifications/primary-notify-on-submit` (`PNS-R-1`), `notifications/primary-review-not-accept` (`PRA-R-1`, `PRA-R-3`) |
| Introduced by | `1b97a9385` (2026-10-07) — "assign the primary SP directly so the default ToC shows from the first pick" |
| Environments affected | `master` (prod), `staging`, `performance-refactor` (PRTest), `qa-development-2026-ss` — all contain `1b97a9385` |
| Depends on | none |
| Parallel-safe | no — touches `share-result-request.service.ts` and `bilateral-center.service.ts`, both shared with other notification specs |

## Intent

A Center that creates a bilateral result and tags a primary Science Program must not notify that SP until the Center presses **Submit for review**. Today the SP sees the card the moment the result is created.

## Problem / Current Behavior

- Center (e.g. IITA) creates result 9800 and picks SP02 as primary. The result is still **Editing**.
- SP02 members immediately get an inbox card: *"IITA has tagged SP02 as the primary Science Program of result 9800 …"*, chip **Needs your review**, footer *"Accepted by Santiago Sanchez · Oct 13, 2026 · Accepted"* (screenshot in the request).
- The SP cannot review anything yet; the card is noise and contradicts the agreed flow.

## Proposed Outcome

| Moment | SP sees the primary card? |
|---|---|
| Center creates the result / picks or changes the SP while **Editing** (or AI **Draft**) | **No** |
| Center presses **Submit for review** | **Yes**, sorted as new ("Today") |
| After the SP approves / rejects | Yes (history, unchanged) |

The 2026-10-07 product decision stays intact: the SP still becomes owner at first pick, so the Contributors section shows the SP and its default ToC right away.

## Scope

- Received-inbox read path: hide `primary` request rows while the result is Editing (1), Rejected (7) or Draft (8) — 7 added at specify (OQ-1 resolved, `PNR-DD-3`).
- Submit for review: make the existing primary row sort as new at the moment of submit.
- Regression tests for both (Bug Mode, red before the fix).

## Non-Goals

- Reverting `1b97a9385` or the direct owner assignment at first pick.
- Changing the separate "Bilateral Result Submitted" notification (`announcePendingReview`) — it already fires at submit and is correct.
- Contributor request rows — they are already held until approval (`PRA-R-4`).
- The bell pop-up — it only reads status 1 (pending) rows, so the ACCEPTED primary row never reaches it.
- Whether SP members can open an Editing result elsewhere (review page, result lists) — see Open Questions.

## Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| SP members / SP admins | Stop receiving premature cards |
| Center reporters | None visible |
| `share-result-request.service.ts` → `buildWhereReceivedConditions` (`done` bucket) | Filter change |
| `bilateral-center.service.ts` → `submitForReview` | Small write inside the existing transaction |
| `primary-program-request.service.ts` → `transferPrimary` | **Not changed** (other callers rely on its ACCEPTED row) |
| `stateFor` (Section 0 banner) | **Not changed** — still reads the ACCEPTED row |
| Specs | `notifications/primary-notify-on-submit`, `notifications/primary-review-not-accept`, `notifications/inbox-paginated-load` (keyset cursor on `requested_date`) |

## Visual Reference

- Source: None needed — backend-only fix; the card's look is unchanged.
- Location: symptom screenshot attached to the original request (prtest inbox, result 9800).
- Notes: no new UI.

## Bug Diagnosis

### Observed Symptom

The SP's **Received** inbox shows the primary card for a result that is still **Editing**, right after the Center creates it.

### Reproduction Steps

1. As a Center user (e.g. IITA), create a bilateral result with SP02 as primary. Do not submit.
2. As an SP02 member, open **Notifications → Received**.
3. **Expected:** no primary card for that result. **Actual:** the card shows under "Today", chip "Needs your review", footer "Accepted by {creator} · Accepted".

### Root Cause (confirmed)

Confirmed by reading the code path end to end:

1. `1b97a9385` changed the create / promote / first-pick path to call `PrimaryProgramRequestService.transferPrimary(...)` (`bilateral-center.service.ts:376-398`) instead of `request(..., { asDraft: true })`. No caller passes `asDraft: true` any more.
2. `transferPrimary` (`primary-program-request.service.ts:822-845`) inserts a `share_result_request` row: `request_type='primary'`, `request_status_id=2` (ACCEPTED), `shared_inititiative_id = SP`, `is_active=1`.
3. The Received inbox `done` bucket (`share-result-request.service.ts` `buildWhereReceivedConditions`, `done`) selects `request_status_id IN (2,3)` + `shared_inititiative_id IN (user's initiatives)` with **no result-status condition**. The row matches immediately.
4. The client renders every `request_type='primary'` row with the "Needs your review" chip (`notification-item.component.ts:480`).

Before `1b97a9385`, the same ACCEPTED row was written only at **Submit** (`submitForReview` → `transferPrimary` for ownerless results, `bilateral-center.service.ts:~2509-2530`). That is why the card used to appear at submit. Now the result already has an owner at submit, so that branch is skipped and no new row is written. The card created at creation is the only one, dated at creation.

### Impact & Scope

- **Production:** every bilateral result created or re-picked since `1b97a9385` reached prod has an ACCEPTED primary row visible to the SP while still Editing. A read-side fix covers these existing rows with **no data migration**.
- **Rejected-result correction** (`RRC`): changing the SP on a Rejected (7) result also calls `transferPrimary`, so the new SP sees a card before the resubmit. Same class of bug (see Open Questions).
- **Date ordering:** the inbox orders `done` by `requested_date DESC`. Even after hiding, the row keeps its creation date, so on submit it would land under an old date group instead of "Today".
- No security or data-integrity impact: ownership and ToC writes are correct; only visibility timing is wrong.

### Fix Strategy

Route: `/akili-specify` (Lite) in **Bug Mode** — logic change with a mandatory regression test. Not `/akili-quick`.

## Approach Options

| | Option | Pros | Cons |
|---|---|---|---|
| **A** | **Read-side filter + date refresh at submit.** `done` bucket: contribution rows unchanged; `primary` rows only when `obj_result.status_id NOT IN (1, 7, 8)`. In `submitForReview`, set the active primary row's `requested_date = now()` inside the existing transaction. | Smallest change. Covers existing prod rows with no migration. `transferPrimary`, `stateFor` and the Section 0 banner are untouched. | The `done` where-array grows (admin and non-admin variants) and must keep the keyset cursor working. |
| B | Write-side deferral: `transferPrimary` gets an option to skip the ACCEPTED row at create; `submitForReview` inserts it. | The row truly does not exist before submit. | `stateFor` returns "empty" without the row, so the Section 0 banner breaks unless it falls back to the role-1 owner. Existing prod rows still need a cleanup UPDATE. More blast radius. |
| C | Restore the DRAFT flow (`asDraft: true` at create). | Matches the original `PNS` design. | Reverts the 2026-10-07 product decision: the default ToC would not show until submit. Rejected. |

## Recommended Approach

**Option A.** It fixes the visible symptom where it happens (the inbox query), needs no migration for prod, and leaves every ownership/ToC write from `1b97a9385` alone. The date refresh at submit makes the card appear as new when the Center submits, which is what the request asks for.

Regression tests (red first):

- `buildWhereReceivedConditions` / received inbox: a primary ACCEPTED row on an Editing result is **not** returned; the same row on a Pending Review result **is**; contribution rows are unaffected; admin variant too.
- `submitForReview`: the active primary row's `requested_date` is refreshed in the same transaction; a failure rolls back the submit.

## Risks, Dependencies, And Open Questions

| # | Item | Proposed default |
|---|---|---|
| OQ-1 | Rejected (7) result where the Center changes the SP during correction: hide the new SP's card until resubmit? | **Yes** — include 7 in the hidden set *only for rows created after the rejection*; otherwise keep 7 visible so the SP keeps the history of what it rejected. Confirm in specify. |
| OQ-2 | Should the date refresh also apply on resubmission (Rejected → Pending Review)? | Yes — same "it's your turn again" moment. |
| OQ-3 | Can SP members see/open an Editing result in other places (review page, results list) now that they own it from creation? | Out of scope here; verify during specify and open a separate spec if it leaks. |
| R-1 | `done` keyset pagination (`inbox-paginated-load`) depends on `requested_date`; refreshing it moves a row between pages | Acceptable: a card moving to the top at submit is the desired behavior. Cover with a test. |
| R-2 | Count/badge endpoints that reuse `buildWhereReceivedConditions` (`seen-all`, pop-up) | They read `pendingOwner`/`pendingShared` (status 1) only — not affected. Re-check in specify. |
| R-3 | Shared files with other open notification specs | `Parallel-safe: no`; run alone. |

## Success Criteria

- Creating a result with a primary SP produces **no** card in that SP's Received inbox while the result is Editing.
- On **Submit for review**, the card appears under "Today" for that SP, together with the existing "Bilateral Result Submitted" notification.
- Existing prod results in Editing stop showing the card after deploy, with no data script.
- Section 0 still shows the SP and its default ToC right after the first pick.
- New regression tests are red on current code and green after the fix.

## Next Step

```text
/akili-specify bugfix/primary-notify-on-submit-regression
```

Run in **Lite** depth, **Bug Mode** (mandatory regression test).
