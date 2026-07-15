# Design: P2-3001 — W3/Bilateral Projects dropdown by Science Program

## Context

Two surfaces feed the "Contributing W3 and/or bilateral projects" dropdown, both through `GET_W3BilateralProjects(tocResultId)` (`results-api.service.ts:1394`, legacy endpoint filtered by ToC indicator):

1. **C&P section** (`rd-contributors-and-partners.service.ts:152-192`): fan-out `forkJoin` per `toc_result_id` of the mapped ToC nodes, dedup by `project_id`, `fullName = project_name`. UI gates: `hasTocResultMapped` (blocks the dropdown with "Please select a TOC result…" overlay) and `loadingBilateralProjects` spinner. `(tocResultChanged)` on the template (line 58) triggers `loadFilteredBilateralProjects(true)` which clears the user's selection. Persisted selections arrive in `partnersBody.bilateral_projects` and pre-display on edit.
2. **Report Result popup** (`entity-aow.service.ts:249-253`): single call with `currentResultToReport().toc_result_id`; options in signal `w3BilateralProjects`, selection in `selectedW3BilateralProjects` (starts empty, cleared on close — creation flow).

New backend endpoint (already in `origin/dev`, verified live on prtest): `GET /api/results-framework-reporting/bilateral-projects/by-program?programId=SP01` → all bilaterals of the Science Program in the active phase. **Response shape identical to legacy** (same 10 keys: `project_id`, `project_name`, `organization_*`, `official_code`, `toc_result_id`, `project_summary`).

Constraint: 2025 phases must keep the exact current behavior. 2026 gating uses `FieldsManagerService.isContributorsPartners2026()` (`phase_year >= 2026`), already injected in the C&P service.

## Goals / Non-Goals

**Goals:**
- 2026+ C&P section: dropdown options = ALL bilaterals of the submitter's SP, independent of ToC node/indicator selection (AC1, AC3).
- Report Result popup: options = ALL bilaterals of the SP being reported (`entityId()` route param is the official code).
- Dropdown loads with nothing auto-selected (AC2); user-persisted selections still display on edit.
- Consistent across all result types (AC4) — both surfaces are result-type agnostic already.
- 2025 phases: behavior byte-identical to today.

**Non-Goals:**
- IPSR module (`ipsr-contributors`, `step-n4-add-project`): consumes the shared `clarisaProjectsList` but via `loadClarisaProjects()` (all-CLARISA list) — untouched. Flagged as pre-existing coupling to watch.
- Save payload contracts (`bilateral_projects` / `bilateral_project`) — unchanged.
- Backend changes — endpoint already exists.
- Project Registry mapping architecture (Jira OUT OF SCOPE).

## Decisions

1. **Branch inside `loadFilteredBilateralProjects`, not a new method.** The method is the single entry point called from `getSectionInformation` (line 328) and the `(tocResultChanged)` template binding. Branching on `isContributorsPartners2026()` inside keeps both call sites untouched and 2025 code path literally unchanged. Alternative (separate 2026 method + conditional call sites) rejected: two call sites to gate, more surface for regressions.
2. **programId resolution (C&P):** `primaryInit?.official_code ?? dataControlSE.currentResult?.initiative_official_code ?? currentResultSignal()?.initiative_official_code` — the exact pattern already used at service line ~300 for the SGP-02 special case. If unresolvable → keep list empty, log error, no crash (same failure mode as today's error branch).
3. **2026 gate semantics:** in the 2026 branch, set `hasTocResultMapped(true)` once programId resolves, so the existing "select a TOC result" overlay never blocks (AC1 removes the ToC dependency). Alternative (new dedicated signal + template edits) rejected: more template churn for the same visual result; the overlay message only ever shows when the gate is false.
4. **`tocResultChanged` in 2026 = no-op:** early-return from the 2026 branch when options are already loaded (same SP → same list), so the `clearSelection` wipe never fires. In 2025 the handler behaves exactly as today. This implements the decoupling both DeepSeek agents and my analysis flagged (changing HLO must not wipe the user's bilateral selection).
5. **Popup switch is unconditional:** the entity-aow flow is the new results-framework-reporting surface (2026 reporting); `entityId()` is already the SP official code. No year gate needed there. Alternative (gate by phase) rejected: the flow has no 2025 mode.
6. **New API method `GET_W3BilateralProjectsByProgram(programId: string)`** placed next to `GET_W3BilateralProjects` following the `HTTP_METHOD_descriptiveName` convention.

## Risks / Trade-offs

- [Larger option lists (e.g. SP01 = 74 items)] → `app-pr-multi-select` / `p-multiselect` both have built-in filtering; no pagination needed at this size.
- [programId unresolvable on odd results (no primary initiative code)] → empty list + console error, dropdown stays usable-empty; identical degradation to today's API-error branch.
- [Shared `clarisaProjectsList` consumed by IPSR (DEV-ORACLE F1)] → IPSR loads through `loadClarisaProjects()`, a different method this change does not touch; navigating between sections re-loads the list per section (pre-existing behavior). Watch in QA.
- [Legacy vs new endpoint shape drift in the future] → shapes verified identical today; front only uses `project_id`, `project_name`, `organization_name` + front-set `fullName`.

## Migration Plan

No migration. Front-only, gated by phase year; deploys with the epic branch `P2-2928-TOC-Improvements`. Rollback = revert commit.

## Open Questions

- None blocking. (Jira AC3 already resolved the business question — single SP per reporting session.)
