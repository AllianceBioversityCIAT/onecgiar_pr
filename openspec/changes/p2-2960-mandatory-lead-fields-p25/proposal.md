## Why

Jira **P2-2960** (requested by Business): in the P25 portfolio, `Lead Contact Person`, `Lead Center` and `Lead External Partner` can currently be left empty, so results are completed/submitted without a clear point of contact or accountable lead. Business wants these three fields enforced as mandatory, with the same validation UX already used elsewhere in PRMS.

**Scope: frontend-only** (`onecgiar-pr-client`). The section "green completion check" is computed by the backend (`green-checks` endpoint), so that part of the acceptance criteria is flagged as a backend follow-up the AI will not implement (see Impact).

## What Changes

- **Lead Contact Person** (P25 General Information): add mandatory validation — required marker + `appFeedbackValidation` incomplete/complete indicator wired to whether a valid contact is selected (`userSearchService.hasValidContact` + `lead_contact_person`).
- **Lead Center** (P25 Partners — `rd-contributors-and-partners`): change the field from `[required]="false"` to required when the result is **not** led by an external partner (mirroring the existing P22 `rd-partners` behavior).
- **Lead External Partner** (P25 Partners): confirm/keep it required when the result **is** led by an external partner (already `[required]="is_lead_by_partner"` — verify, no regression).
- Validation alert appears when any of the three is missing; it clears once completed. (Frontend feedback layer only.)

This change is **P25-only**. P22 (`rd-partners`) already enforces Lead Center / Lead Partner and is out of scope.

## Capabilities

### New Capabilities
- `lead-fields-validation`: frontend mandatory-field validation rules for the P25 lead fields (Lead Contact Person, Lead Center, Lead External Partner) — when they are required, how the validation alert and the inline feedback indicator behave.

### Modified Capabilities
<!-- none — no existing specs under openspec/specs/ -->

## Impact

- **Frontend (in scope):**
  - `pages/results/pages/result-detail/pages/rd-general-information/` (Lead Contact Person wiring + template)
  - `pages/results/pages/result-detail/pages/rd-contributors-and-partners/` (Lead Center `[required]`)
  - Possibly `custom-fields/lead-contact-person-field/` (expose validity for the required marker)
  - Jest specs for the touched components (client thresholds 50/60/60/60).
- **Backend (out of scope — report to user with evidence):** the section green-check (AC #4/#5/#6 — "section stays gray until complete") is produced by the `green-checks` / `p25 green-checks` endpoints consumed in `green-checks.service.ts`. For the green check to truly stay gray until these fields are filled, the backend completeness query must include `lead_contact_person` and `lead_center`. This requires a server change and is handed to the user.
- **Baseline refs:** UI rules per `docs/system-design/design.md`; technical layout per `docs/detailed-design/detailed-design.md`. Jira: **P2-2960**.
