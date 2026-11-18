# Archive Summary — Centers block status tiles

**Outcome:** shipped. The Portfolio Overview Centers block tiles now sum to the block total. Base tiles are 1, 5, 6 and 7; tiles 2, 3 and 4 appear only when their count is above 0. Code is in `master` (`61750729af`).

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/centers-block-status-tiles/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Final status | **Complete**: CBT-T-1 and CBT-T-2 `[x]`, each with Reviewer PASS; user confirmed 2026-11-05 |

## Requirements delivered

| Requirement | Status |
|---|---|
| CBT-R-1..R-5: count by status id, tile set and order, Draft/unknown → Editing | Delivered (CBT-T-1) |
| CBT-R-6: guide line in `portfolio-overview/CLAUDE.md` | Delivered (CBT-T-2) |

## Files changed

`centers-block.aggregate.ts`, `centers-block.component.ts` (~45 LOC), their specs (22 new or widened assertions), and `portfolio-overview/CLAUDE.md` (one guide line).

## Test evidence

| Check | Result |
|---|---|
| Scoped Jest + lint | green (execution.md) |
| Local visual check (2026-11-05) | 606 = 606, 6 donut slices, desktop and 390 px (`evidence/`) |
| **PRTest re-check (2026-11-13, Claude in Chrome, read-only)** | Reporting 2026: 428 + 1 + 155 + 41 + 13 + 1 = **639 = block total**. 6 tiles in spec order (Quality Assessed hidden at 0), 6 donut slices, single column at 390 px with no overflow (`scrollWidth = clientWidth`) |

## Validation summary

No `/akili-validate` run (Lite bugfix). Reviewer PASS per task, user confirmation, and two visual checks on two environments.

## Accepted warnings / follow-ups

- Advisories (not blockers): the `indexOf` cast in `statusTotals`, the `statusRow` comment, and a donut-fade test for an extra tile.

## Diagrams

None.
