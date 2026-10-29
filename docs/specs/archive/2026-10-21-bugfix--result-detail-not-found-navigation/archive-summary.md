# Archive Summary — Result detail: leave the not-found screen, and send IPSR codes to the IPSR module

**Outcome:** shipped. The not-found and error screens no longer trap the user, the IPSR phase chips open IPSR, and a resolved type-10 result opened on the Reporting route is redirected to IPSR. All 3 tasks are done (client only). One task needed a rework after its first review.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/result-detail-not-found-navigation` |
| Ticket | P2-3969 |
| Owner | Santiago Sanchez |
| Approval mode | `gated` |
| Branch | `JuanGuzman-io/investigate-p2-3969-chrome`, merged into `performance-refactor` on 2026-10-19 |

## 2. Original Spec Path

`docs/specs/bugfix/result-detail-not-found-navigation/`

## 3. Archive Date

2026-10-21

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 3 of 3 done (T-1 PASS on attempt 2, T-2 PASS, T-3 PASS; T-3 closed after the RDN-MAN-1 human check) |
| `test-report.md` | **absent, accepted by the owner** (evidence: per-task Jest runs + falsifiers + RDN-MAN-1 local run) |
| `validation-report.md` | **absent, accepted by the owner** (evidence: Reviewer PASS on every task + RDN-MAN-1) |
| Commits | `2720573fb` (T-1) · `90fbf57ee` (T-2) · `12dd6f5dc` (T-3) |

## 5. Requirements Delivered

| Requirement | Delivered by |
|---|---|
| `RDN-R-1` not-found and error screens never block navigation; mounted-section guard behaviour unchanged | T-1 |
| `RDN-R-2` phase chips open the module of their phase (IPSR phase -> `/ipsr/detail/{code}/general-information?phase={id}`; no `app_module_id` -> Reporting) | T-2 |
| `RDN-R-3` resolved IPSR result on the Reporting route redirects with `replaceUrl`; type 7 untouched | T-3 |
| `RDN-R-3` type 11 branch | Excluded by user decision 2026-10-19 (IPSR type set is `{10}`; 11 is complementary). Test case (e) asserts no redirect |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Guard | `shared/guards/unsaved-changes.guard.ts` (null/undefined branch) + `unsaved-changes.guard.spec.ts` + new `unsaved-changes.guard.routing.spec.ts` (`RouterTestingHarness`) |
| Result detail | `result-detail.component.ts` (`phaseLink(phase)`, `IPSR_RESULT_TYPE_IDS`, redirect `effect`), `.html:105`, `.spec.ts` |
| Docs | `result-detail/CLAUDE.md` (folder doc, updated by the Leader) |
| Size | client only, no server, data or migration change; budget was 3 tasks / ~25 prod + ~150 test LOC / 3 review rounds, actual 3 tasks / 4 review rounds |

## 7. Test Evidence Summary

| Run | Result |
|---|---|
| T-1 final: `shared/guards\|rd-general-information-routing` | 5 suites, 30 tests passed; lint clean |
| T-1 consumers (6 section specs + canDeactivate spec) | 53 suites, 1002 tests passed |
| T-2 `result-detail.component` | 42 passed; `tsc` exit 0 |
| T-3 `result-detail.component` | 47 passed; `tsc` and lint clean; `ngc` exit 0 (advisory) |
| After merging `origin/performance-refactor` | guards + routing + result-detail: 6 suites, 77 passed |
| Red runs | T-1: `TypeError ... hasUnsavedChanges` on null. T-2: wrong `href`. T-3: `navigate` called 0 times |
| Falsifiers | T-1 null branch removed; T-2 two; T-3 five (`replaceUrl`, code equality, one-shot, add 7, add 11). All applied, observed red, restored |

## 8. Validation Summary

- **Reviews:** T-1 FAIL on attempt 1 (router spec had no root outlet, so the hidden-outlet stub was inert), PASS on attempt 2. T-2 and T-3 PASS on attempt 1.
- **RDN-MAN-1** (local stack, Claude in Chrome, 2026-10-19; accepted by the owner in place of the deployed-env check):

| Check | Result |
|---|---|
| Type 10, `9733?phase=37` | Ends on `/ipsr/detail/9733/general-information?phase=37`; IPSR screen renders |
| Browser back after redirect | Returns to the results list, no loop |
| Type 11 / type 7 | Stay on the Reporting route |
| No `?phase` | Not-found screen; IPSR chip links to `/ipsr/detail/...` |
| Back to results / sidebar Home from not-found | Both navigate; no `TypeError` in the console |
| Flash of the Reporting section | Not observed 5 s after load; not measured frame by frame |

## 9. Accepted Warnings Or Follow-Ups

| Follow-up | Owner |
|---|---|
| RDN-MAN-1 ran locally, not on the deployed test environment; prod code 11719 does not exist in the local DB | Santiago |
| Redirect flag is set before `router.navigate` settles and the promise is unhandled: a cancelled navigation or a failed lazy IPSR chunk leaves the user on the Reporting form until reload | code follow-up |
| Inline comment and design RDN-DD-3 say the reuse strategy keeps the component alive across results; it only does so for a `?phase=` change on the same id | doc follow-up |
| `result_code` presence in `GET /results/get/:id` was inferred from usage and only seen working locally | confirm on test |
| Magic number `2` for the IPSR module (also `phases.service.ts:29-30`) could be a named constant | code follow-up |
| IPSR chip relies on `currentResultCode` being set by `getData()` before the failing request | known |
| Reverse redirect (Reporting result under the IPSR route) | out of scope (OQ1) |
| CodeGraph re-index (`codegraph sync`) | Santiago |

## 10. Historical Notes

- Reproduced in prod on 2026-10-14 with code 11719: a phase-less link always 404s, and the guard threw `TypeError ... hasUnsavedChanges` on the null component, cancelling every navigation.
- P-6 (does IPSR render type 11) was settled by product decision, not by the read-only environment check.
- Plain `tsc -p tsconfig.app.json` does not type-check templates; the T-2 falsifier only went red under `ngc -p tsconfig.app.json --noEmit`. `tasks.md` was not edited; `ngc` was passed to the Implementer as advisory.
- Branch was 84 commits behind `origin/performance-refactor` at T-3 (none touch these files); integrated by the merge.
- Extends `archive/2026-09-21-changes--unsaved-changes-alert` (`UCA-*`); behaviour unchanged (existing 9 guard cases green).
