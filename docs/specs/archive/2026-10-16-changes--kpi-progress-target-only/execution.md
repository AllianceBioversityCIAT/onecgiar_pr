# Execution Log — KPI progress counts only KPIs with a target (P2-3974)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-target-only/` |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated (inherited from `proposal.md`) |
| Leader | Claude Code — Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` wrapper (T2 `sonnet`) / `akili-reviewer` wrapper (T3 `opus`) |
| Started | 2026-10-15 |

## 2. Execute gate — KTO-OQ-1 (decision record)

**Status:** closed by product-owner decision, 2026-10-15. Nicoleta's sign-off was **not** obtained; the gate was lifted by the user (santiago.sanchez@cgiar.org) because the requester of P2-3974 sets the rule.

**User's decision (verbatim, 2026-10-15):** *"si angel fue quien lo pidio debemos de hacerlo. procede … solo documenta como se hizo/corrigio en 0909 y como se va a actualizar a la fecha de hoy"*

### Timeline of the "KPIs without a target" rule

| Date | Rule in force | Source | Code |
|---|---|---|---|
| 2026-09-03 | **Excluded.** Zero-target KPIs (`target = 0 AND achieved = 0`, predicate `isZeroTarget`) left out of every progress ratio, with a disclosure `title` | Spec `bugfix/kpi-count-reconciliation` (KCR-R-2) | `reporting-burndown.ts` → `applyZeroTargetRule` |
| 2026-09-09 | **Included.** Every planned KPI counts in numerator and denominator, target or not; a no-target KPI with results shows "Overachieved" | Nicoleta Trifa, email *"More testing in PRMS - things to solve"*: *"why would you remove indicators without target? Even if target = 0 … people will still report against that indicator (it will show as overachieved, but it is fine)"* | Commit `56fe6e3c5` (JuanCode), *🔧 fix(dashboard-lab): count all planned KPIs in Progress by AoW reporting progress*. No spec. 15 files, `applyZeroTargetRule` became a no-op (`zeroTarget: 0`) |
| 2026-10-15 (this spec) | **Excluded again, stricter predicate.** Only KPIs with a target (`target` finite and `> 0`, achieved ignored → `hasTarget`) enter the ratio. "Overachieved" rows (no target, reported) also count as no target. No-target KPIs stay visible, counted aloud (split line, disclosures) and filterable | Jira P2-3974 (Angel Jarrin), Q4 2026 Strategic Enhancements | T-1 … T-4 of this spec |

**Consequence to communicate:** the 2026-09-09 behavior Nicoleta asked for is reversed on every surface that uses `buildRatio` (Reporting tab and Overview). If she objects, the rule must not flip a third time without Angel and Nicoleta agreeing (proposal R-4).

## 3. Task Execution History

### KTO-T-1 — Re-arm the shared rule with the "has a target" predicate — PASS (attempt 1)

- **Date:** 2026-10-15 · **Implementer:** `akili-implementer` (sonnet, effort medium-high), skills `angular-developer`, `tdd` · **Reviewer:** `akili-reviewer` (opus), checklist mode
- **Files:** `dashboard-lab/reporting-burndown.ts`, `dashboard-lab/reporting-burndown.spec.ts`
- **Change:** `hasTarget` exported (target finite and > 0, achieved ignored, numeric strings parse); `applyZeroTargetRule` → `counted` = rows with a target, `zeroTarget` = excluded count; `isZeroTarget` deleted; `isPending` / `sortRemainingFirst({ zeroTargetLast })` use `!hasTarget`; `buildRatio` percent 0 when total 0; header + helper docstrings rewritten (DD-5).
- **Verification:** red (spec first) 23 failed / 22 passed of 45 → green 45 / 45 (`--testPathPattern="dashboard-lab/reporting-burndown.spec"`, maxWorkers=2, 8.5 GB free). ESLint clean on both files (`ESLINT_USE_FLAT_CONFIG=false`, client has only `.eslintrc.json`). `grep isZeroTarget` → 0 hits in client src. Falsifier: `buildRatio` → `{ done: 1, total: 2, percent: 50, zeroTarget: 4 }`; all no-target → `{ 0, 0, 0, 3 }`, not NaN; `pendingOf` holds no no-target row.
- **Reviewer verdict:** PASS — "Every obligation is met. I traced the falsifier by hand, and nothing in the diff goes outside the two files T-1 declares."
- **ADVISORY (not gating):** (1) READABILITY `reporting-burndown.ts:236` `partitionProgramKpis` docstring still says "zero-target/dedupe disclosures". (2) READABILITY `buildRatio` docstring lacks the `@akili-spec changes/kpi-progress-target-only` tag.
- **Requirements covered:** KTO-R-1 (S-1.1), R-2 (S-2.1, S-2.2 helper level), R-3 (S-3.1 math), R-8 (S-8.1); KTO-DD-1, DD-2, DD-5.
- **Consumer specs expected red (fixed in T-2 / T-3, not run):** `dashboard-lab.toc-map.spec`, `shared/constants/achieved-display-basis.spec`, `dashboard-lab.component.spec`, `dashboard-lab.hub.spec`, `dashboard-lab.kcr-reconciliation.spec`, `dashboard-lab.oah-rows.spec`, `dashboard-lab.scope.spec`, `reporting-aow-table.component.spec`, `reporting-summary-stats.component.spec`, `program-overview.component.spec`, `program-overview.oah-hero.spec`, `program-overview.scope.spec`, `where-to-report-modal.component.spec`.

#### Disqualifier adjudication (Leader) — no pivot

The Implementer reported that `where-to-report-modal` (L131-138) and `results-center-reporting-guide` (L186-193) do **not** build their AoW hub rows from `buildRatio`: they read `response.areas[].progress` from `GET toc-results/program-progress` (`GET_ScienceProgramTocProgress`). Design §6.2 says those two "only push `buildRatio` output into hub rows" — **that statement is wrong** for the AoW rows (their Intermediate / 2030 rows do go through `buildRatio`).

Leader check (server source): that endpoint is the ToC *achievement* roll-up (`onecgiar-pr-server/.../repositories/toc-progress-rollup.ts`), whose single predicate `hasUsableTarget` already excludes indicators with target absent or 0 from every average (P2-3296). So those rows were never on the 2026-09-09 "count all" rule, and they already agree with `hasTarget`. KTO-P-1 (single home of the *client* ratio rule) holds for every surface this spec changes; T-2 proceeds without re-specifying. T-2 brief: do not change these two components' AoW-row mapping.

**Pre-existing defect found (out of scope, follow-up for the user):** the server `ProgressRollup` has no `done` field (`counted`, `total`, `indicators_counted`, `indicators_total`, percentages). Both components map `done: area.progress?.done ?? 0`, so their AoW hub rows always show done = 0 and `total` = number of HLOs counted. Not introduced by this spec; not fixed here.

**Gate note:** execution continues past the per-task pause on the user's 2026-10-15 instruction "procede" (gated mode, user asked not to block).

### KTO-T-3 — AoW / bucket card header: split line, empty ratio, rule copy — PASS (attempt 1, one in-attempt scope fix)

- **Date:** 2026-10-15 · **Implementer:** `akili-implementer` (sonnet, effort medium-high), skills `angular-developer`, `spartan`, `tailwind-design-system` · **Reviewer:** `akili-reviewer` (opus), checklist mode, effort high
- **Files:** `components/reporting-aow-table/reporting-aow-table.component.{ts,html,spec.ts}` (`.scss` untouched)
- **Change:** `hasUsableTarget` → `hasTarget`; `ratioOf` exposes `empty`; new `splitOf(group)` from `buildRatio(ratioBase)` (Only-pending / Centers / Types cannot move it); split line `data-testid="aow-split-line"` only when no-target > 0 and not loading; header `min-h-[52px]` always, `h-[52px]` only without the line, `py-[6px]` only with it; empty ratio → `—` (`role="img"`, `aria-label="No KPIs with a target"`), no `%` node, bar 0%; ⓘ rule sentence (`data-testid="aow-info-rule"`) and `%` tooltip with design §6.3 copy; `ratioTitle` / `rowTitle` → "excludes N KPI(s) with no target set".
- **Implementer `Not Done` → resolved in-attempt (Leader decision):** `achievementTooltip()` (HLO header, ~L1124/1130/1136) still said "uses / counts every planned KPI", user-facing copy asserting the old rule (contradicts KTO-R-1 / R-5). Ruled in scope for T-3 (same file, copy made false by this spec, not an advisory) and sent back to the same Implementer: now "uses only KPIs with a target in the ratio above" / "counts only KPIs with a target separately"; new test asserts all three branches.
- **Verification:** red 18 failed / 174 passed of 192 (HEAD `.ts`/`.html` with the new spec) → green 193 / 193 (`--testPathPattern="reporting-aow-table.component.spec"`, maxWorkers=2, serialized with T-2's Jest); wider `reporting-aow-table` pattern 4 suites 215 / 215. ESLint clean on `.ts` files.
- **Falsifier tests** (`describe('header: split line, empty ratio and rule copy')`): (a) `10 of 50` · `20%` · `54 KPIs` · `50 KPIs with target · 4 with no target set`, 4 Progress cells No target set / Overachieved; (b) all-targeted: no split node, header classes unchanged; (c) all-no-target: `—`, no `%`, never `0 of 0` / `NaN` / `100%`; (d) header identical across Only-pending and a picked Center; (e) Intermediate and 2030 buckets.
- **Reviewer verdict:** PASS — "Every required behaviour and every copy string is in the shipped code, and each of falsifier cases (a)–(e) has a matching test."
- **ADVISORY (not gating):** (1) RELIABILITY test (d) covers Only-pending and Centers, not Types (stable by construction). (2) RELIABILITY `h-[52px]` / `py-[6px]` key on `split.line` but the line also needs `!group.loading` — a loading group with no-target rows would lose the fixed 52 px. (3) READABILITY new inner left-zone `<div>` not re-indented. (4) READABILITY `buildRatio(ratioBase)` runs three times per card per CD pass (`splitOf`, `ratioOf`, `ratioTitle`).
- **Open for T-6:** 375 px layout unverified (split line wraps inside a narrow left zone; if it pushes the ratio or By-AOW button off, move it to a full-width row). Folder `CLAUDE.md` update deferred to archive.
- **Requirements covered:** KTO-R-2 (S-2.1, S-2.2 rendered), R-3 (S-3.1 card), R-4 (S-4.1, S-4.2, S-4.3 fixture, S-4.4 Only-pending / Centers), R-5, R-6 (`ratioTitle`), AC-9.

### KTO-T-2 — Shell surfaces: band totals, disclosures, empty rows, parity — PASS (attempt 1)

- **Date:** 2026-10-15 · **Implementer:** `akili-implementer` (sonnet, effort high), skills `angular-developer`, `tdd` · **Reviewer:** `akili-reviewer` (opus), checklist mode, effort high
- **Files:** `dashboard-lab.component.{ts,html}`; `components/reporting-summary-stats/reporting-summary-stats.component.{ts,html,spec.ts}`; `components/program-overview/program-overview.component.{ts,html}`, `program-overview.oah-hero.spec.ts`; `components/reporting-entry-hub/reporting-entry-hub.component.{ts,html}`; `dashboard-lab.{kcr-reconciliation,hub,oah-rows,scope,toc-map}.spec.ts`; `shared/constants/achieved-display-basis.spec.ts`; `reporting-burndown.ts` (docstring + `@akili-spec` tag only — T-1 advisories).
- **Change:** band `totalKpis` = planned, new `targetedKpis` = counted; "KPIs with Evidence" and `evidencePercentage` read the targeted set (DD-3); `totalKpisTitle` exclusion branch restored (`54 planned · excludes 4 KPIs with no target set`); disclosure copy "excludes N KPI(s) with no target set" in program-overview (rail, chips, `rowBarTitle`), entry hub, `bannerZeroTargetTitle`; `—` when total 0 on Overview rows / chips / rail, hub AoW and program rows, By-AOW banner tiles, band evidence card (sorts as 0 %).
- **Verification:** red = old specs vs new code: 7 suites failed, 24 failed / 390 passed of 414 → green 16 suites, 503 / 503 (shell pattern + `reporting-burndown|reporting-entry-hub|results-center-reporting-guide`), maxWorkers=2, serialized with T-3. ESLint clean on 13 `.ts` files. DoD grep "zero-target KPI" → 6 hits, all comments / spec names.
- **Parity test (S-2.3):** `dashboard-lab.kcr-reconciliation.spec.ts` "S-2.3 parity - one AoW with 50 targeted (10 reported) + 4 no-target rows", asserted through the real computed signals (hero, thin rows, `plannedAowBanner`, `overviewTocMap`, table `ratioOf`, `plannedReportingSummaryStats`, `ReportingSummaryStatsComponent`): all read 10 of 50; band total 54 with the exclusion title; evidence 20 %.
- **Leader adjudication confirmed by grep:** `where-to-report-modal` / `results-center-reporting-guide` Intermediate and 2030 rows use `buildRatio`; AoW rows come from the server roll-up (unchanged, see T-1 adjudication).
- **Implementer assumptions accepted by Reviewer:** extra `—` surfaces (KTO-R-3 "a surface's targeted set"); C-2 orphan (target 0, achieved > 0) now excluded (DD-2); `rowSubline` "0 KPIs remaining" kept (count, not ratio).
- **Reviewer verdict:** PASS — "T-2 meets KTO-R-2 (S-2.3), KTO-R-3 (S-3.1 on Overview and hub rows), KTO-R-6 and KTO-DD-3 … The KCR-R-2.2 exemptions hold."
- **ADVISORY (not gating):** (1) RISK Overview KPI card 4 (`aowStats`, `program-overview.component.html:138/143`) still renders `0%` / `0/0 KPIs` when a whole program has no targeted KPI; no task covers this edge → **raised to the user**. (2) READABILITY `reporting-entry-hub.component.html` ~L93-103 nested duplicate `@if (row.total > 0)`, inner `@else` dead. (3) READABILITY `dashboard-lab.toc-map.spec.ts` L32-39 `aowCardRow` oracle still encodes `!(target === 0 && achieved === 0)`. (4) READABILITY comments "zero-target rule" at `reporting-entry-hub.component.html:88-89`, `program-overview.component.html:916`. (5) RISK folder `CLAUDE.md` files (`dashboard-lab/`, `program-overview/`, `reporting-entry-hub/`) not updated — tasks §7 defers to archive. (6) hard-coded English "No KPIs with a target" (matches surrounding templates).
- **Requirements covered:** KTO-R-2 (S-2.3), R-3 (S-3.1 Overview / hub rows), R-6; KTO-DD-3.

### KTO-T-4 — In-card Target filter axis — PASS (attempt 1)

- **Date:** 2026-10-15 · **Implementer:** `akili-implementer` (sonnet, effort medium), skills `angular-developer`, `spartan`, `tailwind-design-system` (no Spartan primitive added — the bar uses token chips, mirrored) · **Reviewer:** `akili-reviewer` (opus), checklist mode
- **Files:** `components/reporting-aow-table/reporting-aow-table.component.{ts,html,spec.ts}`
- **Change:** `TargetFilterMode`; `localTargetFilter` keyed by `groupKey`; `selectedTargetOf`, `setTargetFilter` (re-press clears), `targetCountsOf` over `group.indicators`, `hasMixedTargets`; `visibleRows` AND clause via `hasTarget`; filter bar renders when centers > 1, types > 1 or mixed targets; Target section `All / With target / No target set` with counts, `aria-pressed`, `role="group"`; below 640 px the chips move into the existing Filter popover (44 px hit areas); popover Reset and empty-state Clear filters reset the axis. Header ratio / split line untouched (`ratioBase` never reads the new signal).
- **Verification:** green 204 / 204 (`--testPathPattern="reporting-aow-table.component.spec"`, maxWorkers=2), 11 new tests in `describe('in-card Target filter axis (KTO-R-7)')`, T-3 describe still green. Red proof: `visibleRows` clause commented out → 5 failed / 6 passed on `-t "Target filter axis"`. ESLint clean.
- **Falsifier coverage:** S-7.1 IITA × No target set = 3 rows, header `10 of 50 · 20%` and split line unchanged; chips `All (54)` / `With target (50)` / `No target set (4)`, default All; single-center mixed card shows bar; all-targeted (and all-untargeted) single-center single-type card hides it; S-7.2 All restores 54; Enter / Space toggle without collapsing (jsdom: native `button`, header is a sibling — real keypress proof left to T-6).
- **Reviewer verdict:** PASS — "it meets every KTO-R-7 bullet, S-7.1, S-7.2, the accessibility NFR and KTO-DD-4."
- **ADVISORY (not gating):** (1) RISK 640–~900 px: inline Target section is `shrink-0` inside an `overflow-hidden` row and the popover copy is hidden ≥ 640 → wide Centers + Types could clip the Target chips with no way to reach them → **check at 768 px in T-6**. (2) RELIABILITY below 640 px an active Target selection does not raise the Filter badge (`overCount`) / `isOverActive`. (3) READABILITY `RowStatus` JSDoc now sits above `TargetFilterMode`; `export type RowStatus ='not-started'` lost a space. (4) READABILITY Target chips written twice (inline + popover). (5) RISK low: popover Reset at ≥ 640 also clears the inline Target selection.
- **Requirements covered:** KTO-R-7, S-7.1, S-7.2, NFR accessibility; KTO-DD-4.

### KTO-T-6 — Browser check (HITL) and lint — IN PROGRESS (rework of T-3 / T-4 layout triggered)

- **Date:** 2026-10-15 · **Leader-run** via Claude in Chrome on the user's local stack (`http://localhost:4200`, user said the stack is running), SP01 *Breeding for Tomorrow*, Reporting tab. Read-only: only expand / filter / popover clicks, no write action. Window is maximized (resize ignored) → widths simulated with same-origin iframes of fixed width.
- **Served bundle check:** `app-reporting-aow-table` exposes `splitOf` / `setTargetFilter`, split line rendered → bundle is the edited one.
- **S-4.3 on real data (PASS):** every card's split-line M equals its rows without a target — AOW01 21+2, AOW02 111+27, AOW03 94+7, AOW04 61+5, AOW05 73+2, Intermediate 5+2, 2030 4+1.
- **S-2.3 parity on real data (PASS):** Overview `overviewAowProgress` = Reporting headers for all 5 AoWs (AOW01 2/21, AOW02 1/111, AOW03 3/94, AOW04 0/61, AOW05 1/73). Band: `totalKpis` 415, `targetedKpis` 369, `zeroTargetKpis` 46, `reportedKpis` 10 (369 + 46 = 415).
- **Center pick (PASS):** picking IITA on AOW02 leaves the header text identical.
- **Lint (PASS):** `ESLINT_USE_FLAT_CONFIG=false npx eslint <22 spec-touched client .ts> --quiet` → exit 0.

