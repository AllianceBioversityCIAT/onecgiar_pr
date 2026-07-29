## Context

The AI Review dialog (`app-ai-review`) lives in Result Detail and is owned by the AI epic branch `P2-2060-AI-009-...-MVP`. It is **not present in `staging` or `master`**, so this change branches from that epic.

### Current data flow (verified in code)

```
AiReviewService.onAIReviewClick()
  ├─ GET  api/ai/result-context/dac-scores/:resultId   → ai.service.ts getDacScores()
  │        reads the LEGACY scalar columns on `result`:
  │        gender_impact_area_id, climate_impact_area_id, nutrition_impact_area_id,
  │        environmental_biodiversity_impact_area_id, poverty_impact_area_id
  │        → [{ field_name, tag_id, impact_area_id }]           (impact_area_id = ONE id)
  ├─ POST  {reviewApiUrl}prms-qa                        → external AI service
  │        → json_content.impact_area_scores = { social_inclusion, social_inclusion_component,
  │          climate_adaptation, food_security, food_security_component,
  │          environmental_health, poverty_reduction }          (free text, no numeric score)
  └─ enrichDacScoresWithAIRecommendations()
           is_validated = ai_recommendation.toLowerCase().trim() === 'approved'   ← computed ONCE
           dacScores.set(...)                                    (signal<DacScores[]>)

ai-review.component.html
  @for (dacScore of aiReviewSE.dacScores())
     score radios      ← scoreSE.genderTagScoreList              (0/1/2 catalog, shared)
     component radios  ← getComponentListByFieldName()           ← GetImpactAreasScoresService (shared)
     Save changes      → onSaveDacScore() → PATCH api/ai/dac-scores/:resultId
```

### The storage divergence (root cause, backend-owned)

`ResultsService.createGeneralInformation` (Section 1) persists impact-area components in the
many-to-many table **`result_impact_area_score`** via `ResultImpactAreaScoresService`, and writes
`gender_impact_area_id`, `climate_impact_area_id`, `nutrition_impact_area_id`,
`environmental_biodiversity_impact_area_id` and `poverty_impact_area_id` **to `null`** on every save.
Its GET returns each `*_impact_area_id` as a `number[]`.

`api/ai`'s `getDacScores()` / `updateDacScore()` still read and write those same legacy columns.
So the AI Review dialog and Section 1 do not share a source of truth: a component saved from the
dialog is not what Section 1 renders, and it is erased the next time Section 1 is saved.

### Shared consumers to preserve

| Consumer | Uses | Must not change |
|---|---|---|
| `rd-general-information.component` (Section 1) | `generalInfoBody.*_impact_area_id` (already `number[]`), `GetImpactAreasScoresService` | its own binding and behaviour |
| `GetImpactAreasScoresService` | `genderTagScoreList()`, `climateTagScoreList()`, `nutritionTagScoreList()`, `environmentalBiodiversityTagScoreList()`, `povertyTagScoreList()` | public signatures — read-only here |
| `ScoreService.genderTagScoreList` | the 0/1/2 score catalog rendered by both surfaces | unchanged |

## Goals / Non-Goals

**Goals:**
- Let the user select several components per impact area in the AI Review dialog (AC1).
- Recompute the `Needs improvement` / `AI Validated` badge as the user edits (AC2).
- Persist every pending impact-area change from one global action (AC3).
- Keep the client tolerant of the current single-value API while the backend contract moves to a list.

**Non-Goals:**
- Modifying server code. The backend work is specified and handed to the user (project rule: server is read-only for the AI).
- Changing Section 1 (`rd-general-information`) or the text-field part of the AI Review dialog.
- Redesigning the AI response contract so it returns a structured suggested score (see Open Questions).
- Any database migration — `result_impact_area_score` already exists.

## Decisions

### D1 — `impact_area_id` becomes a list in the client model
`DacScores.impact_area_id` moves from `string | null` to `number[]`.

*Alternative considered:* adding a parallel `impact_area_ids` field and keeping the scalar. Rejected —
two fields for one concept invites the same divergence this change is trying to remove.

