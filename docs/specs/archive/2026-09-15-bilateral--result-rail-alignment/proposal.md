# Proposal — Bilateral Result Editor Rail & Header Alignment

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bilateral/result-rail-alignment` |
| Feature Slug | `bilateral-result-rail-alignment` |
| Short Code | `BRRA` |
| Type | `Change` |
| Approval Mode | `gated` |
| Date | 2026-09-15 |
| Owner / Driver | Bilateral Reporting & UX Design |
| Status | `proposed` |

---

## 2. Intent

Align the Bilateral Result Editor layout (`/bilateral/:center/result/:id`) with the canonical W1/W2 Result Detail layout (`/result/result-detail/:code/:section`), ensuring visual, structural, and behavioral consistency across all PRMS result editing experiences.

---

## 3. Problem / Current Behavior

Currently, when a user opens a Bilateral result in the editor view:
1. **Missing Persistent Back Link in Rail:** The navigation link (`< Back to Center overview`) is positioned inside the main content header (`app-bilateral-page-header`) and scrolls out of view as the user navigates the form, unlike W1/W2 where `< Back to results` is permanently pinned at the top of the sections rail.
2. **Missing Result Identity Block in Rail:** The sections rail (`bcr-rail`) immediately starts with the `SECTIONS` label. It lacks the identity header present in W1/W2 containing:
   - `Result code #<id>` with hover-reveal copy button (`app-copy-button`).
   - Uppercase bold result type name (e.g. `CAPACITY SHARING FOR DEVELOPMENT`, `INNOVATION DEVELOPMENT`).
   - Standardized status pill badge (e.g. `[ EDITING ]`, `[ PENDING REVIEW ]`, `[ APPROVED ]`, `[ REJECTED ]`).
3. **Redundant Header Identity Strip:** Because the result code, type, and status were absent from the rail, they were crowded into an inline identity strip in the main header (`9368 | Capacity sharing for development | W3/Bilateral | Editing`). In W1/W2, the main header identity strip only holds the secondary context (Level, Funding, Submitter, Area of Work) because the primary identity is anchored in the rail.
4. **Visual Discrepancy:** The visual hierarchy between W1/W2 and Bilateral results diverges, creating an inconsistent user experience for researchers and center leads reporting across both funding windows.

---

## 4. Proposed Outcome

1. **Persistent Back Link at Top of Rail:** Pinned at the top of the 240px sidebar rail with chevron icon, hover states, and bottom border divider, linking back to the center overview / results list.
2. **Result Identity Block in Rail:** Positioned below the back link with:
   - `Result code #<code>` with interactive `app-copy-button`.
   - Result type name in uppercase bold typography (`text-[12px] font-semibold uppercase leading-[1.35] tracking-[0.02em] text-[var(--pr-text)]`).
   - Standardized status pill badge with token-based colors matching result status (`bg`, `text`, `border-color`).
3. **Cleaned Header Identity Strip:** Remove duplicated code, type, and status from the main scrolling header; maintain Level, Funding (`W3/Bilateral`), Center / Submitter, Area of Work, and AI provenance indicators in the inline header strip.
4. **Header Action Alignment:** Standardize header layout to include copy button on title, clean spacing, and alignment with W1/W2 header patterns.

---

## 5. Scope

### In Scope
- **Client Side (`onecgiar-pr-client`):**
  - `bilateral-result-creator.component.html`: Update `.bcr-rail` to include:
    - Back link anchor with divider.
    - Identity block (`resultCode` with copy button, uppercase `resultTypeName`, status pill badge with dynamic tokens).
    - Refined section row geometry and check states.
  - `bilateral-result-creator.component.ts`: Expose necessary signals (`backLink`, `backLabel`, `resultCode`, `resultTypeName`, `statusLabel`, `statusFg`, `statusBg`).
  - `bilateral-page-header.component.html` & `ts`: Update `variant="detail"` mode to remove the redundant in-flow back button and strip out code/type/status from the header metadata strip when anchored in the rail.
  - Unit tests covering rail identity rendering, back navigation, copy button presence, and header strip refactoring.

### Non-Goals
- Altering the creation wizard mode (`isCreating() = true`).
- Changing backend endpoints or data contracts.
- Coupling `pages/bilateral/` to `pages/results/` services (`ResultSectionsService` or `DataControlService.green_checks`), which would violate module boundaries.

---

## 6. Affected Users, Systems, And Specs

