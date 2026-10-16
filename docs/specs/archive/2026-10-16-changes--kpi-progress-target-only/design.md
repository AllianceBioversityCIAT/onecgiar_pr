# Design — KPI progress counts only KPIs with a target (P2-3974)

## 1. Summary

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/kpi-progress-target-only/` |
| Requirements | `requirements.md` (KTO-R-1 … R-9) |
| Depth | Standard |
| Status | approved (2026-10-15) |
| Shape | Re-arm the existing single-home exclusion (`applyZeroTargetRule`) with the Progress column's predicate; every consumer follows for free. Add one UI line, one filter axis, copy. Client-only |
| Budget (tripwire for `/akili-execute`) | **6 tasks · ≈ 300 LOC production + ≈ 450 LOC tests · ≤ 2 review rounds per task** |

**One sentence:** the plumbing KCR built (counted vs planned, `zeroTarget`, disclosure `title`s) is still wired end to end, only its rule was turned into a no-op on 2026-09-09; this spec turns it back on with a stricter predicate and makes the exclusion visible where the ticket asks.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| KTO-P-1 | Every shell ratio reaches `applyZeroTargetRule` through `buildRatio`, `summarisePartition` or `pendingOf`; nothing computes its own denominator | `reporting-burndown.ts:80-110, 316-331`; consumers grep | `grep buildRatio\|summarisePartition\|applyZeroTargetRule` in `src/app` (non-spec): 9 call sites, all listed in §6.2; no other `done/total` builder in those components | verified | A surface drifts; T-2 adds it to the parity test |
| KTO-P-2 | `applyZeroTargetRule` is a no-op today (`counted = all`, `zeroTarget: 0`) | `reporting-burndown.ts:80-82` | Body read: returns `{ counted: [...inds], zeroTarget: 0 }` | verified | Nothing to re-arm; design unchanged but T-1 diff differs |
| KTO-P-3 | Disclosure hooks survived `56fe6e3c5`: hub `zeroTargetTitle` (`reporting-entry-hub.component.ts:263`), Overview `zeroTargetTitle` / row titles (`program-overview.component.ts:433-440`, `.html:447`), table `ratioTitle` (`reporting-aow-table.component.ts:1200`). Band `totalKpisTitle` lost its exclusion branch | `git show 56fe6e3c5` + current files | Diff read: only `reporting-summary-stats.component.ts` copy branch removed; the others read `zeroTarget` and render nothing because it is 0 | verified | T-2 rebuilds the missing title |
| KTO-P-4 | Band "Total KPIs" shows `counted` and "KPIs with evidence" shows `reported of counted` | `dashboard-lab.component.ts:2828-2838`, `reporting-summary-stats.component.html:82-114` | Read: `totalKpis: counted`; evidence `of {{ s.totalKpis }}` | verified | See KTO-DD-3 |
| KTO-P-5 | Progress column predicate = `Number(target_value_sum)` finite and > 0 | `reporting-aow-table.component.ts:1145-1149` | Read | verified | — (it is the definition we adopt) |
| KTO-P-6 | Centers / Types chip counts run over `group.indicators`; the header ratio runs over `ratioBase` and ignores the in-card filters | `reporting-aow-table.component.ts:924-950, 1049-1060, 1231-1234` | Read | verified | Target axis would need its own base; S-4.4 at risk |
| KTO-P-7 | The in-card filter bar renders only when `centers.length > 1 \|\| types.length > 1` | `reporting-aow-table.component.html:~532` | Read | verified | Target axis invisible on single-center cards (KTO-R-7 violated) |
| KTO-P-8 | Cross-cut IOs rarely reach AoW cards (P2-3336 filters `is_aow === false` upstream; the crosscut stamp is `is_aow !== true`) | `dashboard-lab.component.ts:3357`; `dashboard-lab/CLAUDE.md` "IO sin AoW" | Read both; live frequency not measured | assumed | Split line (`ratioBase`) and Target chips (`group.indicators`) can differ by the cross-cut rows; T-3 test pins which base each uses |
| KTO-P-9 | `target_value_sum` of a shared target is one value (MAX), so the predicate does not depend on the picked Center | commit `18ad4dad3` (P2-3255 "MAX, not SUM") | Commit subject read; SQL not re-read | assumed | A Center pick could flip a row's class; would need a per-center target |

## 2. Architecture Overview

### 2.1 Where this lives

```
reporting-burndown.ts  ── hasTarget(ind)  ◄── single predicate (KTO-R-1)
   ├─ applyZeroTargetRule → { counted: targeted rows, zeroTarget: excluded count }
   ├─ buildRatio          → done/total/percent over counted          (KTO-R-2)
   ├─ summarisePartition  → planned / counted / reported / zeroTarget
   ├─ pendingOf, sortRemainingFirst(zeroTargetLast), isPending        (KTO-R-8)
   │
   ├─► reporting-aow-table   ratioOf / ratioTitle / NEW split line / NEW Target axis / hasUsableTarget delegates
   ├─► dashboard-lab         overviewAowProgress, chips, rich rows, band stats, By-AOW banner
   ├─► dashboard-lab.toc-map node labels
   ├─► where-to-report-modal, results-center-reporting-guide (hub rows)
   └─► program-overview / reporting-entry-hub / reporting-summary-stats (render + titles)
