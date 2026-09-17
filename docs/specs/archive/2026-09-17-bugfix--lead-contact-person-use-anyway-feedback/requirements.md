# Requirements — Lead Contact Person "Use this name anyway" Completeness

## 1. Module / Feature

- **Module:** `results` (shared with `ipsr`)
- **Sub-feature:** Lead Contact Person mandatory completeness feedback (`appFeedbackValidation`)
- **Owner:** Santiago Sánchez (s.sanchez@cgiar.org)
- **Status:** draft
- **Ticket(s):** Follow-up to `P2-3225` / `P2-3663` (Lead Contact Person MDS)
- **Depth:** Lite · **Mode:** Bug
- **Bug Diagnosis:** `appFeedbackValidation` in `rd-general-information.component.html` (and `isLeadContactPersonComplete` in `ipsr-general-information.component.ts`) requires `!!lead_contact_person && !!lead_contact_person_data`. When a contact is accepted via "use this name anyway", `lead_contact_person` contains the typed string but `lead_contact_person_data` is legitimately `null`. Because `lead_contact_person_data` is null, `isComplete` evaluates to `false`, the DOM element lacks `.complete`, and `DataControlService` reports "1 field missing" in the bottom bar.

## 2. Context

In `4cc613bd38c2` ("allow keeping a name not found in CGIAR AD"), an action button *"use this name anyway"* was introduced in `LeadContactPersonFieldComponent` so that non-Active Directory personnel (consultants, external partners) can be designated as the lead contact person.

However, the completeness validator in `rd-general-information.component.html` had been constrained in `b79779b49` (`P2-3663`) to demand `lead_contact_person_data` alongside `lead_contact_person`. As a consequence, reporters using the "use this name anyway" feature observe the local card turn green (`hasSelectedContact` is true), but the bottom bar (`section-bottom-bar`) persists in displaying *"1 field missing"*.

Baseline references:
- `docs/prd.md` — **US-S1** (Result reporting flow), **AC-4** (Data validation and completeness feedback).
- `docs/ux-ui/design.md` — §8 Section bottom bar and field completion indicators.
- `onecgiar-pr-client/src/app/custom-fields/lead-contact-person-field/CLAUDE.md` — Traps §60-62 (`hasSelectedContact` vs `appFeedbackValidation`).

## 3. In Scope / Out of Scope

### In scope

- Align `appFeedbackValidation [isComplete]` in `rd-general-information.component.html` to count a non-empty `lead_contact_person` string as complete.
- Align `isLeadContactPersonComplete` in `ipsr-general-information.component.ts` to count a non-empty `lead_contact_person` string as complete.
- Update existing component unit test specifications to reflect that a contact without AD data accepted as free text is considered complete by the UI validator.
- Regression tests verifying that:
  - An empty contact is incomplete.
  - An in-progress search query (typed but not accepted) remains incomplete.
  - A directory-selected contact is complete.
  - An accepted free-text contact ("use this name anyway") is complete.

### Out of scope

- Modifying the Active Directory lookup API (`GET_adUsersSearch`).
- Modifying backend MySQL stored procedures / functions.
- Modifying the visual appearance or behavior of `LeadContactPersonFieldComponent` itself.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter (Pooled / IPSR) | When typing an external contact person and clicking "use this name anyway", the missing fields counter updates immediately and does not falsely accuse them of having an empty field. |

## 5. Functional Requirements

### Required (MUST)

- **`RES-R-1`** The system MUST count the Lead Contact Person field as complete in the section completeness scanner whenever `lead_contact_person` contains a non-empty trimmed string, regardless of whether `lead_contact_person_data` is present.

#### Scenario: Free-text contact accepted via "use this name anyway"

- **GIVEN** a result in a phase where Lead Contact Person is required (P25, phase year >= 2026)
- **WHEN** the user types a contact name that does not exist in Active Directory and clicks *"use this name anyway"*
- **THEN** `generalInfoBody.lead_contact_person` holds the non-empty string and `lead_contact_person_data` is `null`
- **AND** `appFeedbackValidation` evaluates `isComplete = true`
- **AND** the DOM element for the field acquires the `.complete` class
- **AND** the bottom bar counter decrements the missing fields count (e.g. from "1 field missing" to complete / 0)
- **BUT it must NOT** mark the field complete while the user is actively typing in the search box before selecting from AD or clicking "use this name anyway"
- **AND IT MUST** mark the field incomplete if the contact is cleared or contains only whitespace.

#### Scenario: Active Directory contact selected

- **GIVEN** a result where Lead Contact Person is required
- **WHEN** the user selects a contact from the Active Directory search results
- **THEN** `generalInfoBody.lead_contact_person` holds the user's display name and `lead_contact_person_data` holds the AD user record
- **AND** `appFeedbackValidation` evaluates `isComplete = true`
- **AND** the bottom bar counter reflects that the field is complete.

#### Scenario: Empty contact

- **GIVEN** a result where Lead Contact Person is required
- **WHEN** `lead_contact_person` is `null`, `undefined`, or an empty/whitespace string
- **THEN** `appFeedbackValidation` evaluates `isComplete = false`
- **AND** the field is listed in `DataControlService.fieldFeedbackList()` as missing
- **AND** the bottom bar displays "1 field missing".

## 6. Defect Classes & Verification Gate

| Defect Class | How It Is Caught |
|---|---|
| Mismatch between free-text contact and completeness indicator | Automated Jest test on `rd-general-information.component.spec.ts` testing `isComplete` when `lead_contact_person` is populated without `lead_contact_person_data`. |
| IPSR completeness regression | Automated Jest test on `ipsr-general-information.component.spec.ts`. |
| Premature completion while typing | Automated Jest test asserting `isComplete = false` during active search input. |
