# Design — Notifications Inbox: Paginated Load & Pending-First

## 1. Summary

| Field | Value |
|---|---|
| Spec | `notifications/inbox-paginated-load` · Standard · gated · approved 2026-09-30 |
| Requirements | `requirements.md` PAGE-R-1..R-7, R-10, R-11 |
| Shape | **Server:** 3 existing endpoints gain optional `version_id` handling, `scope` (`pending` \| `history`) and `cursor`; history is keyset-paginated at a fixed 200/source. **Client:** the service splits each source into a pending load and a history load, renders when pending is in, appends history pages on "Load more". |
| Not changed | Row shapes, response keys, pop-up endpoints, filter pipes, tabs, drawer, decision logic |

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| PAGE-P-1 | Received/Sent/Updates controllers ignore `version_id` | `share-result-request.controller.ts:132-134,177-179`; `notification.controller.ts:88-91` | Handlers take only `@UserToken() user`; no `@Query` | verified | Phase scoping already exists — PAGE-T-2/T-3 shrink to paging only |
| PAGE-P-2 | `result.version_id` is the phase key, reachable as `obj_result.version_id` in `find` where-conditions | `getReceivedResultRequestPopUp` (`share-result-request.service.ts:515-517`) | Already filters `obj_result: { version_id: version.id }` in the same where-builder | verified | Need a different join path; re-design §5 |
| PAGE-P-3 | `getAllNotifications` runs its 7 queries sequentially | `notification.service.ts:640-716` | Array passed to `Promise.all` contains `await this._notificationRepository.find(...)` items — each awaited before the next array element is evaluated | verified | PAGE-R-7 is a no-op; drop that part of PAGE-T-3 |
| PAGE-P-4 | Keyset columns exist and are unique-tiebreakable | `share-result-request.entity.ts:28-31,168-172` (`share_result_request_id` PK, `requested_date`); `notification.entity.ts:16-19,90-94` (`notification_id` bigint PK, `created_date`) | Read entity decorators | verified | Need offset paging instead (DD-2 rejected alternative) |
| PAGE-P-5 | `updatesData`/`receivedData`/`sentData` are rendered only by `results-notifications.component.*` | grep across `onecgiar-pr-client/src/app` (excluding the service and specs) | Only `results-notifications.component.ts` (5) and `.html` (3) reference them | verified | Another screen would see truncated history — must be paged-aware too |
| PAGE-P-6 | Out-of-inbox callers that trigger full reloads: `app.component.ts:129`, `header-panel.component.ts:172` (updates at boot), `websocket.service.ts:109,111` (received / updates on socket), `share-request-modal.component.ts:239` (received after accept) | grep `get_section_information\|get_updates_notifications\|get_sent_notifications` | All 4 call without `version_id` and replace the whole source today | verified | A missed caller would overwrite phase-scoped, paged state with an all-phases first page |
| PAGE-P-7 | Phase-less updates are exactly the bilateral AI-job-finished type (no `result_id`); Center notices do have a result | `notification.service.ts:230-280` doc comments + `findBilateralAiJobFinishedNotifications` (no `obj_result` condition) vs `findCenterNoticeNotifications` (filters `obj_result.is_active`) | Read both finders | verified | Some other type also lacks a result → it would vanish under phase scoping; add it to the phase-less branch |
| PAGE-P-8 | TypeORM `find` with `take` + one-to-many `relations` paginates by root entity (distinct ids first), not by joined rows | TypeORM docs / behavior of `find` with `skip/take` + joins | Verified in PAGE-T-2 from TypeORM source: `entity-manager/EntityManager.js:531-536` + `query-builder/SelectQueryBuilder.js:1960-2014` (DISTINCT root ids first when take + joins) | verified (2026-09-30) | Page could hold < 200 roots; switch to `QueryBuilder` with explicit id sub-select (listed in §13) |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Path |
|---|---|
| Server — requests | `onecgiar-pr-server/src/api/results/share-result-request/` (controller, service) |
| Server — updates | `onecgiar-pr-server/src/api/notification/` (controller, service) |
| Server — shared helper | `onecgiar-pr-server/src/shared/utils/keyset-cursor.util.ts` (new) |
| Client — API | `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` |
| Client — state | `.../results-notifications/results-notifications.service.ts` |
| Client — view | `.../results-notifications/results-notifications.component.{ts,html}` |
| Client — external callers | `app.component.ts`, `header-panel.component.ts`, `sockets/websocket.service.ts`, `share-request-modal.component.ts` |

