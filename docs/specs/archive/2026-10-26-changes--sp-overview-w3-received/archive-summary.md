# Archive Summary — SP Overview: W3/Bilateral "received" row + "awaiting review" card

**Outcome:** delivered. Total General no longer shrinks when the SP reviews a bilateral, and "awaiting review" now has its own card. Verified on local SP01 (219 = 8 + 161 + 50; card 32).

## Document Control

| Field | Value |
|---|---|
| Original Spec Path | `docs/specs/changes/sp-overview-w3-received/` |
| Archive Date | 2026-10-26 |
| Final Status | ✅ Complete — 3/3 tasks `[x]` |
| Ticket | P2-3977 (request #2) |
| Depth / Mode | Lite / gated |
| Branch | `qa-development-2026-ss` |

## Requirements Delivered

| ID | Delivered |
|---|---|
| SWR-R-1 | ✅ Headline = replicated + new + received. The W3 row is "W3/Bilateral results received" (status 5/6/7) and stays program-wide |
| SWR-R-2 | ✅ Clicking the row or its segment sets `section=bilateral` in place. Clicking again does not toggle it off |
| SWR-R-3 | ✅ The "Awaiting review" card (status 5) sits between Total General and AoW and opens Bilateral review on Pending |

## Files Changed Summary

Base: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/`

| File | Task | Change |
|---|---|---|
| `dashboard-lab.component.ts` | T-1 | Adds `BILATERAL_RECEIVED_STATUS_IDS` and `received` in `overviewTotalBreakdown`. `onTotalSegment('received')` now sets the section |
| `dashboard-lab.component.spec.ts` | T-1 | Updates STG literals and adds 6 SWR tests |
| `components/program-overview/program-overview.component.ts` | T-1 (types) · T-2 | Adds `received` to the types, the headline and the segment |
| `components/program-overview/program-overview.component.html` | T-2 | Changes the W3 row to received, adds the new card, and moves the grid to `xl:grid-cols-4` |
| `components/program-overview/program-overview.component.spec.ts` | T-2 | Updates STD blocks and adds 7 SWR tests |
| `components/program-overview/CLAUDE.md`, `dashboard-lab/CLAUDE.md` | T-2 | Folder docs updated |

## Test Evidence Summary

| Check | Result |
|---|---|
| T-1 Jest `--findRelatedTests` | 37 suites / 1513 tests green |
| T-2 Jest `--findRelatedTests` | 37 suites / 1520 tests green |
| Lint (`ng lint --lint-file-patterns`) | Clean on touched `.ts` files |
| T-3 live check (local SP01, Reporting 2026) | Headline, card, row click, second click, card navigation and layout at xl/md/375 all ✅ |
| `test-report.md` | Not produced (Lite spec). Absence accepted by the user's request to archive |

## Validation Summary

- No `validation-report.md` was produced (Lite spec). Its absence is accepted by the user's request to archive.
- The Reviewer passed T-1 and T-2 on the first attempt. T-3 was approved by the user.

## Accepted Warnings Or Follow-Ups

| # | Item | Owner / where |
|---|---|---|
| 1 | Pivot A: the donut also counts Discontinued and Submitted (52 ≠ 50). Parity is now checked against Bilateral review "All" | Accepted by the user (2026-10-26) |
| 2 | At 375px the page scrolls horizontally. Cause: pre-existing cards "results by center and category" and "ToC map" | Out of scope; possible follow-up |
| 3 | Confirm the card wording ("Awaiting review" + "W3/Bilateral" badge) with Nicoleta | User |
| 4 | Run a PRTest SP11 check after deploy to `performance-refactor` | User |
| 5 | ADVISORY: alias `BILATERAL_RECEIVED_STATUS_IDS` to `BILATERAL_REVIEW_STATUS_IDS`. The footer uses a literal arrow | Optional cleanup |
| 6 | `dashboard-lab/CLAUDE.md`: the `onTotalSegment` bullet does not mention `received` | Kaizen pending item P2 |

## Historical Notes

- Supersedes `STD-R-1` and the `pendingReview` row of `STD-R-3` in `archive/2026-10-15-changes--sp-overview-total-drilldown`.
- The verification target moved by the user from PRTest SP11 to local SP01.
- Unrelated `replicated-innovation-reminders` changes from another session were in the working tree. They were excluded from review.
