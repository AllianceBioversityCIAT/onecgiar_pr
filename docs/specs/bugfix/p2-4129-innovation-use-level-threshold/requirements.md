# Requirements — Innovation Use level thresholds on the level number (P2-4129)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-4129-innovation-use-level-threshold` |
| Type | Bug (Bug Mode) |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Ticket | P2-4129 (epic P2-2340; relates to P2-3939) |
| Source | `proposal.md` (approved by running `/akili-specify`, 2026-11-23) |
| ID prefix | `ULT` |
| Status | approved — 2026-11-23 |

## 2. Executive Summary

The P25 Innovation Use service SHALL decide whether to keep and return the readiness-level explanation, the scaling-studies answer and the study links from the **level number (0–9)** of the chosen use level, never from its catalogue row id. The thresholds are the ones the form uses: 5 for the explanation and the answer, 6 for the links.

## 3. Glossary

| Term | Meaning |
|---|---|
| Level number | `clarisa_innovation_use_levels.level` (0–9), what the user picks |
| Row id | `clarisa_innovation_use_levels.id`, what `results_innovations_use.innovation_use_level_id` stores. Not equal to the level number; may repeat a level under another id |
| Repeated row | A row whose id is not `level + 1` (test DB ids 13–20 = levels 2–9) |

## 4. System Context & Scope

Current behavior (cited in `proposal.md` §3, §9):
- Save keeps only the row id (`innovation-use.service.ts:123-140`) and gates on `>= InnovationUseLevel.Level_6` at `:215`, `:254`, `:299`, `:342`. Below the gate it clears the explanation, sets `has_scaling_studies = false` and deactivates the study URLs (`:226-233`).
- Read: `getScalingStudiesUrls` returns `[]` when the stored id `< Level_6` (`:1017`).
- The form decides on the level number: explanation 5–9, scaling answer ≥ 5, links ≥ 6 (`innovation-use-form.component.html:439`, `:453`, `:465`).
- Row-id layout per environment: `UNVERIFIED — confirm at source before relying on it` (test DB layout from a 2026-10-09 read; prod never read).

In scope: `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/**`.
Out of scope: client, legacy `summary` route, readiness enum (`InnovationReadinessLevelByLevel`), validation function, existing stored data.

## 5. Stakeholders / Personas

| Persona | Need |
|---|---|
| Reporter (P25 form, bilateral API) | What the form lets them enter is kept; what it hides is not |
| QA reviewer | Stored data agrees with QA catalog 2026.36 (explanation 5–9) |

## 6. Functional Requirements

### Requirement ULT-R-1: Explanation and scaling answer follow the level number

On save, `readiness_level_explanation` and `has_scaling_studies` SHALL be kept when the chosen level number is 5–9, and cleared (`null` / `false`) otherwise.

#### Scenario: Repeated row at a low level (the defect)
- GIVEN the chosen use level resolves to a row whose id is 13 and whose level is 2
- WHEN the result is saved with an explanation and `has_scaling_studies: true`
- THEN the explanation is stored as `null` and `has_scaling_studies` as `false`
- BUT it must NOT keep them because the row id is ≥ 6

#### Scenario: Level 5 keeps the explanation
- GIVEN the chosen use level is 5, under any row id (e.g. id 6, or a row id below 6)
- WHEN the result is saved with an explanation
- THEN the explanation is stored
- AND IT MUST hold for an existing row, a new row, and the duplicate-entry retry path

#### Scenario: Level 4 clears it
- GIVEN the chosen use level is 4 under any row id (e.g. id 5, or a repeated id ≥ 6)
- WHEN the result is saved
- THEN the explanation is `null` and `has_scaling_studies` is `false`

#### Scenario: No level
- GIVEN no use level is sent (NULL)
- WHEN the result is saved
- THEN the explanation and the answer are cleared, as today

### Requirement ULT-R-2: Study links follow the level number

Scaling study URLs SHALL be synced on save and returned on read only when the level number is 6–9. Below 6, they are deactivated on save and returned as `[]`.

#### Scenario: Save at level 5
- GIVEN the chosen level is 5 and `has_scaling_studies: true` with URLs
- WHEN the result is saved
- THEN no URL is synced and existing URLs are deactivated
- BUT it must NOT clear `has_scaling_studies` (the answer is kept from level 5, ULT-R-1)

#### Scenario: Read a repeated row
- GIVEN a stored row id 13 (level 2) with active study URLs
- WHEN `GET /v2/api/innovation-use/get/result/:id` is called
- THEN `scaling_studies_urls` is `[]`

#### Scenario: Read level 6 or above
- GIVEN a stored row whose level is 6–9, whatever its id
- WHEN the result is read
- THEN its active study URLs are returned

### Requirement ULT-R-3: Stored values unchanged

The fix SHALL NOT change what is stored in `innovation_use_level_id` (still the row id), the API request or response shape, or any table schema.

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| ULT-NFR-1 | No migration; no client change |
| ULT-NFR-2 | At most one extra indexed read per GET to resolve the stored id's level |
| ULT-NFR-3 | The level number may come back from the driver as a number or a numeric string; both MUST compare correctly |

### Defect classes and gates

| Defect class | Gate |
|---|---|
| Gate compares the row id instead of the level number | Unit regression spec with a level-repository stub whose id ≠ level (id 13 / level 2; id 6 / level 5; id 5 / level 4); red on current code |
| Wrong threshold (5 vs 6) per item | Same spec, boundary cases 4 / 5 / 6 for the explanation, answer and links |
| One of the save branches (existing / new / duplicate retry) left on the id | Spec covers all three branches |
| Type error | `npx tsc --noEmit -p tsconfig.json` |
| Prod rows where `level` is wrong | No automated check — accepted risk (same as P2-3939) |

## 8. Requirement ID Index

| ID | Title | Proposal |
|---|---|---|
| ULT-R-1 | Explanation and scaling answer follow the level number | Success criteria 1, 3, 4 |
| ULT-R-2 | Study links follow the level number | Success criterion 2 |
| ULT-R-3 | Stored values unchanged | Success criterion 5 |
