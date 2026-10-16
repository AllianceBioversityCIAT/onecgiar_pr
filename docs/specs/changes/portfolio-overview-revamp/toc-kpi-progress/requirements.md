# Requirements — Portfolio Overview: Progress against ToC KPIs, by Program / Accelerator

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-progress/` |
| Parent Spec | `changes/portfolio-overview-revamp` (family #5) |
| Depends on | #4 `typology-view` (`done`, committed `e68016663`), for the client half only. The server half has no dependency. #8 `w3-projects-section` (client half) depends on this spec's template order |
| Module | Server: `api/results-framework-reporting` (new portfolio-wide aggregate). Client: `result-framework-reporting` › `portfolio-overview` (replaces the matrix section) |
| Type | Change |
| Depth | **Full**: a new API endpoint, a cross-schema aggregate over `${DB_TOC}` × PRMS, and the removal of a delivered section (matrix, chart, Excel export) |
| Approval Mode | gated |
| Status | approved (2026-10-15, Phase 1 gate; TKP-OQ-1..6 at recommended defaults) |
| Source | Parent `proposal.md` item 6: *"Program X has 250 KPIs; pooled results submitted/in QA cover 100 → 40%"*, plus parent OQ-2, OQ-3 and R-2. No child `proposal.md`: the parent row is the approved intent |
| Requirement prefix | `TKP` |
| PRD | `US-P1` (PMU tracks progress), `AC-3` (backend role check), `AC-5` (phase-scoped reads) |

## 2. Executive Summary

The section "Progress by science program" counts results per type for each Program. Stakeholders want to see how much of what each Program **committed to in its ToC** is already backed by results. Raw volume does not tell them that.

This spec replaces that section with **Progress against ToC KPIs**:

- **One row per Program or Accelerator:** `covered KPIs / total ToC KPIs (%)` and a proportional bar.
- **Covered** = the KPI has **≥ 1 pooled (W1/W2) result in QA or Submitted status** mapped to it in the open phase.
- **A portfolio summary line:** Σ covered / Σ total.
- **One new server call** returns every Program at once. The client never loops per Program (parent R-2).

The old matrix goes away: its heatmap table, its chart toggle, its search, filters, pagination and Excel export.

## 3. Glossary

| Term | Meaning here |
|---|---|
| P/A | A Program or Accelerator of the open portfolio (CLARISA initiatives, portfolio P25), identified by official code (`SP01`…, `A…`) |
| ToC KPI | One distinct, active indicator (`toc_results_indicators.id`) on an **in-scope ToC node** of the P/A, for the open ToC phase (TKP-R-1) |
| In-scope node | An active ToC result of the P/A in the open ToC phase with category **OUTPUT**, or **OUTCOME** linked to an Area of Work. This is the node scope that `toc-results/program-progress` uses today |
| Pooled result | A result with `source = 'Result'` (W1/W2), never `'API'` (W3/Bilateral) |
| Counting status | QA = Quality Assessed (2) or Submitted (3) |
| Covered KPI | A ToC KPI with ≥ 1 active pooled result in a counting status, from the page's phase version, mapped to it (TKP-R-2) |
| Coverage % | covered ÷ total × 100, displayed per TKP-R-4 |
| Page version | The version the page already uses: the open phase, or the newest version when the phase is closed (`closedPhase()`) |

## 4. Scope

**In:**
- A new authenticated, admin-only GET endpoint that returns coverage for every P/A in one call.
- A new section on `/portfolio-overview` where "Progress by science program" sits today: after "Results by typology", before the CGIAR Centers block.
- The section's own loading, error (with retry) and empty states.
- Removing the matrix section and the code and specs that only it uses.
- Copy in `internationalization/portfolio-overview.copy.ts`.
- Updating `portfolio-overview/CLAUDE.md`.

**Out:**
- Changing `toc-results/program-progress` or any Program / Center Overview page.
- End-of-Initiative outcomes (EOIs / 2030 outcomes). They use a cumulative 2025–2030 window, and the stakeholder asked about the open year.
- Target attainment, i.e. achieved vs target values. Coverage only asks whether a KPI is backed by a result.
- W3/Bilateral contribution (family #8 has the W3 projects section).
- Global filters (family #6) and Excel export (family #9).
- Per-KPI drill-down lists.

## 5. Personas

Admin / PMU readers of `/portfolio-overview` (`CheckAdminGuard` on the client; the new endpoint checks the role on the server too).

## 6. Functional Requirements

### TKP-R-1 — Total ToC KPIs per P/A

The system SHALL count, per P/A, the **distinct** active indicators on its in-scope nodes for the ToC phase that the page version resolves to. An indicator SHALL count once even when it has several target rows, or when its output node has no Work Package and would otherwise appear under every AoW.

#### Scenario S-1.1: Distinct, in-scope count
- GIVEN P/A `SP01` has, in the open ToC phase:
  - output node N1 (in an AoW) with indicators I1 and I2;
  - output node N2 (no Work Package) with indicator I3, whose two targets differ by center;
  - outcome node N3 in an AoW with indicator I4;
  - outcome node N4 **not** linked to any AoW, with indicator I5;
  - an inactive indicator I6 on N1.
- WHEN the coverage is computed
- THEN total KPIs for `SP01` = 4 (I1, I2, I3, I4)
- BUT I3 must NOT count twice, and I5 and I6 must NOT count
- AND IT MUST NOT include EOI / 2030-outcome nodes

#### Scenario S-1.2: Phase scope
- GIVEN `SP01` also has active indicators in a previous ToC phase
- WHEN the page version resolves to the current ToC phase
- THEN only current-phase indicators count

### TKP-R-2 — Covered ToC KPIs per P/A

A KPI SHALL count as covered when at least one result meets **all** of these:

- active;
- `source = 'Result'`;
- in status 2 or 3;
- in the page version;
- mapped to that indicator through an active ToC mapping (`results_toc_result`) and an active indicator link that is **not** marked not-applicable.

The submitting Program of the result SHALL NOT matter. A result submitted by `SP02` and mapped to an `SP01` indicator covers it for `SP01`. A KPI SHALL count once however many results cover it.

#### Scenario S-2.1: Pooled, counting status only
- GIVEN indicator I1 of `SP01` is linked by:
  - result R1 (pooled, Submitted);
  - result R2 (pooled, Submitted);
  - result R3 (W3/Bilateral, Approved).
- AND indicator I2 is linked only by R4 (pooled, Editing)
- AND indicator I3 is linked only by R5 (pooled, QA), via a link marked not-applicable
- WHEN the coverage is computed
- THEN covered for `SP01` = 1 (I1, counted once)
- BUT R3 must NOT cover anything (W3/Bilateral), R4 must NOT cover I2 (Editing), and R5 must NOT cover I3 (not-applicable)
- AND IT MUST hold that covered ≤ total for every P/A

#### Scenario S-2.2: Cross-Program mapping
- GIVEN a pooled Submitted result submitted by `SP02` is mapped to indicator I4 of `SP01`
- THEN I4 is covered for `SP01`
- AND the result adds nothing to `SP02`'s covered count

#### Scenario S-2.3: Version scope
- GIVEN a pooled Submitted result of a previous phase version is mapped to I1
- AND no result of the page version is
- THEN I1 is **not** covered

### TKP-R-3 — One portfolio-wide call

The server SHALL return coverage for **every** active P/A of the open portfolio in a single request, keyed by the page version. That includes P/As with zero KPIs. The client SHALL make exactly one request for the section per page load or retry.

Each P/A entry SHALL carry: official code, short name, name, total KPIs, covered KPIs, and the same two counts split by node category (Output / Outcome).

#### Scenario S-3.1: Zero-KPI Program is present
- GIVEN Accelerator `A3` has no in-scope indicators in the phase
- WHEN the endpoint answers
- THEN `A3` is present with total = 0 and covered = 0
- BUT the client must NOT fire a second request for it

### TKP-R-4 — Section content

The section SHALL be titled **"Progress against ToC KPIs"**. A subtitle SHALL state the rule in plain words: *KPIs covered by at least one W1/W2 result in QA or Submitted status, out of the KPIs in each Program's Theory of Change for <year>*.

Each P/A row SHALL show:

- code and name;
- `covered / total`;
- coverage %;
- a horizontal bar filled to that %;
- a muted line `Outputs a / b · Outcomes c / d`.

The **coverage %** SHALL be shown as a whole number using half-up rounding, with two clamps:

- **100%** is shown only when covered = total. Otherwise the value is capped at 99%.
- **0%** is shown only when covered = 0. Otherwise the value is at least 1%.

A row with total = 0 SHALL show **"No ToC KPIs in this phase"**. It SHALL NOT show a %, a bar, `0 / 0`, `NaN` or `—%`.

A **portfolio summary** above the rows SHALL show Σ covered / Σ total and its % (same rounding). Zero-KPI rows add 0 to both sums.

#### Scenario S-4.1: Display maths
- GIVEN `SP01` covered 100 of 250, `SP02` 0 of 40, `SP03` 199 of 200, `SP04` 1 of 300, `A3` 0 of 0
- THEN the rows read 40%, 0%, 99%, 1%, and "No ToC KPIs in this phase"
- AND the summary reads 300 / 790 → 38%
- BUT `SP03` must NOT read 100%, and `SP04` must NOT read 0%

### TKP-R-5 — Order is not a ranking

Rows SHALL be listed by official code in natural order (`SP01` … `SP13`, then Accelerators by code). Rows SHALL NOT be ordered by coverage, and the section SHALL offer no sort control. The family removed rankings for exactly this reason.

#### Scenario S-5.1
- GIVEN `SP10` has 90% and `SP02` has 10%
- THEN `SP02` is listed before `SP10`
- AND `SP09` before `SP10` (natural, not lexical, when codes are not zero-padded)

### TKP-R-6 — Program link (preserves the delivered navigation)

Each P/A name SHALL be a button that opens that Program's Results tab (`/result-framework-reporting/entity-details/<code>/results`), with an accessible name *"Open the Results tab of <name>"*. The matrix row name went to the same place (`openProgramme(code)`). Counts, %, bars and the summary SHALL NOT be links (parent Non-Goal P2-3304). The matrix's per-cell and total-cell jumps to the Results center are not carried over (TKP-R-9).

### TKP-R-7 — States, independent of the rest of the page

The section SHALL request coverage only once the page has figures (`hasFigures()`). It SHALL use the version of the page rows.

| State | Behaviour |
|---|---|
| Loading | A skeleton of the section. No zero figures |
| Error | A short message plus a **Retry** button. The rest of the page stays intact |
| Empty | Every P/A has total = 0 (or the list is empty). Show one line: *"No ToC KPIs are defined for this phase yet."* No rows |
| Success | TKP-R-4 |

The page's own loading skeleton SHALL show the section skeleton where the matrix skeleton was. The closed-phase banner SHALL apply to this section unchanged (it reads the newest version).

#### Scenario S-7.1: Section failure does not break the page
- GIVEN the coverage request fails with a 500
- WHEN the page renders
- THEN KPI cards, Status, Typology and Centers render normally
- AND the section shows the error message and Retry
- BUT no technical detail (stack, SQL, URL) is shown
- AND IT MUST re-request exactly once per Retry click

### TKP-R-8 — Backend authorization

The endpoint SHALL require a valid JWT (`auth` header) **and** the Admin application role. A non-admin caller SHALL receive 403, with no data in the body (`AC-3`).

#### Scenario S-8.1
- GIVEN a logged-in user without the Admin application role
- WHEN they call the endpoint
- THEN the response is 403
- BUT the body must NOT contain coverage data

### TKP-R-9 — The results-per-type matrix is removed (REMOVED)

The section "Progress by science program" SHALL be removed with everything only it used:

- heatmap table;
- table / chart toggle and chart;
- search;
- SP and indicator filters;
- column picker and column resize;
- rows-per-page and pagination;
- footer total row;
- Excel export;
- cell / chart drill-down.

**Migration notes for readers:**

- Program × result-level counts live in **Results by typology → By Program / Accelerator** (family #4).
- The Program destination is kept per TKP-R-6.
- An export of the page's figures returns with family #9 `filtered-detail-export`.

#### Scenario S-9.1
- GIVEN the page has figures
- THEN no element `#progress-by-science-program` exists, and no "Export Excel" of the matrix is offered
- AND "Results by typology" is still directly followed by the new section, then by the Centers block

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | The endpoint answers in **p95 ≤ 3 s** on prdb-sized data, for all P/As (QAS-3 budget for a page load). It is measured at the HITL check with 3 runs. One request per page load |
| Correctness parity | For at least **2 P/As**, the endpoint's total and covered match an independent verification SQL run by the user on prdb (parent success criterion) |
| Security | JWT + `ValidRoleGuard` with Admin. No secrets or SQL in errors. The query binds parameters (no interpolated caller input) |
| Backwards compatibility | Additive endpoint. `program-progress` and every other endpoint are unchanged. No migration |
| Accessibility | WCAG 2.1 AA. The list has an accessible name. Each bar has `role="img"` (or `meter`) with a text equivalent ("40% — 100 of 250 KPIs covered"). Bar fill vs track ≥ 3:1 (1.4.11). Retry and links are keyboard-operable with a visible focus ring |
| Responsive | No horizontal page scroll at 375px. At < 640px, `covered / total` and % sit above a full-width bar |
| Design rules (client `CLAUDE.md` §5) | Tailwind-first. `var(--pr-*)` only, no hex (rule 8). Numbers `font-mono tabular-nums`, right-aligned (rule 13). Explicit px type (rule 20). Neutral content surfaces (rule 7). Continuous bar, not a segmented meter (rule 15) |
| i18n / copy | Every new string goes in `portfolio-overview.copy.ts` |
| Folder docs | `portfolio-overview/CLAUDE.md` updated and its `Verified:` line re-stamped in the same commit |

