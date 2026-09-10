# Technical Design — Results Table Resizable Columns (Drag-to-Resize)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/changes/results-table-resizable-columns/` |
| Slug | `results-table-resizable-columns` |
| Type | **Change** |
| Requirements | `TRC-R-1` through `TRC-R-4`, `US-1` through `US-3` |
| Surface | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/` |

---

## 2. Architectural Context & Data Flow

```
User Drag Event (Header Resize Handle)
       │
       ▼ (mousedown: capture startX, startWidth, minPx)
Window mousemove listener
       │
       ▼ deltaX = clientX - startX
newWidth = Math.max(column.minPx, Math.round(startWidth + deltaX))
       │
       ▼
this.customWidths.update(...) [Signal]
       │
       ├─────────────────────────────────────────────────┐
       ▼                                                 ▼
grid() computed signal                            minWidth() computed signal
tracks: custom[key] ? `${custom[key]}px` : col.track     recalculates content width
       │                                                 │
       ▼                                                 ▼
[style.grid-template-columns]="grid()"            [style.min-width]="minWidth()"
(Header & Body rows update synchronously)          (Horizontal scroll adjusts smoothly)
       │
       ▼ (mouseup)
Save to localStorage: 'pr.programmeResults.columnWidths'
```

---

## 3. Design Decisions

### TRC-DD-1: Reactive State Management & Local Storage Persistence
- Custom column widths are managed via an Angular signal:
  ```ts
  export const PGR_COLUMN_WIDTHS_STORAGE_KEY = 'pr.programmeResults.columnWidths';

  export function readStoredColumnWidths(): Record<string, number> {
    try {
      const raw = localStorage.getItem(PGR_COLUMN_WIDTHS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  }

  export function writeStoredColumnWidths(widths: Record<string, number>): void {
    try {
      localStorage.setItem(PGR_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
    } catch {
      // Ignore quota / private browsing errors
    }
  }
  ```
- Component holds:
  ```ts
  readonly customWidths = signal<Record<string, number>>(readStoredColumnWidths());
  readonly hasCustomWidths = computed(() => Object.keys(this.customWidths()).length > 0);
  ```

### TRC-DD-2: Dynamic Track Resolution in `grid()` and `minWidth()`
- In `programme-results.component.ts`:
  ```ts
  readonly grid = computed(() => {
    const custom = this.customWidths();
    const tracks = this.visibleColumns().map(column => {
      const w = custom[column.key];
      return w ? `${w}px` : column.track;
    });
    return [...tracks, PGR_ACTIONS_TRACK].join(' ');
  });

  readonly minWidth = computed(() => {
    const custom = this.customWidths();
    const columns = this.visibleColumns();
    const tracks = columns.length + 1;
    const content = columns.reduce((total, column) => {
      const w = custom[column.key];
      return total + (w || column.minPx);
    }, 0) + PGR_ACTIONS_MIN_PX;
    return `${content + PGR_GRID_GAP * (tracks - 1) + PGR_ROW_PADDING}px`;
  });
  ```
- Because both `tr.pgr-head` and `tr.pgr-data-row` bind `[style.grid-template-columns]="grid()"`, updating `customWidths` maintains identical column widths across all rows with zero drift.

### TRC-DD-3: DOM Event Handling & Resizing Lifecycle
- When the user starts dragging a column handle:
  1. `mousedown`:
     - Stop event propagation (`event.stopPropagation()`) so `tbl.sort(...)` does not fire.
     - Prevent text selection (`event.preventDefault()`).
     - Query header cell's rendered width via `thElement.getBoundingClientRect().width`.
     - Attach global `mousemove` and `mouseup` event listeners on `window` (using an arrow function or `Renderer2`).
     - Set document cursor to `col-resize` and add active CSS class.
  2. `mousemove`:
     - Compute `deltaX = event.clientX - startX`.
     - Calculate `newWidth = Math.max(column.minPx, Math.round(startWidth + deltaX))`.
     - Update `customWidths.update(prev => ({ ...prev, [column.key]: newWidth }))`.
  3. `mouseup`:
     - Detach window listeners.
     - Restore document body cursor and styles.
     - Persist current `customWidths()` to `localStorage`.
- Cleanup on destroy: Ensure any active window listeners are removed if the component unmounts mid-drag.

### TRC-DD-4: Resizer Handle Markup & SCSS Styling
- In `programme-results.component.html`:
  ```html
  <th
    #thEl
    class="pgr-th pgr-th--sortable relative"
    scope="col"
    tabindex="0"
    [prSortableColumn]="column.sortField"
    [style.color]="sortColor(tbl, column.sortField)"
    (keydown.enter)="tbl.sort(column.sortField)">
    <span class="truncate">{{ column.label }} {{ sortArrow(tbl, column.sortField) }}</span>
    <div
      class="pgr-col-resizer"
      role="separator"
      aria-orientation="vertical"
      [attr.aria-label]="'Resize ' + column.label + ' column'"
      title="Drag to resize column. Double-click to reset."
      (mousedown)="onResizeStart($event, column, thEl)"
      (dblclick)="onResizeReset(column, $event)"
      (click)="$event.stopPropagation()"></div>
  </th>
  ```
- In styles:
  ```scss
  .pgr-col-resizer {
    position: absolute;
    right: -1px;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: col-resize;
    z-index: 2;
    touch-action: none;
    user-select: none;
    transition: background-color 150ms ease;
  }
  .pgr-col-resizer:hover,
  .pgr-col-resizer--active {
    background-color: var(--pr-color-primary-400);
  }
  ```

### TRC-DD-5: Reset Mechanism
- **Individual Reset (Double-Click)**:
  - Double clicking the handle clears that column's entry from `customWidths`:
    ```ts
    onResizeReset(column: PgrColumnDef, event: MouseEvent): void {
      event.stopPropagation();
      event.preventDefault();
      this.customWidths.update(prev => {
        const next = { ...prev };
        delete next[column.key];
        writeStoredColumnWidths(next);
        return next;
      });
    }
    ```
- **Global Reset ("Reset column widths" in Columns picker)**:
  - Inside the `Columns ⚙` dropdown:
    ```ts
    resetAllColumnWidths(): void {
      this.customWidths.set({});
      writeStoredColumnWidths({});
    }
    ```

---

## 4. Verification & Testing Strategy

1. **Unit Tests** (`programme-results.component.spec.ts`):
   - Verify `grid()` applies custom pixel widths when present in `customWidths`.
   - Verify `minWidth()` scales correctly with custom widths.
   - Verify dragging updates the signal and clamps at `column.minPx`.
   - Verify double click resets individual column width.
   - Verify global reset button restores default tracks.
   - Verify `localStorage` is updated on resize end.
   - Verify mousedown on resizer does not invoke table sort.
