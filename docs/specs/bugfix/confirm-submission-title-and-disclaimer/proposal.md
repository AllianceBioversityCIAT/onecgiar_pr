# Proposal — Confirm Submission dialog: stale title after AI review + misleading disclaimer

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/confirm-submission-title-and-disclaimer` |
| Type | Bug |
| Approval Mode | gated |
| Source | User-reported email "RE: More testing in PRMS - things to solve" (screenshot `image-20260909-170220.png`, not attached to this session — described only) |
| Reported by | santiago.sanchez@cgiar.org (relaying tester feedback) |
| Date | 2026-09-11 |

## Intent

Fix the "Confirm submission" dialog on Result Detail so it (1) always shows the result's latest saved title, even after the title was changed via the AI Review feature, and (2) no longer tells the user that no further changes are possible after approval — since changes remain possible during QA.

## Problem / Current Behavior

`submission-modal.component.html` (Result Detail → Submit) renders:

```html
The "{{ this.dataControlSE?.currentResult?.title }}" is about to be submitted.
Please note that further changes cannot be made once approved.
```

**Issue 1 — stale title.** `dataControlSE.currentResult` is only refreshed by `CurrentResultService.GET_resultById()` (`current-result.service.ts:39-47`), which explicitly sets `this.dataControlSE.currentResult = response`. When a user accepts an AI-suggested title via the AI Review dialog, the save path (`AiReviewService.POST_saveSession` → `notifySectionChanged()`, `ai-review.service.ts:365-396`) only bumps the `generalInformationSaved` signal. `RdGeneralInformationComponent`'s effect (`rd-general-information.component.ts:130-138`) reacts to that signal by calling `getSectionInformation()`, which re-fetches and reassigns the section's own **local** `generalInfoBody` object (`rd-general-information.component.ts:213-221`) — it never touches `dataControlSE.currentResult` or `currentResultSignal`. The shared `currentResult.title` that the submission modal reads is therefore never updated, so the dialog keeps showing the original, manually-entered title.

**Issue 2 — misleading disclaimer.** The static copy "Please note that further changes cannot be made once approved" is factually wrong: further edits remain possible during the QA review stage. The correct wording is "Please note that further changes to this result can only be made during the QA process."

## Proposed Outcome

- The Confirm Submission dialog title always reflects the most recently saved title of the result, whether it was set manually or accepted from an AI Review suggestion — with no extra reload step required from the user.
- The disclaimer text reads "Please note that further changes to this result can only be made during the QA process."
- Both fixes apply to every result type routed through `rd-general-information` / `submission-modal.component` (Innovation, Policy, Capdev, Knowledge Product, Innovation Use, etc.) — they all share this same title field and modal.

## Scope

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/submission-modal/submission-modal.component.html` — disclaimer copy.
- `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts` — `notifySectionChanged()` (or the `POST_saveSession` success path) must also refresh the shared `dataControlSE.currentResult`/`currentResultSignal` title, not just the section-local copy.
- Verify `dataControlSE.currentResult.title` (or `currentResultSignal().title`) is the correct binding to keep using in the modal, vs. switching to the signal for consistency with newer code.

## Non-Goals

- The IPSR submission modal (`ipsr-submission-modal.component.html`) carries the identical disclaimer sentence and could be updated for copy consistency, but its title source (`ipsrDataControlSE.detailData.title`) is a separate state container not touched by the AI Review general-information flow — confirming/fixing that path is out of scope unless the user asks to extend it. Flagged as an open question below.
- No change to the AI Review proposal/accept UX itself, only to what happens to shared state after a title proposal is applied.
- No change to backend endpoints — the correct title is already persisted server-side; this is a client-side state-refresh gap.

## Affected Users, Systems, And Specs

- **Users:** Result submitters using AI Review to refine a title before submitting.
- **Systems:** `onecgiar-pr-client` only (`ai-review.service.ts`, `rd-general-information.component.ts` effect, `submission-modal.component.html`).
- **Related specs:** none found under `docs/specs/` for the submission modal or AI Review title flow.

## Visual Reference

- Source: None (screenshot referenced by the user was not attached to this session; the current/expected copy was fully specified in text).
- Location: n/a
- Notes: Backend-unaffected, copy-only + state-refresh fix; no new UI to mock.

## Bug Diagnosis

### Observed Symptom
The "Confirm submission" dialog shows the result's original, manually-entered title even after the title was updated via AI Review. Separately, the dialog's disclaimer implies changes are permanently locked after submission.

### Reproduction Steps
1. Open a result in Result Detail → General Information.
2. Enter an initial title manually and save.
3. Run AI Review, accept the AI-suggested title (`new_title` proposal via `onApplyProposal`/`POST_saveSession`).
4. Click Submit to open the Confirm Submission dialog.
5. Observe: the dialog still shows the pre-AI-review title, not the one just accepted (confirmed by code, not yet re-verified live in-browser this session).

