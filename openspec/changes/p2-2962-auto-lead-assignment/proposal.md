## Why

Jira **P2-2962** (Enhancement 2026 / epic P2-2338): when a P25 result has only one Contributing CGIAR Center (center-led) or only one External Partner (partner-led), users must still open a second dropdown and pick the same entity again as Lead Center / Lead Partner. That duplicate step adds friction and omission errors. The ticket asks the UI to **auto-populate** the lead field in those obvious cases while keeping validation rules unchanged (complements **P2-2960**, which made those fields mandatory).

**Scope: frontend-only** (`onecgiar-pr-client`). Persistence already flows through existing `PATCH_ContributorsPartners` + `is_leading_result` flags set in `onSaveSection()` — no new API or backend logic required.

## What Changes

- Add a small **auto-assign helper** in `RdContributorsAndPartnersService` that sets `leadCenterCode` or `leadPartnerId` when:
  - the result is **not** led by an external partner, `possibleLeadCenters.length === 1`, and lead center is empty or no longer valid; or
  - the result **is** led by an external partner, `possibleLeadPartners.length === 1`, and lead partner is empty or no longer valid.
- Invoke auto-assign from existing refresh hooks (`setPossibleLeadCenters`, `setPossibleLeadPartners`) and after the **led by external partner?** toggle (after the opposite lead field is cleared).
- **Do not** override a user’s valid manual selection when two or more options exist.
- **Do not** change** save payload shape, green-check endpoints, or P2-2960 validation (`appFeedbackValidation` / `[required]`).
- Unit tests in `rd-contributors-and-partners.service.spec.ts` (new or expanded) and any touched component specs.

## Capabilities

### New Capabilities

- `auto-lead-assignment`: rules for when Lead Center / Lead Partner are auto-filled from the single contributing entity, when auto-fill is skipped, and how this interacts with load/save/toggle/delete flows.

### Modified Capabilities

<!-- none — lead-fields-validation (P2-2960) requirements unchanged; auto-fill only reduces empty states -->

## Impact

- **Frontend (in scope):**
  - `pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts` (primary)
  - `rd-contributors-and-partners.component.html` (toggle handler — optional thin wrapper)
  - `components/multiple-wps/components/normal-selector/normal-selector.component.ts` (partner list changes — already calls `setPossibleLeadPartners`)
  - Jest specs for service + component
- **Backend (out of scope):** no migration, no new endpoint. Green-check still depends on saved `is_leading_result` (unchanged). P2-2960 follow-up for `lead_contact_person` in `validation_general_information_P25` remains separate.
- **Related work:** P2-2960 mandatory validation — auto-assign helps users satisfy it faster; AC explicitly says validation rules stay the same.
- **Baseline refs:** Jira **P2-2962**; UI patterns per `docs/system-design/design.md`.
