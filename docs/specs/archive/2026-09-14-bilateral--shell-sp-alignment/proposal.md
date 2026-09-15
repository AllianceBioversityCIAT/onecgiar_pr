# Proposal: Bilateral Center Shell & Hero SP Alignment

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `bilateral/shell-sp-alignment` |
| **Slug** | `bilateral-shell-sp-alignment` — derived from free-text argument |
| **Type** | Change |
| **Approval Mode** | gated |
| **Parent Spec** | none (Foundational stage; subsequent specs will address Tab-by-Tab refinements) |
| **Author** | Antigravity (T1 Architect) |
| **Date** | 2026-09-07 |

---

## Intent

Unify the CGIAR Center Bilateral view (`/bilateral/:acronym/*`) with the Science Programs (SP) view (`/result-framework-reporting/entity-details/:entityId/*`). This establishes visual consistency, coherent tab naming, sticky chrome (hero + filters) with independent vertical content scrolling, and responsive behavior across all three center tabs (`Reporting`, `Results`, `Drafts`).

---

## Problem / Current Behavior

Currently, navigating between Science Programs and CGIAR Centers reveals significant UI/UX discrepancies:

1. **Title & Hero Disproportion**:
   - The Bilateral header renders an oversized title (`text-[30px] font-extrabold`) in an 88px container with loose vertical spacing.
   - In contrast, the SP header (`reporting-program-band`) uses a compact title (`text-[18px] sm:text-[21px] font-bold`), clean eyebrow metadata, and tight action grouping.
2. **Tabs Structure & Incongruent Naming**:
   - The Bilateral tab bar displays text-only tabs without icons (`Overview`, `Results`, `Drafts`).
   - The primary tab is labeled "Overview", yet its content is specifically the **Bilateral projects catalog and reporting entry point** (with "+ Create result" actions). In SPs, this functional concept is named **Reporting** and is the primary reporting workflow tab.
3. **Redundant Navigation**:
   - Bilaterals still renders an explicit `[Back to Centers]` button in the top action area. Centers are already first-class items in the left sidebar rail ("MY CGIAR CENTERS"), making the button redundant and misaligned with SPs (where smart-back was removed).
4. **Scroll & Sticky Behavior**:
   - In Bilaterals, the page uses window-level scrolling. When scrolling down long project or result lists, users lose sight of the active filters, search box, and center context.
   - SPs implement a viewport-locked pattern (`changes/sp-shell-app-viewport`) where the band and controls remain static while the inner work area (`#workArea`) scrolls vertically.
5. **Filters Placement**:
   - Filter and search controls are placed inside the scrolling document body rather than directly docked under the hero tabs.
6. **Responsive Layout**:
   - The Bilateral header and tab controls have not undergone comprehensive responsive testing across mobile (<640px), tablet (640–899px), and desktop (≥900px).

---

## Proposed Outcome

1. **Unified Hero Presentation**:
   - Align title typography to `text-[18px] sm:text-[21px] font-bold` with standard color tokens (`var(--pr-text-heading)`).
   - Refactor eyebrow to display center indicator (`• CGIAR CENTER · REPORTING CYCLE 2025` or center code/name).
   - Compact the hero container height (~64px) with actions aligned cleanly on the right.
   - Remove the `[Back to Centers]` button.
   - Retain only primary/outline action buttons (e.g., `[+ Report emerging result]` matching SP button styling).
2. **Tabs Parity & Congruent Naming**:
   - Rename `Overview` to `Reporting` (default landing tab) with icon (`track_changes` or `space_dashboard`).
   - Style tabs with icons + labels at 48px height, 2px bottom active border, and counter badges (e.g., Drafts count).
   - Standardize tab slots:
     - **Reporting** (icon + "Reporting", default route `/bilateral/:acronym/home`)
     - **Results** (icon + "Results", route `/bilateral/:acronym/results`)
     - **Drafts** (icon + "Drafts" + count badge, route `/bilateral/:acronym/drafts`)
3. **Static Header & Filter Bar with Vertical Content Scroll**:
   - Adopt the viewport-lock pattern: the hero band and top filter bar remain sticky/static at the top.
   - Vertical scrolling is delegated to the inner work area (`#workArea` with custom scrollbar), ensuring filters and center identity are permanently accessible.
