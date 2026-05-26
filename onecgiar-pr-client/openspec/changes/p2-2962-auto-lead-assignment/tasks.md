## 1. Service — auto-assign core

- [x] 1.1 Add `tryAutoAssignLeadCenter()` and `tryAutoAssignLeadPartner()` to `rd-contributors-and-partners.service.ts` (empty-or-invalid + `length === 1` + correct `is_lead_by_partner` branch).
- [x] 1.2 Call try-methods at end of `setPossibleLeadCenters` and `setPossibleLeadPartners` (after list rebuild).
- [x] 1.3 In `getSectionInformation`, ensure order: `setPossible*` → `setLead*OnLoad` → try auto-assign (or rely on try’s “don’t overwrite valid” guard after onLoad).

## 2. UI triggers

- [x] 2.1 Add `onLeadByPartnerChange(isPartnerLed: boolean)` on service or component: clear opposite lead, refresh possible lists (triggers auto-assign).
- [x] 2.2 Wire `app-pr-yes-or-not` `(selectOptionEvent)` to the new handler instead of inline null assignments.
- [x] 2.3 Confirm `emitPartnerEvent` / contributing-center multi-select / delete center paths already call `setPossible*` (no extra wiring unless a path misses try).

## 3. Tests

- [x] 3.1 Expand `rd-contributors-and-partners.service.spec.ts`: single center + center-led → assigns code; two centers → no assign; valid existing lead → no overwrite; toggle to partner-led with one partner → assigns id.
- [x] 3.2 Run `rd-contributors-and-partners.component.spec.ts` — ensure delete-center + single remaining re-assigns if applicable.
- [x] 3.3 Run affected specs: `npm run test -- rd-contributors-and-partners`

## 4. Verify (manual)

- [x] 4.1 **Before behavior (prtest / without change):** one contributing center, center-led → Lead Center dropdown empty; user must select manually.
- [x] 4.2 **After behavior (local):** same setup → Lead Center pre-filled; save → green-check / reload shows `is_leading_result` on that center.
- [x] 4.3 Partner-led + one partner → Lead Partner pre-filled; two partners → no auto-fill.
- [x] 4.4 Toggle Yes/No on “led by external partner?” with single entity → correct field auto-fills, other cleared.
- [x] 4.5 Screenshots to `onecgiar_pr/.local-screenshots/` (gitignored); optional Jira comment on P2-2962.
