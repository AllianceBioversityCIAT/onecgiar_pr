# Archive Summary: `changes/sp-overview-echarts/results-tab-filter-deeplink`

| Field | Value |
|---|---|
| Archive Date / Status | 2026-08-27 · **Done** (2/2 tasks PASS, attempt 1 each) |
| Requirements | RFD-R-1 (URL→filters, 3 scenarios), RFD-R-2 (filters→URL, anti-loop), RFD-R-3 (Center filter) — all clauses behaviorally tested |
| Files | `programme-results/**` only: filter service + data service + component (+3 specs) + NEW `services/programme-results-query-params.ts` (contract consumed by sibling #3) |
| Evidence | Full jest 480/480 (6758 at close), lint clean; `merge`+`replaceUrl` asserted on real `navigate` args; anti-loop proven via param-subject emission with navigate-count 0 |
| Commits | `a8070de55` (RFD-T-2 Center filter), `dda0eec21` (RFD-T-1 bridge) |
| Follow-ups | Rollout §6 (release flow); `q`/`section` params only when a consumer needs them; guide note → pending item (kaizen entry) |
| Notes | TDD caught the hydrate↔mirror loop red before review (filter signals read outside `untracked`); environment gap: sibling merge added `echarts` without install — fixed by `npm ci`, no code impact |
