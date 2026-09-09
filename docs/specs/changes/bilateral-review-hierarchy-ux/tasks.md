# Tasks: Bilateral Review — Visual Hierarchy, Semantic Colors, Progressive Disclosure & Filter UX Elevation

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-review-hierarchy-ux` |
| Prefix | `BRH` |
| Type | `Change` |
| Approval Mode | `gated` |
| Inherited Depth | `Standard` |
| Author | Antigravity AI Assistant & Juan Carlos Cadavid |
| Date | 2026-09-08 |
| Status | Approved |

---

## 1. Scope of this Task List

- **Module / Feature:** Bilateral Review tab under Science Program entity details (`/result-framework-reporting/entity-details/:id/bilateral-review`).
- **Linked Specs:** `docs/specs/changes/bilateral-review-hierarchy-ux/requirements.md` + `docs/specs/changes/bilateral-review-hierarchy-ux/design.md`.
- **Primary Objective:** Deliver visual and structural parity with the Science Program Reporting tab (`reporting-aow-table` / `reporting-program-band`): container cards, monospace code tags, center chips, smart progressive disclosure, semantic result type badges, and consolidated 2-row filter band.
- **Status:** Approved

---

## 2. Pre-flight Checklist

- [x] `requirements.md` approved (11 testable functional requirements with concrete scenarios).
- [x] `design.md` approved (ADR decisions `BRH-DD-1`..`BRH-DD-6`, token mappings, reversion challenge passed).
- [x] Kaizen active lessons incorporated (`KZ-BOR-1` zero `#hex` literals; `KZ-changes--bilateral-review-viewport-and-table-polish-1` viewport lock scroller; `KZ-changes--bilateral-review-viewport-and-table-polish-2` fixed status tokens).
- [x] Zero server/backend or migration dependencies (client-only UX refactor).
- [x] Baseline test suites pass cleanly (`npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/ --silent`).

---

## 3. Task Breakdown

- [~] `BRH-T-1` — Consolidated 2-Row Filter Band & Sticky Chrome Layout (reopened 2026-09-09: page CT `bilateral-review.cy.ts` 24 red gates owed — see execution.md attempt 2)

- **Type:** client
- **Estimate:** M
- **Description:** Consolidate the filter controls in `BilateralReviewComponent` from the current 4-row stack into two high-density rows (total pinned height ≤110px), adhering to `reporting-program-band`:
  - **Row 1:** Search input with clear button and match count badge (`N matches`) + JIRA-style `Filter` button with active count badge opening the multi-select popover + Status segmented control (`All`, `Pending`, `Approved`, `Rejected`) with live count chips + View controls (Group by Project/Center, Grouped/Flat, Expand/Collapse all).
  - **Row 2:** Metric ribbon (`14 Projects · 8 Centers · 23 Pending Review · 2 Decided`) + dismissible active filter chips (`Center: CIP ×`, `Type: Policy change ×`) with direct remove actions + dynamic `Clear all filters` button.
  - Maintain dynamic `--brv-pinned-h` measurement on `#workArea` via `ResizeObserver`.
