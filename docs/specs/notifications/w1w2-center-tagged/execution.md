# Module Spec — W1/W2 "CG Center tagged" notification — Execution Log

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/notifications/w1w2-center-tagged/` |
| Branch | `qa-development-2026-ss` (base HEAD `e82c537`) |
| Leader | Opus 5.5 (T1) · Implementers `akili-implementer` · Reviewers `akili-reviewer` |
| Approval Mode | gated (spec). **Overridden by user, 2026-09-30:** "CONTINUA SIEMPRE HASTA QUE TERMINES, SI HAY ERRORES CORRIGELOS DE ACUERDO CON LOS SPECS GENERADOS" — continue/pause gates auto-pass after PASS; exceptions (HALT, Pivot, budget tripwire) still surface |
| Release instruction | User, 2026-09-30: when T6 is reached with touched-file tests green, commit and push the changes to `performance-refactor` |
| Started | 2026-09-30 |

## Task Execution History

### WCT-T-4 — Client: text-parts contract, sentence and copy

- **Status:** PASS (attempt 1, with one in-attempt scope completion)
- **Date:** 2026-09-30
- **Skills / effort:** `angular-developer`, `tdd` · medium (as listed)
- **Requirements covered:** WCT-R-5 (sentence, SP fallback, no forbidden phrases), WCT-R-7 (historical and BCT render), WCT-NFR-3

**Attempt 1**
- Files: `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts` (+ `.spec.ts`), `onecgiar-pr-client/src/app/internationalization/notification-center-tagged.copy.ts` (new)
- Red: `npx jest --testPathPattern "notification-type.constants.spec" --silent --reporters=summary --no-coverage` → 3 failed, 47 passed (the new bare-shape cases only)
- Implementer `Not Done`: "`buildResultNotificationText` (the flattened single-string helper, used by `pop-up-notification-item.component.ts` and the search-filter pipe) was **not** updated to splice in `lead` … a bare `RESULT_CENTER_TAGGED` row's flattened text omits the SP code."
- **Leader decision:** in scope for T4. The helper lives in the task's own file and is the plain-text form of the same contract (WCT-R-5 sentence; consumed by the bell link `search=` param and `filter-notification-by-search.pipe`). Re-sent to the same Implementer: join `[lead, prefix, identity, suffix]` + one exact-string case. Red for the new case: received `"has tagged your CG Center as a contributor (ABC) to result 9398 - <title>"` (lead missing).
- Green: `npx jest --testPathPattern "notification-type.constants.spec|filter-notification-by-search.pipe.spec" --silent --reporters=summary --no-coverage` → 2 suites passed, 65 tests passed · `npx ng lint --quiet` → All files pass linting
- Disqualifier: not triggered — spec diff is additive only; no `RESULT_BILATERAL_PROJECT_TAGGED` / `RESULT_CONTRIBUTION_*` / `BILATERAL_RESULT_SUBMITTED` assertion edited.
- **Reviewer:** `STATUS: PASS` — "The diff does what WCT-T-4 asks. It implements the design.md §8.1 contract exactly and meets every falsifier in tasks.md §WCT-T-4. The disqualifier holds."

**ADVISORY (recorded, no rework)**
- READABILITY: the `'a Science Program'` fallback is a literal in `notification-type.constants.ts`, not in the copy file (spec-sanctioned by §8.1; NFR-3 only covers templates).
- RISK: a bare label containing ` has tagged the ` or ending `Click to see the result.` would be read as composed — impossible for real acronyms/codes (DD-2, design R-2 accepted).
- RELIABILITY: until WCT-T-5 lands, consumers ignore `lead`; T4 and T5 must ship together (they do — one push at T6).

**Forward pointer → WCT-T-5:** the chip label `NOTIFICATION_CENTER_TAGGED_COPY` chip key is defined but unused until T5 consumes it.

### WCT-T-1 — Server: store the bare acronym and compose the push description

- **Status:** PASS (attempt 1)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` · medium-high (shared emitter + stored-text contract)
- **Requirements covered:** WCT-R-8, WCT-R-7 (server half), WCT-R-5 (push clause, acronym→code fallback), WCT-R-4 (dedup unchanged)

