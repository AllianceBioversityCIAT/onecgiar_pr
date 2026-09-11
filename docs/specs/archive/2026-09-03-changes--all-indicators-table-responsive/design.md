# Technical Design — All Indicators Table Responsive & Column Streamlining

- **Spec Path:** `docs/specs/changes/all-indicators-table-responsive/design.md`
- **Component:** `ReportingAowTableComponent`
- **Files Affected:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/reporting-aow-table.component.ts`

---

## 1. Grid Track Architecture & Geometry

### Comparison of CSS Grid Layouts

```text
CURRENT (8 Columns, Forced Horizontal Scroll):
$pr-flat-tracks: minmax(240px, 1fr) 56px 130px 68px 60px 60px 92px 140px;
                 [Indicator]        [AoW] [Type] [Center] [Tgt] [Ach] [Status] [Actions]
Fixed sum: 56 + 130 + 68 + 60 + 60 + 92 + 140 = 606px + 7*12px (84px) + padding (48px) = 738px.
min-width: 820px;

NEW (6 Columns, 100% Fluid, Zero Horizontal Scroll):
$pr-flat-tracks: minmax(260px, 1fr) 48px 56px 56px 76px 80px;
                 [Indicator]        [AoW] [Tgt] [Ach] [Progress] [Actions]
