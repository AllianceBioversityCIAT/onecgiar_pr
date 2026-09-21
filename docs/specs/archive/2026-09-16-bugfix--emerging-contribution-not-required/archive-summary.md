# Archive Summary — Emerging Results Should Not Require "Contribution to indicator target"

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/bugfix/emerging-contribution-not-required` |
| Slug | `emerging-contribution-not-required` |
| Archive Date | 2026-09-16 |
| Final Status | Completed (PASS, Committed & Pushed) |
| Related Commit | `1244f0e4d` |

## 2. Original Spec Path

`docs/specs/bugfix/emerging-contribution-not-required`

## 3. Archive Date

2026-09-16

## 4. Final Status

**Completed.** Reviewer PASS achieved on attempt 2 (after formatting folder doc to satisfy 120-line hard cap). Tested with red-then-green proof in Jest, lint clean, and committed in `1244f0e4d`.

## 5. Requirements Delivered

- `ECN-R-1`: When `isEmerging()` is true, `contribution_to_indicator_target` is not required for saving the result.
- `ECN-R-2`: Non-emerging results still require contribution to indicator target as before (no regression).

## 6. Files Changed Summary

- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts` — Added `!this.isEmerging()` check around `contribution_to_indicator_target` in `missingFields()`.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts` — Added behavioral regression test verifying emerging result is never blocked by empty target contribution.
- `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/CLAUDE.md` — Documented the emerging-mode exception and updated verified line.

## 7. Test Evidence Summary

- `npx jest --silent --reporters=summary --testPathPattern="lab-report-form.component.spec"`: 93/93 tests passing.
- Red-then-green proof verified: failed when `contribution_to_indicator_target` was required in emerging mode; passed once guarded.

## 8. Validation Summary

- Reviewer confirmed spec conformance on code, tests, and folder documentation.

## 9. Accepted Warnings Or Follow-Ups

- None.

## 10. Historical Notes

- Attempt 1 had a documentation cap failure (`lab-report-form/CLAUDE.md` exceeded 120 lines). Attempt 2 condensed prose to respect the 120-line limit per `COMPONENT-DOCS.md` §4.
