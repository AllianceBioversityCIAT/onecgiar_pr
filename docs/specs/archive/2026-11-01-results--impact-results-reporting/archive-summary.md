# Archive Summary — Impact Results Reporting (`results/impact-results-reporting`, P2-3901)

## 1. Document Control

| Field | Value |
|---|---|
| Ticket | [P2-3901](https://cgiarmel.atlassian.net/browse/P2-3901), parent epic P2-3094 |
| Spec family | 3 children: `server-foundation` (#1), `sp-reporting-entry` (#2), `result-detail-impact` (#3) |
| Branch | `qa-development-2026-ss`, a spec branch. Shared guides, TRD and digest were **not** written; see the kaizen entry |
| Mode | Gated |
| Reports | No `test-report.md` or `validation-report.md` in any child. The Leader accepted their absence; PRTest evidence lives in each `execution.md` |

## 2. Original Spec Path

`docs/specs/results/impact-results-reporting/` (archived to `docs/specs/archive/2026-11-01-results--impact-results-reporting/`)

## 3. Archive Date

2026-11-01

## 4. Final Status

**Done.** All 3 rows in `family.md` are `done`.

| Child | Tasks | PRTest evidence |
|---|---|---|
| #1 `server-foundation` | IRS-T-1..T-10, all `[x]` | IRS-T-9 PASS 2026-10-30: parity 0 differences over 3,161 P25 results, 11/11 Swagger walk-through, E5 p95 96 ms, E6 p95 36 ms |
| #2 `sp-reporting-entry` | IRE-T-1..T-6, all `[x]` | IRE-T-6 PASS 2026-10-31 (two rounds, icons reworked) |
| #3 `result-detail-impact` | IRD-T-1..T-8, all `[x]` | IRD-T-8 user sign-off 2026-11-01 ("perfecto funciona todo como indicas") |

On `performance-refactor` (PRTest). Not yet on staging or master; promotion follows the usual cadence (Cristian).

## 5. Requirements Delivered

The mapping follows the proposal R-items and each child's "Requirements covered" lines. The Jira AC text was not re-read for this summary, so treat the AC numbers as the proposal's grouping.

| P2-3901 AC | Delivered by | What |
|---|---|---|
| 1–2 | #2 (IRE-R-1..R-4, T-2, T-4) | Impact results card after 2030 outcomes (grouped view only), 5 Impact Areas with counts (E6 from #1), Report action gated by `canReportResults` |
| 3 | #2 (IRE-R-5/R-6, T-3) + #1 (E1 impact branch) | Report drawer in impact mode: level 1 / type 9, no indicator or targets, `impact_area_id` in the payload |
| 4–5 | #1 (IRS-R-2, prefill 3/1 in E1) + #2 (payload) | Chosen area scored 2 (Principal), the other four 0, set only on create |
| 6 | #2 (IRE-R-7) + #1 | Standard creation flow and navigation to the detail page with `?phase=`; verified on result 10039 |
| 7–8 | #3 (IRD-R-8, T-5) + #1 (contributors SQL gate) | Contributors without the ToC block; `validation_contributor_partner_P25` skips ToC for type 9; impact copy |
| 9 | #3 (IRD-R-9, T-6) + #1 (geo save guard, P25 only) | Regional and Country only; server 400 on other scopes |
| 10 | #3 (T-6) | Evidence copy with the MELIA line |
| 11–16 | #3 (IRD-R-2..R-7, T-3, T-4) + #1 (E2..E5, new tables) | Impact level info section: study type with definitions, 100-word statement with live counter, Already reported Yes/No, previous-results picker across any phase/portfolio |
| 17 | #1 + #2 | No ToC, targets or indicators on impact create (400 on forbidden fields) |
| 18 | #1 (`validation_impact_level_info_P25`, `validation_maps` row) + #3 (green-check refresh) | Section completeness; 5/5 green enables Submit |
| 19 | #3 (IRD-R-11..R-13, T-7) | "Impact result" label in sidebar badge, header, Results Center, SP Results, My results, type-change modal |

## 6. Files Changed Summary

### #1 `server-foundation` (server)

- New `impact-level/` module under `results-framework-reporting/`: controller (`study-types`, `get/result/:id`, `save/result/:id`, `previous-results/search`, `counts`), service, search service, repositories, DTOs, 3 entities (`impact_study_type`, `results_impact_level`, `results_impact_previous_result`).
- Migration `1792000000000-IRS-ImpactResultsFoundation.ts`: 3 tables, 2 seeded study types, `validation_maps` row `impact-level-info`, `validation_impact_level_info_P25`, type-9 gates in `validation_contributor_partner_P25` and `validation_geo_location_P25`.
- Create handler impact branch (E1), `impact_area_id` on `CreateResultDto`, geography save guard (P25 only), section list for P25 type 9, replication case 9 and delete/recover lifecycle, QA catalog `EXCLUDED_TABLES` entry.
- Commits: `9022e24ea` (qa-dev, 52 files); perf merges `fb8ad8075`, `4a141416e` (CI fix, qa-catalog completeness), `b06028408`.

### #2 `sp-reporting-entry` (client)

- New `impact-areas.constant.ts`, `buildImpactCreateResultPayload`, `GET_impactLevelCounts`, `impact-results-card` component, impact mode in `indicator-drawer` and `lab-report-form`, host wiring in `dashboard-lab`, CT spec, folder guides.
- Out of scope, user-approved: QA catalog 2026 reconciled to revision 32 (`4e1268cf3`).
- Commits on qa-dev: `81173125d`, `f0e20f45c`, `5fab7cdaa`, `6b42237f6`, `7e0f5ceed`, `3bf03c2f1`, `4e1268cf3`, plus the icon-path fix commit (hash not recorded in execution.md). On perf: `ff95c902a`, `77b2b0739`.

### #3 `result-detail-impact` (client)

- New `impact-level-info` page and `previous-results-picker`, route entry with `prHide: 9` / `portfolioAcronym: 'P25'`, `impact-result.util.ts`, `impact-word-count.util.ts`, `isP25ImpactResultSignal`, `wordCounterFn` input on `pr-textarea`, contributors / geography / evidence adaptations, label sites (sidebar, header, Results Center, SP Results, change-type modal, filters), folder guides.
- Commits on qa-dev: `517d31313`, `ae5940b70`, `be98a988b`. On perf: `41ba0dfdd`, `9c8486377`, `53a94958c`.

## 7. Test Evidence

| Check | Result |
|---|---|
| #1 pre-push `--findRelatedTests` (29 files) | 101 suites / 2,657 tests; post-merge 102 / 2,677 |
| #1 create handler spec | 8 suites / 90 tests |
| #1 differential on PRTest | 0 differences over 3,161 non-type-9 P25 results |
| #2 pre-push `--findRelatedTests` (runInBand) | 40 suites / 1,477 tests |
| #2 CT `impact-results-card` | 6 passing (direct `cypress run --component --spec`); `test:ct:batch` exits red for unrelated pre-existing errors |
| #3 `--findRelatedTests` pre-push | 445/445 suites, 11,983 tests (maxWorkers=1, 594 s) |
| #3 after the F-1..F-6 and F-5/F-7 rework | related runs 446/446, then 22/22 (as reported by the Leader; these two runs are not itemised in execution.md) |
| #3 CT picker | 14 passing, 0 failing |
| #3 `pr-textarea.contract.cy.ts` | 19/22 with the change. **HEAD baseline waived by the user**: a detached worktree lacked the gitignored `environment*.ts` and copying them was refused as a credential exposure. The Reviewer's code proof shows the 3 failing cases cannot be reached by the diff (they mount without `maxWords`) |
| Lint / `ngc` | Clean on touched files in every task |

## 8. Validation Summary

| Walk-through | Date | Result |
|---|---|---|
| #1 Swagger on PRTest (result 12506) | 2026-10-30 | 11/11 steps, SQL checks match |
| #2 PRTest SP01 Reporting (result 10039) | 2026-10-31 | Card, counts = E6 = SQL, filters, keyboard, create; icon defect fixed and re-checked |
| #3 PRTest by the agent (Claude in Chrome), then the user | 2026-11-01 | 5/5 green, 10039 submitted; F-1..F-8 triaged, F-1..F-7 fixed; non-impact P25 (7718) and P22 type 9 (5874) unchanged |

## 9. Accepted Warnings Or Follow-Ups

**From #3**

- F-8 / IRD-OQ-4: a 2025-phase type-9 result (5834) has a dead end on the W3 projects field ("Please select a TOC result above…"). Known limitation; revisit only if a 2025 phase reopens.
- Picker `blur()` on Escape sends focus to `<body>`; move it to the filter label.
- `pr-filter-select` NFR-1 gaps (unlabeled checkbox tab stops).
- Next / `saveAndSettle` does not await the impact-level PATCH. The F-3 fix does not use `isSavingPipe`.
- The type-9 filter label `Impact result / Impact contribution` is a **design decision**: Results Center and picker filters list P22 and P25 together, so P22 users also see the combined label (id and value unchanged).
- Open user decisions: stored-Global scope; Excel "Impact Contribution" vs CSV; whether types 9/10/11 are `is_active`; "Climate Adaptation and Mitigation" copy.
- PLACEHOLDER copy (contributors, MELIA, geography hint, definitions placement) kept as final by Leader decision.

**From #2**

- `design.md` §6.1 says the card Report button looks like the table's disabled button, but the table hides it when `!canReport`; the card disables. Wording to correct.
- Scenario 4.1 copy "Climate adaptation & mitigation" vs the constant "Climate Adaptation and Mitigation".
- Grouped, All, Grouped remounts the card and re-requests E6 (accepted, IRE-NFR-4).
- Advisories: unreachable `of({...})` branch in the card stream; `closeManage()` can publish `drawerReportKpi`; no explicit test for S5.2.
- `npm run test:ct:batch -- impact-results-card` red exit (harness gap).
- Notify Juan Guzmán that the next QA catalog revision is 33.

**From #1**

- Delete PRTest test result 12506. PRTest results 10039 (submitted), 10040 and 10038 are test data.
- Decision 1 (reject `contributors_result_toc_result` on impact create) is provisional until Nicoleta confirms.
- FP-11: sync `requirements.md` R-9 wording to P25-only. FP-12: catalogue the 2 new result tables in the QA catalog `scope.ts` and remove them from `EXCLUDED_TABLES`; check whether #3 did it.
- Prefill `update` runs outside a transaction (failure leaves a result without scores, a retry duplicates).
- 400s are logged at `error`, not `warn` as design §9 asks.
- Re-run P-3 (active P25 type-9 rows) on PROD before promoting to master; it was 0 on 2026-10-29 and 2026-10-30.
- E5 last-page ordering (`page=398`) not run.

## 10. Historical Notes

- #1: the user once pasted the pre-migration body over `validation_contributor_partner_P25` on PRTest instead of a `tmp_before_*` copy. It was restored and verified (CREATED 19:49:03).
- #1: CI on `fb8ad8075` failed `qa-catalog.completeness.spec.ts` because `--findRelatedTests` cannot reach a guard that loads entities by glob. Fixed by `4a141416e`.
- #2: the Cypress 14.5.1 binary was installed in the user cache by an Implementer.
- #3: IRD-T-3 and IRD-T-4 each failed review once; IRD-T-4 used review round 10 of 10. An Implementer tried `git stash` to get a CT baseline; it did not apply, and later briefs forbid stash, checkout and restore.
- #3 PRTest check: one Chrome tab did not paint (`requestAnimationFrame` never fired); the agent read state via `window.ng.getComponent` and re-ran the checks in a new tab.
- Implementers ran 60 to 170 minutes per task under RAM pressure; some Jest runs were killed for low memory.
- Run `codegraph sync` (`.codegraph/` exists).