4. **Responsive Shell Review**:
   - Full responsive adaptation across breakpoints (<640px, 640px–899px, ≥900px), including horizontally scrollable tab strips (`overflow-x-auto no-scrollbar`) and collapsible action labels.
5. **Foundation for Tab-by-Tab Iterations**:
   - Solidify the shell layout first, leaving individual tab inner contents (catalog cards, result tables, AI draft cards) ready for subsequent scoped tab enhancements.

---

## Scope

### In Scope
- Refactoring `bilateral-page-header` component (title size, eyebrow, action buttons, tab styling with icons, removing "Back to Centers").
- Renaming the default tab from "Overview" to "Reporting" across routing and labels, keeping `/home` as the default landing route for backwards URL compatibility.
- Implementing the sticky hero + filter shell layout with independent vertical scroll (`#workArea`) in bilateral views.
- Restructuring top filter bars in bilateral pages to dock beneath the hero tabs.
- Responsive validation and adaptation across all three tabs (`Reporting`, `Results`, `Drafts`).
- Design system compliance: CSS variables (`var(--pr-*)`), `@ng-icons/lucide` or standard icon tokens, zero new PrimeIcons, Tailwind 4.

### Out of Scope
- Complete redesign of the inner data models or backend APIs for bilateral results/projects.
- Deep redesign of tab-specific inner widgets (e.g. rewrite of `BilateralAiDraftDetailComponent` or the result creation wizard). These will be addressed tab-by-tab in subsequent child specs.
- Modifying Science Programs (`result-framework-reporting`) code.

---

## Non-Goals

- Do not alter the functional data logic of `BilateralAiService` or `BilateralContextService`.
- Do not break existing bookmarks or deep links to `/bilateral/:acronym/home`, `/results`, or `/drafts`.
- Do not affect the `variant="detail"` mode of `bilateral-page-header` used inside the result editor.

---

## Affected Users, Systems, And Specs

| Component / Layer | Affected Items | Impact |
|---|---|---|
| **Frontend Components** | `bilateral-page-header.component.{html,ts,scss}` | Title font size, eyebrow, removal of back button, tab icons, tab rename. |
| **Bilateral Views** | `bilateral-home.component`, `bilateral-results-list.component`, `my-draft-results.component` | Viewport-locking shell, filter docking, vertical scroll area. |
| **Routing** | `routing-data.ts` (`BilateralRouting`) | Label alignment (`Reporting` default). |
| **Specs & Kaizen** | `changes/sp-shell-app-viewport` (`SAV`), `bilateral--overview-redesign` | Reuses viewport-lock conventions and resolves token debt. |

---

## Visual Reference

- **Source**: User-provided screenshots comparing Current Bilateral View vs Reference SP View.
- **Artifacts saved**:
  - Current Bilateral View: `docs/specs/bilateral/shell-sp-alignment/mockup/current-bilateral-view.png`
  - Reference SP View: `docs/specs/bilateral/shell-sp-alignment/mockup/reference-sp-view.png`
- **Key Visual Elements**:
  - Eyebrow: `• CGIAR CENTER`
  - Title: Compact font (18–21px font-bold) with action button on the same horizontal plane.
  - Tabs: Icons (`track_changes`, `table_chart`, `fact_check`) + labels + count badges.
  - Toolbar: Clean search input and filter buttons immediately below tabs.

---

## Requirement Delta Preview

### ADDED Requirements
- Icons on all bilateral navigation tabs (`Reporting`, `Results`, `Drafts`).
- Viewport-locking shell container (`min-[900px]:flex-col min-[900px]:overflow-hidden`) with dedicated `#workArea` scrolling.
- Responsive horizontal tab scroll on small screens (`no-scrollbar`).

### MODIFIED Requirements
- Tab 1 renamed from "Overview" to "Reporting", retaining its position as the default tab.
- Title font reduced from `text-[30px] font-extrabold` to `text-[18px] sm:text-[21px] font-bold`.
- Hero container condensed from `h-[88px]` to `h-[64px]`.
- Top filter bar repositioned directly below the hero tabs.

