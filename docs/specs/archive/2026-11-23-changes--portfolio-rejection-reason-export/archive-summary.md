# Archive Summary — Rejection reason in the Results detail export + Filters dropdown (PRE)

> **Outcome:** The Portfolio Overview Results detail Excel export now carries three columns after Status (Rejection reason, Rejected by, Rejected on), a Funding/Status Filters dropdown sits next to Search, and filtering no longer scrolls the page to the top. In PROD via PR #803 (merged 2026-11-18). Owner verified on PRTest ("Ya probé y funciona bien").

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-rejection-reason-export` (PRE) |
| Ticket | SR-168253 "Rejected w3/bilat results" |
| Owner | Santiago Sanchez |
| Archived on branch | `qa-development-2026-ss` (spec branch; apply-capable = `staging`) |

## 2. Original Spec Path

`docs/specs/changes/portfolio-rejection-reason-export/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Done — 6/6 tasks closed** (PRE-T-1..T-3, T-5, T-6 PASS; PRE-T-4 closed by the owner's PRTest verification). `tasks.md` header still reads `not-started`; real status lives in `execution.md`.

| Signal | Value |
|---|---|
| Reviewer FAILs | 2 (PRE-T-2 attempt 1, PRE-T-3 attempt 1), both fixed on attempt 2 |
| Reopened | PRE-T-3 (Space key defect found in a real browser by PRE-T-4), PASS on attempt 3 |
| Owner-added scope | PRE-T-5 (top-bar Space key), PRE-T-6 (scroll jump) |
| Budget tripwire | 1 (after PRE-T-3; about 530 to 990 LOC, owner approved continuing) |

## 5. Requirements Delivered

PRE-R-1..R-9 per `execution.md`. PRE-R-5 amended at execute time (Filters stays enabled on the table's own empty state; the 0-global-results mount rule of FDE R-9 is kept).

| Task | Delivered | Commit |
|---|---|---|
| PRE-T-1 | Server: newest `REJECT`/`REJECTED` record per Rejected result in `portfolio/result-dimensions` (`rejections[]`) | `f17c3c237` |
| PRE-T-2 | Client: 16-column export, truncation at 32,767 chars | `4123fddf0` |
| PRE-T-3 | Client: Filters dropdown in the Results detail toolbar (Space fix on attempt 3) | `36c3421a5`, `a383b1323` |
| PRE-T-5 | Client: Space toggles in the top-bar multi-select | `dfb846da4` |
| PRE-T-6 | Client: opt-in `keepScroll` navigation info, no jump to top | `93ebf5f3b` |

## 6. Files Changed Summary

Server: `results-framework-reporting` service/repository + specs. Client: `pages/result-framework-reporting/pages/portfolio-overview/**` (`detail-filters`, `results-detail` rows/component, page, copy, `CLAUDE.md`), `filter-multi-select`, `shared/components/external-tools`, new `shared/constants/router-navigation.constants.ts`. Evidence: `evidence/filters-open-1280.png`, `filters-open-768.png`.

## 7. Test Evidence Summary

No `test-report.md`. Per-task Jest with red runs, falsifiers and Leader re-runs in `execution.md`. Last gate: client Jest 25 suites / 663 tests, `tsc` 0, lint clean, `ng build` 0. Real-browser Cypress CT (throwaway) proved Space toggling and no scroll jump (red on unfixed code, green after). Excel file shape probed with `exceljs`.

## 8. Validation Summary

No `validation-report.md`. PRTest, owner 2026-11-18 on `63c58e8a9`: export columns, Filters panel and no page jump accepted; P-10 (rejected W3/Bilateral rows reach the page) settled by that acceptance. **Not measured:** `result-dimensions` latency before/after (check 6). Recorded as not measured, not passed; the owner accepted the release without it.

## 9. Accepted Warnings Or Follow-Ups

- [ ] `result-dimensions` latency (3 runs before/after, p95 < 150 ms) never measured.
- [ ] 0-row case: the block unmounts by design, scrollY is clamped and the no-match panel can end above the viewport; a `scrollIntoView` to the panel is available (owner-recorded).
- [ ] Other pages with the same `router.navigate([], ...)` scroll reset: `bilateral-results-list`, `bilateral-review`, `dashboard-lab`, `outcome-indicator`, `bilateral-overview`; opting in is one line each (owner-recorded).
- [ ] Permanent `detail-filters.cy.ts` / `filter-multi-select.cy.ts` so the Space/Enter check is repeatable; re-run a real-browser keyboard check on any Brain upgrade (`keyManager` is `@internal`).
- [ ] IME / paste / dead-key input can still reach the hidden input; surrogate-safe truncation; fixture `versionId` != 7.
- [ ] Rejection date time-zone advisory of PRE-T-1.

## 10. Historical Notes

- PRE-T-3 passed review and Jest, but Brain was mocked; the Space defect surfaced only in the real-browser PRE-T-4 pass.
- Environment: Node v26 broke 3 server suites at load and the Cypress unzip (repo expects Node 20.x); local-only workarounds are listed in `execution.md` section 3.
- The SR-168253 ticket reply was drafted in `execution.md` and sent by the owner.

## 11. Diagrams

None.
