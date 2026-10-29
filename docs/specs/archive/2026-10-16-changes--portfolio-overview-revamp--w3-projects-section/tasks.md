# Tasks — Portfolio Overview: W3/Bilateral projects, by P/A and by Center

## 1. Scope of this task list

| Field | Value |
|---|---|
| Linked spec | [`requirements.md`](./requirements.md) (approved) + [`design.md`](./design.md) (approved, Judgment Day round 1 fixes applied) |
| Parent | `changes/portfolio-overview-revamp` (family #8) |
| Owner | santiago.sanchez@cgiar.org |
| Status | approved (2026-10-16, Phase 3 gate) — ready for `/akili-execute` |
| Branch | `qa-development-2026-ss` (no commit without explicit go-ahead) |

**Rules for every task that runs tests** (machine rules; copy them into each delegated brief):
- Every Jest run carries `--maxWorkers=2` and is scoped with `--testPathPattern`. Never run an unscoped suite.
- Only one test run at a time on the machine.
- Lint only the touched files: `npx eslint <files> --quiet` (client: `ESLINT_USE_FLAT_CONFIG=false`).
- Check free RAM before a heavy run. If it is below 4 GB, stop and tell the user.

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-10-16).
- [x] `design.md` approved (2026-10-16, Judgment Day PASS / PASS, JD-1..JD-8 applied).
- [x] WPS-OQ-1..6 resolved (recommended defaults).
- [x] No CLARISA cache or sync change; no migration (design §3).
- [x] #5 `toc-kpi-progress` code committed. Its family status is still `pending` (PRTest smoke). This spec only appends after the Centers block: a warning, not a block.
- [ ] No other session is editing `portfolio-overview/` or `results-framework-reporting.*` when execution starts.

## 3. Task list

### [x] WPS-T-1 — Repository: one per-project facts query

- **Type:** server
- **Description:** Add `getPortfolioProjectFacts(year, resolvedVersionId)` to `ClarisaProjectsRepository`.
  - One raw `dataSource.query` with positional `?` placeholders, following design §5's repository table:
    - base rows: phase + active, where NULL counts as active;
    - correlated `GROUP_CONCAT(DISTINCT TRIM(program_code))` over approved mappings: non-blank code, `allocation > 0`, `BINARY TRIM(status) IN (?)`;
    - `EXISTS` has-W3: `source = ?` API, version, `(status_id IS NULL OR status_id <> ?)` Discontinued, active link and result;
    - `EXISTS` has-W1/W2: `source = ?` Result, version, no status filter, active link and result;
    - `organization_code` and `source_center_acronym`.
  - Bind array, exactly in this order: approved statuses, `'API'`, version, Discontinued, `'Result'`, version, year.
  - Values come from constants. Export the approved-status set from `api/bilateral` (today it is private in `bilateral-projects.service.ts`) and have that service import the exported one. Sources come from `SourceEnum`; Discontinued from `ResultStatusData`.
  - Return camelCase rows `{ id, organizationCode, sourceCenterAcronym, approvedProgramCodes: string[], hasBilateral: boolean, hasW1w2: boolean }`, with the `GROUP_CONCAT` split, trimmed and blank-filtered, and 0/1 coerced.
  - Errors go through `returnErrorRepository`.
- **Implements:**
  - WPS-R-1 S-1.1 BUT: P2 Pending via the status set; P3 by `allocation > 0`; P5 inactive; P6 by phase; P7 by blank code.
  - WPS-R-1 S-1.1: the NULL `is_active` row (P4) is admitted.
  - WPS-R-2 S-2.1 BUT: Discontinued and previous-version via the bound predicates. AND IT MUST: inactive links and results excluded.
  - WPS-R-3 S-3.1 THEN: `source` Result with no status filter.
  - NFR Security (bound parameters). Design JD-3, JD-6, JD-11.
