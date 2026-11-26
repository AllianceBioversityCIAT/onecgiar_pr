# Requirements: each impact-area component field of the QA feed returns only its own area

| Field | Value |
|---|---|
| Spec Path | `changes/qa-impact-area-filter` |
| Type | Change (bug) · Depth **Lite** |
| Module | `quality-assurance` → `qa-catalog` (server only) |
| Parent specs | `quality-assurance/qa-results-feed` (`QRF-*`), `quality-assurance/qa-value-labels` (`QVL-*`, design P-12) |
| Ticket | P2-4108 |
| Approval | User, 2026-11-26: the task request names the ticket's AC-1..AC-4, asks for tests and "spec AKILI si aplica" |
| Branch | `feature/qa-impact-area-filter`, cut from `qa-development-2026-ss` @ `c12bb4d29` |
| Code | `IAF` |

## 1. Problem

In `POST /api/qa/results/details`, the five fields `general.gender_impact_areas`, `climate_impact_areas`, `nutrition_impact_areas`, `environment_impact_areas` and `poverty_impact_areas` all read every `result_impact_area_score` row of the result (`definitions/sections/general-information.ts`, binding with no filter). A result with Climate and Poverty components returns both in all five fields. The Reporting form splits the components by `impact_areas_scores_components.impact_area` (`get-impact-areas-scores.service.ts:26-30`) and reads only active rows (`BaseServiceSimple.find`, `is_active: true`). Recorded as known gap 19 of `qa-catalog.en.md` (v1.33).

## 2. Requirements

- **`IAF-R-1`** Each `general.<area>_impact_areas` field MUST return only the ids of the components of its own area.
- **`IAF-R-2`** A score row the form no longer shows (`is_active = 0`) MUST NOT be returned.
- **`IAF-R-3`** The `labels` of each component list MUST cover every id the field returns, with that component's own name.
- **`IAF-R-4`** The contract MUST record the change: known gap 19 removed, a change-log row, `catalog_version` bumped (the delivered values change).
- **`IAF-R-5`** No key, type, label, condition or response shape changes.

## 3. Acceptance criteria (ticket AC-1..AC-4)

| ID | Given | Then |
|---|---|---|
| `IAF-AC-1` | A result with components in more than one area (Climate 5, Poverty 12 and 13) | Climate holds `[5]`, Poverty `[12, 13]`, the other three `[]` |
| `IAF-AC-2` | A result with components of a single area (Gender 1 and 3) | Gender holds `[1, 3]`; the other four fields are `[]` |
| `IAF-AC-3` | Any of the above | `labels.<list>` has exactly the returned ids, each with its component name |
| `IAF-AC-4` | `qa-catalog.en.md` | Gap 19 removed, row v1.38 added, `catalog_version` `2026.38` |

## 4. Out of scope

- A generic join filter in `RelationBinding` (the closed-list row filter is enough; see design).
- Validation rules and the form: unchanged.
