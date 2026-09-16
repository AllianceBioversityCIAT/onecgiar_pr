# Module Spec — Bilateral Result Editor Rail & Header Alignment (`design.md`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bilateral/result-rail-alignment` |
| Feature | Bilateral Result Editor Rail & Header Alignment |
| Short Code | `BRRA` |
| Type | `Change` |
| Approval Mode | `gated` |
| Date | 2026-09-15 |
| Budget | 3 tasks · ~120 net LOC · 1 review round |
| Status | `approved` |

---

## 2. Summary

This design defines the technical architecture and component adjustments required to align the Bilateral Result Editor (`/bilateral/:center/result/:id`) with the canonical W1/W2 Result Detail (`/result/result-detail/:code/:section`) design blueprint.

The solution enhances the bilateral sidebar rail (`.bcr-rail`) in `BilateralResultCreatorComponent` to host a persistent back navigation anchor and a result identity block (result code with copy button, uppercase result type name, and status pill badge), while streamlining `BilateralPageHeaderComponent` in detail mode to prevent redundant navigation and metadata crowding.

Module isolation between `pages/bilateral/` and `pages/results/` is strictly preserved: no W1/W2 services or green-check engines are cross-imported.

---

## 3. Architecture Overview

### 3.1 Where this lives in the system

- **Client Components Touched:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/` (`bilateral-result-creator.component.ts`, `.html`, `.scss`)
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/` (`bilateral-page-header.component.ts`, `.html`, `.scss`)
- **Shared Primitives Used:**
  - `CopyButtonComponent` (`onecgiar-pr-client/src/app/shared/components/copy-button/copy-button.component.ts`)
  - Router directives (`RouterLink`)
- **Server / API Surfaces Touched:** None. All data is provided by existing `BilateralCreationService` and `BilateralContextService` signals.

### 3.2 Visual & Structural Layout Flow

```text
[ Bilateral Result Editor Layout (.bcr-layout) ]
  ├── [ Left Rail (.bcr-rail: 240px, fixed scroll) ]
  │     ├── Persistent Back Link (< Back to Center overview + chevron + divider)
  │     ├── Result Identity Block (Code # + CopyButton + Uppercase Type + Status Pill)
  │     ├── SECTIONS Label & Navigation Items
  │     ├── Progress Bar & Counter (X of Y sections complete)
  │     └── Action Slot (Submit for review)
  │
  └── [ Right Content (.bcr-content) ]
        └── [ Scrollable Viewport (.bcr-scroll) ]
              ├── Streamlined Header (Title, Info Icon, Secondary Identity Strip)
              ├── Phase Switcher Container
              ├── Section Body Card
              └── Floating Action Footer (Back, Next, Save draft)
```

---

## 4. Extended Directory Structure

No new directory structures are added. Existing files are enhanced within their current module boundaries:

```text
onecgiar-pr-client/src/app/pages/bilateral/
├── components/
│   └── bilateral-page-header/
│       ├── bilateral-page-header.component.html      # Streamlined detail header (BRRA-R-3, BRRA-R-4)
│       ├── bilateral-page-header.component.ts        # Signal inputs and strip cleanup
│       └── bilateral-page-header.component.spec.ts    # Regression and assertion specs
└── pages/
    └── bilateral-result-creator/
        ├── bilateral-result-creator.component.html   # Pinned rail back link and identity card (BRRA-R-1, BRRA-R-2)
        ├── bilateral-result-creator.component.scss   # Token-based styles for identity card and back link
        ├── bilateral-result-creator.component.ts     # Signals for back link, copy button, status tokens
        └── bilateral-result-creator.component.spec.ts # Unit tests for rail DOM, copy button, and navigation
```

---

## 5. Data Model Changes

No database or entity changes are required.

---

## 6. API Surface

No API modifications. All required attributes (`result_code`, `result_type_name`, `status_id`, `status_name`, `center_acronym`) are already fetched by `BilateralCreationService.loadResult()`.

---

## 7. Frontend Component Architecture

### 7.1 `BilateralResultCreatorComponent` Rail Architecture

1. **Back Navigation Anchor:**
   - Positioned as the first child of `.bcr-rail` inside editor mode (`!isCreating()`).
   - Renders an `<a>` with `routerLink` pointing to `/bilateral/:center/home` (preserving the `phase` query parameter via `tabQueryParams`).
   - Styled with standard hover token `hover:bg-[var(--pr-color-primary-50)]` and primary text `text-[var(--pr-text-secondary)] hover:text-[var(--pr-color-primary-400)]`.
   - Separated by a 1px border divider (`border-b border-[var(--pr-border)]`).

