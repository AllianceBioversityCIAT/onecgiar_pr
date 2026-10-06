# Execution — notifications/bell-read-state

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `notifications/bell-read-state` |
| Approval Mode | gated (stop after each task) |
| Branch | `qa-development-2026-ss` (unrelated uncommitted work from `bilateral/resubmit-rejected-result` present in the tree; excluded from every diff) |
| Leader | Opus 5.5 (session) · Implementer: `akili-implementer` wrapper · Reviewer: `akili-reviewer` wrapper |
| Budget (design §12) | 7 tasks · ~330 prod LOC · ~450 test LOC · ≤ 2 review rounds per task |
| Started | 2026-10-06 |

## 2. Task Execution History

### BRS-T-1 — Seen table: migration, entity, repository

- **Status:** PASS · `[x]` (migration applied in TEST by the user — see Closure)
- **Date:** 2026-10-06
- **Attempts:** 1 Implementer · 2 parallel lens Reviewers (migration task → parallel lens mode)
- **Effort:** high (schema). **Skills:** `nestjs-expert`, `tdd` (as listed; no deviation).
- **Requirements covered:** `BRS-R-2` (per-person storage), `BRS-R-4` idempotence (`INSERT IGNORE` over composite PK), `D2` (query shape), `D3`, `D6` (migration with working `down`).

#### Attempt 1

- **Files:**
  - new `onecgiar-pr-server/src/migrations/1790600000000-AddShareResultRequestSeen.ts`
  - new `onecgiar-pr-server/src/api/results/share-result-request/entities/share-result-request-seen.entity.ts`
  - new `onecgiar-pr-server/src/api/results/share-result-request/repositories/share-result-request-seen.repository.ts` (+ `.spec.ts`)
  - edited `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.module.ts` (provider + `TypeOrmModule.forFeature`)
- **Verification (Implementer):**
  - Red: `npx jest --maxWorkers=2 ... --testPathPattern="share-result-request-seen.repository.spec"` → failed (file missing) before implementation.
  - Green: same command → `Test Suites: 1 passed · Tests: 6 passed`.
  - Regression: `--testPathPattern="share-result-request.(controller|service|repository).spec"` → 3 suites, 96 tests passed.
  - Lint: `npx eslint <4 non-spec touched files> --quiet` → exit 0.
  - `npm run migration:check` → **not run** (DB-connected; handed to the user per standing rule).
- **Migration:** `up` = `CREATE TABLE IF NOT EXISTS share_result_request_seen` (PK `(share_result_request_id, user_id)`, index `IDX_srrs_user_request (user_id, share_result_request_id)`, `seen_date timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP` with no `ON UPDATE`, FKs `FK_srrs_share_result_request` / `FK_srrs_user` `ON DELETE CASCADE`, InnoDB). `down` = `DROP TABLE IF EXISTS share_result_request_seen` only.
- **Reviewer — reliability/resilience lens:** `STATUS: PASS`. Schema, index, default, cascades, `down`, user-id binding, one-statement insert and empty-ids short-circuit all match tasks.md / design §5 §7; test assertions (a)(b)(c) present and the falsifier would catch a per-id loop or a missing user id.
- **Reviewer — risk/readability lens:** `STATUS: PASS`. All values bound with `?`, placeholders derived only from `ids.length`; `userId` is an explicit argument in both methods (D2); FK column types match parents.

#### ADVISORY (4R, recorded only — no rework)

- **Reliability:** FK names in the migration (`FK_srrs_*`) are not declared on the entity's `@JoinColumn`s (`foreignKeyConstraintName`), so a future `migration:generate` would emit a spurious drop/re-create of both FKs. Repo uses `foreignKeyConstraintName` nowhere today; harmless while `synchronize` is off.
- **Resilience:** `INSERT IGNORE` downgrades FK violations to warnings → a stale id yields a silent `0`. T-2 must not treat `recorded: 0` as an error, and `markSeen` must keep its existence/pending pre-check as the 404 source. *(Forward pointer → BRS-T-2.)*
- **Resilience:** `CREATE TABLE IF NOT EXISTS` would silently skip a same-named table of a different shape (e.g. manual hotfix). Low risk.
- **Scale:** 2 placeholders per id → one statement handles ~32k ids (65,535 limit / `max_allowed_packet`). Far above the 150-row NFR; no chunking now.
- **Readability / conformance:** see Decisions (raw SQL).

#### Decisions

