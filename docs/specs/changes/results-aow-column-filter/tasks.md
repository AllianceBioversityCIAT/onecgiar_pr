# Tasks — Area of Work on the Results tab (`changes/results-aow-column-filter`)

**Answer first:** five tasks. `T-1` server: shared scope query + `results-scope` endpoint; `T-2` client: fetch, join, Area of Work column; `T-3` client: Section filter live + `?section=`; `T-4` Overview → Results scope propagation + breakdown *View results*; `T-5` live reconciliation on SP01/SP12 + guides. Strictly serial: T-2 needs T-1's response shape, T-4 needs the `section` query-param entry T-3 introduces. Two PRs (server, client) — see §7.

## 0. Document Control & execution limits

| Field | Value |
|---|---|
| Linked spec | `requirements.md` · `design.md` (same folder) |
| Approval Mode | `pre-approved` (inherited) — Phase 3 gate: *auto-approved (pre-approved mode)* |
| Judgment-day | one pass, fixes applied, no re-judge — see §9 |
| Budget tripwire | 5 tasks · ≈ 380 src + ≈ 550 test LOC (trip at > 1 300 total) · ≤ 1 Reviewer round per task |
| Verification default | server `npx jest <path> --silent --forceExit` from `onecgiar-pr-server/`; client `npx jest <path> --silent` from `onecgiar-pr-client/`; lint `npx eslint "src/api/results-framework-reporting/**/*.ts" --quiet` (server) / `npx ng lint --quiet` (client); **never** whole suites |
| Progress reporting | plain-language line at every task boundary; **offer the cut after T-3** (column + filter usable; T-4 is the Overview link, T-5 live check + docs) |
| Skills | `nestjs-expert` + `api-design-principles` + `tdd` (T-1); `angular-developer` + `tdd` (T-2, T-3); `angular-developer` (T-4); `orca-cli` (T-5) |
| Concurrency | one session per checkout (`KZ-MRF-3`); explicit-pathspec diffs and commits; `dashboard-lab.component.ts` and `programme-results.component.ts` are hot files |
| Branch / commit | `qa-development-2026`; `✨ feat(programme-results) [SPEC:changes/results-aow-column-filter]: …` |

## 1. Scope of this task list
- **Module / feature:** `result-framework-reporting` / Results tab Area of Work column, Section filter, Overview scope deep link.
- **Status:** `in-progress` (T-1 done).

## 2. Pre-flight checklist
- ✅ `requirements.md` approved (auto-approved, pre-approved mode).
- ✅ `design.md` approved (auto-approved, pre-approved mode).
- ✅ Open questions resolved (proposal OQ-1..3 → RAC-R-1; approach deviation recorded).
- ✅ No in-flight spec editing `programme-results/*` or `program-overview/*` (checked 2026-09-04: none).
- ✅ No migration, no CLARISA dependency beyond the existing units read.

## 3. Task list

