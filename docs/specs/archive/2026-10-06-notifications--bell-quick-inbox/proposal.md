# Proposal — Bell quick inbox (notifications in the topbar popover)

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/notifications/bell-quick-inbox/` |
| Slug | `bell-quick-inbox` — derived from free-text argument ("Las notificaciones deben ahora de aparecer acá … aceptar o declinar solicitudes desde esta vista") |
| Type | Change |
| Approval Mode | gated |
| Status | Approved — Santiago Sanchez, 2026-10-05 (Option A; OQ-1..OQ-5 carried to `/akili-specify`) |
| Date | 2026-10-05 |
| Author | Santiago Sanchez (with Claude) |
| Depends on | `notifications/inbox-revamp` (merged inbox, `NOTIF-DD-5` left the bell popup as an explicit follow-up) · `notifications/inbox-paginated-load` (pending/history source split) |
| Parallel-safe | no — touches `results-notifications.service.ts` and `notification-item` decision logic, both also touched by the uncommitted bilateral-project-tagged work on this branch |

## Intent

Turn the bell popover into a **quick inbox**: the user sees what needs their attention without leaving the current page, the bell shows **how many items are waiting**, and contribution requests can be **accepted or declined right there**.

## Problem / Current Behavior

The popover exists (`shell-topbar.component.html:173-210`) and the bell already renders a badge, but both feed off `ResultsNotificationsService.updatesPopUpData`, which is a **"new since you last opened the bell"** feed, not a "what is waiting for me" list:

| # | Fact (verified in code) | Effect for the user |
|---|---|---|
| 1 | `GET notification/updates-pop-up` (`notification.service.ts:888`) returns unread updates **and** pending received requests, both filtered `> users.last_pop_up_viewed` (`share-result-request.service.ts:703`). | A request that is still pending disappears from the bell once it is older than the last time the bell was opened. |
| 2 | Closing the popover (`handleClosePopUp()`, `shell-topbar.component.ts:275`) sets `updatesPopUpData = []` and PATCHes `last-pop-up-viewed`. | Opening the bell once empties it and zeroes the badge — the screenshot's "You have not received any new notifications" state even when decisions are waiting. |
| 3 | The list is fetched once at boot (`app.component.ts:132`) and only grows via socket `unshift` (`websocket.service.ts:105`); sockets are off in both ends per `share-result-request.service.ts:316-319`. | The bell is stale for the whole session; a decision made in the inbox page doesn't update it. |
| 4 | `pop-up-notification-item` is read-only (navigate on click). Accept/Decline lives only in `notification-item` (1,421 LOC) with four branches: ToC-carried accept, primary accept / primary decline with justification dialog (`PDR-T-4`), bilateral accept → "Map to ToC?" prompt → mapping step, and legacy modal-first `mapAndAccept()` (~798 pending rows, P2-3187). | Every decision forces a navigation to `/result/results-outlet/results-notifications`. |

## Proposed Outcome

1. The bell badge shows the **count of items needing attention** = pending received requests (decisions) + unread updates. It does not reset just because the popover was opened; it goes down when a request is decided or an update is read.
2. The popover lists those items, **pending decisions first**, newest first, capped (e.g. 10) with "See all the notifications" kept as the exit.
3. Each pending request row shows **Accept** and **Decline** inline. Simple cases complete in the popover; cases that need a richer step (ToC mapping, decline justification) hand off without losing context.
4. After a decision, the row leaves the popover, the badge decrements, and the inbox page (if open) reflects the same state — one source of truth.
5. Empty state copy only appears when there is genuinely nothing pending or unread.

## Scope

- Client: `shell-topbar` popover + badge, `pop-up-notification-item` (or its replacement), `results-notifications.service.ts` (bell selectors derived from the pending sets).
- Reuse of the existing decision PATCH (`results/request/update`) and existing dialogs — no new decision semantics.
- ~~Legacy `header-panel` bell~~ — dropped in design (2026-10-05): it is not rendered anywhere; out of scope.
- Unit tests for count, ordering, post-decision decrement, and each decision branch's routing (inline vs hand-off).

## Non-Goals

- No new notification types, no change to who receives what.
- No change to the decision rules (approval chain, primary/contributor semantics, ToC mapping rules P2-3187).
- No re-enabling of sockets / real-time push (refresh-on-open + refresh-after-decision is the freshness model).
- No redesign of the full inbox page (`results-notifications`).
- No email changes.

## Affected Users, Systems, And Specs

| Item | Impact |
|---|---|
| Science Program / Center leads and coordinators who receive contribution & primary requests | Primary beneficiaries — decide without navigating. |
| All authenticated users | Badge/popover semantics change from "new since last open" to "waiting for you". |
| `onecgiar-pr-client/src/app/shared/components/shell-topbar/*` | Popover template, badge source, close handler. |
| `.../header-panel/components/pop-up-notification-item/*` | Gains inline actions or is replaced by a compact row. |
| `.../results-notifications/results-notifications.service.ts` | Bell-facing computed list/count from pending sets; refresh-on-open. |
| `.../results-notifications/components/notification-item/*` | Decision logic is the reuse source (extraction candidate). |
| `onecgiar-pr-server` `notification/updates-pop-up`, `auth/user/last-pop-up-viewed` | Possibly unused after the change (Option A) — kept, not deleted, in this spec. |
| Related specs | `notifications/inbox-revamp` (`NOTIF-DD-5` follow-up), `notifications/inbox-paginated-load` (`PAGE-R-*` pending set), `notifications/primary-decline-rejects-result` (`PDR-T-4` justification dialog), `notifications/detail-side-panel` (drawer). |

## Visual Reference

- Source: User screenshot of the current popover (empty state) — no target mockup yet.
- Location: conversation attachment (current state only); no `mockup/` folder yet.
- Notes: the target layout (compact request row with Accept/Decline, badge style, pending-first grouping) is **not** defined. Recommended before `/akili-specify`: generate a mockup under `docs/specs/notifications/bell-quick-inbox/mockup/` (stitch-design → claude-design → self-contained HTML fallback), reusing the row card reference already approved in `inbox-revamp` (`bg-brand-50 text-brand-700` type pill, outlined funding badge, Accept contribution / Decline buttons). UI built with Spartan components per team rule.

## Requirement Delta Preview

### ADDED Requirements

- Bell popover renders inline **Accept / Decline** on pending received requests.
- After a decision from the popover, the item leaves the popover and the badge decrements without a reload.
- The bell list refreshes when the popover opens (pending sets re-fetched / reused if fresh).

### MODIFIED Requirements

- Badge count: from "items created after `last_pop_up_viewed`" → "pending decisions + unread updates".
- Popover content: from the same since-last-viewed feed → the pending set, decisions first, capped, with "See all".
- Closing the popover no longer empties the list or zeroes the badge.

### REMOVED Requirements

- The "seen once, gone from the bell" behavior driven by `last_pop_up_viewed` (the column/endpoint stay; the bell stops depending on them).

## Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Client-only, pending-set driven + hybrid decisions** *(recommended)* | Bell reads computed selectors over the service's existing pending sets (`receivedContributionsPending`, `notificationsPending`) loaded by `refreshPending()`. Inline Accept/Decline for the one-click paths (ToC-carried accept, primary accept, plain decline with confirm). Paths needing more (bilateral "Map to ToC?", primary decline justification, legacy modal-first) open the existing drawer/dialog on the inbox page with that request pre-selected. | No backend change; one source of truth with the inbox page; zero duplication of the 4 decision branches' heavy UI; smallest diff. | Two paths per row (inline vs hand-off) must be clearly signaled; boot needs `refreshPending('received')` too (one extra request). |
| B. Full inline decisions | Extract `notification-item`'s decision logic into a shared service/component and render every branch (prompt, mapping, justification) inside the popover. | Every decision without navigating. | Large refactor of a 1,421-LOC component with many regression-sensitive branches; ToC mapping (`app-cp-multiple-wps`) inside a 400px overlay is poor UX. |
| C. Backend reshape of `updates-pop-up` | Drop the `last_pop_up_viewed` filter server-side, add a `count` field, keep client feed. | Small client diff. | Still a parallel data path that drifts from the inbox's pending set; still stale after decisions; touches a shared endpoint and server tests. |

## Recommended Approach

**Option A.** It fixes the root cause (the bell reading a since-last-viewed feed) by pointing it at the data the inbox already treats as authoritative, so badge, popover and inbox page cannot disagree. It delivers inline Accept/Decline for the majority one-click cases while reusing — not re-implementing — the dialogs that carry real business rules (P2-3187 ToC mapping, `PDR-T-4` justification). Option B can follow later if hand-offs prove frequent.

Implementation sketch (for `/akili-specify` to formalize): decision call extracted from `notification-item.acceptOrReject()` into a small shared method on `ResultsNotificationsService` (single PATCH + `refreshSource('received')`), consumed by both the row and the popover.

## Risks, Dependencies, And Open Questions

| # | Item |
|---|---|
| R-1 | **Uncommitted work on the same files** (`notification-item.*`, `results-api.service.ts`, share-result-request server files) on `qa-development-2026-ss`. Commit or park it before executing this spec. |
| R-2 | Decision regressions: four accept/decline branches. Mitigation: popover never re-implements a branch; it only calls the extracted PATCH path or hands off. Run affected specs before commit (memory: run client tests before commit). |
| R-3 | Badge count could be large for coordinators (~798 legacy pending rows exist). Badge shows `99+`; popover capped. |
| R-4 | Admin users: the pending set's scope for admins (who see everything) may inflate the badge — confirm what admins should count. |
| OQ-1 | Should **unread updates** (informational) count in the badge, or only **pending decisions**? Recommendation: both, decisions shown first. |
| OQ-2 | Inline Decline: plain confirm in the popover, or always hand off? Primary-request decline must hand off (justification required, `PDR-T-4`). |
| OQ-3 | Should opening the popover still mark updates as "seen" (keep `last_pop_up_viewed` for a separate "new" dot), or drop the concept entirely? |
| OQ-4 | Requirement source: is there a Jira ticket (P2-xxxx) to pull acceptance criteria from? |
| OQ-5 | Mockup: generate one before specifying (recommended), or proceed from the `inbox-revamp` row reference? |

## Success Criteria

- With N pending requests and M unread updates, the badge shows N+M (or `99+`) on any page, and still shows it after opening and closing the popover.
- A one-click-eligible request accepted from the popover disappears from the popover, decrements the badge, and appears as resolved in the inbox page without a reload.
- A request needing ToC mapping or a decline justification lands the user in the existing dialog/drawer for that exact request.
- Empty state only when N+M = 0.
- No regression in the existing `notification-item`, `shell-topbar`, `pop-up-notification-item` specs; new specs cover count, ordering, decrement and branch routing.

## Next Step

```text
/akili-specify notifications/bell-quick-inbox
```
