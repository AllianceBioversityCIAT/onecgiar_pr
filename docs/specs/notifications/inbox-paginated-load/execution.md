# Execution Log — Notifications Inbox: Paginated Load & Pending-First

## Document Control

| Field | Value |
|---|---|
| Spec | `notifications/inbox-paginated-load` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Started | 2026-09-30 |
| Budget | 7 tasks · ~900 LOC · ≤ 2 review rounds/task · tripwire 9 tasks / ~1 200 LOC |
| Running LOC | ~506 (T-1: 163 src + 343 test) |

## Task Execution History

### PAGE-T-1 — Keyset cursor utility (server) — PASS

| Field | Value |
|---|---|
| Date | 2026-09-30 |
| Final status | PASS (attempt 1 of 3) |
| Implements | PAGE-R-3, PAGE-AC-3 |
| Skills (Leader-selected, per tasks.md) | `nestjs-expert`, `tdd` |
| Effort | Implementer medium · Reviewer checklist |

**Attempt 1**

- **Files changed (new only):** `onecgiar-pr-server/src/shared/utils/keyset-cursor.util.ts` (163), `keyset-cursor.util.spec.ts` (343).
- **API:** `KEYSET_PAGE_SIZE = 200`; `encodeCursor(date, id)`; `decodeCursor(cursor)` → throws `BadRequestException('Invalid cursor')` (400 via global `HttpExceptionFilter`); `applyKeysetCursor(where, cursor, { dateField, idField })` → N entries → 2N (`date < d` | `date = d AND id < i`), entries spread so nested `obj_result` is preserved; `sliceKeysetPage(fetched, fields)`; `mergeKeysetLists(lists, fields)` (hasMore = merged > 200 OR any list > 200).
- **Verification:**
  ```
  cd onecgiar-pr-server && npx jest --testPathPattern=keyset-cursor.util --silent
  PASS src/shared/utils/keyset-cursor.util.spec.ts — Tests: 32 passed, 32 total
  npx eslint src/shared/utils/keyset-cursor.util.ts src/shared/utils/keyset-cursor.util.spec.ts --quiet → clean
  ```
- **Falsifier:** 450 rows, tie on 0-based rows 198–201 (spans page boundary) → pages 200/200/50, 450 distinct ids, set equal to input. Test filters through the real `applyKeysetCursor` output (not a re-implementation). Malformed cursors (`"abc"`, bad date, non-numeric/negative/decimal id, bad charset, empty, oversized) → `BadRequestException`.
- **Reviewer verdict:** `STATUS: PASS` — conforms to tasks.md PAGE-T-1, design §4.1, §5 History, §7, PAGE-DD-2; cursor only narrows existing entries; no logging of cursor values. Reviewer was read-only and relied on the Implementer's run evidence for test/lint results.

**ADVISORY (4R — non-gating)**

- *Reliability:* cursor dates have ms precision; a `DATETIME(6)` column would break the `date = d` tie branch. **Leader check:** `share_result_request.requested_date` and `notification.created_date` are both `@CreateDateColumn({ type: 'timestamp' })` (MySQL fsp 0, second precision) → not applicable.
- *Readability:* spec line ~106 uses `fail()` (undefined under jest-circus); still fails correctly, `expect.assertions(1)` would be clearer.
- *Reliability:* `encodeCursor` throws a plain `Error` (500) on invalid row values — intended for a server-side data fault; T-2/T-3 callers should be aware.

**Assumptions recorded by Implementer (no scope owed):** where entries must not already constrain `dateField`/`idField` (documented in JSDoc; existing where-builders filter phase/active/status only).

**Forward pointers → PAGE-T-2 / PAGE-T-3:** use `KeysetFields` `{ dateField: 'requested_date', idField: 'share_result_request_id' }` and `{ dateField: 'created_date', idField: 'notification_id' }`; fetch `take: KEYSET_PAGE_SIZE + 1` with `order: { <date>: 'DESC', <id>: 'DESC' }`; `encodeCursor` may throw a 500-class `Error` on malformed rows.

