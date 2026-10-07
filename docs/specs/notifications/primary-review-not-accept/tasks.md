# Primary SP Reviews the Result (no "Accept as primary") — Tasks

## 1. Scope of this task list

- **Module / feature:** `notifications` / `primary-review-not-accept`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Target:** production before 15:00, 2026-10-07
- **Owner / driver:** Santiago Sanchez
- **Status:** in-progress

## 2. Pre-flight checklist

- [ ] Branch: work on `qa-development-2026-ss` (current); no commit without the user's go-ahead (memory: no auto-commit)
- [ ] Every Jest run: `--maxWorkers=2`, `--testPathPattern` scoped to touched files; one test run at a time on the machine
- [ ] Lint only touched files: `npx eslint <files> --quiet`
- [ ] No secrets/tokens in logs (`.cursorrules`)

## 3. Task list

### [x] `PRA-T-1` — Server: owner at submit, pending counts as choice, swap = direct transfer

- **Type:** server + tests
- **Description:** Implement design §7.1-7.3 in `bilateral-center.service.ts`. `assertSubmittable` accepts draft **or** pending choice when ownerless and keeps the pending guard only for owned results. `submitForReview` locks the `Result` row first in the transaction, resolves the choice through `manager` (draft ?? pending; none → throw), calls `transferPrimary(..., { releaseContributors: false })` instead of `sendDraft`, logs ids only, and calls `announcePendingReview` after commit unconditionally. `updatePrimaryAssignment` non-Rejected branch: when `changed && currentPrimaryId !== 0`, validate alignment (reuse any existing guard; otherwise `isAligned` → same 400 message as `request()`'s `not_aligned`) and call `transferPrimary(..., { releaseContributors: false })` instead of `request()`. Update existing specs that asserted `sendDraft` / swap `request()`.
- **Implements:** `PRA-R-1` (all 5 scenarios), `PRA-R-2` (both scenarios)
- **Files:** `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts`, `bilateral-center.service.spec.ts`
- **Depends on:** —
- **Blocks:** `PRA-T-3`
- **Estimate:** S
- **Review:** full
- **Skills:** `nestjs-expert`, `tdd`
- **Clause ownership (tests to add/update in `bilateral-center.service.spec.ts`):**

| Clause | Test asserts | Input that would make it FAIL |
|---|---|---|
| R-1 saved choice: owner written, status 5 | `transferPrimary` called with (id, draftSpId, user, manager, `{releaseContributors:false}`); `sendDraft` NOT called | code still calling `sendDraft` |
| R-1 "MUST NOT send Accept as primary" | `sendDraft` and `request` not called | idem |
| R-1 "MUST NOT create SP02 request now" | `releaseContributors` option is `false`; `releaseContributors()` not called on the non-resubmission path | passing `true` |
| R-1 notification | `announcePendingReview` called once after an ownerless submit | `hasOwner` gate left in place |
| R-1 legacy pending | ownerless + no draft + pending SP → `assertSubmittable` passes, `transferPrimary` gets the pending SP | old pending guard still firing (expects 400) |
| R-1 "MUST NOT be refused with 'pending…'" | no `BadRequestException` for ownerless + pending | idem |
| R-1 no choice | ownerless + no draft + no pending → 400 "no Science Program assigned" | — |
| R-1 owner-step fails | `transferPrimary` rejects → `submitForReview` rejects; `announcePendingReview` not called | swallowing the error |
| R-1 owner present | owned result: `transferPrimary` not called, announce called (unchanged) | — |
| R-1 owner + pending (safety net) | still 400 "pending…" | removing the guard entirely |
| R-2 swap | owned SP01 → pick SP03: `transferPrimary(…, 3, …)` called, `request` NOT called | old `request()` path |
| R-2 not aligned | swap to non-aligned SP → 400, `transferPrimary` not called | missing alignment check |
| R-2 first pick | ownerless pick: `request(..., {asDraft:true})` still called | — |

- **Verification:**
  - `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="bilateral-center.service.spec"`
  - also run the primary-request service spec to confirm nothing else broke: `--testPathPattern="primary-program-request.service.spec"`
  - `npx eslint src/api/bilateral/services/bilateral-center.service.ts src/api/bilateral/services/bilateral-center.service.spec.ts --quiet`
  - `npx tsc --noEmit -p tsconfig.json` (type check)
- **Disqualifies the evidence:** a test that mocks `transferPrimary` but never asserts its arguments; a green run where the new cases were skipped (`it.skip`/`xit`) or the suite count did not increase; tests that only assert "no throw".
- **Definition of done:** all rows above have a passing test; existing cases updated (not deleted) where their asserted behavior was superseded, with a `PRA-R-x` comment; lint and tsc clean.

### [x] `PRA-T-2` — Client: "Review result" on primary rows, no Decline, banner copy

- **Type:** client + tests
- **Description:** Implement design §8. Copy: `footer.reviewResult = 'Review result'`, primary chip `'Needs your review'`, toast `primaryNotifyLater = 'You are now the primary Science Program. You will be notified when the Center submits it for review.'`; banner `draft` and `pending` → `` `${code} will review this result when you submit it for review` ``. `request-decision.ts`: `acceptLabelFor(primary)` → reviewResult; new `primaryReviewTarget(row)` (`status_id == 5` → `'review-drawer'`, else `'notify-later'`). Inbox `notification-item` (row + drawer) and bell `pop-up-notification-item`: primary rows show one "Review result" button, no Decline, no double-click confirm; click → existing accept PATCH → on success or HTTP 409 → navigate `reviewRequestUrl(row)` (review-drawer target) or show the notify-later toast; other errors → existing error toast. `section-zero-dashboard.submitBlockedReason` → null for `pending` when no owner. Contribution rows unchanged. Update every spec asserting "Accept as primary" / "Confirm accept as primary" / primary Decline.
- **Implements:** `PRA-R-3` (all 4 scenarios), `PRA-R-5`
- **Files:** `internationalization/contribution-request-drawer.copy.ts`, `internationalization/bilateral-primary-assignment.copy.ts`, `results-notifications/utils/request-decision.ts` (+spec), `notification-item.component.{ts,html}` (+spec), `pop-up-notification-item.component.{ts,html}` (+spec), `section-zero-dashboard.component.ts` (+spec), possibly `shared/services/notification-navigation.service.ts` (only if `getProgramCode` does not resolve the SP code for primary rows)
- **Depends on:** — (parallel with T-1 in code; tests run one at a time)
- **Blocks:** `PRA-T-3`
- **Estimate:** M
- **Review:** full
- **Skills:** `angular-developer`, `spartan` (existing `hlmBtn` only), `tdd`
- **Clause ownership:**

| Clause | Test asserts | Input that would make it FAIL |
|---|---|---|
| R-3 label + chip | primary row/bell render "Review result" and "Needs your review" | old copy |
| R-3 Pending Review → drawer | status 5 row: accept PATCH called once, then `router.navigateByUrl` with the `bilateral-review?reviewResult=…&reviewResultId=…` URL | navigating before/without accept |
| R-3 Editing → notify | status 1 row: accept called, toast with `primaryNotifyLater`, router NOT called | navigating anyway |
| R-3 409 stale | accept errors with 409 → navigate (status 5), no error toast | showing the error toast |
| R-3 no confirm | bell primary: first click sends the PATCH (no "Confirm …" state) | BELL-T-11 confirm kept for primary |
| R-3 no Decline | primary row and bell card have no Decline button; contribution rows still do | hiding Decline for all rows |
| R-5 banner | `draft` and ownerless `pending` render the new text; `submitBlockedReason` null for both; `rejected`/`sentBack`/`noneUnpicked` unchanged | changing the other banners |

- **Verification:**
  - `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(request-decision|notification-item.component|pop-up-notification-item|section-zero-dashboard)"`
  - `npx eslint <touched files> --quiet`
  - grep check: `grep -rn "Accept as primary\|Confirm accept as primary" src/app --include=*.ts --include=*.html` returns no runtime hits (spec hits only if they assert absence)
- **Disqualifies the evidence:** specs updated by changing expected strings without asserting the navigation/toast branch; navigation asserted with a spy that is never called by the real handler (assert call count and URL); a jsdom pass is NOT evidence the drawer actually opens — that is T-3.
- **Definition of done:** table rows covered by passing tests; no runtime "Accept as primary" text left; lint clean.

### [ ] `PRA-T-3` — Manual end-to-end check (HITL)

- **Type:** rollout
- **Implements:** `PRA-R-4` (pinned behavior), end-to-end of `PRA-R-1..3`
- **Depends on:** `PRA-T-1`, `PRA-T-2`
- **Steps (PRTest or local stack — memory: local writes to shared prdb + prod mailer, so the user drives write actions):**
  1. Center: create bilateral result, SP01 primary, SP02 contributor → Submit. Expect: Pending Review, listed in SP01 bilateral review, SP01 "submitted" notice, no "Accept as primary".
  2. SP01: open from notification → drawer opens → Approve. Expect: SP02 gets Accept/Decline.
  3. Another result: SP01 Reject with blank text → blocked; with text → Rejected.
  4. Swap on an owned Editing result → saved, no request, Submit allowed.
  5. After prod deploy: results 9737 / 9738 — Center can submit; SP inbox row shows "Review result"; prod query from the proposal returns 0 rows once both are submitted.
- **Disqualifies the evidence:** checking against a bundle that is not the deployed commit (verify served build first, memory); approving on a result that already had an owner before the test (does not exercise R-1).
- **Definition of done:** steps 1-4 observed by the user; step 5 after prod; tell Nicoleta (meeting agreement).

## 4. Dependency graph

```
PRA-T-1 ─┐
         ├─► PRA-T-3
PRA-T-2 ─┘
```

## 5. Test plan

Server and client Jest as listed per task, scoped, `--maxWorkers=2`, never concurrently. No E2E/Cypress (time; covered by T-3 manual).

## 6. Rollout & verification

Single PR / single push of both tasks (~300 LOC). Server alone is safe to ship first (it already unblocks the 2 prod results); client alone is also safe (accept + navigate works with the old server). Deploy path: qa-dev → staging → master per team cadence; master promotion owner per memory.

## 7. Cleanup & follow-ups

- Dead code left on purpose: PNS `sendDraft`, PDR primary-decline UI path, `PNS-R-2` review-refusal guard. Remove in a later cleanup spec.
- Archive notes: mark PSR-R-1/R-2/R-4 and PNS-R-2/R-3/R-5 as superseded by PRA.

## 8. Roll-back plan

Revert the commit(s). No data migration; results transferred meanwhile keep a valid owner (same shape as an accepted primary request), so rollback leaves no inconsistent rows.
