# Archive Summary — Programme Results Phase / Status / Created by multiselect

**Outcome:** shipped and live. Phase, Status and Created by became multiselect on the Results tab and My Work
board, with comma-separated URL lists, OR-within / AND-across semantics and a sticky phase default. Verified in
the live browser on 2026-09-21; the same commit also carried an **undeclared optional Phase column**, accepted as
delivered scope at archive.

## 1. Document Control

| Field | Value |
|---|---|
| Module / feature | `result-framework-reporting/programme-results-multiselect-filters` |
| Prefix | `PRM` |
| Archive date | 2026-09-21 |
| Branch at archive | `qa-development-2026` (spec branch — not apply-capable) |
| Approval mode | gated |
| Ticket(s) | none provided |

## 2. Original Spec Path

`docs/specs/result-framework-reporting/programme-results-multiselect-filters/`

## 3. Final Status

**Complete.** 3/3 tasks PASS, Reviewer PASS, 284 Jest tests green, HITL §7 (5/5) PASS in the live browser.

## 4. Requirements Delivered

| ID | Requirement | Evidence |
|---|---|---|
| PRM-R-1 | Phase multiselect | popover shows `app-pr-filter-multiselect`; OR proven 284 + 5 = 289 |
| PRM-R-2 | Status multiselect + counter pills | OR proven 231 + 13 = 244; two pills pressed at once; counts keep `{ ignoreStatus: true }` |
| PRM-R-3 | Created by multiselect | live on Results; on My Work under *All program results* only (by design) |
| PRM-R-4 | Array state, OR within / AND across | 2 phases + status + createdBy → 2 results, 4 chips |
| PRM-R-5 | Comma-separated URL params + legacy single values | `?phase=A,B&status=Editing,Submitted`; single-value deep links hydrate unchanged |
| PRM-R-6 | Phase default + Clear filters retention | cold load mirrors `?phase=<default>`; Clear filters keeps phase (284), hides its own button |
| PRM-R-7 | One chip per value | 4 chips for 2 phases + 2 statuses |
| PRM-R-8 | My Work parity | URL shared from Results hydrates 2 phase chips, 0 × `app-pr-filter-select` |
| PRM-R-9 | No `custom-fields` in the filter strip | 7 multiselects, 0 single-selects, 0 custom-fields primitives |

`PRM-OQ-1` resolved as specified: an emptied phase selection falls back to `[defaultPhase()]`, never "all phases".

## 5. Files Changed Summary

One commit, `f075a1adc` (18 files, +1020 / −291), on `qa-development-2026`, `staging` and `performance-refactor`.

| Area | Files |
|---|---|
| Filter service | `programme-results-filter.service.{ts,spec.ts}` |
| Results tab | `programme-results.component.{html,ts,spec.ts}`, `programme-results-query-params.ts` |
| My Work board | `my-work-board.component.{html,ts,spec.ts}`, `my-work-board.service.{ts,spec.ts}` |
| Module guide | `programme-results/CLAUDE.md` |
| **Out of spec** | `programme-results.service.{ts,spec.ts}` — the optional Phase column (§8) |

## 6. Test Evidence Summary

- `npx jest --testPathPattern="programme-results-filter.service.spec|programme-results.component.spec|my-work-board.component.spec|my-work-board.service.spec"` → **4 suites, 284 tests passed** (2026-09-15).
- No `test-report.md`: tests were authored inside the tasks, not via a separate `/akili-test` pass. Accepted.
- HITL §7 — 5/5 PASS, live browser, 2026-09-21. Full table in `execution.md` § HITL.

## 7. Validation Summary

No `validation-report.md`; `/akili-validate` was not run as a separate pass. Its substance was covered by the
Reviewer PASS (scope vs PRM-R-1..R-9 and PRM-DD-1..4) plus the live HITL, whose count arithmetic is a stronger
check on the OR/AND semantics than a document review. Accepted at archive.

## 8. Accepted Warnings Or Follow-Ups

| # | Item | Disposition |
|---|---|---|
| 1 | **Undeclared Phase column** shipped in the PRM commit (`phaseAcronym`, `phaseSort`, `formatProgrammeResultPhaseShort`, `optional: true` column). No requirement, task, DoD or other spec covers it. | **Accepted as delivered scope** (user decision, 2026-09-21). Not reverted, not re-specified. Module-guide documentation queued as a `guide-sync` pending item. |
| 2 | `PRM-T-3` did not re-stamp `programme-results/CLAUDE.md` `**Verified:**` as its DoD required; the Reviewer passed the task anyway. | **Fixed at archive** — the stamp now records PRM-T-1..T-3, the Phase column and the HITL run. |
| 3 | No `test-report.md` / `validation-report.md`. | Accepted (see §6, §7). |
| 4 | Escape closes the multiselect panel only as a blur side effect; no handler owns it, and focus lands on `<body>` rather than the trigger. | Follow-up on the shared component, not PRM. Recorded in `execution.md` § Observations. |
| 5 | Tab order traverses 90 hidden 0×0 `input.pr-native-check` elements. | Pre-existing since MWB-T-13; not introduced here. |
| 6 | My Work renders a `+0 more` overflow chip when nothing is hidden. | Cosmetic, outside PRM scope. |

## 9. Historical Notes

- Built directly on MWB-T-13 (`changes/my-work-board`), which had already made Category / Funding source /
  Center multiselect on the same shared `ProgrammeResultsFilterService`. PRM-DD-1 reused that infrastructure
  wholesale — no new pattern, which is why the spec ran with zero rework rounds.
- The phase load-order guard from `bugfix/phase-filter-missing-phases-prod` survived the conversion intact: the
  URL → filters effect still defers the auto-derived default while `data.loading()` is true.
- `requirements.md` `Status` still reads `draft` on a shipped spec — cosmetic, consistent with several other
  archived specs in this project.
