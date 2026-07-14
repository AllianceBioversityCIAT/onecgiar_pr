# Design — P2-3141: Search Bar for KPIs at the AoW level

## Context

**Ticket:** [P2-3141](https://cgiarmel.atlassian.net/browse/P2-3141). Frontend-only.

Current state (verified in code, branch base `staging`):

- **Data flow (API → service → component → template):**
  1. `EntityAowAowComponent.ngOnInit` (`entity-aow-aow.component.ts:33-38`) reads `:aowId` from the route and calls `EntityAowService.getTocResultsByAowId(entityId, aowId)`.
  2. `EntityAowService` (`entity-aow/services/entity-aow.service.ts`) calls `GET_TocResultsByAowId` / `GET_2030Outcomes` (declared in `results-api.service.ts`) and stores results in signals: `tocResultsOutputsByAowId`, `tocResultsOutcomesByAowId`, `tocResults2030Outcomes`.
  3. `AowHloTableComponent.tableData` (computed, `aow-hlo-table.component.ts:43-54`) picks the signal per `@Input() tableType` (`outputs` | `outcomes` | `2030-outcomes`).
  4. Template renders a PrimeNG `<p-table>` with `rowGroupMode="subheader"`, `groupRowsBy="result_title"`, `dataKey="result_title"`; groups are HLO/Outcome (`result_title`), rows are `item.indicators[]` (fields used: `indicator_id`, `indicator_description`, `type_name`, `target_value_sum`, `actual_achieved_value_sum`, `progress_percentage`).
- **Consumers of the same data/shape** (behavior to preserve): `expandedRowKeys` computed (`:56-62`, keys by `result_title`); `openReportResultModal` / `openViewResultDrawer` / `openTargetDetailsDrawer` (`:92-126`) receive the **group item** and filter `item.indicators` by `indicator_id` — they must keep receiving objects with the full group shape; tab counts in `EntityAowAowComponent.tabs` (`:26-29`) read the **unfiltered** service signals.
- **Table usages (3):** Outputs tab, Outcomes tab (`entity-aow-aow.component.html:36,47` — instances are created/destroyed per tab via `@switch`), and 2030 Outcomes page (`entity-aow-2030.component.html:9`).
- **No search/filter exists** in the AoW view today.
- **Existing search pattern elsewhere:** `outcome-indicator` module — service-level `searchText` signal, global `.search_input` pill style (`src/styles.scss:66-86`, icon `material-icons-round` + borderless input), and `FilterIndicatorBySearchPipe` (`outcome-indicator/pipes/filter-indicator-by-search.pipe.ts`).

Stakeholders: Ángel Jarrín (requester — asked that the change be documented so QA can derive test cases), Cami / María Camila Giraldo (QA), SP users reporting against hundreds of indicators.

## Goals / Non-Goals

**Goals:**
- A search input at the AoW indicators view that filters, as the user types, the grouped table by **KPI statement** (`indicator_description`), **Indicator typology** (`type_name`) and **group title** (`result_title`), case-insensitively.
- Works in all three usages of the table: High-Level Outputs tab, Outcomes tab, and 2030 Outcomes page.
- Search text persists when switching between the Outputs/Outcomes tabs (same page), and resets when navigating to another AoW/page.
- Groups with no matching indicators are hidden; a clear "no matches" empty state shows when nothing matches.
- Clearing the input restores the full table. No mutation of the service signal data.

**Non-Goals:**
- No backend/search-API work (data is already fully client-side).
- No fuzzy matching, highlighting of matched text, or search across numeric/status columns (targets, achieved, status).
- No search on the sibling pages `entity-aow-all` / `entity-aow-unplanned` (different views; out of ticket scope).
- No pagination changes (table has no paginator).

## Decisions

1. **Search input lives inside `AowHloTableComponent`** (above the `<p-table>`), not in each host page.
   - *Why:* one implementation automatically covers the 3 usages (Outputs, Outcomes, 2030 Outcomes) with identical UX; the ticket targets exactly this table.
   - *Alternative considered:* placing it in `entity-aow-aow.component.html` above the `@switch` — rejected: it would need duplicating in `entity-aow-2030` and separates the control from the data it filters.

2. **Search state = `searchText: signal<string>('')` in `EntityAowService`**, reset on page init/destroy.
   - *Why:* tab switches destroy/recreate the table component (`@switch`), so component-local state would lose the query between tabs; the service signal survives tab switches (deliberate UX) and follows the `outcome-indicator` precedent (`OutcomeIndicatorService.searchText`). Reset in `EntityAowAowComponent` (`ngOnInit`/`ngOnDestroy`, where `aowId` is already managed) and in the 2030 page init so a stale query never leaks across AoWs/pages.

3. **Filtering via a non-mutating `computed` (`filteredTableData`) in `AowHloTableComponent`** instead of reusing `FilterIndicatorBySearchPipe`.
   - *Why:* the pipe expects the `outcome-indicator` shape (`item.toc_results[].indicators`, `toc_result_title`) and **mutates** its input (`originalIndicators`, `isVisible`) — unsafe against shared service signals and misaligned with this component's signals + `OnPush` architecture (existing `tableData`/`expandedRowKeys` computeds).
   - *Matching rules (based on the pipe's WPs behavior, extended per user feedback):* if the group `result_title` matches → the whole group stays with all its indicators; otherwise keep only indicators whose `indicator_description` (KPI statement) **or `type_name` (Indicator typology)** matches; drop groups with no visible indicators (title-matching groups survive even if they have zero indicators, preserving their existing "no associated indicators" row). Empty/whitespace query → return `tableData()` untouched.
   - Group objects passed to modals/drawers keep their shape (`{ ...group, indicators: filtered }`), so `openReportResultModal`/drawers keep working on filtered rows.
   - `expandedRowKeys` switches to `filteredTableData()` so remaining groups stay expanded while searching.

4. **Markup/UX:** global `.search_input` pill (already in `styles.scss` — no new CSS), `material-icons-round` `search` icon, placeholder `Find indicator...`, `FormsModule` + `[ngModel]`/`(ngModelChange)` bound to the service signal. The `wp-home` quirk `(keydown.backspace)="searchText.set('')"` (backspace wipes the whole query) is **not** replicated — standard editing behavior instead.
   - Search-aware empty state: when a query yields no rows, `#emptymessage` shows "No indicators match your search." instead of the generic message.

5. **Testing:** extend/create the Jest spec for `AowHloTableComponent` covering the filtering computed (match by indicator, match by group title, no-match, clear/reset, non-mutation of source signal) — this doubles as the documented behavior list QA asked for.

## Risks / Trade-offs

- [Filtering recomputes `{ ...group }` copies on each keystroke] → data sets are hundreds of rows at most; `computed` memoization + `OnPush` keep this cheap. No debounce needed at this scale.
- [Service-level `searchText` could leak between pages sharing `EntityAowService` (root-provided)] → explicit reset on `EntityAowAowComponent` init/destroy and 2030 page init.
- [Groups hidden while searching also hide their "Report result" empty-state row] → intended: search is a find tool; clearing restores everything. Covered in specs so QA tests it deliberately.
- [Existing `#emptymessage` text is Outputs-specific ("High-Level Outputs Indicators")] → out of scope to fix generally; only the search-active variant is added.

## Migration Plan

Pure additive frontend change: ship with the branch PR to `staging`; rollback = revert commit. No data, API, or config migration.

## Open Questions

- None blocking. (Ángel confirmed by voice note to proceed with the ticket as described; placement/behavior follows the existing outcome-indicator pattern.)
