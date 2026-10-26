# Requirements — ToC KPI block: disclose KPIs with no target

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-no-target-disclosure/` |
| **Parent Spec** | `docs/specs/changes/portfolio-overview-revamp/` (child #11) |
| **Type** | Change |
| **Depth** | Standard (compact) |
| **Approval Mode** | gated |
| **Date created** | 2026-10-22 |
| **Status** | approved (2026-10-22) |
| **Source** | [`proposal.md`](./proposal.md), approved 2026-10-22 |
| **Depends on** | #10 `toc-kpi-target-filter` (done, `e5c2c775b`) |
| **ID prefix** | `TND` |

## 2. Executive Summary

The admin Portfolio overview block "Progress against ToC KPIs" counts only KPIs with a target (P2-3974, TKF-R-1). It never says how many it left out. This spec adds that number to the endpoint and shows it in the block, with the wording the Science Program pages already use. The ratio, `total`, `covered` and the % do not change.

## 3. Glossary

| Term | Meaning |
|---|---|
| **In-scope indicator** | A distinct active ToC indicator on a node the block counts (TKP-P-1 / TKP-P-2: OUTPUT in an AoW or with no WP; OUTCOME in an AoW) |
| **Has a target** | At least one target row for the reporting year with a value > 0, matched as in TKF-R-1 |
| **KPI with no target** | An in-scope indicator that does not have a target |
| `noTarget` | Count of KPIs with no target, at the same granularity as `total` |

## 4. System Context & Scope

- **Endpoint:** `GET api/results-framework-reporting/toc-results/portfolio-coverage` (admin only).
- **Screen:** Portfolio overview › Progress against ToC KPIs (`toc-kpi-block`).
- **Out of scope:** the % rule, the node scope, the Science Program pages, global filter behaviour (GLF-R-6: the block filters on the client and never refetches), any with/without-target filter, and parity with the SP "Total # of KPIs" chip (TND-OQ-1 in the proposal).

## 5. Stakeholders / Personas

| Persona | Need |
|---|---|
| PMU / platform admin | Know why the block's KPI total is lower than the number of KPIs in the ToC |

## 6. Functional Requirements

### TND-R-1 — The endpoint returns `noTarget` (MUST)

The response SHALL carry `noTarget` next to every `total` / `covered` pair: per program, in its `outputs` and `outcomes`, and in `portfolio`. `noTarget` counts KPIs with no target at the same granularity and node scope as `total`.

#### Scenario TND-S-1.1 — Mixed program

- GIVEN a program with 5 in-scope indicators, 3 with a target and 2 without
- WHEN the endpoint is called for that reporting year
- THEN the program has `total = 3` and `noTarget = 2`
- AND IT MUST hold that `total + noTarget` = the number of in-scope indicators

#### Scenario TND-S-1.2 — The three ways to have no target

- GIVEN in-scope indicators that (a) have no target row for the year, (b) have only rows with value 0, NULL or non-numeric, or (c) have a target only in another year
- WHEN the endpoint is called
- THEN each one counts in `noTarget` and not in `total`

#### Scenario TND-S-1.3 — Covered stays a subset of total

- GIVEN a KPI with no target that is linked by a QA'd W1/W2 result
- WHEN the endpoint is called
- THEN it adds 1 to `noTarget` and 0 to `covered`
- BUT it must NOT change `total` or `covered` from what the endpoint returns today for the same data (TKF-R-1, TKF-R-2)

#### Scenario TND-S-1.4 — Roll-ups add up

- GIVEN the response
- THEN for each program, `noTarget = outputs.noTarget + outcomes.noTarget`
- AND `portfolio.noTarget` = the sum of every program's `noTarget`
- AND a program with no in-scope indicators has `noTarget = 0` everywhere

#### Scenario TND-S-1.5 — Additive contract

- GIVEN an existing consumer of the endpoint
- THEN every field that exists today keeps its name, type and meaning
- BUT no field may be renamed or removed

### TND-R-2 — The block discloses excluded KPIs (MUST)

When `noTarget > 0`, the portfolio summary and each program row SHALL show `excludes N KPI(s) with no target set`. The wording is the same as on the SP pages: `excludes 1 KPI with no target set` and `excludes 3 KPIs with no target set`. When `noTarget = 0`, nothing extra is shown.

#### Scenario TND-S-2.1 — Row and summary

- GIVEN a program with `noTarget = 2` and a portfolio with `noTarget = 40`
- WHEN the block renders
- THEN that row shows `excludes 2 KPIs with no target set`
- AND the summary shows `excludes 40 KPIs with no target set`

#### Scenario TND-S-2.2 — Singular, and zero

- GIVEN a row with `noTarget = 1` and another with `noTarget = 0`
- THEN the first shows `excludes 1 KPI with no target set`
- BUT the second must NOT render any disclosure element

#### Scenario TND-S-2.3 — Program filter

- GIVEN the global Program filter keeps 2 programs with `noTarget` 2 and 3
- WHEN the block renders
- THEN the summary shows `excludes 5 KPIs with no target set` (the sum of the visible rows, as GLF-P-5 already does for `total` / `covered`)
- AND IT MUST NOT refetch (GLF-R-6)

#### Scenario TND-S-2.4 — Split line unchanged

- GIVEN any row
- THEN the line `Outputs x / y · Outcomes x / y` keeps its current text, with no `noTarget` in it (proposal TND-OQ-2)

### TND-R-3 — "No KPIs" says why (MUST)

The text for a program, or for the whole block, with `total = 0` SHALL tell apart "has KPIs, none with a target" and "has no KPIs".

#### Scenario TND-S-3.1 — Program with only no-target KPIs

- GIVEN a program with `total = 0` and `noTarget = 4`
- WHEN the block renders
- THEN the row shows `No KPIs with a target · 4 with no target set` in place of the figures and bar
- BUT it must NOT show `No ToC KPIs in this phase`

#### Scenario TND-S-3.2 — Program with no KPIs at all

- GIVEN a program with `total = 0` and `noTarget = 0`
- THEN the row keeps `No ToC KPIs in this phase`

#### Scenario TND-S-3.3 — Whole block with only no-target KPIs

- GIVEN every visible program has `total = 0` and the visible `noTarget` sum is 12
- WHEN the block renders
- THEN the empty state reads `No ToC KPIs have a target for this phase yet · 12 with no target set`
- BUT it must NOT read `No ToC KPIs are defined for this phase yet.`
- AND when the visible `noTarget` sum is also 0, the current empty text stays

### TND-R-4 — The subtitle names the rule (MUST)

The subtitle SHALL read: `KPIs covered by at least one W1/W2 result in QA or Submitted status, out of the KPIs with a target in each Program's Theory of Change for {year}`.

