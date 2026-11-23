# Execution — Portfolio Overview graphs clarity (PGC)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-graphs-clarity/` |
| Approval Mode | gated |
| Started | 2026-11-23 |
| Checkout | git worktree `D:\PRMS\onecgiar_pr-pgc`, branch `pgc/portfolio-graphs-clarity` from `origin/qa-development-2026-ss` `b143445bd` (includes `cfc18d03e`). Chosen by the owner 2026-11-23: the main checkout holds other sessions' uncommitted edits on the same server files, so `git pull` was blocked |
| Leader | Claude Code, Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` wrapper / `akili-reviewer` wrapper |

## Task Execution History

### PGC-T-1 — Count per-P/A "With W3/Bilateral results" by the P/As the results name

- **Status:** `[x]` PASS — Reviewer PASS; owner HITL P-10/P-11 recorded 2026-11-23
- **Date:** 2026-11-23
- **Attempts:** 1
- **Skills:** `nestjs-expert`, `tdd` (task list default, no deviation) · effort medium

#### Attempt 1

- **Files changed:** `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts`, `clarisa-projects.repository.spec.ts`, `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts`, `results-framework-reporting.service.spec.ts`, `dto/portfolio-bilateral-projects.dto.ts` (5 files, +211 / −10)
- **What changed:** new correlated sub-select `named_program_codes` (same W3 filter as `has_bilateral`; `results_by_inititiative` active role IN (1,2) UNION `share_result_request` active status IN (1,2,4); joined to `clarisa_initiatives.official_code`, non-blank). Bind order: `[approved, 'API', v, 4, 'Result', v, [1,2], [1,2,4], 'API', v, 4, year]`, comment updated. Service: `mapped`/`w1w2Contributors` from approved codes (`addProject(counts, false, hasW1w2)`), `withBilateralResults += 1` per distinct normalised named code in the seed. Totals, by Center, unmapped unchanged. DTO description only.
- **Implementer verification:** scoped Jest (service, controller, provenance, repository) green; repository spec 14/14 after last fix; `npx eslint` on 5 files `--quiet` clean.
- **Red runs (verbatim):**
  1. New service spec against the pre-change service (old rule reads `approvedProgramCodes`):
     ```
     - Expected  - 4
     + Received  + 4
       "SP01",  -     3,  +     1,
       "SP02",  -     0,  +     1,
       "SP05",  -     0,  +     1,
     ```
  2. Dedupe falsifier (Set → plain map), restored after:
     ```
         "SP01",
     -     3,
     +     5,
     ```
  - Status-filter falsifier not executed: the filter lives in SQL; covered by the repository spec's bound-values assertion (`[1,2,4]`) only. Data proof deferred to HITL P-10.
- **Evidence re-run (Leader inline, non-author):** `npx jest --maxWorkers=2 --findRelatedTests <repository.ts, service.ts, dto.ts> --silent --reporters=summary --forceExit` → `Test Suites: 78 passed, 78 total · Tests: 2550 passed, 2550 total`; `npx eslint <5 files> --quiet` → clean. **VERIFIED** (also covers the controller/provenance suites the Implementer had not re-run after its DTO fix).
- **Reviewer verdict:** `PASS` — meets PGC-R-4 (4.1–4.6), R-5/5.1, NFR-1, NFR-2; fixture not inert (old/new diverge on SP01, SP02, SP05; Reviewer recomputed totals {4,3,1}, CENTER-03 {1,1,0}, null bucket {3,2,1}, unmapped 1 by hand). Data-level proof of the declined/inactive and version/inactive-rbp filters rests on HITL P-10/P-11.
- **runtime events:** none
- **spawns:** implementer 29 calls, 138,486 tokens, ended partial (Not Done: HITL P-10/P-11, status-filter falsifier); reviewer not reported by host for calls (7 tool uses, 58,222 tokens), ended complete

#### Not Done / Assumptions (Implementer, verbatim summary)

- P-10 and P-11 are unverified. The SQL has not run against MySQL.
- Falsifier not run: the "remove the status filter" falsifier, because the filter is SQL.
- Jest prints a "worker failed to exit gracefully" warning from existing teardown.
- First DTO edit had an unescaped apostrophe; fixed by rewording.

Leader reading: no blocker on the code; the owed item is the owner-run HITL query (task DoD). Task held at `[~]`.

#### ADVISORY (Reviewer, not gating)

- READABILITY: the service-spec fixture comment gives wrong old-rule values ("old SP01 0 … SP09 1"). The old loop gives SP01 = 1, SP02 = 1, SP05 = 1, SP09 = 0 (the red-run diff agrees). The Implementer's report repeats the error ("SP01 0→3, SP09 1→1"). Assertions are correct.
- READABILITY: repository-spec comment "has_bilateral + named_program_codes W3 filters + the request_status_id filter" is misleading; `/r\.status_id/` does not match `srr.request_status_id` (the 4 hits are 2 in `has_bilateral`, 2 in `named`).
- RISK/PERF: the non-correlated UNION derived table sits inside a correlated sub-select; MySQL may build it once per project row. Check cost (timing/EXPLAIN) in the PRTest run.
- HITL SQL (Implementer draft) vs repository: filters match; named arm lacked the `official_code` non-blank filter; `@version_id` must be the version the service resolves (open reporting version, `app_module_id = 1`). The Leader rewrote the owner query to run the repository SQL itself (below), which removes the drift risk.

#### Decisions

- Owner HITL query (given in chat, PRTest, read-only) runs the repository's `getPortfolioProjectFacts` SQL verbatim with values substituted, then aggregates old vs new per P/A. This proves P-10 (the exact SQL runs on MySQL) rather than a re-written equivalent.

#### HITL results

Owner ran the three read-only queries on **PRTest**, 2026-11-23 (DBeaver screenshots in chat). Open reporting version resolved by `status = 1, is_active = 1, app_module_id = 1`.

- **P-10 — verified.** Q1 runs the repository SQL verbatim (values substituted) on MySQL without error. Per P/A, `mapped` / old / new `withBilateralResults`:

  | P/A | mapped | old | new |
  |---|---|---|---|
  | SP01 | 274 | 35 | 36 |
  | SP02 | 185 | 17 | 23 |
  | SP03 | 91 | 13 | 15 |
  | SP04 | 118 | 24 | 24 |
  | SP05 | 56 | 7 | 5 |
  | SP06 | 193 | 25 | 15 |
  | SP07 | 127 | 15 | 10 |
  | SP08 | 50 | 7 | 6 |
  | SP09 | 179 | 28 | 17 |
  | SP10 | 44 | 6 | 6 |
  | SP11 | 69 | 14 | 6 |
  | SP12 | 60 | 9 | 6 |
  | SP13 | 52 | 11 | 11 |
  | SGP-02 | 0 | 0 | 3 (outside the seed, not shown by the endpoint) |

  Run time not reported by the owner (Reviewer perf advisory stays open for the PRTest page check).
- **R-5 totals (Q2):** `totals_mapped = 991`, `totals_with_w3 = 133`, `unmapped_with_w3 = 0`. These come from the unchanged sub-selects, and `mapped` per P/A is the same column in old and new, so the HITL shows no move in totals or `mapped` (Disqualifier not triggered).
- **P-11 — verified, role-2 arm needed.** Q3: `w3_results_with_role2 = 9`, `role2_without_request = 2` → 2 W3 results name a P/A only through a role-2 link; without that arm they would be missed.

- **Final status:** `PASS` (Reviewer PASS + evidence re-run VERIFIED + HITL P-10/P-11 recorded), closed 2026-11-23.

- **Running totals vs budget:** tasks 1/3 · LOC ~211 (budget ~260 total) · review rounds 1/4. Within budget.
- **Requirements covered:** PGC-R-4, PGC-R-5, PGC-NFR-1, PGC-NFR-2 (code level).

### PGC-T-2 — Projects chart: distinct colours and rule copy

- **Status:** `[x]` PASS (browser look listed as open HITL item, per DoD)
- **Date:** 2026-11-23
- **Attempts:** 1
- **Skills:** `angular-developer`, `impeccable-bridge` (task list default, no deviation) · effort medium

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/components/projects-block/projects.charts.ts`, `projects.charts.spec.ts`, `projects-block.component.ts`, `projects-block.component.spec.ts`, `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` (diff 201 lines)
- **What changed:** exported `ProjectsSeriesColours { mapped, withBilateral, w1w2 }`; `buildProjectsOption(rows, tokens, labels, colours)` (required 4th argument) no longer reads `tokens.ramp` for series; W1/W2 decal kept. Exported `resolveProjectsSeriesColours()` in the component resolves `--pr-chart-1`, `--pr-color-green-600`, `--pr-color-orange-700` with the `getComputedStyle` + `var(token)` fallback of `typology-block.component.ts`. `projects.subtitle(year)` and `projects.multiProgramCaption` carry design §8 text verbatim. Template unchanged (bindings already in place). `chart-tokens.util.ts` and the portfolio-overview guide not touched.
- **Implementer verification:** charts spec green (28 tests in the two projects specs that loaded); `projects-block.component.spec.ts` and `tsc` could not run: the worktree lacked the gitignored `onecgiar-pr-client/src/environments/` (Jest/tsc `Cannot find module …/environments/environment`). Copy into the worktree was denied by the permission classifier; the owner copied the folder himself (`! cp -r …`), 2026-11-23. eslint (eslintrc mode, `ESLINT_USE_FLAT_CONFIG=false`, the worktree has only `.eslintrc.json`) clean.
- **Red run (verbatim, falsifier: ramp colours put back, then restored):**
  ```
  FAIL .../projects-block/projects.charts.spec.ts
    ● projects.charts › paints the three series with the colours passed in, in order, and names them from copy
      expect(received).toEqual(expected) // deep equality
      - Expected  - 3
      + Received  + 3
        Array [
      -   "m-col",  "w-col",  "x-col"  →  +   "c1",  "c3",  "c2",
    ● projects.charts › uses no tokens.ramp value for any series colour (PGC-R-3)
      expect(received).not.toContain(expected)
      Expected value: not "c1"
      Received array:     ["c1", "c2", "c3", "c4"]
  ```
  Second falsifier (no colours argument → `tsc` red) not run: the parameter is required by construction.
