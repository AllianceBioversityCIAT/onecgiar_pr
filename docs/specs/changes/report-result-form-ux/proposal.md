# Proposal: Report Result Form UX & Standardized Form Patterns

## Document Control

- **Spec Path:** `docs/specs/changes/report-result-form-ux`
- **Type:** Change
- **Approval Mode:** gated
- **Slug:** `report-result-form-ux` — derived from free-text argument (`puedes mejorar el diseño de esta pantalla en terminos de UX/UI...`)
- **Author:** Antigravity (AI Assistant) & Juan Carlos Cadavid
- **Date:** 2026-09-05
- **Baseline Alignment:** `docs/prd.md`, `docs/ux-ui/design.md`, `ui-ux-pro-max` design intelligence

---

## 1. Intent

Elevate the user experience and visual craft of the **"Report result"** drawer (`indicator-drawer` / `lab-report-form`) and establish a reusable, high-craft **Form UX Pattern** for PRMS reporting workflows. The goal is to make reporting fast, intuitive, error-resilient, and cognitively light for researchers and project submitters who spend significant time filling out complex multi-attribute forms.

---

## 2. Problem / Current Behavior

PRMS is fundamentally a reporting platform centered on structured forms. Inspection of the live "Report result" drawer (`indicator-drawer.component.html` and `lab-report-form.component.html`) and user screenshots reveals several UX/UI friction points:

1. **Preserve Indicator Description Verbatim (Per User Decision)**:
   - The indicator description header displays raw text as formatted by users upstream (including sequences like `.---`, `------`, `--..--------`). Per explicit user confirmation (2026-09-05), this text MUST NOT be modified or stripped, as users intentionally documented it that way.
   - However, presentation around the text (typography scale, badge contrast for `2026 Target: 15` and `Center: IRRI`, and the container layout) will be elevated.

2. **Lack of Cognitive Chunking (Gestalt / Form Fatigue)**:
   - The form presents 6 flat, stacked inputs in an unsegmented vertical list with identical visual weight.
   - Users face immediate form fatigue because there is no logical grouping between:
     - **Result Identity** (Category, Title, Guidance),
     - **Target Contribution** (Numerical progress, Unit of measurement, Target reference), and
     - **Collaboration & Co-authorship** (CGIAR Centers, Science Programs, Bilateral projects).

3. **Input Usability & Micro-interactions**:
   - **Result Title Field**: Uses a single-line `<input>`, which truncates and scrolls horizontally when users type typical 20–30 word scientific titles. The `Max 30 words: 0 / 30` indicator is a static text string with no interactive feedback or warning threshold.
   - **Contribution Target**: Defaults to numerical `0`, forcing users to backspace or select-all before entering their actual number. Furthermore, the field does not display the target unit (e.g. "varieties", "people") or remaining progress alongside the input.
   - **Hidden Guidance in Hover Tooltips**: Crucial business rules (e.g. how to measure contribution, title guidance) are hidden behind small `info` icons using browser-native `title=""` attributes, which are inaccessible on touch interfaces and require manual hovering on desktop.
   - **Multi-select Chip Layout**: Contributing Centers and Programs render dismissible chips *beneath* the input controls, creating unpredictable content jumping (layout shifts) as multiple institutions are added.

4. **Inert Readiness Indicator**:
   - The sticky footer shows `• 3 fields left before you can create` with a dotted underline.
   - The dotted underline visually affords interactivity (like a link or popover), but clicking it does nothing, leaving users to scan the form manually to find what is missing.
   - The disabled submit button (`#b3a4e8` on `#e7e1fb`) lacks sufficient contrast and fails to explain *why* it remains disabled.

---

## 3. Proposed Outcome

Transform the "Report result" workflow into a polished, accessible, and frictionless reporting experience:

1. **Structured Context Hero Card**:
   - Clean, sanitized indicator presentation (stripping `.---`, `------` noise).
   - Clear badge taxonomy: Program code (`SP01`), Area of Work tag, 2026 Target with visual progress ratio, and Center attribution.
   - Refined expand/collapse that preserves key target numbers in the sticky context even when collapsed.

2. **Logical 3-Section Form Architecture (Cognitive Chunking)**:
   - **Section 1: Result Overview** — Clean Category selection and auto-expanding multi-line Title with real-time word counter progress pill (green/purple -> amber -> red warning).
   - **Section 2: Target Contribution** — Clean number input with inline unit of measurement adornment, empty placeholder instead of zero, and contextual target helper (`Target: 15 · Achieved so far: 0`).
   - **Section 3: Contributors & Funding** — Integrated tokenized multi-select with distinct badges for "Lead Center" (locked/protected) and "Contributing Centers/Programs/Bilateral projects".

