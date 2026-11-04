# Design — Portfolio Overview: Funding source filter (PFF)

## 1. Summary

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/funding-filter` |
| Requirements | [`requirements.md`](./requirements.md) PFF-R-1..R-6 |
| Depth | Standard |
| Packages | `onecgiar-pr-client` only. No server, no migration, no new HTTP |
| Date | 2026-11-04 |

One new dimension in the pure filter module; everything already built on `FILTER_DIMENSIONS` (bar loop, chips, strip, URL mirror, sanitize) picks it up. Three explicit touches outside that loop: the value-dependent not-affected rule, the Centers block's own matcher, and the Results Center link.

### Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 3 |
| LOC (incl. specs) | ~260 (prod ~90, tests ~170) |
| Review rounds | 1 per task |

## 1A. Premise Ledger

| # | Premise | Evidence | If false |
|---|---|---|---|
| P-1 | Deck W3 rule = `text(source_name) === 'W3/Bilaterals'`, used at 4 sites in the service | `portfolio-overview.service.ts:271,277,388-389,465` | Filter and cards disagree (R-2 scenario fails) |
| P-2 | Bar, chips, strip summary, URL mirror and `sanitize` all iterate `FILTER_DIMENSIONS` | `filter-bar.component.html:6`, `portfolio-overview.component.ts:148,172,251`; `portfolio-filters.ts` `sanitize`/`toQueryParams` | Each consumer needs an explicit edit |
| P-3 | Bar disables / makes searchable only `project` and `center` | `filter-bar.component.ts` `isDisabled`, template `[searchable]` | Funding would wait on the map (breaks R-1 MUST) |
| P-4 | Centers rows (`BilateralCenterResult`) have no `source_name`; block matches through `applyGlobal` → `matchesRow` | `centers-block.aggregate.ts:94-103` | Without DD-5 a W3 selection would empty the block |
| P-5 | Results Center reads `?funding=w1w2` → W1/W2 and `bilateral`/`w3` → W3/Bilaterals (id 2) | `results-list.component.ts:394-398` | Link opens unfiltered |
| P-6 | The Centers no-Center note already hides when any dimension is active (`isActive(selection())`) | `centers-block.component.ts:100` | — (funding included automatically) |
| P-7 | Copy `dimensions` records are keyed by dimension in both copy files; blocks look labels up by key | `portfolio-overview.copy.ts:44`, `portfolio-centers-block.copy.ts:30` | Note would print `undefined` |

## 2. Architecture Overview

All under `pages/result-framework-reporting/pages/portfolio-overview/` unless noted.

| File | Change | Req |
|---|---|---|
| `services/portfolio-filters.ts` | `funding` dimension, `FUNDING_OPTIONS`, `fundingOf(row)`, matcher, options, parse, single-source rule in `notAffectedBy`, `resultsCenterLinkable` | R-1..R-5 |
| `services/portfolio-overview.service.ts` | The 4 W3 tests call `fundingOf` (one rule, PFF-DD-1) | R-2 |
| `components/centers-block/centers-block.aggregate.ts` | `applyGlobal` also blanks `funding` in the effective selection | R-4 |
| `portfolio-overview.component.ts` | Strip link passes `funding`; `navigateToResultsCenter` accepts it | R-5 |
| `components/filter-bar/filter-bar.component.ts` | Label map includes `funding` (chips) | R-1 |
| `internationalization/portfolio-overview.copy.ts`, `portfolio-centers-block.copy.ts` | `dimensions.funding = 'Funding source'`; option labels | R-1, R-4 |
| `portfolio-overview/CLAUDE.md` | Guide sync | R-6 |

Templates: **no edit expected** (the bar loops the dimensions; blocks already render their not-affected text).

## 3–5. Data model, API, server

None.

## 6. Frontend Plan

### 6.1 Dimension and values (R-1, R-3)

- `FILTER_DIMENSIONS` gains `funding` **last** → bar order, chip order, strip order, URL order.
- Values: `w1w2`, `bilateral` (Results Center's own tokens, P-5), labels `W1/W2`, `W3/Bilateral` from copy.
- `EMPTY_SELECTION`, `PortfolioFilterOptions`, `parseQueryParams` (explicit object literal) get the key. Options are static (`FUNDING_OPTIONS`), not data-derived; `sanitize` drops anything else (R-3 unknown value).

### 6.2 Matching (R-2)

- `fundingOf(row)` → `'bilateral' | 'w1w2'` with the deck's exact rule. Exported; the service's 4 sites use it.
- `matchesRow` checks funding from the row alone, with Program / Typology / Status — before the index branch, so it never returns `'unknown'` (R-1 "never waits for the map").

### 6.3 Not-affected (R-4)

- New map `SECTION_SOURCE`: `centers` → `bilateral`, `projects` → `bilateral`, `toc` → `w1w2`; other sections have none.
- `notAffectedBy`: for `funding`, the section is not affected **iff** it has a single source **and** the selected values do not include it. `toc` and `projects` add `funding` to `SECTION_HONOURS` so the general rule does not flag it; the source check decides.
- Centers already computes its note via `notAffectedBy('centers', …)`; ToC and Projects via the page's `tocNotAffected` / `projectsNotAffected`. No block code change besides copy.

### 6.4 Centers block matcher (R-4 BUT clause)

- `applyGlobal` sets `funding` to the empty set in its effective selection, like it does for `center`. The block is W3 by construction: with W3 selected nothing to narrow; without it the note explains. Figures unchanged in both cases.

### 6.5 Results Center link (R-5)

- `resultsCenterLinkable`: allowed dimensions become `program`, `status`, `funding`, each ≤ 1 value.
- `viewActiveInResultsCenter` adds the single funding value; `navigateToResultsCenter` `extra.funding` sets `queryParams.funding` and the pre-set `selectedFundingSource` (`{id:1,'W1/W2'}` / `{id:2,'W3/Bilaterals'}`), mirroring the existing `w1w2` branch. Deck card clicks unchanged.

### 6.6 Design system

Existing `app-filter-multi-select`, chips and sheet. No new component, token, or Spartan part. Six 176 px controls may wrap to a second row on narrower desktops — accepted (flex-wrap exists); checked visually (T-3).

## 7–9. Security, performance, observability

Admin-only route unchanged. One extra string comparison per row per selection change. No logging.

## 10. Testing Plan

| Suite | Covers |
|---|---|
| `portfolio-filters.spec.ts` | `fundingOf` (exact name, blank, other names); matcher OR/AND; static options; sanitize drops `w4`; parse/serialize round-trip; `notAffectedBy` 3 sections × {w1w2, bilateral, both}; `resultsCenterLinkable` with 1 / 2 funding values |
| `portfolio-overview.service.spec.ts` | Funding = W3 → `kpiTotals` total = unfiltered W3 count, W1/W2 = 0; existing card tests stay green with `fundingOf` |
| `centers-block.aggregate.spec.ts` | `applyGlobal` with funding = bilateral or w1w2 keeps all rows |
| `centers-block.component.spec.ts` | W1/W2 → `centers-not-affected` contains "Funding source"; W3 → no note, same KPI |
| `portfolio-overview.component.spec.ts` | Link params `funding=bilateral` / `w1w2`; hidden with 2 values; URL mirror writes `funding` |
| `filter-bar.component.spec.ts` | 6 controls; Funding chip label |

Commands: `npm run test:local -- --testPathPattern=portfolio-overview` (≤ 2 workers), then `npx jest --findRelatedTests <changed files> --maxWorkers=2` before push. Lint: `npx eslint <changed files> --quiet`.

## 11. Backwards compatibility

Old URLs without `funding` behave as today. `FilterDimension` widens: any spec building a selection literal without `...EMPTY_SELECTION` must add `funding` (TypeScript will flag it in the Jest run).

## 12. Design Decisions

### PFF-DD-1 — One funding classifier, shared with the deck
`fundingOf` lives in `portfolio-filters.ts` and the service's 4 inline checks call it. Rejected: a second copy of the string test in the matcher (two rules drift; R-2 requires filtered total = W3 card).

### PFF-DD-2 — Static two options, Results Center tokens
`w1w2` / `bilateral` match what Results Center reads, so the link passes the value unchanged. Rejected: data-derived options (a stray funding name would become a third filter value).

### PFF-DD-3 — Value-dependent not-affected rule, notes not hiding
Single-funding blocks keep their figures and show the existing note only when the selection excludes their source. Rejected: hiding the block (layout jump, and the admin loses the W3 picture they may want next to W1/W2 figures); rejected: always flagging funding (false "not affected" when W3 is selected on a W3-only block).

### PFF-DD-4 — Funding last in the bar
Least disruption to the learned order and URLs. Alternative (first, as the coarsest cut) left open for the user.

### Reversion challenge (Step 2.3)
No DD removes or inverts delivered behavior: `resultsCenterLinkable` widens, `applyGlobal` ignores a new dimension, existing dimensions untouched. Challenge not triggered.

## 13. Open Gaps

| ID | Gap | Owner |
|---|---|---|
| G-1 | Bar layout with 6 controls not testable in jsdom → read-only browser check at HITL | T-3 |
| G-2 | Template type-check only in `ng build` (CI) | accepted risk |
