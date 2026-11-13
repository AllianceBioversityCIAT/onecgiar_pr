# Proposal — Notification clicks open the wrong destination (decision + submitted-for-review)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notification-decision-deeplinks` |
| Slug | `notification-decision-deeplinks` (given by the user in the request) |
| Type | Bug |
| Approval Mode | gated |
| Source | User test, 2026-09-24, local stack, result 9544 (CIMMYT lead, SP01 primary, submitter Angel Jarrin) |
| Depends on | none in code. Same PR as `bugfix/notification-decision-center-wording` (executed, uncommitted) |
| Parallel-safe | **no** — edits `update-notification.component.html`, `pop-up-notification-item.component.{ts,html}` and their specs, the same files the wording spec touched. Specify and execute after that spec is committed, or on top of its working tree |
| Related | `notifications/bilateral-review-decision` (NOTIF-R-4), `bugfix/bilateral-approved-open-route` (shipped the route util reused here) |
| Status | approved 2026-09-24 |

## Intent

Clicking a bilateral notification must land where the reviewer or center user can act, not on a generic page.

## Problem / Current Behavior

| # | Notification | Where the user clicks | Lands on | Should land on |
|---|---|---|---|---|
| 1 | `✅ Your Result 9544 … has been Approved by the Science Program SP01.` (center user / submitter) | Notifications list | `/result/result-detail/9544/general-information?phase=36` | `/bilateral/CIMMYT/result/9544?phase=36` |
| 2 | `The result 9544 - … was submitted for your review by CIMMYT.` (SP reviewer) | Notifications list and bell pop-up | `/result-framework-reporting/entity-details/SP01/bilateral-review`, queue only | same page with the pending result's review drawer open |

## Bug Diagnosis

### Observed Symptom

See table. In #2 the user must find the row and open the drawer by hand. The reference screenshot shows the queue filtered with `?search=9544` and the drawer open.

### Reproduction Steps

1. Angel (Center User of CIMMYT) submits result 9544 for review; SP01 member has a "submitted for your review" notification.
2. SP01 member clicks it (bell or list): queue opens, no drawer.
3. SP01 member approves. Angel opens Notifications, clicks the Approved row: lands in Result Detail.

### Root Cause (confirmed by reading the code, not yet reproduced with a debugger)

| # | Cause | Evidence |
|---|---|---|
| 1 (list) | The list template has no bilateral-decision branch: its `@let resultUrl` is either the review queue (submitted) or `/result/result-detail/...` for every other type, decision types included | `update-notification.component.html:5-8` |
| 1 (pop-up) | The bell handler does route decisions to the bilateral center, but to `/bilateral/<acronym>/home?result=<code>`, not to `/bilateral/<acronym>/result/<code>?phase=` | `pop-up-notification-item.component.ts:139-150` |
| 2 | Both surfaces build the review URL from the program code only. The drawer is opened by the query params `reviewResult` and `reviewResultId`, which neither adds | `update-notification.component.html:7`, `pop-up-notification-item.component.ts:108`; params defined in `bilateral-results.service.ts:7,14` and already produced by `resolveBilateralResultOpenRoute` (`review-drawer` kind) |

### Impact & Scope

- Only the click destination. No payload, server, migration or copy change.
- The notification list payload carries no lead center. The bell resolves it on click via `GET_centersByResultId` (`pop-up...ts:139`); the list would need the same, or the route can resolve it after landing.
- `bilateral-approved-open-route` (shipped) already routes Approved W3 rows to `/bilateral/<center>/result/<code>?phase=` from other lists; notifications were left out.

### Fix Strategy

Reuse `resolveBilateralResultOpenRoute` (`shared/routing/bilateral-result-open-route.util.ts`) so notifications, Results Center and Programme Results share one destination rule. `/akili-specify` (Lite) in Bug Mode with a regression test per surface (list and bell), red before, green after.

## Proposed Outcome

| Notification | Destination |
|---|---|
| Approved / Rejected decision | `/bilateral/<lead center>/result/<code>?phase=<version>` from both the list and the bell. Fallback to Result Detail when no lead center resolves |
| Submitted for your review | `/result-framework-reporting/entity-details/<SP>/bilateral-review?reviewResult=<code>&reviewResultId=<id>`, drawer open |

## Scope / Non-Goals

| In | Out |
|---|---|
| Click destination in the list and the bell for these three notification types | Notification copy (done in the wording spec) |
| Mark-as-read behavior stays as is | Recipients, server, socket |
| Reuse the existing route util | Other notification types (tagged, contribution, requests) |

## Affected Users, Systems, And Specs

SP reviewers and Center Users. Client only. Amends NOTIF-R-4 of `notifications/bilateral-review-decision`; builds on `bugfix/bilateral-approved-open-route`.

## Visual Reference

Source: none needed (navigation only). The user's screenshot of the drawer open at `…/bilateral-review?search=9544` is the expected end state.

## Approach Options

| Option | Trade-off |
|---|---|
| A. Reuse `resolveBilateralResultOpenRoute` in list and bell (recommended) | One rule, matches the shipped fix. Needs the lead center, so the list must resolve it on click as the bell does |
| B. Add the URLs by hand in each template | Smaller diff, but a third copy of the destination rule that will drift |
| C. Ask the server to include the lead center in the notification payload | Clean client, but a server and payload change, out of proportion for a click target |

## Recommended Approach

Option A. A shared click handler for both surfaces keeps the two from diverging again.

## Risks, Dependencies, And Open Questions

| # | Question / Risk | Default assumption |
|---|---|---|
| OQ-1 | Do the pop-up decision clicks also move from `/bilateral/<c>/home?result=` to `/bilateral/<c>/result/<code>?phase=`? | Yes, same destination as the list. Amends NOTIF-R-4's "home with the result in focus" |
| OQ-2 | Drawer deep link: `reviewResult`+`reviewResultId` (what the util already builds) vs `search=<code>` (what the screenshot shows)? | `reviewResult`/`reviewResultId`; verify in the browser that the drawer opens, and that `search` is not needed |
| OQ-3 | The list anchor is `target="_blank"` with a plain `href`; a lead-center lookup needs a click handler | Keep new-tab behavior via an explicit `window.open` or router URL tree; decide in `/akili-specify` |
| Risk | Touches the same files as the uncommitted wording spec | Land after it, same PR |

## Success Criteria

- From the list and the bell, an Approved/Rejected click opens `/bilateral/<center>/result/<code>?phase=<version>`.
- A "submitted for your review" click opens the review queue with that result's drawer already open.
- A notification whose lead center cannot be resolved still opens Result Detail (no dead click).
- Regression specs for both surfaces are red on current code and green after.

## Next Step

```
/akili-specify bugfix/notification-decision-deeplinks
```
