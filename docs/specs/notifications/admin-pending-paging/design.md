# Design — Notifications: Bounded Pending Load (admin-scale)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/admin-pending-paging` |
| Depth | Full |
| Approval Mode | gated |
| Requirements | `requirements.md` (approved 2026-10-07) |
| Date | 2026-10-07 |
| Skills | `nestjs-expert`, `api-design-principles`, `angular-developer` |

## 2. Executive Summary

Three changes, all additive on top of the shipped `PAGE-*` / `BELL-*` / `BRS-*` machinery:

1. **Counts endpoint.** A new `GET api/notification/attention-counts` returns `{ unseenRequests, pendingRequests, unreadUpdates }` from `COUNT` queries. No rows.
2. **Optional `limit`/`cursor` on the pending scope** of the two existing feeds (`updates`, `received`). The keyset helpers and response-meta pattern are the same ones history already uses. Without `limit`, nothing changes.
3. **The client asks for bounded data everywhere.** The bell asks for counts + 10 rows per group. The inbox asks for pending page 1 + "Load more". The boot refresh asks for page 1. Plus one composite index migration.

## 3. Architecture Overview

```
shell-topbar bell ──► ResultsNotificationsService.refreshBell()
                        ├─ GET notification/attention-counts                → badge, Decide, "N more", All
                        ├─ GET request/get/received?scope=pending&limit=10&seen=false
                        ├─ GET request/get/received?scope=pending&limit=10&seen=true
                        └─ GET notification/updates?scope=pending&limit=10
                        (read updates: unchanged, history limit=10 on open)

inbox ──► loadInbox(phase)
            ├─ updates  pending page 1 (limit=P) + history page 1   [Load more pages BOTH]
            ├─ received pending page 1 (limit=P) + history page 1   [PPG-R-6]
            └─ sent     pending complete (unchanged) + history page 1
app boot ──► refreshPending('updates')  → page 1 only (limit=P)
```

P = **50** (`PENDING_PAGE_SIZE`, server and client constant). The bell uses 10.

## 4. Extended Directory Structure

| Path | Change |
|---|---|
| `onecgiar-pr-server/src/api/notification/notification.controller.ts` | + `GET attention-counts`; `updates` parses `limit` for `scope=pending` too |
| `onecgiar-pr-server/src/api/notification/notification.service.ts` | + `getAttentionCounts`; pending branch of `getAllNotifications` gains a paged mode |
| `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.controller.ts` | `get/received` accepts `limit`, `seen` |
| `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` | + `getPendingReceivedIndex` (light id query), paged pending mode, + `countPendingReceived` |
| `onecgiar-pr-server/src/shared/utils/keyset-cursor.util.ts` | + `PENDING_PAGE_SIZE = 50` (no logic change) |
| `onecgiar-pr-server/src/migrations/<ts>-NotificationsTargetReadCreatedIndex.ts` | new |
| `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` | + `GET_notificationAttentionCounts`; `limit`/`cursor`/`seen` on `GET_allRequest`, `GET_requestUpdates` |
| `onecgiar-pr-client/.../results-notifications/results-notifications.service.ts` | bell from counts + bounded rows; pending paging state; boot refresh bounded |
| `onecgiar-pr-client/.../results-notifications/results-notifications.component.{ts,html}` | pending "Load more", tab totals, partial-filter notice |
| `onecgiar-pr-client/src/app/internationalization/` (inbox copy file) | 2 strings |
| `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.ts` + `CLAUDE.md` | All-tab count from counts |

## 5. Data Model

No entity change. A migration adds one index:

| Table | Index | Columns | Serves |
|---|---|---|---|
| `notifications` | `IDX_notifications_target_read_created` | `(target_user, read, created_date, notification_id)` | `unreadUpdates` count; pending and history keyset pages (`target_user = ? AND read = ? ORDER BY created_date DESC, notification_id DESC`) |

- `up`: `CREATE INDEX … ALGORITHM=INPLACE LOCK=NONE` (MySQL 8 online DDL). `down`: `DROP INDEX`.
- The entity gets a matching `@Index` so `migration:check` sees no drift.
- `share_result_request` needs no new index. It has 9.7k rows and `request_status_id` is indexed; the pending set is ≤1,150 ids (measured).

