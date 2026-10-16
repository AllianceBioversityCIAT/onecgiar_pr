# Requirements — Portfolio Overview: W3/Bilateral projects, by P/A and by Center

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/w3-projects-section/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #8) |
| Depends on | Server half: none. Client half: #5 `toc-kpi-progress` (code committed `154079643` / `34b9f5ad6`; family status still `pending` until its PRTest smoke — **warning, not a block**: this spec only appends a mount after the Centers block) |
| Module | Server: `api/results-framework-reporting` (new portfolio aggregate). Client: `result-framework-reporting` › `portfolio-overview` (new block) |
| Type | Change |
| Depth | **Full**: a new admin-only API endpoint and a new SQL aggregate over CLARISA projects × PRMS results |
| Approval Mode | gated |
| Status | approved (2026-10-16, Phase 1 gate; WPS-OQ-1..6 at recommended defaults) |
| Source | [`proposal.md`](./proposal.md) (approved 2026-10-15; OQ-1..4 at recommended defaults), stakeholder email item 10 (`image008.png`, `image009.png`) |
| Requirement prefix | `WPS` |
| PRD | `US-P1` (PMU tracks progress), `AC-3` (backend role check), `AC-5` (phase-scoped reads) |

## 2. Executive Summary

The stakeholder wants to see, per Program/Accelerator and per Center, **how many W3/Bilateral projects exist, how many are reporting, and how many feed pooled results**. Nothing on `/portfolio-overview` talks about projects today.

This spec adds a **W3/Bilateral projects** block:

| Figure | Meaning |
|---|---|
| **Mapped projects** | Active CLARISA projects of the page's phase year with ≥ 1 approved P/A mapping |
| **With W3/Bilateral results** (+ % of mapped) | Mapped projects linked to ≥ 1 W3/Bilateral result of the page version |
| **Contributing to W1/W2 results** (+ % of mapped) | Mapped projects linked to ≥ 1 pooled result of the page version |

Each figure shows as a portfolio total and as grouped bars **By P/A** and **By Center**, with a table view. **One server call** returns everything; the "mapped projects" figure needs the project catalogue, so it cannot be counted from result rows.

## 3. Glossary

| Term | Meaning here |
|---|---|
| P/A | A Program or Accelerator of the open portfolio (CLARISA initiatives, P25), identified by official code (`SP01`…, `A…`) |
| Page version | The version the page already uses: the open phase, or the newest version when the phase is closed |
| Phase year | `phase_year` of the page version. Projects are matched on `clarisa_projects.phase` = phase year |
| Active project | `clarisa_projects.is_active` is 1 **or NULL** (the Center Overview rule) |
| Approved mapping | A `clarisa_project_mappings` row with a non-blank `program_code`, `allocation > 0` and `status = 'Confirmed'` (rule P2-3313) |
| Mapped project | An active project of the phase year with ≥ 1 approved mapping |
| Project Center | The CGIAR Center a project belongs to: its `organization_code` institution, otherwise its `source_center_acronym` alias; otherwise **Unassigned** |
| W3/Bilateral result | A result with `source = 'API'` |
| Pooled result | A result with `source = 'Result'` (W1/W2) |
| Project link | An active `results_by_projects` row to an active result of the page version |

## 4. Scope

**In:**
- One new authenticated, admin-only GET endpoint that returns totals, by-P/A rows and by-Center rows in one call.
- A new block on `/portfolio-overview`, **after the CGIAR Centers block** (the last section), with its own loading, error (Retry) and empty states.
- Copy in `internationalization/portfolio-overview.copy.ts`.
- `portfolio-overview/CLAUDE.md` updated.

