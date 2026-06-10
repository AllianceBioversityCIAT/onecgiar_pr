## 1. Update alert copy

- [x] 1.1 In `rd-evidences.component.ts` `validateCheckBoxes()`, replace the short `tag` labels in the `tags` array with the official Impact Area names (Gender equality, youth and social inclusion / Climate adaptation and mitigation / Nutrition, health and food security / Environmental health and biodiversity / Poverty reduction, livelihoods and jobs).
- [x] 1.2 Replace the per-tag template string with `A principal contribution score (2) has been recorded for ${tag}. Please provide evidence to support this claim.` — removing the conditional "if" phrasing, keeping the `<ul>/<li>` structure.

## 2. Tests

- [x] 2.1 Strengthen the `validateCheckBoxes` unit test in `rd-evidences.component.spec.ts` to assert the exact new copy and that the output does not contain " if ".
- [x] 2.2 Run the test and confirm it passes (`npx jest rd-evidences.component.spec.ts -t validateCheckBoxes`).

## 3. Verification

- [ ] 3.1 Manually verify in the browser: select score 2 for an Impact Area in General Information, open the Evidence section, confirm the new alert text appears with the official Impact Area name and no "if".
