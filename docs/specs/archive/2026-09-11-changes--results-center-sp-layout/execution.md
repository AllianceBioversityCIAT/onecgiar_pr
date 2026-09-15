# Execution: Results Center SP-style layout

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/changes/results-center-sp-layout` |
| **Status** | executed (HITL deferred) |
| **Date** | 2026-09-11 |

---

## Delivered

| Task area | Outcome |
|---|---|
| Viewport | `pr-viewport-page` + `#workArea` scroll ≥900px |
| Hero | PLATFORM · RESULTS CENTER band, info popover |
| Toolbar | Unified filter row + Columns + Export |
| Footer | RC removed from footer allow-list |
| Tests | `results-list.viewport.spec.ts`, extended list/filters/footer specs |

## Verification

Scoped Jest on `results-list`, `results-list-filters`, `footer`, `results-list.viewport` — green in session.

## HITL

Manual check at ≥900px / <900px — owner QA.