### REMOVED Requirements
- Removed `[Back to Centers]` button from the bilateral header.

---

## Approach Options

### Option 1: In-Place Refactor of `bilateral-page-header` + Viewport-Lock Shell (Recommended)
- **Description**: Refactor `bilateral-page-header` tabbed variant to match `reporting-program-band` structure (title size, eyebrow, icons, removal of back button). Adopt the proven `#workArea` scrolling layout in bilateral views.
- **Pros**:
  - Directly fulfills all user requirements with zero disruption to SP code.
  - Reuses battle-tested viewport-lock patterns from `changes/sp-shell-app-viewport`.
  - Maintains separation between Center reporting and Science Program reporting modules while presenting identical UX.
- **Cons**: Requires adjusting container classes in `bilateral-home`, `bilateral-results-list`, and `my-draft-results`.

### Option 2: Polymorphic `reporting-program-band` Component
- **Description**: Extend `reporting-program-band` to handle both Science Programs and CGIAR Centers via mode flags.
- **Pros**: Single shared header component across the monorepo.
- **Cons**: High regression risk on Science Programs (`entity-details`), tight coupling between distinct modules with different data services and action workflows.

### Option 3: Cosmetic CSS-Only Tweak
- **Description**: Adjust title font and hide back button via CSS without addressing layout or scrolling.
- **Pros**: Very low LOC.
- **Cons**: Does not solve the static hero/filters requirement, vertical scrolling remains unmanaged, and responsive issues persist.

---

## Recommended Approach

**Option 1** is strongly recommended. It isolates changes to the bilateral module, aligns visual presentation 1:1 with the Science Programs reference, and creates a solid, modular shell for the subsequent Tab-by-Tab refinements.

---

## Scope Chunking & Tab-by-Tab Roadmap

Per user guidance ("Iniciemos con este trabajo y despues vamos Tab por Tab"):

1. **Chunk 1 (This Spec - `bilateral/shell-sp-alignment`)**:
   - Shell, Hero, Title, Removal of Back button, Tabs renaming/icons, Static header & filters with vertical scroll, Responsive shell foundation.
2. **Chunk 2 (Follow-up - `bilateral/tab-reporting`)**:
   - Deep dive into Reporting Tab: KPI cards alignment, project catalog filtering, card/list view refinements.
3. **Chunk 3 (Follow-up - `bilateral/tab-results`)**:
   - Deep dive into Results Tab: Table columns, phase selector, status filters, bulk actions.
4. **Chunk 4 (Follow-up - `bilateral/tab-drafts`)**:
   - Deep dive into Drafts Tab: AI draft cards, project filters, submission workflow.

---

## Risks, Dependencies, And Open Questions

### Risks
- **Sticky / Scrolling Cascade**: As documented in Kaizen lesson `KZ-changes--sp-shell-app-viewport-2`, `:host` display rules must be kept consistently in `.scss` to avoid cascade order conflicts in Angular.
- **Token Debt**: Comply with `KZ-BOR-1` by avoiding hardcoded hex colors and using `var(--pr-*)` design tokens and Lucide icons.

### Open Questions
- Should the default route path be aliased from `/home` to `/reporting` or kept as `/home` with label "Reporting"? *(Recommendation: keep path `/home` mapped to label "Reporting" to preserve deep links and prevent breaking bookmarks, with redirect `/reporting` -> `/home` if accessed).*

---

## Success Criteria

1. **Title & Hero**: Title size matches SPs (`18px-21px bold`), height ~64px, eyebrow aligned.
2. **Back Button**: `[Back to Centers]` button is removed.
3. **Tabs**: 3 tabs (`Reporting`, `Results`, `Drafts`) with respective icons, active 2px border, and count badges. "Reporting" is active by default.
4. **Static Chrome & Vertical Scroll**: Hero and filters remain visible at the top during page scroll; content below scrolls independently.
5. **Responsive**: Flawless layout at mobile (<640px), tablet (640–899px), and desktop (≥900px).
6. **Tests & Lint**: Clean unit tests and zero lint errors in `onecgiar-pr-client`.

---

## Next Step

```text
/akili-specify bilateral/shell-sp-alignment
```
