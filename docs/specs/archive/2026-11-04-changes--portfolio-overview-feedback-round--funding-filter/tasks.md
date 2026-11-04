# Tasks — Portfolio Overview: Funding source filter (PFF)

## 1. Scope

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/funding-filter` |
| Requirements / Design | [`requirements.md`](./requirements.md) · [`design.md`](./design.md) |
| Budget | 3 tasks · ~260 LOC · 1 review round per task |
| Branch | `qa-development-2026-ss` (no commit without explicit user go-ahead) |

## 2. Pre-flight

- [ ] Free RAM ≥ 4 GB before Jest; **`--maxWorkers=2`**, scoped `--testPathPattern` only, one test run at a time.
- [ ] Read `portfolio-overview/CLAUDE.md` (mock rules: `spartanBrainMock` inputs, `CentersService` mocked in page specs).
- [ ] `cleanup-and-approved` changes present in the working tree (fb4526f9b) — this spec builds on that template/service.

## 3. Task list

### PFF-T-1 — Pure filter module + shared classifier

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~140 LOC, ~90 of tests) |
| Depends on | none |
| Requirements | PFF-R-1 (static options; "never waits for the map"; "BUT no data-derived options"), PFF-R-2 (all clauses + both scenarios, matcher + service), PFF-R-3 (codec + "BUT unknown value dropped"), PFF-R-4 (rule table + both scenarios, pure function), PFF-R-5 (linkable rule: ≤1 funding value, "BUT both values hidden", "AND IT MUST hide with Project/Center/Typology") |
| Design | §6.1, §6.2, §6.3, §6.5 (`resultsCenterLinkable` only), PFF-DD-1, DD-2, DD-3 |
| Skills | `angular-developer`, `tdd` |

**Scope:** `services/portfolio-filters.ts` (dimension last, `FUNDING_OPTIONS`, `fundingOf`, `matchesRow`, `buildOptions`, `sanitize`, `parseQueryParams`, `SECTION_SOURCE` + `notAffectedBy`, `resultsCenterLinkable`); `services/portfolio-overview.service.ts` 4 W3 checks → `fundingOf`; copy `filters.dimensions.funding` + option labels in `portfolio-overview.copy.ts`; fix selection literals in specs that the new key breaks.

**Tests:** `portfolio-filters.spec.ts`, `portfolio-overview.service.spec.ts`.
- `fundingOf`: `'W3/Bilaterals'` → bilateral; `' W3/Bilaterals '` (trim) → bilateral; `'W1/W2'`, `''`, `null`, `'W3'` → w1w2.
- Matcher: funding=bilateral keeps only W3 rows; both values keep all; Program SP01 + W1/W2 drops a W3 SP01 row; funding never yields `'unknown'` with no index.
- Service: 120 W1/W2 + 288 W3 rows, funding=bilateral → `kpiTotals().totalResults` 288, `bilateralCount` 288, `w1w2Count` 0.
- Codec: `?funding=bilateral,w1w2` round-trips; `?funding=w4` → empty after `sanitize`.
- `notAffectedBy`: centers/projects × {w1w2 → flagged, bilateral → not, both → not}; toc × {bilateral → flagged, w1w2 → not, both → not}; kpi/status/typology never flagged.
- `resultsCenterLinkable`: funding 1 value + status 1 → true; funding 2 values → false; funding 1 + typology → false.

**Fails if:** the service keeps an inline `'W3/Bilaterals'` test (grep shows 0 matches outside `fundingOf`); a W3 row with surrounding spaces counts as W1/W2 in one place and W3 in the other.
**Not evidence:** specs that only assert `FILTER_DIMENSIONS` contains `funding` (presence) — the matcher and service totals must be asserted on rows.

**Verify:** `npm run test:local -- --testPathPattern="portfolio-filters|portfolio-overview.service"`; `npx eslint <touched files> --quiet`.

**Done:** all listed cases green; existing deck/split tests unchanged and green.

---

### PFF-T-2 — Blocks, bar labels, Results Center link

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | M (~100 LOC, ~70 of tests) |
| Depends on | PFF-T-1 |
| Requirements | PFF-R-1 (chip label, count, sheet trigger count, Clear all), PFF-R-3 (URL mirror writes / removes `funding`, `replaceUrl`), PFF-R-4 ("figures equal with no funding", "BUT must NOT drop rows", "AND IT MUST apply other dimensions", rendered notes for both scenarios), PFF-R-5 (params `phase`, `status`, `funding=bilateral|w1w2`, Results Center funding pre-set) |
| Design | §6.4, §6.5, §6.6, PFF-DD-3 |
| Skills | `angular-developer`, `spartan` (read-only: no new primitive expected) |

**Scope:** `centers-block.aggregate.ts` `applyGlobal` blanks `funding`; `portfolio-centers-block.copy.ts` `dimensions.funding`; `filter-bar.component.ts` labels map `put('funding', …)`; `portfolio-overview.component.ts` `viewActiveInResultsCenter` + `navigateToResultsCenter` `extra.funding` (query param + `selectedFundingSource` id 1 / id 2).

**Tests:** `centers-block.aggregate.spec.ts`, `centers-block.component.spec.ts`, `filter-bar.component.spec.ts`, `portfolio-overview.component.spec.ts`.
- `applyGlobal` with funding=bilateral and funding=w1w2 returns every row; with funding + program still narrows by program.
- Centers component: funding=w1w2 → `centers-not-affected` text contains "Funding source", KPI total equal to unfiltered; funding=bilateral → no note, same KPI.
- Filter bar: 6 controls render; selecting W3/Bilateral shows chip "W3/Bilateral"; Clear all empties funding.
- Page: strip link with status=approved + funding=bilateral navigates with `{ phase, status: 6, funding: 'bilateral' }`; with both funding values the link is absent; URL mirror effect writes `funding: 'bilateral'` then `funding: null` after clear; ToC KPI receives `notAffected` containing `funding` when funding=bilateral.

**Fails if:** Centers KPI with funding=bilateral differs from no-funding (rows dropped for missing `source_name`); the link navigates without `funding`.
**Not evidence:** a test that only checks the note string exists without asserting unchanged Centers figures.

**Verify:** `npm run test:local -- --testPathPattern="centers-block|filter-bar|portfolio-overview.component"`; then `npx jest --findRelatedTests <all changed files> --maxWorkers=2`; `npx eslint <touched files> --quiet`.

**Done:** listed cases green; `findRelatedTests` green.

---

### PFF-T-3 — Guide sync + visual check (HITL)

| Field | Value |
|---|---|
| Status | `[x]` |
| Size | S (~20 LOC docs) |
| Depends on | PFF-T-2 |
| Requirements | PFF-R-6; PFF-R-1 layout (desktop row + mobile sheet) — the gap named in requirements §8 |
| Design | §6.6, Open Gaps G-1 |
| Skills | `cognitive-doc-design` |

**Scope:** `portfolio-overview/CLAUDE.md` — bar dimensions list, URL params list (`funding`), not-affected single-source rule, Results Center link rule (`funding` ≤ 1), `fundingOf` as the one W3 rule; re-stamp `Verified:` (stay ≤ 120 lines). Update `family.md` row 2 status after execution.

**Manual check (read-only, local stack writes to shared DB — click no write buttons):** `/portfolio-overview?funding=bilateral` on desktop ≥ 1280 px and < 768 px (sheet): 6 controls readable, chip shown, Total = W3 card, Centers without Funding note; switch to W1/W2 → Centers + Projects notes visible; reload keeps the selection.

**Fails if:** the guide still says "Program, Project, Center, Typology, Status" anywhere (grep), or the manual check shows overlapping/clipped controls.
**Not evidence:** a green Jest run for layout — jsdom cannot see wrapping.

**Done:** guide grep clean; user confirms the visual check at the HITL pause.

## 4. Coverage closure

| Requirement clause | Task |
|---|---|
| R-1 two options, last, desktop + sheet | T-1 (options/order), T-2 (render), T-3 (layout) |
| R-1 chip, count, Clear all | T-2 |
| R-1 AND IT MUST not wait for the map | T-1 (matcher never `'unknown'`) |
| R-1 BUT no data-derived options | T-1 |
| R-2 main scenario + AND IT MUST deck rule | T-1 |
| R-2 both values / combined with Program | T-1 |
| R-3 apply on load, rewrite/remove | T-1 (codec), T-2 (mirror effect) |
| R-3 BUT unknown dropped | T-1 |
| R-4 rule table, both scenarios (pure) | T-1 |
| R-4 figures unchanged, BUT rows not dropped, AND other dimensions | T-2 |
| R-5 params + Results Center pre-set | T-2 |
| R-5 BUT both values hidden, AND IT MUST hide with Project/Center/Typology | T-1 |
| R-6 guide | T-3 |

## 5. Dependency graph

`T-1 → T-2 → T-3` (serial; T-2 needs the widened types).
