# Execution Log — `multi-hlo-result-linking`

## 1. Document Control

- **Spec path:** `docs/specs/changes/multi-hlo-result-linking/`
- **Approval mode:** not recorded in `requirements.md`/`design.md`/`tasks.md` Document Control — treat as `gated` (default; each PASS/HALT reported to user, continue/pause gate applies).
- **Leader model:** Sonnet 5 (session model; T1 registry recommends `opus` — noted, not blocking).
- **Implementer model:** Sonnet 5 (T2).
- **Reviewer model:** Opus (T3 — author ≠ auditor honoured).
- **Run started:** 2026-09-18.

---

## 2. Task Execution History

### `MHL-T-1` — Reject typology-mismatched ToC links in `createTocMappingV2`

**Status: IN PROGRESS (attempt 1 FAILed, retry pending)**

#### Attempt 1 — 2026-09-18

- **Skills assigned:** `nestjs-expert`, `tdd`. **Effort:** medium.
- **Files changed:** `onecgiar-pr-server/src/api/results/results-toc-results/results-toc-results.service.ts`, `results-toc-results.service.spec.ts`.
- **Implementer summary:** Added `_rejectTypologyMismatchedTocLinks` pre-upsert guard reusing `RESULT_TYPE_TO_INDICATOR_PATTERN` via `TocResultsRepository.getTocIndicatorsByResultIds`; permissive fallback for result types with no pattern entry; rejected items surfaced via new additive `rejected_result_toc_results` field in the response (chose this over throwing, to preserve partial-success persistence of matching siblings); structured log line on rejection.
- **Implementer verification:** `npx jest --testPathPattern results-toc-results.service.spec.ts --silent` → 12/12 passed (9 pre-existing + 3 new). `npx eslint ... --quiet` → clean. Coverage (file-scoped, no true before/after delta): 32.42%/24.26%/29.59%/32.87% (stmts/branches/funcs/lines).
- **Implementer Not Done / Assumptions:** no true coverage delta measured (judged not worth a second ~6-8min run); response-shape judgment call (additive field vs. thrown exception) to preserve partial-success semantics; `contributors-partners.service.ts` untouched (out of task's file list); `MHL-OQ-2` untouched (out of scope, belongs to `MHL-T-4`).
- **Reviewer verdict: STATUS: FAIL**

  1. **Discovered Issue:** A rejected item is not merely blocked — the corresponding already-persisted `results_toc_result` row is soft-deleted (`is_active: false`) by the existing dedup/keepIds logic once the guard mutates the incoming arrays in place, and the request still returns `201 Created`. No error is raised; the only trace is an unread response field.
     **Violated Rule:** `requirements.md` §7 (Backwards compatibility, Observability), §8 `MHL-AC-3`; `design.md` §4.1 Errors, §5, §11.
     **Remediation:** turn a rejection into a real error signal (e.g. `422`/`400` naming the rejected `toc_result_id`s) while still persisting matching siblings; and/or exclude items that carry an existing `result_toc_result_id` from the guard (or add rejected items' existing IDs back into `keepIds`) so a rejection never soft-deletes a previously-saved link.
  2. **Discovered Issue:** The guard's node-level "match" (via `getTocIndicatorsByResultIds` row presence) is stricter than the canonical candidate-list filter (`_buildPlannedResultTypeIndicatorExistsFilter`), which also admits "neutral" nodes (zero indicators, or only inactive indicators of another type). The guard rejects those neutral nodes even though the server's own candidate list would have offered them — a second, divergent copy of match semantics, the exact drift `MHL-DD-1` warns against.
     **Violated Rule:** `requirements.md` §6 `MHL-R-4`, `MHL-R-5`, §8 `MHL-AC-1`; `design.md` §12 `MHL-DD-1`.
     **Remediation:** align node-level acceptance with `_buildPlannedResultTypeIndicatorExistsFilter`'s `(currentTypeExists OR NOT EXISTS other-type)` logic, or treat a zero-row lookup result as a match; add a unit case for a neutral/zero-indicator node.
  3. **Discovered Issue:** New tests never set `work_package_id` in fixtures, so case (a) cannot demonstrate "two HLO items under the same AoW" as the DoD requires; no case covers an item carrying an existing `result_toc_result_id` (the Issue-1 deactivation path); no coverage delta recorded.
     **Violated Rule:** `tasks.md` `MHL-T-1` DoD (test (a) requirement; coverage-delta requirement).
     **Remediation:** add `work_package_id` to the AoW-sharing fixture; add a case with an existing `result_toc_result_id` on a rejected item asserting it is NOT deactivated; record coverage before/after.

  **ADVISORY (4R, non-gating):** in-place mutation + return value on `_rejectTypologyMismatchedTocLinks` is confusing (readability); `targetYear: new Date().getFullYear()` diverges from other callers' `reportingYear` convention, inert today but fragile (reliability); a `getTocIndicatorsByResultIds` throw fails the whole save — decide/document if that's desired (resilience); first deploy may reject/strip pre-existing bilateral/unplanned links at scale — recommend a read-only count check against real rows before shipping (risk).

- **Attempt 1 outcome:** FAIL. Proceeding to attempt 2 with effort bumped to `high` and the full feedback above passed verbatim to the Implementer.

#### Attempt 2 — 2026-09-18

- **Skills assigned:** `nestjs-expert`, `tdd`. **Effort:** high.
- **Files changed:** same as attempt 1, plus `onecgiar-pr-server/src/toc/toc-results/toc-results.repository.ts` (new read-only batched helper `getTocResultTypologyVerdicts`, extracted shared expression `_buildTypeIndicatorExistsExpression` reused by the existing candidate-list filter).
- **Implementer summary:** Fixed Issue 1 (planned path) by returning `{rejectedTocResults, preservedExistingIds}` and folding `preservedExistingIds` into `keepIds` for the (planned-path) deactivation sweep; turned the additive-field-only rejection into a real `422 UNPROCESSABLE_ENTITY` HTTP response (verified against `ResponseInterceptor`). Fixed Issue 2 by adding `getTocResultTypologyVerdicts`, reusing the exact `_buildPlannedResultTypeIndicatorExistsFilter` node-level expression via a new shared private helper, so "neutral" nodes are no longer wrongly rejected. Fixed Issue 3 by adding `work_package_id` to fixtures, an existing-row-not-deactivated test, and a neutral-node test.
- **Implementer verification:** 14/14 service tests pass; 76/76 combined with `toc-results.repository.spec.ts` (confirms read-path filter behavior unchanged after the shared-expression extraction); eslint clean (full project); `tsc --noEmit` clean; coverage 32.7%/24.52%/29.59%/33.14% (small monotonic increase from attempt 1).
- **Implementer Not Done / Assumptions:** judgment call to reject-and-report (422) rather than silently accept a mismatched resubmission of an already-linked HLO, reasoning `MHL-AC-3` doesn't carve out an exception for previously-saved links; judgment call to elevate the existing `status` field (read by `ResponseInterceptor`) rather than throw mid-method, since `createTocMappingV2` has no explicit transaction wrapper.
- **Reviewer verdict: STATUS: FAIL**

  1. **Discovered Issue:** The Issue-1 fix only protects the **planned** deactivation sweep. A second, unconditional deactivation block exists for the `planned_result === false` (unplanned) branch (~L1802-1818: blanket-deactivates ALL active rows for the result, then a later loop only resurrects rows present in the incoming payload) — `keepIds`/`preservedExistingIds` is never consulted there. A typology-rejected item that already had a persisted row is silently soft-deleted on the unplanned path, exactly the attempt-1 defect, now surviving on a path `design.md` §12 `MHL-DD-3` explicitly names as depending on this guard as the *only* enforcement (`isUnplanned` flows have no candidate-list pre-filter). None of the 5 new test cases set `planned_result: false`, so the green suite never exercised this path.
     **Violated Rule:** `requirements.md` §7 NFR Backwards compatibility & Observability; `design.md` §11; `design.md` §12 `MHL-DD-3`.
     **Remediation:** make the unplanned blanket-deactivation honor the same `keepIds` (or the same fetch-once-and-reuse pattern as the planned path); add a test mirroring "Reviewer Issue 1" but with `planned_result: false`, asserting the existing row is not deactivated.

  Reviewer independently VERIFIED CLEAN (not just re-trusting the report): param-order preserved in the `_buildPlannedResultTypeIndicatorExistsFilter` refactor (no regression to the existing, heavily-used candidate-list query); new SQL in `getTocResultTypologyVerdicts` well-formed, alias-consistent; the planned-path `keepIds` fix genuinely works for `planned_result === true`; 422 genuinely reaches the HTTP layer via `ResponseInterceptor`; no `MHL-AC-4` read-path regression (pure extraction, byte-identical emitted SQL); permissive-fallback test correctly asserts the new method was never called; coverage delta small but real and monotonic.

  **ADVISORY (4R, non-gating):** a `toc_result_id` absent from `toc_results` entirely gets the same "typology mismatch" message as a real mismatch — consider a distinct message; `Number(row.type_matches) === 1` boolean coercion has no precedent elsewhere in the file (safe today, given mysql2's LONGLONG for `EXISTS`, but implicit) — consider `CAST(...AS UNSIGNED)` for self-evidence; in-place mutation + separate "caller MUST fold into keepIds" hand-off contract is exactly the kind of implicit coupling that caused this FAIL — consider returning a `{keepIds}` set directly rather than a `preservedExistingIds` list the caller must remember to union; the write guard doesn't grandfather a result's own already-linked node the way the read-path filter does (`OR EXISTS(results_toc_result... results_id = ?)`), so a legacy mismatched link may 422 on every future save of that result even with no changes to it — defensible under `MHL-R-4` but worth a product confirmation before release.

- **Attempt 2 outcome:** FAIL. Proceeding to attempt 3 (final attempt) with effort bumped to `xhigh` and Implementer escalated to a stronger model, given the correctness-critical nature (silent data loss) and that attempt 2 fixed the *same class* of bug on only one of two code paths.

#### Attempt 3 (final) — 2026-09-18

- **Skills assigned:** `nestjs-expert`, `tdd`. **Effort:** xhigh. **Implementer model:** Opus (escalated from Sonnet).
- **Files changed:** `results-toc-results.service.ts`, `results-toc-results.service.spec.ts` (`toc-results.repository.ts` untouched this attempt).
- **Implementer summary:** Introduced one dedicated `preservedRejectedIds` set (deliberately not reusing `keepIds`, which would have changed behavior for contributor rows of inactive initiatives that the unplanned sweep intentionally leaves deactivated). Applied it at three sites: (1) unplanned blanket sweep (the FAIL-named bug), (2) unplanned "no result_toc_results" special-case criteria deactivation (`Not(In([...]))`), (3) planned "no result_toc_results" existing-record lookup. Exhaustive sweep of every `_resultsTocResultRepository` write in the file; remaining sites are payload-driven or in methods that never invoke the guard.
- **Implementer verification:** TDD red→green shown (red: `update(10350, {is_active:false})` observed before the fix). `results-toc-results.service.spec.ts` 16/16 pass; adjacent suites (`contributors-partners.service.spec`, `toc-results.repository.spec`, `toc-results.service.spec`) 6 suites / 112 tests pass; eslint full-project clean; coverage 33.68% / 24.75% / 31% / 34.14% (scoped single-file run; global thresholds print as unmet only because of single-file scoping, not a regression).
- **Implementer Not Done / Assumptions:** dedicated set instead of `keepIds` (judgment call, justified above); sites 2 and 3 fixed beyond the single named site; `updateTocResultPartial` and the legacy `create`/`saveMapToToc` paths never run the `MHL-R-4` guard — flagged as an out-of-scope spec decision, not fixed; two attempt-2 advisories (distinct message for absent `toc_result_id`; `Number(row.type_matches) === 1` coercion) left as-is.
- **Reviewer verdict: STATUS: PASS.** Verified at source: `preservedRejectedIds` computed unconditionally before all four consuming sites with no early-exit path; the `keepIds`-vs-dedicated-set claim holds (contributors loop `continue`s on inactive initiative); sites 2 and 3 reachable from a guard-emptied array; `Not(In([...]))` has in-repo precedent (`shared/entities/base-service.ts`) and the empty-`In([])` hazard is guarded; no fifth unguarded write site; new tests would fail against attempt-2 source; attempt-2 verifications (param order, 422 surfacing, verdict SQL, `MHL-AC-4` read path) undisturbed.
  **Process note:** the Reviewer's task notification reported `failed` (API rate limit, HTTP 429) but the full hand-back report, including the verdict and evidence, had already been delivered. The verdict is accepted on the strength of that delivered report; the terminal failure status is recorded here for transparency. Also, the diff briefed to this Reviewer omitted `toc-results.repository.ts`; the Reviewer read it directly from the working tree.
  **ADVISORY (4R, non-gating, recorded and not converted into tasks):**
  - *Reliability:* site 3 changes the all-rejected planned case: `findOne` now excludes the preserved row, finds nothing, and falls to the `insert` branch, creating one placeholder row (`toc_result_id: null, planned_result: true`) next to the preserved row. Bounded to one row, same shape the existing "planned with no items" path already produces, not covered by a test. Suggested follow-up: skip the insert when every item was rejected, plus an `insert` assertion.
  - *Risk:* a previously-saved link whose node is now mismatched is still offered by the candidate list (its `OR EXISTS already-mapped` branch) but rejected by the write guard, so the submitter gets a 422 on every save of that form until the link is removed. The row survives. Needs a support note or product decision before release.
  - *Readability:* rejection telemetry omits "expected vs. actual pattern" that `design.md` §4.1 mentions.
  - *Process:* future review briefs must include every touched file.

**Task MHL-T-1 status: `[x]` PASS on attempt 3 (2 rework rounds).** Requirements covered: `MHL-R-4`, `MHL-R-5`, `MHL-AC-1`, `MHL-AC-3`.
**Decisions made:** (a) reject via HTTP 422 by setting the `status` field that `ResponseInterceptor` reads, not by throwing, to preserve partial-success (matching siblings still persist); (b) response gains additive `rejected_result_toc_results`; (c) typology verdict reuses the candidate-list node-level expression via new repository helper `getTocResultTypologyVerdicts` (`MHL-DD-1`); (d) permissive fallback for result types without a pattern entry.
**Issues encountered:** attempt 1 silent soft-delete + match-semantics drift; attempt 2 same soft-delete defect surviving on the unplanned path. Budget note: design.md expected 1 review round, actual is 3 attempts for this task; LOC is well above the ~120-180 estimate for the server side. Flagged for the user at the gate.

---

### `MHL-T-4` — Verify no downstream rollup assumption breaks; close open questions

**Status: PASS on attempt 1.**

#### Attempt 1 — 2026-09-18

- **Skills assigned:** none (docs/investigation). **Effort:** medium.
- **Files changed:** `docs/specs/changes/multi-hlo-result-linking/requirements.md` (§10 only). No production code.
- **Implementer summary:** `MHL-OQ-2` answered **no-doesn't** for the PMU/AoW progress rollup. In `aow-bilateral.repository.ts`, the `act` subquery in `getIndicatorContributions` (L829-871) fans a result over its `results_toc_result` rows and groups by `tri.toc_result_indicator_id` (per indicator, no `COUNT(DISTINCT)`); `buildTocQuery`, `groupTocRows` and `rollUpIndicators` never aggregate per result or per AoW. `MHL-OQ-3` resolved (no soft cap, by `MHL-DD-2`); `MHL-OQ-4` explicitly deferred (by `MHL-DD-3`; write guard now covers those flows with a 422). Added the accepted open item on the legacy-mismatched-link 422 behavior.
- **Implementer Not Done / Assumptions:** ~40 other `results_toc_result` call sites in `results-toc-results.repository.ts` and export queries in `result.repository.ts` were sampled, not exhaustively audited (stated in §10); did not verify in the DB that `toc_result_indicator_id` is unique per indicator; no tests or builds run.
- **Reviewer verdict: STATUS: PASS.** Independently re-read source: `results_toc_result` appears at only two lines in `aow-bilateral.repository.ts`, both inside the `act` subquery, grouped per indicator with `SUM(CASE ...)`, so a second HLO link adds a separate contribution to a different indicator bucket, with no collapse or double count. The `no-doesn't` claim is scoped honestly ("for the PMU/AoW progress rollup", with the sampling caveat), so it is not over-claimed. Residual (b) confirmed: `ResultRepository.getResultsByProgramAndCenters` (`api/results/result.repository.ts:3226`) uses `MAX(tr.result_title)` / `MAX(twp.acronym)` / `MAX(t_selected.indicator_description)` grouped per result, so a multi-HLO result would show one arbitrary HLO title/indicator. Minor citation offsets (`buildTocQuery` starts at L418, not 430; the file path lacks a `result/` directory) are harmless.
- **Open items handed to the user (not tasks, not fixed):** (1) file a follow-up ticket to make `getResultsByProgramAndCenters` multi-HLO-aware; (2) confirm with product that a result linked to 2 HLOs in the same AoW counting in both HLOs' numerators (double weight at AoW-level average) is intended; (3) product confirmation on the 422-on-every-save behavior for legacy mismatched links before release.

**Task MHL-T-4 status: `[x]` PASS on attempt 1.** Requirements covered: `MHL-OQ-2`, `MHL-OQ-3`, `MHL-OQ-4`.

---

## Summary (all tasks complete)

| Task | Result | Attempts |
|---|---|---|
| `MHL-T-1` server typology guard | PASS | 3 (2 rework rounds) |
| `MHL-T-2` tab cap by candidate count | PASS | 1 |
| `MHL-T-3` duplicate-only disable + a11y label | PASS | 1 |
| `MHL-T-4` rollup check, close OQs | PASS | 1 |

**Not done and pending the user:** no commit was made (standing no-auto-commit instruction; commit format is `<emoji> <type>(<scope>) [#163059]: <description>`, single PR recommended per `tasks.md`); client coverage floor unverified (`--no-coverage` runs); server global coverage gate only meaningful on a full-suite run (not executed per standing rule); manual a11y/contrast check (`MHL-TEST-4`) belongs in the PR description; `tasks.md` §6 rollout and §7 cleanup items are untouched. **Budget tripwire:** design.md budgeted ~120-180 LOC and 1 review round; `MHL-T-1` needed 3 attempts and materially more server LOC than estimated, surfaced for the user to weigh.

### `MHL-T-2` — Fix `getMaxNumberOfTabs` to stop capping by distinct AoW

**Status: IN PROGRESS (Reviewer pending)**

#### Attempt 1 — 2026-09-18

- **Skills assigned:** `angular-developer`. **Effort:** low-medium.
- **Files changed:** `onecgiar-pr-client/.../multiple-wps/multiple-wps.component.ts`, `multiple-wps.component.spec.ts`.
- **Implementer summary:** `getMaxNumberOfTabs` now returns candidate-list length (`outputList.length` / `eoiList.length` / `outcomeList.length + eoiList.length` per `resultLevelId`/`plannedResult` dispatch) instead of a distinct-`work_package_id` `Set` size. Test fixture updated with AoW-sharing duplicates so old-vs-new logic diverges (no-pass clause satisfied).
- **Implementer verification:** `npx jest --testPathPattern "multiple-wps.component.spec.ts" --no-coverage` → 39/39 passed. `npx ng lint --quiet` → clean.
- **Implementer Not Done / Assumptions:** none for this task's scope; noted (informational, not a gap) that `multiple-wps-content.component.ts`'s own AoW-based disable logic (MHL-T-3, separate task) is still in place until that task lands — expected sequencing.
- **Reviewer verdict: STATUS: PASS.** Confirmed old level-2-planned behavior was already a union across two disjoint key spaces (AoW ids vs. ToC result ids — `outcomeList`/`eoiList` come from disjoint ToC levels, a node cannot appear in both), so `outcomeList.length + eoiList.length` is a correct sum, not a double-count; confirmed dropping the `eoiList` dedup-by-`toc_result_id` is correct since the server can legitimately return multiple `eoiList` rows sharing one `toc_result_id` (each independently selectable via `uniqueId`, per `GET_EOIList()`/`deleteSelectedOptionEOI()`) — the old `Set` dedup was itself an under-count bug; confirmed no dead code, fixture arithmetic correct, no-pass clause met, scope clean (`multiple-wps-content.component.ts` untouched).
  **ADVISORY (non-gating, factual note):** the new `return 0` fallback branch is untested and the Implementer ran with `--no-coverage`, so the client coverage-floor DoD line is unverified by evidence (does not gate — the change strictly reduces branch count and all 4 real paths are covered).

**Task MHL-T-2 status: `[x]` PASS on attempt 1.** Requirements covered: `MHL-R-3`, `MHL-AC-5`. No decisions beyond the design's own; no issues beyond the untested `return 0` fallback (advisory, accepted).

---

### `MHL-T-3` — Fix `validateSelectedOptionOutCome` to disable only true duplicates, not AoW siblings

**Status: PASS on attempt 1.**

#### Attempt 1 — 2026-09-18

- **Skills assigned:** `angular-developer`. **Effort:** medium.
- **Files changed:** `.../multiple-wps-content/multiple-wps-content.component.ts`, `.component.html`, `.component.spec.ts`.
- **Implementer summary:** `validateSelectedOptionOutCome`'s disable predicate changed from `option.work_package_id === item.work_package_id` to `option.toc_result_id === item.toc_result_id` (true-duplicate-only, per `MHL-DD-2`). Added `disableOptionsText="(Already selected in another tab) "` to the outcome `<app-pr-select>` (reuses the existing `disableOptionsText` pattern already used by two other components, no i18n key — consistent convention for structural copy). Added 3 new unit tests (AoW-sibling stays enabled, true duplicate stays disabled, upstream-excluded candidate never surfaces) + 1 presence-only a11y rendering test. `validateSelectedOptionOutPut`/`validateSelectedOptionEOI` and `multiple-wps.component.ts` left untouched (correctly out of scope — confirmed by Reviewer).
- **Implementer verification:** `npx jest --testPathPattern "multiple-wps-content.component.spec.ts" --no-coverage` → 85/85 passed. `npx ng lint --quiet` → clean. No `--coverage` run (disclosed gap).
- **Implementer Not Done / Assumptions:** coverage floor not independently re-verified with a `--coverage` run; `MHL-R-10`'s "distinguish from other disabled reasons" judged moot since `outcomeList`'s `disabledd` has only one source in this component; `app-pr-select` (shared component) not modified — already exposed the needed `disableOptionsText` mechanism.
- **Reviewer verdict: STATUS: PASS.** Independently confirmed `selectedOption` pushed into `selectedOptionsOutcome` is the actual `outcomeList` element (not a projected literal), so `toc_result_id` comparison is live and correctly scoped/typed — not a silent no-op. Confirmed scoping to `validateSelectedOptionOutCome` only is correct per `design.md` §6.2 (names only this method) and per `MHL-R-1`'s "HLO" = outcome-level list (`outputList`/`eoiList` are different ToC levels, untouched by design). Confirmed `disableOptionsText` is real, reaches the option's accessible name via `[innerHtml]` in `pr-select.component.html` (not color-only, not hover-only, gated on `disabledd`) — satisfies `MHL-R-10`/`docs/ux-ui/design.md` §10. Confirmed the presence-only DOM test is weak (would pass even with no real input wiring, since `NO_ERRORS_SCHEMA` lets unknown attributes survive into `innerHTML` literally) but does not gate, since the wiring itself was independently verified by reading `pr-select.component.ts/html`, and the gap is pre-recorded in `tasks.md`'s Presence-assertion caveat / `design.md` §10's `MHL-TEST-4` row. Confirmed i18n non-deviation (two pre-existing sibling `disableOptionsText` usages are also hardcoded, no key convention exists for this input; `onecgiar-pr-client/src/CLAUDE.md` §11 permits hardcoded structural copy).

  **Bookkeeping note from Reviewer (applied below):** `tasks.md` `MHL-T-3`'s conditional i18n DoD box should be marked n/a-with-reason rather than left blank, since a new string was in fact introduced.

  **ADVISORY (4R, non-gating):** `validateSelectedOptionOutPut` still disables by AoW, and since `MHL-T-2` raised the output tab cap to candidate-list length, the output path can now open more tabs than its own AoW-wide disable permits filling — same bug class as this task fixed for outcomes, recommend a follow-up ticket (not this spec's scope). `validateSelectedOptionEOI` omits the own-tab exemption its siblings have (pre-existing, untouched, possibly deliberate). `NO_ERRORS_SCHEMA` applied TestBed-wide silences unknown-element/binding errors across ~80 other tests in the suite — recommend scoping it narrower in a future pass. No `--coverage` run performed (same unverified-floor note as `MHL-T-2`).

**Task MHL-T-3 status: `[x]` PASS on attempt 1.** Requirements covered: `MHL-R-1`, `MHL-R-2`, `MHL-R-10`, `MHL-AC-1`, `MHL-AC-2`.

---
