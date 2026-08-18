## Context

AVISA is identified by `official_code` `SGP-02` or `SGP02`, or `initiative_id` / `initiativeId` `41`. Multiple components independently load initiative lists via `GET_AllWithoutResults`, `GET_AllInitiatives`, or `GET_AllInitiativesEntities`. Result Center filters use `myInitiativesListReportingByPortfolio` via `ResultsListFilterService` and must keep AVISA.

## Goals / Non-Goals

**Goals:**
- Centralize AVISA detection and list filtering in one util.
- Apply filtering only at entry-data dropdown boundaries (not at shared state like `dataControlSE.myInitiativesListReportingByPortfolio`).
- Make existing AVISA results non-editable via `rolesSE.readOnly`.

**Non-Goals:**
- Backend changes, data deletion, or hiding AVISA from Result Center / dashboards.
- Filtering AVISA from reporting analytics, framework cards, or entity-details navigation.

## Decisions

- **Shared util** `isAvisaInitiative` + `filterOutAvisaInitiatives` + `filterOutAvisaFromInitiativeEntityGroups` in `avisa-initiative.util.ts`. Case-insensitive code match; id `41` as fallback.
- **Filter at consumption**, not in `DataControlService` or API layer — preserves Result Center filter options.
- **Read-only in `CurrentResultService`** after result load: if current result is AVISA, set `rolesSE.readOnly = true` regardless of role/phase (overrides prior edit grants for AVISA only).
- **User management:** filter entities inside each portfolio group in `InitiativesService`; drop empty groups.

## Risks / Trade-offs

- [User with only AVISA role cannot create results] → Expected; AVISA is retired from entry flows.
- [Existing AVISA result still shows AVISA as primary submitter in read-only detail] → Correct; only dropdown selection is blocked.
- [Grouped initiative lists with empty groups after filter] → Remove groups with zero entities.

## Migration Plan

Frontend-only. No migration. Rollback = revert commit.
