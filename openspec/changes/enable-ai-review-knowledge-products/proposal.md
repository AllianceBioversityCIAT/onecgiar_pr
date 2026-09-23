## Why

The AI Review action is hidden for Knowledge Product (KP) results because a KP's title and
description are auto-synced from CGSpace and must not be overridden by an AI proposal. Reporters of
KPs therefore get no AI support at all — including for the Impact Area (DAC) tags, which they DO
own and edit by hand. Jira: **P2-2385** (parent P2-2292 "AI Assistant - Improvements").

## What Changes

**Frontend-only.** No backend change is required: the two endpoints the dialog needs already answer
`200` for Knowledge Products in prtest (`GET /api/ai/result-context/dac-scores/{id}` and
`GET /v2/api/results/ai/context?resultId={id}`, verified on results 12015 and 12008), and
`AiService.getDacScores` (`onecgiar-pr-server/src/api/ai/ai.service.ts:599`) has no result-type
branch.

- Remove the `result_type_id != 6` exclusion from the rule that renders the AI review button
  (`ResultSectionsService.showAiReview`), so KPs get the button under exactly the same
  status / read-only / green-check gating as every other result type.
- For Knowledge Products only, the AI Review dialog offers **Impact Areas recommendations only**:
  the title / description proposal cards are neither requested (`GET /api/ai/result-context/{id}`)
  nor persisted (`POST /api/ai/sessions/{id}/proposals`).
- No change to any other result type: Innovation Development keeps its `short_title` card and every
  other type keeps title + description.
- Add spec coverage for the button rule and for the KP branch of the dialog's data flow.

## Capabilities

### New Capabilities
- `ai-review-knowledge-products` — who sees the AI Review button and what the dialog may offer for
  a Knowledge Product.

### Modified Capabilities
<!-- none: no existing spec under openspec/specs/ describes the AI Review gating today -->

## Impact

- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/result-sections-sidebar/result-sections.service.ts`
  (`showAiReview`) + its spec.
- `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts` (`onAIReviewClick`) + its spec.
- No server file, no migration, no `validation_*` function, no Dockerfile.
- SDD baseline: `docs/prd.md` (AI assistant scope), `docs/ux-ui/design.md` (result-detail sidebar
  actions), `docs/trd/trd.md` (client/server contract for `src/api/ai/**`).
