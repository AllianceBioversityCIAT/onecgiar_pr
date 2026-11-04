# Proposal — Admin notifications: bounded pending load

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `notifications/admin-pending-paging` |
| Slug | `admin-pending-paging` — derived from free-text argument |
| Type | Change (performance; modifies an archived requirement, see §9) |
| Approval Mode | gated |
| Date | 2026-10-07 |
| Author | Santiago Sanchez (with Claude) |
| Ticket | none yet |
| Depends on | none (builds on archived `notifications/inbox-paginated-load`, `notifications/bell-quick-inbox`, `bugfix/notifications-inbox-slow-load`) |
| Parallel-safe | no — touches `notification.service.ts`, the bell and the inbox service that other notification specs edit |

## 2. Intent

Admins wait a long time for the bell and the Notifications inbox. Make both load in bounded time no matter how many unread notifications a user holds.

## 3. Problem / Current Behavior

**Measured 2026-10-07 by the user in DBeaver against prdb:**

| Fact | Value |
|---|---|
| `notifications` rows | 466,090 |
| Unread notifications per app admin (top 10) | 6,514 · 6,501 · 6,200 · 6,034 · 4,277 · 4,251 · 4,191 · 4,190 · 4,082 · 4,025 (≈0 read) |
| Indexes on `notifications` | single-column FKs only (`target_user`, `result_id`, `notification_type`, …). **No composite `(target_user, read, created_date)`** |
| Pending share requests visible to an admin, per phase | up to 418 (phase 8); ≈1,150 across all phases |
| Join fan-out per request (centers × projects) | avg 1.45, max 6 — **ruled out** as a cause |
| ToC-mapped pending requests per phase | 0–5 — **ruled out** as a cause |

**Where the cost comes from:**

| # | Call | Code | Admin cost |
|---|---|---|---|
| 1 | Bell, unread updates | client `results-notifications.service.ts:241` → `GET notification/updates?scope=pending` (all phases) | ~6.5k rows, each joined to result, initiatives, version, type, level, projects, users and review history. Re-fetched after every mark-read (`refreshBell`). |
| 2 | Bell, pending requests | `:232` → `GET results/request/get/received?scope=pending` | ~1,150 requests with relations |
| 3 | Inbox, Updates pending | `NotificationService.getAllNotifications` (`notification.service.ts:786`) — `find()` with **no `take`** | Same ~6.5k rows (phase-scoped), then one `app-notification-item` per row |
| 4 | Inbox, Received pending | `ShareResultRequestService.getReceivedResultRequest` — admin branch is unscoped | Up to 418 rows per phase |

The bell only needs a count plus 10 rows (`BELL-R-1`, `BELL-R-3`), yet it downloads everything. The inbox renders every pending row at once.

A non-admin user has tens of pending items, so only admins feel it.

## 4. Proposed Outcome

- The bell gets its **count from the server** and **only the rows it shows** (≤10 per group). It never downloads the full pending set.
- The inbox **pages pending Updates** (and, second, admin Received pending) with the same keyset cursor that history already uses, plus "Load more".
- A **composite index** lets the paged query walk the index instead of sorting thousands of rows.
- Badge, tab counts and "N more" stay exact. They come from server counts, not from array length.

## 5. Scope

| # | Item | Priority |
|---|---|---|
| S1 | Server count endpoint (or `scope=count`): unread updates + pending decisions, all phases, same rules as today's pending queries | Must |
| S2 | Bell: badge from S1; popover fetches top-10 pending decisions + top-10 unread updates (`limit=10`) | Must |
| S3 | `GET notification/updates?scope=pending` accepts `cursor`/`limit` and returns `pendingMeta { hasMore, nextCursor, total }` | Must |
| S4 | Inbox Updates pending: first page + "Load more", reusing the existing history paging plumbing (`loadMore`, generation guards) | Must |
| S5 | Migration: index `notifications(target_user, read, created_date, notification_id)` with a working `down` | Must |
| S6 | Same paging for admin Received pending (`getReceivedResultRequest`, admin branch) | Should |
| S7 | Inbox tab counts (`All` / `Needs decision` / `Info`) read server totals when the pending set is partially loaded | Should |

## 6. Non-Goals

- Changing **who receives** notifications (see the open question in §12).
- A bulk "mark all as read". `PATCH read-all` already exists; exposing it better is a separate UX decision.
- Moving the inbox's client-side filters (search, center, project, type, funding, result type) to the server. See the trade-off in §10.
- Virtual scrolling.
- Sent-request paging. Sent is scoped by `requested_by`, so it is small even for admins.

## 7. Affected Users, Systems, And Specs

| Area | Files |
|---|---|
| Server — notifications | `api/notification/notification.controller.ts`, `notification.service.ts`, `shared/utils/keyset-cursor.util.ts` |
| Server — requests (S6) | `api/results/share-result-request/share-result-request.service.ts` |
| Server — migration | `src/migrations/<ts>-NotificationsTargetReadCreatedIndex.ts` |
| Client | `results-notifications.service.ts` (bell + `loadInbox`/`loadMore`), `results-notifications.component.ts/html`, `shell-topbar` bell popover, `results-api.service.ts` (`GET_requestUpdates`, new count method) |
| Users | App admins (primary). Heavy recipients (PMU, leads) benefit too. Light users see no change. |
| Specs modified | `archive/2026-10-01-notifications--inbox-paginated-load` (`PAGE-R-2`, `PAGE-AC-4`); `archive/2026-10-06-notifications--bell-quick-inbox` (`BELL-R-1`, `BELL-R-3`: data source only, not their behavior) |

