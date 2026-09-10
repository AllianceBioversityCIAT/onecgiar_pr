# Module Spec — Requirements: Innovation Development (P25) save fails with HTTP 500 from phase 2026

## 1. Module / Feature

- **Module:** `results-framework-reporting` (`innovation_dev` sub-module)
- **Sub-feature:** Save path for the Innovation Development section (P25 portfolio)
- **Owner:** Result submitter-facing bug
- **Status:** draft
- **Ticket(s):** none provided
- **Depth:** Lite · **Mode:** Bug

---

## 2. Context

Gap: `PATCH /v2/api/innovation-development/innovation-dev/create/result/:resultId` — the save endpoint behind the "Innovation Development" Result Detail section for P25 (`docs/ux-ui/design.md` §4 Result Detail, type-specific pages) — returns HTTP 500 for **every** result currently in reporting phase 2026 or later. This blocks submission-path work entirely for that population, which conflicts with `docs/prd.md` **AC-1** (typed result integrity: a submitter must be able to persist a typed result's own fields) and **AC-2** (submission workflow must not silently fail).

Entities/API touched (`docs/trd/trd.md` §2, `results-framework-reporting` module): `ResultsInnovationsDev` entity (unchanged), `result_questions` / `result_answers` (read/write via `saveOptionsAndSubOptions`, unchanged shape), `CreateInnovationDevDtoV2` (unchanged shape — the DTO itself is correct; the service code reading it is not null-safe).

See `proposal.md` in this folder for the full Bug Diagnosis (confirmed root cause, reproduction, live repro against phase-2026 result 9029/11497).

---

## 3. In Scope / Out of Scope

### In scope
- Backend fix so `saveInnovationDev()` tolerates a payload where `responsible_innovation_and_scaling.q4` (and, defensively, `intellectual_property_rights.q4`) is absent, without throwing.
- Regression test proving the exact failing shape now saves successfully.

### Out of scope
- Any frontend change — the client's read-side guards for this exact "q4 missing in 2026" shape are already correct (per `innovation-dev-info/CLAUDE.md`); only the backend write path is defective.
- The phase-based question catalog (`resolveScalingSlotsForPhase`, which questions exist per phase) — correct today, not touched.
- `innovation_team_diversity` / `megatrends` — single-question groups with no `q1..q4` sub-keys, not implicated.
- Any other Innovation Development sub-flow (evidence save, investment save, scaling-study URLs) — unaffected, not touched.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Can successfully save the Innovation Development section on a result in reporting phase 2026+ (currently impossible — every save attempt 500s). |
| QA reviewer | N/A — no reviewer-facing surface changes; QA can now review sections that previously could never be saved. |

---

## 5. User Stories

- **`IDEV-US-1`** — As a result submitter reporting an Innovation Development result in phase 2026 or later, I want my saved answers to persist without a server error, so that I can complete and submit the section. *(Refines US-S1, US-S2.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`IDEV-R-1`** When the save payload's `responsible_innovation_and_scaling` group has no `q4` key (the 2026+ payload shape), the system MUST save the section successfully (no 500) and MUST NOT attempt to write an answer for the absent `q4` slot.
- **`IDEV-R-2`** When the save payload's `intellectual_property_rights` group has no `q4` key, the system MUST save the section successfully (no 500) and MUST NOT attempt to write an answer for the absent `q4` slot — hardened defensively even though no confirmed case of this group losing a slot exists today.
- **`IDEV-R-3`** When the save payload includes all four sub-questions (`q1..q4`) for both groups — the pre-2026 shape — the system MUST continue to save and persist answers exactly as it does today (no behavior change for the unaffected case).

### Should (SHOULD)

- **`IDEV-R-10`** The fix SHOULD guard each `qN` slot the same way (`?.qN?.field`) rather than special-casing only `q4`, so a future phase that also drops `q1`, `q2`, or `q3` does not reintroduce the same class of defect.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Backwards compatibility** | MUST NOT change the request or response DTO shape, nor alter saved-answer behavior for any payload where all four sub-questions are present. |
| **Regression safety** | MUST NOT alter the evidence save (`_innoDevService.saveEvidence`), investment save, or scaling-study-URL save steps that run later in the same method — they are unaffected and must keep running when the guarded reads no longer throw. |
| **Error handling** | The existing outer `try/catch` in `saveInnovationDev()` (`returnErrorRes`) remains the safety net for genuinely unexpected errors; this fix removes one specific throw, it does not remove the catch. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `IDEV-AC-1` | A save payload shaped like the 2026+ questionnaire (`responsible_innovation_and_scaling.q4` absent, all other groups/keys present) | `saveInnovationDev()` is called | The call completes successfully (`status: HttpStatus.CREATED`, no thrown error), and no answer-save is attempted for the non-existent `q4` slot. |
| `IDEV-AC-2` | A save payload with `intellectual_property_rights.q4` absent (all else present) | `saveInnovationDev()` is called | The call completes successfully, same as `IDEV-AC-1`. |
| `IDEV-AC-3` | A save payload with all four sub-questions present for both groups (pre-2026 shape) | `saveInnovationDev()` is called | Behavior and persisted answers are identical to current passing tests — no regression. |

Cross-cutting project ACs that already apply (not restated): `AC-1` (typed result integrity), `AC-2` (submission workflow must not silently fail), `AC-9`.

---

## 9. Dependencies & Assumptions

### Upstream dependencies
- Frontend questionnaire payload shape for phase 2026+ (`innovation-dev-info.component.ts`, `result-questions.service.ts` `resolveScalingSlotsForPhase`) — unchanged, already correct; this fix only makes the backend tolerate its (correct) output.

### Downstream consumers
- None beyond this save path — `saveOptionsAndSubOptions` writes to `result_questions`/`result_answers`, not exposed in bilateral/platform-report payloads for this specific group.

### Assumptions
- The frontend's "q4 key absent from 2026" payload shape (documented in `onecgiar-pr-client/.../innovation-dev-info/CLAUDE.md`) is the actual, current, confirmed shape sent for phase-2026+ results — verified via live repro, not inferred.
- `saveOptionsAndSubOptions(resultId, user, radioButtonValue, options)` already handles `radioButtonValue == null` correctly (line ~484, `!= null` check); the only remaining defect is that `options` must never be `undefined` when passed in, since the method iterates it directly (`for (const optionData of options)`).

---

## 10. Open Questions

None — root cause is confirmed (proposal.md Bug Diagnosis), reproduced live, and the fix shape is unambiguous.

---

## 11. Defect Classes & Verification Mapping

| Defect class | Catching command/check |
|---|---|
| Unguarded `.q4.radioButtonValue` throwing on an absent slot (the bug itself) | Unit test (Jest) on `InnovationDevService.saveInnovationDev()` with a payload omitting `responsible_innovation_and_scaling.q4`, asserting it resolves without throwing. |
| Unguarded `.q4.options` being `undefined` and breaking the `for..of` in `saveOptionsAndSubOptions` | Same test — assert `saveOptionsAndSubOptions`/`_resultAnswerRepository` is not called with `undefined` options for the missing slot (or, more directly, assert no exception propagates and `save` completes). |
| Regression on the answered path (`q1..q4` all present) | Existing `saveInnovationDev` describe block already covers this shape (`buildInnovationDevQuestions()`); re-run unchanged and confirm still green. |
| Same defect class in `intellectual_property_rights.q4` | Second unit test, payload omitting `intellectual_property_rights.q4` only. |

---

## Required cross-references

- `docs/prd.md` — `AC-1`, `AC-2`.
- `docs/trd/trd.md` §2 — `results-framework-reporting` module.
- `proposal.md` (this folder) — confirmed root cause, live repro, Fix Strategy.
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/CLAUDE.md` — documents the frontend's "q4 key absent from 2026" payload shape this fix must tolerate.
