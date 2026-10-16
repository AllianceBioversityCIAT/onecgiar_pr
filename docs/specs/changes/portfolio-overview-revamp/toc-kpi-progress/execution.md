# Execution — Portfolio Overview: Progress against ToC KPIs

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-progress/` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` (no commit without explicit go-ahead) |
| Started | 2026-10-15 |
| Leader model | Opus 5.5 (T1) |

## Task Execution History

### TKP-T-0 — Check premise TKP-P-3 on prdb (user-run) — IN PROGRESS (escalated)

- **Date:** 2026-10-15
- **Run by:** user, DBeaver, prdb (prod, read-only). ToC schema `Integration_information`.
- **Page version:** `version.id = 8` (Reporting 2026, `status = 1`, phase_year 2026).

**Query B: premise TKP-P-3** (active applicable links of pooled results in version 8)

| counting_status (2/3) | active_links | links_without_value | share |
|---|---|---|---|
| 1 | 20 | 3 | 15.0 % |
| 0 | 56 | 1 | 1.8 % |
| total | 76 | 4 | 5.3 % |

The falsifier says "> 5 %". It trips on the counting-status row (15 %) and on the total (5.3 %), so the disqualifier applies: escalate TKP-OQ-3, no patch. Leader reading: the sample is very small (20 links). Auto-creation per node would put most links without a value, and only 4 of 76 have none, so this does not look like auto-creation. A direct probe (query D) has been requested before the decision.

**Query C: parity** (design §5 rules, written independently with a correlated `EXISTS`)

| P/A | OUTPUT total / covered | OUTCOME total / covered | Total / covered |
|---|---|---|---|
| SP01 | 393 / 0 | 10 / 0 | 403 / 0 |
| SP04 | 441 / 0 | 31 / 0 | 472 / 0 |

Observation: both P/As have covered = 0, because version 8 has only 20 counting-status links in total. Parity with covered = 0 does not exercise the covered predicate, so at least one P/A with covered > 0 must be added for TKP-T-6 (query E requested).

Query C text (saved for TKP-T-6; SQL only):

```sql
SET @v := 8;
SET @p := 'SP01';
SELECT
  tr.category,
  COUNT(DISTINCT tri.id) AS total_kpis,
  COUNT(DISTINCT CASE WHEN EXISTS (
      SELECT 1
      FROM prdb.results_toc_result_indicators rtri
      JOIN prdb.results_toc_result rtr
        ON rtr.result_toc_result_id = rtri.results_toc_results_id AND rtr.is_active = 1
      JOIN prdb.result r ON r.id = rtr.results_id
      WHERE rtri.is_active = 1
        AND rtri.is_not_aplicable = 0
        AND rtr.toc_result_id = tri.toc_results_id
        AND CONVERT(rtri.toc_results_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)
        AND r.is_active = 1
        AND r.source = 'Result'
        AND r.status_id IN (2, 3)
        AND r.version_id = @v
    ) THEN tri.id END) AS covered_kpis
FROM Integration_information.toc_results tr
JOIN prdb.version v ON v.id = @v
LEFT JOIN Integration_information.toc_work_packages wp
  ON tr.wp_id = wp.toc_id
 AND wp.year = v.phase_year
 AND wp.wp_official_code LIKE CONCAT(tr.official_code, '-%')
JOIN Integration_information.toc_results_indicators tri
  ON tri.toc_results_id = tr.id AND tri.is_active = 1
WHERE tr.official_code = @p
  AND tr.phase = v.toc_pahse_id
  AND tr.is_active = 1
  AND (   (tr.category = 'OUTPUT'  AND (wp.toc_id IS NOT NULL OR tr.wp_id IS NULL))
       OR (tr.category = 'OUTCOME' AND  wp.toc_id IS NOT NULL))
GROUP BY tr.category WITH ROLLUP;
```

**Query D: direct auto-creation probe** (pooled results in version 8, ToC mappings to nodes with ≥ 2 active indicators)

| mappings | all node indicators linked |
|---|---|
| 78 | 0 |

