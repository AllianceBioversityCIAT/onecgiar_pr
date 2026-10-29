# Archive Summary — `results/result-center-auto-apply-filters`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `results/result-center-auto-apply-filters` |
| Archive Date | 2026-10-15 |
| Branch | `qa-development-2026-mc-2` |
| Archived by | `/akili-archive` |

## 2. Original Spec Path

`docs/specs/results/result-center-auto-apply-filters/`

## 3. Archive Date

2026-10-15

## 4. Final Status

**Shipped (implementation + verification complete, not yet committed/merged).** Both tasks `[x]`:

| Task | Status | Evidence |
|---|---|---|
| `RCF-T-1` — auto-apply filters, remove Apply/Cancel | PASS (2 attempts) | `execution.md` |
| `RCF-T-2` — manual browser verification | `REVIEW_SKIPPED` (zero diff; user-confirmed pass) | `execution.md` |

## 5. Requirements Delivered

All functional requirements and acceptance criteria from `requirements.md` §6/§8:

- `RCF-R-1`/`RCF-AC-1` — every Results Center filter dropdown + both "My activity" checkboxes now apply immediately in `menu` layout (previously gated on Apply), matching `sidebar` layout's existing behavior.
- `RCF-R-2`/`RCF-AC-2` — Apply and Cancel buttons removed from the filter panel entirely.
- `RCF-R-3`/`RCF-AC-3` — chip removal and "Clear all" unchanged, confirmed still instant (regression-only).
- `RCF-R-4`/`RCF-AC-4` — ✕/outside-click/Escape close the panel without reverting an already-made selection (new Jest coverage added in attempt 2).
- `RCF-R-5`/`RCF-AC-5` — layout toggle itself unaffected; only the apply-timing gate tied to it removed.
- `RCF-DD-1`, `RCF-DD-2`, `RCF-DD-3` design decisions implemented exactly as specified.

## 6. Files Changed Summary

(from `execution.md`)

| File | Change |
|---|---|
| `onecgiar-pr-client/.../results-list-filters/results-list-filters.component.ts` | Removed `isSidebarLayout()` gate in `onFilterFieldChanged()` (now unconditional); deleted `applyFilters()`; updated stale doc-comment. |
| `onecgiar-pr-client/.../results-list-filters/results-list-filters.component.html` | Deleted the `.rc-more-footer` Apply/Cancel button block. |
| `onecgiar-pr-client/.../results-list-filters/results-list-filters.component.spec.ts` | Removed `describe('applyFilters', ...)`; replaced the bug-asserting "should wait for Apply in the menu" test with a 9-field auto-apply assertion; added a new `describe` covering close-affordance-doesn't-revert (3 cases via `it.each`); added a DOM-absence test for the removed footer. |

No server, migration, or API change. No other component touched.

## 7. Test Evidence Summary

No separate `test-report.md` — tests were authored and verified inline as part of `RCF-T-1`:

- Full `results-list-filters.component.spec.ts` suite: 96/96 passing (Leader-independently re-run and matched).
- Disqualifier regression suites (`results-list.(component|viewport|zoneless).spec`): 190/190 passing, no regression in files reading the same applied signals.
- Lint: clean.
- Two falsifier experiments (reintroduce the removed gate; comment out one `commitTempFilters()` line) both demonstrated red→green correctly, proving the tests discriminate rather than pass vacuously.
- Project-wide coverage thresholds (50/60/60/60) were **not independently re-verified** by the Leader (would require a full-project run, outside inline scope) — flagged as an accepted gap, to be confirmed by full CI before merge.

## 8. Validation Summary

No separate `/akili-validate` pass was run; closure evidence is the Reviewer `PASS` on `RCF-T-1` (independent, fresh-context review, confirmed both attempt-1 Reviewer FAIL issues were genuinely remediated in attempt 2) plus `RCF-T-2`'s human-performed manual browser verification (user-confirmed pass, no notes). This combination is treated as sufficient validation for a `Standard`-depth, single-component spec per `design.md` §1B's own budget (1 expected review round — actual: 2, due to the one rework cycle).

## 9. Accepted Warnings Or Follow-Ups

- **ADVISORY (non-gating, 4R lens)** from the Reviewer, carried forward as a candidate for a future, separately-scoped cleanup (already named in `design.md` §13): unused `.rc-more-footer` CSS left in the `.scss` file; two stale test names referencing removed behavior; a second stale doc-comment on `fitFilterPanelToViewport()` still referencing "the Cancel/Apply footer"; the sidebar-only temp-mirror `effect` guard (`.ts:507`) is now effectively always-true dead logic (harmless, candidate for the IPSR direct-binding cleanup design.md §13 already flags).
- **Project-wide coverage threshold** not independently re-run by the Leader — confirm via full CI before merge (see §7).
- **Not yet committed** — changes remain in the working tree; no PR opened yet.

## 10. Historical Notes

- `requirements.md`'s own Context section corrected a user-facing naming mismatch ("Resource Center" vs. the actual "Results Center" label) before any code was touched — verified via `grep`, zero hits for the former spelling.
- The spec's Premise Ledger (`design.md` §1A) carried one `UNVERIFIED` premise (`RCF-P-7`, shared-state blast radius) at design time; resolved during `RCF-T-1` execution via grep + manual read of every non-exempt consumer of `ResultsListFilterService` — none assumed filters change only on explicit Apply.
- Kaizen retrospective recorded one lesson (`KZ-results--result-center-auto-apply-filters-1`, Product + Methodology, Medium) about `tasks.md` Definition of Done not itemizing requirements.md's own defect-class-table gates explicitly — see `docs/specs/kaizen/results--result-center-auto-apply-filters.md`. Two pending items recorded (local template edit + upstream methodology recommendation), awaiting the apply phase on the `staging` integration branch (this spec ran on a spec branch, `qa-development-2026-mc-2`, which cannot write shared files).