### D2 — Normalise on read, always send a list on write
The service normalises whatever the API returns (`null`, a scalar, or a list) into an array before
setting the signal. This keeps the dialog working against today's single-value endpoint and needs no
client change when the backend starts returning a list.

*Alternative considered:* blocking the frontend until the backend ships. Rejected — the multi-select,
the badge and the global button can all be built and unit-tested behind the normaliser.

### D3 — Toggle semantics in `onComponentChange`
`onComponentChange(dacScore, id)` toggles membership in the list instead of overwriting a scalar, and
marks the card pending (`canSave = true`). When the score leaves `Principal`, the list is emptied —
mirroring the existing rule that clears the component when `tag_id !== 3`.

### D4 — Badge is derived, not stored
`is_validated` stops being a value frozen at dialog-open time and becomes a derived value recomputed
whenever the card's score or components change. The AI response only carries free text per impact
area (no numeric suggestion), so the rule is: a card is `AI Validated` when the AI returned
`approved` for it, **or** when the user has persisted a change on that card during this AI Review
session. Anything else stays `Needs improvement`.

*Alternative considered:* parsing the AI free-text recommendation to infer the suggested score.
Rejected — brittle and unverifiable; the structured suggestion has to come from the AI service.

### D5 — Global validate reuses the per-card save
The global action iterates the pending cards and reuses `onSaveDacScore`'s persistence path rather
than introducing a bulk endpoint. It reports per-card failures and leaves failed cards pending.

*Alternative considered:* a new bulk endpoint. Rejected — it is backend work that AC3 does not
require, and per-card calls keep the existing audit trail (revision + proposal + ai-state rows)
untouched.

### D6 — Checkboxes reuse the existing radio-group markup
The component block swaps `radio-circle` / `radio-dot` for a checkbox variant inside the same
`radio-button-group` layout, so spacing and the `Principal`-only visibility rule stay as they are.
The score selector remains single-choice radios.

### D7 — Blocking validation stays client-side and explicit
`Principal` with an empty component list blocks the save. The existing `alert()` call is replaced by
the project's alert service so the dialog does not trigger a native modal.

## Risks / Trade-offs

- **The backend still stores one component per area** → AC1 is not truly deliverable until the
  server accepts a list; until then the client sends a list that the DTO would reject. Mitigation:
  the backend task is specified in `tasks.md` and handed to the user; the client is verified against
  the updated endpoint before the ticket is called done.
- **Legacy columns vs `result_impact_area_score`** → shipping the multi-select on the legacy columns
  would persist data Section 1 ignores and later nulls out. Mitigation: the storage move is part of
  the backend hand-off, and the client is explicitly not designed around the legacy columns.
- **Derived badge may not match what the reporter expects** → D4 approximates "aligned with the AI"
  because the AI response has no structured score. Mitigation: raised as an Open Question for
  Santiago before the ticket is closed.
- **Global save is N requests** → with 5 impact areas pending this is 5 sequential PATCHes.
  Mitigation: acceptable at this cardinality; the save button is disabled while in flight.
- **Client coverage gates (50/60/60/60)** → the new branches (toggle, badge, bulk save, failure path)
  need unit tests or coverage drops.

## Migration Plan

1. Backend lands the list contract and the storage move on the same epic branch (user).
2. Client change merges into the epic branch `P2-2060-AI-009-...-MVP`.
3. The epic goes down to `dev`; Santiago validates the three ACs there.
4. Rollback is reverting the client commit — no schema change, no data migration.

## Open Questions

- **Q1 (Santiago):** does "the alert updates when the user applies the change" mean *the user saved
  the card*, or *the user matched a score the AI explicitly recommends*? The second needs the AI
  service to return a structured suggested score, which is outside this ticket.
- **Q2 (backend owner):** when `updateDacScore` moves to `result_impact_area_score`, should saving an
  impact area from the AI dialog replace the whole set for that area (as Section 1 does) — confirming
  the client must always send the full list?
- **Q3 (Santiago):** should the global `Validate` button also apply the pending **text** proposals
  (title / description / short title), or only the impact areas? The ticket wording says "all changes
  made in that window".