### 2.2 Sequence — inbox open (phase P)

1. Component → service `loadInbox(P)`: bumps a **load generation**, clears state, sets `initialLoading = true`.
2. Service fires **6 requests at once**: `scope=pending` ×3 (received, sent, updates) and `scope=history` ×3 (first page, no cursor).
3. When all 3 pending responses arrive → `initialLoading = false`, list renders (pending + whatever history already arrived).
4. Each history response → appended to its source; `hasMore`/`nextCursor` stored; a "Loading history…" row shows at the list end while any first history page is outstanding.
5. "Load more" → `scope=history&cursor=<next>` for every source with `hasMore`; append.
6. Any response whose generation ≠ current generation is dropped (phase changed meanwhile).

## 3. Data Model Changes

None. No migration (`migration:check` unaffected).

## 4. API Surface

### 4.1 Changed endpoints (all additive)

| Endpoint | New optional query params | Response change |
|---|---|---|
| `GET /api/results/request/get/received` | `version_id`, `scope`, `cursor` | adds `doneMeta: { hasMore, nextCursor }` next to the existing keys |
| `GET /api/results/request/get/sent` | same | adds `doneMeta` |
| `GET /api/notification/updates` | same | adds `viewedMeta: { hasMore, nextCursor }` |

Rules:

| `scope` | Pending keys (`*Pending`, `notificationAnnouncement`) | History keys (`*Done`, `notificationsViewed`) |
|---|---|---|
| absent (legacy) | complete | first page (200) + meta |
| `pending` | complete | `[]`, meta `{hasMore:false, nextCursor:null}` |
| `history` | `[]` | page after `cursor` (or first page if none) + meta |

