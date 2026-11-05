# Design — Portfolio Overview: cleanup + W3 Approved (PCA)

## 1. Summary

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/cleanup-and-approved` |
| Requirements | [`requirements.md`](./requirements.md) PCA-R-1..R-7 |
| Depth | Standard |
| Packages | `onecgiar-pr-client` only. No server, no migration, no new HTTP |
| Date | 2026-11-04 |

Four template removals, one service split, one aggregation change in the Centers block, copy + guide updates.

### Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 4 |
| LOC (incl. specs) | ~220 (prod ~90, tests ~130) |
| Review rounds | 1 per task (2 max on T-3) |

## 1A. Premise Ledger

| # | Premise | Evidence | If false |
|---|---|---|---|
| P-1 | Deck classifies W3 by `source_name === 'W3/Bilaterals'`; Centers by `source === 'API'` per Center row | `portfolio-overview.service.ts:266,285`; `centers-block.aggregate.ts` `isW3Row` | V-1 residue (DD-4) |
| P-2 | `resolveStatusSlot` maps Pending Review (5) → `submitted`, Approved (6) → `approved`, status 2 → `in-qa` | `services/portfolio-status-slot.ts` | Split labels wrong; R-3 Scenario fails |
| P-3 | Centers path returns a result once per Center where it is lead **or contributing** (`results_center`) | server `results.controller.ts:865` API description | Dedupe still correct; gap would come from P-1 only |
| P-4 | `BilateralCenterResult.id` is the result id (same across Centers) | `bilateral-center-result.interface.ts:16` | Dedupe key wrong → must use `result_code` |
| P-5 | Segment `percent` also drives the tile bar width | `portfolio-overview.component.html:283`; `centers-block.component.html:136` | — (kept: only the text goes) |
| P-6 | `dashboard-lab/program-overview` has its **own** `bilateralApprovedPercent`; not affected | `program-overview.component.ts:796` | — |

## 2. Architecture Overview

All changes live under `pages/result-framework-reporting/pages/portfolio-overview/`:

| File | Change | Req |
|---|---|---|
| `services/portfolio-overview.service.ts` | `PortfolioKpis`: drop `w1w2SubmittedPercent`, `bilateralApprovedPercent`, `bilateralCentersCount`; replace `bilateralNewSubmitted/Editing` with a per-slot split for New and Replicated | R-1, R-3 |
| `portfolio-overview.component.html` | Remove 2 chips; W3 sub-lines render the split; status tile drops `({{percent}}%)` | R-1, R-2, R-3 |
| `components/centers-block/centers-block.aggregate.ts` | New pure `dedupeById(rows)` + status counts over a flat deduped list | R-4 |
| `components/centers-block/centers-block.component.ts/.html` | KPIs, donut, tiles read the deduped flat list; drop chip, `(N%)`, Centers reporting card; grid → single column | R-4, R-5, R-6 |
| `internationalization/portfolio-centers-block.copy.ts` | Drop `kpiBilateralChip`, `kpiCentersReporting`, `kpiReportingHint`; new subtitle | R-4..R-6 |
| `internationalization/portfolio-overview.copy.ts` | New `w3Split` labels (Submitted, Approved, Editing, Quality Assessed, Rejected, Discontinued) + separator | R-3 |
| `portfolio-overview/CLAUDE.md` | Guide sync | R-7 |

## 3–5. Data model, API, server

None. No entity, endpoint, payload or migration change.

## 6. Frontend Plan

### 6.1 W3 split (R-3)

- In `kpiTotals`, W3 rows split into New / Replicated (existing `is_replicated` rule), then each group is tallied by `resolveStatusSlot` into a `Record<slot, number>`.
- Exposed as `bilateralNewSplit` and `bilateralReplicatedSplit`: ordered arrays of `{ key, label, count }` already filtered by the visibility rule (Submitted, Approved, Editing always; other slots only if > 0), so the template only loops and joins with ` · `.
- Sum invariant: every row lands in exactly one slot (resolver has a default), so parts sum to the line count by construction; a unit test pins it anyway.
- Test ids: `kpi-bilateral-split` kept for New; new `kpi-bilateral-replicated-split`.
- W1/W2 card keeps `w1w2NewSubmitted / w1w2NewEditing` (unchanged).

### 6.2 Percent removal (R-1, R-2, R-5)

- Deck: delete both chip `<span>`s; header row keeps only the title (no flex gap leftovers — header `justify-between` with one child is fine).
- Page tiles: delete the `({{ segment.percent }}%)` span; `segment.percent` stays as bar width (P-5).
- Centers: delete chip and tile `(N%)`; `kpis().bilateralApproved` removed.

### 6.3 Centers dedupe (R-4)

- Today: per-Center `EntityOverviewRow`s are summed column-wise (`sumRows`), and KPIs flatten `w3Rows` → a result linked to N Centers counts N times.
- New: one computed `distinctRows` = flatten `globalCenters()` rows, dedupe by `id` (first wins; rows of the same result are identical in status/origin). Then:
  - `kpis()` (total, new, replicated) ← `originCounts(distinctRows)`.
  - Donut + tiles ← `buildCenterRow('all', '', byOrigin(distinctRows, origin))` filtered by status as today — i.e. **one** aggregate row instead of a column-wise sum.
- The Center global filter still narrows which Centers contribute rows before dedupe (unchanged behavior).
- `viewRows` / `centerTotals` per Center become unused for figures; remove them if nothing else reads them (`sumRows` export stays only if used elsewhere — check at execution).

### 6.4 Centers reporting card (R-6)

- Delete the 2nd card; grid `sm:grid-cols-2` → single column; remove `centersReporting` / `centersCount` from `kpis()`.

### 6.5 Design system

No new component or token. Existing `hlm-separator`, tile classes and `--pr-*` tokens. Spartan unchanged.

## 7–9. Security, performance, observability

Admin-only route unchanged. Dedupe is a single `Set` pass over ≤ a few thousand rows. No logging.

## 10. Testing Plan

| Suite | Covers |
|---|---|
| `portfolio-overview.service.spec.ts` | Split per slot for New and Replicated; status 2 not Approved; hidden zero slots; parts sum = line |
| `portfolio-overview.component.spec.ts` | No `%` in deck/tiles text; split rendered; replicated split testid |
| `centers-block.component.spec.ts` | Result in 2 Centers counts once (total, origin, tile); no chip, no `(N%)`, no `kpi-centers-reporting`; retry/partial unchanged |
| `centers-block.aggregate` (new cases, same spec or new `*.aggregate.spec.ts`) | `dedupeById` pure |

Commands: `npm run test:local -- --testPathPattern=portfolio-overview` (maxWorkers=2) then `npx jest --findRelatedTests <changed files> --maxWorkers=2` before push. Lint: `npx eslint <changed files> --quiet`.

## 11. Backwards compatibility

Removed test ids: `kpi-centers-reporting`. Removed copy keys and KPI fields are internal to this page (grep confirmed: only `dashboard-lab` has a same-named, independent field — P-6).

## 12. Design Decisions

### PCA-DD-1 — Split via the page's single status map
Use `resolveStatusSlot`, not a local id check. Rejected: keeping "Submitted = not Editing" + a separate Approved count (overlapping numbers, sums break). Fixes the old chip's status-2-as-approved error.

### PCA-DD-2 — Show Approved on both New and Replicated (OQ-1)
Replicated W3 results also go through review; 279 of 288 W3 rows are replicated, so New-only would hide most approvals.

### PCA-DD-3 — Keep `percent` as bar width only
The ask is about figures, not the graphic. Removing bars would change the tile design (out of scope).

### PCA-DD-4 — Dedupe by result id in the whole Centers block — **reversion, challenged**
Reverts the delivered rule "a shared result counts once per Center" (spec `centers-new-vs-replicated`, subtitle copy).
- **Challenge — what does removing it break?** (1) Per-Center figures: none are shown since "Progress by Center" was removed, so nothing visible depends on per-Center sums. (2) The Center global filter: still works, it filters Centers before dedupe. (3) Existing tests asserting per-Center summing: will fail and are updated in T-3 on purpose. (4) Admins who learned the old subtitle: copy changes in the same task.
- **Residue (V-1):** if deduped Centers total ≠ deck W3 total, the gap comes from P-1 (W3 rule / visibility). Verify before T-3 closes:

  ```sql
  -- V-1: open-phase W3 results, total vs those with ≥1 active Center link
  SELECT COUNT(DISTINCT r.id) AS w3_total,
         COUNT(DISTINCT CASE WHEN rc.result_id IS NOT NULL THEN r.id END) AS w3_with_center
  FROM result r
  JOIN version v ON v.id = r.version_id AND v.status = 1 AND v.app_module_id = 1  -- open Reporting phase (IPSR is module 2)
  LEFT JOIN results_center rc ON rc.result_id = r.id AND rc.is_active = 1
  WHERE r.is_active = 1 AND r.source = 'API';
  ```
  `w3_total` should match the deck W3 count; `w3_with_center` is the deduped Centers total. If they differ, the difference = W3 results with no Center (true only once PCA-DD-6 applies the deck lead-P/A rule to the Centers block) → add a one-line note under the Centers total ("N W3 results have no Center"), not a code fix to the deck.

### PCA-DD-5 — Remove the Centers reporting card entirely
Reverts a delivered KPI. **Challenge:** nothing else reads `centersReporting`; a11y not affected; the W3 card takes the row. No breakage beyond its own tests.

### PCA-DD-6 — Centers block uses the deck W3 rule (amendment 2026-11-04, Pivot Record in execution.md)
Gap analysis (version 36): Centers counted 41 W3 results with no active lead Program/Accelerator that the deck excludes (deck query INNER JOINs `results_by_inititiative` role 1 + active initiative). The user decided the Centers block follows the deck: rows without a lead P/A are dropped client-side before dedupe. Expected effect: Centers = deck − results with no Center, so the no-Center note is exact. Trade-off accepted: replicated innovations still waiting for a P/A are not shown in the Portfolio until they get one. No server change: the predicate is `!!row.submitter` (lead P/A official code). That equals the deck rule only while no lead initiative is inactive (`ci.active = 0`) and no official_code is blank — both 0 on version 36 (2026-11-04). This is an accepted risk; if it ever diverges, add an explicit `has_active_lead_pa` flag server-side.

## 13. Open Gaps

| ID | Gap | Owner |
|---|---|---|
| G-1 | V-1 needs prod data (user runs SQL) | Santiago, before T-3 PASS |
| G-2 | Layout after removals not testable in jsdom → read-only browser check at HITL | T-4 |
