## 1. Implementation

- [x] 1.1 In `rd-evidences.component.ts`, update the `deleteEvidenceWithConfirm()` confirmation callback to call `this.onSaveSection()` right after `this.deleteEvidence(index)`, so confirming a deletion persists immediately (keep `deleteEvidence` itself pure: splice + `validateCheckBoxes` only).

## 2. Tests

- [x] 2.1 In `rd-evidences.component.spec.ts`, add a test asserting that the `deleteEvidenceWithConfirm()` confirm callback removes the item AND calls `onSaveSection()` (spy on `onSaveSection`, invoke the callback passed to `api.alertsFe.show`).
- [x] 2.2 Verify the existing `deleteEvidence` test (direct call → only splice, no save) still passes.

## 3. Local verification

- [x] 3.1 Run the unit test file: `npm run test src/app/pages/results/pages/result-detail/pages/rd-evidences/rd-evidences.component.spec.ts`. → 38/38 passed (incl. 2 new deleteEvidenceWithConfirm tests).
- [x] 3.2 Manually verified in the running app (local :4300 with the fix, result 8555): deleted the temporary test evidence → confirmed "Yes, delete" → navigated to General Information and back → evidence did NOT reappear (count 6→5) and no manual Save was needed. Restored the temporary evidence afterward (count back to 6, persisted).