### `RAC-T-1` — Server: shared scope query + `GET results-scope` — [x]
- **Type:** `server` + `tests`
- **Description:** In `results-framework-reporting.service.ts` extract the `result_scope` CTE from `getScopeBuckets` into `private queryResultScopeRows(initiativeId, tocContext, { sourceFilter?: string[] })` returning per-result rows `{ result_id, status_id, aow_acronym, has_intermediate, has_eoi, aow_codes }` (`GROUP_CONCAT(DISTINCT UPPER(wp.acronym) ORDER BY UPPER(wp.acronym))`); make `getScopeBuckets` aggregate those rows in TypeScript with **unchanged output** (OSF-T-3 fixtures re-shaped, `// RAC-DD-2`). Add `getResultsScope(programId, versionId)`: resolve initiative + `resolveByVersionId`, run the query **without** the source filter, left-join against the version's `results_by_inititiative` population so unlinked results appear as `UNTAGGED`, map through pure `toResultScopeDto` (`application/queries/results-scope/results-scope.mapper.ts` + `.dto.ts`). Controller `@Get('results-scope')` with `@ApiQuery` docs, 400 on non-numeric `versionId` (reuse `resolveTocContextForRequest`), 404 unknown program. Design §4.1, §5, RAC-DD-1, DD-2.
- **Implements:** `RAC-R-1`, `R-1.1`, `R-1.2`, `RAC-AC-1`; scenario *One bucket per result* (all clauses incl. BUT not under AOW02, AND IT MUST ignore other initiatives).
- **Files:** `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.{controller,service}.ts` + specs; new `application/queries/results-scope/{results-scope.dto.ts, results-scope.mapper.ts, results-scope.mapper.spec.ts}`.
- **Depends on:** — · **Blocks:** T-2 · **Estimate:** M
- **Verification:** `npx jest src/api/results-framework-reporting --silent --forceExit` → green incl. new `it`s: mapper (result with links in AOW02+AOW01 → `key AOW01`, `codes ['AOW01','AOW02']`; INTERMEDIATE; EOI_2030; unlinked → UNTAGGED with `codes []`); `getScopeBuckets` totals **byte-identical** on the re-shaped OSF-T-3 fixtures; service passes `W1_W2_RESULT_SOURCE_FILTER` for buckets and **no** source filter for `results-scope` (assert the SQL params); controller forwards params; 400 on `versionId=abc`. `npx eslint "src/api/results-framework-reporting/**/*.ts" --quiet` clean.
  - *Disqualifier:* a mapper test that feeds already-bucketed rows proves nothing — fixtures must be raw rows (`aow_acronym`, `has_*`, `aow_codes`). An OSF-T-3 assertion changed in **value** (not shape) is a FAIL — only the fixture shape may move. "query was called" is not evidence for the source-filter difference — assert the params array.
  - *Input that fails:* a fixture row whose `aow_acronym` is not the first of its sorted `aow_codes` (`'AOW02'` vs `'AOW01,AOW02'`) must make the mapper test fail — the mapper derives `key` from `aow_acronym` and the test asserts `key === codes[0]`, so it cannot pass on an inconsistent fixture; a result present in the population but absent from the CTE rows must yield `UNTAGGED`.
- **Done:** endpoint documented in Swagger; `getScopeBuckets` unchanged for callers; `@akili-spec changes/results-aow-column-filter` on new blocks.

### `RAC-T-2` — Client: fetch + join buckets, Area of Work column
- **Type:** `client` + `tests`
- **Description:** `results-api.service.ts` `GET_ResultsScope(programId, versionId)`. `ProgrammeResultsService`: `scope` map signal, `scopeLoading`, `scopeError`, `loadScope(programId, versionId)` token-guarded; refetch when the selected phase's version changes; `toProgrammeResultRow` joins by `id`: `section` = bucket key, `aowCodes`, `sectionState`; rows of another `versionId` keep `section ''` (A-1). `PGR_COLUMNS` gains `aow` (*Area of Work*, after Category, default on, 132 px, `sortField: 'sectionSort'`); `sectionSort` rank string; cell renders code chip / fixed label, `+N` with all codes in `title`, skeleton while loading, `—` + `title` on error; `cellText('aow')` for CSV; search haystack adds key + label. Design §6.2, RAC-DD-3 (labels), DD-5.
- **Implements:** `RAC-R-2`, `R-2.1`, `R-2.2`, `R-6`, `RAC-AC-2`, `AC-6`, `AC-8`; scenario *Column and filter* THEN clause (cell texts).
- **Files:** `shared/services/api/results-api.service.ts` (+ spec), `pages/programme-results/services/programme-results.service.ts` (+ spec), `pages/programme-results/programme-results.component.{ts,html,spec.ts}`.
- **Depends on:** T-1 (response shape) · **Blocks:** T-3 · **Estimate:** M
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/programme-results src/app/shared/services/api/results-api.service.spec.ts --silent` → green incl.: URL of `GET_ResultsScope`; join by id with the R-1 fixture → cells exactly `AOW01 +1` (title `AOW01, AOW02`), `Intermediate outcomes`, `Not tagged`; a bucket for another version ignored (`section ''`); loading → skeleton element present and no `—`; error → `—` and `title` contains `could not be loaded`; sort by Area of Work orders `AOW01, AOW02, INTERMEDIATE, EOI_2030, UNTAGGED`; CSV header contains `Area of Work` and the row cell `AOW01 +1`; search `aow02` matches the `#9006` row via `codes`.
  - *Disqualifier:* asserting the column **exists** in `PGR_COLUMNS` is presence, not behaviour — assert rendered cell text. A join test where every row has a bucket cannot fail on the missing-bucket branch — include an unmatched row.
  - *Input that fails:* a bucket keyed by a string id (`"9006"`) while rows carry numbers must still join (normalise with `Number`); a row with `versionId` `35` against a scope loaded for `36` must render `—` with a version-mismatch `title` (not a skeleton, not `Not tagged`) — assert it.
