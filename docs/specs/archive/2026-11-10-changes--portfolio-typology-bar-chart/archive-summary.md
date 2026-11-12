# Archive Summary — changes/portfolio-typology-bar-chart (INC-168045)

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/portfolio-typology-bar-chart/` |
| Archive Date | 2026-11-10 |
| Ticket | INC-168045 (Nicoleta) |
| Final Status | **Done** — 7/7 tasks `[x]`, user accepted the chart (HITL) |
| Code | `2dfb9d597` on `qa-development-2026-ss` · merged `02207a4f9` into `performance-refactor` (both pushed 2026-11-10) |

## Requirements Delivered

| ID | Delivered |
|---|---|
| TBC-R-1 | Level cards unchanged, not clickable |
| TBC-R-2 | Two bars per P/A (Submitted / Editing) stacked by type, natural order, catch-all last |
| TBC-R-3 (amended P-1) | One distinct token colour per type, Editing decal, row tooltip, legend view-only, no % |
| TBC-R-4 / R-5 | Segment click → one `setSelection` (P/A + type + bucket, keeps Project/Center/Funding, toggles off); P/A label toggles program |
| TBC-R-6 / R-7 / R-8 | No local highlight; accessible table with the same actions; no new states |
| TBC-R-9 | Per-P/A table removed |
| TBC-R-10 (P-1) | "By Center (W3/Bilateral)" tab restored, view-only, lead Center |

## Files Changed

`portfolio-overview/components/typology-block/` (aggregate, charts, click, component + specs), `portfolio-overview.component.spec.ts` (chart count), `internationalization/portfolio-overview.copy.ts`, `portfolio-overview/CLAUDE.md` (module guide). 17 files, +2,180 / −368 incl. spec docs.

## Test Evidence

No `test-report.md` / `validation-report.md` (absence accepted by the user's archive request). Per task: scoped Jest 177/177, `--findRelatedTests` 36 suites 1236/1236, `ng build` + lint green; mutation-backed falsifiers per task (execution.md).

## Validation

HITL on the local stack: round 1 → pivot P-1 (Center tab, colours, hover); round 2 accepted ("dejémosla así"). 390 px scroll and 3:1 contrast accepted as a whole, not measured item by item.

## Accepted Warnings / Follow-Ups

- PRTest smoke **PASS** (2026-11-10, read-only): chart + tabs render; SP01 · Submitted · Knowledge product (6) → filter P/A 1 · Typology 1 · Status 5 and "Show 6 results"; same click clears; row tooltip shows the full breakdown; Center tab 15 Centers, lead note, 0 actions, click writes nothing. Pending: reply to Nicoleta.
- Advisories: Center copy reuses P/A-named keys; pointer cursor on view-only segments; component docstring wording; two keyboard focus stops per P/A; `VizChartTableActionEvent` lacks `componentType`.
- Kaizen pending items P1–P4 (apply on `staging`).

## Historical Notes

- Pivot P-1 reversed OQ-3 (Center tab removal was an unconfirmed default) and DD-4 (opacity-step colours).
- Budget tripwire after T-3 (tests-heavy LOC); user continued; re-baselined at P-1.
- One provider-limit death (T-7) recovered by resume-by-message.

## Diagrams

None (no `diagrams/` folder).
