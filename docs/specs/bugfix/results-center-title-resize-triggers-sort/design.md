# Design — Results Center: column resize must not trigger a sort

## 1. Summary

Dragging a Results Center column's resize handle and releasing the mouse over the header cell (not back over the thin resizer strip) makes the browser synthesize a native `click` event on the `<th>` — the mousedown target's ancestor — which reaches both `PrSortableColumnDirective`'s click listener (`table.sort(field)`) and the template's `(click)="validateOrder(column.attr)"`. Neither resize handler ever calls sort directly; the defect is a **phantom click**, not a logic error in the resize math. The fix registers a short-lived, capture-phase `click` guard on `document` for the duration of a resize drag, so that one synthesized click is swallowed before it reaches either sort listener — no template change, no change to the sort directive.

Linked: `requirements.md` (same folder). No `docs/trd/trd.md` ADR affected — this is an internal event-handling fix, not an architectural change.

## 1A. Premise Ledger

**Count:** 3 verified, 0 `UNVERIFIED` (0 High / 0 Low).
**Blast-radius triggers:** `live-path` fires (a user action is named). `shared-state` and `consumer` do not apply — none apply: the change touches only private fields/methods of `ResultsListComponent`, no exported symbol, no state read by more than one component.

| # | Claim | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| `P-1` | Neither `onResizeStart`, `onWindowMouseMove`, nor `onWindowMouseUp` calls `validateOrder` or any sort method — the resize handlers themselves never sort | `existence` | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts:887-917` — read in full; no call to `validateOrder`, `table.sort`, or `this.table` anywhere in the three handlers | `f673dadf6` | The bug would be a direct logic error inside these handlers, not a phantom-click problem — the fix below (a click guard) would not address it, and the spec would need to be rewritten around whatever call site actually sorts |
| `P-2` | Two independent listeners perform the actual sort when the `<th>` receives a `click`: the template's `(click)="validateOrder(column.attr)"` and `PrSortableColumnDirective`'s own `@HostListener('click')` (`table.sort(this.field)`) | `location` | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html:216,219` (`(click)="validateOrder(column.attr)"`, `[prSortableColumn]="column.attr"`) + `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts:23-26` (`@HostListener('click') onClick(): void { this.table.sort(this.field); }`) | `f673dadf6` | A fix that only patches one of the two listeners (e.g. only `validateOrder`) would leave the table sorting anyway via the other — `DD-1` below must silence the click before either listener runs, not patch either listener individually |
| `P-3` | The resizer div already stops a `click` that both starts and ends on itself (`(click)="$event.stopPropagation()"`) from reaching the `<th>`'s click handler — the reported bug only occurs when the drag moves the pointer off the resizer strip before mouseup | `existence` | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html:234` (`(click)="$event.stopPropagation()"` on `.rc-col-resizer`) | `f673dadf6` | A click-only interaction with the resizer (no drag) is not actually reproducing the bug the user reported — `RCR-R-1`'s scenario (drag + release inside the header) is the one that matters, and a fix scoped to "any mousedown on the resizer" instead of "a drag that ends off the resizer" would be broader than necessary, though still correct since it is a superset |

## 2. Architecture Overview

### 2.1 Where this lives

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` only. No template change, no directive change, no server/API/migration surface.

### 2.2 Live-path dispatch chain (the exact bug, confirmed by reading the code — see Premise Ledger `P-1`/`P-2`)

```
User mousedown on .rc-col-resizer          (results-list.component.html:226-234)
  └── onResizeStart(event, column, thEl)    (results-list.component.ts:904)
        ├── event.preventDefault() + stopPropagation()   — stops THIS mousedown only
        ├── sets this.activeResize
        └── window.addEventListener('mousemove'/'mouseup', ...)
User drags (pointer moves off the resizer strip, over the <th>)
  └── onWindowMouseMove                     (results-list.component.ts:887) — resizes, no sort call
User releases the mouse over the <th>
  └── onWindowMouseUp                       (results-list.component.ts:894) — clears activeResize, persists width
  └── [BROWSER, not app code] synthesizes a `click` event
        target = nearest common ancestor of mousedown target (.rc-col-resizer) and
                 mouseup target (<th> or a descendant) = <th>
        └── click bubbles through <th>, reaching (in registration order):
              [prSortableColumn] click listener → table.sort(field)      ← wrong sort
              (click)="validateOrder(column.attr)"                       ← wrong combine-flag recompute
