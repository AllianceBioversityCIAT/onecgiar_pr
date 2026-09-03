# Design — One visible way to clear the Overview's filters

**One line:** one `<button>` in the existing filter bar, shown only when something is filtered, that calls two mechanisms that already exist — and one genuinely non-obvious problem: where focus goes when the control removes itself.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/clear-filters` · Prefix `CF` |
| Depth | **Lite** |
| Date | 2026-09-02 |
| Reversion challenge (Step 2.3) | **Not triggered** — no design decision here reverts delivered behaviour. `OQ-3` explicitly declined to change the section toggle or `RGS-DD-6`; this spec only adds |

## 2. Executive Summary

| Requirement | Delivered by |
|---|---|
| `CF-R-1` resets both axes | `CF-DD-2` |
| `CF-R-2` present only when filtered | `CF-DD-1` |
| `CF-R-3` real keyboard control | `CF-DD-3` |
| `CF-R-4` no layout regression | `CF-DD-4` |
| `CF-AC-4` focus not lost | `CF-DD-5` — the only non-trivial decision here |

## 3. Architecture

No new module, service, state or contract. The two "unfiltered" values already exist and are already reachable:

| Axis | Owner | Reset |
|---|---|---|
| Section | `activeSection` — signal **local** to `program-overview` | `.set('all')` |
| Scope | `overviewScope` — signal owned by the **host** `dashboard-lab`, in via `selectedScope` input, out via `scopeChange` output | `scopeChange.emit(null)` |

`scopeChange` is already typed `string | null`; the host already binds `(scopeChange)="overviewScope.set($event)"`; `null` already flows to `scope: overviewScopeParam ?? null` when the URL is written. **No host change is expected.** If one turns out to be needed, that is a discovery worth escalating, not absorbing — it would mean the clearing contract is not what this design read it to be.

## 4. Design Decisions

**`CF-DD-1` — Visibility is a `computed()` over both axes; the control is removed from the DOM, not hidden.**
A single derived predicate (section is not `'all'` **or** scope is not `null`) gates an `@if`. Removal rather than `hidden`/`opacity` is required by `CF-AC-2`'s negative clause: an invisible-but-focusable control is the defect `RGS-T-3` spent a whole task avoiding in the collapse, and repeating it two commits later would be its own kind of failure.

**`CF-DD-2` — Clearing calls both existing paths in one handler.** Section reset is local; scope reset is an emit. Order is irrelevant — they are independent axes with no shared state.
*Rejected: routing the section reset through `setActiveSection('all')`.* That method carries toggle logic (`activeSection() === section && section !== 'all' ? 'all' : section`) which is a no-op for `'all'` today, but it means an unrelated future change to toggling silently changes what clearing does. Set the signal directly.

**`CF-DD-3` — Native `<button type="button">`, mimicking the bar's existing controls.**
Focus treatment is `focus-visible:shadow-[var(--pr-focus-ring)]` and **never** `ring-[var(--pr-focus-ring)]` — that token is a box-shadow value and paints nothing. This is not a hypothetical: it cost a rework round on `RGS-T-1`, and the negative assertion is part of this spec's test contract.

**`CF-DD-4` — No new token, no new track, no fixed width.**
The control reuses the bar's existing button treatment. It must not introduce a fixed width or a new grid/flex track: the bar sits directly above rows whose identity column already starves to 0px at 1280/1100/900 (`changes/aow-identity-column-starvation`). Adding horizontal demand at those widths is the one way this small change could do real damage.

**`CF-DD-5` — Focus moves to the "All Sections" tab when the control removes itself.**
This is the decision worth making deliberately. `CF-R-2` removes the control on success, so the element holding focus disappears mid-interaction and focus falls to `<body>` — a keyboard user loses their place in the bar, and a screen-reader user gets silence. "All Sections" is the right target: it is adjacent, it is now the selected state, and it is the semantic result of what just happened.
*Rejected: keeping the control rendered-but-disabled.* It would solve focus trivially, but `OQ-1` chose removal, and a disabled control is not focusable in a useful way either.
*Rejected: an `aria-live` announcement.* `OQ-5` settled this — the controls' own state changes carry the news, and moving focus to the now-selected tab communicates it structurally rather than by narration.

## 5. Frontend Component Architecture

The filter bar gains one sibling; nothing is re-nested and no existing element changes.

```
filter bar
├─ section tabs        ← unchanged ("All Sections" | W1/W2 | W3 / Bilateral | Areas of Work)
├─ Scope: <control>    ← unchanged
└─ <button> Clear filters   ← NEW, rendered only when a filter is active
```

## 6. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | **1** |
| LOC | **~140** (≈35 production, ≈105 tests) |
| Review rounds | **1** |

The test share dominates because six acceptance criteria need covering and this component's suites run roughly 2–3× its production code — measured, not guessed: `changes/aow-row-gesture-split` came in at ~640 LOC against a ~230 estimate, and the miss was almost entirely untested test volume. This estimate is set from that evidence rather than from optimism.

Depth re-check: **Lite is correct.** `OQ-2` and `OQ-3` both resolved toward "change nothing that exists", which is what keeps this a single task. Had `OQ-3` gone the other way — changing the section toggle, or reverting `RGS-DD-6` — this would have been `Standard`, because it would have modified behaviour users already rely on.
