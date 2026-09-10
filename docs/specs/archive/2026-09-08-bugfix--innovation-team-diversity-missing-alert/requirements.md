# Module Spec — Requirements: Innovation Team Diversity question never counted as missing

## 1. Module / Feature

- **Module:** `results` (Result Detail → Innovation Development info section)
- **Sub-feature:** Innovation team diversity question (question 112, `innovation_team_diversity`)
- **Owner:** Result submitter-facing bug
- **Status:** draft
- **Ticket(s):** none provided
- **Depth:** Lite · **Mode:** Bug

---

## 2. Context

Gap: the mandatory question 112 — *"Have concrete actions been taken to promote diversity in the composition of the CGIAR and partner innovation team?"* — shown on the Innovation Development info section (`docs/ux-ui/design.md` §4 Result Detail) for Innovation Development results, is **never** counted by the section's "N fields missing" alert / "STILL MISSING" popup, even when left unanswered. This violates `docs/prd.md` **AC-6** in spirit: the question is a real questionnaire item the section should not let a submitter silently skip, yet the client-side completeness scan never sees it at all.

Entities/API touched (`docs/trd/trd.md` §2): none — `result_questions` / `result_answers` for question 112 already round-trip correctly server-side (`ResultQuestionsService.findQuestionInnovationDevelopmentV2`); this is a **client-only** completeness-tracking gap.

See `proposal.md` in this folder for the full Bug Diagnosis (confirmed root cause, reproduction).

---

## 3. In Scope / Out of Scope

### In scope
- Client-side fix so the Innovation team diversity question (question 112) is scannable by `DataControlService.someMandatoryFieldIncompleteResultDetail` — i.e. it participates in `fieldFeedbackList` / the "STILL MISSING" popup / the "N fields missing" count.
- A completeness (`isComplete`) definition for this question, consistent with how its sibling questions in the same section already define completeness.

### Out of scope
- `intellectual-property-rights` — appears to share the same gap (no `appFeedbackValidation` wiring), but was not reported and is not touched here. Flagged as a follow-up in `proposal.md` §5.
- Any change to the question's rendering, wording, options hierarchy (3 levels, `checkboxConfig`), or restore-from-save logic (`InnovationDevInfoUtilsService.mapBoolean`) — all already correct today.
- The server-side "green check" (`validate_sections_mapped_batch` / `validation_innovation_dev_P25`) — unrelated; this is the client-side field-level alert only.

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Result submitter | Sees Innovation team diversity listed in "STILL MISSING" / counted in "N fields missing" whenever it is unanswered, and sees it drop out of both once answered. |
| QA reviewer | N/A — no change to reviewer-facing surfaces; this is a client-side submitter-facing alert only. |

---

## 5. User Stories

- **`ITD-US-1`** — As a result submitter, I want the Innovation team diversity question to be flagged as missing when I haven't answered it, so that I don't accidentally save/submit the section with it blank. *(Refines US-S1, US-S5.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`ITD-R-1`** When `innovation_team_diversity['radioButtonValue']` has no value (unanswered), the system MUST count the Innovation team diversity question toward the section's "fields missing" list, exactly as its sibling questions (`gesi-innovation-assessment`, `scale-impact-analysis`, `partners-policies-safeguards`, `assumptions-examination`) already do.
- **`ITD-R-2`** When `innovation_team_diversity['radioButtonValue']` has a value (answered), the system MUST NOT count the Innovation team diversity question toward the "fields missing" list.

### Should (SHOULD)

- **`ITD-R-10`** The fix SHOULD use the same `isComplete` getter + `appFeedbackValidation` directive pattern already used by every sibling question in this section, rather than introducing a new completeness mechanism.

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Regression safety** | MUST NOT alter the question's rendering, options/sub-options hierarchy, restore-from-save (`mapBoolean`) behavior, or any other question in the Innovation Development section. |
| **Backwards compatibility** | MUST NOT change the PATCH payload shape for `innovation_team_diversity` — the fix is read/display-side completeness tracking only. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ITD-AC-1` | An Innovation Development result whose question 112 (`innovation_team_diversity.radioButtonValue`) has never been answered | The section's missing-fields alert is evaluated | Innovation team diversity appears in the "STILL MISSING" popup and is included in the "N fields missing" count. |
| `ITD-AC-2` | Same result, but question 112 was answered (any option selected) | The section's missing-fields alert is evaluated | Innovation team diversity does NOT appear in "STILL MISSING" and is not included in the count. |
| `ITD-AC-3` | Same result, any other question in the section (e.g. `gesi-innovation-assessment`) | The section's missing-fields alert is evaluated | Behavior for that question is unchanged (no regression from this fix). |

Cross-cutting project ACs that already apply (not restated): `AC-1`, `AC-6` (evidence/required-field integrity), `AC-9`.

---

## 9. Dependencies & Assumptions

### Upstream dependencies
- `FeedbackValidationDirectiveModule` (`shared/directives/feedback-validation-directive.module.ts`) — already imported in `innovation-dev-info.module.ts`; no module change needed.
- `DataControlService.someMandatoryFieldIncompleteResultDetail` — the scan mechanism itself is unchanged; this fix only makes the question visible to it.

### Downstream consumers
- None — question 112's completeness is consumed only by this section's own "fields missing" alert.

### Assumptions
- Question 112 (`innovation_team_diversity`) has no "why"/free-text follow-up branch requiring a sub-answer to count as complete — confirmed by reading `innovation-team-diversity.component.html` in full (no conditional text-input block, unlike `gesi-innovation-assessment`'s "No actions taken yet" branch). To be re-confirmed against real saved data during design/implementation.

---

## 10. Open Questions

- `ITD-OQ-1` — Does any sub-option in question 112's 3-level `checkboxConfig` hierarchy require a free-text answer to count as complete (mirroring `gesi-innovation-assessment`'s pattern)? Current template inspection shows no such branch; resolve by inspecting real question-112 data before finalizing the `isComplete` getter in `design.md`.

---

## 11. Defect Classes & Verification Mapping

| Defect class | Catching command/check |
|---|---|
| Question never scanned as missing (the bug itself) | Unit test (Jest) on `InnovationTeamDiversityComponent.isComplete` asserting it returns `false` when `radioButtonValue` is unset. |
| Question incorrectly stays flagged as missing after being answered | Same test file, asserting `isComplete` returns `true` once `radioButtonValue` is set. |
| Regression on sibling questions in the same section | Not touched by this fix — no new test needed beyond confirming existing `innovation-dev-info.component.spec.ts` suite stays green. |
| Visual confirmation that the "STILL MISSING" popup actually lists the field | Not covered by Jest (the popup reads a DOM scan across the whole section, not just this component in isolation) — accepted as a **manual browser check** during PR review (load a fresh Innovation Development result, leave question 112 unanswered, confirm it appears in the popup), recorded as an accepted gap rather than an automated gate. |

---

## Required cross-references

- `docs/prd.md` — `AC-6` (required-field integrity).
- `docs/ux-ui/design.md` §4 (Result Detail screen inventory).
- `docs/trd/trd.md` §2 (Domain modules) — `results` module.
- `onecgiar-pr-client/src/CLAUDE.md` §21.5 (field-level mandatory feedback: DOM scan mechanics, `appFeedbackValidation` directive).
- `proposal.md` (this folder) — confirmed root cause.