- **Evidence re-run (Leader inline, non-author, after the environments folder was present):** `npx tsc -p tsconfig.app.json --noEmit` → exit 0; `npx jest --maxWorkers=2 --findRelatedTests <projects.charts.ts, projects-block.component.ts, portfolio-overview.copy.ts> --silent --reporters=summary --no-coverage` → `Test Suites: 39 passed, 39 total · Tests: 1299 passed, 1299 total`; eslint on 5 files clean. **VERIFIED**.
- **Reviewer verdict:** `PASS` — meets PGC-R-3 (3.1), R-6 (6.1), NFR-3, NFR-4; tokens exist in `colors.scss` (lines 110, 145, 299) with the DD-6 values; legend and bars share one colour input; specs call the real `buildProjectsOption` / `chartOption()`; copy matches design §8 character for character.
- **runtime events:** none (the environments gap is a worktree setup gap, not a runtime event; resolved by the owner)
- **spawns:** implementer 17 tool uses, 125,308 tokens, ended partial (Not Done: environments folder); reviewer not reported by host for calls, ended complete

#### Not Done / Assumptions (Implementer, summary)

- Blocker (resolved by owner): missing `src/environments/` in the worktree → component spec and `tsc` not run by the Implementer; run by the Leader after the owner copied the folder.
- Open HITL: browser look of both tabs (light/dark) and contrast; DD-6 ratios stand (purple 9.02:1, green 4.26:1, orange 5.18:1 on white).
- The subtitle sits in the block header, so the "Per Program/Accelerator" sentence also shows on the By Center tab (spec string followed verbatim).