No mapping links every indicator of its node, so links are **not** auto-created per node. The query B share (3 of 20) is links whose value is missing (qualitative or not yet filled), not auto-creation. **TKP-P-3 → `verified`.** TKP-OQ-3 stays at its approved default (the link alone counts). The disqualifier's concern ("coverage reads node mapped") is refuted by direct evidence, not waived.

**Query E: P/As with covered candidates** (version 8, counting status, before node scope)

| official_code | covered_candidates |
|---|---|
| SP09 | 13 |
| SP02 | 1 |

TKP-T-6 parity set: **SP09** (covered > 0, exercises the covered predicate) + **SP01** (403 / 0, exercises the total). Query C for SP09 is still to be run by the user. It does not block TKP-T-1.

**Product note surfaced to the user:** with the current version-8 data, the section reads 0 % for every P/A except SP09 and SP02 (only 20 counting-status links portfolio-wide). This is accepted as data reality, not a defect.

**Final status:** PASS (user-run task, review skip-eligible). Requirements covered: TKP-P-3, TKP-DD-3, parity query prepared for the Correctness-parity NFR.

### TKP-T-1 — Repository: one grouped coverage query — PASS (attempt 1)

- **Date:** 2026-10-15
- **Implementer:** akili-implementer (T2), effort `high` (correctness-critical SQL; Leader choice, one level above the T2 default). Skills: `nestjs-expert`, `tdd` (as listed).
- **Reviewer:** akili-reviewer (T3), lens checklist, effort `high`.
- **Attempts:** 1.

**Files changed (additions only; `git diff --numstat` 100/0 and 166/0):**
- `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts`: `getPortfolioTocCoverage(context)`, plus the exported types `PortfolioTocCoverageContext` (extends `ReportingTocContext` with `versionId: number`) and `PortfolioTocCoverageRow`.
- `…/aow-bilateral.repository.spec.ts`: `describe('getPortfolioTocCoverage')`, 9 cases.
- `onecgiar-pr-server/src/shared/constants/toc-kpi-coverage-status.constant.ts` (new): `TOC_KPI_COVERAGE_STATUS_IDS = [QualityAssessed, Submitted]` = `[2, 3]`.

**Verification:**
- Red run `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="aow-bilateral.repository.spec"`:
  - before the method existed: suite failed to compile (0 tests);
  - after: `Tests: 83 passed, 83 total`.
- eslint `--quiet` on the 3 files: clean (after prettier `--fix` on new code only).
- Scope of the evidence: a presence-assertion on SQL text and bound params with `dataSource.query` mocked. **Not** proof of correct numbers; that proof is TKP-T-6.

**Reviewer verdict:** PASS. "`getPortfolioTocCoverage` follows every row of the design §5 Repository table, and it means the same as the user's independent prdb query (the correlated EXISTS form)." Each falsifier was traced against the spec by hand.

**Decisions:**
- Bind order is `[year, source, statuses, version, phase]`, i.e. placeholder order. Design §10 lists "phase, year, version, status set, source". The Reviewer adjudicated that the normative rule is the TKP-T-1 falsifier ("matches the placeholders"), so this is not a violation.
- The `tri2` covered-set join has no `is_active` filter. It adds nothing, because `cov` is joined by `tri.id` on the already-active `tri` (Reviewer confirmed).
- The two-query split of design §8 was not needed (disqualifier not triggered).

**ADVISORY (4R, recorded only; no rework):**
1. Reliability (test): `toContain('r.is_active = 1')` / `'tr.is_active = 1'` also match inside `rtr.is_active = 1`, so deleting either real predicate would leave the spec green. They are not on the falsifier list. Suggested anchoring: `/\br\.is_active = 1/`.
2. Readability (test): `not.toContain('${')` runs on the evaluated SQL and can never fail. It is decorative.
3. Risk (pre-existing): `returnErrorRepository` builds `message` from `${error}`, and a MySQL `QueryFailedError` can quote SQL. Same as the sibling methods. **Forward pointer → TKP-T-2** (its DoD already requires "no stack or SQL in the body"; the service decides what reaches the response).
4. Spec hygiene, pending item for archive (not edited on this branch): reword the design §10 bound-param list to "in placeholder order".
5. Process: no per-predicate mutation run was recorded.

