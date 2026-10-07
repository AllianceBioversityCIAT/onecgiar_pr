# Archive Summary — Reporting platforms resubmit a rejected bilateral result through `create`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-rejected-result` |
| Jira | P2-3894 (epic P2-3094) |
| Archive Date | 2026-10-06 |
| Branch | `qa-development-2026-ss` (a spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Delivered.** All 7 tasks are `[x]`. Live run on PRTest passed |

## 2. Original Spec Path

`docs/specs/bilateral/resubmit-rejected-result/`

## 3. Outcome

A producer platform (STAR, MEL, TIP) can resend `POST /api/bilateral/create` carrying the `result_code` of a **Rejected** open-phase result. When it does:

- PRMS replaces the data **on the same record** and returns the result to Pending Review (`operation: "updated"`).
- ~~A changed primary goes through the primary-request flow, ownerless, and is hidden until the new primary accepts.~~ **Amended 2026-10-06 (`RRC-T-6`, `RRC-R-17`):** a changed primary is assigned directly in the commit transaction and announced at once; no request, no acceptance round.
- Every decision and resubmission is recorded in the history together with its Science Program.

## 4. Requirements Delivered

| Requirement | Delivered by | Verified live (T-7) |
|---|---|---|
| `R-1` no code, no change | T-2, T-5 (snapshot) | — (covered by unit tests) |
| `R-2` Rejected only | T-2 | ✅ 409 while pending |
| `R-3` same record · `R-17` `updated` response | T-5 | ✅ |
| `R-4` replace semantics | T-4, T-5 | ✅ partners {A,B}→{C}, evidence, regions→country |
| `R-5` back to Pending Review | T-5 | ✅ |
| `R-6` platform ownership | T-2 | ✅ 403 |
| `R-7` KP excluded · `R-10` not found · `R-11` closed phase | T-2 | unit tests |
| `R-8` a refusal changes nothing | T-3 | ✅ identical row counts |
| `R-9`, `R-18`, `R-19` history with SP | T-1, T-5 | ✅ 3 cycles, in order |
| `R-12` primary allocated · `R-13` primary present · `R-16` title · `R-23` lead project | T-3, T-4 | ✅ (R-12, R-16, R-23) |
| `R-14` primary by acceptance (same owner / changed / decline) — **amended `RRC-T-6`: direct assignment; the changed branch now transfers + announces, no decline path** | T-5 | ✅ as built at archive time; re-proven by `RRC-T-6` |
| `R-15` contributors as sent | T-4, T-5 | ✅ SP12 draft released on accept |
| `R-20` primary decline records REJECT | T-1 | ✅ (PRTest is `STRICT_TRANS_TABLES`) |
| `R-21` observability | T-5 | unit tests |
| `R-22` type immutable | T-2 | ✅ 409 |
| DD-5 amended (lead investment) | T-5 | ✅ amount survives accept; hidden after a decline |

## 5. Files Changed Summary

| Commit | Scope |
|---|---|
| `7f11bdbb2` (PR 1, T-1) | Migration `1790500000000-ReviewHistoryInitiativeAndResubmit`; `ReviewActionEnum` fixed; `initiative_id` written on decision and decline; history readout |
| `67485c922` (PR 2, T-2..T-6) | New `bilateral-resubmission.service.ts`; resolver and preflight in `bilateral.service.ts`; `resolveAndValidate` in 4 handlers; section reset; closed-world and in-memory test helpers; contract doc; upsert-by-code annotations |

Both commits are on `qa-development-2026-ss` and `performance-refactor`. Details per task are in `execution.md`.

## 6. Test Evidence Summary

- **Final scoped run:** 39 suites / **1,212 tests** green. `tsc` exit 0.
- **Mutation checks:** every code task broke its own production code on purpose and saw its tests go red.
- **Migration:** `up`/`down`/`up` on PRTest by the user.
- **Live run (T-7, PRTest):** test results 9550 (policy change) and 9762 (Innovation Use).

## 7. Validation Summary

No `test-report.md` and no `validation-report.md`. The user accepted archiving without them (2026-10-06). The substitutes are:

- per-task Reviewer verdicts (parallel lens review for T-1, T-3, T-4, T-5);
- the T-7 live run;
- the T-6 cross-check of every contract statement against a test name.

## 8. Accepted Warnings Or Follow-Ups

All of these are recorded in `design.md` §13. The user asked for them to be specified in a new spec.

| Follow-up | Priority |
|---|---|
| The bilateral GET exposes `password` hashes (`obj_created`, `obj_external_submitter`) | **Urgent** |
| Readers show inactive role-1 SPs as "Primary submitter" (notifications, `obj_results_toc_result`) | Medium |
| Primary-request card copy says "as a contributor" (to be confirmed) | Low |
| 7 residual review checks not run live: subnational history, unresolvable lead centre, several `is_lead`, role-2 contributors dropped, budget readers under an inactive parent, p95, timeout-retry inference | Medium |
| `api/bilateral/CLAUDE.md` §4 claims a "single ACID transaction" (false, P-1) | Pending item for `staging` |
| Test data on PRTest: 12018/9550 and 12230/9762 | Purge when convenient |

## 9. Historical Notes

- **Two spec amendments, approved by users:**
  - `RSB-R-23`: a lead project is required. Found in the T-3 review.
  - DD-5: an inactive role-1 row carries the lead-program investment. Found in the T-5 review and decided by Juan David Delgado.
- **Rework:** T-4 (subnational duplicate from parallel writers) and T-5 (lost investment, atomicity of the primary request, R-17 after commit). Each passed on attempt 2, within the review budget.
- **Concurrency:** another AKILI session (`notifications/bell-read-state`) ran in the same checkout. It was handled with explicit pathspecs and file boundaries.
