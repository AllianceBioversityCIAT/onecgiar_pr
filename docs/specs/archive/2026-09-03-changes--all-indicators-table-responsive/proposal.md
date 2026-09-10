# Proposal — All Indicators Table Responsive & Column Streamlining

**One line:** Make the "All indicators" table 100% fluid with **zero horizontal scroll** across laptops and tablets by removing the cluttered "Next pending" action, replacing the static "Status" column with high-value ToC Progress (`QA %` / `Prel %`), and applying a responsive column-collapse ladder.

---

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/all-indicators-table-responsive` |
| Type | **Change** |
| Approval Mode | `gated` |
| Date | 2026-09-03 |
| User Mandate | *"puntos importantes omitir el scroll horizontal y pensar en el responsive ... vamos a remover por ahora la funcionalidad de next pending, pienso que podemos remover la columna status o reemplazarla"* |
| Slug Derivation | `all-indicators-table-responsive` |
| Status | **Proposal — Updated with Zero-Scroll Strategy** |

---

## 2. Intent & Core Mandate

1. **Zero Horizontal Scroll:** The "All indicators" table must fit 100% within the available content viewport (from wide screens down to 768px tablet) without requiring or displaying horizontal scrollbars (`overflow-x: hidden` / fluid auto-fit).
2. **Remove `Next pending`:** Eliminate `Next pending` from table rows, freeing up significant horizontal width in the `Actions` column.
3. **Replace `Status` with `Progress` (`QA %` / `Prel %`):** Swap the low-value status pill (`• Not started`) for actionable quantitative ToC achievement metrics (`QA X%  PREL Y%`).
4. **Responsive Column Adaptation:** On medium/smaller viewports, gracefully adapt secondary metadata (`Type`, `Center`) into the indicator cell to safeguard the title width.

---

## 3. Root Cause of Current Horizontal Scroll

1. **Rigid Grid Minimums:**
   - `.pr-flat-row` is currently hardcoded with `$pr-flat-tracks: minmax(240px, 1fr) 56px 130px 68px 60px 60px 92px 140px;` and `min-width: 820px`.
   - Combined with padding (`48px`) and grid gaps (`84px`), the table requires **~952px** minimum width.
2. **Sidebar Viewport Math:**
   - With the 240px platform sidebar expanded:
     - At **1024px** viewport: content area is only `~736px` ⇒ **~216px of horizontal overflow**.
     - At **1100px** viewport: content area is only `~812px` ⇒ **~140px of horizontal overflow**.
     - At **1280px** viewport: content area is `~992px` ⇒ Indicator column is squeezed to only ~240px.
3. **"Next pending" Bloat:**
   - The Actions column allocates `140px` to accommodate the multi-word `↓ Next pending` button and `✓ All pending KPIs reported` badge.

---

## 4. Responsive Strategy (Zero Horizontal Scroll)

To eliminate horizontal scrolling without losing information, we implement a 2-tier responsive ladder:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DESKTOP (≥ 1200px) — 7 Columns (Status replaced with Progress, Next pending removed)   │
├───────────────┬──────┬──────────────┬────────┬────────┬──────────┬──────────┬──────────┤
│ Indicator     │ AoW  │ Type         │ Center │ Target │ Achieved │ Progress │ Actions  │
│ (fluid 1fr)   │ 46px │ 110px        │ 60px   │ 48px   │ 48px     │ 78px     │ 80px     │
│ (~480px+)     │      │              │        │        │          │ QA/Prel  │ Rpt/···  │
└───────────────┴──────┴──────────────┴────────┴────────┴──────────┴──────────┴──────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ LAPTOP / TABLET (< 1200px down to 768px) — Zero Scroll via In-Card Metadata            │
├─────────────────────────────────────┬──────┬────────┬──────────┬──────────┬────────────┤
│ Indicator (with Type & Center chips)│ AoW  │ Target │ Achieved │ Progress │ Actions    │
│ (fluid 1fr)                         │ 46px │ 48px   │ 48px     │ 78px     │ 80px       │
│ (~390px at 1024px, ~280px at 768px) │      │        │          │ QA/Prel  │ Rpt/···    │
└─────────────────────────────────────┴──────┴────────┴──────────┴──────────┴────────────┘
```

