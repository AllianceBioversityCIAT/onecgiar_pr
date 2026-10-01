# Tasks — Notifications Inbox: Paginated Load & Pending-First

## 1. Scope of this task list

| Field | Value |
|---|---|
| Module / feature | `notifications` / `inbox-paginated-load` |
| Linked spec | `requirements.md` + `design.md` (this folder) |
| Owner | Santiago Sanchez |
| Status | not-started |
| Approval Mode | gated |
| Budget (design.md) | 7 tasks · ~900 LOC · ≤ 2 review rounds/task · tripwire 9 tasks / ~1 200 LOC |
| PR strategy | **PR 1 — Server** (T-1..T-3) · **PR 2 — Client** (T-4..T-6) · T-7 after both. Release together (design §11). |

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-09-30).
- [x] `design.md` approved (2026-09-30).
- [ ] PAGE-OQ-5 (phase-less updates always shown) confirmed — assumed yes.
- [x] No migration (design §3).
- [ ] Merge order with `notifications/w1w2-center-tagged` decided (same service/component).
- [ ] Baseline timing captured **before** any code change (PAGE-T-7 step 1).

## 3. Task list

Test commands are always scoped (`--testPathPattern`) — never a full suite.

### [x] PAGE-T-1 — Keyset cursor utility (server)

- **Type:** server
- **Description:** Pure helper: encode/decode/validate opaque cursor `(date, id)`; expand a where (object or array) into the keyset OR (`date < d` | `date = d AND id < i`) ANDed with every entry; slice a 201-row fetch into `{ rows (≤200), hasMore, nextCursor }`; merge-sort-cut helper for multiple lists (used by updates). Page size constant `200`.
- **Implements:** PAGE-R-3 (first/next/last page; "no gaps or duplicates incl. same timestamp"), PAGE-AC-3
- **Design:** §5 History, PAGE-DD-2
- **Files (expected):** `onecgiar-pr-server/src/shared/utils/keyset-cursor.util.ts`, `.spec.ts`
- **Depends on:** —
- **Blocks:** PAGE-T-2, PAGE-T-3
- **Estimate:** S
- **Review:** checklist
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** 450 synthetic rows where rows 199–202 share one timestamp; paging until `hasMore=false` must yield 200/200/50 with union = 450 distinct ids. Any duplicate or missing id fails. Malformed cursor (`"abc"`, wrong date, non-numeric id) must throw a validation error.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern=keyset-cursor.util --silent` (fails: file absent → passes after)
  - **Disqualifier:** if expansion requires knowing the entity column names at call sites in a way that breaks the existing where shapes (nested `obj_result`), stop and re-specify the helper API.
  - **Consumers:** none (new symbol)
- **DoD:** tests above green · eslint `--quiet` clean on touched files · no logging of cursor values.

### [x] PAGE-T-2 — Received/Sent: phase, scope, paginated done (server)

- **Type:** server
- **Description:** Controllers `findReceived`/`findSent` read optional `version_id`, `scope`, `cursor` (400 on invalid). Service passes `version_id` via `extraConditions` into `obj_result` for pending + done; `scope=pending` skips done, `scope=history` skips pending; done uses T-1 (order `requested_date DESC, share_result_request_id DESC`, take 201); response adds `doneMeta`. Legacy (no params) = complete pending + first page. ToC enrichment only over returned rows. Verify PAGE-P-8 (take + one-to-many relations returns 200 roots).
- **Implements:** PAGE-R-1 (phase honored; "must NOT return any row whose result version_id differs"; no-phase = all phases), PAGE-R-2 (pending complete, separately requestable; "pending never paged"), PAGE-R-3 (first/next/last; "admin bounded"), PAGE-R-6, PAGE-AC-1, -2, -4 (server side), -10
- **Design:** §4.1, §5, PAGE-DD-1, -2, -3; keeps PERF-DD-1..3
- **Files (expected):** `share-result-request.controller.ts`, `share-result-request.service.ts`, `share-result-request.service.spec.ts` (+ controller spec if absent)
- **Depends on:** PAGE-T-1
- **Blocks:** PAGE-T-4
- **Estimate:** M
- **Review:** full (payload contract)
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** (a) with `version_id=5`, a captured `find` where for **each** bucket (pendingOwner, pendingShared, every done entry) lacking `obj_result.version_id = 5` fails; (b) `scope=pending` calling `find` for done, or `scope=history` calling it for pending, fails; (c) admin with 201 mocked done rows returns 200 + `hasMore=true`; (d) no-param call missing any legacy key fails; (e) `version_id=abc` or bad cursor not → 400 fails; (f) 350 mocked pending rows returned < 350 fails.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern=share-result-request --silent`
  - **Disqualifier:** PAGE-P-8 refuted (page returns fewer roots than 200 with more available) and cannot be fixed inside the service without a QueryBuilder rewrite > ~100 LOC → escalate (budget). If `getReceivedResultRequestPopUp` behavior changes, stop.
  - **Consumers:** `buildWhereReceivedConditions`/`buildWhereSentConditions` also used by `getReceivedResultRequestPopUp` (must stay unchanged); `fetchThreeBucketsDeduped`/`enrichBucketsOnce` (PERF specs).
