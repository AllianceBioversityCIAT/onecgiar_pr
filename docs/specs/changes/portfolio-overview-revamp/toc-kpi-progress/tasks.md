# Tasks — Portfolio Overview: Progress against ToC KPIs, by Program / Accelerator

## 1. Scope of this task list

| Field | Value |
|---|---|
| Linked spec | [`requirements.md`](./requirements.md) (approved) + [`design.md`](./design.md) (approved) |
| Parent | `changes/portfolio-overview-revamp` (family #5) |
| Owner | santiago.sanchez@cgiar.org |
| Status | done |
| Branch | `qa-development-2026-ss` (no commit without explicit go-ahead) |

**Rules for every task that runs tests** (machine rules, copy them into each delegated brief):
- Every Jest run carries `--maxWorkers=2` and is scoped with `--testPathPattern`. Never run an unscoped suite.
- Only one test run at a time on the machine.
- Lint only the touched files: `npx eslint <files> --quiet`.
- Check free RAM before a heavy run. If it is below 4 GB, stop and tell the user.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-10-15).
- [x] `design.md` approved (2026-10-15).
- [x] TKP-OQ-1..6 resolved (recommended defaults).
- [x] No CLARISA cache or sync change.
- [x] No in-flight spec touching the same files. #6 and #8 (client half) wait on this one (`family.md`).
- [x] No migration (design §3).
- [x] **TKP-T-0 done**: premise TKP-P-3 checked on prdb. **Blocks TKP-T-1.**

## 3. Task list

### TKP-T-0 — Check premise TKP-P-3 on prdb (user-run)

- **Type:** db (read-only, user-run)
- **Description:** The Leader pastes **in chat** (never as a file) one read-only SQL. The query measures, among the active applicable indicator links (`results_toc_result_indicators`, `is_active = 1`, `is_not_aplicable = 0`) of pooled results in the open version, the share that has **no** active target row (`result_indicators_targets`) with a non-null `contributing_indicator`. The user runs it in DBeaver and reports the two counts. A second query lists, for 2 P/As the user picks, the distinct in-scope indicator ids and the covered ones. It applies the design §5 rules **independently of the new code** and is kept for the TKP-T-6 parity check.
- **Implements:** design TKP-P-3, TKP-DD-3. It prepares the "Correctness parity" NFR.
- **Files:** none.
- **Depends on:** —
- **Blocks:** TKP-T-1
- **Estimate:** S
- **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** the share of links without a contributing value is **> 5 %**. Then links are auto-created per node, and coverage would read "node mapped".
  - **Red run:** n/a (no test gate).
  - **Disqualifier:** the share is > 5 %. Stop: re-open TKP-OQ-3 with the user before TKP-T-1 (escalation, not a patch).
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [x] Both counts reported by the user and recorded in `execution.md`, with TKP-P-3 set to `verified` or `refuted`.
  - [x] The parity query is saved in `execution.md` for TKP-T-6. It contains SQL text only, never credentials.

### TKP-T-1 — Repository: one grouped coverage query

