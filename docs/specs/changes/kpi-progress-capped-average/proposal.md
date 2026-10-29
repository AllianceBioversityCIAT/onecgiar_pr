# Proposal — KPI progress as a capped average, no target aggregation

> **In one line:** the progress % on the Reporting tab and on the Overview stops being "KPIs reported ÷ KPIs with a target" and becomes the **average of each KPI's achievement (achieved ÷ target, capped at 100 %)**, flat over the KPIs. The Target sum disappears from the top of the page and the `KPI` chip is relabelled `Total # of KPIs`.

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-capped-average/` |
| Slug | `kpi-progress-capped-average` — given by the user's command (`changes/` prefix) |
| Type | Change |
| Approval Mode | gated |
| Source | Nicoleta Trifa's red annotations on Angel Jarrin's email *"RE: Resync PRMS with ToC for BDN"* (ticket PDF `Alliance IT Support BDN.pdf`, screenshots shared by the user on 2026-10-19) |
| Requester decision | User, 2026-10-19: *"Hagamos lo que Nicoleta pide y ya"* |
| Date | 2026-10-19 |
| Branch | `qa-development-2026-ss` |
| Depends on | none (builds on archived `changes/kpi-progress-target-only` and `changes/reporting-dynamic-kpi-target-counts`) |
| Parallel-safe | no (touches the shared `reporting-burndown.ts` rule and the server roll-up) |
| Pre-existing draft | Uncommitted edits in the working tree, made before this spec existed (see §11). They are adopted as T-1 and go through the Reviewer like any other task. |

## 2. Intent

Show Science Program leads a progress figure that measures **how far the KPIs got against their targets**, not how many were touched. Do it without adding targets with different units (%, USD, hectares, people) into a meaningless sum.

## 3. Problem / Current Behavior

| # | Today (`qa-development-2026-ss`) | What Nicoleta asked |
|---|---|---|
| 1 | Quick chip reads `KPI (213)` (`reporting-quick-typology.util.ts:12`) | `Total # of KPIs` |
| 2 | An informational `Target 259` chip sits next to it (DKT-R-4, `ef7a3c627`). Each AoW card header adds `· 57 targets` (DKT-R-2) | *"It's not a sum of targets (many values can't be aggregated: % and $). Only keep KPIs, no target aggregation at the top."* |
| 3 | `Other Output` / `Other Outcome` chips exist and the KPI count includes them (`8b3eb1f62`) | *"Include Other Output and Other Outcome."* Already done; verify only |
| 4 | AoW card bar `0 of 37 · 0%`, By-AOW banner, Overview hero ring, Overview rows and chips: `% = reported ÷ with target` (`buildRatio`, `reporting-burndown.ts`) | *"For each indicator, achievement = achieved ÷ target, capped at 100 %. Only indicators with a target. The % for an AoW or HLO is the average of those indicator %, not a count of met / not met."* Example: BDN AoW1 `(100+100+45+73+100+86+0+100+50+100+100) / 11 = 77.6 %` |
| 5 | The server roll-up (`toc-progress-rollup.ts`, P2-3296) already averages `achieved ÷ target`, but **without a cap** (*"does not cap overachievement, per Nicoleta"*, earlier ruling). AoW/Program use a **mean of the HLO means** (*"Ángel confirmed the existing formula stays"*) | Cap at 100 %, flat average over indicators |
| 6 | — | *"Apply the same logic to the Overview page."* |

**Decision history (KZ-BOR-1: never reverse an earlier rule silently):**

| Date | Who | Rule |
|---|---|---|
| P2-3296 (2026-09) | Nicoleta | Do not cap overachievement in the roll-up |
| P2-3296 | Ángel | AoW = mean of HLO means |
| 2026-10-15 | Ángel (P2-3974) | % only over KPIs with a target, as a count of reported KPIs |
| **2026-10-19** | **Nicoleta, accepted by the user** | **Capped per-KPI achievement, flat average over KPIs with a target** — supersedes the three rows above for every aggregate |

## 4. Proposed Outcome