```

Nothing in `results-list.component.ts` currently intercepts this synthesized click — hence the bug.

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Server Workflow / Business Rules

None — client-only fix.

## 6. Frontend Plan

### 6.1 Routes / modules

No change. `ResultsListComponent` (`pages/results/pages/results-outlet/pages/results-list/`) only.

### 6.2 Components & services

- **`onResizeStart`** (ts:904): after registering the existing `mousemove`/`mouseup` window listeners, also register a **capture-phase, one-shot `click` guard on `document`** that calls `preventDefault()` + `stopPropagation()`. Capture-phase on `document` runs strictly before any bubble-phase listener anywhere in the tree (including both listeners in `P-2`), and before `document`'s own bubble-phase listeners such as the existing `@HostListener('document:click') onDocumentClick()` (ts:340) that closes menus/popovers — so closing the columns/action menu on an ordinary click is unaffected; only the guard's own single swallowed click never reaches that handler either, which is correct (a resize is not a "click outside" event).
- **`onWindowMouseUp`** (ts:894): after existing cleanup, if the guard was registered, schedule its removal via `setTimeout(..., 0)` as a safety net for the case where the browser never dispatches the anticipated click (e.g. the drag's final mouseup lands outside any clickable ancestor) — otherwise a stray guard could survive to swallow a later, unrelated click. The guard is also registered with `{ once: true }`, so the common case (click does fire) self-removes without waiting for the timeout.
- **`ngOnDestroy`** (ts:945): remove the guard if the component is destroyed mid-drag, mirroring the existing `mousemove`/`mouseup` cleanup already there.
- No change to `onResizeReset`, `columnWidth`, `customWidths`, or any template binding.

### 6.3 Design system usage

None — no visual change.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

None — no auth surface touched.

## 8. Performance & Capacity

Negligible: one extra `document` event listener exists only for the duration of an active drag (typically well under a second) plus at most one macrotask tick of cleanup margin.

## 9. Observability

None added — not warranted for a pure UI event-handling fix.

## 10. Testing Plan (forward-looking)

- Unit (Jest, `results-list.component.spec.ts`): extend the existing `Column resize` describe block (ts:526-560) with a case that drives the full mousedown→mousemove→mouseup sequence already used by the existing "persists resized column widths on mouseup" test, then dispatches a real `click` `MouseEvent` on `document` and asserts it is prevented — and a second, later click is not. See `requirements.md` §9 defect class **A**/**B** for the exact falsifier.
- No integration/E2E test added — this is a same-component, same-file event-handling fix with an existing Jest harness that already exercises the drag sequence; Cypress coverage would duplicate it without covering anything Jest cannot (`document`-level event dispatch is not layout-dependent).

## 11. Backwards Compatibility & Migration Plan

Fully backwards compatible — no payload, storage key, or template contract changes. Nothing to migrate or roll back beyond reverting the diff.

## 12. Design Decisions

### `RCR-DD-1` — Swallow the phantom click via a capture-phase, one-shot `document` guard, not a "just resized" boolean flag

- **Context:** Two independent listeners can perform the sort (`P-2`), both bound directly to the `<th>` in bubble phase. A fix has to stop the click before either one runs.
- **Decision:** Register `document.addEventListener('click', guard, { capture: true, once: true })` in `onResizeStart`; the guard calls `preventDefault()` + `stopPropagation()`. Capture phase on an ancestor (`document`) always runs before any listener — capture or bubble — attached to a descendant, so this is ordering-safe regardless of how many bubble-phase click listeners the `<th>` ends up with in the future.
- **Alternatives considered:**
  - *A boolean flag (e.g. `justResized`) checked inside `validateOrder`.* Rejected: `validateOrder` is only one of the two listeners (`P-2`); `PrSortableColumnDirective`'s own listener has no knowledge of `ResultsListComponent`'s internal state, so a flag would fix the `combine` side effect but leave the table visibly re-sorted.
  - *`event.stopPropagation()` inside `onResizeStart`'s own `mousedown` handler (already present, ts:906).* Rejected: this stops the **mousedown** event's propagation, which has no effect on the separately-dispatched **click** event the browser synthesizes after mouseup — confirmed by `P-1`/`P-2` showing the click still reaches both listeners today despite this existing `stopPropagation()` call.
- **Consequences:** One extra `document`-level listener exists only while a drag is in flight (bounded lifetime via `once` + the `setTimeout(0)` safety net). No change to any public API, template, or other component.

## 13. Open Gaps & Follow-ups

- The identical `onResizeStart`/`.rc-col-resizer` pattern is duplicated (not shared — separate copy-pasted implementations) in `programme-results.component.ts`, `portfolio-overview.component.ts`, `bilateral-results-list.component.ts`, `links-to-results-global.component.ts`, and both `mapped-results-modal.component.ts` files, and each is likely susceptible to the same phantom-click sort/reorder bug (or an equivalent side effect for whatever click that `<th>` guards). Out of scope here per Bug Mode's "stay scoped to the root cause" rule; flagged as a follow-up to audit and, ideally, extract into one shared resizable-column directive/mixin instead of applying the same guard five more times.

## Budget

- **Expected tasks:** 1
- **Expected LOC:** ~25-35 (new fields/methods in one `.ts` file + one new Jest test case)
- **Expected review rounds:** 1

This lands well inside **Lite** depth — no downgrade recommended (a single-file event-handling fix with a mandatory regression test is exactly what Lite is for) and no split proposed.

## Required cross-references

- `docs/specs/bugfix/results-center-title-resize-triggers-sort/requirements.md` (same folder).
- `docs/trd/trd.md` — no ADR affected.
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts` — the directive whose click listener performs the sort; unchanged by this design, cited only as the second of the two listeners the guard must precede.
