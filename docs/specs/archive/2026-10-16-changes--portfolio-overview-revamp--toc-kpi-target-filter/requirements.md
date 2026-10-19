# Requirements — ToC KPI coverage: target-only filter (P2-3974)

## 1. Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-target-filter/` |
| **Parent spec** | `docs/specs/changes/portfolio-overview-revamp/` (child #10, a bugfix of #5) |
| **Size** | Quick bugfix (1 implementation task, server repository only) |
| **Date created** | 2026-10-16 |
| **Status** | in-progress |
| **Ticket** | P2-3974 |
| **Requested by** | The user, through the orchestrator session (onecgiar-pr-92), 2026-10-16 |

## 2. Problem

Spec #5 (`toc-kpi-progress`) shipped `AoWBilateralRepository.getPortfolioTocCoverage` (commit `154079643`). The query counts every active indicator as a ToC KPI. On 2026-10-15 the user decided that P2-3974 wins: only KPIs **with a target** enter the ratio. The client predicate is `hasTarget` in `dashboard-lab/reporting-burndown.ts` (target finite and > 0). The #5 documents already carry a dated amendment (`toc-kpi-progress/requirements.md` and `design.md`, "Amendment (2026-10-16)"), which says a code follow-up is owed. This spec is that follow-up.

## 3. Scope

**In scope**
- The `getPortfolioTocCoverage` SQL and its docstring.
- The co-located repository spec.

**Out of scope**
- `results-framework-reporting.{service,controller,module}.ts` and their specs (being edited by #8 WPS-T-2 in the same checkout).
- Client files, `dashboard-lab/*`, `kpi-progress-target-only/*`, `w3-projects-section/*`.
- The response shape. It stays exactly as it is (`total`, `covered`, per program and category).
- The `debug: true` follow-up on the repository catch (recorded separately in #5).

## 4. Requirements

### TKF-R-1 — Denominator counts only KPIs with a target (MUST)

A distinct active indicator (`toc_results_indicators.id`, TKP-DD-2) counts in `total` only when it has **at least one** target row in `toc_result_indicator_target` for the endpoint's reporting year with a value > 0. The target row is matched the same way the dashboard-lab queries match it: `trit.id_indicator = tri.id`, `CONVERT(trit.toc_result_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)`, `trit.target_date = <reporting year>`.

- **S-1.1** An indicator whose only target row for the year has value 5 counts in `total`.
- **S-1.2** An indicator with no target row for the year, or whose rows for the year are all 0, NULL or non-numeric, does not count.
- **S-1.3** An indicator with a target only in another year does not count.

### TKF-R-2 — Numerator is a subset of the denominator (MUST)

`covered` counts only indicators that are also in `total`. A no-target indicator that a result reaches is **not** covered (it is not a KPI). This matches the client, where a no-target KPI is out of the Counted total.

- **S-2.1** A no-target indicator linked by a QA'd W1/W2 result adds 0 to both `total` and `covered`.
- **S-2.2** For every row, `covered <= total` still holds.

### TKF-R-3 — Everything else unchanged (MUST)

The node scope (TKP-P-1 / TKP-P-2), the covered set (version, source, status, not-applicable) and the response shape are unchanged. Every value stays bound; the reporting year is the same `context.reportingYear` already used for the work-package join.

## 5. Verification

- Repository spec, test-first: red run before the SQL change, green after.
- Real-data numbers come from a read-only query the user runs (given inline in chat). No agent runs SQL against the shared DB.
