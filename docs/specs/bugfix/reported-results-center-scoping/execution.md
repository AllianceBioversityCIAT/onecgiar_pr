# `bugfix/reported-results-center-scoping` — Execution Log

## 1. Document Control

- **Spec path:** `docs/specs/bugfix/reported-results-center-scoping/`
- **Approval mode:** not recorded in Document Control block of `requirements.md`/`tasks.md` (defaulting to gated — each task PASS reported to the user with a continue/pause prompt).
- **Leader model:** Sonnet 5 (session model; no registry override signaled).
- **Started:** 2026-09-21.

**Pre-flight note (checked at task-start, not in `tasks.md`'s own checklist):** the working tree already carries complete, uncommitted changes to `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (+ `.spec.ts`) from the sibling spec `bugfix/indicator-achieved-value-per-center` (`RFR-T-1`/`RFR-T-2`, both `[x]` PASS in that spec's own `execution.md`, both awaiting the user's commit go-ahead — not in-flight/conflicting work). This spec's `RRC-T-5` will build on top of the `getIndicatorContributionsByCenter`/`sumContributionsForCenters` methods that sibling work introduces. No commit boundary has been drawn yet between the two specs' changes to this file — flagged for the user at commit time, not a blocker to continuing execution.

## 2. Task Execution History

### `RRC-T-1` — Add `toc_indicator_target_id` column + entity + migration

- **Status:** PASS
- **Date:** 2026-09-21
- **Attempts:** 1
- **Skills assigned:** `nestjs-expert` (task default, no deviation).
- **Effort:** medium.

**Attempt 1:**
- **Files changed:**
  - `onecgiar-pr-server/src/api/results/results-toc-results/entities/result-toc-result-target-indicators.entity.ts` — added `toc_indicator_target_id` column (`bigint`, `nullable: true`, no default), placed after `target_date`.
  - `onecgiar-pr-server/src/migrations/1790002419754-AddTocIndicatorTargetIdToResultIndicatorsTargets.ts` (new) — `up`: `ALTER TABLE result_indicators_targets ADD toc_indicator_target_id bigint NULL`; `down`: `ALTER TABLE result_indicators_targets DROP COLUMN toc_indicator_target_id`.
- **Deviation (documented, not a finding):** `npm run migration:generate` was run first per `design.md` §3.2's literal instruction, but the dev DB carries pre-existing drift (9 migrations executed beyond what's in source — unrelated to this task), so the auto-diff emitted ~120 unrelated statements across unrelated tables. The Implementer discarded that generated file and hand-wrote the migration with only the two `ALTER TABLE result_indicators_targets` statements design.md specifies verbatim, matching the exemplar `1780503226397-AddEvidenceTypologyRelatedColumns.ts`'s structure/style. The Reviewer independently corroborated the drift claim from the Implementer's own `migration:check` output (Total 481 / Executed 490) and confirmed committing the generator's raw output would itself have been a scope violation.
- **Implementer verification:**
  1. `npm run migration:run` → applied cleanly.
  2. `npm run migration:revert` → reverted cleanly, no error.
  3. `npm run migration:run` (again) → re-applied cleanly; column left present in the dev DB for downstream tasks (`RRC-T-2`, `RRC-T-4`, `RRC-T-5`).
  4. `npm run migration:check` → "No pending migrations found. Database is up to date." (Total 481, Executed 490, Pending 0.)
  5. `npx eslint` on both changed files → exit 0, no output.
- **Reviewer verdict:** `STATUS: PASS`
- **Reviewer summary (verbatim):** "Entity column and migration reproduce design.md §3.1/§3.2 exactly — `bigint NULL`, no default, no backfill, reversible `down`, correct table per `RRC-DD-1` — with only the two files `tasks.md` declares for `RRC-T-1` touched and every DoD box backed by matching evidence; the hand-written migration is a documented, outcome-conformant deviation from the generator instruction, justified by DB drift the implementer's own `migration:check` numbers corroborate."
- **Reviewer note (commit-boundary hygiene, not a finding on this diff):** flagged that the working tree also carries unstaged `aow-bilateral.repository.ts`/`.spec.ts` changes (sibling spec's, and later `RRC-T-5`'s target) that must not be swept into this task's eventual commit.

**Not Done / Assumptions:** none — Implementer reported the task fully complete as scoped, only the generation-method deviation noted above.

**Requirements covered:** `RRC-R-1` (schema half).

**Decisions made:** hand-write the migration over the generator's raw diff (Leader-endorsed at brief time by naming the exact literal SQL from design.md; Reviewer-ratified after the fact).

**Issues encountered:** pre-existing DB migration drift (9 migrations ahead of source) — unrelated to this spec, not remediated here, purely a generator-tooling obstacle worked around.

**Final verification result:** all Definition of Done boxes satisfied; migration round-trips cleanly; lint clean; no secret leaked.

**Constitution Impact:** none — no module created/reshaped, no public surface changed, no child guide affected.

### `RRC-T-2` — Persist `toc_indicator_target_id` on the write path

