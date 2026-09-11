# Proposal: Radial ToC map on the SP Overview (SP → AoW → HLO/IO, indicator progress)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/overview-toc-map` |
| Type | Change (new visualization, client-only v1) |
| Approval Mode | gated |
| Status | Proposed |
| Date | 2026-08-27 |
| Author | j.cadavid@cgiar.org (requested 2026-08-27 during overview-chart-view-toggle CVT-T-3 HITL: "algo así complementario al progress by area of work… tenemos SP, AOW, HLO o IO/Outcome, Indicator, Target and progress") |
| Depends on | `changes/overview-chart-view-toggle` landing (shares `program-overview/**`); scout inventory 2026-08-27 (recorded below) |
| Parallel-safe | no vs overview-chart-view-toggle (same folder); yes vs everything else |
| Reference implementation | Alliance radial program map (screenshot 2026-08-27): center = program, spokes = AoWs, leaves = ToC nodes; outline size ∝ hierarchy level, inner disc ∝ share of linked $; hover tooltip with node facts |

## 2. Intent

Add a **Theory-of-Change map** to the SP Overview, complementary to "Progress by area of work": one radial picture of the whole program — SP at the center, its Areas of Work around it, each AoW's ToC outputs/outcomes (HLO/IO) as leaves — with **indicator progress vs target encoded on every node**, so a leader sees at a glance where the program's ToC is advancing and where it is stalled.

## 3. Problem / Current Behavior

"Progress by area of work" collapses each AoW to one `done/total` row. The structure underneath — which HLO/IO nodes carry indicators, their targets, and how far along each is — is only reachable by drilling into each AoW's page one at a time. Alliance ships a radial program map for exactly this "whole tree at a glance" need (theirs encodes linked budget; ours encodes indicator progress, which is the data PRMS has).

**Already in place (verified by scout, 2026-08-27 — zero new endpoints needed for v1):**
- `dashboard-lab` already loads the full tree for the current Overview: `clarisa-global-units` (AoWs as `Unit[]` + `globalProgress`), one `toc-results` call per AoW (`tocByKey`, via `loadAllTocs()`), plus `toc-results/intermediate-outcomes` and `toc-results/2030-outcomes`. The existing `overviewAowProgress()` is *derived from this same data*.
- Each ToC node (`TocResultResponse`) carries `category` (OUTPUT/OUTCOME/EOI), `result_title` (code regex-parsed by the existing `splitGroupTitle()`), `is_aow`, and `indicators[]` with `target_value_sum`, `actual_achieved_value_sum`, `progress_percentage`, `targets_by_center`.
- `pr-viz-chart` (echarts 6.1.0) does not yet register `TreeChart`/`GraphChart`, but both are exported by the installed package — registration is 3 local edits (import, `REGISTERED_ECHARTS_MODULES`, `EChartsOption` union), no new dependency.

## 4. Proposed Outcome

1. A full-width **"Theory of Change map"** card on the SP Overview (near "Progress by area of work", outside the W1/W2 · W3/Bilateral separators — it is program-wide).
2. **Radial layout:** SP node at center → ring of AoW nodes (AOW01…) → each AoW's HLO/IO nodes as leaves. Intermediate/2030 outcomes hang off the center as their own two program-level branches (mirrors the Overview's existing X-cutting grouping).
3. **Node encoding (adapting Alliance to PRMS data):** ring/outline size ∝ hierarchy level; inner-disc fill ∝ **indicator progress** — `done/total` (indicators with `actual_achieved_value_sum > 0`), the same rule "Progress by area of work" already uses, so the two cards can never disagree.
4. **Tooltip:** node code + title, level (Output/Outcome/EoI), indicators n, Σtarget, Σachieved, progress %. Indicators are tooltip/table content in v1, **not** nodes (leaf count stays readable).
5. **Click:** an AoW node navigates to its existing `entity-aow` page; HLO/IO nodes are tooltip-only in v1.
6. **A11y:** the wrapper's mandatory `tableModel` flattens the tree — one row per node: AoW, code, title, level, indicators, target, achieved, progress %. The table is the keyboard path (family precedent).

## 5. Scope

