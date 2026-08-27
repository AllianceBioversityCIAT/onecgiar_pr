# `changes/sp-overview-echarts/overview-widgets` — Tasks

## 1. Scope of this task list

- **Module / feature:** `dashboard-lab` + `program-overview` — navigable overview, 2 heatmaps, status donut (client only)
- **Linked spec:** `requirements.md` (OVW-R-1..6) + `design.md` (OVW-DD-1..8)
- **Owner / driver:** j.cadavid@cgiar.org
- **Status:** approved — ready for /akili-execute (2026-08-27)
- **Depth:** Standard · **Budget:** 4 tasks / ~600 LOC / 1–2 review rounds (design.md §1)
- **Family:** `../family.md` row #3 · depends on #1 and #2 (both `done`) · `Parallel-safe: no`

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1 gate 2026-08-27; OQ-1/OQ-2 defaults accepted)
- [x] `design.md` approved (Phase 2 gate 2026-08-27)
- [x] Siblings merged: `services/programme-results-query-params.ts` present; `app-pr-viz-chart` + `chart-tokens.util` present; `echarts` installed (`npm ci` if a fresh worktree)
- [x] No migrations, no backend
- [ ] No other in-flight spec touching `dashboard-lab/**` (check `docs/specs/` at execution start)
- [ ] `package.json` untouched by this spec

## 3. Task list

### `OVW-T-1` — Link payloads and navigation in the parent (`dashboard-lab`)