#### ADVISORY (Reviewer, not gating)

- RELIABILITY: jsdom only exercises the `var(--token)` fallback; ECharts on canvas cannot paint `var()`. The browser look must confirm the bars really render green and orange.
- READABILITY: `resolveProjectsSeriesColours` is exported for testing; Typology keeps its resolver private. Optional.
- RISK: subtitle text on the By Center tab — raise at the HITL check in case product wants a Center-tab variant.
- Pending consumer: portfolio-overview `CLAUDE.md` note → owned by PGC-T-3.

#### Open HITL

- Browser look of `/portfolio-overview`, both tabs: three colours visible on the bars (not black/grey from an unresolved `var()`), legend matches, subtitle wording on the By Center tab acceptable.

- **Running totals vs budget:** tasks 2/3 · LOC ~412 (211 + 201) vs ~260 budget · review rounds 2/4.
- **Requirements covered:** PGC-R-3, PGC-R-6, PGC-NFR-3, PGC-NFR-4.

## Budget tripwire — after PGC-T-2 (2026-11-23)

- **Delta:** LOC ~412 actual vs ~260 budget (design §11) after 2 of 3 tasks; review rounds 2/4; tasks 2/3.
- **Cause:** test fixtures. The PGC-T-1 service fixture (5 projects built so old and new rules diverge, plus old-loop parity literals) is ~160 LOC alone; production code is near estimate. PGC-T-3 adds an estimated ~30-40 LOC (final ~450).
- **Decision:** owner said continue with PGC-T-3 ("dale, sigue con T-3"), 2026-11-23. Not auto-approved.