3. **Persistent Inline Guidance**:
   - Replace hidden hover tooltips with clear, accessible, single-line micro-copy directly beneath labels.

4. **Interactive Completion Bar & Stepper Feedback**:
   - Make the `• N fields left before you can create` status interactive: clicking it smoothly scrolls and focuses the next unfilled required field, or reveals a mini-checklist tooltip of remaining requirements.
   - Premium brand-gradient submit button (`#6b6dc4 → #6461bc`) that activates with clear affordance and provides inline feedback.

5. **PRMS Form UX Design Pattern**:
   - Extract these practices into standardized form guidelines in `docs/ux-ui/design.md` so that Result Detail, Bilateral Results, and Innovation Package forms follow identical high-craft standards.

---

## 4. Scope

### In Scope
- **Component Redesign:** `indicator-drawer.component.html`, `indicator-drawer.component.ts`, `indicator-drawer.component.scss`.
- **Form Component Redesign:** `lab-report-form.component.html`, `lab-report-form.component.ts`, `lab-report-form.component.scss`.
- **Context Header Clean-up:** Text cleaning utility for raw indicator description strings (stripping leading/trailing dashes and dots).
- **Word Counter & Title Input:** Transition title field to multi-line auto-resizing textarea with animated word-count badge.
- **Contribution Input Enhancement:** Suffix unit badge, empty placeholder, and comparison badge against the indicator's target.
- **Interactive Completion Feedback:** Clickable `missingFields` badge that focuses the first missing control.
- **Design Tokens & System Alignment:** Use brand violet gradients (`--pr-color-primary-300 → -400`), high-contrast text, accessible focus rings, and Tailwind-first utilities.
- **Spec Documentation:** Update `docs/ux-ui/design.md` §8 (Component patterns) with the standardized PRMS Form UX guidelines.

### Out of Scope (Non-Goals)
- Changing backend API contracts (`POST /api/results/create`, `GET /api/results/get/all/roles/filter/...`).
- Rewriting external Knowledge Product (CGSpace) sync logic or bilateral creation services.
- Altering the permissions/authorization matrix (handled by `RolesService` and `EntityAowService`).
- Modifying result detail sections beyond the creation drawer in this phase.

---

## 5. Affected Users, Systems, And Specs

- **Submitters & Scientists:** Faster, clearer reporting flow with zero ambiguity on required fields, word limits, and indicator targets.
- **QA Reviewers:** Higher quality result titles and accurate contributions resulting from better input guidance.
- **Platform UX Baseline:** Sets the benchmark for Angular 21 form components across `onecgiar-pr-client`.
- **Related Specs:**
  - `docs/specs/changes/emerging-result-cta-placement`
  - `docs/specs/changes/my-work-board`
  - `docs/specs/changes/indicator-reported-results`

---

## 6. Visual Reference

- **Source:** User screenshots provided in conversation:
  - Drawer inspection: `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1788629474516-b64cf0c0-4d10-486e-851e-15f68bfa90a6.png`
  - Full viewport context: `/var/folders/g8/8wqxv48d60737hm79glkxx0w0000gn/T/orca-paste-1788629545631-f7092add-fb1d-4618-ae59-14a1f1c9f1d9.png`
- **Location:** Copied to spec directory upon approval under `docs/specs/changes/report-result-form-ux/reference/`
- **Design Tokens:** `docs/ux-ui/design.md` §7, `src/styles/colors.scss`, `ui-ux-pro-max` form guidelines.

---

## 7. Requirement Delta Preview

### ADDED Requirements
- **FR-FORM-1 (Verbatim Context Preservation):** The drawer header MUST preserve the indicator description text exactly as entered by users (including sequences like `.---` or `------`), while elevating the surrounding typography hierarchy, badge contrast, and layout structure.
- **FR-FORM-2 (Multi-line Title with Word Gauge):** The result title field must be an auto-expanding multi-line input supporting up to 30 words, with a real-time badge indicating remaining words and warning state at 25+ words.
- **FR-FORM-3 (Target Context Adornment):** The contribution input must display the target measurement unit and show remaining indicator target without requiring the user to scroll up.
- **FR-FORM-4 (Interactive Readiness Action):** Clicking the missing fields indicator in the footer must scroll to and focus the first invalid required control.
- **FR-FORM-5 (Logical Card Chunking):** The form must visually group controls into distinct cards/sections (Identity, Contribution, Collaboration) with subtle borders and clear subtitles.

