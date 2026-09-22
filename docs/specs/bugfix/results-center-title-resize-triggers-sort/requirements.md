# Requirements — Results Center: column resize must not trigger a sort

## 1. Module / Feature

| Field | Value |
|---|---|
| Module | `results` (Results Center list) |
| Sub-feature | Results Center table — column resize handle |
| Module code | `RCR` |
| Status | `draft` |
| Type | Bug · **Bug Mode** |
| Depth | **Lite** — one client file, no server/API/migration surface, root cause confirmed by direct code read (no `proposal.md` existed, so root cause was confirmed here per Bug Mode) |
| Ticket | none supplied |
| Source | User report (no `proposal.md`) |

## 2. Context

Results Center's table (`app-results-list`) renders resizable, sortable columns: each `<th>` carries both `[prSortableColumn]` (click-to-sort) and a `.rc-col-resizer` drag handle (`mousedown` → resize). Dragging the Title column's resizer to widen/narrow it, then releasing the mouse over the header cell (not back over the thin resizer strip), causes the column to sort — the user did not click to sort, they resized.

- TRD: `docs/trd/trd.md` — no architectural change; this is an event-handling defect inside one Angular component.
- UX: `docs/ux-ui/design.md` §8 — resizable/sortable table headers are an existing pattern; this spec does not change their visual contract.

## 3. In Scope / Out of Scope

### In scope

- Preventing a column-resize drag from being interpreted as a sort click, for every column in the Results Center table (Title included — it is simply the widest, easiest-to-reproduce case).
- A regression test that fails on current code and passes after the fix.

### Out of scope

- The same `onResizeStart` / `.rc-col-resizer` pattern is duplicated (copy-pasted, not shared) in `programme-results`, `portfolio-overview`, `bilateral-results-list`, `links-to-results-global`, and both `mapped-results-modal` components, and likely carries the identical defect. Fixing those is a separate concern — see `design.md` §13 Open Gaps. Bug Mode requires staying scoped to the reported root cause.
- Any visual/behavioral change to column resizing itself (min width, persistence, reset-on-double-click) — all unchanged.
- Any visual/behavioral change to legitimate sort-by-click on a header.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Any Results Center user who resizes a column | Resizing no longer re-sorts the table as a side effect |

## 5. User Stories

- **`RCR-US-1`** — As a Results Center user, I want to resize a column by dragging its handle, so that the table does not also re-sort while I'm just adjusting column width.

## 6. Functional Requirements

### Required (MUST)

- **`RCR-R-1`** When a user presses down on a column's resize handle, drags, and releases the mouse anywhere over that column's header cell, the system MUST NOT change the table's sort field or sort order, and MUST NOT change the `combine` (phase-merge) flag that `validateOrder` maintains.
- **`RCR-R-2`** Column resizing (drag → width change, persistence to `localStorage`, double-click reset) MUST continue to work exactly as before.
- **`RCR-R-3`** A genuine click on a header's sortable area (not the resizer) MUST still sort the column, in either direction, exactly as before.

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

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | No template, DTO, or API change. Pure client event-handling fix inside `results-list.component.ts` |
| Accessibility | `aria-sort` must not flip as a side effect of a resize drag (this is itself an a11y-relevant regression the bug causes today) |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RCR-AC-1` | Default sort active | User drags the Title resizer and releases over the header | Sort field/order unchanged; width changed |
| `RCR-AC-2` | Table in any sort state | User clicks a header directly (no drag) | Table sorts as before |

## 9. Defect Classes & Their Gates

| # | Defect class | Gate | Input that makes the gate FAIL |
|---|---|---|---|
| **A** | **Phantom click after a resize drag mutates sort state** — the exact bug: a native `click` event synthesized by the browser after a mousedown-on-resizer/mouseup-on-`<th>` sequence reaches `[prSortableColumn]`'s `click` listener and `(click)="validateOrder(...)"` | Jest test in `results-list.component.spec.ts`: simulate `onResizeStart` → `mousemove` → `mouseup` → dispatch a real `click` `MouseEvent` on `document`, assert it arrives with `defaultPrevented === true` | Remove the fix's click-guard registration → the dispatched click is not prevented, the test fails (this is the mandatory red-before-fix run) |
| **B** | **Guard leaks and swallows a later, unrelated click** | Same test, second assertion: dispatch a second `click` after the guard's cleanup (`setTimeout(0)` / directive's `once`) and assert `defaultPrevented === false` | Register the guard without `{ once: true }` / without the `setTimeout` cleanup fallback → the second click is also swallowed, the test fails |
| **C** | **Resize mechanics regress** (width math, persistence, reset) | Existing tests `results-list.component.spec.ts:537-559` (`Column resize` describe block) — no change needed, re-run as-is | Break `onWindowMouseMove`'s width math → those existing tests fail |

Verification commands (per root `CLAUDE.md`, agent-lean):

```
npx jest --silent --reporters=summary --no-coverage --testPathPattern="results-list.component"
npx ng lint --quiet
```

## 10. Dependencies & Assumptions

### Upstream

- `PrSortableColumnDirective` (`shared/components/pr-table/pr-sortable-column.directive.ts`) — its `@HostListener('click')` is the thing that actually performs the sort; the fix must stop the phantom click before it reaches this directive, since a fix inside `results-list.component.ts` alone (e.g. only touching `validateOrder`) would still leave the directive free to sort.

### Downstream

- None — no shared symbol changes, only private event-handling internals of `ResultsListComponent`.

### Assumptions

- **`A1`** — The reported repro (drag Title column, release inside the header) is caused by the browser's native click-after-mousedown/mouseup behavior, not by any explicit `.sort()` call inside the resize handlers. Confirmed by reading `onResizeStart`/`onWindowMouseMove`/`onWindowMouseUp` (`results-list.component.ts:887-917`): none of them call `table.sort` or `validateOrder`. The only code paths that sort are the template's `(click)="validateOrder(column.attr)"` (`results-list.component.html:216`) and `PrSortableColumnDirective`'s own `click` listener (`pr-sortable-column.directive.ts:23-26`), both bound to the `<th>`.

## 11. Open Questions

None — root cause confirmed by direct code read; no proposal existed to carry forward.

## 12. Requirement ID Index

| ID | Title | Scenarios | ACs |
|---|---|---|---|
| `RCR-R-1` | Resize drag must not sort | Resize drag ending inside the header does not sort | `RCR-AC-1` |
| `RCR-R-2` | Resizing keeps working | Column resize keeps working | `RCR-AC-1` |
| `RCR-R-3` | Plain click still sorts | A plain header click still sorts | `RCR-AC-2` |

## Required cross-references

- `docs/trd/trd.md` — no ADR affected; no architectural change.
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` — the file this spec changes.
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts` — the directive whose click listener actually performs the sort.
