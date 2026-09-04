# Tasks — KPI Count Reconciliation (`bugfix/kpi-count-reconciliation`)

**Answer first:** five tasks, strictly ordered, ~300 LOC. `KCR-T-1` lands the shared helper **and** the regression test that is red on today's code; `T-2`/`T-3` rewire host and components until it is green; `T-4` moves the seven pinned fixtures to the new basis; `T-5` is the live SP01 read-back. Single PR.

## 0. Document Control & execution limits

| Field | Value |
|---|---|
| Linked spec | `requirements.md` · `design.md` (same folder) |
| Approval Mode | `pre-approved` (inherited) — Phase 3 gate: *auto-approved (pre-approved mode)* |
| Judgment-day | see §9 (one pass, fixes applied, no re-judge) |
| Budget tripwire | 5 tasks · ~300 LOC (trip at > 450) · ≤ 1 Reviewer round per task → exceeding any stops and escalates |
| Verification default | targeted `npx jest <spec path> --silent` from `onecgiar-pr-client/`; lint `npx ng lint --quiet`; **never** the whole client suite |
| Progress reporting | plain-language line at every task boundary (what closed, what runs, minutes); offer the cut once T-3 is green |
| Skills | `angular-developer`, `tdd` (T-1..T-3); `systematic-debugging` only if a task's verification produces an unexpected value |
| Branch / commit | `qa-development-2026`; `🔧 fix(dashboard-lab) [SPEC:bugfix/kpi-count-reconciliation]: …` per root `CLAUDE.md` |

## 1. Scope of this task list
- **Module / feature:** `result-framework-reporting` / Program shell KPI counts.
- **Status:** `in-progress` (execution started 2026-09-03).

## 2. Pre-flight checklist
- [x] `requirements.md` approved (auto-approved, pre-approved mode).
- [x] `design.md` approved (auto-approved, pre-approved mode).
- [x] Open questions resolved (proposal OQ-2/OQ-3 → KCR-R-5/R-8; OQ-1 deferred out of scope).
- [x] `changes/aow-filter-popover` status checked — archived 2026-09-03 (`docs/specs/archive/2026-09-03-changes--aow-filter-popover`); nothing mid-flight, no rebase needed.
- [x] No migration, no CLARISA dependency.

## 3. Task list

### `KCR-T-1` — Shared partition helper + red regression test `[x]`
- **Type:** `client` + `tests`
- **Description:** Add `partitionProgramKpis()` and `summarisePartition()` to `reporting-burndown.ts` (design §6.1, KCR-DD-1) with unit tests on the requirements fixture. Create `dashboard-lab.kcr-reconciliation.spec.ts`: mount `DashboardLabComponent` with the KCR-R-1 fixture loaded into `tocByKey` (2 AoWs, 2 cross-cut IO nodes in both, 1 owned outcome in B, IO endpoint = `#901,#902`, 2030 = `#950`) and assert the KCR-AC-1..6 expectations against the *current* consumers (B's single reported KPI is an **output**, `achieved = 75`, so today's outputs-only hero row reads `1/3`). **The component test must FAIL on today's code** with the documented red values (band `15`, B table ratio `1 of 5`, banner `1 of 5`, chip `0/2`, hero B `1/3`, rail `1 of 6`); the helper tests pass.
- **Implements:** `KCR-R-1`, `KCR-R-1.1`, `KCR-R-3`, `KCR-R-9`, `KCR-AC-1`, `KCR-AC-6`; scenario *Cross-cut IOs counted once* (all clauses), *Reported predicate* (both clauses).
- **Files:** `…/dashboard-lab/reporting-burndown.ts`, `reporting-burndown.spec.ts`, `dashboard-lab.kcr-reconciliation.spec.ts` (new).
- **Depends on:** — · **Blocks:** T-2 · **Estimate:** M
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab/reporting-burndown.spec.ts src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.kcr-reconciliation.spec.ts --silent` → helper spec green, reconciliation spec **red** with exactly the five red values above quoted in the task report.
  - *Disqualifier:* a red for any other reason (compile error, fixture not loaded, `tocByKey` key mismatch) is **not** evidence — the failure messages must show the wrong numbers. A green reconciliation spec at this stage means the fixture has no cross-cuts or the assertions test the wrong computed: stop, fix the test.
  - *Input that fails the helper test:* a fixture where `#901` is `is_aow: true` in A must move it to A's own set — assert it (proves the rule is `is_aow`-driven, KCR-R-1.1, not "all outcome rows are cross-cuts"). Also assert `summarisePartition` on the fixture = `{ planned: 11, zeroTarget: 2, counted: 9, reported: 1 }`.
