# Archive Summary — Portfolio Overview: Progress against ToC KPIs

**Outcome:** delivered. On `/portfolio-overview`, the **Progress against ToC KPIs** block replaces the Progress by Science Program matrix. It sits between the typology and Centers sections and shows:
- one bar per Program / Accelerator: KPIs covered by at least one W1/W2 result in QA or Submitted status, out of the ToC KPIs;
- an Outputs / Outcomes split;
- a portfolio summary row.

A new admin-only endpoint feeds it: `GET api/results-framework-reporting/toc-results/portfolio-coverage`. After the P2-3974 follow-up (child #10, `toc-kpi-target-filter`), only KPIs with a target count. Live on PRTest at `38d15a30c`: SP01 360 / 10, SP02 137 / 3.

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-progress/` |
| Parent | `changes/portfolio-overview-revamp` (family #5) |
| Archive Date | 2026-10-16 |
| Final Status | **Done**: 7 / 7 tasks `[x]` (TKP-T-0 … T-6), rollout `[x]` |
| Branch | `qa-development-2026-ss` (spec branch; default is `master`) |
| Commits | server `154079643` · client `34b9f5ad6` · docs `d56e46103`, `5d3488ddf` · follow-up #10 `e5c2c775b` · merge to `performance-refactor` `38d15a30c` |
| Kaizen entry | `docs/specs/kaizen/changes--portfolio-overview-revamp--toc-kpi-progress.md` |

## Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| TKP-R-1 KPI scope (distinct active indicator, OUTPUT in AoW or no WP, OUTCOME in AoW) | T-1 | Repo spec; T-6 parity: SP01 403 / 10 and SP02 139 / 3, exact against independent query C on PRTest v36 |
| TKP-R-1 amendment (target-only, P2-3974) | child #10 `toc-kpi-target-filter` | SP01 360 / 10, SP02 137 / 3: user query and endpoint match exactly |
| TKP-R-2 covered (W1/W2, status 2/3, active, applicable link) | T-1 | Predicates asserted; covered > 0 exercised by the parity check |
| TKP-R-3 endpoint + payload | T-2 | 133 server tests; `versionId` coercion (BIGINT string) fixed on attempt 2 |
| TKP-R-4..7 block, order, empty / zero-KPI states, copy | T-3, T-4, T-5 | 351 + 21 + 222 client tests; `ng build` OK; grep gate empty |
| TKP-R-8 admin-only | T-2 | 403 live on PRTest for the non-admin test user |
| NFR performance ≤ 3 s | T-6 | 850 / 840 / 838 ms locally |
| NFR a11y / responsive | T-4, T-6 | Contrast 4.81 : 1; no h-scroll at 375; `role="img"` bars with labels |

## Files Changed

| Area | Files |
|---|---|
| Server | `aow-bilateral.repository.ts` (+ spec), `shared/constants/toc-kpi-coverage-status.constant.ts`, `results-framework-reporting.{controller,service}.ts` (+ specs), `dto/portfolio-toc-coverage.dto.ts` |
| Client | `results-api.service.ts` (+ spec), `shared/interfaces/portfolio-toc-coverage.interface.ts`, `components/toc-kpi-block/*` (new), `portfolio-overview.{component,charts}.*`, `services/portfolio-overview.service.*`, `portfolio-overview.copy.ts`, `portfolio-overview/CLAUDE.md` |

Size: about 1,885 added (778 prod, 1,107 tests) and 1,277 deleted, against a ~950 estimate and a 1,300 tripwire. The user accepted the overrun.

## Test Evidence

| Check | Result |
|---|---|
| Server Jest (scoped, `--maxWorkers=2`) | 83 repository + 133 controller/service, green |
| Client Jest (folder-scoped) | 222 green; `ng build` OK |
| Lint | Clean on the touched files |
| Live (T-6) | Parity PASS, timing PASS, browser PASS (1280 / 768 / 375), 403 PASS on PRTest, user accepted the block |

## Validation Summary

There is no `test-report.md` or `validation-report.md`. Each task ran Leader → Implementer → Reviewer, plus the T-6 HITL checks. The user approved the commits, the PRTest deploy and the archive (2026-10-16).
- Review history: 1 Reviewer FAIL (T-2, BIGINT `versionId`). 0 HALT, 0 pivot.

## Accepted Warnings / Follow-ups

- [ ] The repository catch `returnErrorRepository({ debug: true })` logs SQL text and parameters. Fix: `debug: false` (one line). The user deferred it.
- [ ] Dead symbols: `getCategoryShortName`, `PROGRAM_AXIS_LABEL_MAX_CHARS.matrix`.
- [ ] Design §10: reword the bound-parameter order as "in placeholder order".
- [ ] A11y advisories:
  - the name column is about 97 px at 768;
  - the visible label includes the code but the accessible name leaves it out;
  - `role="list"` on the list.
- [ ] Guide advisories:
  - `CLAUDE.md:109` "never ''" is imprecise;
  - restore the gotcha "categories derived from rows".
- [ ] Test advisories:
  - the closed-phase fixture order cannot tell "newest" from "first";
  - the `is_active` assertions are weak.
- [ ] `codegraph sync`.

## Historical Notes

- The spec shipped with "no target filter on indicators". The P2-3974 decision (2026-10-15) superseded that: only KPIs with a target count. The #5 requirements and design carry a dated amendment, and child #10 `toc-kpi-target-filter` delivered the code change.
- The local stack runs on the PRTest DB (active version 36), not on prod (version 8). The first parity run compared different databases and was discarded; the valid run used the same connection.
- The agent did not run the 403 check: login sends the password to the external Cognito service. The user ran it on PRTest.
