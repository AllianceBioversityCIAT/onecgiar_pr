# Tasks — Intermediate Outcomes not exclusive to an AoW

Frontend-only (`onecgiar-pr-client/`). The backend flag `is_aow` shipped separately in commit `3620284f3`.

## 1. Split the Outcomes list (service)

- [x] 1.1 In `.../entity-aow/services/entity-aow.service.ts`, add `tocResultsOutcomesExclusiveByAowId` and `tocResultsOutcomesNonExclusiveByAowId` as `computed` over `tocResultsOutcomesByAowId`, keyed on the `is_aow` flag. Treat a missing flag as exclusive so the page keeps its current behaviour against a payload without the field. Do not mutate or re-fetch the source signal.

## 2. Host the second list (table component)

- [x] 2.1 In `.../aow-hlo-table/aow-hlo-table.component.ts`, extend `tableType` with `'outcomes-non-exclusive'`, point `case 'outcomes'` at the exclusive computed and add the new case; add the matching `emptyStateMessage()` string.
- [x] 2.2 Add `@Input() showSearch = true`, `@Input() renderOverlays = true`, `@Input() instanceId = ''`.
- [x] 2.3 In `aow-hlo-table.component.html`, wrap the search block in `@if (showSearch)` and the three overlay blocks (create modal, view-results drawer, target-details drawer) in `@if (renderOverlays)`; suffix the table id and the `<th>` ids with `instanceId`.
- [x] 2.4 In the group-header template, render the `Not exclusive to this AoW` chip with its tooltip when `tableType === 'outcomes-non-exclusive'`, reusing `.tab-content_chip`.
- [x] 2.5 Add `.non-exclusive-chip` in `aow-hlo-table.component.scss` using `--pr-color-blue-*` tokens (no hex literals).

## 3. Render the separate section (AoW page)

- [x] 3.1 In `entity-aow-aow.component.html` `@case ('outcomes')`, hide the main table only when the exclusive list is empty AND the non-exclusive list is not.
- [x] 3.2 Add the section below it — heading, info note, and a second `app-aow-hlo-table` with `tableType="outcomes-non-exclusive"`, `instanceId="NonExclusive"`, `[showSearch]="false"` and `[renderOverlays]="!exclusive.length"` — gated on the non-exclusive list being non-empty.
- [x] 3.3 Style the heading and the note in `entity-aow-aow.component.scss` with the blue tokens.

## 4. Describe the sidebar page

- [x] 4.1 Add the info note above the table in `entity-aow-unplanned.component.html`, explaining what these entries are and how they differ from an AoW's Outcomes.
- [x] 4.2 Style it in `entity-aow-unplanned.component.scss`, matching the AoW note.

## 5. Tests

- [x] 5.1 `entity-aow.service.spec.ts` — 6 cases for the split: exclusive only, non-exclusive only, missing flag treated as exclusive, both lists empty, all non-exclusive, source signal not mutated.
- [x] 5.2 `aow-hlo-table.component.spec.ts` — add the two new computeds to the hand-rolled service mock; update the existing `tableType: 'outcomes'` case to the exclusive computed; add the `'outcomes-non-exclusive'` case, the new empty-state string, and 5 DOM cases for `showSearch` / `renderOverlays` / `instanceId`.

## 6. Verification

- [x] 6.1 `npx jest src/app/pages/result-framework-reporting/pages/entity-aow` → 317 passed.
- [x] 6.2 `npm run lint` → all files pass.
- [x] 6.3 Browser check on `SP05/AOW06` with Playwright: main list shows the 4 AoW-exclusive Outcomes; the section below shows 7208 and 7258, each tagged; exactly **1** search input and **1** modal instance when reporting from the new section; tab still reads `Outcomes (6)`; the `/aow/unplanned` note renders.
- [ ] 6.4 Re-verify against the real payload once `is_aow` is live on prtest (currently absent — validated via response interception).
- [x] 6.5 `npm run test:coverage` → 378 suites / 4012 tests passed. Statements 83.9%, branches 65.3%, functions 81.51%, lines 84.35% — all above the 50/60/60/60 thresholds.
