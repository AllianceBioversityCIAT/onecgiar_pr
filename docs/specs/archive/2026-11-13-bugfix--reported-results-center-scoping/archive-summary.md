# Archive Summary — Reported results scoped to the exact center group

**Outcome:** shipped. A result reported against one center-combination group now counts only for that group. This holds in the indicator drawer's "Reported results" panel and in the Reporting table's Achieved / QA% / Prel%. The code is in `master` (commits `206b21383a`, `a0916e7e9e`, `a6df8f16d8`).

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/reported-results-center-scoping/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none (user-reported symptom) |
| Type · Mode | Bug |
| Final status | **Complete**: 6/6 tasks `[x]` (T-6 added after execution by user decision) |

## Requirements delivered

| Requirement | What it guarantees | Status |
|---|---|---|
| `RRC-R-1` | `toc_indicator_target_id` is stored when a result is linked to an indicator (nullable, invalid input stored as `null`) | Delivered |
| `RRC-R-3`, `RRC-AC-2` | "Reported results" panel filters by the exact group, with a fallback for old rows | Delivered |
| `RRC-R-2`, `RRC-R-4`, `RRC-AC-3` | Achieved / QA% / Prel% match the exact group, no center-intersection for anchored data | Delivered |
| `RRC-R-7`, `RRC-AC-5`, `RRC-R-8`, `RRC-AC-6` | Old rows (no anchor) and single-center indicators behave as before | Delivered |
| `RRC-R-10`, `RRC-AC-7` | The client create payload carries the anchor | Delivered (no production change needed) |
| 2030 Outcomes view (T-6) | The cumulative window keeps the old center-intersection behavior (user decision 2026-09-21) | Delivered, spec amendment |

## Files changed

| Area | Change |
|---|---|
| DB | Migration `1790002419754-AddTocIndicatorTargetIdToResultIndicatorsTargets.ts`: nullable `bigint` column on `result_indicators_targets` |
| Server write path | `ResultsFrameworkTocIndicatorDto` and `framework-result-toc-indicators.service.ts` persist the anchor on create and update |
| Server read path (panel) | Loader service, query, handler, controller and service pass `tocIndicatorTargetId` (NULL-safe OR-array `where`) |
| Server read path (table) | `aow-bilateral.repository.ts`: `getIndicatorContributionsByCenter` selects the anchor; `sumContributionsForCenters` matches exact group, `Number()`-normalised; `useAnchor=false` for the cumulative view |
| Client | `results-api.service.ts` (4th param), `indicator-drawer.component.ts`, typing in `reporting-aow-table`; two folder `CLAUDE.md` files re-stamped |
| Specs | New cases in 9 server and client spec files, red first where a red run was possible |

## Test evidence

| Suite | Result |
|---|---|
| `framework-result-toc-indicators.service.spec` | 13/13 |
| Panel chain (6 suites) | 143/143 |
| `aow-bilateral.repository.spec` | 71/71 |
| `results-framework-reporting.service.spec` | 82/82 |
| Client (3 suites) | 417/417 |
| Lint, `tsc --noEmit` | clean |
| Testing DB, real data (user, 2026-09-21) | PASS: result #9526 counts on `CIMMYT` only (Prel 40%, 2 of 5); the other 4 rows stay at 0% |

## Validation summary

No `/akili-validate` run and no `test-report.md` or `validation-report.md`. Every task had a Reviewer PASS, and the user reproduced the acceptance scenario on the testing DB (`execution.md` §4). The owner accepted this at archive.

## Accepted gaps / follow-ups

| Item | Status |
|---|---|
| Staging QA | Accepted as covered by the 2026-09-21 testing-DB reproduction (PRTest uses that DB) |
| PR, CI and post-deploy telemetry boxes | Closed: the code is in `master` |
| **Production backfill of old rows** | **Open follow-up, separate runbook.** Not done here. Analysis and a guarded script for testing data are in `execution.md` §4. Never backfill by position without per-row confirmation (`RRC-OQ-1`) |
| Legacy creators (`aow-hlo-create-modal`, `guided-creation`) still create un-anchored results | Known boundary, falls back to `RRC-R-8` |
| `getIndicatorContributions` rollup pooling | Not verified for combination groups. Needs its own spec if a report shows it |
| `reporting-aow-table/CLAUDE.md` over the 120-line cap | Own ticket |
| `requirements.md` `RRC-R-2` / `RRC-R-4` do not mention the 2030 carve-out | Left as is (accepted) |

## Historical notes

- No pivots. Three Reviewer FAILs, all in-scope rework: `RRC-T-3` (folder docs), `RRC-T-4` (HTTP param not wired), `RRC-T-5` (BIGINT string vs number).
- The proposal's first hypothesis (a read-side center filter) was wrong. The real cause was that the combination group was never stored at write time. Ángel's decision (exact group, zero cross-attribution) fixed the model.
- `tasks.md` `RRC-T-4` file list was amended after execution to include the controller and service.

## Diagrams

None. The spec has no `diagrams/` folder.
