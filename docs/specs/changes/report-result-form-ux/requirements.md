# Module Spec — Requirements: Report Result Form UX & Standardized Form Patterns

## Document Control

- **Spec Path:** `docs/specs/changes/report-result-form-ux/requirements.md`
- **Module:** `results` / `dashboard-lab` (Reporting Entry Drawer & Forms)
- **Sub-feature:** `report-result-form-ux`
- **Owner:** Results & UX/UI Core Team
- **Status:** `in-review`
- **Type:** Change
- **Approval Mode:** gated
- **Proposal Ref:** `docs/specs/changes/report-result-form-ux/proposal.md`
- **Constitutional Cross-References:**
  - PRD: `docs/prd.md` (§3 Personas, G1, US-S1, AC-1, AC-2)
  - UX/UI Design: `docs/ux-ui/design.md` (§6 Layout patterns: Drawers & modals, §7 Design tokens, §8 Component patterns)
  - TRD: `docs/trd/trd.md` (§4 Result lifecycle, W1 reporting flow)

---

## 1. Executive Summary

This specification defines the functional, UX/UI, and accessibility requirements for redesigning the **"Report result"** drawer (`indicator-drawer` & `lab-report-form`) in the Results Framework Reporting module, while formalizing a reusable **Form UX Pattern** for all PRMS reporting interfaces.

Key enhancements include:
1. **Verbatim context presentation with elevated visual hierarchy**: Preserves user-authored indicator descriptions exactly as entered while upgrading the surrounding metadata cards (2026 Target, Center badge, Unit).
2. **Cognitive chunking**: Structuring the currently flat 6-field form into 3 logical visual cards (*Result Identity*, *Target Contribution*, and *Collaboration & Attribution*).
3. **Auto-expanding title textarea with a dynamic word-gauge badge** (0–30 words) preventing horizontal clipping.
4. **Contextual contribution input** with unit adornment, clean placeholder, and inline remaining target reference.
5. **Interactive readiness action**: Clicking the footer's missing fields status (`• N fields left before you can create`) focuses and scrolls to the first invalid required field.
6. **Persistent inline micro-guidance**, replacing hidden hover tooltips with accessible sub-labels.

---

## 2. Glossary

