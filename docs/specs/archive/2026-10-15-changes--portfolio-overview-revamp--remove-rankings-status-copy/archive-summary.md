# Archive Summary — Portfolio Overview: remove rankings, clarify the status section (`PRC`)

**Outcome:** delivered. The admin `/portfolio-overview` page no longer shows the Science Programs or CGIAR Centers ranking cards. The status section is now "Portfolio Results Reporting Status": it names both funding streams, has a guide link that stays hidden until a URL exists, and shows a W3-only hint on the Rejected tile. All 4 tasks passed, including the browser check on PRTest.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-overview-revamp/remove-rankings-status-copy` |
| Parent family | `changes/portfolio-overview-revamp` (child #2) |
| Branch | `qa-development-2026-ss` |
| Implementation commit | `6504812b8` (also on `performance-refactor` and `staging`) |
| Archived by | `/akili-archive` (Claude Code) |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-revamp/remove-rankings-status-copy/`

## 3. Archive Date

2026-10-15

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | 4 / 4 `[x]` (T-A, T-B, T-C, T-H) |
| Reviewer verdicts | All PASS on attempt 1 |
| HALT / Pivot / FATAL_FAIL | None |
| Judgment Day (design) | 2 severe and 9 warnings, all fixed in round 1; the scoped re-judgment found 0 critical |
| Budget | ≈ +186 added LOC against a 220 tripwire; about −960 deleted |
| `test-report.md` | **Absent, accepted.** Scoped Jest and build per task, plus the T-H browser check |
| `validation-report.md` | **Absent, accepted.** The user validated the T-H evidence on 2026-10-15 |

## 5. Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| PRC-1: program ranking removed | T-A | Specs; on PRTest "ranking" is absent and Progress by science program follows the status section |
| PRC-2: center ranking removed, Progress by Center chart kept | T-B | `detailTable` / `detailHeight` specs; PRTest chart with 16 Centers; status filter highlights the column in the table |
| PRC-3: title, subtitle, unchanged counts | T-C | Copy specs; PRTest donut 971 = Total KPI 971 |
| PRC-4: guide link only with a URL | T-C | Spec with the URL set and unset; PRTest shows no link |
| PRC-5: Rejected hint | T-C | PRTest tooltip on hover and on keyboard focus; click still toggles the filter |
| PRC-N1…N4 (no dead code, slice scope, copy file, a11y) | T-A, T-B, T-C | Dead-code grep 0 hits; Reviewer gates |

## 6. Files Changed Summary

Paths are relative to `onecgiar-pr-client/src/app/`.

| Area | Files | Task |
|---|---|---|
| Page | `pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.{html,ts,spec.ts}`, `portfolio-overview.charts{,.spec}.ts` | T-A, T-C |
| Service | `.../portfolio-overview/services/portfolio-overview.service{,.spec}.ts` (deletions only) | T-A |
| Centers block | `.../centers-block/centers-block.component.{html,ts,spec.ts}`, `centers-block.charts{,.spec}.ts` | T-B |
| Copy and config | `internationalization/portfolio-overview.copy.ts` (new), `internationalization/portfolio-centers-block.copy.ts` (−5 keys), `shared/constants/portfolio-links.constants.ts` (new, `STATUS_GUIDE_URL`) | T-B, T-C |
| Test mocks | `onecgiar-pr-client/tests/mocks/spartanBrainMock.ts` (`BrnTooltip` inputs) | T-C |
| Module guide | `.../portfolio-overview/CLAUDE.md` | T-C |

## 7. Test Evidence Summary

| Check | Result |
|---|---|
| T-A Jest (component, charts, service; `--maxWorkers=2`) | 3 suites, 82 / 82 passed |
| T-B Jest `centers-block` | 3 suites, 28 / 28 passed |
| T-C Jest (component, charts, service, tooltip precedent) | 4 suites, 214 / 214 passed; the disqualifier mutation made 1 test fail as expected |
| `npm run build:dev` | Passed after every task |
| Lint (`ng lint --lint-file-patterns`, touched files) | Clean |

## 8. Validation Summary

**T-H browser check:** PASS on `prtest.ciat.cgiar.org`, 2026-10-15, with an admin session at 1280 px.

- The served bundle was confirmed to carry the new copy and none of the removed copy.
- All 11 checks passed (see `execution.md` T-H).
- The 768 px width was not exercised. The user accepted the run as complete.

## 9. Accepted Warnings Or Follow-Ups

1. **Status guide URL (OQ-1).** Set `STATUS_GUIDE_URL` once the guide exists. It is a one-line change.
2. **Pre-existing a11y defect, out of scope.** The status pipeline bar (`portfolio-overview.component.html:270`, from August) renders the sr-only text "Warning: Chart rendered without required accessibility tableModel". Give it a `tableModel` or mark it decorative.
3. **Advisories recorded, not actioned:**
   - `PROGRAM_AXIS_LABEL_MAX_CHARS` still says "(view-dependent)".
   - The `portfolioStatusDonutTable` JSDoc uses the old title.
   - One `seriesId` spec case was rewritten instead of deleted (a stronger guard).
4. **Next in the family:** #3 `centers-new-vs-replicated` and #4 `typology-view` are now unblocked.

## 10. Historical Notes

- **Source.** Stakeholder feedback items in the family `proposal.md`. The rankings were removed because they read as a "competition".
- **Judgment Day.**
  - JD-1: the design did not list `portfolio-overview.service.spec.ts`, which references the deleted `programRankingRows`.
  - JD-2: the §8.1 spec-breakage list was wrong.
  - JD-10 reordered the family so that `kpi-breakdown` became #1.
  - All of these were fixed before execution.
- **Commit timing.** The commit and push happened on 2026-10-14 at the user's request, before T-H. T-H ran on PRTest the next day.