- **Raw `INSERT IGNORE` with bound params instead of TypeORM `orIgnore()`.** Design §7 says "TypeORM insert with ignore-on-duplicate"; tasks.md's disqualifier names raw `INSERT IGNORE` as the fallback. The Implementer chose it so the one-statement guarantee is directly assertable in the spec. Observable contract identical (one statement, ignore-on-duplicate, inserted count, no interpolation). Accepted by the Leader as a recorded deviation; both Reviewers concurred it does not gate.
- **`findSeenIds` returns `Set<number>`** (design leaves the return type open); T-2 uses `.has(id)`.

#### Issues

- **`migration:check` cannot be "green" before the migration is applied.** Both Reviewers confirmed from `scripts/check-pending-migrations.ts` that it only compares migration files against the DB `migrations` table — it is not an entity/DDL drift check. Until Jenkins (or the user) applies it, it will list `AddShareResultRequestSeen1790600000000` as pending. The tasks.md "Done: `migration:check` green" criterion is therefore read as: *the only pending migration is this one*. Owner: user (DB-connected step). Task stays `[~]` until that is confirmed.
- **Not shown by Jest:** real MySQL dedupe/isolation → `BRS-HITL-1` at validate.

#### Closure (2026-10-06)

- User ran, from `onecgiar-pr-server` against the TEST database: `npm run migration:check` → `migration:run` → `migration:revert` → `migration:run`. Reported result: all four succeeded and `share_result_request_seen` now exists in TEST (`up` and `down` both exercised against real MySQL). Command output was not pasted into the session; recorded as the user's report.
- The `migration:check` Done criterion is satisfied (migration applied). **Final status: PASS → `[x]`.**

#### Forward pointers

- **→ BRS-T-2:** `insertIgnore` returns inserted count, `0` is a normal result (not an error); `markSeen` 404 must come from its own pre-check. `findSeenIds` returns a `Set<number>`.

### BRS-T-3 — Optional `limit` on the updates history page

- **Status:** PASS · `[x]`
- **Date:** 2026-10-06
- **Attempts:** 1 Implementer · 1 Reviewer (lens checklist, per task "Review: checklist")
- **Effort:** medium. **Skills:** `nestjs-expert`, `api-design-principles` (as listed) + red-first ordering requested by the Leader (no `tdd` skill load; test-first is cheap here and the falsifier is about the default staying unchanged).
- **Requirements covered:** `BRS-R-8` (recent read updates, not full history), NFR performance, NFR compatibility (default unchanged).

#### Attempt 1

- **Files:** `onecgiar-pr-server/src/api/notification/notification.controller.ts` (+ spec), `notification.service.ts` (+ spec). +194 / −8.
- **Implementation:** controller `parseLimit` (runs for every scope): absent → `undefined`; otherwise integer 1..200 or `BadRequestException('Invalid limit')`. `limit` is added to the service options only when defined (default call shape unchanged). Service: `pageSize = limit ?? KEYSET_PAGE_SIZE`; the three history sources (result-scoped viewed `find`, `findBilateralAiJobFinishedNotifications`, `findCenterNoticeNotifications`) take `pageSize + 1`; `mergeKeysetLists(..., pageSize)`. Pending queries untouched.
- **Verification (Implementer):** red first (2/3 suites failing with new cases) → green `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="notification.(service|controller).spec"` → 3/3 suites, 145/145 tests; existing `PAGE-R-2/R-3` paging specs and the legacy no-params controller spec unchanged and green. `npx eslint <4 files> --quiet` clean (prettier applied).
- **Disqualifier:** did not trigger. The three-source merge honours a smaller page; `nextCursor` is the last returned row.
- **Reviewer:** `STATUS: PASS`. Meets tasks.md BRS-T-3 and design §6/§7: default path byte-identical (take 201, slice 200), `hasMore`/`nextCursor` correct across the merge, pending untouched, 400 on out-of-range/non-integer. Prettier touched only the import line that gained `KEYSET_PAGE_SIZE`.

#### ADVISORY (4R, recorded only)

- **Reliability:** repeated `?limit=1&limit=2` arrives as an array → `limit.trim()` throws → 500 instead of 400. Suggest `typeof limit !== 'string'` → 400 (`cursor` likely has the same pre-existing gap).
- **Readability:** `Number()` accepts `' 10 '`, `'1e1'`, `'0x10'` (all resolve to valid integers, harmless); `/^\d+$/` would be stricter.
- **Readability:** the `it.each(['1','200'])` boundary test calls the controller without `await`; passes only because the method is synchronous.

