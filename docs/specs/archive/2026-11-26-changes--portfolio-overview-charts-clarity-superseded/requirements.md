# Requirements — Portfolio Overview charts clarity (`POC`)

**Answer first:** four behaviors on `/portfolio-overview`, from the PMU ticket of 2026-11-18:

| ID | Behavior | Work |
|---|---|---|
| POC-R-1 | Each Typology row's two bars are explained on screen | Already built (`fcb7518d4`), ships with the next merge. A guard test only |
| POC-R-2 | The By Center footnote says plainly what is counted | Copy |
| POC-R-3 | The W3/Bilateral projects chart uses three clearly different colors | Client palette |
| POC-R-4..R-6 | "With W3/Bilateral results" per P/A follows the P/As named **on the result** (primary or contributing), not the project's CLARISA mapping | Server rule + caption |

## 1. Document Control

| Field | Value |
|---|---|
| Module | `results-framework-reporting` (server) · `result-framework-reporting/pages/portfolio-overview` (client) |
| Spec Path | `changes/portfolio-overview-charts-clarity` |
| Type | Change |
| Deliverable | software |
| Depth | Standard (server business rule + client UI; no migration, no payload shape change) |
| Approval Mode | gated |
| Ticket | Freshservice "Portfolio dashboard/overview" (PMU, CGIAR System Organization, 2026-11-18) |
| Proposal | `proposal.md`, approved 2026-11-20 ("apruebo … sigamos con specify") |
| Decisions | OQ-1 → **Union** · OQ-2 → **every non-declined contribution** (user, 2026-11-20, in-session question) |
| Depends on | `bugfix/inc-168459-portfolio-overview-data` (POD, `[~]`, same files) |
| Status | approved (2026-11-20) |
| Date | 2026-11-20 |

## 2. Glossary

| Term | Meaning |
|---|---|
| P/A | A Program or Accelerator of the open portfolio (the seed of `getPortfolioBilateralProjects`) |
| W3 result | `result.source = 'API'`, active, of the page version, status not Discontinued (the rule `has_bilateral` already uses) |
| P/A **named on** a result | A P/A that is: the primary (active `results_by_inititiative` role 1); an accepted contributor (active role 2); or an active `share_result_request` toward it in status Pending (1) or Draft (4), of type `contribution` or `primary`. Declined (3) and inactive rows never name a P/A |
| Mapped project | A project with ≥ 1 approved CLARISA mapping (Confirmed, allocation > 0) to any P/A. Rule unchanged |
| Two bars per row | Typology chart: top = Submitted bucket (every status except Editing), bottom striped = Editing |

## 3. System Context & Scope

Today:

- The Typology chart draws two bars per row, and the key above it explains them (`typology-block.component.html:51-71`). The key only exists on `qa-development-2026-ss` (`git branch -a --contains fcb7518d4` → the branch and its remote only, not `master`). The PMU screenshot shows no key.
- The By Center note reads "Counts the lead Center; the Center filter also matches contributing Centers." (`portfolio-overview.copy.ts:55`). Both halves are true:
  - bars group by `lead_center` (`typology.aggregate.ts:154`);
  - the page Center filter reads `centerLinks`, which holds every active `results_center` row, lead and contributing (`result.repository.ts:4584-4592`).
- The projects chart colors are `--pr-chart-1/3/2` (`projects.charts.ts` series calls), which are steps of one violet ramp: `#4a2bb8`, `#9270f0`, `#6b46e5` (`styles/colors.scss:299-301`).
- `byProgram[X].withBilateralResults` counts a project under X when the project is **mapped to X** and has any W3 result (`clarisa-projects.repository.ts` `getPortfolioProjectFacts`, `has_bilateral`; `results-framework-reporting.service.ts:1167-1182`).
  - The P/As on the result are not read.
  - W3 contributors are written as `share_result_request` Draft (4) at ingestion (`bilateral.service.ts:1699-1735`) and from the Center form (`bilateral-center.service.ts:1855-1880`). On approval they become Pending (1). Accepting one creates the role-2 row (same comment block).

