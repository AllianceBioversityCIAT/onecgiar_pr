# Proposal: Exclude the owner Science Program from the Contributing SP dropdowns (C&P)

## Why

QA (Santi, 2026-07-08) found that in the Contributors & Partners section of the result detail, the result's **own (owner/primary) Science Program** is offered in the "Contributing Science Programs" dropdowns. A user can pick it (e.g. SP06 on an SP06 result), but on save the backend rejects it with `"The owner initiative cannot be shared with itself"` (`share-result-request.service.ts:162-164`) — so the selection silently disappears, reading as a bug.

This is not a functional bug (the backend correctly blocks self-contribution), but a UX gap: the owner SP should never be selectable in the first place. The Report-result popup already excludes the owner (`initiative_id !== entityDetails().id`); the C&P surface did not.

## What Changes

- In `rd-contributors-and-partners.component.ts`, exclude the result's owner Science Program (`currentResult.initiative_id`) from **both** SP dropdowns — the ToC-derived list (`referenceScience`) and the "Other(s)" list (`otherScienceList`) — so it can never be selected as a contributor.

## Capabilities

### Modified Capabilities
- The 2026 Contributing Science Programs behavior (P2-2929) now excludes the owner/primary Science Program from its selectable options, matching the Report-result popup.

## Impact

- `onecgiar-pr-client/.../rd-contributors-and-partners/rd-contributors-and-partners.component.ts` (new `ownerInitiativeId` computed; filter in `referenceScience` and `otherScienceList`).
- No backend change (backend self-contribution guard stays as the safety net).
- Out of scope: the popup (already excludes the owner), Centers/External Partners.