**Attempt 1**
- Files: `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts` (+ `.spec.ts`), `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ `.spec.ts`)
- Red: `npx jest --testPathPattern "result-tagged-notification.service.spec|notification/notification.service.spec" --silent --reporters=summary --forceExit` → 5 failed, 72 passed, 77 total (bare acronym stored, null acronym→code, no clarisa_institution→code, push bare sentence, push SP fallback)
- Green: same command → 2 suites passed, 77 tests passed · `npx tsc --noEmit` clean · eslint quiet clean (after prettier `--fix` on the two spec files)
- Disqualifier: not triggered. Three tests in `describe('notifyTaggedCenters (AC1)')` were rewritten in place — the P2-3214 direct-tag stored-text assertions that `requirements.md` Document Control explicitly amends ("Amends P2-3214 AC3"). No BCT (`notifyBilateralContributorsOnSubmission`) or NOTIF-T-12 (`RESULT_BILATERAL_PROJECT_TAGGED`) assertion edited; Reviewer verified.
- **Reviewer:** `STATUS: PASS` — "WCT-T-1 matches WCT-R-8, R-5 (push clause), R-7 and design §7.1/DD-1/DD-2. The BCT leadIn path, project-tagged behavior after the rename, the composed/empty push fallback, and dedup/saver exclusion are all unchanged."

**DoD mapping note (Reviewer advisory, recorded for accuracy):** the DoD lists "BCT unchanged" among ≥5 new cases. No new BCT stored-text case was added — BCT is covered by the existing, unedited BCT assertions. "no clarisa_institution→code" is a rewritten existing test. New push cases: bare, SP fallback, composed legacy, composed BCT, empty.

**ADVISORY (recorded, no rework)**
- READABILITY: in `emitFor`, the default lead-in `created by ${resolveOwnerProgramCode(result) ?? 'a Science Program'}` is now unreachable (every no-leadIn caller stores a bare label; BCT always passes leadIn). The docstring (~L261-265) is stale and `resolveOwnerProgramCode` lost its test. Candidate follow-up, outside T1 scope.
- RISK: `RESULT_CENTER_TAGGED` and `RESULT_BILATERAL_PROJECT_TAGGED` push cases duplicate identity build + bare/composed branch; a shared helper would prevent drift. Low priority.

## Pivot Record: WCT-T-2

- **Date:** 2026-09-30
- **Trigger:** WCT-T-2 attempt 1 stopped at its own disqualifier before writing code. The existing P2-3214 test `results_by_institutions.service.spec.ts` › `tagged-centre notifications (P2-3214)` › `notifies only the centres that were newly linked` (L876-893) saves `[{ code: 'CIM', is_leading_result: true }, { code: 'IITA', is_leading_result: false }]` (CIM new, IITA already linked) and asserts `notifyTaggedCenters` was called with `['CIM']`: the new **lead** is notified. This contradicts the design §10 reversion-challenge claim "No test asserts lead notification". Baseline run: 25/25 green, no files touched.
- **User decision 1:** "Revertir D-1": keep notifying the lead Center on the W1/W2 partners save.
- **User decision 2:** for IPSR, "Sí, notificarlo": A-1 is reverted too; the `primary` Center is notified like any newly linked Center.
- **Revised direction:**
  - T2 has no production change. It adds tests pinning the current audience: lead and contributor both notified, re-save silent, non-fatal emitter, and `source='API'` still notifies (DD-6).
  - T3 drops the `primary` filter (the in-flight Implementer was corrected by message).
  - DD-3 is superseded.
- **Known wording effect, accepted:** a lead or primary Center's row reads "has tagged your CG Center as a contributor (…)". That is the approved WCT-R-5 sentence, and no copy change was requested.
- **Spec amended (Correction Closure):**
  - `requirements.md`: answer-first, Document Control, Executive Summary row, glossary "Contributing Center", persona row, WCT-R-1 lead scenario, WCT-R-2 statement and BUT clause, defect-class row, ID index, A-1.
  - `design.md`: answer-first, §2 rows, §3 diagram, §7.2, §7.3, DD-3, reversion-challenge row.
  - `tasks.md`: T2 title, description, implements, falsifiers and disqualifier; T3 title, description, design, falsifier and cannot-prove note; T6 checks 2 and 3; coverage rows R-1 and R-2.
  - `proposal.md`: D-1 row.
- **Sweep:**
  - Forward grep for `non-lead|non-primary|excluded|exclusion` leaves only struck-through history, saver exclusion (unrelated), and `requirements.md:112` "newly linked as non-lead". The last is still a true example, because a non-lead Center is notified.
  - Backward check: T2 and T3 cite §7.2, §7.3 and DD-3, all of which are now amended in place.
- **ADRs affected:** none. This is a TRD-level change only.

### WCT-T-2 — Server: pin the partners-save audience (lead included) — amended by Pivot

- **Status:** PASS (attempt 2; attempt 1 stopped at the disqualifier → Pivot Record above)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` · attempt 1 medium, attempt 2 high (post-Pivot retry)
- **Requirements covered:** WCT-R-1 (contributor, lead — D-1 reverted, re-save active/inactive, non-fatal), WCT-R-3 (amended, DD-6), WCT-NFR-1