| In scope | Out of scope |
|---|---|
| POC-R-1 guard test, POC-R-2 copy, POC-R-3 palette | Typology data rules (buckets, lead Center) |
| `byProgram[].withBilateralResults` rule, its caption, the Swagger text | `mapped`, `w1w2Contributors`, `totals`, `byCenter`, `unmappedWithBilateralResults` |
| | Payload shape, other blocks, ingestion, contribution workflow |

## 4. Personas

| Persona | What changes |
|---|---|
| PMU / portfolio lead | Reads the charts without hovering. Sees W3 projects under the P/As their results report to |
| Platform admin (endpoint role) | Same endpoint, new count rule, same fields |

## 5. Functional Requirements

### POC-R-1 — The two Typology bars are explained (already built)

The Typology block SHALL show, in **both** tabs (By Program / Accelerator, By Center), a key that names the top bar Submitted (every status except Editing) and the bottom striped bar Editing.

#### Scenario 1.1 — Key in each tab
- GIVEN the Portfolio Overview with Typology data
- WHEN the user opens either tab
- THEN the key with both entries is visible above the chart
- BUT it must NOT appear only on hover or only in one tab

### POC-R-2 — The By Center footnote reads plainly

Under the By Center tab, the note SHALL state in plain words:
1. each result is counted once, under its lead Center;
2. results with no lead Center are grouped as "No lead Center";
3. when the page is filtered by Center, results where that Center only contributes are included, still counted under their lead Center.

#### Scenario 2.1 — Note text
- GIVEN the By Center tab is open
- WHEN the note renders
- THEN it carries points 1–3
- AND IT MUST come from `portfolio-overview.copy.ts` (no inline string)
- BUT it must NOT use the words "matches" or "lead Center filter", and must NOT exceed two sentences

### POC-R-3 — Three distinct colors in the projects chart

The W3/Bilateral projects chart (By P/A and By Center) SHALL draw Mapped, With W3/Bilateral results and Contributing to W1/W2 in three different hues.

#### Scenario 3.1 — Distinct hues
- GIVEN the projects chart renders
- THEN the three series use three design-system color tokens of **different hue families**
- AND IT MUST give each fill ≥ 3:1 contrast against `--pr-surface-card` (WCAG 1.4.11)
- AND IT MUST keep the three fills distinguishable under protanopia and deuteranopia simulation (pairwise ΔE2000 ≥ 15 after simulation)
- AND the W1/W2 series keeps its stripe as a second cue
- BUT it must NOT use two steps of the same ramp, a status token, or a literal hex in TypeScript

#### Scenario 3.2 — Legend and tiles agree
- GIVEN the chart and the three KPI tiles render
- THEN each KPI tile SHOULD show a swatch in its series color, so tile and bar read as one thing

### POC-R-4 — "With W3/Bilateral results" follows the P/As named on the result

For each P/A X, `byProgram[X].withBilateralResults` SHALL count the distinct **mapped** projects that have ≥ 1 W3 result naming X (Glossary). Whether the project is mapped to X does not matter.

#### Scenario 4.1 — Primary P/A, different from the mapping
- GIVEN project P is mapped only to SP01
- AND P has one W3 result whose primary P/A is SP03, with no contributors
- WHEN the endpoint runs
- THEN P counts under SP03.withBilateralResults
- BUT P must NOT count under SP01.withBilateralResults
- AND SP01.mapped and SP03.mapped are unchanged (P stays in SP01.mapped only)

#### Scenario 4.2 — Contributing P/As, every non-declined state
- GIVEN P (mapped) has a W3 result with primary SP01 and contributors: SP02 accepted (role 2), SP04 Pending, SP05 Draft, SP06 Declined
- THEN P counts under SP01, SP02, SP04 and SP05
- BUT it must NOT count under SP06
- AND IT MUST NOT count a contribution row that is inactive

#### Scenario 4.3 — Counted once
- GIVEN P has three W3 results that all name SP01
- THEN SP01.withBilateralResults increases by 1, not 3

#### Scenario 4.4 — Unmapped project
- GIVEN project Q has no approved mapping and a W3 result naming SP01
- THEN Q counts in no `byProgram` row, and still counts in `unmappedWithBilateralResults` (unchanged)