## 8. Defect classes → the gate that catches each

| Defect class | Gate |
|---|---|
| KPI inflation: target rows, a no-WP output repeated per AoW, out-of-AoW outcomes, inactive indicators, EOIs | Server Jest on the aggregate's SQL predicates and on the row-to-payload mapping (S-1.1), **plus live parity at the HITL check**: independent SQL vs endpoint for ≥ 2 P/As. **Jest with a mocked query cannot prove the SQL right; only the live parity can** |
| Coverage leaking W3/Bilateral, Editing, not-applicable links or other versions | Server Jest asserts the bound predicates (S-2.1, S-2.3) + live parity |
| Indicator links auto-created for every node indicator (coverage = "node mapped", not "KPI chosen") | **No automated gate.** Substitute: a premise check query run by the user before execution (design §1A) |
| Wrong display maths (rounding, clamps, 0/0) | Client Jest on the formatter (S-4.1) |
| Ranking regression (ordered by %) | Client Jest (S-5.1) |
| N+1 calls per Program | Client Jest: exactly one HTTP call (S-3.1, S-7.1) |
| Section failure breaking the page | Client Jest (S-7.1) |
| Non-admin access | Server Jest on guard metadata (presence only). **The behaviour (403 for a non-admin token) is proven by a manual call at the HITL check** |
| Slow aggregate (> 3 s) | **No automated gate.** Substitute: 3 timed calls at the HITL check. If they differ by more than 1 s, report the spread; it is not evidence |
| Bar too faint, overflow at 375px, bar not announced | **jsdom cannot measure or lay out.** Substitute: browser check at 1280 / 768 / 375 at the HITL pause, plus a contrast reading of fill vs track |
| Stale specs asserting removed matrix copy | Scoped client Jest on `portfolio-overview` (`--maxWorkers=2`) |

