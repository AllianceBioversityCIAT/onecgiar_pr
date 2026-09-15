# Tasks Specification: Bilateral AI Draft Results Dashboard & Card Redesign

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/ai-drafts-redesign` |
| **Slug** | `ai-drafts-redesign` |
| **Phase** | Phase 3: Tasks (`tasks.md`) |
| **Linked Requirements** | `docs/specs/bilateral/ai-drafts-redesign/requirements.md` (`BADR-R-1` .. `BADR-R-16`, `BADR-AC-1` .. `BADR-AC-12`) |
| **Linked Design** | `docs/specs/bilateral/ai-drafts-redesign/design.md` (`BADR-DD-1` .. `BADR-DD-7`) |
| **Budget** | 3 tasks · ~220 LOC · 1 review round |
| **Owner / Driver** | Frontend Lead / AI Assisted Reporting Team |
| **Status** | `complete` |

---

## 1. Scope of this Task List

This task list defines the concrete, executable implementation tasks for modernizing the **AI Draft Results** dashboard (`/bilateral/:centerAcronym/drafts`). It covers:
1. Enhancing project filter mapping and replacing the legacy purple select with a token-styled dropdown with search (`BADR-T-1`).
2. Aligning tab and page title identity, restructuring draft cards into horizontal grouped metadata with action hierarchy, and fixing the relative date calculation bug (`BADR-T-2`).
3. Enforcing fluid responsive layouts (<640px, 640–1024px, >=1024px), eliminating horizontal viewport overflow, and providing full unit test verification (`BADR-T-3`).

All changes are strictly frontend-scoped in `onecgiar-pr-client`.

---

## 2. Pre-flight Checklist

- [x] `requirements.md` is approved (`BADR-R-1` through `BADR-R-16`, Defect Gates `D1` through `D6`).
- [x] `design.md` is approved (`BADR-DD-1` through `BADR-DD-7`, budget: 3 tasks, ~220 LOC, 1 review round).
- [x] Step 2.3 Reversion challenge passed for `app-pr-filter-select` replacement.
- [x] CLARISA project and initiative API dependencies verified (`GET_ClarisaProjects()`, `GET_AllInitiatives()`).
- [x] No backend database or server migration required.

---

## 3. Task List

### `BADR-T-1` — Project Filter Option Formatting, Service Mapping & Token-Styled Dropdown

- **Type:** `client`
- **Status:** `done` `[x]`
- **Estimate:** `M` (~70 LOC)
- **Relevant Skills:** `angular-developer`, `ui-ux-pro-max`, `error-handling-patterns`
- **Depends on:** `—`
- **Blocks:** `BADR-T-2`, `BADR-T-3`
- **Implements:**
  - `BADR-R-1`: Option formatting showing `<shortName> — <fullName>` (or fallback to available value). Scenario: `BADR-AC-1`, fallback `BADR-AC-2`.
  - `BADR-R-2`: Token-styled dropdown replacing legacy `app-pr-filter-select`.
  - `BADR-R-3`: Inline search input when project options exceed 5.
  - `BADR-R-4`: Active project filter chip with label and dismiss button; count subtitle `"Showing M of N drafts"`. Scenario: `BADR-AC-3`.
  - Defect Gate `D1` (Truncated Project Info).
- **Design References:** `BADR-DD-1`, `BADR-DD-2`, §5.1.
- **Expected Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-ai.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.spec.ts`
- **Detailed Scope:**
  1. In `BilateralAiService.loadProjectNames()`, format mapping so that if both `shortName` and `fullName` exist, map value is `${p.shortName} — ${p.fullName}`. If only one exists, fall back to whichever is present; if neither, fall back to `String(p.id)`.
  2. In `MyDraftResultsFilterService` and `DraftProjectFilterOption`, expand option structure to support `value`, `label`, `code`, and `title`.
  3. In `MyDraftResultsComponent`, compute `projectFilterOptions` sorted alphabetically by label.
  4. In `my-draft-results.component.html`, replace `app-pr-filter-select` with a token-styled dropdown trigger and popover container:
     - Button height 36px, `border: 1px solid var(--pr-border-divider)`, `bg: var(--pr-surface-card)`.
     - Project icon (`business`) on the left, chevron on the right.
     - Search filter input at top of list when `projectFilterOptions().length > 5`.
     - Option rows showing bold code and secondary title text.
     - Clear selection option at top ("All Projects").
  5. Retain dismissible active filter chip showing selected project label with clear button.
- **Verification Command:**
  ```bash
  npx jest src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.spec.ts --silent --reporters=summary
  ```
