# Module Spec Tasks — AoW In-Card Filter Overflow & Indicator Row Compaction

- **Module:** `results-framework-reporting`
- **Feature:** `aow-filter-popover`
- **Spec Path:** `docs/specs/changes/aow-filter-popover/`
- **Branch:** `qa-development-2026`

---

## 1. Task Matrix

| Task ID | Description | Requirements | Design | Status | Size |
|---|---|---|---|---|---|
| `AFP-T-1` | Slicing & Popover Controller Logic in Components | `AFP-R-1`, `AFP-R-2`, `AFP-R-5` | §3.1, §7 | `completed` | S (40 LOC) |
| `AFP-T-2` | Template & SCSS Sizing, Popovers & Remove Next Pending | `AFP-R-1`, `AFP-R-2`, `AFP-R-3`, `AFP-R-4`, `AFP-R-5` | §3.2, §4, §5 | `completed` | M (60 LOC) |
| `AFP-T-3` | Unit Test Assertions & Regression Suite | `AFP-R-1`–`AFP-R-5`, `NFR-1`–`NFR-4` | §1–§7 | `completed` | S (40 LOC) |

---

## 2. Task Details

### Task AFP-T-1: Slicing & Popover Controller Logic in Components
- **Scope:**
  - In `ReportingAowTableComponent` (`reporting-aow-table.component.ts`):
    - Implement `visibleCentersOf(group)` and `overflowCentersOf(group)` with top-3 slice.
    - Implement `visibleTypesOf(group)` and `overflowTypesOf(group)` with top-2 slice.
    - Implement `hasOverflowFilters(group)`.
    - Implement `isOverflowCenterActive(group)` and `isOverflowTypeActive(group)`.
    - Add `openCardFilterKey = signal<string | null>(null)`.
    - Add `toggleCardFilterPopover(groupKey: string, event: MouseEvent)`.
    - Add `@HostListener('document:keydown.escape')` and outside-click dismissal to close popover.
  - In `DashboardLabComponent` (`dashboard-lab.component.ts`):
    - Implement computed signals for `byAowVisibleCenters`, `byAowOverflowCenters`, `byAowVisibleTypes`, `byAowOverflowTypes`.
    - Add `byAowFilterPopoverOpen = signal(false)`.
    - Add toggle and dismissal methods.
- **Verification:**
  - `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-aow-table/*.ts"`
  - `npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts"`
- **Done Criteria:**
  - Slicing methods return proper subsets without mutating original collections.
  - TypeScript compiles with 0 errors.

---

### Task AFP-T-2: Template & SCSS Sizing, Popovers & Remove Next Pending
- **Scope:**
  - In `reporting-aow-table.component.html`:
    - Update in-card filter strip to render visible centers/types + `[ ⠚ Filter ]` button when overflow exists.
    - Render in-card popover dropdown with overflow chips.
    - In `#indicatorRow`:
      - Scale title to `text-[12.5px] font-medium leading-[1.35]`.
      - Scale Target & Achieved to `text-[13px] font-bold tabular-nums` with `text-[9px]` subtitles.
      - Scale Report button to `h-[26px] px-[10px] text-[11px] font-medium rounded-[6px]`.
      - Scale Copy Link and Menu actions to `h-[26px] w-[26px]`.
      - Completely delete lines 874–889 containing the `Next pending` button.
  - In `reporting-aow-table.component.scss`:
    - Update `.pr-reporting-row` grid tracks, padding (`8px 16px 8px 24px`), and min-height (`48px`).
    - Update `.pr-row-action` to 26px height and 11px font.
  - In `dashboard-lab.component.html`:
    - Update By-AoW filter strip to render visible items + `[ ⠚ Filter ]` popover.
- **Verification:**
  - `npx ng build --configuration development` compiles with 0 template errors.
- **Done Criteria:**
  - Filter strip renders cleanly without horizontal scrolling or button cramming.
  - Popover opens cleanly and selects filters.
  - Next pending button is absent.
  - Row height is compact 48px.

---

### Task AFP-T-3: Unit Test Assertions & Regression Suite
- **Scope:**
  - In `reporting-aow-table.component.spec.ts`:
    - Add test for `visibleCentersOf` / `overflowCentersOf` partitioning.
    - Add test verifying that `Next pending` button is absent from grouped indicator rows.
    - Add test verifying popover toggle and outside-click dismissal.
    - Verify row typography and element classes.
  - In `dashboard-lab.component.spec.ts`:
    - Verify By-AoW filter partitioning and popover behavior.
- **Verification:**
  - `npx jest --testPathPattern="reporting-aow-table.component.spec.ts"` (100% pass).
  - `npx jest --testPathPattern="dashboard-lab\."` (100% pass).
- **Done Criteria:**
  - All unit tests pass with zero regressions.
