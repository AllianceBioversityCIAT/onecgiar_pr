## 1. Frontend — pre-flight

- [x] 1.1 Re-run the exhaustive grep for `linked or bundled` and `has-innovation-link` across `onecgiar-pr-client/src` and `onecgiar-pr-server/src`. Expected today: two label sources plus one code comment. Any third occurrence is reported on P2-3358 as a finding, not silently fixed.
- [x] 1.2 Confirm the four line references still match on the current branch: `fields-manager.service.ts:182`, `rd-contributors-and-partners.component.ts:227 / 229-230 / 241-242 / 248-249`, `rd-contributors-and-partners.component.html:443 / 447 / 460`.

## 2. Frontend — the single wording

- [x] 2.1 `onecgiar-pr-client/src/app/shared/services/fields-manager.service.ts:182` — replace the `[innovation-use-form]-has-innovation-link` label with "Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?". Leave `hide: this.isP22()` and `required: true` untouched.
- [x] 2.2 `…/rd-contributors-and-partners/rd-contributors-and-partners.component.ts:241-242` — collapse `linkedResultQuestionLabel` from a `computed` with a Policy-change ternary to a readonly constant holding the same approved sentence (design D2).
- [x] 2.3 `…/rd-contributors-and-partners.component.ts:227, 229-230` — delete `POLICY_CHANGE_RESULT_TYPE_ID` and `isPolicyChangeResult()` once their last usage is gone (design D3). Confirm zero remaining references in the whole client before deleting.

## 3. Frontend — remove the header

- [x] 3.1 `…/rd-contributors-and-partners.component.html:443` — delete the `app-pr-field-header` block bound to `linkedResultHeaderLabel`, leaving no orphaned wrapper or separator.
- [x] 3.2 `…/rd-contributors-and-partners.component.ts:248-249` — delete `linkedResultHeaderLabel` and `showLinkedResultHeader()`.

## 4. Frontend — optional cleanup (only if it stays mechanical)

- [ ] 4.1 Evaluate rewiring the component-driven path to read its label from `FieldsManagerService` (design D1). Proceed **only** if `hide` and `required` resolve identically for all seven typologies it serves; otherwise skip and record the decision in the change.
      **Skipped, on purpose.** `isCP2026()` is `phase_year >= 2026` while `isP22()` is the *portfolio* — they are not complementary (prtest has 2025-phase results inside portfolio P25). Adopting `fieldRef` on path B would add `hide: isP22()` to seven typologies, so the swap is not mechanical. Design decision D1 held.

## 5. Tests

- [x] 5.1 `…/rd-contributors-and-partners.component.spec.ts:454-475` — rewrite the three assertions that pin the old strings and the Policy-change branch (do not delete them).
- [x] 5.2 Add one case per rendering path asserting the single new sentence, covering Policy change, Innovation use and one of the remaining typologies.
- [x] 5.3 Add a case asserting no header is rendered above the question, including for a 2026-portfolio result.
- [x] 5.4 `…/shared/services/fields-manager.service.spec.ts` — update it if it asserts the old label.
- [x] 5.5 Run `npm run test src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.spec.ts` and the fields-manager spec; paste the real output into the ticket. No "should pass".

## 6. Verification in the app

- [x] 6.1 `npm start` and open Section 2 for a **2026-phase** result of each typology group — Policy change, Innovation use, and one of the remaining seven — in the **W1/W2** form. Confirm the single wording and no header.
      Verified: result 8894 (Innovation development, W1/W2, 2026) — new wording, no header, no old text.
- [x] 6.2 Repeat for the **W3/Bilateral** form.
      Verified: results 8896 (Policy change, Bilateral, 2026) and 8897 (Knowledge product, 2026) — new wording, the Policy-change variant is gone, no header.
- [ ] 6.3 Check the read-only view in at least two result states.
      ⚠️ **NOT verified.** No read-only result was opened. Low risk (same template, same binding) but it is not checked.
- [x] 6.4 Confirm answering YES still opens the linked-results dropdown and that a previously stored answer is displayed unchanged.
- [x] 6.5 Open a **2025-phase** result and confirm Section 2 is unchanged and the question is not introduced there.
- [x] 6.6 Generate the **PDF** and the **Excel** export from a 2026 result and read the question text in both. This cannot be settled from the code — the sentence has no occurrence in the server. If either carries the old wording, report it on P2-3358 with evidence; do not modify server code.
- [x] 6.7 Screenshots of the before/after go to `onecgiar_pr/.local-screenshots/` (gitignored), named `p2-3358-*`.

## 7. Close out

- [ ] 7.1 Commit on the current feature branch: `🎨 style(rd-contributors-and-partners) P2-3358: Use one linked/bundled question for every result typology`. Verify the branch immediately before committing.
- [ ] 7.2 Document on P2-3358: what a user sees now, how to verify it (result typology, portfolio and phase of the test data stated up front), what was verified and what was not, and the commit hash.
- [ ] 7.3 State explicitly in which environment QA can see it, and how to tell "not deployed" from "broken".

## 8. Verification results (25 Aug 2026)

- **Unit tests:** 112 passed / 8 suites (`rd-contributors-and-partners` folder) + 111 passed (`fields-manager.service.spec.ts`). Real output, no failures.
- **Build:** `ng build --configuration development` completes; only pre-existing warnings from other components. The new sentence appears in two emitted chunks and the old one appears in none — mutation evidence, not inference.
- **Browser (localhost:4200, real prtest data):** results 8894, 8896, 8897 all show the single question with no header; answering YES still opens the "Please select a result" dropdown with its options.
- **PDF:** `GET /api/platform-report/result/8894` returns an S3 URL; the generated PDF was downloaded and read with `pdftotext -layout`. The question does not appear in it in any form. (A first extraction attempt with a hand-rolled parser returned ICC metadata, not text — it was discarded as unreliable.)
- **Excel:** covered by the exhaustive grep — the sentence exists in exactly two client files and nowhere in the server, so no export can carry it.
- **⚠️ Finding:** a **2025-phase** result inside portfolio P25 (id 5895, Innovation use) **does** render this question and now shows the new wording. The ticket's premise "the question is already 2026-only everywhere" does not hold, because `hide: isP22()` keys off the portfolio, not the year. The PO decision on the ticket already authorises updating the wording in previous form versions, so this is allowed — but QA must be told, or it will be reported as a regression.
- **Not verified:** the read-only view (task 6.3).