- **Type:** server
- **Description:** Add `getPortfolioTocCoverage(context)` to `AoWBilateralRepository`, beside `getPlannedKpisCountMap`. It is one statement grouped by `tr.official_code, tr.category`, with the predicates of design §5 (base rows, AoW join, node scope, distinct total, covered set). Every value is bound. The status set and the source come from named constants (reuse `W1_W2_RESULT_SOURCE_FILTER`; add a status constant for `[2, 3]` from `ResultStatusData`). It returns `{ official_code, category, total, covered }[]` with numeric coercion. Errors go through `returnErrorRepository`, like its sibling.
- **Implements:**
  - TKP-R-1: S-1.1 THEN (distinct), BUT (I3 not twice; I5 out-of-AoW outcome and I6 inactive not counted), AND IT MUST (no EOI: only `OUTPUT` / `OUTCOME`).
  - TKP-R-1: S-1.2 (phase bound).
  - TKP-R-2: S-2.1 BUT (W3 via `source`; Editing via the status set; not-applicable via `is_not_aplicable = 0`).
  - TKP-R-2: S-2.2 (no submitter predicate; grouped by the ToC's `official_code`).
  - TKP-R-2: S-2.3 (`r.version_id` bound).
  - NFR Security (bound parameters).
- **Files:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (+ `.spec.ts`), and a status constant under `onecgiar-pr-server/src/shared/constants/` (or beside the existing source filter).
- **Depends on:** TKP-T-0
- **Blocks:** TKP-T-2
- **Estimate:** M
- **Review:** full (cross-schema SQL; correctness-critical metric)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** the spec asserts the generated SQL, with the data source mocked and the query captured. Each of these makes it fail:
    - `COUNT(` without `DISTINCT` on the indicator;
    - a missing `is_not_aplicable = 0`;
    - a missing `source` predicate;
    - `status_id IN` bound to anything but `[2, 3]`;
    - an absent `version_id` predicate;
    - an OUTCOME branch that admits `wp_id IS NULL`;
    - any `${...}` interpolation of the phase, year or version;
    - a parameter order that does not match the placeholders.

    A second case feeds string counts (`'4'`) and expects numbers.
  - **Red run:** `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="aow-bilateral.repository.spec"`. It fails before the method exists and passes after.
  - **Disqualifier:** the predicates cannot be written as one statement without breaking a rule of design §5. Then stop and escalate the two-query split from design §8 as a pivot. Do not drop a predicate. **This test is a presence-assertion on SQL text.** It cannot prove that the SQL returns the right numbers; that proof is the TKP-T-6 parity check, and this task's PASS must not be reported as correctness.
  - **Consumers:** none (new method; the existing methods are untouched).
- **Definition of done:**
  - [x] Spec green (red run above); `npx eslint <touched files> --quiet` clean.
  - [x] No existing repository method changed (diff shows additions only).
  - [x] No secret or SQL text in error messages.

### TKP-T-2 — Service + controller: `GET toc-results/portfolio-coverage`

- **Type:** server
- **Description:**
  - **Service:** add `getPortfolioTocCoverage(versionId?)` to `ResultsFrameworkReportingService`, following design §5 steps 1–7: resolve the context, load the P/A seed (TKP-P-8), call the repository, merge with zero defaults, drop unknown codes, sum the Output / Outcome split and `portfolio`, and return `returnFormatService`.
  - **Interface:** a response interface (or DTO class for Swagger) under `results-framework-reporting/dto/`.
  - **Controller:** a handler `@Get('toc-results/portfolio-coverage')` with `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)`, `@UseGuards(ValidRoleGuard)`, `@ApiOperation` (with the KPI and coverage rules in plain words), `@ApiQuery versionId` and `@ApiOkResponse`. `versionId` is parsed the same way as `program-progress`.
- **Implements:**
  - TKP-R-3: one call returns every P/A; S-3.1 THEN (zero-KPI P/A present with 0 / 0); the field list (code, shortName, name, total, covered, outputs, outcomes).
  - TKP-R-2: S-2.1 AND IT MUST (covered ≤ total holds after the merge).
  - TKP-R-8: S-8.1 (guard + role metadata). Presence only; the behaviour is in TKP-T-6.
  - NFR Backwards compatibility (additive).
- **Files:** `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.{service,controller}.ts` (+ both `.spec.ts`), plus a `dto/` file.
- **Depends on:** TKP-T-1
- **Blocks:** TKP-T-3 (contract), TKP-T-6
- **Estimate:** M
- **Review:** full (new endpoint + auth)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** the service spec seeds `SP01`, `SP02`, `A3` and the repository rows `SP01/OUTPUT 3/1`, `SP01/OUTCOME 1/0`, `SP02/OUTPUT 2/2`, `XX99/OUTPUT 5/5`. It expects:
    - `SP01` = 4 / 1 with outputs 3 / 1 and outcomes 1 / 0;
    - `SP02` = 2 / 2;
    - `A3` = 0 / 0, present;
    - `XX99` absent;
    - `portfolio` = 6 / 3.

    A merge that sums `XX99` in, omits `A3`, or swaps the categories fails. The controller spec fails if the handler lacks the `ValidRoleGuard` / `ROLES` metadata, or if `versionId='abc'` reaches the service as `NaN`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="results-framework-reporting\.(service|controller)\.spec"`.
  - **Disqualifier:** `ValidRoleGuard` cannot be resolved in this module without wiring a new module (TKP-P-7 refuted). Stop and report; do not drop the guard.
  - **Consumers:** none (new methods. `ResultsFrameworkReportingService` gains a method; the existing ones are unchanged).
- **Definition of done:**
  - [x] Specs green; eslint clean on the touched files.
  - [x] Swagger decorators present.
  - [x] Error path uses `returnErrorRes`; no stack or SQL in the body.

### TKP-T-3 — Client API method, interface and pure formatter

- **Type:** client
- **Description:**
  - **API method:** add `GET_PortfolioTocCoverage(versionId?)` to `results-api.service.ts`. It uses the same URL base and `versionId` encoding as `GET_ScienceProgramTocProgress` (`:1695`) and has no `toDisplayBasis`.
  - **Interface:** add `shared/interfaces/portfolio-toc-coverage.interface.ts`.
  - **Formatter:** create `components/toc-kpi-block/toc-kpi.format.ts` with:
    - `coveragePercent(covered, total)`: half-up; 100 only when equal, otherwise ≤ 99; 0 only when covered = 0, otherwise ≥ 1; `null` when total = 0.
    - `naturalCodeCompare`.
    - `toViewRows(programs)`, sorted by code.
    - `toSummary(portfolio)`.
- **Implements:**
  - TKP-R-4: S-4.1 THEN (40 / 0 / 99 / 1 / null), AND (summary 300 / 790 → 38), BUT (`SP03` not 100; `SP04` not 0).
  - TKP-R-4 zero-KPI rule (no %, no `0 / 0`, no `NaN`; the formatter returns `null` → the view shows the line).
  - TKP-R-5: S-5.1 (`SP02` before `SP10`; `SP9` before `SP10`; never by %).
  - TKP-R-3 (the client contract matches the server fields).
- **Files:** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts`, `onecgiar-pr-client/src/app/shared/interfaces/portfolio-toc-coverage.interface.ts`, `…/portfolio-overview/components/toc-kpi-block/toc-kpi.format.ts` (+ `.spec.ts`).
- **Depends on:** TKP-T-2 (contract shape)
- **Blocks:** TKP-T-4
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** the S-4.1 table as a parametrised test. Each of these fails it:
    - `Math.round` without clamps (`199 / 200` → 100);
    - `Math.floor` (`1 / 300` → 0);
    - `0 / 0` → `NaN` or 0 instead of `null`;
    - a lexical sort (`SP10` before `SP9`);
    - sorting by %.

    One API test asserts the URL and the `versionId` query parameter with `HttpTestingController`.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern="toc-kpi.format.spec|results-api.service.spec"`.
  - **Disqualifier:** none expected. If the server field names differ from design §4.1, fix the interface to the server, never the other way round.
  - **Consumers:** `results-api.service.ts` gains a method (additive). Existing callers are unaffected.
- **Definition of done:**
  - [x] Specs green; eslint clean on the touched files.
  - [x] No `any` in the new method's type.

### TKP-T-4 — Client block `app-portfolio-toc-kpi-block`

- **Type:** client
- **Description:** A standalone `OnPush` component in `components/toc-kpi-block/`.
  - **Inputs:** `versionId` (number or null), `year` (string).
  - **Output:** `programmeOpen` (code).
  - **States:** `loading / error / ready`, with switch-latest fetching on a `versionId` change and on `retry()`.
  - **Template:** per design §6.3: section shell, title + subtitle (with the year), summary line + bar, `<ul>` of rows, the name button (`type="button"`, aria-label from copy) emitting `programmeOpen`, the muted Output / Outcome split line, a continuous bar with `role="img"` and a text equivalent, the zero-KPI line (no bar element), and the empty, error + ghost Retry, and skeleton states.
  - **Copy:** the `tocKpi` group in `internationalization/portfolio-overview.copy.ts`.
  - **Rules:** Tailwind only, `var(--pr-*)` only, `font-mono tabular-nums` right-aligned figures, px type sizes. Consult the Spartan MCP for any Helm primitive used (skeleton, button, tooltip). Any new Helm host-directive input goes in `tests/mocks/spartanBrainMock.ts`.
- **Implements:**
  - TKP-R-4: title, subtitle text, row content (code, name, covered / total, %, bar, split line), zero-KPI line, summary.
  - TKP-R-5: no sort control rendered.
  - TKP-R-6: name button destination via the output, accessible name; counts, %, bars and summary are not interactive.
  - TKP-R-7: Loading (no zero figures), Error (message + Retry, no technical detail), Empty (all totals 0 or the list empty → one line), Success.
  - TKP-R-7: S-7.1 THEN (section error shown), BUT (no stack, SQL or URL in the text), AND IT MUST (exactly one request per Retry click).
  - TKP-R-3: S-3.1 BUT (no second request per P/A).
  - NFR Accessibility (labelled list, bar text equivalent, `role="status"` lines), Design rules, i18n.
- **Files:** `…/portfolio-overview/components/toc-kpi-block/toc-kpi-block.component.{ts,html}` (+ `.spec.ts`), `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts`, and `tests/mocks/spartanBrainMock.ts` only if needed.
- **Depends on:** TKP-T-3
- **Blocks:** TKP-T-5
- **Estimate:** M
- **Review:** full (new UI surface)
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `frontend-design`
- **Verification:**
  - **Falsifier:** with `HttpTestingController` and the API method spied:
    - setting `versionId` triggers **1** request; with 5 P/As in the response there is still **1**;
    - a 500 renders the error line, whose text does not contain `500`, `SELECT` or `http`, while the Retry button is shown;
    - clicking Retry twice after two failures gives exactly **2** further requests;
    - a zero-KPI P/A renders the "No ToC KPIs" line and **no** `[role=img]` element in its row;
    - clicking a name emits its code;
    - a % or count element is not a `button` / `a`.

    Each fails if fetching is per P/A, if errors leak `error.message`, or if the bar renders at `0 / 0`.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern="toc-kpi-block.component.spec"`.
  - **Disqualifier:** these tests prove DOM presence and the request count only. **jsdom cannot prove the bar's width, its contrast or the layout at 375px**; those are TKP-T-6 checks. Do not report them as covered here.
  - **Consumers:** `portfolio-overview.copy.ts` gains a group (additive); `spartanBrainMock.ts` only if extended. Grep its importers if it is touched.
- **Definition of done:**
  - [x] Spec green; eslint clean on the touched files.
  - [x] No hex, no rem type utilities, no hardcoded English in the template.

### TKP-T-5 — Page integration, matrix removal, folder docs

- **Type:** client
- **Description:**
  - **Service:** add `versionId()` to `PortfolioOverviewService` (a computed of the first open row's `version_id`, or `null`).
  - **Template:** in `portfolio-overview.component.html`:
    - replace the matrix section (`:371-733`) with `<app-portfolio-toc-kpi-block>`, bound to `data.versionId()` and the page year, with `(programmeOpen)` wired to the existing `openProgramme(code)`. It goes inside `hasFigures()`, after the typology block and before the Centers block;
    - replace the matrix skeleton (`:89-107`) with a block skeleton (testid `portfolio-overview-skeleton-toc-kpi`).
  - **Removals:** delete every symbol in design §6.5 whose remaining reference count is 0. Grep each before deleting. Keep `openProgramme`, `navigateToResultsCenter`, `CATEGORY_SHORT_NAMES` if still referenced, and the out-of-scope leftovers.
  - **Charts:** delete `matrixTableChartOption` / `matrixTableChartTable` and their spec cases.
  - **Specs:** update `portfolio-overview.component.spec.ts`: delete the matrix describes, and retarget the typology-placement test to typology → toc-kpi → centers.
  - **Folder docs:** update `portfolio-overview/CLAUDE.md`:
    - Contract: drop `programmeRows` / `footer`; add the block and its own data path.
    - Gotchas: remove "column order" and "cells is positional".
    - Add a "Progress against ToC KPIs" section (rules, endpoint, no ranking, not interactive except the name).
    - Add the matrix to "Removed on purpose".
    - Re-stamp `Verified:`.

    Keep it under the 120-line cap (`docs/COMPONENT-DOCS.md`).
- **Implements:**
  - TKP-R-9: the removal list, S-9.1 THEN (no `#progress-by-science-program`, no matrix Export Excel), AND (order typology → new section → Centers).
  - TKP-R-7: requests only once `hasFigures()`; the page skeleton shows the section skeleton where the matrix one was; the version comes from the page rows; the closed-phase banner applies unchanged.
  - TKP-R-6: wiring to `openProgramme`.
  - NFR Folder docs.
- **Files:** `…/portfolio-overview/portfolio-overview.component.{ts,html,spec.ts}`, `…/portfolio-overview/services/portfolio-overview.service.ts` (+ spec if it has one), `…/portfolio-overview/portfolio-overview.charts.{ts,spec.ts}`, `…/portfolio-overview/CLAUDE.md`.
- **Depends on:** TKP-T-4
- **Blocks:** TKP-T-6
- **Estimate:** M (mostly deletion)
- **Review:** full (removes delivered behaviour; shared page files)
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** the page spec fails if:
    - `#progress-by-science-program` or any "Export Excel" matrix control still renders when the page has figures;
    - the order of typology block, toc-kpi block and centers block differs;
    - the block is rendered (and requests) while `isLoading()`;
    - `versionId()` is not the first open row's `version_id` (a closed-phase fixture must give the newest version).

    A grep gate: `grep -n "programmeRows\|matrixTableChart\|exportToExcel\|onCategoryCellClick" <portfolio-overview folder>` returns nothing.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --no-coverage --testPathPattern="portfolio-overview"` (folder-scoped, the family's standard gate), then `npx ng build` for template type-checking. `tsc` does not typecheck templates.
  - **Disqualifier:** a symbol in §6.5 is still referenced by a surviving section. Keep it and record it; do not delete the surviving feature. If the build fails on a template reference, fix the template, not the build.
  - **Consumers:** `PortfolioOverviewService` (`programmeRows`, `footer` removed; `versionId` added). Its only consumers are this component and its spec (TKP-P-9). `portfolio-overview.charts.ts` exports removed; the only consumer is the component.
- **Definition of done:**
  - [x] Folder-scoped Jest green; `ng build` green; eslint clean on the touched files.
  - [x] Grep gate empty.
  - [x] `CLAUDE.md` updated and re-stamped in the same change.
  - [x] Asserted copy in the remaining specs still matches (memory: renamed copy broke teammates' specs before).

### TKP-T-6 — HITL live checks (parity, auth, timing, browser)

- **Type:** rollout (manual, with the user)
- **Description:** At the HITL pause, local stack or PRTest, the following checks run. Writes to the shared prdb are forbidden: there are no write buttons on this page, and the Retry is a GET.
  1. **Parity:** the user runs the TKP-T-0 parity query for 2 P/As. Its total and covered must equal the endpoint's numbers for the same version.
  2. **Auth:** the endpoint is called with an admin token (200) and with a non-admin token (403, no data in the body). Tokens are supplied by the user and never echoed or logged.
  3. **Timing:** 3 timed calls; report p95 (max of 3) and the spread.
  4. **Browser:** checks at 1280 / 768 / 375:
     - no horizontal page scroll at 375px;
     - figures above the bar below 640px;
     - the bar visible, with a contrast reading of fill vs track ≥ 3:1;
     - a keyboard walk: name buttons and Retry are focusable with a visible ring;
     - the screen reader name of one bar.

     Confirm the served bundle is fresh first (client `CLAUDE.md` §9: two localStorage keys, check the served bundle).
- **Implements:**
  - NFR Correctness parity and Performance.
  - TKP-R-8: S-8.1 THEN (403), BUT (no data in the body).
  - TKP-R-1 / TKP-R-2 end to end (the SQL truth TKP-T-1 cannot prove).
  - NFR Accessibility and Responsive (jsdom gaps).
- **Files:** `execution.md` (evidence only).
- **Depends on:** TKP-T-5
- **Blocks:** commit
- **Estimate:** S
- **Review:** checklist (evidence completeness)
- **Skills:** `playwright-cli` if installed; otherwise the browser via `claude-in-chrome`
- **Verification:**
  - **Falsifier:**
    - Parity: any mismatch between the query and the endpoint for either P/A.
    - Auth: a non-admin call returning 200.
    - Timing: max of 3 > 3 s.
    - Contrast: < 3:1.
    - Layout: any horizontal scroll at 375px.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:**
    - If the 3 timings spread by more than 1 s, the number is not evidence. Report the spread and re-run at a quieter moment instead of passing.
    - A parity mismatch is never "close enough". Report both numbers and the differing indicator ids, and stop for a decision.
    - A PRTest check needs the commit deployed (`performance-refactor`, about 30 min). A local check against the shared prdb is valid for parity and timing only if the version id matches.
  - **Consumers:** none.
- **Definition of done:**
  - [x] All 4 checks recorded in `execution.md` with numbers. Parity, timing and browser PASS locally; the 403 PASS on PRTest (2026-10-16).
  - [x] User accepts the browser screenshots (accepted on PRTest, 2026-10-16).
  - [x] Commit on the user's explicit go-ahead (2026-10-16, pushed before the two items above; see `execution.md`). Rule: commit on the user's explicit go-ahead. Server and client go in separate commits, server first; `<emoji> <type>(<scope>) [SPEC:changes/portfolio-overview-revamp/toc-kpi-progress]: …`, with no apostrophes, `$` or quotes in the subject.

## 4. Dependency graph

```
TKP-T-0 (user query: premise P-3 + parity SQL)
   └── TKP-T-1 (repository SQL)
         └── TKP-T-2 (service + controller + guard)
               └── TKP-T-3 (client API + interface + formatter)
                     └── TKP-T-4 (block component)
                           └── TKP-T-5 (page integration + removal + CLAUDE.md)
                                 └── TKP-T-6 (HITL: parity, 403, timing, browser)
```

Strictly serial. TKP-T-3's formatter could start in parallel with TKP-T-2, but the machine rule allows one test run at a time, and the contract is pinned by T-2. The gain is not worth it.

## 5. Coverage closure (scenario and clause → owning task)

| Requirement | Scenario / clause | Owner |
|---|---|---|
| TKP-R-1 | S-1.1 THEN total = 4 (distinct) | T-1 (SQL) · T-6 (truth) |
| TKP-R-1 | S-1.1 BUT I3 not twice | T-1 `COUNT(DISTINCT)` |
| TKP-R-1 | S-1.1 BUT I5 (outcome, not in an AoW) and I6 (inactive) not counted | T-1 OUTCOME branch + `tri.is_active` |
| TKP-R-1 | S-1.1 AND IT MUST NOT include EOIs | T-1 category predicate |
| TKP-R-1 | S-1.2 phase scope | T-1 bound phase |
| TKP-R-2 | S-2.1 THEN covered = 1, counted once | T-1 distinct covered · T-6 |
| TKP-R-2 | S-2.1 BUT R3 W3 / R4 Editing / R5 not-applicable | T-1 source / status / `is_not_aplicable` predicates |
| TKP-R-2 | S-2.1 AND IT MUST covered ≤ total | T-2 merge test · T-6 |
| TKP-R-2 | S-2.2 THEN covered for `SP01` · AND nothing added to `SP02` | T-1 (grouped by ToC code, no submitter predicate) · T-6 |
| TKP-R-2 | S-2.3 version scope | T-1 bound `version_id` |
| TKP-R-3 | One call, all P/As, field list | T-2 (server) · T-3 (contract) |
| TKP-R-3 | S-3.1 THEN zero-KPI P/A present | T-2 |
| TKP-R-3 | S-3.1 BUT no second request | T-4 request-count test |
| TKP-R-4 | Title, subtitle wording, row content, split line | T-4 |
| TKP-R-4 | Rounding and clamps; zero-KPI → no % / bar / `0 / 0` / `NaN` | T-3 (maths) · T-4 (no bar rendered) |
| TKP-R-4 | Summary Σ / Σ | T-2 (`portfolio`) · T-3 (`toSummary`) · T-4 (render) |
| TKP-R-4 | S-4.1 THEN, AND summary 38 %, BUT `SP03` ≠ 100 / `SP04` ≠ 0 | T-3 |
| TKP-R-5 | Natural order by code; S-5.1 | T-3 |
| TKP-R-5 | No sort control | T-4 |
| TKP-R-6 | Name → Results tab, accessible name | T-4 (emit + aria) · T-5 (wiring) |
| TKP-R-6 | Counts, %, bars, summary not links | T-4 |
| TKP-R-7 | Requests only once `hasFigures()`; uses the page version | T-5 |
| TKP-R-7 | Loading / Error / Empty / Success table | T-4 |
| TKP-R-7 | Page skeleton slot; closed-phase banner unchanged | T-5 |
| TKP-R-7 | S-7.1 THEN rest of the page intact | T-5 (page spec: the block's error does not flip page state) · T-4 |
| TKP-R-7 | S-7.1 BUT no technical detail | T-4 |
| TKP-R-7 | S-7.1 AND IT MUST one request per Retry | T-4 |
| TKP-R-8 | S-8.1 THEN 403 · BUT no data | T-2 (metadata, presence) · **T-6 (behaviour)** |
| TKP-R-9 | Removal list | T-5 (+ grep gate) |
| TKP-R-9 | S-9.1 THEN no `#progress-by-science-program`, no matrix export · AND section order | T-5 |
| NFR | Performance p95 ≤ 3 s | T-6 |
| NFR | Correctness parity (≥ 2 P/As) | T-0 (query) · T-6 (comparison) |
| NFR | Security (bound parameters, guard) | T-1 · T-2 · T-6 |
| NFR | Accessibility, Responsive | T-4 (presence) · **T-6 (behaviour)** |
| NFR | Design rules, i18n | T-4 |
| NFR | Folder docs | T-5 |

No clause is discharged by citing a different requirement.

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| TKP-TEST-1 | unit (server) | S-1.1, S-1.2, S-2.1 BUT, S-2.2, S-2.3 (SQL presence) | `…/repositories/aow-bilateral.repository.spec.ts` |
| TKP-TEST-2 | unit (server) | TKP-R-3, S-3.1, S-2.1 AND IT MUST | `results-framework-reporting.service.spec.ts` |
| TKP-TEST-3 | unit (server) | TKP-R-8 metadata, `versionId` parsing | `results-framework-reporting.controller.spec.ts` |
| TKP-TEST-4 | unit (client) | S-4.1, S-5.1, TKP-R-4 zero rule | `components/toc-kpi-block/toc-kpi.format.spec.ts` |
| TKP-TEST-5 | unit (client) | TKP-R-4/5/6/7, S-3.1 BUT, S-7.1 | `components/toc-kpi-block/toc-kpi-block.component.spec.ts` |
| TKP-TEST-6 | unit (client) | TKP-R-9, S-9.1, TKP-R-7 page wiring | `portfolio-overview.component.spec.ts`, `portfolio-overview.charts.spec.ts` |
| TKP-TEST-7 | manual (HITL) | Parity, S-8.1 behaviour, p95, a11y and responsive | `execution.md` |

## 7. Rollout & verification

- [ ] Commits on the user's go-ahead only: server first, then client.
- [ ] Merge to `performance-refactor` for the PRTest smoke, in the user's own checkout (memory). PRTest deploys in about 30 min.
- [ ] PRTest smoke: the section renders for an admin, and the numbers match the local parity run for the same version.
- [ ] `family.md`: set #5 to `done` with the commit hashes. #8's client half is unblocked.

## 8. Roll-back plan

1. Revert the client commit: the matrix section returns, and the page no longer calls the endpoint.
2. The server commit may stay (an unused, guarded, read-only endpoint), or be reverted after the client.
3. No migration, flag or payload contract to undo; no downstream notification needed.

## Required cross-references

[`requirements.md`](./requirements.md) · [`design.md`](./design.md) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · [`../family.md`](../family.md)
