# Tasks — Notifications: Bounded Pending Load (admin-scale)

## 1. Scope of this task list

- **Module / feature:** `notifications` — admin-scale pending load
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Owner / driver:** Santiago Sanchez
- **Status:** implemented (all tasks PASS 2026-10-07; not committed)
- **PRs:** PR 1 = T-1..T-3 (server). PR 2 = T-4..T-6 (client). PR 2 depends on PR 1 being deployed for live checks.

## 2. Pre-flight checklist

- [ ] HITL: the user runs `SELECT VERSION();` on prdb. MySQL ≥ 8 → online index OK (design §11). Otherwise stop and revisit PPG-DD-7.
- [ ] Every Jest run uses `--maxWorkers=2` and `--testPathPattern` scoped to the touched specs (user global rule). Server: `npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern <pattern>`. Client: `npm run test:local -- --testPathPattern=<pattern>`.
- [ ] Lint only touched files: `npx eslint <files> --quiet`.
- [ ] No browser write clicks against the shared prdb (memory `feedback_browser_checks_shared_db`).
- [ ] No commit without the user's explicit go-ahead.

## 3. Task list

### PPG-T-1 — Composite index migration

- **Status:** [x] (PASS attempt 1, 2026-10-07 — post-deploy `migration:check` + `EXPLAIN` remain HITL; see `execution.md`)

- **Type:** db
- **Description:** Add a migration that creates `IDX_notifications_target_read_created` on `notifications(target_user, read, created_date, notification_id)` online, with a working `down`. Add the matching `@Index` to `notification.entity.ts` so `migration:check` sees no drift.
- **Implements:** PPG-R-9 (scenario "migration:check"; the `EXPLAIN` scenario is the HITL in §6)
- **Design:** §5, PPG-DD-7
- **Files:** `onecgiar-pr-server/src/migrations/<ts>-NotificationsTargetReadCreatedIndex.ts`, `onecgiar-pr-server/src/api/notification/entities/notification.entity.ts`
- **Depends on:** pre-flight MySQL check · **Blocks:** — (independent of T-2/T-3)
- **Estimate:** S · **Review:** full (migration)
- **Skills:** `nestjs-expert`
- **Verification:** `npm run migration:check` passes (no drift). Read the `up` SQL: it contains `ALGORITHM=INPLACE` and `LOCK=NONE`; the `down` drops exactly that index name.
- **Fails if:** the entity `@Index` column order differs from the migration (check reports drift), or `down` names a different index.
- **Disqualifier:** `migration:check` against a DB where the migration was hand-applied proves nothing. Run it on the normal local config. Do **not** run `migration:run` against the shared prdb; the pipeline applies it.
- **Definition of done:** check green; up/down reviewed; no other schema change in the diff.

### PPG-T-2 — Received pending: light index, counts, id-first paging

- **Status:** [x] (PASS attempt 1, 2026-10-07 — see `execution.md`)

- **Type:** server
- **Description:** In `ShareResultRequestService`, add `getPendingReceivedIndex` (light id + date query over the existing pending wheres, owner/shared as a where-array, plus one `findSeenIds`), `countPendingReceived`, and the paged pending mode (`limit`, `cursor`, `seen`) using id-first fetch → `getRequest(In(ids))` → re-order → `enrichBucketsOnce` + `tagPendingWithSeen` → `sliceKeysetPage` + `total`. The controller parses `limit`/`seen` on `get/received` (400 on bad input). The legacy path (no `limit`) is untouched.
- **Implements:** PPG-R-6 (both scenarios incl. "keep `seen`"), PPG-R-1 (request counts: "parity", "other users' data"), PPG-R-2 (server side of "≤10 rows per group" for requests), PPG-R-4 "malformed cursor / out-of-range limit → 400" (received variant), PPG-NFR-3, PPG-NFR-5
- **Design:** §6.3, §7.2, PPG-DD-1, PPG-DD-3
- **Files:** `share-result-request.service.ts`, `share-result-request.controller.ts`, both `.spec.ts`; `shared/utils/keyset-cursor.util.ts` (`PENDING_PAGE_SIZE`)
- **Depends on:** — · **Blocks:** PPG-T-3, PPG-T-4, PPG-T-5
- **Estimate:** M · **Review:** full (payload contract) · **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Tests (red first):**
  1. Count parity: for non-admin (owner + shared rows) and admin fixtures, `countPendingReceived` equals `combineAndDistinct(...)` length and the unseen subset of today's legacy pending.
  2. Paging: 130 pending, `limit=50` → 50/50/30, every id once, order `(requested_date DESC, id DESC)`, `total=130` each page. Include ties on `requested_date`.
  3. `seen=false` / `seen=true` partition the index exactly; rows carry `seen`.
  4. Legacy call (no `limit`) deep-equals today's response for the same fixture.
  5. Heavy `getRequest` is called once per page with ≤`limit+1` ids.
  6. Another user's `seen` rows do not change the caller's counts.
  7. Bad `limit` (0, 201, `abc`), bad `seen` (`maybe`) and bad cursor → 400.