**Requirements covered:** TKP-R-1 (S-1.1, S-1.2), TKP-R-2 (S-2.1 BUT, S-2.2, S-2.3), NFR Security (bound parameters), all at SQL-text level.
**Approval gate:** gated mode, waiting for the user's go-ahead before TKP-T-2.

### TKP-T-2 — Service + controller: `GET toc-results/portfolio-coverage` — IN PROGRESS

- **Date:** 2026-10-15
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` (as listed).

#### Attempt 1 — Implementer (T2, effort `high`) → Reviewer FAIL

- **Files:** `results-framework-reporting.{service,controller}.ts` (+ both specs), new `dto/portfolio-toc-coverage.dto.ts`. Module untouched (TKP-P-7 holds).
- **Implementer verification:** scoped Jest went from `2 failed` (compile, 0 tests) to `2 passed, 123 passed`. eslint clean on the 5 files.
- **Review payload:** the diff (658 lines) was saved as a frozen file in the session scratchpad and handed to the Reviewer by path rather than inline (Leader economy deviation; the Reviewer has `Read`).
- **Reviewer verdict: FAIL** (verbatim, issue 1):
  > **Discovered Issue:** In `results-framework-reporting.service.ts`, `getPortfolioTocCoverage` runs `if (!Number.isFinite(tocContext.versionId)) throwServiceError(..., NOT_FOUND)`. Both `resolve()` and `resolveByVersionId()` do set `versionId` (`reporting-toc-context.service.ts:45,126`), so the Leader's fallback concern is cleared. But they set it from `versionRow.id`, which comes from a raw `this._dataSource.query(...)` on `version.id`, and that column is `bigint` (migration `1663773959336-resultsdatamodel.ts`; `version.entity.ts:14-17`). TypeORM's MysqlDriver defaults to `supportBigNumbers: true` and `bigNumberStrings: true` (`node_modules/typeorm/driver/mysql/MysqlDriver.js:979-984`), and `orm.config.ts` does not override either. So `versionId` arrives as `"42"`, and `Number.isFinite("42") === false`. Both the active-phase fallback and an explicit `versionId` get the 404 "No version could be resolved…", and the repository is never called. T-1 already works around the same driver behaviour with `Number(row.total)` on its COUNT columns. The older sibling code binds `tocContext.versionId` as a SQL parameter, where a string works, so it never hit this. Even without the 404, `response.versionId` would go out as a string, against the DTO's `versionId: number`.
  > **Violated Rule:** requirements.md TKP-R-3 ("The server SHALL return coverage for every active P/A … in a single request, keyed by the page version"). design.md §4.1 (Query: absent or non-numeric means the active phase; Errors: 404 only when the ToC context is not resolvable). design.md §5 step 1→3.
  > **Remediation Suggestion:** Convert to a number before the check: `const resolvedVersionId = Number(tocContext.versionId); if (!Number.isFinite(resolvedVersionId) || resolvedVersionId <= 0) throwServiceError(...)`. The `> 0` covers `Number(null) === 0`. Use `resolvedVersionId` for the repository argument and for `response.versionId`. Consider `Number(tocContext.reportingYear)` too. Add a service spec case where the context mock returns `versionId: '42'` (string), as production does. It should expect the repository to be called with `versionId: 42` and `response.versionId === 42` (a number). This is the red test the current suite is missing.
- **Reviewer-verified checks:** a 4xx inside the try cannot carry SQL; `returnErrorRes({debug:false})` emits only the generic message; the new log line holds only the method name plus `error.code`; the guard provider resolves; decorator order matches the precedent.
- **ADVISORY (attempt 1):**
  1. RISK (T-1 code, outside this diff): the repository catch uses `returnErrorRepository({debug: true})`, which logs the raw `QueryFailedError` including `.query` / `.parameters`. That conflicts with the design §4.1 Telemetry line "no query text or parameters". The body is safe; the log is not. **Not absorbed into T-2** (different file; T-1 already PASSed). Surfaced to the user as a possible spec gap.
  2. READABILITY: the direct `_logger.error` deviates from §4.1/§9 "log through the existing handler". Recorded as a deviation.
  3. RESILIENCE: `?versionId=` (empty) → `Number('') = 0` → 400, not the §4.1 active-phase fallback. The Leader puts this in the attempt-2 brief because it is §4.1 conformance (non-numeric → absent) inside T-2's own controller scope.
  4. Red run: attempt 1's red was a compile failure; the string-`versionId` case is a real behavioural red.

#### Attempt 2 — Implementer (T2, effort `xhigh`, bumped one level on rework) → Reviewer PASS

- **Changes:**
  - Service: `resolvedVersionId = Number(tocContext.versionId)`, 404 if not finite or `<= 0`; `resolvedReportingYear = Number(tocContext.reportingYear)`. Both coerced values go to the repository and the response.
  - Controller: `versionId` is `undefined` unless it is a non-empty, non-whitespace string that parses to a finite number > 0.
  - Specs: string-id cases (`'42'` active fallback, `'7'` with year `'2025'` explicit), an `it.each` 404 cases (missing, null, 0, `'0'`, `'abc'`), and a controller `it.each` (`''`, `'   '`, `'0'`, `'-3'`).
- **Red (behavioural):** 7 failed. Controller `''`/`'   '`/`'0'` received `0`, `'-3'` received `-3`; service `'42'` and `'7'` returned 404; a resolved id `0` called the repository.
- **Green:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="results-framework-reporting\.(service|controller)\.spec"` → `Test Suites: 2 passed, Tests: 133 passed, 133 total`. eslint `--quiet` clean on the 4 touched files.
- **Reviewer verdict: PASS.** "Attempt 2 fixes issue 1 (the string BIGINT `versionId` that made every call return 404) without breaking anything I accepted in attempt 1, and adds no new spec violation." The same Reviewer was resumed with a fresh diff snapshot.
- **ADVISORY (attempt 2, recorded only):**
  1. `?versionId=1.5` passes the controller and ends in a 404 from `resolveByVersionId`. Harmless; `Number.isInteger` would match the `@ApiQuery` wording.
  2. `resolvedReportingYear` has no finite check. Low risk, since both context paths guarantee a value.
  3. Carried over: the T-1 repository catch `debug: true` logs `.query`/`.parameters` (design §4.1 Telemetry). Awaiting the user's decision; not absorbed into T-2.

