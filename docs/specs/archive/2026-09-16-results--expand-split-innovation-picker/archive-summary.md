# Archive Summary — Expand Split/Merge Innovation Picker Eligibility & Search

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `docs/specs/results/expand-split-innovation-picker` |
| Slug | `expand-split-innovation-picker` |
| Author | Santiago Sanchez (PRMS) |
| Archive Date | 2026-09-16 |
| Final Status | Completed (PASS, Committed & Pushed) |
| Related Commit | `b18c365c3` |

## 2. Original Spec Path

`docs/specs/results/expand-split-innovation-picker`

## 3. Archive Date

2026-09-16

## 4. Final Status

**Completed.** All tasks `SIP-T-1` through `SIP-T-7` implemented, reviewed, tested, and committed in `b18c365c3`. Broadened backend merge/split candidate query, added opt-in server search mode to `pr-multi-select`, wired `rd-annual-updating` with selection-preserving merge, added regression tests and styling correction mirroring the linked-result picker.

## 5. Requirements Delivered

- `SIP-R-1` to `SIP-R-3`: Broadened merge/split-target eligibility query in `result.repository.ts` allowing `Editing` and `Submitted` active innovation development results (removing the strict QA'd/Approved status requirement).
- `SIP-R-4`: Removed "quality-assessed" wording from UI copy and Swagger documentation.
- `SIP-R-5`, `SIP-R-6`, `SIP-R-10`: Added opt-in server-search mode to `pr-multi-select` with debounce.
- `SIP-AC-1` to `SIP-AC-5`: Repository regression test suite, Jest unit tests for `rd-annual-updating`, and Cypress CT coverage.
- `SIP-T-7`: Opt-in visual styling variant matching linked-result picker visual language.

## 6. Files Changed Summary

- `onecgiar-pr-server/src/api/results/result.repository.ts` — Query broadened, constant deleted, JSDoc updated.
- `onecgiar-pr-server/src/api/results/results.controller.ts` — Swagger updated.
- `onecgiar-pr-server/src/api/results/result.repository.merge-split-targets.spec.ts` & `result.repository.spec.ts` — Repository regression tests.
- `onecgiar-pr-client/src/app/custom-fields/pr-multi-select/*` — Server search mode, opt-in visual styling variant, Cypress CT tests, folder CLAUDE.md.
- `onecgiar-pr-client/.../rd-annual-updating/*` — Debounced search wiring, selection-preserving merge, unit test suite with 7 new regression cases.

## 7. Test Evidence Summary

- `result.repository.merge-split-targets.spec.ts`: 17/17 tests passing.
- `rd-annual-updating`: 90/90 Jest tests passing.
- `pr-multi-select`: Jest and Cypress CT tests passing.
- Lint clean across touched files.

## 8. Validation Summary

- Reviewer PASS on all tasks.
- Manual browser verification performed by user on localhost:4500.

## 9. Accepted Warnings Or Follow-Ups

- Search feel on large datasets spot-checked and accepted as non-blocking.
- Pre-existing unrelated Cypress CT failures flagged as separate backlog items.

## 10. Historical Notes

- Post-review pivot added `SIP-T-7` to provide the opt-in visual styling variant without affecting the ~78 unwired call sites of `pr-multi-select`.
