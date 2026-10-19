# Tasks — KPI progress counts only KPIs with a target (P2-3974)

## 1. Scope of this task list

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-target-only/` |
| Requirements / design | `requirements.md` (KTO-R-1 … R-9) · `design.md` (KTO-DD-1 … DD-6) |
| Tasks | 6 (T-1 … T-6) |
| Budget | ≈ 300 LOC prod + ≈ 450 LOC tests · ≤ 2 review rounds per task (design §1) |
| Commit format | `<emoji> <type>(<scope>) P2-3974 [SPEC:changes/kpi-progress-target-only]: <description>` — no apostrophes in the subject (Jenkins) |
| Execute gate | **KTO-OQ-1** (Nicoleta sign-off on P2-3974) recorded before T-1 starts. T-5 (docs only) may run before it |

## 2. Pre-flight checklist

- [x] KTO-OQ-1 recorded on P2-3974 (link or quote in `execution.md`) — waived by user 2026-10-15, see execution.md §2.
- [ ] Branch: work on `qa-development-2026-ss` or a spec branch from it; `onecgiar-pr-server/src/a.py` never staged.
- [ ] Free RAM ≥ 4 GB before any Jest run; one test run at a time on the machine.
- [ ] All Jest commands run from `onecgiar-pr-client/` as `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="<pattern>"`. Never unscoped.
- [ ] Lint only touched files: `npx eslint <files> --quiet`.

## 3. Task list

### [x] KTO-T-1 — Re-arm the shared rule with the "has a target" predicate

- **Type:** client
- **Description:** In `reporting-burndown.ts`, add and export `hasTarget` (target finite and > 0, achieved ignored). `applyZeroTargetRule` returns `counted` = rows with a target and `zeroTarget` = excluded count. Delete `isZeroTarget`; `isPending` and `sortRemainingFirst({ zeroTargetLast })` use `!hasTarget`. `buildRatio` returns `percent: 0` when `total` is 0 (unchanged math, now reachable). Rewrite the file header docstring and the helper docstrings (field name `zeroTarget` kept, meaning "no target set" — KTO-DD-5). Update `reporting-burndown.spec.ts` to the new rule.
- **Implements:** KTO-R-1 (S-1.1), KTO-R-2 (S-2.1, S-2.2 at helper level), KTO-R-3 (S-3.1 math: total 0 → percent 0, no NaN), KTO-R-8 (S-8.1 helpers); KTO-DD-1, DD-2, DD-5
- **Files (expected):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/reporting-burndown.ts`, `.../dashboard-lab/reporting-burndown.spec.ts`
- **Depends on:** — (execute gate KTO-OQ-1)
- **Blocks:** T-2, T-3
- **Estimate:** S
- **Review:** `full` (shared symbol with 9 consumers)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** fixture rows `5/2`, `0/0`, `0/3`, `null/0`, `"0"/0`, `"12"/0` → `buildRatio` must return `{ done: 1, total: 2, zeroTarget: 4 }`. If `0/3` lands in `counted`, or `"12"` lands outside it, the task fails. Fixture of 3 rows all `0/x` → `{ done: 0, total: 0, percent: 0, zeroTarget: 3 }`; `NaN` fails. `pendingOf` over the first fixture must not contain any no-target row.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="dashboard-lab/reporting-burndown.spec"` — new cases red before, green after.
  - **Disqualifier:** if any of the 9 consumers (design §6.2) computes a denominator without these helpers, stop and re-specify T-2 — the single-home premise (KTO-P-1) is false.
  - **Consumers:** `reporting-aow-table` (`buildRatio`, `pendingOf`), `dashboard-lab.component.ts` (`applyZeroTargetRule`, `buildRatio`, `summarisePartition`, `buildAowBannerStats`, `sortRemainingFirst`), `dashboard-lab.toc-map.ts`, `where-to-report-modal`, `results-center-reporting-guide`. Their specs go red here and are fixed in T-2 / T-3 — expected, list them in `execution.md`.
- **Definition of done:**
  - [x] S-1.1 table test and the empty-set test green.
  - [x] `isZeroTarget` has zero references (`grep`).
  - [x] Lint clean on the two files.

### [x] KTO-T-2 — Shell surfaces: band totals, disclosures, empty rows, parity

- **Type:** client
- **Description:** Band stats: `totalKpis` = planned, new `targetedKpis` = counted; "KPIs with evidence" and `evidencePercentage` read `targetedKpis` (KTO-DD-3). Re-add the exclusion branch to `reporting-summary-stats.totalKpisTitle`. Change disclosure copy to "excludes N KPI(s) with no target set" in `program-overview` (`zeroTargetTitle`, row titles) and `reporting-entry-hub` (`zeroTargetTitle`), pluralised. Overview progress rows and hub rows render `—` when `total` is 0 (sort as 0 %). Confirm by grep that `where-to-report-modal` and `results-center-reporting-guide` only pass `buildRatio` output into hub rows (no own math). Update the specs `56fe6e3c5` flipped (except the aow-table ones) and add the S-2.3 parity case.
- **Implements:** KTO-R-2 (S-2.3 parity across hero row, banner, toc-map, band), KTO-R-3 (S-3.1 on Overview / hub rows: `—`, no `0/0`, sort as 0 %), KTO-R-6 (titles; KCR-R-2.2 exemptions kept: toc-map labels and KPI card 4 aggregate stay title-less); KTO-DD-3
- **Files (expected):** `dashboard-lab/dashboard-lab.component.ts`, `components/reporting-summary-stats/reporting-summary-stats.component.{ts,html,spec.ts}`, `components/program-overview/program-overview.component.{ts,html}`, `components/program-overview/program-overview.oah-hero.spec.ts`, `components/reporting-entry-hub/reporting-entry-hub.component.{ts,html}`, `dashboard-lab.kcr-reconciliation.spec.ts`, `dashboard-lab.hub.spec.ts`, `dashboard-lab.oah-rows.spec.ts`, `dashboard-lab.toc-map.spec.ts`, `dashboard-lab.scope.spec.ts`
- **Depends on:** T-1
- **Blocks:** T-6
- **Estimate:** M
- **Review:** `full` (band contract changes; KCR-R-8 partially superseded)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** parity fixture — one AoW with rows 50 targeted (10 reported) + 4 no-target. Hero row, By-AOW banner, toc-map node and band "KPIs with evidence" must all read `10 of 50`; band "Total KPIs" must read 54 with title `54 planned · excludes 4 KPIs with no target set`. Any surface reading 54 as the ratio denominator, or band total reading 50, fails. A hub row with `total 0, zeroTarget 3` must render `—`, never `0/0`.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="dashboard-lab\.(kcr-reconciliation|hub|oah-rows|toc-map|scope)\.spec|reporting-summary-stats|program-overview\.oah-hero"`
  - **Disqualifier:** if a surface turns out to compute its own ratio (grep finds math outside the helpers), stop — KTO-P-1 refuted, re-specify. If the parity test passes only because every surface reads the same stale fixture field (no surface actually calls the helper), the test is not evidence — assert through the components' computed signals.
  - **Consumers:** `ReportingSummaryStats` interface (new `targetedKpis`) — only `reporting-summary-stats` and `dashboard-lab` use it (grep to confirm).