**Attempt 1** — no edits. Disqualifier hit: the existing P2-3214 test `notifies only the centres that were newly linked` asserts that a new lead (CIM) is notified. Baseline: 25/25 green. The run escalated to the user, who reverted D-1 and A-1 (see Pivot Record).

**Attempt 2**
- Files: `onecgiar-pr-server/src/api/results/results_by_institutions/results_by_institutions.service.spec.ts`, 97 lines added. The service has no net change: the Leader checked `git diff --stat` and found no `TEMP FALSIFIER` marker in the tree.
- New tests:
  1. Lead and contributor are both new → `['ABC','XYZ']`.
  2. ABC already exists as an active row → not notified.
  3. ABC already exists as an inactive row → not notified.
  4. The emitter rejects → the save still resolves.
  5. `source:'API'` → still `['ABC']`.
- Failability proof: the Implementer temporarily broke the service four ways at once (inverted the exists branch, added a lead filter, added an API early return, removed the try/catch). Result: `Tests: 9 failed, 21 passed, 30 total`, with all 5 new tests failing. The edits were then reverted.
- Green: `npx jest --testPathPattern "results_by_institutions.service.spec" --silent --reporters=summary --forceExit` → 30 passed. eslint clean.
- Disqualifier (new: an existing P2-3214 assertion must be edited to go green): not hit. The diff is one additive hunk.
- **Reviewer:** `STATUS: PASS`. Summary: "The 5 added tests pin the amended audience (lead included, re-save silent for active or inactive rows, a failed notification does not break the save, no source filter). No production code changed and the existing P2-3214 assertions were not edited."

**ADVISORY (recorded, no rework)**
- RELIABILITY: the DD-6 test is close to tautological at this seam. `handleContributingCenters` never reads `source`, so the test would miss a guard added at a caller. **Known gap**: the end-to-end proof is WCT-T-6 prtest check 4.
- READABILITY/RELIABILITY: the rejection test spies on `console.error` (copied from P2-3214), but the service logs through `this._logger.error`, and the spy is never restored. WCT-R-1's "the error is logged" clause is not asserted. Candidate follow-up.

### WCT-T-3 — Server: IPSR contributors save notifies newly saved Centers (primary included), amended by Pivot

- **Status:** PASS (attempt 2)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd`. Attempt 1 ran at medium-high, attempt 2 one level higher.
- **Requirements covered:** WCT-R-2 (A-1 reverted, primary included), WCT-NFR-1

**Attempt 1**
- **Mid-task Leader correction (Pivot):** drop the `primary` filter and record every newly saved code.
- Files:
  - `onecgiar-pr-server/src/api/ipsr/results-package-toc-result/results-package-toc-result.service.ts`: injected `ResultTaggedNotificationService`, collected new codes in the new-row branch, and added the post-loop `notifyNewlyTaggedCenters` (try/catch, `Logger.error`, no rethrow).
  - `.../results-package-toc-result.module.ts`: imports `NotificationModule`. No `forwardRef` was needed.
  - `.../results-package-toc-result.service.spec.ts`: new file, 5 tests.
- Red: the spec failed to compile against the old constructor (`TS2554: Expected 18 arguments, but got 19`).
- Green: `npx jest --testPathPattern "results-package-toc-result.service.spec" --silent --reporters=summary --forceExit` → 5 passed. `npx nest build` exit 0. `tsc --noEmit` and eslint clean.
- **Reviewer:** `STATUS: FAIL`. Findings, verbatim:
  1. **Discovered Issue:** Two comments in the diff still describe the reverted primary exclusion, which contradicts the amended spec they cite:
     - `results-package-toc-result.service.ts` (the comment above `newlyLinkedCenterCodes`) cites `WCT-R-2, A-1` as if A-1 were in force.
     - The header of the new `results-package-toc-result.service.spec.ts` says "notifies new non-primary Centers" and "covered elsewhere / by design A-1, DD-3".

     The spec's own `it(...)` titles say the opposite ("primary or not"). The next maintainer of this audience logic would read that primary is excluded.
     - **Violated Rule:** `requirements.md` WCT-R-2 ("every newly tagged Center is notified, `primary` included (A-1 reverted …)") and A-1 (reverted); `design.md` DD-3 (Superseded); `execution.md` › `## Pivot Record: WCT-T-2` › Sweep, which greps for `non-primary` and expects only struck-through history to remain. The new file brings the term back.
     - **Remediation Suggestion:** Comment-only fix, no logic change.
       - Service: cite `WCT-R-2 (A-1 reverted, Pivot WCT-T-2 2026-09-30)` and say "every newly saved Center, primary included".
       - Spec header: say "notifies every newly saved Center (primary included)" and drop the "by design A-1, DD-3" pointer, or mark both as reverted/superseded.
       - Re-run the scoped Jest command afterwards.
  - Advisory raised in this round: test 5 could not tell an awaited `save` from a fire-and-forget one.

