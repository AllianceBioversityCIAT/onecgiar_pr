# Proposal — Notifications Inbox: Paginated Load & Pending-First

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `notifications/inbox-paginated-load` |
| Slug | `inbox-paginated-load` — derived from free-text argument ("El modulo de notificaciones tarda demasiado en cargar… paginamos… 200 Notificaciones… cargan primero las abordadas…"). Placed under `docs/specs/notifications/` next to its siblings (`inbox-revamp`, `w1w2-center-tagged`, …). |
| Type | Change (performance + load-order; carries a code-confirmed diagnosis, §9) |
| Approval Mode | gated |
| Owner | Santiago Sanchez |
| Date | 2026-09-30 |
| Status | Approved for `/akili-specify` (Santiago Sanchez, 2026-09-30) — open questions OQ-1..OQ-4 / R-2 to resolve during specify |
| Related specs | `bugfix/notifications-inbox-slow-load` (previous pass: parallelized the 3 buckets, deduped admin query; explicitly deferred pagination as option C) · `notifications/inbox-revamp` (unified list, filters, tabs — must keep working) |
| Parent Spec | none |
| Depends on | none · Parallel-safe: no (touches the same service/component as `w1w2-center-tagged`, which is untracked/in progress) |

## 2. Intent

Make the Notifications page open fast by **bounding how much history it loads** (default: the 200 most recent resolved/read notifications, with "Load more"), and make the rows that **need a decision (pending accept/decline) appear first**, not seconds after the already-handled ones.

## 3. Problem / Current Behavior

Two user-visible symptoms:

1. **Slow load.** The page waits on 3 parallel calls (`request/get/received`, `request/get/sent`, `notification/updates`) that return **the user's entire history, unbounded**.
2. **Wrong order of arrival.** Already-handled rows (Sent + Updates) paint first; the pending-decision rows paint several seconds later.

Root causes, confirmed by reading the code (not yet timed — see §12):

| # | Finding | Where |
|---|---|---|
| RC-1 | **No limit anywhere.** The `done` bucket (accepted/declined, `request_status_id IN (2,3)`) and `read: true` updates have no `take`, no date window. For admins (`role === 1`) `done` is *every resolved request in the system*. | `share-result-request.service.ts::buildWhereReceivedConditions` / `buildWhereSentConditions` / `getRequest`; `notification.service.ts::getAllNotifications` |
| RC-2 | **`version_id` is sent but ignored.** The client passes `?version_id=<phase>`; `findReceived`, `findSent` and `getAllNotifications` don't read it, so all phases come back every time. The phase dropdown only scopes the Program facet. | `share-result-request.controller.ts:91,137`, `notification.controller.ts:88` vs `results-api.service.ts:749-761` |
| RC-3 | **Heavy relation graph per row** incl. two one-to-many joins (`result_center_array → clarisa_institution`, `obj_result_by_project → clarisa_project`) → row multiplication in the SQL result before TypeORM folds it. Cost scales with RC-1. | `getRequestRelations()` |
| RC-4 | **Pending rows ship in the heaviest response.** Received *pending* (small) and Received *done* (unbounded) come in the same payload, so pending can't render until the whole history is serialized. Sent + Updates are lighter and win the race → "abordadas" show first. | `getReceivedResultRequest` → `fetchThreeBucketsDeduped` |
| RC-5 | **`Promise.all([await …, await …])`** — every query in `getAllNotifications` is `await`ed inside the array, so the 7 queries run **sequentially**, not in parallel. | `notification.service.ts:640-…` |
| RC-6 | Client getters `unifiedList → filteredUnifiedList (7 pipes) → sourceScopedList → tabFilteredList → groupedTabList` are plain getters, recomputed on every change-detection pass over the full array. Secondary, but grows with RC-1. | `results-notifications.component.ts:124-170` |

## 4. Proposed Outcome

- **Pending first:** rows that need your decision load through their own small request and render before anything else; the page shows a skeleton until they arrive, never a half list that later reshuffles.
- **Bounded history:** resolved requests + read updates load the **200 most recent** (newest first) for the selected phase; a **"Load more"** control fetches the next 200.
- **Phase is honored server-side:** `version_id` actually scopes Received / Sent / Updates.
- Unread updates and pending requests are **always complete** (never paginated) so badges/counts for "Needs your decision" stay exact.
- No change to row content, tabs, filters' UI or decision logic from `inbox-revamp`.

## 5. Scope

- **Server** — `api/results/share-result-request` (controller + service): honor `version_id`; split pending vs. done; `take`/cursor on done. `api/notification` (`getAllNotifications`): honor `version_id`, `take`/cursor on viewed, remove the sequential `await`s (RC-5).
- **Client** — `results-notifications.service.ts` + `results-notifications.component.*`: pending-first fetch order, single initial loading state, "Load more" (Spartan button per team rule), append-not-replace on next page; convert the getter chain to `computed()` signals if cheap (RC-6).
- `results-api.service.ts`: new/extended methods (`GET_…` naming).
- Tests: server Jest for the new query params; client Jest for service paging + pending-first ordering (scoped `--testPathPattern`).