- **Definition of done:**
  - [x] Listed specs green; no `zero-target` wording left in user-facing copy (`grep -rn "zero-target KPI" --include=*.ts --include=*.html` → only code comments / spec names).
  - [x] Lint clean on touched files.

### [x] KTO-T-3 — AoW / bucket card header: split line, empty ratio, rule copy

- **Type:** client
- **Description:** In `reporting-aow-table`: `hasUsableTarget` delegates to `hasTarget`; `ratioOf` exposes an empty flag; new `splitOf(group)` from `buildRatio(ratioBase)`; header left zone shows the split line only when `without > 0` (header `min-h-[52px]`, cards without the line unchanged); empty ratio renders `—`, hidden `%`, bar 0, `aria-label`; ⓘ panel gets the rule sentence; `%` tooltip and `ratioTitle` new copy (design §6.3). DOM tests.
- **Implements:** KTO-R-2 (S-2.1, S-2.2 rendered), KTO-R-3 (S-3.1 card: `—`, BUT NOT `0 of 0` / `0%` / `NaN` / `100%`), KTO-R-4 (S-4.1, S-4.2 incl. "header looks as today", S-4.3 in jsdom with a fixture, S-4.4 for Only-pending and Centers / Types), KTO-R-5 (ⓘ sentence, `%` tooltip), KTO-R-6 (table `ratioTitle`), AC-9 (Intermediate / 2030 cards, same template)
- **Files (expected):** `components/reporting-aow-table/reporting-aow-table.component.{ts,html,scss}`, `components/reporting-aow-table/reporting-aow-table.component.spec.ts`
- **Depends on:** T-1
- **Blocks:** T-4
- **Estimate:** M
- **Review:** `checklist`
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** (a) card fixture 54 rows (50 targeted, 10 reported, 4 no-target incl. one `0/3`) → header text contains `10 of 50`, `20%`, `54 KPIs`, `50 KPIs with target · 4 with no target set`; count of rows whose Progress cell reads *No target set* or *Overachieved* = 4. (b) all-targeted fixture → no split-line node, header element has the same classes as before the change. (c) all-no-target fixture → `—` present, no `%` node, text never contains `0 of 0` or `NaN`. (d) toggling Only-pending (`__allIndicators` set) or picking a Center → header text identical. (e) Intermediate bucket fixture → same line.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="reporting-aow-table.component.spec"`
  - **Disqualifier:** jsdom passes but the line pushes the By-AOW button or ratio off the 375 px header — presence tests cannot see this; T-6 decides. If (b) needs a snapshot of unrelated markup to pass, assert classes on the header element only.
  - **Consumers:** `hasUsableTarget` is used by the flat table sort (`__sortProgress`) and both Progress cells — behavior identical by construction (same predicate); covered by existing flat-table specs in the same pattern.
- **Definition of done:**
  - [x] Falsifier cases (a)–(e) as tests, green.
  - [x] Lint clean.

### [x] KTO-T-4 — In-card Target filter axis

- **Type:** client
- **Description:** `localTargetFilter` signal keyed by `groupKey` (mirrors `localTypeFilter`); `targetCountsOf(group)` over `group.indicators`; `visibleRows` adds the target clause; filter bar renders when centers > 1, types > 1 **or** the card has rows of both kinds; Target section with `All / With target / No target set` chips + counts, `aria-pressed`, default `All`, cleared by the existing clear action; overflow follows the bar's existing popover. DOM tests.
- **Implements:** KTO-R-7 (every bullet: default All; counts over the Centers / Types base; `No target set` and `With target` lists; AND with Centers, Types, search, status; BUT MUST NOT change header ratio or split line; bar visible on single-center mixed card), S-7.1, S-7.2; NFR accessibility (`aria-pressed`, keyboard); KTO-DD-4
- **Files (expected):** `components/reporting-aow-table/reporting-aow-table.component.{ts,html}`, `.../reporting-aow-table.component.spec.ts`
- **Depends on:** T-3 (same files)
- **Blocks:** T-6
- **Estimate:** M
- **Review:** `checklist`
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** fixture where `IITA` holds 3 of 4 no-target rows → Centers `IITA` + Target `No target set` lists exactly 3 rows; header still `10 of 50 · 20%`; chip labels read `All (54)`, `With target (50)`, `No target set (4)`. Single-center mixed card → bar present. Single-center all-targeted single-type card → bar absent (unchanged). Pressing `All` restores 54 rows. Keyboard Enter/Space on a chip toggles it and does not collapse the card.
  - **Red run:** same command as T-3.
  - **Disqualifier:** if the axis can only fit at 375 px by hiding Centers or Types, stop and bring a layout option to the user at T-6 rather than shipping a cramped bar.
  - **Consumers:** none (component-local signals).
- **Definition of done:**
  - [x] Falsifier cases as tests, green.
  - [x] Lint clean.

### [x] KTO-T-5 — Amend spec #5 `toc-kpi-progress` documents

- **Type:** docs
- **Description:** In `docs/specs/changes/portfolio-overview-revamp/toc-kpi-progress/`: TKP-R-1 and glossary "ToC KPI" add "with a target (≥ 1 target row for the reporting year with value > 0)"; S-1.1 gains a no-target indicator that is not counted; `design.md` row "No year / target filter on indicators" becomes a target filter (exact join left to #5's own design, reusing the `program-progress` "has a target" predicate); TKP-DD-2 alternatives line updated; change-log row citing P2-3974 and this spec. Add a change-log row to `portfolio-overview-revamp/family.md`. #5's status stays `pending`; its approval of the amendment happens in its own flow.
- **Implements:** KTO-R-9; KTO-DD-6
- **Files (expected):** `docs/specs/changes/portfolio-overview-revamp/toc-kpi-progress/{requirements,design}.md` (and `tasks.md` if a task names the old rule), `docs/specs/changes/portfolio-overview-revamp/family.md`
- **Depends on:** — (may run before the execute gate)
- **Blocks:** —
- **Estimate:** S
- **Review:** `skip-eligible`
- **Skills:** `cognitive-doc-design`
- **Verification:**
  - **Falsifier:** `grep -n "without a target this year is still a KPI\|dropped the zero-target exclusion" docs/specs/changes/portfolio-overview-revamp/toc-kpi-progress/` returns a hit → not done. Backward sweep: every TKP section that cites TKP-R-1's count reads consistently.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:** if #5 has started executing by then, do not edit its docs — raise the amendment to the user instead.
  - **Consumers:** none (no code).
- **Definition of done:**
  - [x] Grep falsifier clean; change logs updated.

### [x] KTO-T-6 — Browser check (HITL) and lint

- **Type:** rollout
- **Description:** Local stack (`docs/infrastructure.md` §6), Science Program with mixed-target AoWs. Check at 375 / 768 / 1280 px. Read-only: never press Report or any write action (shared prdb).
- **Implements:** NFR responsive + accessibility; S-4.3 on real data; KTO-P-8 / P-9 assumptions; S-2.3 visually (Overview vs Reporting for one AoW)
- **Files (expected):** none (evidence in `execution.md`)
- **Depends on:** T-2, T-4
- **Blocks:** archive
- **Estimate:** S
- **Review:** user (HITL)
- **Skills:** `claude-in-chrome` (or `run`)
- **Verification:**
  - **Falsifier:** any of: horizontal page scroll at 375 px; split line truncating its numbers; header of an all-targeted AoW taller than 52 px; split-line M ≠ count of *No target set* + *Overachieved* rows in that AoW; Overview hero `x of N` ≠ Reporting header for the same AoW; a Center pick changing which rows count as no-target.
  - **Red run:** n/a (visual).
  - **Disqualifier:** the served bundle is not the edited one (check a new string is present before judging) — the check is void, not passed.
  - **Consumers:** —
- **Definition of done:**
  - [x] Screenshots / notes at three widths in `execution.md`; user accepts (browser check delegated to Leader; acceptance requested).
  - [x] `npx eslint <all touched .ts files> --quiet` clean.

### [x] KTO-T-7 — Global Target filter in the Reporting toolbar (Amendment A-1)

- **Type:** client
- **Description:** `reportingTargetFilter` signal in `dashboard-lab.component.ts`, applied where `reportingTypeFilter` filters rows (predicate `hasTarget`); Target control in the `reporting-program-band` Filters panel (`All` / `KPIs with target` / `KPIs with no target`), wired into its active count, Clear and storage like Type / Status. Type chips and cards recompute from the filtered rows.
- **Implements:** KTO-R-10 (S-10.1, S-10.2, S-10.3); KTO-DD-7
- **Files (expected):** `dashboard-lab/dashboard-lab.component.{ts,html}`, `components/reporting-program-band/reporting-program-band.component.{ts,html}` + their specs (new or existing toolbar spec)
- **Depends on:** T-1, T-4
- **Estimate:** M
- **Review:** `checklist`
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** fixture 54 rows (50 targeted, 10 reported, 4 no-target) across types: Target = no target → `All` chip 4, card `4 KPIs`, ratio `—`; Target = with target → `All` 50, card `50 KPIs`, `10 of 50 · 20%`, no split line; combined with Type = KP → only KP rows of that kind; Clear → back to 54. Browser on SP01: no target → `All` 46; with target → `All` 369.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="reporting-program-band|dashboard-lab\.(component|kcr-reconciliation|scope)\.spec|reporting-aow-table.component.spec"`
  - **Disqualifier:** if the toolbar Type filter does not remove rows upstream of the chips and cards (each surface filters itself), stop and re-specify. One home only.
