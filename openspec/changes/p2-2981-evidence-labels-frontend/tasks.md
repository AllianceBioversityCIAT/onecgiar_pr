## 1. Public-file question label (AC1)

- [ ] 1.1 In `evidence-item.component.html`, change the radio label "Is this a public file?" to "Can this evidence be shared publicly?"
- [ ] 1.2 In `user-evidence.component.html`, change the same label to "Can this evidence be shared publicly?"

## 2. Public info-note third bullet (AC2 — per Ángel 2026-06-02)

- [ ] 2.1 In `evidence-item.component.ts` `dynamicAlertStatusBasedOnVisibility()` (public branch, `is_public_file` true), replace the third bullet "You agree to the link to the file being displayed in the CGIAR Results Dashboard." with "Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products."
- [ ] 2.2 In `user-evidence.component.ts` `dynamicAlertStatusBasedOnVisibility()` (public branch), add the bullet "Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products." (this component has no third bullet today). Leave the NOT-public branch unchanged in both.

## 3. Model: new typology fields

- [ ] 3.1 In `model/evidencesBody.model.ts`, add to `EvidencesCreateInterface` the optional boolean fields: `policy_change_related`, `capacity_sharing_related`, `other_output_related`, `other_outcome_related`, `knowledge_product_metadata_related` (names aligned with Juanda's backend ticket)

## 4. Dynamic title + per-typology checkbox (AC3)

- [ ] 4.1 Add a typology→label resolver from the current `result_type_id` (read from `dataControlSE`/result object) returning the client-wording label (Innovation Use, Policy Change, Capacity Sharing for Development, KP, Other Output, Other Outcome, Innovation Development)
- [ ] 4.2 In `evidence-item.component.ts` `getEvidenceRelatedTitle()`, return "Indicate whether this evidence is related to an Impact Area score of 2 and/or to the {typology} metadata"
- [ ] 4.3 In `evidence-item.component.html`, render the per-typology type checkbox (named after the typology) bound to its `*_related` field, shown by `result_type_id`, next to the existing Impact Area checkboxes — informational only, no new validation
- [ ] 4.4 Mirror the same title resolver in `user-evidence.component.ts` `getEvidenceRelatedTitle()`

## 5. Innovation-dev component parity (AC3 — user-evidence)

- [ ] 5.1 In `user-evidence.component.html`, add `<app-pr-field-header [label]="getEvidenceRelatedTitle()">` and the checkbox block (Impact Areas + per-typology checkbox) mirroring `evidence-item.component.html`
- [ ] 5.2 Ensure the new fields are included in the payload sent on save (same binding as evidence-item)

## 6. Intro notes (AC4)

- [ ] 6.1 In `rd-evidences.component.ts` `alertStatus()` (non-knowledge-product branch only), replace bullet 1 with the new legacy-result text ("Submit a maximum of 6 pieces of evidence per result. If you are updating a legacy result (e.g. an innovation) that already has 6 pieces of evidence, remove any that are no longer relevant for the current reporting year and replace them with up-to-date evidence supporting the claim. Evidence will be ordered by the system from most to least recent.")
- [ ] 6.2 Remove the bullet "Please list evidence from most to least important."
- [ ] 6.3 Remove the `result_type_id === 7` "Provide evidence/documentation in support of the current innovation readiness level" bullet
- [ ] 6.4 Verify the `isKnowledgeProduct` intro branch is preserved unchanged

## 7. Tests & local verification

- [ ] 7.1 Update `evidence-item.component.spec.ts` for the new label, public info note, dynamic title, and typology checkbox
- [ ] 7.2 Update `user-evidence.component.spec.ts` for the new label, public info note, dynamic title, and added checkboxes
- [ ] 7.3 Update `rd-evidences.component.spec.ts` for the new intro notes (and unchanged KP branch)
- [ ] 7.4 Run `npm run test` for the affected specs; keep coverage above thresholds
- [ ] 7.5 Verify in the browser: label, public info note bullet, dynamic title + checkbox per typology, intro notes, and Innovation Dev info parity
