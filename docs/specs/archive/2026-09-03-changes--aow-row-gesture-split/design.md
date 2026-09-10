# Design — Split the AoW row's two gestures

**One line:** the row keeps a mouse-convenience click that now *filters*; the AoW code+name becomes a real `<button>` — the named, keyboard-operable control the row has never had.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/aow-row-gesture-split` · Prefix `RGS` |
| Depth | **Standard** |
| Date | 2026-09-02 |
| Reversion challenge | **Run** (Step 2.3) — see §7 |
| Delegation | Reversion challenge ran synchronously as a subagent; no fallback needed |

## 2. Executive Summary

Three real `<button>`s already live inside the AoW row — the achievement glyph (`~:663`), the `→` arrow (`~:740`) and `Report` (`~:755`). That single fact eliminates the two obvious designs and drives everything below.

| Requirement | Delivered by |
|---|---|
| `RGS-R-1` row filters | `RGS-DD-2` mouse-convenience click + `RGS-DD-1` name button |
| `RGS-R-2` actions navigate only | existing `stopPropagation()`, unchanged |
| `RGS-R-3` real keyboard control | `RGS-DD-1` |
| `RGS-R-4` selected state | `RGS-DD-4` |
| `RGS-R-5` no layout regression | `RGS-DD-3` |
| `RGS-R-6` both sites consistent | `RGS-DD-5` |
| `RGS-R-7` section collapsible | `RGS-DD-7` |
| `RGS-R-8` collapsed content unreachable | `RGS-DD-7` |

## 3. Architecture Overview

No new module, service, endpoint or state. The scope already flows `program-overview → scopeChange → dashboard-lab`, and `selectScope(key)` already emits it. This spec adds **one more caller** of an existing path, plus markup.

## 4. The constraint that decides the design

The row contains three focusable descendants. Therefore:

| Candidate | Verdict |
|---|---|
| Row becomes `<button>` | **Invalid HTML** — a button may not contain buttons |
| Row becomes `<div role="button" tabindex="0">` | **Rejected — see `RGS-DD-1`.** The `button` role is *children-presentational*: assistive tech may ignore its descendants entirely, which would hide `Report` from screen readers |
| Identity block becomes the button | **Invalid** — the achievement glyph lives inside it (`OSF-T-2b`) |
| **Code+name becomes the button; row keeps a mouse click** | **Chosen** |

## 5. Frontend Component Architecture

The row's cells are unchanged in count, order and grid placement. Only the identity cell's internals change:

```
row <div>                       ← plain container. Mouse-convenience (click). NO role.
├─ identity cell <div>
│  ├─ <button>  code + name     ← NEW. The named, keyboard-operable filter control
│  └─ <button>  achievement ⓘ   ← unchanged (OSF-T-2b), sibling — not nested
├─ bar cell
├─ figures cell
└─ actions cell
   ├─ <button> Report           ← unchanged
   └─ <button> →                ← unchanged