- **Done:** helper exported and documented (`@akili-spec bugfix/kpi-count-reconciliation`); both specs committed; red values recorded in `execution.md`.

### `KCR-T-2` — Rewire the host computeds to the partition `[x]`
- **Type:** `client`
- **Description:** Add `programKpiPartition` computed; rewire `plannedReportingSummaryStats` (new fields, drop `progress_percentage` clause), `plannedReportingStatsLoading`, `bandPlannedResultsCount`, `overviewAowProgress` (+ `zeroTarget`), `overviewAowProgressRich`, `overviewXcutProgress` (row iff planned > 0, `zeroTarget` on the row), `plannedAowBanner` (via `aowByCode`), `reportingGroups` (`aow` card `count = own.length`) exactly per design §6.2. `reporting-aow-table.ratioBase()` drops `__isIntermediateCrosscut` rows (design §6.3, KCR-DD-3). `dashboard-lab.toc-map.ts`: `buildLeaf` zero-target rule, AoW branch sums all own leaves, Program-level branch suppressed when the IO branch is non-empty (KCR-DD-5/DD-7), TCM-R-3 comment updated. Rewrite the `reporting-burndown.ts` header docblock and the OAH DD-4 comment in `program-overview.component.ts` (design §6.3).
- **Implements:** `KCR-R-2`, `KCR-R-4`, `KCR-R-5`, `KCR-R-5.1`, `KCR-R-6`, `KCR-R-8`, `KCR-R-9`, `KCR-R-10`, `KCR-AC-1`, `KCR-AC-3`, `KCR-AC-4`; scenarios *Cross-cut IOs counted once* (THEN/AND figure clauses incl. rail, card 4, table headers, ToC map), *Band ignores filters* (THEN + BUT clauses), *One AoW, one ratio* (THEN + both BUT clauses), *Chips apply the zero-target rule* (THEN figure + BUT not hidden — `title` clause lands in T-3).
- **Files:** `dashboard-lab.component.ts`, `dashboard-lab.toc-map.ts`, `components/reporting-aow-table/reporting-aow-table.component.ts` (`ratioBase` only), `reporting-burndown.ts` (docblock), `components/program-overview/program-overview.component.ts` (comment).
- **Depends on:** T-1 · **Blocks:** T-3, T-4 · **Estimate:** M
- **Verification:** every numeric assertion of the T-1 reconciliation spec turns **green** (band, rail, card 4, hero rows, chips, table ratios incl. B `1 of 4`, banner, hub, ToC map); only the `title`-text assertions (delivered in T-3) may remain red and must be listed by name in the report. `npx jest …/dashboard-lab.kcr-reconciliation.spec.ts --silent`.
  - *Disqualifier:* green achieved by editing the reconciliation spec's expected numbers is not a pass — the Reviewer diffs the spec file and rejects any changed literal. Old suites (`hub`, `oah-rows`, `scope`) going red **is expected here** (fixtures on the old basis) and must be listed in the report, not fixed silently.
  - *Input that fails the check:* fixture with Category filter active → `plannedReportingSummaryStats.totalKpis` must not move (KCR-AC-3); today's code moves it.
- **Done:** all consumers listed in design §6.2/6.3 read the partition; no consumer derives a denominator from `reportingGroups()` or `__tier` directly (grep `__tier !== 'outcome'` in the rewired computeds returns 0 hits outside `indicatorsByAow`/`reportingGroups` tier selection); the ToC map fixture with both IO sources yields no `kind: 'program'` branch.