- **Fails if:** (2) uses a fixture ≤50 rows (cannot see a page boundary), or ties are absent (cannot see an id tiebreak bug).
- **Definition of done:** tests green; the existing `share-result-request` specs are still green (scoped run); lint clean.

### PPG-T-3 — Notifications: shared where builder, paged pending, attention-counts endpoint

- **Status:** [x] (PASS attempt 1, 2026-10-07 — see `execution.md`)

- **Type:** server
- **Description:** Extract `buildPendingWheres(userId, versionId?)` used by the legacy pending list, the new paged pending mode (3 paths × `applyKeysetCursor` + `take limit+1` → `mergeKeysetLists`, `pendingMeta.total` from counts) and `getAttentionCounts`. Controller: `updates` honours `limit` under `scope=pending`; new `GET attention-counts` (Swagger documented). Announcements unchanged.
- **Implements:** PPG-R-1 (all three scenarios: parity across result-scoped / Center / AI-job, admin scale "MUST NOT load rows", other users), PPG-R-4 (all scenarios: pages once, mid-paging mark-read, phase filter incl. phase-less AI-job rows, 400s, "legacy must NOT change"), PPG-NFR-3, PPG-NFR-5
- **Design:** §6.1, §6.2, §7.1, PPG-DD-1, PPG-DD-2
- **Files:** `notification.service.ts`, `notification.controller.ts`, both `.spec.ts`
- **Depends on:** PPG-T-2 (`countPendingReceived`) · **Blocks:** PPG-T-4, PPG-T-5
- **Estimate:** M · **Review:** full · **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Tests (red first):**
  1. Count parity per path: a fixture with 1 result-scoped, 1 Center-notice and 2 AI-job unread → `unreadUpdates = 4`; each path removed in turn changes the count by its share.
  2. Counts call `count`, never `find` with relations (spy). This is the "MUST NOT load rows" clause.
  3. Paged mode: 130 rows spread over the 3 paths, `limit=50` → every row once across pages, merged order, `total=130`.
  4. Mid-paging: after page 1, mark a page-1 row read in the fixture → page 2 has no repeat and no gap.
  5. `version_id=8` → phase-8 rows + phase-less AI-job rows only.
  6. Legacy (`scope=pending`, no `limit`) deep-equals today's response; `scope=history&limit=10` unchanged (BRS-T-3).
  7. 400 on bad `limit` / cursor under `scope=pending`.
- **Fails if:** the parity fixture has rows on one path only; or (4) never mutates the data between pages.
- **Definition of done:** tests green; existing notification specs green (scoped); lint clean.

### PPG-T-4 — Bell: counts + bounded groups

- **Status:** [x] (PASS attempt 2, 2026-10-07 — see `execution.md`)