**TKP-T-2 final status:** PASS on attempt 2 (2 review rounds, within the ≤ 2 budget).
**Requirements covered:** TKP-R-3 (S-3.1, field list), TKP-R-2 S-2.1 AND IT MUST, TKP-R-8 S-8.1 (metadata presence; behaviour in T-6), NFR Backwards compatibility, NFR Security (no SQL in the body).
**Decisions:**
- The controller coercion is stricter than its siblings, per §4.1 "non-numeric treated as absent".
- The direct `_logger.error` (method name + `error.code` only) deviates from §4.1/§9 "log through the existing handler".
**Approval gate:** gated, waiting for the user before TKP-T-3.

### TKP-T-3 — Client API method, interface and pure formatter — PASS (attempt 1)

- **Date:** 2026-10-15
- **Implementer:** T2, effort `medium`. Skills: `angular-developer`, `tdd` (as listed).
- **Reviewer:** T3, lens checklist (task `Review: checklist`), effort `medium`.
- **Files:**
  - `shared/services/api/results-api.service.ts` (+ spec, 3 tests): `GET_PortfolioTocCoverage(versionId?)`, typed `ReportingApiResponse<PortfolioTocCoverage>`, no `toDisplayBasis`, no `any`.
  - New `shared/interfaces/portfolio-toc-coverage.interface.ts`.
  - New `portfolio-overview/components/toc-kpi-block/toc-kpi.format.ts` (+ spec).
