# Requirements — Results Center: column resize must not trigger a sort

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `results` (primary), `result-framework-reporting`, `bilateral` (parity) |
| Sub-feature | Every reporting-tool table with a resizable column header |
| Module code | `RCR` |
| Status | `shipped` |
| Type | Bug · **Bug Mode** |
| Depth | **Lite** — event-handling defect duplicated (copy-pasted, not shared) across a small, enumerable set of files; no server/API/migration surface; root cause confirmed by direct code read (no `proposal.md` existed, so root cause was confirmed here per Bug Mode) |
| Ticket | none supplied |
| Source | User report, then user request to extend the same fix to every affected table (2026-09-22) — see **Amendment** below |
| Amendment (2026-09-22) | Original scope was `results-list.component.ts` only, with the duplicated pattern elsewhere explicitly **out of scope** (Bug Mode discipline). The user then asked to apply the same adjustment to every existing resizable table in the reporting tool. This revision folds that request in as `RCR-R-4`/`RCR-AC-3` and records the file-by-file audit below. Nothing in the original `RCR-R-1..3` / `RCR-AC-1..2` changed. |

## 2. Context

Several reporting-tool tables render resizable, sortable columns via the same hand-copied pattern: a `<th>` carries a sort-click handler (`[prSortableColumn]`, or a direct `(click)="sortBy(...)"` / `(click)="validateOrder(...)"` binding) alongside a resize-handle `div` (`mousedown` → drag). Dragging a column's resizer and releasing the mouse over the header cell (not back over the thin resizer strip) makes the browser synthesize a `click` on the header afterward, which the sort listener reads as a sort request — the user did not click to sort, they resized. `results-list.component.ts` (Results Center) was the reported instance; because the resize/sort wiring was copy-pasted rather than shared, every other copy carries the same defect independently.

- TRD: `docs/trd/trd.md` — no architectural change; this is an event-handling defect duplicated across several Angular components.
- UX: `docs/ux-ui/design.md` §8 — resizable/sortable table headers are an existing pattern; this spec does not change their visual contract.

## 3. In Scope / Out of Scope

### In scope

- Preventing a column-resize drag from being interpreted as a sort click, in **every** reporting-tool table that combines a resize handle with a sort-click header, for every column (Title/first-column included — it is simply the widest, easiest-to-reproduce case).
- A regression test per affected file that fails on current code and passes after the fix.
- The file-by-file audit (`RCR-R-4`) confirming exactly which components are affected and which are not.

### Out of scope

- Extracting the duplicated resize logic into one shared directive/mixin. The user asked to apply the *same adjustment*, not to refactor; each file keeps its own copy of the guard, matching its existing style (see `design.md` `RCR-DD-2`). Recorded as a follow-up, not required here.
- Any visual/behavioral change to column resizing itself (min width, persistence, reset-on-double-click) — all unchanged, in every file.
- Any visual/behavioral change to legitimate sort-by-click on a header, in every file.
- The three components that matched an earlier broad grep for `onResizeStart|rc-col-resizer|validateOrder` but turned out, on inspection, to have **no resize handle at all** — they only share the unrelated `validateOrder` sort helper: `links-to-results-global.component.ts`, and both `mapped-results-modal.component.ts` files (`rd-theory-of-change` and `rd-contributors-and-partners` variants). Confirmed via `grep -n "mousedown|resize"` over each `.html`/`.ts` — zero hits in all three. Not affected; no fix needed; recorded here so a future audit does not re-flag them.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Any Results Center user who resizes a column | Resizing no longer re-sorts the table as a side effect |
| Any user of Programme Results, Portfolio Overview (admin), or the Bilateral centre results list who resizes a column | Same — resizing no longer re-sorts/re-triggers the header's click side effect |

## 5. User Stories

- **`RCR-US-1`** — As a Results Center user, I want to resize a column by dragging its handle, so that the table does not also re-sort while I'm just adjusting column width.
- **`RCR-US-2`** — As a user of any other reporting-tool table with resizable columns (Programme Results, Portfolio Overview, Bilateral centre results), I want the same guarantee, so that the same interaction does not misbehave differently depending on which screen I'm on.

