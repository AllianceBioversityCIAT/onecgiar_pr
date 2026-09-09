# Tasks: Bilateral Center Shell & Hero SP Alignment

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/shell-sp-alignment/tasks.md` |
| **Requirements Reference** | [`docs/specs/bilateral/shell-sp-alignment/requirements.md`](./requirements.md) |
| **Design Reference** | [`docs/specs/bilateral/shell-sp-alignment/design.md`](./design.md) |
| **Module / Sub-feature** | `bilateral` / `shell-sp-alignment` |
| **Prefix** | `BSA` (Bilateral Shell Alignment) |
| **Status** | in-progress |
| **Budget** | 4 tasks · ~240 LOC production / ~280 LOC test · ≤ 1 review round per task |
| **Date** | 2026-09-07 |

---

## 1. Scope of this Task List

This task list delivers the frontend implementation for aligning the CGIAR Center Bilateral view with the Science Programs view. It refactors `bilateral-page-header`, removes the `[Back to Centers]` button, adds tab icons and renames the primary tab to `Reporting`, establishes the viewport-locked `#workArea` scrolling layout with docked filter toolbars across all three center views (`Reporting`, `Results`, `Drafts`), and verifies responsiveness and token hygiene.

---

## 2. Pre-Flight Checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Visual reference mockups captured (`current-bilateral-view.png` and `reference-sp-view.png`).
- [x] Kaizen lessons incorporated: `KZ-changes--sp-shell-app-viewport-2` (:host in `.scss`) and `KZ-BOR-1` (no raw hex, no new PrimeIcons).
- [x] Working branch clean and ready for execution.

---

## 3. Task List

### `BSA-T-1` — Refactor `BilateralPageHeaderComponent` (Hero, Title, Back Button Removal, Tabs with Icons) [x]

- **Type:** client
- **Description:** Refactor the default tabbed variant of `bilateral-page-header.component.html`, `.ts`, and `.scss` to mirror `reporting-program-band`:
  1. Title font size updated to `text-[18px] sm:text-[21px] font-bold` with `var(--pr-text-heading)`.
  2. Hero height condensed to ~64px with dot + uppercase eyebrow (`• CGIAR CENTER`).
  3. Action area right-aligned: remove `[Back to Centers]` button completely; preserve `[+ Report emerging result]`.
  4. Ensure `variant="detail"` mode (result editor) remains completely intact.
  5. Tab strip: 48px height, 2px bottom active border in `var(--pr-color-primary-300)` (`mb-[-1px]`), icons on all 3 tabs (`track_changes` for Reporting, `table_chart` for Results, `fact_check` for Drafts + draft count badge).
  6. Tab 1 labeled "Reporting" routing to `/home` (default active).
  7. Mobile horizontal scroll (`overflow-x-auto no-scrollbar`).
- **Implements:**
  - `BSA-R-1` (Standard desktop hero presentation & long title truncation scenarios)
  - `BSA-R-2` (Tabbed center navigation without back button & detail variant preservation scenarios)
  - `BSA-R-3` (Tab strip composition, default selection, and drafts badge scenarios)
  - `BSA-AC-1`, `BSA-AC-2`, `BSA-AC-3`, `BSA-AC-4`
- **Design References:** `docs/specs/bilateral/shell-sp-alignment/design.md` §5.1, `BSA-DD-1`, `BSA-DD-2`, `BSA-DD-3`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`
- **Depends on:** —
- **Blocks:** `BSA-T-2`, `BSA-T-3`
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Definition of Done:**
  - [ ] `bilateral-header-back-btn` is NOT rendered when `variant !== 'detail'`.
  - [ ] `bilateral-header-back-btn` IS rendered when `variant === 'detail'`.
  - [ ] Title element has classes `text-[18px]` and `font-bold`.
  - [ ] Tab 1 text is "Reporting" and links to `/home`.
  - [ ] All 3 tabs render their respective icons.
  - [ ] Unit tests pass: `npx jest src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts --silent`
  - [ ] Disqualifier / Falsifier: Deleting the tab icon markup causes test assertion to fail.

---

### `BSA-T-2` — Viewport-Locked Scroller, Filter Docking & Loading Skeleton in Bilateral Home / Reporting Tab [x]

- **Type:** client
- **Description:** Implement the viewport-locked layout in `bilateral-home.component` and `bilateral-projects-panel.component`:
  1. Container configured for `min-[900px]:h-full min-[900px]:flex min-[900px]:flex-col min-[900px]:overflow-hidden`.
  2. Dock the top toolbar (Search input, quick filter chips `All`, `Top Programs`, `Multi-Program`, and View mode toggle) directly beneath the tabs band.
  3. Enclose the KPI cards and projects catalog inside an inner scroller `#workArea` (`min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:overflow-y-auto custom_scroll`).
  4. Replace the legacy loading spinner (`<i class="pi pi-spin pi-spinner">`) with modern `.pr-skeleton` shimmering placeholders (KPI cards + project cards skeleton).
  5. Ensure graceful native document scroll fallback below 900px.
  6. Strict SCSS rule: all `:host` display declarations must reside in `.scss` (`KZ-changes--sp-shell-app-viewport-2`).