**Attempt 2**
- Comment-only fixes in both files. Test 5 strengthened: the `save` mock pushes `'save'` only after `await Promise.resolve()`.
- Proof: with the `await` on `save` removed, test 5 failed. The `await` was restored.
- Grep for `non-primary` in both files: none.
- Green: 5 passed. eslint clean.
- **Reviewer:** `STATUS: PASS`. Summary: "The IPSR contributors save now notifies every newly saved Center, primary included, after the save and without failing the save if notification fails, as WCT-R-2, WCT-NFR-1 and design §7.3/§7.4 require. The five tests now include one that fails if the `await` on `save` is dropped. All round-1 findings are closed."

**ADVISORY (recorded, no rework)**
- RISK, known gap: `nest build` is a TypeScript compile and does not resolve the Nest DI graph. Reading the modules shows correct wiring (`NotificationModule` exports the service, and nothing imports the IPSR module back), but Nest startup is unproven until T6 prtest or a `start:dev` boot.
- RELIABILITY: the emitter fires after the center loop but before the later ToC/EOI/institutions saves, with no transaction. If a later step throws, Centers are notified while the request returns an error. The center rows do persist, which matches the exemplar.
- READABILITY: the log text says "centre". This matches the exemplar's wording and is cosmetic.

### WCT-T-5 — Client: render `lead` in three consumers, plus the green chip

- **Status:** PASS (attempt 2)
- **Date:** 2026-09-30
- **Skills / effort:** `angular-developer`, `spartan`, `tdd`. Attempt 1 ran at medium, attempt 2 one level higher.
- **Requirements covered:** WCT-R-5 (inbox, Updates and bell; SP emphasis), WCT-R-6, WCT-R-9, WCT-NFR-3, WCT-NFR-4

**Attempt 1**
- Files:
  - `notification-item.component.{ts,html,spec.ts}`: `rowTypeChipLabel` and `rowTypeChipColorClass` handle the `RESULT_CENTER_TAGGED` update row (`NOTIFICATION_CENTER_TAGGED_COPY.chipLabel` plus `--pr-status-approved-bg/-fg`).
  - `update-notification.component.{html,spec.ts}`
  - `pop-up-notification-item.component.{html,spec.ts}`
  - Each of the three templates renders `@if (lead) { <b> {{ lead }} </b> }` before the prefix.
