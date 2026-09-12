# Module Spec — `requirements.md`

## 1. Module / Feature

- **Module:** `results` (Result Detail — Confirm Submission dialog)
- **Sub-feature:** `confirm-submission-title-and-disclaimer` (bugfix)
- **Owner:** santiago.sanchez@cgiar.org
- **Status:** approved
- **Depth:** Lite (Bug Mode)
- **Ticket(s):** none yet — reported via email "RE: More testing in PRMS - things to solve"

## 2. Context

The "Confirm submission" dialog (`submission-modal.component.html`, Result Detail) shows the result's title and a disclaimer right before a submitter locks in a submission. Confirmed root cause (see `proposal.md` → Bug Diagnosis): `AiReviewService.notifySectionChanged()` (`ai-review.service.ts:391-396`) only refreshes `RdGeneralInformationComponent`'s section-local `generalInfoBody`, never `DataControlService.currentResult`/`currentResultSignal` — the state the modal actually reads (`submission-modal.component.html:13`). So an AI-Review-accepted title is saved server-side correctly but the dialog keeps showing the pre-AI-review title. Separately, the disclaimer's static copy is factually wrong (implies no changes are ever possible again, when QA-stage edits remain possible).

Touches `docs/trd/trd.md` W2 (submission workflow) conceptually; no server/API/data-model change.

## 3. In Scope / Out of Scope

### In scope

- Refresh the shared result title state (`DataControlService.currentResult` / `currentResultSignal`) whenever the AI Review flow saves a title change, so any consumer reading it — including the Confirm Submission dialog — shows the latest value without requiring an unrelated reload.
- Replace the Confirm Submission disclaimer text in `submission-modal.component.html`.
- Applies uniformly to every result type that renders `rd-general-information` (Innovation, Policy, Capdev, Knowledge Product, Innovation Use), since Title is a shared general-information field.

### Out of scope

- The IPSR submission modal (`ipsr-submission-modal.component.html`) and its `ipsrDataControlSE.detailData.title` source — separate state container, not touched by this AI Review path. (Copy-only parity for its identical disclaimer sentence may be requested separately; not bundled here to keep this bugfix scoped to one root cause.)
- Any change to AI Review's proposal/accept UX, DAC score flow, or backend endpoints.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees the correct, up-to-date title and an accurate disclaimer in the Confirm Submission dialog after using AI Review. |

## 5. User Stories

- **`SUB-US-1`** — As a result submitter who just accepted an AI-suggested title, I want the Confirm Submission dialog to show that new title, so that I'm not confused about what I'm submitting.
- **`SUB-US-2`** — As a result submitter, I want the submission disclaimer to accurately describe when changes are still possible, so that I don't mistakenly believe the result is permanently locked.

## 6. Functional Requirements

### Required (MUST)

- **`SUB-R-1`** WHEN the AI Review flow successfully saves a title change (`POST_saveSession` applying the `new_title` proposal, or any general-information save it triggers), the system MUST refresh `DataControlService.currentResult` / `currentResultSignal` so that `currentResult.title` reflects the newly saved value.
- **`SUB-R-2`** The Confirm Submission dialog (`submission-modal.component.html`) MUST render the value it reads from `DataControlService.currentResult.title` at the moment it is opened — i.e., MUST NOT read a value that predates the last successful title save.
- **`SUB-R-3`** The Confirm Submission dialog's disclaimer text MUST read exactly: "Please note that further changes to this result can only be made during the QA process."

### Defect classes this spec can produce → gate

| Defect class | Catching command / check |
|---|---|
| Shared title state not refreshed after AI Review save (regression of the exact bug) | Cypress E2E regression test (Task confirm-submission-title-and-disclaimer-T-2) driving the real AI Review → Submit flow |
| Disclaimer copy drifts from the exact approved string | Jest snapshot/text assertion on `submission-modal.component.html` rendered output (Task confirm-submission-title-and-disclaimer-T-1) |
| Fix breaks the existing DAC-score / general-information refresh path | Existing `ai-review.component.spec.ts` and `rd-general-information` specs re-run as part of the fix task |

No class here is visual-only or unmeasurable — this is state-plumbing plus a string constant, both directly assertable. No accepted-risk gap.

#### Scenario: AI Review title accepted, then Submit is clicked

- GIVEN a result with a manually-entered title, open in Result Detail → General Information
- WHEN the user runs AI Review and accepts the AI-suggested title
- AND the user then clicks Submit to open the Confirm Submission dialog
- THEN the dialog's title text matches the AI-suggested title, not the original manual one
- AND the disclaimer reads "Please note that further changes to this result can only be made during the QA process."
- BUT the dialog must NOT trigger an extra full-result reload flash that blanks unrelated header content for more than the duration of the existing `GET_resultById()` round-trip (no new blank state introduced beyond what that call already causes)

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | The added refresh reuses the existing `CurrentResultService.GET_resultById()` call pattern (already used elsewhere in this component) — no new endpoint, negligible added latency (one extra GET only on AI-Review-title-save, not on every keystroke). |
| **Backwards compatibility** | Purely additive client-side state refresh + string copy change; no API/DTO change. |
| **Internationalization** | The disclaimer string is currently hardcoded English in the template, matching the existing pattern in this component (not currently a `TermKey`). This fix does not introduce a new i18n gap beyond what already exists; promoting it to a `TermKey` is out of scope. |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `SUB-AC-1` | A result open in Result Detail with a manually-entered title | The user accepts an AI-Review-suggested title, then opens Confirm Submission | The dialog shows the AI-suggested title |
| `SUB-AC-2` | The Confirm Submission dialog is open, for any result type (Innovation, Policy, Capdev, etc.) | The dialog renders | The disclaimer reads exactly "Please note that further changes to this result can only be made during the QA process." |

Cross-cutting project ACs that already apply: `AC-2` Submission workflow.

## 9. Dependencies & Assumptions

### Upstream dependencies

- `AiReviewService` (`onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`)
- `CurrentResultService` (`onecgiar-pr-client/src/app/shared/services/current-result.service.ts`)
- `DataControlService` (`onecgiar-pr-client/src/app/shared/services/data-control.service.ts`)

### Downstream consumers

- `submission-modal.component.html` (this fix's direct target)
- Any other consumer of `DataControlService.currentResult`/`currentResultSignal` (result header, breadcrumb) benefits incidentally from the same refresh — no behavior change expected for them since they already re-render on that signal.

### Assumptions

- `CurrentResultService.GET_resultById()` is the correct, already-trusted mechanism to refresh `currentResult` (confirmed by its existing use at `rd-general-information.component.ts:437`).

## 10. Open Questions

- `SUB-OQ-1` — Should the IPSR submission modal's identical disclaimer sentence be corrected in this same PR for copy consistency? (Recommended yes, deferred to task-level scope confirmation — see `design.md`.)

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/prd.md` — general submission workflow (`AC-2`).
- `docs/trd/trd.md` — W2 submission workflow (conceptual reference; no change).
- `docs/specs/bugfix/confirm-submission-title-and-disclaimer/proposal.md` — Bug Diagnosis (source of the confirmed root cause).
