# Proposal — Results Table Resizable Columns (Drag-to-Resize)

**Interactive drag-to-resize handles for the Science Program Results table headers**, allowing users to manually adjust column widths to fit titles, categories, and dates according to their display needs.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/results-table-resizable-columns/` |
| Slug | `results-table-resizable-columns` |
| Type | **Change** |
| Approval Mode | `gated` |
| Depends on | none |
| Parallel-safe | yes |
| Surface | `/result-framework-reporting/entity-details/:entityId/results` → `ProgrammeResultsComponent` |
| Reference | User screenshot `orca-paste-1788483201406-35f34ef7-176b-4a30-8c96-fa419093e597.png` |

---

## 2. Intent

Enable users to manually resize any table column in the **Results** tab of a Science Program by dragging the right border of its column header, ensuring that long titles can be expanded or short status/category columns tightened as needed, while keeping the layout fluid, aligned, and persistent across page reloads.

---

## 3. Problem / Current Behavior

Currently, the Results table in `ProgrammeResultsComponent` uses hardcoded CSS Grid track definitions in `PGR_COLUMNS`:
- `code`: `92px`
- `title`: `minmax(240px, 2fr)`
- `category`: `minmax(140px, 1fr)`
- `status`: `120px`
- `updated`: `100px`
- Optional columns (`createdBy`, `center`, `origin`, `created`): fixed or fractional (`1fr`)

### Consequences:
1. **Unbalanced white space on wide viewports**: The `2fr` and `1fr` proportions allocate excessive horizontal space to the `Category` column (which often contains short text like "Knowledge product" or "Innovation development"), leaving noticeable blank areas.
2. **Inflexible title viewing**: Result titles vary widely in length. Long titles truncate with an ellipsis without giving the user the ability to widen the column to read more text at a glance.
3. **No manual column adjustment**: While users can toggle optional columns on and off via the `Columns ⚙` picker, they have no way to resize columns by dragging header borders, which is standard in data-intensive reporting interfaces.

---

## 4. Proposed Outcome

1. **Header Drag-to-Resize Handles**:
   - Each resizable header (`th.pgr-th`) contains a dedicated resize handle on its right border (`cursor: col-resize`).
   - Hovering over the handle shows a visual cue; dragging it dynamically adjusts that column's width in real time across the entire grid (header and data rows).
2. **Independent Column Sizing**:
   - Resizing a column updates that column's track from its fractional/default track to an explicit pixel width (enforcing a safe `minPx` to avoid collapsing columns).
   - Other unadjusted columns retain their responsive behavior or default sizes.
3. **Double-Click or Action Reset**:
   - Double-clicking a resize handle or selecting "Reset column widths" in the `Columns ⚙` popover restores the default track widths.
4. **State Persistence**:
   - Custom column widths are saved in `localStorage` under `pr.programmeResults.columnWidths`, so adjustments persist when switching tabs or refreshing the page.
5. **A11y and UX Safety**:
   - Resizing does not trigger column sorting (event propagation stopped on mousedown/click).
   - The sticky Actions column (`...`) remains safely pinned to the right edge with zero layout breakages.

---

## 5. Scope

- **In Scope**:
  - `ProgrammeResultsComponent` (`programme-results.component.ts`, `programme-results.component.html`, styles).
  - Add resize handle markup and interaction events (`mousedown`, window `mousemove`, window `mouseup`).
  - Signal-based width tracking (`customWidths: Signal<Record<string, number>>`).
  - Integration with `grid()` and `minWidth()` computed signals so header and body rows stay 100% synchronized.
  - Reset action in the `Columns ⚙` popover.
  - Persistence to `localStorage`.
  - Unit and integration tests for column resizing logic.

- **Non-Goals**:
  - Drag-and-drop column reordering (out of scope for this change).
  - Global rewrite of other tables in the platform (this specifically targets the Results tab requested by the user).

---

## 6. Technical & Design Strategy

```
Header TH
┌──────────────────────────────────────────────┬─┐
│ CODE ▾                                       │ │ <── Resize Handle (cursor: col-resize)
└──────────────────────────────────────────────┴─┘
                                                │
                                                ▼ onDrag(deltaX)
                                          customWidths[key] = max(minPx, initialPx + deltaX)
                                                │
                                                ▼ updates
                    grid = computed(() => visibleColumns().map(c => customWidths[c.key] || c.track))
```

1. **State**:
   ```ts
   readonly customWidths = signal<Record<string, number>>(readStoredColumnWidths());
   ```
2. **Track Resolution**:
   ```ts
   readonly grid = computed(() => {
     const widths = this.customWidths();
     const tracks = this.visibleColumns().map(col =>
       widths[col.key] ? `${widths[col.key]}px` : col.track
     );
     return [...tracks, PGR_ACTIONS_TRACK].join(' ');
   });
   ```
3. **Resizer Element in Header**:
   ```html
   <th class="pgr-th pgr-th--sortable relative" ...>
     <span>{{ column.label }}</span>
     <div
       class="pgr-col-resizer"
       (mousedown)="onResizeStart($event, column)"
       (dblclick)="onResizeReset(column, $event)"
       (click)="$event.stopPropagation()"
       title="Drag to resize, double-click to reset"></div>
   </th>
   ```

---

## 7. Success Criteria

1. **Smooth Dragging**: Clicking and dragging the right boundary of any header column adjusts its width smoothly in real time without layout lag.
2. **Header-Body Alignment**: Header cells and data row cells remain perfectly aligned at all times during and after resizing.
3. **No Accidental Sort**: Dragging a column border does not trigger sort order toggling on that column.
4. **Minimum Width Bounds**: Columns cannot be collapsed below their defined `minPx` threshold.
5. **Persistence**: Custom column widths persist after navigating away and returning to the tab.
6. **Reset Capability**: Double-clicking a separator or clicking "Reset column widths" reverts to default responsive widths.
