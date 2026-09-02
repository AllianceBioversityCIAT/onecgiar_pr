# innovation-dev-info

**Verified:** 2026-09-02 · branch performance-refactor · 739ed5523

## What it is
The "Innovation Development" section of the result detail. It mixes **two sources** that are easy to
confuse: fields owned by the summary (`InnovationDevInfoBody`) and a **backend-served questionnaire**
(`result_questions` / `result_answers`).

## Contract
- `innovationDevInfoBody` — the result summary. Feeds `anticipated-innovation-user`, `estimates`,
  `innovation-links`, the developers/collaborators textareas and the readiness level.
- `innovationDevelopmentQuestions` — the questionnaire, typed in
  `model/InnovationDevelopmentQuestions.model.ts`, with 4 groups:
  `responsible_innovation_and_scaling`, `intellectual_property_rights`, `innovation_team_diversity`,
  `megatrends`. Server endpoint: `api/results/result-questions` →
  `ResultQuestionsService.findQuestionInnovationDevelopmentV2`.
- Green check: **not computed here.** `results-validation-module.repository.ts:53` calls the stored
  procedure `validate_sections_mapped_batch`, which resolves `validation_<section>_<portfolio>`.

## Where it is used
- `innovation-dev-info.component.html` — the only consumer of the children under `components/`.

## Children without their own file
| Component | Data source | Phase gate in the HTML |
|---|---|---|
| `anticipated-innovation-user/` | summary (`body.innovatonUse`) | ✅ `!isInnovationDevFormReduced2026()` — P2-3263 |
| `megatrends/` | questionnaire | ✅ `!isInnovationDevFormReduced2026()` — P2-3264 |
| `stage-assessment/` | questionnaire (q1 and q2 from 2026) | ✅ `isInnovationDevFormReduced2026()` — P2-3467 |
| `gesi-innovation-assessment/` | questionnaire (q1 up to 2025) | ✅ `@else` of the same gate — P2-3467 |
| `scale-impact-analysis/` | questionnaire (q2 up to 2025) | ✅ `@else` of the same gate — P2-3467 |
| `assumptions-examination/` | questionnaire (q3 in both phases) | ✅ `isP25()` |
| `partners-policies-safeguards/` | questionnaire (q4 up to 2025) | ✅ `isP25()` + `!isInnovationDevFormReduced2026()` — P2-3467 |
| `intellectual-property-rights/` | questionnaire (q1..q4) | ❌ none |
| `innovation-team-diversity/` | questionnaire (question 112, 3 levels) | ❌ none |
| `user-evidence/` | evidences | ✅ `isP25()` |
| `innovation-links/` | summary (`body.reference_materials`) | ✅ `!isInnovationReferenceMaterialsRemoved2026()` — P2-3550 |

> Line numbers were removed on purpose (went stale twice) — search the selector in the template.

## q1..q4 are resolved PER PHASE, and the 2026 table is shorter
`responsibleInnovationAndScalingV2` (`result-questions.service.ts`) pins the children of root 77 to
fixed slots. `resolveScalingSlotsForPhase` picks the table by phase year:

| Phase | q1 | q2 | q3 | q4 |
|---|---|---|---|---|
| ≤ 2025 | 78 GESI | 79 risk | 136 assumptions | 137 partners |
| ≥ 2026 | GESI stage | risk stage | 136 assumptions | **key absent** |

The two new questions are resolved **by text, not by id** (P25 ids came from AUTO_INCREMENT, so they
differ across environments). The texts live in `innovation-dev-questions.const.ts` on the server and,
on the database side, inside `validation_innovation_dev_P25` — reword one, change both.

## Traps (⚠️ = already broke something or will)
- 🛑 **From 2026 the `q4` KEY DOES NOT EXIST in the payload, and an unmatched stage question comes
  back `undefined`.** `innovation-dev-info.component.ts` walks q1..q4 and every remaining group in a
  straight line, so an empty slot used to throw a `TypeError` mid-loop and **silently skip the
  restore of team diversity, IP rights and Megatrends** — saved answers rendered as blank radios.
  The guards in `services/innovation-dev-info-utils.service.ts` (`mapBoolean` /
  `mapRadioButtonBooleans` return early on an empty slot) and the `@if (question)` wrapper in
  `stage-assessment.component.html` are what hold that up: **do not remove them.** Pinned by
  `innovation-dev-info.component.spec.ts` ("2026 payload with an empty scaling slot") and by
  `stage-assessment.component.spec.ts` ("missing slot") — deleting a guard turns those red.
- ⚠️ **`stage-assessment/` shipped inside P2-3467 (`a3b02520b`), not P2-3290** — do not rebuild it.
- 🛑 **Two endpoints LIE about the phase — never read the phase from them.**
  `GET /v2/api/results/get/general-information/result/{id}` answers `phase_year: 2025` for a result
  the screen shows in Reporting 2026 (even with `?phase=36`), and
  `.../questions/innovation-development/{id}` serves the pre-2026 set for it. A result lives in
  several phases at once; the truth is the **phase chip in the UI** (verified 27 Aug 2026, 8933/8548).
