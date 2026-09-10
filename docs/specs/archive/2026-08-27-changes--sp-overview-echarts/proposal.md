# Proposal: Dynamic SP Overview — ECharts widgets, clickable charts, Results-tab deep links

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-overview-echarts` |
| Slug | `sp-overview-echarts` — derived from free-text argument (URL + Spanish paragraph); never interpolated into the path |
| Type | Change |
| Approval Mode | gated |
| Status | Approved 2026-08-27 (3-chunk family — see `family.md`) |
| Date | 2026-08-27 |
| Author | j.cadavid@cgiar.org (via /akili-propose) |
| Depends on | family parent — see `family.md` |
| Parallel-safe | chunk-level (see §5) |
| Reference implementation | `alliance-research-indicators-main` — spec `changes/dashboard-advanced-analytics`, commit `831388cd` (`viz-chart` wrapper over `echarts/core`, SVG renderer, no `ngx-echarts`, D-DA-1) |

## 2. Intent

Turn the Science Program **Overview** tab (`/result-framework-reporting/entity-details/:code/overview`) from a static read-only summary into a **dynamic, richer, interactive** dashboard: install Apache ECharts the same way Alliance did, add new chart types (heatmap first), and make every chart element **clickable so it opens the Results tab with the matching filters pre-applied**. Fast and efficient: reuse what already works, add only what the DOM bars cannot express.

## 3. Problem / Current Behavior

Live component: `pages/result-framework-reporting/pages/dashboard-lab/components/program-overview/` (purely presentational; all figures are signal inputs computed in `dashboard-lab.component.ts`). Six cards, all **plain DOM bars** (Tailwind + `[style.width.%]`), no chart library on this surface.

| Symptom | Evidence |
|---|---|
| Category rows are **`<button disabled>` + "COMING SOON" chip** on both indicator-category cards | `program-overview.component.html:13-18`; folder `CLAUDE.md`: *"no destination accepts a category yet — the Results tab filters only from its own dropdown, never from the URL (P2-3408)"* |
| The Results tab has **no filter deep-link**: filter state is a component-provided signal service, never read from `queryParams` | `programme-results/services/programme-results-filter.service.ts:22-29`; `programme-results.component.ts:152-155,502` (only path param read) |
| Only two dimensions per card, one bar type; no cross-dimension view (category × status, center × category) | `program-overview.component.html` — six cards, all single-series bars |
| Results tab has **no center filter** even though rows carry `lead_center` | `programme-results.service.ts:34` (column only) |
| `chart.js` is installed but only used on the RFR home insights card and the **dead** `pages/entity-details/` route | `package.json:42-43`; `routing-data.ts:606-611` |

Data already available with **zero backend change**:

| Endpoint | Shape usable for new widgets |
|---|---|
| `GET api/results-framework-reporting/programs/indicator-contribution-summary?program=` | `totalsByType[{resultTypeName, totalResults, editing, qualityAssessed, submitted, others}]` → **category × status matrix** (W1/W2) |
| `GET api/results/by-program-and-centers?programId=` | flattened rows with `lead_center`, `indicator_category` (= result type), `status_name`, `initiative_role_name` → **center × category matrix**, role split (W3/Bilateral) |
| `GET …/science-programs/progress` | `versions[].statuses[{statusName,count}]` → status donut / stacked bar (already used) |
| `GET …/clarisa-global-units` + ToC loads | AoW progress (already used) |

## 4. Proposed Outcome

1. **Results tab accepts filters from the URL** (`category`, `status`, `origin`, `center`) and shows them as removable chips — the same state the dropdowns set today. Existing behavior when no params: unchanged.
2. **Every overview figure is a link**: category bars, status segments, center bars, heatmap cells → navigate to `…/entity-details/:code/results?<filters>`. "COMING SOON" chips and `disabled` attributes removed.
3. **New ECharts widgets** (SVG renderer, tree-shaken `echarts/core`, in-house `viz-chart` wrapper with a paired visually-hidden table):
   - **Heatmap — W1/W2 indicator category × reporting status** (cell = count; click → `category` + `status`).
   - **Heatmap — W3/Bilateral center × indicator category** (click → `origin` + `center` + `category`).
   - **Status donut** replacing/complementing the stacked "Reporting status" bar (click → `status`).
4. Existing DOM-bar cards stay (they already satisfy the a11y invariant: focusable per-row buttons with truncation tooltips) — they only gain real `(click)`.

## 5. Scope & Chunking (recommended: 3-chunk family)

The request spans three independent concerns; two are parallel-safe. RICE-ordered (Reach: all PRMS users on SP pages · Impact: high for C1 which unblocks P2-3408 · Effort: S / S / M):

| # | Chunk (spec path) | Delivers | Depends on | Parallel-safe |
|---|---|---|---|---|
| C1 | `changes/sp-overview-echarts/results-tab-filter-deeplink` | Results tab reads `category/status/origin/center` query params into `ProgrammeResultsFilterService` on load (prior art: `dashboard-lab.component.ts:764-793,1253-1288` URL mirroring; named-param constants like `bilateral-results.service.ts:7,14`); adds the missing **center** filter (`lead_center`); chips + clear-all work; URL ↔ state kept in sync (`queryParamsHandling: 'merge'`, `replaceUrl`). | none | **yes** |
| C2 | `changes/sp-overview-echarts/viz-chart-echarts` | `npm i echarts` (^6.x); `shared/components/pr-viz-chart/` ported from Alliance (`echarts/core` + `SVGRenderer` + Bar/Pie/Heatmap + Tooltip/Grid/Legend/VisualMap/Dataset; `chartClick` output; `tableModel` sr-only table enforced; ResizeObserver; `prefers-reduced-motion` → `animation:false`); PRMS tokens via CSS vars (`--pr-color-primary-300/400`, `--pr-chart-2`, `--pr-chart-2-muted`, status colors) resolved through `getComputedStyle`, never hex in TS. Registered in `docs/ux-ui/design.md §8`. | none | **yes** |
| C3 | `changes/sp-overview-echarts/overview-widgets` | Overview wiring: `(click)` + navigation on all existing cards, chips removed; two heatmaps + status donut on `app-pr-viz-chart`; parent computeds for the two matrices; card order assertion updated deliberately; optional `chart.js` removal from the dead route left for a later cleanup. | C1, C2 | no |

**If the user prefers one PR:** collapse into a single Standard-depth spec with tasks T-1 (=C1), T-2 (=C2), T-3 (=C3). Slower wall-clock (sequential), one review surface.

## 6. Non-Goals

- No backend/API changes (all matrices are client-derived from existing responses).
- No changes to the Reporting tab, AoW pages, portfolio overview, or the RFR home insights card.
- No `ngx-echarts` (wrapper dependency whose Angular cadence we do not control — Alliance D-DA-1).
- No removal of `chart.js` from the retired `pages/entity-details/` in this cycle (dead code; separate cleanup).
- No fix for the unbound `[programDescription]` (always renders the SP01 fallback paragraph — side finding, candidate for `/akili-quick`).
- No dark mode (PRMS ships light only — `design.md §dark mode`).

## 7. Affected Users, Systems, And Specs

- **Users:** all PRMS users on SP pages (Submitter, PMU, QA reviewers).
- **Client:** `dashboard-lab` (parent computeds), `program-overview` (cards), `programme-results` (+ filter service), `shared/components/pr-viz-chart` (new), `package.json`.
- **Specs touched/related:** OpenSpec `p2-3298-3303-overview-breakdown-charts` (implemented; this is its declared follow-on), archived `reporting--bilateral-centers-overview`, active family `results/intermediate-outcome-aow-visibility` (no shared files expected).
- **Guides to update at archive:** `program-overview/CLAUDE.md` invariant *"Do not upgrade this to a chart"* → rewritten to *"DOM bars for single-series rows; `pr-viz-chart` for matrices/donuts, always with `tableModel`"*; `programme-results/CLAUDE.md` gains the query-param contract.

## 8. Visual Reference

- Source: **User screenshots of current state** (3 images, 2026-08-27) + **ECharts gallery** (`https://echarts.apache.org/examples/en/index.html#chart-type-heatmap`) for the target widget types.
- Location: not persisted (screenshots inline in the request); no Figma.
- Notes: no target mockup exists yet. Offered (opt-in): generate a lightweight mockup of the new Overview grid (2 heatmaps + donut + existing cards) under `docs/specs/changes/sp-overview-echarts/mockup/` before `/akili-specify`.

