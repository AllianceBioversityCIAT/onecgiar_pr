# Archive Summary — notifications/bell-read-state

> **Outcome:** delivered and validated. The bell now reads like an e-mail inbox. Fresh items are bold with a dot,
> and read items stay listed in a light style. "Mark as read" takes the badge to 0. Requests stay in **Decide**
> until someone decides them. "Seen" is stored per person. Shipped to `staging` (`59046ae7d`) on 2026-10-06.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-read-state` |
| Depth | Full |
| Owner | Santiago Sanchez |
| Ticket | none (traceability `[SPEC:notifications/bell-read-state]`) |
| Amends | `archive/2026-10-06-notifications--bell-quick-inbox` (`BELL-R-1`, `BELL-R-3`, `BELL-T-10`) |

## 2. Original Spec Path

`docs/specs/notifications/bell-read-state/`

## 3. Archive Date

2026-10-06 → `docs/specs/archive/2026-10-06-notifications--bell-read-state/`

## 4. Final Status

| Item | Status |
|---|---|
| Tasks | ✅ 7/7 `[x]` |
| Validation | ✅ archive-ready: 0 FAIL, 2 WARN accepted, HITL-1..4 PASS |
| Branches | `qa-development-2026-ss`, `performance-refactor` (TEST) and `staging` all contain the work |
| Commits | `2d4ff4e6f` server · `ae48b0bec` client · `0b5206e8a` docs · `267f3e30e` validation fixes · merges `c367ac872`, `b89759039`, `59046ae7d` |

## 5. Requirements Delivered

| ID | Delivered |
|---|---|
| `BRS-R-1` | Badge = unseen requests + unread updates, `99+`, hidden at 0, filter-independent |
| `BRS-R-2` | Per-person seen table `share_result_request_seen` (verified in TEST: 575 → 274 rows, 829 → 0) |
| `BRS-R-3` | Opening an item (bell or inbox drawer) marks it seen/read, with no optimistic drop |
| `BRS-R-4` | "Mark as read" = read-all + seen-all; Decide count unchanged; idempotent |
| `BRS-R-5` | Inbox "Mark all as read" has the same meaning, all phases |
| `BRS-R-6` | Tab counts: `N to decide` (orange), unread updates, listed rows |
| `BRS-R-7` | Fresh look (bold, dot, "Unread" for assistive tech) vs read look (grey, no dot); decision affordances unchanged |
| `BRS-R-8` | Read rows stay listed under "Earlier" (10 most recent read updates) |
| `BRS-R-9` | Bell, tabs and inbox stay in step |

## 6. Files Changed Summary

| Side | Files | Prod LOC | Test LOC |
|---|---|---|---|
| Server | migration `1790600000000-AddShareResultRequestSeen`; seen entity + repository; share-request service/controller/module; notification service/controller | +381 | +535 |
| Client | results-api service; results-notifications service/page; notification-item; pop-up-notification-item; shell-topbar; `bell-quick-inbox.copy.ts`; 2 folder `CLAUDE.md` | +240 | +646 |

The budget was ~330 prod / ~450 test LOC. Actual is 1.9× prod and 2.6× test. The overrun was not flagged during execution; see the kaizen entry.

## 7. Test Evidence Summary

| Evidence | Result |
|---|---|
| Server scoped Jest | 308/308 (10 suites); later +W1 assertions, 89/89 on the service spec |
| Client scoped Jest | 1000/1000 (7 suites); later +W2 case, 91/91 on the service spec |
| Build / type-check / lint | server `tsc` 0 errors · client `ng build` OK · lint clean |
| `migration:check:ci` | `PENDING_MIGRATIONS=0` |
| HITL-1 isolation | DB: no duplicates, no cross-user rows; UI: 829 still fresh after 575's marks |
| HITL-2 look | Fresh (307, 829) and read (575) states; 464 / 392 px widths |
| HITL-3 timing | `seen-all` 200, `recorded: 182`, **86 ms** (single run possible) |
| HITL-4 Angel | Before 182 to decide; after: `recorded: 182`. The after-screenshot was waived by the user |
| `test-report.md` | Not produced (`/akili-test` not run). Absence accepted by the user's archive decision; unit and HITL evidence above stand in |

## 8. Validation Summary

The full report is in `validation-report.md`. It started with 1 FAIL and 10 WARN. F1 and W1–W7 were fixed in `267f3e30e`, and W9 was closed by the user. No code violated the spec.

## 9. Accepted Warnings Or Follow-Ups

| Item | Disposition |
|---|---|
| W8 `notification-item/CLAUDE.md` ~480 lines (old debt) | Backlog |
| W10 T-6 had no red run | Process note |
| A-a `markSeen` has no recipient scoping (200 vs 404 reveals pending ids) | Follow-up spec if product wants it closed |
| A-b `@Optional()` seen repo fails at request time, not at boot | Follow-up (register the repo in the 2 re-providing modules) |
| A-c Update rows lack the modifier/middle-click guard (design §10.1 premise was false) | Follow-up |
| A-d `search=` not URL-encoded in `generateUrlLink` | Follow-up |
| A-e Refresh race can bounce the badge +1 after opening a request | Follow-up; not observed in HITL |
| Open question: admin 307 has 0 requests to decide | Check the role against `BELL-OQ-1` (outside this spec) |
| Smaller advisories (FK names on the entity, `limit` array → 500, admin ~32k placeholders, etc.) | Listed in `execution.md` / `validation-report.md` §7 |

## 10. Historical Notes

- BRS-T-5 needed 2 attempts. Read rows kept a hard-coded black reference, and the unread dot used a rem offset. Every other task passed first time.
- The user approved running T-4..T-7 without per-task pauses.
- Another session was executing `bilateral/resubmit-rejected-result` in the same checkout. Every commit here staged explicit paths only.
- Browser automation was unavailable (extension not connected), so HITL evidence came from user screenshots and DB queries.
- The P2-3894 fix (`7f11bdbb2`, review-history migration) rode to `staging` in the same merge.