Fixed sum: 48 + 56 + 56 + 76 + 80 = 316px + 5*10px (50px) + padding (40px) = 406px.
min-width: none (100% fluid).
```

### Available Width Distribution:
- **1440px viewport (desktop):** Content width ~1150px $\rightarrow$ Indicator gets **~744px**.
- **1024px viewport (laptop + sidebar open):** Content width ~736px $\rightarrow$ Indicator gets **~330px**.
- **768px viewport (tablet):** Content width ~528px $\rightarrow$ Indicator gets **~122px**.
- **Result:** No horizontal scrollbar is ever rendered (`overflow-x: hidden`).

---

## 2. Design Decisions

### AIR-DD-1: 6-Column Streamlined Grid
- **Decision:** Remove `Type` and `Center` as standalone table columns, and replace `Status` with `Progress`.
- **Rationale:** `Type` and `Center` occupy 198px of horizontal space while merely repeating metadata already filtered in the toolbar dropdowns. Placing them as chips under the title mirrors the proven pattern from the Grouped view and guarantees zero horizontal scroll.

### AIR-DD-2: Indicator Cell Metadata Cluster
- **Decision:** In column 0 (`Indicator`), render the description, `Show more` toggle, and a flex wrap container with:
  - `row.__typeLabel` as a violet rounded pill (`bg-[#6b46e51f] text-[var(--pr-color-primary-400)]`).
  - `row.__centerLabel` (when not `'—'`) as a slate acronym badge (`bg-slate-100 text-slate-700 border border-slate-200`).
- **Rationale:** One cohesive visual scan gives the user title, type, and center without eye travel.

### AIR-DD-3: Progress Column Layout (QA % / Prel. %)
- **Decision:** Column 5 renders a clean 2-tier stacked metric:
  - Line 1: `QA` label (`text-[10px] uppercase text-[var(--pr-text-subtle)]`) + bold percentage (`text-[12.5px] font-bold tabular-nums text-[var(--pr-text-heading)]`).
  - Line 2: `Prel.` label (`text-[9.5px] uppercase text-[var(--pr-text-subtle)]`) + secondary percentage (`text-[11px] font-semibold tabular-nums text-[var(--pr-text-secondary)]`).
  - Full container is wrapped in `[prTooltip]="progressTracksTooltip(row)"`.
  - If `!hasUsableTarget(row)`, displays italicized `'No target set'` or `'Overachieved'` label.
- **Rationale:** Direct answer to the user's need: seeing verified vs submitted progress directly in the table.

### AIR-DD-4: Action Cell Uniformity & Compaction
- **Decision:** Remove `isLastReportedRow(row)` and `nextPendingRow()` from the flat table template.
- **Rationale:** `Next pending` only ever appeared on one row, forcing an artificial 140px width on every row. Eliminating it makes all rows uniform, reduces width to 80px, and prevents button wrapping.

### AIR-DD-5: Sorting & Data Transformation
- **Decision:** In `flatTableRows()`, add `__sortProgress: progressOf(row)` to enable sorting the table by QA achievement percentage. Update column header `prSortableColumn` bindings:
  - `indicator_description`
  - `__aowCode`
  - `__sortTarget`
  - `__sortAchieved`
  - `__sortProgress`

---

## 3. Template Changes (`reporting-aow-table.component.html`)

### Header Row
```html
<tr class="pr-flat-row pr-flat-head">
  <th class="pr-flat-cell" scope="col" prSortableColumn="indicator_description">
    <span class="inline-flex items-center gap-[4px] cursor-pointer">
      Indicator <pr-sort-icon field="indicator_description" />
    </span>
  </th>
  <th class="pr-flat-cell text-center" scope="col" prSortableColumn="__aowCode">
    <span class="inline-flex items-center justify-center gap-[4px] w-full cursor-pointer">
      AoW <pr-sort-icon field="__aowCode" />
    </span>
  </th>
  <th class="pr-flat-cell text-center" scope="col" prSortableColumn="__sortTarget">
    <span class="inline-flex items-center justify-center gap-[4px] w-full cursor-pointer">
      Target <pr-sort-icon field="__sortTarget" />
    </span>
  </th>
  <th class="pr-flat-cell text-center" scope="col" prSortableColumn="__sortAchieved">
    <span class="inline-flex items-center justify-center gap-[4px] w-full cursor-pointer">
      Achieved <pr-sort-icon field="__sortAchieved" />
    </span>
  </th>
  <th class="pr-flat-cell text-center" scope="col" prSortableColumn="__sortProgress">
    <span class="inline-flex items-center justify-center gap-[4px] w-full cursor-pointer">
      Progress <pr-sort-icon field="__sortProgress" />
    </span>
  </th>
  <th class="pr-flat-cell text-center" scope="col" aria-hidden="true">
    <span class="inline-flex items-center justify-center w-full">Actions</span>
  </th>
</tr>
```

### Body Row
- Column 0: Indicator with consolidated metadata chips.
- Column 1: AoW chip (`__aowCode`).
- Column 2: Target figure + button.
- Column 3: Achieved figure + button.
- Column 4: Progress QA/Prel figures + tooltip.
- Column 5: Actions (`[Report]`, `[Link]`, `[...]`).

---

## 4. Styling Changes (`reporting-aow-table.component.scss`)

```scss
$pr-flat-tracks: minmax(260px, 1fr) 48px 56px 56px 76px 80px;
$pr-flat-gap: 10px;

.pr-flat-scroll {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.pr-flat-row {
  display: grid;
  grid-template-columns: $pr-flat-tracks;
  gap: $pr-flat-gap;
  align-items: center;
  width: 100%;
  padding: 0 16px 0 20px;
  box-sizing: border-box;
}

.pr-flat-head {
  height: 40px;
  padding: 0 16px 0 20px;
}

.pr-flat-body {
  min-height: 54px;
  padding: 10px 16px 10px 20px;
}
```

---

## 5. Controller Changes (`reporting-aow-table.component.ts`)

In `flatTableRows()` computed property:
```ts
__sortProgress: progressOf(row),
```
Remove `__sortStatus` as column 7 is now `Progress`.

---

## 6. Accessibility

- Headers keep `scope="col"` and accessible `prSortableColumn` announcements.
- Progress metrics include full text tooltip readable by screen readers via `aria-label` or `prTooltip`.
- Actions buttons retain explicit accessible labels: `aria-label="Copy link to this KPI"`, `aria-label="More actions"`.
