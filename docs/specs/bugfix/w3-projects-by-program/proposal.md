# Proposal — W3/bilateral project list empty in Contributors & partners (SP09)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/w3-projects-by-program/` |
| Slug | `w3-projects-by-program`, derived from the free-text argument (P2-4042 summary) |
| Type | **Bug**. Main fix is server-side (data source of one endpoint); two small client follow-ups in the same section |
| Source | Jira **P2-4042**, `[167167-1]`, item 1 of Marc Schut's *PRMS feedback – Innovation Development, Use and Packages reporting (batch 1)*, 30-Oct-2026, screenshot S1 (result #953) |
| Approval Mode | `gated` |
| Parent Spec | none |
| Depends on | none |
| Parallel-safe | yes. Touches `results-framework-reporting` (service + one new CLARISA repository query) and two client templates in `rd-contributors-and-partners`; no migration, no bilateral payload |
| Baseline cited | PRD `AC-1` (reporting completeness), TRD module `results-framework-reporting`; related: P2-3001 (by-program list), P2-3860 (Center pills), P2-3313 (`APPROVED_MAPPING_STATUSES`), P2-3554 (centres catalogue retry) |
| Author / date | Santiago Sánchez (with Claude), 2026-10-30 |

## 2. Intent

A reporter on a W1/W2 (pool-funding) result of the 2026 phase must be able to pick the W3/bilateral projects that contributed to it. Today, for SP09 (and any Program whose ToC has no projects linked), the list is empty, so the required field cannot be filled and the result cannot be submitted.

## 3. Problem / Current Behavior

| # | What the reporter sees (result #953, SP09, Editing) | Status after diagnosis |
|---|---|---|
| A | **"Select project"** under *Contributing W3 and/or bilateral projects* offers nothing | **Bug, confirmed** (§9) |
| B | **"Contributing CGIAR Centers"** search returns *"No information found"* | Transient: catalogue failed to load in that session. Does **not** reproduce in prod today (ILRI + Bioversity are now selected and the section is complete) |
| C | Banner *"No CGIAR Centers related to the established HLO/Outcomes were found"* | Expected by code, but misleading: it shows while *"Can this result be mapped to a ToC KPI?"* is still unanswered, i.e. before any HLO is established |

## 4. Proposed Outcome

- **A:** The project list shows every active W3/bilateral project with an approved CLARISA mapping to the result's Science Program for the reporting year, **plus** any project linked to that Program in the ToC. It no longer depends on the ToC having projects.
- **B:** When the CLARISA centres catalogue cannot be loaded, the dropdown says so and offers **Retry**, instead of an empty list that looks like "no centres exist".
- **C:** The banner only appears once an HLO/Outcome is actually selected and it brings no centres. With the ToC question unanswered or "No", no banner (or a neutral hint).

## 5. Scope

