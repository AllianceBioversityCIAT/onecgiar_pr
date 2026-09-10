## Why

Jira **P2-3110** — *[INC-155054] AI Review Adjustments for Impact Areas (IA): Multiple selection, alert status, and global validation* (reporter: Santiago Sánchez Correa, epic `P2-2338 Enhancements 2026`).

While testing the AI-for-Impact-Areas tool, three UI gaps blocked users from applying the AI suggestions correctly in the **AI Review** dialog:

1. The AI can suggest **two components at once** (e.g. *Adaptation* **and** *Mitigation*), but the dialog only lets the user pick one (radio buttons).
2. After the user applies the AI suggestion, the card keeps showing **"Needs improvement"** — the badge never re-evaluates, so the user cannot tell the field is now aligned.
3. There is **no global "Validate" button**: each impact area must be saved one by one, and the user has to leave the dialog and go back to Section 1 to confirm the changes landed.

**Scope classification: full-stack.** AC1 cannot be delivered frontend-only — see *Impact → Backend (handed to the user)*.

## What Changes

- **AC1 — Multiple component selection.** The `Component` selector in the `IMPACT AREAS` section of the AI Review dialog becomes a **multi-select (checkboxes)** for the 5 impact areas (gender, climate, nutrition, environmental, poverty). Selection state moves from a scalar `impact_area_id` to a list.
- **AC2 — Dynamic alert.** The `Needs improvement` / `AI Validated` badge is **recomputed** when the user changes the score or the components, instead of being frozen at the value computed when the dialog opened.
- **AC3 — Global "Validate" button.** A single action at the bottom of the dialog persists **every pending impact-area change at once** and tells the user the changes were applied to the result, removing the need to re-check Section 1.
- **BREAKING (API contract, backend-owned):** `PATCH /api/ai/dac-scores/:resultId` must accept `impact_area_id` as a **list**, and `GET /api/ai/result-context/dac-scores/:resultId` must return a **list**. The current single-value contract cannot express AC1.

### Root-cause finding (outside the ticket, must be reported)

The AI Review DAC endpoints read and write the **legacy scalar columns** on `result` (`gender_impact_area_id`, `climate_impact_area_id`, `nutrition_impact_area_id`, `environmental_biodiversity_impact_area_id`, `poverty_impact_area_id`), while **General Information** (Section 1) has already migrated to the many-to-many table **`result_impact_area_score`** and explicitly writes those legacy columns to `null` on every save (`results.service.ts`).

Consequence: the two surfaces have **divergent sources of truth**. A component saved from the AI Review dialog is not what Section 1 renders, and it is wiped the next time the user saves Section 1. Fixing AC1 on top of the legacy columns would ship the multi-select on the wrong storage. This is a backend defect and is handed to the user (see Impact).

## Capabilities

### New Capabilities
- `ai-review-impact-areas`: behaviour of the `IMPACT AREAS` section inside the AI Review dialog — component multi-selection, validation badge re-evaluation, and the global validate action.

### Modified Capabilities
<!-- No existing spec under openspec/specs/ covers the AI Review dialog; nothing to amend. -->

## Impact

### Frontend (this change)
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/ai-review/ai-review.component.html` — Component block becomes checkboxes; global validate button added.
- `.../ai-review/ai-review.component.ts` — `onComponentChange` toggles a list; badge recomputation; `onSaveDacScore` sends a list; new bulk-save handler.
- `.../ai-review/ai-review.component.scss` — checkbox styling reusing the existing radio-group layout tokens.
- `onecgiar-pr-client/src/app/shared/services/api/ai-review.service.ts` — `DacScores.impact_area_id` becomes a list; `PATCH_saveDacScore` payload updated; `enrichDacScoresWithAIRecommendations` no longer the only place `is_validated` is set.
- Unit tests (Jest) for the component and the service. Client gates: 50/60/60/60.

### Backend (handed to the user — AI must not modify server code)
- `onecgiar-pr-server/src/api/ai/dto/update-dac-score.dto.ts` — `impact_area_id` must accept a list (`@IsArray` + `@IsNumber({}, { each: true })`) instead of `@IsNumber()`.
- `onecgiar-pr-server/src/api/ai/ai.service.ts` — `updateDacScore()` and `getDacScores()` must move off the legacy `result.*_impact_area_id` columns and onto `result_impact_area_score` (the same store `ResultsService` already uses via `ResultImpactAreaScoresService`), preserving the `tag_id === 3` (Principal) rule and the existing revision / proposal / ai-state audit writes.
- No migration required — `result_impact_area_score` already exists (`1768967506640-CreateResultImpactAreaScore`).

### Dependencies / rollout
- Branch `P2-3110-ai-review-impact-areas-multiple-selection`, based on `origin/P2-2060-AI-009-AI-Powered-Validation-Module-for-Improving-PRMS-Field-Quality-MVP` — the AI Review dialog does **not** exist in `staging` or `master`; that epic owns the code.
- The frontend AC1 cannot be verified end-to-end until the backend contract accepts a list.

### SDD baseline
- `docs/prd.md` — AC-1 (typed result integrity: impact-area scoring is result data).
- `docs/system-design/design.md` — form controls and status-chip rules for the dialog.
- `docs/detailed-design/detailed-design.md` — `api/ai` module and result data model.
