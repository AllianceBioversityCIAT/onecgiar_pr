# Module Spec — Bilateral Result Editor Rail & Header Alignment (`requirements.md`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bilateral/result-rail-alignment` |
| Feature | Bilateral Result Editor Rail & Header Alignment |
| Short Code | `BRRA` |
| Type | `Change` |
| Approval Mode | `gated` |
| Date | 2026-09-15 |
| Owner | Bilateral Reporting & UX Design |
| Status | `approved` |

---

## 2. Context

In PRMS, researchers, center focal points, and QA reviewers navigate between W1/W2 results (`/result/result-detail/:code/:section`) and W3/Bilateral results (`/bilateral/:center/result/:id`). 

Currently, the bilateral result editor (`BilateralResultCreatorComponent` in editor mode `!isCreating()`) displays a structural divergence from the canonical W1/W2 layout:
- The navigation anchor (`< Back to Center overview`) was placed inside the main content header (`app-bilateral-page-header`), causing it to scroll out of view when scrolling the form.
- The 240px sidebar rail (`bcr-rail`) immediately starts with `SECTIONS`, missing the persistent top back anchor and the result identity header (Result code with copy button, uppercase result type name, and colored status pill badge).
- Consequently, the main content header was burdened with an inline identity strip repeating the result code, type, and status, crowding the title and metadata.

This specification aligns the bilateral result editor's left rail and header with the canonical W1/W2 design patterns documented in `docs/ux-ui/design.md` and user screenshots, while maintaining strict architectural isolation between the `bilateral` and `results` modules.

---

## 3. In Scope / Out of Scope

### In Scope
- **Persistent Rail Back Anchor:** Add `< Back to Center overview` (or referring list) with chevron icon and bottom divider at the top of `.bcr-rail`.
- **Rail Result Identity Card:** Render pinned result identity under the back link:
  - `Result code #<code>` with interactive `app-copy-button` visible on line hover.
  - Uppercase bold result type name (e.g. `CAPACITY SHARING FOR DEVELOPMENT`, `INNOVATION DEVELOPMENT`).
  - Standardized status pill badge (`[ EDITING ]`, `[ PENDING REVIEW ]`, `[ APPROVED ]`, `[ REJECTED ]`) with token-based foreground, background, and border styling.
  - Bottom divider separating identity from `SECTIONS` list.
- **Streamlined Main Content Header:** 
  - Remove redundant in-flow back button in `variant="detail"`.
  - Streamline the header identity strip: remove redundant code, type, and status; retain Level, Funding (`W3/Bilateral`), Submitter/Center, Area of Work, and AI provenance badge.
- **Visual Token Alignment:** Use exact PRMS tokens (`var(--pr-border)`, `var(--pr-text)`, `var(--pr-text-muted)`, `--pr-status-*`).

### Out of Scope
- Modifying the creation wizard flow (`isCreating() = true`).
- Changing backend database schemas, entities, or API payloads.
- Reusing or coupling with `ResultSectionsService` or W1/W2 green checks from `pages/results/`.

---

## 4. Personas Affected

| Persona | Impact |
|---|---|
| **Result Submitter** | Can navigate back to the center overview from anywhere without scrolling up; gets a persistent view of the result code, type, and status. |
| **QA Reviewer / Center Lead** | Experiences 100% visual consistency between W1/W2 and Bilateral result editors. |

---

## 5. User Stories

- **`BRRA-US-1` (Persistent Navigation & Identity):** As a researcher editing a bilateral result, I want the result code, type, status, and back navigation permanently pinned in the sidebar rail, so that I maintain clear context and quick navigation regardless of form scroll position.
- **`BRRA-US-2` (Header Cleanliness):** As a researcher, I want the header to focus on the result title, level, and funding metadata without repeating identity already anchored in the rail, so that the page heading is uncluttered and clean.

---

## 6. Functional Requirements

### `BRRA-R-1` — Persistent Rail Back Link (MUST)
The sidebar rail (`.bcr-rail`) in editor mode MUST render a persistent back navigation anchor at the very top, separated by a bottom border divider (`border-b border-[var(--pr-border)]`).

#### Scenario: Navigating back to Center Overview
- **GIVEN** a user is viewing/editing a bilateral result at `/bilateral/:center/result/:id`
- **WHEN** the sidebar rail is rendered
- **THEN** the top item is an anchor displaying a `chevron_left` icon and "Back to Center overview" (or referring title)
- **AND** clicking it navigates back to `/bilateral/:center/home` (preserving the active phase)
- **AND** it remains visible at the top regardless of form scrolling.

---

### `BRRA-R-2` — Rail Result Identity Block (MUST)
Underneath the back link divider, the sidebar rail MUST render a result identity card containing:
1. `Result code #<code>` with an `app-copy-button` that triggers clipboard copy.
2. Result type name in uppercase bold typography (`text-[12px] font-semibold uppercase tracking-[0.02em] text-[var(--pr-text)]`).
3. Status pill badge formatted with uppercase label and styled with appropriate status token colors.
4. A bottom border divider separating the block from the `SECTIONS` eyebrow label.