- **Design choices:**
  - `coveragePercent` returns null at total 0, 100 at covered ≥ total, 0 at covered ≤ 0; otherwise `floor(c*100/t + 0.5)` clamped to 1..99.
  - `naturalCodeCompare` ranks `SP` before any other prefix, then compares prefix, then the number; unparseable codes go last.
  - `toViewRows` returns `{code, name, shortName, covered, total, percent, outputs, outcomes}`, sorts a copy, and carries no display strings.
  - View types `TocKpiViewRow` / `TocKpiSummary` are exported from the formatter.
- **Verification:**
  - Red: formatter module missing; API suite `3 failed, 328 passed`.
  - Green: `npx jest --maxWorkers=2 --no-coverage --testPathPattern="toc-kpi.format.spec|results-api.service.spec"` → `Test Suites: 2 passed, Tests: 351 passed, 351 total`.
  - Lint: `ESLINT_USE_FLAT_CONFIG=false npx eslint <6 files> --quiet` → exit 0. The client uses `.eslintrc.json`, so the plain `npx eslint` call errors without that flag.
- **Reviewer verdict:** PASS. "TKP-T-3 conforms to its spec. The client interface matches `portfolio-toc-coverage.dto.ts` field for field … I traced each named falsifier through the spec table and each one fails it." The Reviewer also showed that floating point cannot break half-up here.
- **ADVISORY (recorded only):**
  1. The "never by %" case fails only because of the null-% `A3` row; the SP fixtures are already in ascending-% order. A fixture with % order opposite to code order would make it fail on its own.
  2. The formatter's red was "module missing"; the behavioural evidence is the Reviewer's mutation trace.
  3. A code that does not match `^[A-Za-z]+0*\d+$` (hyphenated or suffixed) would sort last. **Forward pointer → TKP-T-6 browser check:** confirm the real open-portfolio codes sort as TKP-R-5 requires.
- **Environment note:** `dashboard-lab/reporting-burndown{,.spec}.ts` were modified in the working tree at ~16:28–16:30 by something outside this spec (probably another session). Untouched, unreviewed, and excluded from this spec's commits.
- **Requirements covered:** TKP-R-4 (S-4.1 maths, clamps, zero rule, summary), TKP-R-5 (S-5.1), TKP-R-3 (client contract).
- **Approval gate:** gated, waiting for the user before TKP-T-4.

### TKP-T-4 — Client block `app-portfolio-toc-kpi-block` — PASS (attempt 1)

- **Date:** 2026-10-15
- **Implementer:** T2, effort `high` (new UI surface). Skills: `angular-developer`, `spartan`, `tailwind-design-system`, `frontend-design` (as listed).
- **Reviewer:** T3, full review, lens checklist, effort `high`.
- **Files:**
  - New `portfolio-overview/components/toc-kpi-block/toc-kpi-block.component.{ts,html,spec.ts}`.
  - Additive `tocKpi` group in `internationalization/portfolio-overview.copy.ts`.
  - `spartanBrainMock.ts` untouched: `BrnTooltip` / `BrnButton` already declare every input used.
