# Proposal: `viz-chart` — shared ECharts wrapper for PRMS

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/sp-overview-echarts/viz-chart-echarts` |
| Parent Spec | `changes/sp-overview-echarts` (`../family.md`, row #2) |
| Type | Change |
| Approval Mode | gated |
| Status | Proposed (approved as chunk of parent, 2026-08-27) |
| Date | 2026-08-27 |
| Author | j.cadavid@cgiar.org |
| Depends on | none |
| Parallel-safe | yes |
| Reference | `alliance-research-indicators-main` `client/research-indicators/src/app/shared/components/viz-chart/` @ `831388cd` (design D-DA-1) |

## 2. Intent

Install Apache ECharts in `onecgiar-pr-client` the same way Alliance did and ship **one** shared chart wrapper so every future PRMS chart (overview heatmaps/donut first) uses the same engine, tokens, a11y contract, and click plumbing.

## 3. Problem / Current Behavior

- `shared/components/` has **no** chart/visual primitive; the overview draws bars in local Tailwind.
- `chart.js ^4.5.1` + `chartjs-plugin-datalabels` exist but are used directly (`Chart` from `chart.js/auto`) only on the RFR home insights card and the dead `pages/entity-details/` route — no wrapper, no tokens, no a11y pairing, no click contract.
- Heatmaps, visual maps, legends, tooltips, and transitions would each need hand-rolling.

## 4. Proposed Outcome

`shared/components/pr-viz-chart/pr-viz-chart.component.{ts,html,scss}` (standalone, OnPush):

| Concern | Decision (ported from Alliance, PRMS-adapted) |
|---|---|
| Engine | `echarts` ^6.x, imports from `echarts/core`; `echarts.use([...])` registers exactly: `BarChart`, `PieChart`, `HeatmapChart`, `TooltipComponent`, `GridComponent`, `LegendComponent`, `VisualMapComponent`, `DatasetComponent`, `TitleComponent`, `SVGRenderer`, `UniversalTransition`. No `ngx-echarts`. |
| Inputs | `options: EChartsOption`, `tableModel: {caption, headers, rows, summary?}`, `chartTitle`, `height`, `loading`, `requireTable=true` |
| Outputs | `chartClick: ECElementEvent`, `chartInit: ECharts` |
| A11y | Paired visually-hidden `<table>` rendered from `tableModel`; `requireTable` emits a `role="alert"` warning when a chart ships without one; `prefers-reduced-motion` → `animation: false` |
| Theme | Helper `shared/utils/chart-tokens.util.ts` resolves `--pr-color-primary-300/400`, `--pr-chart-2`, `--pr-chart-2-muted`, status colors, neutral ramp via `getComputedStyle` — **no hex in TS** (client CLAUDE.md §5 single source of truth = SCSS) |
| Layout | `ResizeObserver` → `chart.resize()`; `dispose()` on destroy; PrimeNG `p-skeleton` loading overlay |

Registered in `docs/ux-ui/design.md §8` component inventory at archive.

## 5. Scope

- **In:** dependency install, wrapper component + util + Jest specs (init/dispose, click emission, table pairing enforcement, reduced-motion option, resize), a Storybook-free demo route is **not** required — sibling #3 is the first consumer.
- **Out:** replacing `chart.js` on the RFR home insights card or deleting the dead route (later cleanup); any consumer wiring.

## 6. Non-Goals

- No dark mode (PRMS light-only); no GSAP/extra animation systems; no canvas renderer.

## 7. Affected Users, Systems, And Specs

No user-visible change on its own. Files: `package.json`, `package-lock.json`, `shared/components/pr-viz-chart/**`, `shared/utils/chart-tokens.util.ts`. Consumed by sibling #3.

## 8. Visual Reference

- Source: ECharts gallery (`https://echarts.apache.org/examples/en/index.html#chart-type-heatmap`) + Alliance `viz-chart` source. No mockup needed (infrastructure component).

## 9. Requirement Delta Preview

### ADDED
- `echarts` dependency; `app-pr-viz-chart` component; `chart-tokens.util`.

### MODIFIED / REMOVED
- None.

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. Port Alliance `viz-chart` (echarts/core + SVG, in-house)** | Proven in a sibling CGIAR Angular app; tree-shaken; a11y table enforced structurally. | ✅ |
| B. `ngx-echarts` | Faster first render. | ❌ External Angular-cadence dependency; no a11y pairing; Alliance rejected it (D-DA-1) |
| C. Extend `chart.js` | Already installed. | ❌ No heatmap/visual-map without plugins; no SVG; two engines long-term |

## 11. Recommended Approach

Option A. ~250 LOC incl. tests. Lite depth.

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| Bundle size | Risk | Tree-shaken `echarts/core` + 3 series + SVG; record `ng build` stats delta in `execution.md` |
| Temporary double dependency (`chart.js` stays) | Accepted | Removal is a follow-up cleanup |
| Jest + ECharts SVG in jsdom | Risk | Alliance specs mock `echarts.init`; reuse that approach |
| `package-lock.json` churn vs sibling #1 | Dependency | #1 must not touch `package.json` (family §3) |

## 13. Success Criteria

1. `npm ls echarts` resolves; `ng build` succeeds with no new warnings; bundle delta recorded.
2. `app-pr-viz-chart` renders an SVG chart from `options`, emits `chartClick`, renders the sr-only table, disables animation under reduced motion, resizes with its container.
3. Jest green; coverage thresholds held; no hex in TS.

## 14. Next Step

```text
/akili-specify changes/sp-overview-echarts/viz-chart-echarts
```
