# Execution — Notifications: Bounded Pending Load (admin-scale)

## Document Control

| Field | Value |
|---|---|
| Spec | `notifications/admin-pending-paging` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` |
| Leader | Claude Code session (T1, opus) |
| Implementer / Reviewer | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| Started | 2026-10-07 |

## Pre-flight

- MySQL version (HITL, gates PPG-T-1): **8.0.46** (user screenshot of `SELECT VERSION();` on prdb, 2026-10-07) → online `ALGORITHM=INPLACE, LOCK=NONE` OK, PPG-DD-7 stands. T-1 serialized after T-3 (same feature folder, one test/check run at a time on this machine).
- Jest `--maxWorkers=2` + scoped; lint touched files only; no browser write clicks; no commit without go-ahead: carried in every brief.
- `docs/specs/kaizen-log.md` does not exist — no Active Lessons to carry.

## Task Execution History

### PPG-T-2 — Received pending: light index, counts, id-first paging

- Started 2026-10-07. Selected ahead of PPG-T-1 because T-1 waits on the MySQL-version HITL. Skills: `nestjs-expert`, `api-design-principles`, `tdd` (task list, unchanged). Effort: high.
- **Final status:** PASS on attempt 1 · 2026-10-07 · 1 Implementer attempt.

**Attempt 1 — Implementer**
- Files: `shared/utils/keyset-cursor.util.ts` (`PENDING_PAGE_SIZE = 50`); `share-result-request.service.ts` (`getPendingReceivedIndex`, `countPendingReceived` → `{ pendingRequests, unseenRequests }`, private `getReceivedPendingPage`; `parsePagingParams` carries `limit`/`seen`); `share-result-request.controller.ts` (`limit`/`seen` on `get/received`, Swagger, 400s); both `.spec.ts`. ~781 insertions, mostly tests.
- Test mapping: 1 parity non-admin + admin vs legacy `combineAndDistinct` length and unseen subset · 2 130 rows in 26 tie groups of 5 → 50/50/30 + a `limit=7` walk cutting inside tie groups · 3 seen partition 87+43 · 4 legacy: 3 tests (no `pendingMeta`; `scope=pending` without `limit`; `limit` without `scope=pending`) · 5 heavy fetch ids per page [51, 51, 30] · 6 other user's seen rows · 7 controller 400s (limit 0/201/abc/empty/1.5/-3; seen maybe/TRUE/1/empty) + service 400 on bad cursor.
- Red first: tests failed to compile before implementation; two fake-repo fixture bugs fixed afterwards (fixtures, not production code).
- Verification: `npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern "share-result-request|keyset-cursor"` → Test Suites 9/9 passed, Tests 294/294 passed. `npx eslint <5 touched files> --quiet` → exit 0.
- Not Done / Assumptions (verbatim gist; judged as declared deviations, not omitted scope — Reviewer confirmed each conforms):
  1. Paged mode sets `seen` from the index instead of calling `tagPendingWithSeen` (one `findSeenIds` per request, design §7.2); `tagPendingWithSeen` unchanged for legacy.
  2. `parseLimit` is a private copy in the share-result-request controller (same 1..`KEYSET_PAGE_SIZE` rule and message).
  3. `limit`/`seen` validated on every `get/received` call but act only under `scope=pending`.
  4. `hasMore` taken from the id count (`limit+1`), not from fetched rows.
  5. Paged response keeps `receivedContributionsDone: []` + `doneMeta` (today's `scope=pending` shape) plus `pendingMeta`.

**Attempt 1 — Reviewer: `STATUS: PASS`**
- Summary: paged received-pending mode, `getPendingReceivedIndex` and `countPendingReceived` match PPG-R-1, R-4 (received 400s), R-6, NFR-3, NFR-5, design §6.3, §7.2, PPG-DD-1, PPG-DD-3. Legacy path untouched; light query and its where-array mirror today's inclusion rules for admins and non-admins; tests exercise real page boundaries, ties, the seen partition and parity against legacy output.
- ADVISORY (recorded, non-gating):
  1. RELIABILITY — if all `limit+1` ids vanish between the index and the heavy fetch, the response is `hasMore: true, nextCursor: null`; suggested fallback `encodeCursor` of the last index entry.
  2. RISK — the heavy fetch filters only by `In(ids)` (design §7.2 literal), so a request decided between the two queries can appear on a pending page with a non-pending status; suggested adding `request_status_id: 1, is_active: true` to the heavy where.
  3. READABILITY — tasks.md PPG-T-2 and design §7.2 still say `tagPendingWithSeen` for paged mode; sync design text at `/akili-archive`.
  4. READABILITY — `parseLimit` duplicated in two controllers; candidate shared `parseKeysetLimit` in `keyset-cursor.util.ts`.

**Leader notes**
- Diff handed to the Reviewer as a frozen snapshot file in the session scratchpad (899 lines) instead of inline; the Reviewer read it in full. Deviation from the inline-diff rule recorded here.
- Advisories 1–2 surfaced to the user for a decision (no task minted).
- Requirements covered: PPG-R-1 (request counts), PPG-R-2 (server side, requests), PPG-R-4 (received 400s), PPG-R-6, PPG-NFR-3, PPG-NFR-5.
- Forward pointer → PPG-T-3: call `ShareResultRequestService.countPendingReceived(user)` (returns `{ pendingRequests, unseenRequests }`, all phases).
- Not committed (gated; user go-ahead required).
- User gate 2026-10-07: "Si continúa" → proceed to PPG-T-3. No decision given on advisories 1–2; they stay recorded as follow-ups (not folded into T-2).

### PPG-T-3 — Notifications: shared where builder, paged pending, attention-counts endpoint

- Started 2026-10-07. Skills: `nestjs-expert`, `api-design-principles`, `tdd` (task list, unchanged). Effort: high. Forward pointer from T-2 (`countPendingReceived`) carried in the brief.

**Attempt 1 — Implementer**
- Files: `notification.service.ts` (`buildPendingWheres` → `{ resultScoped, centerNotice, aiJob }`; private `centerNoticeWhere`, `bilateralAiJobWhere`; shared `resultScopedObjResult()`; `countPendingUpdates` = 3 × `repository.count({ where, relations })`; `getAttentionCounts`; paged pending mode when `scope === 'pending' && limit !== undefined`), `notification.controller.ts` (`GET attention-counts` + Swagger; Swagger text for `updates`), both `.spec.ts`. 616 insertions / 44 deletions.
- Verification: `npx jest --silent --reporters=summary --forceExit --maxWorkers=2 --testPathPattern "api/notification"` → Test Suites 4/4 passed, Tests 197/197 passed. eslint (4 files, `--fix`) clean; Jest re-run after.
- Not Done / Assumptions (gist):
  1. Existing BRS-T-3 test `scope=pending with limit: pending queries are unchanged (no take)` rewritten to expect 3 paged pending queries (`take 11`) + 1 unpaged announcements query (cites PPG-R-4 supersession).
  2. `count` relations are minimal (`obj_result`, `obj_result_by_initiatives`, `obj_notification_type`); DISTINCT semantics proven only on the in-memory fake repo; generated SQL unverified on a real DB.
  3. AI-job rows not passed through `mapNotificationResultFields` in paged mode (same as legacy).
  4. `scope` omitted + `limit` keeps meaning a history page size (BRS-T-3).
- Leader: assumption 1 sent to the Reviewer as a key check — whether any live client caller sends `scope=pending` + `limit` today (NFR-3 risk).

**Attempt 1 — Reviewer: `STATUS: PASS`** (diff as frozen scratchpad snapshot, 844 lines)
- Key check: no live client caller sends `scope=pending` with `limit` (`GET_requestUpdates` call sites in `results-notifications.service.ts` L241, L537 pending without limit; L257, L563 history). The rewritten BRS-T-3 test changes no live response; PPG-NFR-3 holds. PPG-T-4 will be the first caller to send `limit` under pending.
- Summary: paged pending (opt-in via `scope=pending` + `limit`), the shared where builders and `GET attention-counts` match design §6.1/§6.2/§7.1, PPG-DD-1/DD-2 and NFR-5. Legacy and history unchanged; all 7 tasks.md tests present with fixtures avoiding the "Fails if" traps. Assumption 2 (minimal count relations) acceptable: every where key is covered by the loaded relations; TypeORM `count` counts DISTINCT PKs. Assumptions 3–4 conform.
- ADVISORY (recorded, non-gating):
  1. RELIABILITY — count/list parity proven only by the in-memory fake (ignores relations). Suggest asserting each count `where` deep-equals the list `where` and `relations` cover every referenced key; one-time live check: `attention-counts.unreadUpdates` == legacy `scope=pending` `notificationsPending.length` for the same user.
  2. READABILITY — JSDoc on `getAllNotifications` (~L837) still says "pending is never limited".
  3. READABILITY — legacy/paged Center & AI-job finders call the per-path builders with their own args rather than reading `buildPendingWheres(...)`; definitions can't drift, args are written twice.
  4. RISK — pending and history share one untyped `cursor`; cross-replay is accepted (harmless), worth noting in the client contract.

**Leader notes**
- **Final status:** PASS on attempt 1 · 2026-10-07 · 1 Implementer attempt.
- Requirements covered: PPG-R-1 (all three scenarios, server), PPG-R-4 (all scenarios), PPG-NFR-3, PPG-NFR-5.
- Advisory 1's live parity check surfaced to the user as an optional addition to the §6 HITL rollout check — no task minted, tasks.md not changed.
- Not committed (gated).

### PPG-T-1 — Composite index migration

- Started 2026-10-07 after the MySQL 8.0.46 pre-flight. Skills: `nestjs-expert`. Effort: medium.

**Attempt 1 — Implementer**
- Files: new `src/migrations/1790800000000-NotificationsTargetReadCreatedIndex.ts` (class/name `NotificationsTargetReadCreatedIndex1790800000000`); `src/api/notification/entities/notification.entity.ts` (`@Index('IDX_notifications_target_read_created', ['target_user','read','created_date','notification_id'])`).
- up: ``CREATE INDEX `IDX_notifications_target_read_created` ON `notifications` (`target_user`, `read`, `created_date`, `notification_id`) ALGORITHM=INPLACE LOCK=NONE``, skipped if the index exists (`information_schema.STATISTICS`). down: ``DROP INDEX `IDX_notifications_target_read_created` ON `notifications` ``, skipped if absent. Idempotency guard added per repo rule 25 (exemplar 1790700000000), not in the work order.
- `npm run migration:check` (normal local config → shared prdb, read-only): Total 490, Executed 499, Pending 1 (`NotificationsTargetReadCreatedIndex1790800000000`) → exits non-zero, as expected before the pipeline applies it. The script only compares migration files to the migrations table — it has **no entity-vs-schema drift comparison**, so it cannot prove the task's "no drift" clause. Executed > total pre-exists (rows with no local file).
- Lint: `npx eslint <2 files> --quiet` → exit 0.
- Not Done / Assumptions: DoD "check green" inconclusive (see above); entity `@Index` checked by reading only.

**Leader probe — substitute drift evidence (Deferring-a-check rule)**
- Assumption tested: "entity/migration agreement cannot be verified until the pipeline applies the migration."
- Probe: `npm run typeorm -- migration:generate ./src/migrations/PpgDriftProbe -d ./src/config/orm.config.ts --dr` (dry run, no file written, read-only against prdb).
- Result: the generated up contains ``CREATE INDEX `IDX_notifications_target_read_created` ON `notifications` (`target_user`, `read`, `created_date`, `notification_id`)`` — same name and column order as the migration; down drops the same name. So once the migration is applied, the entity introduces no drift for this index.
- Pre-existing, unrelated drift also printed (notifications FK renames, `IDX_notifications_review_history`, `user_notification_settings` tinyint defaults) — out of scope, not introduced by this task.

**Attempt 1 — Reviewer: `STATUS: PASS`** (diff inline, ~50 lines)
- Summary: the migration builds the specified index (right columns, right order, backtick-quoted incl. reserved `read`, online `INPLACE`/`LOCK=NONE`, idempotent guard identical to the exemplar's `indexExists`, rule 25 four futures documented). `down` drops exactly the same constant name; the entity `@Index` matches, confirmed by the dry-run `migration:generate`. Entity property→column names verified (`notification_id` L26, `target_user` L53, `read` L110, `created_date` L117). Timestamp is newest; `orm.config.ts:24` glob registers it (the pending report confirms).
- Substitute verification judged acceptable, not a conformance FAIL: `scripts/check-pending-migrations.ts` (L136–176) only compares files to the `migrations` table and never compares entities to the schema, so "`migration:check` passes (no drift)" assumes a capability the tool lacks. The dry-run generate is the real entity-vs-schema comparison and answers the "Fails if" clause; Disqualifier respected (local config, not hand-applied).

**Leader notes**
- **Final status:** PASS on attempt 1 · 2026-10-07 · 1 Implementer attempt.
- Requirements covered: PPG-R-9 ("migration:check" scenario, via the substitute evidence above). PPG-NFR-2 / the `EXPLAIN` scenario stays HITL (tasks.md §6).
- **Post-deploy HITL (open, owned by the user at the §6 rollout pause):** after Jenkins applies PR 1, `npm run migration:check` → 0 pending, plus the PPG-R-9 `EXPLAIN`. Leader judgment: this is post-deploy verification, not unimplemented scope, so it does not hold the task at `[~]`; it is recorded here and surfaced to the user.
- User gate 2026-10-07: offered committing PR 1 (T-1..T-3) before T-4; user answered "Continua" → server changes stay uncommitted, proceed to PPG-T-4.
- **Kaizen candidate (recorded, not applied — shared-file discipline):** the wording "so `migration:check` sees no drift" in `tasks.md` PPG-T-1, `design.md` §5 and `onecgiar-pr-server/CLAUDE.md` §5 is a doc defect — the check has no drift detection; the drift tool is `migration:generate --dr`. Apply at `/akili-archive` on `staging`.
- Not committed (gated).

### PPG-T-4 — Bell: counts + bounded groups

- Started 2026-10-07. Skills: `angular-developer`, `tdd` (task list, unchanged). Effort: high. Server contract from T-2/T-3 and the T-3 shared-cursor advisory carried in the brief.

**Attempt 1 — Implementer**
- Files (client, `src/app/`): `shared/services/api/results-api.service.ts` (`GET_notificationAttentionCounts`; `limit`/`seen` on `GET_allRequest`; `buildPagingQueryParams` serializes boolean `seen`); `results-notifications.service.ts` (`bellCounts` signal, `BellCounts`, `BELL_GROUP_LIMIT = 10`; `bellCount` = unseen + unread; `bellPendingRequestCount` = pending; `refreshBell()` 4 legs under the generation guard; `markRequestSeen` decrements `unseenRequests` after server confirm; `bellItems` untouched); `shell-topbar.component.ts` (`bellAllCount`, `bellUpdatesCount`, `bellOverflow` from counts); `shell-topbar/CLAUDE.md` (bullet + `Verified:`); 3 specs. 365 insertions / 28 deletions.
- Verification: `npx jest --maxWorkers=2 --no-coverage --testPathPattern="results-notifications.service|shell-topbar|results-api.service|results-notifications.component|pop-up-notification|header-panel"` → 13 suites, 1197 tests passed. `npx ng lint --lint-file-patterns <3 .ts> --quiet` → All files pass linting (plain `npx eslint` cannot run: no `eslint.config`, ESLint 9). `npm run test:local` printed nothing in the agent shell, so jest was called directly with `--maxWorkers=2`.
- Test mapping: 1 parity written against unchanged code first, literal expected values · 2 service HTTP (7514 / 1150 / ≤30 rows) + topbar renders `99+` · 3 HTTP describe over refresh, mark one read, mark all read, decide from bell, decide with phase filter; `expectBounded` asserts `limit=` on every received/updates URL · 4 counts 500 keeps previous counts, `bellError` true.
- Not Done / Assumptions (gist): (1) `bellUpdatesCount` also moved to `unreadUpdates` (outside the task's named list; equal for ≤10 rows); (2) Updates-tab `bellOverflow` = unread + loaded read − 10; (3) received legs filter rows by their own `seen` side (old-server safety); (4) `shell-topbar/CLAUDE.md` 131 lines vs 120 cap (was 123); (5) `prettier --check` already failing at HEAD on 2 files (unknown `bracketLine`); (6) bell never sends `cursor`.

**Attempt 1 — Reviewer: `STATUS: FAIL`** (diff as frozen scratchpad snapshot, 616 lines). Code judged spec-conformant (4 legs, generation guard, every refresh path bounded, Fails-if clause met, inbox untouched, naming OK; assumptions 1, 2, 3, 5, 6 accepted). FAIL is docs-only — verbatim:

> 1. **Discovered Issue:** shell-topbar/CLAUDE.md now contradicts itself on the exact behaviour PPG-T-4 changed, and the edit made a file that was already over the line cap longer still (123 → 131 lines). The new bullet (L75-81) says the Updates tab and "+N more" come from `bellCounts()`/server totals. The existing bullets were left as they were: L70: "Updates = `bellUpdates().length`" is now wrong. L72-73: "Cap 10 / `+N more` count the ACTIVE tab (`bellTabItems`)" is now wrong; `bellOverflow` uses server totals. L42: "a `+N more` link when `bellCount > 10`" was already stale and now contradicts the new bullet too.
>    - **Violated Rule:** tasks.md §PPG-T-4 Description + DoD; onecgiar-pr-client/docs/COMPONENT-DOCS.md §4 (hard cap 120 lines) and §3; onecgiar-pr-client/CLAUDE.md §10 "Folder docs".
>    - **Remediation Suggestion:** Correct the existing bullets in place (L70 Updates = `bellCounts().unreadUpdates`; L72-73 "+N more = active tab's server total − 10 (`bellOverflow`)", cap 10 still counts `bellTabItems`; L42 "+N more" follows the active tab's server total). Cut the new PPG bullet to facts not stated elsewhere (4 calls all with `limit`; ≤30 rows held; failed leg keeps data + `bellError`; never call without `limit`). Bring the file to ≤120 lines (shrink history in L14-20, L8-12, L119-122 to one line each with spec/ticket ID). Re-stamp `Verified:`. Docs-only; no test rerun.

ADVISORY (recorded, non-gating):
1. RESILIENCE — server-only rollback breaks the bell badge: `attention-counts` 404 → `bellCounts` stays {0,0,0}, `bellError` on every refresh; popover hidden (`bellPopoverEnabled = false`) so the badge shows 0 for everyone. Design §11 / tasks §8 "rollback of the server alone works" holds for the inbox (§9) but not the bell. Design gap; possible fix: fall back to row-derived counts when counts never loaded and the call fails.
2. RELIABILITY — `markRequestSeen` decrement can race an in-flight counts response (off by one until next refresh).
3. RELIABILITY — if a row flips `seen` side and only the seen leg succeeds, it can show twice until next refresh; cheap guard in the merge.
4. READABILITY — `bellUnseenRequests` (service L195) is now dead code.

Leader adjudication: FAIL is in scope (DoD names the folder CLAUDE.md) → attempt 2, docs-only, same Implementer context resumed. Effort bump high → xhigh per rule (low-risk docs edit). Advisory 1 contradicts design §11's rollback claim → surfaced to the user as a spec gap at the T-4 gate (no task minted).

**Attempt 2 — Implementer** (resumed context, effort xhigh, docs-only)
- File: `shell-topbar/CLAUDE.md` only (no .ts → no test rerun). Corrected in place: popover line (`+N more` when active tab's server total > 10, `bellOverflow`); tab counts (All = pending + unread + loaded read rows; Updates = `bellCounts().unreadUpdates`); cap 10 on `bellTabItems`, `+N more` = tab server total − 10. PPG bullet cut 7 → 4 lines. History condensed (Release notes move narrative, sidebar-toggle note → STC ID + facts, `quick/topbar-labelled-actions` → 2 lines).
- Verification: `wc -l` = 120 (Leader re-confirmed); grep for `bellUpdates().length` / `bellCount > 10` → none.

**Attempt 2 — Reviewer: `STATUS: PASS`** (same Reviewer context resumed; doc diff as frozen scratchpad snapshot)
- Summary: FAIL 1 is fixed. The popover, tab-count and cap/overflow bullets now match `shell-topbar.component.ts` (`bellUpdatesCount` L215, `bellAllCount` L222-225, `bellOverflow` L233/L240-245, `bellState` L256-262). File at the 120-line cap with the stamp on the last line; condensing dropped only history (minor: "both expanded and collapsed states" detail of the sidebar note, documented by the owning component). PPG-T-4 code already found spec-conformant in attempt 1, unchanged.
- ADVISORY (new): READABILITY — L69 "4 calls, all with `limit=10`" is imprecise: `attention-counts` takes no `limit`; suggest "counts + 3 list calls with `limit=10`". Attempt-1 advisories 1–4 carried over (recorded above).

**Leader notes**
- **Final status:** PASS on attempt 2 · 2026-10-07 · 2 Implementer attempts (attempt 1 FAIL docs-only, attempt 2 PASS).
- Requirements covered: PPG-R-2 (all scenarios), PPG-R-3, PPG-NFR-1 (bell), PPG-NFR-4 (bell).
- Open user decision (spec gap from attempt-1 advisory 1): bell fallback under a server-only rollback — asked 2026-10-07, not yet answered; no task minted.
- Not committed (gated).
- User gate 2026-10-07: "Si" → proceed to PPG-T-5. Rollback-fallback question not answered → stays a recorded follow-up.

### PPG-T-5 — Inbox + boot: paged pending for updates and received

- Started 2026-10-07. Skills: `angular-developer`, `spartan`, `tdd` (task list, unchanged). Effort: xhigh (paging state machine, race guards). Forward pointers carried: T-3 advisory 4 (shared untyped `cursor` → separate pending/history cursor state); T-4 bell must stay unaffected; T-6 needs `pendingHasMore`/`pendingTotal` exposed. Lint via `ng lint --lint-file-patterns` (no `eslint.config`).

**Attempt 1 — Implementer**
- Files (client, `src/app/`): `results-notifications.service.ts` (`SourcePaging` + `pendingHasMore`/`pendingNextCursor`/`pendingTotal`; exported `PENDING_PAGE_SIZE = 50`; `fetchPending` sends `limit=50` for updates/received, set page 1 / append later; per-source `pendingGen` beside `sourceGen`; `loadMorePending()` with `loadingMorePending`; missing `pendingMeta` → complete; readable `pendingHasMore(source)`, `pendingTotal(source)`, `hasMorePending`; history writes merge instead of overwrite), `results-notifications.component.html` (pending "Load more pending" under the date-grouped list, above the history control, reusing `hlmBtn` outline markup, hidden during `initialLoading`, disabled + `aria-busy` while loading), `internationalization/contribution-request-drawer.copy.ts` (`inbox.loadMorePending`), both specs. `app.component.ts`, `results-api.service.ts` untouched (call shape unchanged). No folder `CLAUDE.md` for `results-notifications`.
- Verification: `npx jest --maxWorkers=2 --no-coverage --testPathPattern="results-notifications|shell-topbar|results-api.service|app.component"` → 25 suites, 1244 tests passed (T-4 bell specs included). `npx ng lint --quiet --lint-file-patterns=<each of 5 files>` → pass. `npx tsc --noEmit -p tsconfig.app.json` → clean. Template not checked under `ng build`; no browser run.
- Test 3 interleaving: page 2 held on an unresolved Subject while the reload completes, then the stale page emits and is dropped; covers `refreshSource`, `onPhaseChange`, `loadInbox`, boot `refreshPending`; plus an old page 1 landing after a newer `loadInbox()`. Removing the `pendingGen` check turned the boot variant red.
- Not Done / Assumptions (gist): (1) beyond brief — `readUpdatesNotifications` moves `pendingTotal` ±1 with the optimistic toggle (rollback on error); (2) beyond brief — `markAllBellRead` clears updates pending paging on success; (3) no client-side de-dup on append (keyset cursor, like history); (4) PPG-DD-8: `refreshSource('received')` resets pending to page 1; (5) placement: no separate pending block in the template, so the control sits above the history control.
- Leader: effort xhigh → parallel lens review: reviewer A (spec + reliability/resilience), reviewer B (spec + readability/risk/UI). Diff given as a frozen snapshot vs HEAD with the T-4 hunks flagged as already reviewed.

**Attempt 1 — Reviewer B (spec + readability/risk/UI): `STATUS: PASS`**
- Summary: T-5 hunks meet PPG-R-5, PPG-R-6 (client half), PPG-NFR-4 and the §9 rollback rule. Control reuses the history button markup (§8.3), copy goes through `internationalization/` (`contribution-request-drawer.copy.ts` is the de facto inbox copy file, bound as `copy` in the component), tests cover tasks.md 1–7 incl. the interleaved stale-page race. Beyond-brief additions (`pendingTotal` ±1; `markAllBellRead` clears pending paging) judged in scope and justified (T-6 remainder correctness). Five legacy assertions only gained `limit: 50` in exact `toHaveBeenCalledWith` — legitimate. Template bindings all resolve to real non-signal members; compile risk low.
- **Spec gap (not a violation):** PPG-R-5 / design §8.3 assume a "pending block" rendered above history; the inbox is one date-grouped merged list (`today`/`thisWeek`/`earlier` by `activityDate`), so page-2 pending rows land inside earlier date groups among history rows, above the button — not visibly "appended below".
- ADVISORY: (1) RISK/UX — record the spec gap; amend PPG-R-5/§8.3 or follow up (live-region "N more pending loaded" or focus first new row). (2) READABILITY — two adjacent outline buttons "Load more pending" / "Load more" may read as redundant. (3) READABILITY — no-op `expect(fn).toBeDefined()` at the end of the `it.each` stale-page test. (4) RISK — no `ng build` and no browser run; run a build and a read-only visual check before commit.

**Attempt 1 — Reviewer A (spec + reliability/resilience): `STATUS: FAIL`** — verbatim issue:

> 1. **Discovered Issue:** The rollback rule only works on page 1. In `fetchPending`, `const loaded = isFirstPage ? rows : [...this.getPendingRows(source), ...rows];` appends even when a later page has no `pendingMeta`. Take a server rolled back while an admin is paging: page 1 came from the new server (`hasMore: true`), and page 2 hits the old server, which ignores `limit`/`cursor` on `scope=pending` and returns the complete pending set. The client appends that whole set onto the 50 rows already loaded, so the first 50 are duplicated. `pendingTotal` also becomes `50 + N` instead of `rows.length`. If the old server instead rejects the cursor with a 400, the error path keeps `pendingHasMore: true`, so the control keeps offering a retry that can never succeed. I could not tell from the code which of the two the old server does; both break the rule.
>    - **Violated Rule:** `design.md` §9, `pendingMeta` row: "Missing `pendingMeta` (old server during rollback) → the client treats the pending set as complete (`hasMore:false`, `total = rows.length`)". Also §11 Order: "rollback of the server alone works because the client falls back when `pendingMeta` is missing (§9)". And `requirements.md` PPG-R-5 "Scenario: load more": "...append below the loaded ones, with no duplicates". `tasks.md` PPG-T-5 lists "design §9 rollback rule" under Implements; Test 5 only exercised it on page 1.
>    - **Remediation Suggestion:** In `fetchPending`, when `config.pagedPending && !response.pendingMeta`, treat the response as the complete set whatever the cursor: `loaded = rows` (SET, not append), `pendingHasMore: false`, `pendingNextCursor: null`, `pendingTotal: rows.length`. Add a service test: page 1 has `pendingMeta {hasMore:true, nextCursor:'c1'}` with ids 1..50; `loadMorePending()` gets a response with no `pendingMeta` and ids 1..70. Expect exactly ids 1..70 once each, `hasMorePending` false, and `pendingTotal('updates')` 70. Optional: if a page with a cursor fails with 400, set `pendingHasMore: false` so the control doesn't loop. Mention it in `execution.md` if you skip it.

Reviewer A confirmed: cursors separate; `loadingMorePending` never stuck; phase change/boot races handled; set vs append correct; tests 1–7 present with real interleaving; `sent` unchanged; T-4 bell untouched; assumptions 1–6 accepted.
ADVISORY (recorded, non-gating): (1) RESILIENCE — `loadingMorePending` not reset by `loadInbox`/`refreshSource` (a stale request keeps the new phase's control disabled until it settles; same as `loadingMore`). (2) RELIABILITY — `markAllBellRead` clears updates paging without bumping `pendingGen.updates`; an in-flight page can land after and re-enable `pendingHasMore`. (3) RELIABILITY — `readUpdatesNotifications` error rollback restores a snapshot of `pendingTotal` rather than undoing ±1. (4) CONFORMANCE — placement is a reasonable reading (matches Reviewer B's spec-gap note).

Leader adjudication: Reviewer A's FAIL is in scope (§9 rollback rule is listed under T-5 Implements) → attempt 2 on the same Implementer context, FAIL report verbatim, effort stays xhigh (already the T2 ceiling; depth steered in-brief). Advisories not folded in.

**Attempt 2 — Implementer** (resumed context, effort xhigh)
- `results-notifications.service.ts` `fetchPending`: a paged source (updates/received) answering without `pendingMeta` is treated as the complete set on any page — rows SET (not appended), `pendingHasMore: false`, `pendingNextCursor: null`, `pendingTotal = rows.length`. Page 1, meta-present responses and `sent` unchanged.
- New tests: `updates: a later page without pendingMeta replaces the rows with the complete set (no duplicates)`, `received: …same` (page 1 ids 1..50 with meta → page 2 ids 1..70 without meta → exactly 1..70, `pendingHasMore` false, `pendingTotal` 70).
- Verification: scoped Jest → 25 suites, 1246 tests passed. `ng lint` on 2 files → pass.
- Optional 400 sub-point skipped, with evidence: `git show HEAD:` of the old notification and share-result-request controllers/services — `cursor` is only validated by `decodeCursor` (400 only when malformed) and is unused under `scope=pending`; old received reads no `limit`. A server-issued cursor is well-formed, so a rolled-back server ignores it and returns the complete set without `pendingMeta` — the path now covered.

**Attempt 2 — Reviewer A: `STATUS: PASS`** (same context resumed; frozen delta + full diff)
- Summary: FAIL 1 fixed. The only production change is `isCompleteSet = config.pagedPending && !meta` and `loaded = isFirstPage || isCompleteSet ? rows : [...current, ...rows]`; meta-present paging, `sent` and the stale-drop guards (`sgen`/`pgen`/`!response` early return) unchanged. The new tests would see 120 ids under the old append, so they catch the bug. The 400 reasoning holds: `decodeCursor` (`keyset-cursor.util.ts:53`) rejects only malformed input; server-issued pending cursors are well-formed. Limit: the Reviewer has no git access and verified via the shared util + current call sites, consistent with the Implementer's `git show HEAD:` finding.
- ADVISORY: attempt-1 advisories 1–4 carried over (recorded above).
- Reviewer B's attempt-1 PASS stands: the attempt-2 delta touches only `fetchPending` and two service tests, outside the template/copy/UI lens.

**Leader notes**
- **Final status:** PASS on attempt 2 · 2026-10-07 · 2 Implementer attempts (attempt 1: B PASS / A FAIL on §9 later pages; attempt 2: A PASS).
- Requirements covered: PPG-R-5 (all scenarios), PPG-R-6 (client half), PPG-NFR-1 (inbox), PPG-NFR-4 (inbox), design §9 rollback rule.
- **Spec gap surfaced to the user:** PPG-R-5 / design §8.3 assume a separate pending block; the inbox is one date-grouped list, so loaded pages land inside date groups, not visibly below. Options: amend the spec text to the date-grouped layout, or follow up (live-region "N more pending loaded" / focus first new row).
- Open before commit (Reviewer B advisory 4): no `ng build` and no read-only browser check of the template yet.
- Forward pointer → PPG-T-6: use `pendingHasMore(source)` / `pendingTotal(source)` / `hasMorePending`; `pendingTotal` already moves ±1 with optimistic read and is cleared by `markAllBellRead`; on a rollback (no `pendingMeta`) `pendingTotal = rows.length` so the remainder is 0.
- Not committed (gated).
- User gate 2026-10-07: "Sigue hasta que termines" → continue through PPG-T-6 without per-task pauses (exceptions still stop). The date-grouped placement gap was not decided → stays a recorded follow-up (option b); spec text not amended.

### PPG-T-6 — Tab totals + partial-filter notice

- Started 2026-10-07. Skills: `angular-developer`, `tailwind-design-system` (task list) + `spartan` (Leader addition: user standing rule — visual adjustments use Spartan). Effort: high. Forward pointers from T-5 carried (readable paging state, ±1 total, clamp remainder at 0, classification rule). `ng build --configuration development` added to verification to close Reviewer B's T-5 advisory 4 (template compile).

**Attempt 1 — Implementer**
- Files (client): `results-notifications.component.ts` (private `unloadedPendingRemainder` → `{decision, info}`, per source `pendingHasMore(src) ? max(0, pendingTotal(src) - loaded) : 0`, 0 when any filter/search active; received remainder → Decision + All on the Received side only; updates remainder → Info + All; private `anyClientFilterActive` factored out of `showFilteredHistoryHint`; public `showPartialFilterNotice = anyClientFilterActive && hasMorePending`), `.html` (one `text-[12px]` `<p data-testid="partial-filter-notice" role="status">` above the list, inside the `initialLoading` `@else`), `contribution-request-drawer.copy.ts` (`inbox.partialFilterNotice`: "Showing results from loaded notifications only. Load more pending to include the rest."), component spec.
- Verification: `npx jest --maxWorkers=2 --no-coverage --testPathPattern="results-notifications|shell-topbar"` → 23 suites, 923 tests passed. `ng lint` on 4 files → pass. `npx ng build --configuration development` → completed, 0 error lines (pre-existing Sass `@import` deprecation warnings only) — closes T-5 Reviewer B advisory 4 (template compile). `git status` after build: no tracked changes beyond the task files.
- Test mapping: 1 (All + Info include 5,950, Decision not) · 1b received remainder → Decision + All, not Info, gone on Sent · 1c clamp 0 · 2 search term → loaded-only + notice text · 3a filter cleared → hidden · 3b no `hasMore` → hidden.
- Not Done / Assumptions (gist): remainder also gated on `pendingHasMore`; `pendingTotal` assumed to count exactly the loaded pending sets; `buildDerivedCacheKey` untouched; remainder getter not memoized.

**Attempt 1 — Reviewer: `STATUS: PASS`**
- Summary: T-6 delta meets PPG-R-7, PPG-R-8, design §8.3, PPG-DD-6. Remainder classification matches `buildUnifiedList` (`utils/build-unified-list.ts:77`: `needsDecision` only for received status-1 rows); source scoping matches `sourceScopedList` (component.ts:278-279). `anyClientFilterActive` is a pure extraction covering every PPG-R-8 filter (`activeFilterCount` L854-861 + search). Notice uses the existing `filteredHint` token pairing, no new tokens, copy in `internationalization/`. `role="status"` not chatty (constant text). Assumptions 1, 2, 4, 5 accepted. Test 1 asserts all three tabs → "Fails if" avoided.
- ADVISORY (recorded, non-gating): (1) RELIABILITY — tests 1/1b/2 derive expected loaded counts from `sourceScopedList` itself; add one absolute check to pin the fixture. (2) UX — with a filter active and both history and pending `hasMore`, two near-identical hints show (new notice on top, existing `filteredHint` at bottom); consider merging. (3) READABILITY — `allTabCount` reads `unloadedPendingRemainder` twice. (4) RISK — T-5 date-grouped placement gap still a recorded follow-up.

**Leader notes**
- **Final status:** PASS on attempt 1 · 2026-10-07 · 1 Implementer attempt.
- Requirements covered: PPG-R-7, PPG-R-8.
- Not committed (gated).

## Summary

All six tasks PASS (2026-10-07). Nothing committed — awaiting the user's go-ahead.

| Task | Result | Attempts | Verification (scoped) |
|---|---|---|---|
| PPG-T-1 Index migration | PASS | 1 | `migration:check` = 1 pending (expected pre-apply); `migration:generate --dr` shows the identical index → no entity drift; lint clean |
| PPG-T-2 Received paging + counts | PASS | 1 | server Jest 294/294; lint clean |
| PPG-T-3 Notifications paging + `attention-counts` | PASS | 1 | server Jest 197/197; lint clean |
| PPG-T-4 Bell bounded | PASS | 2 (docs FAIL) | client Jest 1197/1197; `ng lint` clean |
| PPG-T-5 Inbox paged pending | PASS | 2 (§9 later-page FAIL) | client Jest 1246/1246; `ng lint`; `tsc` clean |
| PPG-T-6 Tab totals + notice | PASS | 1 | client Jest 923/923; `ng lint`; `ng build --configuration development` clean |

**Budget check (design §12):** 6 tasks as planned; review rounds 1–2 per task as forecast. LOC above the ~550 production estimate is mostly tests; no tripwire raised.

**Open HITL (user, at rollout — tasks.md §6):**
1. After Jenkins applies PR 1: `npm run migration:check` → 0 pending; `EXPLAIN` on prdb for an admin → `key = IDX_notifications_target_read_created`, no filesort.
2. Optional parity check: `attention-counts.unreadUpdates` == legacy `scope=pending` `notificationsPending.length` for the same user.
3. After PR 2: admin Network timings (≤50 pending rows per response, ≤10 per bell group); ordinary user unchanged. Read-only browser check — no write clicks (shared prdb).

**Recorded follow-ups (advisories / spec gaps — no tasks minted):**
- T-2: page can stall (`hasMore:true, nextCursor:null`) if all ids vanish between queries; heavy fetch lacks `request_status_id: 1` filter.
- T-3: JSDoc on `getAllNotifications` still says "pending is never limited"; shared untyped `cursor` for pending/history.
- T-4: server-only rollback leaves the bell badge at 0 (design §11 gap; user did not decide → follow-up); `bellUnseenRequests` dead code; L69 doc wording on `limit`.
- T-5: date-grouped placement vs "end of pending block" (spec gap, user did not decide → follow-up b); `markAllBellRead` should bump `pendingGen.updates`; `loadingMorePending` not reset on reload.
- T-6: duplicated filter hints; pin test fixtures with absolute values.
- Kaizen candidate: "`migration:check` sees no drift" wording in tasks.md/design.md/server `CLAUDE.md` — the check has no drift detection.
- CodeGraph re-index pending (`codegraph sync`) after commit.
