# Proposal — KPI progress counts only KPIs with a target (P2-3974)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-target-only/` |
| Slug | `kpi-progress-target-only` — derived from free-text argument (P2-3974 + decisions taken in the analysis conversation) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-15 |
| Source | Jira [P2-3974](https://cgiarmel.atlassian.net/browse/P2-3974) (Angel Jarrin, Enhancement, epic P2-3094 "Reporting Tool: Q4 2026 Strategic Enhancements"), 10 ACs |
| Module | Client: `result-framework-reporting` › `dashboard-lab` (Reporting tab + Overview tab of the Science Program shell) and `results` › `results-center-reporting-guide`. Server: none in this spec (spec #5 amendment carries its own server change) |
| Depends on | none to build. **Blocked before `/akili-execute` by OQ-1** (stakeholder sign-off) |
| Parallel-safe | no — shares `reporting-burndown.ts` / `dashboard-lab.component.ts` with every Reporting-tab spec |
| PRD | `US-P1` (PMU tracks progress) |

## 2. Intent

A Program's KPI progress % should measure the work it was actually asked to report on: **only KPIs with a target** enter the ratio. KPIs without a target stay visible and are counted out loud, never hidden.

## 3. Problem / Current Behavior

| Today | Where |
|---|---|
| Every planned KPI is in the denominator and numerator, target or not. `applyZeroTargetRule` is a no-op that returns all rows and `zeroTarget: 0` | `dashboard-lab/reporting-burndown.ts:80` (since `56fe6e3c5`, 2026-09-09) |
| Example AoW: 54 KPIs, 50 with target, 4 without, 10 reported → `10 of 54 · 19%` | AoW header, `reporting-aow-table.component.html:~440` |
| Two different "no target" predicates coexist: `isZeroTarget` = `target = 0 AND achieved = 0` (burndown) vs `hasUsableTarget` = `target > 0` (Progress cell) | `reporting-burndown.ts:59`, `reporting-aow-table.component.ts:1145` |
| A no-target KPI with results shows **"Overachieved"**, not "No target set", in the Progress column | `reporting-aow-table.component.ts:1151` |
| The Progress-cell tooltip already claims *"It is excluded from the averages above"* — false for the KPI ratio today | `reporting-aow-table.component.html:180, 1093` |
| `buildRatio` is the single home of the ratio rule (KCR-DD-1); 9 surfaces read it | see §7 |

**History (why this flips twice):** `bugfix/kpi-count-reconciliation` (KCR-R-2, 2026-09-03) excluded zero-target KPIs on every surface with a disclosure `title`. On 2026-09-09 Nicoleta Trifa wrote *"why would you remove indicators without target? Even if target = 0 … people will still report against that indicator (it will show as overachieved, but it is fine)"*, and `56fe6e3c5` reverted the exclusion without a spec. P2-3974 asks for the exclusion back, with a stricter predicate and visible disclosure.

## 4. Proposed Outcome

Same AoW, after:

```
AOW01  Seed systems ⓘ   54 KPIs     ▓▓▓▓░░░░░░  10 of 50   20%
       50 KPIs with target · 4 with no target set
```

- `KPI has a target` ⇔ `Number(target_value_sum) > 0` — one predicate for every surface, identical to the Progress column. "Overachieved" rows **are** no-target KPIs.
- Ratio = KPIs with target and `achieved > 0` ÷ KPIs with target. If none has a target → `—` instead of ratio and %.
- The rule moves **every** surface that reads `buildRatio` / `summarisePartition`, so Overview and Reporting never disagree.

## 5. Scope

| # | In scope | Ticket AC |
|---|---|---|
| S1 | One `hasTarget` predicate in `reporting-burndown.ts`; `applyZeroTargetRule` / `buildRatio` / `summarisePartition` / `pendingOf` / `sortRemainingFirst` use it; `isZeroTarget` removed | AC-1, AC-8 |
| S2 | All `buildRatio` consumers follow (§7 table), including the program-level Intermediate / 2030 rows | AC-1, AC-9 |
| S3 | AoW / bucket header: split line `N KPIs with target · N with no target set` only when N(no target) > 0; `N KPIs` keeps the total; `—` when no KPI has a target | AC-2, AC-3, AC-4, AC-10 |
| S4 | ⓘ panel + % tooltip state the rule; Progress-cell tooltip copy becomes true; disclosure `title`s on other surfaces re-enabled with the new wording | AC-5 |
| S5 | In-card **Target** filter axis: `All (54) | With target (50) | No target set (4)`, default `All`, combines with Centers and Types | AC-6, AC-7 |
| S6 | Update the specs `56fe6e3c5` rewrote (burndown, kcr-reconciliation, hub, oah-rows, toc-map, scope, summary-stats, oah-hero, aow-table) + new cases | — |
| S7 | Amendment to sibling spec `changes/portfolio-overview-revamp/toc-kpi-progress` (#5): its KPI total also excludes indicators without a target (see §10 Option-independent item A-1) | user decision |

## 6. Non-Goals

- No server or payload change for the Program shell — `target_value_sum` already arrives per row.
- Not touching ToC achievement averages (`progress_percentage`, HLO achievement block, `entity-aow` / `entity-details` "Indicators with no target set are excluded") — a different metric that already excludes them.
- Not hiding no-target KPIs anywhere: rows, counts and the Report action stay.
- The Target filter does **not** move the header ratio (same contract as the Centers / Types filters today).
- No change to how a target is stored or to the Report flow (P2-3668 keeps contributions for no-target indicators).

## 7. Affected Users, Systems, And Specs

| Surface | File | Effect |
|---|---|---|
| AoW + Intermediate / 2030 header | `reporting-aow-table.component.ts:1189` | ratio, split line, ⓘ, Target filter |
| By-AOW banner | `dashboard-lab.component.ts:5364` | ratio |
| Overview hero rows, KPI card 4, tab badge | `dashboard-lab.component.ts:1896, 1961` | ratio + disclosure |
| Program-level chips | `dashboard-lab.component.ts:1932` | ratio |
| Hub / band totals | `dashboard-lab.component.ts:2830` (`summarisePartition`) | totals |
| ToC map node labels | `dashboard-lab.toc-map.ts:146` | ratio |
| Where-to-report modal | `where-to-report-modal.component.ts:146` | ratio |
| **Results list › Center reporting guide** (other module) | `results-center-reporting-guide.component.ts:202` | ratio |
| Only-pending / Next pending | `pendingOf`, `sortRemainingFirst` | no-target KPIs leave the pending queue |

Users: Science Program submitters, PMU, Center focal points (guide). Specs touched: `bugfix/kpi-count-reconciliation` (KCR-R-2 restored with a new predicate), `changes/mass-reporting-flow` (MRF-R-7 predicate), `changes/portfolio-overview-revamp/toc-kpi-progress` (amendment). Guides to sync at archive: `dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md` (the 🛑 "no toques ratioOf" note and the zero-target paragraph).

## 8. Visual Reference

- Source: Jira P2-3974 attachments (3 screenshots: `image-20261015-203433.png`, `image-20261015-203630.png`, `image-20261015-203654.png`) — AoW row with the split line, ⓘ panel, Target filter bar.
- Location: Jira attachments 31787 / 31789 / 31788.
- Notes: UI uses existing row chrome and the existing in-card Centers / Types filter pattern (Spartan / Tailwind tokens per `docs/ux-ui/design.md` §7); no new mockup needed.

## 9. Requirement Delta Preview

### ADDED
- Split line under the AoW / bucket name when some KPIs lack a target.
- Target axis in the in-card filter bar, with counts, default `All`.
- `—` instead of ratio and % when no KPI in the group has a target.
- ⓘ panel sentence: the percentage uses only KPIs with a target defined.

### MODIFIED
- Ratio numerator and denominator: only KPIs with `target > 0` (was: every planned KPI). Restores KCR-R-2's exclusion, with predicate `target ≤ 0 or empty` regardless of achieved (KCR / MRF used `target = 0 AND achieved = 0`).
- Disclosure `title`s on hero rows, chips, hub, band (KCR-R-2.1) come back, worded "excludes N KPIs with no target set".
- Only-pending: no-target KPIs are not pending.
- Spec #5 TKP-R-1: total ToC KPIs = distinct active indicators **with a target**.

### REMOVED
- `isZeroTarget` (`target = 0 AND achieved = 0`) and the dead `zeroTarget: 0` constant.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — change the shared rule once** (recommended) | Rewrite `applyZeroTargetRule` with `hasTarget`; every consumer follows; add split line, ⓘ, Target filter in the table | One number per AoW across Overview, Reporting, ToC map and Center guide; honours KCR-DD-1; the disclosure plumbing (`zeroTarget`, `title`s) already exists | Moves numbers on 9 surfaces; ~9 spec files to update |
| B — local to the Reporting row | New ratio only in `reporting-aow-table` | Smallest diff | Overview says 19 %, Reporting says 20 % for the same AoW — breaks KCR; rejected by the user |
| C — show both % (all / with target) | Two figures per row | No product decision needed | Adds noise; Nicoleta already flagged "12 of 16 vs 74 KPIs" confusion |

**A-1 (independent of the option): spec #5 amendment.** Add a target predicate to TKP-R-1 / design §"No year / target filter" (today explicitly *no* target filter, citing the reverted KCR rule). Coverage stays a different metric (pooled result in QA/Submitted, distinct indicator), so numbers align on *which KPIs count*, not on the final %. The exact target join is pinned in that spec's design (reuse the "has a target" predicate `program-progress` uses for `indicators_counted`). Recorded in #5's change log, approved there, executed with #5.

## 11. Recommended Approach

Option A + A-1. Smallest path that keeps one number per KPI set across the shell, and the infrastructure to disclose exclusions is still in place (`zeroTarget` field, `ratioTitle`, KCR-R-2.1 titles) — the change re-arms it with a stricter predicate rather than building new plumbing. Estimated Standard depth, ~4–5 tasks, client-only.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Status |
|---|---|---|
| **OQ-1 (blocking execute)** | Nicoleta Trifa's 2026-09-09 email asked to keep no-target KPIs in progress ("overachieved … is fine"). P2-3974 reverses that and also drops "Overachieved" rows from the %. Her sign-off must be recorded on P2-3974 before `/akili-execute` | open — owner: Angel |
| OQ-2 | Ticket "How to test" counts only rows labelled *No target set*; with the decided rule, rows labelled *Overachieved* also count. Ask Angel to fix the test step (or label both) | decided (Overachieved = no target); ticket text to update |
| OQ-3 | Split line base = `ratioBase` (cross-cut Intermediate Outcomes excluded), so `with + without` can be < the `N KPIs` total on some AoWs. Specify decides: line sums to the ratio base (recommended, it explains the ratio) | recommended default |
| R-1 | KPI that had a reported value and no target drops out of the numerator → some % go down, not up | expected; message in release note |
| R-2 | Results-module Center guide changes too — Center focal points see new numbers | in scope by decision |
| R-3 | Shared target across centers (P2-3255, MAX not SUM): a row's `target_value_sum` is the shared target; the Centers filter does not change the predicate | verify in specify |
| R-4 | Third reversal risk if stakeholders disagree again (memory: `project_no_target_kpi_denominator_conflict`) | mitigated by OQ-1 |
| Test discipline | Jest scoped with `--testPathPattern`, `--maxWorkers=2`, one run at a time | — |

## 13. Success Criteria

- Example AoW reads `10 of 50 · 20%` with `50 KPIs with target · 4 with no target set`, and the count of *No target set* + *Overachieved* rows equals 4.
- The same AoW shows the same ratio on Overview hero, By-AOW banner, ToC map and Reporting header.
- An AoW where every KPI has a target looks exactly as today.
- An AoW with no targeted KPI shows `—`.
- Target filter: `No target set` lists only those rows and combines with Centers / Types; header ratio does not move.
- Intermediate / 2030 rows behave the same.

## 14. Next Step

After approval (and before execute, OQ-1 recorded):

```text
/akili-specify changes/kpi-progress-target-only
```