**Decisions:** `BadRequestException` over `service-error.util` pattern (surfaces as 400 everywhere without controller plumbing).
**Issues:** none.
**Pre-flight still open:** baseline timing (PAGE-T-7 step 1) must be captured before PAGE-T-2/T-3 code; merge order with `notifications/w1w2-center-tagged` (uncommitted changes in `notification.service.ts`, touched by PAGE-T-3) undecided.

## Leader Decision — isolated worktree & unattended run (2026-09-30)

- **User instruction (2026-09-30):** continue through T-6 unattended; if everything touched is tested green, merge `performance-refactor` into the working branch, validate, then push to `performance-refactor`.
- **Concurrency:** a second session (`W1w2 tagged`, spec `notifications/w1w2-center-tagged`) is active in `D:\PRMS\onecgiar_pr` with uncommitted edits to `notification.service.ts` (PAGE-T-3's file). Per root CLAUDE.md *Concurrency* (one AKILI session per checkout; extra sessions on `git worktree`), this spec moved to worktree `D:\PRMS\onecgiar_pr-paging`, branch `spec/inbox-paginated-load`, based on `e82c53722` (= `qa-development-2026-ss` HEAD = `origin/performance-refactor` at fetch time). T-1 files copied; T-1 tests re-run green there (32/32). `node_modules` are junctions to the main checkout.
- **Merge order with w1w2 (pre-flight):** resolved by the Leader as *paging first, on committed code*; the w1w2 session's uncommitted `notification.service.ts` edits are **not** included and will need a normal git merge when that session commits.
- **Stale copies:** removing the moved T-1 files/spec folder from the main checkout was blocked by the harness; stale copies remain there for the user to delete.
- **Baseline (T-7 step 1):** not captured before code (user unavailable). It can still be measured by running commit `e82c53722`; T-7 stays a HITL task for the user.
- **Budget:** T-1 alone is ~506 LOC (test-heavy) against ~900 total; the LOC tripwire (~1 200) will likely be exceeded. Logged as information — the user's explicit "continue until done" is taken as the go-ahead; actual totals are reported at the end.

### PAGE-T-3 — Updates: phase, scope, paginated viewed, concurrency (server) — PASS

| Field | Value |
|---|---|
| Date | 2026-09-30 |
| Final status | PASS (attempt 2 of 3) |
| Implements | PAGE-R-1, R-2, R-3, R-6, R-7, PAGE-AC-1, -10, -11 |
| Skills | `nestjs-expert`, `api-design-principles`, `tdd` |
| Effort | attempt 1 high · attempt 2 xhigh (bumped on rework) · Reviewer full |

**Attempt 1**

- **Files:** `notification.controller.ts` (+62), `notification.service.ts` (+310/−), `notification.service.spec.ts` (+281), `notification.controller.spec.ts` (+88). 630 insertions / 111 deletions total.
- **Shape:** the controller parses `version_id` (positive int, else 400) and `cursor` (`decodeCursor`, 400) **before** looking at `scope`. `getAllNotifications(user, { versionId, scope, cursor })` builds all 7 `Promise.all` elements with no inner `await`; a skipped side becomes `Promise.resolve([])`. `version_id` reaches the result-scoped and Center-notice queries only; the AI-job finder stays unfiltered (P-7). The 3 viewed queries each run `take 201` with the shared cursor, then go through `mergeKeysetLists`. The response gains `viewedMeta`. Finders gained optional args only, so the pop-up and recent-activity call sites are unchanged.
- **Verification:** eslint clean · `tsc --noEmit` clean · `npx jest --testPathPattern="notification\.(service|controller)" --silent` → 3 suites, 92 tests passed.
- **Reviewer verdict: `STATUS: FAIL`** (verbatim finding):
  1. *Discovered Issue:* Falsifier (a) only catches an inner `await` reintroduced on the first `find()` call. Calls 2–7 returned `Promise.resolve([])`, and the test waited two microtask ticks, so an `await` re-added on element 2 or 3 would still record all 7 calls and pass.
     *Violated Rule:* tasks.md PAGE-T-3 Falsifier (a) ("repository mocks returning never-resolving deferreds… catches sequential `await`"); PAGE-R-7; design §5 Concurrency; PAGE-AC-11.
     *Remediation:* every `find()` returns its own deferred (collect the resolvers), assert 7 invocations, then resolve all; optional red check with an `await` on element 2.

**Attempt 2** (same Implementer, Reviewer report passed verbatim)

- **Files:** `notification.service.spec.ts` only; production code byte-identical to attempt 1 (Reviewer confirmed via the diff-of-diffs).
- **Changes:** every `find()` now returns its own never-resolving deferred, and the test asserts 7 calls and 7 resolvers before resolving them. Call-order comments fixed. Added `toHaveBeenCalledTimes(3)` to the `scope=history` merge test.
- **Red check:** temporarily added `await` on element 2 (`notificationsPending`). The falsifier (a) run then **FAILED** (`Expected number of calls: 7 / Received number of calls: 2`). Reverted afterwards.
- **Verification:** `npx jest --testPathPattern="notification\.(service|controller)" --silent` → 3 suites, 92 tests passed · eslint clean.
- **Reviewer verdict: `STATUS: PASS`.** The fix covers an `await` at any position, independent of timing. The attempt-1 conformance findings still hold: disqualifier, phase scoping, scope skipping, merge/sort/cut, bigint handling, controller validation.

**ADVISORY (4R — non-gating)**

- *Risk (PAGE-P-8 for viewed queries):* the viewed queries use one-to-many relations nested under `obj_result` together with `take` and `order`. **Leader:** covered by the PAGE-T-2 source evidence. Notification queries go through the same `Repository.find` → `SelectQueryBuilder` path (`typeorm/query-builder/SelectQueryBuilder.js:1960-2014`), which selects distinct root ids first whenever there are joins plus `skip`/`take`. The PAGE-T-7 admin walk still checks this by hand.
- *Reliability:* AI-job viewed rows now go through `mapNotificationResultFields`, a no-op when `obj_result` is null. Pending AI-job rows skip it, which is inconsistent but harmless.
- *Reliability:* `encodeCursor` throws on a missing `created_date`. This can't happen in production (`CreateDateColumn`).

**Decisions:** an unrecognized `scope` value is treated as absent (legacy shape), not 400. The design is silent on this, and the choice matches PAGE-R-6. **PAGE-T-4 must not rely on a 400 for a bad `scope`.** PAGE-T-2 made the same choice.
**Requirements covered:** PAGE-R-1 (incl. phase-less updates), R-2, R-3, R-6, R-7.

### PAGE-T-2 — Received/Sent: phase, scope, paginated done (server) — PASS

| Field | Value |
|---|---|
| Date | 2026-09-30 |
| Final status | PASS (attempt 1 of 3) |
| Implements | PAGE-R-1, R-2, R-3, R-6, PAGE-AC-1, -2, -4 (server), -10 |
| Skills | `nestjs-expert`, `api-design-principles`, `tdd` |
| Effort | Implementer high · Reviewer full |

**Attempt 1**

- **Files:** `share-result-request.controller.ts` (+78), `share-result-request.service.ts` (+291/−69), `share-result-request.service.spec.ts` (+244), `share-result-request.controller.spec.ts` (new, 102). 646 insertions / 69 deletions total.
- **Shape:**
  - `parsePagingParams` validates `version_id` (`/^[1-9]\d*$/`) and `cursor` before any repository call; bad input → 400 through `returnErrorRes` and `ResponseInterceptor`.
  - `fetchThreeBucketsScoped` replaces the removed private `fetchThreeBucketsDeduped`, which had no other callers. PERF-DD-1..3 are kept: one `Promise.all`, admin pending fetched once, one `enrichBucketsOnce`.
  - The `done` bucket in `buildWhere{Received,Sent}Conditions` now reads `obj_result` from `commonConditions`, so `version_id` reaches `done`. Without a phase the value is identical, and the pop-up never reads `done`.
  - `done` is fetched with `take 201`, ordered `(requested_date DESC, share_result_request_id DESC)`, and sliced **before** enrichment. The response gains `doneMeta`. Swagger `@ApiQuery` is documented for all 3 params on both endpoints.
- **PAGE-P-8 (verified, no DB):** `typeorm/entity-manager/EntityManager.js:531-536` (`find` → `createQueryBuilder().setFindOptions().getMany()`) and `typeorm/query-builder/SelectQueryBuilder.js:1960-2014`. With `take` and joins present, TypeORM first selects DISTINCT root ids with the limit, then loads the full rows, so a page holds distinct roots. **Premise P-8: assumed → verified.**
- **Verification:** `npx jest --testPathPattern=share-result-request --silent` → 6 suites, 151 tests passed · eslint clean · `tsc --noEmit` clean.
- **Falsifiers:** (a) `version_id` checked on every bucket including every `done` OR entry (Received and Sent) · (b) call counts for `scope=pending` (2) and `scope=history` (1) · (c) admin 201 → 200 + `hasMore` · (d) legacy keys + `doneMeta` · (e) 400 for `version_id=abc` and a bad cursor before any repository call, even with `scope=pending` · (f) 350 pending rows returned untruncated.
- **Reviewer verdict: `STATUS: PASS`.** Phase reaches every bucket, scope skips instead of discarding, `done` is keyset-paged and sliced before enrichment, and 400s fire before any query. The pop-up and PERF-DD-1..3 are unchanged.

**ADVISORY (4R — non-gating)**

- *Risk:* `ResponseInterceptor` (`src/shared/Interceptors/Return-data.interceptor.ts:33-43`) logs `request.url` and echoes it back as `path`, so cursor values now appear in logs. A cursor is a date plus an id, not a secret under `.cursorrules`, but this contradicts design §7 ("cursor/token never logged"). **Follow-up, out of spec scope:** strip the query string from that log, or reword §7. Not actioned (advisories never become tasks).
- *Reliability:* `version_id` has no length cap; a `Number.isSafeInteger` check would turn very long values into a 400. Harmless today, since such a value matches no rows.
- *Readability:* falsifier (a) has no admin (role=1) case. The 400 tests live in the service spec rather than the controller spec, because validation is in the service (design §10 lists them under the controller).

**Decisions:** unknown `scope` → legacy (same as T-3). Removed the dead `fetchThreeBucketsDeduped`, inside this task's own file. Added `requested_date` to 8 pre-existing fixtures (additions only, no assertion changed).

### PAGE-T-4 — Client API + service paging state — PASS

| Field | Value |
|---|---|
| Date | 2026-10-01 |
| Final status | PASS (attempt 2 of 3) |
| Implements | PAGE-R-2, R-4, R-5, PAGE-AC-5, -8, -9 |
| Skills | `angular-developer`, `tdd` |
| Effort | attempt 1 high · attempt 2 xhigh · Reviewer full |

**Attempt 1**

- **Files:** `results-api.service.ts` (+27/−9), `results-notifications.service.ts` (+303/−63), `results-notifications.service.spec.ts` (+430/−77).
- **Verification:**
  - `npx jest --testPathPattern=results-notifications.service` → 56 passed.
  - Consumer specs → 366 passed.
  - `ng lint` → clean.
- **Reviewer verdict: `STATUS: FAIL`** (3 issues; summary below, full text relayed verbatim to the Implementer):
  1. *Broken API spec.* The 3 API methods changed signature, but `results-api.service.spec.ts` still called them with a positional `'vN'`. This violates tasks.md PAGE-T-4 DoD "tests green" and design §4.1.
  2. *Per-source races.* The global `loadInbox` generation was the only guard, and `fetchHistory` always appended. That left two races: a stale `loadMore` page landing after `refreshSource` resurrected dropped pages and overwrote the cursor, and two concurrent `refreshSource` calls duplicated up to 200 rows. This violates design §6.2 `refreshSource` "replaces", PAGE-DD-6, and PAGE-R-3 "no row already returned".
  3. *Deleted spec cases.* Two existing `get_section_information` cases were deleted. This violates DoD "updated, not deleted".
- **Leader adjudication (folded into the rework; the design requires each):**
  - L1: `refreshSource`/`refreshPending` default `versionId` to `phaseFilter` (design §6.2 "at current phaseFilter").
  - L2: gate `historyLoading` and the legacy `loadingX` flags on the per-source token.
  - L3: keep the truthy `versionId` check.
  - Optional: log only `err?.status`, not the raw error.

**Attempt 2**

- **Files:** `results-notifications.service.ts` (+430), `results-notifications.service.spec.ts` (+662), `results-api.service.ts` (+39/−9), `results-api.service.spec.ts` (+89/−9). 1068 insertions / 152 deletions in total.
- **Changes:**
  - **Per-source token.** Added `sourceGen: Record<SourceKey, number>`, bumped by `loadInbox` (all sources) and by `refreshSource` (that source only). Responses with a stale token are dropped, but `onSettled` always fires.
  - **Replace vs. append.** A first page is set through `setHistoryRows`; a Load-more page is appended through `appendHistoryRows`, which builds a new array.
  - **Leader items.** L1, L2, L3 and the logging change are all in.
  - **API spec.** Updated, plus new cases: no options, scope + cursor, cursor escaping, and omitting `''`/`0`.
  - **Restored case.** The empty-response case for `get_section_information` is back.
  - **New tests:** falsifier 2a (stale `loadMore` after `refreshSource` dropped), 2b (concurrent `refreshSource`, no duplicates), and the L1 default.
- **Retired spec case (recorded):** "should update data for get_section_information when item.request_status_id is not 1". It asserted the `GET_requestIPSR` (`/request/get/all`) shape against a method that calls `GET_allRequest`. It also passed its assertion closure as `versionId`, so the callback never ran and the case never asserted anything. The Reviewer confirmed the retirement is legitimate.
- **Verification:**
  - `npx jest --testPathPattern="(results-notifications.service|results-api.service)"` → 2 suites, 377 passed.
  - Consumers `(results-notifications.component|app.component|header-panel.component|websocket.service|share-request-modal)` → 11 suites, 366 passed.
  - `ng lint` → clean.
  - `tsc -p tsconfig.spec.json` → 0 errors in the touched lines. 181 errors are pre-existing elsewhere; the 2 in `results-api.service.spec.ts` (L404, L3862) are outside the diff hunks, per the Reviewer.
- **Reviewer verdict: `STATUS: PASS`.** The per-source token closes both races. Falsifiers (a)–(e) still exercise the real code, and 2a/2b exercise the new guard.

**ADVISORY (4R — non-gating)**

- *Resilience (accepted, recorded next to PAGE-DD-6):* a `refreshSource(X)` (e.g. a socket event) that fires while the first `loadInbox` is loading drops `loadInbox`'s pending data for X but still counts it as settled. `initialLoading` can then clear before X's pending set arrives, and those rows land above rows already shown. This is a narrow edge of PAGE-R-2. Not fixed; T-7 can observe it.
- *Reliability:* when a newer `refreshSource` supersedes an older one, the older call's `callback` never fires (asserted on purpose). No production caller passes a callback.
- *Test gap:* no test covers a stale `loadMore`/`refreshSource` response arriving after `loadInbox(B)`. It goes through the same `sourceGen` check that 2a proves.
- *Readability:* the spec "omit version_id when versionId is null, undefined or an empty string" only tests `''`.

**Forward pointers → PAGE-T-5 / PAGE-T-6:**
- State the component can read: `initialLoading`, `hasMore` (getter, any source), `historyLoading` (getter, any first history page outstanding), `loadingMore`, `loadMore()`.
- `refreshSource(source)` and `refreshPending(source)` default to the current `phaseFilter`.
- The legacy wrappers already delegate, so T-5 only swaps the boot callers to `refreshPending('updates')` and the socket/modal callers to `refreshSource(...)`.
- History arrays are replaced on every change, so memoization by identity works.
