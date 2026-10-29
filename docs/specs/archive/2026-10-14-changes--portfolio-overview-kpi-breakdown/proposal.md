# Proposal — Portfolio Overview KPI Cards: New vs Replicated Breakdown

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-kpi-breakdown/` |
| Slug | `portfolio-overview-kpi-breakdown` — derived from free-text argument ("Implementemos esto y organizamos esta sección de portfolio overview" + stakeholder screenshot) |
| Type | Change |
| Approval Mode | gated |
| Author | santiago.sanchez@cgiar.org |
| Date | 2026-10-14 |
| Module | `result-framework-reporting` › `portfolio-overview` (client only) |
| Depends on | none |
| Parallel-safe | yes |
| Parent Spec | `changes/portfolio-overview-revamp` (family #1 — runs first; `remove-rankings-status-copy` builds on it, see `family.md`) |

## 2. Intent

Rework the top row of KPI cards on the admin `/portfolio-overview` screen so each card answers the question stakeholders actually ask: **how much of each funding stream is NEW this phase versus REPLICATED from 2025, and how much of the new work is submitted versus still in Editing.** Remove the Science Programs card, which they called "irrelevant for this overview".

## 3. Problem / Current Behavior

`portfolio-overview.component.html:116-230` renders 4 cards, all fed by `PortfolioOverviewService.kpiTotals()` (`services/portfolio-overview.service.ts:200`):

| # | Card | Shows today | Stakeholder request |
|---|---|---|---|
| 1 | Total portfolio results | `2069 results` · `1790 W1/W2 · 279 W3/Bilateral` | Break the total into 4 parts: **W1/W2 new**, **W3/Bilateral new**, **W1/W2 replicated**, **W3/Bilateral replicated innovations**. Count every status. |
| 2 | W1/W2 results | `1790` · `% submitted / QA` · `Across N result categories` | **New** (split into Submitted / Editing) + **Replicated from previous years**. Replicated items can be any type, e.g. innovations or policies. |
| 3 | W3/Bilateral results | `279` · `% approved` · `Reported across N science programs` | **New** (split into Submitted / Editing) + **Innovations replicated from 2025** |
| 4 | Science programs | `13 / 13 programs` · `% portfolio progress` | **Remove** |

The screen shows no new-vs-replicated split at all today. The data needed for it is already on the wire, though:
`AllResultsByRoleUserAndInitiativeFiltered` (`onecgiar-pr-server/src/api/results/result.repository.ts:686`) already selects `r.is_replicated` (`:738`). The client simply drops the field: it is missing from the `RawResult` interface (`services/portfolio-overview.service.ts:15`). The same flag already drives the "carried over" logic in `programme-results`, so the meaning is already established in this module.

## 4. Proposed Outcome

A 3-card deck in which every number reconciles. The 4 parts of card 1 always add up to its total, and cards 2 and 3 each add up to their own headline figure.

```
┌ TOTAL PORTFOLIO RESULTS ── Reporting 2026 ┐ ┌ W1/W2 RESULTS ─────────────┐ ┌ W3/BILATERAL RESULTS ──────┐
│ 2069 results                              │ │ 1790 results               │ │ 279 results                │
│ ● W1/W2 new ................ 1500         │ │ New ............... 1400   │ │ New ............... 200    │
│ ● W3/Bilateral new ......... 200          │ │   Submitted  900 · Editing 500 │ │   Submitted 120 · Editing 80 │
│ ● W1/W2 replicated ......... 290          │ │ Replicated from previous   │ │ Innovations replicated     │
│ ● W3/Bilateral replicated .. 79           │ │ years ............. 390    │ │ from 2025 ......... 79     │
│                     Results Center →      │ │           Results Center → │ │               Bilateral →  │
└───────────────────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘
```
*(Numbers are illustrative only.)*

The click targets stay as they are: card 1 goes to Results Center (all), card 2 to Results Center (W1/W2), card 3 to Bilateral results.

## 5. Scope

- `services/portfolio-overview.service.ts`: add `is_replicated` to `RawResult`; extend `PortfolioKpis` / `kpiTotals()` with `w1w2New`, `w1w2Replicated`, `w1w2NewSubmitted`, `w1w2NewEditing`, `bilateralNew`, `bilateralReplicated`, `bilateralNewSubmitted` and `bilateralNewEditing`. Every one of these is derived from the **same** open-phase `rows()` signal. No second request.
- `portfolio-overview.component.html`: replace the subtitle line of cards 1–3 with the breakdown rows; delete card 4; change the grid from `lg:grid-cols-4` to `lg:grid-cols-3`; update the skeleton deck (`:32`) to 3 cards.
- `portfolio-overview.component.ts`: remove `scrollToMatrixSection()` if card 4 was its only caller (verify first).
- Specs: `services/portfolio-overview.service.spec.ts` (bucket math, reconciliation invariant, `is_replicated` arriving as `0/1/'1'/null`) and `portfolio-overview.component.spec.ts` (3 cards render, card 4 is gone).
- `portfolio-overview/CLAUDE.md`: update in the same change, following the touched-folder rule.

## 6. Non-Goals

- No server or SQL changes. `is_replicated` is already delivered.
- No change to which results count as W1/W2 and which as W3/Bilateral (`source_name`).
- No new drill-downs. Turning the breakdown rows into clickable filters is a separate product decision (see P2-3304 pending item).
- The status strip, category bars, matrix and CGIAR Centers block below the cards are not touched.
- No per-type breakdown of "W1/W2 replicated" (innovations vs policies…). It appears as a single count; see OQ-3.

## 7. Affected Users, Systems, And Specs

- **Users:** Admin / PMU readers of `/portfolio-overview` (the route is guarded by `CheckAdminGuard`).
- **Systems:** `onecgiar-pr-client` only.
- **Related specs:** `archive/2026-08-28-changes--portfolio-overview-echarts` (the `POV-R-*` ids on the cards); `bugfix/portfolio-overview-partial-counts` (the `fetchedCount` vs `total` rule, which stays intact); `changes/overview-replicated-new-badges` (the same new/replicated concept on the center Overview tab, whose labels and colours should be reused for consistency).

## 8. Visual Reference

- Source: stakeholder screenshot, annotated 1–4 (attached to the request), plus the ASCII layout in §4.
- Location: the current screen is `/portfolio-overview`; no Figma.
- Notes: the visual language of the existing cards is kept (hero purple gradient on card 1, neutral cards 2–3). A self-contained HTML mockup can be generated under `docs/specs/changes/portfolio-overview-kpi-breakdown/mockup/` before `/akili-specify` if wanted. It is optional.

## 9. Requirement Delta Preview

### ADDED Requirements

- Card 1 shows 4 counts that always sum to the total: W1/W2 new, W3/Bilateral new, W1/W2 replicated, W3/Bilateral replicated. Every status counts.
- Card 2 shows W1/W2 **New** split into **Submitted / Editing**, and **Replicated from previous years**.
- Card 3 shows W3/Bilateral **New** split into **Submitted / Editing**, and **Innovations replicated from 2025**.
- "Replicated" means `is_replicated` is truthy on an open-phase row. "New" means everything else.

### MODIFIED Requirements

- The KPI deck changes from 4 cards to 3. The responsive grid becomes `sm:2 / lg:3`.
- The current subtitles "Across N result categories" and "Reported across N science programs" are replaced by the breakdowns. The status chips (`% submitted / QA`, `% approved`) stay unless OQ-4 says otherwise.

### REMOVED Requirements

- Card 4, "Science programs" (`activeProgramsCount / activeProgramsCount`, `% portfolio progress`). This also removes its misleading `13 / 13` figure, where the numerator and the denominator are the same signal.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Client-only, extend `kpiTotals()`** | Read `is_replicated` from the existing payload and compute every bucket in the service | No server change; one data source, so the numbers reconcile with the rest of the page; follows the module contract ("service owns every aggregation") | Bound by the existing 20 000-row page limit (already flagged by `isPartial()`) |
| B. New server aggregate endpoint | SQL `COUNT`s grouped by source × replicated × status | Exact even when the payload is partial | Adds a backend endpoint, deploy and test surface for numbers the client already holds; could disagree with the rest of the page |
| C. Keep 4 cards, only append text | Add lines and leave card 4 | Smallest diff | Ignores request item 4; cards get crowded |

## 11. Recommended Approach

**Option A.** It is the smallest safe path. The flag is already on the wire, the service already owns every aggregation, and computing from the same `rows()` keeps card 1 reconciled with cards 2 and 3 and with the status strip below. The partial-payload caveat is not new and stays covered by the existing `isPartial()` banner.

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Proposed default |
|---|---|---|
| OQ-1 | **What counts as "Submitted"?** The request names only Submitted and Editing, but rows can also be Quality Assessed, Pending Review, Approved, Rejected or Discontinued. | Editing = `status_id 1`; Submitted = **any status other than Editing**, so Submitted + Editing = New. Alternative: show only the strict statuses and let the remainder fall into an "other" line. |
| OQ-2 | **Card 1 calls it "replicated w1/w2 *innovations*"**, while card 2 says replicated W1/W2 can include policies and other types. | Card 1 uses "W1/W2 replicated" (all types), so its 4 parts sum to the total. If only innovations should count, a 5th "other replicated" bucket is needed, otherwise the total stops reconciling. |
| OQ-3 | Should W1/W2 replicated show which types it includes (innovations, policies…)? | A single count with a type tooltip at most. No per-type rows. |
| OQ-4 | Keep the `% submitted / QA` and `% approved` chips? | Keep them. They are cheap and already tested. |
| R-1 | Does replicated W3/Bilateral contain only innovations? Card 3's label says "innovations" (per the duplication rule in memory: innovations duplicate into the new phase). | Verify against prdb before specifying (query below). If other types appear, the label becomes "Results replicated from 2025". |
| R-2 | `is_replicated` arrives as number, string or `null`. | Normalise with `Number(x) === 1`, the same way `programme-results` does, and cover it in the spec. |
| R-3 | The partial payload (> 20 000 rows) undercounts the buckets. | The existing `isPartial()` banner already covers this. No new work. |

### Decisions (2026-10-14, user)

Prod snapshot of the open phase (verification query below, run by the user):

| Source | Replicated | Types | Statuses | n |
|---|---|---|---|---|
| W1/W2 | 0 | CapSharing, Complementary innov., Innov. dev/package/use, KP, Other output, Policy change | Editing, Quality Assessed, Submitted | 199 |
| W1/W2 | 1 | Innov. development / package / use only | Editing (mostly), QA, Submitted | 1776 |
| W3/Bilaterals | 0 | Knowledge product | Editing | 1 |
| W3/Bilaterals | 1 | Innov. development / use only | Editing | 279 |

- **R-1 resolved:** the user confirmed that replicated W3/Bilateral results are only innovations for now, so card 3 keeps the label "Innovations replicated from 2025".
- **OQ-1 → default accepted:** Editing = `status_id 1`; Submitted = every other status, so Submitted + Editing = New. Real data only shows Editing / Quality Assessed / Submitted on new rows, so no ambiguous bucket appears today.
- **OQ-2 → default accepted:** card 1 uses "W1/W2 replicated" covering all types, so its 4 parts sum to the total. Today every one of those rows is an innovation, but the label must not break if the card-2 case (policies) appears later.
- **OQ-3 → default accepted:** a single count, no per-type rows.
- **OQ-4 → default accepted:** keep both chips.

Verification query for R-1 / OQ-2 (read-only):

```sql
SELECT IF(r.source = 'Result','W1/W2','W3/Bilaterals') AS source_name,
       COALESCE(r.is_replicated,0) AS is_replicated,
       rt.name AS result_type, rs.status_name, COUNT(*) AS n
FROM result r
JOIN version v ON v.id = r.version_id AND v.status = 1
JOIN result_type rt ON rt.id = r.result_type_id
JOIN result_status rs ON rs.result_status_id = r.status_id
WHERE r.is_active = 1
GROUP BY 1,2,3,4
ORDER BY 1,2,3,4;
```

## 13. Success Criteria

- The deck shows 3 cards; "Science programs" is gone at every breakpoint.
- Card 1: `w1w2New + bilateralNew + w1w2Replicated + bilateralReplicated === totalResults`. This is asserted in a spec.
- Card 2: `w1w2NewSubmitted + w1w2NewEditing + w1w2Replicated === w1w2Count`.
- Card 3: `bilateralNewSubmitted + bilateralNewEditing + bilateralReplicated === bilateralCount`.
- No extra HTTP request; the open-phase filter still applies before any counting.
- Scoped Jest (`--testPathPattern=portfolio-overview --maxWorkers=2`) passes, and lint on the touched files is clean.

## 14. Next Step

The open questions are resolved (see §12 Decisions). Approved by the user on 2026-10-14. Next:

```text
/akili-specify changes/portfolio-overview-kpi-breakdown
```