- **Files:** `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` (+ `.spec.ts`), `onecgiar-pr-server/src/api/bilateral/services/bilateral-projects.service.ts` (constant export only, no behaviour change), and a constant location under `api/bilateral/constants/`.
- **Depends on:** —
- **Blocks:** WPS-T-2
- **Estimate:** M
- **Review:** full (SQL; correctness-critical counts)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** the spec captures the SQL and the params with the data source mocked. Each of these makes it fail:
    - the status comparison without `BINARY`;
    - `allocation >= 0`;
    - a missing `TRIM(...) <> ''`;
    - `status_id <> ?` without the `IS NULL` branch;
    - a status filter on the W1/W2 probe;
    - a missing `rbp.is_active` or `r.is_active`;
    - `is_active = 1` instead of the NULL-tolerant form;
    - any `${...}` interpolation;
    - a bind array not equal to `[['Confirmed'], 'API', 7, 4, 'Result', 7, 2026]` for `(2026, 7)`.

    A second case feeds `approved_program_codes = ' SP01, ,SP04'`, `has_bilateral = '1'` and `has_w1w2 = 0`, and expects `['SP01','SP04']`, `true`, `false`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="clarisa-projects\.repository\.spec|bilateral-projects\.service\.spec"`. It fails before the method exists and passes after; the bilateral service spec stays green after the constant export.
  - **Disqualifier:** this is a **presence-assertion on SQL text**. It cannot prove the SQL returns the right numbers; that is WPS-T-6 parity, and a PASS here must not be reported as correctness. If one statement cannot hold the predicates, stop and escalate the design §8 fallback as a pivot. Never drop a predicate.
  - **Consumers:** `bilateral-projects.service.ts` (imports the now-exported constant). Its spec must stay green.
- **Definition of done:**
  - [x] Specs green (red run above); eslint clean on the touched files.
  - [x] The bilateral service diff only swaps a private constant for the exported one.
  - [x] No SQL text in error messages.

### [x] WPS-T-2 — Service, controller, DTO and module wiring: `GET portfolio/bilateral-projects`

- **Type:** server
- **Description:**
  - **Module:** add `ClarisaProjectsRepository` to the `ResultsFrameworkReportingModule` providers (WPS-P-2).
  - **Service:**
    - inject `@InjectRepository(ClarisaCenter)` and the projects repository;
    - add `getPortfolioBilateralProjects(versionId?)` following design §5 steps 1–6;
    - version resolution per WPS-DD-3: by id = active + Reporting + any status; no id = open Reporting, else the newest active Reporting by `phase_year`; nothing → 404; `resolvedVersionId = Number(version.id)` validated `> 0`;
    - P/A seed; centers with `relations: { clarisa_institution }` → `buildCenterIndex`;
    - aggregate totals / by-P/A (distinct normalised codes in the seed) / by-Center (`resolveProjectOwnerCenter`, else Unassigned `code: null`; only buckets with mapped > 0), plus `unmappedWithBilateralResults`;
    - errors as in #5: a 4xx is passed through, anything else is a generic 500.
  - **DTO:** `dto/portfolio-bilateral-projects.dto.ts` for Swagger.
  - **Controller:** `@Get('portfolio/bilateral-projects')`, with `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)`, `@UseGuards(ValidRoleGuard)`, `@ApiOperation` stating the three rules in plain words, `@ApiQuery versionId` and `@ApiOkResponse`. `versionId` is parsed like `portfolio-coverage`.
- **Implements:**
  - WPS-R-1 S-1.1 THEN (mapped = 2) and AND IT MUST (P4 once in totals, under each of its P/As).
  - WPS-R-2 S-2.1 BUT: unmapped P2 is not counted in (b).
  - WPS-R-3 S-3.1 AND IT MUST: with-W3 ≤ mapped and W1/W2 ≤ mapped, in totals and every row.
  - WPS-R-4 S-4.1: the unmapped count (1; 0 when none).
  - WPS-R-5 S-5.1: `SP02` present with zeros; `SP01` = 2, `SP04` = 1; Σ P/A rows 3 > total 2.
  - WPS-R-6 S-6.1:
    - NULL org + `'CIAT'` → `CENTER-03`;
    - an unknown acronym → Unassigned;
    - `CENTER-17` and `CENTER-16` stay separate;
    - Σ Centers = total;
    - Centers with 0 mapped are absent.
  - WPS-R-10: guard + role metadata (presence; behaviour in WPS-T-6).
  - Design JD-1, JD-2.
- **Files:** `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.{module,service,controller}.ts` (+ service and controller `.spec.ts`), `…/dto/portfolio-bilateral-projects.dto.ts` (new).
- **Depends on:** WPS-T-1
- **Blocks:** WPS-T-3 (contract), WPS-T-6
- **Estimate:** M
- **Review:** full (new endpoint + auth + aggregation)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** the service spec seeds `SP01`, `SP02`, `SP04` and Centers `CENTER-03` (CIAT), `CENTER-16` (SMO) and `CENTER-17` (SO), with the repository mocked. It uses these rows:

    | Row | Approved P/As | Center inputs | W3 | W1/W2 |
    |---|---|---|---|---|
    | P1 | `SP01` | org = CIAT's institution | yes | yes |
    | P4 | `SP01`, `SP04` | NULL org, acronym `'CIAT'` | no | no |
    | P9 | `SP02` | NULL org, acronym `'XYZ'` | no | no |
    | P10 | `SP01` | org = SO's institution | no | no |
    | P2 | none | — | yes | — |

    It expects:
    - totals 4 / 1 / 1;
    - `SP01` 3, `SP04` 1, `SP02` 1, each present;
    - Centers `CENTER-03` 2 · `CENTER-17` 1 · Unassigned 1, and **no** `CENTER-16` row;
    - `unmappedWithBilateralResults` 1.

    Each of these fails the spec: a merge that counts P4 twice in totals, routes P9 to a Center, merges SO into SMO, or counts P2.

    The version cases each fail on the wrong lookup:
    - an IPSR id → 404;
    - a closed Reporting id → 200 (`status = 0` accepted);
    - no id and no open phase → the newest Reporting version is used;
    - the repository is called with a number, never `undefined`.

    The controller spec fails without the guard / `ROLES` metadata, or if `versionId='abc'` reaches the service as `NaN`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="results-framework-reporting\.(service|controller)\.spec"`.
  - **Disqualifier:** the module cannot provide `ClarisaProjectsRepository` without importing a module that creates a circular dependency. Stop and report; do not inline the SQL in the service without escalating.
  - **Consumers:** `ResultsFrameworkReportingModule` providers changed. Check that every existing provider of the service spec still resolves (green run). No existing method changed.