- **Disqualification & Falsification:**
  - *Disqualification:* If project dropdown options only render raw code (e.g. `A-AG10156`) without the project title when CLARISA project data includes `fullName`, the verification is disqualified.
  - *Falsification input:* Passing an unmapped project ID (e.g. `A-AG99999`) must cleanly display the raw ID without throwing an exception or rendering blank text.
- **Definition of Done:**
  - [ ] `BilateralAiService.loadProjectNames` combines `shortName` and `fullName`.
  - [ ] Legacy `app-pr-filter-select` removed and replaced with token-styled dropdown.
  - [ ] Inline search input active when options > 5.
  - [ ] Active filter chip displays `<shortName> — <fullName>` with functioning close button.
  - [ ] Filter service unit tests pass with 100% coverage.

---

### `BADR-T-2` — Tab & Page Identity, Horizontal Card Metadata Strip, Action Hierarchy & Date Bug Fix

- **Type:** `client`
- **Status:** `done` `[x]`
- **Estimate:** `M` (~90 LOC)
- **Relevant Skills:** `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Depends on:** `BADR-T-1`
- **Blocks:** `BADR-T-3`
- **Implements:**
  - `BADR-R-5`: Tab 3 in `BilateralPageHeaderComponent` updated to `"AI Draft Results"` with draft count badge preserved. Scenario: `BADR-AC-4`.
  - `BADR-R-6`: Page title heading (`<h2>`) in `MyDraftResultsComponent` updated to `"AI Draft Results"`. Scenario: `BADR-AC-5`.
  - `BADR-R-7`: Validation guidance note explaining AI drafts require Center validation.
  - `BADR-R-8`: Bold, scannable result title in card header (`font-size: 15px/16px`, semibold).
  - `BADR-R-9`: Grouped badges in card header (Category pill in emerald green, Level pill in neutral slate, Draft status pill in indigo). Scenario: `BADR-AC-6`.
  - `BADR-R-10`: Horizontal, scannable metadata strip (Project tag with code pill + title tooltip, Program tag with SP code + tooltip, AI Session tag with short hash + relative date + UUID tooltip). Scenario: `BADR-AC-7`.
  - `BADR-R-11`: Relative date hardening in `formatDate()` (`diff < 0 || days <= 0` returns `'Today'`). Scenario: `BADR-AC-8`, Defect Gate `D3`.
  - `BADR-R-12`: Card action button hierarchy: Primary `Create Result` (positive green), Secondary `Review` (soft blue surface/border), Destructive `Delete` (danger icon button). Scenario: `BADR-AC-9`, Defect Gate `D4`.
  - `BADR-R-13`: Amber warning tags rendered beneath metadata strip when `mapping_warnings` exist.
  - `BADR-AC-11`: Review aside drawer trigger preserved.
  - `BADR-AC-12`: Promote modal trigger preserved.
  - Defect Gates `D2`, `D3`, `D4`, `D6`.
- **Design References:** `BADR-DD-3`, `BADR-DD-4`, `BADR-DD-5`, `BADR-DD-6`, §5.2, §5.3.
- **Expected Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts`
- **Detailed Scope:**
  1. In `bilateral-page-header.component.html`, update Tab 3 text from `Draft Results` to `AI Draft Results`. Keep the draft count badge (`data-testid="bilateral-drafts-badge"`) intact.
  2. In `my-draft-results.component.html`, update `h2.mdr-title` text from `Draft Results` to `AI Draft Results`.
  3. In `my-draft-results.component.ts`, fix `formatDate(dateStr: string)`:
     ```typescript
     if (diff <= 0 || days <= 0) return 'Today';
     if (days === 1) return 'Yesterday';
     if (days < 7) return `${days} days ago`;
     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
     ```
  4. Restructure `.mdr-card` in `my-draft-results.component.html`:
     - Move Status Pill into `.mdr-card-header` alongside Indicator Category and Result Level.
     - Move Project, Program, and AI Session into a single horizontal wrapped metadata container (`.mdr-card-meta`).
     - Display Project code badge + truncated title with `prTooltip` containing full project title.
     - Group action buttons in dedicated `.mdr-actions` cluster with distinct visual styling:
       - `Create Result`: Primary green styling (`#F0FDF4` bg, `#86EFAC` border, `#166534` text, icon `arrow_upward`).
       - `Review`: Secondary blue outline (`#EFF6FF` bg, `#BFDBFE` border, `#1E40AF` text, icon `visibility`).
       - `Delete`: Danger icon button (`aria-label="Delete draft"`, danger hover, icon `delete_outline`).
- **Verification Command:**
  ```bash
  npx jest src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts --silent --reporters=summary
  ```