#### Layout findings and rework

| # | Width | Finding | Owner | Outcome |
|---|---|---|---|---|
| L-1 | 375 px | Split line inside the ~40 px left zone wrapped word by word; header 145 px; text over the progress bar | T-3 | Rework attempt 2: mobile row `aow-split-line-mobile` (`basis-full`, `min-[640px]:hidden`), in-zone line hidden below 640, button `flex-wrap` below 640. Re-check: header 68 px, one line, no horizontal scroll |
| L-2 | 768 px | Target axis clipped inline and missing from the Filter popover → unreachable (KTO-R-7 MUST offer) | T-4 | Rework attempt 2: Target routed through the popover below 1280, badge counts it. Re-check: popover shows `All (138) / With target (111) / No target set (27)` |
| L-3 | 639 / 1279 px | Reviewer **FAIL** (attempt 2): off-by-one pairs `max-[639px]`/`min-[640px]`, `max-[1279px]`/`min-[1280px]` → both lines / both Target copies visible at 639 / 1279 | T-3, T-4 | Attempt 3: pairs on the same number (`max-[640px]`/`min-[640px]`, `max-[1280px]`/`min-[1280px]`). Browser: exactly one line at 375 / 639 / 640 / 1279 / 1280. Reviewer **PASS** ("each pair of complementary breakpoints now uses the same number") |
| L-4 | 1280 px | AOW02 (9 centers): inline Target section clipped (x 1087–1457, bar ends 1117), not in popover at ≥ 1280 → unreachable | T-4 | **T-4 disqualifier → user decision (2026-10-15): "Target primero"** — Target section moves before Centers (3 short chips, never clip); Centers / Types keep overflowing into the Filter popover. Breakpoint returns to 640. In progress |

