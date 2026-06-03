## Why

QA sub-task **[P2-2979](https://cgiarmel.atlassian.net/browse/P2-2979)** (parent **[P2-2960](https://cgiarmel.atlassian.net/browse/P2-2960)**) reports that on a P25 result, **Lead contact person** in **General information** is not treated as mandatory after Save: no required marker on the field and the section validation alert does not list it. The first P2-2960 pass added a hidden `appFeedbackValidation` hook but left `FieldsManagerService` with `required: false` for `[general-info]-lead_contact_person`, so the visible control never shows as required. Business scope is **P25 only** — P22 behavior must not change.

## What Changes

- **P25 only:** Mark **Lead contact person** as required in General information (asterisk via `FieldsManagerService` / `app-pr-field-header`).
- **P25 only:** Wire mandatory **completion** to a **valid selected contact** (`lead_contact_person` + `lead_contact_person_data`), not free-text `searchQuery` (typing without selecting must stay incomplete).
- Keep or refine `appFeedbackValidation` so `someMandatoryFieldIncompleteResultDetail` lists **Lead contact person** when empty/invalid and clears when a valid contact is saved.
- **Out of scope:** Lead Center / Lead Partner (handled in `rd-contributors-and-partners` under P2-2960), P22 General information, backend green-check queries.

## Capabilities

### New Capabilities

- `p25-lead-contact-mandatory`: P25 General information rules for Lead contact person — required UI, save-time validation alert, and completeness proxy (valid AD selection only).

### Modified Capabilities

<!-- none — no shared specs under openspec/specs/ yet -->

## Impact

- **Frontend:** `fields-manager.service.ts`, `lead-contact-person-field/` (optional `required` input), `rd-general-information/` template + tests.
- **Jira:** P2-2979 (fix), P2-2960 (parent epic).
- **Backend:** unchanged; section green check still depends on server completeness (documented gap from P2-2960).