- **Done:** column visible by default on SP01 (T-5 confirms), CSV carries it, lint clean.

### `RAC-T-3` — Client: Section filter live + `?section=`
- **Type:** `client` + `tests`
- **Description:** Replace the Results tab's dormant constants with the bucket-key vocabulary (`RAC-DD-3`); `sectionOptions` = *Areas of work* (codes present in rows, `AOW01 (12)`, name appended when units are loaded — R-7) + *Program-level* (`INTERMEDIATE`, `EOI_2030`, `UNTAGGED` with counts, labels *Intermediate outcomes / 2030 outcomes / Not tagged*); remove `aria-disabled`, `opacity-60`, `cursor-not-allowed`, the `title` and the `#comingSoon` outlet from the Section control; `PROGRAMME_RESULTS_SECTION_QUERY_PARAM = 'section'` + dimension + map entry; URL bridge hydrates `?section=A,B` into `selectedSections` (no rewrite) and mirrors selections back (comma list, merge + replaceUrl); chips `Section: <label>`; `activeFilterCount` counts sections; Clear filters clears them (already); `matchesProgrammeResultFilters` exact key match. Design §6.1, §6.2.
- **Implements:** `RAC-R-3`, `R-3.1`, `R-4.1`, `R-7`, `RAC-AC-3`, `AC-5`; scenario *Column and filter* (WHEN select → THEN row/chip/badge/URL; BUT not `#9006` under AOW02; AND IT MUST restore on Clear and drop the param).
- **Files:** `pages/programme-results/programme-results.component.{ts,html,spec.ts}`, `services/programme-results-filter.service.ts` (+ spec), `services/programme-results-query-params.ts`.
- **Depends on:** T-2 · **Blocks:** T-5 · **Estimate:** M
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/programme-results --silent` → green incl.: options text `AOW01 (1)`, `Intermediate outcomes (1)`, `2030 outcomes (0)`, `Not tagged (1)`; select `AOW01` → 1 row, chip `Section: AOW01`, badge `1`, `router.navigate` called with `{ section: 'AOW01' }` + merge + replaceUrl; select `AOW02` → 0 rows for the fixture (`#9006` is AOW01); Clear filters → 3 rows, `section: null` mirrored; hydrate `?section=AOW01,INTERMEDIATE` → two chips, rows filtered, **no** navigate call (anti-loop test (f) pattern); control has no `aria-disabled` and no `Coming soon` text; the two old constants no longer exist in the file (`grep -c 'intermediate-outcomes' == 0`).
  - *Disqualifier:* `toContain('Section')` on the page text is not evidence — assert chip text and the exact navigate params. A hydrate test that does not spy on `navigate` cannot prove the anti-loop clause.
  - *Input that fails:* `?section=aow01` (lower-case) must still match (case-insensitive predicate, chip shows the raw value — existing (g) rule); `?section=NOPE` shows its chip and the filtered-empty state without throwing (existing (b) rule).
- **Done:** filter usable end to end; `npx ng lint --quiet` clean; `ng build --configuration development` clean.