#### Scenario: Displaying result identity
- **GIVEN** a bilateral result with code `9368`, type `Capacity sharing for development`, and status `Editing` (status_id = 1)
- **WHEN** the rail is rendered in editor mode
- **THEN** it displays `Result code #9368` with an interactive copy button
- **AND** it displays `CAPACITY SHARING FOR DEVELOPMENT` in uppercase
- **AND** it displays an `[ EDITING ]` pill badge with appropriate neutral/in-progress tokens
- **BUT** if result data is still loading, it MUST render skeleton placeholders to prevent layout shift.

---

### `BRRA-R-3` — Header Back Button Deprecation in Detail Mode (MUST)
In `app-bilateral-page-header` with `variant="detail"`, the in-flow back button (`bilateral-header-back-btn`) MUST be removed, as navigation is now anchored in the rail.

#### Scenario: Detail header rendering
- **GIVEN** `app-bilateral-page-header` is instantiated with `variant="detail"`
- **WHEN** the header renders above the form
- **THEN** no back button is rendered in the header flow
- **AND** the header starts directly with the title block.

---

### `BRRA-R-4` — Streamlined Header Identity Strip (MUST)
The inline identity strip in `app-bilateral-page-header` (`variant="detail"`) MUST NOT duplicate the result code, result type name, or status pill badge. It MUST render only secondary contextual metadata:
- Result level (e.g. `Output` or `Outcome`), if available.
- Funding type tag: `W3/Bilateral`.
- Submitter / Center name (e.g. `AfricaRice`), if available.
- Area of Work / Project tag, if available.
- AI Provenance Badge, if `showAiProvenanceBadge()` is true.

#### Scenario: Secondary metadata in header
- **GIVEN** an active bilateral result with level `Output` and center `AfricaRice`
- **WHEN** the detail header renders
- **THEN** the metadata strip displays `Output | W3/Bilateral | AfricaRice`
- **AND** does NOT display `9368`, `Capacity sharing for development`, or `Editing` inline.

---

### `BRRA-R-5` — Status Pill Badge Color Mapping (MUST)
The status pill badge in the rail MUST map status IDs to tokens according to PRMS design conventions:
- Status 1 (`Editing`): `fg: var(--pr-status-in-progress-fg)`, `bg: var(--pr-status-in-progress-bg)`, `border: var(--pr-status-in-progress-fg)` (or `#6B7280` / `#F3F4F6` neutral).
- Status 5 (`Pending review`): `fg: #B45309`, `bg: #FEF3C7`, `border: #B45309` (amber warning tokens).
- Status 6 (`Approved`): `fg: var(--pr-status-approved-fg)`, `bg: var(--pr-status-approved-bg)`, `border: var(--pr-status-approved-fg)`.
- Status 7 (`Rejected`): `fg: var(--pr-status-rejected-fg)`, `bg: var(--pr-status-rejected-bg)`, `border: var(--pr-status-rejected-fg)`.

---

## 7. Non-Functional Requirements

- **NFR-1 (A11y & Semantics):** The back link MUST have an accessible name and hover/focus-visible rings (`focus-visible:ring-2 focus-visible:ring-[var(--pr-color-primary-300)]`). The copy button MUST have an `aria-label="Copy result code"`.
- **NFR-2 (No Layout Shift):** Rail identity block MUST preserve fixed vertical space or use skeleton loaders during asynchronous result fetching.
- **NFR-3 (Strict Module Isolation):** No import or dependency from `src/app/pages/results/` may be added to `src/app/pages/bilateral/`.

---

## 8. Defect Gates

| Gate ID | Defect Class | Verification Method & Command |
|---|---|---|
| **D1** | Missing / displaced back navigation | Unit test in `bilateral-result-creator.component.spec.ts` asserting back anchor in rail with correct href. |
| **D2** | Missing identity elements in rail | Unit test asserting `result-sections-code`, `app-copy-button`, `result-sections-type`, and `result-sections-status` in DOM. |
| **D3** | Status pill styling regression | Unit test verifying status classes/styles for Editing (1), Pending Review (5), Approved (6), and Rejected (7). |
| **D4** | Duplicate identity in header | Unit test in `bilateral-page-header.component.spec.ts` asserting detail header omits code and status badge. |
| **D5** | TypeScript / Template type errors | `npx ng build --configuration=development --no-progress` (exit code 0). |
| **D6** | Visual styling fidelity | Verification using design tokens (`var(--pr-border)`, `var(--pr-text)`, etc.) and Jest assertions. |

---

## 9. Requirement ID Index

| ID | Name | Priority | Covered by Defect Gate |
|---|---|:---:|:---:|
| `BRRA-R-1` | Persistent Rail Back Link | MUST | `D1` |
| `BRRA-R-2` | Rail Result Identity Block | MUST | `D2` |
| `BRRA-R-3` | Header Back Button Deprecation | MUST | `D4` |
| `BRRA-R-4` | Streamlined Header Identity Strip | MUST | `D4` |
| `BRRA-R-5` | Status Pill Badge Color Mapping | MUST | `D3` |
| `BRRA-AC-1` | Copy button functional on result code | MUST | `D2` |
| `BRRA-AC-2` | Uppercase typography for result type | MUST | `D2` |
| `BRRA-AC-3` | Zero TypeScript/template compile errors | MUST | `D5` |
