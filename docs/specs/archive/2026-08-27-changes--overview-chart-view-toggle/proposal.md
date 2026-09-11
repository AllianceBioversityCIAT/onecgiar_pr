# Proposal: Bars ↔ heatmap view toggle on the SP Overview matrix cards

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/overview-chart-view-toggle` |
| Type | Change |
| Approval Mode | gated |
| Status | Proposed |
| Date | 2026-08-27 |
| Author | j.cadavid@cgiar.org (via /akili-propose; requested 2026-08-27 during overview-widgets HITL) |
| Depends on | none (family `sp-overview-echarts` archived 2026-08-27 — this builds on its shipped code) |
| Parallel-safe | yes (touches only `program-overview/**`) |
| Supersedes | **OVW-DD-4** of archived `changes/sp-overview-echarts/overview-widgets` ("two new heatmap cards, not a bars↔heatmap toggle") — user overruled after seeing the live render |
| Reference implementation | Alliance `dashboard-advanced-analytics` @ `831388cd` — R-DA-004 bars↔heatmap toggle: same fetched matrix for both views, dataset-identity morph via `UniversalTransition`, keyboard-operable segmented control, instant swap under reduced motion |

## 2. Intent

Give each of the two Overview matrix cards ("W1/W2 results by category and status", "W3/Bilateral results by center and category") a two-option view switch — **heatmap** (current) or **horizontal stacked bars** — like Alliance's dashboard, so users can read the same matrix as density or as magnitude, whichever fits their question.

## 3. Problem / Current Behavior

Both cards render only as heatmaps (`app-pr-viz-chart` + `heatmapOption` from `program-overview.charts.ts`). A heatmap answers "where is the concentration?" but is weak at "which row is biggest overall?" — stacked bars answer the latter. Alliance solved the same tension with a per-card toggle over one shared matrix. OVW-DD-4 rejected the toggle to keep the first delivery small; the user has now seen the live cards and wants the option.

**Already in place (zero new dependencies):** `pr-viz-chart` registers `BarChart` and `UniversalTransition`; both cards' data is a `HeatmapModel` computed in `dashboard-lab` with per-cell `link`s; `emitLink` handles navigation; KZ-SPO-1 (axis `interval: 0` + display abbreviations) applies to the bar view's category axis too.

## 4. Proposed Outcome

1. Each matrix card gains a compact **segmented control** (two real buttons: "Heatmap" · "Bars", `aria-pressed`, keyboard-native) in the card heading row.
2. **Bars view:** one horizontal stacked bar per row (category or center), one stack segment per column (status or category), colored from the existing violet ramp — same `HeatmapModel`, no refetch, no new computeds in the parent.
3. **Clicks keep navigating:** a stack segment resolves to the same cell `link` (`Other`/`Not specified` segments stay non-navigable).
4. **Morph:** switching views animates via `universalTransition` (shared dataset identity); under `prefers-reduced-motion` the swap is instant (wrapper already forces `animation: false`).
5. The sr-only `tableModel` is identical in both views (same matrix); the toggle state is per-card, session-local, defaulting to **heatmap** (the shipped view).

## 5. Scope

- **In:** `program-overview.component.{ts,html,spec}` (toggle state signals + control markup), `program-overview.charts.ts` (+`stackedBarOption(model, ramp)` + `barLinkFromClick`; spec), morph wiring (dataset ids on both options).
- **Out:** parent `dashboard-lab` (models unchanged); Results tab; the donut and bar-row cards; persistence (URL/localStorage — MAY later); backend.

## 6. Non-Goals

- No third view type; no per-user saved preference in v1; no changes to the matrices or links; no new tokens (ramp + existing text/border tokens only); no `chart.js`.

## 7. Affected Users, Systems, And Specs

All PRMS users on SP Overview. Client only, `program-overview/**`. Supersedes OVW-DD-4 (recorded above; the archived design is history, not edited). Kaizen KZ-SPO-1 cited in Scope/Risks.

## 8. Visual Reference

- Source: None yet — the Alliance toggle (commit `831388cd`, `project-dashboard-card` bars↔heatmap) is the behavioral reference; current cards' screenshots (2026-08-27) are the base state. Optional mockup offer stands (segmented control placement) — likely unnecessary: the control follows the platform's existing pill/button styles.

## 9. Requirement Delta Preview

### ADDED
- Per-card view toggle (heatmap default ↔ stacked bars); stacked-bar rendering of the existing matrices; morph transition with reduced-motion fallback; segment click → same navigation.

### MODIFIED
- Card heading rows gain the segmented control (order/copy of `<h2>` unchanged — the pinned assertion survives).

### REMOVED
- None (OVW-DD-4's *decision* is superseded, but no shipped behavior is removed — heatmap remains the default).

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. Toggle in `program-overview`, second pure builder (recommended)** | `viewMode` signal per card; `stackedBarOption()` sibling of `heatmapOption()` sharing dataset ids for the morph; same `tableModel`, same click→link plumbing. | ✅ Smallest path; parent untouched; mirrors Alliance R-DA-004 |
| B. Two `app-pr-viz-chart` hosts per card, CSS-swapped | No option rebuilding. | ❌ Two engine instances per card, no morph, double a11y tables |
| C. Generic view-switcher inside `pr-viz-chart` | Reusable. | ❌ Widens the shared wrapper's contract for one consumer; premature |

## 11. Recommended Approach

Option A. **Lite–Standard depth (Standard if morph proves fiddly), ~250–320 LOC incl. specs, 3 tasks** (builder+spec · toggle UI+state · morph/a11y polish). Single PR.

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| `universalTransition` needs matching dataset/series ids across both options | Risk | Alliance solved it (dataset identity); fallback per their D-DA-7: config-level crossfade if the morph misbehaves — decide at specify |
| Stacked bars with many zero cells look sparse | Risk | Rows already drop all-zero; zero segments render as nothing (stacked bars tolerate this natively) |
| Bar view value labels vs KZ-SPO-1 | Dependency | Category axis (Y in horizontal bars) reuses the abbreviation map; totals label at bar end optional — decide at specify |
| Toggle state resets on program switch | Accepted | Session-local per card; persistence is a later MAY |
| Rendered look of the morph/bars | Gap | jsdom-blind → HITL/T6 pass, same as the family (requirements must map this gate) |

## 13. Success Criteria

1. Each matrix card switches heatmap ↔ stacked bars with a keyboard-operable control; heatmap is the default; state survives within the session.
2. Bar segments navigate exactly like the corresponding heatmap cells (incl. non-navigable `Other`/`Not specified`).
3. Same sr-only table in both views; reduced-motion swap is instant; full client suite + lint + build green; no new dependency, no hex.

## 14. Next Step

```text
/akili-specify changes/overview-chart-view-toggle
```
