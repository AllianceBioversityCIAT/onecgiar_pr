# Archive Summary — W3 bilateral in Editing opens center editor, not review drawer

## 1. Document Control

- **Spec Path:** `docs/specs/bugfix/bilateral-w3-editing-route/`
- **Archive Date:** 2026-09-15
- **Final Status:** Completed
- **Lead / Owner:** Juan Carlos Cadavid
- **Mode:** Bug · **Depth:** Lite

## 2. Original Spec Path

`docs/specs/bugfix/bilateral-w3-editing-route/`

## 3. Requirements Delivered

- **BIL-R-1 (Primary):** W3/Bilaterals result in Editing status (`status_id = 1`) opened from Programme Results or Results Center navigates to `/bilateral/{leadCenter}/result/{code}?phase={phase}`.
- **BIL-R-2 (Submitted):** W3/Bilaterals result in reviewable status (`Submitted`, `Pending Review`, `Rejected`, `Quality Assessed`) deep-links into the bilateral review drawer `/result-framework-reporting/entity-details/{programme}/bilateral-review?reviewResult={code}&reviewResultId={id}`.
- **BIL-R-3 (Approved / AVISA):** Approved bilaterals and AVISA (`SGP-02` / `SGP02`) route to the standard Result Detail page `/result/result-detail/{code}/general-information?phase={phase}`.
- **BIL-R-4 (Copy Link):** "Copy link" action generates the identical absolute URL to the navigation destination for each routing branch.
- **BIL-R-5 (Update Result):** Predicate `isW3BilateralForUpdate` safely decoupled from open-route logic to preserve carry-forward update workflows.
- **BIL-R-6 (Draft Handling):** Unpersisted draft states route to center editor if `lead_center` exists, or fall back safely to Result Detail.

## 4. Files Changed Summary

- `onecgiar-pr-client/src/app/shared/routing/bilateral-result-open-route.util.ts` — Shared 3-way route resolution helper (`resolveBilateralResultOpenRoute`, `usesBilateralReviewFlow`, `isW3BilateralForUpdate`).
- `onecgiar-pr-client/src/app/shared/routing/bilateral-result-open-route.util.spec.ts` — Comprehensive matrix test suite for route resolution branches and fallbacks.
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` — Wired shared routing utility into table row link and click handling; extended route cache key.
- `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.spec.ts` — Added unit tests verifying Editing W3 rows navigate to center editor without preloading review drawer.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts` — Wired shared routing utility for row activation, copy link, and carry-forward update.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts` — Added unit tests verifying row activation and copy link for Editing W3 results.

## 5. Test Evidence Summary

- **Test command:**
  ```bash
  npx jest src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.spec.ts src/app/shared/routing/bilateral-result-open-route.util.spec.ts --silent --reporters=summary
  ```
- **Result:**
  - Test Suites: 3 passed, 3 total
  - Tests: 203 passed, 203 total
  - Snapshots: 0
  - Time: 11.152 s
- **Lint command:**
  ```bash
  npx ng lint --lint-file-patterns="src/app/pages/result-framework-reporting/pages/programme-results/**/*.ts" --lint-file-patterns="src/app/pages/result-framework-reporting/pages/programme-results/**/*.html" --lint-file-patterns="src/app/pages/results/pages/results-outlet/pages/results-list/**/*.ts" --lint-file-patterns="src/app/shared/routing/**/*.ts"
  ```
  - Output: `All files pass linting.`

## 6. Validation Summary

- Verified 3-way branching contract: Editing W3 -> center editor; in-review W3 -> review drawer; Approved/AVISA -> Result Detail; missing lead center -> fallback to Result Detail.
- Verified clipboard copy link generates absolute URL matching click destination.
- All defect gates (D1-D6) passed without regressions.

## 7. Accepted Warnings Or Follow-Ups

- None. BIL-OQ-3 (See action inside bilateral review tab table for Editing rows) is accepted as out-of-scope and deferred to future enhancement.

## 8. Historical Notes

- Discovered during user acceptance testing of bilateral result rail alignment: clicking an Editing W3/Bilateral row in Programme Results or Results Center opened an empty review drawer instead of the center editor.
- The root cause was `usesBilateralReviewFlow` which only excluded `Approved` and `AVISA`, erroneously sending `Editing` (`status_id = 1`) to the review drawer.