- **Definition of done:**
  - [x] Specs green; eslint clean on the touched files.
  - [x] Swagger decorators present; the route path has two segments under `results-framework-reporting`.
  - [x] The error path uses `returnErrorRes`; no SQL or stack in the body.

### [x] WPS-T-3 — Client API method, interface, formatter and chart model

- **Type:** client
- **Description:**
  - `GET_PortfolioBilateralProjects(versionId?)` on `results-api.service.ts`, beside `GET_PortfolioTocCoverage` and with the same base and encoding, typed `ReportingApiResponse<PortfolioBilateralProjects>`.
  - Interface `shared/interfaces/portfolio-bilateral-projects.interface.ts`.
  - `components/projects-block/projects.format.ts` (pure):
    - `shareOfMapped(count, mapped)`: one decimal, half-up, `null` at mapped 0, 100.0 only when equal, 0.0 only at 0, otherwise clamped to [0.1, 99.9];
    - `toProgramRows` (natural code order, reusing `naturalCodeCompare` from `toc-kpi.format.ts`);
    - `toCenterRows(rows, labelFor)` (catalogue acronym → institution acronym → code; A→Z, Unassigned last);
    - `footnoteText(n)` with singular and plural.
  - `projects.charts.ts` (pure): a grouped-bar ECharts option (3 series, **no** `stack`, value labels on top, colours `--pr-chart-1/2/3` through the existing palette path; series mapping and W1/W2 stripe decal amended 2026-10-16, see design §6.3 / Pivot Record WPS-T-6) plus the `pr-viz-chart` table model.
- **Implements:**
  - WPS-R-7 (P/A natural order; Center A→Z, Unassigned last; no figure-based order).
  - WPS-R-8 S-8.1 THEN (30 → 17 · 56.7%, 1 · 3.3%) and AND (29/30 = 96.7%; 1/1000 = 0.1%, never 0.0%); mapped = 0 → `null` (no `NaN`, no `—%`).
  - WPS-R-4 S-4.1 (footnote text "1 project has…" / "N projects have…").
  - WPS-DD-8 labels. JD-7 value labels.