- **Type:** client
- **Description:** Add `GET_notificationAttentionCounts` and the new params on `GET_allRequest` / `GET_requestUpdates`. `refreshBell()` fires counts + unseen (`limit=10, seen=false`) + seen (`limit=10, seen=true`) + unread updates (`limit=10`), generation-guarded. `bellCount`, `bellPendingRequestCount` and `shell-topbar.bellAllCount` read the counts; `bellItems` logic unchanged. Update `shell-topbar/CLAUDE.md` + its `Verified:` stamp.
- **Implements:** PPG-R-2 (all scenarios incl. "must NOT request any pending list without a `limit`"), PPG-R-3, PPG-NFR-1 (bell), PPG-NFR-4 (bell)
- **Design:** §8.1, PPG-DD-4
- **Files:** `results-api.service.ts`, `results-notifications.service.ts`, `shell-topbar.component.ts`, `shell-topbar/CLAUDE.md`, matching `.spec.ts`
- **Depends on:** PPG-T-2, PPG-T-3 (contract) · **Blocks:** —
- **Estimate:** M · **Review:** checklist · **Skills:** `angular-developer`, `tdd`
- **Tests:**
  1. Parity: for the same small dataset (≤10 per group), `bellItems`, `bellCount`, `bellPendingRequestCount` and `bellAllCount` equal the values the current code derives (snapshot the current outputs first).
  2. Admin: counts `{unseen: 1000, pending: 1150, unread: 6514}` + 10 rows per group → badge input 7514 (renders `99+`), Decide 1150, ≤30 rows held.
  3. Every bell request carries `limit` (assert on the HttpTestingController URLs, for refresh, mark-one-read, mark-all-read and decide paths).
  4. Counts request fails → previous counts kept, `bellError` true.
- **Fails if:** (3) only checks the page-load path (the refresh paths are the clause).
- **Definition of done:** scoped specs green (`results-notifications.service`, `shell-topbar`); lint clean; folder `CLAUDE.md` updated.

### PPG-T-5 — Inbox + boot: paged pending for updates and received

- **Status:** [x] (PASS attempt 2, 2026-10-07 — see `execution.md`)

- **Type:** client
- **Description:** `SourcePaging` gains pending cursor/hasMore/total for `updates` and `received`. `fetchPending` sends `limit=50`, sets page 1 and appends later pages under the existing `sourceGen` guards. Add `loadMorePending()` (in-flight guard, error keeps rows). `loadInbox` / `refreshSource` / phase change reset pending cursors. Boot `refreshPending('updates')` asks page 1 only. Missing `pendingMeta` → treat as complete. Render the pending "Load more" control in the inbox template, reusing the history button markup.
- **Implements:** PPG-R-5 (all scenarios: admin first paint, load more, ordinary user, error/retry, phase change), PPG-R-6 (client half), PPG-NFR-1 (inbox), PPG-NFR-4 (inbox), design §9 rollback rule
- **Design:** §8.2, §8.3 (Load more), §9
- **Files:** `results-notifications.service.ts`, `results-notifications.component.{ts,html}`, `app.component.ts` (only if the call shape changes), matching `.spec.ts`
- **Depends on:** PPG-T-2, PPG-T-3 · **Blocks:** PPG-T-6
- **Estimate:** L · **Review:** full (paging state machine) · **Skills:** `angular-developer`, `spartan`, `tdd`
- **Tests:**
  1. First load requests `limit=50` for updates and received; sent unchanged.
  2. Load more appends (new array reference, no duplicates); a second call while in flight issues nothing.
  3. `refreshSource` / phase change during an in-flight pending page → the stale page is dropped.
  4. Error on page 2 → rows and cursor kept; retry works.
  5. Response without `pendingMeta` → no control, rows kept as complete.
  6. ≤50 pending → no control (ordinary user parity).
  7. Boot refresh carries `limit`.
- **Fails if:** (3) does not interleave the responses (a sequential test cannot see the race).
- **Definition of done:** scoped specs green; lint clean; `results-notifications` folder `CLAUDE.md` updated if present.

### PPG-T-6 — Tab totals + partial-filter notice

- **Status:** [x] (PASS attempt 1, 2026-10-07 — see `execution.md`)

