# Proposal — Innovation Team Diversity question never counted as a missing field

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `innovation-team-diversity-missing-alert` — literal name given by reporter (core intent: missing "field missing" alert for the Innovation team diversity question) |
| Spec Path | `docs/specs/bugfix/innovation-team-diversity-missing-alert/` |
| Type | **Bug** |
| Approval Mode | `gated` (default) |
| Ticket(s) | none provided |
| Status | draft — root cause confirmed by prior investigation in this session |

---

## 2. Intent

The mandatory question 112 — *"Innovation team diversity: Have concrete actions been taken to promote diversity in the composition of the CGIAR and partner innovation team?"* — must be counted by the section's "N fields missing" alert and its "STILL MISSING" popup whenever it is left unanswered, exactly like its sibling questions in the same Innovation Development section already are.

---

## 3. Problem / Current Behavior

Reported at `http://localhost:4200/result/result-detail/9029/innovation-dev-info?phase=36`: the "STILL MISSING" popup lists 3 other unanswered fields but never lists Innovation team diversity, even when it has no answer.

### 3.1 Bug Diagnosis

#### Observed Symptom
Leaving the Innovation team diversity question (question 112) unanswered does not add it to the section's missing-fields alert/count, unlike other unanswered mandatory questions in the same section.

#### Reproduction Steps
1. Open an Innovation Development result whose Innovation team diversity question (question 112) has never been answered (e.g. result 9029, phase 36).
2. Open the "STILL MISSING" popup from the section's bottom bar.
3. Observe: the popup lists other missing fields but never lists Innovation team diversity, and the "N fields missing" count does not include it.

#### Root Cause (confirmed)
The missing-fields alert is driven by `DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')` (`onecgiar-pr-client/src/app/shared/services/data-control.service.ts`), which scans the section DOM for elements carrying `.pr-field.mandatory` (without `.complete`) or the hidden marker rendered by the `appFeedbackValidation` directive (`shared/directives/feedback-validation.directive.ts`).

Every sibling question in the same "responsible innovation and scaling" family — `gesi-innovation-assessment`, `scale-impact-analysis`, `partners-policies-safeguards`, `assumptions-examination` (all in `.../innovation-dev-info/components/`) — exposes:
- an `isComplete` getter in its `.component.ts`, and
- `<div appFeedbackValidation labelText="<question text>" [isComplete]="isComplete"></div>` in its `.component.html`,

which is what makes the DOM scannable and countable.