**Out:**
- A list of projects or a drill-down to one project (family #9 has the export).
- Any change to CLARISA sync, to how projects are mapped, or to `api/bilateral/center/projects`.
- Progress or target figures for projects (no planning data).
- Global filters (family #6 decides how they apply here).

## 5. Personas

Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard` on the client; the endpoint checks the role on the server too).

## 6. Functional Requirements

### WPS-R-1 — Mapped projects

The system SHALL count as **mapped** each project that is active, belongs to the phase year, and has ≥ 1 approved mapping. A project SHALL count once in the total however many approved mappings it has.

#### Scenario S-1.1: Approved mapping rule
- GIVEN projects of phase year 2026:
  - P1 active, one mapping `SP01` Confirmed allocation 40;
  - P2 active, one mapping `SP02` **Pending** allocation 50;
  - P3 active, one mapping `SP03` Confirmed allocation **0**;
  - P4 `is_active` NULL, mappings `SP01` Confirmed 60 and `SP04` Confirmed 40;
  - P5 **inactive**, mapping `SP01` Confirmed 100;
  - P6 active, phase **2025**, mapping `SP01` Confirmed 100;
  - P7 active, mapping with a blank `program_code`, Confirmed 100.
- WHEN the summary is computed for a 2026 page version
- THEN the mapped total = 2 (P1, P4)
- BUT P2, P3, P5, P6 and P7 must NOT count
- AND IT MUST count P4 once in the total

### WPS-R-2 — Projects with W3/Bilateral results

The system SHALL count, among mapped projects, those with ≥ 1 project link to a **W3/Bilateral** result of the page version whose status is **not Discontinued (4)**. All other statuses count, including Rejected.

#### Scenario S-2.1
- GIVEN mapped projects P1, P4 and unmapped project P2
- AND P1 is linked to an `API` result of the page version in status Editing
- AND P4 is linked only to an `API` result in status **Discontinued**, and to an `API` result of a **previous** version
- AND P2 is linked to an `API` result of the page version
- THEN "with W3/Bilateral results" = 1 (P1)
- BUT P4 must NOT count (Discontinued, other version), and P2 must NOT count (not mapped)
- AND IT MUST ignore inactive links and inactive results

### WPS-R-3 — Projects contributing to W1/W2 results

The system SHALL count, among mapped projects, those with ≥ 1 project link to a **pooled** result of the page version, **regardless of status**. This is the rule the Center Overview's W1/W2 contributor count already uses, so the two screens agree.

#### Scenario S-3.1
- GIVEN mapped P1 is linked to a pooled result of the page version (Editing)
- AND mapped P4 is linked only to `API` results
- THEN "contributing to W1/W2" = 1 (P1)
- AND IT MUST hold that with-W3 ≤ mapped and W1/W2 ≤ mapped, in the total and in every row

### WPS-R-4 — Mapped projects excluded from (b)

Projects of the phase year with W3/Bilateral results but **no** approved mapping SHALL NOT count anywhere in WPS-R-2. The response SHALL carry their count, and the block SHALL show a footnote when that count is > 0: *"N projects have W3/Bilateral results but no approved P/A mapping, so they are not counted."*

#### Scenario S-4.1
- GIVEN unmapped P2 (S-2.1) is the only such project
- THEN the footnote reads 1 project
- BUT with 0 such projects there is no footnote

### WPS-R-5 — By P/A breakdown

The system SHALL return one row per active P/A of the open portfolio, **including P/As with no mapped project** (all zeros). A project SHALL count under **each** P/A it has an approved mapping to. A row SHALL carry code, short name, name, mapped, with-W3, W1/W2.

The block SHALL say in a caption: *"A project mapped to several P/As counts under each, so the bars add up to more than the total."*

#### Scenario S-5.1
- GIVEN P4 is mapped to `SP01` and `SP04`, P1 to `SP01`
- THEN `SP01` mapped = 2, `SP04` mapped = 1, `SP02` mapped = 0 and is still listed
- AND the P/A rows sum to 3 while the total is 2

### WPS-R-6 — By Center breakdown

The system SHALL assign each mapped project to exactly **one** Center:

1. the Center whose institution is the project's `organization_code`;
2. else the Center that the project's `source_center_acronym` aliases to (the W3 Center alias map);
3. else **Unassigned**.

The Center rows SHALL therefore sum to the total. Centers with no mapped project SHALL NOT be listed. **Unassigned** SHALL be listed last, and only when it is > 0.

#### Scenario S-6.1: Alias fallback
- GIVEN P8 has a NULL `organization_code` and `source_center_acronym = 'CIAT'`
- THEN P8 counts under CIAT's Center (`CENTER-03`)
- AND a project with a NULL org and an unknown acronym counts under Unassigned
- BUT the System Office (`CENTER-17`) and SMO (`CENTER-16`) must NOT be merged

### WPS-R-7 — Order is not a ranking

P/A rows SHALL be listed by official code in natural order (`SP01`…`SP13`, then Accelerators). Center rows SHALL be listed by acronym, alphabetically, Unassigned last. Neither list SHALL be ordered by a figure, and the block SHALL offer no sort control (the family removed rankings).

### WPS-R-8 — Block content

The block SHALL be titled **"W3/Bilateral projects"**, with a subtitle naming the phase year.

- **Three KPI figures:** mapped; with W3/Bilateral results and its % of mapped; contributing to W1/W2 and its % of mapped.
- **% of mapped:** one decimal, half-up. **100.0%** only when equal to mapped; **0.0%** only when the count is 0 (otherwise clamp to 99.9% / 0.1%).
- **A "By P/A | By Center" switch** and a **"Chart | Table" switch.** The chart is grouped bars with three series (mapped, with W3, W1/W2) and a legend. The table has the same rows, the three counts, and a total row taken from the response totals (not a column sum).
- With mapped = 0 the % SHALL NOT render (`NaN`, `—%`); the empty state applies (WPS-R-9).

#### Scenario S-8.1: Display maths
- GIVEN mapped 30, with W3 17, W1/W2 1
- THEN the figures read 30, 17 · 56.7%, 1 · 3.3%
- AND with W3 = 29 of 30 reads 96.7%, and 1 of 1000 reads 0.1%, never 0.0%

### WPS-R-9 — States, independent of the rest of the page

The block SHALL make exactly **one** request per page load or Retry, for the page version.

| State | Behaviour |
|---|---|
| Loading | A skeleton of the block. No zero figures |
| Error | A short message plus **Retry**. The rest of the page stays intact; no technical detail |
| Empty | Mapped total = 0: one line, *"No W3/Bilateral projects are mapped to a Program for <year> yet."* No bars |
| Success | WPS-R-8 |

#### Scenario S-9.1
- GIVEN the request fails with a 500
- THEN every other section renders normally
- AND the block shows the error and Retry
- AND IT MUST re-request exactly once per Retry click

### WPS-R-10 — Backend authorization

The endpoint SHALL require a valid JWT (`auth` header) **and** the Admin application role. A non-admin caller SHALL get 403 with no data (`AC-3`). The route SHALL NOT fall under any JWT-exempt path.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | p95 ≤ 3 s on prdb-sized data (≈ 1,200 projects). Measured with 3 calls at the HITL check |
| Correctness parity | Totals, ≥ 2 P/As and ≥ 2 Centers (one of them CIAT, to exercise the alias) match an independent verification SQL on the DB the server uses |
| Security | JWT + `ValidRoleGuard` Admin. Bound parameters only. No SQL or stack in error bodies |
| Backwards compatibility | Additive endpoint. No migration. `api/bilateral/center/projects` unchanged |
| Accessibility | WCAG 2.1 AA: switches are keyboard-operable with `aria-pressed`/tab semantics; the chart has a text table equivalent; series colours ≥ 3:1 against the surface |
| Responsive | No horizontal page scroll at 375px; the table scrolls inside its own container |
| Design rules (client `CLAUDE.md` §5) | Tailwind-first, `var(--pr-*)` only, `font-mono tabular-nums` right-aligned numbers, explicit px type, neutral surfaces, chart tokens (not the screenshot's green/yellow/blue) |
| i18n / copy | Every new string in `portfolio-overview.copy.ts` |
| Folder docs | `portfolio-overview/CLAUDE.md` updated and re-stamped in the same commit |

## 8. Defect classes → the gate that catches each

| Defect class | Gate |
|---|---|
| Wrong mapped set (pending/zero-allocation mappings, inactive or other-year projects, NULL `is_active` dropped) | Server Jest on the aggregate's predicates (S-1.1) **plus live parity**. A mocked query cannot prove the SQL; only parity can |
| Double-counting a multi-P/A project in the total | Server Jest (S-1.1, S-5.1) + parity |
| W1/W2 links leaking into (b), or W3 links into (c) (`results_by_projects` holds both) | Server Jest asserting the bound `source` + parity |
| Wrong Center (alias not applied, SO/SMO merged, unassigned lost so Centers ≠ total) | Server Jest with a NULL-org fixture (S-6.1) + parity on CIAT |
| Display maths (% rounding, clamps, 0 mapped) | Client Jest on the formatter (S-8.1) |
| Ranking regression | Client Jest on row order (WPS-R-7) |
| N+1 calls / failure breaking the page | Client Jest: one HTTP call, error state isolated (S-9.1) |
| Non-admin access, JWT-exempt route | Server Jest on guard metadata (presence only). **Behaviour: a manual non-admin call at the HITL check** |
| Slow aggregate | **No automated gate.** 3 timed calls at HITL; a spread > 1 s is reported, not taken as evidence |
| Chart unreadable, overflow at 375px, series contrast | **jsdom cannot lay out.** Browser check at 1280 / 768 / 375 at the HITL pause |

## 9. Dependencies & Assumptions

- **A-1:** `clarisa_projects.phase` holds a year; the page version's `phase_year` is that year.
- **A-2:** The P/A list = CLARISA initiatives with `portfolio_id = 3`, active, `cgiar_entity_type_id IN (22, 23, 24)` (the seed `toc-results/portfolio-coverage` uses).
- **A-3:** Center ↔ project: `organization_code` = the Center's institution id; the alias map is `W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE` (10 entries, case-sensitive).

## 10. Open Questions (proposal defaults; confirm at the Phase 1 gate)

| ID | Question | Default |
|---|---|---|
| WPS-OQ-1 | "Mapped" = approved mappings only? (proposal OQ-1) | **Yes**, the P2-3313 rule the Center Overview uses |
| WPS-OQ-2 | Statuses in (b)? (proposal OQ-2) | **All except Discontinued** |
| WPS-OQ-3 | Statuses in (c)? (not in the proposal) | **All**, matching the Center Overview's W1/W2 contributor count. Applying OQ-2 here too would break that parity |
| WPS-OQ-4 | W3 results on unmapped projects? (proposal OQ-3) | **Not counted**; footnote with the count (WPS-R-4) |
| WPS-OQ-5 | Where is the block? | **After the CGIAR Centers block** (proposal §9), as the page's last section |
| WPS-OQ-6 | Show Unassigned in By Center? | **Yes, last, only when > 0**, so the Center bars still add up to the total |
