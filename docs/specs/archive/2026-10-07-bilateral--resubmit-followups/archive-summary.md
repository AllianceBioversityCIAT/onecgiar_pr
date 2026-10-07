# Archive Summary — Follow-ups from the rejected-result resubmission

**Outcome:** delivered. All 8 tasks are `[x]` and passed live checks on PRTest on 2026-10-07. Two loose ends from the resubmission are fixed: the bell's primary-request copy and inactive Science Programs shown as owner or contributor. The seven residual checks (a–g) are closed. T-8 was added by a user-approved amendment.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-followups` (`RSF`) · Standard · Bug + verify-first |
| Archive Date | 2026-10-07 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Commits | `fe9f0eedd` (T-1) · `bc42f5554` (T-2..T-6) · `443e214ce` (contract doc, R-7) · `d9073be80` (T-5 PK fix) · `1c1f1fde2` (T-8) · `f3ea0ca06` (T-7 evidence). All are on `qa-development-2026-ss`. Code commits are also on `performance-refactor` (PRTest) |
| Final Status | **Delivered.** 8 of 8 tasks `[x]`. Live T-7 PASS. p95 not measured (user decision) |

## 2. Original Spec Path

`docs/specs/bilateral/resubmit-followups/`

## 3. Requirements Delivered

| Req | What | Proof |
|---|---|---|
| `R-1`, `R-2` | The bell names a primary request ("{centre} has tagged {SP} as the primary Science Program…"). One builder feeds the bell link and the inbox search | Jest + live screenshots (sentence, clamp, deep link) |
| `R-3` | Only an active role-1 row is shown as primary/owner (bilateral GET, QA payload, notifications). Ownerless notifications still show | Jest + live GET 12018 / 12230 / 11513 + bell |
| `R-4` | One active subnational per code (newest id) | Jest + live C2 (972 active, 971 inactive) |
| `R-5`, `R-6` | Resubmission refuses an unknown `lead_center` and several `is_lead` with 400 before any write | Jest (writer spies) + live 400s; result unchanged |
| `R-7` | The resubmission retires accepted contributors the payload dropped. Role 1 untouched | Jest + live (SP06 retired, SP07 kept) |
| `R-8` | No budget under an inactive parent | Guard test + 11-reader evidence table (reader #3 inconclusive) |
| `R-9` | p95 within +30% | **Not measured** (user decision, SHOULD) |
| `R-10` | 409 retry guidance pinned to `'pending review'` | Jest pin + live `outcomes[].status` |
| `R-11` | New refusals use the `RSB-R-21` log line | Jest |
| `R-12` | `obj_results_toc_result` lists only active SPs of any role (amendment) | Jest + live GET 12018 (SP06 absent) |

## 4. Files Changed Summary

| Area | Files |
|---|---|
| Client | `results-notifications/utils/request-notification-text.ts` (new) + spec; `pipes/filter-notification-by-search.pipe.ts` + spec; `pop-up-notification-item.component.{ts,html,spec.ts}` |
| Server, readers | `results/result.repository.ts` + spec; `bilateral/services/quality-assessment/mappers/result-header.mapper.spec.ts` (new); `bilateral/bilateral.service.spec.ts`; `notification/notification.service.ts` + spec; `notification/services/result-tagged-notification.service.ts` + spec |
| Server, resubmission | `bilateral/services/bilateral-resubmission.service.ts` + spec; `bilateral/bilateral.service.ts` (preflight ports, `findLeadCenter` split) |
| Server, shared | `result-countries-sub-national/repositories/result-country-subnational.repository.ts` + spec; `result-countries/result-countries.service.spec.ts` (new) |
| Contract | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: 2 error rows, change-log rows (T-2, T-4, T-6/R-7, T-8), resubmission table row corrected |

## 5. Test Evidence Summary

| Task | Scoped Jest (final) | Red first |
|---|---|---|
| T-1 | 3 suites / 143 | ✅ |
| T-2 | 5 / 322 | ✅ |
| T-3 | 2 / 132 | ✅ (rtn by inspection) |
| T-4 | 2 / 329 | ✅ |
| T-5 | 3 / 23 (after rework) | ✅ |
| T-6 | 1 / 96 | ✅ |
| T-8 | 5 / 332 | ✅ |

There is no separate `test-report.md`. The per-task scoped runs are in `execution.md`, and the live T-7 run on PRTest is the integration evidence. The user accepted archiving without `/akili-test` by asking for the archive directly after T-7 passed.

## 6. Validation Summary

There is no `validation-report.md`. `/akili-validate` was not run. The user accepted the absence when they asked for the archive right after the T-7 live checks. Every task had an independent Reviewer PASS; T-3 and T-4 had parallel lens reviewers. The live checks on PRTest covered every requirement except `R-9`.

## 7. Accepted Warnings Or Follow-Ups

| Item | Owner |
|---|---|
| p95 (`R-9`) not measured | Accepted (SHOULD). Revisit if platforms report slowness |
| `R-8` reader #3 (admin export) inconclusive: no in-tree SQL; probably DB views | User / data team |
| Resubmission is non-atomic. A 500 left a partial write on 12018 (known `RSB-DD-2`) | Follow-up spec candidate |
| No-code `create`: an unknown lead centre still warns; several leads still use last-wins; subnationals apply to every country | Follow-up spec (design §12) |
| QA `contributors-and-partners.mapper` `Owner ?? tocRows[0]` fallback for ownerless results | Product decision |
| `getRecentResultActivity` picks role 1 without `is_active`; the emit socket payload is unfiltered | Follow-up candidates |
| Notify STAR/MEL/TIP: two new 400s, GET lists only active SPs, the resubmission retires dropped contributors | User, before production |
| `RRC-T-5`/`RRC-T-6` must build on the changed `notification.service.ts` and `bilateral-resubmission.service.ts` | RRC session |
| `staging → master` promotion | Cristian Gamboa |

## 8. Historical Notes

- **T-5 had a live FAIL after a Reviewer PASS.** The SQL used a bare `id` and the table's primary key is `result_country_subnational_id`. The mocked `query()` specs could not see it, and PRTest returned `500 Unknown column 'id'`. The fix pins column names against entity metadata, and the Reviewer then checked the DDL. This is a recurrence of `KZ-W12-1`; see the kaizen entry.
- **Two user-approved amendments.** One corrected the contract doc for `R-7` (line 582 had become false). The other added `R-12`/`DD-9`/T-8 after the live run showed a retired contributor still listed. Both are recorded in `execution.md`.
- **PRTest deploys from `performance-refactor`.** One live re-check failed only because that branch was one commit behind.
- **The RRC session worked in the same checkout.** T-3, T-4 and T-6 ran before `RRC-T-5`/`RRC-T-6` by user decision (`DD-8` is a warning).
