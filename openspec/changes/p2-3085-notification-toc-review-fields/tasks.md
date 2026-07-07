# Tasks: P2-3085 — ToC review fields in the Contribution Request notification

## 1. Component logic
- [x] 1.1 Add a `TocContributionReview` interface (level, outcome_label, outcome_statement, indicator_typology, unit_of_measurement, target, contribution_target, toc_result_id, toc_results_indicator_id, planned_result).
- [x] 1.2 Add `tocReview()` accessor on `notification-item.component.ts` returning `notification?.toc_contribution_review ?? []`.

## 2. Template
- [x] 2.1 In `notification-item.component.html`, inside the `@if (notification?.is_map_to_toc)` branch, after the request sentence and before `.notification_content_actions`, add `@if (tocReview().length) { … }`.
- [x] 2.2 `@for (review of tocReview(); track $index)` → one card per entry, rendering the 7 fields in AC order (Level, HLO/IO/2030 Outcome, Outcome Statement, Indicator Typology, Unit of measurement, Target, Contribution Target).
- [x] 2.3 Neutral placeholder ("—") for missing values (D4).

## 3. Styles
- [x] 3.1 Add a `.toc_review` block in `notification-item.component.scss` (label/value rows, read-only look, multi-card separation), reusing `--pr-*` tokens.

## 4. Tests
- [x] 4.1 Jest: `tocReview()` returns `[]` when absent and the array when present.
- [ ] 4.2 Jest (fixture from Juanda's contract): block renders the 7 fields in order for a ToC request; hidden for non-ToC / empty.
- [ ] 4.3 Jest: missing field → placeholder, never "undefined".

## 5. Verification
- [ ] 5.1 BLOCKED on data: e2e runtime needs a real `is_map_to_toc: true` request in the reviewer's inbox. Coordinate a test contribution with Juanda/QA, then verify the 7 fields render in order and Accept/Decline still work.
- [ ] 5.2 Confirm field mapping Q1 (`outcome_statement` vs `statement`) against the first real payload.
