# Archive Summary — `bilateral/result-rail-alignment`

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bilateral/result-rail-alignment` |
| Archive Path | `docs/specs/archive/2026-09-15-bilateral--result-rail-alignment` |
| Archive Date | 2026-09-15 |
| Final Status | `completed` |
| Driver | Bilateral Reporting & UX Design |

---

## 2. Requirements Delivered

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| `BRRA-R-1` | Persistent Rail Navigation Back Anchor with chevron, border divider, and zero-scroll top placement | Delivered | `bilateral-result-creator.component.html:48-58`, `BRRA-TEST-1` |
| `BRRA-R-2` | Pinned Result Identity Card with code, copy button, uppercase type name, and status pill | Delivered | `bilateral-result-creator.component.html:61-90`, `BRRA-TEST-2` |
| `BRRA-R-3` | Streamlined Detail Header removing redundant in-flow back button in detail mode | Delivered | `bilateral-page-header.component.html:150-165`, `BRRA-TEST-4` |
| `BRRA-R-4` | Non-duplicate header identity strip displaying only secondary contextual metadata | Delivered | `bilateral-page-header.component.html:168-195`, `BRRA-TEST-4` |
| `BRRA-R-5` | Token-styled dynamic status pill with correct text, fg, bg, and border tokens | Delivered | `bilateral-result-creator.component.ts:130-170`, `BRRA-TEST-3` |
| Follow-up Refinement | Dynamic origin restoration (Results Center `/result/results-outlet/results-list`, Center Results `/bilateral/:center/results?phase=...`, Drafts) with "Back" label and reload persistence via sessionStorage | Delivered | `smart-navigation.service.ts`, `bilateral-result-creator.component.ts`, 106 unit tests passing |

---

## 3. Files Changed Summary

- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.html`: Added persistent rail back link and pinned identity card block; removed duplicate inline text.
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts`: Injected `SmartNavigationService`; computed dynamic `backTarget`, `backLink`, `backQueryParams`, `backTitle`, `resultCode`, `resultTypeName`, `statusLabel`, `statusFg`, `statusBg`.
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.scss`: Styled `.bcr-rail__back-container`, `.bcr-rail__identity`, uppercase type typography, status pills, and skeleton loaders.
- `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`: Omitted in-flow back button and duplicate primary identity tokens when `variant() === 'detail'`.
- `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts`: Exposed secondary metadata context signals (`resultLevelName`, `areaOfWork`).
- `onecgiar-pr-client/src/app/shared/services/smart-navigation.service.ts`: Added `isResultEditorUrl`, `isKnownBilateralOrigin`, `BILATERAL_RESULT_ORIGIN_STORAGE_KEY`, sessionStorage origin persistence/restoration, and dynamic origin detection for Results Center and Center Results.
- Associated unit test suites: `bilateral-result-creator.component.spec.ts`, `bilateral-page-header.component.spec.ts`, `smart-navigation.service.spec.ts`.

---

## 4. Test Evidence Summary

- **Unit tests:**
  - `bilateral-result-creator.component.spec.ts`: 60 tests passed.
  - `smart-navigation.service.spec.ts`: 43 tests passed.
  - `bilateral-page-header.component.spec.ts`: 54 tests passed.
  - **Full bilateral regression:** 46 test suites passed, 1,449 tests passed, 0 failures.
- **Linting:** Zero errors (`npx ng lint` passed cleanly).
- **Compilation:** Angular development build succeeded with zero errors (`ng build --configuration=development`).

---

## 5. Validation Summary

All defect gates (`D1` through `D6`) and acceptance criteria (`BRRA-AC-1`, `BRRA-AC-2`, `BRRA-AC-3`) verified green. Reviewer verdicts confirmed with `STATUS: PASS`.

---

## 6. Accepted Warnings or Follow-Ups

None. All feedback and refinement requests from user testing (simplified "Back" text, cross-module Results Center return, phase preservation, reload persistence) were fully addressed and verified with automated tests.