- **Implements:** `BRH-R-10`, `BRH-AC-10`
- **Design Reference:** `design.md` §2.1, §4.4, `BRH-DD-5`, `BRH-DD-6`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.spec.ts`
- **Depends on:** None
- **Blocks:** `BRH-T-2`
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Verification Command:**
  ```bash
  npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.component.spec.ts --silent
  ```
- **Definition of Done:**
  - [ ] Pinned chrome height measured and verified ≤ 110px.
  - [ ] Row 1 contains Search, Filter popover button with badge, Status segmented control, and View toggles.
  - [ ] Row 2 displays KPI metrics alongside active filter chips with individual `close` buttons.
  - [ ] Clicking a filter chip's `close` button removes that filter and updates query params via `replaceUrl`.
  - [ ] Existing query param synchronization (`search`, `status`, `center`, `project`, `category`, `group`, `view`, `phase`) passes without regression.
  - [ ] All unit tests in `bilateral-review.component.spec.ts` pass.

---

### `BRH-T-2` — Container Card Architecture, Monospace Code Badge & Smart Progressive Disclosure

- [x] `BRH-T-2` — Container Card Architecture, Monospace Code Badge & Smart Progressive Disclosure

- **Type:** client
- **Estimate:** M
- **Description:** In `BilateralReviewTableComponent`, replace the PrimeNG `app-pr-group-table` structure with autonomous, elevated container cards (`rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)] shadow-xs`):
  - **Structured 52px Header:** Rotating chevron in white button box (`flex h-6 w-6 rounded-md bg-white border border-slate-200 text-indigo-700 shadow-2xs`), isolated monospace project code badge (`font-mono text-[11.5px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-800 border border-indigo-200/70`), bold project title, distinct contributing center chip badges (`[CIMMYT] [IRRI] [CIP]`), and pending review badge pill.
  - **Smart Default Collapse:** Initialize expansion so only groups with `pendingCount > 0` are open; groups with 0 pending results default to collapsed. Global `[Expand all / Collapse all]` toggle forces all groups.
  - **In-Card Quick Filter Toolbar:** 32px inner toolbar inside expanded cards allowing instant local filtering by Center or Result Type when a project contains multi-center or multi-type results.
- **Implements:** `BRH-R-1`, `BRH-R-2`, `BRH-R-3`, `BRH-R-4`, `BRH-R-6`, `BRH-AC-1`, `BRH-AC-2`, `BRH-AC-3`, `BRH-AC-4`, `BRH-AC-6`
- **Design Reference:** `design.md` §2.1, §4.1, `BRH-DD-1`, `BRH-DD-2`, `BRH-DD-3`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.spec.ts`
- **Depends on:** `BRH-T-1`
- **Blocks:** `BRH-T-3`
- **Skills:** `angular-developer`, `tailwind-design-system`, `ui-ux-pro-max`
- **Verification Command:**
  ```bash
  npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.spec.ts --silent
  ```
- **Definition of Done:**
  - [ ] Grouped view renders as distinct `<section class="rounded-[12px] border border-[var(--pr-border)] bg-[var(--pr-surface-card)]">` cards.
  - [ ] Monospace code badge renders cleanly with isolated project code (`T-PJ-003262`).
  - [ ] Contributing centers render as discrete chip badges instead of a comma-separated text run.
  - [ ] Initial load automatically expands groups with pending reviews and collapses groups with 0 pending reviews.
  - [ ] In-card filter pills narrow results inside the card without mutating global filter state.
  - [ ] All `data-testid` attributes (`bilateral-review-group-toggle`, `bilateral-review-group-name`, `bilateral-review-group-summary`, `bilateral-review-group-pending`) are preserved.
  - [ ] Unit tests verify card rendering, monospace code extraction, smart collapse, and in-card filtering.

---

### `BRH-T-3` — Semantic Result Type Badges, Status Tokens, 3px Left Accent & Hover Copy Engine

- [x] `BRH-T-3` — Semantic Result Type Badges, Status Tokens, 3px Left Accent & Hover Copy Engine

- **Type:** client
- **Estimate:** M
- **Description:** Implement leaf-level visual styling, tokens, and micro-interactions in `BilateralReviewTableComponent`:
  - **Categorical Result Type Badges:** Render semantic color badge pills for result types (`Policy change` in violet, `Innovation use` in emerald, `Capacity sharing` in amber, `Knowledge product` in sky blue, etc.) alongside or above the result title.
  - **Standardized Status Badges & 3px Left Border Accent:** Strict token pairs for statuses (`Pending Review`, `Approved`, `Rejected`, and a clean neutral pill for `Editing / Draft`); each row carries a 3px left border accent matching its status tone (`border-l-[3px]`).
  - **Text Selection & Hover Copy Actions:** Enable `cursor-text select-text` on titles and codes; add hover copy buttons with transient checkmark feedback (`content_copy` → `check text-emerald-600` with tooltip *"Copied!"*) for 2000ms.
  - **Action Button Affordance:** `Review` button carries primary brand accent styling with pencil icon; `See` carries ghost styling with eye icon.
  - **Narrow Viewport Parity (<900px):** Verify card rendering on mobile viewports with minimum 44×44px touch targets.
- **Implements:** `BRH-R-5`, `BRH-R-7`, `BRH-R-8`, `BRH-R-9`, `BRH-R-11`, `BRH-AC-5`, `BRH-AC-7`, `BRH-AC-8`, `BRH-AC-9`, `BRH-AC-11`
- **Design Reference:** `design.md` §4.2, §4.3, `BRH-DD-4`, `BRH-DD-5`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.html`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.scss`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.spec.ts`
- **Depends on:** `BRH-T-2`
- **Blocks:** None
- **Skills:** `angular-developer`, `tailwind-design-system`, `ui-ux-pro-max`
- **Verification Command:**
  ```bash
  npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/components/bilateral-review-table/bilateral-review-table.component.spec.ts --silent
  ```
- **Definition of Done:**
  - [ ] Result type badge classes render correctly per result type category.
  - [ ] Draft (`Editing`) rows display a structured neutral status pill and neutral left border accent.
  - [ ] Pending rows display an amber status pill and amber 3px left border accent.
  - [ ] Clicking the copy button copies text, transitions to green checkmark for 2000ms, and stops event propagation.
  - [ ] `Review` action carries primary brand styling while `See` carries ghost styling.
  - [ ] Touch targets in narrow mode measure ≥ 44×44px.
  - [ ] All unit tests pass cleanly.

---

## 4. Dependency Graph

```text
BRH-T-1 (Consolidated 2-Row Filter Band & Sticky Chrome)
   └── BRH-T-2 (Container Card Architecture, Monospace Code & Smart Progressive Disclosure)
         └── BRH-T-3 (Semantic Result Type Badges, Status Tokens, 3px Left Accent & Hover Copy Engine)
```

---

## 5. Test Plan & Traceability Matrix

| Task ID | Requirement Covered | Test Location | Test Description |
|---|---|---|---|
| `BRH-T-1` | `BRH-R-10` | `bilateral-review.component.spec.ts` | Asserts 2-row layout, active filter chips render with remove buttons, pinned height observer fires, query params synchronize. |
| `BRH-T-2` | `BRH-R-1`, `BRH-R-2`, `BRH-R-3`, `BRH-R-4`, `BRH-R-6` | `bilateral-review-table.component.spec.ts` | Asserts card container renders with rounded borders, monospace code extracted, center chips render, smart collapse opens pending groups, in-card filter narrows rows. |
| `BRH-T-3` | `BRH-R-5`, `BRH-R-7`, `BRH-R-8`, `BRH-R-9`, `BRH-R-11` | `bilateral-review-table.component.spec.ts` | Asserts type badge colors, status token pairs, 3px left border accent, copy action to clipboard with checkmark state, action button tone differentiation. |

---

## 6. Comprehensive Verification Command

Once all tasks are executed, run the full test suite for the Bilateral Review module:
```bash
npx jest src/app/pages/result-framework-reporting/pages/bilateral-review/ --silent
```
Expected output: All test suites PASS (100% green), zero regressions.
