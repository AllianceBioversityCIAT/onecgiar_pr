# Proposal — The AoW row's identity column starves to zero at 1280 / 1100 / 900

**One line:** at three of the five supported widths the AoW row's code+name track collapses to ~0px and the AoW disappears — silently, with no horizontal scrollbar to reveal it.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/aow-identity-column-starvation` |
| Type | **Change** (defect) |
| Date | 2026-09-02 |
| Source | Measured by `changes/aow-row-gesture-split` `RGS-T-4`; carried out of that spec rather than absorbed |
| Status | **Proposal — not yet specified.** Raised at the `RGS-T-4` gate, owner-approved as its own spec |

## 2. The defect, measured

Browser pass on `SP04/overview`, fresh `goto` per width, every reading gated on `skeletons === 0` and `rows > 0`, each condition double-read:

| Width | Scope | Row `grid-template-columns` | Identity track | Verdict |
|---|---|---|---|---|
| 1600 | off / on | `303.6px 240 54 107 112` | 303.6px, name 243–284px | ✅ visible |
| **1280** | off / on | **`0px` 224 54 107 112** | **0px — invisible, all 5 rows** | ❌ |
| **1100** | off / on | **`0px` 168 54 112** | **0px — invisible, all 5 rows** | ❌ |
| **900** | off / on | **`27.2px` 240 54 112** | **27.2px — cannot hold a ~50px code chip; name span width 0** | ❌ |
| 768 | off / on | `481.2px 112` | 481.2px, name 267–360px | ✅ visible |

Visually confirmed by screenshot at 1280: rows 2–5 show a clipped fragment of the purple code badge, then jump straight to the progress bar. The AoW code and name are **gone, not truncated**.

**`scrollWidth === clientWidth` holds at every one of these widths.** There is no scrollbar. That is what makes this dangerous: it passes a naive "no horizontal overflow" check while failing visibly, so an overflow-only gate will keep reporting green.

## 3. Root cause

The identity track is `minmax(0,1fr)`. Its four siblings are `max-content` or fixed. Measured at 1254px inner width: siblings + gaps consume ~531px of a ~539px row content box, so `1fr` resolves to ~3.7px. `minmax(0,…)` permits exactly this — the track is *allowed* to reach zero, and nothing establishes a floor.

## 4. This is `KZ-OAH-1`, fourth recurrence

`changes/aow-row-gesture-split` `design.md` `RGS-DD-3` states the starvation "has already recurred three times in this component". It has now recurred a fourth time. Three tasks were spent on it in `overview-aow-cross-filter` (`OSF-AC-9`/`AC-10`) and it is back.

**A recurring defect that returns after three fixes is a design problem, not a bug.** The pattern of the previous fixes — remove tracks at narrow widths, never raise the identity minimum — is what allows the track to reach zero. Any spec written from this proposal should treat "what makes this keep coming back" as the primary question, not "how do we get 1280 green again".

## 5. Proven NOT caused by the gesture-split spec

Three independent experiments, run by the Leader at the `RGS-T-4` gate:

| Experiment | Result |
|---|---|
| Revert `RGS-T-2`'s `border-2` → `1px` live in-browser | identity track **byte-identical** (3.72px) |
| Neutralise `RGS-T-3`'s `.pr-collapse` wrapper (`display:block`) | identity track **byte-identical** (3.72px) |
| Diff the responsive ladder against base `ca39bcf32` | **byte-identical** — same `grid-cols` strings; same counts of `max-[900px]` (25), `max-[1101px]` (10), `max-[1280px]` (5), `minmax(0,1fr)` (12) |

`RGS-R-5` ("MUST NOT alter the ladder or reintroduce horizontal overflow") is **met**. This defect predates that spec.

## 6. Why it was not fixed there

Fixing it would have contradicted two approved decisions of the spec that found it — `requirements.md` §3 puts the responsive ladder out of scope, and `design.md` `RGS-DD-3` says nothing in it is touched — and would have grown a spec already at ~192% of its LOC budget. `RGS-AC-5`'s second clause was retired instead, with the contradiction recorded.

## 7. Open questions for `/akili-propose` → `/akili-specify`

- **`OQ-1`** Raise the identity track's floor (`minmax(<n>px,1fr)`), or drop a sibling track earlier in the ladder? The previous three fixes all chose the latter and the defect returned.
- **`OQ-2`** What is the minimum useful identity width? The code chip alone is ~50px; code + a truncated name is arguably ~140px.
- **`OQ-3`** Should the gate for this be a **layout** assertion rather than an overflow assertion? Every prior gate was overflow-shaped, and overflow is exactly what this defect does not produce — which is why three fixes shipped with it still latent.
- **`OQ-4`** Does the same starvation affect `reporting-aow-table`'s rows, which share the pattern?

## 8. Next step

```text
/akili-propose changes/aow-identity-column-starvation
```
