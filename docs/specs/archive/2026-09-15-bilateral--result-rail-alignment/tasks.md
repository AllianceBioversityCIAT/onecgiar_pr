# Module Spec — Bilateral Result Editor Rail & Header Alignment (`tasks.md`)

## 1. Scope of this task list

- **Module / feature:** `bilateral` — Result Editor Rail & Header Alignment
- **Linked spec:** `docs/specs/bilateral/result-rail-alignment/requirements.md` + `docs/specs/bilateral/result-rail-alignment/design.md`
- **Short Code:** `BRRA`
- **Owner / driver:** Bilateral Reporting & UX Design
- **Status:** `completed`

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are resolved.
- [x] Budget matches: 3 tasks, ~120 net LOC, 1 review round.
- [x] Zero server/database migrations required.

---

## 3. Task list

### `BRRA-T-1` — Persistent Rail Back Link & Identity Card Implementation

- **Type:** `client`
- **Description:** Update `BilateralResultCreatorComponent` template, script, and stylesheet to render:
  1. Top persistent back navigation anchor with `chevron_left` icon and bottom border divider (`border-b border-[var(--pr-border)]`).
  2. Pinned Result Identity Card displaying:
     - `Result code #<code>` with interactive `<app-copy-button>`.
     - Result type name in uppercase bold typography (`text-[12px] font-semibold uppercase tracking-[0.02em] text-[var(--pr-text)]`).
     - Status pill badge with dynamic status foreground, background, and border tokens (`statusFg`, `statusBg`).
     - Loading skeleton placeholders when `isLoadingResult()` is true.
  3. Compute necessary signals: `backLink`, `backQueryParams`, `statusLabel`, `statusFg`, `statusBg`.
  4. Add unit test suite in `bilateral-result-creator.component.spec.ts`.
- **Implements:** `BRRA-R-1`, `BRRA-R-2`, `BRRA-R-5`, `BRRA-AC-1`, `BRRA-AC-2`, Defect Gates `D1`, `D2`, `D3`.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts`
- **Depends on:** `—`
- **Blocks:** `BRRA-T-2`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`, `ui-ux-pro-max`
- **Definition of done:**
  - [x] Rail back anchor renders at the top with correct router link and phase query param (`Gate D1`).
  - [x] Identity block renders code, copy button, uppercase type, and colored status pill (`Gate D2`, `D3`).
  - [x] Unit tests pass 100%: `npx jest src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.spec.ts`.
  - [x] Lint passes cleanly.

---

### `BRRA-T-2` — Streamline Detail Header in `BilateralPageHeaderComponent`

- **Type:** `client`
- **Description:** Update `BilateralPageHeaderComponent` to:
  1. Remove the redundant in-flow `<button data-testid="bilateral-header-back-btn">` when `variant() === 'detail'`.
  2. Remove inline duplication of `resultCode`, `resultTypeName`, and `statusBadge` from the header identity strip in `variant() === 'detail'`.
  3. Retain secondary context tags: `level`, `W3/Bilateral` funding tag, center name, area of work / project, and AI provenance badge.
  4. Update unit tests in `bilateral-page-header.component.spec.ts` asserting omission of redundant back button and identity elements in detail mode.
- **Implements:** `BRRA-R-3`, `BRRA-R-4`, Defect Gate `D4`.
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`
- **Depends on:** `BRRA-T-1`
- **Blocks:** `BRRA-T-3`
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `angular-developer`
- **Definition of done:**
  - [x] Detail header does not render `bilateral-header-back-btn` (`Gate D4`).
  - [x] Detail identity strip does not duplicate code, type, or status (`Gate D4`).
  - [x] Unit tests pass: `npx jest src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`.
  - [x] Lint passes cleanly.

---

### `BRRA-T-3` — Full Regression Suite and Angular Build Verification

- **Type:** `tests`
- **Description:** Run all bilateral unit tests, linting, and a complete Angular compilation build to verify zero regressions, 100% template type safety, and pixel-perfect token adherence.
- **Implements:** `BRRA-AC-3`, Defect Gates `D5`, `D6`.
- **Files (expected):** All modified component and spec files.
- **Depends on:** `BRRA-T-1`, `BRRA-T-2`
- **Blocks:** None.
- **Estimate:** `S` (≤ 0.5d)
- **Skills:** `systematic-debugging`
- **Definition of done:**
  - [x] All client Jest tests pass: `npx jest src/app/pages/bilateral/pages/bilateral-result-creator/ src/app/pages/bilateral/components/bilateral-page-header/ --silent --reporters=summary`.
  - [x] Client linting passes: `npx ng lint --lint-file-patterns="src/app/pages/bilateral/pages/bilateral-result-creator/**/*.ts" --lint-file-patterns="src/app/pages/bilateral/components/bilateral-page-header/**/*.ts"`.
  - [x] Angular build passes with zero errors: `npx ng build --configuration=development --no-progress`.

---

## 4. Dependency graph

```text
BRRA-T-1 (Rail back link & identity block implementation)
   └── BRRA-T-2 (Streamline detail header & identity strip)
         └── BRRA-T-3 (Full regression, lint & ng build verification)
```

---

## 5. Traceability Matrix

| Task ID | Requirements Covered | Scenarios & Clauses Covered | Defect Gates |
|---|---|---|---|
| `BRRA-T-1` | `BRRA-R-1`, `BRRA-R-2`, `BRRA-R-5`, `BRRA-AC-1`, `BRRA-AC-2` | Persistent rail navigation, identity block rendering, copy button, status tokens | `D1`, `D2`, `D3` |
| `BRRA-T-2` | `BRRA-R-3`, `BRRA-R-4` | Header back button removal, non-duplicate identity strip | `D4` |
| `BRRA-T-3` | `BRRA-AC-3` | TypeScript strict template validation, full regression test execution | `D5`, `D6` |

---

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BRRA-TEST-1` | unit (client) | `BRRA-R-1`, Gate `D1` | `bilateral-result-creator.component.spec.ts` (rail back anchor & query params) |
| `BRRA-TEST-2` | unit (client) | `BRRA-R-2`, Gate `D2`, `AC-1, 2` | `bilateral-result-creator.component.spec.ts` (code, copy button, uppercase type) |
| `BRRA-TEST-3` | unit (client) | `BRRA-R-5`, Gate `D3` | `bilateral-result-creator.component.spec.ts` (status pill color tokens) |
| `BRRA-TEST-4` | unit (client) | `BRRA-R-3`, `BRRA-R-4`, Gate `D4` | `bilateral-page-header.component.spec.ts` (detail header back button & strip cleanup) |
| `BRRA-TEST-5` | build | `BRRA-AC-3`, Gate `D5` | `npx ng build --configuration=development --no-progress` |
