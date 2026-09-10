# Archive Summary — Filter the programme Results tab by Created by

Created by is now an eighth clientside filter on `entity-details/:entityId/results`: same shape as Center, same `app-pr-filter-select`, same `replaceUrl` + `merge` URL bridge.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `result-framework-reporting/programme-results-created-by-filter` · Prefix `CBF` |
| Type / Depth | Change · Lite · gated |
| Branch | `qa-development-2026` (spec branch; default pin `master`) |
| Archive Date | 2026-09-03 |
| Final Status | **Done** — 2/2 `[x]`, Reviewer PASS, HITL recorded |

## 2. Original Spec Path

`docs/specs/result-framework-reporting/programme-results-created-by-filter/`

## 3. Archive Date

2026-09-03

## 4. Final Status

**Done.** No HALT, no pivot, no leftover `[ ]` / `[~]`. `test-report.md` and `validation-report.md` were never authored (Lite); Jest + live Filter-open evidence live in `execution.md`. Absence accepted at archive.

## 5. Requirements Delivered

| ID | Outcome |
|---|---|
| `CBF-R-1` | Single-select Created by; AND with other dimensions; no blank option; `app-pr-filter-select` |
| `CBF-R-2` | Chip `Created by: {name}`; badge === `activeChips().length`; chip × and Clear all; phase default stays |
| `CBF-R-3` | Query param `createdBy`; hydrate/mirror; unknown name stays (chip + filtered-empty); no-param leaves null |
| `CBF-AC-1`…`AC-4` | Covered by T-1 service tests + T-2 component/URL tests + HITL |

Out of scope (unchanged): Results Center “Created by me”, multi-select, server/API, result-detail ⓘ.

## 6. Files Changed Summary

From `execution.md` (T-1 + T-2):

| File | Change |
|---|---|
| `programme-results-filter.service.ts` + `.spec.ts` | Eighth dimension, predicate, chips, clear |
| `programme-results.service.ts` + `.spec.ts` | `createdByOptions` via `optionsOf` |
| `programme-results-query-params.ts` | `createdBy` const + map |
| `programme-results.component.ts` / `.html` / `.spec.ts` | Select, hydrate/mirror, Center \| Created by row |
| `dashboard-lab.scope.spec.ts` | OSF-T-4 pin: no `scope` key (not an exhaustive five-key list) |

Commits: `259872099` (T-1), `a19e6ec23` (T-2).

## 7. Test Evidence Summary

| Suite | Result |
|---|---|
| T-1 scoped (`filter.service` + `programme-results.service`) | 72/72 |
| T-2 scoped (+ `programme-results.component`) | 150/150 |
| Sibling `dashboard-lab.scope.spec` after pin fix | 23/23 |
| HITL `entity-details/SP01/results` @ 1345px | Center \| Created by one row; `app-pr-filter-select`; Enter opens list; pick Adane Tufa → chip + badge 2 + `?createdBy=Adane%20Tufa` |

## 8. Validation Summary

No `/akili-validate` run (Lite). Reviewer PASS on both tasks; T-2 after one in-scope FAIL (sibling pin). No unresolved FAIL.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| `programme-results/CLAUDE.md` filter-state list still omits Phase / Center / Created by | `guide-sync` pending — apply on `master` |
| Multi-select / Created by me | Deferred (`design.md` §13) |
| Result-detail ⓘ Created by | Out of scope (payload gap) |
| PR / eslint package-wide / Back-button deep-link recheck | Rollout (`tasks.md` §6), not archive blockers |
| Reviewer advisory: popover Jest is presence/parent, not a live Tab/Enter | Noted; HITL covered keyboard open |

## 10. Historical Notes

- Escalated from `/akili-quick`: new filter state + URL is not a cosmetic one-liner.
- Budget: 2 tasks / ~160 LOC / 1 review round. T-2 used 2 review rounds (FAIL then PASS). Cause: scoped verification missed the shared-map consumer. See Kaizen `KZ-result-framework-reporting--programme-results-created-by-filter-1`.
- No `proposal.md`. No `family.md`. No Constitution Impact block (no new module).