- **DoD:** tests green · pop-up tests untouched and green · eslint clean · Swagger `@ApiQuery` docs for the 3 params.

### [x] PAGE-T-3 — Updates: phase, scope, paginated viewed, concurrency (server)

- **Type:** server
- **Description:** `getAllNotifications` reads `version_id`/`scope`/`cursor` from the controller. Result-scoped and Center-notice queries add `obj_result.version_id`; AI-job finder stays unfiltered. Remove inner `await`s so all queries start together. Viewed: each of the 3 read queries gets the cursor + take 201, merged/sorted/cut via T-1; response adds `viewedMeta`. `scope=pending` → pending + announcements only; `scope=history` → viewed page only.
- **Implements:** PAGE-R-1 ("phase-less updates … MUST appear regardless of the selected phase"), PAGE-R-2, PAGE-R-3, PAGE-R-6, PAGE-R-7, PAGE-AC-1, -10, -11
- **Design:** §5, PAGE-DD-1..3; premises P-3, P-7
- **Files (expected):** `notification.controller.ts`, `notification.service.ts`, `notification.service.spec.ts`, `notification.controller.spec.ts`
- **Depends on:** PAGE-T-1
- **Blocks:** PAGE-T-4
- **Estimate:** M
- **Review:** full
- **Skills:** `nestjs-expert`, `api-design-principles`, `tdd`
- **Verification:**
  - **Falsifier:** (a) repository mocks returning never-resolving deferreds: if fewer than all `find` calls have been *invoked* before the first resolves, fails (catches sequential `await`); (b) with `version_id`, AI-job finder receiving a version condition, or result-scoped/Center-notice finder lacking one, fails; (c) 3 viewed lists of 150 each with interleaved dates → page must be the 200 newest overall, `hasMore=true`; (d) legacy call missing `notificationsPending`/`notificationsViewed`/`notificationAnnouncement` fails.
  - **Red run:** `cd onecgiar-pr-server && npx jest --testPathPattern=notification\\.(service|controller) --silent`
  - **Disqualifier:** if `getPopUpNotifications` or `getRecentResultActivity` outputs change, stop.
  - **Consumers:** `findBilateralAiJobFinishedNotifications`, `findCenterNoticeNotifications` (also used by `getPopUpNotifications` — signatures may only gain optional args).
- **DoD:** tests green · eslint clean · Swagger params documented.

### [x] PAGE-T-4 — Client API + service paging state