- One rule decides every aggregate % on the Reporting tab and the Overview: `mean over KPIs with a target of min(achieved ÷ target, 1) × 100`, one decimal (`77.6 %`).
- HLO, AoW, Intermediate / 2030 buckets and the Program figure all use that flat average over their own KPIs.
- The server roll-up and the client compute the same number from the same KPIs (parity tested with Nicoleta's 77.6 % fixture on both sides).
- No target sum anywhere at the top of the page or in the AoW card header.
- The first chip reads `Total # of KPIs (213)`.

## 5. Scope

| In | Where |
|---|---|
| Capped average in the client rule | `dashboard-lab/reporting-burndown.ts` (`buildRatio.percent`, `summarisePartition`) |
| Every surface that computes its own `done / total` % | `reporting-aow-table` (card bar), `buildAowBannerStats` (By-AOW banner), `program-overview` (`aowStats.pct`, `richStats.pct` + ring, `percentOfRich`), `dashboard-lab` (`overviewAowProgress`, `overviewXcutProgress`, `overviewAowProgressRich` rows and their sort) |
| Capped, flat roll-up on the server | `results-toc-results/repositories/toc-progress-rollup.ts` (`ratio`, `rollUpChildren`) and its spec |
| Remove target aggregation | Target pill in `reporting-quick-typology-filters`, its `targetSum` inputs through `reporting-program-band` and `dashboard-lab`, the `headerTargets` sum in `reporting-aow-table` |
| Chip label | `QUICK_TYPOLOGIES[0]` → `Total # of KPIs` (short label `KPIs`) |
| Copy that states the old rule | ⓘ / `%` tooltips (KTO-R-5) and disclosure titles that say "reported ÷ with target" |
| Verify only | Other Output / Other Outcome are counted in `Total # of KPIs` |

## 6. Non-Goals

- The per-KPI row's own `Progress` column keeps its raw value (`150%` / *Overachieved*). The cap applies only inside averages.
- Which KPIs count stays as it is (`hasTarget`: target finite and > 0, KTO-R-1). No-target KPIs stay visible and stay out of the %.
- No change to counts (`Total # of KPIs`, `N with target · M with no target set`), filters (KTO-R-7, KTO-R-10), or Only-pending / Next-pending logic.
- The `N of M` reported count may stay as secondary text. It is no longer the % (decided in `/akili-specify`).
- Portfolio-level surfaces outside the Science Program shell (`getPortfolioTocCoverage`, follow-up F-1 of `kpi-progress-target-only`) are not touched.
- No change to the bilateral / platform-report payload contracts.
- Deploying to production. That goes through the normal flow (qa-dev → PRTest → staging → master), and the master promotion belongs to Cristian.

## 7. Affected Users, Systems, And Specs

| Affected | How |
|---|---|
| Science Program leads, PMU | Every aggregate % changes value (it usually goes up, because partial achievement now counts) |
| `GET` AoW / Science Program ToC progress endpoints | `progress_*` values change; the shape does not |
| Archived spec `changes/kpi-progress-target-only` | KTO-R-2's "ratio = reported ÷ with target" is superseded for the % (the denominator rule stays) |
| Archived spec `changes/reporting-dynamic-kpi-target-counts` | DKT-R-2 (header target sum) and DKT-R-4 (Target chip) are removed; DKT-R-3's label changes |
| P2-3296 roll-up (`toc-progress-rollup.ts`) | The "no cap" and "mean of HLO means" rulings are reversed |
| Folder guides | `dashboard-lab/CLAUDE.md`, `reporting-aow-table/CLAUDE.md`, `program-overview/CLAUDE.md` state the old rule |

## 8. Visual Reference

- Source: screenshots in Nicoleta's annotated email (the user shared them in the session on 2026-10-19).
- Location: ticket PDF `C:\Users\santiagosanchez\Downloads\Alliance IT Support BDN.pdf` (local, not in repo).
- Notes: no new layout. The bar, chip and ring stay where they are; only their value, label and one pill change. No mockup needed.

## 9. Requirement Delta Preview

### ADDED Requirements

- Per-KPI capped achievement `min(achieved ÷ target, 1) × 100`, for KPIs with a target only.
- Aggregate % = flat mean of that value over the group's KPIs with a target, rounded to one decimal, identical on client and server (fixture: Nicoleta's 77.6 %).
- Multi-group aggregates (Program ring, `aowStats`) = `Σ progress ÷ Σ KPIs with a target`, never a mean of rounded group %.

### MODIFIED Requirements

- KTO-R-2: the denominator is still KPIs with a target. The numerator is the sum of capped achievement, no longer the count of reported KPIs.
- P2-3296 AC3/AC4: AoW and Program are a flat average over leaf indicators, capped.
- DKT-R-3: the chip label changes from `KPI` to `Total # of KPIs`.
- Overview rows sort by the new %.

### REMOVED Requirements

- DKT-R-4: the informational `Target` chip.
- DKT-R-2: the `· N targets` sum in the AoW card header.

## 10. Approach Options

