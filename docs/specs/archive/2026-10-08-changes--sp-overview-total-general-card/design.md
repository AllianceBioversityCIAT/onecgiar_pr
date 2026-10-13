# Design — SP Overview "Total General" card

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/sp-overview-total-general-card/` |
| Depth | Lite |
| Approval Mode | gated (requirements approved 2026-10-08) |
| Requirements | `requirements.md` (STG-R-1..5, STG-NFR-1..4) |
| Visual source | Center card markup, `bilateral-overview.component.html` (commit `e25eeba49`, `quick/overview-total-results-mockup`) |

## 2. Executive Summary

The host (`DashboardLabComponent`) derives one small object with three numbers: **replicated**, **new**, **pending review**. It passes that object to `program-overview` as a new input. The child renders the Total General card with the center card's row/chip markup and computes its headline as replicated + new. There is no new request, no server change and no change to any other card.

## 3. Architecture Overview

| Figure | Source (already loaded) | Why this source |
|---|---|---|
| replicated | `latestVersion(selected()).replicatedResults` (`GET_ScienceProgramsProgress`, per-phase `Version`) | The server counts it over the **same rows** as `statuses`, so it reconciles with KPI 2 by construction (STG-R-2). It already honours the explicit phase selection through the overlay cache (STG-R-4). |
| new | `latestVersion(selected()).newResults` | Same as above |
| pending review | `bilateralRows()` (**unscoped**, keyed by `code::effectiveVersionId`), counting rows whose resolved status is 5 | Program-wide (STG-R-4 S-4.2) and per phase. It uses the same `resolveBilateralStatusId` rule as the W3 status card, so the figure matches its "Pending Review" segment when no scope is active. |

Rejected: counting `is_replicated` over `programResults` (proposal Option A). That list is fetched without `version_id` and capped at 2000, and it comes from a second source that can drift from the meter.

## 4. Directory Structure (touched)

```
dashboard-lab/
├── dashboard-lab.component.ts         # + overviewTotalBreakdown computed
├── dashboard-lab.component.html       # + [totalBreakdown] binding on <app-program-overview>
├── dashboard-lab.component.spec.ts    # + computed tests
└── components/program-overview/
    ├── program-overview.component.ts   # + totalBreakdown input; programResultsTotal re-pointed
    ├── program-overview.component.html # KPI 1 markup
    ├── program-overview.component.spec.ts
    └── CLAUDE.md                       # re-stamp Verified + note
```

## 5. Data Model

New client-only view type, `OverviewTotalBreakdown`, exported from `program-overview.component.ts` next to the other overview view types: `{ replicated: number; new: number; pendingReview: number }`. A missing `replicatedResults`/`newResults` on the wire coerces to `0`.

## 6. API Design

None. The payloads are unchanged (STG-NFR-1).

## 7. Backend

None.

## 8. Frontend / UX

**Host (`dashboard-lab.component.ts`):** `overviewTotalBreakdown` computed:
- version = `latestVersion(selected())`
- replicated and new = that version's fields, defaulting to `0`
- pendingReview = number of rows in `bilateralRows()` with `resolveBilateralStatusId(row) === 5`

It does **not** read `overviewScope()` (DD-2). It is bound in the template next to `[statusSegments]`.

**Child (`program-overview`):**
- input `totalBreakdown`, default `{0,0,0}`
- `programResultsTotal` becomes `replicated + new` (was `statusTotal + bilateralStatusTotal`, DD-3)

**Card markup (KPI 1), top to bottom:**

| Element | Treatment |
|---|---|
| Header row | Unchanged ("Total General" + `Program` pill) |
| Headline | Unchanged classes: `pr-figure` 32px + "results" |
| Divider + rows | Center card pattern: `mt-[12px] border-t border-white/20 pt-[10px]`, `flex flex-col gap-[6px] text-[12px]`. Each row is `flex justify-between gap-[8px]`, with label `min-w-0 truncate` and chip `shrink-0 rounded-[6px] bg-white/15 px-[6px] py-[1px] font-mono text-[11px] font-semibold tabular-nums text-white` |
| Text colour | Rows `text-purple-100` (the card's existing secondary tone, instead of the center card's `text-white/85`) to stay coherent with the purple card |
| Tooltips | `[title]` per row: "W1/W2 results carried over from a previous phase for update", "W1/W2 results created in this phase", "W3/Bilateral results tagged to this program waiting for your review (Pending Review)". The headline tooltip says "Program-wide W1/W2 results in this phase" (S-4.2) |
| Test ids | `overview-kpi-total-breakdown`, `-replicated`, `-new`, `-pending-review` |
| Skeleton | The existing `programResultsLoading()` branch. A third placeholder bar replaces the old sub-line (S-5.1) |
| Card height | `min-h-[135px]` stays. The card grows to fit three rows. Grid siblings stretch, which is accepted |

## 9. Shared Contracts

`OverviewTotalBreakdown` is the only new type, and only the host and the child import it.

## 10. Design Decisions

| ID | Decision | Covers |
|---|---|---|
| STG-DD-1 | Replicated/new come from the meter's `Version`, not from `programResults` | R-2, R-4 |
| STG-DD-2 | The card is **program-wide**: pending review reads unscoped `bilateralRows()` and the headline ignores the scope | R-4 S-4.2 |
| STG-DD-3 | The headline is redefined as replicated + new; bilateral is no longer summed | R-2, R-3 |
| STG-DD-4 | Pills are not copied from the center card (they would duplicate rows 1–2) | Proposal non-goal |
| STG-DD-5 | Reuse the center classes verbatim except text tone (`text-purple-100`) | R-5 |

### Reversion challenge (Step 2.3)

**DD-2/DD-3 revert the scoped, W1/W2 + W3 headline. Question: what does removing it break?**
- `programResultsTotal` is read only by KPI 1's template and by one spec assertion (`program-overview.component.spec.ts:885`, which expects `7` = W1/W2 7 + bilateral 0). The assertion must be updated deliberately to the new input-driven value.
- No OSF spec or test pins KPI 1 to the scope (grep of `overview-kpi-total` finds only the skeleton test, which stays valid).
- KPI 2 (W1/W2) and KPI 3 still narrow by scope. Under a scope, KPI 1 ≠ KPI 2 by design, and the headline tooltip says "program-wide".
- No concrete breakage left unaddressed.

## 11. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 3 |
| LOC (incl. tests + doc) | ~140 |
| Review rounds | 1 |
