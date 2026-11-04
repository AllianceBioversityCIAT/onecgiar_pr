# Requirements — Center Overview by P/A (CPA)

## 0. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/center-overview-pa-contribution/` |
| Module / sub-feature | `bilateral` / Center Overview (`/bilateral/:acronym/overview`) |
| Depth | **Standard** (server additive field + client charts/filters; no migration, no payload-contract surface under `/api/bilateral/*`) |
| Type | Change |
| Status | approved 2026-10-27 (owner, at `/akili-execute` start; A-1..A-5 accepted as defaults pending Nicoleta) · Approval Mode `gated` |
| Owner | Santiago Sanchez |
| Date | 2026-10-27 |
| Ticket | Freshdesk **INC-166545** points 6 + 7 (Nicoleta Trifa, 26-Oct-2026) |
| Proposal | `proposal.md` (approved 2026-10-27) — this spec stays aligned with it; see §11 for deviations |
| Depends on | the INC-166545 `/akili-quick` for points 3–5 (same component/charts) |
| Prefix | `CPA` |

## 1. Executive Summary

The Center Overview must show, **per Program/Accelerator (P/A)**, (a) the center's W3/bilateral results reported under that P/A and (b) the W1/W2 results of that P/A that tag the center's bilateral projects; add a **"Projects by P/A"** chart with three project counts; and expose **always-visible P/A and Result-category filters**. Every figure must keep reconciling with the Results tab (`COV-R-13`), and no W1/W2 tagging row may be invisible (the IFPRI case).

## 2. Glossary

| Term | Meaning |
|---|---|
| P/A | Program or Accelerator (CLARISA initiative, `official_code` e.g. `SP01`). A result's P/A = its **primary** initiative (`initiative_role_id = 1`) — the row field `submitter` |
| W3 row | Overview row with `overview_category ∈ {replicated_w3, new_w3}` (`source = 'API'`) |
| Tagging row | Overview row with `overview_category = 'w1w2_tagging'`: a non-replicated W1/W2 result (`source = 'Result'`) that tags ≥ 1 **center project** in `results_by_projects` |
| Center project | `clarisa_projects` row owned by the center (`organization_code = institutionId`, or NULL + W3 acronym alias) — `center_projects` CTE |
| Mapped project (of a P/A) | Center project whose approved `sciencePrograms[]` mapping includes the P/A |
| Row set | `GET api/results/bilateral-center-results?scope=bilateral` (`CWS-R-1`) |

## 3. System Context & Scope

### In scope

- Re-define the "Science Program contribution" chart (`COV-R-10`).
- New "Projects by P/A" chart.
- Visible P/A + Result-category filters on the Overview; `category` key in the shared query contract; Results tab honours it.
- Role filter must not drop tagging rows (`is_leading_result = NULL`).
- Server: tagging rows carry **every** tagged center project id.
- IFPRI diagnosis (why its tagging row is in no chart).

### Out of scope

INC-166545 points 1–5; non-primary P/As; Portfolio Overview / SP-side Overview; changing the `scope=bilateral` row set; the BOV2 `w1w2ContributorCount` badge.

Cross-refs: `docs/prd.md` (PMU/center reporting visibility; `AC-4` additive), `docs/ux-ui/design.md` §7 chart tokens / §10 a11y, `docs/trd/trd.md` (`api/results` repository, bilateral client module). Archived specs: `2026-09-14-bilateral--center-overview-tab` (COV), `2026-10-21-...center-overview-w3-scope` (CWS), `2026-10-22-...center-overview-no-project-line` (CNP).

## 4. Stakeholders / Personas

| Persona | What changes |
|---|---|
| Center user / lead (IFPRI, CIP…) | Sees P/A breakdown and its W1/W2 tagging; filters without opening the popover |
| CGIAR SO reviewer (Nicoleta) | Can verify per P/A how many center projects are mapped, reported, tagged |
| Results tab user | New removable `category` chip when arriving from an Overview drill-down |

## 5. User Stories

- **CPA-US-1** — As a center lead, I want results counted per P/A split into W3 reported vs W1/W2 tagging, so that I see how each P/A uses my projects.
- **CPA-US-2** — As a CGIAR SO reviewer, I want a per-P/A project chart (mapped · with W3 results · tagged by W1/W2), so that I can spot P/As whose mapped projects report nothing.
- **CPA-US-3** — As a center user, I want visible P/A and category filters, so that I can isolate the W1/W2 results tagging my projects.

## 6. Functional Requirements

### CPA-R-1 — Results by P/A chart (MODIFIES `COV-R-10`)

