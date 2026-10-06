# Bell Quick Inbox — Execution Log

## Document Control

- **Spec:** `notifications/bell-quick-inbox`
- **Approval Mode:** gated (from `requirements.md`)
- **Branch:** `qa-development-2026-ss`
- **Leader model:** Opus 5.5 (T1 registry = `opus` — matches)
- **Started:** 2026-10-05
- **Budget (design §Budget):** 6 tasks · ~650 LOC (prod ~280 / tests ~370) · 1–2 review rounds per task

### Run notes

- 2026-10-05 — Pre-flight resolved with the user:
  - `BELL-OQ-1`: default accepted (an admin's badge counts every pending request it sees, same as the inbox rows).
  - The uncommitted `detail-side-panel` DSP-T-1..T-3 work, which edits the same files, was committed with user approval before `BELL-T-1`: `bce1b627d` (server), `71b8edba6` (client), `63b14aa1e` (DSP docs). This spec's docs went in `6563ee862`. The working tree was clean for BELL code at the start.
  - Untracked `docs/specs/notifications/filter-toolbar-dropdowns/` appeared during pre-flight, probably from another session. It does not overlap BELL files. Left untouched.
- Naming drift: `design.md` §2.1 says `classifyRequest`, while `tasks.md` BELL-T-1 says `classifyAccept`. The work order (`tasks.md`) wins, so the code uses `classifyAccept`.

---

## Task Execution History

### BELL-T-1 — Extract the request-decision helper and make `notification-item` use it — IN PROGRESS (attempt 1 FAIL)

- **Date:** 2026-10-05 · **Effort:** high · **Skills:** `angular-developer`, `tdd` (as listed)
- **Review mode:** lens checklist (full spec conformance).
- **Diff delivery:** 407 lines went to the Reviewer as a scratchpad file read with `Read`, not inline. Two reasons: brief size, and the BELL hunks had to be filtered out first (see the concurrency note below).
- **Concurrency incident:** while attempt 1 ran, another session executing `detail-side-panel` DSP-T-4 in this same checkout added a 70-line `DSP-T-4` describe block to `notification-item.component.spec.ts` and two comment-only hunks to `notification-item.component.ts`. Those hunks were left out of the Reviewer's diff. The green test count below includes DSP-T-4's tests. Escalated to the user (one AKILI session per checkout).

#### Attempt 1

- **Files:**
  - new `results-notifications/utils/request-decision.ts` (118 lines): `buildDecisionBody`, `isDecidable`, `classifyAccept`, `declineMode`, `isP25`, plus private row predicates.
  - new `request-decision.spec.ts` (195 lines, 28 tests): parity literals for 4 kinds × accept/decline + an update-source guard, branch tables, `isDecidable` cases.
  - `notification-item.component.ts`:
    - `acceptOrReject` builds its body through `buildDecisionBody`; the ToC-mapping override stays local.
    - `invalidateRequest()` is the busy flags plus `!isDecidable(...)`.
    - The private `isIpsrNotification` getter was removed (it moved into the util).
- **Red:** `Cannot find module './request-decision'`, 1 suite failed (util moved aside temporarily).
- **Green:** `npx jest --runInBand --silent --no-coverage --testPathPattern="request-decision|notification-item|contribution-request-drawer"` → 6 suites, 313 tests passed. Free RAM was 1.1 GB, so `--runInBand` per the machine rule.
- **Lint:** `ESLINT_USE_FLAT_CONFIG=false npx eslint <3 files> --quiet` was clean. Plain `npx eslint` errors under ESLint 9 with no flat config, so the verification command needs that env var.
- **Implementer Not Done / Assumptions:**
  - The ToC-mapping branch is not in the util, because it reads component state.
  - The folder `CLAUDE.md` was not updated.
  - Leader adjudication: the first item is not owed scope. The Reviewer ruled the same way in point 2 below.
- **Reviewer: `STATUS: FAIL`.** Parity, ToC override, `isDecidable` equivalence and the falsifiers all passed. Issue, verbatim in substance:
  1. **Discovered Issue:** the folder `notification-item/CLAUDE.md` was not updated. L108-109 and L120-123 describe the justification gating inside `acceptOrReject`, which now lives in `buildDecisionBody`. L342 describes `invalidateRequest()` eligibility, which now delegates to `isDecidable`.
     - **Violated Rule:** tasks.md BELL-T-1 "Files (expected)" ("the folder `CLAUDE.md` if the component's notes mention `acceptOrReject`"); `onecgiar-pr-client/CLAUDE.md` §10 Folder docs (update and re-stamp `Verified:`).
     - **Remediation:** add a BELL-T-1 note; adjust L120-123 and L342; re-stamp `Verified:`. Documentation only.
- **ADVISORY (4R, recorded, no rework):**
  - Readability/risk: the component's `isQAed`, `isPrimaryRequest`, `isUpdateSource` and `isP25Request` getters duplicate the util's copies, which invites drift. They could delegate to the util.
  - Reliability: comment that `unknown` phase-id typing plus loose `!=` is deliberate.

#### Parked — 2026-10-05 (user: pause until the other session finishes)

- **Status:** `[~]`. Attempt 2 not started; 2 of 3 attempts remain.
- **Owed for attempt 2:** the documentation-only fix from the Reviewer FAIL above (`notification-item/CLAUDE.md` BELL-T-1 note, L120-123 and L342 adjusted, `Verified:` re-stamped). Re-run the scoped Jest, then send a re-review limited to that doc delta plus confirmation that the code is unchanged.
- **Uncommitted working tree:** BELL-T-1 code (`utils/request-decision.ts` + spec, 3 hunks in `notification-item.component.ts`) sits next to the other session's DSP-T-4 edits in the same file. Not rolled back, because this is a park, not a HALT.
- **Resume:** once the DSP session finishes, check `git diff` on `notification-item.component.ts`. Confirm the three BELL hunks are intact and were not committed under a DSP commit, then run attempt 2 at effort `xhigh` (bumped one level).
- **Resume check (2026-10-05):** the 3 BELL hunks are intact. The DSP session ("Drawer") is still running: T-4..T-8 are `[x]` but uncommitted, and T-9 HITL is open. On the user's instruction BELL stays parked. Drawer was asked to message this session when DSP is committed. It confirmed it will stage only DSP hunks (`git add -p`), leave the BELL hunks and the `request-decision.*` files out, and asked that `notification-item.*` stay unedited until it reports back (ETA 1–2 h).
- **2026-10-06:** Drawer reported DSP committed (`365839869`, merge `e62c92c6a`). Verified locally: the BELL WIP is intact and outside every commit. Drawer then asked BELL to wait for a "BELL go" message, because the FTD session (`filter-toolbar-dropdowns`) goes first and edits `results-notifications.component.*`. Acknowledged. Not accepted from the peer: commit authority. Commits still need the user's explicit go-ahead (standing rule plus gated mode), so the task gate stops for the user.

#### Attempt 2 (resumed 2026-10-06 after Drawer's "BELL go")

- **Effort:** xhigh (bumped one level). The fix itself is docs only.
- **Files:** `components/notification-item/CLAUDE.md` only. Two passages amended:
  - the PDR-T-4 "Confirm → acceptOrReject" bullet now says body + `justification` gate live in `buildDecisionBody`, and the ToC override stays in the component;
  - the Traps `invalidateRequest()` bullet now says busy flags + `!isDecidable(...)`.
  - New `Verified: 2026-10-06` stamp.
  - Code unchanged since attempt 1. With DSP committed, the `notification-item.component.ts` working-tree diff is BELL-only (+24/−27).
- **Verification:**
  - `npx jest --runInBand --silent --no-coverage --testPathPattern="request-decision|notification-item"` → 5 suites, 334 tests passed (free RAM about 2 GB).
  - `npx ngc -p tsconfig.app.json --noEmit` → exit 0, zero `error TS`. Only pre-existing NG8112/NG8113 warnings in unrelated components.
- **Implementer Not Done / Assumptions:** none.
- **Reviewer: `STATUS: PASS`.** "The docs-only fix satisfies the tasks.md 'Files (expected)' condition and the client CLAUDE.md §10 folder-docs rule, and the amended bullets match the code. The parity, `isDecidable` equivalence, branch tables and falsifiers already passed in attempt 1 and still do." Cosmetic note: the doc writes `isPrimaryRequest(row)`, while the util's private helper is `isPrimaryRequestRow`; the meaning is correct.

#### Final — BELL-T-1 PASS (attempt 2 of 3)

- **Requirements covered:** `BELL-DD-2`. Foundation for `BELL-R-5` (same eligibility as the inbox, through `isDecidable`), `BELL-R-6` and `BELL-R-7` (branch tables `classifyAccept` / `declineMode`).
- **Decisions:**
  - `classifyAccept` name (tasks.md over design.md §2.1).
  - The ToC-mapping override stays in `acceptOrReject`, outside the util, because it reads component state. The bell never sends that body (design §6.2 routes it to a hand-off). The Reviewer accepted this.
- **Issues:**
  - Concurrency with the DSP session in the same checkout (resolved: DSP committed `365839869`).
  - The spec's lint command needs `ESLINT_USE_FLAT_CONFIG=false` under ESLint 9.
- **Budget:** 2 review rounds, within the "1–2 per task" budget. About 330 LOC so far (prod ~120 incl. the refactor, tests ~195, docs ~25), against the ~650 total for 6 tasks; T-1 alone carries the largest test file.
- **DoD:** util + table-driven spec exist, parity green; existing `notification-item` / `contribution-request-drawer` specs green and unchanged; eslint clean on the touched files; folder `CLAUDE.md` updated.
- **Commit:** NOT committed. Waiting for the user's explicit go-ahead (standing rule plus gated mode).
- **Next eligible:** `BELL-T-2` (service bell state + boot; touches `results-notifications.service.ts` and `app.component.ts`, no FTD overlap) and `BELL-T-5` (blocked until FTD commits `results-notifications.component.*`).

---

### Run notes — 2026-10-06 (continuation)

- User instruction (2026-10-06): finish T-2..T-6 back to back **without committing**. No per-task commit gate. One commit pass at the end, with the user's approval, staging BELL files only.
- Concurrency: the FTD session (`onecgiar-pr-52`, `filter-toolbar-dropdowns` FTD-T-3 a11y fix) runs in this same checkout. File split agreed by message: FTD edits `results-notifications.component.*` and FTD docs; BELL stays out of them until FTD commits. Jest runs are serialized by message ("FTD wants Jest" / "BELL clear" / "FTD done").

### BELL-T-2 — Bell state in `ResultsNotificationsService` + boot wiring — PASS (attempt 1 of 3)

- **Date:** 2026-10-06 · **Effort:** high · **Skills:** `angular-developer`, `tdd` (as listed) · **Review:** full, lens checklist.

#### Attempt 1

- **Files** (+319/−5):
  - `results-notifications.service.ts` (+119):
    - signals `bellReceived`, `bellUpdates`, `bellLoading`, `bellError`;
    - computed `bellItems` and `bellCount`;
    - `refreshBell()`, which fetches with no `versionId` behind a `bellGen` generation guard;
    - `decideRequest(row, isAccept): Promise<void>`;
    - `refreshBell()` hooks in `refreshSource('received'|'updates')` and in the success paths of `readUpdatesNotifications` and `markAllUpdatesNotificationsAsRead`.
    - Legacy `updatesPopUpData`, `get_updates_pop_up_notifications` and `handlePopUpNotificationLastViewed` are untouched (`BELL-DD-5`).
  - `results-notifications.service.spec.ts` (+185): `bell state (BELL-T-2)` describe, 15 tests.
  - `app.component.ts` (4 lines): boot calls `refreshBell()` in place of `get_updates_pop_up_notifications()`.
  - `app.component.spec.ts` (+16): boot test.
- **Red:** the new tests failed with `service.refreshBell is not a function`, and the boot test saw `refreshBell` called 0 times.
- **Green:** `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="results-notifications.service|app.component"` → 3 suites, 90/90 passed.
- **Lint / types:** `ESLINT_USE_FLAT_CONFIG=false npx eslint <4 files> --quiet` is clean. `npx ngc -p tsconfig.app.json --noEmit` reports no `error TS`.
- **Wider scoped run:** `results-notifications/|share-request-modal|websocket` → 24 suites passed, 1 failed (6 tests): `results-notifications.component.spec.ts`. That spec mocks the service with `useValue`, and the file is the FTD session's in-flight uncommitted work (its a11y fix). The Leader attributes the failures to FTD, outside BELL-T-2. **Re-check in BELL-T-6.**
- **Implementer assumptions** (all accepted by the Reviewer):
  1. The existing `refreshSource()` test assertion changed from `updatesSpy not called` to `not called with {versionId:3}`, because `refreshSource` now calls `refreshBell`, which calls the updates endpoint.
  2. `decideRequest` returns a Promise: it resolves on success and on 409, and rejects with the original error otherwise, leaving bell state unchanged.
  3. The `kind` tag is stripped before building the body. The row is removed from `bellReceived` by shallow key-equality, because the `BELL-P-10` id field is not confirmed yet.
  4. On success: `refreshSource('received')` when `phaseFilter` is set (it calls `refreshBell` itself), otherwise `refreshBell()` directly.
  5. The success toast reuses the inbox `alertsFe` call. The 409 message reuses `CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.staleRequestMessage` (copy file not edited).
  6. No list cap in the service; the cap is BELL-T-4's.
- **Implementer Not Done:** none.
- **Reviewer: `STATUS: PASS`.** "All seven Falsifier bullets have a real test, and each would fail under the bad variant. The service adds the phase-agnostic bell state, `refreshBell()`, `decideRequest()` and the hooks as described. Boot calls `refreshBell()`. Legacy members are untouched (DD-5)." The `versionId` test asserts `toEqual({scope:'pending'})` on both endpoints. The generation-guard test uses two Subjects resolving out of order. AC-9 is reached through `requestEvent` → `refreshAllNotifications` → `refreshSource('received')` → `refreshBell`.
- **ADVISORY (4R, recorded, no rework):**
  - Reliability: row removal by reference-equal keys misses if a `refreshBell` lands between render and click. The badge then drops only after the follow-up refresh. Matching on `share_result_request_id` would be sturdier once `BELL-P-10` is confirmed (BELL-T-5 Step 0).
  - Resilience/perf: one inbox decision fires `refreshBell` twice, through `refreshAllNotifications` → received + updates, which is 4 GETs. The result is correct thanks to the generation guard. A coalesce would halve the calls.
  - Reliability: `refreshBell` resets `bellError` at the start of each call, so the error state clears during a retry. **BELL-T-4 should know this** when it renders the error state.
  - Readability: the success toast titles are hard-coded English, the same as the inbox literals (parity, not drift).

#### Final — BELL-T-2 PASS

- **Requirements covered:**
  - `BELL-R-1` (all phases, both kinds, filter-independent).
  - `BELL-R-3` (order).
  - `BELL-R-4` (loaded at session start; an inbox decision drops it).
  - `BELL-R-8` (service level).
  - `BELL-R-11`, `BELL-R-12`.
  - `BELL-AC-1`, `BELL-AC-9`.
- **DoD:** signals and methods added and legacy untouched; specs green; eslint clean.
- **Commit:** none, per the user's instruction.
- **Next eligible:** `BELL-T-3` (depends on T-2). `BELL-T-5` stays blocked on FTD's `results-notifications.component.*` work.

### BELL-T-3 — Inline actions in `pop-up-notification-item` — IN PROGRESS (attempt 1 FAIL)

- **Date:** 2026-10-06 · **Effort:** high · **Skills:** `angular-developer`, `spartan`, `tailwind-design-system` (as listed) · **Review:** checklist.
- **Leader decision (deviation):** the new strings go in a new `internationalization/bell-quick-inbox.copy.ts` (`BELL_QUICK_INBOX_COPY`) rather than `contribution-request-drawer.copy.ts`. That file holds the FTD session's uncommitted edits, and keeping BELL out of it keeps the final BELL-only commit separable.

#### Attempt 1

- **Files:**
  - `pop-up-notification-item.component.ts` (+113/−2): `handoff` output, the busy/confirm/error signals, the handlers, and `refreshBell()` after the `markAsRead` PATCH succeeds.
  - `.html`: the actions sit outside the anchor in a `.notification-row` wrapper. Buttons use `hlmBtn` sm, plus `hlmTooltip` and a `role=alert` error line.
  - `.scss`: the row chrome moved to the wrapper.
  - `.spec.ts`: +21 tests.
  - New `bell-quick-inbox.copy.ts`.
- **Step 0 (`BELL-P-9`):** PASS, no adapter needed. The server pending path uses the same `getRequest()`/relations as the old popup.
- **Red:** a mutation run (busy guard removed, branches forced) → 4 failed. Code restored afterwards.
- **Green:** `pop-up-notification-item|shell-topbar.component` → 2 suites, 98/98. eslint clean; ngc has no `error TS`.
- **Reviewer: `STATUS: FAIL`** (verbatim in substance):
  1. **Discovered Issue:** clicking a plain unread update in the bell does not mark it read, so the badge does not drop.
     - `onNotificationClick` calls `markAsRead` only for AI job, bilateral submitted, tagged/contribution-decision and bilateral approved/rejected. Every other type falls through to `itemSelected.emit(); return;` with no PATCH.
     - The server `notification.service.ts` L772-783 returns all unread result-scoped notifications for `scope:'pending'`, and `bellItems` tags them all `kind:'update'`.
     - So `RESULT_SUBMITTED`, `RESULT_UNSUBMITTED`, `RESULT_QUALITY_ASSESSED`, `RESULT_CREATED`, `PRIMARY_PROGRAM_REQUEST_ACCEPTED/DECLINED/MOVED` and legacy id rows 1-5 appear in the bell and are never marked read. That is the P2-3157 AC5 regression.
     - Implementer assumption 6 had recorded this as "unchanged behaviour".
     - **Violated Rule:** `requirements.md` §7 `BELL-R-9`; §9 `BELL-AC-8`; the `design.md` flow ("Click update row ─► existing navigation + markAsRead ─► refreshBell()"); the tasks.md BELL-T-3 Description.
     - **Remediation:**
       - In the fall-through branch, call `markAsRead` for any update row (`notification_id` present, unread).
       - Keep today's destination. The anchor is a plain `[href]`, so either `preventDefault` + `markAsRead` + `router.navigateByUrl(generateUrlLink(...))`, or make sure the PATCH survives the unload.
       - Leave decision rows unchanged.
       - Add specs for a `RESULT_QUALITY_ASSESSED` row and a `PRIMARY_PROGRAM_REQUEST_ACCEPTED` row: each calls `PATCH_readNotification` once and `refreshBell` once, and still navigates. Both must fail on the current code.
- **ADVISORY (4R):**
  - The `disabled` falsifier asserts the bound `BrnButton.disabled`, not the DOM attribute (Brain stub harness gap). Check the attribute in the browser in T-4/T-6.
  - `isQAed` duplicates the private util helper.
  - The `HlmTooltipStub` override will be needed again in the shell-topbar spec. Better to give the BrnTooltip mock its inputs.
- **Leader adjudication:** in scope. BELL-R-9 is listed in T-3 Implements. Attempt 2 at effort xhigh.

#### Attempt 2 (effort xhigh)

- **Delta** in `pop-up-notification-item.component.ts`, in the `onNotificationClick` fall-through:
  - an update row (`notification_id` present) now runs `preventDefault` + `markAsRead` + `router.navigateByUrl('/' + generateUrlLink(...))`. The destination is unchanged, and navigating inside the app means the PATCH is no longer cut off by a full page load;
  - decision rows (no `notification_id`) return before that and stay on the plain anchor.
- **Spec:** the old test asserting "no PATCH" (the gap itself) was replaced by a `plain update types (BELL-R-9)` suite:
  - `it.each` over QA'ed, PRIMARY_ACCEPTED and SUBMITTED;
  - a legacy id-only row;
  - an already-read row;
  - a failed PATCH that still navigates;
  - a decision-row body click that leaves the row untouched.
- **Red:** 6 new tests failed before the change. **Green:** `pop-up-notification-item|shell-topbar.component` → 2 suites, 104/104. eslint clean; ngc has no `error TS`.
- **Implementer Not Done / Assumptions:** the two `!url` early returns still do not mark read. The Reviewer judged them unreachable for a well-formed bell row, see below.
- **Reviewer: `STATUS: PASS`.** "Attempt 2 fixes the one BELL-R-9 / BELL-AC-8 gap from attempt 1, and nothing that passed in attempt 1 has regressed." On the `!url` fallbacks, checked against the server `notification.service.ts` L772-783 and L1025-1036: the pending query only returns active results with a role-1 initiative and always selects `result_code` and `official_code`. So neither fallback can be hit except through a data-integrity fault.
- **ADVISORY (4R):**
  - The `!url` branches could still call `markAsRead` for defence in depth.
  - `generateUrlLink` does not encode raw `#`/`&` in `search` (pre-existing).
  - Carried from attempt 1: the `disabled` check reads the bound value, not the DOM attribute (check it in the browser in T-4/T-6); `isQAed` is duplicated; the tooltip stub lives in the spec instead of the shared Brain mock.

#### Final — BELL-T-3 PASS (attempt 2 of 3)

- **Requirements covered:** `BELL-R-5`, `BELL-R-6`, `BELL-R-7`, `BELL-R-8`, `BELL-R-9`; `BELL-AC-3`, `BELL-AC-5`, `BELL-AC-7`, `BELL-AC-8`.
- **Decisions:**
  - i18n goes in the new `bell-quick-inbox.copy.ts` (Leader, concurrency).
  - Actions sit outside the anchor in a `.notification-row` wrapper.
  - Update rows now navigate inside the app so the mark-read PATCH survives.
  - `BELL-P-9` is confirmed with no adapter. The design.md ledger is not edited; noted here.
- **Forward pointer for BELL-T-4:** the shared Jest Brain mock (`tests/mocks/spartanBrainMock.ts`) declares `BrnTooltip` without inputs, so the real `HlmTooltip` throws NG0311 under Jest. Any shell-topbar spec that renders a **decision** row must override the tooltip the way the pop-up spec does. Also, the handoff is emitted with the `kind`-tagged row.
- **Budget:** 2 review rounds, within budget. Running LOC is about 330 (T-1) + 320 (T-2) + about 600 (T-3, about 2/3 of it tests), so about 1,250 against the ~650 design estimate. **Over the LOC budget**, driven by test volume. See the tripwire note below.
- **DoD:** existing popup specs green; new specs cover every Falsifier bullet; the folder has no `CLAUDE.md` (N/A).
- **Commit:** none, per the user's instruction.

### Budget tripwire — 2026-10-06 (after BELL-T-3)

- **Design budget:** 6 tasks · ~650 LOC (prod ~280 / tests ~370) · 1–2 review rounds per task.
- **Actual after 3 of 6 tasks:** about 1,250 LOC (roughly prod 400 / tests 800 / docs 50). Review rounds: T-1 2, T-2 1, T-3 2, all within the per-task budget.
- **Cause:** test volume. Every Falsifier bullet got its own test, and T-3 had to cover all update types after the BELL-R-9 FAIL. Production code is about 40% over its estimate, mainly from T-3's row wrapper and handlers.
- **Also blocked:** BELL-T-5 needs FTD's `results-notifications.component.*` work committed, and FTD is still uncommitted. FTD now also edits `tests/mocks/spartanBrainMock.ts` and `spartan/popover/.../hlm-popover.ts`. BELL-T-4 depends on T-5.
- **Leader:** stopped for the user per the Budget Tripwire rule. No further task started.
- **User decision (2026-10-06):** option A. The LOC overrun is accepted. Wait for FTD to commit before running BELL-T-5 → T-4 → T-6. The FTD session was asked for its ETA.

### BELL-T-5 — Inbox deep link (`request` + `action`) and `notification-item.autoAction` — PASS (attempt 1 of 3)

- **Date:** 2026-10-06 · **Effort:** high · **Skills:** `angular-developer`, `tdd` (as listed) · **Review:** full, lens checklist.
- **Start condition:** FTD committed `e8624b422` (`results-notifications.component.*`, module, copy, `hlm-popover.ts`, `spartanBrainMock.ts`) and pushed. From then on the working tree held BELL files only.

#### Attempt 1

- **Files:**
  - `utils/request-decision.ts` (+17): `bellHandoffUrl`. It tolerates the `kind` tag.
  - `request-decision.spec.ts`: +5 tests.
  - `results-notifications.component.ts` (+44): `pendingAutoAction` signal, `request`/`action` handling in `setQueryParams`, `autoActionFor(item)`, `onAutoActionConsumed()`.
  - `.html` (+18/−3): only the three `received` bindings. FTD's facet `hlm-popover` (`role="none"`, `[attachTo]`) is untouched.
  - `.spec.ts`: +8 tests.
  - `notification-item.component.ts`: `@Input autoAction`, `@Output autoActionConsumed`, `ngOnInit`/`ngOnChanges`, `runAutoAction()`. The `.spec.ts` gets +6 tests.
  - `notification-item/CLAUDE.md`: a T-5 section and a re-stamped `Verified:` line.
  - `design.md` §1A: `BELL-P-9` and `BELL-P-10` → verified.
- **Step 0 (`BELL-P-10`):**
  - The id field is `share_result_request_id`, from server `getRequestSelectFields()` in `share-result-request.service.ts:1071-1075` (entity `idField` at L71).
  - **Deviation from the task text:** the server select has no `obj_result.version_id`, only `obj_result.obj_version.id`. `bellHandoffUrl` reads `obj_version.id`, falls back to `version_id`, and both shapes are tested. This is recorded in the ledger.
- **Facet mapping:** the deep link calls the existing `resetFilters()`, which clears program, search and the 5 facets but keeps the phase. It forces `activeSource='received'` and `activeTab='all'`, and does not apply `init`/`search` when `request` is present.
- **Red:**
  - 3 of the 8 new inbox tests failed on assertion.
  - The util and row tests were red only by inference (their symbols did not exist), not observed test by test.
- **Green:** `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="request-decision|results-notifications.component|notification-item"` → 10 suites, 597 passed. eslint clean; ngc has no `error TS`.
- **Implementer assumptions** (all accepted by the Reviewer):
  - Only pending rows run the handler.
  - `autoActionConsumed` is emitted on a microtask to avoid NG0100.
  - An unknown id leaves the params in the URL.
  - `request` or `action` alone, or an invalid action, means no deep link.
  - Only the `notification-item` folder has a `CLAUDE.md`.
- **Reviewer: `STATUS: PASS`.** "The BELL-T-5 diff matches tasks.md, design.md §6.1 and BELL-DD-4, and BELL-R-6, R-7, AC-4 and AC-6. Every Falsifier bullet has a test that would go red under the bad variant. Behaviour without `request` is unchanged, and the row will be in the rendered list." On row visibility: received pending is never paginated (service L81-84, PAGE-R-2), and `resetFilters` keeps `phaseFilter`.
- **ADVISORY (4R):**
  - **RISK:** `action=accept` on a one-click row (ToC-carried or primary) makes `onAcceptContribution()` call `acceptOrReject(true)` right away. So a crafted or shared link `?request=N&action=accept` records an acceptance with no user click.
    - The bell never hands off accept for those rows (DD-3), so legitimate use is unaffected.
    - Suggested fix: in `runAutoAction()`, run accept only when `classifyAccept(...) === 'step'` and otherwise just consume, plus one test. The spirit of BELL-R-6 supports it.
    - **Leader: surfaced to the user.** It is not added to scope: advisories never become tasks.
  - Reliability: a phase mismatch (missing `phase`, or an IPSR row whose `obj_version.id` is not in `phaseList`) makes the deep link a silent no-op, which §6.1 allows. BELL-T-6 should include a past-phase or IPSR hand-off.
  - Readability: `autoActionFor()` runs per row on each change-detection cycle; a `computed` id set would read better.

#### Final — BELL-T-5 PASS

- **Requirements covered:** `BELL-R-6`, `BELL-R-7` (inbox side); `BELL-DD-4`; `BELL-AC-4`, `BELL-AC-6` (wiring; behaviour still to be shown in T-6).
- **Forward pointers for BELL-T-4:**
  - Call `bellHandoffUrl(row, action)` with the raw `kind`-tagged row. It reads `obj_result.obj_version.id`.
  - The id is `share_result_request_id`.
- **DoD:** specs green; `phase`/`init`/`search` unchanged without `request`; folder `CLAUDE.md` updated.
- **Commit:** none, per the user's instruction.

## Spec Amendment: BELL-T-7 — a deep link never records a decision (2026-10-06)

- **Trigger:** the BELL-T-5 Reviewer RISK advisory. `?request=N&action=accept` on a one-click row (ToC-carried or primary) made `onAcceptContribution()` call `acceptOrReject(true)` with no user click.
- **User ruling (2026-10-06):** "agregala al spec porque esto no puede suceder y debe de corregirse". The user reopened the spec. This is not an advisory being promoted by the Leader.
- **Amended:**
  - `requirements.md` `BELL-R-6`: new scenario "a link never decides". It covers Accept and any Decline path that would PATCH without a confirm or justification.
  - `design.md` `BELL-DD-4`: guard bullet added; §10 testing row updated; the Budget table notes the +1 task.
  - `tasks.md`: new `BELL-T-7` with its own Falsifiers. `BELL-T-6` now also depends on T-7. The dependency graph and the clause coverage are updated.
- **Correction closure sweep:**
  - Forward: grep `autoAction` / `onAcceptContribution` across the spec folder. The design §2.1 table row (L51) and the §2.2 sequence (L67-68) describe the step paths only, so they stay consistent.
  - Backward: references to `BELL-DD-4` / `BELL-R-6` are in tasks.md T-5 Implements and the coverage table (updated). No ADR is affected.
- **Plan:** BELL-T-7 runs in parallel with BELL-T-4. The files are disjoint (`notification-item.*` vs `shell-topbar/*`) and Jest runs are serialized by the Leader.

### BELL-T-7 — A deep link never records a decision (amendment) — PASS (attempt 1 of 3)

- **Date:** 2026-10-06 · **Effort:** high · **Skills:** `angular-developer`, `tdd` (as listed) · **Review:** full (security-relevant), lens checklist.
- **Run note:** the first spawn wrote the tests and the branch audit, then held because the FTD session was running Cypress CT and no Jest slot was free. It was resumed with "BELL Jest go" once FTD reported done. It stayed one attempt; no FAIL occurred.

#### Branch table (audited by the Implementer, independently verified by the Reviewer against `notification-item.component.ts` L853-884 and L1442-1525)

| Branch | Behaviour | Replay via link |
|---|---|---|
| Accept, `is_map_to_toc` or primary (`classifyAccept` = one-click) | `acceptOrReject(true)` sends a direct PATCH with no click | **NO.** This was the defect; now the link is only consumed |
| Accept, bilateral non-primary without carried ToC (`step`) | `invalidateRequest()` guard → `showTocPromptDialog`. PATCH only on the user's click | YES |
| Accept, legacy modal-first (`step`) | `mapAndAccept` → `invalidateRequest()` → `openTocMappingModal` (`showShareRequest`). PATCH only from the modal's Accept | YES |
| IPSR / P25 | No branch of their own. IPSR changes only the phase id inside `isDecidable`; P25 changes only the endpoint | Same as the rows above |
| Decline, primary | `showPrimaryDeclineDialog` (justification) | YES |
| Decline, every other kind | `showConfirmRejectDialog` | YES |

#### Attempt 1

- **Files:**
  - `notification-item.component.ts` (+3/−2): `classifyAccept` import plus the gate in `runAutoAction()`. Accept replays only when it is a `step`; decline replays as before. The `isPending` guard and the microtask emit are unchanged.
  - `.spec.ts` (+~125): `BELL-T-7` describe, 12 tests. Every one spies `PATCH_updateRequest`.
  - Folder `CLAUDE.md`: a BELL-T-7 section and a re-stamped `Verified:`.
- **Red (observed against the T-5 code):** 3 failed — primary/accept, ToC-carried/accept, IPSR ToC-carried/accept. The other 9 passed, as expected; they pin behaviour that was already safe.
- **Green:** `--testPathPattern="notification-item"` → 4 suites, 351 passed. eslint clean; ngc has no `error TS`.
- **Reviewer: `STATUS: PASS`.** "The gate in `runAutoAction()` matches the amended BELL-R-6 scenario and the BELL-DD-4 Guard. `classifyAccept` is exactly equivalent to `onAcceptContribution()`'s one-click branch, every step and decline path only opens UI, and every T-7 test spies `PATCH_updateRequest`."
- **ADVISORY (4R):**
  - Accept-via-link has no case for the "P25 W1/W2 ToC-carried" kind. An `it.each` over all kinds would cover it.
  - Drift risk: nothing fails if a future one-click branch is added to `onAcceptContribution()` without updating `classifyAccept`. A matrix test asserting 0 PATCH would catch it.
  - Readability: the one-line `if / else if` hides the "do nothing" outcome.

#### Final — BELL-T-7 PASS

- **Requirements covered:** `BELL-R-6` "a link never decides" (amended); the `BELL-DD-4` Guard.
- **User-visible consequence:** a one-click accept link now only clears the params. The user must click Accept in the inbox, and a crafted or shared link cannot decide.
- **DoD:** falsifiers green, and red was observed against the T-5 code; the branch table is recorded (above); folder `CLAUDE.md` updated.
- **Commit:** none, per the user's instruction.

### BELL-T-4 — `shell-topbar` badge, list, states; stop consuming on close — PASS (attempt 1 of 3)

- **Date:** 2026-10-06 · **Effort:** high · **Skills:** `angular-developer`, `spartan`, `tailwind-design-system` (as listed) · **Review:** checklist.
- **Run note:** implementation and lint finished first. The Jest runs waited for the slot (FTD CT, then BELL-T-7) and were resumed with "BELL Jest go". It stayed one attempt.

#### Attempt 1

- **Files:**
  - `shell-topbar.component.ts`:
    - computeds `bellCount`, `bellVisibleItems` (first 10), `bellOverflow`, `bellState`, `bellButtonLabel`;
    - `BELL_MAX_ROWS = 10` and `BELL_BADGE_CAP = 99`;
    - `toggleNotifications()` → `refreshBell()` on open, not awaited;
    - `onBellHandoff()` → close + `navigateByUrl(bellHandoffUrl(...))`;
    - focus restore with an effect plus `afterNextRender`.
    - `handleClosePopUp` and `unreadNotifications` were removed; their only other users are the dead `header-panel`'s own copies.
  - `.html`:
    - bound `aria-label`, `aria-hidden` badge;
    - loading / error / empty / list states, "+N more" and "See all";
    - close, backdrop and Esc no longer consume;
    - `(handoff)` is wired.
  - `.spec.ts`: the clear-on-close test was rewritten citing `BELL-DD-5`, and a new `bell popover (BELL-T-4)` describe renders the real template with a `RowStub`.
  - Folder `CLAUDE.md` re-stamped `Verified: 2026-10-06`.
  - `bell-quick-inbox.copy.ts`: `popover` strings.
- **State choice** (`BELL-R-13`/`R-14`):
  - When the count is above 0, the list shows. A `bellError` adds an error line above the rows and keeps the last values.
  - When the count is 0, it shows error (with an inbox link), else loading, else empty.
  - A retry clears the error line, because `refreshBell` resets `bellError`.
- **Red (observed):** with the HEAD `.ts`/`.html` swapped in → 13 failed / 42 passed. The R-10 empty test passed on the old code, as expected. The Implementer's files were restored, and `cmp` confirmed them byte-identical.
- **Green:** `--testPathPattern="shell-topbar|pop-up-notification-item"` → 2 suites, 116 passed, with no changes needed. ngc has no `error TS`/`error NG`; eslint clean.
- **Implementer assumptions:**
  - `spartanBrainMock.ts` was not edited, because a `RowStub` keeps the real `HlmTooltip` out.
  - The real row-to-topbar handoff is therefore tested only through the stub. The row's own emission is covered by the BELL-T-3 spec.
  - The DOM-order test is now anchored on `#notifTrigger`.
- **Reviewer: `STATUS: PASS`.** "BELL-T-4 meets the spec. Every Falsifier bullet has a rendered test that would fail under the bad variant, and the Disqualifier is honoured: the BELL-R-2 test checks the badge text '5' and 5 rows before close, after reopen and after Esc, plus 0 PATCH and 0 last-viewed calls." Tokens check out: `--pr-color-red-300` for errors, no hex colours. Dark mode is unsupported in this client, so it does not apply.
- **ADVISORY (4R):**
  - Reliability: `restoreFocusIfLost` runs on every `bellItems` change while the popover is open. If focus is on `<body>` (Safari), it can jump into row 0 without a decision. Refocus only if a row had focus since the popover opened.
  - Readability: the error paragraph is duplicated in the template, and `bellError` is read in two styles.
  - Risk: the topbar-to-real-row wiring is only exercised through the stub. Exercise it end to end in BELL-T-6.

#### Final — BELL-T-4 PASS

- **Requirements covered:** `BELL-R-1` (badge, `99+`, hidden at 0), `BELL-R-2`, `BELL-R-3` (cap, "+N more"), `BELL-R-4` (refresh on open), `BELL-R-10`, `BELL-R-12`, `BELL-R-13`, `BELL-R-14`; the focus NFR; `BELL-AC-1`, `BELL-AC-2`.
- **DoD:** specs green, and the clear-on-close assertions were rewritten citing `BELL-DD-5`; folder `CLAUDE.md` re-stamped.
- **Commit:** none, per the user's instruction.
- **Next:** `BELL-T-6` (HITL). Its scoped Jest regression waits for FTD's CT runs to finish.

### BELL-T-6 — Scoped regression + manual/visual validation (HITL) — IN PROGRESS

- **Date:** 2026-10-06 · Leader-driven browser check (Claude in Chrome); the user asked the Leader to run it.
- **Environment probe (before any click):**
  - The client on `localhost:4200` serves the uncommitted BELL code.
  - The server on `:3400` has `ENVIRONMENT=local`, but **`DB_HOST` is a LAN host (`192.168.20.22`, `prdb`), not a disposable local DB.** `RABBITMQ_URL` is remote, and `EMAIL_QUEUE=cgiar_ms_prod_mailer_queue` (marked `# Prod`).
  - So any Accept, Decline-confirm or mark-read would write shared data and might send real e-mails. **These actions were NOT performed and are held for the user.**
- **Viewport:** the window could not be resized; `innerWidth` stayed at 960. The 400 px check therefore used a same-origin 400 px iframe of the inbox page with the real bell opened inside it. This is a probe, not a real narrow window.

#### Manual checklist (tasks.md BELL-T-6 Falsifier)

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Badge shows N+M and survives open/close | **PASS** | Boot calls `received?scope=pending` + `updates?scope=pending` with no `version_id`, and no `updates-pop-up` call (R-12). Badge `99+`, `aria-label` "Notifications, 285 waiting" (276 decisions + 9 updates). Opening → exactly 1 received + 1 updates GET (R-4). 10 rows + "+275 more" + "See all". Esc close → 0 API calls; reopen → still 285 and 10 rows. Backdrop close → 0 API calls. |
| 2 | One-click Accept removes the row, decrements the badge, inbox shows accepted | **NOT RUN (held)** | It writes to the shared DB and may e-mail through the prod queue. Needs the user's go-ahead or a disposable DB. |
| 3 | Bilateral Accept lands on the inbox with "Map to your Theory of Change?" for **that** result | **PASS, with a defect (see D-1)** | Started from another page through `shell-topbar.onBellHandoff({row, action:'accept'})`, the same handler the row event calls; this API row (request 4378) was not in the first 10 visible rows. The inbox opened with "MAP TO YOUR THEORY OF CHANGE? … 7636 - TEST DANIEL …", which is the right result, and the params were cleared. 0 PATCH. Closed with X. Legacy modal-first (request 4519, result 9637): on a fresh load of the deep link, the "Request to be added as contributor" modal opened for the right result and the params were cleared. 0 PATCH. Closed with X. |
| 4 | Primary Decline lands on the justification dialog for that request | **PASS** | Clicked the real bell row 0 (primary, result 9740) → navigated to `?phase=36`, params cleared → "DECLINE PRIMARY ROLE – 9740" justification dialog. 0 PATCH. Cancelled. |
| 5 | Contribution Decline → Confirm declines it | **PARTIAL** | Decline on bell row 4 (contribution 9637) → inline strip "Decline this request? Confirm / Cancel". Cancel → buttons back, 0 API calls. Confirm was **not** clicked (it writes); held with item 2. |
| 6 | Clicking an unread update navigates and drops the badge | **NOT RUN (held)** | The mark-read PATCH writes to the shared DB. Held with item 2. |
| 7 | Popover at 400 px, light/dark, no clipped buttons or overflowing text | **FAIL (pre-existing positioning, not a BELL regression)** | In the 400 px iframe the overlay pane sits at `left:-13px` (390 px wide, end-aligned to the bell), so 13 px of the panel is cut off on the left. Buttons sit at x 8-136 and are not clipped, and no text overflows. The pane is also 462 px tall from y 192 in a 472 px-tall frame, so its bottom (including "See all") falls below the viewport. `notificationsPositions` and `.pr-topbar-panel` width are unchanged from HEAD, so this predates BELL. Dark mode: N/A (the client does not support dark mode). |
| 8 | `99+` renders inside the badge without overflow | **PASS** | Zoomed screenshot: `99+` fits the pill. |

- Real-DOM check of the T-3 advisory: the non-decidable row renders Accept/Decline with a real `disabled` attribute (row 10 of the live list). **Resolved.**

#### D-1 — Hand-off does nothing when the user is already on the inbox page (BELL-T-5 defect)

- **Repro:**
  1. On `/result/results-outlet/results-notifications?phase=36`, open the bell.
  2. Click Accept on a step row (request 4519).
- **Actual:** the URL becomes `?phase=36&request=4519&action=accept`, but no modal opens and the params stay in the URL.
- **Expected:** the same behaviour as the fresh-load case, where the modal opens and the params are cleared.
- **Cause (likely):** `results-notifications.component` reads `request`/`action` only at init. A same-route query-param change does not re-run `setQueryParams`.
- **Violated rules:** `BELL-R-6`/`BELL-R-7` (the hand-off must open the step for that request) and `BELL-AC-4`/`AC-6`. T-5's Disqualifier had flagged this exactly: jsdom proves only the wiring.
- **Disposition:** BELL-T-5 is reopened for attempt 2 (fix inside its approved scope).

### BELL-T-5 — reopened for D-1 — PASS (attempt 2 of 3)

- **Date:** 2026-10-06 · **Effort:** xhigh (bumped) · **Skills:** `angular-developer`, `tdd` · **Review:** full, lens checklist.
- **Trigger:** BELL-T-6 live browser evidence (D-1, above). The attempt-1 jsdom tests only exercised the initial query-param read.

#### Attempt 2

- **Fix in `results-notifications.component.ts`:**
  - `ngOnInit` subscribes to `queryParamMap` with `skip(1)` and `takeUntilDestroyed`.
  - `onQueryParamMapChange` ignores maps without `request` plus a valid `action`, so the clearing navigation cannot re-trigger.
  - When the phase differs, it loads it through `phaseFilter` + `onPhaseChange`.
  - The shared `armBellHandoff` (reset filters, Received / All, `pendingAutoAction`) is used by both init and the live path.
- **Re-hand-off fix in `notification-item.component.ts`:**
  - `ngOnChanges` resets `autoActionRan` when `autoAction` becomes falsy. Without this, a second hand-off to the same row instance stuck.
  - "Input set twice without a clear" still runs once.
- **Specs:**
  - the `ActivatedRoute` mock is now BehaviorSubject-backed;
  - a new D-1 block in the component spec;
  - +1 item test for the second hand-off.
- **Red (observed):** 3 failed — same-route hand-off, different-phase load, second hand-off on the same instance.
- **Green:** `--testPathPattern="results-notifications.component|notification-item"` → 9 suites, 582 passed. eslint clean; ngc has no `error TS`.
- **Leader live check (Chrome):**
  - On `?phase=36`, bell Accept on step row 4519 → the contributor modal opened and the URL was cleared to `?phase=36`.
  - Closed it with X. A second bell Accept on the same row → the modal opened again and the URL was cleared again.
  - 0 PATCH in both cases. **D-1 resolved.**
- **Reviewer: `STATUS: PASS`.** "The attempt-2 delta fixes D-1 and stays within BELL-T-5's approved scope. It satisfies BELL-R-6 (including 'a link never decides'), BELL-R-7 and the BELL-DD-4 Guard." Further findings:
  - The BELL-T-7 gate is unchanged and still reached on the live path. The `autoActionRan` reset only re-arms a run and cannot bypass the `step` check.
  - No re-trigger loop.
  - Teardown is covered.
  - Behaviour without `request` is unchanged.
- **ADVISORY (4R):**
  - Reliability: an unknown or stale `request` id leaves `pendingAutoAction` set and the params in the URL. A repeat click with the identical URL may be swallowed by the Router's `onSameUrlNavigation: 'ignore'`. Suggestion: consume an unmatched hand-off once the list has loaded.
  - Readability: the subscription is a single ~160-character line.
  - Risk: the loose `!=` on phase is deliberate; it should carry a comment.

#### Final — BELL-T-5 PASS (attempt 2)

- **Requirements covered:** `BELL-R-6`, `BELL-R-7` (inbox side, now from any page); `BELL-DD-4`; `BELL-AC-4`, `BELL-AC-6`.
- **Budget:** BELL-T-5 used 2 review rounds, within the per-task budget.
- **Commit:** none, per the user's instruction.

#### BELL-T-6 — scoped regression (after the D-1 fix)

- **Command (run once):**
  ```
  npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="request-decision|results-notifications|notification-item|contribution-request-drawer|pop-up-notification-item|shell-topbar|app.component"
  ```
  Free RAM was about 4.2 GB.
- **Result:** 25 suites passed, **856 / 856 tests passed**, 36.9 s.
- `results-notifications.component.spec.ts` is now green. The 6 failures seen during BELL-T-2 came from FTD's in-flight work and are gone after FTD's commit `e8624b422`.
- **D-1 live re-check:** PASS (see the BELL-T-5 attempt-2 entry).
- **Open (waiting on the user):**
  - Checklist items 2, 5-confirm and 6 (writes against the shared `prdb` and the prod mailer queue).
  - Item 7 (pre-existing 400 px left clip and bottom overflow): fix in scope or follow-up.

## Spec Amendment: BELL-T-8 — popover fits narrow/short viewports (2026-10-06)

- **User ruling (2026-10-06):** "con respecto al corte si es un bug debes de corregirlo". The pre-existing 400 px left clip and bottom overflow (T-6 item 7) are to be fixed in this spec.
- `tasks.md`: new `BELL-T-8`; `BELL-T-6` now also depends on it.
- **User ruling on item 1 (2026-10-06):** "Solamente se pueden aceptar de un click las que son accept as primary, No se puede aceptar con un click en donde un usuario debe de mapear al ToC que seria para el tema de contribuciones de Science programs". This narrows "one-click" to primary requests only, which affects `BELL-R-5` and the glossary. **Pending a clarification** on how ToC-carried contribution rows should behave before the spec is amended.

## Spec Amendment: BELL-T-9 — one-click only for primary (2026-10-06)

- **User clarification (AskUserQuestion, 2026-10-06):** in the bell, Accept on a ToC-carried contribution → "Pasar a la página". It closes the popover and opens that request's ToC mapping step in the inbox for review. One-click acceptance is reserved for primary requests.
- **Amended:**
  - `requirements.md` glossary: "One-click request" = primary only.
  - `BELL-R-6`: new scenario "ToC-carried contribution".
  - `tasks.md`: new `BELL-T-9`; `BELL-T-6` now also depends on it.
- **Correction-closure sweep:** `classifyAccept` stays unchanged (inbox parity plus the T-7 gate). The new `bellAcceptMode` carries the bell rule. design.md §2.1/§6.2 still describe `classifyAccept` for the inbox, which stays accurate. The inbox's own one-click Accept for ToC-carried rows is out of scope and recorded as a follow-up question for the user.
- **User answer on the writes (T-6 items 2, 5-confirm, 6):** "No entiendo esto, haz lo que sea mejor para el proyecto". **Leader decision:** do NOT write against the shared `prdb` or the prod mailer queue. These items are recorded as **inconclusive (environment)** and handed to the user for a disposable environment or a QA test env. Reason: the writes are irreversible on shared data and may send real e-mails, while the code paths are already covered by unit tests and the non-writing browser checks.

### BELL-T-9 — One-click only for primary; contributions hand off — PASS (attempt 1 of 3)

- **Date:** 2026-10-06 · **Effort:** high · **Skills:** `angular-developer`, `tdd` · **Review:** full, lens checklist.

#### Attempt 1

- **Files:**
  - `utils/request-decision.ts` gains `bellAcceptMode` (primary, non-update → `one-click`; otherwise `handoff`). `classifyAccept` is unchanged, and the spec asserts that.
  - `pop-up-notification-item` Accept now uses `bellAcceptMode`. Three existing one-click guard tests (double-click, error, retry) switched to primary rows, at the same strength. A new test covers ToC-carried → handoff with 0 `decideRequest`.
  - `notification-item.runAutoAction` accept: a ToC-carried non-primary row now calls `openDrawer('details')`. Primary still only consumes. `step` is unchanged. There are +3 tests, and the folder `CLAUDE.md` has a BELL-T-9 section.
- **Audit (Implementer, confirmed by Reviewer):**
  - `openTocMappingModal()` was rejected. It is the legacy flow: it seeds an empty `result_toc_results`, does not show the carried mapping, and its Accept would send the seeded body.
  - The row's detail drawer renders the carried mapping (`tocReview` ← `toc_contribution_review`). Its Accept is the user's click (`onDrawerAccept` → `acceptOrReject(true)`), with the inbox body and guards (`invalidateRequest`).
  - `openDrawer` sends no PATCH; it only calls `GET_requestApprovalChain`.
- **Red (observed):** 7 failed. **Green:** `request-decision|pop-up-notification-item|notification-item` → 5 suites, 395 passed. eslint clean; ngc has no `error TS`.
- **Reviewer: `STATUS: PASS`.** "The delta matches tasks.md BELL-T-9, the amended 'One-click request' glossary entry, BELL-R-6 'ToC-carried contribution' and 'a link never decides', and the T-7 guard. In the bell, only primary rows decide in one click. A ToC-carried link opens the drawer that shows the carried mapping, with 0 PATCH, and the user accepts there with the inbox's guards and body."
- **ADVISORY:**
  - Spec drift: the BELL-R-5 scenario, the BELL-DD-4 Guard and the R-6 "never decides" wording still described the old rule. **The Leader fixed all three in the docs, 2026-10-06.**
  - Reliability: in wide mode (≥1280 px) the docked drawer only renders if `viewChild('detailTpl')` has resolved by the time `runAutoAction` runs from `ngOnInit`. **Added to the BELL-T-6 browser checks.**
  - Readability: the spec row key `'ToC-carried one-click'` is now misleading.

#### Final — BELL-T-9 PASS

- **Requirements covered:** the glossary entry "One-click request" (amended), `BELL-R-5` (amended), `BELL-R-6` "ToC-carried contribution", and "a link never decides".
- **Open follow-up for the user:** the inbox row's own Accept still accepts a ToC-carried contribution in one click (out of scope by the task text).
- **Commit:** none.

#### Environment issue found during BELL-T-8 attempt-2 verification

- The running `ng serve` (pid 24168, started 06:07) **stopped picking up edits after BELL-T-8 attempt 1**.
  - `main.js` still contains `updateNotificationsMaxHeight` (T-8a1).
  - It contains neither `notificationsWidth` (T-8a2) nor `bellAcceptMode` (T-9).
- `npx ngc -p tsconfig.app.json --noEmit` reports 0 errors. Touching the files did not trigger a rebuild within about 60 s.
- **Consequence:** the T-8a2 browser measurement (400×472: pane r403, b624) was taken on **stale** code and is not evidence about attempt 2.
- The dev server needs a restart (the user's terminal) before the T-8 and T-9 browser checks.

## Spec Amendment: BELL-T-10 — popover visual redesign (2026-10-06)

- **User request (2026-10-06):** "Podemos rediseñar como se ven las notificaciones desde el pop-up ese? para que se vea de esta manera?" The reference image is saved as `assets/bell-popover-redesign-reference.png`.
- **User rulings (AskUserQuestion):**
  - Scope: in this spec.
  - Copy: English.
  - The "N new" chip counts unread updates.
  - "Mark as read" marks all unread updates read through the existing endpoint; decisions are untouched.
- `tasks.md`: new `BELL-T-10`; `BELL-T-6` now also depends on it.
- **Budget note:** the spec is now 6 + 4 amendment tasks. The LOC overrun was already accepted by the user (option A). This adds an M-sized UI task.

## Spec Amendment: BELL-T-11 — two-step Accept and inbox-matching labels (2026-10-06)

- **User request (verbatim):** "Me gustaría que se hiciera doble click en accept para que reconfirmen, pero que el segundo sea, el label algo de confirmar… los botones se alineen a como aparecen en el modulo de notificaciones (accept as primary / accept contribution)".
- **Leader interpretation, recorded:**
  - The two-step confirm applies to direct decisions (primary one-click).
  - Contribution Accepts hand off to an inbox step that is itself the confirmation, so they stay single-click (no triple step).
  - The labels share one source with the inbox (`acceptLabelFor`, moved from `drawerAcceptLabel`).
- **Start condition:** `BELL-T-10` review lands first, because the files are shared.

### BELL-T-8 — Popover fits narrow and short viewports — PASS (attempt 2 of 3)

- **Date:** 2026-10-06 · **Effort:** medium → high · **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`.

#### Attempt 1

- **Changes:**
  - fallback position + `viewportMargin` 16 + `push`;
  - panel `min(360px, 100vw − 32px)`;
  - TS max-height below the trigger, with an inner list scroll.
- **Result:** Jest 59/59.
- **Leader browser falsifier — FAIL:**
  - desktop PASS;
  - 400×472 height PASS;
  - **400 px width FAIL:** pane r410 > 400. Cause: the app sets `html { zoom: 1.15 }` and the CDK container counter-zooms, so `100vw` was not zoom-aware.

#### Attempt 2

- **Fix:** `static notificationsBounds(...)` gives width `min(360, (innerWidth − 32)/zoom)` and max-height `max((innerHeight − bottom − 24)/zoom, 120)`. Zoom is measured as rendered / `offsetWidth`, with a guard against 0. It is re-measured `afterNextRender` plus `updatePosition()`, and on resize.
- **Result:** Jest 63/63.
- **Type error found later:** attempt 2 left a TS error in `viewChild<ElementRef<HTMLElement>>('notifTrigger', { read: ElementRef })`. The BELL-T-10 Implementer fixed it to `{ read: ElementRef<HTMLElement> }`.
  - **This error is what froze the user's `ng serve`**: it kept serving the last good build, which was T-8 attempt 1.
  - The Implementer's earlier claim of "ngc 0 errors" for attempt 2 was wrong; noted as a process lesson.
- **Leader browser falsifier — PASS** (after the user restarted `ng serve` and the current code was confirmed served):
  - 400×472: pane l16 r384; "See all" at y396-418, visible; the list scrolls; nothing clipped.
  - Desktop 1920: end-aligned under the bell.
- **Reviewer: `STATUS: PASS`.** "Every falsifier the spec defines is met." The 360 px frame overflows (pane r377) because the topbar itself is not responsive below about 380 px: the bell's right edge is at 377. This is out of T-8's 400 px scope and is **recorded as a known gap**, not a silent pass.
- **ADVISORY:**
  - Recheck `push` under the counter-zoomed container at 360 px, as part of a topbar-responsiveness follow-up.
  - `window:resize` should also call `updatePosition()`.

#### Final — BELL-T-8 PASS

- **DoD:** browser falsifiers pass at 400 px; specs green; `CLAUDE.md` re-stamped.
- **Commit:** none.

### BELL-T-10 — Popover visual redesign — PASS (attempt 1 of 3)

- **Date:** 2026-10-06 · **Effort:** high · **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`.
- **Files:**
  - `shell-topbar` (header: "N new" chip and Mark as read; `hlm-tabs` All / To decide / Updates; per-tab cap and "+N more"; per-tab empty states);
  - `pop-up-notification-item` (decision and update cards, `shortAge`);
  - `bell-quick-inbox.copy.ts`;
  - `results-notifications.service.ts`, adding `markAllBellUpdatesRead()`: `PATCH_readAllNotifications()`, phase-agnostic (the server takes only the user), then `refreshBell()`.
- **Red:** 21 failed. **Green:** 233/233. eslint clean; ngc 0 errors.
- **Process incident:** for the red run the Implementer temporarily renamed the method to `...TMP`. The user's `ng serve` caught that state and showed TS2551. It was restored on disk and the served bundle was verified clean.
- **Leader browser check (desktop, current code):** matches the reference with English copy.
  - Header: "Notifications", "9 new", "✓ Mark as read".
  - Tabs: "All 284", "To decide •", "Updates".
  - Decision cards: accent bar, SP chip, "REQUIRES DECISION", "4d ago", Accept/Decline.
  - Updates tab: Approved ✓, Declined ✕, Pending review ⓘ, no buttons.
  - The badge stays at 284 across tabs.
  - Overlay panes: 9 → 30 on open → 9 on close, so no leak.
- **Reviewer: `STATUS: PASS`.** "The redesign matches the reference image with English copy, and every BELL-R behaviour I checked holds."
- **ADVISORY:**
  - The tabs have no tabpanel / `aria-controls` targets.
  - `shortAge(null)` returns the epoch.
  - The card has dead click zones.
  - A failed Mark as read gives no feedback.
  - Arbitrary px values are used against the design tokens.

#### Final — BELL-T-10 PASS

- **Commit:** none.

#### BELL-T-6 — scoped regression after T-8/T-9/T-10

- 25 suites, **897 / 897** passed (17.1 s).
- ngc 0 errors.

## ⚠️ INCIDENT — 2026-10-06 — Leader's browser check accepted a real primary request on the shared DB

- **What happened:**
  - While verifying BELL-T-11 in Chrome, the Leader clicked Accept **once** on a primary bell card. The intent was to observe the new "Confirm…" first-click state, which sends no request.
  - The **served bundle did not contain BELL-T-11 yet**. In the same script, `main.js` showed no `acceptLabelFor` and no confirm service, but the Leader acted before checking that result.
  - So the click ran the BELL-T-3/T-9 one-click accept.
- **Affected record:**
  - `share_result_request_id` **4548**: primary request on result **9740** "OT SS AJ OCT 01".
  - Owner / shared program: SP09. Requested by Santiago Sanchez. Phase 36.
- **Evidence:**
  - The page XHR hook counted 2 non-GET/OPTIONS calls.
  - After `refreshBell()`, request 4548 is no longer in the pending bell set. The badge went 284 → 274; other users' activity may account for part of that.
- **Target:** shared `prdb` (`192.168.20.22`). E-mails may have been enqueued to `cgiar_ms_prod_mailer_queue`.
- **This broke the Leader's own recorded decision** not to write against `prdb`.
- **Leader action:** browser interaction stopped. Reported to the user immediately. No attempt to "undo" through the UI or the DB; that is the user's call.
- **Root cause:** the Leader did not gate a state-changing click on a confirmed-fresh bundle. **Rule going forward in this run:** verify that the served bundle contains the task's symbols before any click, and never click Accept or Decline-confirm on a primary card.

### BELL-T-11 — Two-step Accept and inbox-matching labels — PASS on code review (attempt 1 of 3); browser DoD pending

- **Date:** 2026-10-06 · **Effort:** medium · **Skills:** `angular-developer`, `spartan`, `tdd`.

#### Attempt 1

- **Files:**
  - `utils/request-decision.ts`: `acceptLabelFor` plus a private `isBilateralContributorRow`, with 6 parity tests.
  - `notification-item.drawerAcceptLabel()` now delegates to it and returns `string`.
  - The row html drops `?? 'Accept contribution'` (NG8102).
  - New `pop-up-notification-item/bell-accept-confirm.service.ts`: a single `owner` signal.
  - The pop-up item gains the confirm state: a 5 s timer, Escape, focusout, and one owner at a time. Labels come from `acceptLabelFor`.
  - Copy: `actions.confirmAction(label)` and `confirmHint`.
  - `notification-item/CLAUDE.md` re-stamped.
- **Red:** 17 failed. **Green:** `request-decision|pop-up-notification-item|notification-item` → 5 suites, 423 passed. eslint clean; ngc 0 `error TS`.
- **Reviewer: `STATUS: PASS`.**
  - "The BELL-T-11 change matches the tasks.md block. I found no breach of BELL-R-5, BELL-T-7/T-9 or the decline flows."
  - Label parity is exact. The drawer renders `acceptLabel() ?? copy.footer.acceptContribution`, so a string and `null` render identically.
  - No double send: the first click sends 0, the second sends 1, and a third is blocked by `busy`.
  - Every revert path sends 0, and `ngOnDestroy` releases ownership.
  - Nothing in the diff should compile under `ngc` but fail esbuild.
- **ADVISORY:**
  - Safari does not focus a clicked button, so an armed card A can stay armed for up to 5 s when the user clicks inside card B.
  - The copy key `actions.accept` is now unused.
  - A primary Decline on an armed card leaves it armed until the card is destroyed. Nothing is sent, but calling `exitConfirm()` in `onDeclineClick` would make that explicit.
- **Open DoD:** "labels match the inbox in the browser". The user's `ng serve` is not serving T-11 yet: the served bundle lacks `acceptLabelFor`. The user is restarting it.

#### BELL-T-11 attempt 2 — dev-server compile fix

- **Defect** (from the user's `ng serve` terminal): `TS2345: Argument of type 'Event' is not assignable to parameter of type 'KeyboardEvent'` at `pop-up-notification-item.component.html:4` (`(keydown.escape)="onCardKeydown($event)"`).
  - `npx ngc -p tsconfig.app.json --noEmit` did **not** catch it; the dev-server builder types key-filtered events as `Event`.
  - **Lesson:** `ngc --noEmit` is not a sufficient compile gate in this repo. The served bundle (or a real `ng build`) is.
- **Fix:** `onCardKeydown(event: Event)` and `onCardFocusout(event: Event)`, narrowing with `(event as FocusEvent).relatedTarget`. There are no other key-filtered handlers in the BELL files.
- **Verification:**
  - ngc 0 errors.
  - Jest `pop-up-notification-item` 84/84.
  - The dev server recompiled. The served `main.js` contains `acceptLabelFor` and `BellAcceptConfirm`, both checked **before** any click.
- **Leader browser check (current bundle):**
  - Labels match the inbox: primary cards show "Accept as primary / Decline", contribution cards show "Accept contribution / Decline".
  - Primary card (request 4547), first click only, after verifying `isConfirmingAccept` exists:
    - the label becomes "Confirm accept as primary" in amber outline;
    - the hint reads "Click again to confirm, or press Esc to cancel.";
    - **0 calls to the PRMS API.** The one non-GET XHR seen was Microsoft Clarity analytics (`l.clarity.ms/collect`).
    - 4547 is still pending afterwards.
  - Escape reverts the label to "Accept as primary".
  - No second click was ever made.
- **Note on the earlier incident (4548):** the incident's "2 non-GET calls" counter also counted Clarity POSTs, so that number is not proof of a PATCH. Request 4548 did leave the pending set, though, and the old bundle's one-click Accept would have PATCHed. The incident record stands as "very likely accepted". The user said it is test data ("no te preocupes eso es testing").

#### Final — BELL-T-11 PASS (attempt 2 of 3)

- **DoD:** falsifiers green, with red observed first; labels match the inbox in the browser; `notification-item/CLAUDE.md` updated.
- **Commit:** none.

## Spec Amendment: BELL-T-12 — two-step Decline (2026-10-06)

- **User request (verbatim):** "Con la opción de decline tambien necesito que se haga un re-confirm para evitar por errores aprobar o rechazar".
- **Leader interpretation, recorded:**
  - Contribution Decline, which decides directly in the bell, switches from the Confirm/Cancel strip to the same two-step button as Accept ("Confirm decline"), sharing one armed-state owner.
  - Primary Decline keeps its hand-off to the justification dialog, which is already a written confirmation.
  - Net result: no Accept or Decline in the bell decides on a single click.

### BELL-T-12 — Two-step Decline — PASS (attempt 1 of 3)

- **Date:** 2026-10-06 · **Effort:** medium · **Skills:** `angular-developer`, `spartan`, `tdd`.
- **Changes:**
  - `bell-accept-confirm.service.ts` now holds the owner as `{card, action}`, with `enter`, `release` (owner-guarded) and `isArmed`. One slot for the whole popover.
  - The pop-up item gains `isConfirmingDecline`. The inline decline is two-step: the first click arms, the second calls `decide(false)`.
  - The old Confirm/Cancel strip and its handlers and copy keys are removed. Primary decline still hands off on one click.
  - Style `.bell-decline--confirm` uses `var(--destructive)`.
  - New copy key `actions.confirmDecline`, taken from the inbox's "Confirm decline".
- **Red:** 9 failed. **Green:** `pop-up-notification-item` 90/90. eslint clean; ngc 0 errors. The `ng build` was skipped on purpose, because the served bundle is the compile gate.
- **Leader browser check.** The served bundle contained `isConfirmingDecline` before any click.
  - Contribution 4519, first click only: "Confirm decline" with a red outline, the hint shown, no strip, **0 non-GET API calls**.
  - Escape reverted it. There was no second click.
- **Reviewer: `STATUS: PASS`.** "The inline Decline now works like the T-11 Accept… Primary Decline still hands off on one click. Every T-12 falsifier is covered by a spec."
  - The removed keys and methods have no references left.
  - `--destructive` exists (`styles.scss:543`).
- **ADVISORY:**
  - Spec drift in the BELL-R-7 scenario text. **The Leader amended `requirements.md`.** The `declineMode` doc comment in `request-decision.ts:116-117` is still stale (code comment, left for a follow-up).
  - The service name `BellAcceptConfirmService` now also covers Decline.
  - A spec reaches a private field through `(comp as any)`.
  - Arming Accept does not clear `decisionFailed`, while arming Decline does.

#### Final — BELL-T-12 PASS

- **DoD:** falsifiers green after an observed red; browser first-click check passed with 0 PATCH.
- **Commit:** none.

### BELL-T-6 — Scoped regression + manual/visual validation (HITL) — PASS with recorded inconclusives

- **Closing regression (final state after BELL-T-12):** 25 suites, **920 / 920** passed (19.8 s). eslint is clean on every BELL-touched TS file (changed and untracked).
- **Final checklist:**

| # | Item | Final |
|---|---|---|
| 1 | Badge N+M survives open/close | PASS |
| 2 | One-click Accept removes the row and decrements the badge | **INCONCLUSIVE (environment)** — writes the shared `prdb` and the prod mailer queue. Two-step Accept was checked with the first click only (T-11). Note the incident: request 4548 was very likely accepted by an accidental click on a stale bundle; the user said it is test data. |
| 3 | Bilateral / ToC hand-off opens the right step for that result | PASS (bilateral 7636, legacy 9637, ToC-carried 8607 docked drawer; also from the inbox page after the D-1 fix) |
| 4 | Primary Decline → justification dialog for that request | PASS (9740) |
| 5 | Contribution Decline → Confirm declines it | **PARTIAL / INCONCLUSIVE (environment)** — the two-step arm was verified (T-12) with 0 PATCH; the confirming click was not made. |
| 6 | Clicking an unread update marks it read and drops the badge | **INCONCLUSIVE (environment)** — the PATCH writes `prdb`. Covered by unit tests (T-3 attempt 2). |
| 7 | 400 px, no clipping | PASS after BELL-T-8. Known gap at 360 px: the topbar itself is not responsive. |
| 8 | `99+` fits the badge | PASS |

- **Screenshots** (`%TEMP%/claude-chrome-screenshots-696Lpg/`):
  - `screenshot-1791288934194-2.jpg` — justification dialog for 9740;
  - `screenshot-1791289058566-3.jpg` — ToC prompt for 7636;
  - `screenshot-1791292869583-7.png` — redesign, decision cards;
  - `screenshot-1791292894186-8.png` — redesign, updates tab;
  - `screenshot-1791294818987-12.png` — "Confirm accept as primary";
  - `screenshot-1791295311015-13.png` — "Confirm decline";
  - `screenshot-1791288801526-0.png` — `99+` badge.
- **Hand-off to the user:** run items 2, 5-confirm and 6 in a disposable environment or on the QA test env after deploy.

#### Final — BELL-T-6 PASS (with environment-inconclusive items recorded, per the task's Disqualifier)

---

## Summary — spec `notifications/bell-quick-inbox` (2026-10-06)

- **Tasks:** 12/12 `[x]` — the original T-1…T-6 plus the amendments T-7 (a link never decides), T-8 (viewport fit), T-9 (one-click is primary only), T-10 (visual redesign), T-11 (two-step Accept, inbox labels) and T-12 (two-step Decline).
- **Review rounds:** T-1 2, T-2 1, T-3 2, T-4 1, T-5 2 (D-1 found in the browser), T-7 1, T-8 2, T-9 1, T-10 1, T-11 2 (dev-server compile error), T-12 1.
- **Budget:** the LOC overrun was accepted by the user (option A). Scope grew through four user-approved amendments.
- **Incidents and lessons:**
  - The shared checkout was co-ordinated with the FTD, DSP and eb sessions by message.
  - Request 4548 was accepted on the shared `prdb` by accident (stale bundle).
  - `ngc --noEmit` is not a sufficient compile gate; the served bundle or a real build is.
  - `ng serve` silently keeps serving the last good build after a compile error.
- **Follow-ups (not in scope):**
  - The inbox row's own Accept still accepts ToC-carried contributions in one click (user question).
  - Topbar responsiveness below about 380 px.
  - The `declineMode` doc comment is stale.
  - From the review advisories: tabs a11y (tabpanel), `shortAge(null)`, Mark-as-read failure feedback, and the dead `header-panel` cleanup (design §13).
- **Commit:** pending the user's approval. Stage BELL files only.

## Commits (user go-ahead 2026-10-06: "indicame si ya podemos subir a mi rama local")

- `2b46d852d` ✨ feat(bell-quick-inbox) [P2-3157] [SPEC:notifications/bell-quick-inbox]: 24 BELL client files only. Other sessions' server bilateral files and `docs/specs/bugfix/bilateral-project-codes/` were left unstaged.
- Spec docs commit follows. Local only; no push.