### MODIFIED Requirements
- **FR-FORM-6 (Inline Helper Copy):** Crucial guidance for title and contribution calculation must be visible inline beneath the labels, deprecating hidden browser tooltip hover icons.
- **FR-FORM-7 (Contribution Default):** The contribution input must not default to `0`; it must display a clean numeric placeholder to avoid unintended zero submissions.

### REMOVED Requirements
- **FR-FORM-8:** Remove standalone, floating unstyled text `"Nothing has been reported against this indicator yet."` in favor of a structured, encouraging micro-empty state card.

---

## 8. Approach Options

### Option A: Superficial CSS & Spacing Restyling (Minimalist)
- Adjust padding, borders, and input colors using CSS classes only.
- Keep the current flat layout, single-line input, and tooltip-based guidance.
- **Pros:** Fast to implement, low regression risk.
- **Cons:** Fails to solve the root UX problems: form fatigue remains, titles stay hard to review in a single-line input, hover tooltips remain inaccessible, and no reusable pattern is established for other forms.

### Option B: High-Craft Form UX Architecture (Recommended)
- Redesign `lab-report-form` and `indicator-drawer` using `ui-ux-pro-max` form intelligence:
  - 3-tier visual chunking (Identity, Contribution, Collaboration).
  - Auto-expanding title textarea with live word count progress badge.
  - Suffix unit adornment & target comparison for contribution.
  - Persistent inline micro-copy replacing hidden tooltips.
  - Interactive "N fields left" footer action with smooth field focus.
  - Sanitized, clean indicator hero context.
- Document the resulting pattern in `docs/ux-ui/design.md` as the blueprint for PRMS forms.
- **Pros:** Directly addresses user pain points, elevates platform quality to 2026 standards, guarantees WCAG AA compliance, and provides a reusable system.
- **Cons:** Requires updating unit test specs for `lab-report-form` and `indicator-drawer`.

### Option C: Multi-Step Stepper / Wizard Modal
- Break the drawer into a 3-step wizard (Step 1: Result Info -> Step 2: Target & Evidence -> Step 3: Partners).
- **Pros:** Very low cognitive load per step.
- **Cons:** Excessive clicks for a relatively short form (6 fields total). Scientists prefer seeing the whole result shell in one scannable view before submitting.

---

## 9. Recommended Approach

**Option B (High-Craft Form UX Architecture)** is strongly recommended. It strikes the perfect balance between scannability and structure: all fields remain easily accessible in a single scrollable drawer, but visual chunking, auto-resizing textareas, accessible inline helpers, and interactive readiness cues make the form dramatically easier and faster to complete.

---

## 10. Risks, Dependencies, And Open Questions

- **Risk 1: Backward Compatibility of `app-pr-input` / `app-pr-select`:**
  - *Mitigation:* Ensure `LabReportFormComponent` uses either enhanced inputs or clean semantic HTML form controls styled with Tailwind, preserving existing reactive bindings and `dirtyChange` signals.
- **Risk 2: Existing Unit Tests:**
  - *Mitigation:* Existing tests in `lab-report-form.component.spec.ts` and `indicator-drawer.component.spec.ts` check for specific element bindings. Tests will be updated to match the new component structure.
- **Open Question 1:** Should lead centers be strictly locked (non-removable chip) since the indicator belongs to that Center, or should submitters be able to change it? (Current behavior allows removing it).

---

## 11. Success Criteria

1. **Zero Raw Artifacts:** The indicator context header renders clean, human-readable text without formatting remnants.
2. **Accessible Titles:** Scientific titles can be read and edited across multiple lines without horizontal clipping.
3. **Transparent Progress:** Users immediately see the word count status and numerical contribution against the 2026 target.
4. **Interactive Validation:** Clicking the footer missing-fields indicator focuses the first invalid field.
5. **Brand & Contrast Compliance:** All labels, buttons, and badges meet WCAG AA 4.5:1 contrast and utilize official brand tokens.
6. **Test Suite Green:** All client Jest test suites pass with 100% success.

---

## 12. Next Step

Upon user approval of this proposal, proceed to specification:

```text
/akili-specify changes/report-result-form-ux
```