- **Implements:**
  - `BSA-R-4` (Desktop independent vertical scrolling & sub-900px fallback scenarios)
  - `BSA-R-5` (Reporting tab docking scenario)
  - `BSA-R-8` (Loading skeleton architecture)
  - `BSA-AC-5`, `BSA-AC-6`, `BSA-AC-9`
- **Design References:** `docs/specs/bilateral/shell-sp-alignment/design.md` §5.2, §5.3, `BSA-DD-4`, `BSA-DD-5`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/bilateral-home.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/bilateral-home.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts`
- **Depends on:** `BSA-T-1`
- **Blocks:** `BSA-T-4`
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Definition of Done:**
  - [x] `#workArea` element exists with `overflow-y-auto` classes at ≥900px.
  - [x] Filter toolbar is positioned above `#workArea` directly below header tabs.
  - [x] Loading state renders `.pr-skeleton` shimmering cards instead of legacy spinner.
  - [x] No inline `:host` styles in template string.
  - [x] Unit tests pass: `npx jest src/app/pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.spec.ts --silent`
  - [x] Disqualifier / Falsifier: Removing `overflow-y-auto` from `#workArea` causes test assertion to fail.

---

### `BSA-T-3` — Viewport-Locked Scroller & Filter Docking in Results and Drafts Tabs [x]

- **Type:** client
- **Description:** Implement the viewport-locked layout in `bilateral-results-list.component` and `my-draft-results.component`:
  1. In `bilateral-results-list`: dock the phase selector and filter chips bar directly below the tabs band. Wrap the results list/table inside `#workArea` (`min-[900px]:overflow-y-auto custom_scroll`). Ensure loading skeleton support if applicable.
  2. In `my-draft-results`: dock the project filter dropdown and active filter chips directly below the tabs band. Wrap the AI draft cards list inside `#workArea` (`min-[900px]:overflow-y-auto custom_scroll`). Ensure loading skeleton support if applicable.
  3. Ensure sub-900px fallback to native document scroll.
  4. Ensure all `:host` styles reside in `.scss`.
- **Implements:**
  - `BSA-R-4` (Results and drafts independent vertical scrolling scenarios)
  - `BSA-R-5` (Results and drafts filter docking scenarios)
  - `BSA-R-8` (Loading skeleton architecture)
  - `BSA-AC-5`, `BSA-AC-6`, `BSA-AC-9`
- **Design References:** `docs/specs/bilateral/shell-sp-alignment/design.md` §5.2, §5.3, `BSA-DD-4`, `BSA-DD-5`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.scss`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/my-draft-results/my-draft-results.component.spec.ts`
- **Depends on:** `BSA-T-1`
- **Blocks:** `BSA-T-4`
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Definition of Done:**
  - [x] `#workArea` scroller implemented in both `bilateral-results-list` and `my-draft-results`.
  - [x] Filters docked directly below header tabs in both views.
  - [x] Loading states render `.pr-skeleton` when applicable.
  - [x] Unit tests pass: `npx jest src/app/pages/bilateral/pages/bilateral-results-list/ src/app/pages/bilateral/pages/my-draft-results/ --silent`
  - [x] Disqualifier / Falsifier: Removing `#workArea` from either template causes test failure.

---

### `BSA-T-4` — Responsive Review, Design Token Hygiene & End-to-End Suite Verification [x]

