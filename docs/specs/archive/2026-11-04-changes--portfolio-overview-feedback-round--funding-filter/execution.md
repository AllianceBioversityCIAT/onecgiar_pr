# Execution Log — Portfolio Overview: Funding source filter (PFF)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/funding-filter` |
| Approval Mode | `gated` |
| Branch | `qa-development-2026-ss` (no commit without explicit user go-ahead) |
| Leader | Claude Code session (Opus) |
| Implementer / Reviewer | `akili-implementer` / `akili-reviewer` wrappers |
| Started | 2026-11-04 |
| Budget | 3 tasks · ~260 LOC · 1 review round per task |

## Task Execution History

### PFF-T-1 — Pure filter module + shared classifier

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-11-04 |
| Attempts | 1 |
| Skills | `angular-developer`, `tdd` (per Skill Map) |
| Effort | medium |
| Requirements | PFF-R-1, R-2, R-3, R-4 (pure rule), R-5 (linkable rule) |

**Attempt 1 — files changed** (all under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/`; 5 files, +136 / −23):
- `services/portfolio-filters.ts` — `funding` last in `FILTER_DIMENSIONS`; `FUNDING_OPTIONS`, `FundingSource`, `W3_SOURCE_NAME`, `fundingOf` (trimmed exact match); matcher checks funding before the index branch; static options; `sanitize`/`parseQueryParams`; `SECTION_SOURCE` + value-dependent `notAffectedBy`; `SECTION_HONOURS.toc/projects` gain `funding`; `resultsCenterLinkable` allows program/status/funding ≤ 1.
- `services/portfolio-overview.service.ts` — the 4 inline W3 checks (5 call sites) call `fundingOf`; comment reworded.
- `internationalization/portfolio-overview.copy.ts` — `filters.dimensions.funding`, `filters.fundingOptions`.
- `services/portfolio-filters.spec.ts`, `services/portfolio-overview.service.spec.ts` — new cases; two existing assertions updated because the spec changes those values (`FILTER_DIMENSIONS` tail, `SECTION_HONOURS`).

**Implementer verification:**
- `npx jest --maxWorkers=2 --no-coverage --testPathPattern="portfolio-filters|portfolio-overview.service"` → 2 suites, 100/100 passed.
- grep `W3/Bilaterals` in `portfolio-overview.service.ts` → 0.
- `npx eslint <5 files> --quiet` (with `ESLINT_USE_FLAT_CONFIG=false`) → exit 0.
- `tsc --noEmit -p tsconfig.app.json` → no portfolio-overview errors.

**Reviewer verdict:** `STATUS: PASS` — matches PFF-R-1..R-5, §6.1–6.3, §6.5, DD-1/2/3; every listed case asserted on row ids / totals / exact arrays (service: 408 unfiltered → 288/288/0 with mixed trimmed/untrimmed W3 rows); scope limited to T-1 files.

**ADVISORY (4R, non-gating):**
- RELIABILITY: two further copies of the W3 string test outside this task's scope — `components/typology-block/typology.aggregate.ts:53/143`, `components/results-detail/results-detail.rows.ts:15/110`. Same trim today, but DD-1 drift concern applies; candidate for a later quick change or a mention in the T-3 guide sync.
- READABILITY: `portfolio-filters.ts` now imports `PORTFOLIO_OVERVIEW_COPY` (its first copy dependency); keep the copy file free of imports back from `portfolio-filters.ts`.
- PROCESS: `npm run test:local` printed no Jest output; plain `npx jest --maxWorkers=2` used instead (valid under machine rules). Same fallback applies to T-2's Verify line.

**Decisions:** exported `W3_SOURCE_NAME` / `FundingSource` beyond the named scope (supporting symbols for `fundingOf`); updated two existing assertions the spec itself changes.
**Issues:** `test:local` silent; plain `npx eslint` needs `ESLINT_USE_FLAT_CONFIG=false` (repo has only `.eslintrc.json`).
**Final verification:** green (100/100, lint clean, grep 0).

### PFF-T-2 — Blocks, bar labels, Results Center link

| Field | Value |
|---|---|
| Final status | **PASS** |
| Date | 2026-11-04 |
| Attempts | 1 |
| Skills | `angular-developer`, `spartan` (read-only; no primitive used) |
| Effort | medium |
| Requirements | PFF-R-1 (chip, Clear all), R-3 (URL mirror), R-4 (figures unchanged, BUT/AND clauses, notes), R-5 (link params + pre-set) |
| Gate | user said "SIGUE HASTA QUE TERMINES" after T-1 → continue gates auto-pass until HALT/pivot/tripwire/HITL |

**Attempt 1 — files changed** (all under `onecgiar-pr-client/src/app/`):
- `internationalization/portfolio-centers-block.copy.ts` (+1/−1) — `dimensions.funding`.
- `…/components/centers-block/centers-block.aggregate.ts` (+2/−2) — `applyGlobal` blanks `funding` like `center`.
- `…/components/filter-bar/filter-bar.component.ts` (+1) — label map `funding`.
- `…/portfolio-overview.component.ts` (+7/−3) — `viewActiveInResultsCenter` passes single funding value; `navigateToResultsCenter` `extra.funding` → `queryParams.funding` + `selectedFundingSource` (id 1 `W1/W2` / id 2 `W3/Bilaterals`).
- Specs: `centers-block.aggregate.spec.ts` (+11), `centers-block.component.spec.ts` (+18), `filter-bar.component.spec.ts` (+31/−7), `portfolio-overview.component.spec.ts` (+58/−1). Existing S-14.1 URL-mirror expectation gained `funding: null`; sheet test expects 6 selects.

**Implementer verification:**
- Free RAM ~6.4 GB.
- `npx jest --maxWorkers=2 --no-coverage --testPathPattern="centers-block|filter-bar|portfolio-overview.component"` → 15/15 suites, 380/380 (first run: 3 failures in its own new tests, fixed before report).
- `npx jest --findRelatedTests <7 source files incl. T-1's> --maxWorkers=2 --no-coverage` → 32/32 suites, 1115/1115 (a stack trace printed from `type-one-report.component.spec.ts`; suite passed, not investigated).
- `ESLINT_USE_FLAT_CONFIG=false npx eslint <7 source + 4 specs> --quiet` → clean.

**Reviewer verdict:** `STATUS: PASS` — scope limited to the 4 named source files + copy + 4 specs; Centers `kpis()` asserted equal to unfiltered for both funding values; link `{ phase: 36, status: 6, funding: 'bilateral' }`, absent with 2 values; `selectedFundingSource` ids match `results-list.component.ts:394-398`; URL mirror writes then nulls `funding` with `replaceUrl`; ToC `notAffected` contains `funding` with bilateral, Projects does not.

**ADVISORY (4R, non-gating):**
- RELIABILITY: `selectedFundingSource` assertions in the w1w2 link test are wrapped in `if (filterSE)`; `ResultsListFilterService` is `providedIn: 'root'` so they run today, but `expect(filterSE).toBeTruthy()` would make it permanent.
- READABILITY / coverage: PFF-R-1 "N of M results" and sheet trigger count after a funding selection not asserted (counts are generic over the selection; low risk; not in the task's Tests list).
- RISK: `[...selection.funding][0] as 'w1w2' | 'bilateral' | undefined` is a cast, safe because `sanitize` drops unknown values.

**Final verification:** green.

### PFF-T-3 — Guide sync + visual check (HITL)

**Attempt 1** (effort low) — `portfolio-overview/CLAUDE.md` 128 → 112 lines; funding in bar list, URL params, link rule, `fundingOf`, `SECTION_SOURCE` rule; `Verified:` re-dated 2026-11-04; "Where it is used" section removed during condensing. `family.md` row 2 → `executed (uncommitted, 2026-11-04; T-3 visual check pending HITL)`. Evidence: grep 5-dimension list → 0; ≤ 120 lines. Not done (by brief): no testing section exists, so the `test:local`/eslint note was not added; pre-existing inconsistency noted (sub-switch line vs ToC KPI `hasFigures()` section), left as-is.

**Reviewer verdict attempt 1:** `STATUS: FAIL` (verbatim issue):
1. **Discovered Issue:** Removing the "Where it is used" section dropped the sentence "Bilateral and ToC KPI rows open `entity-details/:code/results`." Only the nav-sidebar reference was moved to the Route line. The guide no longer mentions `entity-details` anywhere, but the code still does this: `portfolio-overview.component.ts:323` calls `router.navigate(['/result-framework-reporting', 'entity-details', code, 'results'])`.
   **Violated Rule:** Brief check "condensing removed no rule"; `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs" (guide must stay true to the code; PFF-R-6 "Guide kept true").
   **Remediation Suggestion:** Add one clause to the Route line (current L17), e.g. "Bilateral and ToC KPI rows open `entity-details/:code/results`." Keeps the file under 120 lines.
All funding claims verified against code (portfolio-filters.ts L16, L56-62, L312, L331-335, L347, L354; centers-block.aggregate.ts:100; portfolio-overview.component.ts:271-272, 328, 373).

**Attempt 2** (effort medium) — only added "; Bilateral and ToC KPI rows open `entity-details/:code/results`" to the Route/"Used by" bullet (L18). Evidence: `grep -n entity-details` → L18; 112 lines; 5-dimension grep → 0.

**Reviewer verdict attempt 2:** `STATUS: PASS` — issue 1 resolved (matches `portfolio-overview.component.ts:323`); no other content change vs attempt 1; PFF-R-6 met.

**Budget note:** 2 review rounds on T-3 vs budget of 1 per task (total spec: 4 rounds vs 3). Cause: condensing to ≤ 120 lines dropped one navigation fact. Reported to the user at the HITL pause.

**Status:** `[~]` — docs part PASS; the manual visual check (desktop ≥ 1280 px and < 768 px sheet, `/portfolio-overview?funding=bilateral`, switch to W1/W2, reload) is a HITL step pending user confirmation. Task closes `[x]` only after the user confirms.

**HITL visual check:** user confirmed 2026-11-04 ("perfecto se ve bien") — desktop + mobile sheet, chip, totals, notes, reload. **Final status: PASS.**

## Summary

All 3 tasks `[x]` on 2026-11-04. 4 review rounds (budget 3; extra round = T-3 guide rework). Client only, uncommitted on `qa-development-2026-ss`. Open advisories: migrate `typology.aggregate.ts` / `results-detail.rows.ts` W3 tests to `fundingOf`; assert "N of M" + sheet trigger count after a funding selection; drop `if (filterSE)` guard in the w1w2 link test.
