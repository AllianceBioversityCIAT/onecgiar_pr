# Design: `changes/qa-impact-area-filter`

## Decisions

- **`IAF-DD-1`: close the five component lists to their area's ids.** The area lives on `impact_areas_scores_components.impact_area`, not on `result_impact_area_score`, and a relation `filter` is equality on the relation's own table only. A closed control list is already a row filter of the read (`QRF-DD-13`, `closedListPredicates`): `impact_area_score_id IN (<list ids>)` is added to the batched SELECT. This is the mechanism v1.27 used for the innovation development question fields.
  - Ids: migration `1760113104098-ImpactAreasScoresComponents.ts` creates the table and inserts its 13 rows in one statement, so the AUTO_INCREMENT ids are fixed: Gender 1-3, Climate 4-5, Nutrition 6-8, Environmental 9-10, Poverty 11-13. No later migration inserts into it.
  - Why not a join filter in the binding model: it changes the read-plan, the completeness guard and the stale checks for one field family; the closed list needs none of that.
  - Cost: the five fields no longer share one plan (the closed list is part of the plan's group key), so the read sends 5 statements instead of 1 for this table. Each is a batched `IN` on an indexed foreign key.
- **`IAF-DD-2`: `filter: { is_active: true }` on the binding.** The form reads only active rows; this was the only relation binding of the catalog with no filter (51 of 52 declare one).
- **`IAF-DD-3`: revision 38.** The binding change is part of the content hash (fields include `storage`), so the snapshot guard requires the bump; no change to the hash function.

## Budget

1 task · ~200 LOC (≈20 production, ≈150 test, docs) · 1 review round.