## 9. Requirement Delta Preview

### ADDED
- Results tab: filter state hydrates from `category`, `status`, `origin`, `center` query params; new **center** filter dimension.
- Shared `pr-viz-chart` component (ECharts, SVG, a11y table pairing, click output).
- Overview: heatmap category × status (W1/W2); heatmap center × category (W3/Bilateral); status donut.

### MODIFIED
- Overview category rows, center rows, and status segments become navigable (click → Results tab with filters); "COMING SOON" chips removed.
- Card set/order assertion in `program-overview.component.spec.ts` updated deliberately.

### REMOVED
- `disabled` state + "COMING SOON" chips on the two indicator-category cards.

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. Hybrid (recommended)** | Keep the six DOM-bar cards (already accessible, already approved by P2-3303/3302), wire clicks; add ECharts only for what DOM can't express (heatmaps, donut). Deep-link first. | ✅ Smallest safe path; fastest; respects the a11y invariant and the approved P2-3298-3303 design |
| B. Full ECharts rewrite | Replace all six cards with ECharts series. | ❌ Rewrites approved, tested UI; loses per-row keyboard focus/tooltips unless re-implemented; larger review surface |
| C. DOM-only | Wire clicks + build a CSS-grid heatmap by hand, no library. | ❌ Cheap now, but no tooltips/visual-map/legend/transitions; every new chart type becomes a hand-rolled component |