## 6. Non-Goals

- Moving the filter toolbar (Center, Bilateral project, Type, Funding, Result type, Search) to the server. Filters keep running client-side over **loaded** rows (see Risk R-1).
- Changing notification content, types, email microservice, settings tab, IPSR notifications.
- Header bell pop-up (`updates-pop-up`, `received` pop-up) — already bounded by `last_pop_up_viewed`.
- Infinite scroll / virtual scroll — "Load more" button only.
- DB index work — only if measurement after this change still shows slow queries (separate spec).

## 7. Affected Users, Systems, And Specs

| Area | Path | Impact |
|---|---|---|
| All users opening Notifications | `/result/results-outlet/results-notifications` | Faster load, pending first, "Load more" at the end of history |
| Admins (`role === 1`) | same | Biggest gain — today they load every resolved request in PRMS |
| Server | `share-result-request.controller.ts` / `.service.ts`, `notification.controller.ts` / `.service.ts` | Query params + limits; response shape additive (`hasMore`/cursor) |
| Client | `results-notifications.service.ts`, `.component.ts/.html`, `utils/build-unified-list.ts`, `shared/services/api/results-api.service.ts` | Fetch order, paging state, Load more |
| Specs | `inbox-revamp` (behavior must hold), `bugfix/notifications-inbox-slow-load` (extends its deferred option C), `w1w2-center-tagged` (in progress, same files — merge risk) | — |

## 8. Visual Reference

- Source: None
- Location: —
- Notes: Only new UI is a "Load more" button + "Showing N of history" hint at the end of the list, and the initial skeleton (existing `skeleton-notification-item`). Built with Spartan; no mockup needed unless you want one.

## 9. Requirement Delta Preview

### ADDED
- Pending requests (received, `request_status_id = 1`) are fetched in a dedicated call issued first; the list renders after they arrive.
- Resolved requests and read updates are paged: page size **200** (configurable constant), newest first, cursor by date+id, `hasMore` flag.
- "Load more" control appends the next page; disabled/hidden when `hasMore = false`.

### MODIFIED
- `GET request/get/received`, `GET request/get/sent`, `GET notification/updates` honor `version_id`.
- `getAllNotifications` runs its queries concurrently.
- Initial page state: one skeleton until pending + first page are in, instead of three independent loading flags painting progressively.

### REMOVED
- Unbounded history load on page open.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — Pending-first + capped history (recommended)** | Pending & unread: complete, own call, first. Done & read: `take 200` + cursor, "Load more". Honor `version_id`. Fix RC-5. Filters stay client-side. | Fixes both symptoms; additive API change; filters/tabs from `inbox-revamp` keep working; badge for "Needs your decision" stays exact | Filters/facets only see loaded history (R-1) |
| B — Full server-side pagination of a unified feed | One new endpoint merging received/sent/updates with server-side filters, facets and counts | Correct filters over all history; smallest payloads | Rewrites `inbox-revamp`'s client filtering + facets; big server work; high regression risk |
| C — Client-only pagination (render 200 rows) | Keep fetching everything, render 200 | Trivial | Doesn't fix network/DB time — the actual bottleneck; doesn't fix order |

## 11. Recommended Approach

**Option A.** It attacks the real cost (unbounded, all-phase history: RC-1/RC-2) and the ordering symptom (RC-4) with additive server changes, while leaving the `inbox-revamp` filtering model intact. RC-5 is a free win. RC-6 (signals) is included only if it stays local to the component.

## 12. Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | Filters/search only cover loaded history. Mitigation: show a hint ("Filtering the latest 200 — load more to search older"). If unacceptable → Option B later. |
| R-2 | Honoring `version_id` changes what users see: today every phase shows; after, only the selected phase. Is that the intended behavior of the Phase dropdown? (Likely yes — it's labelled as a filter and defaults to the active phase.) |
| R-3 | Merge conflicts with in-progress `w1w2-center-tagged` (same service/component). Sequence after it or rebase. |
| R-4 | Timing not yet measured. `/akili-specify` should capture a baseline (network tab: 3 call durations + payload sizes, admin and non-admin) so we can prove the gain. |
| OQ-1 | Page size **200** — applied per feed (resolved received, resolved sent, read updates), or 200 total across the merged list? Recommend **per feed** (simpler, cursor per source). |
| OQ-2 | Should "Load more" exist, or is "last 200 + phase filter" enough? |
| OQ-3 | Should the "Needs your decision" count include pending rows from other phases (badge across all phases) or only the selected phase? |
| OQ-4 | Is there a Jira ticket to link? |

## 13. Success Criteria

- Pending-decision rows are visible **before** any resolved row; no reshuffle after first paint.
- Initial payload for an admin is bounded (≤ 200 resolved per feed + all pending/unread) regardless of total history.
- Measured page-ready time drops vs. the baseline captured in specify (target to be set from the baseline).
- Phase dropdown changes the server result.
- `inbox-revamp` tabs, filters, badges and drawer behave as before on loaded rows; scoped Jest specs green.

## 14. Next Step

```text
/akili-specify notifications/inbox-paginated-load
```