## 8. Visual Reference

- Source: None.
- Notes: No new screens. The only visible change is a "Load more" control at the end of the pending block, matching the history "Load more" that already exists. The badge, the popover and its "N more" line look the same.

## 9. Requirement Delta Preview

### ADDED

- Server returns the attention count (unread updates + pending decisions, all phases) without returning the rows.
- Pending Updates (and admin Received pending) can be fetched in keyset pages with `hasMore`/`nextCursor`/`total`.
- Composite index on `notifications(target_user, read, created_date, notification_id)`.

### MODIFIED

- **`PAGE-R-2` "Pending set is complete and first; pending never paged"** → pending is still requested first and shown first, but **it is paged**. "Complete" becomes "complete on demand" (Load more), and its totals are exact from the server.
- **`PAGE-AC-4` "350 pending rows → all 350 present"** → the first page is present, `total = 350` is shown, and the rest arrive through Load more.
- **`BELL-R-1` / `BELL-R-3`**: same badge and popover behavior, but the count comes from the server and the rows from a `limit=10` fetch.

### REMOVED

- None.

## 10. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A. Bounded pending (recommended)** | S1–S5 (+S6/S7): server count, bell top-N, paged pending, composite index | Fixes the measured cause where it lives. Reuses the keyset util and the client `loadMore` that history already has. Load time stops growing with the number of unread items. | Client-side filters only see loaded rows until Load more. Tab counts need server totals (S7). Reopens `PAGE-R-2`. |
| B. Slim but complete | Keep pending complete; trim relations to a light select; add the index; bell gets count + top-N | No paging UX change; filters keep seeing everything | Still ships ~6.5k rows to the inbox and renders them all. Cost still grows linearly. Likely still slow. |
| C. Server-side filtering + paging | A + move every facet filter and facet option to the server | Exact filters and counts at any size | Much larger: new query DTOs, facet aggregation queries, client rewrite. Not justified by the evidence. |

## 11. Recommended Approach

**Option A**, delivered in this order so that each step stands on its own:

1. **S5 index + S1 count + S2 bell.** This step alone removes ~6.5k rows from every page load (the bell is in the shell on every page) and from every mark-read. Biggest win, smallest UX change.
2. **S3 + S4 paged pending Updates** in the inbox.
3. **S6 / S7** admin Received pending + server totals for tab counts.

**Filter trade-off (needs your call in `/akili-specify`):** while pending is partially loaded, client filters apply only to the loaded rows. Mitigation: show "Showing X of Y, load more to filter all" whenever a filter is active and `hasMore` is true. Moving filters to the server (Option C) is deferred.

## 12. Risks, Dependencies, And Open Questions

| Kind | Item |
|---|---|
| **Open (product)** | **Should app admins receive almost every result notification?** About 6k unread per admin with ≈0 read suggests nobody uses them. Recipients come from the callers of `emitResultNotification(…, userIds, …)`; how admins end up in those lists is not traced yet. Fixing that would also stop the table growing (~466k rows). Product owner to decide; out of scope here. |
| Open | Count endpoint shape: new `GET notification/attention-count` vs `scope=count` on existing routes. Decide in `/akili-specify` design. |
| Open | Page size for pending (50? 100?). History uses 200; pending is rendered expanded, so a smaller page is likely better. |
| Risk | The index is created on a 466k-row table. MySQL 8 builds it online (`ALGORITHM=INPLACE, LOCK=NONE`), but confirm the engine version before the migration. Jenkins applies migrations on deploy (server `CLAUDE.md` §5). |
| Risk | The bell and the inbox must keep agreeing (`BELL-R-*` "never disagree"). Both should read the same server count. |
| Risk | Keyset paging over `(created_date DESC, notification_id DESC)` on pending: marking a row read moves it out of pending mid-paging. The cursor stays valid (it is positional), but tests must cover that. |
| Dependency | The earlier `bugfix/notifications-inbox-slow-load` left "manual QA + Option B if still slow" open. This proposal supersedes its Option B. |
| Rule | Jest runs scoped with `--maxWorkers=2` (user global rule). Browser checks hit the shared prdb, so never click write buttons there (memory `feedback_browser_checks_shared_db`). |

## 13. Success Criteria

- The bell never requests an unbounded pending list. Its payload stays ≤20 rows plus a count, whatever the user's unread volume.
- For an admin with ~6.5k unread, the first paint of the inbox's pending block needs one page (≤ page size rows).
- `EXPLAIN` of the paged pending query uses the new composite index (no filesort over the user's rows).
- Badge, popover "N more", and tab totals equal the server counts.
- Regression tests: the count matches today's pending-set rules; paging returns every row exactly once across pages, including when a row is marked read mid-paging.
- The user confirms that the admin bell and inbox feel fast.

## 14. Next Step

```text
/akili-specify notifications/admin-pending-paging
```