`innovation-team-diversity.component.ts` / `.component.html` has **neither**: no `isComplete` getter and no `appFeedbackValidation` directive anywhere in its template (confirmed by reading both files in full). `app-pr-radio-button` and `app-pr-field-header` on their own emit no scannable `.pr-field.mandatory` marker for this control (per `onecgiar-pr-client/src/CLAUDE.md` §21.5 point 3 — `pr-radio-button`'s visual "Mandatory" marker is a separate, non-scanned layer). The question is therefore structurally invisible to the scan regardless of whether it has an answer.

#### Impact & Scope
- Affects every Innovation Development result, every phase, whenever the Innovation team diversity question (question 112) is unanswered — submitters can save/submit the section without ever being told this question is outstanding.
- Confined to this one component; the sibling components already use the correct, tested pattern, so the fix is a like-for-like replication, not new design.
- No backend, DTO, or migration change — `innovation_team_diversity` already round-trips `radioButtonValue` correctly; only the client-side completeness wiring is missing.

#### Fix Strategy
Not cosmetic (adds a completeness computation consumed by validation logic) → routes to `/akili-specify` (Lite) in Bug Mode with a regression test (red before fix, green after) that:
- asserts the field is flagged as missing/incomplete when `innovation_team_diversity['radioButtonValue']` is unset, and
- asserts it is flagged as complete once a value is selected.

---

## 4. Proposed Outcome

When Innovation team diversity (question 112) is left unanswered, it appears in the section's "STILL MISSING" popup and is included in the "N fields missing" count — consistent with `gesi-innovation-assessment`, `scale-impact-analysis`, `partners-policies-safeguards`, and `assumptions-examination`. Once answered, it drops out of both.

---

## 5. Scope

### In scope
- Add an `isComplete` getter to `innovation-team-diversity.component.ts`, mirroring the sibling pattern: complete when `options?.innovation_team_diversity?.['radioButtonValue']` is set. Unlike `gesi-innovation-assessment`/`scale-impact-analysis`, this question has no "why"/`answer_text` follow-up branch in its template today, so the getter does not need one — confirm this during `/akili-specify` by checking whether any sub-option here also requires a free-text answer to count as complete.
- Add `<div appFeedbackValidation labelText="..." [isComplete]="isComplete"></div>` to `innovation-team-diversity.component.html`, using the question's own text as the label (mirroring how siblings phrase `labelText` as the question, not a generic name).
- Regression test for the new completeness behavior.

### Out of scope
- `intellectual-property-rights` — CLAUDE.md for this section already flags it as having "❌ none" phase gate and, like Innovation team diversity, no `appFeedbackValidation` wiring today. Not reported by the user; not touched here to keep this fix bounded. Worth a follow-up ticket if confirmed to have the same defect.
- Any change to the question's visual layout, wording, or the underlying `checkboxConfig`/`subOptions` hierarchy (question 112, 3 levels) — data and rendering are correct today; only completeness tracking is missing.
- The server-side "green check" (`validate_sections_mapped_batch` / `validation_innovation_dev_P25`) — unrelated; this is the client-side field-level alert only.

---

## 6. Non-Goals

- No backend/entity/migration changes.
- No change to `InnovationDevInfoUtilsService.mapBoolean` / `mapRadioButtonBooleans` restore logic — those already work correctly for this field per the section's own `CLAUDE.md`.

---

## 7. Affected Users, Systems, And Specs

| Item | Detail |
|---|---|
| Persona | Result submitter (Innovation Development results) |
| Client component | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/innovation-team-diversity/innovation-team-diversity.component.ts` |
| Client template | `.../innovation-team-diversity/innovation-team-diversity.component.html` |
| Module | `innovation-dev-info.module.ts` — `FeedbackValidationDirectiveModule` already imported, no module change needed |
| Backend | No change |
| Related specs | None found under `docs/specs/results/` or `docs/specs/bugfix/` for this section; sibling module `CLAUDE.md` at `.../innovation-dev-info/CLAUDE.md` documents the family this question belongs to and must be re-stamped per repo convention once the fix lands. |

---

## 8. Visual Reference

- Source: User-provided screenshot of the "STILL MISSING" popup (3 fields listed, Innovation team diversity absent).
- Location: Provided inline in the originating message; not persisted under this spec folder.
- Notes: Purely a completeness-tracking fix — no visual/layout change to the question itself.

---

## 9. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A — Replicate the sibling `isComplete` + `appFeedbackValidation` pattern (recommended)** | Add the getter and the directive, exactly matching `gesi-innovation-assessment`/`scale-impact-analysis`/`partners-policies-safeguards`/`assumptions-examination`. | Smallest, most literal fix; reuses an already-tested pattern in the same file family; no new abstractions. |
| B — Wrap the radio button in a generic mandatory-field directive at a higher level | Introduce a more generic completeness wrapper reusable across all "no none" questions in this section (including `intellectual-property-rights`). | Larger surface, touches components not reported as broken; better long-term consistency but out of proportion for this bug and risks scope creep into `intellectual-property-rights`. |

**Recommended: Option A.**

---

## 10. Risks, Dependencies, And Open Questions

- Open question (to resolve during `/akili-specify`): does question 112's sub-option hierarchy (3 levels, `checkboxConfig`) have any state that should also require a free-text answer to count as "complete", the way `gesi-innovation-assessment`'s "No actions taken yet" branch does? First read of the template shows no such branch, but confirm against real data before finalizing the getter.
- Dependency: none — pure client-side, no backend/migration work.
- Risk: low — change is additive (new getter + new directive usage) and localized to one component; existing sibling components already validate the pattern works with the scan. Verify the new `appFeedbackValidation` label doesn't duplicate/conflict with another field's `labelText` in the same section (the popup lists by label).
- Note `intellectual-property-rights` appears to share the same gap (see Scope) — flag for a separate ticket, do not fold into this one.

---

## 11. Success Criteria

- Leaving Innovation team diversity (question 112) unanswered adds it to the "STILL MISSING" popup and to the "N fields missing" count.
- Answering it removes it from both.
- No change in behavior for any other question in the Innovation Development section.
- Regression test added (red before fix, green after).

---

## 12. Next Step

```text
/akili-specify bugfix/innovation-team-diversity-missing-alert
```

in **Bug Mode** — converts this confirmed root cause into a fix plan and a mandatory regression test.
