# `changes/sp-overview-echarts/viz-chart-echarts` — Design

## 1. Summary

- **Spec:** `changes/sp-overview-echarts/viz-chart-echarts` · **Depth:** Lite · **Status:** approved (2026-08-27)
- **Linked:** `./requirements.md` (VCE-R-1..5) · parent `../proposal.md` §5 C2 · `../family.md` row #2 · Alliance `viz-chart` @ `831388cd`
- **One-liner:** Add `echarts` and port Alliance's wrapper as `app-pr-viz-chart` (PRMS `pr-*` naming), plus a token util that reads `--pr-chart-*` at runtime. Infrastructure only; first consumer is sibling #3.
- **Budget (Step 2.4):** **2 tasks · ~280 LOC (≈150 src + ≈130 spec) · 1 review round.** Upper edge of Lite but a single-component port with a proven reference — kept Lite.

## 2. Architecture Overview

### 2.1 Where this lives

```
onecgiar-pr-client/
├── package.json / package-lock.json            + echarts ^6.x   (only family touch — ../family.md §3)
└── src/app/shared/
    ├── components/pr-viz-chart/
    │   ├── pr-viz-chart.component.ts           standalone · OnPush · selector app-pr-viz-chart
    │   ├── pr-viz-chart.component.html         host div + skeleton overlay + sr-only table / alert
    │   ├── pr-viz-chart.component.scss         :host { display:block } only (Tailwind-first rule)
    │   └── pr-viz-chart.component.spec.ts
    └── utils/
        ├── chart-tokens.util.ts                resolveChartTokens() · resolveStatusTokens() · CHART_TOKEN_NAMES
        └── chart-tokens.util.spec.ts
```

Naming deviates from the proposal's `viz-chart/` to match the existing `pr-table` / `pr-filter-select` convention (`VCE-DD-2`); parent docs swept.

### 2.2 Component contract

| Surface | Definition |
|---|---|
| Inputs | `options` (composed ECharts option type, nullable) · `tableModel` `{caption, headers, rows, summary?}` · `chartTitle` · `height` (default `300px`) · `loading` · `requireTable` (default `true`) |
| Outputs | `chartClick` (engine `ECElementEvent`, unchanged) · `chartInit` (engine instance, for consumers needing `dispatchAction`) |
| Lifecycle | `afterNextRender`/`ngAfterViewInit`: `init(container, undefined, {renderer:'svg'})`, register `click`, start `ResizeObserver`; an `effect` re-applies options when inputs change; `ngOnDestroy` disconnects + disposes |
| Engine registration | Module-level `use([...])` with exactly: `BarChart, PieChart, HeatmapChart, TooltipComponent, GridComponent, LegendComponent, VisualMapComponent, DatasetComponent, TitleComponent, SVGRenderer, UniversalTransition` — imports from `echarts/core`, `echarts/charts`, `echarts/components`, `echarts/renderers`, `echarts/features` only (VCE-R-1 `AND IT MUST`) |
| A11y gate | If `options` present and `requireTable && !tableModel` → `chart.clear()` + render sr-only `role="alert"`; else `setOption(opts, notMerge=true)` |
| Reduced motion | `matchMedia('(prefers-reduced-motion: reduce)')` read at apply time; when true, `setOption` receives a **shallow copy** with `animation:false` (VCE-R-3 `BUT`) |
| Loading | `p-skeleton` overlay with `role="status"`; chart host gets `aria-hidden` while loading (VCE-R-5) |
| Table | Tailwind `sr-only` `<table>`; `<caption>`; `<th scope="col">` headers; first cell of each row `<th scope="row">` |

### 2.3 Token util
- `resolveChartTokens()` → `{ ramp: [chart-1, chart-2, chart-3, chart-4], primary (--pr-color-primary-300), primaryStrong (-400), bilateralMuted (--pr-chart-2-muted), textSecondary, border }` via `getComputedStyle(document.documentElement)`; `''` when undefined (no hex fallback — VCE-R-4).
- `resolveStatusTokens()` → the `--pr-status-*-fg/bg` pairs, **separate function, separately named**, documented as "for status-keyed widgets only" — the chart palette never includes them (colors.scss rule).
- `CHART_TOKEN_NAMES` / `STATUS_TOKEN_NAMES` exported `as const` so specs assert the requested **set** (jsdom returns `''` for custom properties — Alliance KZ-017).
- Plain functions, not signals: PRMS is light-only (no theme signal to react to). Consumers wrap in a `computed` if they need memoization.

