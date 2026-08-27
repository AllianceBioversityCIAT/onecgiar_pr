## 1. AC7 — reorder read-only TOC data (2026 only)

- [x] 1.1 After the "Indicator Tipology" block, add a 2026-only Unit of measurement + Target display: `@if (isCP2026() && selectedIndicatorData()) { ... }`.
- [x] 1.2 Gate the existing inline Unit/Target `<div *ngIf="selectedIndicatorData()">` inside the `related_node_id` block so it only renders for 2025 (`@if (!isCP2026())`), keeping 2025 layout identical.

## 2. AC7 — mandatory contribution + placeholder (2026 only)

- [x] 2.1 Set the "Contribution to indicator target" `app-pr-field-header [required]="isCP2026()"` so the red asterisk shows in 2026.
- [x] 2.2 Add a hidden `appFeedbackValidation` div (gated by `isCP2026()`) marking the field complete when `contributing_indicator` has a value, so the section mandatory scan picks it up (P2-2960 pattern). Confirm against the section's DOM-scan validation.
- [x] 2.3 Change the contribution input placeholder to `isCP2026() ? 'Add here contribution to target' : 'Enter target'`.

## 3. AC8 — hide explanation (2026 only)

- [x] 3.1 Change `@if (!hidden)` around the "Explanation of how the result aligns..." textarea to `@if (!hidden && !isCP2026())`.

## 4. Verify

- [x] 4.1 `npm run build:dev` passes.
- [x] 4.2 Run the Jest suite (no regressions).
- [x] 4.3 Visual on a 2026 P25 result: Unit/Target under Indicator Tipology, contribution asterisk + new placeholder, no explanation textarea.
- [x] 4.4 Visual on a 2025 P25 result: section unchanged (Unit/Target original position, no asterisk, "Enter target", explanation visible).
