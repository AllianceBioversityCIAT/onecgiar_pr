# Tasks: Exclude owner Science Program from Contributing SP dropdowns

- [x] 1. Add `ownerInitiativeId` computed (`currentResult.initiative_id`) in `rd-contributors-and-partners.component.ts`.
- [x] 2. Filter it out of `referenceScience` (ToC dropdown) and `otherScienceList` (Other dropdown).
- [ ] 3. Runtime verify on prtest: open a result whose owner is SP06 → SP06 must NOT appear in either SP dropdown; a different SP still selectable and saves + generates the contribution request.
- [ ] 4. Confirm the Report-result popup already excludes the owner (no change needed).
