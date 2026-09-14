# Requirements: Bilateral W3 Create — Manual Drawer & Reporting Parity

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/manual-create-drawer/requirements.md` |
| **Module / Sub-feature** | `bilateral` / `manual-create-drawer` |
| **Prefix** | `BIL-MCD` |
| **Status** | draft |
| **Type** | Change |
| **Approval Mode** | gated |
| **Parent Spec** | none |
| **Ticket(s)** | none (no Jira ticket at specify time) |
| **Date** | 2026-09-14 |

---

## 1. Executive Summary

Center users creating a W3 bilateral result on `/bilateral/:centerAcronym/create` must get **Manual Entry** identity capture (level, type, title, Knowledge Product repository selection) inside a **right-side drawer** that matches the W1/W2 Reporting UX (`indicator-drawer` + repository browse), while **AI-Assisted** creation continues to work on the same page without regression. The reporting-way cards (AI / Manual / Bulk) stay visible on the page; the drawer opens only after an explicit user action. The drawer includes a structured **context header** (project + Science Program), **field validation** with aggregated missing-field feedback, **responsive** layout, and **title uniqueness** checks aligned with the existing `report-result-form` pattern.

---

## 2. Context & System Boundaries

- **Product baseline:** Supports `docs/prd.md` **G1** (complete, consistent reporting UX) and bilateral submitter workflows under W3 (`AGENTS.md` §8.6).
- **UX baseline:** `docs/ux-ui/design.md` §8 PRMS Form UX Pattern (RFUX): sticky drawer footer, missing-fields chip, word-count gauge, browse/manual KP tabs.
- **Technical baseline:** `docs/trd/trd.md` bilateral module; `POST api/bilateral/center/create-header` remains the create endpoint (additive `title` field allowed — see `BIL-MCD-R-6`). Payload summaries contract unchanged for downstream consumers (`AC-4`).
- **Reference UX:** W1/W2 `indicator-drawer` + `lab-report-form` + `kp-cgspace-browse`; title uniqueness from `report-result-form` (`GET_checkTitleUniqueness`, `GET_depthSearch`).
- **Coordination:** AI-Assisted workstream shares `bilateral-result-creator` — manual drawer is an isolated `@if` branch; AI upload section must not regress (`BIL-MCD-R-9`).
- **Constraint:** Do not import `pages/results/*` modules (`bilateral-result-creator/CLAUDE.md`); reuse shared KP primitives only.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Reporting way** | User choice among AI-Assisted, Complete the Form Manually, or Bulk import on the create wizard. |
| **Manual drawer** | Right-side panel hosting manual identity fields; not shown for AI or Bulk paths. |
| **Context header** | Read-only summary of selected reporting project and primary Science Program inside the drawer. |
| **Browse repositories** | CGSpace / MELSpace / WorldFish search UX via shared `kp-cgspace-browse`. |
| **Title gate** | Client checks: non-empty, ≤30 words, no blocking exact duplicate, similar-title surfacing optional. |

---

## 4. In Scope / Out of Scope

### In scope

- Manual Entry path: drawer shell, context header, level + type + title, KP browse/manual tabs.
- Explicit drawer open/close; reporting-way cards remain on the page.
- Field validation and missing-fields footer (RFUX).
- Title word-count and duplicate/uniqueness validation (same API pattern as `report-result-form`).
- Responsive drawer (mobile full-width / tablet / desktop resizable pattern from `indicator-drawer`).
- Scoped unit tests for drawer host, creator integration, title validation, KP browse wiring.
- **Coexistence** with AI-Assisted and Bulk cards on the same create page (no AI feature work, no regressions).

### Out of scope

- AI-Assisted upload/processing UX changes (owned by parallel workstream).
- Bulk import path implementation.
- Moving project or primary SP selectors into the drawer.
- Full `lab-report-form` port (TOC contribution, indicator category, contributing centers multiselect).
- Backend CGSpace search API (P2-3231); client reuses existing browse integration.
- Replacing the post-create bilateral section editor.
- Cypress E2E unless explicitly requested later.

---

## 5. Stakeholders & Personas

| Persona | What changes |
|---|---|
| **Center bilateral submitter** | Manual create matches W1/W2 reporting drawer; faster KP discovery; clear validation before create. |
| **Science Program reviewer** | Same bilateral result shape after create; titles validated earlier. |
| **AI workstream developer** | Shared file coordination; manual branch isolated. |
| **Bilateral downstream consumer** | No payload contract change (`AC-4`). |

---

## 6. User Stories

- **BIL-MCD-US-1** — As a **Center submitter**, I want manual bilateral creation in a side drawer with repository browse, so that W3 feels like W1/W2 Reporting.
- **BIL-MCD-US-2** — As a **Center submitter**, I want title validation before create, so that I do not publish duplicate or over-long titles.
- **BIL-MCD-US-3** — As a **Center submitter**, I want to keep seeing AI and Manual options on the page, so that I can switch approach without losing context.
- **BIL-MCD-US-4** — As an **AI workstream developer**, I want manual drawer logic isolated in `bilateral-result-creator`, so that parallel AI changes merge safely.

Refines platform stories around bilateral reporting completeness (PRD **G1**).

---

## 7. Defect Classes & Verification Mapping

| Defect class | Observable defect | Verification gate |
|---|---|---|
| **DC-1: Drawer UX drift** | Manual path still inline, or drawer unlike W1/W2 chrome (no header/footer). | Scoped Jest DOM assertions on drawer structure + **human visual check** at HITL (T6 if available). |
| **DC-2: KP browse regression** | No browse tab, wrong repositories, stale search results after rapid typing. | Jest tests on drawer host + `kp-cgspace-browse` cancel/retry behavior (kaizen: stale-query lesson). |
| **DC-3: Validation bypass** | Create succeeds with missing title, duplicate title, or invalid handle. | Jest tests on `missingFields()`, `canCreate`, and create blocked when title gate fails. |
| **DC-4: Title not persisted** | Result lands in editor with `Bilateral Draft #id` despite user-entered title. | Server unit test on `create-header` with `title` + client integration test on payload. |
| **DC-5: AI path regression** | AI upload hidden, broken, or manual drawer opens on AI selection. | Jest tests on `selectedReportingWay === 'ai'` branch unchanged. |
| **DC-6: Responsive breakage** | Drawer overflows viewport, footer not sticky, or unusable at 375px. | Jest class/width assertions + **human check** at 375px / 768px / 1280px (no jsdom layout proof — gap acknowledged). |
| **DC-7: A11y failure** | Escape does not close, focus trap missing, aria labels absent. | Jest keyboard/focus tests where harness supports; manual axe pass on drawer at HITL. |

**Accepted risk:** DC-6 layout fidelity at specific breakpoints has no automated layout measurement in Jest — substituted by HITL responsive check.

---

## 8. Functional Requirements

### BIL-MCD-R-1: Reporting-way selection without auto-drawer

The system MUST keep project, primary SP, and reporting-way cards visible on the create page. Selecting **Complete the Form Manually** MUST NOT automatically open the manual drawer.

#### Scenario: Manual way selected, drawer closed until explicit action

- **GIVEN** project and primary SP are selected on `/bilateral/:center/create`
- **WHEN** the user selects **Complete the Form Manually**
- **THEN** the manual way card MUST show selected state
- **AND** the reporting-way section MUST remain visible with all enabled options
- **AND** the manual drawer MUST remain closed until the user activates a dedicated control (e.g. **Set up result manually**)
- **BUT** it MUST NOT scroll the user into a full-page inline level/type/handle form (legacy `#bcr-level-section` inline block removed)

#### Scenario: Switch away from manual closes drawer

- **GIVEN** the manual drawer is open
- **WHEN** the user selects **AI-Assisted** (or another way)
- **THEN** the manual drawer MUST close
- **AND** in-progress manual field state MAY reset or be discarded (no partial create)

---

### BIL-MCD-R-2: Manual drawer shell and context header

The system MUST present manual identity capture in a right-side drawer with organized header chrome matching `indicator-drawer` patterns.

#### Scenario: Drawer opens with context

- **GIVEN** manual way is selected and the user opens the manual drawer
- **WHEN** the drawer renders
- **THEN** it MUST include a top bar with drawer title, close control, and Escape-to-close
- **AND** a **context header** MUST show read-only reporting project name and primary Science Program code/name
- **AND** the body MUST scroll independently with a sticky footer for actions
- **AND** backdrop scrim MUST close the drawer on click (with unsaved-input confirm only if fields were edited — MAY defer confirm to v1 if empty)

#### Scenario: Responsive drawer width

- **GIVEN** viewports 375px, 768px, and ≥1280px
- **WHEN** the drawer is open
- **THEN** at mobile widths the drawer MUST use full viewport width (max `100vw`) without horizontal page scroll
- **AND** at desktop widths the drawer SHOULD support resize drag like `indicator-drawer` (minimum width usable for form fields)
- **AND IT MUST** keep the primary action visible in the sticky footer without overlapping fields

---

### BIL-MCD-R-3: Result identity fields inside drawer

The system MUST collect result level, result type, and result title inside the manual drawer for all manual create paths.

#### Scenario: Level and type selection

- **GIVEN** the manual drawer is open
- **WHEN** the user selects Outcome or Output level
- **THEN** the result type control MUST show only types valid for that level (same mapping as current wizard)
- **AND** changing level MUST reset type and KP-specific state

#### Scenario: Title required with word limit

- **GIVEN** a non–Knowledge Product type is selected
- **WHEN** the user attempts to create
- **THEN** a **Result title** field MUST be required
- **AND** the title MUST be limited to **30 words** with a visible word gauge (RFUX)
- **AND** create MUST be blocked when title is empty or exceeds 30 words

#### Scenario: Knowledge Product title from repository

- **GIVEN** Knowledge Product (type 6) is selected
- **WHEN** the user syncs or selects a repository item
- **THEN** the title field MUST populate from repository metadata
- **AND** the title field SHOULD be read-only/disabled (same rule as `lab-report-form` for KP)
- **AND** title word-count and uniqueness gates MUST still apply to the populated title before create

---

### BIL-MCD-R-4: Title uniqueness and similar results

The system MUST validate result title uniqueness before manual create, using the same client API pattern as `report-result-form`.

#### Scenario: Exact duplicate blocks create

- **GIVEN** the user entered or synced a non-empty title
- **WHEN** `GET_checkTitleUniqueness` returns a blocking exact match in the active reporting context
- **THEN** create MUST be blocked
- **AND** the UI MUST show an explicit duplicate-title error
- **AND** the missing-fields / footer state MUST include the duplicate condition

#### Scenario: Similar titles surfaced

- **GIVEN** the user entered a title
- **WHEN** `GET_depthSearch` returns similar results
- **THEN** the UI SHOULD list similar titles (non-blocking) so the user can avoid near-duplicates
- **AND** create MUST remain allowed when only similar (non-exact) matches exist

#### Scenario: Title check in flight

- **GIVEN** a debounced title check is loading
- **WHEN** the user attempts create
- **THEN** create MUST be blocked until the check completes or fails safely
- **AND** a failed check MUST NOT silently pass as unique (show retry/error state)

---

### BIL-MCD-R-5: Knowledge Product browse and manual entry

For Knowledge Product manual create, the system MUST offer **Browse repositories** and **Manual entry** tabs reusing shared components.

#### Scenario: Browse repositories parity

- **GIVEN** Knowledge Product is selected in the manual drawer
- **WHEN** the user opens the Browse tab
- **THEN** `kp-cgspace-browse` MUST be used with CGSpace, MELSpace, and WorldFish enabled (same as W1/W2)
- **AND** selecting an item MUST set handle and title preview state
- **AND** search retry / stale-query cancellation behavior from `kp-cgspace-search-retry` MUST remain effective

#### Scenario: Manual handle entry

- **GIVEN** the Manual entry tab is active
- **WHEN** the user enters a handle and syncs
- **THEN** validation MUST use shared `kp-handle.validator` rules (not a bilateral-only regex duplicate)
- **AND** successful sync MUST populate title preview
- **AND** create MUST require a validated handle before proceeding

---

### BIL-MCD-R-6: Create action and title persistence

The system MUST create the bilateral result via `POST api/bilateral/center/create-header` and persist the validated title at create time.

#### Scenario: Successful manual create

- **GIVEN** all required drawer fields pass validation (including title gate)
- **WHEN** the user activates **Create and continue**
- **THEN** the client MUST call `create-header` with `result_level_id`, `result_type_id`, `program_code`, `project_id`, `lead_center`, optional `handle` (KP), and **`title`**
- **AND** on success navigation MUST match current behavior (editor route, lead-center warning, missing result_code warning)
- **AND** the created result's stored title MUST match the validated drawer title (not `Bilateral Draft #id`)

#### Scenario: Non-KP create without handle

- **GIVEN** a non-KP type with valid title
- **WHEN** create succeeds
- **THEN** no `handle` field is sent
- **AND** bilateral summaries contract for downstream types is unchanged

---

### BIL-MCD-R-7: Aggregated field validation (RFUX footer)

The system MUST expose missing and invalid fields through a sticky drawer footer consistent with RFUX.

#### Scenario: Missing fields chip

- **GIVEN** the drawer has incomplete required fields
- **WHEN** the footer renders
- **THEN** it MUST show a count of fields left (e.g. "3 fields left before you can create")
- **AND** expanding the chip MUST list human-readable field labels
- **AND** the primary create button MUST be disabled when `missingFields().length > 0`

#### Scenario: Focus missing field

- **GIVEN** the user expands missing fields
- **WHEN** they activate a listed field (where supported)
- **THEN** focus SHOULD scroll to the offending control (title, handle, level, type)

---

### BIL-MCD-R-8: Accessibility

New drawer UI MUST meet baseline accessibility expectations from `docs/ux-ui/design.md` §10.

#### Scenario: Keyboard and screen reader

- **GIVEN** the drawer is open
- **WHEN** the user presses Escape
- **THEN** the drawer closes
- **AND** focus returns to the control that opened the drawer
- **AND** drawer MUST expose `role`, `aria-label`, and `aria-invalid` on invalid fields

---

### BIL-MCD-R-9: AI-Assisted and Bulk coexistence

The system MUST preserve AI-Assisted and Bulk reporting-way behavior on the same create page.

#### Scenario: AI path unchanged

- **GIVEN** the user selects **AI-Assisted**
- **WHEN** the create page renders
- **THEN** `app-bilateral-ai-upload` MUST render as today
- **AND** the manual drawer MUST NOT open
- **AND** manual-only controls MUST NOT appear in the AI section

#### Scenario: Parallel merge safety

- **GIVEN** manual drawer code lands on `bilateral-result-creator`
- **WHEN** AI workstream edits the same template
- **THEN** manual logic MUST live in clearly separated `@if (selectedReportingWay() === 'manual')` blocks and/or dedicated child components
- **AND** scoped tests MUST cover both branches independently

---

## 9. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | Title debounce 500ms (match `report-result-form`); drawer open/close MUST not block main thread >100ms p95 on mid-tier laptop. |
| **Security** | No tokens or handles in console logs (`.cursorrules`). |
| **Backwards compatibility** | `create-header` additive `title` optional field; existing clients without `title` keep draft title behavior. |
| **Accessibility** | WCAG 2.1 AA targets for new drawer controls. |
| **Internationalization** | New user-visible strings via `src/app/internationalization/`. |
| **Testing** | Scoped Jest only for touched modules (no full package suite). |

---

## 10. Acceptance Criteria Index

| ID | Given | When | Then |
|---|---|---|---|
| **BIL-MCD-AC-1** | Project + SP selected | User picks Manual | Drawer stays closed until explicit open action |
| **BIL-MCD-AC-2** | Manual drawer open, KP type | User uses Browse tab | Repositories searchable; selection sets handle + title |
| **BIL-MCD-AC-3** | Valid drawer state | User clicks Create and continue | `create-header` succeeds; navigates to editor |
| **BIL-MCD-AC-4** | Duplicate title from API | User attempts create | Create blocked; error visible |
| **BIL-MCD-AC-5** | AI way selected | Page renders | AI upload visible; no manual drawer |
| **BIL-MCD-AC-6** | Title >30 words | User attempts create | Create blocked; footer lists title violation |
| **BIL-MCD-AC-7** | 375px viewport | Drawer open | No horizontal scroll; footer reachable |

---

## 11. Requirement ID Index

| ID | Summary |
|---|---|
| BIL-MCD-R-1 | No auto-drawer; explicit open; way cards stay |
| BIL-MCD-R-2 | Drawer shell + context header + responsive |
| BIL-MCD-R-3 | Level, type, title in drawer |
| BIL-MCD-R-4 | Title uniqueness + similar search |
| BIL-MCD-R-5 | KP browse + manual tabs |
| BIL-MCD-R-6 | Create-header with title persistence |
| BIL-MCD-R-7 | RFUX missing-fields footer |
| BIL-MCD-R-8 | Accessibility |
| BIL-MCD-R-9 | AI/Bulk coexistence |

---

## 12. Dependencies & Assumptions

### Dependencies

- Shared `kp-cgspace-browse`, `kp-handle.validator`, `WordCounterService`, `ResultsApiService` title endpoints.
- `indicator-drawer` as visual/behavioral reference (pattern copy, not import of W1/W2 modules).
- Parallel AI workstream on `bilateral-result-creator`.

### Assumptions

- **BIL-MCD-A-1:** Additive `title` on `CreateCenterResultDto` is acceptable (minimal server change) — preferred over post-create PATCH for atomic create.
- **BIL-MCD-A-2:** Title uniqueness APIs used by `report-result-form` apply to bilateral W3 results in the active reporting phase.
- **BIL-MCD-A-3:** Bulk import remains disabled/disabled-card as today; no drawer interaction.

---

## 13. Open Questions

| ID | Question | Status |
|---|---|---|
| BIL-MCD-OQ-1 | Exact label for drawer open CTA ("Set up result manually" vs "Continue") | **Resolve in design** — default: **Set up result manually** |
| BIL-MCD-OQ-2 | Confirm drawer close discards in-progress fields without confirm when pristine | **Default yes** for v1 |
| BIL-MCD-OQ-3 | Should non-KP types show title field before type selection? | **Default:** show after type selected |

---

## 14. Out-of-Band Notes

- Update `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` change log only if `create-header` request shape documentation changes (additive `title`).
- Kaizen: include stale-query cancellation tests when hosting `kp-cgspace-browse` (lesson from `changes/kp-cgspace-search-retry`).