## 6. Functional Requirements

### Required (MUST)

- **`RCR-R-1`** When a user presses down on a column's resize handle, drags, and releases the mouse anywhere over that column's header cell, the system MUST NOT change the table's sort field or sort order, and MUST NOT change the `combine` (phase-merge) flag that `validateOrder` maintains.
- **`RCR-R-2`** Column resizing (drag → width change, persistence to `localStorage`, double-click reset) MUST continue to work exactly as before.
- **`RCR-R-3`** A genuine click on a header's sortable area (not the resizer) MUST still sort the column, in either direction, exactly as before.
- **`RCR-R-4`** *(Amendment 2026-09-22)* The same guarantee as `RCR-R-1..3` MUST hold in every other reporting-tool table that combines a resize handle with a sort-click header: `programme-results.component.ts` (Programme Results), `bilateral-results-list.component.ts` (Bilateral centre results), and `portfolio-overview.component.ts` (Portfolio Overview matrix). A table confirmed to have **no** resize handle (`links-to-results-global.component.ts`, both `mapped-results-modal.component.ts`) is explicitly out of scope — see §3.

### Scenarios

#### Scenario: Resize drag ending inside the header does not sort *(`RCR-R-1`)*

- GIVEN the Results Center table is showing its default sort (`result_code`, descending)
- WHEN the user mouses down on the Title column's `.rc-col-resizer`, drags horizontally, and releases the mouse over the Title `<th>` (off the resizer strip)
- THEN the table's active sort field and order are unchanged
- AND the Title column's width reflects the drag
- BUT it must NOT toggle `aria-sort` on the Title `<th>`
- AND IT MUST NOT re-trigger for a second, later, unrelated click on the same header (that later click MUST still sort)

#### Scenario: Column resize keeps working *(`RCR-R-2`)*

- GIVEN the user drags a column's resizer by 50px
- WHEN the drag ends
- THEN `customWidths()` reflects the new width and it is persisted to `localStorage` under `RC_COLUMN_WIDTHS_STORAGE_KEY`

#### Scenario: A plain header click still sorts *(`RCR-R-3`)*

- GIVEN the table is showing its default sort
- WHEN the user clicks the Title column header (not the resizer) without dragging
- THEN the table sorts by Title
- AND IT MUST NOT be suppressed by the resize fix

#### Scenario: Parity across the other three tables *(`RCR-R-4`)*

