# Tasks — ToC KPI coverage: target-only filter

| Field | Value |
|---|---|
| Status | done (not committed) |
| Approval Mode | delegated (the user, through orchestrator onecgiar-pr-92, 2026-10-16) |

## TKF-T-1 — Add the target-only join to `getPortfolioTocCoverage` [x]

- **Implements:** TKF-R-1, TKF-R-2, TKF-R-3; design §1–§3.
- **Files:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` and `aow-bilateral.repository.spec.ts`. No other file.
- **Test-first:**
  - SQL contains the `toc_result_indicator_target` join with `target_date = ?`, `> 0` on the cast value, and the CONVERT match on `related_node_id`.
  - It is an inner join on `tri`, not a LEFT join.
  - Bound params: the reporting year appears twice, in placeholder order (design §2).
  - The docstring no longer says "No year or target filter".
- **Verification:** `npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern=aow-bilateral.repository` from `onecgiar-pr-server`; `npx eslint <the two files> --quiet`.
- **Disqualifier:** these tests assert SQL text, not numbers. Correctness on real data needs the user-run query (inline in chat).
- **Definition of done:**
  - [x] Red run recorded, then green.
  - [x] eslint clean on the two files.
  - [x] Reviewer PASS.
  - [x] No commit or push (the orchestrator owns that).

## TKF-T-2 — Real-data check (user-run) [x]

- The user runs a read-only query, given inline in chat, that counts the KPIs with and without a target for 2 P/As. The result is compared with the endpoint after deploy.