- **Type:** tests / client
- **Description:** Verify complete responsive behavior and enforce design token hygiene:
  1. Validate horizontal touch scrolling on mobile tab strip (<640px) with `no-scrollbar`.
  2. Validate action button label collapsing on small screens.
  3. Static source audit: verify zero hardcoded `#hex` color literals and zero new `pi pi-*` classes in touched bilateral files (`KZ-BOR-1`).
  4. Verify all `:host` rules reside in `.scss` files (`KZ-changes--sp-shell-app-viewport-2`).
  5. Run full client test suite and linter on bilateral package.
- **Implements:**
  - `BSA-R-6` (Narrow mobile viewport and tablet viewport scenarios)
  - `BSA-R-7` (Token compliance and CSS hygiene scenarios)
  - `BSA-AC-7`, `BSA-AC-8`
- **Design References:** `docs/specs/bilateral/shell-sp-alignment/design.md` §6.1, §6.2, §6.3
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts`
  - All modified files across `BSA-T-1`, `BSA-T-2`, `BSA-T-3`
- **Depends on:** `BSA-T-2`, `BSA-T-3`
- **Blocks:** —
- **Estimate:** S (≤ 0.5d)
- **Skills:** `angular-developer`, `tailwind-design-system`
- **Definition of Done:**
  - [x] Grep audit for hex colors in touched files returns 0 matches.
  - [x] Grep audit for new PrimeIcons in touched files returns 0 matches.
  - [x] Full bilateral test suite passes: `npx jest src/app/pages/bilateral/ --silent` (30 suites, 968 tests passed).
  - [x] Lint check passes: `npx ng lint --quiet` (All files pass linting).

---

## 4. Dependency Graph

```text
BSA-T-1 (Header Refactor: Title, Back button removal, Tabs with icons)
   │
   ├──► BSA-T-2 (Reporting Tab: Viewport-Locking & Filter Docking)
   │       │
   │       ▼
   ├──► BSA-T-3 (Results & Drafts: Viewport-Locking & Filter Docking)
   │       │
   │       ▼
   └──► BSA-T-4 (Responsive Review, Token Audit & Full Suite Verification)
```

- **Parallel-safe branches:** `BSA-T-2` and `BSA-T-3` can be executed independently once `BSA-T-1` is complete.

---

## 5. Requirement & Scenario Coverage Matrix

| Requirement | Scenarios & Clauses Covered | Tasks |
|---|---|---|
| `BSA-R-1` | Standard desktop hero presentation, Long title truncation | `BSA-T-1` |
| `BSA-R-2` | Tabbed navigation without back button, Detail variant back link preserved | `BSA-T-1` |
| `BSA-R-3` | Tab strip composition, Reporting default active, Drafts badge | `BSA-T-1` |
| `BSA-R-4` | Desktop independent vertical scroll (≥900px), Sub-900px fallback | `BSA-T-2`, `BSA-T-3` |
| `BSA-R-5` | Filter docking across Reporting, Results, and Drafts tabs | `BSA-T-2`, `BSA-T-3` |
| `BSA-R-6` | Mobile horizontal tab scroll, Button label collapse, Tablet layout | `BSA-T-1`, `BSA-T-4` |
| `BSA-R-7` | 0 new hex, 0 new PrimeIcons (`KZ-BOR-1`), `:host` in `.scss` (`KZ-SAV-2`) | `BSA-T-2`, `BSA-T-3`, `BSA-T-4` |

---

## 6. Test Plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BSA-TEST-1` | Unit / DOM | `BSA-R-1`, `BSA-R-2`, `BSA-AC-1`, `BSA-AC-2` | `bilateral-page-header.component.spec.ts` |
| `BSA-TEST-2` | Unit / DOM | `BSA-R-3`, `BSA-AC-3`, `BSA-AC-4` | `bilateral-page-header.component.spec.ts` |
| `BSA-TEST-3` | Unit / DOM | `BSA-R-4`, `BSA-R-5`, `BSA-AC-5`, `BSA-AC-6` | `bilateral-projects-panel.component.spec.ts` |
| `BSA-TEST-4` | Unit / DOM | `BSA-R-4`, `BSA-R-5`, `BSA-AC-5`, `BSA-AC-6` | `bilateral-results-list.component.spec.ts` |
| `BSA-TEST-5` | Unit / DOM | `BSA-R-4`, `BSA-R-5`, `BSA-AC-5`, `BSA-AC-6` | `my-draft-results.component.spec.ts` |
| `BSA-TEST-6` | Static / Lint | `BSA-R-6`, `BSA-R-7`, `BSA-AC-7`, `BSA-AC-8` | `ng lint` + Grep token check |
