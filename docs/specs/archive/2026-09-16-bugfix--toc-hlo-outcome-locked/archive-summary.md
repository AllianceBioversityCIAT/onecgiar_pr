# Archive Summary — ToC HLO/Outcome Selector Must Stay Editable

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bugfix/toc-hlo-outcome-locked` |
| Slug | `toc-hlo-outcome-locked` |
| Author | Santiago Sanchez Correa |
| Archive Date | 2026-09-16 |
| Final Status | Completed (PASS, Committed & Pushed) |
| Related Commit | `53b4e13c6` |

## 2. Original Spec Path

`docs/specs/bugfix/toc-hlo-outcome-locked`

## 3. Archive Date

2026-09-16

## 4. Final Status

**Completed.** Reverted P2-3235 ToC alignment lock on Level, HLO, Outcome, and Output selects. Removed `tocAlignmentReadOnly()` computed property and dead condition. Added behavioral regression tests in Jest verifying selectors remain editable on planned/2026 results. Committed in `53b4e13c6`.

## 5. Requirements Delivered

- `BUG-R-1`, `BUG-AC-1`: Level, HLO, Outcome, and Output selectors in `multiple-wps-content` remain editable when a result has existing ToC level/result IDs.
- `BUG-R-2`, `BUG-AC-2`: Non-editable view state (`editable=false`) and read-only roles continue to disable the fields appropriately.

## 6. Files Changed Summary

- `onecgiar-pr-client/.../multiple-wps-content/multiple-wps-content.component.html` — Removed `tocAlignmentReadOnly()` from `[editable]`, `[readOnly]`, and `[disabled]` bindings.
- `onecgiar-pr-client/.../multiple-wps-content/multiple-wps-content.component.ts` — Deleted `tocAlignmentReadOnly()` and helper comments.
- `onecgiar-pr-client/.../multiple-wps-content/cpmultiple-wps-content.component.spec.ts` — Added regression tests for editable state and read-only role enforcement.
- `onecgiar-pr-client/.../rd-contributors-and-partners/CLAUDE.md` — Updated folder guide with verified stamp.

## 7. Test Evidence Summary

- `multiple-wps-content.component.spec.ts`: 85/85 passed.
- Broader `multiple-wps` directory: 168/168 passed across 10 suites.
- `npx ng lint --quiet`: Clean (0 errors).
- TDD red-then-green proof verified.

## 8. Validation Summary

- Reviewer PASS on attempt 2 (after folder `CLAUDE.md` update).

## 9. Accepted Warnings Or Follow-Ups

- PO override explicitly acknowledged: allows changing ToC alignment even when results have prior linkage.

## 10. Historical Notes

- Reversion of earlier P2-3235 restriction at product owner request.