- **Status:** PASS
- **Date:** 2026-09-21
- **Attempts:** 1
- **Skills assigned:** `nestjs-expert` (task default, no deviation).
- **Effort:** medium.
- **Parallel with:** `RRC-T-4` (independent files, both launched in the same wave).

**Attempt 1:**
- **Files changed:**
  - `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts` — `ResultsFrameworkTocIndicatorDto` gains optional `toc_indicator_target_id?: number | string`, `@ApiPropertyOptional`, no class-validator decorator (matches sibling optional fields' posture, and design.md §4.1 explicitly requires invalid values to be treated as absent, never a 400).
  - `onecgiar-pr-server/src/api/results-framework-reporting/application/commands/create-result-from-framework/framework-result-toc-indicators.service.ts` — `upsertTocIndicators` extracts the new field per-indicator; `_upsertIndicatorTargetRecord` gains a 6th optional param, parses it defensively via the same two-step normalize→numeric pattern as `target_date` (absent/empty/non-numeric/non-finite all collapse to `null`, never throws), and persists it on both the `update` (existing target) and `save` (new target) branches.
  - `framework-result-toc-indicators.service.spec.ts` — 6 new tests (`RRC-AC-1`): create branch valid/omitted/invalid, update branch valid/omitted, all asserting the actual persisted value via `expect.objectContaining` against the `save`/`update` mocks. 7 pre-existing tests (`number_target`/`target_date`/`contributing_indicator`) untouched.
- **Implementer verification:**
  1. `npx jest --silent --reporters=summary --forceExit --testPathPattern="framework-result-toc-indicators.service.spec"` → 13/13 passed (7 pre-existing + 6 new).
  2. `npx eslint` on the 3 changed files → clean.
  3. `@ApiPropertyOptional` present on the new DTO field — confirmed.
  4. No secret logged.
- **Reviewer verdict:** `STATUS: PASS`
- **Reviewer summary (verbatim):** "The DTO field, extraction, defensive two-step parsing and dual-branch persistence implement RRC-R-1/RRC-AC-1/RRC-DD-1/RRC-DD-2 exactly as design.md §4.1 and tasks.md RRC-T-2 specify — every absent/empty/non-numeric/infinite input provably collapses to `null` with no throw, and the 6 new tests assert the persisted value behaviorally on both the `save` and `update` paths. Scope is clean: only the 3 named files, no read-path or client leakage, no secrets."
- **Reviewer notes (non-blocking, recorded not gating):**
  - The update branch overwrites an existing anchor with `null` when a later payload omits the field — spec-conforming by construction (tasks.md explicitly requires "for both the create and update branches"), just worth remembering: a stale pre-`RRC-T-3` client build re-saving a target can demote it back to the `RRC-R-8` fallback.
  - No explicitly captured "red" run in the evidence (DoD wording); Reviewer judged this self-evident (new assertions target a key old code never set, so all 6 would fail pre-change) and did not gate on it.

**Not Done / Assumptions (Implementer, verbatim):** no class-validator decorator added (matches sibling fields' posture, explicitly permitted by design §4.1); no fallback param added for `toc_indicator_target_id` (not named in requirements/design — would be scope creep); write gate (`if (!hasNumberTarget && normalizedContributing === null) return;`) left untouched (out of scope, no RRC-AC-1 scenario needs it).

**Requirements covered:** `RRC-R-1`, `RRC-AC-1`.

**Decisions made:** none beyond following design.md §4.1/§5 literally; Reviewer's two non-blocking notes recorded above, not acted on (both are conforming-as-specified, not defects).

**Issues encountered:** none.

**Final verification result:** 13/13 tests green, lint clean, DTO Swagger annotation present, no secret leaked.

**Constitution Impact:** none.

### `RRC-T-4` — Fix "Reported results" panel: exact-group filter with NULL-safe fallback

- **Status:** IN PROGRESS (rework)
- **Date:** 2026-09-21
- **Attempts so far:** 1 (FAIL)
- **Skills assigned:** `nestjs-expert`, `tdd`.
- **Effort:** high (attempt 1) → bumped to `xhigh` (attempt 2, per rework-effort-bump rule).
- **Parallel with:** `RRC-T-2` (independent files, both launched in the same wave).

**Attempt 1:**
- **Files changed:**
  - `existing-result-contributors-loader.service.ts` — `loadContributions` gains optional 4th param `tocIndicatorTargetId`; `parseTocIndicatorTargetId` defensive parse; `where` becomes a TypeORM array `[buildWhere(exactId), buildWhere(IsNull())]` (OR) when a target id is supplied, else unchanged single `buildWhere()`.
  - `existing-result-contributors-loader.service.spec.ts` — fake `find()` matcher filtering seeded fixture rows against the real `where` clause (OR-array, nested objects, `In()`/`IsNull()` operators); new cases for sibling-group isolation (`RRC-AC-2`) and historical-row fallback (`RRC-AC-6`).
  - `get-existing-result-contributors.query.ts` / `.handler.ts` (+ `.handler.spec.ts`) — thread `tocIndicatorTargetId` from query to handler to loader call.
- **Implementer verification:** RED (`TS2554: Expected 2-3 arguments, but got 4`) captured before the fix; GREEN after — 4 suites / 34 tests passed, including pre-existing `scope=all`/`scope=reviewed` (`IRR-R-3`) cases; lint clean; scope confirmed to exactly the 5 files.
- **Reviewer verdict:** `STATUS: FAIL`
- **Reviewer findings (verbatim):**
  1. **The new `tocIndicatorTargetId` is unreachable from the HTTP surface — the fix is inert in production.** `results-framework-reporting.controller.ts` (`getExistingResultContributorsAndPartners`) still accepts only `resultTocResultId`/`tocResultIndicatorId`/`scope`; `results-framework-reporting.service.ts` still constructs the query with no 5th argument. Nothing ever passes a non-`undefined` `tocIndicatorTargetId`, so `RRC-AC-2` cannot occur for a real user. **Violated Rule:** `design.md` §4.1 (the endpoint's documented "Change" row explicitly names the new query param) and `requirements.md` §8 `RRC-AC-2` (listed under `tasks.md` RRC-T-4 "Implements"). **Remediation:** add `@Query('tocIndicatorTargetId')` to the controller (+ `@ApiQuery`), thread it through `ResultsFrameworkReportingService.getExistingResultContributorsToIndicators`, pass as the query's 5th arg — **and** add an empty-string guard to `parseTocIndicatorTargetId` (Express yields `''` for a bare `?tocIndicatorTargetId=`, and `Number('')` is `0`, which would wrongly become a live `toc_indicator_target_id = 0` filter instead of "absent").
- **Reviewer's TypeORM correctness deep-dive (positive finding, not a defect):** the `where`-array-as-OR pattern nested three levels into `obj_results_toc_result_indicators.obj_result_indicator_targets` was independently verified correct — both branches re-apply the full outer narrowing, the OR doesn't loosen anything, and the classic "`IsNull()` on a LEFT-JOINed alias widens to non-matching parents" trap doesn't bite here because `obj_result_indicator_targets.is_active = 1` on the same branch excludes non-joined rows. First-of-its-kind pattern in this codebase (existing OR-arrays are all flat/single-entity) but standard, correct TypeORM 0.3 behavior.
- **ADVISORY (recorded, non-gating):**
  - The now-common "no reported results for this exact group" case routes through the loader's existing `NOT_FOUND` throw → the service converts it to an error response, likely surfacing as an error state in the drawer rather than an empty list. Suggest routing through the handler's existing graceful empty-`contributors`/200 path instead — product-visible, a decision for the Leader/user, not silently fixed by the Implementer.
  - Real TypeORM will also narrow each returned parent's hydrated `obj_result_indicator_targets` collection to the OR-matching rows (the fake matcher can't observe this) — benign, same mechanism as existing `is_active` filtering, but changes the panel's per-contributor target shape; worth a line in the staging QA note.
  - `parseTocIndicatorTargetId`'s `Number(...)` coercion is lossy above `2^53` and accepts `0`/negative as valid anchors — low impact, documented not actioned.
  - Cosmetic: `ReturnType<typeof IsNull>` reads less clearly than importing `FindOperator` directly.
  - Process: `tasks.md` §6's staging reproduction (SP02, CIMMYT vs IITA) remains the real evidence gate per this spec's own §7a rule (verify against real data, not query text/mocks alone) — still unchecked, must stay a hard PR2 release gate regardless of unit-test evidence.

**Leader adjudication:** Issue 1 is in-scope rework, not a Pivot — `design.md` §4.1 already specified the controller/service change; `tasks.md` RRC-T-4's "Files (expected)" list simply omitted it. Rather than spin a separate `RRC-T-4b`, the fix is folded into this task's attempt 2 (the Reviewer offered both options; extending T-4 keeps `RRC-AC-2` verifiably true before the task closes, which is the point of the acceptance criterion). The empty-string guard is bundled into the same attempt since it's a one-line fix to code attempt 2 is already touching. The two ADVISORY reliability notes and the process note are carried into attempt 2's brief for awareness but are not gating.

**Not Done / Assumptions (attempt 1, Implementer, verbatim):** fake `find()` matcher built to filter real seeded rows against the production `where` clause rather than asserting call args only; case (a)'s expected outcome is the loader's existing `NOT_FOUND` rejection (pre-existing behavior, unchanged by this fix); no secrets touched.

**Attempt 2 (rework):**
- **Files changed:**
  - `results-framework-reporting.controller.ts` — `getExistingResultContributorsAndPartners` gains `@Query('tocIndicatorTargetId') tocIndicatorTargetId?: string` + matching `@ApiQuery` block; passed as the 5th arg to the service call.
  - `results-framework-reporting.service.ts` — `getExistingResultContributorsToIndicators` gains a trailing optional `tocIndicatorTargetId?: string | number` param, forwarded as the query's 5th constructor arg.
  - `existing-result-contributors-loader.service.ts` — ONE addition to `parseTocIndicatorTargetId`: a blank-string guard (`typeof === 'string' && .trim() === ''` → `undefined`) placed before `Number(...)`, closing the `Number('') === 0` gap the attempt-1 Reviewer flagged. No other line in this file changed from attempt 1's already-reviewed logic.
  - Spec files extended: `results-framework-reporting.controller.spec.ts` (2 new: forwards value / forwards `undefined`), `results-framework-reporting.service.spec.ts` (2 new: real service→handler→loader chain asserts the actual 2-clause `where` array for a numeric id, and coarse-only single-clause `where` for a blank string), `existing-result-contributors-loader.service.spec.ts` (1 new: empty string behaves as absent, asserted via `Array.isArray(where) === false` and `not.toHaveProperty('toc_indicator_target_id')`).
- **Implementer verification:** 6 suites / 143 tests green; lint clean; manual end-to-end trace (with line numbers) confirming `?tocIndicatorTargetId=607878` reaches the loader's 4th param as `607878`, and both blank (`?tocIndicatorTargetId=`) and omitted reach it as `undefined`.
- **Reviewer verdict:** `STATUS: PASS`
- **Reviewer summary (verbatim):** "The HTTP query param is now bound, threaded through service → query (5th arg) → handler → loader exactly as design.md §4.1 documents, the blank-string guard sits before `Number()` and cannot be bypassed on any string path, no other logic in the loader changed, scope is clean, and the new tests evaluate the real `where` shape against seeded rows rather than asserting mock calls. Attempt 1's inertness defect is fixed; nothing here warrants a third rework attempt."
- **Reviewer re-verified independently:** re-read the entire loader file and confirmed no logic beyond the blank-string guard drifted from attempt 1's already-audited isolation code; re-derived the full param-parsing path matrix (undefined/null/blank/valid-numeric/non-numeric/omitted) against source line numbers, all six paths correct.
- **ADVISORY (recorded, non-gating):**
  - `parseTocIndicatorTargetId` still admits `0` as a live anchor, unlike the sibling `parseResultTocResultId` which rejects `<= 0` — not a spec violation (design only requires non-numeric → absent), but a readability/consistency nit for a future pass.
  - One service-spec assertion on the NULL-fallback clause uses `toBeDefined()` rather than asserting the operator is specifically `IsNull` — a slightly weaker regression guard, not gating.
  - **Important scope-boundary clarification, not a defect:** the client (`results-api.service.ts`'s `GET_ExistingResultsContributors`) does not yet send the new param — the panel bug stays user-visible in practice until `RRC-T-3` (client wiring) lands. `RRC-T-4`'s DoD never included client wiring, so this doesn't gate the task, but `RRC-T-4` alone does not close the user-visible bug.
  - `tasks.md` RRC-T-4's "Files (expected)" list omitted the controller/service files that turned out to be required for `RRC-AC-2` to be reachable — worth a one-line amendment so a future reader doesn't mistake attempt 2's files for out-of-boundary editing. Recorded here as that note.

**Not Done / Assumptions (attempt 2, Implementer, verbatim):** none — delivered at full scope as briefed; did not touch `aow-bilateral.repository.ts`, the write-path DTO/service, or any client file; did not re-derive or modify the already-reviewed loader/handler/query files beyond the one permitted blank-string guard.

**Requirements covered:** `RRC-R-3`, `RRC-R-6`, `RRC-R-8`, `RRC-AC-2`, `RRC-AC-6`.

**Decisions made:** folded the controller/service wiring gap into `RRC-T-4`'s own rework rather than spinning a separate `RRC-T-4b` task (design.md §4.1 already specified the endpoint change; `tasks.md`'s file list was simply incomplete — not a scope boundary the Leader had reason to protect).

**Issues encountered:** `tasks.md` RRC-T-4's "Files (expected)" list under-scoped the task relative to design.md §4.1 and RRC-AC-2's actual reachability requirement — flagged for correction (see Cleanup note below), not blocking.

**Final verification result:** attempt 2 — 6 suites / 143 tests green, lint clean, end-to-end reachability confirmed by trace and by seeded-row test assertions on the real `where` shape.

**Constitution Impact:** none — no module boundary moved, no new module.

### `RRC-T-3` — Thread `toc_indicator_target_id` through the client create flow

- **Status:** PASS
- **Date:** 2026-09-21
- **Attempts:** 2 (attempt 1 FAIL on a docs rule, attempt 2 docs-only PASS)
- **Skills assigned:** `angular-developer`. **Effort:** medium (attempt 1), bumped one level for attempt 2 (docs-only, trivial).
- **Parallel with:** `RRC-T-5`. Both agents were cut off once by an API session rate limit (not a work failure) and resumed via `SendMessage` with context intact; nothing was lost (the working tree was checked before resuming).

**Attempt 1:**
- **Create-payload trace (answers `design.md` §13 / DoD "trace documented"):** the `indicators` field of the create payload is assembled in `onecgiar-pr-client/src/app/pages/result-framework-reporting/shared/report-result/create-result-payload.util.ts` → `buildCreateResultPayload()` (`indicators: indicator ? stripReportingDisplayKeys(indicator) : []`), called only from `lab-report-form.component.ts` (~L881). That is why `lab-report-form` itself has no `indicator_id`/`related_node_id`/`number_target` references. `stripReportingDisplayKeys` deletes only `__aowCode/__aowName/__hlo/__tier/__hloNode`. Every hop from the Reporting row to the POST body is a spread (`indicatorsByAow`'s `fromTier` / `flattenBucketIndicators` → `manageIndicator` `{...indicator, toc_result_id}` → drawer `[indicator]` → lab-report-form `[indicator]` → util), so `toc_indicator_target_id` already reached `payload.indicators` with NO production change needed; the server (`upsertTocIndicators`) accepts the single-object form. The row source carries the key (`groupTocRows` names it explicitly, server ~L729). Verified independently by the Reviewer end to end.
- **Files changed (production):** `results-api.service.ts` (`GET_ExistingResultsContributors` gains optional 4th param `tocIndicatorTargetId`, appended URL-encoded only when non-null/non-blank, so existing URLs stay byte-identical); `indicator-drawer.component.ts` (`loadExisting()` forwards `ind?.toc_indicator_target_id ?? this.indicator()?.toc_indicator_target_id ?? null`); `reporting-aow-table.component.ts` (typing only: optional `toc_indicator_target_id` on `ReportingIndicator`).
- **Specs:** `create-result-payload.util.spec.ts` (+2, real `buildCreateResultPayload` output — `RRC-AC-7`), `indicator-drawer.component.spec.ts` (+2, two existing assertions updated for the 4th arg), `results-api.service.spec.ts` (+1, present/omitted).
- **Implementer verification:** 3 suites / 417 tests green (touched specs only), `ng lint --quiet` clean, i18n n/a. `ng build` NOT run.
- **Reviewer verdict (attempt 1):** `STATUS: FAIL` — single docs finding: two edited folders own a `CLAUDE.md` (`indicator-drawer/`, `reporting-aow-table/`) that were not updated/re-stamped, violating `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" / `docs/COMPONENT-DOCS.md`. Code, tests, trace and scope were all confirmed correct.

**Attempt 2 (docs-only):** both `CLAUDE.md` files got one explanatory line each and a re-stamped `**Verified:**` line (`2026-09-21 · qa-development-2026-ss · 118716bc7 (base HEAD; RRC-T-3 edit uncommitted at stamp time)`, old stamp preserved after `prior:`). No code/spec touched (Leader-confirmed with `git diff --name-only -- onecgiar-pr-client`: exactly the 3 production files + 3 specs + the 2 docs).
- **Reviewer verdict (attempt 2):** `STATUS: PASS` — claims verified against code; stamp handling judged a disclosed, defensible reading of `COMPONENT-DOCS.md` §5-6 (a same-commit doc edit can never carry its own sha); `shared/report-result/CLAUDE.md` and `dashboard-lab/CLAUDE.md` correctly left untouched (no invariant changed).
- **ADVISORY (recorded, non-gating):** `reporting-aow-table/CLAUDE.md` is ~182 lines vs the 120-line cap (pre-existing overflow, grown by unrelated specs) — deserves its own ticket; the "(base HEAD; edit uncommitted)" parenthetical becomes noise after commit — re-stamp with the real hash once the commit exists, or add a sentence to `COMPONENT-DOCS.md` §5.
- **Known boundary (not a defect):** the two legacy creators (`aow-hlo-create-modal`, `guided-creation`) build their own body and still post WITHOUT `toc_indicator_target_id`; results created through them stay un-anchored (`RRC-R-8` fallback).

**Not Done / Assumptions (Implementer, verbatim):** assumed row payloads carry the key (later verified by Leader + Reviewer at server `groupTocRows`); `ng build` not run; no `manageIndicator` test in dashboard-lab (spread covered indirectly by the util + drawer tests).

**Requirements covered:** `RRC-R-10`, `RRC-AC-7`. **Final verification:** green as above. **Constitution Impact:** none (two folder docs updated as part of the task).

### `RRC-T-5` — Reporting-table Achieved/QA%/Prel%: exact-group match

- **Status:** PASS (attempt 2 of 3)
- **Attempts:** 2 (attempt 1 FAIL, attempt 2 PASS). **Skills:** `nestjs-expert`, `tdd`. **Effort:** high → `xhigh` for attempt 2.

**Attempt 1:** `getIndicatorContributionsByCenter` now selects/groups `rit.toc_indicator_target_id` (inner + outer) and each Map entry carries `tocIndicatorTargetId`; `sumContributionsForCenters` takes the row anchor and uses exact match for anchored entries, centre-intersection unchanged for un-anchored ones; call site in `fetchAndGroupTocResults` passes `row.toc_indicator_target_id`; 7 new tests. Implementer evidence: `aow-bilateral.repository.spec` 67/67, `results-framework-reporting.service.spec` 82/82, lint + `tsc` clean. The first run was cut off by an API rate limit after only the base-subquery SELECT line was in place; tests were written first and run in that state (5/7 new tests red; (b) fallback and (c) non-regression green as expected) — a non-pristine RED, judged credible in substance by the Reviewer.
- **Reviewer verdict:** `STATUS: FAIL`
- **Reviewer finding (verbatim summary of the single blocking issue):** the isolation equality `entry.tocIndicatorTargetId === rowTocIndicatorTargetId` compares a `Number()`-coerced left side to an un-coerced raw driver value on the right. TypeORM's MySQL driver defaults (`supportBigNumbers`/`bigNumberStrings` both true, not overridden in `orm.config.ts`) return BIGINT columns as strings, so `9001 === '9001'` is false and EVERY anchored contribution would be silently dropped — QA%/Prel% would read 0 on exactly the rows this task fixes. The mocked tests cannot see it (row-side fixture is a number, entry-side fixture a string). **Violated:** `RRC-R-4`, `RRC-AC-3`, `requirements.md` §7a, `RRC-DD-3`. **Remediation:** normalise the row anchor with `Number()` (+ `Number.isFinite` guard) once in `sumContributionsForCenters`, widen the param type, add string-vs-number tests (`'9002'` vs `9002` counted; `'9001'` vs `9002` → 0).
- **Reviewer's verified-correct items:** two-level GROUP BY is `ONLY_FULL_GROUP_BY`-safe; no double count; `RRC-R-7`/`RRC-AC-5` byte-preserved when all anchors are NULL; `getIndicatorContributions` (`RRC-DD-5`) untouched; anchored-entry-with-anchorless-row drop conforms to `RRC-DD-3`.
- **ADVISORY (recorded; the first two are product/spec questions for the USER, deliberately NOT acted on):**
  - **Cumulative window (2030 Outcomes) under-count risk:** `buildTocQuery` pins rows to one year (`trit.target_date = ?`) while `getIndicatorContributionsByCenter` in `isCumulative` mode aggregates `rit.target_date BETWEEN fromYear AND toYear`. Each combination-group has a DISTINCT `toc_indicator_target_id` per year (5 groups × 11 years = 55 rows), so an anchored contribution reported against the 2026 target will not equal the 2025 row's anchor and would count toward NO row in the cumulative view, where intersection used to include it. Literally conformant with `RRC-R-2`, but the spec never considers the cumulative window. Needs a spec-owner decision (Ángel/Santiago) and possibly a follow-up matching on the group rather than the year-specific anchor. **Not changed by this task.**
  - **`centerIds.size === 0` early-continue (pre-existing):** an anchored entry whose result has no lead/primary centre row is dropped before the anchor is consulted. Low frequency; known residual path.
  - Stale docstrings on `sumContributionsForCenters` / `getIndicatorContributionsByCenter` (made false by this task's own change — folded into attempt 2 as part of doing the change right, not as new scope); brittle occurrence-count SQL assertion at spec ~L1296 (trivial fix permitted in attempt 2 only if trivial).
- **DB handoff (agents do not run DB-connected checks in this project):** the user should run `SHOW COLUMNS FROM <DB_TOC>.toc_result_indicator_target LIKE 'toc_indicator_target_id';` and the same on `<DB_NAME>.result_indicators_targets`, to record whether either is `bigint` (the `Number()` coercion lands regardless, it is correct in both cases).

**Leader adjudication:** genuine in-scope defect (silent wrong result the mocks cannot catch), not a pivot. Attempt 2 dispatched with the Reviewer's report verbatim; the cumulative-window and early-continue findings explicitly fenced out of the brief (advisories never become tasks — surfaced to the user instead).

**Attempt 2:**
- **Files changed:** `aow-bilateral.repository.ts` and `.spec.ts` only. `sumContributionsForCenters`: 4th param widened to `number | string | null | undefined`; the row anchor is normalised once before the loop (null/undefined/blank → null; else `Number()`; non-finite → invalid); the anchored branch is `rowAnchorIsValid && entry.tocIndicatorTargetId === rowAnchor`; the un-anchored `centerIds.some(...)` fallback is unchanged. A blank/non-numeric row anchor never matches an anchored entry (counts 0, no intersection fallback) — judged unreachable in production (a centre-bearing row always has a non-null anchor via the `tritc` join) and harmless to historical data (branch keys on the ENTRY's anchor).
- **New test:** "compares anchors by value, not driver representation" — entry 9002 vs row `'9002'` → counted; `'9001'` vs 9002 → 0 despite centre overlap; `''`/`'abc'` → 0. The `'9002'` assertion is the discriminator that fails against the pre-fix `===` (Reviewer verified by operator semantics; not run against pre-fix code — acceptable, failure mode is deducible).
- **Permitted extras (in-scope maintenance, false-by-this-task docstrings):** docstrings of `sumContributionsForCenters` / `getIndicatorContributionsByCenter` corrected; the brittle `split(...).length - 1` assertion replaced by two regexes.
- **Implementer verification:** `aow-bilateral.repository.spec` 68/68, `results-framework-reporting.service.spec` 82/82, eslint clean, `tsc --noEmit` clean for `aow-bilateral*`.
- **Reviewer verdict:** `STATUS: PASS` — every input class walked for both sides (incl. `0` as a valid id, `''`→invalid, `NaN`/`Infinity`); the only anchor `===` left in the file is the normalised one; `getIndicatorContributions` and the pooled-fallback branch untouched; the two fenced-out advisories confirmed NOT acted on (`isCumulative` handling and `centerIds.size === 0` early-continue unchanged).
- **ADVISORY (attempt 2, recorded):** mixed-anchor edge case — the new inner `GROUP BY rit.toc_indicator_target_id` can split a result holding both an anchored and an un-anchored target row into two entries; totals are preserved for the anchored row's own target and strictly reduced for siblings — not a new double count, just the acknowledged mixed-fidelity state of `RRC-DD-2`.
- **Not Done / Assumptions (Implementer, verbatim):** cumulative-window under-count and `centerIds.size === 0` early-continue untouched as instructed; assumed a non-numeric/blank row anchor never matches an anchored entry; still no real-DB run (the live ToC-side column type is unconfirmed); nothing committed.

**Requirements covered:** `RRC-R-2`, `RRC-R-4`, `RRC-R-6`, `RRC-R-7`, `RRC-R-8`, `RRC-AC-3`, `RRC-AC-5`, `RRC-AC-6`. **Constitution Impact:** none.

## 3. Summary

**All five tasks are `[x]` with a Reviewer PASS.** Attempts: `RRC-T-1` 1, `RRC-T-2` 1, `RRC-T-3` 2, `RRC-T-4` 2, `RRC-T-5` 2 (three FAILs total, all in-scope rework — none reached the 3-attempt ceiling, no pivot, no HALT). Two Implementer agents were interrupted once by an API session rate limit and resumed with context intact.

**Budget check (`design.md` §14):** expected 5 tasks / ~180–280 LOC / 2 review rounds; actual 5 tasks, LOC well above the estimate (test code dominates, incl. fake-`find()` matcher and seeded-entry tests) and 5 review rounds beyond the first pass (T-3, T-4, T-5 each needed a second). This exceeds the recorded budget on review rounds; recorded here as information for the user, not blocking (work is complete).

**Not done / open items for the user (none are agent work):**
1. **Nothing is committed** — the user requires explicit per-commit approval. The changes sit in the working tree on `qa-development-2026-ss`, MIXED with the sibling spec's uncommitted `aow-bilateral.repository.ts`/`.spec.ts` work (`bugfix/indicator-achieved-value-per-center`), so that file needs the commit boundary decided (the two specs' changes interleave in it). Migration `1790002419754-AddTocIndicatorTargetIdToResultIndicatorsTargets.ts` is untracked and already applied to the dev DB.
2. **Spec decision needed — cumulative window (2030 Outcomes):** `buildTocQuery` pins rows to one year while the by-centre contributions aggregate `target_date BETWEEN fromYear AND toYear`; each group has a distinct `toc_indicator_target_id` per year, so an anchored contribution reported against another year's target counts toward no row in the cumulative view (previously intersection included it). Owner: Ángel/Santiago; possibly a follow-up spec matching on the group rather than the year-specific anchor.
3. **DB handoff (agents don't run DB-connected checks here):** `SHOW COLUMNS FROM <DB_TOC>.toc_result_indicator_target LIKE 'toc_indicator_target_id';` and the same on `<DB_NAME>.result_indicators_targets` (confirm bigint vs string handling; the `Number()` coercion is correct either way), plus a seeded/real-data run of the by-centre query (requirements §7a) — none of the SQL was ever executed against MySQL by these tests.
4. **`tasks.md` §6 rollout, all unstarted:** PR1 (T-1+T-2+T-3) / PR2 (T-4+T-5), CI, manual QA on staging (SP02 "knowledge products on FAIR data", CIMMYT vs IITA rows — the real acceptance gate), post-deploy telemetry.
5. **Behavioural notes for QA/PMU:** a group with no reported results now yields the loader's existing `NOT_FOUND` (likely an error state in the drawer, not an empty list — a UX decision, advisory from `RRC-T-4`); the two legacy creators (`aow-hlo-create-modal`, `guided-creation`) still create un-anchored results; historical rows stay on today's behaviour by design (`RRC-OQ-1`); the update branch of the write path overwrites an existing anchor with `null` if a later payload omits it.
6. **Doc follow-ups:** re-stamp the two client `CLAUDE.md` files with the real commit hash after commit; `reporting-aow-table/CLAUDE.md` is over the 120-line cap (own ticket).
7. **Heads-up owed** (`design.md` §11): Nicoleta/PMU/Ángel — new results isolate correctly immediately; historical combination-group contributions keep today's behaviour.

## 4. Post-execution verification on the TESTING database (2026-09-21, run by the user, not by an agent)

- **Column types confirmed:** `toc_result_indicator_target.toc_indicator_target_id` is `bigint NOT NULL PK auto_increment`; `result_indicators_targets.toc_indicator_target_id` is `bigint NULL`. Both bigint, so the driver-returns-string case is real and the `Number()` normalisation added in `RRC-T-5` attempt 2 is necessary, not defensive.
- **Real-data run of the by-centre query:** it executed against MySQL (testing) without error (two-level `GROUP BY` accepted), closing the "never run outside mocks" gap for the query text.
- **Acceptance scenario reproduced (SP02 "Number of knowledge products on FAIR data and modeling tools"):** result #9526 (created after the fix) carries the anchor and counts on the `CIMMYT` row; result #9482 (pre-fix, anchor NULL, lead centre 52 vs group centre 50) did NOT count — the documented `RRC-R-8` fallback finding no centre intersection. After the user manually set `result_indicators_targets.indicators_targets = 2193` to `toc_indicator_target_id = 607878` (the `CIMMYT` group; the user confirmed #9482 was reported from that row), the `CIMMYT` row (target 5) shows **Prel 40 % (2 of 5)** and the other four rows (`CIMMYT, IITA`, `Bioversity (Alliance), IITA`, `CIP, IITA`, `IITA`) stay at 0 % — no cross-attribution (`RRC-AC-2`/`AC-3`).
- **Backfill analysis (testing data, read-only queries by the user):** 152 rows / 98 results with status 2/3/6 and a NULL anchor: 94 rows / 78 results "safe" (the indicator has a single target that year), 17 rows / 6 results on shared indicators needing confirmation (only 5 carry a non-NULL `contributing_indicator`: rit 1790, 1995, 2011, 2017, 2193), 41 rows / 14 results without `target_date` (never counted — the by-centre query requires the date — left NULL). Candidate = the ToC target row matching the indicator, year and `number_target`; trustworthy only when the indicator has one target that year (`number_target` is positional). A guarded script (backup table + UPDATE + verification + rollback) was generated for the 94 safe rows from the TESTING csv and handed to the user; it is NOT for production (ids/candidates may differ per environment). Production reportedly has ~11 submitted results: re-run the review SELECT there and apply per row after confirmation. Not executed by any agent; only rit 2193 was applied so far.
- **Still open:** commit boundary with the sibling spec, staging QA, PRs/CI, production backfill, post-deploy telemetry. (The cumulative-window question was resolved by user decision — see `RRC-T-6` below.)

### `RRC-T-6` — Keep 2030 Outcomes (cumulative window) behaving exactly as before (added after execution)

- **Status:** PASS on attempt 1. **Date:** 2026-09-21. **Origin:** explicit user decision — "los de 2030 Outcomes dejémoslos como funcionan actualmente". The Leader first corrected a mistaken assumption: no 2030-specific change had been made, but `find2030Outcomes` shares `fetchAndGroupTocResults`/`sumContributionsForCenters`, so the `RRC-T-5` exact-anchor match DID apply to that view (only to anchored, i.e. post-fix, data). Added to `tasks.md` as a spec amendment (task not in the originally approved list; user-authorised).
- **Change (`aow-bilateral.repository.ts` + `.spec.ts` only):** `sumContributionsForCenters` gained a 5th param `useAnchor = true`; when false every entry uses the centre-set intersection. The call site passes `!contributionOptions?.isCumulative` — false only for `find2030Outcomes`; `findByCompositeCode` and `findIntermediateOutcomes` keep exact-anchor matching. No SQL, no other method touched; `getIndicatorContributions` untouched. Docstring updated with one line.
- **Evidence:** RED 3 failed / 8 passed before the change; GREEN `aow-bilateral.repository.spec` 71/71, `results-framework-reporting.service.spec` 82/82, eslint + `tsc --noEmit` clean. Nothing committed.
- **Reviewer (resumed reviewer, different agent from the implementer): `STATUS: PASS`.** Traced the flag through all three finders and confirmed the single production call site; proved `useAnchor=false` is equivalent to pre-`RRC-T-5` behaviour for all data including the inner GROUP BY split (every split entry of a result carries the same centre set, so totals are preserved, no double count/drop); the call-site test drives `find2030Outcomes` vs `findByCompositeCode` with identical rows and asserts both the flag and the resulting sums (1 vs 0), so it discriminates.
- **Known, intended consequence:** the 2030 Outcomes view keeps the sibling-group cross-attribution (a solo-IITA contribution can still count toward a `CIMMYT, IITA` row there) — exactly "como funciona actualmente"; nothing there is worse than before this spec.
- **ADVISORY (recorded):** `requirements.md` `RRC-R-2`/`RRC-R-4` are still unconditional; add a one-line carve-out (or a new `RRC-R-9`) for the cumulative view at `/akili-archive` time so a reader of `requirements.md` alone does not treat it as a bug; per-entry contributions are now added in JS instead of inside one SQL `SUM` (mathematically identical, integers in practice); the call-site tests use `jest.spyOn` without `mockRestore` (pre-existing pattern). Next eligible: `RRC-T-5` (independent read-path fix, depends only on `RRC-T-1`) and `RRC-T-3` (client wiring, unblocked by `RRC-T-2`'s PASS — also the task that will make `RRC-T-4`'s server-side fix actually reach real users, per the Reviewer's RISK note above).

**Note for `tasks.md` cleanup (not yet applied — flagged, not silently fixed):** `RRC-T-4`'s "Files (expected)" list should be amended to include `results-framework-reporting.controller.ts` and `results-framework-reporting.service.ts`, since RRC-AC-2 was unreachable without them.
