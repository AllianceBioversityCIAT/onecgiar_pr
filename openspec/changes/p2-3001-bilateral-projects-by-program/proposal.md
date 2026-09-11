# Proposal: P2-3001 — W3/Bilateral Projects dropdown by Science Program

## Why

The "Contributing W3 and/or bilateral projects" dropdown currently restricts its options to the bilaterals mapped at the granular ToC indicator level (`bilateral-projects?tocResultId=`). Users are artificially blocked from reporting contributions that exist in the Project Registry at the Science Program level (Jira P2-3001, epic P2-2928 ToC Improvements). The backend endpoint that lifts this restriction already exists in dev (`GET /api/results-framework-reporting/bilateral-projects/by-program?programId=SP01`, verified live — same response shape as the legacy endpoint).

## What Changes

- Add a new API method `GET_W3BilateralProjectsByProgram(programId)` in `results-api.service.ts` pointing to `bilateral-projects/by-program?programId=`.
- **Surface 1 — Contributors & Partners section (result detail):** for 2026+ phases (`isContributorsPartners2026()`), `loadFilteredBilateralProjects` loads the full SP list via the new endpoint (single call, programId = primary initiative `official_code`), bypassing the per-`toc_result_id` fan-out. 2025 behavior stays untouched (legacy fan-out + dedup).
- **Surface 2 — Report Result popup (entity-aow flow):** `getW3BilateralProjects()` uses `entityId()` (already the SP official code, e.g. `SP01`) instead of `currentResultToReport().toc_result_id`.
- In 2026, the dropdown no longer depends on ToC node selection: the "Please select a TOC result…" gate does not apply, and `tocResultChanged` must NOT clear the user's selection nor reload options (same SP → same list).
- Dropdown loads with no pre-selected options (AC2). User-persisted selections still display on edit (existing behavior).
- Save payloads unchanged (`bilateral_projects` in C&P PATCH, `bilateral_project` in create POST).

## Capabilities

### New Capabilities
- `bilateral-projects-by-program`: sourcing of the Contributing W3/Bilateral dropdown options at Science Program level for 2026+ reporting, across the C&P section and the Report Result popup, with 2025 legacy behavior preserved.

### Modified Capabilities
<!-- none — no existing spec covers bilateral dropdown sourcing -->

## Impact

- `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (new method next to `GET_W3BilateralProjects`, line ~1394).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.service.ts` (`loadFilteredBilateralProjects`, lines 152-192) + component HTML gates (`hasTocResultMapped` overlay, `tocResultChanged` handler, lines 58 / 179-207).
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/entity-aow/services/entity-aow.service.ts` (`getW3BilateralProjects`, lines 249-253).
- Unit tests (Jest) for the three touched files.
- **Out of scope:** IPSR module (`ipsr-contributors`, `step-n4-add-project`) — shares `clarisaProjectsList` but loads via `loadClarisaProjects()` (untouched path); backend; save payload contracts.