The "Science Program contribution" card SHALL show one bar group per P/A with two series: **W3/Bilateral results under the P/A** (W3 rows whose `submitter` = P/A) and **W1/W2 results tagging center projects** (tagging rows whose `submitter` = P/A). "Projects mapped" SHALL no longer be a series of this card (it moves to CPA-R-2).

#### Scenario A: split

- GIVEN 3 W3 rows with `submitter = SP05` and 1 tagging row with `submitter = SP05`
- WHEN the Overview renders
- THEN the SP05 group shows W3 = 3 and W1/W2 tagging = 1
- BUT a tagging row must NOT be counted in the W3 series, nor a W3 row in the tagging series
- AND IT MUST sort groups by (W3 + tagging) desc, then P/A label asc

#### Scenario B: no P/A

- GIVEN a row with `submitter = null`
- THEN it is counted under a single "No Program/Accelerator" group (shown only when > 0)
- BUT it must NOT disappear from the card

#### Scenario C: drill-down reconciles

- WHEN the user clicks the SP05 tagging bar
- THEN the Results tab opens with `program=SP05&category=w1w2-tagging` (+ existing `scope`, `phase`, `explicitDefaults`)
- AND IT MUST show exactly as many rows as the bar value

### CPA-R-2 — Projects by P/A chart (ADDED)

The Overview SHALL show a "Projects by P/A" grouped vertical bar chart, one group per P/A, three series, each counting **distinct center projects**:

| Series | Counts a center project for P/A X when |
|---|---|
| Mapped projects | its approved mapping includes X |
| Projects with reported W3/Bilat results | it is mapped to X **and** has ≥ 1 W3 row whose `project_id` = it |
| Projects tagged as contributors to W1/W2 results | it appears in `tagged_center_project_ids` of ≥ 1 tagging row whose `submitter` = X (assumption A-1) |

#### Scenario A: multi-project tagging

- GIVEN one tagging row (submitter SP07) whose tagged center projects are {P1, P2}
- THEN SP07 "tagged" = 2
- BUT the same project tagged by two SP07 results must count once
- AND IT MUST NOT fall back to the single `project_id` when `tagged_center_project_ids` is present

#### Scenario B: tagged project outside the mapping

- GIVEN P3 is tagged by an SP07 result but mapped only to SP02
- THEN P3 counts in SP07 "tagged" and in SP02 "mapped"; not in SP07 "mapped"

#### Scenario C: UI states

- Loading → skeleton (`pr-skeleton`, max 200px); error → `role="alert"` + Retry; empty (no P/A with any value) → one line ≤ 160px; success → chart + accessible table (`VizChartTableModel`) with the same numbers.

#### Scenario D: drill-down

- Clicking "Mapped" / "with W3" opens the Reporting tab filtered by `program=X` (existing pattern); clicking "tagged" opens the Results tab with `program=X&category=w1w2-tagging`.

### CPA-R-3 — Visible filters (MODIFIES `COV-R-3`)

The Overview SHALL show, outside the popover and always visible on ≥ 900px (wrapping/scrolling chips below), a **P/A** multi-select and a **Result category** single-select (`All` · `W3/Bilat reported` · `W1/W2 tagging a center project`). Both SHALL apply to every card (KPIs, by project, by P/A, Projects by P/A, by type) and be reflected in the URL.

#### Scenario

- GIVEN category = `W1/W2 tagging`
- THEN the Total card equals the tagging line of the unfiltered Total card
- AND every chart shows only tagging rows
- BUT the remaining popover filters must keep working unchanged
- AND IT MUST clear with the existing "Clear filters" action

### CPA-R-4 — `category` contract key (ADDED, extends `COV-R-13`)

`bilateral-query-params` SHALL parse/serialise `category ∈ {w3, w1w2-tagging}` (absent = all). `filterCenterResults` SHALL apply it (`w3` → `overview_category ∈ {replicated_w3,new_w3}`; `w1w2-tagging` → `= w1w2_tagging`). The Results tab SHALL, when the key is present, fetch the `scope=bilateral` row set and show a removable chip.

- BUT an unknown `category` value must be ignored (treated as absent), never error.

### CPA-R-5 — Tagging rows never dropped by the role filter (MODIFIES role filter)

`role=contributing` SHALL include rows whose `is_leading_result` is `null` and `source = 'Result'` (the center contributes via its project). `role=lead` keeps requiring `1`.

- BUT W3 rows with `null` lead flag must NOT start matching `contributing` (only `source='Result'` rows).

### CPA-R-6 — All tagged center projects on each tagging row (ADDED, server)

With `scope=bilateral`, each `w1w2_tagging` row SHALL carry `tagged_center_project_ids`: the distinct ids of active `results_by_projects` rows of that result whose project is a center project. Other rows SHALL carry `null`. Without `scope=bilateral` the response SHALL be unchanged (no new field value semantics, same rows, same order).

