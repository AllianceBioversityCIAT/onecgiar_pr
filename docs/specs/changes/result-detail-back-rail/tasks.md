# Tasks: Relocate "Back to results" to the Result Sections Sidebar Rail

## 1. Scope of This Task List

- **Module / Feature:** `results` / `result-detail` (`changes/result-detail-back-rail`)
- **Linked Spec:**
  - Requirements: `docs/specs/changes/result-detail-back-rail/requirements.md` (`RDBR-R-1`…`R-4`, `RDBR-AC-1`…`AC-6`)
  - Design: `docs/specs/changes/result-detail-back-rail/design.md` (§2, §3, §4, §5)
  - Proposal: `docs/specs/changes/result-detail-back-rail/proposal.md`
- **Owner / Driver:** Results & UX/UI Core Team
- **Status:** `approved`
- **Budget:** 3 atomic tasks / ~150 LOC
- **Branch:** `qa-development-2026`

---

## 2. Pre-flight Checklist

- [x] `requirements.md` is complete.
- [x] `design.md` is complete.
- [x] `SmartNavigationService` contract verified.
- [x] Design tokens (`--pr-border`, `--pr-color-primary-50`, `--pr-color-primary-400`, `--pr-text-secondary`) confirmed.
- [x] No database or API changes required.

---

## 3. Task List

### `RDBR-T-1` — Implement Back Navigation Anchor in `ResultSectionsSidebarComponent` & Add Unit Tests
- **Type:** `client`
- **Description:**  
  Inject `SmartNavigationService` in `ResultSectionsSidebarComponent` and expose `backLink`, `backQueryParams`, and `backTitle`. Add the back navigation anchor to `result-sections-sidebar.component.html` at the top of the aside with `data-testid="result-detail-back-link"`, `chevron_left` icon, ghost button styling, and bottom divider. Update `result-sections-sidebar.component.spec.ts` with tests for link presence, default target, query params, and dynamic titles for My Results, Programme Results, and Results Center.
- **Implements:** `RDBR-R-1`, `RDBR-R-2`, `RDBR-R-4`, `RDBR-AC-1`, `RDBR-AC-3`, `RDBR-AC-4`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections-sidebar.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections-sidebar.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections-sidebar.component.spec.ts`
- **Verification:**  
  `npx jest src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections-sidebar.component.spec.ts --silent --reporters=summary --no-coverage`
- **Definition of Done:**
  - [x] Anchor renders at the top of the rail with `data-testid="result-detail-back-link"`.
  - [x] `href` and `queryParams` match `SmartNavigationService.getResultDetailBackTarget()`.
  - [x] Tooltip title dynamically reflects origin.
  - [x] All unit tests in `result-sections-sidebar.component.spec.ts` pass 100%.

---

### `RDBR-T-2` — Remove Back Link from `ResultHeaderComponent` & Update Unit Tests
- **Type:** `client`
- **Description:**  
  Remove `<a data-testid="result-detail-back-link">` from `result-header.component.html`. Clean up `backLink`, `backQueryParams`, and `backTitle` from `result-header.component.ts` (and remove unused `SmartNavigationService` injection if not used elsewhere in the header). Update `result-header.component.spec.ts` to remove obsolete back-link assertions and verify `<h1>{{ title }}</h1>` is the topmost element in the header.
- **Implements:** `RDBR-R-3`, `RDBR-AC-2`, `RDBR-AC-5`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.html`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.ts`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/result-header.component.spec.ts`
- **Verification:**  
  `npx jest src/app/pages/results/pages/result-detail/components/result-header/result-header.component.spec.ts --silent --reporters=summary --no-coverage`
- **Definition of Done:**
  - [x] `result-header.component.html` contains no `result-detail-back-link`.
  - [x] `<h1>{{ title }}</h1>` is the top child of the header.
  - [x] All unit tests in `result-header.component.spec.ts` pass 100%.

---

### `RDBR-T-3` — Documentation Update & Full Regression Verification
- **Type:** `docs` + `tests`
- **Description:**  
  Update `docs/ux-ui/design.md` §4 to document the relocated back navigation anchor in the secondary sidebar rail. Run the combined test suite for both components and verify global TypeScript compilation (`npx tsc --noEmit -p tsconfig.app.json`).
- **Implements:** `RDBR-AC-6`, Constitutional baseline update
- **Files:**
  - `docs/ux-ui/design.md`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-header/`
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/`
- **Verification:**  
  `npx jest src/app/pages/results/pages/result-detail/components/result-header src/app/pages/results/pages/result-detail/components/result-sections-sidebar --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json`
- **Definition of Done:**
  - [x] `docs/ux-ui/design.md` §4 updated.
  - [x] Both Jest test suites pass 100%.
  - [x] TypeScript compilation exits with code 0.

---

## 4. Dependency Graph

```
RDBR-T-1 (Implement Back in Sidebar) ──┐
                                       ├──► RDBR-T-3 (Full Regression & Docs)
RDBR-T-2 (Remove Back from Header) ───┘
```
