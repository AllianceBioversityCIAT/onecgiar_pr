## Context

PRMS Result Detail has **two independent validation layers** (see `onecgiar-pr-client/src/CLAUDE.md` §21.5):

1. **Layer 1 — client-side mandatory feedback (this change).** `result-detail.component.ts` calls `DataControlService.someMandatoryFieldIncompleteResultDetail('.section_container')` on every `ngDoCheck`, scanning the open section DOM for `.pr-field.mandatory` elements that lack a `.complete` class (and empty `.pr-input.mandatory .input-validation`). Each match pushes its `.pr_label` text into `fieldFeedbackList`, which the save button renders as "N alerts / `<label>` is missing".
2. **Layer 2 — backend green check.** The gray/green section indicator comes from `green_checks` fetched by `green-checks.service.ts` (P25 uses the v2 endpoint). Frontend only paints it.

A scannable `.pr-field.mandatory` is emitted by exactly two things: the **`appFeedbackValidation` directive** (`shared/directives/feedback-validation.directive.ts`), and `app-pr-select [required]`. A bare `<p-select>` or `app-pr-radio-button` never emits a marker — flipping `app-pr-field-header [required]` only paints the asterisk. That is the root cause of P2-3060: the three affected fields render the asterisk but emit no scannable marker.

The Innovation Development component `anticipated-innovation-user` already implements the correct pattern (`<div appFeedbackValidation labelText="…" [isComplete]="checkAlert()">`, line 16 + `checkAlert()` in its `.ts`). This change ports that pattern to the fields that are missing it.

## Goals / Non-Goals

**Goals:**
- Field 1 & Field 2 emit a scannable mandatory marker so an empty required field shows a "… is missing" alert in the save-button counter, and clears when filled.
- Reuse the existing `appFeedbackValidation` directive — no new mechanism, no new dependency.
- Completeness condition of each alert mirrors the real completeness rule so the alert clears exactly when the field is genuinely satisfied.

**Non-Goals:**
- No backend / green-check changes. The backend green-check queries are read only, for parity of the completeness condition.
- Field 3 ("Evidence of user need/user demand") is **not implemented** here — held pending QA confirmation.
- No redesign of the Innovation forms; minimal, incremental additions only.

## Decisions

- **Use `appFeedbackValidation` over `app-pr-select [required]`.** The affected controls are radio buttons / custom widgets, not selects, so the directive is the right tool (same choice made for P2-2960 lead fields and for `anticipated-innovation-user`). Alternative (converting controls to `app-pr-select`) rejected: it would change the UI and the control semantics.
- **Field 1 completeness rule = mirror of `anticipated-innovation-user.checkAlert()`:** complete when `innov_use_to_be_determined` is set OR there is ≥1 active actor / organization / measure. Rationale: the two components are functional twins; keeping the same rule avoids divergence. Note the backend green-check for the "current core" section is stricter (requires actor AND org AND measure simultaneously); we deliberately mirror the sibling **front** component's OR rule for consistency within the client, and flag the AND/OR discrepancy as an open question rather than silently matching the backend (which would change perceived UX from the twin section).
- **Field 2 completeness rule:** complete when the team-diversity question has a selected value (`options.innovation_team_diversity.radioButtonValue` truthy). The label text for the alert comes from the question metadata (`question_text`).
- **Placement of the marker `<div>`:** immediately inside the section's `paddingLeft20` wrapper, adjacent to the control, matching the sibling implementation so the DOM scan (scoped to `.section_container`) picks it up.

## Risks / Trade-offs

- [Field 1 AND-vs-OR mismatch with backend green check] → The alert may clear (OR rule) while the backend still withholds the green check (AND rule). Mitigation: mirror the sibling front component for now; raise the discrepancy as an open question for the team — resolving it may be a separate backend ticket (Juanda's area).
- [`ngDoCheck` scan cost] → The alert recomputes each change-detection cycle. Adding one more marker is negligible (the scan already runs); no new perf concern.
- [Field 2 metadata dependency] → The label/value come from `options.innovation_team_diversity` served by the backend; if that payload is absent the alert simply won't render (fails safe, no crash). Guard with optional chaining.

## Migration Plan

- Pure client change; deploy via the normal client build. No data migration, no rollback steps beyond reverting the commit.

## Open Questions

- **Field 3 (Evidence of user need/user demand):** expected alert behavior — awaiting Santi (QA) over Slack. Blocks only Field 3.
- **Field 1 AND vs OR:** should the front alert match the backend green-check's stricter AND condition, or the sibling front component's OR condition? Proceeding with OR (front consistency); to confirm with the team.
