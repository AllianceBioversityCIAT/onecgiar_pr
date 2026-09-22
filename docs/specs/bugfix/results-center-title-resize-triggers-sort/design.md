# Design — Results Center: column resize must not trigger a sort

## 1. Summary

Dragging a Results Center column's resize handle and releasing the mouse over the header cell (not back over the thin resizer strip) makes the browser synthesize a native `click` event on the `<th>` — the mousedown target's ancestor — which reaches both `PrSortableColumnDirective`'s click listener (`table.sort(field)`) and the template's `(click)="validateOrder(column.attr)"`. Neither resize handler ever calls sort directly; the defect is a **phantom click**, not a logic error in the resize math. The fix registers a short-lived, capture-phase `click` guard on `document` for the duration of a resize drag, so that one synthesized click is swallowed before it reaches either sort listener — no template change, no change to the sort directive.

Linked: `requirements.md` (same folder). No `docs/trd/trd.md` ADR affected — this is an internal event-handling fix, not an architectural change.

## 1A. Premise Ledger

**Count:** 8 verified, 0 `UNVERIFIED` (0 High / 0 Low).
**Blast-radius triggers:** `live-path` fires (a user action is named) in every affected file. `shared-state` and `consumer` do not apply — the change touches only private fields/methods of each component, no exported symbol, no state read by more than one component (each file's resize logic is an independent copy-paste, not a shared symbol — see `P-6`).

| # | Claim | Class | Citation (as run) | Verified at | If false |
|---|---|---|---|---|---|
| `P-1` | Neither `onResizeStart`, `onWindowMouseMove`, nor `onWindowMouseUp` calls `validateOrder` or any sort method — the resize handlers themselves never sort | `existence` | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts:887-917` — read in full; no call to `validateOrder`, `table.sort`, or `this.table` anywhere in the three handlers | `f673dadf6` | The bug would be a direct logic error inside these handlers, not a phantom-click problem — the fix below (a click guard) would not address it, and the spec would need to be rewritten around whatever call site actually sorts |
| `P-2` | Two independent listeners perform the actual sort when the `<th>` receives a `click`: the template's `(click)="validateOrder(column.attr)"` and `PrSortableColumnDirective`'s own `@HostListener('click')` (`table.sort(this.field)`) | `location` | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html:216,219` (`(click)="validateOrder(column.attr)"`, `[prSortableColumn]="column.attr"`) + `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts:23-26` (`@HostListener('click') onClick(): void { this.table.sort(this.field); }`) | `f673dadf6` | A fix that only patches one of the two listeners (e.g. only `validateOrder`) would leave the table sorting anyway via the other — `DD-1` below must silence the click before either listener runs, not patch either listener individually |
| `P-3` | The resizer div already stops a `click` that both starts and ends on itself (`(click)="$event.stopPropagation()"`) from reaching the `<th>`'s click handler — the reported bug only occurs when the drag moves the pointer off the resizer strip before mouseup | `existence` | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.html:234` (`(click)="$event.stopPropagation()"` on `.rc-col-resizer`) | `f673dadf6` | A click-only interaction with the resizer (no drag) is not actually reproducing the bug the user reported — `RCR-R-1`'s scenario (drag + release inside the header) is the one that matters, and a fix scoped to "any mousedown on the resizer" instead of "a drag that ends off the resizer" would be broader than necessary, though still correct since it is a superset |
| `P-4` *(Amendment)* | `programme-results.component.ts` and `bilateral-results-list.component.ts` each implement the identical `activeResize`/`onWindowMouseMove`/`onWindowMouseUp`/`onResizeStart` shape as `results-list.component.ts`, each paired with `[prSortableColumn]` on the same `<th>` and a resizer `div` with its own `(click)="$event.stopPropagation()"` | `location` | `programme-results.component.ts:1258-1324` + `programme-results.component.html:406,416,418` · `bilateral-results-list.component.ts:1034-1093` + `bilateral-results-list.component.html:364,375,377` — both read in full before editing | `9f3c1f657` | The per-file fix applied would not match that file's actual mechanism — checked by reading each file's resize block in full, not by pattern-matching the method name alone |
| `P-5` *(Amendment)* | `portfolio-overview.component.ts` implements resize differently: `onResizeStart` registers **inline closures** (`onMouseMove`/`onMouseUp`, not pre-bound class methods) with no `activeResize` field and no `ngOnDestroy` cleanup at all (pre-existing gap, not introduced here); its sort listener is `(click)="sortBy(column)"` on a `<button>` inside the `<th>`, not `[prSortableColumn]` on the `<th>` itself, and its resizer `div` has **no** `(click)="$event.stopPropagation()"` of its own | `location` | `portfolio-overview.component.ts:344-373` (resize) + `:549-556` (`sortBy`) · `portfolio-overview.component.html:582-607` (button + resizer, no stopPropagation on the resizer) | `9f3c1f657` | The guard would need to be attached differently (e.g. to the button, not the `<th>`) — checked by reading the exact DOM structure and confirming the guard's `document`-capture placement is independent of *where* the sort listener sits, since capture on `document` precedes any bubble-phase listener regardless of target |
| `P-6` *(Amendment)* | The resize pattern is copy-pasted, not shared via any base class, mixin, or directive — each file's `onResizeStart` etc. is its own independent implementation | `existence` | `grep -rn "onResizeStart" onecgiar-pr-client/src` — 4 files under `pages/`/`sections-components/` each define their own, no shared import; no common base class in any of the 4 (`programme-results.component.ts` / `bilateral-results-list.component.ts` / `portfolio-overview.component.ts` / `results-list.component.ts`) | `9f3c1f657` | A shared symbol would mean one fix location, not four — `RCR-DD-2` (below) would be wrong to recommend four independent patches |
| `P-7` *(Amendment)* | `links-to-results-global.component.ts` and both `mapped-results-modal.component.ts` files match an `onResizeStart\|rc-col-resizer\|validateOrder` grep only via the unrelated `validateOrder` sort helper — none of the three has a resize handle (`mousedown` binding) anywhere in their `.ts` or `.html` | `data-env` | `grep -n "onResizeStart\|activeResize\|rc-col-resizer\|resize"` over all three `.ts` files — zero hits; `grep -n "mousedown\|resize"` over all three `.html` files — zero hits | `9f3c1f657` | These three would need the same fix after all — the negative-existence grep pattern used (`mousedown\|resize`) would need to be re-run and shown to actually hit something before adding a row here |
| `P-8` *(Amendment)* | Every one of the 4 affected files' existing Jest specs already exercises the exact `onResizeStart` → `mousemove` → `mouseup` sequence needed to host each new regression test, via a helper or an existing "persists resized column widths" test | `existence` | `results-list.component.spec.ts:543-553`, `programme-results.component.spec.ts:2148-2176`, `bilateral-results-list.component.spec.ts:1190-1200` — each already dispatches this sequence; `portfolio-overview.component.spec.ts` had no prior resize test, so its new test builds the sequence from `component.onResizeStart` directly, matching the other three's shape | `9f3c1f657` | A new test harness/mount helper would be needed instead of extending the existing describe blocks — checked by reading each spec file before writing its new test |

## 2. Architecture Overview

### 2.1 Where this lives

- **Client modules touched:** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` (original). *(Amendment)* Plus `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts`, `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`, `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.ts`. No template change, no directive change, no server/API/migration surface, in any of the four.

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

`ResultsListComponent` (`pages/results/pages/results-outlet/pages/results-list/`) — original fix. *(Amendment)* Plus three parity fixes, each touching only its own `.ts` file: `ProgrammeResultsComponent`, `BilateralResultsListComponent`, `PortfolioOverviewComponent`. No route or module change anywhere.

### 6.2 Components & services

- **`onResizeStart`** (ts:904): after registering the existing `mousemove`/`mouseup` window listeners, also register a **capture-phase, one-shot `click` guard on `document`** that calls `preventDefault()` + `stopPropagation()`. Capture-phase on `document` runs strictly before any bubble-phase listener anywhere in the tree (including both listeners in `P-2`), and before `document`'s own bubble-phase listeners such as the existing `@HostListener('document:click') onDocumentClick()` (ts:340) that closes menus/popovers — so closing the columns/action menu on an ordinary click is unaffected; only the guard's own single swallowed click never reaches that handler either, which is correct (a resize is not a "click outside" event).
- **`onWindowMouseUp`** (ts:894): after existing cleanup, if the guard was registered, schedule its removal via `setTimeout(..., 0)` as a safety net for the case where the browser never dispatches the anticipated click (e.g. the drag's final mouseup lands outside any clickable ancestor) — otherwise a stray guard could survive to swallow a later, unrelated click. The guard is also registered with `{ once: true }`, so the common case (click does fire) self-removes without waiting for the timeout.
- **`ngOnDestroy`** (ts:945): remove the guard if the component is destroyed mid-drag, mirroring the existing `mousemove`/`mouseup` cleanup already there.
- No change to `onResizeReset`, `columnWidth`, `customWidths`, or any template binding.

*(Amendment — parity fixes, see `RCR-DD-2`)*

- **`programme-results.component.ts`** / **`bilateral-results-list.component.ts`**: byte-for-byte the same shape as `results-list.component.ts` above — a `resizeClickGuard` field, registered in `onResizeStart`, cleaned up in `onWindowMouseUp` (`setTimeout(0)` fallback) and `ngOnDestroy`. Both already had an `isResizing` signal the original file lacks; untouched.
- **`portfolio-overview.component.ts`**: same guard mechanism, adapted to this file's **inline-closure** style (`P-5`) — the guard is a local `const` inside `onResizeStart`, not a class field, and its cleanup lives in the local `onMouseUp` closure. No `ngOnDestroy` exists in this file today (pre-existing gap, `P-5`) and none was added — adding a new lifecycle hook is out of scope for this parity fix; the existing mid-drag-destroy leak (window listeners never removed) is unchanged, and the click guard's exposure to that same gap is no wider than what already existed.

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
- *(Amendment)* Same pattern, one test per parity file, each spying on that file's own sort surface (`jest.spyOn(table(), 'sort')` for the two `PrSortableColumnDirective`-based tables; `component.sortKey()`/`sortAsc()` snapshot comparison for Portfolio Overview, which has no `PrTableComponent`) — see `P-8`.

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

### `RCR-DD-2` — Replicate the guard per file, do not extract a shared directive *(Amendment)*

- **Context:** The resize pattern is copy-pasted across four files (`P-6`), not shared. The original spec's §13 Open Gap suggested extraction as the "ideal" follow-up. The user then asked to apply *the same adjustment* to every affected table.
- **Decision:** Apply the same guard mechanism independently to each of the three remaining files, matching each file's existing style exactly (class-field guard for the two `PrSortableColumnDirective`-based files; local-closure guard for Portfolio Overview's inline-closure style, `P-5`). Do not extract a shared directive/mixin in this change.
- **Alternatives considered:**
  - *Extract one shared `ResizableColumnDirective`/mixin now, covering all four files.* Rejected for this change: a shared-directive extraction is a refactor of working code across four components with different signatures (`onResizeStart` takes 2 args in Portfolio Overview, 3 elsewhere) and different state shapes (`activeResize` object vs. two loose fields vs. inline closures) — real risk for a fix the user asked to ship now, and explicitly not what was requested ("apply this adjustment", not "refactor this"). Recorded as a still-open follow-up below.
- **Consequences:** Four independent copies of the same ~15-line guard exist post-fix instead of one. A future fifth resizable table will need the same guard applied by hand again unless the follow-up extraction happens first.

## 13. Open Gaps & Follow-ups

- ~~The identical `onResizeStart`/`.rc-col-resizer` pattern is duplicated... in `programme-results.component.ts`, `portfolio-overview.component.ts`, `bilateral-results-list.component.ts`...~~ **Resolved by this amendment** — all three now carry the same guard (`RCR-R-4`).
- `links-to-results-global.component.ts` and both `mapped-results-modal.component.ts` files were re-confirmed to have no resize handle at all (`P-7`) — not a gap, no action needed.
- **Still open:** extracting the four independent guard copies into one shared resizable-column directive/mixin (`RCR-DD-2`), so a future fifth resizable table gets the guard by construction instead of by a human remembering to copy it again.
- **Still open (pre-existing, not introduced here):** `portfolio-overview.component.ts` has no `ngOnDestroy` at all, so a mid-drag component destroy leaks its `window` mousemove/mouseup listeners (and, after this fix, the click guard — bounded by its own `setTimeout(0)`/`once`, so this specific leak is not worsened). Out of scope for a resize/sort bugfix.

## Budget

- **Expected tasks:** 1 (original) + 3 (parity, amendment) = 4
- **Expected LOC:** ~25-35 original + ~35 (programme-results) + ~35 (bilateral-results-list) + ~20 (portfolio-overview, no `ngOnDestroy` field wiring needed) + ~90 across four new/extended Jest tests ≈ **245 LOC total**
- **Expected review rounds:** 1

Still lands inside **Lite** depth — the amendment is four small, mechanically similar edits with no new architectural surface, not a scope explosion. No split proposed; all four ship in the tasks below.

## Required cross-references

- `docs/specs/bugfix/results-center-title-resize-triggers-sort/requirements.md` (same folder).
- `docs/trd/trd.md` — no ADR affected.
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts` — the directive whose click listener performs the sort; unchanged by this design, cited only as the second of the two listeners the guard must precede (in three of the four affected files).