## 6. API Design

### 6.1 `GET api/notification/attention-counts` (new) — PPG-R-1

| | |
|---|---|
| Auth | JWT (`@UserToken()`), caller only |
| Query | none (always all phases, `BELL-R-1`) |
| 200 | `{ response: { unseenRequests: number, pendingRequests: number, unreadUpdates: number } }` |

- `unreadUpdates` = sum of 3 counts using **the same `where` objects** the pending lists use today: result-scoped (`read=false`, active result, owner role-1 relation, type ∉ Center notices), Center notices, bilateral AI-job. Each runs as `repository.count({ where, relations })`. TypeORM emits `COUNT(DISTINCT notification_id)`, so the role-1 join cannot double-count. The `where` builders are extracted into private functions shared by the list and count paths (PPG-DD-2).
- `pendingRequests` / `unseenRequests` come from `getPendingReceivedIndex` (§7.2): length, and length minus seen ids.

### 6.2 `GET api/notification/updates?scope=pending&limit&cursor` — PPG-R-4

| Param | Rule |
|---|---|
| `limit` | Optional. Integer 1..200, else 400 (existing `parseLimit`). Present → paged mode. Absent → legacy (complete). |
| `cursor` | Optional, opaque, validated eagerly (existing). Only used in paged mode. |
| Response (paged) | Today's shape + `pendingMeta: { hasMore, nextCursor, total }`. `notificationsPending` holds ≤`limit` rows. |
| Response (legacy) | Byte-identical to today. No `pendingMeta`. |

- Paged mode uses the **history pattern**. The 3 paths are each fetched with `applyKeysetCursor` and `take: limit + 1`, ordered `(created_date DESC, notification_id DESC)`, then combined with `mergeKeysetLists`. `total` comes from the §6.1 count logic, with the phase scope applied to the result-scoped and Center paths.
- Announcements (`notificationAnnouncement`) still travel with the pending scope, unchanged.
- A legacy call that sends `scope` omitted or `history` is unaffected: `limit` keeps meaning a history page size there (BRS-T-3).

### 6.3 `GET api/results/request/get/received?scope=pending&limit&cursor&seen` — PPG-R-2, PPG-R-6

| Param | Rule |
|---|---|
| `limit` | As §6.2, but scoped to the pending bucket only when `scope=pending`. |
| `cursor` | Keyset over `(requested_date, share_result_request_id)` (`DONE_KEYSET_FIELDS`). |
| `seen` | Optional `true`/`false`, else 400. Filters the caller's seen state before paging (bell groups). Absent → both. |
| Response (paged) | `receivedContributionsPending` ≤`limit` rows, each with `seen` (`BRS`) + `pendingMeta { hasMore, nextCursor, total }`. |
| Legacy | Unchanged. |

## 7. Backend Module Design

### 7.1 `NotificationService`

- `buildPendingWheres(userId, versionId?)` returns the 3 `where` objects for the pending result-scoped / Center / AI-job paths. It is used by the legacy list, the paged list and the counts, so the three can never diverge (PPG-DD-2).
- `getAllNotifications`: the pending branch picks legacy or paged by whether `limit` was passed. The history branch is untouched.
- `getAttentionCounts(user)` runs the 3 notification counts and `ShareResultRequestService.countPendingReceived(user)` in parallel. `ShareResultRequestService` is already injected.

### 7.2 `ShareResultRequestService`

- `getPendingReceivedIndex(user, versionId?)` runs **one light query** over the same `buildWhereReceivedConditions` pending wheres. It selects `share_result_request_id, requested_date` only, with no relations except the `obj_result.is_active` / `version_id` join the where needs. For non-admins it passes the owner/shared pair as a where-array (OR), which replaces `combineAndDistinct`. Then it runs one `findSeenIds` call. It returns `[{ id, requested_date, seen }]`. About 1,150 tiny rows for an admin, all phases.
- `countPendingReceived(user)` returns `{ pendingRequests: index.length, unseenRequests: count(!seen) }`.
- Paged pending (`limit` present) is **id-first**: build the index, filter by `seen` if given, sort `(requested_date DESC, id DESC)`, cut after the cursor position, and take `limit + 1` ids. Then **one** heavy `getRequest({ share_result_request_id: In(pageIds) })`, re-ordered to the id order, then `enrichBucketsOnce` + `tagPendingWithSeen` as today. `sliceKeysetPage` builds the meta. `total` = filtered index length.
  - This keeps the heavy relation query at ≤`limit` rows and makes the `seen` filter exact. A `NOT EXISTS` inside a TypeORM `find` is not expressible without a QueryBuilder rewrite of `getRequest`.