#### Scenario 4.5 — Non-W3 and excluded results
- GIVEN P's only result naming SP01 is W1/W2, Discontinued, inactive, of another version, or linked through an inactive `results_by_projects` row
- THEN P must NOT count under SP01.withBilateralResults

#### Scenario 4.6 — Names outside the seed
- GIVEN a W3 result names an initiative that is not in the P/A seed
- THEN that name adds to no row, and the endpoint does not fail

### POC-R-5 — Everything else stays as it is

`totals` (all three counts), `byProgram[].mapped`, `byProgram[].w1w2Contributors`, `byCenter[]` and `unmappedWithBilateralResults` SHALL return the same values as before for the same data, and the response shape SHALL not change.

#### Scenario 5.1 — Regression
- GIVEN the existing service fixtures (`results-framework-reporting.service.spec.ts`, WPS and POD tests)
- THEN every assertion on the fields listed above still passes unchanged
- AND IT MUST change only assertions on `byProgram[].withBilateralResults`, each re-derived from a pairs fixture under the new rule and listed in the task's execution entry

### POC-R-6 — The reader is told the rule

Under the By P/A tab of the projects block, the page SHALL say that "With W3/Bilateral results" counts mapped projects whose W3/Bilateral results name the P/A as primary or contributing, so a bar can be longer than Mapped. The Swagger description of the endpoint SHALL state the same rule.

#### Scenario 6.1 — Caption
- GIVEN the By P/A tab of the projects block
- THEN the caption is visible in both Chart and Table views
- AND IT MUST come from `portfolio-overview.copy.ts`
- BUT it must NOT show under the By Center tab, where the rule did not change

## 6. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | Same response fields and types. No migration |
| Performance | One extra read for the P/A names, bound to the version. Endpoint stays one request per page load. p95 on staging is checked at the HITL pause (no DB in this checkout) |
| Security | Endpoint keeps the Admin role guard. All values bound, no SQL in error bodies (existing handler) |
| Accessibility | POC-R-3 contrast and CVD targets; key and caption are text, not color only |
| i18n | Every new string in `portfolio-overview.copy.ts` |

## 7. Defect Classes And Their Gates

| Defect class | Gate |
|---|---|
| Wrong attribution in the aggregation (count under wrong P/A, double count, declined counted) | Server Jest on `getPortfolioBilateralProjects` with fixtures for Scenarios 4.1–4.6 |
| Wrong SQL (wrong status set, missing `is_active`, wrong role) | Repository Jest pins the SQL clauses and the bind order. **SQL execution has no local gate** (no DB): the substitute is a read-only query on staging at the HITL pause. A residual risk until then |
| Unchanged fields drift | Existing WPS service tests (Scenario 5.1) |
| Copy wrong or inline | Client Jest on the components, reading `copy.*` |
| Palette: same hue, low contrast, CVD collision | Client Jest reads the shipped `colors.scss` hexes for the chosen tokens and computes contrast + simulated ΔE. **Visual reading** is a human check at the HITL pause |
| Type contract broken | `npx ng build` (client), `npx tsc --noEmit -p tsconfig.json` (server) |
| Release gap for POC-R-1 | Not a code defect. Ships with `staging → master`. Guard test keeps the key in both tabs |

## 8. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| POC-R-1 | Two Typology bars explained | SHALL (built) |
| POC-R-2 | By Center footnote | SHALL |
| POC-R-3 | Distinct projects colors (+ tile swatch SHOULD) | SHALL |
| POC-R-4 | W3 attribution by result P/As | SHALL |
| POC-R-5 | Other fields unchanged | SHALL |
| POC-R-6 | Caption + Swagger state the rule | SHALL |

## 9. Assumptions

| ID | Assumption | Owner |
|---|---|---|
| A-1 | A pending or draft **primary** choice names its P/A, like a non-declined contribution, by consistency with the OQ-2 decision | User, at this gate |
| A-2 | Nothing outside this endpoint reads `withBilateralResults` by P/A (consumer sweep in design) | design Premise Ledger |