- **Type:** `client`
- **Description:** In `dashboard-lab.component.ts`: import the four constants/map from `programme-results/services/programme-results-query-params.ts`; define `OverviewLink` (exported from `program-overview.component.ts` — create the type there first, see T-2 ordering note); extend `overviewStatusSegments` to carry `statusName` (from `Version.statuses[].statusName`, fallback 8-entry `statusId → status_name` map: 1 Editing · 2 Quality Assessed · 3 Submitted · 4 Discontinued · 5 Pending Review · 6 Approved · 7 Rejected · 8 Draft) and `link` (`{status: statusName}` or `null` when count 0); extend `overviewCategories` (`{category}`), `overviewBilateralCategories` (`{origin:'W3/Bilaterals', category}`), `overviewBilateralCenters` (`{origin, center}`; `null` for `Not specified`); add `onOverviewLink(link)` → `router.navigate(['/result-framework-reporting/entity-details', code, 'results'], { queryParams })` with only defined keys mapped through `PROGRAMME_RESULTS_QUERY_PARAM_MAP`, no `queryParamsHandling`. Bind `(openResults)="onOverviewLink($event)"` in the template. Spec: Router stub gains `navigate: jest.fn()`; cases per design §10 row 3 (status link vocabulary, plural origin, `Not specified` null, navigate args).
- **Implements:**
  - `OVW-R-1` — *Category row (W1/W2)* (THEN URL `…/SP02/results?category=…`; **BUT NOT** add `origin` → builder emits `{category}` only; **AND IT MUST NOT** carry other params → navigate spec asserts exact `queryParams` keys) · *Category row (W3) and center row* (**AND IT MUST** `W3/Bilaterals` plural → spec string equality; **BUT** `Not specified` **NOT** navigable → link `null`) · *Status segment / legend* (THEN `status=Editing` → statusName not slot label; **AND IT MUST** map every slot → spec over all 6 slots; **BUT** zero-count → `null`)
  - `OVW-R-5` — *Emission contract* (AND the parent builds the URL from sibling #1 constants and calls the router once → spec `navigate` called once with mapped keys)
- **Files (expected):** `dashboard-lab.component.ts`, `dashboard-lab.component.html`, `dashboard-lab.component.spec.ts`, `program-overview.component.ts` (types only: `OverviewLink`, `link` fields, `statusName`)
- **Depends on:** — · **Blocks:** OVW-T-2, OVW-T-3, OVW-T-4
- **Estimate:** M (~140 LOC incl. spec)
- **Skills:** `angular-developer`, `tdd`
- **Definition of done:**
  - [ ] Spec: for fixture statuses `[{statusId:1,statusName:'Editing',count:3},{statusId:2,statusName:'Quality Assessed',count:0}]` segments carry `link {status:'Editing'}` and `null`. **FAIL input:** emitting the slot label (`'In progress'`) → equality red.
  - [ ] Spec: fallback map used when `statusName` is `''`/missing → `'Pending Review'` for id 5. **FAIL input:** map entry `'Not started'` → red.
  - [ ] Spec: bilateral links carry `origin: 'W3/Bilaterals'`; `grep -rn "W3/Bilateral'" onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab` → 0 hits. **FAIL input:** singular string.
  - [ ] Spec: `onOverviewLink({origin:'W3/Bilaterals', center:'IITA'})` → `navigate` once with commands `['/result-framework-reporting/entity-details','SP02','results']` and `queryParams` exactly `{origin:'W3/Bilaterals', center:'IITA'}` (no `status`/`category` keys, no `queryParamsHandling`). **FAIL input:** adding `queryParamsHandling:'merge'` → red. **Disqualifier:** asserting `toHaveBeenCalled()` without args is not evidence.
  - [ ] Full suite `cd onecgiar-pr-client && npx jest --silent --reporters=summary --no-coverage` green; `npx ng lint --quiet` clean. **Disqualifier:** `--testPathPattern` narrowing.

### `OVW-T-2` — Navigable rows/segments in `program-overview` + deliberate spec rewrite

- **Type:** `client`
- **Description:** In `program-overview.component.{ts,html}`: add `openResults = output<OverviewLink>()`; rows become `<button type="button" [disabled]="!bar.link" (click)="bar.link && openResults.emit(bar.link)">` (same classes; `cursor-default` only when disabled, `cursor-pointer` + hover bg when enabled); remove the `#comingSoon` template and its two outlets; status meter segments become buttons when `segment.link` (keep `[style.background]`, `[title]`); legend items become buttons when `link` non-null, plain spans otherwise. Keep `aria-label`, `title`, widths, tokens. Rewrite the five pinned assertions **by name** in `program-overview.component.spec.ts`: (1) h2 order → 6 titles for now (T-3 extends to 8); (2) `svg.length === 0` → keep for now (T-3 replaces); (3) `button[aria-label]` count → rows with `link !== null` (+ navigable status controls); (4) "rows disabled" → inverted (linked rows enabled, `Not specified` disabled); (5) "Coming soon ×2" → `0`. Add: click emits the link; disabled row emits nothing; zero-count legend item is not a button; component constructs with **no Router provider**.
- **Implements:**
  - `OVW-R-1` — *No "Coming soon" left* (THEN no chip / no disabled category-center row; **AND IT MUST** keep `aria-label` + `title` → DOM spec) · *Status segment / legend* (activation surface: segment + legend buttons; **BUT** zero-count legend not interactive → DOM spec) · *Category row (W1/W2)* (WHEN click or Enter/Space → real `<button>`, keyboard native)
  - `OVW-R-5` — *Emission contract* (THEN emits one typed intent; **BUT NOT** navigate from inside → spec: no Router provided and no `navigate` reachable)
- **Files (expected):** `program-overview.component.ts`, `.html`, `.spec.ts`
- **Depends on:** OVW-T-1 (types + `link` fields) · **Blocks:** OVW-T-3, OVW-T-4
- **Estimate:** M (~150 LOC incl. spec)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [ ] All five rewritten assertions present with their new expected values (diff shows the rewrite, not a deletion). **FAIL input:** re-adding a `disabled` attribute unconditionally → "linked rows enabled" red; re-adding the chip → count `0` red.
  - [ ] Emission spec: clicking the IITA row emits `{origin:'W3/Bilaterals', center:'IITA'}`; clicking `Not specified` (disabled) emits nothing. **FAIL input:** emitting on disabled → red.
  - [ ] Presence caveat recorded: `button` presence + `aria-label` prove markup, not that the click reaches the Results tab — that is OVW-AC-3 manual.
  - [ ] Full suite + lint green (same disqualifier).

### `OVW-T-3` — Two heatmap cards (matrices in parent, charts in child)

- **Type:** `client`
- **Description:** Parent: widen `IndicatorCategory` with `qualityAssessed`, `others`, `totalResults`; add `overviewW12Heatmap` and `overviewBilateralHeatmap` computeds producing `HeatmapModel` per design §2.2 item 2 (row omission; `Other` → `null` link; top-8 centers + `shownOf`; sort by total desc then name; `Not specified` → `null`). Child: create `program-overview.charts.ts` with pure `heatmapOption(model, ramp)`, `heatmapTable(model)`, `cellLinkFromClick(event, model)` (+ spec); add inputs `w12Heatmap`, `bilateralHeatmap`; two new cards (titles "W1/W2 results by category and status", "W3/Bilateral results by center and category"; bilateral subtitle "Bilateral results in review (Submitted · In QA · Approved)"; "Showing 8 of N centers" line when `shownOf`), each `<app-pr-viz-chart [options] [tableModel] height="240px" (chartClick)>`; empty states. Tokens via `resolveChartTokens().ramp` reversed (light→dark). Extend the child spec: h2 order → 8 titles; replace `svg.length === 0` with "3 `app-pr-viz-chart` hosts" (donut lands in T-4 — assert 2 here, T-4 bumps to 3) each bound with a non-null `tableModel`; `Other` cell click emits nothing.
- **Implements:**
  - `OVW-R-2` — *Cell click* (THEN `category` + `status`; **BUT** `Other` **NOT** navigable + tooltip note; **AND IT MUST** omit all-zero rows + empty state) · *Accessibility pairing* (THEN sr-only table with caption/col/row headers → `heatmapTable` spec; **AND IT MUST** have a visible visual map → option spec asserts `visualMap` present)
  - `OVW-R-3` — *Cell click* (THEN `origin` + `center` + `category`; **BUT** `Not specified` row **NOT** navigable; **AND IT MUST** show the "in review" subtitle → DOM spec) · *Many centers* (THEN top 8 + "Showing 8 of N"; **AND IT MUST** sort total desc then name → computed spec with 10 centers)
  - `OVW-R-6` — loading binding where a loading signal exists (record if absent)
- **Files (expected):** `dashboard-lab.component.ts` (+spec), `program-overview.component.ts/.html/.spec.ts`, `program-overview.charts.ts` (NEW, +spec)
- **Depends on:** OVW-T-2 · **Blocks:** OVW-T-4
- **Estimate:** L (~220 LOC incl. spec)
- **Skills:** `angular-developer`, `tdd`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] Matrix specs: W1/W2 fixture `[{resultTypeName:'KP', editing:1, qualityAssessed:2, submitted:0, others:3}, {…all zero}]` → 1 row, cells `[1,2,0,3]`, `Other` cell link `null`, others `{category:'KP', status:'Editing'|'Quality Assessed'|'Submitted'}`. **FAIL input:** swapping row/col indices → cell values red; mapping `Other` to `{status:'Other'}` → red.
  - [ ] Bilateral fixture with 10 centers → 8 rows, `shownOf {shown:8,total:10}`, first row = highest total; `Not specified` row cells `null` link; links carry plural origin. **FAIL input:** cap at 10 → red.
  - [ ] Builders spec: `heatmapOption` has `xAxis.data === cols`, `yAxis.data === rows`, `series[0].data.length === cells.length`, `visualMap` present; requested token names ⊆ `CHART_TOKEN_NAMES` (jsdom returns `''` — assert names, never values). **FAIL input:** dropping `visualMap` → red.
  - [ ] Child DOM spec: 8 `<h2>` in the design §6.2 order; 2 `app-pr-viz-chart` hosts with `tableModel` set (T-4 → 3); subtitle text present; `Other` click → no emission. **What presence cannot prove:** rendered colors/legibility → OVW-AC-3 (T6).
  - [ ] Full suite + lint green; hex grep on touched files → 0.