### PGC-T-3 — Typology key single-bar line, Center footnote, guide

- **Status:** `[x]` PASS
- **Date:** 2026-11-23
- **Attempts:** 1
- **Skills:** `angular-developer` (task list default) · effort low

#### Attempt 1

- **Files changed:** `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` (`barKey.singleBar`, `centerNote` only), `.../portfolio-overview/components/typology-block/typology-block.component.html` (+1 `<li data-testid="typology-bar-key-single">` before the counts hint, muted, no swatch), `typology-block.component.spec.ts`, `.../portfolio-overview/CLAUDE.md` (per-P/A rule, projects colours, key line; `Verified:` 2026-11-23)
- **Implementer verification:** `typology-block.component.spec.ts` 29/29; `--findRelatedTests` 38 suites / 1288 tests; eslint (eslintrc mode) clean.
- **Red run (verbatim):** `● … By Center tab (TBC-R-10, DD-9) › PGC-R-1 the single-bar key line renders from the copy on both tabs` · `Expected: "A row with only one bar has results in only one of the two groups."` · `Received: undefined` · `Tests: 1 failed, 28 passed, 29 total`
- **Falsifiers:** (1) `<li>` removed → same assertion red; (2) `@if` → `true` → `● … shows both tabs, P/A active by default, with the P/A chart` red with `Received: <p … data-testid="typology-center-note">Each result is counted once, …</p>`. Both restored.
- **Evidence re-run (Leader inline, non-author):** `npx jest --maxWorkers=2 --findRelatedTests <portfolio-overview.copy.ts, typology-block.component.ts, typology-block.component.spec.ts> --silent --reporters=summary --no-coverage` → `Test Suites: 38 passed, 38 total · Tests: 1288 passed, 1288 total`; eslint clean. **VERIFIED**.
- **Review intensity:** task claimed `skip-eligible`; **not earned** — override (b) applies (new DOM hook `data-testid="typology-bar-key-single"`) and `Consumers` is not `none`. Conformance Reviewer spawned.
- **Reviewer verdict:** `PASS` — meets PGC-R-1 (1.1) and PGC-R-2 (2.1); specs assert rendered DOM against literal strings (disqualifier not hit); guide claims match the shipped code (repository role/status constants, service Set dedupe, `SERIES_TOKENS` + decal). No issues, no advisories.
- **runtime events:** none
- **spawns:** implementer 19 tool uses, 93,246 tokens, ended complete; reviewer not reported by host, ended complete
- **Running totals vs budget:** tasks 3/3 · LOC ~450 vs ~260 (tripwire recorded and owner-approved above) · review rounds 3/4.
- **Requirements covered:** PGC-R-1, PGC-R-2.

## Summary

All three tasks PASS (2026-11-23), one attempt each, three Reviewer PASS verdicts, every evidence re-run VERIFIED. Requirements PGC-R-1..R-6 and PGC-NFR-1..4 covered.

Open items:
- HITL browser look on PRTest after deploy: `/portfolio-overview` both tabs, light/dark — bars really paint purple/green/orange (no unresolved `var()`), legend matches, subtitle wording acceptable on the By Center tab, Typology key line and Center footnote.
- PRTest timing of the facts query (Reviewer PGC-T-1 perf advisory; Q1 run time not reported).
- PGC-T-1 advisories: wrong old-rule numbers in the service-spec fixture comment; misleading repository-spec comment (readability only).
- Rollout (tasks.md §6): qa-dev → performance-refactor (PRTest) → staging → master; compare 2 P/As against the HITL table; reply on INC-168764; `codegraph sync` after merge.
