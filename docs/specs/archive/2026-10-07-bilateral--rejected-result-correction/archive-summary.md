# Archive Summary — A centre corrects and resubmits a rejected bilateral result (`RRC`)

**Outcome:** shipped. A Rejected bilateral result can be corrected on the same record, moved to another allocated Science Program at once, and resubmitted — in the app and through `POST /api/bilateral/create`. The rejection reason is visible in the notification, on the result and in a full history. Verified on PRTest (result 9640 full cycle, 9715, 9642, 9751).

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/rejected-result-correction` (`RRC`) |
| Jira | P2-3895 (epic P2-3094) |
| Archive Date | 2026-10-07 |
| Archive branch | `qa-development-2026-ss` (spec branch — shared-file syncs recorded as pending kaizen items) |
| Final Status | **Complete** — T-1..T-10 + finding fix T-10-F1 `[x]` |
| Commits | `06ca42ee4` (server T-1..T-6), `9b15bbfcb` (client T-7..T-9), `7c273ff18` (tsc fix for RSF-T-6), `3549390e1` (RSB archive + RSB-R-14 amendment), `b251cf9cd` (spec), `2f84ce5a4` (F1), `31d24d2ee` (PRTest evidence) — pushed to `qa-development-2026-ss` and `performance-refactor` |

## 2. Original Spec Path

`docs/specs/bilateral/rejected-result-correction/`

## 3. Requirements Delivered

| Requirement | Delivered by | Real-run evidence |
|---|---|---|
| `R-1` Rejected editable (centre/admin), parity with Editing | T-7 | 9640, 9642, 9751 ✅ |
| `R-2` Save keeps Rejected, nothing sent | T-3, T-7 | 9640 ✅ |
| `R-3` Other statuses keep their lock | T-2, T-3, T-7 | 9640 at 5 ✅ |
| `R-4` Closed phase wins | existing checks | not exercised (no path added) |
| `R-5` Submit from Rejected → Pending Review, RESUBMIT row | T-3 | 806, 811 ✅ |
| `R-6` Quality check unchanged | T-3, T-7 | stale message + fresh run ✅ |
| `R-7` No primary, same refusal | T-3 | unit tests |
| `R-8` Contributors held until resubmission (+ `P-13` readout fix) | T-3 | SP09 4 → 1 ✅ |
| `R-9`/`R-10` Allocated-only SP change, direct transfer, change of mind | T-1, T-2 | SP02 → SP10 ✅ |
| `R-11` Single allocation explained | T-7 | 9715 ✅ |
| `R-12` Editing/Draft SP flow unchanged | T-2 | unit tests (golden masters) |
| `R-13` Reason (and rejecting SP) in the notification | T-5, T-9, T-10-F1 | 805/807/812 ✅ |
| `R-14` Reason on the result | T-8 | 9640 ✅ |
| `R-15` Full history, reachable after approval | T-8 | 9640 modal + Approved ✅ |
| `R-16` Other notification texts unchanged | T-5, T-9 | unit tests |
| `R-17` API resubmission = direct transfer | T-6 | **automated only** (user accepted) |
| `R-18` Observability log lines | T-2, T-3, T-6 | unit tests |

## 4. Files Changed Summary

| Area | Files |
|---|---|
| Server | `primary-program-request.service.ts` (`transferPrimary` core), `bilateral-center.service.ts` (gates, transfer at 7, resubmission, held contributors), `bilateral-resubmission.service.ts` + `bilateral.service.ts` (API direct transfer, reset keeps previous owner), `results.service.ts` (history id to notification, `P-13`), `notification.service.ts` + `notification.entity.ts` (link + readout), migration `1790700000000-NotificationReviewHistoryLink.ts`, contract doc `bilateral-result-summaries.en.md` |
| Client | `bilateral-creation.service.ts`, `section-zero-dashboard/*`, `bilateral-rejection-notice/*` (new), `bilateral-page-header/*`, `bilateral-result-creator.component.html`, `bilateral-results-list/*`, `notification-type.constants.ts`, `pop-up-notification-item/*`, `results-notifications/.../notification-item/*`, `internationalization/bilateral-*.copy.ts` |
| Docs | RSB spec (archived) amended for `RRC-R-17`; folder `CLAUDE.md` stamps |
| Size | ~1,170 production LOC + ~3,260 test LOC (budget ~550 + ~750) |

## 5. Test Evidence Summary

| Gate | Result |
|---|---|
| Scoped Jest per task (server) | T-1 80 · T-2 180 · T-3 224 + 70 · T-5 242 · T-6 342 · F1 154 — all green |
| Scoped Jest per task (client) | T-7 376 · T-8 177 · T-9 502 · F1 514 — all green |
| Merge validation (`performance-refactor`) | server 911/911 + 121/121, client 948/948 + 509/509, `tsc` clean both |
| Migration | user `up`/`down`/`up` on `prdb` ✅ |
| PRTest manual run (T-10) | all scenarios ✅ except `R-17` API path (accepted as covered by T-6) |
| `test-report.md` / `validation-report.md` | **not produced** — `/akili-test` and `/akili-validate` not run; absence accepted by the user at archive (T-10 real run used as the end-to-end gate) |

## 6. Validation Summary

No `/akili-validate` report. Reviewer verdicts: every task PASS (T-6 and T-8 after rework). PRTest run found two defects: **F1** (rejection notification named the current primary) — fixed and confirmed; **F2** (history modal shows the fallback on Resubmitted rows) — deferred by the user.

## 7. Accepted Warnings And Follow-Ups

| Item | Decision |
|---|---|
| `R-17` not run on PRTest (needs a CLARISA API key) | Accepted as covered by T-6 automated evidence |
| F2 — Resubmitted rows show "No justification was recorded." | Left as is (user) |
| `RRC-K-5` — server does not check centre ownership on section writes (a non-member edits through SP roles, also in Editing) | Separate change |
| Review drawer "Go to result center" lands on the global Results Center | Separate change |
| History trigger shows at 5/6 for never-rejected results (needs a server "has history" flag) | Follow-up |
| Contributor release emails sent before commit; API write-time allocation re-check gone; `loadedFor` not reset; dead `primaryChanged` option; stale comments | Recorded advisories |

## 8. Historical Notes

- **Pivots (user-approved):** T-3 `P-13` (drafts invisible at 7 on reload); T-6 NFR §7 (RSB reset retired the owner in an earlier transaction → moved into the final transaction); T-9 scope widened to the notifications page.
- **Design corrections at execution:** the single-allocation note lives in `section-zero-dashboard` (not `bilateral-sp-selector`); the rejection notice sits at the bottom of the detail header (the header badge is not bound in the editor).
- **Concurrency:** another session worked in the same checkout (RSB archive, `resubmit-followups`); T-6/T-9 were held until it committed.
- **Budget:** T-8 used 3 review rounds (budget 1); T-6 used 2 (budget 2); LOC ~3.4× the budget.