- AND IT MUST NOT change `project_id`, `project_name`, row count or `overview_category` of any row.

### CPA-R-7 — IFPRI visibility (ADDED, acceptance)

For IFPRI, Reporting 2026, every tagging row counted in the Total card SHALL appear in CPA-R-1 (tagging series), CPA-R-2 (tagged series, unless its P/A is null — then in the "No P/A" group of CPA-R-1 only) and in the Results tab with `category=w1w2-tagging`. If the diagnosis (CPA-T-1) shows the tagged project is not a center project under `center_projects`, the row can't be a tagging row at all — the spec SHALL then be re-opened (Disqualifier), not patched.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | `bilateral-center-results?scope=bilateral` p95 SHALL not grow > 15% on CIP and IFPRI (PRTest, 3 runs each; report the spread) |
| Backwards compatibility | Unscoped response byte-identical in rows/fields used today (`AC-4` spirit); server spec asserts SQL param path |
| Accessibility | Each chart has an accessible table; filters keyboard-operable with visible focus ring; WCAG 2.1 AA (`design.md` §10) |
| Styling | Tailwind-first, `--pr-*` tokens, px type sizes, chart colours from chart tokens (not the mock's green/yellow/blue) |
| Security | JWT-gated endpoint unchanged; no secrets in logs |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| CPA-AC-1 | Fixture rows of all 3 categories | aggregate builds by-P/A | W3 and tagging series match hand counts (R-1 A, B) |
| CPA-AC-2 | Tagging row with 2 tagged center projects | Projects by P/A builds | tagged = 2, deduped across results (R-2 A, B) |
| CPA-AC-3 | category = w1w2-tagging | Overview renders | Total = unfiltered tagging line; every card tagging-only (R-3) |
| CPA-AC-4 | URL `?category=w1w2-tagging&program=SP05` | Results tab opens | visible count = Overview bar; chip removable (R-1 C, R-4) |
| CPA-AC-5 | Row `source=Result`, `is_leading_result=null` | role = contributing | row kept; W3 null-lead row not kept (R-5) |
| CPA-AC-6 | `scope=bilateral` vs none | repository query | scoped tagging rows have ids; unscoped path unchanged (R-6) |
| CPA-AC-7 | IFPRI, PRTest | live check | tagging row visible in R-1, R-2, Results tab (R-7) |

## 9. Defect classes → gates

| Defect class | Gate |
|---|---|
| Wrong counts / double counting in aggregates | Jest aggregate specs with hand-computed fixtures (CPA-T-4, T-5) |
| Filter mismatch Overview vs Results tab | Jest `bilateral-result-filter.spec` + `bilateral-query-params.spec`; **live reconciliation on PRTest** (fixtures can't prove it — `KZ-EVM-1`) |
| SQL regression on unscoped consumers | Server repository spec (param path + field) + live CIP Total unchanged |
| Real data contradicts the model (IFPRI) | CPA-T-1 read-only SQL **before** coding — HITL |
| Chart layout / legibility / colour contrast | **No automated gate** (jsdom can't lay out ECharts). Substitute: screenshot review at the HITL pause (T6) on PRTest |
| Performance regression | PRTest timing, 3 runs; inconclusive if spread > effect |

## 10. Requirement ID Index

| ID | Kind | Modifies |
|---|---|---|
| CPA-R-1 | MODIFIED | COV-R-10 |
| CPA-R-2 | ADDED | — |
| CPA-R-3 | MODIFIED | COV-R-3 |
| CPA-R-4 | ADDED | COV-R-13 (extends) |
| CPA-R-5 | MODIFIED | role filter (COV-R-3) |
| CPA-R-6 | ADDED | CWS-R-1 (additive field) |
| CPA-R-7 | ADDED | — |

**REMOVED:** "Projects mapped" series from the SP contribution card (moved to CPA-R-2).

## 11. Assumptions (to confirm with Nicoleta in the INC-166545 reply) & deviations

| ID | Assumption (default adopted) | From |
|---|---|---|
| A-1 | Series 3 groups by the **P/A that reported the W1/W2 result** | CPA-OQ-1 |
| A-2 | "Under the P/A" = **primary** P/A only | CPA-OQ-2 |
| A-3 | `role=contributing` includes tagging rows | CPA-OQ-3 |
| A-4 | Keep two charts (results vs projects), not merged | CPA-OQ-4 |
| A-5 | "with W3 results" counts a project only under P/As it is **mapped** to (the W3 row's own P/A is not used) — matches her mock's "mapped ⊇ reported" bars | new in specify |

Deviation from proposal: none in intent. A-5 is a precision the proposal left implicit.