### `KCR-T-3` — Disclosure titles: band, chips, hub rows + DOM tests
- **Type:** `client`
- **Description:** `ReportingSummaryStats` gains `plannedKpis?`, `zeroTargetKpis?` and the band's Total KPIs figure gets a `title` via a component method (`11 planned · excludes 2 zero-target KPIs` / `… 1 zero-target KPI` / `11 planned`, pluralised like `countLabel`); program-overview chip and hub AoW/program-level rows get `title` `excludes N zero-target KPI(s)` from the row's `zeroTarget` when > 0 (`AowProgressRow`, `HubAowRow` gain the field). Add DOM tests for the three titles' **full text** and for KCR-AC-5 (cross-cut rows still rendered in A's Outcomes band with the RES-R-3 tooltip; A header `4 KPIs · 0 of 3`).
- **Implements:** `KCR-R-2.1`, `KCR-R-7`, `KCR-AC-2`, `KCR-AC-5`; scenario *Chips apply the zero-target rule* (`title` AND clause), *Cross-cut IOs counted once* (`AND IT MUST still render` clause).
- **Files:** `components/reporting-program-band/reporting-program-band.component.ts` + `.html` + `.spec.ts`, `components/program-overview/program-overview.component.ts` + `.html` + `program-overview.oah-hero.spec.ts`, `components/reporting-entry-hub/reporting-entry-hub.component.ts` + `.html` + `dashboard-lab.hub.spec.ts`, `components/reporting-aow-table/reporting-aow-table.component.spec.ts` (AC-5 DOM test only).
- **Depends on:** T-2 · **Blocks:** T-4 · **Estimate:** S
- **Verification:** `npx jest …/dashboard-lab.kcr-reconciliation.spec.ts …/components/reporting-program-band …/components/program-overview/program-overview.oah-hero.spec.ts …/components/reporting-aow-table --silent` → reconciliation spec fully green; new DOM tests green.
  - *Disqualifier:* a `title` test that asserts only `toBeTruthy()` / `toContain('zero-target')` is not evidence — it must assert the exact string with the fixture's numbers (`11 planned · excludes 2 zero-target KPIs`). A presence assertion on the cross-cut row proves rendering, not the tooltip text — assert the tooltip text too.
  - *Input that fails:* the same fixture with the two zero-target KPIs given `target = 1` (planned stays 11, zero-target 0) → band `title` must be exactly `11 planned` with no `excludes` fragment; and with exactly one zero-target KPI → `… excludes 1 zero-target KPI` (singular).
- **Done:** three titles render with exact text; the reconciliation spec is fully green; existing `ratioTitle` counts only own zero-targets.