- **Disqualification & Falsification:**
  - *Disqualification:* If `formatDate` evaluates to `"-1 days ago"` for any draft created in the past 24 hours, verification fails.
  - *Falsification input:* Testing `formatDate` with a future date or negative milliseconds must return `"Today"` and never negative days.
  - *Disqualification:* If Tab 3 or page header contains `"Draft Results"` without the `"AI "` prefix, verification fails.
- **Definition of Done:**
  - [ ] Tab 3 renders `"AI Draft Results"` with count badge.
  - [ ] Page heading renders `"AI Draft Results"`.
  - [ ] Relative date bug fixed (0 and negative days return `"Today"`).
  - [ ] Card header displays title and badges (Category, Level, Status).
  - [ ] Metadata displays horizontally with tooltips.
  - [ ] Action buttons reflect primary, secondary, and destructive hierarchy.
  - [ ] Existing Review and Promote modal interactions function without regressions.

---

### `BADR-T-3` — Responsive Fluid Breakpoints, Document Overflow Prevention & Comprehensive Test Suite

- **Type:** `client | tests`
- **Status:** `done` `[x]`
- **Estimate:** `S` (~60 LOC)
- **Relevant Skills:** `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Depends on:** `BADR-T-1`, `BADR-T-2`
- **Blocks:** `—`
- **Implements:**
  - `BADR-R-14`: Desktop (>= 1024px) horizontal space distribution.
  - `BADR-R-15`: Tablet (640px–1023px) wrapping metadata tags.
  - `BADR-R-16`: Mobile (< 640px) vertical stacking and zero document overflow (`document.documentElement.scrollWidth <= clientWidth`). Scenario: `BADR-AC-10`, Defect Gate `D5`.
  - Full Defect Gate validation: `D1` through `D6`.
- **Design References:** `BADR-DD-7`, §5.4.
- **Expected Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.spec.ts`
- **Detailed Scope:**
  1. In `my-draft-results.component.scss`, implement media queries for `< 640px` and `640px–1024px`:
     - `@media (max-width: 640px)`: Set card direction to `column`, make `.mdr-actions` full width or fluid flex row, ensure docked filter bar scales to 100% width, and guarantee container enforces `max-width: 100%`, `overflow-x: hidden`.
     - `@media (min-width: 640px) and (max-width: 1023px)`: Allow metadata tags to flex-wrap cleanly with `gap: 8px 16px`.
  2. Update and add unit tests across test suites:
     - `my-draft-results.component.spec.ts`:
       - Test `formatDate` resilience (negative ms offset returns `'Today'`).
       - Test page heading text contains `'AI Draft Results'`.
       - Test badge grouping and card title.
       - Test action buttons classes and accessibility tooltips.
     - `bilateral-page-header.component.spec.ts`:
       - Update assertions for Tab 3 text to expect `'AI Draft Results'`.
     - `my-draft-results-filter.service.spec.ts`:
       - Assert option labels format `<shortName> — <fullName>` and fallback to `shortName` or ID.
  3. Execute full linting and Jest test runs across all bilateral suites.
- **Verification Command:**
  ```bash
  npx jest --testPathPattern="my-draft-results|bilateral-page-header" --silent --reporters=summary
  npx ng lint --lint-file-patterns="src/app/pages/bilateral/pages/my-draft-results/**" --lint-file-patterns="src/app/pages/bilateral/components/bilateral-page-header/**"
  ```
- **Disqualification & Falsification:**
  - *Disqualification:* If any test in the touched suites fails or exits non-zero, verification fails.
  - *Falsification input:* At 375px viewport, if card elements or toolbar have fixed widths exceeding 375px causing horizontal scrollbars, verification fails.
- **Definition of Done:**
  - [ ] Responsive SCSS breakpoints implemented and tested for mobile, tablet, and desktop.
  - [ ] Zero document horizontal overflow on mobile viewports.
  - [ ] All unit test suites pass (100% pass rate, >= 88 tests passing).
  - [ ] Angular linter reports zero errors.

---

## 4. Dependency Graph

```
BADR-T-1 (Project Filter Option Formatting, Service Mapping & Token-Styled Dropdown)
   │
   ▼
BADR-T-2 (Tab & Page Identity, Horizontal Card Metadata Strip, Action Hierarchy & Date Bug Fix)
   │
   ▼
BADR-T-3 (Responsive Fluid Breakpoints, Document Overflow Prevention & Comprehensive Test Suite)
```

- **Execution Mode:** Sequential (each task builds upon the services and markup created by the previous task).

---

## 5. Requirement & Acceptance Criteria Traceability Matrix

