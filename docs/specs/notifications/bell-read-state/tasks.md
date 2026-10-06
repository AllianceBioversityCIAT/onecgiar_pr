# Tasks — notifications/bell-read-state

> **In one line:** 3 server tasks (table, seen endpoints + flag, history `limit`), then 4 client tasks
> (state, row look, popover, inbox). Server first; T-4 needs T-2 and T-3 contracts; T-5/T-6/T-7 need T-4.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-read-state` |
| Depth | Full |
| Status | approved (2026-10-06, Santiago Sanchez) |
| Requirements / Design | `requirements.md` (`BRS-R-1..R-9`, `D1..D8`) · `design.md` (`§5..§10`, `BRS-DD-1..7`) |
| Budget (from design §12) | 7 tasks · ~330 prod LOC · ~450 test LOC · ≤ 2 review rounds per task |
| Test rules (all tasks) | Jest **always** `--maxWorkers=2`, **always** scoped (`--testPathPattern`), one run at a time on the machine, never the full suite. Lint only the touched files (`npx eslint <files> --quiet`). Client alternative: `npm run test:local -- --testPathPattern=...` |
| Commit format | `<emoji> <type>(<scope>) [SPEC:notifications/bell-read-state]: <description>`. No apostrophes, `$` or quotes in the subject (Jenkins). **No commit without the user's go-ahead.** |

## 2. Task List

| Status | ID | Title | Type | Size | Depends on | Implements |
|---|---|---|---|---|---|---|
| [x] | `BRS-T-1` | Seen table: migration, entity, repository | db + server | S | — | `R-2`, `R-4` (idempotence), `D3`, `D6` |
| [x] | `BRS-T-2` | `seen` flag on received + `seen/:id` + `seen-all` | server | M | T-1 | `R-1`, `R-2`, `R-3`, `R-4`, `R-5`, `D2`, `D4` |
| [x] | `BRS-T-3` | Optional `limit` on the updates history page | server | S | — | `R-8` |
| [x] | `BRS-T-4` | Client state: counts, ordering, mark seen / mark all, read rows | client | M | T-2, T-3 | `R-1`, `R-3`, `R-4`, `R-6`, `R-8`, `R-9`, `D1`, `D7` |
| [x] | `BRS-T-5` | Row look (fresh / read) + request body click marks seen | client | M | T-4 | `R-3`, `R-7` |
| [x] | `BRS-T-6` | Popover: tab counts, "Earlier", chip, "Mark as read" | client | M | T-4, T-5 | `R-1`, `R-4`, `R-6`, `R-8` |
| [x] | `BRS-T-7` | Inbox page: shared "Mark all as read" + drawer marks seen | client | S | T-4 | `R-3`, `R-5`, `R-9` |

## 3. Tasks

### `BRS-T-1` — Seen table: migration, entity, repository

- **Type:** db + server
- **Description:** Create `share_result_request_seen` (design §5): composite PK `(share_result_request_id, user_id)`, index `(user_id, share_result_request_id)`, `seen_date` default `CURRENT_TIMESTAMP` with **no `ON UPDATE`**, FKs to `share_result_request` and `users` with `ON DELETE CASCADE`. Add the `ShareResultRequestSeen` entity and `ShareResultRequestSeenRepository` with `findSeenIds(userId, ids)` and `insertIgnore(userId, ids)` (one bulk statement, ignore on duplicate, returns the inserted count; empty `ids` → no query, returns 0). Register both in `share-result-request.module.ts`.
- **Implements:** `BRS-R-2` (per person), `BRS-R-4` AND IT MUST (idempotent), `D3`, `D6`
- **Design refs:** §5, §7 (repository row), `BRS-DD-1`
- **Files:** `onecgiar-pr-server/src/migrations/<ts>-AddShareResultRequestSeen.ts`, `.../share-result-request/entities/share-result-request-seen.entity.ts`, `.../share-result-request/repositories/share-result-request-seen.repository.ts` (+ `.spec.ts`), `.../share-result-request.module.ts`
- **Review:** full (schema)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Red run:** `cd onecgiar-pr-server && npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="share-result-request-seen.repository.spec"`. It fails before the file exists and passes after.
  - **Tests assert:** (a) both methods put the given `userId` in the WHERE / VALUES and nothing else selects the user; (b) `insertIgnore` issues **one** statement for 150 ids with ignore-on-duplicate; (c) empty ids → no DB call, returns 0.
  - **Migration:** `npm run migration:check` green. Review `up`/`down` by reading the SQL; `down` drops only this table.
  - **Falsifier:** an `insertIgnore` that loops one INSERT per id, or a query missing the user id, fails (a)/(b).
  - **What this cannot prove:** that MySQL actually dedupes and isolates rows. Jest mocks the query. → covered by the two-account TEST check (§6, `D2`/`D3`).
  - **Disqualifier:** if the repo has no way to run an insert-ignore in one statement through TypeORM for this MySQL version, stop and re-specify (raw `INSERT IGNORE` with bound params is the fallback, never string interpolation).
  - **Consumers:** none (new symbols).
- **Done:** files exist, spec green, `migration:check` green, lint clean on touched files.

### `BRS-T-2` — `seen` flag on received + `seen/:id` + `seen-all`

- **Type:** server
- **Description:** In `ShareResultRequestService`:
  1. `getReceivedResultRequest` tags each **pending** row with `seen` using **one** `findSeenIds(user.id, pendingIds)` call. No tag on `done`.
  2. `markSeen(user, id)`: 404 unless the request exists, is active and `request_status_id = 1`; then `insertIgnore(user.id, [id])`.
  3. `markAllSeen(user)`: same role + initiative resolution and `buildWhereReceivedConditions` as the inbox, **no version filter**, selecting ids only (no relations, no enrichment), then one `insertIgnore`. Returns `{ recorded }`.

  In the controller: `PATCH request/seen-all` and `PATCH request/seen/:shareResultRequestId` (`ParseIntPipe`), user from `@UserToken()`, Swagger, declared so `seen-all` is not captured by `:param`.
- **Implements:** `BRS-R-1` (data for the count), `BRS-R-2` (colleagues scenario; BUT never changes the request), `BRS-R-3` (already-seen: no duplicate), `BRS-R-4` (only me; BUT must not decide/hide; idempotent), `BRS-R-5` (all phases), `D2`, `D4`
- **Design refs:** §6, §7, `BRS-DD-2`, `BRS-DD-3`
- **Files:** `share-result-request.service.ts` (+ spec), `share-result-request.controller.ts` (+ spec)
- **Review:** full (API contract)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Red run:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="share-result-request.(service|controller).spec"`
  - **Tests assert:** (a) pending rows `[1,2,3]` with seen ids `[2]` → `seen` = `false,true,false`; done rows have no `seen`; `findSeenIds` called **once** with the caller's id. (b) `markSeen` on a done/inactive/missing id → 404 and **no** insert. (c) `markAllSeen` calls `insertIgnore(caller.id, <pending ids>)` once, the where builder gets **no** `version_id`, and **no** method of the `ShareResultRequest` repository that writes (`save`/`update`/`delete`) is called (`D4`). (d) user A's call never passes user B's id. (e) controller routes resolve `seen-all` to `markAllSeen` (not `markSeen('seen-all')`).
  - **Falsifier:** a service that tags `seen` from a query without the user id; a `markAllSeen` that passes the version filter; any write to the request entity.
  - **What this cannot prove:** real SQL isolation, or the speed with 150 pending requests → TEST checks `D2`, `D8` (§6).
  - **Disqualifier:** if the pending set used by `markAllSeen` cannot be made identical to the one the bell lists (same conditions minus version), stop: a mismatch would leave bold rows after "Mark as read".
  - **Consumers:** `getReceivedResultRequest` → client `GET_allRequest` (bell + inbox). The change is additive. Check `getReceivedResultRequestPopUp` is untouched.