- `version_id` absent → no phase condition (today's behavior). Present → must be a positive integer, else 400.
- `cursor` is opaque base64url of `<ISO date>|<id>`; malformed → 400. Page size is a server constant (`200`), **not** a client parameter.
- Client method names (`HTTP_METHOD_descriptiveName`): extend `GET_allRequest`, `GET_sentRequest`, `GET_requestUpdates` with an options object `{ versionId?, scope?, cursor? }`; no new method names needed.

### 4.2 Bilateral / platform-report impact

None — these endpoints are not part of `/api/bilateral/*`.

## 5. Server Workflow / Business Rules

**Phase (PAGE-R-1).** The where-builders (`buildWhereReceivedConditions`, `buildWhereSentConditions`) already accept `extraConditions` that deep-merge into `obj_result` (P-2); `version_id` is passed through that path so pending and done buckets both receive it. In `getAllNotifications`, the result-scoped queries and the Center-notice finder add `obj_result.version_id`; the AI-job finder stays unfiltered (P-7, PAGE-OQ-5).

**Pending (PAGE-R-2).** Unchanged queries, no `take`. `scope=history` skips them entirely (not "run and discard").

**History (PAGE-R-3).** Keyset pagination ordered `(date DESC, id DESC)`:

- Cursor `(d, i)` becomes an OR of two where-entries per existing entry: `date < d` and `date = d AND id < i`. Non-admin `done` is already a 2-entry OR array → becomes 4 entries; admin 1 → 2.
- Fetch `take = 201`; `hasMore = rows > 200`; return the first 200; `nextCursor` = last returned row's `(date, id)`.
- Updates `notificationsViewed` is a merge of 3 queries (result-scoped read, AI-job read, Center-notice read): each gets the same cursor + `take 201`, results are merged, sorted `(created_date DESC, notification_id DESC)`, cut to 200; `hasMore` = merged length > 200 **or** any sub-query returned 201.
- ToC enrichment (`enrichBucketsOnce`) runs over pending + the returned page only.
- Helper `keyset-cursor.util.ts`: encode/decode/validate cursor, expand a where (object or array) with the keyset OR, and slice a fetched list into `{ rows, hasMore, nextCursor }`. Pure functions — unit-testable without a DB.

**Concurrency (PAGE-R-7).** Remove the inner `await`s so the queries start together.

**Errors.** Invalid `version_id`/`cursor` → 400 via the existing handlers-error path; other failures unchanged.

## 6. Frontend Plan

### 6.1 Routes / modules

No route changes.

### 6.2 Components & services

**`ResultsNotificationsService`** — per source `{ pending, history, nextCursor, hasMore, historyLoading }`; existing `receivedData` / `sentData` / `updatesData` stay as the **view** the component reads (`*Pending` = pending, `*Done`/`notificationsViewed` = accumulated history), so pipes and `buildUnifiedList` are untouched.

| Method | Behavior |
|---|---|
| `loadInbox(phaseId?)` | generation++, reset, fire 6 requests (§2.2), gate `initialLoading` on the 3 pending |
| `loadMore()` | for each source with `hasMore && !historyLoading`: request next page, append; on error keep rows, clear busy |
| `refreshSource(source)` | pending + first history page for that source at current `phaseFilter`; replaces that source's history (Load-more pages of that source are dropped) |
| `refreshPending(source)` | pending only for current `phaseFilter` — for callers outside the inbox |
| `onPhaseChange(phaseId)` | now delegates to `loadInbox(phaseId)` |
| `get_section_information` / `get_sent_notifications` / `get_updates_notifications` | kept as thin wrappers over `refreshSource(...)` so existing callers and specs keep compiling |

Sorting stays client-side for pending (as today); history pages arrive pre-sorted and are appended.

**External callers (P-6):**

| Caller | Today | After |
|---|---|---|
| `app.component.ts:129`, `header-panel.component.ts:172` (boot) | full updates history, all phases | `refreshPending('updates')` |
| `websocket.service.ts:109,111` | full received / updates reload | `refreshSource('received' \| 'updates')` at current phase |
| `share-request-modal.component.ts:239` | full received reload | `refreshSource('received')` |

**`ResultsNotificationsComponent`**

- Skeleton list while `initialLoading`; then rows.
- A trailing "Loading history…" skeleton row while any first history page is outstanding.
- Footer: Spartan `hlmBtn` (variant `outline`) "Load more", shown iff any source `hasMore`; `[disabled]` + `aria-busy` while loading.
- Hint (PAGE-R-10) when `activeFilterCount > 0 || searchFilter` and any `hasMore`: "Filters apply to loaded notifications. Load more to include older ones."
- PAGE-R-11: memoize `unifiedList → … → groupedTabList` by input identity (source arrays + filter values + tab + side); recompute only on change. Arrays are replaced (not mutated) on append so identity changes when data does.

### 6.3 Design system usage

Spartan `hlmBtn` for Load more; existing `skeleton-notification-item` for skeletons; existing text/muted tokens for the hint. No new tokens.

### 6.4 Real-time UX

Socket events refresh only the affected source at the current phase (above). Toasts unchanged.

## 7. Security & Authorization

Cursor only narrows the existing where-conditions (it is ANDed into each entry), so it cannot widen visibility. No new roles. Nothing new is logged; cursor/token never logged (`.cursorrules`).

## 8. Performance & Capacity

| Before | After |
|---|---|
| Unbounded rows × deep relations, all phases | Pending (phase) + ≤ 200 history per source |
| Updates: 7 sequential queries | 7 concurrent |
| Pending blocked behind history serialization | Separate request; renders first |

Cost: 6 HTTP requests instead of 3 on open (pending/history split). Acceptable: each is smaller, and they run in parallel. Measured in PAGE-T-7.

## 9. Observability

No new logs. Measurement is manual (PAGE-T-7).

## 10. Testing Plan

| Layer | What | Spec file |
|---|---|---|
| Server unit | cursor encode/decode/invalid; where expansion for object and array; slice to 200 + `hasMore`; tie on equal dates | `shared/utils/keyset-cursor.util.spec.ts` (new) |
| Server service | `version_id` reaches pending + done where; `scope` skips the other set; legacy no-param shape; admin bounded | `share-result-request.service.spec.ts` |
| Server service | phase on result-scoped + Center-notice queries, not AI-job; viewed merge-sort-cut across 3 queries; queries start concurrently (deferred mocks) | `notification.service.spec.ts` |
| Server controller | query params parsed; 400 on bad `version_id`/`cursor` | `notification.controller.spec.ts`, share-request controller spec (new if absent) |
| Client service | history-before-pending race keeps `initialLoading` until pending; generation guard drops stale phase responses; loadMore append + error; refreshSource | `results-notifications.service.spec.ts` |
| Client component | Load more visibility/busy; hint; memoized derivation recomputes on change only | `results-notifications.component.spec.ts` |
| Manual | before/after timing; visual Load more/hint | PAGE-T-7 |

All runs scoped with `--testPathPattern` (team rule: no full suites).

## 11. Backwards Compatibility & Migration Plan

- Server ships first and is backward compatible: legacy callers (no params) get complete pending + a bounded first page — the only change they observe is history capped at 200, which the old client would render as "fewer rows". Deploy server and client together in the same release to avoid that interim state.
- Rollback: revert client → legacy calls still work against new server; revert server → new client's extra params are ignored and `doneMeta` absent → client treats missing meta as `hasMore:false`.

## 12. Design Decisions

### PAGE-DD-1 — Split pending and history into separate requests per source

Pending is small and decision-critical; history is large. Separate requests let pending render first (PAGE-R-2) and let history page independently. **Rejected:** one request per source returning both (today's shape) — pending would still wait for history serialization; one unified feed endpoint (proposal Option B) — would move filters server-side.

### PAGE-DD-2 — Keyset (date, id) cursor, fixed 200, server-owned

Stable under inserts (new notifications arriving between pages do not shift offsets) and tie-safe via id. **Rejected:** `skip/take` offset — duplicates/gaps when rows arrive between clicks; client-supplied `limit` — lets a client request unbounded pages.

### PAGE-DD-3 — Additive `scope` param on existing endpoints

Keeps routes, method names, and every existing caller working (PAGE-R-6). **Rejected:** new `/pending` and `/history` routes — more surface, duplicate guards/docs.

### PAGE-DD-4 — Keep `receivedData`/`sentData`/`updatesData` as the view model

Pipes, `buildUnifiedList`, counts and templates stay untouched; only how the arrays are filled changes. Minimizes regression on `inbox-revamp`.

### PAGE-DD-5 — Boot-time updates fetch becomes pending-only *(reversion)*

The app shell and header load the full updates history on every app boot, though only the inbox renders it (P-5). They now load the unread set only.
**Reversion challenge — "what does removing this break?"** Checked: (a) the bell uses `updatesPopUpData` (separate endpoint) — unaffected; (b) the inbox always reloads via `loadInbox` on entry (`getAllPhases` → `onPhaseChange`), so viewed history is fetched there anyway; (c) "Mark all as read" acts on `notificationsPending`, which is still loaded. No breakage found.

### PAGE-DD-6 — Socket/accept refresh replaces one source's history *(reversion)*

Today a socket event reloads the whole source; after, `refreshSource` reloads pending + first page of that source, discarding that source's Load-more pages.
**Reversion challenge:** breaks "scroll position in deep history" for that source after a live event — user loses extra pages of that source only. Accepted: same as today (today also reloads), and correctness of the pending set matters more. Recorded, not fixed.

### PAGE-DD-7 — Generation guard on loads

Any response from a superseded load is ignored, preventing phase-A rows landing in phase-B state (PAGE-R-5).

### PAGE-DD-8 — Memoize the list derivation instead of a signals rewrite

PAGE-R-11 is a SHOULD; a full signal migration of the service would touch every template binding. An identity-keyed cache in the component gets the same effect locally.

## 13. Open Gaps & Follow-ups

- **PAGE-P-8 (verified 2026-09-30 in PAGE-T-2):** TypeORM `find` + `take` + joins selects DISTINCT root ids first — pages hold distinct roots; no QueryBuilder rewrite needed.
- **PAGE-OQ-5 (assumption):** phase-less updates always shown — confirm at the requirements review.
- Merge order with `notifications/w1w2-center-tagged` (same service/component).
- Server-side filters (Option B) remain a follow-up if R-1 hint proves insufficient.

## Design Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Tasks | 7 (3 server, 3 client, 1 manual measurement/visual) |
| LOC | ~900 total: server ~250 + tests ~250; client ~200 + tests ~200 |
| Review rounds | ≤ 2 per task |

Depth check: Standard fits (API contract + cross-package, no data migration). **Tripwire:** if execution exceeds 9 tasks or ~1 200 LOC, the Leader stops and escalates.

## Required cross-references

`requirements.md` · `proposal.md` · `docs/trd/trd.md` W4, module *Notification* · `docs/ux-ui/design.md` notifications inbox · `docs/specs/bugfix/notifications-inbox-slow-load/design.md` (PERF-DD-1..3 kept intact) · `docs/specs/notifications/inbox-revamp/design.md` (NOTIF-DD-1, NOTIF-DD-6 kept intact).
