# Execution — ToC KPI coverage: target-only filter

## TKF-T-1 — Target-only join in `getPortfolioTocCoverage` — PASS (attempt 1)

- **Date:** 2026-10-16. The user delegated the task through orchestrator onecgiar-pr-92. Constraint: repository only. `results-framework-reporting.*` was held by #8 WPS-T-2 and holds that session's uncommitted work; it was not touched and must not be staged with this fix.
- **Implementer:** `akili-implementer` (sonnet, effort medium), skills `nestjs-expert` and `tdd`. **Reviewer:** `akili-reviewer` (opus), checklist mode.
- **Files:** `aow-bilateral.repository.ts` (+13 / −1), `aow-bilateral.repository.spec.ts` (+22 / −5).
- **Change:**
  - An inner `JOIN` on a `DISTINCT (id_indicator, toc_result_indicator_id)` derived table from `toc_result_indicator_target`, with `target_date = ?` and `CAST(target_value AS DECIMAL(15,2)) > 0`, matched by `tri.id` plus CONVERT on `related_node_id`.
  - Params are `[year, year, ...sources, ...statuses, version, phase]`.
  - The docstring now states the target-only rule.
- **Red:** `Tests: 2 failed, 81 passed, 83 total`.
- **Green:** `Test Suites: 1 passed, 1 total` / `Tests: 83 passed, 83 total` (`--maxWorkers=2 --testPathPattern=aow-bilateral.repository`).
- **eslint:** `--quiet` is clean after `--fix` (3 prettier errors in the new spec lines).
- **Deviation:** free RAM was about 2 GB (below the 4 GB rule) at the time of the run. The Implementer ran anyway with `--maxWorkers=2` and did not stop to report. This is recorded for the user.
- **Reviewer:** PASS. The checks confirmed:
  - covered is a subset of total;
  - DISTINCT cannot inflate the counts;
  - the param order matches the placeholders;
  - NULL and non-numeric targets are excluded;
  - `target_date` is matched the same way as in `buildIndicatorsQuery`;
  - the scope is the two files only.
- **ADVISORY (risk):** the dashboard-lab target is `MAX(CAST(target_value AS SIGNED))` (`aow-bilateral.repository.ts:575`), and this query uses DECIMAL. The two disagree only on fractional targets between 0 and 1, which the client would read as no target and this query counts. This is not a spec violation. The TKF-T-2 query counts these rows.
- **Not done:** the real numbers (TKF-T-2, user-run). No commit or push (the orchestrator owns that).

## TKF-T-2 — Real-data check — PASS

- **Date:** 2026-10-16. The user ran the read-only query (given inline in chat) on the PRTest DB connection with `@v := 36`.
- **Baseline columns** match the #5 T-6 parity, so the query starts from the same base:
  - SP01 `kpis_antes` 393 + 10 = 403, `cubiertos_antes` 10.
  - SP02 139 / 3.
- **With the target rule:**
  - SP01: OUTPUT 355 / 10, OUTCOME 5 / 0, total **360 / 10**.
  - SP02: OUTPUT **137 / 3**.
  - No covered KPI is a no-target KPI in either program, so covered is unchanged.
- **`metas_fraccion_bajo_1` = 0** in both programs, so the SIGNED vs DECIMAL advisory has no effect on this data.
- **Endpoint** (local server on PRTest, reloaded with the fix; read-only GET from the admin session, token not returned): SP01 total 360 / covered 10 (outputs 355 / 10, outcomes 5 / 0), SP02 137 / 3 (outputs 137 / 3, outcomes 0 / 0). **Exact match on both P/As.**