## 11. Recommended Approach

**Option A as a 3-chunk family.** C1 and C2 run in parallel worktrees (both S, no shared files); C3 lands on top. C1 alone already unblocks P2-3408 and the "coming soon" chips even if C2/C3 slip.

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| **Count mismatch** heatmap cell vs filtered Results list: bilateral rows come from `by-program-and-centers`, which hard-filters `status_id IN (5,6,7)` (`result.repository.ts:2882`, P2-3406), while the Results tab lists all statuses | Risk | Mitigation: subtitle "results in review" on the bilateral heatmap, or accept and note in release notes. Decide at specify. |
| **Status vocabulary mapping**: summary endpoint buckets are `editing / qualityAssessed / submitted / others`; Results tab filters by `status_name`. `others` is not one filterable status | Open question | Map the three named buckets; make `others` cells non-navigable (or navigate with status unset). |
| `origin` filter value = `source_name` — exact W1/W2 vs W3/Bilateral strings are an **assumption** (P2-3400) | Dependency | Verify against real rows at specify; C1 uses a named constant map. |
| `indicator_category` field actually carries the **result-type** name (`results.service.ts:3317`) | Gotcha | Both surfaces use the same vocabulary, so category ↔ category matches; do not label it "indicator". |
| A11y: ECharts SVG marks are not natively keyboard-focusable | Risk | `viz-chart` pairs a sr-only table; heatmap cells additionally expose row/column navigation via the table; DOM cards keep native buttons. Accept per Alliance R-DA-009. |
| Bundle size | Risk | `echarts/core` + 3 series + 5 components, SVG renderer, tree-shaken (Alliance measured it acceptable); keep `chart.js` for now → temporary double dependency on the home card. |
| Section/AoW filter is inert (rows' `section` always `''`, P2-3398/3399) | Out of scope | AoW progress rows will **not** navigate until that data lands — keep them static, no chip. |
| Card-order spec assertion is deliberate (P2-3303) | Dependency | C3 edits it explicitly with the new grid. |

## 13. Success Criteria

1. Opening `…/entity-details/SP02/results?category=Innovation%20development&status=Submitted` shows the filtered list with two chips, identical to setting both dropdowns manually.
2. Clicking any overview bar/segment/heatmap cell navigates to the Results tab with the matching chips; no "COMING SOON" chip remains on the Overview.
3. Two heatmaps + status donut render on `app-pr-viz-chart` with a paired sr-only table; reduced-motion disables animation; resize keeps the chart fitted.
4. Client Jest green; coverage thresholds held; lint clean; no backend diff.
5. No raw hex in TS/templates — all chart colors from `--pr-*` tokens.

## 14. Next Step

Approve the chunking (§5), then:

```text
/akili-specify changes/sp-overview-echarts/results-tab-filter-deeplink
/akili-specify changes/sp-overview-echarts/viz-chart-echarts
/akili-specify changes/sp-overview-echarts/overview-widgets
```

(Or, single-PR variant: `/akili-specify changes/sp-overview-echarts` at Standard depth with the three tasks.)