- **Files:** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (+ spec), `shared/interfaces/portfolio-bilateral-projects.interface.ts`, `…/portfolio-overview/components/projects-block/projects.{format,charts}.ts` (+ specs).
- **Depends on:** WPS-T-2 (contract)
- **Blocks:** WPS-T-4
- **Estimate:** M
- **Review:** full
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** each of these fails a spec:
    - `shareOfMapped(29, 30)` ≠ `'96.7'`;
    - `shareOfMapped(1, 1000)` returns `'0.0'`;
    - `shareOfMapped(30, 30)` ≠ `'100.0'`;
    - `shareOfMapped(0, 0)` ≠ `null`;
    - `toProgramRows` puts `SP10` before `SP09`;
    - `toCenterRows` puts Unassigned anywhere but last, or orders by `mapped`;
    - `footnoteText(1)` contains "projects have";
    - the chart option has any series with `stack`, or ≠ 3 series;
    - the API spec sees a URL not ending `portfolio/bilateral-projects` or a `versionId` param when none was given.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="projects\.(format|charts)\.spec|results-api\.service\.spec"`.
  - **Disqualifier:** `naturalCodeCompare` is not exported from `toc-kpi.format.ts`. Export it there (a one-line change in the same commit); do not copy it.
  - **Consumers:** `toc-kpi.format.ts`, only if its export list changes. Its spec must stay green (add `toc-kpi.format.spec` to the red run in that case).
- **Definition of done:**
  - [x] Specs green; eslint clean.
  - [x] No hex literal in the new files.

### [x] WPS-T-4 — Block `app-portfolio-projects-block`

- **Type:** client
- **Description:** A standalone `OnPush` component in `components/projects-block/`, following the `toc-kpi-block` pattern.
  - **Data:** input `versionId` (number or null). `status` loading / error / ready. Switch-latest `load$` with `catchError` → error. An `effect` on `versionId` triggers the fetch; `retry()` acts only in error.
  - **Content:**
    - 3 KPI tiles;
    - Helm tabs By P/A | By Center (testids `projects-tab-program` / `projects-tab-center`), the same markup as the typology block;
    - a ghost segmented Chart | Table with `aria-pressed`;
    - `pr-viz-chart` for the chart;
    - the table view with the canonical table styles inside `overflow-x-auto`, and a total row from `response.totals`;
    - the multi-P/A caption, in the P/A dimension only;
    - the footnote when `unmappedWithBilateralResults > 0`.
  - **States:** skeleton; error line + ghost Retry; empty line when `totals.mapped = 0` (no tiles, no chart). `role="status"` on the error and empty lines.
  - **Labels:** Center labels come from the same code → catalogue acronym source the Centers block uses.
  - **Copy:** add a `projects` group to `portfolio-overview.copy.ts`.
- **Implements:**
  - WPS-R-8 (content, switches, table total from `totals`, not a column sum); WPS-R-7 (no sort control).
  - WPS-R-9 table and S-9.1 (exactly one request per `versionId` and per Retry; error shows Retry; no technical detail).
  - WPS-R-5 (caption); WPS-R-4 (footnote shown only when > 0).
  - NFR a11y (switch semantics, `role="status"`, chart table equivalent); NFR design rules (tokens, `font-mono tabular-nums`, px type, neutral surfaces, one brand button); NFR copy.
- **Files:** `…/portfolio-overview/components/projects-block/projects-block.component.{ts,html}` (+ `.spec.ts`), `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts`.
- **Depends on:** WPS-T-3
- **Blocks:** WPS-T-5
- **Estimate:** M
- **Review:** full (UI; Spartan tabs)
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`, `tdd`
- **Verification:**
  - **Falsifier:** each of these fails the block spec:
    - two HTTP calls for one `versionId`;
    - a Retry click in error that triggers 0 or 2 calls;
    - a Retry while ready that triggers a call;
    - the error state rendering any part of the error object;
    - the empty state rendering tiles or the chart;
    - the caption visible in the Center dimension;
    - the footnote rendered at 0;
    - the table total row that equals the P/A column sum instead of `totals.mapped` (fixture: P/A sum 3, totals 2);
    - a `—%`, `NaN` or `0 / 0` anywhere at mapped 0.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="projects-block\.component\.spec"`.
  - **Disqualifier:** **jsdom cannot lay out or measure contrast.** A green spec proves state and DOM presence only: not overflow at 375px, not series distinguishability, not tab focus visibility. Those belong to WPS-T-6 and must not be claimed here.
  - **Consumers:** `portfolio-overview.copy.ts` (additive key). The specs that import the copy file stay green; WPS-T-5 runs them.
- **Definition of done:**
  - [x] Spec green; eslint clean.
  - [x] The Spartan MCP was consulted for the tabs contract (or reuse is copied from the typology block's markup).
  - [x] No hex; no rem type utilities.

### [x] WPS-T-5 — Page integration, copy check and folder docs

- **Type:** client
- **Description:**
  - **Page:** mount `<app-portfolio-projects-block [versionId]="data.versionId()" />` after `<app-portfolio-centers-block />` in `portfolio-overview.component.html`, inside `@if (!data.loading())`. Import the component in the page `imports`. **No** page-skeleton slot (JD-10).
  - **Docs:** update `portfolio-overview/CLAUDE.md` with a new section: the contract, the endpoint, the label source, the mount rule (outside `hasFigures()`, under `!loading()`; why, per WPS-DD-7), and gotchas (P/A bars sum > total; Unassigned; closed-phase year). Re-stamp the `Verified:` line.
- **Implements:**
  - WPS-OQ-5 / proposal MODIFIED (the block is the last section, after Centers).
  - WPS-R-9 S-9.1 THEN: the other sections render normally when the block errors (independent path).
  - NFR folder docs.
- **Files:** `…/portfolio-overview/portfolio-overview.component.{html,ts}` (+ `portfolio-overview.component.spec.ts`), `…/portfolio-overview/CLAUDE.md`.
- **Depends on:** WPS-T-4
- **Blocks:** WPS-T-6
- **Estimate:** S
- **Review:** full
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** each of these fails the page spec:
    - `app-portfolio-projects-block` rendered before `app-portfolio-centers-block` in DOM order;
    - the block present while `data.loading()` is true;
    - a page skeleton element with a projects testid;
    - the block hidden when `hasFigures()` is false but loading is done.
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="portfolio-overview/"`.
  - **Disqualifier:** if any pre-existing `portfolio-overview/` spec turns red, fix the cause in this task. Never skip or delete an assertion to get green.
  - **Consumers:** every spec under `portfolio-overview/` (the whole folder run above).
