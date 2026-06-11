## 1. Restack the card body (CSS)

- [x] 1.1 In `rd-evidences.component.scss`, change `.ev_card_body` from a wrapping horizontal row to a vertical stack: `flex-direction: column; align-items: flex-start;` and a single vertical `gap`.
- [x] 1.2 Reset `.ev_ro_details` so it no longer uses `flex: 1 1 240px`; let it span the full width (`align-self: stretch`) and keep `align-items: flex-start` for icon/text alignment.

## 2. Verify

- [x] 2.1 Run existing spec: `npm run test src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts` (no behavior change expected — must stay green). → 36/36 pass.
- [x] 2.2 Visual check in browser on result 8555 evidences: link on its own line, tags below, description full-width below; cards without a description show no empty line. → confirmed (LINK → TAGS → DESC full-width 1203px).
