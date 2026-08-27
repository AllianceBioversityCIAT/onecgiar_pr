# Archive Summary — "Other" Contributing Centers / Science Programs shown by default (P2-3499)

## 1. Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/bugfix/other-fields-toc-visibility/` |
| Archive Date | 2026-08-27 |
| Final Status | **PARTIAL — 2 of 5 tasks shipped, 3 never started, archived by explicit user request** |
| Owner | Current user (santiago.sanchez@cgiar.org) |

## 2. Original Spec Path

`docs/specs/bugfix/other-fields-toc-visibility/`

## 3. Archive Date

2026-08-27

## 4. Final Status

**PARTIAL.** Verified at archive time by `git status --porcelain` against every task's target files:

| Task | Status | Evidence |
|---|---|---|
| `OTV-T-1` — `rd-contributors-and-partners` | ✅ Done, Reviewer PASS (attempt 2/3) | Working-tree diff present; Jest 8 suites/133 tests green |
| `OTV-T-2` — `aow-hlo-create-modal` | ✅ Done, Reviewer PASS (attempt 1) | Working-tree diff present; Jest 1 suite/39 tests + snapshot green |
| `OTV-T-3` — `lab-report-form` | ❌ **Not started** | Zero working-tree changes on any target file |
| `OTV-T-4` — Cypress regression | ❌ **Not started** | `contributors-and-partners.cy.ts` unmodified |
| `OTV-T-5` — `CLAUDE.md` re-stamp | ❌ **Not started** | Both target `CLAUDE.md` files unmodified |

Re-confirmed green immediately before archiving: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="rd-contributors-and-partners|aow-hlo-create-modal"` → 9 suites, 174 tests, 1 snapshot, all passed.

**Uncommitted:** `OTV-T-1`/`OTV-T-2`'s code changes remain in the working tree — archiving this spec does not commit them. No commit was authorized as part of this action.

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| `OTV-R-1`, `OTV-R-2`, `OTV-AC-1`, `OTV-AC-2` | ✅ `rd-contributors-and-partners` (`OTV-T-1`) |
| `OTV-R-3`, `OTV-R-4`, `OTV-AC-3`, `OTV-AC-4` | ✅ `aow-hlo-create-modal` (`OTV-T-2`) |
| `OTV-AC-7` (regression guard, both components) | ✅ Verified in both `OTV-T-1` and `OTV-T-2` |
| `OTV-R-5`, `OTV-R-6`, `OTV-AC-5`, `OTV-AC-6` | ❌ **Not delivered** — `lab-report-form`'s original defect (dead-end empty-state UX) is unfixed |
| `OTV-R-10` (consistency, `lab-report-form` half) | ❌ Not delivered |

## 6. Files Changed Summary

From `execution.md` (`OTV-T-1`/`OTV-T-2` only — the only tasks with any diff):

- `rd-contributors-and-partners.component.html` (+10/−6) — removed duplicate `app-pr-field-header` from both empty-ToC `@else` branches; conditional `[label]` binding on both auto-activated dropdowns; `data-testid="toc-other-centers"`/`"toc-other-science"` added.
- `rd-contributors-and-partners.zoneless.spec.ts` (+94/−3) — fixed a pre-existing broken test helper; added Science coverage; added empty-ToC resolved-label assertions for both fields.
- `aow-hlo-create-modal.component.html` — same pattern for Centers; Science empty-state fixed by conditionally rendering the `app-pr-field-header` itself (different control shape — `app-pr-filter-multiselect` has no `label` input).
- `aow-hlo-create-modal.component.spec.ts` + regenerated, hand-reviewed snapshot.

**Not touched (the undelivered 3/5):** `lab-report-form.component.ts`/`.html`/`.spec.ts`, `contributors-and-partners.cy.ts`, both `CLAUDE.md` files.

## 7. Test Evidence Summary

- `OTV-T-1`: 8 suites, 133/133 passed (up from 123 baseline). RED→GREEN confirmed via label-text-mismatch method (not a null-selector false negative — this was the exact defect the attempt-1 Reviewer FAIL caught).
- `OTV-T-2`: 1 suite, 39/39 passed, 1 snapshot hand-reviewed (word-diff, exactly 3 intended regions). RED evidence method-limited (hook-absence, not assertion-failure) — accepted per Reviewer, with the stronger method adopted for `OTV-T-1`.
- Combined re-run at archive time: 9 suites, 174/174 passed.
- `OTV-T-3`/`OTV-T-4`/`OTV-T-5`: no test evidence — not attempted.

## 8. Validation Summary

No `validation-report.md`. Validation evidence for the shipped half is the Implementer/Reviewer PASS cycle plus a two-round Judgment Day on `design.md` (see `judgment.md`) that closed 3 confirmed-SEVERE findings (C-1 duplicate label, C-2 wrong control type for aow Science, C-3 false "new file" premise) and 2 single-judge-but-fixed SEVERE findings (RB-S1 property-binding test-selector trap, RB-S2 self-contradicting getter/computed prose) before any code was written. **JUDGMENT: APPROVED** (both rounds used, 2/2 max).

No FAIL findings remain unresolved for the shipped tasks. `OTV-T-3`/`T-4`/`T-5` have no validation because they were never executed — not a validation gap, an execution gap.

## 9. Accepted Warnings Or Follow-Ups

- **Accepted risk (design-level, `SP-2`, Judgment Day round 1):** `lab-report-form` has no ToC-reference reconciliation effect — an async-timing race could leave a stale "Other(s)" selection in the save payload. Recorded as an explicit accepted gap in `design.md` §13, not fixed — and now doubly moot since `OTV-T-3` (which would have introduced the affected code) was never executed.
- **Follow-up (not this spec):** extracting a shared "Contributing Centers/Science Programs, ToC-split" component across all three call sites (`design.md` §13/proposal §9 Option 2) — flagged, not adopted.
- **The undelivered 60% is the primary follow-up.** See §4 above — a new spec should pick up `OTV-T-3` (`lab-report-form`'s original, more severe dead-end-UX defect), `OTV-T-4` (Cypress), and `OTV-T-5` (docs), referencing this archive for full context (root cause, design mechanism, Judgment Day findings) rather than re-diagnosing from scratch.

## 10. Historical Notes

- This spec is the **origin** of the `RB-S1` finding (Angular `[label]` property binding does not reflect as a queryable DOM attribute) — a Judgment Day round-2 catch that the sibling spec `external-partners-toc-visibility` (archived earlier the same day) explicitly reused as precedent for its own test-selector strategy. Worth knowing if `lab-report-form` or any other component in this family is touched again: the trap recurs by construction, not by coincidence.
- Two-round Judgment Day (max allowed) was used in full — `design.md` needed both a structural correction (round 1: duplicate labels, wrong control type, false premise) and a mechanism-level correction (round 2: test-selector strategy, self-contradicting prose) before implementation started. The correction-then-scoped-re-judgment protocol caught all of it before any code was written for `OTV-T-1`/`OTV-T-2`.
- Archived as partial at explicit user instruction (2026-08-27), after the user first asserted "todo está completo" and this was corrected against verified `git status` evidence showing zero changes on `OTV-T-3`/`T-4`/`T-5`'s target files — recorded here so a future reader trusts this archive's completeness claims over any restated assumption.