- **Done:** specs green, lint clean, Swagger shows both routes.

### `BRS-T-3` — Optional `limit` on the updates history page

- **Type:** server
- **Description:** Accept an optional `limit` (integer 1..200; absent → 200, today's `KEYSET_PAGE_SIZE`) on the updates endpoint and apply it to the **history** `take` (`limit + 1`) and keyset slice of all three history sources. Pending untouched. Out of range or non-integer → 400.
- **Implements:** `BRS-R-8` (recent read updates, not full history), NFR performance
- **Design refs:** §6 (last row), §7, `BRS-DD-5`
- **Files:** `onecgiar-pr-server/src/api/notification/notification.controller.ts` (+ spec), `notification.service.ts` (+ spec)
- **Review:** checklist
- **Skills:** `nestjs-expert`, `api-design-principles`
- **Verification:**
  - **Red run:** `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="notification.(service|controller).spec"`
  - **Tests assert:** `limit=10, scope=history` → each history `find` gets `take: 11` and the page holds ≤ 10 rows with `hasMore` right; no `limit` → `take: 201` (unchanged); `limit=0` / `201` / `abc` → 400; `scope=pending` with `limit` → pending queries unchanged.
  - **Falsifier:** existing paging specs (`PAGE-R-2/R-3`) going red means the default changed.
  - **Disqualifier:** none expected; if the three-source merge cannot honour a smaller page without breaking `nextCursor`, keep `limit` client-side (slice) and record it.
  - **Consumers:** inbox paging (`GET_requestUpdates` without `limit`) must stay byte-identical.
- **Done:** specs green, lint clean.

### `BRS-T-4` — Client state: counts, ordering, mark seen / mark all, read rows

- **Type:** client
- **Description:** In `results-api.service.ts` add `PATCH_markRequestSeen(id)`, `PATCH_markAllRequestsSeen()`, and `limit` to `GET_requestUpdates` options. In `ResultsNotificationsService` (design §8.1): `bellUnseenRequests`, `bellPendingRequestCount`, `bellReadUpdates`, `loadBellReadUpdates()` (generation-guarded), **changed** `bellCount` and `bellItems` (tags `fresh`; order fresh requests → fresh updates → seen requests → read updates, newest first in each), `markRequestSeen(row)` (success → flip `seen` on the bell row and the inbox `receivedData` row; failure → no change), and `markAllBellRead()` replacing `markAllBellUpdatesRead` (`Promise.allSettled` of read-all + seen-all, then `refreshBell()` + `loadBellReadUpdates()`; local inbox sync only for legs that succeeded; rejects only if both failed).
- **Implements:** `BRS-R-1` (all three scenarios + filter independence), `BRS-R-3` BUT (no drop for unrecorded), `BRS-R-4` (Angel, arrives-later, failure), `BRS-R-6` (count sources), `BRS-R-8` (ordering, read rows), `BRS-R-9`, `D1`, `D7`
- **Design refs:** §8.1, `BRS-DD-4`, `BRS-DD-5`, `BRS-DD-6`
- **Files:** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (+ spec), `.../results-notifications/results-notifications.service.ts` (+ spec)
- **Review:** full
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Red run:** `cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(results-api.service|results-notifications.service).spec"`
  - **Tests assert:** (a) 140 pending (137 seen) + 5 updates (2 pending) → `bellCount` 5 (counted as 3 + 2) and `bellPendingRequestCount` 140; 120 unseen → 120 (the `99+` rendering is T-6). (b) `bellItems` order and `fresh` tags for a mixed set. (c) `markRequestSeen` success → count −1 and the inbox row flips; HTTP error → count unchanged. (d) `markAllBellRead`: both succeed → after refresh with server data all-seen, count 0, pending count unchanged; seen-all fails and read-all succeeds → updates cleared, requests still counted; both fail → rejects, state unchanged. (e) `loadBellReadUpdates` requests `scope=history&limit=10`; a stale response is dropped.
  - **Falsifier:** a `bellCount` that still adds `bellReceived().length`; an optimistic decrement before the PATCH resolves.
  - **Disqualifier:** if `receivedData` rows and bell rows cannot be matched by `share_result_request_id`, stop and re-specify the sync.
  - **Consumers:** `bellCount` → shell-topbar badge/label; `bellItems` → shell-topbar list; `markAllBellUpdatesRead` → **shell-topbar `markAllRead()`** (rename call site; grep for any other caller). `GET_requestUpdates` → inbox paging (no `limit` passed there).
- **Done:** specs green, lint clean on touched files.

### `BRS-T-5` — Row look (fresh / read) + request body click marks seen

- **Type:** client
- **Description:** In `pop-up-notification-item` (design §8.2, §8.3): fresh rows show bold text + 7px `--pr-color-primary-300` dot + an "Unread" prefix in the accessible name. Read rows show regular weight, `--pr-text-secondary`, status icon/chip at opacity 0.7. The "Requires decision" chip and Accept/Decline are **unchanged** in both states. Decision-row body **plain left click**: `preventDefault`, `markRequestSeen(row)`, `itemSelected.emit()`, `router.navigateByUrl(<same destination as the anchor>)`. Modifier and middle clicks keep native behavior. Accept/Decline clicks never mark seen by themselves (deciding removes the row anyway).
- **Implements:** `BRS-R-3` (request from bell; navigation kept; failed PATCH does not block nav), `BRS-R-7` (both states; not colour alone; a11y; BUT decision affordances unchanged), `BRS-DD-7`
- **Design refs:** §8.2 (row), §8.3, §10.1 (anchor reversion)
- **Files:** `onecgiar-pr-client/src/app/shared/components/header-panel/components/pop-up-notification-item/*` (+ spec), `internationalization/bell-quick-inbox.copy.ts` (`unreadRowPrefix`)
- **Review:** full (visual)
- **Skills:** `angular-developer`, `tailwind-design-system`, `spartan`, `frontend-design`
- **Verification:**
  - **Red run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="pop-up-notification-item.component.spec"`
  - **Tests assert:** fresh row has the dot element + bold marker + "Unread" in its label; read row has neither; `bell-accept`/`bell-decline` and the decide chip carry identical classes in both states; a plain click on a decision body calls `markRequestSeen` and `navigateByUrl`, and does **not** call the decision PATCH; a Ctrl/middle click calls neither and does not `preventDefault`; a failing `markRequestSeen` still navigates.
  - **What this cannot prove (`D5`):** that bold/dimmed actually read as different on screen, or the contrast of the dimmed state. jsdom only proves the classes are present. → browser check against `mockup/bell-read-state.html` at the validate HITL pause.
  - **Falsifier:** Accept/Decline gaining an opacity class on read rows.
  - **Disqualifier:** if the decision anchor's destination cannot be reproduced as an in-app URL, keep the anchor and fire the PATCH with `keepalive` instead, and record the deviation.
  - **Consumers:** shell-topbar (bell list), and the legacy `header-panel` template (not rendered, `BELL` glossary). No input/output signature change except reading `fresh`.
- **Done:** spec green, lint clean, folder `CLAUDE.md` updated if the folder has one.

### `BRS-T-6` — Popover: tab counts, "Earlier", chip, "Mark as read"

- **Type:** client
- **Description:** In `shell-topbar` (design §8.2): badge and button label read the new `bellCount` (`99+` above 99, hidden at 0). Header chip `N new` = `bellCount`. "Mark as read" visible when `bellCount > 0` and calls `markAllBellRead()` (keeps the `markingRead` double-click guard). Decide tab: `N to decide` in `--pr-color-orange-500` when > 0, hidden at 0. Updates tab: unread count, hidden at 0. All tab: listed-row count. "Earlier" separator before the first non-fresh row. Opening the popover also calls `loadBellReadUpdates()`. Cap 10 and `+N more` apply to the active tab's rows. Tab counts are part of each tab's accessible name. New copy: `earlier`, `decideCount(n)`. Update `shell-topbar/CLAUDE.md` and re-stamp `Verified:` in the same commit.
- **Implements:** `BRS-R-1` (render, `99+`, zero → no badge BUT Decide still shows), `BRS-R-4` (badge/chip/button disappear; Decide unchanged; failure re-enables), `BRS-R-6` (all three tabs + scenario), `BRS-R-8` (clicked row stays under "Earlier"; all-read lists light rows; nothing at all → empty state; Accept/Decline in both groups)
- **Design refs:** §8.2 (topbar), §8.3, §8.4
- **Files:** `onecgiar-pr-client/src/app/shared/components/shell-topbar/*` (+ spec, CLAUDE.md), `internationalization/bell-quick-inbox.copy.ts`
- **Review:** full (visual)
- **Skills:** `angular-developer`, `tailwind-design-system`, `spartan`
- **Verification:**
  - **Red run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="shell-topbar.component.spec"`
  - **Tests assert:** with a mocked service: count 0 + 40 pending → no `.pr-topbar-badge`, Decide shows `40 to decide`; count 120 → `99+`; after `markAllBellRead` resolves with count 0 → no badge, no chip, no button, Decide count unchanged; when it rejects → button enabled again; rows `[fresh, fresh, read]` → separator rendered once, before the third; 0 rows → existing empty copy; opening calls `loadBellReadUpdates` once. Existing BELL-T-4/T-8/T-10 tests are updated, not deleted.
  - **What this cannot prove (`D5`):** layout of the separator and tab counts in a 400px popover → browser check at the HITL pause.
  - **Falsifier:** a Decide count that drops after "Mark as read"; the badge reading `bellReceived().length`.
  - **Disqualifier:** if Spartan tabs cannot carry the count in the accessible name, stop and consult the Spartan MCP before working around it.
  - **Consumers:** `markAllRead()` (template only). `bellButtonLabel` copy keeps the count.
- **Done:** spec green, lint clean, `CLAUDE.md` re-stamped.

### `BRS-T-7` — Inbox page: shared "Mark all as read" + drawer marks seen

- **Type:** client
- **Description:** On the inbox page, "Mark all as read" calls `markAllBellRead()` and is shown when `bellCount() > 0` (all phases), not when the phase-filtered `notificationsPending` is non-empty. `markAllUpdatesNotificationsAsRead` is removed or delegates (grep callers). In `notification-item`, `openDrawer(...)` on a **received pending** request calls `markRequestSeen(row)`. Sent requests and done rows do nothing. Update `notification-item/CLAUDE.md`.
- **Implements:** `BRS-R-3` (request from inbox page), `BRS-R-5` (scenario + AND IT MUST be offered whenever fresh items exist), `BRS-R-9` (scenario), `D7`
- **Design refs:** §8.2 (inbox rows), §10.1 (inbox reversion)
- **Files:** `.../results-notifications/results-notifications.component.{html,ts}` (+ spec), `.../components/notification-item/notification-item.component.ts` (+ spec, CLAUDE.md)
- **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Red run:** `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(results-notifications.component|notification-item.component).spec"`
  - **Tests assert:** filtered view with 0 unread updates but `bellCount` 3 → button visible and calls `markAllBellRead`; `bellCount` 0 → hidden; opening the drawer on a received pending row calls `markRequestSeen` once; on a sent row or a done row it does not.
  - **Falsifier:** the button hidden while the bell shows a badge.
  - **Disqualifier:** if `openDrawer` is also reached for the sent tab through the same code path with no way to tell them apart, stop and add the discriminator to the spec first.
  - **Consumers:** `markAllUpdatesNotificationsAsRead` (template + any spec) → grep and migrate. `openDrawer` callers (row click, ToC step).
- **Done:** specs green, lint clean, `CLAUDE.md` re-stamped.

## 4. Dependency Graph

```
BRS-T-1 ──► BRS-T-2 ──┐
BRS-T-3 ──────────────┴──► BRS-T-4 ──┬──► BRS-T-5 ──► BRS-T-6
                                     └──► BRS-T-7
```

- Parallel-safe: `T-1` ∥ `T-3` (different modules). `T-5`/`T-6` ∥ `T-7` after `T-4`. **Only one Jest run at a time on the machine** (`CLAUDE.md` rules), so parallel implementation still verifies sequentially.

## 5. Coverage Closure (scenario and clause level)

| Requirement · scenario / clause | Owner task(s) |
|---|---|
| `R-1` counts fresh only | T-4 (count), T-6 (render) |
| `R-1` overflow `99+` | T-6 |
| `R-1` zero → no badge, BUT Decide still shows | T-6 |
| `R-1` AND IT MUST be filter-independent | T-4 (count built from the phase-agnostic bell snapshot; asserted with an inbox filter set) |
| `R-2` colleagues scenario | T-2 (query shape), TEST check §6 (real rows) |
| `R-2` BUT never changes the request | T-2 (`D4` assertion) |
| `R-2` AND IT MUST survive device/browser | T-1/T-2 (server persistence), TEST check §6 |
| `R-3` update from bell | already `BELL-R-9`; row stays light → T-4 (ordering) + T-6 (render) |
| `R-3` request from bell | T-5 |
| `R-3` request from inbox page | T-7 |
| `R-3` already seen → no duplicate | T-1 (insert-ignore), T-2 (markSeen) |
| `R-3` BUT failure does not block nav / badge not dropped | T-5 (nav), T-4 (no optimistic drop) |
| `R-4` Angel's case | T-4 (state), T-6 (badge/chip/button gone, Decide 140) |
| `R-4` arrives later | T-2 (new request has no seen row → `seen:false`), T-4 (counted) |
| `R-4` only me | T-2 (`D2` assertion), TEST check §6 |
| `R-4` failure | T-4 (state unchanged), T-6 (button re-enabled) |
| `R-4` BUT must not decide/hide/remove | T-2 (`D4`), T-6 (Decide count unchanged) |
| `R-4` AND IT MUST be idempotent | T-1, T-2 |
| `R-5` scenario (filtered inbox → bell clears) | T-7 (calls shared method), T-2 (all phases) |
| `R-5` AND IT MUST be offered whenever fresh | T-7 |
| `R-6` all three tabs + scenario | T-4 (sources), T-6 (render) |
| `R-7` scenario (two states) | T-5 |
| `R-7` AND IT MUST not be colour alone | T-5 (dot + weight both asserted) |
| `R-7` AND IT MUST expose state to AT | T-5 ("Unread" in accessible name) |
| `R-7` BUT decision affordances unchanged | T-5 |
| `R-8` clicked row stays | T-4 (ordering), T-6 (separator) |
| `R-8` all read → light rows | T-3 (limit), T-4 (`loadBellReadUpdates`), T-6 |
| `R-8` nothing at all → empty state | T-6 |
| `R-8` AND IT MUST keep Accept/Decline in both groups | T-5, T-6 |
| `R-9` scenario (inbox open → bell −1) | T-4 (`markRequestSeen` flips both), T-7 |
| NFR privacy | T-1, T-2 (user from token only) |
| NFR performance | T-2 (one bulk insert), T-3 (limit), TEST timing §6 |
| NFR data (migration, down) | T-1 |
| NFR a11y | T-5, T-6 |
| NFR compatibility (additive) | T-2 (contract), T-3 (default unchanged) |

## 6. Test Plan

| Test | Type | Covers | Where |
|---|---|---|---|
| `BRS-TEST-1` | unit server | `D2`, `D3`, `D6` | `share-result-request-seen.repository.spec.ts` (T-1) |
| `BRS-TEST-2` | unit server | `R-1..R-5` data, `D2`, `D4` | `share-result-request.service.spec.ts`, `.controller.spec.ts` (T-2) |
| `BRS-TEST-3` | unit server | `R-8`, compat | `notification.service.spec.ts`, `.controller.spec.ts` (T-3) |
| `BRS-TEST-4` | unit client | `D1`, `D7`, `R-9` | `results-notifications.service.spec.ts`, `results-api.service.spec.ts` (T-4) |
| `BRS-TEST-5` | unit client | `R-3`, `R-7` (presence only) | `pop-up-notification-item.component.spec.ts` (T-5) |
| `BRS-TEST-6` | unit client | `R-1`, `R-4`, `R-6`, `R-8` | `shell-topbar.component.spec.ts` (T-6) |
| `BRS-TEST-7` | unit client | `R-3`, `R-5` | `results-notifications.component.spec.ts`, `notification-item.component.spec.ts` (T-7) |
| `BRS-HITL-1` | **manual, TEST, two accounts** | `D2`, `D3`, `R-2`, `R-4` only-me | At validate: account A opens request X and presses "Mark as read" twice; account B (same SP) still sees X bold and counted. **Fails if** B's badge changes. |
| `BRS-HITL-2` | **manual, browser vs mockup** | `D5`, `R-7`, `R-8` layout | At validate: compare against `mockup/bell-read-state.html` at 400px and desktop. |
| `BRS-HITL-3` | **manual timing, TEST** | `D8` | At validate: "Mark as read" with ≥ 100 pending, 3 runs, server time from the network panel. **If the runs vary by more than 2×, report the spread, not a number.** |
| `BRS-HITL-4` | manual, Angel's account / profile | `OQ-1` | Confirm his pending requests are ≥ 10 before and his badge is 0 after "Mark as read". |

⚠️ The browser checks use the local stack, which writes to the shared DB and the production mailer (memory: browser checks hit shared prdb). Clicking "Mark as read" or opening requests **writes seen rows for that user**. That is harmless (it only affects that user's own state), but it is a write: do it in TEST with test accounts, and never press Accept/Decline.

## 7. Rollout & Verification

- [ ] Server tasks (T-1..T-3) committed and deployed before or together with the client; the contract is additive.
- [ ] `migration:check:ci` green; Jenkins applies the migration on deploy.
- [ ] `BRS-HITL-1..4` done at `/akili-validate`, results recorded in `validation-report.md`.
- [ ] Tell Angel (and Nicoleta) what changed once it is on TEST.
- [ ] Rollback: revert client commit (old badge returns); revert server commit + migration `down`.
