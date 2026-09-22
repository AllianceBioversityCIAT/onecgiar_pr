## Context

`ResultSectionsService.showAiReview` (`result-sections.service.ts:221-224`) is the single live rule
that renders the AI Review button — the legacy `panel-menu.component.html` still declares one but no
template instantiates `<app-panel-menu>` any more, so it is dead code and stays untouched. The rule
reads `r.result_type_id != 6 && r.status_id == 1 && !rolesSE.readOnly`; `6` is
`ResultTypeEnum.KNOWLEDGE_PRODUCT` (`onecgiar-pr-server/src/shared/constants/result-type.enum.ts:7`,
mirrored client-side by `DataControlService.isKnowledgeProduct`, `data-control.service.ts:204`).

The dialog's data flow, all inside `AiReviewService.onAIReviewClick()` (`ai-review.service.ts:155`):

1. `POST /api/ai/sessions` → session id.
2. `GET /v2/api/results/ai/context?resultId=` → `aiContext()`, the metadata sent to the AI.
3. `GET /api/ai/result-context/{id}` → `currnetFieldsList()`, the *editable text fields*
   (title, description, + `short_title` for Innovation Development only — server side
   `AiService.getResultContext`, `ai.service.ts:122-152`).
4. In parallel: `GET /api/ai/result-context/dac-scores/{id}` and `POST {reviewApiUrl}prms-qa`.
5. `json_content.impact_area_scores` enriches the DAC scores → `dacScores()` (the Impact Areas half
   of the dialog); `json_content.new_title` / `new_description` / `short_name` fill the text-field
   half; `POST /api/ai/sessions/{id}/proposals` persists the text proposals.

The template (`ai-review.component.html`) already renders the two halves independently: a `@for` over
`currnetFieldsList()` and a separate `IMPACT AREAS` block over `dacScores()`. An empty
`currnetFieldsList()` therefore renders the Impact Areas half alone, with no template change.

## Goals / Non-Goals

**Goals:**
- Knowledge Products get the AI Review button under the same gating as every other type.
- For a Knowledge Product the dialog neither requests nor persists title/description proposals.
- Zero behavioural change for any other result type.

**Non-Goals:**
- Changing what the external `prms-qa` service returns. Santiago Sanchez validated on 2026-01-14 in
  P2-2385 that it already emits only `impact_area_scores` for KPs; the client change makes that
  independent of the AI's behaviour instead of relying on it.
- Any server change. Verified unnecessary (see proposal).
- Touching the access-rights gap raised in P2-3110 — `showAiReview` already honours
  `RolesService.readOnly` since P2-3558, so a view-only user does not get the button.
- Reviving or editing the dead `panel-menu` component.

## Decisions

**D1 — Drop the type filter instead of listing the allowed types.**
`showAiReview` becomes `r.status_id == 1 && !readOnly`. Alternative considered: an allow-list of
result types. Rejected: every type is now allowed, so an allow-list is a maintenance trap that
silently hides the button for any future type.

**D2 — Enforce "Impact Areas only" in the service, not in the template.**
`onAIReviewClick()` branches once on `dataControlSE.isKnowledgeProductSignal()`: for a KP it skips
step 3 (`GET_resultContext`), sets `currnetFieldsList` to `[]`, and skips the
`POST_createProposal` of step 5. Alternatives considered: (a) `@if` in the template — rejected,
because the proposals would still be generated and written to `ai_review_proposal` for a KP, which
AC "Prevent any AI suggestion or override attempt for title and description" forbids; (b) filtering
on the server — rejected, out of scope and the endpoint is shared. Using the *signal* (not the
`currentResult` getter) keeps the type and the `id` used two lines below reading the same object.

**D3 — The AI still receives the full result metadata.**
`GET_aiContext` is unchanged: title and description are the AI's *input* for judging impact areas.
Withholding them would degrade the only output the KP is allowed to receive.

## Risks / Trade-offs

- [The impact-area half is empty for a KP whose DAC tags are all null] → Not a regression: the five
  cards always render (`AiService.getDacScores` returns all five with `tag_id: null`), and the AI
  recommendation text is what the reporter acts on. Verified on prtest results 12015 / 12008.
- [A future result type also needs the "impact areas only" treatment] → The branch is one named
  boolean in one method; extending it is a one-line change.
- [`currnetFieldsList` is a root-service signal shared across results] → Setting it to `[]` on the
  KP path is what prevents a previously opened non-KP result's cards from leaking into a KP dialog.

## Migration Plan

None — no data, no schema, no API. Rollback is `git revert` of the two files.

## Open Questions

None blocking.
