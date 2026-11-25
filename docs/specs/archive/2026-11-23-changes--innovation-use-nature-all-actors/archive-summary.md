# Archive Summary — Innovation Use: `use_nature` on every actor type (INA)

> **Outcome:** "What best characterises the nature of this innovation use number?" (`use_nature`) is now asked of every Innovation Use actor type in the bilateral API, the shared writer, the Centre form (W1/W2, required) and the bilateral editor (W3, optional). Validated on TEST by Daniel Lozano (2026-11-18) and shipped to PROD in PR #803 (merged 2026-11-18). The prod green-check SQL is prepared; whether it was applied is not recorded.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/innovation-use-nature-all-actors` (INA) |
| Ticket | INC-168062 "Change for innov use" (Nicoleta Trifa, due 2026-11-20) |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |
| Supersedes | BIF-OQ-1 "Farmers only" and IFC-R-1, for `use_nature` only |

## 2. Original Spec Path

`docs/specs/changes/innovation-use-nature-all-actors/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 11/11 tasks closed.** T-1..T-5, T-9 PASS on attempt 1 (cut 1, server + contract). T-6 and T-8 needed attempt 2 (Reviewer FAIL: folder `CLAUDE.md` stale and not re-stamped, both times); T-8 reopened after a PRTest finding and PASS on attempt 3. T-7 (green-check SQL) PASS on prtest. T-10 fetcher docs PASS. T-11 TEST E2E validated by Daniel. Task checkboxes in `tasks.md` are not reliable; status lives in `execution.md`.

| Signal | Value |
|---|---|
| Reviewer FAILs | 2 (T-6, T-8), same cause |
| Reopened | T-8 (Households row kept the Women/Men grid; found by Angel on result 10122) |
| Budget tripwire | 1 after T-4 (about 1,560 vs 1,450 LOC, test volume; user raised to about 2,600) |
| CI | 1 backend job OOM-killed on the runner (2 suites), cleared by re-running |

## 5. Requirements Delivered

INA-R-1..R-20 and INA-AC-1..AC-11 per `execution.md`.

| Cut | Tasks | Delivered |
|---|---|---|
| 1 (server + contract) | T-1, T-2, T-3, T-4, T-5, T-9 | Bilateral rules ask `use_nature` for every type; duplicate rule (step 9) for every type with a new message and `use_nature` normalisation; v2 writer keeps same-type rows apart by nature; presence-gated writers; QA catalog; contract docs + Swagger |
| 2 (UI + green check) | T-6, T-7, T-8 | Centre form nature card on every row, every type repeatable; green check requires `use_nature` for every type (SQL); bilateral editor shows and saves both answers, Households locked to one total |
| Release / docs | T-10, T-11 | Fetcher docs PR; TEST E2E and promotion |

## 6. Files Changed Summary

Server: bilateral innovation-use rules/constants, `innovation-use.service.ts` (writers), qa-catalog, contract doc `bilateral-result-summaries.en.md`, Swagger. Client: `shared/components/innovation-use-form/**`, bilateral `type-innovation-use/**` (+ folder `CLAUDE.md` files). SQL: `sql/validation_innovation_use_P25.{before,after}.sql`, `.prod.sql` variants, `.after.body-only.sql`, `checks.sql`, `sql/evidence/prtest-{before,after}-S3b.csv`. Fetcher docs in `onecgiar_result_functions` PR #44. Key commits: `c7e2b91052`, `a26e15e560`, `0ab1c49a8c`, `4db61f2404`, `0f83d6a039`, `a7a2bd9397`.

## 7. Test Evidence Summary

No `test-report.md`. Per-task Jest with red runs and falsifiers, Leader re-runs and Reviewer lenses in `execution.md`; examples: T-6 shared form 260/260 (host suites 361/361), T-8 attempt 3 folder 180/180. Server writer spec `innovation-use.service.nature-all-actors.spec.ts` (about 917 lines).

## 8. Validation Summary

No `validation-report.md`. HITL evidence:

| Check | Result |
|---|---|
| prtest `checks.sql` before/after (2026-11-18) | V0 `has_ina_r_10` 0 to 1; S1a green_now 1 to 0 (result 11026 flips); W3 S3b 42 ids identical; S4, S5 OK |
| Daniel Lozano TEST E2E (results 10123..10127) | `use_nature` stored for every type; two Researchers rows with different natures both stored; identical rows stored once; Farmers unchanged |
| Angel on prtest (result 10122) | Households finding, fixed by T-8 attempt 3 |

## 9. Accepted Warnings Or Follow-Ups

- [ ] Prod `validation_innovation_use_P25`: confirm the prod `SHOW CREATE FUNCTION` body matched the prtest `before` (stored in `0f83d6a039`) before applying `after.prod.sql`. **Unknown whether it was applied**; not claimed here.
- [x] Fetcher docs PR `onecgiar_result_functions` #44: MERGED 2026-11-18T22:07:37Z.
- [ ] CI jest has no memory bound (OOM recurred risk); proposed `--maxWorkers=2 --workerIdleMemoryLimit=1G` in `.github/workflows/reporting-tool-dev-cicd.yml` (shared pipeline, needs owner OK).
- [ ] `other_actor_type` edge cases (case, trailing spaces, `''` vs absent): not fixed; design section 14 candidate.
- [ ] OQ-7 (Nicoleta's inline red comments, not in the PDF) can change copy only.
- [ ] Stored Households rows reach the DB normalised only on the next user save.
- [ ] Reviewer advisories: `'key' in el` treats an explicit `undefined` as present; read-mapper comment on `count_unit`; fetcher wording "Both answers are also returned on every actor"; inactive-row exemption undocumented.

## 10. Historical Notes

- Business decision Option B (every actor type, W3 and W1/W2) was settled by Daniel Lozano and Nicoleta on 2026-11-16; the Centre form went required (OQ-1) and non-Farmers rows show only the question card (OQ-4).
- Release ran in two TEST cuts on 2026-11-18, then PR #803 to master the same day, ahead of Nicoleta's presentation to the Centres on 2026-11-19.

## 11. Diagrams

None.
