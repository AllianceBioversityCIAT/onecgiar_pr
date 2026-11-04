# Requirements — W3/bilateral projects by program (`bugfix/w3-projects-by-program`)

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results-framework-reporting` (server) + `rd-contributors-and-partners` (client) |
| Depth / mode | **Lite · Bug Mode** |
| Status | draft |
| Ticket | Jira **P2-4042** · `[167167-1]` (Marc Schut feedback batch 1, item 1) |
| Proposal | [`proposal.md`](./proposal.md), approved by Santiago 2026-10-30. Root cause in its §9 |
| Approval Mode | `gated`. Lite: requirements, design and tasks are presented at one review gate |
| Open questions resolved | OQ-1 no ToC marker (ToC rows first) · OQ-2 hide the banner · OQ-3 Accelerators follow the same rule (Santiago, 2026-10-30) |
| PRD | `AC-1` (a result can be completed and submitted) |
| ID prefix | `WPP` |

## 2. Executive Summary

The 2026 "Contributing W3 and/or bilateral projects" list only reads projects linked in the Program's ToC. SP09 has none there, so the list is empty and the required field blocks submission, while CLARISA holds 177 approved SP09 projects. The list will now merge the ToC projects with the CLARISA-approved ones. Two small client fixes ride along: an error with Retry when the CGIAR Centers catalogue fails to load, and no "No CGIAR Centers related…" banner before the ToC KPI question is answered "Yes".

## 3. Glossary

| Term | Meaning |
|---|---|
| ToC-linked project | Project linked to a node of the Program's ToC (`toc_result_projects`), active ToC phase |
| CLARISA-approved project | Active CLARISA project of the reporting year with a mapping to the Program: status in `APPROVED_MAPPING_STATUSES` (P2-3313), allocation > 0 |
| Program | Science Program or Accelerator (`clarisa_initiatives.official_code`, e.g. `SP09`) |

## 4. Scope

| In | Out |
|---|---|
| `GET api/results-framework-reporting/bilateral-projects/by-program` source | Response shape, client project picker, Center pills (P2-3860) |
| Centers dropdown error state in this section | `CentersService` retry logic (P2-3554) |
| "No CGIAR Centers related…" banner gating in this section | HLO/KPI lookups (P2-4043, P2-4044) |

## 5. Stakeholders

| Persona | What changes |
|---|---|
| Result submitter (W1/W2, 2026) | Can select contributing W3/bilateral projects; clearer Centers states |
| QA / PMU | Contributions recorded against the same projects the Portfolio Overview counts |

## 6. Functional Requirements

### WPP-R-1 — The project list includes CLARISA-approved projects

The by-program endpoint SHALL return every CLARISA-approved project of the Program for the reporting year, together with every ToC-linked project of that Program.

#### Scenario S-1.1: ToC has no projects (the reported bug)
- GIVEN Program `SP09` has no ToC-linked projects in the active ToC phase
- AND CLARISA has approved SP09 mappings for the reporting year
- WHEN the client calls `by-program?programId=SP09`
- THEN the response lists those CLARISA-approved projects
- BUT it must NOT return an empty list

#### Scenario S-1.2: Both sources, overlapping
- GIVEN a project appears both ToC-linked and CLARISA-approved
- WHEN the list is built
- THEN it appears once
- AND ToC-linked projects come before CLARISA-only projects

#### Scenario S-1.3: Nothing is lost
- GIVEN a ToC-linked project with no approved CLARISA mapping
- WHEN the list is built
- THEN it is still listed (as it is today)

#### Scenario S-1.4: Only approved, current, active mappings
- GIVEN mappings with status other than approved, allocation ≤ 0, another phase year, or an inactive project
- WHEN the list is built
- THEN those projects are NOT included from the CLARISA source
- AND IT MUST use the same approval rule as the Portfolio Overview W3 count (`APPROVED_MAPPING_STATUSES`)

#### Scenario S-1.5: Contract unchanged
- WHEN any row is returned
- THEN it carries `project_id` (the CLARISA project id), `project_name` and `organization_id`/`organization_name`/`organization_acronym`, as the ToC rows do today
- AND an invalid or missing `programId` keeps today's 400/404 behaviour

### WPP-R-2 — Centers catalogue failure is visible and recoverable

When the CLARISA centres catalogue is still empty after the section's load attempt, the section SHALL show an error message with a **Retry** action instead of an empty "No information found" dropdown.

#### Scenario S-2.1
- GIVEN the centres catalogue request failed (all retries) for this session
- WHEN the reporter opens Contributors & partners
- THEN an inline error says the CGIAR Centers list could not be loaded, with a Retry button
- AND clicking Retry re-requests the catalogue and, on success, the error disappears and the dropdowns list the centres
- BUT it must NOT show this error while the request is still in flight or when the catalogue loaded

### WPP-R-3 — The "No CGIAR Centers related…" note waits for a "Yes"

The note "No CGIAR Centers related to the established HLO/Outcomes were found" SHALL only show when "Can this result be mapped to a ToC KPI?" is answered **Yes** and the ToC brings no reference centres.

#### Scenario S-3.1
- GIVEN the ToC KPI question is unanswered
- WHEN the section renders (2026 phase)
- THEN the note is NOT shown
- AND the "Contributing CGIAR Centers" dropdown with all centres is still shown and required (today's behaviour)

#### Scenario S-3.2
- GIVEN the answer is Yes and the selected HLO/Outcome brings no reference centres
- THEN the note is shown (unchanged)

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| WPP-NFR-1 | Read-only: no write, migration or data change. Saved selections (`results_by_projects.project_id`) keep resolving |
| WPP-NFR-2 | Both queries are bound-parameter SQL; no string interpolation of `programId` |
| WPP-NFR-3 | Endpoint latency stays in the same order as today (two indexed queries; `clarisa_project_mappings` indexes on `project_id`/`program_id`) |

### Defect classes and the gate that catches each

| Defect class | Gate |
|---|---|
| CLARISA rows missing or ToC rows dropped / duplicated / mis-ordered | Server service spec (WPP-T-1), red before fix |
| Wrong filter (status, allocation, year, active) | Repository spec asserting the bound parameters and SQL clauses (WPP-T-1) |
| Count differs from Portfolio Overview in real data | **No automated gate** → manual PRTest check: SP09 count vs `portfolio/bilateral-projects` `mapped` (WPP-T-3) |
| Error/Retry or banner rendered in the wrong state | Client component spec with the real template (WPP-T-2) |
| Long list unusable in the picker | **No automated gate** → manual PRTest check (WPP-T-3); accepted risk if PO is fine with type-ahead + pills |

## 8. Requirement ID Index

| ID | Title | Tasks |
|---|---|---|
| WPP-R-1 | Project list includes CLARISA-approved projects (S-1.1…S-1.5) | WPP-T-1, WPP-T-3 |
| WPP-R-2 | Centers catalogue failure visible + Retry (S-2.1) | WPP-T-2, WPP-T-3 |
| WPP-R-3 | Note waits for "Yes" (S-3.1, S-3.2) | WPP-T-2, WPP-T-3 |
| WPP-NFR-1…3 | Read-only, bound SQL, latency | WPP-T-1, WPP-T-3 |
