# Archive Summary — Stop ToC-reference "not found" notes when unmapped

## 1. Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/toc-unmapped-orange-notes/` |
| Archive date | 2026-08-29 |
| Final status | **PASS — shipped** (2/2 tasks, committed `6687adbf1` + `860667baa`) |
| Branch | qa-development-2026-ss (spec branch — see Constitution Sync below) |

## 2. Requirements Delivered

`TOC-R-1`, `TOC-R-2`, `TOC-R-3` delivered and verified via `TOC-AC-1`, `TOC-AC-2`, `TOC-AC-3`. Both Centers/Science Program (Result Detail) and External Partners (shared `normal-selector`, covers IPSR) now correctly suppress the "not found" note only when a result is genuinely unmapped (`planned_result === false`), while preserving the note for the Yes+empty-refs case.

## 3. Files Changed Summary (from `execution.md`)

- `rd-contributors-and-partners.component.html` — Centers gate (~L100) and Science gate (~L302) restructured so unmapped results fall through to the flat full-catalog branch without hiding the whole Science section; L163/168's "Other(s)" auto-activation gate extended with a negotiated combined guard (`isCP2026() && (showOtherCenters || (!hasReferenceCenters() && planned_result !== false) || (otherCentersSelected?.length ?? 0) > 0)`) to avoid a duplicate-labeled Centers control when the sibling `lead-center-full-catalog` spec's auto-add feature is active.
- `rd-contributors-and-partners.component.spec.ts` — `TOC-T-1`'s test cases (options-binding equality assertions, exactly-one-control assertions).
- `normal-selector.component.html` — External Partners gate (~L33, kept the pre-existing `?.` optional-chaining form) and its "Other(s)" auto-activation block (~L134) both extended with the same unmapped guard.
- `normal-selector.component.spec.ts` — new file, `TOC-T-2`'s test cases.

## 4. Test Evidence Summary

63/63 (`rd-contributors-and-partners.component.spec`) and 23/23 (`normal-selector.component.spec`) Jest tests passing at final state; `npx ng lint --quiet` clean on both files. Red-before-green confirmed for both tasks. No `test-report.md` produced; evidence lives in `execution.md`'s per-attempt Verification blocks.

## 5. Validation Summary

No `validation-report.md`. Rollout checklist (`tasks.md` §6 — PR, CI, manual QA on test env, IPSR spot-check) not yet run at time of archive; captured as an open follow-up below.

## 6. Accepted Warnings / Follow-Ups

- Manual QA on test env (2026-phase result answered No/Yes, IPSR spot-check) still open — `tasks.md` §6, not yet executed.
- Partners saved as "Other" while mapped Yes, then switched to No, keep a hidden count with no visible chip/removal path — pre-existing state, flagged for the manual QA pass, not a code defect (non-gating).
- Both Centers controls share the identical label in the escape-hatch state (unmapped + `otherCentersSelected` populated) — accepted cosmetic cost, non-gating.

## 7. Historical Notes

- `TOC-T-1` required 3 attempts (2 Reviewer FAILs), exceeding `design.md`'s stated 1-round budget — escalated to the user per the Budget Tripwire; user chose to pause for cross-session coordination with the concurrent `bugfix/lead-center-full-catalog` spec (both touch `rd-contributors-and-partners.component.html`) before resuming and passing on attempt 3.
- The cross-session negotiation (combined L163/168 guard) is the shared history between this spec and `lead-center-full-catalog`'s archive — see that spec's archive-summary §6 for the other side.
- Captured as Kaizen lesson `KZ-bugfix--toc-unmapped-orange-notes-1` (design consequence-analysis gap for shared-state conditional gates).