2. **Result Identity Block:**
   - Positioned immediately below the back anchor.
   - Pinned at the top of the rail, remaining visible as sections scroll.
   - Contains:
     - Result code row: `Result code #<code>` with `app-copy-button` rendered with `group/copy` hover reveal.
     - Type name row: Displayed in uppercase bold typography (`text-[12px] font-semibold uppercase tracking-[0.02em]`).
     - Status pill badge: Rendered with rounded-full pill geometry, uppercase text, and dynamic status tokens (`statusFg`, `statusBg`).
   - When result data is loading (`isLoadingResult`), renders skeleton placeholders for code, type, and badge.
   - Separated from the `SECTIONS` list by a 1px border divider.

### 7.2 `BilateralPageHeaderComponent` Streamlining

1. **Removal of In-Flow Back Button in Detail Mode:**
   - Deprecate `<button data-testid="bilateral-header-back-btn">` in `variant="detail"`.
   - The header directly begins with the result title.
2. **Identity Strip Normalization:**
   - In `variant="detail"`, remove `resultCode`, `resultTypeName`, and `statusBadge` from the inline strip under the title.
   - Retain contextual attributes: `level`, `W3/Bilateral` funding tag, center name / submitter, area of work / project, and AI provenance badge.

---

## 8. Design Decisions

### `BRRA-DD-1`: Independent Rail Assembly vs. Direct Component Import
- **Context:** W1/W2 uses `ResultSectionsSidebarComponent`.
- **Decision:** Reconstruct the identical geometry and visual hierarchy in `BilateralResultCreatorComponent` rather than importing `ResultSectionsSidebarComponent`.
- **Rationale:** `pages/results/` components are coupled to `ResultSectionsService`, `FieldsManagerService`, and portfolio-based routing (P22/P25). Bilateral results follow an accordion/section pattern with `BilateralMdsTrackerService`. Direct coupling would violate module boundaries and introduce severe regression risks.
- **Traceability:** Implements `BRRA-R-1`, `BRRA-R-2`, `NFR-3`.

### `BRRA-DD-2`: Back Navigation Target Resolution
- **Context:** Users may arrive at a result from the Center Overview tab, the Bilateral Results list, or a direct link.
- **Decision:** The rail back link routes to `/bilateral/:center/home` (or referring list via `SmartNavigationService` if available), preserving the active `phase` query param.
- **Rationale:** Guarantees zero-scroll persistent exit back to the center workspace without state loss.
- **Traceability:** Implements `BRRA-R-1`.

### `BRRA-DD-3`: Status Color Mapping via PRMS Design Tokens
- **Context:** Bilateral results support 7 status states (Editing, Submitted, QAed, Discontinued, Pending Review, Approved, Rejected).
- **Decision:** Map status IDs to standard PRMS semantic tokens:
  - 1 (Editing): Neutral/in-progress tokens (`--pr-status-in-progress-*`).
  - 5 (Pending review): Warning amber tokens (`#B45309`, `#FEF3C7`).
  - 6 (Approved): Approved green tokens (`--pr-status-approved-*`).
  - 7 (Rejected): Red error tokens (`--pr-status-rejected-*`).
- **Rationale:** Ensures exact visual consistency with W1/W2 status indicators.
- **Traceability:** Implements `BRRA-R-5`.

### `BRRA-DD-4`: Reversion Challenge on Header Back Button and Metadata Strip
- **Challenge Question:** What does removing the back button and identity tags from `BilateralPageHeaderComponent` break?
- **Analysis:**
  - *Back Button:* Moving it from the scrolling header to the top of the fixed rail *improves* usability: users no longer need to scroll to the top of long forms to exit.
  - *Metadata Strip:* Removing code, type, and status from the header prevents confusing duplicate displays, while keeping Level, Funding, Center, and Area of Work preserves critical contextual tags.
- **Conclusion:** Reversion is fully justified and verified; no functional breakage.
- **Traceability:** Implements `BRRA-R-3`, `BRRA-R-4`.

---

## 9. Budget & Sizing

| Metric | Target |
|---|---|
| Expected Tasks | 3 tasks |
| Expected LOC | ~120 net LOC |
| Expected Review Rounds | 1 round |
| Depth Sizing | `Standard` |

---

## 10. Test Strategy

1. **Unit Testing (`bilateral-result-creator.component.spec.ts`):**
   - Assert presence of persistent back link at the top of the rail with valid router link and query params.
   - Assert presence of identity block with result code, `app-copy-button`, uppercase result type, and styled status pill.
   - Assert skeleton placeholders render while loading.
2. **Unit Testing (`bilateral-page-header.component.spec.ts`):**
   - Assert `variant="detail"` does not render `bilateral-header-back-btn`.
   - Assert `variant="detail"` identity strip does not duplicate code or status badge.
3. **Build & Type Checking:**
   - Execute `npx ng build --configuration=development --no-progress` to guarantee 100% template type safety.
