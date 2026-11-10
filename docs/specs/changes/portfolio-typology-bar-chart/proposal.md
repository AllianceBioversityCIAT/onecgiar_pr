# Proposal — Portfolio Overview: "Results by typology" as a clickable bar chart

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-typology-bar-chart` |
| Slug | `portfolio-typology-bar-chart` — derived from the ticket screenshot (the argument was an image, not a slug) |
| Type | Change |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Service-desk ticket from Nicoleta (screenshot attached to `/akili-propose`, 2026-11-10). Ticket ID **not yet recorded** — OQ-5 |
| Visual source | None (screenshot of the current block only) |
| Depends on | none |
| Parallel-safe | yes (touches only `typology-block/` + copy) |
| Date | 2026-11-10 |

## 2. Intent

Replace the "Results by typology" table on `/portfolio-overview` with a **bar chart: one bar per Program / Accelerator, split by result type, with Submitted vs Editing visible**, and let the admin **filter the page by clicking the chart** instead of only through the filter bar at the top.

Requester's words: *"This graph is not very intuitive and filtering on the graphs is not enabled, so please replace with a bar chart that lists P/As and the result typologies they've reported (distinguishing submitted vs editing). I should be able to filter on the graph."*

## 3. Problem / Current Behavior

| # | Today | Source |
|---|---|---|
| P-1 | The block shows 3 level cards (Output / Outcome / Impact with per-type counts) and a **table** per P/A with Total · Output · Outcome · Impact and a thin proportion bar | `components/typology-block/typology-block.component.html:16-102` |
| P-2 | The table groups by **level** only; the 9 result types are visible only in the cards, page-wide, never per P/A | `typology.aggregate.ts:101-147` (`group` counts `byLevel`) |
| P-3 | Status is not shown at all in this block — no Submitted vs Editing split | `typology.aggregate.ts` (no status field read) |
| P-4 | Nothing is clickable except the Program / Center tabs; this is by design ("Nothing here is a link or a button", TYV-R-8) | `typology-block.component.html:2-3` |
| P-5 | The block already **reads** the global filter (`[rows]=data.filteredRows()`), but cannot **write** to it | `portfolio-overview.component.html:337` |

Answer to Nicoleta's question ("is this possible or I always need to use the filters at the top?"): **possible today with no backend work** — the page already has one global selection (`toggleValue` / `setSelection` in the service) and the status tiles already filter the page on click (DD-7, `portfolio-overview/CLAUDE.md`). The chart wrapper `pr-viz-chart` already emits `chartClick` for mouse **and** keyboard (`pr-viz-chart.component.ts:147, 206`).

## 4. Proposed Outcome

- Horizontal bar chart, **one row per P/A** (code + short name, natural order SP01…), bars **stacked by result type** (9 types, coloured by level family so Output / Outcome / Impact still read at a glance).
- **Submitted vs Editing** per P/A shown as two bars per P/A (see Approach A).
- **Click a segment** → page filter becomes that P/A + that result type + that status bucket; **click a P/A label** → filter by that P/A only. Same global selection as the filter bar, so every other block (deck, status, results detail, export) follows and the "Show N results ↓" jump link appears.
- Legend items toggle type visibility in the chart (ECharts legend — view-only, not the page filter).
- Accessible table fallback (`requireTable`) with the same click actions from the keyboard.
- Level summary cards stay (OQ-2).

## 5. Scope

| In | Out |
|---|---|
| `typology-block` component, template, pure aggregation (`typology.aggregate.ts`) and a new pure `typology.charts.ts` option builder | Server / endpoints (none needed) |
| Copy in `internationalization/portfolio-overview.copy.ts` | Other blocks (status, Centers, ToC KPI, Projects) |
| Click → `PortfolioOverviewService` selection (existing API) | New filter dimensions |
| Specs for aggregation, chart builder, click resolver, component | Results Center deep-link changes |

## 6. Non-Goals

- No new Status / Typology semantics in the filter bar — the chart writes the **existing** `program`, `typology` (type key) and `status` (slot keys) values.
- No percentage / ranking (P/A order stays natural code order; "competition" feedback, `portfolio-overview/CLAUDE.md` → removed rankings).
- No change to the Center dimension's lead-only rule if the Center view is kept (OQ-3).

## 7. Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| PMU / platform admin (only role with `/portfolio-overview`, `CheckAdminGuard`) | New chart + click-to-filter |
| `portfolio-overview/components/typology-block/*` | Rewritten view; aggregation extended with type × status per P/A |
| `services/portfolio-filters.ts` | Read only (`matchesRow` already accepts a type name in `typology` and slot keys in `status`, lines 103-107) |
| `shared/components/pr-viz-chart` | Reused as is |
| `portfolio-overview/CLAUDE.md` | TYV-R-8 "nothing clickable" rule superseded; module guide update at archive |
| Archived spec `2026-10-15-changes--portfolio-overview-revamp--typology-view` | Behaviour superseded (R-4/R-8) |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: Only the screenshot of the current block. A Stitch / HTML mockup can be generated before `/akili-specify` if you want Nicoleta to approve the look first (recommended given 9 types × 2 statuses — see R-1).

## 9. Requirement Delta Preview

### ADDED
- Bar chart per P/A with result-type segments and a Submitted / Editing split.
- Click on a segment sets the page filter to P/A + type + status bucket; click on a P/A label sets P/A only; a second click on the same target clears it (toggle, like the status tiles).
- Keyboard-reachable table fallback with the same actions.

### MODIFIED
- "Results by typology" block: table → chart. TYV-R-8 ("read-only block") becomes "the chart writes to the global filter".
- Breakdown granularity: level → result type (level kept as colour family).

### REMOVED
- The per-P/A Total / Output / Outcome / Impact table and its thin bars (replaced by the chart; the accessible table keeps the numbers).
- Possibly the "By Center (W3/Bilateral)" tab — OQ-3.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Two stacked bars per P/A (Submitted, Editing), segments = type** | ECharts horizontal bar, 2 stacks, 9 type series each | Exactly what was asked; one click = P/A + type + status; reuses `pr-viz-chart` | ~26 bars for 13 P/As → tall chart (~600 px); 9 colours |
| B. One bar per P/A stacked by type, Submitted / Editing as a segmented toggle above | Same builder, status via a switch | Compact, simple colours | Submitted vs Editing never side by side — weaker fit to the ask |
| C. One bar per P/A, two segments (Submitted / Editing); click a P/A → drill into its types | Smallest chart | Hides typology at first glance — fails "lists P/As and the result typologies" |

## 11. Recommended Approach

**A**, built as: pure `typology.aggregate.ts` extension (P/A × type × bucket counts) + pure `typology.charts.ts` (EChartsOption + table model, same pattern as `portfolio-overview.charts.ts`) + one click resolver mapping `{ program, type, bucket }` → `setSelection`. Smallest safe path: no server work, no new filter dimension, reuses the accessible chart wrapper and the existing selection API. Colours from result-level tokens with type shades inside each family (no new hard-coded colours; Spartan / tokens per `docs/ux-ui/design.md` §7).

## 12. Risks, Dependencies, And Open Questions

| ID | Item | Recommendation |
|---|---|---|
| OQ-1 | **What counts as "Submitted"?** The page has 6 status slots (Editing, Quality Assessed, Submitted, Approved, Rejected, Discontinued — `portfolio-status-slot.ts:25-32`). The W1/W2 KPI card uses Editing = `status_id 1`, everything else = Submitted | Same rule as the KPI card (Editing vs everything else), so totals reconcile with the deck; click on "Submitted" sets status = all non-Editing slots |
| OQ-2 | Keep the Output / Outcome / Impact cards above the chart? | Keep (they were not criticised; the screenshot shows the table area) |
| OQ-3 | Keep the "By Center (W3/Bilateral)" tab? Ask names only P/As | Drop it from this block; Center figures live in the Centers block |
| OQ-4 | Click on the chart narrows the chart itself (it reads `filteredRows()`) — after one click only that P/A remains | Accept (cross-filter, same as status tiles); active segment highlighted + "Clear" in the existing strip |
| OQ-5 | Ticket ID / Jira link for traceability and commit `[ticket]` | Provide it |
| R-1 | 9 types × 2 statuses can be noisy | Level-family shades + legend toggles; mockup first if Nicoleta should sign off the look |
| R-2 | Rules in `portfolio-overview/CLAUDE.md` assert "typology block is read-only"; page specs (`portfolio-overview.component.spec.ts`) reference "Results by typology" | Update spec assertions + module guide in the same change (memory: run related specs before commit) |
| R-3 | `typology.aggregate.ts` carries its own W3 string test (T-1 advisory) | Use `fundingOf` if the Center view survives; otherwise it disappears with the tab |

## 13. Success Criteria

- An admin sees, per P/A, how many results of each type are Submitted and Editing, without reading a table.
- One click on the chart filters the whole page; the filter bar chips and the results detail reflect it; a second click clears it.
- Chart counts per P/A equal the filtered results detail count for the same selection.
- Keyboard users can perform the same filter actions (table fallback).

## 14. Next Step

```text
/akili-specify changes/portfolio-typology-bar-chart
```
