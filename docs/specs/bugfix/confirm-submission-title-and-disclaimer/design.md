# Module Spec — `design.md`

Linked: `docs/specs/bugfix/confirm-submission-title-and-disclaimer/requirements.md`.

## 1. Summary

Two client-only fixes in `onecgiar-pr-client`: (1) after AI Review saves a title, refresh the shared `DataControlService.currentResult`/`currentResultSignal` — not just the section-local copy — so the Confirm Submission dialog shows the latest title; (2) replace the dialog's disclaimer string. No server, DB, or API change. Biggest trade-off accepted: reusing `CurrentResultService.GET_resultById()` costs one extra network round-trip on AI-Review-title-save (already the pattern used elsewhere in this same component), instead of hand-patching `currentResult.title` locally to avoid the round-trip.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:** `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts` (state-refresh trigger), `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/submission-modal/submission-modal.component.html` (copy).
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

Current (buggy):

```
[User accepts AI-suggested title]
  └── AiReviewService.POST_saveSession()
        └── notifySectionChanged()
              └── generalInformationSaved.update()  (signal bump)
                    └── RdGeneralInformationComponent effect
                          └── getSectionInformation() → LOCAL generalInfoBody only
[User clicks Submit]
  └── submission-modal reads dataControlSE.currentResult.title  → STALE
```

Fixed:

```
[User accepts AI-suggested title]
  └── AiReviewService.POST_saveSession()
        └── notifySectionChanged()
              ├── generalInformationSaved.update()  (unchanged — section still refreshes its own form)
              └── currentResultSE.GET_resultById()  (NEW — refreshes dataControlSE.currentResult/currentResultSignal)
[User clicks Submit]
  └── submission-modal reads dataControlSE.currentResult.title  → CURRENT
```

## 3. Data Model Changes

None. No entities, no migrations.

## 4. API Surface

None. No new/changed endpoints. `CurrentResultService.GET_resultById()` already exists and is already called from this same section elsewhere in the codebase.

## 5. Server Workflow / Business Rules

Not applicable — client-only fix.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. Touches `pages/results/pages/result-detail/components/submission-modal/` (template only) and `shared/services/api/ai-review.service.ts` (logic).

### 6.2 Components & services

- `AiReviewService.notifySectionChanged()` (`ai-review.service.ts:391-396`): inject `CurrentResultService` and call `this.currentResultSE.GET_resultById()` unconditionally inside this method — it already only fires on a successful `POST_saveSession`/`PATCH_saveDacScore`, i.e. only after a real result mutation, so gating it further by field name is unnecessary complexity for a Lite bugfix.
- `submission-modal.component.html:13-14`: replace the disclaimer sentence with the exact approved copy. No binding/logic change — the title interpolation (`{{ this.dataControlSE?.currentResult?.title }}`) is already correct once the underlying state is fresh; it does not need to change.
- No new component, no new service.

### 6.3 Design system usage

No visual/token change — text-only edit inside an existing template, no new UI states.

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

No change — reuses an existing authenticated GET already called from this component tree.

## 8. Performance & Capacity

One additional `GET /api/results/{id}` call, only on the AI-Review-title-save path (not on every keystroke or every save). Acceptable per `SUB-R-1`'s NFR. `GET_resultById()` briefly sets `currentResultSignal` to `{}` before repopulating it (`current-result.service.ts:37`) — same flash already accepted elsewhere in the app for this call; not a new regression, but called out for the manual browser check in tasks.

## 9. Observability

No new logs needed — errors from `GET_resultById()` already surface via its existing error handler (`alertsFe.show(...)`, `current-result.service.ts:78`).

## 10. Testing Plan (forward-looking)

- Cypress E2E: drive AI Review accept-title → open Confirm Submission → assert dialog shows the new title (the regression test, red before fix / green after).
- Existing unit specs (`ai-review.component.spec.ts`, any `rd-general-information` specs touching `generalInformationSaved`) re-run to confirm no regression to the section-local refresh path.
- Manual browser check (per `onecgiar-pr-client/CLAUDE.md` §9): confirm the brief `currentResultSignal` blank flash during AI-Review-title-save doesn't visibly disrupt header/breadcrumb.

## 11. Backwards Compatibility & Migration Plan

Purely additive client behavior; no contract change; no flag needed; nothing to backfill.

## 12. Design Decisions (ADRs)

### `SUB-DD-1` — Refresh via `CurrentResultService.GET_resultById()` instead of patching `currentResult.title` locally

- **Context:** The shared title state needs to reflect the AI-Review-saved title without waiting for an unrelated full reload.
- **Decision:** Call the existing, already-trusted `GET_resultById()` refresh from `notifySectionChanged()`.
- **Alternatives considered:** (a) Patch `dataControlSE.currentResult.title` directly from the applied proposal's `new_value` — cheaper (no network round-trip) but duplicates knowledge of the proposal payload shape and risks drifting if that shape changes; (b) Switch the modal to read `currentResultSignal()` and make it the single write target everywhere — a larger unification refactor, out of scope for a bugfix.
- **Consequences:** One extra GET per AI-Review-title-save; reuses proven code path; no duplicated title-shape knowledge.
- **Step 2.3 reversion challenge:** This DD does not revert any already-delivered behavior — `notifySectionChanged()` keeps its existing `generalInformationSaved` bump untouched and only adds a call. No challenge needed.

### `SUB-DD-2` — Disclaimer copy stays a hardcoded string, not promoted to a `TermKey`

- **Context:** All new user-facing strings should go through `internationalization/`, but this string was already hardcoded English before this fix, consistent with the rest of this component's copy.
- **Decision:** Replace the string in place; do not introduce a new `TermKey` for it.
- **Alternatives considered:** Promoting it to a `TermKey` now — rejected as scope creep for a bugfix whose defect is the wording, not the i18n mechanism; the surrounding sentence and every other string in this same dialog are equally hardcoded.
- **Consequences:** No new i18n debt introduced; existing i18n debt in this component is unchanged.

## 13. Open Gaps & Follow-ups

- `SUB-OQ-1` (carried from `requirements.md`): whether to also fix the IPSR submission modal's identical disclaimer sentence in the same PR. Recommendation: yes, as a second one-line change to `ipsr-submission-modal.component.html`, since it is the same exact string and zero-risk; but it is a *different* file with a *different* title source, so it does not affect Task confirm-submission-title-and-disclaimer-T-1's scope or verification. Confirmed with the user before task execution (see `tasks.md`).
- No other known gaps.

## Design Budget (Step 2.4)

- **Expected tasks:** 2 (fix + regression test).
- **Expected LOC:** ~15-25 (one `if`/method-call addition in `ai-review.service.ts`, one sentence swap in one or two HTML templates, one new Cypress spec file).
- **Expected review rounds:** 1.
- Depth **Lite** is correctly sized — this does not warrant Standard/Full; if `/akili-execute` finds itself touching more than these two files plus one new test file, or more than ~40 LOC total, it should stop and escalate rather than expand silently.

## Required cross-references

- `docs/specs/bugfix/confirm-submission-title-and-disclaimer/requirements.md` (same folder).
- `docs/specs/bugfix/confirm-submission-title-and-disclaimer/proposal.md` — Bug Diagnosis, Approach Options, Recommended Approach (this design implements Option 1 from the proposal).