| Term | Definition |
|---|---|
| **Indicator Drawer** | The slide-over right rail (`indicator-drawer.component.ts`) opened when clicking on an indicator card in Reporting or Overview. |
| **Lab Report Form** | The form component (`lab-report-form.component.ts`) hosted inside the indicator drawer used to create the initial result shell. |
| **Cognitive Chunking** | Dividing complex input forms into discrete, bite-sized visual cards to reduce cognitive load and form fatigue (Miller's Law). |
| **Word Gauge** | Real-time visual counter showing words entered versus maximum allowed (30 words), with progressive warning states. |
| **Readiness Indicator** | Status indicator in the sticky footer showing how many required fields remain before the result shell can be submitted. |

---

## 3. System Context & Scope

```mermaid
flowchart TD
  subgraph Dashboard [Reporting View / Overview]
    A[Indicator Card Clicked] --> B[Indicator Drawer Opens]
  end

  subgraph Drawer [indicator-drawer.component]
    B --> C[Verbatim Context Card\n(Target, Unit, Center)]
    B --> D[Existing Results / Empty State Card]
    B --> E[lab-report-form.component]
  end

  subgraph Form [lab-report-form.component]
    E --> F1[Section 1: Result Identity\nCategory + Multi-line Title]
    E --> F2[Section 2: Target Contribution\nAdornment + Remaining Target]
    E --> F3[Section 3: Collaborators & Funding\nCenters, Programs, Bilateral]
    E --> G[Sticky Footer with Interactive Readiness]
  end
```

### In Scope
- Visual restructuring of `indicator-drawer` and `lab-report-form` into 3 distinct sections.
- Preserving indicator description strings verbatim (no stripping of `.---` or punctuation).
- Auto-expanding `textarea` for Result Title with a dynamic word-count pill indicator.
- Number input enhancement for Contribution (placeholder, unit suffix, target context comparison).
- Accessible inline helper text replacing hover `<span title="...">info</span>` tooltips.
- Interactive footer readiness badge (`missingFields` action that scrolls to and focuses the first invalid field).
- Non-disruptive chip management for contributing institutions (Lead Center distinct from contributing centers).
- Specification of the **PRMS Form UX Pattern** for documentation in `docs/ux-ui/design.md`.

### Out of Scope
- Altering the backend result creation API (`POST /api/results/create`).
- Modifying CGSpace Knowledge Product metadata fetch logic or validation endpoints.
- Altering role/permission rules (`canReport` permissions).
- Result detail sections outside the creation drawer.

---

## 4. Personas Affected

| Persona | Problem Today | Experience After Spec |
|---|---|---|
| **Result Submitter** | Squeezed single-line title input, confusing contribution 0 default, flat unchunked form, inert missing-fields footer text. | Clear 3-step visual sections, readable multi-line title, clear target context, 1-click focus on missing fields. |
| **QA Reviewer** | Results submitted with truncated or poorly formatted titles and incorrect numerical contributions. | Higher title quality and accurate contributions due to clear inline rules and target visibility. |
| **PMU Lead** | Inconsistent form patterns across different modules in the platform. | Predictable, accessible form standards across all reporting surfaces. |

---

## 5. User Stories

- **`RFUX-US-1` (Chunked Form):** As a Result Submitter, I want the reporting form to be organized into clear logical cards, so that I can focus on one group of related information at a time without feeling overwhelmed.
- **`RFUX-US-2` (Multi-line Title):** As a Submitter, I want to view and edit my entire result title across multiple lines with an active word counter, so that I can craft an accurate scientific title within the 30-word limit.
- **`RFUX-US-3` (Target Context):** As a Submitter, I want to see the indicator's measurement unit and remaining target right next to the contribution field, so that I do not have to memorize or scroll to verify what I am contributing to.
- **`RFUX-US-4` (Interactive Validation):** As a Submitter, I want to click on the "N fields left" indicator in the footer, so that the form immediately navigates to and focuses the first field I still need to complete.
- **`RFUX-US-5` (Verbatim Indicator Text):** As a Scientist, I want to see the indicator description exactly as documented by my team, so that no critical notes or delimiters are lost or altered.

---

## 6. Defect Classes & Verification Mapping

| Defect Class | Risk Description | Automated Gate | Human / Fallback Check |
|---|---|---|---|
| **Layout Shift / Content Jump** | Adding multiple centers/programs causes the form to jump erratically. | Jest unit tests verify DOM structure stability. | Visual review of chip container overflow. |
| **Word Count Truncation / Overrun** | Submitter enters > 30 words and title is clipped or errors on server. | Jest test on word counter signal & validator. | Manual typing test up to 32 words. |
| **Data Loss / Unintended 0 Contribution** | Submitter leaves default 0 and creates empty contribution. | Jest test asserting empty/null initial contribution. | Form submission verification. |
| **Inaccessible Tooltips** | Screen reader or touch users cannot read calculation instructions. | Jest axe / accessibility checks for label `aria-describedby`. | Keyboard tab and screen reader inspection. |
| **Text Sanitization Regression** | Indicator text gets inadvertently sanitized or modified. | Regression unit test asserting description matches raw mock exactly. | Visual verification of indicator title. |

---

## 7. Functional Requirements

### Required (MUST)

#### `RFUX-R-1` Verbatim Context Display
The system MUST display the indicator description text exactly as provided by the upstream data source, preserving all punctuation, delimiters, and characters without sanitization.

##### Scenario: Indicator Description Preserved Verbatim
- **GIVEN** an indicator with description containing `.--- IRRI - (GloMIP) ------ Multi-Crop --..-------- KEY ACTIVITIES...`
- **WHEN** the "Report result" drawer opens
- **THEN** the context card displays that exact string without stripping or altering dashes, dots, or whitespace
- **AND** the metadata tags (`2026 Target`, `Center`, `Unit`) render with high-contrast pill styling (`--pr-color-primary-300`, `--pr-color-secondary-400`).

---

#### `RFUX-R-2` Cognitive Card Chunking
The form MUST organize its fields into three distinct, visually separated cards:
1. **Card 1: Result Identity** (`Category`, `Result Title`).
2. **Card 2: Target Contribution** (`Contribution to indicator target`, Unit adornment, and Target reference).
3. **Card 3: Collaboration & Attribution** (`Contributing CGIAR Centers`, `Contributing Science Programs`, `Contributing W3 and bilateral projects`).

##### Scenario: Form Sections Rendered in Order
- **GIVEN** the report drawer is open
- **WHEN** the form renders
- **THEN** each of the three cards is clearly demarcated with subtle border (`border-[var(--pr-border)]`), clean card background (`bg-[var(--pr-surface-card)]`), and semantic section subheadings (`h4`)
- **BUT** it must NOT split the form into separate paging steps or multi-page wizards (must remain a single continuous scannable scroll).

---

#### `RFUX-R-3` Multi-line Title with Word Counter
The Result Title control MUST use an auto-resizing multi-line input (`textarea`) supporting 1 to 4 rows, displaying an active word-counter pill indicating current words out of 30.

##### Scenario: Real-time Word Counter and Warning Ramps
- **GIVEN** the Result Title textarea is focused
- **WHEN** the user types 10 words
- **THEN** the badge displays `10 / 30 words` in neutral muted style
- **WHEN** the user reaches 25 to 29 words
- **THEN** the badge shifts to an amber warning tone (`text-amber-600 bg-amber-50`)
- **WHEN** the user reaches 30 words
- **THEN** the badge displays `30 / 30 max words` in purple/brand accent tone, and typing further words is prevented or flagged invalid.

---

#### `RFUX-R-4` Contextual Contribution Input
The contribution input MUST display a clear numeric placeholder (not defaulting to 0), an inline suffix adornment with the indicator's measurement unit (if defined), and a contextual reference showing the indicator's overall 2026 target and achieved progress.

##### Scenario: Contribution Field Display
- **GIVEN** an indicator with `target_value_sum = 15` and `unit_messurament = "varieties"`
- **WHEN** the report form renders
- **THEN** the input displays placeholder `e.g. 5` and a suffix badge `varieties`
- **AND** directly beneath the input, helper text displays: `2026 Target: 15 · Achieved so far: 0`
- **AND** the field value is empty (`null`/`undefined`), not pre-populated with `0`.

---

#### `RFUX-R-5` Accessible Inline Helper Copy
The system MUST replace hidden hover tooltips (`<span title="...">info</span>`) with persistent, accessible helper text positioned directly beneath the field labels.

##### Scenario: Inline Helper Text Visibility
- **GIVEN** the Title and Contribution fields render
- **WHEN** a user views the form without mouse hover
- **THEN** the title helper (`"Provide a clear, concise title describing the output or outcome"`) is visible inline in `text-[12px] text-gray-500`
- **AND** the contribution helper (`"Enter the numerical amount this specific result contributes toward the target"`) is visible inline
- **AND** the elements are linked to the input via `aria-describedby`.

---

#### `RFUX-R-6` Interactive Readiness Action
The sticky footer's missing fields status MUST be an interactive button. Clicking it MUST identify the first invalid required field, smoothly scroll it into view, and set DOM focus on its input element.

##### Scenario: Clicking Missing Fields Indicator
- **GIVEN** the form has 3 required fields missing (`Category`, `Title`, `Contribution`)
- **WHEN** the user clicks `• 3 fields left before you can create`
- **THEN** the viewport smoothly scrolls to the `Category` select (the first missing required field)
- **AND** sets focus to that input control
- **AND** when only `Title` is missing, clicking focuses the `Title` input directly.

---

#### `RFUX-R-7` Lead Center Protection & Tokenized Multiselect
The Contributing Centers field MUST clearly distinguish the submitting/lead Center from additional contributing centers. The lead Center chip MUST NOT have a dismiss button (`x`), preventing users from accidentally unlinking their own lead institution.

##### Scenario: Submitting Center Chip Locked
- **GIVEN** the user is reporting for `SP01` with lead center `IRRI`
- **WHEN** the Centers section renders
- **THEN** `IRRI` is displayed with a badge indicating `Lead Center` and has no `(x)` remove button
- **AND** any additional centers added by the user display with standard dismissible `(x)` chips.

---

#### `RFUX-R-8` Empty State Micro-Card
When an indicator has zero previously reported results, the system MUST render a structured micro-card rather than a floating unstyled text line.

##### Scenario: Zero Reported Results
- **GIVEN** an indicator with no results reported yet
- **WHEN** the drawer opens
- **THEN** it renders a compact, subtle card with an icon (`sparkles` or `flag`), stating:  
  *"No results reported against this indicator yet. Your report will be the first recorded toward the 2026 target."*
- **AND** it seamlessly transitions into the form below.

---

## 8. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Accessibility (WCAG 2.1 AA)** | All text labels and badges MUST maintain at least 4.5:1 contrast ratio against their card background (`docs/ux-ui/design.md` §10). Visible focus rings (`focus-visible:ring-2 focus-visible:ring-violet-500`) on all inputs. |
| **Keyboard Navigation** | Logical Tab order: Drawer Close $\rightarrow$ Context expand $\rightarrow$ Category $\rightarrow$ Title $\rightarrow$ Contribution $\rightarrow$ Centers $\rightarrow$ Programs $\rightarrow$ Projects $\rightarrow$ Missing fields button $\rightarrow$ Cancel $\rightarrow$ Submit. Escape key requests drawer close. |
| **Layout Stability (CLS)** | Cumulative Layout Shift MUST be 0 during chip additions by using fixed flex-wrap containers with minimum height reservations. |
| **Responsiveness** | Drawer maintains fluid layout between `380px` and `720px` width; form cards stack seamlessly on narrow screens without horizontal overflow. |
| **Design Tokens** | Styling MUST use official brand tokens (`--pr-color-primary-300`, `--pr-color-primary-400`, `--pr-color-secondary-400`) and Tailwind-first classes. No bespoke raw hex colors. |

---

## 9. Acceptance Criteria (Traceability Matrix)

| ID | Given | When | Then |
|---|---|---|---|
| `RFUX-AC-1` | Indicator description with raw delimiters `.---` | Drawer renders | Text is displayed verbatim with no character stripping. |
| `RFUX-AC-2` | Form loaded with default state | User examines DOM | 3 distinct card sections are rendered with subheadings. |
| `RFUX-AC-3` | Title textarea empty | User enters 28 words | Textarea auto-expands to fit text; counter shows `28 / 30 words` with amber warning style. |
| `RFUX-AC-4` | Title textarea at 30 words | User attempts 31st word | Input prevents excess words or marks form invalid with clear boundary alert. |
| `RFUX-AC-5` | Indicator with target 15 and unit "varieties" | Contribution renders | Shows suffix `varieties`, placeholder `e.g. 5`, helper `2026 Target: 15 · Achieved so far: 0`, and input is empty. |
| `RFUX-AC-6` | Required fields missing | User clicks `• N fields left` in footer | The first incomplete required input is scrolled into view and focused. |
| `RFUX-AC-7` | Indicator with lead center `IRRI` | Centers list renders | `IRRI` chip is displayed with `Lead` badge and cannot be deleted. |
| `RFUX-AC-8` | All required fields filled correctly | User inspects footer | Footer displays `✓ Ready to create` with green indicator, and primary button becomes active with brand gradient. |

---

## 10. Dependencies & Assumptions

### Dependencies
- `indicator-drawer.component.ts` & `lab-report-form.component.ts`.
- `app-pr-input`, `app-pr-select`, `app-pr-multi-select` (or native semantic equivalents with Tailwind styling).
- `DataControlService` and `EntityAowService` for indicator and target metadata.

### Assumptions
- The indicator object contains `indicator_description`, `target_value_sum`, `unit_messurament`, and `center_acronym`.
- Upstream indicator text format is intentional and owned by the content authors.

---

## 11. Open Questions (Resolved)

1. **`RFUX-OQ-1`:** Should indicator text with `.---` sequences be cleaned?
   - **Resolution:** **NO.** Per explicit user feedback (2026-09-05), the text must remain verbatim as documented by users.
2. **`RFUX-OQ-2`:** Should the form be split into multiple wizard steps?
   - **Resolution:** **NO.** A single-scroll drawer with 3 clear visual cards provides the fastest and most transparent workflow without unnecessary click overhead.
