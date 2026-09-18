# Project Multiselect Filter — Requirements

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/project-multiselect-filter` |
| Module | `bilateral` — Center Results list |
| Type | Change |
| Depth | Lite |
| Status | approved (2026-09-18, pivot) |
| Approval Mode | gated |
| Date | 2026-09-18 |
| Proposal | [`proposal.md`](./proposal.md) |
| Requirement Source | Direct user request and screenshot of `/bilateral/AfricaRice/results`; pivot after user confirmed options must be the center's projects, phase-aware |

## 2. Executive Summary

Center users must be able to filter the bilateral Results table by one or more **of their own center's bilateral projects** through the existing Filters popover. Options come from the center's project catalog fetched per selected reporting phase, filtered and filtered results reuse the shipped URL/chip contract, and project selection adds no results refetch.

Live-data discovery (Pivot Record): deriving options from every loaded row surfaced 14 projects of other Centers out of 20 (rows where the center only contributes). The user confirmed options must be the center's projects. The user also reminded that the catalog is phase-scoped — the existing center-projects endpoint only answers for the active reporting year.

This refines the bilateral reporting UI scope in `docs/prd.md` §5 and protects result-list responsiveness under G4/M4.2. It follows the listing/filter pattern in `docs/ux-ui/design.md` §6, component reuse and multiselect rules in §8, accessibility expectations in §10, and the client-side state boundary in `docs/trd/trd.md` §6.

## 3. Glossary

| Term | Meaning |
|---|---|
| Center project catalog | The center's reportable bilateral projects from `GET /api/bilateral/center/projects` (active, W3-mapped projects whose `phase` matches a reporting year). |
| Selected phases | The reporting phases whose rows are currently loaded on the Results page. |
| Displayed project | The project shown in the result row's **Project** column. |
| Deep link | A Results URL carrying a comma-separated `project` query parameter. |

## 4. System Context & Scope

### In scope

- Searchable Project multiselect in the existing bilateral Results Filters popover.
- Client-side filtering, active chips, URL synchronization, and focused regression coverage.
- A phase-year-scoped catalog fetch, with loading, empty, error, keyboard, and tablet behavior.
- An additive optional `year` query parameter on the existing `GET /api/bilateral/center/projects` endpoint, backwards compatible when omitted.

### Out of scope

- Changes to the catalog's reportability rules (active, W3 mapping, allocation).
- Matching every historical project relation attached to a result rather than the displayed project.
- Changes to any other filter, the popover layout pattern, or the payload contract (`bilateral-result-summaries.en.md`).
- Catalog caching beyond the page lifetime.

## 5. Stakeholders / Personas

| Persona | Outcome |
|---|---|
| Result submitter / Center user | Narrows the Center's Results table to one or more of the center's own projects, for the selected phases. |
| Reviewer / PMU user with Center access | Shares and reopens the same filtered view through its URL. |

## 6. Functional Requirements

### `PMF-R-1` — Select and apply the center's projects per phase

The Results Filters popover MUST expose a searchable, keyboard-operable **Project** multiselect. Its options MUST represent the Center's project catalog for the selected reporting phases, deduplicated by project id across phases, labelled from the catalog's short and full names (fallback `Project <id>`), and sorted case-insensitively by label. The option set MUST refresh when the selected phases change.

#### Scenario: Filter by two projects

- **GIVEN** catalog projects for the selected phases, a project present in two selected phases, and an unlinked row
- **WHEN** the user selects two projects
- **THEN** rows belonging to either selected displayed project remain visible and one option exists per project id
- **AND** project filtering combines with every active non-project dimension using AND semantics
- **BUT** the unlinked row and rows from unselected projects must NOT match
- **AND IT MUST** apply immediately without issuing another results request

#### Scenario: Phase-scoped options

- **GIVEN** reporting phases 2025 and 2026 are selected
- **WHEN** the Filters popover opens
- **THEN** the options are the union of the center's catalog projects whose phase year is 2025 or 2026
- **AND** changing the selected phases requests the catalog for the new phase years and updates the options
- **AND IT MUST** request each phase year's catalog at most once per page lifetime and offer no project whose year is not among the selected phases
- **BUT** it must NOT invent catalog values or duplicate a project that appears in more than one selected phase

#### Scenario: Catalog loading, empty, and failure

- **GIVEN** the catalog is loading, returns no projects, or the catalog request fails
- **WHEN** the Filters popover is opened
- **THEN** the Project control remains within the existing popover and its options reflect the current catalog state, including an empty option set while loading or after a failure
- **AND** its options update when the catalog response for the selected phases arrives
- **BUT** a catalog failure must NOT block the existing page state, hide other filters, or introduce a separate project-specific loading/error surface

### `PMF-R-2` — Preserve project filters in the URL and chips

Project selections MUST use the existing comma-separated `project` query parameter and active-chip behavior. Each selection, chip removal, and **Clear all** action MUST keep the multiselect, filtered rows, URL, and chips synchronized.

#### Scenario: Select, share, and clear projects

- **GIVEN** the user is on a Results URL containing unrelated managed filters and `result=8706`
- **WHEN** they select projects `118` and `204`
- **THEN** the URL contains `project=118,204` and labelled project chips are visible
- **AND** reopening that URL restores both selections and the same filtered rows
- **BUT** synchronization must NOT remove unrelated query parameters, add browser history entries, or trigger a hydrate/write loop
- **AND IT MUST** remove only the selected project when its chip is cleared and remove all project selections when **Clear all** is used

#### Scenario: Deep-linked project absent from the catalog

- **GIVEN** a valid deep link selects project `999` and the catalog for the selected phases does not provide its name
- **WHEN** the Results page and Filters popover render
- **THEN** project `999` remains selected and removable with the fallback label `Project 999`
- **BUT** it must NOT be silently discarded merely because the current catalog does not contain it

## 7. Non-Functional Requirements

| ID | Dimension | Requirement |
|---|---|---|
| `PMF-NFR-1` | Performance | Project selection MUST remain client-side over the already-loaded rows; the catalog endpoint MUST be requested at most once per selected phase year per page lifetime; no per-keystroke or per-selection requests. |
| `PMF-NFR-2` | Accessibility | The control MUST have a programmatic **Project** label, visible focus behavior, and keyboard selection/removal consistent with the existing multiselect (`docs/ux-ui/design.md` §10). |
| `PMF-NFR-3` | Responsive UI | The control MUST remain usable inside the existing popover at the primary 1280px desktop and 900px tablet widths without adding horizontal page overflow. |
| `PMF-NFR-4` | Compatibility | Existing no-project-filter behavior, deep links, phase/source/role/status/creator/search filters, and `result` focus links MUST remain unchanged; `GET /api/bilateral/center/projects` MUST keep its current behavior when the `year` parameter is omitted. |
| `PMF-NFR-5` | Security | The change MUST expose no additional data; the catalog request preserves the endpoint's existing access posture and the `auth` header behavior (`AC-3`, `AC-9`). |

## 8. Acceptance Criteria

| ID | Evidence |
|---|---|
| `PMF-AC-1` | Focused component tests prove phase-union catalog options, cross-phase deduplication, label formatting and fallbacks, OR-within-project and AND-across-dimensions behavior, retained deep-link selections, URL/chip synchronization, and no results refetch on selection. |
| `PMF-AC-2` | Server tests prove the `year` filter and its backwards-compatible default; existing query-parameter and pure-filter client tests remain green. |
| `PMF-AC-3` | Client lint and server ESLint pass with no new warnings. |
| `PMF-AC-4` | Manual browser verification at 1280px and 900px confirms placement, no horizontal page overflow, visible focus, keyboard open/select/remove/close behavior, and loading/empty/error presentation. |

## 9. Defect Classes & Verification Gates

| Defect class | Gate | Input that must fail the gate |
|---|---|---|
| Wrong option source (foreign-center projects or unfiltered rows) | Focused `bilateral-results-list.component.spec.ts` catalog-option cases | Mocking the catalog without CIP/BMGF foreign projects while rows still carry them must NOT add those rows' projects to the options. |
| Cross-phase duplicates or missing phase years | Focused component tests | A project with the same id in both selected phases must produce one option; a project of an unselected year must not appear. |
| Catalog over-fetching | Focused call-count assertion | Repeated popover opens or selections must not refetch an already-loaded phase year; changing phases must fetch only the new years. |
| Server year filter regression | `bilateral-projects.service.spec.ts` / controller spec | `year=2025` must filter by 2025; a missing or invalid `year` must keep the active-year behavior without a 5xx. |
| Wrong OR/AND filtering semantics or matching unlinked rows | Existing `bilateral-result-filter.spec.ts` plus focused component tests | Selecting `118,204` excludes one selected project, includes an unlinked row, or bypasses an active creator/role filter. |
| URL/chip drift, unrelated-param loss, or navigation loop | Focused component Jest cases using the route subject and router spy | Selection omits an ID, removes `result=8706`, uses history-pushing navigation, or calls navigation repeatedly after hydration. |
| Broken placement, focus visibility, keyboard interaction, or tablet fit | Manual browser check at the implementation HITL gate | Tab/Enter/Space cannot operate the control, focus is not visible, or the page gains horizontal overflow at 1280px/900px. Jest DOM presence is explicitly insufficient evidence for these rendered behaviors. |

Automated commands:

- Client: `npx jest --silent --reporters=summary --no-coverage --runInBand src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts src/app/pages/bilateral/bilateral-result-filter.spec.ts src/app/pages/bilateral/bilateral-query-params.spec.ts`
- Client lint: `npx ng lint --quiet`
- Server: `npx jest --silent --reporters=summary --forceExit src/api/bilateral`
- Server lint: `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`

The browser check is an explicit manual substitute because jsdom cannot prove overlay geometry, visible focus, or responsive overflow.

## 10. Requirement ID Index

| ID | Summary | Scenarios | Acceptance criteria |
|---|---|---|---|
| `PMF-R-1` | Select and apply the center's projects per phase | Filter by two projects; Phase-scoped options; Catalog loading, empty, and failure | `PMF-AC-1`, `PMF-AC-2`, `PMF-AC-4` |
| `PMF-R-2` | Preserve project filters in URL and chips | Select, share, and clear projects; Deep-linked project absent from the catalog | `PMF-AC-1`, `PMF-AC-2` |
| `PMF-NFR-1..5` | Performance, accessibility, responsive, compatibility, security constraints | Cross-cutting | `PMF-AC-1..4` |

## 11. Dependencies, Assumptions & Open Questions

- Dependency: the existing `GET /api/bilateral/center/projects` endpoint and the `ClarisaProject.phase` field holding the reporting year.
- Assumption approved through the pivot: **Project** means the center's own bilateral project catalog, phase-scoped by the selected reporting phases.
- Open questions: none.

## Required Cross-References

- [`proposal.md`](./proposal.md)
- [`execution.md`](./execution.md) Pivot Record
- `docs/prd.md` §5, G4/M4.2, AC-3, AC-9
- `docs/ux-ui/design.md` §6, §8, §9, §10
- `docs/trd/trd.md` §6 and §10
- Archived `changes/sp-overview-echarts/results-tab-filter-deeplink` specification