- **Definition of done:**
  - [x] S-10.1–S-10.3 as tests, green; existing toolbar / filter tests green.
  - [x] Lint clean on touched `.ts`.
  - [x] Browser check on SP01 (Leader, Claude in Chrome).

### [x] KTO-T-8 — Overview Areas of Work KPI card: dash when no KPI has a target (Amendment A-2)

- **Type:** client
- **Description:** `program-overview.component.html` ~L119-155 (`aowStats`): when `totalPlanned === 0`, render `—` (KTO-R-3 pattern, copy, `aria-label`) instead of `0%`, and `No KPIs with a target` instead of `0/0 KPIs`; keep `· N AoWs`. Test first. Update `program-overview/CLAUDE.md` if its note about card 4 / `aowStats` is stale.
- **Implements:** KTO-R-11 (S-11.1)
- **Files (expected):** `components/program-overview/program-overview.component.{html,ts}` + a program-overview spec, `components/program-overview/CLAUDE.md`
- **Depends on:** T-2
- **Estimate:** S
- **Review:** `checklist`
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** `aowStats` with `totalPlanned 0`, `aows 5` → the card text contains `—` and `No KPIs with a target · 5 AoWs`, and never `0%`, `0/0` or `NaN`. With `totalPlanned 50, done 10` → unchanged (`20%`, `10/50 KPIs`).
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --maxWorkers=2 --testPathPattern="program-overview"`
- **Definition of done:**
  - [x] S-11.1 test red → green; existing program-overview specs green.
  - [x] Lint clean on touched `.ts`.

## 4. Dependency graph

```
T-5 (docs, any time)