- **Type:** client
- **Description:** `allTabCount` / `decisionTabCount` / `infoTabCount` add the unloaded pending remainder per paged source when no filter is active. Show the partial-filter notice (`text-[12px]`, copy in the inbox copy file under `internationalization/`) when any filter is active and any pending source has more.
- **Implements:** PPG-R-7 (scenario + "BUT with a filter, counts are loaded-only"), PPG-R-8 (show + hide scenarios)
- **Design:** §8.3, PPG-DD-6
- **Files:** `results-notifications.component.{ts,html}`, inbox copy file, `.spec.ts`
- **Depends on:** PPG-T-5 · **Blocks:** —
- **Estimate:** S · **Review:** checklist · **Skills:** `angular-developer`, `tailwind-design-system`
- **Tests:**
  1. 6,000 pending updates, 50 loaded, no filter → All includes 6,000; Info includes the remainder; Decision unaffected by update remainder.
  2. Same with a search term → counts loaded-only and the notice is visible.
  3. Filter cleared, or `hasMore` false → notice hidden.
- **Fails if:** (1) asserts only `allTabCount` (the remainder classification is the risk).
- **Definition of done:** scoped specs green; no hard-coded English; lint clean.

## 4. Dependency graph

```
pre-flight ─► T-1
T-2 ─► T-3 ─┬─► T-4
            └─► T-5 ─► T-6
```

No cycles. T-1 can run in parallel with T-2 (different files). Only one test run at a time on this machine.

## 5. Test plan and coverage closure

| Clause | Owner |
|---|---|
| R-1 parity (all 3 notification paths + requests) | T-3 test 1, T-2 test 1 |
| R-1 "MUST NOT load rows" | T-3 test 2 |
| R-1 "BUT must NOT count another user's" | T-2 test 6, T-3 (fixture includes a second user) |
| R-2 parity for ordinary users | T-4 test 1 |
| R-2 admin ≤10 per group, `99+`, "N more" from counts | T-4 test 2 |
| R-2 "BUT must NOT request a pending list without `limit`" | T-4 test 3 |
| R-3 refresh paths bounded | T-4 test 3 |
| R-4 pages once / total | T-3 test 3 |
| R-4 mid-paging mark-read | T-3 test 4 |
| R-4 phase filter + phase-less | T-3 test 5 |
| R-4 "AND IT MUST 400" | T-3 test 7, T-2 test 7 |
| R-4 "BUT legacy must NOT change" | T-3 test 6, T-2 test 4 |
| R-5 admin first paint / load more / ordinary / error / phase change | T-5 tests 1, 2, 6, 4, 3 |
| R-6 received paged | T-2 tests 2-3, T-5 test 1 |
| R-6 "AND IT MUST keep `seen`" | T-2 test 3 |
| R-7 remainder counts; "BUT filter → loaded-only" | T-6 tests 1, 2 |
| R-8 show / hide | T-6 tests 2, 3 |
| R-9 migration check | T-1 |
| R-9 `EXPLAIN` uses index | HITL §6 (no automated gate, requirements §3A) |
| NFR-1..5 | T-2..T-5 as tagged above |

## 6. Rollout & verification (HITL)

1. Deploy PR 1 (Jenkins applies T-1's migration). The user runs on prdb, for an admin id (e.g. 90):
   `EXPLAIN SELECT notification_id FROM notifications WHERE target_user = 90 AND \`read\` = 0 ORDER BY created_date DESC, notification_id DESC LIMIT 51;`
   → `key = IDX_notifications_target_read_created`, no `Using filesort`.
   **Disqualifier:** an `EXPLAIN` on a local DB with few rows is not evidence.
2. Deploy PR 2. As an admin, the user opens any page and then the inbox with DevTools → Network: no `updates`/`received` pending response carries more than 50 rows; the bell carries ≤10 per group. Compare the timings with today's.
3. As an ordinary user: the bell and inbox look unchanged.

## 7. Cleanup & follow-ups

- Product question: admins as recipients of almost every result notification (proposal §12).
- `GET notification/updates-pop-up` (legacy, still unbounded) is only used by `header-panel`, which no template renders. It is a candidate for removal in a separate spec.

## 8. Roll-back plan

- Client only: revert PR 2. The server's legacy paths still serve the old client.
- Server: revert PR 1. The client treats a missing `pendingMeta` as complete (design §9). Drop the index with the migration `down` only if it causes write latency.
