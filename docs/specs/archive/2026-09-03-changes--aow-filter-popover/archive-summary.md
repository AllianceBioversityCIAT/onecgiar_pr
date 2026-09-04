# Archive Summary — AoW In-Card Filter Overflow & Tree-Table Row Compaction

**Outcome:** Shipped. Popover overflow filtering for Centers and Types, removal of "Next pending" button, compaction of indicator rows, and tree-table grid unification aligning HLO headers and indicator rows with pixel precision. All 796 tests passing.

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/aow-filter-popover/` · Prefix `AFP` |
| Archive Date | 2026-09-03 |
| Archived from branch | `qa-development-2026` (default pin `master`) |
| Depth / Approval Mode | Full · `pre-approved` |
| Final Status | **Complete** — 3/3 tasks `completed`, 120/120 tests green |

## 2. Requirements Delivered

| ID | Behaviour | Delivered by | Evidence |
|---|---|---|---|
| `AFP-R-1` | Top-N visible chips (All + 3 Centers, All Types + 2 Types) | `visibleCentersOf`, `overflowCentersOf`, `visibleTypesOf`, `overflowTypesOf` | jest, unit partition assertions |
| `AFP-R-2` | `[ ⠚ Filter ]` popover button for overflow chips with outside-click dismissal | `toggleCardFilterPopover`, `@HostListener('document:keydown.escape')` | jest, DOM presence & event toggle assertions |
| `AFP-R-3` | Compact indicator rows (12.5px title, 13px mono figures, 26px report button, 48px row min-height) | `.pr-reporting-row` SCSS and template typography classes | jest, class contract & styles |
| `AFP-R-4` | Permanent removal of transient "Next pending" button | Removed from template, body actions, and flat table | jest, null assertions in spec |
| `AFP-R-5` | Parity in `DashboardLabComponent` By-AoW view | Computed signals & template popover in `dashboard-lab` | jest, component suite |
| `AFP-R-6` | Tree-table alignment & HLO tabular grid layout | Shared `$pr-reporting-tracks` SCSS grid, `.pr-hlo-row`, cleaned subtitle labels | jest, 120/120 tests pass |

## 3. Files Changed

| File | What |
|---|---|
| `…/components/reporting-aow-table/reporting-aow-table.component.html` | Top-N in-card filter strip, `[ ⠚ Filter ]` popover, compact row elements, 8-column `.pr-hlo-row`, removed redundant Target/Achieved subtitles |
| `…/components/reporting-aow-table/reporting-aow-table.component.scss` | Shared `$pr-reporting-tracks` variable, `.pr-hlo-head` & `.pr-reporting-row` matching tracks, `.pr-hlo-row` definition |
| `…/components/reporting-aow-table/reporting-aow-table.component.ts` | Slicing signals and popover toggle/dismissal controller logic |
| `…/components/reporting-aow-table/reporting-aow-table.component.spec.ts` | Unit tests for filter partitioning, popover toggle, row compaction, and absence of Next pending |
| `…/pages/dashboard-lab/dashboard-lab.component.html` | By-AoW filter strip overflow popover parity |
| `…/pages/dashboard-lab/dashboard-lab.component.ts` | By-AoW filter slicing signals and popover management |

## 4. Test Evidence

| Gate | Result |
|---|---|
| `npx jest --testPathPattern="reporting-aow-table.component.spec.ts"` | **120/120 passed** (100%) |
| `npx jest --testPathPattern="dashboard-lab"` | **796/796 passed** (100%) |
| `npx ng build --configuration development` | **Clean build** (0 errors) |

## 5. Accepted Warnings & Follow-Ups

None. All column tracks and gestures are verified with backward compatibility preserved.