| Requirement / Scenario / Defect Gate | Owning Task | Description |
|---|---|---|
| `BADR-R-1`, `BADR-AC-1`, `BADR-AC-2` | `BADR-T-1` | Project filter option label format (`<shortName> — <fullName>`) & fallback |
| `BADR-R-2` | `BADR-T-1` | Token-styled project filter dropdown |
| `BADR-R-3` | `BADR-T-1` | Inline search input when project options > 5 |
| `BADR-R-4`, `BADR-AC-3` | `BADR-T-1` | Active filter chip with dismiss button & count subtitle |
| `BADR-R-5`, `BADR-AC-4` | `BADR-T-2` | Tab 3 title updated to "AI Draft Results" with count badge |
| `BADR-R-6`, `BADR-AC-5` | `BADR-T-2` | Page title heading updated to "AI Draft Results" |
| `BADR-R-7` | `BADR-T-2` | Validation guidance note |
| `BADR-R-8`, `BADR-R-9`, `BADR-AC-6` | `BADR-T-2` | Card title and badge grouping (Category, Level, Status) |
| `BADR-R-10`, `BADR-AC-7` | `BADR-T-2` | Horizontal wrapped metadata strip (Project, Program, AI Session) |
| `BADR-R-11`, `BADR-AC-8` | `BADR-T-2` | Relative date hardening in `formatDate()` |
| `BADR-R-12`, `BADR-AC-9` | `BADR-T-2` | Card action button hierarchy (Create Result, Review, Delete) |
| `BADR-R-13` | `BADR-T-2` | Mapping warning tags below metadata |
| `BADR-R-14`, `BADR-R-15`, `BADR-R-16`, `BADR-AC-10` | `BADR-T-3` | Responsive layout (desktop, tablet, mobile) & zero overflow |
| `BADR-AC-11`, `BADR-AC-12` | `BADR-T-2` | Preservation of Review aside drawer & Promote modal interactions |
| Defect Gate `D1` (Truncated Project Info) | `BADR-T-1` | Verified via filter service spec |
| Defect Gate `D2` (Stale Tab/Header Title) | `BADR-T-2` | Verified via header & component specs |
| Defect Gate `D3` (Negative Relative Date) | `BADR-T-2` | Verified via `formatDate()` unit tests |
| Defect Gate `D4` (Card Action Hierarchy) | `BADR-T-2` | Verified via button classes & tooltips |
| Defect Gate `D5` (Horizontal Viewport Overflow) | `BADR-T-3` | Verified via responsive SCSS & container queries |
| Defect Gate `D6` (Regression on Existing Flow) | `BADR-T-2`, `BADR-T-3` | Verified via promote & review test suite |

---

## 6. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BADR-TEST-1` | Unit (client service) | `BADR-R-1`, `BADR-AC-1`, `BADR-AC-2`, `D1` | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/services/my-draft-results-filter.service.spec.ts` |
| `BADR-TEST-2` | Unit (client component) | `BADR-R-5`, `BADR-AC-4`, `D2` | `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts` |
| `BADR-TEST-3` | Unit (client component) | `BADR-R-6`, `BADR-R-8`, `BADR-R-9`, `BADR-AC-5`, `BADR-AC-6`, `BADR-AC-7` | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts` |
| `BADR-TEST-4` | Unit (client date calculation) | `BADR-R-11`, `BADR-AC-8`, `D3` | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts` |
| `BADR-TEST-5` | Unit (client actions & accessibility) | `BADR-R-12`, `BADR-AC-9`, `BADR-AC-11`, `BADR-AC-12`, `D4`, `D6` | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts` |
| `BADR-TEST-6` | Unit & Lint (responsive / regression) | `BADR-R-14`, `BADR-R-15`, `BADR-R-16`, `BADR-AC-10`, `D5` | `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts` |

---

## 7. Rollout & Pull Request Strategy

- **Estimated Total LOC:** ~220 LOC (Frontend-only).
- **PR Strategy:** Single Pull Request:
  - **Branch:** `feat/bilateral-ai-drafts-redesign` (branched from `staging` or current working branch).
  - **Commit Message Convention:**
    `✨ feat(bilateral) [P2-3319]: redesign AI draft results dashboard and cards`
  - **PR Description:** Highlights the 4 major user improvements:
    1. Project dropdown showing both project code and full project title with search filtering.
    2. Tab and page header updated to "AI Draft Results" for clear lifecycle distinction.
    3. Draft cards restructured into space-efficient horizontal metadata with distinct action hierarchy.
    4. Negative relative date bug (`"-1 days ago"`) eliminated.
    5. Full mobile/tablet responsiveness without document horizontal overflow.

---

## 8. Roll-back Plan

1. Revert the commit/PR on the git branch.
2. Run client test suite (`npx jest --testPathPattern="my-draft-results|bilateral-page-header"`).
3. No database migrations or server rollbacks required.