### Root Cause (confirmed)
`ai-review.service.ts:391-396` (`notifySectionChanged`) only increments `generalInformationSaved`, a signal consumed solely by `rd-general-information.component.ts:130-138`'s effect, which reloads into the component-local `generalInfoBody` (`rd-general-information.component.ts:213-221`) — never into `DataControlService.currentResult`/`currentResultSignal`. Those shared fields are only ever written by `CurrentResultService.GET_resultById()` (`current-result.service.ts:39-47`), which is not called anywhere in the AI Review save path. `submission-modal.component.html:13` binds directly to `dataControlSE.currentResult.title`, so it keeps rendering the stale value until something else (e.g. a manual page reload, or a subsequent unrelated call to `GET_resultById()`) refreshes shared state.

### Impact & Scope
Affects every result type that goes through `rd-general-information` (all typed results — Innovation, Policy, Capdev, Knowledge Product, Innovation Use — since Title is a general-information field shared by all of them), any time AI Review is used to change the title and the user submits without triggering an unrelated shared-state refresh first. Cosmetic-only in the sense that the correct title is already saved server-side and will show correctly after any full reload — but the dialog contents shown to the user in the moment are wrong, which is the exact behavior the user flagged as confusing/risky right before submission.

### Fix Strategy
Smallest safe correction: after a successful title-affecting AI Review save, refresh the shared title state that the modal reads — either by calling `CurrentResultService.GET_resultById()` from `notifySectionChanged()` (consistent with the existing refresh pattern used elsewhere, e.g. `rd-general-information.component.ts:437`), or by patching `dataControlSE.currentResult.title` / `currentResultSignal` directly from the applied proposal's `new_value` (cheaper, avoids a network round-trip, but must be kept in sync with whatever the section's own reload produces). The disclaimer text is a pure string replacement in the template. This has business logic (a state-refresh gap, not a one-line label), so it routes to `/akili-specify bugfix/confirm-submission-title-and-disclaimer` in **Bug Mode**, which will require a regression test proving the modal shows the AI-review title (red before the fix, green after) — Cypress E2E is the natural fit here since the bug spans two components and a shared service, not something Jest/jsdom paints reliably per the client's own testing conventions.

## Approach Options

1. **Refresh via `CurrentResultService.GET_resultById()` inside `notifySectionChanged()`.** Reuses the exact refresh path already proven correct elsewhere in this file (`rd-general-information.component.ts:437`). Slightly more network cost (one extra GET) but guarantees `currentResult` matches the server exactly, including any other fields the AI Review save may have touched (description, DAC scores don't live on `currentResult`, but title/short_name might cascade elsewhere later).
2. **Patch `dataControlSE.currentResult.title` directly from the applied proposal's `new_value`, no extra GET.** Cheaper, but duplicates knowledge of what "title" means across two code paths (the reload payload shape and the proposal payload shape) and risks drifting if a future proposal changes shape.
3. **Switch the modal to read `currentResultSignal()` instead of `currentResult`, and make the signal the single write target everywhere.** Larger refactor — this modal was already inconsistent (one instance of it reads `currentResult`, `rd-general-information` reads `currentResultSignal` elsewhere) but unifying that is a separate cleanup, not required to fix this bug.

## Recommended Approach

Option 1 — call `CurrentResultService.GET_resultById()` from `notifySectionChanged()` when the applied field affects the shared title (i.e., whenever `field_name === 'new_title'`, or simply on every successful `POST_saveSession`/`PATCH_saveDacScore` inside a result-detail route, mirroring the existing `generalInformationSaved` bump). It's the smallest change that reuses an already-trusted refresh path instead of introducing a second, parallel way of writing `currentResult.title`.

## Risks, Dependencies, And Open Questions

- **Open question:** should the IPSR submission modal's identical disclaimer sentence be corrected in the same PR for copy consistency, even though its title-refresh bug (if any) is out of scope? Recommend yes for the copy-only half (near-zero risk, same string), deferred to `/akili-specify` to confirm.
- **Risk:** calling `GET_resultById()` on every AI Review save adds a network round-trip and a brief `currentResultSignal.set({})` blank flash (see `current-result.service.ts:37`) that other consumers of `currentResultSignal` (header, breadcrumb) will also see. Needs a manual browser check that this flash isn't visually jarring during the AI Review flow.
- **Dependency:** none — pure client-side fix, no backend/API contract change.

## Success Criteria

- Accepting an AI-suggested title, then opening Confirm Submission, shows the new title — verified in a real browser session (per `onecgiar-pr-client/CLAUDE.md` §9 browser-verification rules) and covered by a Cypress regression test.
- The disclaimer reads exactly "Please note that further changes to this result can only be made during the QA process." across all result types that use `submission-modal.component`.
- No regression to the existing AI Review "Apply proposal" / DAC score save flows.

## Next Step

```text
/akili-specify bugfix/confirm-submission-title-and-disclaimer
```
(Bug Mode — converts the confirmed root cause above into a fix plan plus a mandatory regression test.)