- 🛑 **`showScalingStudiesQuestion()` (P2-3265) — off-by-one; never use `id` or the array index.**
  `readinessLevelsList` (`clarisa/innovation-readiness-levels/get/all`) has an autoincrement `id`
  (starts at 11) and a string `level` ('0'..'9') which is the real level — compare `level`, never
  `id` nor `getReadinessLevelIndex()` (incident P2-3359). Rule: phase ≥2026 → the question
  **disappears at ALL levels (0-9)**; ≤2025 → unchanged, visible from level 6. It gates both the
  radio (`fieldRef="[innovation-use-form]-has-studies-links"`) and `app-studies-link`.
- 🛑 **P2-3550 — hiding "Innovation reference materials" is HALF the change; the other half is
  OMITTING `reference_materials` from the PATCH.** `saveEvidence`
  (`onecgiar-pr-server/src/api/results/summary/innovation_dev.service.ts:99`) returns early **only**
  when the array is `null`/`undefined`; with any other value — `[]` included — it sets `is_active = 0`
  on every stored evidence of type 4 whose link is not in the payload (`:110-125`). The model seeds
  the field with `[{ link: '' }]`, so a hidden-but-still-sent block **deletes** the stored links of
  every 2026 result (AC4 forbids exactly that). `buildSectionPayload()` destructures the key out —
  never send it empty, and never assert with `toBeUndefined()`: assert the key is ABSENT. The
  `is_replicated` half of the gate means "not the first version", so a 2026-born result rolled over
  to 2027 gets the block back — fixing that needs the first version's phase year, unsent today.
- ⚠️ **Orphan data in 2026, unmigrated by design:** `has_scaling_studies` / `scaling_studies_urls`
  are neither cleared nor migrated and still travel in the PATCH — per the PO ("Remove never means
  delete the data"), so the green-check AC depends entirely on the server-side SQL function.
- ⚠️ **fieldRef `[innovation-use-form]-has-studies-links` is shared by 4 surfaces** (IPSR steps 1 and
  4, here, Innovation Use) — its `required`/`label` config was deliberately left alone.
- 🛑 **`isP25()` is NOT the phase, it is the PORTFOLIO** (`fields-manager.service.ts:19`). For
  "2026 onwards" the correct gate is a `ReportingDesignYear` threshold over `phase_year` — prtest
  holds **phase-2025 results inside the P25 portfolio**, so a portfolio gate would strip the section
  from them and break the governing rule of epic P2-3243. Two gates with different meanings coexist
  in this template: `assumptions-examination` still uses only `isP25()`, and
  `partners-policies-safeguards` carries both.
- ⚠️ **The ungated blocks**: hiding one "for 2026" unwrapped also removes it from earlier phases.
- ⚠️ **Questions ARE versioned by phase even though the HTML is not:** `result_questions.version` is `enum('P22','P25')` (`result-question.entity.ts:62-67`) and the `…V2` service methods filter
  `version: 'P25'`. Adding/removing a 2026 question = **a migration over P25 rows**, never a global
  `UPDATE`. Text is edited by migration (`1762401252487-…QuestionsP25.ts`); no admin screen exists.
- ⚠️ **`validation_innovation_dev_P25` is NOT in `src/migrations` and must not be** (`_P22` does live
  in `1761849861521-createValidtionP22.ts:479`). DB-only, applied by hand per environment, **no copy
  in the repo**: ask for `SHOW CREATE FUNCTION` before reasoning about it. The SP returns `FALSE`
  silently when the function is missing → the section never turns green.
- ⚠️ **The function is chosen by PORTFOLIO but gates by YEAR inside.**
  `validate_sections_mapped_batch` builds `validation_<section>_<acronym>`, so a phase-2025 result
  inside P25 runs the same function as a 2026 one. That is why the Megatrends (P2-3465) and group-77
  (P2-3467) blocks are wrapped in `IF (COALESCE(result_phase_year, 0) < 2026)` instead of deleted.
- `bilateral.service.ts` reads the same questionnaire: a question change hits bilateral results too.
- ⚠️ **`innovation-team-diversity`, `gesi-innovation-assessment` and `scale-impact-analysis` are the
  ONLY consumers of `checkboxConfig` in the app** (P2-3291, see `custom-fields/pr-radio-button/`).
  All three serve that hierarchy **in the data** (question 112) — no synthetic "Yes" to build.
- ⚠️ **`innovation_developers` is pre-filled, not owned, from 2026 on (P2-3272 Part 4).**
  `applyInnovationDeveloperAutoFill()` copies `currentResult.lead_contact_person` **only into an empty
  field**, after every section GET, gated on `isInnovationDeveloperAutoFilled2026()`. Not read by
  `validation_innovation_dev_P25`; persisted only on save, so clearing without saving brings it back.

## Pending / Coming soon
- Epic P2-3243 (SIDS forms update) touches almost every block here — read each ticket's
  `🛠 Technical pre-plan` comment in Jira first.