```

## 6. Design Decisions

**`RGS-DD-1` — The code+name becomes a real `<button type="button">`; the row gets no ARIA role.**
Native `<button>` supplies focusability, Enter **and** Space, and correct semantics with no re-implementation. Crucially it leaves the row a plain `<div>`, so nothing becomes children-presentational and the three existing buttons stay independently reachable.
*Rejected: `role="button"` on the row* — recommended by the reversion reviewer to preserve a test selector, but the `button` role's children-presentational behaviour can hide `Report` from assistive tech. That is the "fixed one accessibility defect, introduced another" failure recorded twice in the archived spec (`execution.md` §14, §19). The selector is preserved anyway, because the row stays a `<div>`.
*Also rejected: stretched-link overlay.* It would give a full-row **single** control, but places an absolutely-positioned element over a 5-track grid that re-places into a 2×2 stack below 900px. This component has already spent three tasks on layout starvation; the risk is not worth the elegance.

**`RGS-DD-2` — The row-level click stays, and becomes a mouse convenience that calls the same handler.** *(This is the reverting decision — its Step 2.3 challenge outcome is §7: safe to revert, one named test obligation.)*
It duplicates a named, keyboard-reachable control, which is what makes an unannounced click target acceptable. It is not the only route to the function — `RGS-DD-1` is. The existing `stopPropagation()` in `onOpenAowRowAction` / `onReportAowRow` already prevents the actions from reaching it, and the achievement glyph already stops propagation too. Selecting an already-selected scope is idempotent, so an accidental double-fire is harmless; the name button still stops propagation for cleanliness.

**`RGS-DD-3` — Nothing in the responsive ladder is touched.**
`max-[900px]` / `max-[1101px]` / `max-[1280px]`, the `[grid-column]`/`[grid-row]` placements, and `minmax(0,1fr)` on the identity track all stay exactly as `OSF-T-2b` left them. The name button is `min-w-0` + `truncate` so it inherits the starvation protection rather than defeating it — **a fixed-width button here would re-create `KZ-OAH-1`, which has already recurred three times in this component.**

**`RGS-DD-4` — The selected row reuses the scope control's active treatment.**
`border-2` toggling `--pr-color-primary-300` ↔ `transparent`, exactly as the listbox option does — already measured at **5.78:1** against white and **5.32:1** against its own fill, both clearing WCAG 1.4.11's 3:1. Both states carry `border-2` so nothing shifts. Programmatic state via `aria-pressed` on the name button (it is a toggle-like filter control, and `aria-pressed` is the honest mapping for "this filter is on").
*Resolves `RGS-OQ-2`.*

**`RGS-DD-5` — Both row sites move together.**
The skeleton (`:527`) and the real row (`:621`) keep identical structure. `OSF-T-2b`'s Reviewer called the skeleton↔row parity test "the drift no browser sweep of a loaded page would ever catch" — that guard is extended, not bypassed.

**`RGS-DD-6` — Clicking the already-selected row does nothing.**
Not a toggle. `All scopes` in the control is the documented way to clear, and a toggle would make one gesture mean two things depending on invisible state. `aria-pressed="true"` still communicates the state.
*Resolves `RGS-OQ-1`.*

**`RGS-DD-7` — Reuse the house collapse pattern, and fix the defect it carries.**
`reporting-aow-table` already owns a clean collapse: a `<button>` trigger with `aria-expanded`, and `.pr-collapse` animating `grid-template-rows: 0fr → 1fr` with `overflow:hidden` on `.pr-collapse-inner`, honouring `prefers-reduced-motion`. Reuse it — the CSS moves to a shared home rather than being duplicated.

**But do not copy it verbatim.** That pattern collapses **20 `<button>`s** to zero height with `aria-hidden="true"` and **no `inert`** — the whole client has exactly one `inert` usage. Zero height does not remove anything from the tab order, so a keyboard user tabs into invisible controls that screen readers are simultaneously told to ignore. `aria-hidden` over focusable content is an explicit ARIA violation, and our section has the same shape: every row carries a name button, `Report`, `→` and the achievement glyph.

So the collapse container is marked `inert` while closed, which removes its descendants from both the tab order and the accessibility tree. `aria-hidden` then becomes redundant and is dropped rather than layered.

**This would have been the third time in this lineage that carrying a treatment across sites carried a defect with it** (`execution.md` §14, §19). The source pattern's own gap is recorded as a pending item — fixing `reporting-aow-table` is not this spec's scope.

## 7. Reversion challenge (Step 2.3)

**Reverted behaviour:** the row body navigating on click.

| Question | Answer |
|---|---|
| What breaks? | **One test:** `program-overview.oah-hero.spec.ts:379-401` asserts `rowEl.click()` emits `openAow`. Must be rewritten to expect `scopeChange`. `component.spec.ts:932` survives but becomes vacuous — advisory |
| Anything else depend on it? | **No.** `openAow` keeps five other entry points (`onReportAowRow`, `onOpenAowRowAction`, the ToC-map click, the outcome chips, five direct call sites). No analytics hook, no deep-link, no Cypress coverage of this component |
| Anyone stranded? | **No.** The actions wrapper has no `hidden` variant at any breakpoint and is explicitly re-placed below 900px; `Report` never becomes icon-only. Navigation survives at all five widths |
| Prior art? | The archived proposal rejected "row navigates pre-filtered" **as a substitute for the filter**, never as a rejection of filter-on-row. And `execution.md:681` records row-navigate-on-click as a **hazard** — a 768px tap bubbled into it and navigated the user away |

**Outcome: safe to revert, with the test rewrite as a named task obligation.** The prior art strengthens the change: the behaviour being removed was already logged as a defect vector.

## 8. Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | **4** — raised from 3 |
| LOC | **~230** (≈130 production, ≈100 tests) — raised from ~160 |
| Review rounds | **1** |

**Budget raised at the design gate**, disclosed rather than absorbed: the owner added the collapsible section (`RGS-R-7`, `RGS-R-8`) after the first estimate. Still below the ~400-LOC single-PR threshold → **one PR**. `/akili-execute` trips against these numbers; exceeding them is information, not failure.

**Pending item (not this spec's scope):** `reporting-aow-table`'s collapse leaves 20 focusable buttons tabbable while collapsed and `aria-hidden`. Same fix (`inert`), different file — record it for the default-branch apply pass.

Depth re-check: the Phase-0 guess was `Lite`. The `<div>` discovery added keyboard semantics, an accessible name, and a selected state — three tasks, not one. **Standard is correct**; `Lite`'s single-task shape would have hidden the a11y work inside a "small tweak".
