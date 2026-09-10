# Archive Summary — Guard Against Removing All ToC-Planned Contributing Science Programs

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/toc-science-program-guard` |
| Archive Date | 2026-08-31 |
| Final Status | Shipped (committed, not yet PR'd) |
| Branch | `qa-development-2026-ss` |

## 2. Final Status

All 3 tasks (`TOC-SP-T-1`, `TOC-SP-T-2`, `TOC-SP-T-3`) are `[x]` and Reviewer-PASSed. Code committed (`7bee37dec` original guard, `64d072490` corrections fix, `6f44a53af` re-stamp, `94459d42a` DoD checkboxes). No `test-report.md`/`validation-report.md` file was generated separately — evidence lives inline in `execution.md` (Jest 81/81, `ng lint` clean, Reviewer PASS on each task, two same-day Pivot corrections both re-reviewed).

## 3. Requirements Delivered

- `TOC-SP-R-1` (revised via `TOC-SP-DD-4`) — floor on ≥1 ToC-origin Science Program in `scienceSelected` alone.
- `TOC-SP-R-2` — unguarded when no ToC-planned Science Programs / not ToC-mapped.
- `TOC-SP-R-3` — allow delete down to exactly one, no alert.
- `TOC-SP-R-4` (new via `TOC-SP-DD-4`) — `deleteOtherScience` never blocked by this guard.

## 4. Files Changed Summary

- `onecgiar-pr-client/.../rd-contributors-and-partners.component.ts` — `getRealScienceCount()`, `hasTocPlannedScience`, `blockIfLastScience()`; wired into `deleteScience`/`deleteOtherScience`.
- `onecgiar-pr-client/.../rd-contributors-and-partners.component.spec.ts` — `TOC-SP-AC-1..6` coverage.
- `onecgiar-pr-client/.../rd-contributors-and-partners/CLAUDE.md` — dated entries for `TOC-SP-DD-1..4`; `Verified:` line re-stamped with `64d072490`.

## 5. Test Evidence Summary

- `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners.component.spec"` → 81/81 passed (final, post `TOC-SP-T-3`).
- `npx ng lint --quiet` → clean, all three tasks.
- Reviewer PASS on `TOC-SP-T-1` (attempt 1), `TOC-SP-T-2`, `TOC-SP-T-3`.

## 6. Validation Summary

No standalone `/akili-validate` pass was run; validation-equivalent evidence is the per-task Reviewer PASS verdicts in `execution.md`, accepted as sufficient for this Lite-depth spec.

## 7. Accepted Warnings Or Follow-Ups

- `requirements.md` §7 NFR (i18n) states the alert string "MUST go through `src/app/internationalization/`" but the shipped implementation uses a plain hardcoded string, matching sibling notes in the same file per `design.md` §6.3 — Reviewer ADVISORY #1, recorded as an accepted spec-doc conflict (later artifact wins), not fixed retroactively in `requirements.md`.
- Dropdown-untick bypass path (`app-pr-multi-select` two-way `ngModel`) does not go through `blockIfLastScience` — consistent with `TOC-SP-DD-1`'s explicit scope (delete handlers only), flagged as a candidate follow-up spec, not blocking.
- `rd-contributors-and-partners/CLAUDE.md` length against the 120-line cap in `COMPONENT-DOCS.md` — pre-existing overrun before this spec's additions, not caused by this diff; recorded as a follow-up, not blocking.
- "Reappears in Contributing CGIAR Centers" report from `proposal.md` §11 remains unaddressed — no code-level coupling found between the two field's arrays; to be filed as a separate `bugfix/` proposal only if reproduced with concrete steps.
- Remaining rollout items from `tasks.md` §6 (PR open, CI green, manual QA on staging) are outstanding — code is committed to the spec branch but not yet in a PR.

## 8. Historical Notes

Two same-day Pivot corrections after initial PASS: `TOC-SP-DD-3` (sentinel chip always deletable) and `TOC-SP-DD-4` (floor scoped to ToC-origin count only, dropping the combined-count formula). Both cross-cut from the twin `changes/toc-center-guard` spec (`TOC-C-DD-4`, `TOC-C-DD-5`), implemented and reviewed in the same passes. No auto-commit was performed at any point per standing project instruction; all commits required and received explicit user go-ahead.
