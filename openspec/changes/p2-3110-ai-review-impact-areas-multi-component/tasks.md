## 1. Client — data model and service (`ai-review.service.ts`)

- [x] 1.1 In `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts`, change `DacScores.impact_area_id` from `string | null` to `number[]`.
- [x] 1.2 Add a private normaliser in the same service that turns the API value (`null`, a scalar id, or a list) into `number[]`, and apply it inside `enrichDacScoresWithAIRecommendations` so the signal always holds arrays (design D2).
- [x] 1.3 Update `PATCH_saveDacScore` so the payload carries `impact_area_id` as a list, and keep `change_reason` / `session_id` untouched.
- [x] 1.4 Keep the initial `is_validated` computation (AI `approved`) but expose the per-card "user persisted a change in this session" flag the badge rule needs (design D4).

## 2. Client — component logic (`ai-review.component.ts`)

- [x] 2.1 In `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.ts`, rewrite `onComponentChange` to toggle the id in `dacScore.impact_area_id` (add if absent, remove if present) and set `canSave = true`.
- [x] 2.2 Add an `isComponentSelected(dacScore, componentId)` helper for the template binding.
- [x] 2.3 Update `onResultVersionChange` so leaving `Principal` empties the component list instead of nulling a scalar.
- [x] 2.4 Add the derived badge helper (`isCardValidated(dacScore)`) implementing design D4, and use it wherever `is_validated` was read.
- [x] 2.5 Update `onSaveDacScore`: block when `tag_id === 3` and the list is empty, send the full list, and replace the native `alert()` with the project's alert service (design D7).
- [x] 2.6 Add `onValidateAll()` — iterate cards with `canSave === true`, reuse the per-card save path, report per-card failures and leave failed cards pending (design D5).
- [x] 2.7 Expose a `hasPendingChanges` getter/computed so the global button can be disabled when nothing is pending.

## 3. Client — template and styles

- [x] 3.1 In `ai-review.component.html`, swap the Component block's `radio-circle` / `radio-dot` markup for a checkbox variant bound to `isComponentSelected(...)`, keeping the `@if (dacScore.tag_id === '3')` visibility rule and the score radios unchanged.
- [x] 3.2 Bind the card badge to the derived helper from 2.4 instead of the frozen `dacScore.is_validated`.
- [x] 3.3 Add the global `Validate` button at the end of the dialog, wired to `onValidateAll()` and disabled when nothing is pending; use `material-icons-round` for its icon.
- [x] 3.4 In `ai-review.component.scss`, add the checkbox styles inside the existing `radio-button-group` layout and the global button styles, using `--pr-*` tokens only (no hex literals).

## 4. Client — tests

- [x] 4.1 Extend `ai-review.component.spec.ts`: toggling two components keeps both selected; clicking a selected one removes only it; leaving `Principal` clears the list.
- [x] 4.2 Add specs for the derived badge: `approved` from AI → validated; after a persisted change → validated; further edits → back to needs-improvement.
- [x] 4.3 Add specs for `onValidateAll()`: saves every pending card, skips non-pending ones, and leaves a failing card pending.
- [x] 4.4 Add a spec for the blocking rule: `Principal` with an empty list does not call `PATCH_saveDacScore`.
- [x] 4.5 Add a spec in `ai-review.service.spec.ts` for the normaliser (null / scalar / list → array).
- [x] 4.6 Run `npm run test` in `onecgiar-pr-client` and confirm the client gates hold (branches 50 / functions 60 / lines 60 / statements 60).
- [x] 4.7 Run `npm run lint` in `onecgiar-pr-client` and leave it clean.

## 5. Backend hand-off (NOT implemented here — for the user / backend owner)

- [x] 5.1 Report to the backend owner: `onecgiar-pr-server/src/api/ai/dto/update-dac-score.dto.ts` must accept `impact_area_id` as a list (`@IsArray()` + `@IsNumber({}, { each: true })`); today `@IsNumber()` rejects an array — evidence: DTO lines 26-35.
- [x] 5.2 Report the storage divergence with evidence: `ai.service.ts` `getDacScores()` (lines ~590-640) and `updateDacScore()` (lines ~697-724) read/write the legacy `result.*_impact_area_id` columns, while `results.service.ts` (lines ~897-913 and ~2223-2247) nulls those columns and uses `result_impact_area_score` with `number[]`.
- [x] 5.3 Confirm with the backend owner whether saving one impact area replaces the whole component set for that area (design Q2), so the client always sends the full list.
- [x] 5.4 Confirm no migration is needed — `result_impact_area_score` already exists (`1768967506640-CreateResultImpactAreaScore`).

## 6. Verification

- [ ] 6.1 Confirm the current single-value contract with a read-only call: `curl -s -H "auth: $TOKEN" "https://prtest-back.ciat.cgiar.org/api/ai/result-context/dac-scores/<resultId>"` and record whether `impact_area_id` comes back scalar or list.
- [ ] 6.2 With `npm start` in `onecgiar-pr-client`, open a result → AI Review → *Climate adaptation and mitigation* → set `Principal` → select *Adaptation* and *Mitigation* → both stay selected.
- [ ] 6.3 Change a score on a `Needs improvement` card and confirm the badge flips to `AI Validated` without reopening the dialog.
- [ ] 6.4 Leave two cards pending, press the global `Validate`, and confirm both persist and the button becomes unavailable.
- [ ] 6.5 Reopen the AI Review for the same result and confirm the multi-selection came back (blocked until task 5.1/5.2 land).
- [ ] 6.6 Cross-check Section 1 (General Information) shows the same components after the dialog saved them (blocked until 5.2 lands).

## 7. Hand-off

- [x] 7.1 Ask Santiago the open questions from `design.md` (Q1 badge semantics, Q3 whether the global button also applies the text proposals).
- [ ] 7.2 Commit on `P2-3110-ai-review-impact-areas-multiple-selection` following `<emoji> <type>(<scope>) P2-3110: <description>`; the user runs git.
- [ ] 7.3 Once merged into the epic and deployed to `dev`, notify Santiago for QA of the three ACs.