- **Reviewer verdicts on this rework:** attempt 2 FAIL (L-3, quoted above in the table; full report relayed verbatim to the Implementer); attempt 3 PASS, no advisory.
- **Pre-existing, not introduced by this spec (follow-up):** at 375 px the AoW code chip overlaps the progress bar (HEAD left zone already `min-w-0 flex-1`, name truncates to 0 px).

#### KTO-T-6 close — PASS

- **L-4 resolved:** Target-first layout (user decision). Files: `reporting-aow-table.component.{html,spec.ts}`; inline `target-axis` first in the bar (`shrink-0 max-[640px]:hidden`), divider after it only when Centers / Types exist; popover Target block and Filter no-overflow branch `min-[640px]:hidden`; new test asserts order (`compareDocumentPosition`), `shrink-0` and the 640 pair. Jest 208 / 208 (`reporting-aow-table.component.spec`, maxWorkers=2).
- **Browser re-check (iframes, SP01):** 1280 → all 6 cards show the three Target chips fully, before the Centers label (AOW02 `All (138) | With target (111) | No target set (27)`, last chip ends x=536, clip edge 1109); 640 → inline, unclipped; 375 → Target in the Filter popover; split line exactly one copy at 375 / 639 / 640 / 1279 / 1280; no horizontal scroll at any width.
- **Reviewer verdict:** PASS — "The user-approved 'Target primero' layout matches KTO-R-7, and every width shows exactly one Target copy … the L-4 unreachability is fixed by construction."
- **Screenshots** (local, Claude in Chrome): `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Ptmn4l\` — `screenshot-1792101680427-16.jpg` (1280 headers), `…-1792101757113-19.png` (768 headers), `…-1792101770542-20.png` (375 before fix), `…-1792102071715-25.png` (375 after fix), `…-1792102068098-24.png` (768 popover with Target), `…-1792103743355-26.jpg` (Target first).
- **HITL:** the user delegated the browser check to the Leader ("haces la prueba usando claude in chrome"); final acceptance requested in the run summary.
- **Budget note:** design §1 allows ≤ 2 review rounds per task; the T-3 / T-4 layout work took 3 extra rounds during T-6 (attempt 2 FAIL, attempt 3 PASS, Target-first PASS). Cause: layout only visible in a real browser (jsdom), as T-3 / T-4 disqualifiers anticipated. Reported to the user.
- **Follow-ups (not in this spec):** (1) 375 px code chip overlaps the progress bar — pre-existing. (2) Filter badge counts an inline Target selection at ≥ 640 when the card has overflow Centers / Types (accepted advisory). (3) Folder `CLAUDE.md` of `dashboard-lab/`, `reporting-aow-table/`, `program-overview/`, `reporting-entry-hub/` + `Verified:` stamp — at archive / commit (tasks §7). (4) Server `ProgressRollup` has no `done` → `where-to-report-modal` / `results-center-reporting-guide` AoW rows show 0 reported (pre-existing). (5) Overview KPI card 4 shows `0% · 0/0 KPIs` when a whole Program has no targeted KPI — question drafted for Angel. (6) T-5 (#5 doc amendment) blocked: spec #5 is executing in this checkout.

### KTO-T-7 — Global Target filter in the Reporting toolbar (Amendment A-1) — PASS (attempt 1)

- **Date:** 2026-10-16 · **Source:** Angel Jarrin via the user (follow-up to P2-3974). Spec reopened by the user: Amendment A-1 added to `requirements.md` (KTO-R-10, S-10.1–S-10.3), `design.md` (KTO-DD-7), `tasks.md` (KTO-T-7). User decisions (2026-10-16): filter like the toolbar Type filter (chips and cards recompute); keep the in-card axis; persist and clear like the other panel controls.
- **Implementer:** `akili-implementer` (sonnet, effort medium-high), skills `angular-developer`, `spartan`, `tailwind-design-system`, `tdd` · **Reviewer:** `akili-reviewer` (opus), checklist mode, effort high
- **Files:** `dashboard-lab/reporting-burndown.ts` (type `ReportingTargetFilter` only); `dashboard-lab.component.{ts,html}` (`reportingTargetFilter` signal, `matchTarget` in `reportingGroups()`, `reportingFiltersActive`, `clearReportingFilters`, card `count` follows Target only); `components/reporting-program-band/reporting-program-band.component.{ts,html,spec.ts}` (Target `app-pr-filter-select` beside Status, badge count, removable chip); `dashboard-lab.kcr-reconciliation.spec.ts`; `dashboard-lab/CLAUDE.md` (entry + `Verified:`).
- **Disqualifier:** not triggered. Type and Category filter rows inside `reportingGroups()`, and the chips, cards, split line and ratio all read that output.
- **Verification:** red (new tests first) 11 failed / 135 passed → green 6 suites, 482 / 482 (T-7 pattern, maxWorkers=2). ESLint clean. `ng build --configuration development` exit 0.
- **Browser check (Leader, Claude in Chrome, SP01, real UI clicks):** the panel shows TARGET beside STATUS. *KPIs with no target* → `All` 46, KP 8, every ratio `—`, cards' `N KPIs` = their no-target count (AOW04 5 / 5, AOW05 2 / 2, AOW02 split `0 KPIs with target · 27 with no target set`), badge `Filter 1`, chip `Target: KPIs with no target`. *KPIs with target* → `All` 369, KP 81, ratios unchanged (2 of 21, 1 of 111, 3 of 94, 0 of 61, 1 of 73), cards `61 KPIs` / `73 KPIs`, no split line. *Clear all* → `All` 415, badge gone. Screenshots `…-1792166331497-27.jpg` (panel), `…-1792166357371-28.jpg` (no target), `…-1792166385327-29.jpg` (with target).
- **Reviewer verdict:** PASS — "KTO-T-7 meets KTO-R-10 / S-10.1–S-10.3 and KTO-DD-7. The Target filter is applied in one place." The split line under the no-target filter is ruled conformant (KTO-R-4 requires it when M ≥ 1). The `count` special case is ruled a sound, minimal reading of S-10.1 / S-10.2.
- **ADVISORY (not gating):** (1) RISK the CLAUDE.md line "no storage (like Type / Category)" is wrong: Category is URL-mirrored as `?typ=`, Type / Status are not. Target follows Type / Status (no storage) → **ask the user** whether it should survive a reload like Category. (2) RELIABILITY the pre-partition fallback of `count` uses Category-filtered `rows.length`. (3) READABILITY the S-10.1 test does not assert the split line text.
- **Requirements covered:** KTO-R-10 (S-10.1, S-10.2, S-10.3); KTO-DD-7.

#### KTO-T-7 follow-up — Target filter persisted in the URL — PASS (attempt 2)

- **Date:** 2026-10-16 · **User decision (relayed by the user's orchestrator session):** the global Target filter MUST survive a reload through the URL, the same way Category does (`?typ=`). Default `all` writes no param. The value is restored on load and removed by Clear.
- **Change:** `dashboard-lab.component.ts`: `tgt=with|without` is written in the existing URL-mirror effect, only on the Reporting view. `restoreTargetFilter(raw)` (absent or invalid → `all`, no-op on the same value) is called next to the `typ` restore in `restorePlannedBrowseFromQuery` and in the `queryParamMap` subscription. `tgt` was added to `hasPlannedParams`. T-7 advisories folded in: the pre-partition `count` fallback is now `tierRows.filter(matchTarget).length`, and the S-10.1 test now asserts the split line. Specs: `dashboard-lab.component.spec.ts` (5 URL tests), `dashboard-lab.kcr-reconciliation.spec.ts`. The `dashboard-lab/CLAUDE.md` "no storage" line is corrected.
- **Verification:** red 5 failed / 112 passed (new URL tests) → green `Test Suites: 6 passed, 6 total · Tests: 487 passed, 487 total` (T-7 pattern, maxWorkers=2). ESLint clean.
- **Browser (SP01):** loading `?tocView=aows&tgt=without` restores the filter: `All` 46, chip `Target: KPIs with no target`, badge `Filter 1`. *Clear filters* removes `tgt` and the signal is `all`.
- **Reviewer verdict:** PASS — "meets KTO-R-10 as the user resolved it on 2026-10-16 … the Target filter is still applied in one place."
- **Correction closure:** the KTO-R-10 / KTO-DD-7 wording ("like Type / Status storage") now says URL mirror `tgt`. A grep for the superseded phrase across the spec folder finds nothing.

### KTO-T-5 — Amend spec #5 `toc-kpi-progress` documents — PASS (attempt 1, review skip-eligible)

- **Date:** 2026-10-16 · **User decision (relayed by the user's orchestrator session):** T-5 approved even though #5 is already executed and pushed (commits 154079643, 34b9f5ad6, d56e46103). Constraint: a dated, additive amendment note (2026-10-16) that does not rewrite executed content; family.md status fields and #5's execution.md stay untouched; `w3-projects-section/` is not edited (another session owns it).
- **Implementer:** `akili-implementer` (sonnet, effort low-medium), skill `cognitive-doc-design`. **Review:** skip-eligible per tasks.md (docs only). The Leader checked the report against the constraints.
- **Files:** `portfolio-overview-revamp/toc-kpi-progress/requirements.md` (appended "Amendment (2026-10-16) — target-only KPI rule (P2-3974)"), `toc-kpi-progress/design.md` (matching note), `portfolio-overview-revamp/family.md` (one change-log row; status columns unchanged).
- **Falsifier:** the grep still hits `design.md:115`, the executed original kept as written, and the amendment's own quotes, which supersede those sentences explicitly. This is expected for an additive note. The backward sweep finds no other section that restates the old rule.
- **Finding (follow-up owed):** the shipped #5 query does NOT filter by target. `AoWBilateralRepository.getPortfolioTocCoverage` (`onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts:1322-1390`) joins `toc_results_indicators` only on `is_active = 1` (L1342-1343), and its docstring at L1315 says "No year or target filter on indicators". Portfolio Overview's "Progress against ToC KPIs" totals still include no-target KPIs → **a separate server change is owed** (not made here).
- **Requirements covered:** KTO-R-9; KTO-DD-6.

### KTO-T-8 — Overview Areas of Work KPI card: dash when no KPI has a target (Amendment A-2) — PASS (attempt 1)

- **Date:** 2026-10-16 · **User decision (relayed by the user's orchestrator session):** do NOT send the drafted question to Angel. Show `—` and `No KPIs with a target` on the card when `totalPlanned === 0`, and keep `· N AoWs`. Recorded as Amendment A-2 (KTO-R-11, S-11.1) and task KTO-T-8.
- **Implementer:** `akili-implementer` (sonnet, effort medium), skills `angular-developer`, `tdd` · **Reviewer:** `akili-reviewer` (opus), checklist mode
- **Files:** `components/program-overview/program-overview.component.html` (`@if (aowStats().totalPlanned > 0)` / `@else` on the headline and sub-line, with the same dash span as ~L455); `program-overview.oah-hero.spec.ts` (2 tests); `program-overview/CLAUDE.md` (stale "old unfiltered rule" note corrected; `Verified:` re-stamped). No `.ts` change: `aowStats` already sums the Counted total after T-2.
- **Verification:** red 1 failed / 283 passed (empty case received `…Plan 0% completed0/0 KPIs·5 AoWs`) → green 4 suites, 284 / 284 (`--testPathPattern="program-overview"`, maxWorkers=2). ESLint clean on the spec. Free RAM was borderline (3.9 GiB).
- **Reviewer verdict:** PASS — "it meets KTO-R-11 / S-11.1 … same class, token, aria-label and glyph" as the L455 dash, and the non-empty case is unchanged.
- **Requirements covered:** KTO-R-11 (S-11.1).

### KTO-T-6 re-check (after T-7 / T-8) — Leader, Claude in Chrome, 2026-10-16

Read-only on the local stack: only navigation, filter and Clear clicks, no write button. **Served bundle = disk:** `restoreTargetFilter` / `reportingTargetFilter` exist on `app-dashboard-lab`, and `aowStats` is on `app-program-overview`. Screenshot folder: `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Ptmn4l\`.

| # | Check | Result | Evidence |
|---|---|---|---|
| R-1 | SP01 Overview Areas of Work card | PASS — `2% · 7/360 KPIs · 5 AoWs`; 360 = sum of the 5 AoWs' targeted KPIs (21+111+94+61+73), 7 = reported (2+1+3+0+1) | JS read of `aowStats` |
| R-2 | No-targeted-KPI Program (SP05 *Better Diets and Nutrition*), Overview card | PASS — `— completed · No KPIs with a target · 6 AoWs`, aria-label present, no `0%` / `0/0` | `screenshot-1792169389993-30.jpg` (left) |
| R-3 | SP05 Reporting, all-no-target bucket | PASS — 2030 `0 KPIs with target · 2 with no target set` with ratio `—`, no `%`; Intermediate `1 KPI with target · 1 with no target set · 0 of 1 · 0%` (singular) | `screenshot-1792169389993-30.jpg` (right) |
| R-4 | `?tgt=` persistence on reload (SP01) | PASS — `?tocView=aows&tgt=without` restores `All 46`, chip `Target: KPIs with no target`, badge `1`, every ratio `—` | `screenshot-1792169465719-31.jpg` (right) |
| R-5 | Clear removes `tgt` | PASS — after *Clear filters*, URL has no `tgt` and the signal is `all` | JS read |
| R-6 | 375 px (SP01) | PASS — header 68 px, split line in its own full-width row, no horizontal scroll (scrollW 364 < 377), `All 415` | `screenshot-1792169465719-31.jpg` (left) |
| R-7 | ~1050–1280 px (SP01) | PASS — header 60 px, Target first in the in-card bar, no horizontal scroll | `screenshot-1792169465719-31.jpg`, earlier `…-1792103743355-26.jpg` |
| R-8 | Global Target filter via the UI | PASS (2026-10-16) — no target `All 46`, with target `All 369`, Clear `All 415` | `…-1792166357371-28.jpg`, `…-1792166385327-29.jpg` |

Noted, not in scope: SP05 Reporting shows "No Areas of Work…" while Overview counts 6 AoWs. AoWs with no planned indicators are not cards; this predates the spec. The SP05 Overview dash renders small and muted, which is the same span as the ~L455 pattern.

