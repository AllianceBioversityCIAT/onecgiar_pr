# Design: Bilateral Center Shell & Hero SP Alignment

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/shell-sp-alignment/design.md` |
| **Requirements Reference** | [`docs/specs/bilateral/shell-sp-alignment/requirements.md`](./requirements.md) |
| **Module / Sub-feature** | `bilateral` / `shell-sp-alignment` |
| **Prefix** | `BSA` (Bilateral Shell Alignment) |
| **Status** | draft |
| **Budget** | 4 tasks · ~240 LOC production / ~280 LOC test · ≤ 1 review round per task |
| **Date** | 2026-09-07 |

---

## 1. Executive Summary

This technical design details the implementation architecture for aligning the CGIAR Center Bilateral views (`/bilateral/:acronym/*`) with the Science Programs (SP) view (`/result-framework-reporting/entity-details/:entityId/*`).

The solution refactors `bilateral-page-header` to adopt the compact ~64px hero height, reduced title typography (`18px-21px bold`), eyebrow metadata, standardized tabs with icons, and removes the redundant `[Back to Centers]` button. It adopts the viewport-locking layout pattern proven in `changes/sp-shell-app-viewport` across all three center views (`Reporting`, `Results`, `Drafts`), anchoring the hero and filter toolbars at the top while delegating vertical scrolling to an internal `#workArea` scroller. All markup and styles follow Tailwind 4, CSS custom properties (`var(--pr-*)`), and `@ng-icons/lucide` / Material Icons with strict SCSS cascade hygiene.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system
- **Server modules touched:** None. Backend APIs and schemas remain untouched.
- **Client modules touched:**
  - `src/app/pages/bilateral/components/bilateral-page-header/`
  - `src/app/pages/bilateral/pages/bilateral-home/`
  - `src/app/pages/bilateral/pages/bilateral-results-list/`
  - `src/app/pages/bilateral/pages/my-draft-results/`
  - `src/app/shared/routing/routing-data.ts`
- **Design Tokens / Frameworks:** Tailwind 4, Spartan UI token layer, `@ng-icons/lucide`, Material Icons.

### 2.2 Layout Hierarchy & Interaction Flow

```text
+-----------------------------------------------------------------------------------+
| Top Shell Header (Global PRMS Navigation)                                         |
+-----------------------------------------------------------------------------------+
| STICKY CHROME CONTAINER (Sticky top-0 or fixed at >=900px)                       |
|  +------------------------------------------------------------------------------+ |
|  | HERO BAND (~64px): Eyebrow (• CGIAR CENTER) | Title (18-21px) | CTA Buttons  | |
|  +------------------------------------------------------------------------------+ |
|  | TABS STRIP (48px): [Track] Reporting  |  [Table] Results  |  [Check] Drafts  | |
|  +------------------------------------------------------------------------------+ |
|  | DOCKED FILTER TOOLBAR (Search, Quick Filter Chips, View Modes)               | |
+--+------------------------------------------------------------------------------+-+
| INNER WORK AREA (#workArea: overflow-y-auto custom_scroll at >=900px)            |
|                                                                                   |
|  [ Content: Project KPI cards / Project catalog cards / Result table / Drafts ]   |
|  ... scrolls vertically while Hero and Filters remain pinned at top ...           |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Model Changes

**None.** This specification is strictly a frontend UI/UX architecture and shell layout alignment. No database entities, DTOs, or migrations are created or altered.

---

## 4. API Surface

**None.** Existing API endpoints consumed by `BilateralContextService`, `BilateralAiService`, and `ResultsApiService` remain unchanged.

---

## 5. Frontend Component Architecture

### 5.1 `BilateralPageHeaderComponent` Refactor
The component currently maintains two variants:
1. `variant="detail"`: Used in the bilateral result creator/editor (`bilateral-result-creator`). This variant is preserved completely without changes.
2. `variant="default"` (Tabbed Center Header): Refactored to mirror `reporting-program-band`:
   - **Hero Identity Row:**
     - Height condensed from `88px` to `64px`.
     - Eyebrow styled with a colored dot indicator and uppercase tracking label `CGIAR CENTER`.
     - Center title rendered at `text-[18px] sm:text-[21px] font-bold` with color `var(--pr-text-heading)`. Long titles truncate with an ellipsis.
     - Center name rendered as subtitle text in `text-[12px] sm:text-[13px] text-[var(--pr-text-secondary)]` without pushing the tabs downward.
     - Action button area right-aligned: removal of `[Back to Centers]`; action button styled consistently as `[+ Report emerging result]`.
   - **Tabs Row:**
     - Height fixed at `48px` with bottom hairline `border-[var(--pr-border-band)]`.
     - Active tab highlighted with 2px bottom border in `var(--pr-color-primary-300)` overlapping the hairline (`mb-[-1px]`) and `font-semibold text-[var(--pr-text-heading)]`.
     - Tab items:
       - **Tab 1:** Icon (`track_changes` or `space_dashboard`) + Label `Reporting` (links to `/bilateral/:acronym/home`).
       - **Tab 2:** Icon (`table_chart`) + Label `Results` (links to `/bilateral/:acronym/results`).
       - **Tab 3:** Icon (`fact_check`) + Label `Drafts` (links to `/bilateral/:acronym/drafts`) + count badge from `bilateralAiService.draftCountDisplay()`.
     - Responsive container: `overflow-x-auto no-scrollbar` allowing seamless touch swiping on mobile.

### 5.2 Viewport-Locked Scroller Layout (`#workArea`)
Following the proven architecture from `changes/sp-shell-app-viewport` (`SAV`):
- The host view container for each tab (`bilateral-home`, `bilateral-results-list`, `my-draft-results`) adopts a viewport-filling flex layout:
  - Base (mobile/tablet < 900px): Native document flow (`min-h-screen`, standard scroll).
  - Desktop (≥ 900px): `min-[900px]:h-full min-[900px]:flex min-[900px]:flex-col min-[900px]:overflow-hidden`.
- Header + Tabs: Rendered at the top of the column.
- Filter Toolbar: Positioned immediately beneath the tabs as a sticky/static bar with padding matching the tabs (`px-[16px] sm:px-[32px]`).
- Work Area (`#workArea`):
  - Styled with `min-[900px]:flex-1 min-[900px]:min-h-0 min-[900px]:overflow-y-auto custom_scroll`.
  - All scrolling content (KPI cards, project grids, table rows, card lists) is contained within this element.

### 5.3 Tab-Specific Filter Toolbar Docking
- **Reporting Tab (`bilateral-home` / `bilateral-projects-panel`):**
  - Reorganize the toolbar so Search input, Quick Filter chips (All, Top Programs, Multi-Program), and Grid/List toggle are docked directly beneath the tabs band.
  - The KPI summary cards render inside `#workArea` right above the catalog grid, so the user retains immediate access to search and filters while browsing.
- **Results Tab (`bilateral-results-list`):**
  - The phase tab strip and filter chips bar are docked immediately below the hero tabs.
  - The results data table renders inside `#workArea`.
- **Drafts Tab (`my-draft-results`):**
  - The project filter dropdown and active filter chips are docked immediately below the hero tabs.
  - The AI draft cards list renders inside `#workArea`.

---

## 6. Design System, Styling & Cascade Discipline

### 6.1 Token Compliance (`KZ-BOR-1`)
- All colors must utilize CSS custom properties (`var(--pr-surface-band)`, `var(--pr-border-band)`, `var(--pr-text-heading)`, `var(--pr-color-primary-300)`, etc.).
- Absolute ban on raw `#hex` literals in any new or modified styling.
- All icons must use `@ng-icons/lucide` or standard Material Icons matching the SP reference (`reporting-program-band`). Zero new `pi pi-*` classes.

### 6.2 Angular SCSS Cascade Discipline (`KZ-changes--sp-shell-app-viewport-2`)
- Angular compiler emits `styleUrls` before inline `styles`.
- To avoid cascade order bugs where inline styles silently override media query mixins, all `:host` layout rules must be declared in the component `.scss` file, not in inline `styles: [...]` within the `@Component` decorator.

### 6.3 Responsive Breakpoints
- **Mobile (< 640px):**
  - Hero header paddings `px-[16px]`.
  - Tab strip horizontally scrollable (`overflow-x-auto no-scrollbar`).
  - Action button collapses label to icon + compact text.
- **Tablet (640px – 899px):**
  - Hero header paddings `px-[32px]`.
  - Native document vertical scrolling.
- **Desktop (≥ 900px):**
  - Viewport-locked flex column with `#workArea` scroller.

---

## 7. Design Decisions (ADRs)

### BSA-DD-1: In-Place Refactoring of `bilateral-page-header`
- **Context:** Bilaterals and Science Programs currently use different header components (`bilateral-page-header` vs `reporting-program-band`).
- **Decision:** Refactor `bilateral-page-header` to match `reporting-program-band` visual tokens and layout rather than unifying them into a polymorphic component.
- **Alternatives Considered:**
  1. *Polymorphic `reporting-program-band`:* Rejected due to high risk of regressions on SPs (`entity-details`), tight coupling with SP ToC services, and distinct action handlers.
  2. *CSS-only cosmetic restyling:* Rejected because it fails to provide the viewport-locked scrolling and filter docking.
- **Consequences:** Keeps module boundaries clean while delivering 100% visual parity.

### BSA-DD-2: Removal of `[Back to Centers]` Button (Reversion Challenge)
- **Context:** The bilateral header currently contains a `[Back to Centers]` button.
- **Decision:** Remove `[Back to Centers]` from the center tabbed header.
- **Reversion Challenge:**
  - *Question:* "What does removing this break?"
  - *Evaluation:* Center navigation is already permanently visible in the left navigation sidebar ("MY CGIAR CENTERS"), which is always accessible. In SPs, the smart-back button was removed for this same reason (it was redundant and caused confusing loops). Removing the button frees horizontal space, eliminates duplicate navigation controls, and prevents header clutter. The result editor back button (`variant="detail"`) remains unaffected.
- **Consequences:** Cleaner header layout, 1:1 parity with SP header.

### BSA-DD-3: Tab Terminology & Default Route Alignment
- **Context:** The primary bilateral tab is currently labeled "Overview", but its content is the Bilateral Projects catalog and reporting action hub. In SPs, the reporting workflow is called "Reporting".
- **Decision:** Rename the tab label from "Overview" to "Reporting". Maintain route `/home` as the default landing route for this tab to preserve backwards compatibility with existing bookmarks and external links.
- **Alternatives Considered:**
  1. *Rename route path to `/reporting`:* Rejected as unnecessary risk of breaking external deep-links; keeping `/home` mapped to the label "Reporting" achieves full UX parity safely.
- **Consequences:** Clear, congruent tab labeling with zero broken links.

### BSA-DD-4: Viewport-Locked Scroller Layout (`#workArea`)
- **Context:** Users scrolling long project catalogs or result lists lose visibility of the hero context and active filters.
- **Decision:** Implement the viewport-locked flex container at ≥900px with `#workArea` scrolling, following `changes/sp-shell-app-viewport`.
- **Alternatives Considered:**
  1. *Window-level scrolling:* Rejected because filters and header scroll out of view.
  2. *CSS `position: sticky` on multiple disparate blocks:* Fragile and prone to z-index fighting and subpixel leaking.
- **Consequences:** Filters and header are permanently accessible during browsing.

### BSA-DD-5: Docked Filter Toolbar Placement
- **Context:** In SPs, search and filters are docked directly below the hero tabs band. In bilaterals, filter controls were placed further down inside the content body.
- **Decision:** Standardize the top filter toolbar position directly beneath the tabs across all three views.
- **Consequences:** Consistent, predictable location for search and filter controls across all tabs.

---

## 8. Sizing & Budget (Step 2.4)

| Dimension | Budget | Notes |
|---|---|---|
| **Tasks** | **4 tasks** | 1. Header refactor & Back button removal; 2. Viewport-lock & Reporting Tab docking; 3. Results & Drafts Tab docking; 4. Responsive audit & token verification. |
| **Production LOC** | **~240 LOC** | Targeted modifications in HTML and SCSS across header and 3 tab views. |
| **Test LOC** | **~280 LOC** | Component unit tests and DOM assertions in Jest. |
| **Review Rounds** | **≤ 1 per task** | Standardized budget per Kaizen lesson `KZ-changes--sp-shell-app-viewport-1`. |

---

## 9. Testing Strategy

1. **Header & Navigation Unit Tests (`bilateral-page-header.component.spec.ts`):**
   - Verify title font classes (`text-[18px] sm:text-[21px] font-bold`).
   - Verify absence of `Back to Centers` button in default tabbed variant.
   - Verify presence of back button when `variant="detail"`.
   - Verify rendering of all 3 tabs with their icons and correct `routerLink` attributes.
   - Verify draft count badge rendering when drafts exist.
2. **Viewport Lock & Scroll Verification:**
   - Assert host container classes at ≥900px (`min-[900px]:overflow-hidden`).
   - Assert `#workArea` presence and `overflow-y-auto` styles.
   - Static source inspection to confirm `:host` rules reside in `.scss` (`KZ-changes--sp-shell-app-viewport-2`).
3. **Token & CSS Hygiene Lint:**
   - Grep verification ensuring zero new `#hex` literals and zero new `pi pi-*` classes (`KZ-BOR-1`).
4. **Responsive & A11y Verification:**
   - Verify `aria-current="page"` on active tab.
   - Verify horizontal scroll classes on tab strip (`overflow-x-auto no-scrollbar`).