### 7.3 Error handling, observability, security

- New params reuse the existing 400 validators. Cursors are never logged (`.cursorrules`).
- Counts and pages are always keyed on the token's user id (`target_user`, own `seen` rows); no user id comes from the query (PPG-NFR-5).
- The existing `_logger.error` paths stay as they are. A count failure returns 500 through the standard envelope, and the client keeps the previous badge (§8.1).

## 8. Frontend Component Architecture

### 8.1 Bell (`ResultsNotificationsService`, `shell-topbar`)

- New signal `bellCounts = { unseenRequests, pendingRequests, unreadUpdates }`.
  - `bellCount` = `unseenRequests + unreadUpdates`.
  - `bellPendingRequestCount` = `pendingRequests`.
  - `shell-topbar.bellAllCount` = `pendingRequests + unreadUpdates + loaded read rows not in unread`.
- `refreshBell()` fires 4 calls: counts, unseen requests (`limit=10, seen=false`), seen requests (`limit=10, seen=true`), unread updates (`limit=10`). It keeps the existing generation guard; `bellLoading` clears when all 4 settle.
- `bellItems` keeps its grouping and order code. Its inputs are just ≤10 per group now, and `.slice(0, 10)` in the topbar is unchanged.
- **Parity proof (PPG-NFR-4):** with ≤10 per group, the inputs equal today's full lists, so every derived value is equal.
- `markAllBellRead` and the decide flows call `refreshBell()` as they do today, so they stay bounded automatically (PPG-R-3).
- On a counts error, the previous counts stay and `bellError` is set (same as today's per-leg rule).

### 8.2 Inbox pending paging (`ResultsNotificationsService`)

- `SourcePaging` gains `pendingHasMore`, `pendingNextCursor` and `pendingTotal` for `updates` and `received`. `sent` keeps the complete pending set.
- `fetchPending` sends `limit: PENDING_PAGE_SIZE` for `updates`/`received`. It **sets** rows on page 1 and **appends** on later pages, with the same set/append split and `sourceGen` guards that `fetchHistory` already has.
- `loadMorePending()` mirrors `loadMore()`: one in-flight guard (`loadingMorePending`) and a no-op while in flight. On error the rows and cursor stay, so the control can retry.
- `loadInbox`, `refreshSource` and the phase change reset the pending cursors along with the rows (`PAGE-R-5` behavior).
- `refreshPending('updates')` (app boot) requests page 1 only.

### 8.3 Inbox component

- **Load more (pending).** A control rendered at the end of the pending block while any pending source `pendingHasMore`. It reuses the existing history "Load more" button markup and style (Spartan `hlm` button already in the template). No new component.
- **Tab totals (PPG-R-7).** `allTabCount` / `decisionTabCount` / `infoTabCount` add the **unloaded remainder** (`pendingTotal - loaded pending`) for each paged source, but only when no client filter is active. Received-pending rows are `needsDecision`; update rows are not (the existing classifier). The remainder is assigned with the same rule.
- **Partial-filter notice (PPG-R-8).** One `text-[12px]` line above the list when `anyFilterActive && anyPendingHasMore`. Copy is in the inbox copy file. No new tokens.
- The derived-list memo key (`buildDerivedCacheKey`) needs no change: appended pages produce new array references.

## 9. Shared Contracts

| Contract | Change |
|---|---|
| `pendingMeta` | `{ hasMore: boolean, nextCursor: string \| null, total: number }`. It is `viewedMeta`/`doneMeta` plus `total`. Missing `pendingMeta` (old server during rollback) → the client treats the pending set as complete (`hasMore:false`, `total = rows.length`), the same rollback rule as `PAGE-R-11`. |
| `PENDING_PAGE_SIZE` | 50, declared server-side in `keyset-cursor.util.ts` and mirrored client-side next to the existing history size constant. |

## 10. Design Decisions

| ID | Decision | Alternatives rejected | Requirements |
|---|---|---|---|
| PPG-DD-1 | `limit` is **opt-in** on the pending scope; no `limit` = today's response | Make pending paged by default: would break any caller we have not found, and the legacy popup endpoint | R-4, NFR-3 |
| PPG-DD-2 | One `where` builder feeds list, page and count | Hand-written COUNT SQL: two definitions of "pending" drift; the count-parity tests would be the only guard | R-1 |
| PPG-DD-3 | Received pending is paged **id-first** (light index query → heavy fetch of ≤limit ids) | Keyset in a TypeORM `find` with a `seen` NOT EXISTS: needs a QueryBuilder rewrite of `getRequest` and its 12 relations | R-2, R-6 |
| PPG-DD-4 | Bell = counts + bounded groups; grouping code unchanged | A server-built bell feed: duplicates the `BRS` ordering rules server-side | R-2, R-3 |
| PPG-DD-5 | P = 50 for pending, 10 for the bell | 200 (history size): pending rows render expanded with actions, so 200 still paints slowly | NFR-1 |
| PPG-DD-6 | Tab counts add the server remainder only without filters; with filters, show the notice | Server-side facet counts: Option C, out of scope | R-7, R-8 |
| PPG-DD-7 | The index is created online (`INPLACE, LOCK=NONE`) through a normal migration (Jenkins applies it) | A manual DBA step: breaks the "migrations are applied by the pipeline" contract (server `CLAUDE.md` §5) | R-9 |
| PPG-DD-8 | **Reversion:** `PAGE-R-2` "pending never paginated" is reversed for `updates` and `received` | Keep complete: this is the measured cause | R-5, R-6 |

### Reversion challenge (Step 2.3) — PPG-DD-8: "what does removing *complete pending* break?"

| Breakage found | Addressed by |
|---|---|
| Inbox tab counts would show only loaded rows | PPG-R-7 (server remainder) |
| Client filters silently miss unloaded rows | PPG-R-8 notice (accepted trade-off) |
| Optimistic mark-read moves a row pending→viewed. With a cursor, could the next page skip one? | No: the keyset cursor is positional on `(created_date, id)` of the last *returned* row, so removing an earlier row does not shift later ones. Covered by a mid-paging test (R-4 scenario). |
| Accept/decline in the inbox calls `refreshSource('received')`, which resets loaded pending pages to page 1 | Accepted. It is today's `PAGE-DD-6` behavior for history, now applied to pending too. Recorded. |
| `PAGE-AC-4` and the `PAGE-*` spec tests asserting "all pending present" | Those tests call without `limit` (legacy path) and stay valid. New tests cover the paged path. |
| Boot `refreshPending('updates')` feeds `updatesData`. Does anything read the full unread list? | Only the inbox (now paged) and the retired popup feed. The bell has its own snapshot (`BELL-DD-1`). |

## 11. Rollout, Risks, Rollback

| Item | Plan |
|---|---|
| Order | Server first: migration + endpoints are backward compatible. Then client. Rollback of the client alone is safe; rollback of the server alone works because the client falls back when `pendingMeta` is missing (§9). |
| Risk: MySQL version | Online `CREATE INDEX` needs MySQL ≥5.6 / 8. Confirm with `SELECT VERSION();` before merge (HITL). |
| Risk: count cost | Three `COUNT` queries with joins for 6.5k rows. Covered by the new index (`target_user, read` prefix). The user verifies with `EXPLAIN` (HITL, R-9). |
| Observability | No new logging. The user checks admin Network timings before/after (HITL). |

## 12. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 6 |
| LOC | ~550 production + ~600 tests (server ~300, client ~250) |
| Review rounds | 1–2 per task; server paging tasks most likely to need 2 |

Depth check: Full fits. The work spans the API contract, a migration and two client surfaces. Above ~400 LOC → split into 2 PRs (server, client).