- **Type:** client
- **Description:** Extend `GET_allRequest`/`GET_sentRequest`/`GET_requestUpdates` with `{ versionId?, scope?, cursor? }`. Service: per-source state; `loadInbox`, `loadMore`, `refreshSource`, `refreshPending`; generation guard; `initialLoading` gated on the 3 pending; legacy wrappers (`get_section_information`, `get_sent_notifications`, `get_updates_notifications`) delegate to `refreshSource`; `onPhaseChange` → `loadInbox`; arrays replaced (not mutated) on append; missing meta → `hasMore:false`.
- **Implements:** PAGE-R-2 ("does not render rows until the pending set has arrived"; "must NOT show resolved rows first…"), PAGE-R-4 (append; "must NOT reload or reset already-loaded rows"; in-flight ignores clicks; error keeps rows), PAGE-R-5 ("must NOT keep phase A rows or cursors"), PAGE-AC-5, -8, -9
- **Design:** §2.2, §6.2, PAGE-DD-4, -6, -7
- **Files (expected):** `shared/services/api/results-api.service.ts`, `results-notifications.service.ts`, `results-notifications.service.spec.ts`
- **Depends on:** PAGE-T-2, PAGE-T-3 (contract)
- **Blocks:** PAGE-T-5, PAGE-T-6
- **Estimate:** M
- **Review:** full (shared service)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** (a) history observables emit before pending → `initialLoading` must stay `true` until all 3 pending emit; flipping earlier fails; (b) `loadInbox(A)` then `loadInbox(B)`, A's responses emitted last → any A row in state fails; (c) `loadMore` twice while in flight → second call issuing a request fails; (d) `loadMore` error → previously loaded rows lost fails; (e) appended array same reference as before fails (breaks memoization).
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern=results-notifications.service --silent --no-coverage`
  - **Disqualifier:** if keeping `receivedData/sentData/updatesData` as the view model forces changes to filter pipes or `buildUnifiedList`, stop and re-specify (PAGE-DD-4 broken).
  - **Consumers:** `results-notifications.component.ts`, `app.component.ts`, `header-panel.component.ts`, `websocket.service.ts`, `share-request-modal.component.ts`, existing service spec.
- **DoD:** tests green · `npx ng lint --quiet` clean on touched files · existing service spec cases updated, not deleted.

### [x] PAGE-T-5 — External callers use pending-only / refreshSource

- **Type:** client
- **Description:** Boot calls in `app.component.ts` and `header-panel.component.ts` → `refreshPending('updates')`; `websocket.service.ts` → `refreshSource('received' | 'updates')`; `share-request-modal.component.ts` → `refreshSource('received')`. All use current `phaseFilter`.
- **Implements:** PAGE-R-1 (no all-phases overwrite of a phase-scoped view), PAGE-R-5 (no foreign-phase rows), PAGE-DD-5, PAGE-DD-6
- **Design:** §6.2 External callers; premise P-6
- **Files (expected):** the 4 files above + their specs if present
- **Depends on:** PAGE-T-4
- **Blocks:** PAGE-T-7
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier:** grep `get_updates_notifications()\|get_section_information()` (no-arg full reloads) outside the notifications service returning any hit fails; a websocket spec where the event triggers a history request without the current `phaseFilter` fails.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern="(app.component|header-panel|websocket|share-request-modal)" --silent --no-coverage`
  - **Disqualifier:** a caller found to depend on full viewed history outside the inbox (refutes P-5) → stop.
  - **Consumers:** none beyond the 4 callers.
- **DoD:** tests green · lint clean.

### [x] PAGE-T-6 — Inbox view: skeleton gate, history row, Load more, hint, memoized list

- **Type:** client
- **Description:** Template: skeleton while `initialLoading`; trailing "Loading history…" skeleton while a first history page is pending; Spartan `hlmBtn` outline "Load more" iff any `hasMore`, `[disabled]` + `aria-busy` while loading; hint when filters/search active and any `hasMore`. Component: identity-keyed memoization of `unifiedList → … → groupedTabList`.
- **Implements:** PAGE-R-2 (render gate), PAGE-R-4 (shown/hidden; busy; retry after error), PAGE-R-10, PAGE-R-11, PAGE-AC-6, -7
- **Design:** §6.2, §6.3, PAGE-DD-8
- **Files (expected):** `results-notifications.component.{ts,html,scss}`, `results-notifications.component.spec.ts`
- **Depends on:** PAGE-T-4
- **Blocks:** PAGE-T-7
- **Estimate:** M
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** (a) all `hasMore=false` and button rendered → fail; (b) any `hasMore=true` and button absent → fail; (c) loading → button not disabled or no `aria-busy` → fail; (d) filter active + `hasMore` → hint absent fails; no filter → hint present fails; (e) memo: calling `groupedTabList` twice with unchanged inputs invoking the pipes twice fails; changing a filter not recomputing fails.
  - **Red run:** `cd onecgiar-pr-client && npx jest --testPathPattern=results-notifications.component --silent --no-coverage`
  - **Disqualifier:** presence assertions (button exists) cannot prove the layout, focus order or visual busy state — those go to PAGE-T-7's human check, not counted as covered here.
  - **Consumers:** none (component-local getters).
