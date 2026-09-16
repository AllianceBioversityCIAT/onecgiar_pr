# Tasks — Emerging results should not require "Contribution to indicator target" (Lite, Bug Mode)

## Task ECN-T-1 — Skip contribution requiredness for emerging results + regression test

- **Status:** [x] complete
- **Size:** XS (~2 LOC fix + ~20 LOC test)
- **Dependencies:** none
- **Requirements covered:** ECN-R-1, ECN-R-2 (full scenario + `BUT` clause coverage — both scenarios in `requirements.md` §5)
- **Design references:** `design.md` DD-1, DD-2
- **Skills:** `angular-developer`, `tdd`

### Scope
File: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.ts`

1. In `missingFields()` (~L774-775), wrap the existing `contribution_to_indicator_target` check with `!this.isEmerging()` so it is skipped entirely when `isEmerging()` is `true`.
2. Do not touch any other line in `missingFields()`, any other computed, or the template.

File: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/lab-report-form/lab-report-form.component.spec.ts`

3. Add a regression test in (or near) the `'ERC-T-2: explicit emerging mode'` or `'what blocks the save'` describe block:
   - **Red-before-fix / green-after case (ECN-R-1):** `setup({ emergingMode: true, emergingCategory: null, indicator: null, tocNode: null })`, pick a result level via `onResultLevelChange` (or provide a seeded `emergingCategory`) so only title/contribution remain, patch `result_name` to a non-empty title, leave `contribution_to_indicator_target` unset, then assert `missingFields()` does NOT contain `'Contribution to indicator target'` and (once every other required field is set) `canSave()` is `true`.
   - **Non-regression case (ECN-R-2):** confirm the existing tests at spec lines 333-351 (`'case B — title + contribution are the whole requirement...'` and `'a contribution of 0 counts as answered...'`) still pass unmodified — do not alter their assertions.

### Tests
- Run: `npx jest --silent --reporters=summary --testPathPattern="lab-report-form.component.spec"` (per root `CLAUDE.md` agent-lean verification convention, scoped to the touched spec per `src/CLAUDE.md` §21 "Run only the touched module's specs").
- **Pass condition:** new test green; all pre-existing tests in this spec file remain green (0 regressions).
- **Fail condition / disqualifier:** if the new test passes only because `isEmerging()` was mocked to always return `true` (or the test never actually exercises `emergingMode: true` end-to-end through `setup()`), the test is not evidence — it must exercise the real component input wiring exactly as the existing `ERC-T-2` describe block does (line 91 onward), not a stubbed signal.
- **What would make this check fail:** reverting the `missingFields()` guard, or setting `emergingMode: false` in the new test's `setup()` call — either must turn the new assertion red. Confirm this by running the new test against the pre-fix source once (red), then again after the fix (green), per Bug Mode's mandatory regression-test rule.

### Done criteria
- [x] Guard added in `missingFields()`, scoped exactly as in `design.md` DD-1 — no other line changed.
- [x] New regression test added, proven red-before-fix / green-after.
- [x] Full `lab-report-form.component.spec.ts` suite green (`npx jest --silent --reporters=summary --testPathPattern="lab-report-form.component.spec"`).
- [x] `lab-report-form/CLAUDE.md`'s "Contribution to indicator target pasó a ser OBLIGATORIO" note updated to record the emerging-mode exception (folder-doc convention, `docs/COMPONENT-DOCS.md` — re-stamp its `Verified:` line in the same commit).
- [x] No other file touched.

See `execution.md` for the full attempt-by-attempt audit trail (2 Implementer attempts, Reviewer PASS on attempt 2).