### `RAC-T-4` — Overview → Results: scope on every link, *View results* on breakdown rows
- **Type:** `client` + `tests`
- **Description:** `OverviewLink.section?: string` (`program-overview.component.ts:52`). Host `onOverviewLink(link)`: when `overviewScope()` is set and `link.section` is undefined, add `section: overviewScope()` before mapping to params (RAC-DD-4). Scope-breakdown rows (`program-overview.component.html` ~L1095-1125): add a small *View results* icon button per row (`aria-label="View results for <name>"`) → `emitLink({ section: row.key })`; the row's existing `selectScope` click is unchanged; hero rows and ToC-map clicks unchanged.
- **Implements:** `RAC-R-4`, `RAC-AC-4`; scenario *Overview links carry the scope* (all clauses incl. BUT no scope → no section; AND IT MUST leave hero/ToC-map targets unchanged).
- **Files:** `pages/dashboard-lab/dashboard-lab.component.ts` (+ a host spec `it` in `dashboard-lab.scope.spec.ts` or a new small wiring spec), `pages/dashboard-lab/components/program-overview/program-overview.component.{ts,html,spec.ts}`.
- **Depends on:** T-3 (needs `PROGRAMME_RESULTS_SECTION_QUERY_PARAM` / the `section` entry of the param map it introduces — inline judgment JI-3) · **Blocks:** T-5 · **Estimate:** S
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.scope.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/components/program-overview --silent` → green incl.: host with `overviewScope = 'AOW01'` and link `{ status: 'Editing' }` → `navigate([..., 'results'], { queryParams: { status: 'Editing', section: 'AOW01', phase: <effective> } })`; with `overviewScope = null` → no `section` key; a link that already carries `section: 'EOI_2030'` is not overwritten; breakdown row button emits `openResults` with `{ section: 'EOI_2030' }` and does **not** call `selectScope`; hero row click still emits `openAow`.
  - *Disqualifier:* asserting `navigate` was called is not evidence — assert the exact `queryParams` object (deep equality, no extra keys). A breakdown test that clicks the row instead of the new button tests the old behaviour.
  - *Input that fails:* `overviewScope = 'UNTAGGED'` must propagate as `section: 'UNTAGGED'` (fixed keys are scopes too).
- **Done:** all listed `it`s green; lint clean.

### `RAC-T-5` — Live reconciliation on SP01 / SP12, latency, docs
- **Type:** `docs` + manual verification
- **Description:** In the authenticated Orca browser (`orca-cli`; capture and restore the tab): on SP01 Overview read the scope-breakdown totals per key; open Results with `?section=<key>&origin=W1/W2` for each key (A-3) and read `N results`; for any key where the two differ, pull the `results-scope` payload and list the result ids present in the bucket but absent from the Results rows — contributor-only results (A-5) are reported as a delta with ids, anything else is a FAIL; repeat on SP12 (the user's screenshot program); read three `results-scope` request durations from the network (or `performance.getEntriesByName`); confirm the Area of Work column shows codes/labels and that `AOW02` in the search box finds rows. Update `pages/programme-results/CLAUDE.md` (remove the Section-filter "Coming soon" row and the `section: ''` gotcha; document the join and the vocabulary; re-stamp `Verified:`) and `dashboard-lab/CLAUDE.md` if it mentions the deep-link deferral. Record the table in `execution.md`.
- **Implements:** `RAC-R-5`, `RAC-AC-7`; defect class *fixture-shaped blindness*; confirms A-1..A-3.
- **Files:** the two folder guides, `execution.md`.
- **Depends on:** T-3, T-4 · **Blocks:** — · **Estimate:** S
- **Verification:** pasted `orca eval` output: for every key on SP01 and SP12, `Overview total == Results count` (under W1/W2 when the program has bilateral rows — state which); three request durations with median < 300 ms; column cells visible with real codes; search hit. Tab restored.
  - *Disqualifier:* a single key matching is not reconciliation — every key of the breakdown must be compared, including `UNTAGGED`. If any pair differs, report **INCONCLUSIVE** with both numbers and the raw `results-scope` payload — do not mark passed; a difference explained by W3 rows must be shown to vanish under the W1/W2 filter, not asserted. Durations from one run are not a median.
  - *Input that fails:* a result with two AoW links must appear under exactly one `?section=` and both codes in its cell `title`; if the Overview counts it under a different key than the Results tab shows, the shared-query claim (RAC-DD-2) is false → FAIL.
- **Done:** guides updated; `execution.md` carries the reconciliation table with PASS / INCONCLUSIVE per key.

## 4. Dependency graph

```
RAC-T-1 (server endpoint + shared query)
   └── RAC-T-2 (client join + column)
         └── RAC-T-3 (Section filter + ?section=)
               └── RAC-T-4 (Overview scope propagation — needs T-3's `section` param entry)
                     └── RAC-T-5 (live reconciliation + docs)
```

Strictly serial (JI-3: T-4 imports the query-param entry T-3 adds). Cut point after T-3 (column + filter usable).

## 5. Scenario-clause coverage

| Requirement / scenario clause | Owner |
|---|---|
| RAC-R-1 THEN three buckets · AND Overview counts under AOW01 · BUT not AOW02 · AND IT MUST ignore other initiatives; R-1.1 unlinked → UNTAGGED; R-1.2 read-only, siblings untouched | T-1 |
| RAC-R-2 cells + `+N` + title · R-2.1 skeleton / `—` + title · R-2.2 sort order · R-6 search | T-2 |
| RAC-R-3 options with counts · select → row/chip/badge/URL · BUT not #9006 under AOW02 · AND IT MUST restore on Clear · R-3.1 vocabulary · R-7 names | T-3 |
| RAC-R-4.1 hydrate without rewrite | T-3 |
| RAC-R-4 links carry scope · breakdown *View results* · BUT no scope → no section · AND IT MUST keep hero/ToC-map targets | T-4 |
| RAC-R-5 reconciliation incl. AND IT MUST hold for the three fixed keys | T-5 |
| RAC-AC-1..8 | AC-1 T-1 · AC-2/6/8 T-2 · AC-3/5 T-3 · AC-4 T-4 · AC-7 T-5 |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RAC-TEST-1` | unit (server) | RAC-R-1, R-1.1, AC-1; `getScopeBuckets` unchanged | `…/results-scope/results-scope.mapper.spec.ts`, `results-framework-reporting.service.spec.ts` |
| `RAC-TEST-2` | unit + DOM (client) | RAC-R-2.x, R-3.x, R-4.1, R-6, R-7, AC-2/3/5/6/8 | `programme-results.component.spec.ts`, `programme-results.service.spec.ts`, filter service spec, `results-api.service.spec.ts` |
| `RAC-TEST-3` | unit (client) | RAC-R-4, AC-4 | `dashboard-lab.scope.spec.ts` (or wiring spec), `program-overview` specs |
| `RAC-TEST-4` | manual live | RAC-R-5, AC-7, A-1..A-3 | Orca browser, `execution.md` |

Client coverage stays above 50/60/60/60; server above 5/20/35/40.

## 7. Rollout & verification
- ☐ **PR strategy:** ≈ 380 source LOC across two packages → **two PRs against `staging`**: PR 1 server (`T-1`, additive endpoint, reviewable alone: review `queryResultScopeRows` first, then the OSF-T-3 fixture re-shape), PR 2 client (`T-2..T-5`, depends on PR 1 deployed to the test env; review the join in `programme-results.service.ts` first, then `onOverviewLink`). Bodies per `cognitive-doc-design`: what to review first, out of scope (indicator line, Results Center), link to the sibling PR.
- ☐ CI green (server + client lint/tests, build, SonarCloud).
- ☐ QA on test env: repeat T-5 on one program with bilateral rows (SP01) and one without.

## 8. Cleanup & follow-ups
- ☐ `/akili-archive`: record supersession of OSF-AC-8 / OSF-R-7 deferral and the P2-3398 Coming-soon rows.
- ☐ Follow-ups: indicator line (P2-3399 second half); Results Center column (needs per-initiative scope).

## 9. Judgment-day record
One pass, 2026-09-04. Both blind-judge spawns and their retries failed on the harness (Orca pane timeout, same as the previous two specs), so the review ran **inline by the author** (recorded deviation). Findings applied: **JI-1 (SEVERE-class)** — `RAC-R-5` compared populations that differ (Overview total counts any program membership; Results list is owner-only) → requirement scoped to the owner population, A-5 + `RAC-DD-6` added, T-5 reports the contributor-only delta with ids; **JI-3 (WARNING)** — T-4 was marked parallel-safe but imports the `section` param entry T-3 adds → T-4 now depends on T-3, graph serial; **JI-2 (WARNING)** — T-1 disqualifier reworded (a mapper cannot "reject" a fixture; the test asserts `key === codes[0]`). Verified true against code: `MIN(UPPER(wp.acronym))` tie-break, `INTERMEDIATE`/`EOI_2030`/UNTAGGED residual, W1/W2 source filter, `results_by_inititiative` total (`service.ts:1027-1095`); `ResultsFrameworkReportingModule` imports `ResultsModule` (`module.ts:15,51`); OSF-T-3 fixtures are grouped `{ bucket_key, status_id, result_count }` rows (`service.spec.ts:537-540`) so the RAC-DD-2 re-shape claim holds; the Results list request carries `submitter_id` and `limit` only, no version (`programme-results.service.ts:246-248`) so A-1 holds; `overviewScope` is the host signal wired to `(scopeChange)` (`dashboard-lab.component.html:1421`). Ledger: `judgment.md`. **JUDGMENT: APPROVED ✅ (inline fallback)**

## 10. Roll-back plan
1. Revert PR 2 (client) — the tab returns to today's behaviour; the endpoint is harmless alone.
2. Revert PR 1 (server) if needed. No data, flags or migrations involved.

## Required cross-references
- `requirements.md`, `design.md` (same folder); `docs/prd.md` US-P1, G1; `docs/ux-ui/design.md` §4, §6, §9, §10; `docs/trd/trd.md` §2.