#### Decisions

- Empty `limit=` → 400 (Implementer's reading; Reviewer: an empty string is not an integer, consistent with the spec). Differs from `version_id`, which treats `''` as absent. The client always sends `limit=10`.

### BRS-T-2 — `seen` flag on received + `seen/:id` + `seen-all`

- **Status:** PASS · `[x]`
- **Date:** 2026-10-06
- **Attempts:** 1 Implementer · 2 parallel lens Reviewers (API contract + per-user isolation)
- **Effort:** high. **Skills:** `nestjs-expert`, `api-design-principles`, `tdd` (as listed).
- **Requirements covered:** `BRS-R-1` (data for the count), `BRS-R-2` (per-user; never changes the request), `BRS-R-3` (already seen → no duplicate), `BRS-R-4` (only me; must not decide/hide; idempotent), `BRS-R-5` (all phases), `D2`, `D4`.
- **Forward pointers from T-1 carried in the brief:** `insertIgnore` 0 is normal; `markSeen` 404 from its own pre-check; `findSeenIds` returns a `Set`. All honoured.

#### Attempt 1

- **Files:** `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` (+ spec), `share-result-request.controller.ts` (+ spec). +484 / −8.
- **Implementation:**
  - `getReceivedResultRequest` → private `tagPendingWithSeen`: after `combineAndDistinct`, one `findSeenIds(user.id, pendingIds)` (skipped when nothing is pending); `seen` on pending rows only.
  - `markSeen(user, id)`: pre-check `findOne({ where: { id, is_active: true, request_status_id: 1 } })` → 404 `{ response: {}, message: 'The request was not found', status: 404 }` (service's existing not_found shape); else `insertIgnore(user.id, [id])` → `{ seen: true }`.
  - `markAllSeen(user)`: `$_getMaxRoleByUser(user.id)` → `getUserInitiatives(user)` → `buildWhereReceivedConditions(inits, role)`; `pendingOwner` + `pendingShared`, no `extraConditions` (no `version_id`); `select` id only, no relations; admin → one query, else two in parallel + Set de-dup; one `insertIgnore` → `{ recorded }`.
  - Controller: `PATCH seen-all` declared before `PATCH seen/:shareResultRequestId` (`ParseIntPipe`); user from `@UserToken()`; Swagger decorators.
  - New ctor param `_shareResultRequestSeenRepository` is `@Optional()`: `ResultsTocResultsModule` and `ResultsPackageTocResultModule` re-provide this service without the seen repository (they only call `resultRequest()`).
  - 3 existing PERF-T-3 parity expectations updated to include `seen: false` on pending rows (additive contract change).
- **Verification (Implementer):** red (suites failed to compile) → first green run 93 passed / 4 failed (1 own fixture missing `requested_date`, 3 PERF-T-3 deep-equals now carrying `seen`) → fixed → regression `npx jest --maxWorkers=2 --silent --reporters=summary --forceExit --testPathPattern="share-result-request"` → 8 suites, 214 passed, 0 failed. `npx eslint <4 files> --quiet` clean.
- **Reviewer — risk/readability lens:** `STATUS: PASS`. User always from `@UserToken()`; every seen read/write binds `user.id` (D2); no write to `share_result_request` (D4); `markAllSeen` pending set equals the bell's (`getRequest` with the same `where`, no row-dropping post-mapping); PERF-T-3 edits are a legitimate additive update (`toEqual` still asserts the full shape; `done` expectations untouched).
- **Reviewer — reliability/resilience lens:** `STATUS: PASS`. All of tasks.md BRS-T-2 items 1–3, asserts (a)–(e), falsifier and disqualifier met; `getReceivedResultRequestPopUp` untouched. The HTTP controller always gets the `ShareResultRequestModule` instance (which registers the seen repo); the two re-providing modules only call `resultRequest()`; a future misuse would surface as a caught TypeError → error response + log, not silent degradation. Bell pending set is uncapped (only `done` is keyset-capped), so no row-limit mismatch with `markAllSeen`. No route collisions.

#### ADVISORY (4R, recorded only)

- **Risk:** `markSeen` has no recipient scoping. It does exactly what design §6/§7 specify (exists + active + pending), and the only write is the caller's own fact row, never read unless that id is in the caller's pending set. But 200 vs 404 reveals whether a guessed (sequential) id is pending. **This is not a permission check — do not read it as one.** Closing it means scoping the pre-check with the caller's `buildWhereReceivedConditions` → needs a spec amendment to design §6/§7, not rework here.
- **Reliability/Risk:** `@Optional()` on the seen repository means a wiring regression fails at request time (500 from a TypeError) instead of at boot. Options: a named-error guard in `tagPendingWithSeen`/`markSeen`/`markAllSeen`, or register the repository in `ResultsTocResultsModule` / `ResultsPackageTocResultModule` and drop `@Optional()`.
- **Reliability (scale):** for an admin (role 1), `findSeenIds` on the GET and `markAllSeen` cover every pending request in the system in one statement; ~32k ids hits MySQL's 65,535-placeholder limit. Not realistic today; chunking would trade away the "one statement" NFR and should be recorded in the spec if ever needed.
- **Readability:** the admin check `pendingOwner === pendingShared` (reference identity) is duplicated from `fetchThreeBucketsScoped`; a shared helper would prevent drift.
- **Readability:** test (c) asserts no `save`/`update` on the request repository but not `delete`; adding it would complete the D4 assertion.

#### Not shown by Jest

- Real SQL isolation and timing with 150 pending → `BRS-HITL-1` (D2/D3) and `BRS-HITL-3` (D8) at validate. Swagger rests on decorators being present (not rendered).

#### Forward pointers

- **→ BRS-T-4:** payload is `receivedContributionsPending[].seen: boolean` (pending only; done rows carry no `seen`). `PATCH request/seen/:id` → `{ seen: true }` on success, a 404 `{ response: {}, message, status: 404 }` when missing / not pending (treat as "not recorded", no badge drop). `PATCH request/seen-all` → `{ recorded: n }`; `recorded: 0` is a normal success, not an error. Both wrapped in the standard `ResponseInterceptor` envelope.

### BRS-T-4 — Client state: counts, ordering, mark seen / mark all, read rows

- **Status:** PASS · `[x]`
- **Date:** 2026-10-06
- **Attempts:** 1 Implementer · 1 Reviewer (full)
- **Approval:** user authorized running T-4..T-7 without per-task pauses, then commit + push ("continua hasta que termines, cuando termines haces commit y push", 2026-10-06). Exceptions (HALT / Pivot / budget) still stop.
- **Effort:** high. **Skills:** `angular-developer`, `tdd` (as listed).
- **Requirements covered:** `BRS-R-1` (count + filter independence), `R-3` BUT (no drop for unrecorded), `R-4` (Angel / arrives-later / failure, state side), `R-6` (count sources), `R-8` (ordering, read rows), `R-9`, `D1`, `D7`.

#### Attempt 1

- **Files:** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (+ spec), `.../results-notifications/results-notifications.service.ts` (+ spec), `shared/components/shell-topbar/shell-topbar.component.ts` (+ spec) — call-site rename only. +402 / −68.
- **Implementation:**
  - API: `PATCH_markRequestSeen(id)` → `request/seen/:id`, `PATCH_markAllRequestsSeen()` → `request/seen-all` (apiBaseUrl, raw observable like `PATCH_readNotification`); `GET_requestUpdates` / `buildPagingQueryParams` accept `limit`, serialized only when set (inbox URL unchanged).
  - `bellCount = bellUnseenRequests().length + bellUpdates().length`; `bellPendingRequestCount = bellReceived().length`.
  - `bellItems`: fresh requests → fresh updates → seen requests → read updates; newest first (requests by `requested_date`, updates by `created_date`); request `fresh = seen !== true`; read updates de-duplicated against `bellUpdates` by `notification_id`.
  - `loadBellReadUpdates()`: `GET_requestUpdates({ scope: 'history', limit: 10 })`, no versionId, `bellReadGen` guard, cap 10, failure keeps previous rows.
  - `markRequestSeen(row): Promise<boolean>` never rejects; flips the bell row and the inbox `receivedContributionsPending` row (match by `share_result_request_id`) only when `response.seen === true`; 404 / error / empty body → false, no change.
  - `markAllBellRead()` replaces `markAllBellUpdatesRead`: `Promise.allSettled([read-all, seen-all])`; throws only if both fail (no refresh then); per-leg inbox sync; then `refreshBell()` + `loadBellReadUpdates()`.
  - `decideRequest`: strips `kind`/`fresh`/`seen` before building the decision body (body byte-identical to pre-spec) and removes the row by `share_result_request_id` (all-keys equality breaks once `seen` flips). Reviewer: in scope — `buildDecisionBody` puts the row straight into the PATCH body.
- **Verification (Implementer):** red (service spec 19/95 failing with new tests) → green `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(results-api.service|results-notifications.service|shell-topbar.component).spec"` → 3 suites, 486 passed (free RAM 6.6 GB). Lint: client has no root eslint config for raw `npx eslint`, so `npx ng lint --quiet --lint-file-patterns <6 files>` → all pass.
- **Reviewer:** `STATUS: PASS`. Meets §8.1 and tasks.md BRS-T-4; asserts (a)–(e) and both falsifiers covered (in-flight Subject test: count stays until PATCH resolves; 404/error → no drop). Filter independence asserted with `phaseFilter='30'`. Inbox paging URL byte-identical. Shell-topbar edits are the rename the Consumers line asks for.

#### ADVISORY (4R, recorded only — not added to any task)

- **Resilience:** a `refreshBell()` already in flight when a `markRequestSeen` PATCH lands can make the recorded row fresh again (+1 on the badge) until the next refresh. Temporary, not a drop for an unrecorded item → not an `R-3` violation. Cheap fix if wanted later: a private Set of server-confirmed seen ids applied when `refreshBell` writes `bellReceived`.
- **Reliability:** after seen-all succeeds, every inbox pending row is set `seen = true`; a request arriving between the server snapshot and the PATCH could look seen in the inbox while the bell shows it fresh. Narrow; fix would sync from refreshed `bellReceived` ids.
- **Readability:** `markRequestSeen` returns `true` for an already-seen row without a call; JSDoc should say `true` = "seen", not "recorded now".
- **Process:** the new API-method specs (`PATCH_markRequestSeen`, `PATCH_markAllRequestsSeen`, `limit`) were written alongside the implementation and never seen red.

#### Forward pointers

- **→ BRS-T-5:** `markRequestSeen(row): Promise<boolean>` never rejects (safe to fire then navigate). Rows in `bellItems` carry `kind` and `fresh`.
- **→ BRS-T-6:** use `bellCount` (badge/chip/button), `bellPendingRequestCount` (Decide), `bellUpdates().length` (Updates), `loadBellReadUpdates()` on open, `markAllBellRead()` (rejects only when both legs fail). **`shell-topbar/CLAUDE.md` still says `markAllBellUpdatesRead()` (~line 60) — T-6 must fix it and re-stamp `Verified:`.**
- **→ BRS-T-7:** `markAllBellRead()` and `markRequestSeen(row)` (match by `share_result_request_id`).

### BRS-T-5 — Row look (fresh / read) + request body click marks seen

- **Status:** PASS on attempt 2 · `[x]`
- **Date:** 2026-10-06
- **Effort:** attempt 1 medium-high → attempt 2 high. **Skills:** `angular-developer`, `tailwind-design-system`, `spartan`, `frontend-design` (as listed).

#### Attempt 1 — FAIL

- **Files:** `onecgiar-pr-client/src/app/shared/components/header-panel/components/pop-up-notification-item/pop-up-notification-item.component.{ts,html,scss,spec.ts}`, `onecgiar-pr-client/src/app/internationalization/bell-quick-inbox.copy.ts` (`card.unreadRowPrefix`). +192 / −12. Folder has no `CLAUDE.md`.
- **Verification (Implementer):** red 13 failed / 91 passed → green `--testPathPattern="(pop-up-notification-item.component|shell-topbar.component).spec"` → 2 suites, 175/175; `ng lint --quiet` on touched files → pass.
- **Reviewer:** `STATUS: FAIL` (verbatim issues):
  1. **Discovered Issue:** On read rows the underlined result reference stays black. Both `<p>` branches still carry the inline `style="text-decoration: underline; color: var(--pr-color-black)"` (html L71 and L110), so on a read row the result code/title stays full contrast while the rest drops to `--pr-text-secondary`. In the mockup `.row.read .text { color: var(--secondary) }` dims the whole sentence. **Violated Rule:** `requirements.md` BRS-R-7 ("Seen / read: regular-weight, secondary-colour text"); `design.md` §8.3 (read text `--pr-text-secondary`, 400); `mockup/bell-read-state.html` L59-60. **Remediation:** on both reference spans replace the inline colour with a bound class: keep `underline`, `text-[var(--pr-color-black)]` when `fresh`, inherit (or `text-[var(--pr-text-secondary)]`) when read; add a spec assertion that the read row's reference span is not forced to black.
  2. **Discovered Issue:** unread dot uses `top-4` (rem); root font-size is 12px so `top-4` = 12px, not the mockup's 16px. **Violated Rule:** `design.md` §8.3 (px sizes, rule 20); `onecgiar-pr-client/CLAUDE.md` rule 20 / "Root font-size". **Remediation:** `top-[16px]` (or `top-[18px]` to compensate the 12 vs 10 px padding); confirm at D5 HITL.
- **Reviewer confirmations:** `sr-only "Unread: "` first child of the anchor is a correct accessible-name prefix (better than an `aria-label` that would replace the name); dimming the program chip matches the mockup (`.row.read .pill { opacity: .7 }`); decide chip / Accept / Decline untouched and asserted; replacing the old "plain anchor" test is legitimate (`BRS-DD-7` reverses that behaviour).
- **ADVISORY (recorded only):**
  - **Spec gap (kaizen candidate):** design §10.1 says decision rows follow "the same rule the update rows follow" for modifier/middle clicks, but update rows have **no** such guard. T-5 added the guard on the decision path only (correct per task scope). Update rows left as-is; needs a follow-up decision or a §10.1 correction — not fixed in this spec.
  - **Reliability:** `generateUrlLink` builds `search=` from row text without `encodeURIComponent`; `#`/`&`/`?` in a title would be read as URL syntax by `navigateByUrl`. Pre-existing pattern (already at component.ts ~L386), now on one more path.
  - **D5:** weight, 0.7-opacity contrast and dot position still need the browser check vs the mockup at validate.

#### Attempt 2 — PASS

- **Files:** same folder only — `pop-up-notification-item.component.html` (+ spec).
- **Changes:** both inline `style="text-decoration: underline; color: var(--pr-color-black)"` removed; reference spans `data-testid="bell-result-ref"` with `[class]="fresh ? 'underline text-[var(--pr-color-black)]' : 'underline'"` (read rows inherit `--pr-text-secondary`); update-branch whitespace layout kept (NDCW-R-2 attached comma). Dot `top-4` → `top-[16px]` (mockup value; `top-[18px]` alternative left to D5 HITL). New spec cases: reference span fresh/read on decision + update rows with no inline style; dot class.
- **Verification (Implementer):** no concurrent jest process; `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(pop-up-notification-item.component|shell-topbar.component).spec"` → 2 suites, 177/177. `ng lint --quiet` on html + spec → pass.
- **Reviewer:** `STATUS: PASS`. Both attempt-1 issues fixed; click path, guard, decide chip / Accept / Decline exemption and its falsifier test, `sr-only` label unchanged; no regression. Advisories from attempt 1 stand (spec gap §10.1 update-row guard, `search=` encoding, D5).
- **Requirements covered:** `BRS-R-3` (request from bell; failed PATCH does not block nav), `BRS-R-7` (both states; not colour alone; a11y; decision affordances unchanged), `BRS-DD-7`.
- **Budget:** 2 review rounds — within "≤ 2 per task".

#### Forward pointers

- **→ BRS-T-6:** row component reads `fresh` from each `bellItems` row; fresh/read look is self-contained in the row. D5 browser check (weight, 0.7 opacity, dot 16 vs 18 px) at validate.

### BRS-T-7 — Inbox page: shared "Mark all as read" + drawer marks seen

- **Status:** PASS · `[x]`
- **Date:** 2026-10-06
- **Attempts:** 1 Implementer (+ one in-task continuation to remove the dead service method the task names) · 1 Reviewer (checklist). Ran in parallel with BRS-T-5 (disjoint files; Jest runs serialized by a process check in the brief).
- **Effort:** medium. **Skills:** `angular-developer`, `tdd` (as listed).
- **Requirements covered:** `BRS-R-3` (request from inbox), `BRS-R-5` (scenario + offered whenever fresh), `BRS-R-9`, `D7`.

#### Attempt 1

- **Files:** `.../results-notifications/results-notifications.component.{html,ts,spec.ts}`, `.../components/notification-item/notification-item.component.{ts,spec.ts}`, `.../components/notification-item/CLAUDE.md` (BRS-T-7 section, `Verified:` re-stamped 2026-10-06); continuation: `results-notifications.service.ts` (+ spec) — removal only.
- **Implementation:** button gated on `bellCount() > 0` → `onMarkAllRead()` (awaits `markAllBellRead()`, `markingAllRead` guard reset in `finally`, both-legs rejection swallowed — the service already logs it and changes no state). `openDrawer()` → `void markRequestSeen(row)` when existing `isPending` (`request_status_id === 1 && !isSent`); every `openDrawer` path goes through it; toggle-close cannot reach it. `markAllUpdatesNotificationsAsRead()` removed from the service with its spec cases (`describe` block of 4 + "calls refreshBell after success"); `grep -rn markAllUpdatesNotificationsAsRead src` → 0.
- **Initial Not Done (resolved):** the dead service method was left because the first brief marked the service read-only; the Leader then authorised the removal and the continuation removed it.
- **Verification (Implementer):** red 5 failed / 504 passed → green `(results-notifications.component|notification-item.component).spec` 509/509; after removal `(results-notifications.service|results-notifications.component|notification-item.component).spec` → 5 suites, 601/601. `ng lint --quiet` touched files → pass.
- **Reviewer:** `STATUS: PASS`. Falsifier covered (bellCount 3 with 0 unread in view → button visible); disqualifier settled (`isSent` discriminates); R-4 failure semantics hold (no state change, guard reset); deleted cases either inverted by `BRS-R-5`, superseded by the non-optimistic path, or covered by T-4's `markAllBellRead` tests.

#### ADVISORY (4R, recorded only)

- **Reliability:** no test now asserts the success-path inbox sync in `markAllBellRead()` (read leg OK → `updatesData.notificationsPending` empties into `notificationsViewed` with `read = true`, date-sorted). The deleted "should update updatesData correctly" covered it; T-4 cases only assert the negative. Inbox half of `BRS-R-9`.
- **Readability:** `markingAllRead` is a private non-rendered flag — no `[disabled]`/`aria-busy` during the request.
- **Readability:** the new `CLAUDE.md` wording "ToC step" could be read as the popup `openTocMappingStep()`, which does not go through `openDrawer()`.

### BRS-T-6 — Popover: tab counts, "Earlier", chip, "Mark as read"

- **Status:** PASS · `[x]`
- **Date:** 2026-10-06
- **Attempts:** 1 Implementer · 1 Reviewer (full, visual)
- **Effort:** medium-high. **Skills:** `angular-developer`, `tailwind-design-system`, `spartan` (as listed). Spartan MCP not needed (disqualifier did not trigger).
- **Requirements covered:** `BRS-R-1` (render, 99+, zero → no badge BUT Decide shows), `BRS-R-4` (badge/chip/button gone; Decide unchanged; failure re-enables), `BRS-R-6`, `BRS-R-8` (separator, all-read light rows, empty state, Accept/Decline in both groups), NFR a11y (counts in tab accessible names).

#### Attempt 1

- **Files:** `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.{html,ts,spec.ts}`, `shell-topbar/CLAUDE.md` (popover bullet rewritten, stale `markAllBellUpdatesRead()` → `markAllBellRead()`, `Verified:` re-stamped), `internationalization/bell-quick-inbox.copy.ts` (`earlier`, `decideCount(n)`; `tabs.decide` 'To decide' → 'Decide').
- **Implementation:** badge, button label, `N new` chip, "Mark as read" read `bellCount` (99+, hidden at 0, `markingRead` guard, rejection re-enables). Tab counts as plain `<span data-bell-tab-count>` inside each `hlmTabsTrigger` (part of the accessible name): All = `bellItems().length`; Decide = `bellPendingRequestCount()` via `decideCount(n)` in `text-[var(--pr-color-orange-500)]`, hidden at 0; Updates = `bellUpdates().length`, hidden at 0; old decide dot removed. `toggleNotifications()` calls `loadBellReadUpdates()` on open. `bellState` stays `'list'` when `bellCount > 0` or any row exists. Separator: `bellEarlierIndex` = first `fresh === false` in `bellVisibleItems`, only when > 0 (mockup `k > 0` rule); `text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--pr-text-subtle)]`.
- **Verification (Implementer):** **no red run** (code written first). Green `npx jest --maxWorkers=2 --silent --reporters=summary --no-coverage --testPathPattern="(shell-topbar.component|pop-up-notification-item.component).spec"` → 2 suites, 185 passed. `ng lint --quiet` touched files → pass. Leader grep `src` + `cypress` for "To decide" → 0.
- **Reviewer:** `STATUS: PASS`. Meets design §8.2/§8.3/§8.4 and R-1/R-4/R-6/R-8; every tasks.md assert has a test; no BELL test deleted (rewritten in place where `BRS-R-4` / §8.2 change the rule); 'Decide' rename in scope (mockup + requirements call it the "Decide tab"); missing red run is a process gap only — every new assertion would fail on the old code and both falsifiers are covered; no rem / inline style / hex added.

#### ADVISORY (4R, recorded only)

- **Reliability:** separator correctness depends on T-4's fresh-first ordering of `bellItems`; a service-level order test (fresh then read) would lock it.
- **Readability:** Decide tab accessible name reads "Decide 40 to decide" (matches mockup + NFR) — for the a11y HITL pass to judge.
- **Process:** no red run on this task.

## 3. Summary

| Task | Result | Attempts | Review |
|---|---|---|---|
| BRS-T-1 | PASS | 1 | 2 parallel lenses + user-run migration (run → revert → run in TEST) |
| BRS-T-2 | PASS | 1 | 2 parallel lenses |
| BRS-T-3 | PASS | 1 | checklist |
| BRS-T-4 | PASS | 1 | full |
| BRS-T-5 | PASS | 2 | full (attempt 1 FAIL: read-row reference stayed black; rem dot offset) |
| BRS-T-6 | PASS | 1 | full |
| BRS-T-7 | PASS | 1 (+ in-task continuation) | checklist |

- **Budget (design §12):** 7 tasks as estimated; 8 Implementer review rounds total (≤ 10), max 2 per task. Within budget.
- **Open for `/akili-validate` (HITL):** `BRS-HITL-1` two-account isolation (D2/D3), `BRS-HITL-2` browser vs mockup (D5: weight, 0.7 opacity, dot 16 vs 18 px, 400px popover layout), `BRS-HITL-3` "Mark as read" timing with ≥ 150 pending (D8; was ≥ 100, corrected at validate W6), `BRS-HITL-4` Angel's account (`OQ-1`).
- **Spec gaps / kaizen candidates (not fixed here):** design §10.1 premise that update rows already guard modifier/middle clicks is false; `markSeen` has no recipient scoping (200 vs 404 reveals pending ids) — needs a §6/§7 amendment if product wants it closed; `@Optional()` seen repository fails at request time rather than boot.
- **Constitution impact:** no new module; `ShareResultRequestModule` gained a repository + entity (internal). Folder guides updated in-task (`shell-topbar/CLAUDE.md`, `notification-item/CLAUDE.md`). CodeGraph re-index pending (`codegraph sync`).

## Validation follow-up (2026-10-06)

Recorded after `/akili-validate` (`validation-report.md`). The Leader owns W3 and W4.

- **W3: Budget tripwire missed.** Design §12 estimated about 330 prod LOC and about 450 test LOC. The actual totals (`git diff --numstat 9824c44b5 ae48b0bec`) are:

  | Side | Prod LOC | Test LOC |
  |---|---|---|
  | Server | +381 | +535 |
  | Client | +240 | +646 |
  | **Total** | **+621 (1.9×)** | **+1181 (2.6×)** |

  The server is the larger side, which is the opposite of the estimate. The Leader tracked tasks and review rounds against budget but never LOC. The Step 2.4 tripwire should have stopped the run to escalate, and it did not. This is a **kaizen candidate**: check LOC (numstat) at every task close, not only at the end. Likely causes of the overrun:
  - The server work needed two extra service paths: the `@Optional()` wiring and `tagPendingWithSeen`.
  - Swagger plus `parseLimit` validation.
  - Inbox sync in the client.
  - Thorough red/green specs, roughly 2:1 tests to prod.
- **W4: Padding drift not explained in T-5.** BRS-T-5 changed `.notification-row` padding from `12px` to `12px 12px 12px 18px` so the unread dot has room. The mockup uses `10px 10px 10px 18px`. The base 12px is pre-existing, and only the left inset follows the mockup. Whether to align it to 10px is decided at `BRS-HITL-2`, together with the dot's 16 vs 18 px.
- **W5, W6, W7: Spec documents corrected, with sweeps run.**
  - W5: design §7/§11 logging now reads "user id", without "count".
  - W6: HITL-3 load changed from ≥ 100 to ≥ 150, in tasks §6 and in this file's §3.
  - W7: R-7's citation now points to WCAG SC 1.4.1 under the ux-ui §10 baseline.
- **HITL-1: PASS at DB level** (`validation-report.md` §9).