```

### 2.2 Interaction

No new data flow. All surfaces are `computed` signals over rows already loaded; the rule change propagates on the next change-detection pass.

## 3. Data Model Changes

None. No entity, migration or CLARISA impact.

## 4. API Surface

None. Bilateral / platform-report unaffected.

## 5. Business Rules

| Rule | Definition | Implements |
|---|---|---|
| Has a target | target finite and > 0; achieved ignored | KTO-R-1 |
| Counted | ratio base ∩ has a target | KTO-R-2 |
| Excluded (`zeroTarget` field) | ratio base − counted | KTO-R-4, R-6 |
| Done | counted ∩ achieved > 0 | KTO-R-2 |
| Empty ratio | counted = 0 → render `—`, bar 0, sort as 0 % | KTO-R-3 |
| Pending | counted ∩ not complete | KTO-R-8 |

The field keeps the name `zeroTarget` in code (renaming touches ~15 files and every KCR spec for no behavior gain); its meaning becomes "no target set", documented on the helper. Copy says "no target set", never "zero-target".

## 6. Frontend Plan

### 6.1 Routes / modules

Unchanged: `/result-framework-reporting/.../dashboard-lab` (Overview + Reporting tabs), `/results` list (Center guide).

### 6.2 Components & services

| File | Change | Req |
|---|---|---|
| `dashboard-lab/reporting-burndown.ts` | Export `hasTarget`; `applyZeroTargetRule` filters by it and returns the excluded count; delete `isZeroTarget`; `isPending` and `sortRemainingFirst({ zeroTargetLast })` use `!hasTarget`; header docstring rewritten (no longer "every planned KPI counts") | R-1, R-2, R-8 |
| `reporting-aow-table.component.ts` | `hasUsableTarget` delegates to `hasTarget` (one predicate); `ratioOf` returns an `empty` flag when total = 0; `splitOf(group)` → `{ withTarget, without }` from `buildRatio(ratioBase)`; `ratioTitle` wording; `targetCountsOf(group)` + `localTargetFilter` signal (mirrors `localTypeFilter`); `visibleRows` adds the target clause; filter-bar visibility condition adds "has both kinds" | R-3, R-4, R-6, R-7 |
| `reporting-aow-table.component.html` | Header: split line under the name (left zone becomes two lines when present); `—` branch for empty ratio; ⓘ panel gets the rule sentence; `%` tooltip copy; filter bar gets the Target section | R-3, R-4, R-5, R-7 |
| `dashboard-lab.component.ts` | Band stats: `totalKpis` = planned, new `targetedKpis` = counted (KTO-DD-3); everything else already reads the helpers | R-2, R-6 |
| `reporting-summary-stats.component.{ts,html}` | "KPIs with evidence" reads `reported of targetedKpis`; `evidencePercentage` over `targetedKpis`; `totalKpisTitle` re-gains the exclusion branch | R-2, R-6 |
| `program-overview.component.{ts,html}` | Title copy "excludes N KPI(s) with no target set"; `—` for a row with total 0 | R-3, R-6 |
| `reporting-entry-hub.component.{ts,html}` | Same title copy; `—` for a row with total 0 (hub rows are also what Where-to-report and the Center guide render) | R-3, R-6 |
| `where-to-report-modal`, `results-center-reporting-guide` | No code change expected — they push `buildRatio` output into hub rows; covered by the hub change. Verified by T-2's grep | R-2 |
| `dashboard-lab.toc-map.ts` | No change (reads `buildRatio`); KCR-R-2.2 exemption keeps it title-less | R-2 |

### 6.3 Design system usage

- **Split line:** second line of the header's left zone, `text-[11.5px]` / `--pr-text-subtle` (same token as the `N KPIs` count), `·` separator, tabular numbers. Header grows from 52 px to the content height only on cards that show the line (`min-h-[52px]` instead of fixed `h-[52px]`); cards without the line keep 52 px exactly (S-4.2). At < 640 px the line wraps under the name; it never truncates the numbers.
- **Empty ratio:** `—` in the ratio slot with `--pr-text-muted`, `%` slot hidden, bar width 0; `aria-label` "No KPIs with a target".
- **Target axis:** third section of the existing in-card bar, `Target:` label + three chips styled exactly like the Centers / Types chips (same classes, active state, count suffix). `All` is a chip, not an absence. Chips are `button` with `aria-pressed`. At narrow widths the axis follows the bar's existing overflow behavior (overflow popover) — no new pattern. Spartan / Tailwind tokens only (memory: visual changes use Spartan; no new primitives needed since the bar already exists).
- **ⓘ panel:** one sentence appended under the existing blurb: *"The percentage is calculated using only the KPIs that have a target defined."*
- **`%` tooltip:** *"Share of KPIs with a target that have something reported against them. KPIs with no target set are not counted. This is coverage of the plan, not achievement against the targets."*

### 6.4 Real-time UX

None.

## 7. Security & Authorization

No change (presentation only).

## 8. Performance & Capacity

`targetCountsOf` / `splitOf` are O(rows) per card, same order as the existing Centers / Types counts; called from the template like them. No new requests.

## 9. Observability

None needed.

## 10. Testing Plan

| Layer | Spec file | Covers |
|---|---|---|
| Unit | `reporting-burndown.spec.ts` | S-1.1 table (`5/2`, `0/0`, `0/3`, `null/0`, `"0"`, `"12"`), S-2.1, S-2.2, S-3.1 (`total 0`), S-8.1 (`pendingOf`, `sortRemainingFirst`) |
| Parity | `dashboard-lab.kcr-reconciliation.spec.ts` | S-2.3: hero row, banner, toc-map node, table ratio and band agree for one fixture with no-target rows |
| Surfaces | `dashboard-lab.hub.spec.ts`, `.oah-rows.spec.ts`, `.toc-map.spec.ts`, `.scope.spec.ts`, `program-overview.oah-hero.spec.ts`, `reporting-summary-stats.component.spec.ts` | Restore exclusion expectations `56fe6e3c5` flipped; new copy; `—` rows |
| Component DOM | `reporting-aow-table.component.spec.ts` | S-3.1, S-4.1 – S-4.4, S-7.1, S-7.2, R-5 copy, bar visibility on single-center card |
| Browser (HITL) | — | 375 / 768 / 1280: header with line, filter bar with 3 axes, no horizontal scroll; real Program: split line = rows labelled *No target set* + *Overachieved* |

All Jest runs scoped (`--testPathPattern`) with `--maxWorkers=2`, one run at a time.

## 11. Backwards Compatibility

Numbers move on every listed surface (expected, R-1 risk in the proposal). No URL, deep link, payload or stored state changes. Rollback = revert the commit; no data to undo.

## 12. Design Decisions

### KTO-DD-1 — Re-arm the existing helper instead of a new one
- **Decision:** change `applyZeroTargetRule`'s body; keep its name and return shape.
- **Why:** 9 consumers and their disclosure `title`s already read `counted` / `zeroTarget`; changing the body moves them all at once (KCR-DD-1 single home).
- **Rejected:** a new `buildTargetedRatio` used only by the table (Option B in the proposal — two numbers per AoW).
- **Reversion challenge (Step 2.3)** — this DD reverts `56fe6e3c5`. *What does removing "count every KPI" break?*
  1. Nicoleta's 2026-09-09 request → KTO-OQ-1 execute gate.
  2. A no-target KPI with results leaves the numerator, so some % drop → accepted by the user; release note.
  3. Only-pending hides no-target rows; a submitter who wants to report on one finds it via the Target filter (KTO-R-7) or with Only-pending off → addressed.
  4. Band "Total KPIs" would shrink to the targeted count, contradicting the ticket's "count keeps the total" → **not addressed by the bare revert; fixed by KTO-DD-3**.
  5. Tests asserting all-count go red → expected, updated in T-1 / T-2.

### KTO-DD-2 — Predicate ignores achieved
- **Decision:** `hasTarget` = target > 0 only (KCR / MRF used `target = 0 AND achieved = 0`).
- **Why:** ticket AC-8 and user decision (Overachieved = no target); it is the Progress column's own rule, so labels and counts can never disagree.
- **Rejected:** keep the KCR predicate — `0/3` would stay in the denominator while its cell says it has no target.

### KTO-DD-3 — Counts show totals, ratios use the targeted set
- **Decision:** a figure that is a **count** of KPIs (`N KPIs` on cards, band "Total KPIs") shows the total; a figure that is a **ratio** (`x of N`, `%`, "KPIs with evidence x of N") uses the targeted set. Band gains `targetedKpis`.
- **Why:** ticket AC-2 for cards; applying the same rule to the band keeps "Total KPIs 54" next to card sums of 54, and "KPIs with evidence 10 of 50 · 20 %" next to the AoW's `10 of 50 · 20 %`.
- **Rejected:** KCR-DD-4's "band big figure is Counted" — it would read 50 while the cards say 54.
- **Reversion challenge:** this reverts part of KCR-R-8 (band total = Counted). Breaks: KCR parity tests asserting band total = Σ counted → updated in T-2 to Σ planned; nothing user-visible beyond the intended fix.

### KTO-DD-4 — Target filter mirrors Centers / Types, not the ratio
- **Decision:** counts over `group.indicators`; filters rows via `visibleRows`; never touches `ratioBase`.
- **Why:** same mental model as the two existing axes (KTO-P-6) and S-4.4.
- **Consequence:** under Only-pending the card's rows exclude no-target ones, so the axis reads `No target set (0)` while the split line still says 4. Accepted: the split line describes the plan, the chips describe what is listed.

### KTO-DD-5 — Keep the field name `zeroTarget`
- **Decision:** no rename in code; meaning documented.
- **Why:** rename = ~15 files + interfaces in three components for zero behavior; copy is what users read.

### KTO-DD-6 — Spec #5 amendment is documentation here
- **Decision:** T-5 edits `toc-kpi-progress/requirements.md` (TKP-R-1, glossary), `design.md` ("No year / target filter" row → target filter; TKP-DD-2 alternatives line) and appends to its change log + family manifest change log. Its SQL is designed and built by #5.
- **Why:** #5 owns its endpoint; editing its docs now prevents it from being executed against the old rule.

## 13. Open Gaps & Follow-ups

| ID | Gap | Handling |
|---|---|---|
| KTO-OQ-1 | Nicoleta sign-off | Execute gate |
| KTO-P-8 | Cross-cut rows frequency | Assumed; pinned by T-3 test; HITL check on a real Program |
| KTO-P-9 | Shared-target MAX | Assumed; HITL check with a Center pick |
| Layout | jsdom cannot measure header height or bar overflow | T-6 HITL browser check |
| Ticket text | *How to test* step (Overachieved) | Angel to amend P2-3974 |

## Required cross-references

- `docs/prd.md` `US-P1`; `docs/ux-ui/design.md` Reporting tab (RAH card-in-card); `docs/trd/trd.md` client module `result-framework-reporting`.
- Superseded: KCR-R-2 predicate, KCR-R-8 / KCR-DD-4 band total, MRF-R-7 predicate.

## Amendment A-1 (2026-10-16) — KTO-DD-7 Global Target filter rides the toolbar Type-filter pipeline

- **Decision:** add `reportingTargetFilter` (`'all' | 'with' | 'without'`, default `'all'`) next to `reportingTypeFilter` in `dashboard-lab.component.ts`. Apply it at the same point in the pipeline where the toolbar Type filter removes rows, so chips, cards, split line, ratio and in-card counts all derive from the filtered rows without new math. The predicate is `hasTarget` from `reporting-burndown.ts`.
- **UI:** a Target control in `reporting-program-band` Filters panel. Reuse the existing panel control (`app-pr-filter-multiselect` or the project's single-select equivalent; mirror what Status / Type use). Labels `All` / `KPIs with target` / `KPIs with no target`. Wire it into the panel's active-filter count and Clear action like Type / Status; persist it in the URL as `tgt`, mirroring Category `typ` (user decision 2026-10-16).
- **Why not reuse the in-card axis:** they work at two scopes, page and card, the same way Type and Types already do (user decision 2026-10-16: keep both).
- **Parity note:** the Overview tab is not filtered by the Reporting toolbar today, and this filter follows that.

- **Persistence (2026-10-16, user decision):** URL-mirrored as `tgt=with|without`, the same pattern as Category `typ`. `all` writes no param.
