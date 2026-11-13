# Archive Summary — Notification click destinations for bilateral decisions

**Outcome:** shipped, then partly superseded. The bell and the Notifications list opened the right bilateral editor or review drawer from decision and review-request notifications. Since then the inbox revamp changed the list: clicking a row now opens a detail side panel (spec `notifications/detail-side-panel`, archived). The manual deeplink checklist (T-3) no longer applies as written. The code is in `master`.

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/bugfix/notification-decision-deeplinks/` |
| Archive date | 2026-11-13 |
| Archived from branch | `qa-development-2026-ss` (spec branch; integration branch is `staging`) |
| Owner | santiago.sanchez@cgiar.org |
| Ticket | none |
| Depth · Mode | Lite · Bug |
| Final status | **Complete**: T-1 and T-2 `[x]`; T-3 closed as **SUPERSEDED** (not PASS) |

## Requirements delivered

| Requirement | What it guarantees | Status |
|---|---|---|
| `NDDL-R-1` | Decision click opens `/bilateral/<center>/result/<code>?phase=<n>` from bell and list | Delivered, later changed by the inbox revamp (list) |
| `NDDL-R-2` | Review-request click opens the review drawer (`reviewResult`, `reviewResultId`) | Delivered |
| `NDDL-R-3` | Fallback to Result Detail on empty, error or timeout. Never a dead click | Delivered |
| `NDDL-R-4`, `R-5` | Bell marks read and closes; list opens a new tab; other types unchanged | Delivered (mocked tab only) |

## Files changed

| File | Change |
|---|---|
| `shared/routing/bilateral-result-open-route.util.ts` (+spec) | Extracted route builders; resolver behavior unchanged |
| `shared/services/notification-navigation.service.ts` (+spec) | New: `reviewRequestUrl`, `decisionUrl$` with an 8000 ms timeout |
| `pop-up-notification-item.component.ts` (+spec) | Bell navigation through the service; private `resultDetailUrl` removed |
| `update-notification.component.{ts,html}` (+spec) | List decision click opens a blank tab, then sets the URL |
| `notifications/bilateral-review-decision/requirements.md` | NOTIF-R-4 points at this spec |

## Test evidence

| Suite | Result |
|---|---|
| util + service specs | 17 tests green |
| bell, list, service, util | 56 tests green |
| Consumers (results-list, programme-results, global-search-palette) | 307 green |
| `ng lint --quiet` | clean |
| Manual browser check (T-3) | Not run. Superseded |

## Validation summary

No validation report. Each of T-1 and T-2 had a Reviewer PASS on attempt 1. No red run was observed for either task (implementation and specs were written together).

## Accepted gaps / follow-ups

| Item | Status |
|---|---|
| T-3 manual check of bell and list (Approved, Rejected, review-request, popup blocker) | Closed as superseded: the list now opens a side panel |
| Rejected-result editor question (design §10) | Never answered. Moot for the list |
| Bell can lag up to 8 s on a hung lookup; ctrl-click on a list decision row lands on Result Detail | Recorded advisories |
| `?phase=undefined` if `obj_version.id` is missing | Recorded advisory |

## Historical notes

- No pivots, no HALTs, no rework.
- The task file is `task.md` (singular).

## Diagrams

None. The spec has no `diagrams/` folder.