### Key Optimizations:
1. **Remove `Next pending`:**
   - Actions cell shrinks from `140px` to `~80px` (`[Report]` button + `[link]` + `[...]` menu).
2. **Replace `Status` with `Progress` (`QA %` / `Prel %`):**
   - 7th column becomes `Progress` displaying `QA X%` (bold) and `PREL Y%` (secondary) in a clean 2-line layout identical to the user's mockup.
3. **Adaptive Secondary Columns (`Type` and `Center`):**
   - On screens `< 1200px`, `Type` and `Center` seamlessly transition from separate table columns into metadata chips beneath the indicator title (exactly as they already display in the Grouped view).
   - This recovers **170px of horizontal space**, completely eliminating the need for horizontal scroll.
4. **Remove `min-width: 820px`:**
   - Table width is set to `width: 100%`, adapting cleanly to any viewport.

---

## 5. Scope

- **In Scope:**
  - `reporting-aow-table.component.html`:
    - Flat table header: update columns to `Indicator`, `AoW`, `Type`, `Center`, `Target`, `Achieved`, `Progress`, `Actions`.
    - Body row: replace Status pill with ToC Progress (`QA %` / `Prel %`).
    - Remove `Next pending` button and badge from flat row actions.
    - Responsive classes (`hidden xl:block` on Type & Center header/cells, with chips fallback under Indicator on `< xl`).
  - `reporting-aow-table.component.scss`:
    - Remove `min-width: 820px` from `.pr-flat-row`.
    - Adjust `$pr-flat-tracks` and add responsive grid definitions for `< 1200px`.
    - Remove horizontal scroll constraints.
  - `reporting-aow-table.component.ts`:
    - Expose sortable `__sortProgress` or `__qaProgress` in `flatTableRows()`.
    - Remove dead next-pending bindings from flat template.
  - `reporting-aow-table.component.spec.ts`:
    - Update unit tests for the flat table columns, Progress rendering, and removed Next pending.

- **Out of Scope:**
  - Grouped AoW cards view (preserves current behavior).
  - Backend ToC computation endpoints.

---

## 6. Visual Reference

- **Location:**
  - `docs/specs/changes/all-indicators-table-responsive/mockup/all-indicators-current-table.png` (Overcrowded 8-column layout).
  - `docs/specs/changes/all-indicators-table-responsive/mockup/achievement-qa-prel-target.png` (ToC Achievement / Progress widget: `QA 0%  PREL. 5.6%`).

---

## 7. Requirement Delta Preview

### ADDED Requirements
- **AIR-R-1 (ToC Progress Column):** Column 7 displays `QA %` (bold text) and `Prel. %` (secondary text) with progress tooltip explaining target attainment.
- **AIR-R-2 (Adaptive Responsive Grid without Scroll):** On viewports `< 1200px`, table dynamically reorganizes columns so `Type` and `Center` render as chips under the indicator title, preventing horizontal scrollbars down to 768px.

### MODIFIED Requirements
- **AIR-R-3 (Actions Column Compaction):** Actions cell is strictly dedicated to `[Report]`, `[Link]`, and `[...]` actions (width reduced to ~80px).
- **AIR-R-4 (Fluid Layout):** Remove fixed `min-width: 820px`; table is 100% fluid.

### REMOVED Requirements
- **AIR-R-5 (Next Pending Removal):** Remove `Next pending` button and "All pending KPIs reported" banner from the flat table.
- **AIR-R-6 (Status Pill Removal):** Remove the static textual Status pill column (`• Not started`, `• In progress`, etc.).

---

## 8. Success Criteria

1. **Zero horizontal scroll:** The table renders without any horizontal scrollbar on screens from 1600px down to 768px.
2. **Indicator description readability:** At 1024px viewport (with sidebar open), the Indicator column has at least 350px of available space.
3. **Actions cell is compact and clean:** No button wrapping; actions fit in a single row.
4. **ToC Progress visibility:** Users see `QA %` and `Prel %` for each indicator directly in the table.
5. **100% test pass rate:** All unit tests pass in `reporting-aow-table.component.spec.ts` and `dashboard-lab`.

---

## 9. Next Step

```text
/akili-specify changes/all-indicators-table-responsive
```
