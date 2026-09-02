# policy-change-info

**Verified:** 2026-09-02 · branch performance-refactor · d659a442c

> Rewritten in English on 2026-09-01 (repo rule: every `CLAUDE.md` under `onecgiar_pr/` is English).

## What it is
Section 4 of a **Policy change** result form (`result_type_id = 1`, Outcome level): policy type, USD
amount, stage, the "is this related to…?" question and the implementing organizations.
Route: `/result/result-detail/<code>/policy-change1-info?phase=<id>`.

## Contract
- State: **everything lives in the component**, there is no dedicated service.
  - `innovationUseInfoBody` (`model/innovationUseInfoBody.ts`) → `policy_type_id`, `amount`,
    `status_amount`, `policy_stage_id`, `institutions[]`.
  - `policyChangeQuestions` + `relatedTo` → "Is this result related to:" comes from the backend as a
    questionnaire; `relatedTo` holds the ticked `result_question_id`.
- Catalogues: `PolicyControlListService.policyTypesList` / `.policyStages` (loaded in that service's
  constructor, at app start) and `InstitutionsService.institutionsList`.
- Endpoints (`ResultsApiService`):
  - `GET_policyChanges()` → `GET /api/results/summary/policy-changes/get/result/<result_id>`
  - `GET_policyChangesQuestions()` → `GET /api/results/questions/policy-change/<result_id>`
  - `PATCH_policyChanges(body)` → `PATCH /api/results/summary/policy-changes/create/result/<result_id>`
- `sectionLoading` (signal) drives `[appSectionSkeleton]`; released on `next` **and** on `error`.
- The green check is NOT computed here: the SP `validate_sections_mapped_batch` resolves it
  (section `policy-change1-info`). Verified OK for P25 on 2026-08-26.

## Where it is used
- `shared/routing/routing-data.ts` — the `policy-change1-info` entry of `resultDetailRouting`.
- `.../result-detail/components/result-sections-sidebar/result-sections.service.ts` — the section
  shows in the rail only for Policy change results.

## Traps (⚠️ = already broke something)
- ⚠️ **`policy_type_id == 1` is "Program, budget or investment"** (CLARISA). It is the ONLY type
  that shows *USD amount* and *Status* (the two `*ngIf` in the template). Switching type hid the
  pair but the values kept travelling in the PATCH: the result ended up storing a USD amount
  against a legal instrument — invisible, impossible to clear from the form — and going back to
  type 1 made the phantom figure reappear as if the user had typed it (P2-3371, reproduced on
  result 8916). `clearAmountWhenNotApplicable()` cleans it, called from the select's
  `(ngModelChange)` **and** from `onSaveSection()`. **Any new field conditioned on the type must
  be cleared there too.**
- ⚠️ **The policy type guidance is gated on the PHASE YEAR, never on the portfolio** (P2-3261,
  epic P2-3243). `POLICY_TYPE_GUIDANCE_FROM_PHASE_YEAR = 2026` and `usesPolicyTypeGuidance2026()`
  pick between `POLICY_TYPE_GUIDANCE_2026` and `LEGACY_POLICY_TYPE_GUIDANCE`. `isP25()` would be
  wrong: the P25 portfolio starts in **2025**, so phase-2025 results live inside it and a portfolio
  gate would rewrite the guidance on exactly the results the epic requires to stay untouched.
  From 2026-08-18 (`f58084fd6`) to 2026-09-01 there was **no gate at all** and every phase read the
  2026 wording. The threshold is deliberately a **local constant**, not a `ReportingDesignYear`
  member: that enum holds UI-*redesign* thresholds and this is a guidance-*wording* one.
- ⚠️ **The year is the RESULT's own `phase_year`, never the open reporting phase** (P2-3558).
  🛑 Do NOT reintroduce `?? dataControlSE.reportingCurrentPhase?.phaseYear`: that is the OPEN
  phase (2026 today), not this result's phase, so a result whose year had not landed got the 2026
  wording. Proven on screen before the fix — result 8501 (phase 2025, internal id 10969) served
  with `phase_year: null` painted the 2026 guidance, while the already-fixed sibling
  `innovation-dev-info` fell to its legacy form on the same intercepted payload. Population:
  1516 results sit in the 2025 phase against 353 in 2026 (measured 2026-09-02), so failing towards
  the new wording failed towards the wrong side in most cases. Two windows keep it reachable:
  `currentResultSignal` is reset to `{}` at the start of every load
  (`result-detail.component.ts:69`) while this section releases its own skeleton from its own
  `GET_policyChanges()`, and a non-404 `GET_resultById` failure leaves it at `{}` for good
  (`current-result.service.ts:65-69`). Resolved by the private `currentResultPhaseYear()` /
  `isPhaseYearAtLeast()` pair; reference shape is `FieldsManagerService.isPhaseYearAtLeast`
  (`8afb574f3`). ⚠️ `rd-annual-updating.component.ts` still keeps its fallback on purpose
  (different source, unmeasured) — it is **not** the shape to copy.
- ⚠️ `getSectionInformation()` does `this.innovationUseInfoBody = response` — it replaces the class
  instance with the raw backend object. Properties the backend omits end up `undefined`, not with
  the class default.
- ⚠️ The multiselect description says **"Select min 1, max 3 organizations"** but **the maximum is
  not validated**: 5 save with no warning (verified 2026-08-26 on 8916). `app-pr-multi-select` has
  no cap input, so fixing it means touching `custom-fields/`.
- `changeAnswerBoolean()` compares with `===` against `result_question_id`; if the backend flipped
  the type (string ↔ number) the answer would silently stop being ticked.
- `onSaveSection()` only refreshes `getSectionInformation()`, not the questions: `relatedTo` stays
  in memory until the page reloads.
- ⚠️ The two `<app-alert-status>` boxes inject raw HTML through `[innerHTML]`. The guidance spec
  reads the **rendered** `.alert_text` (zoneless CD: asserting on the method's return value passes
  even when the box never re-renders), matching on single sentences rather than the whole string,
  so reformatting the markup no longer breaks the test.

## Pending / Coming soon
- The commented `result_related_engagement` block in the HTML ("Don't delete this code") is still
  waiting on a business decision; the field exists in the model and in the DB.
- The **bilateral** copy of this guidance (`section-type-specific/type-policy-change`) has no gate
  either. Left alone on purpose: bilateral is a 2026-only module, and that folder is owned by
  another workstream.

## Tickets that shaped this folder
- P2-3261 (2026 policy-type guidance, epic P2-3243) · P2-3371 (USD amount cleared per policy type)
  · **P2-3558** (the phase gate no longer falls back to the open reporting phase).
