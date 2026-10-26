# Archive Summary — Let Centers pick the 2026 project and P/A on replicated innovations

**Outcome:** shipped, client-only. On PRTest, a Center can now link a 2026 project and choose the Primary Science Program in Section 0 of a result that has no lead project. Two saves were checked end to end on result 9516. All 5 tasks are done. Three tasks needed a second review round.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `project-and-pa-assignment` (`PAA`, child #1 of `bilateral/replicated-innovations-2026-pa`) |
| Ticket | Freshdesk INC-164073 (due 2026-10-24) |
| Owner | Santiago Sanchez |
| Approval mode | `gated` |
| Branch | `qa-development-2026-ss`; on PRTest via `performance-refactor` |
| Scope | Client only. No server, migration or payload change, so no `bilateral-result-summaries.en.md` entry |

## 2. Original Spec Path

`docs/specs/bilateral/replicated-innovations-2026-pa/project-and-pa-assignment/`

## 3. Archive Date

2026-10-21

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 5 of 5 done. T-1 PASS attempt 2, T-2 PASS attempt 2, T-3 PASS attempt 1, T-4 HITL closed 2026-10-19, T-5 PASS attempt 2 (added in execute) |
| `test-report.md` | **absent, accepted by the owner's go-ahead** (evidence: per-task red/green Jest runs, combined regression, HITL) |
| `validation-report.md` | **absent, accepted by the owner's go-ahead** (evidence: Reviewer PASS on every code task, build, PRTest HITL) |
| Commit | `572363fe2` on `performance-refactor` (PRTest checked at `1a22ee0f2`, which contains it) |

## 5. Requirements Delivered

| Requirement | Delivered by |
|---|---|
| `PAA-R-1` editable result with no lead project shows project picker, disabled Program placeholder and no "No project linked" | T-1 (attempt 2) |
| `PAA-R-2`, `R-3` one-Program project preselects; two-Program project needs a choice; untouched picker sends nothing | T-1 |
| `PAA-R-4` Program picker on a loaded linked project lists the project Programs (catalogue before result) | T-3 |
| `PAA-R-5` Contributors helper points to Project information | T-2 |
| `PAA-R-6` hint under the picker | T-1 |
| `PAA-R-7` picker lists the result's lead Center catalogue (owner request) | T-5 |
| `PAA-AC-1`..`AC-9` | T-1..T-5; `AC-1`, `AC-7` also proven live in T-4 |

## 6. Files Changed Summary

| Area | Files (all under `onecgiar-pr-client/src/app/`) |
|---|---|
| Section 0 | `pages/bilateral/components/section-zero-dashboard/` `.html` (about +126/-85, mostly moved), `.ts` (+7), `.spec.ts` (+130), folder `CLAUDE.md`; spec mock gained `resultLeadCenterCode` in T-5 rework |
| Contributors | `section-contributors/` `.html` (1 line), `.ts` (+1), `section-contributors.readonly.spec.ts` (+11), folder `CLAUDE.md` (`sciencePrograms` note and test count corrected) |
| Selector | `bilateral-project-selector/` `.component.ts` (+14/-3), `.spec.ts` (+26, 3 cases) |
| Service | `pages/bilateral/services/bilateral-creation.service.ts` (+6), `.spec.ts` (+54) |
| Copy | `internationalization/bilateral-primary-assignment.copy.ts` (+5: `noProjectLinkHint`, `contributorsPrimaryHelp`) |
| Size | about +145 production LOC (incl. moved markup) and about +260 test LOC vs the budget of ~90 / ~180 for 4 tasks. The overrun is moved markup and tests |

## 7. Test Evidence Summary

| Run | Result |
|---|---|
| T-3 `bilateral-creation.service` | red 1 failed / 68; green 68 passed |
| T-1 `section-zero-dashboard` | red 4 failed / 50 (attempt 1); green 51 passed (attempt 2). No separate red for the two attempt-2 cases |
| T-2 `section-contributors` | red 1 failed / 243 (html line reverted, fails on the DOM text); green 243 passed |
| T-5 `bilateral-project-selector` | red 1 failed / 11; green 11 passed |
| T-5 regression found by the Leader | 42 failed in `section-zero-dashboard` (mock lacked the new signal); fixed in attempt 2 |
| Final combined regression, 5 patterns | 6 suites, 552 tests passed |
| `npm run build:dev` | complete, no errors (templates type-check) |
| Lint | `ng lint --lint-file-patterns` clean on touched files |

## 8. Validation Summary

- **Reviews:** T-1 FAIL then PASS (Program field missing until a project is picked, against `PAA-AC-1`). T-2 FAIL then PASS (test-type deviation: source read instead of a DOM assert). T-3 PASS (checklist). T-5 PASS, then reopened by the Leader's regression run, PASS on attempt 2.
- **HITL, local stack, nothing saved (2026-10-16):** 9516 and 9848 as stand-ins for 27270 / 28073, which are not in the test DB.
- **HITL on PRTest with saves (2026-10-19, owner-authorised):**

| Check | Result |
|---|---|
| 9516 before | selector, disabled Program, hint; IITA catalogue; new Contributors helper |
| 9516 Save 1 (`T-PJ-003161`, SP06) | linked branch shown; after reload P/A = SP06 100%; default ToC inherited from the project (4 nodes, 16 indicators); the old SP09 mapping is gone |
| 9516 Save 2 (switch to SP02) | after reload P/A = SP02 100%; default ToC recomputed (6 nodes, 46 indicators) |
| 9848 (lead IRRI) | linked branch unchanged; Program chip correct; not saved |

## 9. Accepted Warnings Or Follow-Ups

| Follow-up | Owner |
|---|---|
| Real-data check in Reporting (prod) after the release: results 27270, 28073, 28634 (`PAA-OQ-4`) | Santiago |
| Reply to Nicoleta on INC-164073: what changed, `PAA-OQ-2` (no P/A change without a project) | Santiago |
| Not covered in a browser: the read-only no-project case (Jest case 2) and a two-Program group-A result (none in the test DB; Jest + T-3) | known |
| Any result opens under another Center URL (`/bilateral/Bioversity (Alliance)/result/11984` rendered 9516). Data is unaffected because picker and save use the lead Center | pre-existing, separate spec |
| `/bilateral/ALLIANCE/...` does not resolve `centerInstitutionId`; known `get/centers` acronym issue | pre-existing |
| "Select Primary Science Program" is hard-coded three times in the template; move to the copy file | code follow-up |
| `getProjects` has no latest-wins guard; a host that renders the inline selector before `loadResult` would make the race real | code follow-up |
| Contributing-SP multi-select may offer options on load (T-3 advisory); seen fine on 9848 | known |
| Versioning does not replicate `results_by_projects` | separate spec |
| Sibling child #2 `center-overview-no-project-line` stays pending (depends on #3, now archived) | Santiago |
| CodeGraph re-index (`codegraph sync`) | Santiago |

## 10. Historical Notes

- **PAA-T-5 was added during execute.** T-4 HITL showed the picker lists the page Center catalogue, but Alliance has two Centers. The owner asked to fix it at once. The spec was amended before coding (`PAA-R-7`, `AC-9`, `DD-6`; `PAA-P-2` superseded) after verifying that the server validates against the lead Center.
- `PAA-DD-1` was amended during T-1 from one `ng-template` to two, because Contribution sits between Program and actions in the linked branch.
- The first `build:dev` was stopped for low memory (0.5 GB free). That was a runtime event, not a FAIL. The owner freed RAM and the rerun passed.
- `family.md` still said child #1 was `pending` while it was executed. It was synced at archive.
