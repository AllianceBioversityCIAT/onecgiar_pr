# Design — notifications/bell-read-state

> **In one line:** a new `share_result_request_seen` table records who saw which pending request.
> The received-requests payload carries a `seen` flag for the caller. The client counts
> `unseen requests + unread updates` for the badge, lists read items under "Earlier", and
> "Mark as read" calls the existing `read-all` **and** a new `seen-all` in parallel.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-read-state` |
| Depth | Full |
| Status | approved (2026-10-06, Santiago Sanchez). Design review (judgment-day) offered and not run, by user choice. |
| Requirements | `requirements.md` (`BRS-R-1..R-9`, `D1..D8`) |
| Visual source | `mockup/bell-read-state.html` |
| Baseline | `docs/trd/trd.md` (notifications module, share-request workflow), `docs/ux-ui/design.md` §7 tokens, §10 a11y |
| Builds on | `archive/2026-10-06-notifications--bell-quick-inbox` (bell snapshot, `refreshBell`, tabs, `markAllBellUpdatesRead`) |

## 2. Executive Summary

| Concern | Decision |
|---|---|
| Where "seen" lives | New join table `share_result_request_seen (share_result_request_id, user_id, seen_date)`, unique per pair (`BRS-DD-1`) |
| How the client learns it | `GET request/get/received` adds `seen: boolean` to each **pending** row, for the calling user (`BRS-DD-2`) |
| Mark one seen | `PATCH request/seen/:shareResultRequestId` (`BRS-DD-3`) |
| Mark all seen | `PATCH request/seen-all`: one bulk insert-ignore over the caller's pending set (`BRS-DD-3`) |
| "Mark as read" | Client calls `notification/read-all` + `request/seen-all` in parallel, then refreshes (`BRS-DD-4`) |
| Read rows in the bell | Loaded **only when the popover opens**, max 10, via a new optional `limit` on the updates history call (`BRS-DD-5`) |
| Badge | `bellCount = unseenRequests + unreadUpdates` (`BRS-DD-6`) |

## 3. Architecture Overview

```
Topbar bell (shell-topbar) ── reads ──► ResultsNotificationsService (bell snapshot)
   │  badge = unseen + unread                │  refreshBell(): received(pending, +seen) + updates(pending)
   │  tabs: Decide=pending, Updates=unread   │  loadBellReadUpdates(): updates(history, limit 10) — on open
   │  rows: fresh ▸ "Earlier" ▸ read         │  markRequestSeen(row) / markAllBellRead()
   ▼                                          ▼
pop-up-notification-item (row look, click)   ResultsApiService
Inbox page (notification-item drawer,         ├─ GET  request/get/received?scope=pending   (+ seen flag)
  "Mark all as read")                         ├─ PATCH request/seen/:id                    (new)
                                              ├─ PATCH request/seen-all                    (new)
                                              ├─ PATCH notification/read-all               (unchanged)
                                              └─ GET  updates ?scope=history&limit=10      (limit is new)
Server: ShareResultRequestModule ── owns ──► share_result_request_seen (new) ─FK─► share_result_request, users
```

No new module. The seen table belongs to the share-request sub-module because the pending set (`buildWhereReceivedConditions`) already lives there. The notification module is untouched except for the additive `limit`.

## 4. Extended Directory Structure

```
onecgiar-pr-server/src/
├── migrations/<ts>-AddShareResultRequestSeen.ts                     (new)
└── api/results/share-result-request/
    ├── entities/share-result-request-seen.entity.ts                  (new)
    ├── repositories/share-result-request-seen.repository.ts          (new)
    ├── share-result-request.service.ts        (+ seen flag, markSeen, markAllSeen)
    ├── share-result-request.controller.ts     (+ 2 PATCH routes)
    └── share-result-request.module.ts         (+ entity / repository)
onecgiar-pr-server/src/api/notification/
    ├── notification.controller.ts             (+ optional `limit` query)
    └── notification.service.ts                (history page size honours `limit`)

