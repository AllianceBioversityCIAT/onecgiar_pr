# Proposal — KPI row status counts (Editing vs Submitted per KPI)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/result-framework-reporting/kpi-row-status-counts/` |
| Slug | `kpi-row-status-counts` — derived from free-text argument (INC-167164 point 1) |
| Type | Change |
| Approval Mode | gated |
| Ticket | INC-167164 (Karen Marshall, ILRI — SAAF / SP03), point 1 |
| Depends on | none |
| Parallel-safe | yes (touches only the reporting-page KPI payload + dashboard-lab rows) |
| Date | 2026-11-03 |
| Status | Approved 2026-11-03. **Recommended Approach superseded** by design KRC-DD-1 (separate read-only aggregate; Option A rejected after discovery). Success criterion "no additional HTTP requests" relaxed to "one request per program + version" (KRC-R-5.2) |

## Intent

On the Science Program reporting page, let a submitter see **on each KPI row** how many results are still in **Editing** and how many are already **submitted**, so they can spot unfinished work without opening every KPI.

## Problem / Current Behavior

- The KPI list rows show only the achieved value (`Achieved X of Y`) — `dashboard-lab.component.html:288, 603, 684, 2077, 2103`.
- That figure deliberately **ignores Editing results**: `getIndicatorContributions()` filters `r.status_id IN (2, 3, 6)` (`aow-bilateral.repository.ts:1012`, per Nicoleta 1-Sep-2026: "Editing is a draft and does not count until submitted").
- Consequence: a KPI with a draft result looks **identical** to a KPI with nothing reported (Achieved 0). This is exactly Karen's case.
- Per-status counts exist only at **AoW level** (`resultsCount.editing/submitted`, `dashboard-lab.component.html:338-350`) or **inside the drawer** after opening a KPI ("See all N in detail" + `statusSplit`, `indicator-drawer.component.ts:572`).

## Proposed Outcome

Each KPI row shows a compact status chip, e.g. `1 editing · 2 submitted`, when the KPI has at least one linked result. Rows with no results show nothing new. The progress/achieved figures **do not change**: drafts are counted, never summed.

## Scope

- Server: add per-status **result counts** (additive fields) to the per-indicator contribution payload consumed by the reporting page.
- Client: render the chip on the KPI rows in every dashboard-lab layout that lists KPIs (card, table, compact list).
- Tooltip/aria text explaining what is counted.
- Unit tests for the new aggregation and the chip rendering.

## Non-Goals

- Changing `actual_achieved_value_sum`, `preliminary_*`, `achieved_*` or any progress %, which keep their current meaning.
- Making Editing results count towards achievement.
- Point 2 of the ticket (the drawer's existing-results block visibility): see OQ-3.
- AoW-level counters, landing page cards, admin views.
- A "has drafts" filter (possible follow-up, OQ-2).

## Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Result submitters (SP/AoW reporters) | Primary beneficiaries |
| `onecgiar-pr-server/.../aow-bilateral.repository.ts` `getIndicatorContributions()` | Add counts; widen status filter to include Editing **only for the count columns** |
| Other consumers of `getIndicatorContributions` | `results.service.ts:1721`, `results-framework-reporting.service.ts:123`, `fetchAndGroupTocResults` (`:415`): must stay numerically unchanged |
| `dashboard-lab.component.html/.ts` | KPI row rendering |
| Related archived specs | `archive/2026-09-04-changes--indicator-reported-results` (drawer reported-results table, status pills IRR-R-2.1), `bugfix/achieved-counts-submitted`, P2-3296 |

## Visual Reference

- Source: None
- Location: —
- Notes: Small inline chip reusing the existing status pill tokens (`--pr-status-*` fg/bg pairs, as in IRR-R-2.1) and the AoW Editing/Submitted dot style. A mockup can be generated before `/akili-specify` if wanted.

## Requirement Delta Preview

### ADDED Requirements

- Each KPI row with ≥1 linked result shows the count of its results in Editing and in submitted states, for the same phase/year window the row already uses.
- The counts are distinct results (a result linked twice to the same KPI counts once).
- Server payload exposes the counts as new optional fields per indicator (e.g. `results_editing_count`, `results_submitted_count`).

### MODIFIED Requirements

- `getIndicatorContributions()` WHERE clause lets status 1 through **for counting only**. Every value-sum `CASE` continues to exclude it, so no on-screen number moves.

### REMOVED Requirements

- None.

## Approach Options

| # | Option | Pros | Cons |
|---|---|---|---|
| A | **Server: add `COUNT(DISTINCT CASE WHEN status… THEN r.id END)` columns to the existing `act` subquery** and map them through | One query, no extra roundtrip; same join/date/type filters as the achieved figures, so the counts cannot drift from them; follows the P2-3296 "conditional aggregation, one pass" pattern | Touches a shared query used by 3 consumers; requires widening `status_id IN (2,3,6)` → `(1,2,3,6)` and proving the sums are unchanged |
| B | Client: call `GET_ExistingResultsContributors` per KPI (the drawer's endpoint) | No server change | N+1 requests (dozens of KPIs per AoW); slow; violates the one-payload model |
| C | New dedicated endpoint returning counts per indicator for an AoW/program | Isolated from the shared query | Second query duplicating the join/filters, which can drift (the exact rot P2-3296 warned about); extra roundtrip |

## Recommended Approach

**Option A.** It is the smallest safe path. The counts live in the same pass and under the same filters as the numbers already on the row, so a KPI can never show "2 submitted" while its achieved figure disagrees. Widening the status filter is safe because every existing `SUM(CASE…)` already selects its own statuses; status-1 rows add 0 to them. The `tgt` LEFT JOIN keeps the map size, and therefore `plannedKpis`, unchanged.

## Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | **Shared query**: the widened filter must not change any sum or `contributions.size` for the 3 consumers. Mitigation: regression test asserting identical sums with a status-1 row present. |
| R-2 | Rows joined through `result_indicators_targets` (`rit`) require `contributing_indicator IS NOT NULL`. A draft with no value entered yet still joins through `rtri`, but this must be verified so such drafts are counted. Verify against real data (prdb) before design. |
| R-3 | Several KPI row layouts in `dashboard-lab.component.html` (≥5 places), so the chip must be one shared fragment, not copy-pasted. |
| OQ-1 | **Which statuses, and grouped how?** Proposed: `Editing` = 1; `Submitted` = 2, 3, 6 (Quality Assessed / Submitted / Approved). Show Pending Review (5) / Rejected (7)? Confirm with Nicoleta. |
| OQ-2 | Add a quick filter "KPIs with results in Editing"? Proposed as a follow-up, not in this spec. |
| OQ-3 | Fold in ticket point 2 (make the drawer's "N results already reported" block more prominent / add an Open link per result)? Proposed: separate quick/Lite change so this one stays bounded. |

## Success Criteria

- A KPI with one Editing result shows `1 editing` on its row. Karen's SLICK KP case (SP03, HLO 1.1) reproduces this on PRTest.
- All achieved/progress figures on the page are byte-identical before and after (regression test + PRTest spot check).
- No additional HTTP requests on the reporting page.

## Next Step

```text
/akili-specify result-framework-reporting/kpi-row-status-counts
```
