## 1. Public-file question label (AC1)

- [ ] 1.1 In `evidence-item.component.html`, change the radio label "Is this a public file?" to "Can this evidence be shared publicly?"
- [ ] 1.2 In `user-evidence.component.html`, change the same label to "Can this evidence be shared publicly?"

## 2. "NOT public" info note (AC2)

- [ ] 2.1 In `evidence-item.component.ts` `dynamicAlertStatusBasedOnVisibility()`, add as the SECOND bullet of the NOT-public branch: "Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products." (4 bullets total)
- [ ] 2.2 In `user-evidence.component.ts` `dynamicAlertStatusBasedOnVisibility()`, apply the same second-bullet addition

## 3. Dynamic checkbox-group title by typology (AC3 — frontend text only)

- [ ] 3.1 Add a typology→label resolver from `result_type_id` (Innovation Use, Policy Change, Capacity Sharing for Development, Knowledge Product, Other Output, Other Outcome, Innovation Development)
- [ ] 3.2 In `evidence-item.component.ts` `getEvidenceRelatedTitle()`, return "Indicate whether this evidence is related to an Impact Area score of 2 and/or to the {typology} metadata"
- [ ] 3.3 Mirror the same title logic in `user-evidence.component.ts` `getEvidenceRelatedTitle()`
- [ ] 3.4 Confirm the type checkbox stays bound to existing fields only (no new binding for typologies without a column); no new validation added

## 4. Intro notes (AC4)

- [ ] 4.1 In `rd-evidences.component.ts` `alertStatus()`, replace bullet 1 with the new legacy-result text ("Submit a maximum of 6 pieces of evidence per result. If you are updating a legacy result (e.g. an innovation) that already has 6 pieces of evidence, remove any that are no longer relevant for the current reporting year and replace them with up-to-date evidence supporting the claim. Evidence will be ordered by the system from most to least recent.")
- [ ] 4.2 Remove the bullet "Please list evidence from most to least important."
- [ ] 4.3 Remove the `result_type_id === 7` "Provide evidence/documentation in support of the current innovation readiness level" bullet

## 5. Tests & local verification

- [ ] 5.1 Update `evidence-item.component.spec.ts` assertions for the new label, info note, and title
- [ ] 5.2 Update `rd-evidences.component.spec.ts` assertions for the new intro notes
- [ ] 5.3 Run `npm run test` for the affected specs and keep coverage above thresholds
- [ ] 5.4 Verify in the browser: label, info note (4 bullets), dynamic title per typology, and intro notes