onecgiar-pr-client/src/app/
├── shared/services/api/results-api.service.ts                 (+ PATCH_markRequestSeen, PATCH_markAllRequestsSeen, limit option)
├── pages/results/.../results-notifications/results-notifications.service.ts   (counts, read rows, mark seen/all)
├── pages/results/.../results-notifications/results-notifications.component.html (Mark all → shared method)
├── pages/results/.../results-notifications/components/notification-item/      (openDrawer → markRequestSeen)
├── shared/components/header-panel/components/pop-up-notification-item/        (fresh/read look, decision body click)
├── shared/components/shell-topbar/                                            (tab counts, "Earlier", chip, button)
└── internationalization/bell-quick-inbox.copy.ts                              (new strings)
```

Folder `CLAUDE.md` files to update in the same commits: `shell-topbar/CLAUDE.md`, `notification-item/CLAUDE.md`, the pop-up item's guide if present.

## 5. Data Model

### `share_result_request_seen` (new)

| Column | Type | Notes |
|---|---|---|
| `share_result_request_id` | int, FK → `share_result_request.share_result_request_id` | part of PK |
| `user_id` | int, FK → `users.id` | part of PK |
| `seen_date` | timestamp, default `CURRENT_TIMESTAMP` | **no** `ON UPDATE` (the trap in `users.last_pop_up_viewed`) |

- **Composite primary key `(share_result_request_id, user_id)`.** It is the uniqueness guarantee that makes insert-ignore idempotent (`BRS-R-4`, `D3`). It also serves the per-request lookups.
- **Secondary index `(user_id, share_result_request_id)`** for "which of these ids has this user seen" (`BRS-DD-2`).
- No `is_active`, no audit columns. This is a fact table, not a business entity. A plain `@Entity` with no `BaseEntity` base (server `src/CLAUDE.md` §7.6: pick deliberately; none of the bases fits a two-key fact).
- FKs `ON DELETE CASCADE`, so removing a request or a user cannot leave orphans.
- Rows for decided requests stay. They are never read, because only `request_status_id = 1` rows are flagged.
- **Migration** `up`: create table + PK + index + FKs. `down`: drop table. Applied by Jenkins on deploy (server `CLAUDE.md` §5), so no defensive "table missing" code.

## 6. API Design

All routes are JWT-protected (default `/api/*`) and wrapped in the standard envelope (`ResponseInterceptor`). The user comes from `@UserToken()`, **never from the body or path** (`BRS-R-2` isolation).

| Method & path | Change | Request | Response `response` | Errors |
|---|---|---|---|---|
| `GET /api/results/request/get/received` | **additive**: each item in `receivedContributionsPending` gets `seen: boolean` | unchanged (`scope`, `version_id`, `cursor`) | unchanged shape + `seen` | unchanged |
| `PATCH /api/results/request/seen/:shareResultRequestId` | **new** | path id (`ParseIntPipe`) | `{ seen: true }` | 404 when the request does not exist or is not pending (`request_status_id ≠ 1` or inactive). 400 on a non-integer id |
| `PATCH /api/results/request/seen-all` | **new** | none | `{ recorded: <rows inserted> }` | 500 via the standard error handler |
| `GET /api/notification/...` (updates, as `GET_requestUpdates` calls it) | **additive**: optional `limit` (1..200, default 200 = today's `KEYSET_PAGE_SIZE`) applied to the **history** page only | `scope=history&limit=10` | unchanged shape | 400 on an out-of-range `limit` |

- `seen-all` computes the pending set **server-side** with the same `buildWhereReceivedConditions(inits, role)` the inbox uses, with no version filter. The client never sends ids, so it cannot mark requests it is not shown, and a stale client list cannot miss new ones.
- `seen` on the pending rows is resolved with **one** query (`user_id = caller AND share_result_request_id IN (pending ids)`), not one per row.
- Sent requests and `receivedContributionsDone` carry no `seen` (not in scope, `BRS` §4).

## 7. Backend Module Design

| Unit | Responsibility | Req |
|---|---|---|
| `ShareResultRequestSeen` entity | Maps the table (§5) | `R-2` |
| `ShareResultRequestSeenRepository` | `findSeenIds(userId, ids)`, `insertIgnore(userId, ids)` as a single bulk statement (TypeORM insert with ignore-on-duplicate), returns the inserted count. Both take `userId` as an explicit argument. | `R-2`, `R-4`, `D2`, `D3` |
| `ShareResultRequestService.getReceivedResultRequest` | After `combineAndDistinct`, when pending rows exist, one `findSeenIds` call, then tags each pending row with `seen`. | `R-1`, `R-6` |
| `ShareResultRequestService.markSeen(user, id)` | Verifies the request exists, is active and pending, then `insertIgnore(user.id, [id])`. | `R-3` |
| `ShareResultRequestService.markAllSeen(user)` | Resolves the role and initiatives exactly like `getReceivedResultRequest`, selects **only the ids** of the pending set (no relations, no enrichment), then one `insertIgnore`. | `R-4`, `R-5`, NFR perf |
| Controller | Two `@Patch` routes declared **before** any `:param` route that could swallow `seen-all`. Swagger `@ApiOperation` / `@ApiResponse`. | — |
| `NotificationService.getAllNotifications` | Honours `options.limit` for the history `take` (`limit + 1`) and the keyset slice. Pending is untouched. | `R-8` |

- **No write to `share_result_request`** anywhere in this spec (`D4`).
- **Logging:** Nest `Logger` on failures only, with the user id (failures happen before a count exists; corrected at validate, W5). No payloads, no tokens (`.cursorrules`).
- **Error posture:** follows the module (`_handlersError.returnErrorRes`). `markSeen` returns 404 as a `returnFormatService`, so the client can treat it as "not recorded".

## 8. Frontend / UX Component Architecture

### 8.1 State (`ResultsNotificationsService`)

| Signal / method | Meaning | Req |
|---|---|---|
| `bellReceived` (existing) | Pending requests, now each with `seen` | `R-1` |
| `bellUpdates` (existing) | Unread updates | `R-1` |
| `bellReadUpdates` (new) | Up to 10 most recent read updates, loaded by `loadBellReadUpdates()` | `R-8` |
| `bellUnseenRequests` (new, computed) | `bellReceived` rows with `seen !== true` | `R-1` |
| `bellCount` (**changed**) | `bellUnseenRequests().length + bellUpdates().length` | `R-1` |
| `bellPendingRequestCount` (new) | `bellReceived().length` (Decide tab) | `R-6` |
| `bellItems` (**changed**) | Rows tagged `kind` + `fresh`. Order: fresh requests, fresh updates, then (separator) seen requests, read updates. Newest first inside each group. | `R-8` |
| `markRequestSeen(row)` (new) | PATCH one. On success: set `seen = true` on the matching `bellReceived` row and on the inbox's `receivedData` row. On failure: log, no state change. | `R-3`, `R-9` |
| `markAllBellRead()` (replaces `markAllBellUpdatesRead`) | `Promise.allSettled([read-all, seen-all])`, then `refreshBell()` + `loadBellReadUpdates()` + local inbox sync for whichever leg succeeded. Rejects only when **both** legs failed. | `R-4`, `R-5` |
| `loadBellReadUpdates()` (new) | `GET_requestUpdates({ scope: 'history', limit: 10 })`, generation-guarded like `refreshBell` | `R-8` |

The badge is derived purely from server truth (`seen` flags + pending updates). Nothing optimistic, so the badge never drops for an item the server did not record (`R-3` BUT clause).

### 8.2 Components

| Component | Change | Req |
|---|---|---|
| `shell-topbar` | Badge reads the new `bellCount`. Header chip shows `N new` = `bellCount`. "Mark as read" visible when `bellCount > 0` and calls `markAllBellRead`. Decide tab: `N to decide` (orange text when > 0). Updates tab: unread count. Opening the popover also calls `loadBellReadUpdates()`. Renders an "Earlier" separator before the first non-fresh row. Cap 10 and `+N more` keep counting the active tab's rows. | `R-1`, `R-4`, `R-6`, `R-8` |
| `pop-up-notification-item` | New input-derived `fresh` state (from the row's `fresh` tag). Fresh: bold text, 7px primary dot at the leading edge, `aria-label` prefix from copy ("Unread"). Read: regular weight, `--pr-text-secondary`, status icon/chip at reduced opacity. **The "Requires decision" chip and Accept/Decline keep full emphasis in both states.** Decision-row body click: `preventDefault`, `markRequestSeen`, then in-app `navigateByUrl` to the same destination the anchor had (as updates already do, `BELL-R-9`, so a full-page navigation cannot abort the PATCH). | `R-3`, `R-7` |
| `notification-item` (inbox) | `openDrawer(...)` on a **received pending** request calls `markRequestSeen(row)`. Sent requests and done rows do nothing. | `R-3`, `R-9` |
| `results-notifications` page | "Mark all as read" calls `markAllBellRead()`. Visibility: `bellCount() > 0` instead of the phase-filtered `notificationsPending.length`. The early return is removed. | `R-5` |

### 8.3 Visual tokens (from the mockup, all existing)

| Element | Token |
|---|---|
| Fresh text | `--pr-text-heading`, weight 700 |
| Read text | `--pr-text-secondary`, weight 400 |
| Unread dot | `--pr-color-primary-300` |
| Read status chip/icon | same tokens, opacity 0.7 |
| "Earlier" separator | `--pr-text-subtle`, 10px, uppercase, `tracking-[0.06em]` |
| Decide count | `--pr-color-orange-500` text |

Tailwind utilities in templates (client rule 19), px sizes (rule 20), no hex (rule 8). No new token.

### 8.4 Copy (`bell-quick-inbox.copy.ts`)

New keys: `earlier` ("Earlier"), `unreadRowPrefix` ("Unread"), `decideCount(n)` ("N to decide"), `newChip(n)` re-pointed to the badge count. Existing `markAsRead` kept.

## 9. Shared Contracts

| Contract | Change | Consumers |
|---|---|---|
| `receivedContributionsPending[].seen` | **added**, boolean, caller-relative | bell (`bellReceived`), inbox (`receivedData`). Ignored safely by older clients. |
| `request/seen/:id`, `request/seen-all` | new | client only |
| updates `limit` query | new, optional | client bell only; the inbox keeps the default |
| Not touched | `/api/bilateral/*`, `/api/platform-report/*`, `summary/` | no bilateral payload change, no `bilateral-result-summaries.en.md` row |

## 10. Design Decisions

| ID | Decision | Why | Rejected alternative |
|---|---|---|---|
| `BRS-DD-1` | Per-(request, user) seen table | One shared request is decided by many members. Only a pair-level record expresses "three saw it, the fourth did not" and "saw #9821 but not the older #9790" | Per-user timestamp (cannot mark one); flag on the request (leaks to colleagues); reuse `users.last_pop_up_viewed` (`ON UPDATE CURRENT_TIMESTAMP` drifts on any user write) |
| `BRS-DD-2` | `seen` computed server-side on the existing GET | One round-trip; the client keeps a single source of truth; additive | Separate "seen ids" endpoint (two calls to keep in sync) |
| `BRS-DD-3` | `seen-all` resolves the pending set server-side, bulk insert-ignore | Idempotent, one statement for 150 rows (NFR), cannot be fed foreign ids | Client sends the id list (stale lists, larger payload, needs ownership checks) |
| `BRS-DD-4` | "Mark as read" = two parallel calls orchestrated by the client | Keeps `notification` and `share-result-request` modules decoupled (no new cross-module import / `forwardRef`). A partial failure is visible and honest, because the badge is recomputed from server truth. | `read-all` also writing seen rows (couples two modules; changes an endpoint other callers use) |
| `BRS-DD-5` | Read rows loaded only on popover open, `limit=10` | The badge never needs them. Avoids pulling a 200-row history page on every refresh. | Always fetch with the pending snapshot (2× payload per refresh) |
| `BRS-DD-6` | Badge = unseen requests + unread updates; Decide = all pending | Product decision `OQ-3` (2026-10-06) | Requests never counted (rejected by the user) |
| `BRS-DD-7` | Decision-row body click becomes in-app navigation | A full document navigation can abort the seen PATCH (same reason `BELL-R-9` moved updates) | Fire-and-forget before `href` (lossy) |

### 10.1 Reversion challenges (Step 2.3)

| Reverted behavior | "What does removing this break?" | Answer / mitigation |
|---|---|---|
| Badge no longer counts **seen** pending requests (`BELL-R-1`) | A user can zero the badge while 140 requests wait. Requests could be ignored. | The Decide tab keeps `140 to decide` in orange. The "Requires decision" chip and buttons keep full emphasis. The inbox still lists every pending request. A request is only uncounted after this user opened it or pressed "Mark as read". Accepted by product (`OQ-3`). |
| "Mark as read" no longer leaves requests untouched (`BELL-T-10`) | Could it decide or hide them? | No. It only writes seen rows (`D4`: no write to `share_result_request`). Covered by server Jest and a client Decide-count assertion. |
| Inbox "Mark all as read" loses its early return and phase-filtered visibility | Could the button appear with nothing to do, or touch other phases? | It now appears only when `bellCount > 0` (all phases, which is the bell's meaning). Touching all phases is intended (`BRS-R-5`). The inbox's local arrays are only synced for the legs that succeeded. |
| Decision-row anchor click becomes `preventDefault` + router | Middle-click / open in new tab | Only plain left clicks are intercepted (modifier and middle clicks keep the native anchor). Same rule the update rows follow. |

## 11. Rollout, Observability, Rollback

- **Order:** server first (migration + endpoints are additive; old clients ignore `seen`), then client. On `qa-development-2026-ss` both ship together; the order matters only if they are split into PRs.
- **Observability:** logger lines on `markAllSeen` failures with the user id (no count: the failure precedes it; corrected at validate, W5). Timing for `D8` is measured at the validate HITL pause (3 runs).
- **Rollback:** revert the client commit → the old badge returns (seen ignored). Revert the server commit + migration `down` → table dropped. No data in other tables depends on it.

## 12. Budget (Step 2.4 tripwire)

| Measure | Estimate |
|---|---|
| Tasks | **7** |
| LOC (production) | ~**330** (server ~150, client ~180) |
| LOC (tests) | ~**450** |
| Review rounds | **≤ 2 per task**, ≤ 10 total |

Depth check: Full matches (migration, 2 new endpoints, modified approved requirement, 6 client units). Not a candidate to drop a level.