- No production change for `rowMode` (design §8.5). A pinning assertion was added instead.
- The new pop-up tests use a fresh `TestBed.createComponent`, because reusing the shared fixture threw NG0100.
- Red: `npx jest --testPathPattern "notification-item.component.spec|update-notification.component.spec|pop-up-notification-item.component.spec|notification-type.constants.spec" --silent --reporters=summary --no-coverage` → 3 suites failed, 6 tests failed, 267 passed.
- Green: same command → 5 suites passed, 273 tests passed. `npx ng lint --quiet` clean.
- **Reviewer:** `STATUS: FAIL`. Findings, verbatim:
  1. **Discovered Issue:** `notification-item.component.ts` changed `rowTypeChipLabel` and `rowTypeChipColorClass`, but the folder's own guide was not updated. `D:\PRMS\onecgiar_pr\onecgiar-pr-client\src\app\pages\results\pages\results-outlet\pages\results-notifications\components\notification-item\CLAUDE.md` L29-31 still says `rowTypeChipLabel` returns "the resolved `NotificationType` for every update-source row". That is no longer true for `RESULT_CENTER_TAGGED`, which now returns `CG Center tagged` with the green approved pair. The `**Verified:**` stamp (L267) was not re-stamped either.
     - **Violated Rule:** `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs": "Touching any file in a folder that has its own `CLAUDE.md` → update that `CLAUDE.md` and re-stamp its `**Verified:**` line in the **same commit**". The same rule is listed in `onecgiar-pr-client/src/CLAUDE.md` §22 anti-patterns.
     - **Remediation Suggestion:** Amend the "Chip taxonomy" bullet: update rows show the resolved type, except `RESULT_CENTER_TAGGED`, which shows `NOTIF_CENTER_TAGGED_COPY.chipLabel` with `--pr-status-approved-bg/-fg` (WCT-R-6, DD-5). Optionally add one line on the new `lead` part rendered in `<b>` before the prefix. Then re-stamp `Verified:` with a WCT-T-5 entry. The `update-notification/` and `pop-up-notification-item/` folders have no `CLAUDE.md`, so nothing else needs updating.

**Attempt 2**
- Doc-only change. `notification-item/CLAUDE.md`: amended the Chip taxonomy bullet, added a `lead` line, and re-stamped `**Verified:**` for WCT-T-5. The previous stamp moved under `**Prior verification:**`.
- No other folder `CLAUDE.md` exists in the touched folders.
- Re-run: 5 suites passed, 273 tests passed. Lint clean.
- **Reviewer:** `STATUS: PASS`. Summary: "Attempt 2 fixes the one issue from attempt 1. The folder guide … now describes the `RESULT_CENTER_TAGGED` chip label, the green chip colours and how `lead` renders, and the `**Verified:**` line is re-stamped for WCT-T-5." The Reviewer confirmed that `NOTIFICATION_CENTER_TAGGED_COPY` is the real export, and that `NOTIF_` in its attempt-1 report was a typo.

**ADVISORY (recorded, no rework)**
- RISK: the Type filter facet (`results-notifications.component.ts::rowTypeLabel` and `pipes/filter-notification-by-type.pipe.ts`) still uses `resolveNotificationType()`. The facet therefore lists "Result Center Tagged" while the rows show "CG Center tagged". Filtering still works. This is within DD-5's local scope, and a similar mismatch already exists for request rows since PSR-T-8. Candidate follow-up: one shared label helper.
- READABILITY: `rowTypeChipLabel` calls `resolveNotificationType` twice.
- Pre-existing debt: `notification-item/CLAUDE.md` was 272 lines before this task and is now 297, over the 120-line folder-doc cap.

## Budget Tripwire

- **Date:** 2026-09-30, after T1–T5 PASS.
- **Budget (`design.md` §11, revised in `tasks.md` §6):** ~380 LOC, with a 400 tripwire. Review rounds: 1–2 per task, with 3 as the tripwire. Tasks: 6, with 8 as the tripwire.
- **Actual:**
  - About 920 LOC: 701 insertions and 57 deletions across 17 tracked files, plus 219 lines in 2 new files. Most of it is tests, plus one folder `CLAUDE.md` update. The production code delta is small.
  - Rounds: T1, T2 and T4 took 1. T3 and T5 took 2. T2 also had one disqualifier stop, which led to the Pivot.
  - Tasks: 6.
- **Cause:** the Implementers added more falsifier and pinning cases than the per-task estimates assumed. Examples: T1 has 5 new push cases plus 3 rewritten stored-text cases, T2 pins 5 cases, T3's spec file is new at 200 lines, and T5 adds blocks to 3 component spec files. The Pivot also turned T2 into a tests-only task.
- **Escalated to the user** with the delta and the cause. The user decided: "Commit y push a mi Rama y también commit y push a performance refactor".

## Final Verification (Leader, tree quiet, no delegated agent active)

- Server: `npx jest --testPathPattern "result-tagged-notification.service.spec|notification/notification.service.spec|results_by_institutions.service.spec|results-package-toc-result.service.spec" --silent --reporters=summary --forceExit` → 4 suites passed, 112 tests passed. `npx tsc --noEmit -p tsconfig.json` → exit 0.
- Client: `npx jest --testPathPattern "notification-type.constants.spec|filter-notification-by-search.pipe.spec|notification-item.component.spec|update-notification.component.spec|pop-up-notification-item.component.spec" --silent --reporters=summary --no-coverage` → 6 suites passed, 287 tests passed.
- WCT-NFR-2: `git status` shows no file under `onecgiar-pr-server/src/migrations/`.
- No `TEMP FALSIFIER` marker anywhere in the tree.
- Files from a parallel session that are **not** part of this spec and were excluded from the commits: `docs/specs/notifications/inbox-paginated-load/`, `onecgiar-pr-server/src/shared/utils/keyset-cursor.util{,.spec}.ts`.

## WCT-T-6 — Rollout: manual visual and data gates

- **Status:** `[ ]` pending, owned by a human at the HITL pause. Nothing is implied as passed.

| # | Check | Result |
|---|---|---|
| 1 | Inbox row matches `mockup/center-tagged-row.png`; bell and real-time toast sentence | **pass (inbox row)**, 2026-10-01, prtest, user 575, result 9730: "**SP05** has tagged your CG Center as a contributor (Bioversity (Alliance)) to result 9730 - scrambled", with the green `CG Center tagged` chip, the `W1/W2` chip and the meta line, and no decision buttons. Bell and real-time toast: not-run |
| 2 | prtest: W1/W2 partners save newly linking a contributor and/or the lead notifies that Center's users | **pass**, 2026-10-01, prtest. Result 11864 (code 9396): CIMMYT (`CENTER-05`), newly linked as **lead**, notified user 1131 with `text = 'CIMMYT'` (notification 48935, emitter 575, saver not notified). Bioversity (`CENTER-02`), newly linked as contributor on result 9730, notified user 575. Re-save path confirmed: on 11864, `CENTER-02` had been linked since 2026-09-16 and was not re-notified |
| 3 | prtest: IPSR step adding a Center notifies, primary included | **pass**, 2026-10-01, prtest. IPSR 9732 (`result_id` 12200, cycle IPSR 2026, phase 37): `CENTER-02` was newly saved as the **lead** (`is_leading_result = 1`) by user 606. This created 10 `Result Center Tagged` rows with `text = 'Bioversity (Alliance)'`, one per active `CENTER-02` Center User; user 575 got notification 48954. The inbox, filtered to Phases = IPSR 2026, shows "**SP01** has tagged your CG Center as a contributor (Bioversity (Alliance)) to result 9732 - …" with the green chip; IPSR 9733 (SP05) shows the same. Saving through the new IPSR endpoint confirms the Nest DI boot works (closes the T3 gap) |
| 4 | prtest: SP review of a bilateral result adding a Center notifies with the new sentence (DD-6) | **pass (user-reported)**, 2026-10-01, prtest. The user tested it through the Bilateral review drawer (`PATCH results/bilateral/review-update/data-standard/:id`) and reported "Todo funcionó bien". This closes the T2 DD-6 seam gap |
| 5 | An old row still renders the old sentence | **pass (user-reported)**, 2026-10-01, prtest. The user reported "Todo funcionó bien" |

## Follow-up candidates (advisories only; the user decides whether they earn a proposal)

- Server `emitFor`: the default lead-in `created by …` and `resolveOwnerProgramCode` are now unreachable, and the docstring is stale (T1).
- Server: a shared helper for the duplicated bare/composed push-description branches (T1).
- Server spec: the T2 rejection test spies on `console.error` instead of `_logger.error` and does not assert the log (T2).
- Client: the Type filter facet still shows "Result Center Tagged" while the chip shows "CG Center tagged" (T5).
- Client: `notification-item/CLAUDE.md` is over the 120-line folder-doc cap. This debt predates the spec (T5).

**T6 note, 2026-10-01: a center acronym that already carries parentheses renders doubled.** Example: CLARISA acronym `Bioversity (Alliance)` gives `…as a contributor (Bioversity (Alliance)) to result…`. This literally conforms to WCT-R-5 `({Center acronym})`. Offered options: drop the extra parentheses, or use brackets or a dash. **User decision: "Dejarlo así"** (accepted as is).

**T6 diagnostic note:** the first report of "no notification" on result 9396 came from a query filtered by `result_id = 9396`. That value is the `result_code`; the real `result_id` is 11864. Re-querying by 11864 showed the cases above.

**User confirmation, 2026-10-01:** the per-user notification model (one row per Center/SP member, each with its own read state) stays as is. The user consulted two team members and dropped the shared-notification idea. No proposal was opened. The inbox phase filter already lists IPSR phases (`GET_versioning(ALL, ALL)`), so no change was needed.

**T6 closure, 2026-10-01:** the user reported all remaining checks working ("Todo funcionó bien"). Checks 4 and 5 are recorded as user-reported passes. Check 1's bell and real-time toast clause is covered by the same statement. WCT-T-6 is complete.