### `KCR-T-4` — Move the pinned fixtures to the new basis (no assertion deleted)
- **Type:** `tests`
- **Description:** Update expected numbers in `dashboard-lab.hub.spec.ts`, `dashboard-lab.oah-rows.spec.ts`, `dashboard-lab.scope.spec.ts`, `dashboard-lab.toc-map.spec.ts`, `program-overview.oah-hero.spec.ts`, `reporting-aow-table.component.spec.ts`, `reporting-program-band.component.spec.ts` where they encode the superseded basis (outputs-only, unfiltered chips, cross-cut-inclusive ratios, card 4 unfiltered aggregate). Each changed literal gets a one-line comment `// KCR: <old> → <new>, <rule design §6.2 row>`. The **only** sanctioned assertion *change* (not just a literal) is the TCM-DD-5 Program-level-branch expectation when the fixture also carries IO-endpoint data (KCR-DD-7) — comment it `// KCR-DD-7`.
- **Implements:** regression safety for `KCR-R-5`, `KCR-R-6`, `KCR-R-10` against MRF / OSF / REH / TCM behaviour; supports `KCR-AC-4`.
- **Files:** the seven spec files above.
- **Depends on:** T-3 · **Blocks:** T-5 · **Estimate:** M
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/dashboard-lab --silent` (folder-scoped, not the whole client) → green; `npx ng lint --quiet` clean.
  - *Disqualifier:* any removed `expect(`/`it(` or an `it` turned `xit`/`skip` fails the task regardless of green. The Reviewer reads every changed literal and independently derives the new value from the fixture + design §6.2 rule; a literal that cannot be derived (or equals the old value) is a FAIL. Counting added vs removed `expect(` lines is **not** sufficient evidence.
  - *Input that fails:* each updated literal must differ from the old one **and** be reproducible by hand from the fixture — a fixture whose new expectation coincidentally equals the old basis proves nothing and must be extended (e.g. add a zero-target KPI) until the two bases diverge.
- **Done:** folder suite green; every changed literal commented; report lists old → new per file.

### `KCR-T-5` — Live SP01 read-back + docs
- **Type:** `docs` + manual verification
- **Description:** Run `evidence/reconcile.browser.js` in the authenticated Orca browser tab and read the rendered figures on `/result-framework-reporting/entity-details/SP01` (Overview) and `?tocView=aows` (Reporting) at default phase, no filters. Record results in `execution.md`; update the `dashboard-lab` folder guide (`src/CLAUDE.md`/`AGENTS.md` navigation notes for `reporting-burndown.ts`) if they describe the old basis.
- **Implements:** `KCR-AC-7`; defect class *fixture-shaped blindness*.
- **Files:** `execution.md`, `evidence/sp01-reconcile-after.json`, folder guide if applicable.
- **Depends on:** T-4 · **Blocks:** — · **Estimate:** S
- **Verification:** on-screen band `363` with `title` `414 planned · excludes 51 zero-target KPIs`, `2 of 363`; hero rail and KPI card 4 `2 of 357` (= Σ AoW rows 19+110+94+61+73); AOW02 `1/110` (hero, hub) and `1 of 110` (table, By-AOW banner); Intermediate `0/5` chip and `0 of 5` card; 2030 `0/1` and `0 of 1`; ToC map shows no Program-level branch; script totals `counted 363 / planned 414 / zeroTarget 51`.
  - *Disqualifier:* if the dev server points at a different backend or phase than `evidence/sp01-reconcile.json` was taken from (compare `Planned 414` first), the read-back is inconclusive — report it as such, do not mark AC-7 passed. If the pre-fix script's totals differ from 449/352/382, data moved; re-derive expected values from the new JSON before comparing.
  - *Input that fails:* any of the identities in KCR-R-3 not holding on the live numbers.
- **Done:** `execution.md` carries the before/after table; `KCR-AC-7` marked PASS or INCONCLUSIVE with reason.

## 4. Dependency graph

```
KCR-T-1 (helper + red test)
   └── KCR-T-2 (host computeds + toc-map)
         └── KCR-T-3 (table ratioBase, band/chip titles)
               └── KCR-T-4 (fixture updates)
                     └── KCR-T-5 (live read-back + docs)
```

Strictly serial — every task edits state the next one asserts on. No parallel branch.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `KCR-TEST-1` | unit (client) | KCR-R-1, R-1.1, R-9; helper totals | `…/dashboard-lab/reporting-burndown.spec.ts` |
| `KCR-TEST-2` | component (client) — **regression, red→green** | KCR-AC-1, AC-3, AC-4, AC-6; R-3, R-4, R-5, R-6 | `…/dashboard-lab/dashboard-lab.kcr-reconciliation.spec.ts` |
| `KCR-TEST-3` | DOM (client) | KCR-AC-2, AC-5; R-2.1, R-7 | band, program-overview, hub, aow-table specs |
| `KCR-TEST-4` | existing suites (updated fixtures) | regression safety | the seven pinned specs |
| `KCR-TEST-5` | manual live | KCR-AC-7 | Orca browser + `evidence/reconcile.browser.js` |

Client coverage stays above 50/60/60/60 (new code is fully covered by TEST-1/2).

## 6. Rollout & verification
- [ ] Single PR against `staging`, title `🔧 fix(dashboard-lab) [SPEC:bugfix/kpi-count-reconciliation]: one KPI universe across the Program shell`. Body per `cognitive-doc-design`: review `reporting-burndown.ts` first, then the computed table in design §6.2; out of scope = server roll-up.
- [ ] CI green (lint, client Jest, build, SonarCloud).
- [ ] QA on test env: repeat T-5's read-back on one program with cross-cuts (SP01) and one without (SP04).

## 7. Cleanup & follow-ups
- [ ] `/akili-archive`: record supersession of MRF-R-7 §3 Out, OAH DD-1/DD-3/C-5/C-8, REH-R-2 basis, TCM-R-3 wording.
- [ ] File follow-ups A (server roll-up basis) and B (By-AOW Outcomes band) from design §13.

## 8. Roll-back plan
1. Revert the single PR. No data, flags or migrations involved.

## 9. Judgment-day record
One pass, 2026-09-03, two blind judges (Read-only, different model). Confirmed severe by both and applied: over-count formula (proposal), 382-vs-388 scope, AC-5 header literal, rail `357` not `363`, T-2 gate reachability (`ratioBase` moved into T-2), KCR-R-2.1 orphan (hub titles added, ToC-map/card 4 exempted as accepted gap). Warnings applied as `info`: partition loading flags, `aowByCode` map, card 4 / OAH DD-4 supersession, ToC-map Program-level branch duplication (KCR-DD-7), pluralised `title` strings, fixture detail for hero B `1/3`, T-4 gate strengthened. Full ledger: `judgment.md`. **JUDGMENT: APPROVED ✅** (no re-judgment, per standing feedback).

## Required cross-references
- `requirements.md`, `design.md` (same folder); `docs/prd.md` US-P1, G1; `docs/ux-ui/design.md` §4; `docs/trd/trd.md` §2.
