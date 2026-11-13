# Design — Notification click destinations for bilateral decision and review-request

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notification-decision-deeplinks` |
| Depth | Lite + Bug Mode |
| Implements | `requirements.md` NDDL-R-1..R-5, NFR-1..3 |
| Status | approved 2026-09-24 |

## 2. Executive Summary

Put the destination rule in one place, next to the route util that already knows both destinations, and let the bell and the list call it. The review-request URL is built synchronously from the payload. The decision URL needs the lead center, so a small root service resolves it on click, exactly as the bell does today, with a Result Detail fallback.

## 3. Architecture Overview

| Layer | Change | Requirement |
|---|---|---|
| `shared/routing/bilateral-result-open-route.util.ts` | Extract two pure builders from `resolveBilateralResultOpenRoute`: the center-editor route (`/bilateral/<center>/result/<code>?phase=`) and the review-drawer route (`…/<SP>/bilateral-review?reviewResult=&reviewResultId=`). `resolveBilateralResultOpenRoute` calls them, behavior unchanged | R-1, R-2, NFR-2 |
| New `shared/services/notification-navigation.service.ts` (root) | `reviewRequestUrl(notification)` sync, from payload (`getProgramCode`, `result_code`, `result_id`); `decisionUrl$(notification)` async: `BilateralApiService.GET_centersByResultId` → lead center → center-editor route; on empty or error → Result Detail URL | R-1, R-2, R-3 |
| `pop-up-notification-item.component.ts` `onNotificationClick` | Review-request branch uses `reviewRequestUrl`; decision branch uses `decisionUrl$` instead of `home?result=`; keeps mark-as-read and `itemSelected` | R-1, R-2, R-4 |
| `update-notification.component.{ts,html}` | Review-request `href` becomes the full drawer URL (no handler needed). Decision rows get a click handler that resolves `decisionUrl$` and opens it in a new tab; the `href` stays Result Detail so open-in-new-tab from the context menu still lands somewhere valid | R-1, R-2, R-3, R-4 |

## 4. Data Model

None. The list notification already carries `result_id`, `obj_result.result_code` and `obj_result.obj_version.id` (`update-notification.model.ts`). No server change.

## 5. API Design

No new endpoint. Reuses `GET get/centers/:resultId` through `BilateralApiService.GET_centersByResultId`, the call the bell already makes. Lead center = the entry with `is_leading_result`, else the first, `acronym || code` (same rule as today's bell code).

## 6. Backend Module Design

Not applicable (client only, NDDL-NFR-1).

## 7. Frontend Component Architecture

- **Sync vs async.** Review request is fully derivable from the payload, so the list can render it as a normal link. Decision needs one HTTP call, so it needs a click handler.
- **New tab after an async call.** Browsers block `window.open` outside the click's synchronous turn. For decision rows in the list the handler prevents the default, opens a blank tab synchronously, then sets its location when the URL resolves. If the tab could not be opened (blocked), it falls back to navigating the current tab. Middle-click and ctrl-click keep working through the `href`.
- **Bell.** Stays in-tab through the router, as today.
- **Fallback (R-3).** Result Detail URL, IPSR types (10, 11) keep their `/ipsr/detail` base as in the existing `resultDetailUrl` helper. The service reuses that rule instead of a second copy.
- No new tokens, i18n keys or styles.

## 8. Design Decisions

| DD | Decision | Why / rejected alternative |
|---|---|---|
| DD-1 | One shared service plus two pure builders in the existing util | NFR-2. Rejected: hand-written URLs in each surface (three copies, already drifted once) |
| DD-2 | Decision URL resolved on click, not embedded in the payload | Matches the bell's stated reason ("keep list queries free of extra joins"). Rejected: server payload change (out of proportion for a click target) |
| DD-3 | Review-request `href` carries the full URL in the list | No JS needed, works with middle-click. Rejected: click handler for a value that is already known |
| DD-4 | New tab via a pre-opened blank tab, same-tab fallback | Avoids the popup blocker on an async result without losing the new-tab behavior (R-4). Rejected: `window.open` after the response (blocked), always same tab (changes delivered behavior) |
| DD-5 | Approved and Rejected share the destination | Requested for Approved; Rejected assumed the same (see Risks) |

### Reversion challenge (Step 2.3)

DD-1/DD-2 remove the bell's delivered destination `/bilateral/<center>/home?result=<code>` (NOTIF-R-4). Question: **what does removing it break?**

| Concern | Answer |
|---|---|
| Existing specs | `pop-up-notification-item.component.spec.ts` asserts `['/bilateral','CIAT','home']` (two cases, around lines 235 and 270). They must be updated, not a product break |
| The home page's "result in focus" behavior | Lost for notification clicks; the result page is the direct target the user asked for |
| A Rejected result in the center editor | **Not verified.** `bilateral-approved-open-route` sends Rejected rows to the review drawer, not the editor. If the editor does not render a Rejected result for a center user, Rejected would land on a broken page. Checked at the manual gate; if it fails, Rejected keeps `home?result=` (small design change, not a rewrite) |

One unaddressed item (Rejected editor), routed to the manual check and the Risks table.

## 9. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 3 (util + service, both surfaces, manual check) |
| LOC | about 170 including specs (about 70 source, 100 tests) |
| Review rounds | 1, at most 2 |

Depth check: matches Lite plus Bug Mode. Exceeding these numbers stops execution for the user.

## 10. Risks, Rollback

| Risk | Handling |
|---|---|
| Rejected result may not render in the center editor | Manual check on a Rejected result; fallback to `home?result=` for Rejected only |
| Blank-tab trick leaves an empty tab if the lookup hangs | On error or timeout, set the tab to the fallback URL, never leave it blank |
| Edits the route util owned by the shipped `bilateral-approved-open-route` | Pure extraction, behavior unchanged; its existing util spec must stay green |
| Same files as the wording spec | Wording spec is already committed, so no working-tree overlap |
| Rollback | Revert the commit; clicks return to today's destinations, no data involved |