T-1 ──► T-2 ─────────────┐
   └──► T-3 ──► T-4 ─────┴──► T-6
```

T-2 and T-3 touch disjoint files and may run in parallel (only one Jest run at a time).

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| KTO-TEST-1 | unit | R-1, R-2, R-3 math, R-8 | `dashboard-lab/reporting-burndown.spec.ts` |
| KTO-TEST-2 | unit (parity) | R-2 S-2.3, DD-3 | `dashboard-lab/dashboard-lab.kcr-reconciliation.spec.ts` |
| KTO-TEST-3 | unit | R-3, R-6 on Overview / hub / band | `dashboard-lab.hub|oah-rows|toc-map|scope.spec.ts`, `reporting-summary-stats.component.spec.ts`, `program-overview.oah-hero.spec.ts` |
| KTO-TEST-4 | component DOM | R-2–R-5, R-7, AC-9 | `reporting-aow-table.component.spec.ts` |
| KTO-TEST-5 | manual (HITL) | NFR layout, S-4.3 real data | T-6 |

### Scenario / clause ownership

| Scenario / clause | Owner |
|---|---|
| S-1.1 incl. BUT `0/3` not targeted | T-1 |
| S-2.1 | T-1 (helper), T-3 (render) |
| S-2.2 incl. BUT not in numerator | T-1, T-3 (a) |
| S-2.3 incl. hub / band totals | T-2 |
| S-3.1 card (BUT no `0 of 0` / `0%` / `NaN` / `100%`) | T-3 (c) |
| S-3.1 Overview / hub rows + sort as 0 % | T-2 |
| S-4.1, S-4.2 | T-3 (a), (b) |
| S-4.3 | T-3 (a) fixture; T-6 real data |
| S-4.4 Only-pending, Centers / Types | T-3 (d) |
| S-4.4 Target chip | T-4 |
| R-5 ⓘ, `%` tooltip | T-3 |
| R-6 titles (+ KCR-R-2.2 exemptions) | T-2; table `ratioTitle` T-3 |
| R-7 all bullets, S-7.1, S-7.2 | T-4 |
| S-8.1 | T-1 |
| R-9 | T-5 |
| NFR responsive / a11y | T-4 (aria), T-6 (layout) |

## 6. Rollout & verification

Client-only. Deploy path as usual (qa-dev → performance-refactor → PRTest). Release note: "KPI progress now counts only KPIs with a target; KPIs without a target are listed and filterable." Ask Angel to amend the P2-3974 *How to test* step (Overachieved rows count).

## 7. Cleanup & follow-ups

- At archive: sync `dashboard-lab/CLAUDE.md` and `reporting-aow-table/CLAUDE.md` (zero-target paragraph, 🛑 `ratioOf` note, band DD-3).
- `codegraph sync` after merge.

## 8. Roll-back plan

Revert the T-1…T-4 commits; no data or config to undo. T-5 docs revert separately if #5 is reconsidered.

## Required cross-references

`requirements.md`, `design.md`, `proposal.md` (this folder); `docs/prd.md` US-P1; `docs/trd/trd.md` client module `result-framework-reporting`.
