# Kaizen Entry — changes/bilateral-review-visual-polish

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-visual-polish` |
| Date | 2026-09-18 |
| Branch | `qa-development-2026` (spec branch; pin `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (BVP-T-1, BVP-T-2) | `tasks.md` |
| Reviewer FAIL rework attempts | 0 | `execution.md` (both passed on attempt 1) |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | 0 | `execution.md` |
| Judgment-day severe findings | 0 | `design.md` |
| Validation FAIL / WARN | 0 / 0 | `archive-summary.md` |

## Lessons

- **KZ-changes--bilateral-review-visual-polish-1 — Fixed-width table column headers must account for uppercase character expansion in copy.** (Product, Low)
  - Root cause: Column width was fixed at `100px` for dates (`col [style.width]="100px"`). The copy `'Submission date'` expanded to 15 uppercase letters (`120px+` with tracking and padding), causing the last characters to be overlapped by the sticky adjacent column. Shortening to `'Date'` resolves this cleanly without breaking table layout contracts.
  - Evidence: User screenshot showed `SUBMISSION DA...` truncated by sticky `ACTIONS` column; resolved by updating `BILATERAL_REVIEW_COPY.table.headers.date` to `'Date'`.
  - Standardization: → P1

## Noted, not a lesson

- Unit test assertion `expect(action.className).not.toMatch(/\bbg-\[/);` caught an initial attempt to add a background hover tint to the review button during TDD before reviewer submission, maintaining strict adherence to UI rule 7 (text-only emphasis in content areas).

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/ux-ui/design.md` |
| Edit | In §8 table guidelines, add a rule that uppercase column headers on fixed-width columns (< 110px) must be budgeted for max character length. |
| Severity | Low |
| Status | pending |