- **In:** `pr-viz-chart` chart registration (3-edit local change); a pure `tocMapOption(model, tokens)` + `tocMapTable(model)` + click resolver in `program-overview.charts.ts` (or a sibling file if it outgrows it); a `TocMapModel` computed in `dashboard-lab` (parent owns data — folder invariant) reusing `tocByKey`/`indicatorsByAow()`; the new card + host in `program-overview`; Jest for builders/model/table.
- **Out (v1):** new endpoints; result-counts per ToC node (no linkage data on any payload — P2-3395); indicator-level nodes; editing; filters (center chips like Alliance's header — later MAY); persistence.

## 6. Non-Goals

- Not a replacement for "Progress by area of work" (complementary; same progress rule).
- No budget/$ encoding (PRMS Overview has no per-node financial linkage; that is Alliance's dimension, ours is indicator progress).
- No force-physics playground: layout must be deterministic (same data → same picture).

## 7. Affected Users, Systems, And Specs

All PRMS users on SP Overview. Client only (`shared/pr-viz-chart` + `dashboard-lab/**`). Extends the `sp-overview-echarts` family's wrapper contract (chart registration — the wrapper's own spec history notes registration is additive).

## 8. Visual Reference

Alliance radial map screenshot (2026-08-27, user-provided): hub-and-spoke radial with per-node tooltips and a two-glyph legend ("outline size ∝ hierarchy level", "inner disc ∝ share"). PRMS adaptation swaps the $-share encoding for indicator progress and uses the violet ramp + existing tokens.

## 9. Requirement Delta Preview

### ADDED
- ToC map card (radial SP→AoW→HLO/IO); node progress encoding; tooltip contract; AoW click-through; flattened a11y table; `TreeChart` (or `GraphChart`) registration in the shared wrapper.

### MODIFIED
- `pr-viz-chart` registered-modules list + option union (additive).
- Overview grid gains one full-width card (heading contract 7 → 8 — deliberate, recorded edit like CVT-A-3's 8→7).

### REMOVED
- None.

## 10. Approach Options

| Option | Description | Verdict |
|---|---|---|
| **A. ECharts `tree` series, radial layout (recommended)** | Native hierarchy: `layout: 'radial'`, deterministic geometry, symbolSize per node, tooltip formatter; one series, no physics. | ✅ Deterministic, cheapest to spec/test; hierarchy IS a tree |
| B. ECharts `graph` series, force layout | Closest to Alliance's look (organic clusters). | ❌ Non-deterministic positions (physics), jsdom-untestable geometry, jittery on data change; the aesthetic gain doesn't pay for the determinism loss |
| C. ECharts `graph`, circular layout | Deterministic graph. | ➖ Viable fallback if `tree`'s radial spacing disappoints at HITL — same data model, swap decided at execution like CVT-R-5's morph fallback |
| D. Custom SVG (no ECharts) | Full control. | ❌ Re-implements tooltip/resize/a11y the wrapper already gives |

## 11. Recommended Approach

Option A with C as the pre-approved execution fallback. **Standard depth, ~380–480 LOC incl. specs, 3–4 tasks** (wrapper registration + pure builders/table · `TocMapModel` in dashboard-lab · card + wiring · HITL). Single PR after `overview-chart-view-toggle` merges.

## 12. Risks, Dependencies, And Open Questions

| Item | Kind | Note |
|---|---|---|
| `is_aow: false` nodes repeat under EVERY AoW in `tocByKey` | Risk | Model must dedupe: render once under a "Program-level" branch (or first AoW) — decide at specify; silently double-counting nodes is the failure mode |
| No HLO/IO `code` field — regex-parsed from `result_title` (`splitGroupTitle`, returns null on mismatch) | Dependency | Nodes with null code label by truncated title; already-solved parsing, reuse it |
| Node count at scale (5+ AoWs × ~6–10 nodes) | Risk | Radial tree handles ~60 leaves; label strategy (leaf labels off, tooltip on) — decide at specify; HITL gates legibility |
| `progress_percentage` is a STRING on the payload | Dependency | Parse like `aow-hlo-table.getProgress()` does, or stick to the `done/total` rule (recommended — consistency with the AoW card) |
| Map needs `loadAllTocs()` completed (N+2 calls) | Dependency | Already fired for the Overview; card shows the wrapper's loading state until then |
| Tree geometry is jsdom-blind | Gap | HITL/T6 gate, family precedent; option-shape specs cover structure/encodings |
| OQ-1: where exactly does the card sit (above vs below "Progress by area of work")? | Open question | Default: directly below it, span 12 |
| OQ-2: do Intermediate/2030 branches render in v1 or is v1 AoW-only? | Open question | Default: yes, as two program-level branches (data already loaded) |
| OQ-3: heading contract 7→8 | Open question | Default: yes, new `<h2>` "Theory of Change map", pinned assertion edited deliberately |

## 13. Success Criteria

1. One deterministic radial map renders the SP's full loaded ToC tree with node progress encoding consistent with "Progress by area of work" (`done/total`), tooltips per node, AoW click-through, and a complete flattened a11y table.
2. Zero new HTTP calls; zero new npm dependencies; chart registration additive with all existing wrapper tests green.
3. Full client suite + lint + build green; no hex; HITL/T6 pass on legibility at 1280/1024 recorded (layout fallback C pre-approved).

## 14. Next Step

```text
/akili-specify changes/overview-toc-map
```
