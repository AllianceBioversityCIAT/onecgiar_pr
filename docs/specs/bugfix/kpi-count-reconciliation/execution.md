# Execution Log — KPI Count Reconciliation (`bugfix/kpi-count-reconciliation`)

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/kpi-count-reconciliation/` (`requirements.md`, `design.md`, `tasks.md`) |
| Approval Mode | `pre-approved` — continue/pause gates auto-pass on PASS; HALT / Pivot / tripwire always stop |
| Execution limits | ≤ 1 Reviewer round per task (second FAIL escalates) · budget 5 tasks / ~300 LOC (trip > 450) · targeted `npx jest <path>` only |
| Leader | Claude Fable 5.1 (T1; session model exceeds registry `opus` entry — registry flagged, no downgrade) |
| Implementer | `.claude/agents/akili-implementer.md` wrapper — **model override `opus`** for T-1..T-3 (arithmetic-exact fixture work under a 1-round Reviewer cap; wrapper default `sonnet` judged too risky for the red-value contract). Recorded as a routing deviation |
| Reviewer | `.claude/agents/akili-reviewer.md` wrapper (`opus`, read-only) — author ≠ auditor kept on every task |
| Pre-flight | `changes/aow-filter-popover` archived 2026-09-03 → no rebase needed. Working tree clean apart from untracked spec folder |
| Started | 2026-09-03 |

## Task Execution History

### `KCR-T-1` — Shared partition helper + red regression test — **PASS** (2026-09-03, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper, model override `opus`, effort high, skills `angular-developer` + `tdd` |
| Reviewer | `akili-reviewer` wrapper (`opus`), lens checklist mode |
| Files | `…/dashboard-lab/reporting-burndown.ts` (+151: `partitionProgramKpis`, `summarisePartition`, types `PartitionIndicator`, `ProgramKpiAowSlice`, `ProgramKpiBucket`, `ProgramKpiPartition`, `ProgramKpiAowBundle`, `ProgramKpiBucketInput`; private `isCrosscutRow`, `dedupeById`) · `reporting-burndown.spec.ts` (+172, 8 `it`, pure append) · `dashboard-lab.kcr-reconciliation.spec.ts` (new, 446, 16 `it`) |
| Verification | `npx jest …/reporting-burndown.spec.ts …/dashboard-lab.kcr-reconciliation.spec.ts --silent` → helper suite PASS (26/26 in file); reconciliation suite FAIL **13/16** as required. `npx ng lint --quiet` clean. Other 23 dashboard-lab suites 809/809 green with the new spec excluded |
| Requirements covered | KCR-R-1, R-1.1, R-3, R-9, KCR-AC-1 (assertions), KCR-AC-6 (red confirmed) |

**Red values recorded (Expected = after fix · Received = today's code):** band Total KPIs 9 · **15**; popover planned 11 · 15; hero rich B `1/4` · **`1/3`**; thin rows A `0/3` · `0/4`; rail `1 of 7` · **`1 of 6`**; chip Intermediate `0/1` · **`0/2`**; table card B `1 of 4` · **`1 of 5`**; table card A `4 KPIs · 0 of 3` · `6 KPIs · 0 of 4`; By-AOW banner B `1 of 4` · **`1 of 5`**; hub Σ 9 · 10; ToC map `kind:'program'` branch absent · present (2 leaves); Σ table headers 9 · 11; band under Category filter invariant · drops 15 → 1 (KCR-R-4 violation). All six documented AC-6 values reproduced exactly. Three `it`s green by design (bucket cards already `0 of 1`; cross-cut rows still stamped — KCR-R-7 guard; reported predicate `achieved > 0` — the `progress_percentage` clause is dead code, so no fixture can make it bite).

**Decisions:** `crosscut` on an AoW slice is a **count**, not an array (design §6.1 "only increments `crosscut`"; Reviewer confirmed). Host ToC-map computed is `overviewTocMap` (brief said `tocMapModel`). Table figures read via the real `ReportingAowTableComponent.ratioOf()`/`countLabel()` because `ratioBase()` is private — the seam T-2 moves.

**Reviewer PASS summary:** ownership predicate, bucket dedupe, `aowByCode` map and zero-target/`achieved > 0` totals match design §6.1 exactly; fixtures hand-counted and anti-tautological (KCR-R-1.1 `is_aow: true` flip, `{ planned: 11, zeroTarget: 2, counted: 9, reported: 1 }`); every red re-derived from today's source at the consumer the spec names; no assertion removed; traceability present; no scope creep.

**ADVISORY (4R, Reviewer — recorded, no rework, no new task):**
- *Readability:* fixture docblock says `progress_percentage` is "a nonsense string on every row" but unreported rows carry `'0%'` (which KCR-R-9 requires). Comment inaccurate, fixture correct.
- *Reliability:* B's grouped-table count label (`4 KPIs`, today `6 KPIs`) is the one scenario clause left unasserted; A's is asserted per AC-5.
- *Resilience:* `aowByCode` last-wins on a duplicate AoW code (codes unique per program today).
- *Risk (low):* table figures read off a fresh component instance — sound while `ratioBase` is state-free; T-3's DOM test is the durable seam.
- *Docs:* folder guide still says `buildRatio` is the only home of the zero-target rule → same item as forward pointer (a), owned by KCR-T-5.

**Forward pointers:** (a) folder guide `…/dashboard-lab/CLAUDE.md` needs a `reporting-burndown.ts` line for the partition + `Verified:` re-stamp → **carried to KCR-T-5** (docs task). (b) The working tree also carries uncommitted edits to `results/…/result-header/*` from **another session** in this worktree (`/akili-quick` result-sidebar-code-type) — excluded from the KCR diff; that session committed them itself (`305331185`) before KCR-T-2 started, tree clean.

**Gate:** auto-approved (pre-approved mode) → continue to KCR-T-2.

### `KCR-T-2` — Rewire the host computeds to the partition — **PASS** (2026-09-03, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper, model override `opus`, effort high, skills `angular-developer` + `tdd` |
| Reviewer | `akili-reviewer` wrapper (`opus`), lens checklist mode |
| Files (+231/−92) | `dashboard-lab.component.ts` (+176: `programKpiPartition` computed; `plannedReportingSummaryStats`, `plannedReportingStatsLoading`, `bandPlannedResultsCount`, `overviewAowProgress`, `overviewAowProgressRich`, `overviewXcutProgress`, `plannedAowBanner`, `reportingGroups` aow `count` rewired) · `dashboard-lab.toc-map.ts` (+100/−: `buildLeaf` via `buildRatio`, AoW branch sums all leaves, Program-level branch suppressed iff IO branch non-empty, `isAchieved` removed, docblocks) · `components/reporting-aow-table/reporting-aow-table.component.ts` (`ratioBase` drops `__isIntermediateCrosscut` after `__allIndicators ?? indicators`) · `reporting-burndown.ts` (header docblock) · `components/program-overview/program-overview.component.ts` (`AowProgressRow.zeroTarget?`, OAH DD-4 comment) |
| Verification | `npx jest …/dashboard-lab.kcr-reconciliation.spec.ts --silent` → **16/16 PASS** (baseline 13 failed / 3 passed). No `*.spec.ts` in the diff (`git diff 6b4100bfd --stat -- '*.spec.ts'` empty). Folder run: `2 failed, 22 passed` suites · `5 failed, 820 passed` tests — expected reds for T-4: `dashboard-lab.toc-map.spec.ts` ×4 (Program-level dedupe ×2 → KCR-DD-7; `aow01.total` 6→7 → KCR-DD-2; branch order lost `program:PROGRAM` → KCR-DD-7), `dashboard-lab.oah-rows.spec.ts` ×1 (`is_aow: true` node now AoW-own: complete 1→2, reported 3→4, total 4→5 → KCR-DD-2). `npx ng lint --quiet` clean; `ng build --configuration development` OK; Leader `tsc --noEmit -p tsconfig.app.json` on HEAD clean |
| Grep (Done clause) | `__tier !== 'outcome'` → L3226 (`reportingGroups` Type tier selection, exempt) and L4577 (`splitIndicatorsByTier`, By-AOW display split, not a denominator). 0 hits in rewired computeds |
| Requirements covered | KCR-R-2, R-4, R-5, R-5.1, R-6, R-8, R-9, R-10; KCR-AC-1, AC-3, AC-4 |

**Decisions / adjudications (Reviewer agreed):** (1) `zeroTarget?` lives on `program-overview`'s `AowProgressRow` because the host's `OverviewAowProgressRow` is an alias import — one type, satisfies §6.2 + §6.3. (2) `toc-map.ts` importing `buildRatio` from `./reporting-burndown` does not break the file's "no imports from the component / program-overview" rule; §6.3 mandates it. (3) `ReportingSummaryStats` interface edit deferred to T-3 (structural typing accepts the extra fields; build green).

**Reviewer PASS summary:** every §6.2 row, §6.3 component change and DD-2/DD-3/DD-5/DD-7 decision implemented as written inside the five allowed files, no spec touched — the 16 green tests are earned behaviour.

**ADVISORY (4R — recorded, no rework):** *Readability:* `overviewAowProgressRich` docblock lacks the `bugfix/kpi-count-reconciliation` tag; `sentenceCaseOutcomes()` on the two host literals is now inert. *Reliability:* `bandPlannedResultsCount`'s second fallback (`Σ indicatorsByAow().count`) still counts cross-cuts — unreachable unless every AoW row is a cross-cut and both buckets empty; design pins the chain "unchanged".

**Issues encountered (environment):** a second session in this worktree committed `a1d82cf7e` (KCR-labelled) while the Implementer was mid-edit — the snapshot did not compile (`TS2451` duplicated `intermediateBranch`) and swept the spec folder in. Leader restored a compiling HEAD with follow-up commit `a6a98e18b` from the completed working tree; `a1d82cf7e` was not amended because `c41656b7a` (other spec) already sat on top. Violates the "one AKILI session per checkout" rule in root `CLAUDE.md` — flagged to the user.

**Gate:** auto-approved (pre-approved mode) → continue to KCR-T-3.

### `KCR-T-3` — Disclosure titles: band, chips, hub rows + DOM tests — **PASS** (2026-09-03, 1 attempt)

| Field | Value |
|---|---|
| Implementer | `akili-implementer` wrapper, model override `opus`, effort medium-high, skills `angular-developer` + `tdd` |
| Reviewer | `akili-reviewer` wrapper (`opus`), lens checklist mode |
| Files (+414/−10, 11 files) | `reporting-program-band.component.ts` (`ReportingSummaryStats.plannedKpis?/zeroTargetKpis?`, `totalKpisTitle(stats)`, private `countLabel`) + `.html` (`[attr.title]` on the Total KPIs figure) + `.spec.ts` (+4 DOM tests) · `program-overview.component.ts` (`chipZeroTargetTitle(row)`) + `.html` (chip `<button>` `[attr.title]`) + `program-overview.oah-hero.spec.ts` (+2) · `reporting-entry-hub.component.ts` (`HubAowRow.zeroTarget?`, `HubProgramLevelRow.zeroTarget?`, `zeroTargetTitle(row)`) + `.html` (both figure spans) + `dashboard-lab.hub.spec.ts` (+4) · `reporting-aow-table.component.spec.ts` (+3 AC-5 DOM tests, no prod change) · **Leader-accepted out-of-list edit:** `dashboard-lab.component.ts` `hubProgramLevelRows` threads `zeroTarget: row.zeroTarget` (+ explicit return annotation replacing `satisfies`, fixes TS2677) — required by design §6.3 |
| Verification | brief command (reconciliation + band + oah-hero + aow-table + hub) → `6 suites passed · 279 tests passed` (baseline 266; +13, 0 regressions). TDD red→green quoted per suite. Package run 5 failed / 2040 passed — the 5 are the T-4 fixtures (`toc-map` ×4, `oah-rows` ×1), proven pre-existing by revert/re-run. `tsc -p tsconfig.app.json` clean; `ng build --configuration development` OK; `npx ng lint --quiet` clean. Mutation check: reverting `ratioBase()` cross-cut filter makes the AC-5 header test fail |
| Titles asserted | band `11 planned · excludes 2 zero-target KPIs` / `11 planned` (no `excludes`) / `11 planned · excludes 1 zero-target KPI` / attribute absent without `plannedKpis`; chip Intermediate `excludes 1 zero-target KPI`, 2030 absent, plural `excludes 3 zero-target KPIs`; hub AoW `excludes 4 zero-target KPIs`, singular, absent at 0; program-level Intermediate `excludes 1 zero-target KPI`, 2030 absent. AC-5: header `4 KPIs` + `0 of 3`; Outcomes-band rows exactly IO-1/IO-2 with tooltip `This target is not exclusive to that AoW.`; HLO rows `''` |
| Requirements covered | KCR-R-2.1, R-6 (title), R-7; KCR-AC-2, AC-5 |

**Decisions (Reviewer agreed):** chip `title` on the chip `<button>` (design says "chip `title`"; figure is its only child; computes as accessible description, no a11y regression). No shared `excludes …` helper extracted (precedent: `ratioTitle`, `bannerZeroTargetTitle`).

**Reviewer PASS summary:** all three disclosures built by component methods with exact KCR-R-2.1 wording and pluralisation, asserted as full strings; AC-5 pins tooltip text, not presence; host edit confined to the two lines §6.3 requires.

**ADVISORY (4R — recorded, no rework):** *Readability:* the `excludes N zero-target KPI(s)` sentence now has four homes (band, chip, hub, table) — kaizen candidate. *Reliability (pre-existing, out of scope):* `program-overview.zeroTargetTitle` (rail) and `rowBarTitle` hardcode `zero-target KPIs`, reading `excludes 1 zero-target KPIs` at n = 1 — contradicts KCR-R-2.1 on a surface the requirement lists as "(already)". **Surfaced to the user as a follow-up candidate; not minted as a task.** *Readability:* new hub `describe` indented two spaces deeper than siblings.

**Gate:** auto-approved (pre-approved mode) → continue to KCR-T-4.