## 9. Dependencies & Assumptions

- **A-1:** ToC tables live in the `${DB_TOC}` schema on the same `DataSource`. PRMS tables are in `${DB_NAME}`.
- **A-2:** The page version resolves to a ToC phase and year through `ReportingTocContextService.resolveByVersionId` (the same resolution `program-progress` uses).
- **A-3:** The P/A list = CLARISA initiatives with `portfolio_id = 3`, active, `cgiar_entity_type_id IN (22, 23, 24)` (the seed used by `get/science-programs/progress`).
- **A-4:** Pooled results never carry status 6 (Approved). That status belongs to the bilateral review flow, so excluding it changes nothing for `source = 'Result'`.

## 10. Open Questions (recommended defaults; confirm at the Phase 1 gate)

| ID | Question | Recommended default |
|---|---|---|
| TKP-OQ-1 | What is a "ToC KPI"? (parent OQ-2) | **Distinct active indicators on OUTPUT nodes + OUTCOME nodes in an AoW, open ToC phase. No EOIs.** This is the node scope of `program-progress` (P2-3336), counted per indicator and not per target row |
| TKP-OQ-2 | Which statuses count? (parent OQ-3) | **QA (2) + Submitted (3).** Approved (6) is bilateral-only (A-4) |
| TKP-OQ-3 | Does a link alone make a KPI covered, or must the result report a contribution value > 0? | **The link alone** ("has a result", as the stakeholder phrased it). A value-based rule is a different metric (target attainment), which is out of scope |
| TKP-OQ-4 | Show a portfolio summary line? | **Yes** (Σ covered / Σ total). It is not competitive, and it answers "how far along is the portfolio" |
| TKP-OQ-5 | Keep a link from each P/A name? | **Yes**, to the Program's Results tab (TKP-R-6), the destination the matrix name already used. The Results-center jumps from the cells are dropped with the matrix |
| TKP-OQ-6 | Show the Output / Outcome split per row? | **Yes**, as a muted secondary line. The data is in the same query |
