# Archive Summary — Guard Against Removing All ToC-Planned Contributing CGIAR Centers

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/toc-center-guard` |
| Archive Date | 2026-08-29 |
| Final Status | Shipped (committed, not yet PR'd) |
| Branch | `qa-development-2026-ss` |

## 2. Final Status

All 3 tasks (`TOC-C-T-1`, `TOC-C-T-2`, `TOC-C-T-3`) are `[x]` and Reviewer-PASSed. Code committed (`64d072490` fix, `6f44a53af` re-stamp, `94459d42a` DoD checkboxes). No `test-report.md`/`validation-report.md` file was generated separately — evidence lives inline in `execution.md` (Jest 81/81, `ng lint` clean, Reviewer PASS on each task, two same-day Pivot corrections both re-reviewed).

## 3. Requirements Delivered

- `TOC-C-R-1` (revised via `TOC-C-DD-5`) — floor on ≥1 ToC-origin Center in `contributing_center` alone.
- `TOC-C-R-2` — unguarded when no ToC-planned Centers / not ToC-mapped.
- `TOC-C-R-3` — allow delete down to exactly one, no alert.
- `TOC-C-R-4` (revised via `TOC-C-DD-4`) — sentinel chip always deletable.
- `TOC-C-R-5` — guard applies identically in flat/unmapped and split CP2026 UI.
- `TOC-C-R-6` (new) — `deleteOtherCenter` never blocked by this guard.

## 4. Files Changed Summary

- `onecgiar-pr-client/.../rd-contributors-and-partners.component.ts` — `getRealCenterCount()`, `hasTocPlannedCenter`, `blockIfLastCenter()`; wired into `deleteContributingCenter`/`deleteOtherCenter`.
- `onecgiar-pr-client/.../rd-contributors-and-partners.component.spec.ts` — `TOC-C-AC-1..8` coverage.
- `onecgiar-pr-client/.../rd-contributors-and-partners/CLAUDE.md` — dated entries for `TOC-C-DD-1..5`; `Verified:` line re-stamped with `64d072490`.

## 5. Test Evidence Summary

- `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` → 81/81 passed (final, post `TOC-C-T-3`).
- `npx ng lint --quiet` → clean, all three tasks.
- Reviewer PASS on `TOC-C-T-1` (attempt 2, after one rework on a mutation-survivable test), `TOC-C-T-2`, `TOC-C-T-3`.

## 6. Validation Summary

No standalone `/akili-validate` pass was run; validation-equivalent evidence is the per-task Reviewer PASS verdicts in `execution.md`, accepted as sufficient for this Lite-depth spec.

## 7. Accepted Warnings Or Follow-Ups

- `rd-contributors-and-partners/CLAUDE.md` now ~231 lines against a 120-line cap (`onecgiar-pr-client/docs/COMPONENT-DOCS.md`) — flagged as a pre-existing condition, not caused by this diff; recorded as a follow-up, not blocking.
- Remaining rollout items from `tasks.md` §6 (PR open, CI green, manual QA on staging) are outstanding — code is committed to the spec branch but not yet in a PR.

## 8. Historical Notes

Two same-day Pivot corrections after initial PASS: `TOC-C-DD-4` (sentinel chip always deletable) and `TOC-C-DD-5` (floor scoped to ToC-origin count only, dropping the combined-count formula). Both cross-cut into the twin `changes/toc-science-program-guard` spec (`TOC-SP-DD-3`, `TOC-SP-DD-4`), implemented and reviewed in the same passes. No auto-commit was performed at any point per standing project instruction; all commits required and received explicit user go-ahead.