## 3. Data Model Changes
None.

## 4. API Surface
None.

## 5. Server Workflow
N/A.

## 6. Frontend Plan

### 6.1 Routes / modules
No route. No demo page — sibling #3 is the proving ground.

### 6.2 Design system usage
Tokens §2.3; `p-skeleton` (PrimeNG, already used in notifications); Tailwind utilities only. Registration in `docs/ux-ui/design.md §8` inventory → pending item at archive (spec branch).

## 7. Security
None.

## 8. Performance & Capacity
- Tree-shaken core; SVG renderer (crisper for small datasets, DOM-inspectable in tests/HITL).
- Bundle delta measured with `npx ng build` before/after and recorded in `execution.md`; guideline < ~350 kB raw / ~110 kB gz for the initial chunk delta. **The number is not evidence if the build was not run twice on the same commit base** — report the pair, not one reading.

## 9. Observability
None.

## 10. Testing Plan

| Spec | Strategy / cases |
|---|---|
| `pr-viz-chart.component.spec.ts` | `jest.mock('echarts/core', () => ({ use: jest.fn(), init: jest.fn(() => mockInstance) }))` + `MockResizeObserver` + `matchMedia` mock (Alliance pattern). Cases: init calls `init(..., {renderer:'svg'})`; options+table → `setOption` called with `notMerge`; options w/o table → `setOption` **not** called + alert in DOM; `requireTable=false` → renders; reduced motion → arg has `animation:false` and input object lacks it; click handler → `chartClick` emitted with same payload; resize trigger → `resize()`; destroy → `dispose()` + `disconnect()`; loading → skeleton present + `aria-hidden` |
| `chart-tokens.util.spec.ts` | requested-name set equals `CHART_TOKEN_NAMES`; status names never in chart set; undefined token → `''` |
| Jest/ESM | If the full suite fails on `echarts` ESM despite the mock (e.g. a type-only import compiled to runtime), add `"transformIgnorePatterns": ["node_modules/(?!(.*\\.mjs$|echarts|zrender))"]` to the `package.json` jest block — record in `execution.md`; otherwise leave config untouched |

## 11. Backwards Compatibility
Additive. `chart.js` stays for its two current users (removal is a later cleanup).

## 12. Design Decisions

| # | Decision | Rationale / rejected |
|---|---|---|
| `VCE-DD-1` | In-house wrapper over `echarts/core` + SVG; **no `ngx-echarts`** | Full tree-shake, renderer control, a11y table enforced structurally; proven in Alliance (D-DA-1). Rejected: `ngx-echarts` (extra Angular-cadence dep, no a11y pairing), extending `chart.js` (no heatmap/visualMap, canvas only). |
| `VCE-DD-2` | Name `pr-viz-chart` / `app-pr-viz-chart` | Matches `shared/components/pr-*` convention; keeps the "viz-chart" identity from the reference. |
| `VCE-DD-3` | Tokens via plain resolver functions, status tokens fenced in a separate accessor | Light-only app → no theme signal needed; `colors.scss` says status colours are not chart colours — the API shape enforces it. |
| `VCE-DD-4` | Register **only** bar/pie/heatmap + 5 components now | Exactly what sibling #3 needs; more series wait for a consumer (Alliance D-DA-8 stance). |
| `VCE-DD-5` | No hex fallback in the util | A missing token must be *visible* in review, not masked by a default (Alliance KZ-017). |
| `VCE-DD-6` | Skeleton via PrimeNG `p-skeleton` | Already in the bundle and in use; no new primitive. |

**Reversion challenge (Step 2.3):** none triggered — purely additive; `chart.js` untouched.

## 13. Open Gaps & Follow-ups
- Visual correctness of a real chart is unverifiable here (no consumer) → sibling #3 HITL/T6.
- `chart.js` retirement + dead `entity-details` route cleanup → separate quick/cleanup spec.
- `docs/ux-ui/design.md §8` registration → archive pending item.
