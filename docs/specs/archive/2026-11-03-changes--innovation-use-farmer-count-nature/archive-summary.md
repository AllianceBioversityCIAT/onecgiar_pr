# Archive Summary — Innovation Use: unit and nature of the number for Farmers actors

**Outcome:** shipped to qa-development-2026-ss and performance-refactor (PRTest) on 2026-11-03. All 7 tasks are done. The live green-check function is applied in test; prod is pending at deploy.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `changes/innovation-use-farmer-count-nature` |
| Ticket | P2-4048 (Marc Schut, epic P2-3094) |
| Archive date | 2026-11-03 |
| Final status | Done, accepted without test-report/validation-report (Santiago) |
| Branch | qa-development-2026-ss (spec branch) |

## Requirements Delivered

| Req | Delivered by | Evidence |
|---|---|---|
| IFC-R-1..R-3 follow-up block, copy, gate | T-4 | jsdom falsifiers (both blocks); PRTest #8558 and #9506 |
| IFC-R-4 Farmers twice | T-3 (server de-dup), T-4 (select) | PRTest: two Farmers rows survive save and reload |
| IFC-R-5 Households single total | T-4, T-7 fixes | PRTest: grid replaced by How many, required before the first save, deselect restores the grid |
| IFC-R-6 completeness | T-5 (DB function), T-4 (client) | PRTest and local: red when unanswered, green when answered (sections 1 and 2) |
| IFC-R-7 stored values | T-2 whitelist | server specs |
| IFC-R-8 replication | T-2 | replicate SQL specs |
| IFC-R-9 QA catalog rev 33 | T-6 | catalog specs, fifth-code mutation red |
| IFC-R-10 no change elsewhere | T-2/T-3 (bilateral guard) | related specs; bilateral #9506 unchanged |

## Files Changed Summary

| Area | Files |
|---|---|
| DB | migration `1793300000000-AddFarmerCountNatureToResultActors.ts` |
| Server | `result-actor.entity.ts`, `farmer-follow-up.constant.ts`, `result-actors.repository.ts`, `innovation-use.service.ts`, `bilateral/handlers/innovation-use.handler.ts`, qa-catalog definitions + snapshot + `docs/qa-catalog.en.md` |
| Client | `innovation-use-form` (ts/html/spec, `farmer-follow-up.ts`), `innovation-use-info` (payload), 2 `Actor` models (type only) |
| SQL (manual) | `sql/validation_innovation_use_P25.{before,after,after.body-only}.sql`, `sql/checks.sql` |
| Docs | server and client `innovation-use*` `CLAUDE.md` |

Commits: 9e7354d4d, 123c068a5, db09d3767 (+ docs commits) on qa-dev; perf merges 3b30d1f32, 11faf768c, d4f1fdbbd.

## Test Evidence Summary

- Server related runs: 289 suites green on the merged perf tree. Catalog: 171 tests, plus the fifth-code mutation red.
- Client related runs: 1032 tests (form), 454 suites (merged tree). T-7 fixes went red (4) → green.
- HITL: migration up/down/up and `migration:check` in test. Function before/after with `checks.sql` in test.
- PRTest checks (Claude in Chrome): duplicates, Households, red/green, bilateral unchanged, fix re-check.

## Validation Summary

No `/akili-validate` run; accepted by Santiago on 2026-11-03. Every task closed on a Reviewer PASS: T-2 (2 lenses), T-3, T-4 (2 lenses), T-5 (attempt 2), T-6 (attempt 2), and the T-7 fixes.

## Accepted Warnings Or Follow-Ups

| # | Item | Owner |
|---|---|---|
| 1 | Prod: apply `after.sql` (with `checks.sql` before/after) right after the migration runs at deploy | Santiago |
| 2 | Tell users: the 2026 W1/W2 results with a Farmers row turn red until answered (34582 included) | Santiago |
| 3 | 2025 W1/W2 result and IPSR step 1 were not checked in a browser (specs only) | accepted |
| 4 | Phase duplication was not run end to end (replicate specs only) | accepted |
| 5 | QA catalog labels ("Unit of the reported numbers", "Nature of the innovation use number") differ from the UI questions | accepted as is |
| 6 | Re-selecting Households keeps a hand-typed single total; deselecting it clears the total | documented |

## Historical Notes

- T-3 hit its disqualifier: `saveInnovationUse` had a bilateral caller. Santiago chose the guard: bilateral forces both fields to NULL.
- T-5 FAILed once. `checks.sql` had a wrong column, picked ids by state (they drift between runs) and missed the TBD-block predicate. The body-only file also kept BEGIN/END.
- T-6 FAILed once: a global replace rewrote a historical change-log row, and nothing guarded the closed list.
- Two sessions shared the checkout: onecgiar-pr-41 led T-2..T-6 and the T-7 fixes; onecgiar-pr-02 ran the DB HITL and part of T-7.
