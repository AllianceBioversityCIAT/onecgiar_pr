# Kaizen Retrospective: `changes--partner-role-separator`

| Attribute | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/partner-role-separator/` (archived 2026-08-27) |
| **Branch Context** | `qa-development-2026` (spec branch — pending items await default-branch apply) |
| **Run Classification** | Clean run (0 FAILs, PASS attempt 1, budget met) |

## Metrics
| Metric | Target | Actual |
|---|---|---|
| Tasks / LOC / review rounds | 2 / ~90 / 1 | 2 / ~110 / 1 (+2 quick polish commits outside budget, user-driven) |
| Reviewer FAILs / HALTs / Pivots | 0 | 0 |

## Noted, not a lesson
- Checking the "sibling" components before speccing turned requested scope (4 components) into actual scope (1) — the proposal's code-verification step paid for itself.
- Reserving icon slots (opacity swap) instead of conditional icons prevents selection-dependent layout shift — reusable micro-pattern.

## Pending Items
| # | Kind | Target | Severity | Content | Status |
|---|---|---|---|---|---|
| 1 | standardization | follow-up proposal (not a guide edit) | medium | Partner role pills: `role="button"` + `tabindex` + keydown (ARIA-valid pressed state; keyboard operability) — Reviewer advisory, applies to all 4 partner selectors. | pending |