- **Definition of done:**
  - [x] Folder run green; eslint clean.
  - [x] `CLAUDE.md` section added and `Verified:` re-stamped in the same change.

### [x] WPS-T-6 — HITL live checks (parity, auth, timing, browser)

- **Type:** verification (user-run SQL + browser; no code)
- **Description:** On the local stack, on the DB the local server uses (not prod, as #5 found), against the same version the endpoint resolves:
  1. **Parity.** The Leader pastes **in chat** (never as a file) an independent read-only SQL that applies the requirements' rules **without** the new code. It returns:
     - the totals (mapped, with-W3, W1/W2);
     - the counts for 2 P/As the user picks;
     - the counts for 2 Centers, one of them CIAT (alias);
     - the inactive-project count (WPS-P-4);
     - the org-set-but-unmatched count (WPS-P-11);
     - `SHOW INDEX FROM results_by_projects` (WPS-P-12).

     Compare with the endpoint.
  2. **Auth.** A 200 for admin, and a **403** for a non-admin session (user-run login; the agent never types passwords).
  3. **Timing.** 3 timed calls; p95 ≤ 3 s.
  4. **Browser.** `/portfolio-overview` at 1280 / 768 / 375:
     - the block is placed after Centers;
     - there is no horizontal page scroll at 375;
     - the table scrolls inside its container;
     - the three series are distinguishable and each has value labels;
     - series contrast is ≥ 3:1 against the surface (measured);
     - the tabs and the view switch are keyboard-operable with a visible focus ring;
     - the Center labels match the Centers block.
- **Implements:** NFR Correctness parity, Performance, Accessibility, Responsive; WPS-R-10 behaviour; WPS-R-6 (CIAT alias live); design WPS-P-4, P-11, P-12.
- **Files:** `execution.md` (results only).
- **Depends on:** WPS-T-5 (and WPS-T-2 for the API checks)
- **Blocks:** commit
- **Estimate:** S
- **Review:** skip-eligible (evidence task)
- **Skills:** `playwright-cli` if installed, otherwise Chrome tools
- **Verification:**
  - **Falsifier:**
    - any parity figure that differs between the SQL and the endpoint;
    - a 200 (or any body data) for the non-admin;
    - any timed call > 3 s;
    - a horizontal scroll at 375;
    - two series a reader cannot tell apart without the legend.
  - **Disqualifiers (the reading is not evidence; report it, do not pass it):**
    - the parity SQL ran on a different DB or version than the endpoint (the #5 trap: compare `versionId` and phase year first);
    - the 3 timings spread by more than 1 s (report the spread);
    - the served bundle is stale (verify the block's source in `window.ng` before judging the UI);
    - the parity sample has no CIAT project (it would not exercise the alias).
  - **Consumers:** none.
- **Definition of done:**
  - [x] Every check is recorded in `execution.md` with its numbers, or marked `pending (user-run)`.
  - [x] A parity difference that matches exactly the WPS-P-4 or WPS-P-11 count is recorded as a known divergence, not a defect of this spec.
  - [x] No click on any write button during the browser check (local stack writes to the shared DB).

## 4. Coverage closure (scenario and clause level)

| Requirement clause | Owning task |
|---|---|
| S-1.1 THEN mapped = 2 | T-2 (aggregation), T-1 (predicates) |
| S-1.1 BUT P2, P3, P5, P6, P7 excluded | T-1 |
| S-1.1 AND IT MUST P4 once in the total | T-2 |
| S-2.1 THEN = 1 · BUT P4 (Discontinued, other version) | T-1 |
| S-2.1 BUT P2 not mapped | T-2 |
| S-2.1 AND IT MUST inactive links / results ignored | T-1 |
| S-3.1 THEN = 1 | T-1 (source), T-2 |
| S-3.1 AND IT MUST with-W3 ≤ mapped, W1/W2 ≤ mapped everywhere | T-2 |
| S-4.1 footnote 1 / none at 0 | T-2 (count), T-3 (text), T-4 (render rule) |
| S-5.1 SP02 listed, SP01 2, SP04 1, Σ 3 > 2 | T-2 |
| WPS-R-5 caption | T-4 |
| S-6.1 CIAT alias, Unassigned | T-2 |
| S-6.1 BUT SO ≠ SMO | T-2 |
| WPS-R-6 Centers with 0 not listed; Unassigned last only when > 0 | T-2 (drop), T-3 (order) |
| WPS-R-7 order; no sort control | T-3 (order), T-4 (no control) |
| WPS-R-8 content, switches, table total from totals | T-4 |
| S-8.1 maths and clamps; no `NaN` / `—%` at 0 | T-3 (maths), T-4 (render) |
| WPS-R-9 states; S-9.1 one request per Retry; no technical detail | T-4 |
| S-9.1 other sections render normally | T-5 |
| WPS-R-10 metadata | T-2 |
| WPS-R-10 behaviour (403); route not JWT-exempt | T-6 |
| NFR parity, performance, responsive, contrast | T-6 |
| NFR a11y semantics | T-4 (DOM), T-6 (live) |
| NFR design rules, copy | T-4 |
| NFR folder docs | T-5 |

## 5. Execution order

```
T-1 → T-2 → T-3 → T-4 → T-5 → T-6
```

Serial: each task consumes the previous task's contract, and T-3..T-5 share the same folder. Recommended commits (after T-6, on the user's go-ahead): **server** (T-1 + T-2), then **client** (T-3..T-5).