#### Scenario TND-S-4.1

- GIVEN the block in any state (loading, error, empty, ready)
- THEN the subtitle contains `out of the KPIs with a target`

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| TND-NFR-1 | **Performance.** The endpoint's p95 SHALL stay within 2× the #5 baseline (850 ms for the coverage query in TKP T-6). Measure 3 calls on PRTest. If the 3 calls vary by more than the difference you are measuring, report the spread. Do not report a pass |
| TND-NFR-2 | **Layout.** The disclosure line MUST NOT wrap the row figures or push the bar out at 1280, 768 or 375 px |
| TND-NFR-3 | **Security.** Admin-only access is unchanged. Every SQL value stays bound. The repository keeps `debug: false` |
| TND-NFR-4 | **A11y.** The disclosure is plain text, not interactive. The bar `aria-label` is unchanged |

## 8. Defect Classes → Gate

| Defect class | Caught by |
|---|---|
| SQL counts a KPI with no target in `total`, or a KPI with a target in `noTarget` (the LEFT JOIN condition is put in the wrong place) | Repository spec on the SQL text (the CASE conditions; `covered` keeps the `tgt` condition) **plus** a user-run parity query on real data. The SQL-text test cannot prove the counts. Only the parity query can |
| `covered` or `total` drift from today's values | Parity query: `total` / `covered` before and after deploy, for 2 programs |
| Service roll-up drops `noTarget` or does not add it up | Service spec (TND-S-1.4) |
| Wrong plural or text, or the disclosure shown when 0 | Format and component specs (TND-S-2.x, 3.x, 4.1) |
| Program filter summary does not add up `noTarget` | Component spec (TND-S-2.3) |
| Line wraps or overflows at 375 px | **No automated check** (jsdom does not measure layout). A human browser check at the T-3 HITL pause, at 1280 / 768 / 375 |
| Slower query | TND-NFR-1 measurement on PRTest |

## 9. Requirement ID Index

| ID | Scenarios |
|---|---|
| TND-R-1 | S-1.1, S-1.2, S-1.3, S-1.4, S-1.5 |
| TND-R-2 | S-2.1, S-2.2, S-2.3, S-2.4 |
| TND-R-3 | S-3.1, S-3.2, S-3.3 |
| TND-R-4 | S-4.1 |
| TND-NFR-1..4 | §7 |