| In | Out |
|---|---|
| `GET api/results-framework-reporting/bilateral-projects/by-program` returns ToC ∪ CLARISA-approved projects, deduplicated by `project_id`, ToC first, same row shape | Changing which projects count as "approved" (reuses P2-3313's rule as-is) |
| New read-only query on `ClarisaProjectsRepository` (approved mapping by program code + phase year) | Any change to `clarisa_project_mappings` data or the CLARISA sync |
| Client: error state + Retry on the centres dropdowns of this section when the catalogue is empty after load | Reworking P2-3554's retry mechanism in `CentersService` |
| Client: banner gating/wording in this section | The HLO/KPI lookups (P2-4043, P2-4044, separate tickets) |
| Unit tests (server service + repository; client component) + PRTest verification | The legacy pre-2026 path (`GET_W3BilateralProjects` per ToC result) |

## 6. Non-Goals

- No change to the endpoint's response shape or to the client's project picker / Center pills (P2-3860).
- No change to `results_by_projects` or to how a selection is saved.
- No bilateral (`/api/bilateral/*`) or platform-report payload change.
- No pagination. The existing type-ahead and Center pills handle long lists.

## 7. Affected Users, Systems, And Specs

| Area | Impact |
|---|---|
| Reporters of W1/W2 results, 2026 phase, every Science Program | Can select W3/bilateral contributors again; lists get longer where CLARISA has more mappings than the ToC |
| `results-framework-reporting.service.ts:1345` `getBilateralProjectsByScienceProgram` | Merges a second source |
| `clarisa/clarisa-projects/clarisa-projects.repository.ts` | New query, same rule as `getPortfolioProjectFacts` (`:32`) |
| `aow-bilateral.repository.ts:1460` `findBilateralProjectsByProgramOfficialCode` | Unchanged; still the ToC source |
| Client `rd-contributors-and-partners` (`.component.html` ~L118–200, `.service.ts` `loadBilateralProjectsByProgram`) | Only B and C; the project list consumes the same response |
| Portfolio Overview W3 (`portfolio/bilateral-projects`) | Unchanged; becomes the reference both screens agree with |

## 8. Visual Reference

- Source: None (screenshot S1 from Marc's document as evidence only).
- Location: `C:\Users\santiagosanchez\Downloads\PRMS feedback - Innovation Development, Use and Packages reporting (batch 1)_1.pdf`, S1.
- Notes: A is backend-only. B and C reuse existing controls (`app-alert-status`, `app-pr-multi-select`); no new layout.

## 9. Bug Diagnosis

### Observed Symptom
On result #953 (SP09 – Scaling for Impact, 2026, Editing), *Contributors & partners → Contributing W3 and/or bilateral projects → Select project* lists no projects.

### Reproduction Steps
1. Sign in to PRMS (prod, `phase=8`) with access to SP09.
2. Open `result/result-detail/953/contributor-partners?phase=8`.
3. Open **Select project**. Expected: SP09's W3/bilateral projects. Actual: empty.
4. In DevTools, `GET api/results-framework-reporting/bilateral-projects/by-program?programId=SP09` → **200, `response: []`**.

Verified read-only in prod on 2026-10-30 (no clicks on save, no data changed).

### Root Cause (confirmed)
- Since P2-3001, the 2026 project list comes from `getBilateralProjectsByScienceProgram` (`results-framework-reporting.service.ts:1345`), which only calls `findBilateralProjectsByProgramOfficialCode` (`aow-bilateral.repository.ts:1460`).
- That query reads projects **only from the ToC DB** (`toc_results ⨝ toc_result_projects` for `official_code = SP09` and the active ToC phase), then matches CLARISA by `clarisa_projects.short_name = trp.code`. Rows without a CLARISA match are dropped (`service.ts:1376-1380`).
- SP09's ToC has no project linked in the active phase (or none whose code matches CLARISA), so the result is empty.
- The same platform already knows SP09's projects from CLARISA: `GET portfolio/bilateral-projects` (same prod session) reports **SP09 `mapped: 177`** (approved mappings: status `Confirmed`, allocation > 0, active, phase year), 16 of them with W3 results.
- So the list is wrong because of **its data source**, not because of missing data.

### Impact & Scope
- Every Science Program / Accelerator whose ToC has no linked projects (or codes that don't match CLARISA) gets an empty list. That is a blocking issue: the field is required for completion.
- No data integrity risk: the endpoint is read-only; saved selections use `clarisa_projects.id`, which both sources return.
- B (centres) is independent: the catalogue path already retries (P2-3554), but an exhausted retry still shows "No information found".

### Fix Strategy
Smallest safe correction: keep the ToC query and **add** the CLARISA-approved query, union both, dedupe by `project_id`, ToC rows first. Route: `/akili-specify` (Lite) in **Bug Mode**, with a regression test: a service spec where the ToC returns `[]` and CLARISA returns projects. It must be red today (empty) and green after.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **1. Union ToC + CLARISA (recommended)** | Keep ToC query, add CLARISA-approved query, merge | Never loses a project shown today; aligns with Portfolio Overview; no client change | Two queries per call (both indexed, small) |
| 2. CLARISA only | Replace the ToC source | Simplest single source | Drops ToC-linked projects that lack an approved mapping, a regression for Programs that work today |
| 3. Fallback | CLARISA only when the ToC returns 0 | Minimal behaviour change | A Program with 2 ToC projects out of 50 mapped stays incomplete; two different rules depending on data |

## 11. Recommended Approach

**Option 1.**
- **Server:** a new `ClarisaProjectsRepository.findApprovedProjectsByProgramCode(programCode, phaseYear)`.
  - It returns the same columns as the ToC query: `project_id` = `cp.id`, `project_name` = `cp.full_name`, `organization_code`, and `organization_id/name/acronym/website_link` joined from `clarisa_institutions`.
  - Filter: `TRIM(cpm.program_code) = ?`, `cpm.allocation > 0`, `BINARY TRIM(cpm.status) IN (APPROVED_MAPPING_STATUSES)`, `cp.phase = ?`, `cp.is_active` not 0.
- **Phase year:** taken from the version that `_reportingTocContextService.resolve()` already resolves (`versionId` → `version.phase_year`).
- **Merge:** the service merges ToC rows first, then CLARISA rows, through the existing `seenProjectIds` set.
- **Client B:** when `centersSE.centers()` is still empty after `getData()` settles, show an inline error + Retry (re-calls `getData()`) instead of the empty dropdown.
- **Client C:** render the "No CGIAR Centers related…" note only when an HLO/Outcome is selected (`planned_result === true` and a ToC result chosen).

## 12. Risks, Dependencies, And Open Questions

| # | Item | Mitigation / owner |
|---|---|---|
| R1 | Lists grow from ~0 to hundreds (SP09 = 177) | Type-ahead + Center pills (P2-3860) already exist; verify usability in PRTest |
| R2 | `cp.phase` = reporting year must match the version being reported (2026) | Unit test with a 2025 vs 2026 mapping; PRTest check |
| R3 | `organization_code` semantics (see `bugfix/bilateral-project-codes` §9: some 2025 rows pointed at a wrong institution) | Join stays the same as the ToC query; out of scope to correct here |
| OQ-1 | Should ToC-linked projects be visually marked (e.g. "linked to ToC")? | Ask Ángel/Marc; default: no marker, ToC rows only ordered first |
| OQ-2 | C: hide the banner entirely, or show a neutral hint (*"Map this result to a ToC KPI to see the Centers linked to it, or select any contributing Center below."*)? | PO decision; default: hide |
| OQ-3 | Should Accelerators follow the same rule? | Same endpoint serves them; assume yes |

## 13. Success Criteria

1. In PRTest and then prod, `by-program?programId=SP09` returns the approved SP09 projects (count equal to Portfolio Overview's `mapped` for SP09 plus any ToC-only project).
2. A Program that today lists ToC projects still lists every one of them.
3. On result #953 the reporter can select a W3/bilateral project and the section completes.
4. With the centres catalogue forced to fail, the section shows the error + Retry, and Retry recovers.
5. With the ToC KPI question unanswered, the "No CGIAR Centers related…" banner does not show.
6. Regression spec (ToC empty, CLARISA non-empty) is red before the fix and green after.

## 14. Next Step

```text
/akili-specify bugfix/w3-projects-by-program
```
(Lite, **Bug Mode**: regression test required.)