| Option | What | Pro | Con |
|---|---|---|---|
| A. Client only | Change `buildRatio` and the Overview; leave the server roll-up | Smallest diff | The server's HLO/AoW `ACHIEVED %` figures keep the uncapped mean of means and disagree with the bar beside them |
| **B. Same rule on both sides (recommended)** | Cap and flatten in `toc-progress-rollup.ts`; mirror the rule in `reporting-burndown.ts`; one shared fixture proves parity | Every number on the page agrees; small and local on each side | The rule lives in two places (server, client), held together by parity tests |
| C. Client reads the server roll-up everywhere | Drop the client computation; render the server `progress_*` | One home for the rule | Client-side filters (Type, Category, Centers, Target) would no longer move the %; the roll-up loads asynchronously; large refactor |

## 11. Recommended Approach

**Option B.** It's the smallest path where no two numbers on one screen contradict each other, and it keeps the filters live (the client keeps computing over the filtered KPI set).

**Pre-existing draft adopted as T-1.** These edits were made before the spec existed and have not been reviewed:

| File | State |
|---|---|
| `onecgiar-pr-server/.../toc-progress-rollup.ts` | `ratio()` capped at 1; `rollUpChildren` weighted by `indicators_counted` (= flat leaf mean) |
| `onecgiar-pr-server/.../toc-progress-rollup.spec.ts` | "no cap" case inverted, 77.6 % fixture added, flat-vs-leaf parity case, AoW figures recomputed (63.8 % / 7 %). Scoped Jest: 4 suites, 235 / 235 green |
| `onecgiar-pr-client/.../reporting-burndown.ts` | `kpiProgressOf`, `roundProgress`, `averageProgress`; `buildRatio` returns `percent` (capped average) + `progressSum`; `summarisePartition.percent`. **Not yet tested; consumers not yet updated** |

`/akili-specify` decides whether to keep, amend or revert this draft. The Reviewer audits it against the approved requirements, not against this proposal.

## 12. Risks, Dependencies, And Open Questions

| # | Item | Proposed handling |
|---|---|---|
| R-1 | **Her example averages 11 indicators; AoW01 has 37 with a target.** Her own rule ("only indicators with a target") means all 37, with unreported ones at 0 %. If she meant "only reported ones", the % is inflated | User decision 2026-10-19: all indicators with a target. Confirm against her Excel on PRTest before staging |
| R-2 | Overview shows both the client % and the server `achievement` figure. After this change they use the same formula but can differ in basis (QA / Prel. / Achieved) and filter scope, so they read as two near-identical numbers | `/akili-specify` decides: keep both labelled, or drop one |
| R-3 | Any Jest spec that asserts integer `done/total` percents will go red (`dashboard-lab.kcr-reconciliation`, `reporting-aow-table`, `program-overview`, `reporting-burndown`, hub/banner specs) | Update expected values from the new rule; scoped runs only, `--maxWorkers=2` |
| R-4 | Layout: one-decimal % (`77.6%`) is wider than `78%` in the bar, ring and chips (KZ-OAH-1: jsdom measures no layout; `KZ-changes--kpi-progress-target-only-1`: breakpoint pairing) | Browser check at 1366 / 1280 / 375 px |
| R-5 | Client lint needs `ESLINT_USE_FLAT_CONFIG=false` (`KZ-changes--reporting-dynamic-kpi-target-counts-1`) | Use it in every lint step |
| R-6 | Nicoleta asked to "apply and push to production" | Out of scope. PRTest smoke, then the normal promotion; master is Cristian's |
| OQ-1 | Keep `N of M reported` as secondary text in the card bar and Overview rows? | Default: keep it, as a count beside the % |
| OQ-2 | The `%` / ⓘ copy (KTO-R-5) needs a new sentence | Proposed: *"Average achievement of the KPIs with a target (achieved ÷ target, capped at 100 %)."* |

## 13. Success Criteria

- With Nicoleta's 11 values as fixture, the server and the client both return `77.6 %`.
- On SP05 (BDN) 2026 in PRTest, each AoW bar % equals the average of its KPIs' capped achievement computed by hand from the table. The result matches her Excel, or the difference is explained.
- No `Target` chip and no `· N targets` in any AoW header. The first chip reads `Total # of KPIs (213)` with no filters.
- The Overview hero ring, rows and chips show the same % as the Reporting card for the same AoW.
- Scoped Jest green on every touched suite. ESLint clean on touched `.ts`.

## 14. Next Step

```text
/akili-specify changes/kpi-progress-capped-average
```
