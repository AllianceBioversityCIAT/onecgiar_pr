# Archive Summary — Science Program chips in the replicated-result project picker (`PSC`)

> **Delivered.** 1/1 task PASS on the first attempt. Validation: PASS with 3 WARN and 0 FAIL. Shipped in `d6be984c1` on `qa-development-2026-ss`. Not yet on `performance-refactor` / PRTest.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `PSC` — project-picker-sp-chips |
| Depth / Approval | Lite / gated |
| Owner | Santiago Sanchez |
| Archived by | Claude Opus 5.5 |

## 2. Original Spec Path

`docs/specs/bilateral/project-picker-sp-chips/`

## 3. Archive Date

2026-10-26 → `docs/specs/archive/2026-10-26-bilateral--project-picker-sp-chips/`

## 4. Final Status

| Gate | Result |
|---|---|
| Tasks | PSC-T-1 `[x]` |
| Reviewer | PASS (attempt 1) |
| Manual layout check | PASS (CIP result 8406) |
| Validation | PASS with 3 WARN, 0 FAIL |
| Budget | Tasks 1/1 and review rounds 1/1 as planned. LOC 290 vs ~150; the user accepted the overrun |

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| PSC-R-1 | Chip row only in the inline picker of replicated results; deduped, counted, sorted by code |
| PSC-R-2 | Stored primary chip pre-selected, matched by normalized code (never by id, P2-3807). Selection kept across reopen; re-seeds when a new primary is saved |
| PSC-R-3 | OR across chips, AND with search; nothing staged on toggle |
| PSC-R-4 | *Clear* + empty state "No projects for the selected programs" / *Clear filters* |
| PSC-R-5 | Native buttons, `aria-pressed`, group label, no propagation |
| PSC-NFR-1..4 | No request, no server diff, wraps without horizontal scroll, Spartan + existing tokens |

## 6. Files Changed Summary

| File | Change |
|---|---|
| `bilateral-project-selector.component.ts` | +65/−6: `programChips`, `showProgramChips`, `defaultProgramCode`, `selectedProgramCodes` (`linkedSignal`), `toggleProgram`, `clearPrograms`, gated `filteredProjects` |
| `bilateral-project-selector.component.html` | +30/−1: chip group, Clear, empty-state branch |
| `bilateral-project-selector.component.scss` | +9: `.bps-chips` |
| `bilateral-project-selector.component.spec.ts` | +186: 16 PSC cases |

All under `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-project-selector/`. No server change.

## 7. Test Evidence Summary

- **Selector spec:** 27/27. The red run before the implementation was 10 failed.
- **`--findRelatedTests` run:** 23 suites / 974 tests green; the Section 0 and creator specs were not edited.
- **ESLint:** clean, run with `ESLINT_USE_FLAT_CONFIG=false`.
- **Manual check (result 8406):** chips wrap, the default chip is on, OR filter works, the selection survives reopen, Clear works, the empty state shows, and a chip click keeps the dropdown open.
- **No `/akili-test`:** there is no `test-report.md`, which is accepted for Lite depth.

## 8. Validation Summary

`validation-report.md`: every clause is covered. Design conformance is exact. One cross-document figure was fixed (execution.md said 13 chips; the real count is 12).

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| WARN-1 tests not re-run at validation (RAM 0.76 GB) | Accepted: code identical to the verified run |
| WARN-2 S-3.2 fixture cannot catch a missing chip predicate | Kaizen "noted"; strengthen when the spec file is next touched |
| WARN-3 S-3.4 cannot prove `stopPropagation` (overlay is a sibling) | Covered by the manual check |
| Advisory: `spShortName` null fallback; subtle selected-chip contrast | Follow-up only if users report it |
| PRTest | Fast-forward `performance-refactor` from qa-dev to deploy |

## 10. Historical Notes

- Origin: reporters re-pointing replicated 2026 results drifted to another Science Program by picking a project unmapped to the previous one. The chip guides the choice without blocking it.
- The default follows the **current stored** primary (OQ-4), not a reconstructed 2025 value.
- Follows the archived PAA family (`bilateral/replicated-innovations-2026-pa`).