- **Users:** CGIAR Center researchers, submitters, and QA reviewers working with W3/Bilateral results.
- **Affected Components:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/`
  - `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/`
- **Related Specs:**
  - `docs/specs/archive/2026-09-08-changes--sp-bilateral-review-tab/`
  - `docs/specs/archive/2026-09-14-bilateral--center-overview-tab/`
  - `docs/specs/archive/2026-09-14-bilateral--shell-sp-alignment/`

---

## 7. Visual Reference

- **Source:** User provided screenshots comparing current bilateral view to canonical W1/W2 result detail.
- **Artifacts:**
  - `Image 1` (Bilateral Current): `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789513102253-8baf9495-fe5f-49f3-a706-9f450f8357a6.png` — Shows missing back link and identity block in rail; code/type/status crowded in header.
  - `Image 2` (W1/W2 Canonical Full): `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789513159690-04a74c07-7f98-4866-be5b-594d332e3767.png` — Canonical two-column layout reference.
  - `Image 3` (W1/W2 Rail Identity Crop): `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789513169011-25e68742-a25e-4302-9c86-4df4941c0d9c.png` — Zoomed crop showing `< Back to results`, divider, `Result code #9363` with copy button, `INNOVATION DEVELOPMENT` uppercase bold, and `[ EDITING ]` pill badge.
  - `Image 4` (W1/W2 Header Crop): `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1789513195186-3f0db4a0-0664-4932-9f72-0e60733ef9a7.png` — Zoomed crop showing title with (i) popover, `Output | W1/W2 | Submitter ... | Area of Work ...` identity strip, and phase switcher.

---

## 8. Requirement Delta Preview

### ADDED Requirements
- `BRRA-R-1`: Pinned back navigation anchor at the top of the bilateral editor rail with chevron icon, linking to `/bilateral/:center/home` (or referring list).
- `BRRA-R-2`: Result identity card in the bilateral editor rail displaying `Result code #<code>` with `app-copy-button`, uppercase result type, and styled status pill badge.

### MODIFIED Requirements
- `BRRA-R-3`: In `app-bilateral-page-header` (`variant="detail"`), remove the redundant in-flow back button and avoid duplicating code, type, and status in the header identity strip when they are pinned in the rail.
- `BRRA-R-4`: Update rail styling (`bcr-rail`) to match W1/W2 spacing, padding, borders (`var(--pr-border)`), and typography tokens.

### REMOVED Requirements
- `BRRA-R-5`: Deprecate the in-flow header back button in detail mode.

---

## 9. Approach Options

### Option 1: Direct Component Reuse (`app-result-sections-sidebar`)
- Attempt to reuse `ResultSectionsSidebarComponent` directly in `BilateralResultCreatorComponent`.
- **Pros:** Reuses exact existing component.
- **Cons:** Violates architectural boundary documented in `CLAUDE.md`. `ResultSectionsSidebarComponent` strongly depends on `ResultSectionsService`, `FieldsManagerService` (P22/P25 portfolios), `GreenChecksService`, and `resultDetailRouting` from `pages/results/`. Bilateral results do not follow W1/W2 green checks or routing, leading to high risk of cross-module coupling and regression.

### Option 2: Align Bilateral Rail & Header with Canonical Design Tokens & Geometry (Recommended)
- Enhance `BilateralResultCreatorComponent` rail (`bcr-rail`) and `BilateralPageHeaderComponent` using identical design tokens, component primitives (`app-copy-button`), and structural layout as W1/W2.
- **Pros:** 
  - Delivers 100% pixel-perfect visual and behavioral parity.
  - Maintains strict module independence between `pages/bilateral/` and `pages/results/`.
  - Zero regression risk for W1/W2 results.
  - Directly fulfills user requirements without technical debt.
- **Cons:** Requires small amount of templating in `bilateral-result-creator` (~40 lines HTML/SCSS).

---

## 10. Recommended Approach

Adopt **Option 2**. It achieves the exact visual parity requested by the user, mirrors the canonical W1/W2 UX/UI design blueprint, and respects the monorepo's architectural boundaries.

---

## 11. Risks, Dependencies, And Open Questions

- **Risk 1:** Ensuring back navigation correctly handles both navigation from the center home and direct deep-links.
  - *Mitigation:* Use `SmartNavigationService` or fallback to `/bilateral/:acronym/home`.
- **Risk 2:** Status badge token consistency across the 7 bilateral result statuses (`Editing`, `Pending Review`, `Approved`, `Rejected`, etc.).
  - *Mitigation:* Map status tokens via existing `--pr-status-*` semantic variables in `colors.scss`.

---

## 12. Success Criteria

1. Top of sidebar rail in Bilateral result editor displays `< Back to Center overview` with a divider.
2. Under the divider, the rail renders `Result code #<id>` with copy button, uppercase result type, and status pill badge matching Image 3.
3. The main content header removes the duplicate back button and streamlines the identity strip to Level, Funding, Center/Submitter, Area of Work, and AI provenance matching Image 4.
4. All client unit tests and Angular builds pass cleanly with 0 errors.

---

## 13. Next Step

```text
/akili-specify bilateral/result-rail-alignment
```
