# `changes/sp-overview-echarts/overview-widgets` — Requirements

## 1. Module / Feature

- **Module:** `result-framework-reporting` → `dashboard-lab` / `program-overview` (SP Overview tab, client only)
- **Sub-feature:** Navigable overview cards + two heatmaps + status donut on `app-pr-viz-chart`
- **Owner:** j.cadavid@cgiar.org
- **Status:** approved (2026-08-27)
- **Depth:** Standard · **Type:** Change · **Approval Mode:** gated
- **Parent Spec:** `changes/sp-overview-echarts` (`../family.md` row #3 · depends on #1 `results-tab-filter-deeplink` **done**, #2 `viz-chart-echarts` **done** · `Parallel-safe: no`)
- **Linked proposal:** `./proposal.md` · **Tickets:** P2-3303 / P2-3302 follow-on, P2-3408

## 2. Context

The Overview (`program-overview.component`, purely presentational, 7 signal inputs, 0 outputs, no `inject()`) shows six DOM-bar cards; category and center rows are `<button disabled>` with a "Coming soon" chip because the Results tab could not take filters from the URL. Sibling #1 shipped that bridge (`services/programme-results-query-params.ts` is the contract; params `status`, `category`, `origin`, `center`), and sibling #2 shipped `app-pr-viz-chart` (bar/pie/heatmap; SVG; a11y table pairing; `chartClick`) plus `resolveChartTokens()` / `resolveStatusTokens()`.

**Discovery that changes the proposal (scout 2026-08-27):**

| Fact | Consequence |
|---|---|
| Results-tab `status_name` values are `Editing` · `Quality Assessed` · `Submitted` · `Discontinued` · `Pending Review` · `Approved` · `Rejected` · `Draft`; the overview status slots are labeled `In progress` / `In QA` / `Not started` (only Submitted/Approved/Discontinued match) and the filter does no aliasing | Links MUST carry the real `status_name`. `SPProgress.versions[].statuses[].statusName` already carries it on the wire and is discarded today — reuse it, do not invent a fifth vocabulary |
| `source_name` is exactly `W1/W2` / **`W3/Bilaterals`** (plural) | Proposal's `W3/Bilateral` corrected everywhere |
| Summary buckets: `editing`=status 1, `qualityAssessed`=2, `submitted`=3, `others`=4–8 (undecomposable) | Heatmap columns Editing / Quality Assessed / Submitted / Other; **Other cells are not navigable** |
| Client `IndicatorCategory` drops `qualityAssessed`/`others`; the W1/W2 bar counts `editing + submitted` only | Interface widened for the heatmap; **bar counts unchanged** (approved P2-3303 numbers) — see OQ-1 |
| Overview center bars come from bilateral rows with `lead_center` fallback `'Not specified'`; Results tab has `''` for those rows; predicate differs (`is_primary OR is_leading` vs `is_leading` only) | `'Not specified'` bar non-navigable; predicate mismatch = accepted risk (§10) |
| `program-overview.component.spec.ts` pins: exact `<h2>` list, `svg.length === 0`, `button[aria-label]` count, all rows `disabled`, 2 "Coming soon" chips | All five rewritten **deliberately** (named in tasks), never deleted silently |

## 3. In Scope / Out of Scope

### In scope
- Navigation from category rows (both cards), center rows, status meter segments + legend items, and heatmap cells to `…/entity-details/:code/results?<params>`.
- Two new cards on `app-pr-viz-chart`: **W1/W2 category × status heatmap** and **W3/Bilateral center × category heatmap**.
- Status **donut** inside the existing "Reporting status" card, beside the meter (not replacing it).
- Removal of `disabled` + "Coming soon" chips on the two category cards.
- `dashboard-lab` computeds for the two matrices and the link payloads; `program-overview` outputs; spec rewrites.

### Out of scope
- Backend; AoW rows navigation (section filter inert, P2-3398/3399); changing the approved bar counts (OQ-1); `programDescription` binding bug; `chart.js` removal; dark mode.

## 4. Personas Affected

| Persona | What changes |
|---|---|
| All PRMS users on SP pages | Every figure on the Overview opens the matching filtered result list; two cross-dimension heatmaps and a status donut add views the bars cannot show. |

## 5. User Stories

- **`OVW-US-1`** As a PRMS user, I want to click any figure on the Overview and land on the Results tab already filtered to those results, so that I can act on what the number describes.
- **`OVW-US-2`** As a PMU/QA user, I want to see category × status and center × category at a glance, so that I can spot where reporting is concentrated or lagging.

## 6. Functional Requirements

### Required (MUST)

- **`OVW-R-1` Navigable existing cards.** Category rows (W1/W2 and W3/Bilateral cards), center rows, and status meter segments/legend items MUST navigate to the Results tab of the same program with the matching filters, using the sibling #1 query-param contract.

#### Scenario: Category row (W1/W2)
- GIVEN SP02's Overview with the "Innovation development" row (count 19)
- WHEN the user activates the row (click or Enter/Space — it is a real button)
- THEN the app navigates to `/result-framework-reporting/entity-details/SP02/results?category=Innovation%20development`
- AND the Results tab shows the chip "Category: Innovation development"
- BUT it must NOT add `origin` for the W1/W2 card (the summary counts all origins of the program's own results — see OQ-2)
- AND IT MUST NOT carry any other param (`status`, `center`, `phase`, …)

#### Scenario: Category row (W3/Bilateral) and center row
- GIVEN the bilateral category row "Capacity sharing for development" and the center row "IITA"
- WHEN activated
- THEN category → `…/results?origin=W3%2FBilaterals&category=Capacity%20sharing%20for%20development`; center → `…/results?origin=W3%2FBilaterals&center=IITA`
- AND IT MUST use the exact string `W3/Bilaterals` (plural)
- BUT the synthetic center row `Not specified` must NOT be navigable (rendered as a non-button row or a disabled button with no chip)

#### Scenario: Status segment / legend
- GIVEN the "Reporting status" meter with segment label "In progress" (status id 1)
- WHEN the user activates the segment or its legend item
- THEN it navigates to `…/results?status=Editing` — the **`status_name`**, never the slot label
- AND IT MUST map every slot to its real `status_name` (`Not started`→`Pending Review`, `In progress`→`Editing`, `Submitted`, `In QA`→`Quality Assessed`, `Approved`, `Discontinued`)
- BUT zero-count legend items must NOT navigate (rendered non-interactive)

#### Scenario: No "Coming soon" left
- GIVEN any program's Overview
- WHEN rendered
- THEN no "Coming soon" chip and no `disabled` category/center row exists on the category cards
- AND IT MUST keep the per-row `aria-label` ("<name>: N results") and the truncation `title` tooltip

- **`OVW-R-2` W1/W2 category × status heatmap.** A new card MUST show a heatmap with rows = the program's result-type categories (from the summary endpoint) and columns = Editing · Quality Assessed · Submitted · Other, cell value = count; navigable cells open the Results tab filtered by category **and** status.

#### Scenario: Cell click
- GIVEN the cell (Knowledge product × Submitted) = 4
- WHEN clicked
- THEN it navigates to `…/results?category=Knowledge%20product&status=Submitted`
- BUT an **Other** cell must NOT navigate (the bucket aggregates statuses 4–8 and cannot be expressed as one `status`), and its tooltip says so
- AND IT MUST omit rows whose four cells are all zero, and render the empty state "No W1/W2 results reported yet." when no row remains

#### Scenario: Accessibility pairing
- GIVEN the heatmap renders
- THEN a visually-hidden table with caption, column headers (statuses) and row headers (categories) is present (via the wrapper's `tableModel`)
- AND IT MUST have a visible legend/visual map for the count scale

- **`OVW-R-3` W3/Bilateral center × category heatmap.** A new card MUST show a heatmap with rows = lead centers, columns = result-type categories, from the same bilateral rows the centers card uses; navigable cells open the Results tab filtered by origin, center and category.

#### Scenario: Cell click
- GIVEN the cell (IITA × Innovation use) = 7
- WHEN clicked
- THEN it navigates to `…/results?origin=W3%2FBilaterals&center=IITA&category=Innovation%20use`
- BUT a cell on the `Not specified` row must NOT navigate
- AND IT MUST show the subtitle "Bilateral results in review (Submitted · In QA · Approved)" so the count is not read as a total (source is server-filtered to statuses 5/6/7 — P2-3406)

#### Scenario: Many centers
- GIVEN more than 8 centers
- THEN the heatmap keeps the top 8 by total count and prints "Showing 8 of N centers"
- AND IT MUST sort rows by total descending, then name

- **`OVW-R-4` Status donut.** The "Reporting status" card MUST add a donut (ring) of the same segments beside the existing meter, sharing the status colors, with the total in the center; sectors navigate like segments.

#### Scenario: Donut sector
- GIVEN the donut with sector "Submitted" = 1
- WHEN clicked
- THEN it navigates to `…/results?status=Submitted`
- AND IT MUST use the status token pairs (`resolveStatusTokens()`) — an explicit, documented exception to the "status colours are not chart colours" rule because the widget IS status-keyed
- BUT it must NOT replace or reflow the meter and legend (approved P2-3298 layout stays)

- **`OVW-R-5` Component boundary.** `program-overview` MUST stay presentational: no `inject()`, no router; navigation intents are emitted as outputs and the parent (`dashboard-lab`) performs the navigation.

#### Scenario: Emission contract
- GIVEN a row/segment/cell activation
- THEN the component emits one typed link intent (`{ status?, category?, origin?, center? }`)
- AND the parent builds the URL from the sibling #1 constants and calls the router once
- BUT it must NOT navigate from inside `program-overview`

### Should (SHOULD)
- **`OVW-R-6`** Heatmap/donut cards SHOULD show the wrapper's loading skeleton while their source signals are empty and loading, and reduced-motion users SHOULD get no animation (inherited from the wrapper).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Consistency | Category strings identical across surfaces (`result_type.name`) — verified by scout; no transformation of names. |
| Tokens | All chart colors via `resolveChartTokens()` / `resolveStatusTokens()`; no hex in TS/templates. |
| Performance | Matrices are `computed()` over already-fetched data; zero extra HTTP. |
| A11y | Every chart paired with a table; every navigable DOM element is a real `<button>`; heatmap keyboard users have the table (accepted: SVG cells not focusable — as in #2). |

## 8. Acceptance Criteria

- **`OVW-AC-1`** Jest: link payload builders (all scenarios above incl. `Not specified`, `Other`, zero-count, plural origin, status_name map), matrix computeds (row omission, top-8 cap, sort), output emission, parent navigation call args; card-order/`svg`/button-count/disabled/chip assertions rewritten to the new truth. Full client suite green; lint clean.
- **`OVW-AC-2`** Static: `grep` for `W3/Bilateral"` (singular, quoted) in `dashboard-lab/**` returns 0; no hex in touched TS/HTML.
- **`OVW-AC-3`** **Manual HITL on the running app (T6 visual):** both heatmaps + donut render with tokens, tooltips, legends; clicking a category row, a status segment, a donut sector, and one cell of each heatmap lands on the Results tab with the expected chips and non-empty lists (except documented mismatches); no "Coming soon" remains; layout intact at 1280px and 1024px.

## 9. Defect Classes → Gates

| Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|
| Wrong param vocabulary (slot label as status; singular origin) | OVW-AC-1 builder specs assert exact strings; OVW-AC-2 grep | Emitting `status: 'In progress'` → red; `'W3/Bilateral'` → grep hit |
| Navigable "Other"/"Not specified"/zero-count elements | Builder spec returns `null` for those; DOM spec asserts non-button/`disabled` | Making `Other` cells emit → red |
| Component reaches into the router | Spec asserts `program-overview` has no Router provider and still renders; parent spec asserts `router.navigate` args | Injecting Router in the child → child spec fails (no provider) |
| Heatmap data mis-mapped (row/col swapped, counts wrong) | Matrix computed spec with fixture → exact cell values | Swapping axes → red |
| Chart renders without table | Wrapper's own gate (#2) + spec asserts each `app-pr-viz-chart` receives a `tableModel` | Omitting `tableModel` → wrapper alert + spec red |
| Silent spec deletion (order/svg/button-count) | Task DoD names each rewritten assertion with its new expected value | A deleted assertion is visible in the diff review |
| **Rendered visual correctness** (colors, legibility, overlap, tooltip) | **No jsdom gate** — OVW-AC-3 HITL/T6 on a real program (SP02) | — (explicit substitute) |
| Count mismatch cell vs filtered list (P2-3406; `is_primary` vs `is_leading`) | Unmeasurable client-side — **accepted risk**, mitigated by the subtitle | — |

## 10. Dependencies & Assumptions

- **Upstream:** #1 (`programme-results-query-params.ts`, hydrate on load) and #2 (`app-pr-viz-chart`, token utils) — both merged.
- **Assumptions:** SP progress `statusName` matches `result_status.status_name` (both read `rs.status_name`); `lead_center` is the same acronym on both surfaces (scout-verified).
- **Downstream:** `program-overview/CLAUDE.md` invariants ("do not upgrade to a chart", "rows disabled") become stale → pending item at archive.

## 11. Open Questions

- **OQ-1** The W1/W2 bar counts `editing + submitted` and drops `qualityAssessed` (P2-3303 numbers). The new heatmap shows the QA column, so a row's heatmap total will exceed its bar. **Default: leave the bar as-is (out of scope), document in the card tooltip.** User may instead approve widening the bar to editing+QA+submitted.
- **OQ-2** W1/W2 category links carry no `origin`. The summary endpoint counts the program's own results (all `source`), while the Results tab has an Origin filter. **Default: no origin param** (list shows all matching results). User may prefer `origin=W1/W2`.

## 12. Requirement ID Index

| ID | Summary | Scenarios | Covered by task |
|---|---|---|---|
| OVW-R-1 | Navigable existing cards | Category W1/W2 · Category+center W3 · Status segment · No Coming soon | OVW-T-1, OVW-T-2 |
| OVW-R-2 | W1/W2 category × status heatmap | Cell click · A11y pairing | OVW-T-3 |
| OVW-R-3 | W3 center × category heatmap | Cell click · Many centers | OVW-T-3 |
| OVW-R-4 | Status donut | Donut sector | OVW-T-4 |
| OVW-R-5 | Presentational boundary | Emission contract | OVW-T-1, OVW-T-2 |
| OVW-R-6 | Loading / reduced motion | — | OVW-T-3, OVW-T-4 |

## Required cross-references
- `docs/prd.md` (SP overview/results stories) · `docs/ux-ui/design.md §7–8` · `docs/trd/trd.md` frontend state · sibling specs `../results-tab-filter-deeplink/design.md` (RFD-DD-3 contract) and `../viz-chart-echarts/design.md` (§2.2 API, VCE-DD-3 token fence).
