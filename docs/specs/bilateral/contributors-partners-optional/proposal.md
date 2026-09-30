# Proposal — Bilateral External partners: optional, in Full metadata

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/contributors-partners-optional` |
| Slug | `contributors-partners-optional` — derived from free-text argument |
| Type | Change (origin: bug P2-3821, root cause already diagnosed; the fix is a requirement change) |
| Ticket | [P2-3821](https://cgiarmel.atlassian.net/browse/P2-3821) · epic P2-3558 · supersedes P2-3368 AC5 |
| Decision | PO, Juan David Delgado, 2026-09-28 — recorded on P2-3821 (comment 43169) |
| Approval Mode | gated |
| Base branch | `performance-refactor` |
| Depends on | none |
| Parallel-safe | yes — client-only, one component; no migration, no API contract |
| Status | Approved → specified (2026-09-29) |

## Intent

Put the reporting form's rule for **External partners** in line with the Fetcher's: optional. The block (the partners multi-select plus the "This result has no external partners" checkbox) moves from the minimum-data block into **Full metadata**. It stays on the form, it still saves, and it stops being a required answer.

## Problem / Current Behavior

- **The Fetcher does not require partners.** `contributing_partners` is not in `required`. When it is sent, it needs `minItems: 1`, and each item needs `anyOf` `institution_id` / `acronym` / `name` (`onecgiar_result_functions/services/fetcher/src/validator/schemas/common_fields.json:313-331`). The PRMS DTO is optional too (`onecgiar-pr-server/src/api/bilateral/dto/create-bilateral.dto.ts:1277-1286`). The ingest has no field to declare "no partners": `no_applicable_partner` is only written by the centre form's PATCH (`bilateral-center.service.ts:1836-1837`).
- **The form does require them.** P2-3368 AC5 makes the field mandatory: at least one partner, or the checkbox. This is enforced by:
  - the MDS tracker item `external-partners` (`section-contributors.component.ts:725-735`);
  - `[required]="true"` on the multi-select (`section-contributors.component.html:220-231`);
  - the red hint "Add at least one external partner, or tick…" (`section-contributors.component.html:244-247`).
- **Result.** An ingested result that has no partners and no `keep_editing` is born in Pending Review (`initial-status.constants.ts:21-27`). There the form is read-only (`section-contributors.component.ts:73`), but the footer still lists "External partners" as missing (`bilateral-result-creator.component.ts:251`). The section can never read "Section complete". Reproduced on #9503 (IITA, phase 36, prtest), per the P2-3821 comment of 2026-09-28.
- **The Submit gate is client-only.** `canSubmitFromRail` requires every MDS-tracked section to be complete (`bilateral-result-creator.component.ts:776-785`). No server-side MDS check on `submitForReview` was found (`bilateral-center.service.ts` ~2200). `UNVERIFIED — confirm at source before relying on it`: whether any server green check (`validation_partners_*`) gates a bilateral transition.

## Proposed Outcome

- External partners renders inside the Full metadata block, for **every** result type.
- Neither the multi-select nor the checkbox is required: no asterisk, no red hint, no MDS tracker item.
- With nothing answered, the Contributors & partners section can reach "Section complete". Submit no longer waits on partners.
- Stored partners and the "no partners" flag keep saving and loading exactly as today.
- With Full metadata collapsed, the "N hidden fields have values and will be saved." note counts the partner block whenever it holds an answer.

## Scope

- `section-contributors.component.html`: move the External partners block into Full metadata, and drop the required marks and the red hint.
- `section-contributors.component.ts`:
  - drop the `external-partners` tracker item;
  - add a Full-metadata gate that does not depend on the linked-question type rule;
  - extend `hiddenFieldsWithValues`;
  - update the comments that call the field mandatory.
- `section-contributors.component.spec.ts` and `section-contributors.readonly.spec.ts`: update the assertions that expect the field to be required.

## Non-Goals

- No change to the Fetcher, `POST /create`, `SaveBilateralContributorsDto`, entities, migrations or MySQL functions.
- No new API flag for "no partners" (the option was discussed and dropped).
- No change to `keep_editing` or to the initial-status logic.
- No change to the W1/W2 or IPSR partner forms.
- No data backfill. Existing results keep whatever they have stored.

## Affected Users, Systems, And Specs

| Affected | Effect |
|---|---|
| Centre reporters (Editing) | Partners become optional, behind the Full metadata toggle |
| Reviewers / read-only viewers | Partners sit behind the toggle; the hidden-fields note signals when data exists |
| Ingested results (bulk upload / Fetcher) | No longer stuck with an unanswerable missing field |
| P2-3368 spec | AC5 superseded; the "Yes\*" row for External partners becomes "No / Full metadata" |
| Server | Untouched |

## Visual Reference

- Source: None.
- Notes: the layout already exists. The block moves below the "Complete full metadata" toggle, next to the linked/bundled question, and reuses its current markup. No new component.

## Requirement Delta Preview

### MODIFIED Requirements

- P2-3368 AC5 → External partners is **optional**. Saving with no partner and the checkbox unticked is valid and raises no error.
- P2-3368 Block 1 table → External partners moves to Block 2 (Full metadata).
- P2-3368 AC13 → the hidden-fields note also counts the External partners block when it has a value (partners selected, or the checkbox ticked).

### REMOVED Requirements

- The red hint "Add at least one external partner, or tick 'This result has no external partners'."
- The `External partners` entry in the section's missing-fields list and in the Submit gate.

### ADDED Requirements

- The Full metadata block renders External partners for every result type, including Innovation Use and Innovation Development. The linked/bundled question keeps its own type exclusion.

## Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Move to Full metadata + optional** | What the PO asked for | Aligns the form with the Fetcher; partners get a little less visible |
| B. Keep in Block 1, just optional | Drop the required marks only | Smaller diff, but Block 1 is labelled as the "minimum data standards", so an optional field there contradicts its own banner |
| C. Required only while Editing | Skip the MDS item when read-only | Hides the symptom, keeps two different rules for form and API; rejected by the PO |

## Recommended Approach

**Option A.** It is the PO decision, and it is the smallest change that makes the form and the Fetcher tell the same story. Key design points for `/akili-specify`:

1. **Gate.** The current Full metadata container is `@if (showLinkedResultQuestion())`, which is `false` for Innovation Use and Innovation Development (`section-contributors.component.ts:420-426`). Moving partners inside it as-is would hide them for those two types. The block needs its own gate on `showAllFields()`, and the linked question stays nested under its type rule.
2. **Keep the payload invariants.** `partnersHydrated()` still guards `institutions`, `no_external_partners` and `is_lead_by_partner = false` (`section-contributors.component.ts:658-668`). `is_lead_by_partner` must keep travelling: the shared `validation_partners_*` functions treat NULL as "not answered".
3. **Error banners.** The centres catalogue banner (`centersLoadFailed`) currently sits inside the partners block, but it is about Block 1 data, so it stays in Block 1. The partners-load banner moves with the partners.
4. **Hidden-fields note.** It counts the partner block (guarded by `partnersHydrated`) on top of the linked question. The linked question keeps its type-based zero.

## Risks, Dependencies, And Open Questions

| # | Item | Handling |
|---|---|---|
| R1 | Server green check `validation_partners_*` may still read partners for bilateral | `UNVERIFIED`. The rail uses the client tracker, but a green check shown elsewhere (results list, QA) could still flag it. Check where the bilateral green check comes from during specify; per memory, procedures are applied by hand, so ask for `SHOW CREATE FUNCTION` if it matters |
| R2 | Read-only reviewers no longer see partners without expanding the toggle | The hidden-fields note flags it. Open: should Full metadata auto-expand in read-only mode when there is data? Default: no |
| R3 | The two spec files assert the mandatory behaviour | Update them in the same change; they are in scope |
| R4 | This worktree's branch is behind `performance-refactor` | Rebase or branch from `origin/performance-refactor` before execute |
| OQ1 | Does the Overview / section-zero dashboard count partners anywhere else? | Grep during specify |

## Success Criteria

- On #9503-style data (no partners, flag unset), Contributors & partners reads "Section complete" in both Editing and read-only mode.
- In Editing, Submit enables without touching partners, as long as the other sections are complete.
- Choosing partners or ticking the checkbox still persists and rehydrates after a reload.
- For Innovation Use and Innovation Development, partners appear under Full metadata and the linked question does not.
- Targeted client jest for `section-contributors` and `bilateral-result-creator` is green, and `ng lint` is clean.

## Next Step

```text
/akili-specify bilateral/contributors-partners-optional
```
