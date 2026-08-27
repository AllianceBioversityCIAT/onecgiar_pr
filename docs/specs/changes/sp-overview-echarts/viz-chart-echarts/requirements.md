# `changes/sp-overview-echarts/viz-chart-echarts` — Requirements

## 1. Module / Feature

- **Module:** `onecgiar-pr-client` → `shared/components` (infrastructure component, no page of its own)
- **Sub-feature:** Apache ECharts dependency + one shared, accessible chart wrapper + token resolver
- **Owner:** j.cadavid@cgiar.org
- **Status:** approved (2026-08-27)
- **Depth:** Lite · **Type:** Change · **Approval Mode:** gated
- **Parent Spec:** `changes/sp-overview-echarts` (`../family.md` row #2 · `Depends on: none` · `Parallel-safe: yes`)
- **Linked proposal:** `./proposal.md` · **Reference:** Alliance `viz-chart` @ `831388cd` (D-DA-1)

## 2. Context

PRMS has no shared chart primitive: `chart.js` is imported directly in two files (RFR home insights, dead `entity-details` route), the Overview draws bars in local Tailwind, and heatmaps/legends/visual maps would each be hand-rolled. `colors.scss` already ships a chart ramp (`--pr-chart-1..4`, `--pr-chart-2-muted`) with the rule *"Status colours are NOT for charts"*. Alliance solved the same problem with an in-house wrapper over `echarts/core` (SVG renderer, a11y table pairing, click output) — this spec ports it. Sibling #3 is the first consumer; **this spec ships no user-visible change on its own.**

## 3. In Scope / Out of Scope

### In scope
- Add `echarts` to the client dependencies (the **only** `package.json` touch in the family — `../family.md` §3).
- One shared standalone wrapper component; one token-resolution util; Jest specs; registration in `docs/ux-ui/design.md §8` at archive.

### Out of scope
- Replacing `chart.js` anywhere; deleting the dead route; any page/consumer wiring (sibling #3); dark mode; canvas renderer; `ngx-echarts`.

## 4. Personas Affected

| Persona | What changes |
|---|---|
| Developers (PRMS client) | One sanctioned way to render a chart with tokens, a11y, and clicks. |
| End users | None until a consumer ships (sibling #3). |

## 5. User Stories

- **`VCE-US-1`** As a PRMS frontend developer, I want a shared chart component that takes an ECharts option and renders it with PRMS tokens, a paired accessible table, and click events, so that every chart in the app is consistent and accessible without re-solving engine setup.

## 6. Functional Requirements

### Required (MUST)

- **`VCE-R-1` Render & lifecycle.** The wrapper MUST render the supplied chart option as SVG inside its host, resize with its container, and dispose the engine instance when destroyed.

#### Scenario: Render and resize
- GIVEN a consumer binds a valid option and a table model
- WHEN the component initializes and later its container changes width
- THEN an SVG chart is rendered and re-fitted to the new width
- BUT it must NOT leak engine instances or observers after destroy (dispose + disconnect)
- AND IT MUST register only the series/components it declares (bar, pie, heatmap; tooltip, grid, legend, visual map, dataset, title) — no full-bundle import

- **`VCE-R-2` Accessibility pairing.** Every rendered chart MUST be accompanied by a visually-hidden data table built from a declarative table model; a chart supplied without a table model MUST NOT render silently.

#### Scenario: Chart without table
- GIVEN a consumer binds an option but no table model (and does not opt out)
- WHEN the component renders
- THEN no chart is drawn and a visually-hidden `role="alert"` warning is emitted
- BUT it must NOT throw
- AND IT MUST render the chart when the consumer explicitly opts out (`requireTable=false`)

#### Scenario: Table content
- GIVEN a table model with caption, headers, and rows
- WHEN rendered
- THEN a `<table>` exists with `<caption>`, column headers, and a row-header cell per row, hidden visually but exposed to assistive tech

- **`VCE-R-3` Interaction & motion.** The wrapper MUST expose chart click events to the consumer, and MUST disable engine animation when the user prefers reduced motion.

#### Scenario: Click propagation
- GIVEN a rendered chart
- WHEN the user clicks a mark
- THEN the consumer receives the engine's click payload (series/data indices, name, value) unchanged

#### Scenario: Reduced motion
- GIVEN `prefers-reduced-motion: reduce`
- WHEN options are applied
- THEN the option handed to the engine carries `animation: false`
- BUT it must NOT alter the consumer's option object in place

- **`VCE-R-4` Tokens.** Chart colors MUST be resolved at runtime from PRMS CSS custom properties; no hex literal may appear in the wrapper, the util, or any consumer's TS.

#### Scenario: Token resolution
- GIVEN the document styles define `--pr-chart-1..4` and `--pr-chart-2-muted`
- WHEN a consumer asks the util for the chart palette
- THEN it receives the resolved values in ramp order plus the muted bilateral series
- BUT it must NOT expose `--pr-status-*` colors as chart series (colors.scss rule) — status tokens are only available under an explicit, separately named accessor for status-keyed widgets
- AND IT MUST return empty strings (never a hex fallback) when a token is undefined, so a missing token is visible in review instead of masked

### Should (SHOULD)
- **`VCE-R-5`** A loading input SHOULD show a skeleton overlay and hide the chart from assistive tech while loading.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Bundle | Tree-shaken `echarts/core` + declared modules only; record `ng build` main-bundle delta in `execution.md` (expected < ~350 kB raw / < ~110 kB gz). |
| Test isolation | Specs mock `echarts/core`; no real engine in jsdom. |
| Compatibility | Angular 21 standalone + signals; OnPush; PrimeNG skeleton already in use. |

## 8. Acceptance Criteria

- **`VCE-AC-1`** `npm ls echarts` resolves; `npx ng build` succeeds; bundle delta recorded.
- **`VCE-AC-2`** Full client Jest green (`npx jest --silent --reporters=summary --no-coverage`), coverage thresholds held, lint clean.
- **`VCE-AC-3`** `grep -nE "#[0-9a-fA-F]{3,8}\b" shared/components/<wrapper>/*.ts shared/utils/chart-tokens.util.ts` returns 0 hits.
- **`VCE-AC-4`** `git diff --stat` touches only `package.json`, `package-lock.json`, `shared/components/<wrapper>/**`, `shared/utils/chart-tokens.util*`.

## 9. Defect Classes → Gates

| Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|
| Chart renders without its table (a11y regression at the source) | VCE-AC-2 spec: option + no table → `setOption` not called, alert present | Removing the `requireTable` guard calls `setOption` → red |
| Engine/observer leak | Spec asserting `dispose()` + `disconnect()` on destroy | Dropping `ngOnDestroy` → red |
| Reduced motion ignored | Spec with `matchMedia` mock → asserts `animation:false` in `setOption` arg and original object untouched | Spreading into the same reference → "untouched" assertion fails |
| Click not propagated | Spec: captured `on('click')` handler invoked → output emitted with same payload | Removing the `on` registration → red |
| Hex in TS / status tokens leaked as series | VCE-AC-3 grep + spec asserting the requested token-name set (jsdom returns `''` for custom props, so assert *names*, not values — Alliance KZ-017) | Adding `--pr-status-approved-fg` to the palette list → set assertion fails |
| ESM import breaks Jest | VCE-AC-2 full suite (a bare `import 'echarts/core'` outside the mock would fail transform) | Removing `jest.mock('echarts/core')` from the spec |
| **Rendered output is wrong** (colors, layout, legibility) | **No automated gate in jsdom** — deferred to sibling #3's HITL visual check (T6) on a real chart; this spec has no consumer to look at | — (explicit, accepted: infra spec) |
| Bundle bloat | VCE-AC-1 recorded delta vs threshold | Importing `echarts` root instead of `echarts/core` blows the budget |

## 10. Requirement ID Index

| ID | Summary | Scenario(s) | Covered by task |
|---|---|---|---|
| VCE-R-1 | Render, resize, dispose, tree-shaken registration | Render and resize | VCE-T-1 |
| VCE-R-2 | A11y table pairing | Chart without table · Table content | VCE-T-1 |
| VCE-R-3 | Click output, reduced motion | Click propagation · Reduced motion | VCE-T-1 |
| VCE-R-4 | Token resolution, no hex, status tokens fenced | Token resolution | VCE-T-2 |
| VCE-R-5 | Loading skeleton | — | VCE-T-1 |

## Required cross-references
- `docs/ux-ui/design.md §7` tokens (chart ramp) · `§8` component inventory (registration at archive) · `docs/trd/trd.md` frontend patterns · `onecgiar-pr-client/CLAUDE.md §5` (SCSS single source of truth) · parent `../proposal.md` §5 C2.
