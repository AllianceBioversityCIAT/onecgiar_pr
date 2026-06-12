## Context

The Lead Contact Person field (`custom-fields/lead-contact-person-field`) renders a clear (`✕`) button to deselect the chosen contact. Its style `.clear-contact-btn` sets `position: absolute; z-index: 10`. The global feedback widget (`custom-fields/save-button`, `.fixed_button`) is `position: fixed; z-index: 5` and shows the "N alerts" panel of missing mandatory fields.

`z-index` only orders elements **within the same stacking context**. `.contact-select-wrapper` is `position: relative` with **no** `z-index`, so it does **not** create a stacking context. The clear button's `z-index: 10` therefore resolves against the **root** stacking context — the same one holding the fixed widget at `z-index: 5`. Because `10 > 5`, the `✕` paints over the widget whenever the two regions overlap on screen.

Reproduced live on prtest (result 8552, phase 34, General Information) with Playwright; confirmed via `document.elementFromPoint()` at the `✕` center returning `i.clear-icon` on top before the fix.

## Goals / Non-Goals

**Goals:**
- The clear button must never paint over the global fixed feedback widget.
- The clear button must remain above the input it overlays and keep working.
- Minimal, behaviour-preserving CSS change in a single file.

**Non-Goals:**
- Changing the feedback widget (`save-button`) or its `z-index: 5`.
- Re-layering the field's search-results dropdown (`.search-results*`, `z-index: 1000/1001`) — it is an active overlay and out of scope for this fix.
- Any markup, TypeScript, or backend change.

## Decisions

**Decision: add `isolation: isolate` to `.contact-select-wrapper`.**
This forces the wrapper to establish a new stacking context. The clear button's `z-index: 10` is then scoped to the wrapper (still above the input), while the wrapper as a whole flows in normal document order — below any positive-`z-index` fixed element such as the feedback widget. Verified live: after injecting the rule, `elementFromPoint()` at the `✕` center returns the feedback widget's text on top.

Alternatives considered:
- **Lower `.clear-contact-btn` `z-index` (10 → 2):** also works, but only fixes this one value and leaves the leaky root-context behaviour for any future descendant. `isolation: isolate` documents intent and contains the whole subtree.
- **Raise the widget's `z-index`:** rejected — touches a shared component used across the app and risks regressions against other overlays.

## Risks / Trade-offs

- [New stacking context could reorder children of the wrapper] → Mitigated: the only positioned descendant is the clear button, which must already sit above the input; isolation preserves that local order.
- [The search-results dropdown still overlaps the widget when open] → Accepted: it is an active, intentional overlay; tracked as a separate concern, not part of this change.

## Migration Plan

Pure CSS; no data or API migration. Ship with the client build. Rollback = revert the single SCSS line.
