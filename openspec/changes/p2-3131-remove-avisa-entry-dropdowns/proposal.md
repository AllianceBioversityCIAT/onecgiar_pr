## Why

Jira **P2-3131**: AVISA (SGP-02, initiativeId 41) is no longer an active Science Program for new reporting. Users can still accidentally select it in entry-data dropdowns when creating results, editing contributors, or assigning user roles. Historical AVISA data must remain visible in the Result Center.

## What Changes

- Introduce a shared frontend helper to identify AVISA (`SGP-02`, `SGP02`, `initiativeId` 41).
- Filter AVISA out of **Contributing Science Program / Accelerator** dropdowns on result create/edit flows (Results, IPSR, bilateral review drawer).
- Filter AVISA out of **primary Science Program** selection in result creation.
- Filter AVISA out of **User Management** entity dropdowns (filter panel + manage-user modal).
- Force **read-only** mode when viewing an existing AVISA result (all users, including admin).
- **Do not** filter AVISA from Result Center submitter/filters — historical visibility preserved (AC2).

## Capabilities

### New Capabilities
- `avisa-entry-dropdown-exclusion`: frontend rules for where AVISA is hidden vs preserved, and read-only behavior for existing AVISA results.

### Modified Capabilities
<!-- none -->

## Impact

- **Frontend only** (`onecgiar-pr-client/`).
- Shared util: `src/app/shared/utils/avisa-initiative.util.ts`.
- Entry dropdowns: `rd-contributors-and-partners`, `rd-theory-of-change`, IPSR contributors, bilateral `result-review-drawer`, `result-creator`, `report-result-form`, `InitiativesService` (user management).
- Read-only: `current-result.service.ts`.
- **Not affected:** `results-list` filters / `ResultsListFilterService.updateMyInitiatives`.
- Jest specs for touched files.