### `OVW-T-4` — Status donut in the Reporting status card

- **Type:** `client`
- **Description:** Child: `donutOption(segments, statusTokens)` + `donutTable(segments)` + `sectorLinkFromClick` in `program-overview.charts.ts` (+spec); render `<app-pr-viz-chart height="160px">` left of the meter inside the existing card (flex row; meter + legend unchanged), center text = `statusTotal()`; sectors colored with each slot's status `fg` via `resolveStatusTokens()` (`discontinued` → `notStarted`), documented as the explicit fence exception; sector click → emit `segment.link` (null → nothing). Child spec: hosts count → 3; donut table rows = segments; zero-count sector click emits nothing.
- **Implements:**
  - `OVW-R-4` — *Donut sector* (THEN `status=Submitted` via the segment's `link`; **AND IT MUST** use status token pairs → builder spec asserts requested names ⊆ `STATUS_TOKEN_NAMES`; **BUT NOT** replace/reflow meter+legend → DOM spec keeps the meter `div.h-[44px]` and legend dot count assertions from the existing file)
  - `OVW-R-6` — reduced motion inherited (no task action; wrapper-owned)
- **Files (expected):** `program-overview.charts.ts` (+spec), `program-overview.component.ts/.html/.spec.ts`
- **Depends on:** OVW-T-3 · **Blocks:** —
- **Estimate:** S (~90 LOC incl. spec)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [ ] Builder spec: `donutOption` series data length = segments with count > 0 (zero-count sectors omitted from the pie but kept in the table), colors requested from `STATUS_TOKEN_NAMES` only. **FAIL input:** coloring from `CHART_TOKEN_NAMES.ramp` → red.
  - [ ] DOM spec: existing meter/legend assertions (`div.h-[44px] > span.pr-figure-sm` = 1; legend dots = segments) still green unchanged; `app-pr-viz-chart` hosts = 3. **FAIL input:** removing the meter → red.
  - [ ] Full suite + lint green; hex grep → 0.

## 4. Dependency graph

```
OVW-T-1 (parent links + navigate)
   └── OVW-T-2 (child buttons, chips out, spec rewrite)
         └── OVW-T-3 (heatmaps)
               └── OVW-T-4 (donut)
```

Strictly serial (all four edit `program-overview.component.*`). No cycles.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `OVW-TEST-1` | unit (parent computeds + navigate stub) | OVW-R-1 link vocabulary · OVW-R-5 parent side · OVW-R-2/3 matrices | `dashboard-lab.component.spec.ts` |
| `OVW-TEST-2` | unit (child DOM + outputs, no Router) | OVW-R-1 markup/emission · OVW-R-5 child side · card order · hosts/tableModel | `program-overview.component.spec.ts` |
| `OVW-TEST-3` | unit (pure builders) | OVW-R-2/3/4 option/table/click mapping · token-name sets | `program-overview.charts.spec.ts` |
| `OVW-TEST-4` | static | plural origin grep · hex grep | shell, recorded in `execution.md` |
| `OVW-TEST-5` | manual (T6) | OVW-AC-3: visual + 6 click paths on SP02 at 1280/1024px | HITL pause after T-4 |

Client coverage thresholds (50/60/60/60) unaffected (new file ships with spec).

## 6. Rollout & verification

- [ ] **PR 1 — navigation** (T-1 + T-2, ~290 LOC): review `onOverviewLink` + status vocabulary first; out of scope: charts. Link to PR 2.
- [ ] **PR 2 — widgets** (T-3 + T-4, ~310 LOC): review `program-overview.charts.ts` builders first, then the two computeds; out of scope: navigation semantics (PR 1). Link to PR 1. Both against `qa-development-2026`.
- [ ] CI green on both; manual OVW-AC-3 on the test env after PR 2.

## 7. Cleanup & follow-ups

- Flip `../family.md` row #3 → `done` and the family to `complete` at archive.
- `program-overview/CLAUDE.md`: rewrite invariants ("do not upgrade to a chart" → "DOM bars for single series; `app-pr-viz-chart` for matrices/donut, always with `tableModel`"; rows are navigable; drop stale `bilateralRoles` row) — pending item at archive (spec branch).
- OQ-1 (bar excludes QA'd) → separate quick/proposal if product wants the bar aligned.

## 8. Roll-back plan

Revert PR 2 alone (widgets) or both PRs; no persisted state, no dependency change, no API.
