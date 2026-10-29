# Archive Summary — Center results parity + KPI category chips (`CRK`)

**Outcome:** every requirement (CRK-R-1…R-7) shipped, passed review, and was checked on PRTest. Six tasks plus one layout fix (T-4a) found by the PRTest smoke.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/center-results-kpi-chips` |
| Archive path | `docs/specs/archive/2026-10-21-changes--center-results-kpi-chips/` |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`) |
| Approval Mode | gated (user lifted the per-task gate: "continua hasta que termines") |
| Author | Santiago Sanchez (with Claude) |

## 2. Original Spec Path

`docs/specs/changes/center-results-kpi-chips/`

## 3. Archive Date

2026-10-21

## 4. Final Status

✅ **Complete.** All tasks `[x]`; CRK-T-6 PRTest smoke PASS.

| Commit | What | Branches |
|---|---|---|
| `17fadfb7e` | Code T-1…T-5 | qa-dev, performance-refactor |
| `bcd453de9` | T-4a layout fix | qa-dev, performance-refactor |
| `6b8341cf1` / `8d4864552` / `3f7ad7387` | Spec + execution log | qa-dev (first two also perf) |

Not in `staging` / `master` (promotion out of scope).

## 5. Requirements Delivered

| ID | What users get | Verified on PRTest |
|---|---|---|
| CRK-R-1 | Center Results: one row per `result_code`, one line per version, newest first; "Showing N of M" counts groups | IITA 2025+2026: 13 replicated codes, 1 row each, 2026 on top |
| CRK-R-2 | "Previously reported" badge on the replicated version only | Badge on line 0 (2026) only |
| CRK-R-3 | "Indicator category" filter in the popover, chip, `type` URL param, Clear all | Option visible in popover |
| CRK-R-4 | Sorting by the newest version's values | Unit-tested (pr-table sorts spread group) |
| CRK-R-5 | Other output (8) / Other outcome (4) KPIs categorised on the server | SP12 Other Output 17 / Other Outcome 5 / Total 249; SP11 8 / 4, CapSha pilots shown |
| CRK-R-6 | Zero chips hidden; active chip and Total stay | SP11 hides ID/PC/IU; SP12 Other Outcome active stays at 0 |
| CRK-R-7 | Chip counts follow Type/Target/Section, ignore own selection | SP12 HLO 235 / Outcome 10 / IO 0 / 2030 4 = 249 |

## 6. Files Changed Summary

| Area | Files |
|---|---|
| Server | `results-toc-results/repositories/aow-bilateral.repository.ts` (+spec) |
| Reporting chips | `dashboard-lab.component.ts`, `reporting-quick-typology.util.ts` (+ util spec, new `dashboard-lab.crk-chips.spec.ts`; 3 existing specs adjusted per R-6/R-7) |
| Center table | new `bilateral/bilateral-result-grouping.ts` (+spec); `bilateral-results-list.component.{ts,html,scss,spec.ts}` |

No migration, no endpoint, no bilateral payload contract change.

## 7. Test Evidence Summary

No `test-report.md` (`/akili-test` not run) — **absence accepted by the user at archive time (2026-10-21)**. Evidence instead:

- Per task red → green (server spec 91/91; client files 1604, 13, 106→116, 115 tests).
- `--findRelatedTests` before push: server 71 suites / 2333 tests; client 21–42 suites per task, all green.
- PRTest smoke (CRK-T-6) with measurements (see `execution.md`).

## 8. Validation Summary

No `validation-report.md` (`/akili-validate` not run) — **absence accepted by the user at archive time**. Conformance was gated per task by the Reviewer: 7 PASS verdicts; 2 FAIL rounds (T-4 row menu bound to newest version; T-4a history icon clipped), both fixed on attempt 2.

## 9. Accepted Warnings Or Follow-Ups

- [ ] Folder guides stale (pending items in the kaizen entry): `dashboard-lab/CLAUDE.md` (`reportingGroupsForCounts`), `bilateral-results-list/CLAUDE.md` (grouped rows, per-version menus, category filter).
- [ ] ~43 free-label `custom` KPIs (`other`, `Other Outpuit`, …) stay uncategorised — data owners (CRK-OQ-2).
- [ ] `getPortfolioTocCoverage` / `indicatorResultTypeCaseSql` keep the narrower mapping (design §13).
- [ ] `codegraph sync` after merge.
- Accepted: all center table rows are 44px instead of 40px (T-4a padding); Status column default 156px.

## 10. Historical Notes

- Budget: 6 tasks as estimated (+T-4a from the smoke); LOC ≈ 886 vs ~380 estimated (tests + template re-indent).
- jsdom could not see the three alignment defects; the PRTest smoke caught them, as design §8 planned.
- During the smoke the Leader deleted the user's own saved Status column width from localStorage, thinking it was a simulation side effect; recorded in `execution.md`.
