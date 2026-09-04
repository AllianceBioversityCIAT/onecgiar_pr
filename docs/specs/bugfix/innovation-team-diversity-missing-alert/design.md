# Module Spec — Design: Innovation Team Diversity question never counted as missing

## 1. Summary

Add an `isComplete` getter to `InnovationTeamDiversityComponent` and wire it into a new `appFeedbackValidation` marker in its template — the exact pattern already used by every sibling question in this section (`gesi-innovation-assessment`, `scale-impact-analysis`, `partners-policies-safeguards`, `assumptions-examination`). This makes question 112 visible to `DataControlService.someMandatoryFieldIncompleteResultDetail`'s DOM scan, which today skips it entirely. Pure client-side, one component, no new module import needed (`FeedbackValidationDirectiveModule` already imported in `innovation-dev-info.module.ts`).

Linked: `requirements.md` `ITD-R-1..2`, `ITD-AC-1..3` in this folder.

**`ITD-OQ-1` resolved:** inspected `innovation-team-diversity.component.html` and the section's own mock fixture (`innovation-dev-info.component.spec.ts`, `mockGET_questionsInnovationDevelopmentResponse.innovation_team_diversity`) — question 112's options carry only `answer_boolean`/`subOptions`, no conditional free-text (`answer_text`) requirement anywhere in the template (unlike `gesi-innovation-assessment`'s "No actions taken yet" branch, which has an explicit `*ngIf="isNoActionsSelected"` text input). So completeness reduces to "a `radioButtonValue` is set" — no sub-answer branch to account for.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-dev-info/components/innovation-team-diversity/` only.
- **No server module touched** — question 112's answers already round-trip correctly (`ResultQuestionsService.findQuestionInnovationDevelopmentV2`); this is a client-side completeness-tracking addition only.
- **No external integration touched.**

### 2.2 Sequence (new: completeness now observable)

```
[innovation-dev-info.component.ts loads options.innovation_team_diversity]
  └── InnovationTeamDiversityComponent renders app-pr-radio-button (unchanged)
        └── NEW: isComplete getter reads options.innovation_team_diversity['radioButtonValue']
              └── NEW: <div appFeedbackValidation [isComplete]="isComplete"> renders .pr-field.mandatory[.complete]
                    └── DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')
                          scans it like any other mandatory field → fieldFeedbackList (signal)
                                └── section-bottom-bar "STILL MISSING" popup + "N fields missing"
```

---

## 3. Data Model Changes

None. No entity, DTO, or migration touched — `innovation_team_diversity` (client model `Innovationteamdiversity`, `InnovationDevelopmentQuestions.model.ts`) is unchanged in shape; `radioButtonValue` is already read/written by the existing template, only a new *read* (the `isComplete` getter) is added.

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `Innovationteamdiversity` | `.../innovation-dev-info/model/InnovationDevelopmentQuestions.model.ts` | No change. |

### 3.2 Migrations

None.

---

## 4. Extended Directory Structure

No new files.

```
onecgiar-pr-client/.../innovation-dev-info/components/innovation-team-diversity/
├── innovation-team-diversity.component.ts      # isComplete getter added here
├── innovation-team-diversity.component.html    # appFeedbackValidation div added here
└── innovation-team-diversity.component.spec.ts # regression tests added here
```

---

## 5. API Design

No API change.

---

## 6. Backend Module Design

Not touched.

---

## 7. Frontend / UX Component Architecture

**`InnovationTeamDiversityComponent`** (`innovation-team-diversity.component.ts`):

- Add a getter:
  ```
  get isComplete(): boolean {
    return !!this.options?.innovation_team_diversity?.['radioButtonValue'];
  }
  ```
  mirroring `GesiInnovationAssessmentComponent.isComplete`'s "no value yet → false" base case, without its "why" branch (not applicable here per §1).

**Template (`innovation-team-diversity.component.html`)** — append, after the existing `app-pr-radio-button` block:
  ```
  <div appFeedbackValidation
    labelText="Innovation team diversity - Have concrete actions been taken to promote diversity in the composition of the CGIAR and partner innovation team?"
    [isComplete]="isComplete"></div>
  ```
  `labelText` is prefixed with the field's short name (`Innovation team diversity - `) ahead of the question's plain sentence — per user feedback during PR review, the bare sentence (the sibling convention, e.g. `partners-policies-safeguards`'s `labelText`) read as ambiguous in the "STILL MISSING" popup without a field name attached. This is a deliberate, confirmed departure from the sibling convention for this one field; the siblings are unchanged.

No new component, no new input/output, no change to `app-pr-radio-button`, no change to `mapBoolean`/`mapRadioButtonBooleans` restore logic (already correct, per the section's own `CLAUDE.md` traps list — do not touch).

---

## 8. Shared Contracts or Package Extensions

None — `appFeedbackValidation` and `FeedbackValidationDirectiveModule` are pre-existing shared infrastructure, already imported in `innovation-dev-info.module.ts`; no module-level change needed.

---

## 9. Design Decisions

**`ITD-DD-1` — Reuse the sibling `isComplete` + `appFeedbackValidation` pattern, not a new mechanism.**
*Issue:* how to make question 112 visible to the section's DOM-based missing-fields scan. *Decision:* replicate the exact pattern already used by `gesi-innovation-assessment`, `scale-impact-analysis`, `partners-policies-safeguards`, `assumptions-examination` in the same folder — a component-level `isComplete` getter plus a hidden `appFeedbackValidation` marker div. *Alternatives considered:* (a) a generic higher-level "mandatory questionnaire wrapper" component covering every `❌ none`-gated question in the section (including `intellectual-property-rights`) — rejected as out of proportion for this bug and risks scope creep into a component not reported as broken (see `requirements.md` Out of Scope); (b) reusing `InnovationDevInfoUtilsService.isMegatrendsComplete` — rejected, that helper is shaped for a multi-checkbox "any answer_boolean true" question (Megatrends), not a single `radioButtonValue` selection; using it here would silently accept an unrelated completeness semantic. *Consequences:* zero new abstractions, fully consistent with 4 existing siblings, trivially reviewable by diffing against any of them.

This decision does not revert any already-delivered behavior (Step 2.3 not triggered) — it adds a missing completeness signal; nothing shipped is removed, disabled, or inverted.

### Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~10 (1 getter + 1 template block + regression tests) |
| Expected review rounds | 1 |

This matches **Lite** depth exactly — no downgrade or escalation needed.

---

## 10. Open Gaps & Follow-ups

- `intellectual-property-rights` appears to have the same gap (no `appFeedbackValidation` wiring for its q1..q4) — not in scope here; log as a follow-up bug if confirmed.

---

## Required cross-references

- `requirements.md` (this folder) — `ITD-R-1..2`, `ITD-AC-1..3`.
- `docs/trd/trd.md` §2 — `results` module.
- `onecgiar-pr-client/src/CLAUDE.md` §21.5 — field-level mandatory feedback mechanics (`appFeedbackValidation` directive, DOM scan).
- `.../innovation-dev-info/CLAUDE.md` — section-family context and traps (do not touch `mapBoolean`/`mapRadioButtonBooleans` guards).