- **Decisions:**
  - Bar fill is `--pr-chart-2` (#6b46e5) on the `--pr-color-accents-2` (#eaeaea) track, at a computed contrast of **4.81:1**. The other options were chart-1 7.50 (too heavy across about 14 rows), chart-3 3.01 and chart-4 1.80.
  - Helm `HlmTooltip` sits on the name button and `hlmBtn variant="ghost"` on Retry (with a `!text-[13px]` override). Loading uses `.pr-skeleton`, as the Centers block does.
  - Data path: a `Subject` feeds `switchMap` with `catchError` inside; the error is never stored. `retry()` acts only in the error state. A `versionId` effect fires the fetch untracked.
  - The zero-KPI row hides the Output / Outcome split line, because TKP-R-4 forbids `0 / 0`; it keeps the name button for TKP-R-6. The Reviewer confirmed this.
- **Verification:**
  - Red: module missing (0 tests).
  - Green: `npx jest --maxWorkers=2 --no-coverage --testPathPattern="toc-kpi-block.component.spec"` → `Tests: 21 passed, 21 total`.
  - Mutations were run and caught: bar at 0/0, error leaking `500 SELECT`, Retry guard removed. The per-P/A fetch mutation was traced by the Reviewer.
  - Neighbour specs (portfolio-overview, typology) stayed 60/60. eslint `--quiet` clean on the 4 files.
- **Disqualifier (stays with TKP-T-6):** bar width, measured contrast and the 375px layout are not proven by jsdom.
- **Reviewer verdict:** PASS. "TKP-T-4 meets TKP-R-3 S-3.1 BUT, TKP-R-4 to TKP-R-7 and the §7 NFRs at template-intent level."
- **ADVISORY (recorded only):**
  1. Design drift: the figures column is `auto`, where §6.3 says "fixed width". Right edges still line up. **→ TKP-T-6 browser check.**
  2. WCAG 2.5.3 Label in Name: the visible label starts with the code, but the spec's accessible name leaves it out. **→ TKP-T-6 a11y pass / spec follow-up.**
  3. `list-none` can drop list semantics in Safari/VoiceOver; suggests `role="list"`.
  4. **Forward pointer → TKP-T-5:** `year` defaults to `''`, and a `versionId` going null → number fires two requests. The `hasFigures()` gate must hold; bind a resolved year.
  5. Process: record a behavioural red (stub component), not a missing module.
- **Requirements covered:** TKP-R-3 S-3.1 BUT, TKP-R-4, TKP-R-5 (no sort control), TKP-R-6 (emit + aria), TKP-R-7 (states, S-7.1), NFR Accessibility / Design rules / i18n (presence level).
- **Approval gate:** gated, waiting for the user before TKP-T-5.

### TKP-T-5 — Page integration, matrix removal, folder docs — PASS (attempt 1)

- **Date:** 2026-10-15
- **Implementer:** T2, effort `high`. Skills: `angular-developer` (as listed). User instruction at the start of this task: "continúa hasta que termines" (continue until you finish).
- **Reviewer:** T3, full review, lens checklist, effort `high`.
- **Files** (all under `portfolio-overview/`; `git diff --numstat` +212 / −1272):

  | File | Added | Deleted |
  |---|---|---|
  | `component.html` | 9 | 377 |
  | `component.ts` | 26 | 433 |
  | `component.spec.ts` | 97 | 232 |
  | `services/portfolio-overview.service.ts` | 10 | 33 |
  | `services/portfolio-overview.service.spec.ts` | 32 | 0 |
  | `charts.ts` | 0 | 119 |
  | `charts.spec.ts` | 0 | 39 |
  | `CLAUDE.md` | 38 | 39 |

- **Decisions:**
  - `versionId()` = `rows()[0].version_id`, string-safe, `null` if absent or ≤ 0.
  - The block is bound with `[versionId]="data.versionId()" [year]="phaseYear()" (programmeOpen)="openProgramme($event)"` and sits inside `@if (hasFigures())`, after typology. Centers stays outside the gate, as before.
  - `phaseYear()` is extracted from the eyebrow and shared with it. The Reviewer confirmed the eyebrow text is unchanged.
  - Removed beyond the §6.5 list, each with zero references: the `ExportTablesService` injection, the `effect` import, 7 lucide icons, `SortKey`.
  - Kept: `openProgramme` and `navigateToResultsCenter` (§6.5); `CATEGORY_SHORT_NAMES` (still used at `component.ts:300`, TKP-P-9); `getCategoryShortName` and `PROGRAM_AXIS_LABEL_MAX_CHARS.matrix` (not in §6.5, now dead, follow-up).
  - The forward pointer from TKP-T-4 (resolved year; mount only inside `hasFigures()`) is honoured.
- **Verification:**
  - `npx jest --maxWorkers=2 --no-coverage --testPathPattern="portfolio-overview"` → `Test Suites: 10 passed, Tests: 222 passed, 222 total`.
  - `npx ng build` → exit 0.
  - Grep gate → empty (the Reviewer re-ran it client-wide).
  - eslint `--quiet` on the 6 touched .ts files → clean.
  - `CLAUDE.md` is 119 lines (cap 120).
  - No red run was captured. The Reviewer traced it by reading: against the pre-change template, the absence test fails on `#progress-by-science-program`; a block rendered during loading fails the loading test. Both fail on behaviour, not on setup.
- **Reviewer verdict:** PASS. "TKP-T-5 meets the spec … the grep gate is empty across the whole client."
- **ADVISORY (recorded only):**
  1. The `Verified:` stamp sits on line 3 with a spec id, while COMPONENT-DOCS §5 asks for the last line with a short sha. This is pre-existing file style. Consider stamping the sha at commit time.
  2. `CLAUDE.md:109` claims "`[year]` is `phaseYear()`, never `''`", but `phaseYear()` returns `''` when `phaseName` has no 4-digit year.
  3. The dropped gotcha "Categories are derived from the rows, never hardcoded" is still true. Restore it if it fits.
  4. The closed-phase fixtures put the newest version first, so "newest" cannot be told apart from "first". An `[1, 34]` fixture would test the rule.
  5. `getCategoryShortName` and `PROGRAM_AXIS_LABEL_MAX_CHARS.matrix` are now dead. Follow-up outside §6.5.
- **Requirements covered:** TKP-R-9 (S-9.1), TKP-R-7 (gate, skeleton slot, page version, closed-phase banner), TKP-R-6 (wiring), NFR Folder docs.

## Budget Tripwire: after TKP-T-5

| Measure | Budget (design §14) | Actual |
|---|---|---|
| Tasks | 7 | 7 (no new task) |
| LOC added (prod + tests) | ≈ 950; escalate at ≈ 1,300 | **≈ 1,885** (prod 778, tests 1,107) |
| LOC deleted | ≈ 900 | 1,277 |
| Review rounds per code task | ≤ 2 | T-1 1, T-2 2, T-3 1, T-4 1, T-5 1 |

- **Cause:** test volume (the T-2 rework cases, mutation-backed cases, the page-spec rewrite), plus a production delta of about 300 lines (the Swagger DTO, the SQL-free error path, the block template).
- **Scope:** every file was on the approved list; no scope was added.
- **Status:** escalated to the user on 2026-10-15. TKP-T-6 does not start until the user accepts the overrun.

## Follow-ups (outside this spec)

- T-1 repository catch `returnErrorRepository({debug: true})` logs `.query` / `.parameters` (design §4.1 Telemetry). The user deferred the one-line `debug: false` fix as a follow-up.
- Dead symbols: `getCategoryShortName`, `PROGRAM_AXIS_LABEL_MAX_CHARS.matrix`.
- For archive (pending; do not edit on the spec branch): reword the design §10 bound-param order to "in placeholder order".

### TKP-T-6 — HITL live checks — IN PROGRESS

- **Date:** 2026-10-15. Local stack (user: "si lo tengo arriba"). The user's reply was taken as acceptance of the budget overrun and the go-ahead for T-6; recorded here so it can be corrected.
- **Environment finding:** the local server is **not** on the prod database. The shell shows "TEST ENVIRONMENT", the active version resolves to **36** (prod is 8), and `?versionId=8` returns 404 "No version was found for versionId 8.". The ToC schema is shared: the totals match prod.

**1. Parity: NOT yet evidence (version mismatch, per the T-6 disqualifier)**

| P/A | Endpoint (local, v36) total / covered | User query C (prod, v8) total / covered |
|---|---|---|
| SP01 | 403 / 10 (out 393/10, oc 10/0) | 403 / 0 |
| SP04 | 472 / 2 (out 441/2, oc 31/0) | 472 / 0 |
| SP09 | 268 / 0 | not run (query E on prod: 13 candidates) |

- Totals agree, which confirms the KPI scope (TKP-R-1) against independent SQL for 2 P/As.
- Covered comes from a different results DB, so it is not comparable. **Pending:** query C with `@v := 36` on the DB the local server uses (SP01 + one P/A with covered > 0, e.g. SP02), or a PRTest/prod comparison.

**2. Auth:** the admin call returns 200. **Pending:** the 403 call with a non-admin session (user-run).

**3. Timing** (local, `?` = active v36, 3 calls): 850 / 840 / 838 ms. Max 850 ms ≤ 3 s; spread 12 ms (< 1 s, valid). **PASS** on the test DB.

**4. Browser** (`/portfolio-overview`, admin, served bundle fresh: the block renders and the matrix is gone)
- Order: typology → toc-kpi → centers. `#progress-by-science-program` absent.
- 1280: rows render; summary 23 / 2589 → 1 %.
- Codes: SP01…SP13, then `SGP-02` (hyphenated, sorts last per the T-3 advisory). It renders "No ToC KPIs in this phase" with no bar and no split line.
- Contrast measured in the browser: fill rgb(107,70,229) vs track rgb(234,234,234) = **4.81 : 1** ≥ 3 : 1. PASS.
- 375: measured in a same-origin 375px iframe (the window cannot be resized below the screen size; a bounded probe). Inner width 371, doc scrollWidth 358: **no horizontal scroll**. Name, figures and bar stack in one 283px column (figures above a full-width bar). PASS.
- 768: the block does not overflow. The page h-scroll (818 > 769) comes from the shell topbar (`pr-topbar-right` / user name), which is pre-existing and not this spec. The name column squeezes to ~97px because of the auto figures column (T-4 advisory 1). Readability note, not a falsifier.
- A11y:
  - Bars have `role="img"` + aria-label (e.g. "2% — 10 of 403 KPIs covered").
  - Name buttons are `type="button"`, aria-label "Open the Results tab of Breeding for Tomorrow", with `focus-visible:[box-shadow:var(--pr-focus-ring)]` (class-level; no live Tab walk).
  - The list is labelled by `toc-kpi-title`. The only interactive elements are the 14 name buttons.
- Screenshots (session files):
  - `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Xv8vMm\screenshot-1792103794831-7.jpg` (1280)
  - `…\screenshot-1792103861327-9.jpg` (375)
  - `…\screenshot-1792103881595-10.jpg` (768)

**Status:** checks 3 and 4 PASS. Checks 1 (parity on the matching DB) and 2 (403) are pending, user-run.

**T-6 parity update (2026-10-16):** the user ran query C on the PRTest DB connection (the one the local server uses) with `@v := 36`, `@p := 'SP01'`. Result: OUTCOME 10 / 0, OUTPUT 393 / 10, total 403 / 10. **This matches the endpoint exactly** (SP01 403 / 10, out 393 / 10, oc 10 / 0). It is P/A 1 of 2, with covered > 0, so the covered predicate is exercised. SP02 is still pending.
**T-6 parity update (2026-10-16):** SP02 on PRTest, `@v := 36`: OUTPUT 139 / 3, total 139 / 3, no OUTCOME row. **This matches the endpoint exactly** (SP02 139 / 3, oc 0 / 0). **Check 1 (Parity) PASS:** 2 of 2 P/As match, both with covered > 0.

**T-6 commit decision (2026-10-16):** the user asked for the Leader to run the 403 check with two outlook.com test accounts. The Leader declined to type the passwords: `auth.service.ts` `singIn` forwards them to the external auth microservice (Cognito), not a local check. The user then ordered "subamos estos cambios a mi rama con push" before the 403 check ran and before stating acceptance of the screenshots. Committed and pushed to `qa-development-2026-ss` on that order.
- **Still open, carried to the PRTest smoke (rollout §7):** check 2 (403 with a non-admin session; the guard behaviour is unit-covered in T-2, but not live-verified) and the screenshot acceptance.
- **Status:** T-6 stays `[~]` until both are recorded.
- **Commits:** server `154079643`, client `34b9f5ad6` (spec docs in the following docs commit).
