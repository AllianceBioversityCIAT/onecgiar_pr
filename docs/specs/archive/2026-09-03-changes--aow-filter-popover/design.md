# Module Spec Design — AoW In-Card Filter Overflow & Indicator Row Compaction

- **Module:** `results-framework-reporting`
- **Feature:** `aow-filter-popover`
- **Type:** Change
- **Status:** `in-review`
- **Spec Path:** `docs/specs/changes/aow-filter-popover/`
- **Branch:** `qa-development-2026`

---

## 1. Document Control & Budget

| Dimension | Budget / Target |
|---|---|
| Expected Tasks | 3 (`AFP-T-1`, `AFP-T-2`, `AFP-T-3`) |
| Expected LOC Delta | ~140 LOC (HTML/SCSS + TS + Spec) |
| Expected Review Rounds | 1 round |
| Depth | Lite-Standard |

---

## 2. Executive Summary

This design provides a unified, responsive solution for Area of Work indicators:
1. **Top-N + Popover Pattern for In-Card Filters:** Limits directly visible chips to top 3 centers and top 2 types. All additional items overflow into an accessible `[ ⠚ Filter ]` popover button.
2. **Compact Indicator Row Sizing:** Reduces typography, metric figures, and action heights so rows take `48px` instead of `58px`, gaining ~20% vertical density.
3. **Action Column Cleanup:** Removes the transient `Next pending` button for complete row action uniformity.
4. **By-AoW Parity:** Mirrors the filter overflow pattern in `DashboardLabComponent`'s By-AoW view.

---

## 3. In-Card Filter Partitioning & Popover Architecture

### 3.1 Partitioning Logic
In `ReportingAowTableComponent`:
- When total partner centers `> 4`:
  - `visibleCentersOf(group)`: slice index `0..3` (top 3 centers).
  - `overflowCentersOf(group)`: slice index `3..end` (remaining centers).
- When total partner centers `<= 4`: all centers remain directly visible.
- When total result types `> 3`:
  - `visibleTypesOf(group)`: slice index `0..2` (top 2 types).
  - `overflowTypesOf(group)`: slice index `2..end` (remaining types).
- When total result types `<= 3`: all types remain directly visible.
- `hasOverflowFilters(group)`: returns `true` if `overflowCentersOf(group).length > 0 || overflowTypesOf(group).length > 0`.

### 3.2 In-Card Filter Button & Popover UI
- The trigger button is styled similarly to the top toolbar filter:
  - Height: `22px`, padding: `0 8px`, font-size: `11px`, border-radius: `5px`.
  - Icon: `filter_list` (14px).
  - Label: `Filter` (or active overflow label).
  - Badge: displays `1` or `2` when an overflow center or type is active.
  - Active class: `bg-[var(--pr-color-primary-50)] border-[var(--pr-color-primary-300)] text-[var(--pr-color-primary-700)] font-semibold`.
- Popover DOM:
  - Position: `absolute right-0 top-[28px] z-30 w-[280px] rounded-[10px] border border-[var(--pr-border)] bg-white p-[12px] shadow-lg`.
  - Content:
    - If `overflowCentersOf(group).length > 0`: Section heading `Other Centers` with chips.
    - If `overflowTypesOf(group).length > 0`: Section heading `Other Types` with chips.
    - Click handler selects filter and updates indicator list immediately.
    - Dismissal: Outside click or `Escape` key closes the popover via `@HostListener('document:keydown.escape')` and outside-click handler.

---

## 4. Indicator Row Sizing & Compaction Architecture

### 4.1 Typography & Sizing Ladder
| Element | Current | Redesigned Compact Token |
|---|---|---|
| Indicator Title | `text-[13.5px] font-semibold leading-[1.4]` | `text-[12.5px] font-medium leading-[1.35]` |
| Target Figure | `text-[15px] font-bold` + `10px` uppercase | `text-[13px] font-bold tabular-nums` + `text-[9px] uppercase tracking-[0.04em] text-[var(--pr-text-subtle)]` |
| Achieved Figure | `text-[15px] font-bold` + `10px` uppercase | `text-[13px] font-bold tabular-nums` + `text-[9px] uppercase tracking-[0.04em] text-[var(--pr-text-subtle)]` |
| Status Pill | `px-[8px] py-[2px] text-[11px]` | `px-[7px] py-[1.5px] text-[10.5px]` |
| Report Button | `h-[32px] px-[12px] text-[12px]` | `h-[26px] px-[10px] text-[11px] font-medium rounded-[6px]` |
| Copy Link Action | `h-[30px] w-[30px]` | `h-[26px] w-[26px] rounded-[6px]` |
| Overflow Menu [⋯] | `h-[32px] w-[32px]` | `h-[26px] w-[26px] rounded-[6px]` |
| Row Minimum Height | `min-height: 58px` | `min-height: 48px` |
| Row Padding & Gap | `padding: 10px 20px 10px 32px; gap: 16px;` | `padding: 8px 16px 8px 24px; gap: 12px;` |

### 4.2 CSS Grid Track Allocation
In `reporting-aow-table.component.scss`:
```scss
.pr-reporting-row {
  grid-template-columns: 24px minmax(280px, 1fr) 72px 72px 104px 124px 108px 28px;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 8px 16px 8px 24px;
}
```

---

## 5. Removal of "Next Pending" Action

- Lines 874–889 in `reporting-aow-table.component.html` are deleted.
- The action cell becomes clean and stable:
  - `[ 🔗 ]` (when `canCopyLink(row)`)
  - `[ Report ]` (when `canReport() && actionLabel(row)`)
  - `[ ⋯ ]` (menu with View results, Target details, Copy link)
- No row heights expand due to wrapped actions.

---

## 6. Challenge Reversions (Step 2.3)

| Decision | What does removing this break? | Resolution |
|---|---|---|
| Remove `Next pending` button from `#indicatorRow` | Does removing this break user navigation to pending indicators? No. Users can see pending indicators directly in the table list and click "Report" on any of them. The "Next pending" button was transient, appeared only on a single row, and pushed the layout out of alignment. | Safe to remove. Tests updated to assert uniform row actions. |
| Limit visible Center and Type buttons | Does limiting visible chips break filtering? No. All options remain accessible: top items are 1 click away, remaining items are 2 clicks away inside the `[ ⠚ Filter ]` popover. | Full access preserved without horizontal cramming. |

---

## 7. By-AoW View Parity in `DashboardLabComponent`

In `dashboard-lab.component.html:1641–1698`:
- Add `byAowVisibleCenters`, `byAowOverflowCenters`, `byAowVisibleTypes`, `byAowOverflowTypes` computed signals in `dashboard-lab.component.ts`.
- Add `byAowFilterPopoverOpen = signal(false)`.
- Render the `[ ⠚ Filter ]` button and popover when overflow items exist, ensuring the By-AoW banner filters never cram on responsive viewports.