- GIVEN any of Programme Results, Bilateral centre results, or Portfolio Overview showing its default sort
- WHEN the user mouses down on a column's resize handle, drags, and releases the mouse over that column's header (off the resizer strip)
- THEN the table's sort state (`table.sort` for the two `PrSortableColumnDirective`-based tables; `sortKey`/`sortAsc` for Portfolio Overview's own `sortBy`) is unchanged
- AND the column's width reflects the drag, exactly as `RCR-R-2` requires
- BUT it must NOT re-trigger for a second, later, unrelated click on the same header (that later click MUST still sort)

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No template, DTO, or API change. Pure client event-handling fix, scoped to the four files' own private resize-handling internals |
| Accessibility | `aria-sort` (or the equivalent sort indicator) must not flip as a side effect of a resize drag (this is itself an a11y-relevant regression the bug causes today), in every affected table |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RCR-AC-1` | Default sort active | User drags the Title resizer and releases over the header | Sort field/order unchanged; width changed |
| `RCR-AC-2` | Table in any sort state | User clicks a header directly (no drag) | Table sorts as before |
| `RCR-AC-3` | Any of Programme Results / Bilateral centre results / Portfolio Overview, default sort active | User drags a column's resizer and releases over that header | Sort state unchanged; width changed; a later plain click still sorts |

## 9. Defect Classes & Their Gates

| # | Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|---|
| **A** | **Phantom click after a resize drag mutates sort state** — the exact bug: a native `click` event synthesized by the browser after a mousedown-on-resizer/mouseup-on-`<th>` sequence reaches the header's sort listener (`[prSortableColumn]`'s `click` listener, `(click)="validateOrder(...)"`, or `(click)="sortBy(...)"`) | Jest test per affected file: simulate `onResizeStart` → `mousemove` → `mouseup` → dispatch a real `click` `MouseEvent` on `document`, assert it arrives with `defaultPrevented === true` and the sort spy/signal is unchanged | Remove the fix's click-guard registration in that file → the dispatched click is not prevented, the test fails (this is the mandatory red-before-fix run, confirmed via `git stash` on all four files at once) |
| **B** | **Guard leaks and swallows a later, unrelated click** | Same test, second assertion: dispatch a second `click` after the guard's cleanup (`setTimeout(0)` / `once`) and assert `defaultPrevented === false` | Register the guard without `{ once: true }` / without the `setTimeout` cleanup fallback → the second click is also swallowed, the test fails |
| **C** | **Resize mechanics regress** (width math, persistence, reset) | Existing tests per file (`Column resize`/`column resizing` describe blocks) — no change needed, re-run as-is | Break the drag width math in any file → its existing tests fail |
| **D** | **A component wrongly identified as affected/unaffected** — a fix applied where there is no resize handle, or a genuinely affected table missed | `grep -n "mousedown\|resize"` over each of the 6 originally-flagged `.html`/`.ts` files, recorded in §3 | A future file added to the "no resize" list without that grep having been run, or a new copy-pasted resize table shipped without this spec's fix pattern |

Verification commands (per root `CLAUDE.md`, agent-lean):

```
npx jest --silent --reporters=summary --no-coverage --testPathPattern="results-list.component|programme-results.component|bilateral-results-list.component|portfolio-overview.component"
npx ng lint --quiet
```

## 10. Dependencies & Assumptions

### Upstream

- `PrSortableColumnDirective` (`shared/components/pr-table/pr-sortable-column.directive.ts`) — its `@HostListener('click')` is the thing that actually performs the sort; the fix must stop the phantom click before it reaches this directive, since a fix inside `results-list.component.ts` alone (e.g. only touching `validateOrder`) would still leave the directive free to sort.

### Downstream

- None — no shared symbol changes, only private event-handling internals of `ResultsListComponent`.

### Assumptions

- **`A1`** — The reported repro (drag Title column, release inside the header) is caused by the browser's native click-after-mousedown/mouseup behavior, not by any explicit `.sort()` call inside the resize handlers. Confirmed by reading `onResizeStart`/`onWindowMouseMove`/`onWindowMouseUp` (`results-list.component.ts:887-917`): none of them call `table.sort` or `validateOrder`. The only code paths that sort are the template's `(click)="validateOrder(column.attr)"` (`results-list.component.html:216`) and `PrSortableColumnDirective`'s own `click` listener (`pr-sortable-column.directive.ts:23-26`), both bound to the `<th>`.
- **`A2`** *(Amendment)* — The same mechanism (mousedown-on-resizer / mouseup-on-header / browser-synthesized click) applies identically in `programme-results.component.ts`, `bilateral-results-list.component.ts`, and `portfolio-overview.component.ts`, since each independently implements the same `activeResize`/`onWindowMouseMove`/`onWindowMouseUp` shape (or, for Portfolio Overview, the same shape as inline closures) with a sort listener on the same `<th>`/header control. Confirmed by reading each file's resize block in full before editing (see `design.md`'s Premise Ledger).

## 11. Open Questions

None — root cause confirmed by direct code read; no proposal existed to carry forward.

## 12. Requirement ID Index

| ID | Title | Scenarios | ACs |
|---|---|---|---|
| `RCR-R-1` | Resize drag must not sort | Resize drag ending inside the header does not sort | `RCR-AC-1` |
| `RCR-R-2` | Resizing keeps working | Column resize keeps working | `RCR-AC-1` |
| `RCR-R-3` | Plain click still sorts | A plain header click still sorts | `RCR-AC-2` |
| `RCR-R-4` | Parity fix in Programme Results, Bilateral centre results, Portfolio Overview | Parity across the other three tables | `RCR-AC-3` |

## Required cross-references

- `docs/trd/trd.md` — no ADR affected; no architectural change.
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` — original fix.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts` — parity fix.
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts` — parity fix.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.ts` — parity fix.
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts` — the directive whose click listener actually performs the sort in three of the four files.