- **DoD:** tests green · lint clean · uses Spartan, no new tokens.

### PAGE-T-7 — Measure before/after + human visual check (HITL)

- **Type:** rollout
- **Description:** (1) **Before any code**: on the same environment/account/phase, record for admin and non-admin: time until pending rows visible, and duration + size of the 3 calls (DevTools Network, cache disabled, 3 runs each). (2) After T-1..T-6 locally: same measurements. (3) Visual check: Load more placement/busy state/hint, keyboard focus, dark mode. (4) Walk Load more to the end on an admin account; spot-check no duplicate rows. Record in `execution.md`.
- **Implements:** NFR Performance, PAGE-R-3 (manual walk), PAGE-R-4 visuals, requirements §11 rows "No real speed-up" and "Load more look/feel"
- **Design:** §8, §10 Manual
- **Files (expected):** `docs/specs/notifications/inbox-paginated-load/execution.md`
- **Depends on:** PAGE-T-5, PAGE-T-6 (step 1 has no dependency — run first)
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** none (manual; T6 Multimodal if screenshots are reviewed by an agent)
- **Verification:**
  - **Falsifier:** after-median not lower than before-median → the change did not deliver; pending rows visible after any resolved row → R-2 failed.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** if run-to-run spread (max−min) within either side is ≥ the before/after difference, report **inconclusive** with the spread — do not call it a pass. Measurements on different accounts/phases/environments are not comparable.
  - **Consumers:** none (no shared symbol changed)
- **DoD:** numbers table in `execution.md` · visual check approved by the user at the HITL pause.

## 4. Coverage closure (scenario/clause → task)

| Requirement clause | Task |
|---|---|
| R-1 phase honored · "must NOT return any row whose result version_id differs" | T-2 (a), T-3 (b) |
| R-1 no phase → all phases | T-2 (d legacy), T-3 (d) |
| R-1 phase-less updates "MUST appear regardless of the selected phase" | T-3 (b) |
| R-2 pending first · "does not render rows until pending arrived" · "must NOT show resolved first…" | T-4 (a), T-6 (render gate), T-7 |
| R-2 pending never paged · count equals pending received | T-2 (f), T-6 counts via unchanged `buildUnifiedList` + T-4 |
| R-3 first / next / last page · "no row returned twice, none skipped, ties" | T-1, T-2 (c), T-3 (c), T-7 (walk) |
| R-3 admin bounded | T-2 (c) |
| R-4 append · "must NOT reload or reset already-loaded rows" · filters kept | T-4 (b,e), T-6 |
| R-4 exhausted → hidden | T-6 (a) |
| R-4 in-flight busy, ignores clicks | T-4 (c), T-6 (c) |
| R-4 error keeps rows, retry | T-4 (d), T-6 |
| R-5 phase change · "must NOT keep phase A rows or cursors" | T-4 (b), T-5 |
| R-6 backwards-compatible keys, bounded legacy page | T-2 (d), T-3 (d) |
| R-7 concurrent updates queries | T-3 (a) |
| R-10 filter hint | T-6 (d) |
| R-11 memoized derivation | T-6 (e) |
| NFR performance (no automated gate) | T-7 |
| NFR a11y / Spartan / visual (no automated layout gate) | T-6 + T-7 human check |

## 5. Dependency graph

```
T-7 step 1 (baseline) ─────────────────────────────┐
T-1 ─┬─ T-2 ─┐                                     │
     └─ T-3 ─┴─ T-4 ─┬─ T-5 ─┬─ T-7 steps 2-4 ◄────┘
                     └─ T-6 ─┘
```

No cycles. T-2 ∥ T-3 and T-5 ∥ T-6 are parallel-safe (disjoint files).
