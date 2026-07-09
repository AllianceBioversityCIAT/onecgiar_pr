## 1. OpenSpec & scope

- [x] 1.1 Create change `p2-3133-aow-2030-target-labels` with proposal, design, specs, tasks

## 2. Backend — cumulative 2030 targets

- [x] 2.1 Add `cumulativeTargetYears` option to `buildTocQuery` in `aow-bilateral.repository.ts`
- [x] 2.2 Pass `{ from: 2025, to: 2030 }` from `find2030Outcomes` only
- [x] 2.3 Recalculate `progress_percentage` in `find2030Outcomes` using cumulative target
- [x] 2.4 Add repository spec for cumulative target sum and progress recalculation

## 3. Frontend — column labels

- [x] 3.1 In `aow-hlo-table.component.ts`, use `"2030 target"` when `tableType === '2030-outcomes'`
- [x] 3.2 Rename "Achieved target" → "Achieved value" in `aow-hlo-table.component.ts`
- [x] 3.3 Rename "Achieved target" → "Achieved value" in `aow-view-results-drawer.component.ts`
- [x] 3.4 Update `aow-hlo-table.component.spec.ts` and drawer spec assertions

## 4. Verification

- [x] 4.1 Run `aow-bilateral.repository.spec.ts`
- [x] 4.2 Run `aow-hlo-table.component.spec.ts` and `aow-view-results-drawer.component.spec.ts`
- [ ] 4.3 Manual check on prtest: 2030 Outcomes shows "2030 target" and cumulative values (pending login)
