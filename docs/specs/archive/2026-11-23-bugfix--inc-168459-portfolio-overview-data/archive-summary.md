# Archive Summary — Portfolio Overview data fixes (POD, INC-168459)

> **Outcome:** Three feedback points from INC-168459 shipped. (1) The By P/A and By Center projects chart is horizontal, with full `code · name` labels. (2) Programs/Accelerators switched off for a phase leave the three P/A blocks (projects, contribution requests, ToC coverage). (3) The Contribution requests block says who must act. The code is in `origin/master` (promotion PR #810) and deployed. The chart was checked on PRTest at 390 and 1280 px on 2026-11-23.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/inc-168459-portfolio-overview-data` (POD) |
| Ticket | INC-168459 |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/bugfix/inc-168459-portfolio-overview-data/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 3/3 tasks `[x]`.**

| Task | Result |
|---|---|
| POD-T-1 server seed filter | Reviewer PASS attempt 1; `migration:check` deferred to CI by the user |
| POD-T-2 horizontal chart | Reviewer PASS attempt 1; HITL browser check PASS on 2026-11-23; 390 px overlap accepted |
| POD-T-3 copy + guide | Reviewer PASS attempt 3 (2 FAILs: guide structure, then 122 vs 120-line cap) |

Two budget tripwires were stopped on and accepted by the user (LOC about +363 vs about 260; review rounds 5 vs 4).

## 5. Requirements Delivered

| ID | Delivered by |
|---|---|
| POD-R-1 (chart, full names) | T-2: `projects.format.ts`, `projects.charts.ts`, `projects-block.component.{ts,html}` |
| POD-R-2 (switched-off P/As leave the rows) | T-1: seed helper `loadPortfolioProgramSeed` in `results-framework-reporting.service.ts`; aggregation untouched |
| POD-R-3 (who must act) | T-3: `contributions.subtitle` copy plus two guide lines |

## 6. Files Changed Summary

| Package | Files |
|---|---|
| Server | `src/api/results-framework-reporting/`: `results-framework-reporting.module.ts`, `.service.ts`, `.service.spec.ts`, three `dto/portfolio-*.dto.ts` (Swagger text only) |
| Client | `pages/result-framework-reporting/pages/portfolio-overview/components/projects-block/**`, `internationalization/portfolio-overview.copy.ts`, `contribution-requests-block.component.spec.ts`, `portfolio-overview/CLAUDE.md` |

Implementation commit: `7cc56335a` (qa-dev) / `cfc18d03e` (performance-refactor); reached master through the staging promotion, PR #810 (`7e28b5dd6`). No migration. No bilateral contract touched.

## 7. Test Evidence Summary

No `test-report.md`. Per-task evidence is in `execution.md`.

| Area | Evidence |
|---|---|
| Server | `src/api/results-framework-reporting` 628 tests pass; red-first plus mutations A/B/C |
| Client | portfolio-overview 23 suites / 666 tests; `ng lint --quiet` clean |
| Known | 3 `results-framework-reporting` suites fail to load on a clean `HEAD` too (`@nestjs/jwt` import chain); pre-existing, not caused here |

## 8. Validation Summary

No `validation-report.md`. HITL on PRTest `/portfolio-overview` 2026: 1280 and 390 px, both tabs, labels wrap and none clip, no sideways scroll, 13 rows readable. Screenshots are in `evidence/` (4 files).

## 9. Accepted Warnings Or Follow-Ups

- [ ] **Rollout (user, admin action):** switch SGP-02 off for the 2026 phase in Admin, Phase management. It has no 2026 switch row today, so it is still enabled there.
- [ ] `npm run migration:check:ci` is the CI gate that closes the DoD item no one could run locally (no DB). No entity or schema change, so none is expected.
- [x] 390 px only: x-axis ticks collide on By P/A, and the legend sits over the ticks on both tabs. Accepted by the user on 2026-11-23.
- [ ] Reviewer advisories (non-gating): the "another version" test reuses 41 as its id; the helper's two queries could run in `Promise.all`; the tooltip test names 2 of 3 series; `results-framework-reporting` now depends on an `admin-panel` entity (POD-DD-1), so a shared read helper should own the switch semantics together with the sibling readers (P-8 siblings, a separate spec).
- [ ] The 3 pre-existing suite load failures in `results-framework-reporting` (maybe related to `bugfix/reporting-memory-runners`) were not investigated.

## 10. Historical Notes

- POD-OQ-1 was settled by a PRPROD query: SGP-02 is `clarisa_initiatives.id` 41, with one switch row (version 6, 2025, off) and none for 2026. It therefore also leaves the 2025 rows, where it is already off.
- A POD-T-1 Implementer ran a repo-wide `git stash` / `pop` for about a minute and briefly reverted the client Implementer's files. The Leader confirmed the client diff byte-identical afterwards.
- POD-T-3 was claimed `skip-eligible` but edits an agent guide, so it was reviewed (override a), then again after rework.

## 11. Diagrams

None.
