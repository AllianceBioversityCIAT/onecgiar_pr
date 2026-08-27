# cap-dev-info — Capacity Sharing for Development information

**Verified:** 2026-08-27 · branch performance-refactor · 3ca36ff51

## What it is
The result-detail section for **Capacity Sharing** results (Pool Funding, W1/W2): how many people were
trained, for how long, the delivery method, and whether they attended on behalf of an organization.

## Contract
- NOT standalone (`standalone: false`), declared in `cap-dev-info.module.ts`.
- State: **the component owns the body** — there is no dedicated service.
  `CapDevInfoComponent.capDevInfoRoutingBody` (`model/capDevInfoRoutingBody.ts`) is the source of truth.
- Endpoints via `ApiService.resultsSE`:
  - `GET_capacityDevelopent()` / `PATCH_capacityDevelopent(body)`
  - `GET_capdevsTerms()` → split in two with `splice(0,2)`: the first 2 are the **sub-terms**
    (Long-term / Short-term, ids 1-2), the next 2 are the parent group (ids 3-4).
  - `GET_capdevsDeliveryMethod()`
- `institutionsSE.institutionsList` (`InstitutionsService`) feeds the organizations multi-select.
- `sectionLoading` (signal) drives `[appSectionSkeleton]`; released in `next` **and** in `error`.
- `hasSelectedOrganizations` (getter) feeds the hidden `appFeedbackValidation` reporter.

## Where it is used
- Child route of `result-detail`, loaded by `cap-dev-info-routing.module.ts`; the per-result-type
  routing lives in `rd-result-types-pages/`.
- The section footer (`app-section-bottom-bar`) reads `DataControlService.fieldFeedbackList()`, filled
  by a DOM scan started at `result-detail.component.ts:146`.

## How a field is marked mandatory here
The green check is **not** decided by the client. A MySQL function decides it. The client only has to
(a) paint the asterisk and (b) get the field into the footer's "N fields missing" list:

| Control | How it enters the list |
|---|---|
| `app-pr-input` | `[required]="true"` → `.pr-input.mandatory`; empty = `.input-validation` with no text |
| `app-pr-radio-button` | `[required]="true"` → `.pr-field.mandatory`; `complete` when `value != null` |
| `app-pr-multi-select` | **emits nothing** → needs a sibling `<div appFeedbackValidation labelText…>` |

## Traps (⚠️ = already broke something)
- ⚠️ **The green check lives in MySQL, not here.** `validation_capacity_dev_P25`
  (`onecgiar-pr-server/src/migrations/1762528725798-createValidtionP25.ts:251-292`), resolved by the SP
  `validate_sections_mapped_batch`, demands **7 things**: `female_using`, `male_using`,
  `non_binary_using`, `has_unkown_using` (all four NOT NULL), `valid_text(capdev_term_id)`,
  `valid_text(capdev_delivery_method_id)` and `is_attending_for_organization` NOT NULL; and when the
  answer is **Yes**, at least one `results_by_institution` row with `institution_roles_id = 3`.
  Until 2026-08-25 the client marked only **one** of them → the section could never turn green and
  nobody told the user what was missing (**P2-3241 was bounced for this**). If anyone relaxes or
  tightens that SQL function, **this template must change in the same commit**.
- ⚠️ **This is NOT a portfolio gate nor a phase gate.** `validation_capacity_dev_P22`
  (`…/1761849861521-createValidtionP22.ts:125-166`) is **identical** to the P25 one, field by field.
  That is why the `[required]` flags carry no `isP25()` or `isCP2026()`: wrapping them in a gate would
  leave one portfolio with no warning and the section stuck in orange. Verified 2026-08-25 by
  comparing both functions.
- ⚠️ **`app-pr-multi-select` does not self-report.** It renders no `.pr-field.mandatory`, so a
  mandatory empty multi-select is **invisible** to
  `DataControlService.someMandatoryFieldIncompleteResultDetail()`. Hence the `<div appFeedbackValidation>`
  at the end of the template — same pattern as `geoscope-management.component.html:47`. Its
  `FeedbackValidationDirectiveModule` is **not** re-exported by `CustomFieldsModule`: it is imported
  separately in `cap-dev-info.module.ts`.
- ⚠️ **The sub-radio (`label="Degree"`, PhD/Master) is OPTIONAL on purpose.** `validate_capdev_term_id()`
  sets `capdev_term_id = capdev_term_id_2 ?? capdev_term_id_1`, so the parent group already satisfies
  `valid_text(capdev_term_id)`. Marking it required would demand a value the server never asks for.
- ⚠️ **That `label="Degree"` is NOT decorative: it is what makes the group render inside its card**
  (P2-3385). With neither `label` nor `description`, `field-card`'s `isBare` getter returns `true` and
  the whole `field_card` class is skipped → the options used to sit loose outside the container. Two
  specs ("renders INSIDE a field card" and "framing … did NOT make it mandatory") fail if anyone drops
  the label, or if adding it flips `required`.
- ⚠️ **0 is a valid answer** in the four counters: the server rejects `NULL`, not `0`. Any validation
  treating `0` as empty blocks the section again.
- ⚠️ **`is_attending_for_organization` arrives as a tinyint (0/1)** from the legacy endpoint while the
  radio options are booleans → `normalizeAttendanceValue()` (P2-3246). Without it a saved "No" does
  not render on reload.
- The help text says to use "Unknown" when disaggregated data is unavailable, but the server still
  demands the other three NOT NULL → you must type `0`. That is a server rule, not a client one.
- In Jest, `innerText` does not exist in jsdom and the missing-fields scan reads it: the spec installs
  an `innerText → textContent` shim on `HTMLElement.prototype` and restores it in `afterAll`.

## Pending / Coming soon
- Nothing visible-but-disabled in this section.
