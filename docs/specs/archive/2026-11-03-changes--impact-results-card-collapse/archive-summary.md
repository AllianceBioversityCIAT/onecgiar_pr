# Archive Summary — Impact results card: expand / collapse

## Document Control

| Field | Value |
|---|---|
| Spec path (original) | `docs/specs/changes/impact-results-card-collapse/` |
| Archive path | `docs/specs/archive/2026-11-03-changes--impact-results-card-collapse/` |
| Archive date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch — shared-file writes recorded as pending) |
| Depth | Lite · Module `ICC` |
| Final status | **Delivered** — 1/1 task PASS, manual check accepted by the user |

## Outcome

The Impact results card on the SP Reporting tab (grouped view) collapses and expands its 5 Impact Area rows from the header chevron. It starts expanded on every load and keeps no persisted state. Counts are not refetched on toggle.

## Requirements Delivered

| ID | Status | Evidence |
|---|---|---|
| ICC-R-1 (1.1, 1.2) | ✅ | Jest `collapse toggle (ICC-T-1)` block |
| ICC-R-2 (2.1) | ✅ | Jest asserts aria-expanded / aria-controls / label / aria-hidden; Enter/Space by native `<button>` + user manual check |
| ICC-R-3 (3.1) | ✅ | Jest: `GET_impactLevelCounts` called once after 2 toggles; existing Report + negative tests green |
| ICC-NFR-1 | ✅ | Reviewer: AoW chevron classes and tokens copied, no new token |
| ICC-NFR-2 | ✅ | CT 1280/900 green + user manual check |

## Files Changed

All in `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/components/impact-results-card/` (+121/-8):

| File | Change |
|---|---|
| `.component.ts` | `expanded` signal, `toggle()`, `listId`, `NgIcon` + `lucideChevronDown` |
| `.component.html` | Chevron `<button>`, header click, conditional `border-b`, rows in `@if` |
| `.component.spec.ts` | 8 new tests; "no chevron" clause removed |
| `CLAUDE.md` | Prohibition line updated, ICC note, Verified stamp |

## Test Evidence

| Check | Result |
|---|---|
| Jest `--findRelatedTests` (`--maxWorkers=1`, RAM borderline) | 36 suites / 1258 tests pass |
| Lint (`ng lint --lint-file-patterns`, substitute for `npx eslint`) | pass |
| CT `impact-results-card.component.cy.ts` | 6/6 pass |
| Manual HITL | done by the user, accepted |

No `test-report.md` / `validation-report.md`: Lite spec, absence accepted by the user's request to archive after the manual check.

## Accepted Warnings / Follow-Ups

- Budget overrun: ~121 LOC vs ~50 (tests were ~84). Accepted.
- Advisory, not applied: `aria-controls` points at a removed id while collapsed (option: bind only while expanded); comment the module-level `nextListId` counter.
- CodeGraph re-index recommended (`codegraph sync`).
- Nothing committed yet.

## Historical Notes

- Amends `IRE-R-1` of `archive/2026-11-01-results--impact-results-reporting/sp-reporting-entry`: only the "no chevron" rule lifted; bar/ratio/%/By AOW prohibitions stay.
- Reviewer diff excluded the unrelated uncommitted `quick/impact-previously-reported-label` change.
