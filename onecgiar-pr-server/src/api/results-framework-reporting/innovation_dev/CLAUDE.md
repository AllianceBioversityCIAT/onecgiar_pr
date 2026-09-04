# innovation_dev (results-framework-reporting, v2)

**Verified:** 2026-09-02 · branch performance-refactor · 348ba9f84

## What it is
The v2 (P25 / 2026) Innovation Development section: reads and writes the whole
`Innovation Dev info` form, including the four questionnaire groups, the budget
blocks and the scaling-study URLs. The v1/P22 equivalent lives in
`results/summary/` and is a different service — do not confuse the two.

## Contract
- `POST /v2/api/innovation-development/innovation-dev/create/result/:resultId`
  → `InnovationDevService.saveInnovationDev`
- `GET  /v2/api/innovation-development/innovation-dev/result/:resultId`
  → `InnovationDevService.getInnovationDev`
- Payload: `CreateInnovationDevDtoV2` (`dto/create-innovation_dev_v2.dto.ts`).
  The client builds it by spreading the section body over **the questionnaire
  exactly as the GET served it** — see the trap below.
- Questionnaire answers are owned by `ResultAnswerRepository`
  (`result_answers` rows, one active row per `result_question_id`).
- The questionnaire itself is owned elsewhere: `results/result-questions/`
  (`ResultQuestionsService.responsibleInnovationAndScalingV2` /
  `intellectualPropertyRightsV2`). This folder only persists what that serves.

## Where it is used
- `onecgiar-pr-client/src/app/.../innovation-dev-info/innovation-dev-info.component.ts:279`
  — `PATCH_innovationDevP25(this.buildSectionPayload())`
- `.../innovation-dev-info.component.ts:244` — `buildSectionPayload()` spreads
  `innovationDevelopmentQuestions` (the raw GET response) into the payload.

## Traps (⚠️ = already broke something)
- ⚠️ **`qN` are SLOTS, not a guarantee — never dereference one by name.**
  `responsibleInnovationAndScalingV2` pins each slot to a `result_question_id`
  and serves only the slots the result's **phase** owns. From phase 2026 on,
  `responsible_innovation_and_scaling` arrives with `q1`…`q3` and **no `q4`**
  (question 137, "partners, policies and financial mechanisms", retired with no
  replacement by P2-3467 / merge `b9b46642b`). Reading a fixed `q4` made every
  2026 save answer **500 `Cannot read properties of undefined (reading
  'radioButtonValue')`** and the section could not be saved at all — P2-3557.
  Iterate the `qN` keys that are present: `_saveNestedQuestionGroup`.
  Measured 2026-09-02 on prtest: 13/13 sampled phase-2026 results carry q1..q3;
  every phase-2025 one still carries q1..q4.
- ⚠️ **Absent question ⇒ do not call `saveOptionsAndSubOptions` at all.** It
  forces `answer_boolean = false` on every unselected option
  (`innovation_dev.service.ts:527-537`) and then deactivates the stored answers
  (`:581` / `:594`). Passing it a question the client never sent would **wipe
  answers the user still has**, not skip them. It also iterates `options`
  unguarded (`:507`), so `undefined` throws — the guard must live in the caller
  (`_saveSingleQuestion`).
- ⚠️ A present question with a **null `radioButtonValue` still goes through**:
  that is how clearing a radio is persisted. Do not "guard" it away.
- ⚠️ **`TopLevelQuestionsV2` declares `q1`…`q4` as required and that is a lie**
  the type cannot currently tell. Marking them optional makes
  `CreateInnovationDevDtoV2` unassignable to the V1 `CreateInnovationDevDto`
  that `InnoDevService.saveInitiativeInvestment` / `savePartnerInvestment` still
  declare. Documented on the interface; the runtime guarantee is the iteration.
- The v1 path in `results/summary/summary.service.ts:625-676` already guards
  every slot with `if (ris?.q1?.options)`. That is the precedent — same shape.
- `getInnovationDev` must survive `InnovationDevExists` returning `undefined`:
  the `results_innovations_dev` row only exists after the first save (P2-3556).

## Pending / Coming soon
- Consolidating the four IPR questions into one (P2-3513) will remove a child of
  question 100, i.e. drop an IPR `qN` the same way 2026 dropped scaling's `q4`.
  The save path already survives it; the client read path is guarded by
  `mapRadioButtonBooleans`' `if (!body?.options?.length) return`.
