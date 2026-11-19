# Requirements — INC-168459 Portfolio Overview feedback (`POD`)

**Answer first:** Three behaviors on `/portfolio-overview`:
- **POD-R-1:** the By P/A chart becomes horizontal, with readable `code · name` labels.
- **POD-R-2:** Programs/Accelerators switched off for the phase leave the three P/A blocks. This is how SGP-02 leaves 2026.
- **POD-R-3:** the Contribution requests block says who must act.

Point 1 of the ticket (991 vs 989) needs no code. It is a registry data gap (`proposal.md` §9).

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results-framework-reporting` (server) · `result-framework-reporting/pages/portfolio-overview` (client) |
| Spec Path | `bugfix/inc-168459-portfolio-overview-data` |
| Type | Change (reclassified from Bug, see `proposal.md` §1) · Deliverable: software |
| Depth | Lite |
| Approval Mode | gated |
| Ticket | INC-168459 |
| Status | approved (Phase 1, user "sigue con el diseño", 2026-11-19) |
| Date | 2026-11-19 |
| Sibling spec (follow-up) | Hide switched-off initiatives across the rest of phase 2026 (home "Other projects", side menu, search, admin pickers). User decision 2026-11-19: separate spec, same per-phase-switch mechanism. Not created yet |

## 2. Context

- The reporter (PMU, CGIAR System Organization) wants full Program titles in the By P/A chart and no SGP-02 row. SGP-02 does not report in 2026. They also read "Pending 539" as possibly owed by W3/Bilateral projects or Centers.
- Today:
  - The chart labels are codes only (`projects.format.ts:37`, `projects.charts.ts:37`).
  - The three blocks list every active P25 initiative of entity types 22/23/24, SGP-02 included (`results-framework-reporting.service.ts:966-970, 1099-1105, 1264-1270`).
  - The subtitle reads "Requests between Programs/Accelerators to contribute to a result. Pending = not answered yet." (`portfolio-overview.copy.ts:150`).
  - Every counted request is initiative-to-initiative (`share-result-request.repository.ts`, `getPortfolioContributionRequestFacts`: `request_type = 'contribution'`, status 1/2/3). Projects and Centers have no request rows: `results_by_projects` holds only `result_id`, `project_id`, `contribution_percentage`.
- PRD: PMU persona, portfolio consolidation (`docs/prd.md` §3, flow step 7). TRD: `results-framework-reporting` module, Portfolio Overview endpoints.
- Extends archived specs WPS (`2026-10-16-…w3-projects-section`) and CRP (`2026-11-04-…contribution-requests-by-pa`).

## 3. Scope

| In | Out |
|---|---|
| By P/A and By Center chart orientation and labels | Chart colors, series, tabs, KPI tiles |
| Excluding switched-off initiatives from the **P/A rows** of ToC coverage, W3 projects and Contribution requests | Typology block (data-driven from results) · every non-Portfolio-Overview surface (sibling spec) |
| One explainer line in the Contribution requests block | Splitting Pending by result source · request workflow |
| Rollout step: switch SGP-02 off for the 2026 phase in Admin → Phase management | New admin UI · migrations |

## 4. Personas

| Persona | Change |
|---|---|
| PMU lead / admin | Reads full P/A names, sees no SGP-02 row, and understands that only P/As answer requests |
| Platform admin | Switches an initiative off per phase. The existing switch now also hides it in Portfolio Overview |

## 5. Functional Requirements

### POD-R-1 — By P/A chart reads full names (MUST)

The chart SHALL draw one **horizontal** bar group per row. Categories go on the vertical axis, in the existing order (natural code order for P/A, A→Z with Unassigned last for Center). Each P/A label SHALL read `<code> · <short name>`, and the official full name SHALL appear in the tooltip and in the table's first column. The By Center tab SHALL use the same horizontal orientation, with its existing labels.

#### Scenario 1.1: Full names visible
- GIVEN phase 2026 with programs SP01–SP13
- WHEN the admin opens the W3/Bilateral projects block, By P/A, Chart
- THEN each row label shows code and short name (e.g. `SP09 · Scaling for Impact`), with the three bars (Mapped, With W3/Bilateral, Contributing to W1/W2) and their value labels
- AND hovering a row shows the official full name and the three values
- BUT a label must NOT be rotated, and it must NOT be cut to the code alone

#### Scenario 1.2: Phone width
- GIVEN a 390 px wide viewport (and also 1280 px)
- WHEN the chart renders
- THEN no label is clipped by the chart container. A label MAY wrap to two lines
- AND IT MUST NOT add horizontal page scroll

#### Scenario 1.3: Table view
- WHEN the admin switches to Table
- THEN the first column shows `<code> · <full name>`, and the totals row is unchanged

### POD-R-2 — Switched-off initiatives leave the Portfolio Overview P/A rows (MUST)

For the requested phase, an initiative whose per-phase reporting switch is **off** (an explicit `reporting_enabled = false` row for that phase) SHALL NOT appear as a P/A row in ToC coverage, W3/Bilateral projects (`byProgram`) or Contribution requests (`byProgram`). An initiative with no switch row SHALL keep appearing (absent = enabled).

#### Scenario 2.1: SGP-02 hidden in 2026
- GIVEN SGP-02 is switched off for the 2026 phase
- WHEN any of the three blocks loads for 2026
- THEN no SGP-02 (or SGP02) row, bar or table line appears
- AND every other P/A row and its figures are unchanged

#### Scenario 2.2: Totals keep their definitions
- GIVEN a project or request that involves a switched-off initiative
- WHEN the W3/Bilateral projects and Contribution requests totals are computed
- THEN those `totals` keep their current definitions: a mapped project still counts once (it still matches the mapping registry), and a request still counts once
- BUT the project or request must NOT be credited to any row of the switched-off initiative
- AND the ToC coverage `portfolio` figure, which is defined as the sum of its program rows (`results-framework-reporting.service.ts:1028`), SHALL be the sum of the **visible** rows only, so a switched-off initiative's ToC indicators leave it

#### Scenario 2.3: Other phases and default
- GIVEN SGP-02 has no switch row for another phase, or its switch is on
- WHEN that phase loads
- THEN SGP-02 rows appear as today
- AND IT MUST NOT require a switch row for each enabled initiative

### POD-R-3 — Contribution requests say who must act (MUST)

The block's explainer SHALL state that requests are sent and answered only by Programs/Accelerators, and that W3/Bilateral projects and Centers do not receive requests and need no action. "Pending" SHALL remain defined as "not answered yet".

#### Scenario 3.1
- WHEN the block renders, in any state that shows the header
- THEN the subtitle reads: "Requests between Programs/Accelerators to contribute to a result. Only Programs/Accelerators send and answer them; W3/Bilateral projects and Centers do not receive requests and need no action. Pending = not answered yet."
- BUT the counts, ordering and filters must NOT change

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Response shapes of the three endpoints unchanged (same fields; only fewer `byProgram` items). No bilateral or platform-report contract touched |
| Performance | At most one extra indexed read per request (switch rows for one version) |
| Security | Endpoints stay admin-only as today |
| Accessibility | The chart keeps its accessible table. Labels keep `--pr-text-secondary` contrast (`docs/ux-ui/design.md` §10) |
| i18n | The new copy lives in `portfolio-overview.copy.ts` |

## 7. Defect classes → gate

| Defect class | Gate |
|---|---|
| Wrong rows (switched-off initiative still listed, or an enabled one dropped, absent-row default inverted) | Server Jest on the 3 service methods (`npx jest --silent --reporters=summary --forceExit <files>`) |
| Totals drift | Same server specs, with an assertion on `totals` |
| Chart option wrong (axis orientation, label text, tooltip name) | Client Jest on `projects.charts` / `projects.format` |
| Copy wrong | Client Jest on the block |
| Type/template errors | `npx ngc -p tsconfig.app.json --noEmit` + server `tsc` via build |
| **Labels clipped or page scroll at 390 px** (layout) | **No automated gate**: jsdom cannot measure the ECharts canvas. Substitute: a real-browser check at 390 and 1280 px at the validation HITL pause, with screenshots |
| SGP-02 not actually switched off in prod data | Rollout check: SQL on PRPROD (design §Premise Ledger), owner: user |

## 8. Requirement ID Index

| ID | Title | Owner task |
|---|---|---|
| POD-R-1 | Horizontal By P/A chart with full names | set in tasks.md |
| POD-R-2 | Switched-off initiatives leave the P/A rows | set in tasks.md |
| POD-R-3 | Contribution requests explainer | set in tasks.md |

## 9. Dependencies & Assumptions

- Upstream: `phase_initiative_reporting_access` (P2-2821) and the admin toggle `PATCH …/phases/:phaseId/reporting-initiatives/:initiativeId`.
- SGP-02 is listed in the admin toggle. Its type is "Science programs", and eligibility is by entity-type name (`admin-panel.service.ts:858-866`). Verified by PRPROD SQL on 2026-11-19 (POD-OQ-1).
- Downstream: only the Portfolio Overview client.

## 10. Open Questions

- ~~POD-OQ-1~~ **Resolved 2026-11-19 (PRPROD SQL, run by the user):** SGP-02 = `clarisa_initiatives.id` 41, entity type "Science programs", so it is eligible and listed in the admin toggle. Its only switch row is version 6 (phase_year 2025) with `reporting_enabled = 0`. It has **no row for 2026**, so today it is enabled there. Rollout = the admin switches it off for the 2026 phase. Consequence: SGP-02 also leaves the 2025 Portfolio Overview rows, where it is already off (see design).
