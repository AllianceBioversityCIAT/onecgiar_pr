## 1. Restore the Submitter field for all phases

- [x] 1.1 In `rd-contributors-and-partners.component.html`, remove the outer `@if (!isCP2026())` wrapper around the Submitter block, leaving the inner `@if (this.rdPartnersSE.getConsumed())` and the `app-pr-select` / "cannot change the submitter" note unchanged.
- [x] 1.2 Update the inline comment above the block to state the Submitter renders in all phases (P2-3036 business reversal), removing the "2025 and earlier only" wording.

## 2. Verify

- [x] 2.1 Run `npm run build:dev` in `onecgiar-pr-client/` and confirm it passes.
- [x] 2.2 Visually verify on a 2026 P25 result that the Submitter field is now shown, and on a 2025 P25 result that the section is unchanged. (Local Playwright on result 8565, phase 36 / Reporting 2026 - P25: Submitter app-pr-select present, 2026 view otherwise intact.)
- [x] 2.3 Confirm the other 2026 redesign deltas (question label, KPI Statement/description, info notes, Level/HLO hidden in No, 50-word limit) still apply only to 2026+.
