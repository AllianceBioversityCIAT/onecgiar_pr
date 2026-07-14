# Tasks — P2-3141: Search Bar for KPIs at the AoW level

All tasks are **frontend-only** (`onecgiar-pr-client/`). No backend, migration, or git-state tasks.

## 1. Search state (service)

- [x] 1.1 Add `searchText = signal<string>('')` to `src/app/pages/result-framework-reporting/pages/entity-aow/services/entity-aow.service.ts` (next to the existing table signals).

## 2. Search bar + filtering (table component)

- [x] 2.1 In `.../entity-aow-aow/components/aow-hlo-table/aow-hlo-table.component.ts`: import `FormsModule`; add `filteredTableData` computed implementing the matching rules from `specs/aow-indicator-search/spec.md` (case-insensitive; group-title match keeps whole group; otherwise filter indicators by `indicator_description` or `type_name`; drop groups without visible indicators unless their title matches; empty query returns `tableData()` untouched; never mutate source arrays — build `{ ...group, indicators: [...] }` copies).
- [x] 2.2 Point `expandedRowKeys` at `filteredTableData()` so remaining groups stay expanded while searching.
- [x] 2.3 In `aow-hlo-table.component.html`: add the `.search_input` block (material-icons-round `search` icon + input, placeholder `Find indicator...`) above the `<p-table>`, bound with `[ngModel]="entityAowService.searchText()"` / `(ngModelChange)="entityAowService.searchText.set($event)"`; switch `[value]` to `filteredTableData()`.
- [x] 2.4 Make the `#emptymessage` search-aware: when `entityAowService.searchText()` is non-empty show `No indicators match your search.`, otherwise keep the current generic message.

## 3. Reset behavior (host pages)

- [x] 3.1 Reset `entityAowService.searchText.set('')` in `.../entity-aow-aow/entity-aow-aow.component.ts` (`ngOnInit` and `ngOnDestroy`, where `aowId` is already managed) and re-reset on route `aowId` param changes.
- [x] 3.2 Reset `searchText` on init of the 2030 Outcomes page `.../entity-aow-2030/entity-aow-2030.component.ts`.

## 4. Tests (Jest)

- [x] 4.1 Extend/create `aow-hlo-table.component.spec.ts`: filtering by indicator statement, by group title, case-insensitivity, no-match → empty list, empty query returns original reference, source signal data not mutated, title-matching empty group survives.
- [x] 4.2 Update `entity-aow-aow.component.spec.ts` (and 2030 spec if present) for the search reset behavior.
- [x] 4.3 Run the affected test files and `npm run lint:fix` on touched files; fix fallout.

## 5. Verification (UI, against prtest backend)

- [x] 5.1 `npm start` in `onecgiar-pr-client` and open `http://localhost:4200/result-framework-reporting/entity-details/:entityId/aow/:aowId` for a program with many indicators; verify every scenario in `specs/aow-indicator-search/spec.md` (search bar visible on both tabs and 2030 view, filtering, group-title match, actions on filtered rows, no-match message, clear, tab persistence, navigation reset).
- [x] 5.2 Capture screenshots to `onecgiar_pr/.local-screenshots/p2-3141-*.png` (not committed) for the Jira documentation / QA test cases.
