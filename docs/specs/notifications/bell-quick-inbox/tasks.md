# Bell Quick Inbox — Tasks

## 1. Scope of this task list

- **Module / feature:** `notifications` / `bell-quick-inbox`
- **Linked spec:** `requirements.md` (`BELL-R-*`, `BELL-AC-*`) + `design.md` (`BELL-DD-*`, `BELL-P-*`) in this folder; `docs/prd.md`, `docs/ux-ui/design.md` §10, `docs/trd/trd.md`.
- **Ticket:** P2-3157 (commit tag `[P2-3157]`).
- **Owner:** Santiago Sanchez
- **Status:** not-started (spec approved 2026-10-05)
- **Budget (tripwire, from `design.md`):** 6 tasks · ~650 LOC (prod ~280 / tests ~370) · 1–2 review rounds per task.

## 2. Pre-flight checklist

- [x] `requirements.md` and `design.md` approved (2026-10-05).
- [ ] `BELL-OQ-1` (admin count) — default "same as inbox" accepted or answered.
- [ ] **Uncommitted work on `notification-item.*`, `contribution-request-drawer.*`, `results-api.service.*`, share-result-request server files is committed or stashed** before `BELL-T-1` (same files; proposal R-1).
- [ ] No migration in this spec (n/a).
- [ ] Test runs: Jest always `--maxWorkers=2` and scoped `--testPathPattern`; one test run at a time on the machine; never the full suite.

## 3. Task list

### BELL-T-1 — Extract the request-decision helper and make `notification-item` use it

- **Type:** client
- **Description:** Create `results-notifications/utils/request-decision.ts`. It holds these pure functions:
  - `buildDecisionBody(row, isAccept, opts?)` — the exact body `acceptOrReject` builds today, including the empty `result_toc_result` and the primary `justification`.
  - `isDecidable(row, ctx)` — the non-busy part of `invalidateRequest()`. `ctx` carries `isAdmin`, `platformIsClosed`, `currentPhaseId` and `ipsrCurrentPhaseId`.
  - `classifyAccept(row)` → `'one-click' | 'step'`.
  - `declineMode(row)` → `'inline' | 'justify'`.
  - `isP25(row)`.

  Then refactor `notification-item.acceptOrReject` and `invalidateRequest()` to delegate to it, with no behavior change.
- **Implements:** `BELL-DD-2`; foundation for `BELL-R-5` (the "AND IT MUST offer Accept/Decline only where the inbox row offers them" clause) and the branch tables behind `BELL-R-6` and `BELL-R-7`.
- **Files (expected):** `.../results-notifications/utils/request-decision.ts` (+`.spec.ts`), `.../components/notification-item/notification-item.component.ts` (+`.spec.ts`), and the folder `CLAUDE.md` if the component's notes mention `acceptOrReject`.
- **Depends on:** —
- **Blocks:** `BELL-T-2`, `BELL-T-5`
- **Estimate:** M
- **Review:** full (shared symbol in a 1,400-LOC component with four decision branches)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:**
    - A parity test feeds the same fixture row (`is_map_to_toc`, primary + justification, bilateral, legacy) × accept/decline to both the pre-refactor body (captured as a literal expected object from the current code) and `buildDecisionBody`. Any differing key or value fails.
    - The table test classifies a bilateral non-primary row with `is_map_to_toc:false` as `'step'`. Returning `'one-click'` fails.
    - A primary row → `declineMode === 'justify'`.
    - An `isDecidable` case with a non-admin user, a result in a past phase and `status_id 1` → `false`. Returning `true` fails.
  - **Red run:**
    ```
    cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="request-decision|notification-item"
    ```
    The new spec fails before the util exists.
  - **Disqualifier:**
    - If parity needs a behavior change in `notification-item` (any existing assertion must change its expected value), stop and escalate. The refactor must be behavior-neutral.
    - Re-shaping a fixture to make parity pass is not evidence.
  - **Consumers:** `notification-item.component.ts` (`acceptOrReject`, `submitPrimaryDecline`, `invalidateRequest`, `onAcceptContribution`, `onDrawerAccept`); `BELL-T-2` and `BELL-T-3` (new).
- **Definition of done:**
  - [ ] The util and its table-driven spec exist; the parity test is green.
  - [ ] All existing `notification-item` and `contribution-request-drawer` specs are green and unchanged.
  - [ ] `npx eslint <touched files> --quiet` is clean.

### BELL-T-2 — Bell state in `ResultsNotificationsService` + boot wiring

- **Type:** client
- **Description:**
  - **Signals.** Add `bellReceived`, `bellUpdates`, `bellLoading` and `bellError`.
  - **`refreshBell()`.** It fetches `GET_allRequest({scope:'pending'})` and `GET_requestUpdates({scope:'pending'})` with **no `versionId`**, behind a generation guard.
  - **Computed signals:**
    - `bellItems`: each row tagged `kind: decision|update`; decisions first, then newest first by `requested_date` / `created_date`.
    - `bellCount`.
  - **`decideRequest(row, isAccept)`.**
    - It sends `PATCH_updateRequest(buildDecisionBody(...), isP25(row))`.
    - On success it removes the row from `bellReceived`, shows the inbox's success toast, calls `refreshBell()`, and calls `refreshSource('received')` only when `phaseFilter` is set.
    - On 409 it shows the stale message and calls `refreshBell()`.
    - On any other error it rethrows to the caller.
  - **Hooks.**
    - `refreshSource('received'|'updates')` and the update mark-read path call `refreshBell()`.
    - `app.component` boot calls `refreshBell()` instead of `get_updates_pop_up_notifications()`.
- **Implements:**
  - `BELL-R-1`: "across all phases", "counts both kinds", and "it must NOT change when the inbox filters change".
  - `BELL-R-3`: the order scenario.
  - `BELL-R-4`: loaded at session start; "decided in the inbox" → bell drops it.
  - `BELL-R-8`: "the badge MUST NOT change" on error, at the service level.
  - `BELL-R-11`: parity.
  - `BELL-R-12`: the boot no longer uses the last-viewed feed.
  - `BELL-AC-1`, `BELL-AC-9`.
- **Files (expected):** `results-notifications.service.ts` (+`.spec.ts`), `app.component.ts` (+`.spec.ts`).
- **Depends on:** `BELL-T-1`
- **Blocks:** `BELL-T-3`, `BELL-T-4`
- **Estimate:** M
- **Review:** full (shared root service)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:**
    - Fixtures: 3 received pending + 2 unread updates → `bellCount() === 5`.
    - With `phaseFilter = '30'`, the spy on `GET_allRequest` from `refreshBell()` is called with options that **lack** `versionId`. Passing `'30'` fails.
    - Ordering fixture: a decision older than an update still sorts first.
    - A response from an older generation arriving last does not overwrite a newer one.
    - After `refreshSource('received')`, `refreshBell` has been called.
    - When the PATCH errors with 500, `bellCount` is unchanged and the row is still present.
    - The boot spec asserts `get_updates_pop_up_notifications` is **not** called.
  - **Red run:**
    ```
    cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="results-notifications.service|app.component"
    ```
  - **Disqualifier:** if the received pending endpoint turns out to send a phase default server-side (`BELL-P-1` refuted in a real network capture), stop. The count premise is broken and needs a server spec.
  - **Consumers:**
    - `refreshSource` callers: `results-notifications.component`, `share-request-modal.component.ts:241`, `websocket.service.ts` (dormant).
    - `app.component.ts` boot.
- **Definition of done:**
  - [ ] Signals and methods are added; the legacy `updatesPopUpData` and `handlePopUpNotificationLastViewed` stay untouched (`BELL-DD-5`).
  - [ ] Specs are green; eslint is clean on the touched files.

### BELL-T-3 — Inline actions in `pop-up-notification-item`

- **Type:** client
- **Description:**
  - **Step 0.** Confirm `BELL-P-9`: received-pending rows render with the existing request text (`generateNotificationTextRequest`). If any field is missing, add a minimal adapter and record it in `design.md` §1A.
  - **Decision rows.** Add Accept and Decline (Spartan `hlmBtn` sm).
    - Both carry a real `[disabled]` when `!isDecidable` or a request is in flight.
    - They show the inbox's tooltip when not decidable.
  - **Accept.**
    - `one-click` → `decideRequest(row, true)`.
    - `step` → emit `handoff({row, action:'accept'})`.
  - **Decline.**
    - `inline` → show a confirm/cancel strip on the row; confirm → `decideRequest(row, false)`.
    - `justify` → emit `handoff({row, action:'decline'})`.
  - **Errors.** An error leaves the row in place with an error line and re-enables the buttons.
  - **Clicks.**
    - Button clicks `stopPropagation`; a click on the row body keeps today's navigation and never decides.
    - Clicking an update keeps `markAsRead` and then calls `refreshBell()` once the PATCH succeeds.
  - **i18n.** New strings go in the notifications copy file used by `notification-item`.
- **Implements:**
  - `BELL-R-5`: "one click records the decision"; "it must NOT send a second request on a double click"; "AND IT MUST offer only where the inbox row offers them" (`isDecidable` + decision-kind gating).
  - `BELL-R-6`: emits a hand-off; "must NOT record any decision" before the step.
  - `BELL-R-7`: inline confirm, the cancel path sends nothing, and primary → hand-off ("must NOT decline without a justification").
  - `BELL-R-8`: row-level error and re-enable.
  - `BELL-R-9`: mark read + badge −1; "clicking a pending decision row's body MUST NOT decide".
  - `BELL-AC-3`, `BELL-AC-5`, `BELL-AC-7`, `BELL-AC-8`.
- **Files (expected):** `shared/components/header-panel/components/pop-up-notification-item/*`, the notifications copy/i18n file.
- **Depends on:** `BELL-T-2`
- **Blocks:** `BELL-T-4`
- **Estimate:** M
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:**
    - A double click on Accept for a one-click row → `decideRequest` is called **once**; 2 calls fail.
    - Accept on a bilateral `step` row → `handoff` is emitted and `decideRequest` is called **0** times.
    - Decline on a primary row → `handoff` with `action:'decline'` and **no** PATCH.
    - Decline → Cancel on a contribution row → 0 PATCH.
    - A click on the row body of a decision row → navigation, 0 PATCH.
    - An update row renders **no** Accept/Decline.
    - A row with `isDecidable=false` renders buttons with the `disabled` attribute.
    - On error, the error text is visible and the buttons are enabled.
  - **Red run:**
    ```
    cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="pop-up-notification-item"
    ```
  - **Disqualifier:** if `BELL-P-9` fails broadly (the received payload needs more than a small field adapter), stop and re-specify the row model in `design.md`.
  - **Consumers:** `shell-topbar` (the only live host); `header-panel` (dead; its compile must stay green).
- **Definition of done:**
  - [ ] Existing popup specs are green.
  - [ ] New specs cover every Falsifier bullet.
  - [ ] Folder `CLAUDE.md` updated if present.

### BELL-T-4 — `shell-topbar` badge, list, states; stop consuming on close

- **Type:** client
- **Description:**
  - **Badge.**
    - It reads `bellCount()`: hidden at 0, `99+` above 99.
    - The button `aria-label` includes the count ("Notifications, 5 waiting").
  - **List.**
    - It renders `bellItems().slice(0,10)`.
    - When `bellCount > 10`, a "+N more" link goes to the inbox.
    - "See all the notifications" stays.
  - **Popover states:**

    | State | Condition |
    |---|---|
    | loading | `bellLoading` and no data yet |
    | error | `bellError`, with a link to the inbox |
    | empty | count 0 |
    | list | otherwise |

  - **Open and close.**
    - Opening calls `refreshBell()` without awaiting.
    - Close and backdrop **no longer** call `handleClosePopUp()` or `PATCH_handlePopUpViewed`.
  - **Row events.**
    - It handles `handoff` from rows: close the popover and navigate with `bellHandoffUrl(row, action)` from `BELL-T-5`.
    - A successful inline decision keeps the popover open, with focus on the next row or the list.
- **Implements:**
  - `BELL-R-1`: overflow `99+`; "a count of 0 MUST show no badge".
  - `BELL-R-2`: the whole requirement.
  - `BELL-R-3`: cap and "+4 more".
  - `BELL-R-4`: refresh on open.
  - `BELL-R-10`, `BELL-R-12` (no last-viewed PATCH), `BELL-R-13`, `BELL-R-14`.
  - The NFR on focus staying in the popover.
  - `BELL-AC-1`, `BELL-AC-2`.
- **Files (expected):** `shared/components/shell-topbar/*` (+ its `CLAUDE.md`).
- **Depends on:** `BELL-T-3`, `BELL-T-5` (hand-off URL builder)
- **Blocks:** `BELL-T-6`
- **Estimate:** M
- **Review:** checklist
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:**
    - With `bellCount=5`: open → close → open still shows 5 rows and the badge reads `5`.
    - `PATCH_handlePopUpViewed` is called 0 times over open/close.
    - `bellCount=140` → badge text `99+` and exactly 10 rows plus "+130 more".
    - `bellCount=0` → no badge element and the empty copy.
    - `bellLoading` with no data → the loading copy and **not** the empty copy.
    - Open → `refreshBell` spy called once.
    - A `handoff` event → `router.navigateByUrl` with the URL containing `request=` and `action=`, and the popover closed.
  - **Red run:**
    ```
    cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="shell-topbar"
    ```
  - **Disqualifier:** a test that only asserts a CSS class or the presence of the badge element does not prove `BELL-R-2`. The persistence test must assert both the count text **and** the row count after reopen.
  - **Consumers:** `app.component.html` (host). Gap: no layout or contrast check in jsdom; `BELL-T-6` covers it.
- **Definition of done:**
  - [ ] Specs are green, and the old clear-on-close assertions in the spec are rewritten to the new contract, with a note citing `BELL-DD-5`.
  - [ ] Folder `CLAUDE.md` is re-stamped.

### BELL-T-5 — Inbox deep link (`request` + `action`) and `notification-item.autoAction`

- **Type:** client
- **Description:**
  - **Step 0.** Confirm `BELL-P-10`, the request id field in received rows, and record it in `design.md` §1A.
  - **URL builder.** Add `bellHandoffUrl(row, action)` to `request-decision.ts`. It returns `/result/results-outlet/results-notifications?phase=<row.obj_result.version_id>&request=<id>&action=accept|decline`.
  - **Inbox side (`results-notifications.component`).**
    - It reads `request` and `action`.
    - When they are present, it resets `initiativeIdFilter`, `searchFilter` and the facet filters, so the row is not hidden.
    - It forces the Received view and passes `[autoAction]` to the row whose id matches.
    - It clears `request` and `action` with `replaceUrl` after the row consumes them.
  - **Row side (`notification-item`).**
    - New `@Input() autoAction`.
    - Once the row is initialized and the input is set, it runs `onAcceptContribution()` for `'accept'` or `onDeclineClick()` for `'decline'`, exactly once, and emits `autoActionConsumed`.
- **Implements:**
  - `BELL-R-6`: "the inbox page opens with that request's 'Map to your Theory of Change?' step active".
  - `BELL-R-7`: primary → "the inbox page opens with the justification dialog for that request".
  - `BELL-DD-4`.
  - `BELL-AC-4`, `BELL-AC-6`.
- **Files (expected):** `utils/request-decision.ts` (+spec), `results-notifications.component.ts/.html` (+spec), `notification-item.component.ts` (+spec).
- **Depends on:** `BELL-T-1`
- **Blocks:** `BELL-T-4`
- **Estimate:** M
- **Review:** full (navigation contract + an input on a shared row component)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:**
    - `bellHandoffUrl` for a row with `version_id 30`, id `77`, accept → the exact URL string. A missing `phase` fails.
    - Inbox with `?request=77&action=accept` and rows `[76, 77]` → only row 77 receives `autoAction='accept'`.
    - Unknown id `?request=999` → no row receives it and no error is thrown.
    - After consumption, `router.navigate` is called with `request:null, action:null` and `replaceUrl:true`.
    - `notification-item` with `autoAction='accept'` on a bilateral step row → `showTocPromptDialog()` is true and **0** PATCH.
    - With `autoAction='decline'` on a primary row → `showPrimaryDeclineDialog()` is true.
    - When the input is set twice → the handler runs once.
  - **Red run:**
    ```
    cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="request-decision|results-notifications.component|notification-item"
    ```
  - **Disqualifier:** jsdom cannot prove the real drawer, dialog or global modal (`mapAndAccept` → `showShareRequest`) opens after a real route transition. Green unit tests here prove only the wiring; the behavior is proven in `BELL-T-6`.
  - **Consumers:** `results-notifications.component.html` (every `<app-notification-item>` binding: received/sent/updates branches, lines ~361–406); `notification-item` is used only there.
- **Definition of done:**
  - [ ] Specs are green; existing inbox query-param behavior (`phase`/`init`/`search`) is unchanged when `request` is absent.
  - [ ] Folder `CLAUDE.md` files are updated.

### BELL-T-6 — Scoped regression + manual/visual validation (HITL)

- **Type:** tests
- **Description:** Run one scoped regression over every touched spec. Then, in the running app (`npm start`, local stack per `docs/infrastructure.md` §6), execute the manual checklist. Its findings are recorded in `execution.md`.
- **Implements:**
  - The manual coverage rows of `requirements.md` §10 (visual; hand-off lands on the right request).
  - `BELL-AC-1`…`BELL-AC-9` end-to-end.
- **Files (expected):** `docs/specs/notifications/bell-quick-inbox/execution.md` (evidence only).
- **Depends on:** `BELL-T-4`
- **Blocks:** —
- **Estimate:** S
- **Review:** checklist
- **Skills:** `angular-developer`
- **Verification:**
  - **Falsifier (manual checklist; each item can fail):**
    1. The badge shows N+M and survives open/close.
    2. A one-click Accept removes the row, decrements the badge, and the inbox shows it accepted without a reload.
    3. A bilateral Accept lands on the inbox with "Map to your Theory of Change?" open for **that** result code. A different result, or no prompt, fails.
    4. A primary Decline lands on the justification dialog for that request.
    5. A contribution Decline → Confirm declines it.
    6. Clicking an unread update navigates there and the badge drops.
    7. The popover at 400px in light and dark mode has no clipped buttons or overflowing text.
    8. `99+` renders inside the badge without overflow.
  - **Red run:**
    ```
    cd onecgiar-pr-client && npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="request-decision|results-notifications|notification-item|contribution-request-drawer|pop-up-notification-item|shell-topbar|app.component"
    ```
  - **Disqualifier:**
    - If no pending request of a given kind exists in the local DB, that item is **inconclusive** and must be reported as such, not marked passed.
    - Creating test data needs the user (DB actions are handed off).
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [ ] The scoped run is green.
  - [ ] The checklist is recorded with pass/fail/inconclusive per item.
  - [ ] Screenshots are noted.

## 4. Dependency graph

```
BELL-T-1 ──┬── BELL-T-2 ── BELL-T-3 ──┐
           │                           ├── BELL-T-4 ── BELL-T-6
           └── BELL-T-5 ───────────────┘
```

`BELL-T-2` and `BELL-T-5` can run in parallel after `BELL-T-1`. Both touch only `notification-item` (T-5) versus the service (T-2), but there must be one test run at a time.

## 5. Clause-level coverage

| Requirement clause | Owner |
|---|---|
| R-1: counts both kinds; all phases; filter independence ("must NOT change when inbox filters change") | T-2 |
| R-1: `99+`; 0 → no badge; overflow still lists (capped) | T-4 |
| R-2: open/close keeps the list, the badge and the read state | T-4 |
| R-3: order (decisions first, newest first) | T-2 |
| R-3: cap 10 + "+N more" + See all | T-4 |
| R-4: load at session start | T-2 |
| R-4: refresh on open | T-4 |
| R-4: decided in the inbox → bell drops it | T-2 |
| R-5: one click accepts; must NOT double submit; same eligibility as the inbox | T-3 (with T-1 `isDecidable`) |
| R-6: hand-off opens the step for that request | T-5 (wiring), T-6 (behavior) |
| R-6: must NOT record before the step | T-3, T-5 |
| R-7: inline confirm; cancel sends nothing | T-3 |
| R-7: primary → justification; must NOT decline without one | T-3 (emit), T-5 (dialog opens) |
| R-8: row stays + error + re-enable | T-3 |
| R-8: badge unchanged | T-2 |
| R-9: navigate + mark read + badge −1 | T-3 |
| R-9: body click must NOT decide | T-3 |
| R-10: empty only at 0 | T-4 |
| R-11: bell ↔ inbox parity | T-2 |
| R-12: no last-viewed filtering or PATCH | T-2 (boot), T-4 (close) |
| R-13: loading | T-4 |
| R-14: load error | T-4 |
| NFR performance (cached render, background refresh) | T-4 |
| NFR a11y (aria count, keyboard, focus) | T-4 (aria/focus), T-3 (keyboard buttons) |
| NFR i18n | T-3, T-4 |
| NFR backwards compatibility (inbox unchanged) | T-1 (parity), T-5 (params absent → unchanged) |
| Visual (no automated gate) | T-6 manual |

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BELL-TEST-1` | unit | DD-2 parity, branch tables, `isDecidable` | `utils/request-decision.spec.ts` |
| `BELL-TEST-2` | unit | R-1, R-3, R-4, R-8, R-11, AC-1, AC-9 | `results-notifications.service.spec.ts` |
| `BELL-TEST-3` | unit | R-5…R-9, AC-3, AC-5, AC-7, AC-8 | `pop-up-notification-item.component.spec.ts` |
| `BELL-TEST-4` | unit | R-1, R-2, R-3, R-10, R-12–R-14, AC-2 | `shell-topbar.component.spec.ts` |
| `BELL-TEST-5` | unit | R-6, R-7, AC-4, AC-6 (wiring) | `results-notifications.component.spec.ts`, `notification-item.component.spec.ts` |
| `BELL-TEST-6` | manual (HITL) | visual, hand-off behavior, AC-1…AC-9 end-to-end | `execution.md` |

## 7. Rollout & verification

- [ ] Commits follow `<emoji> <type>(<scope>) [P2-3157]: <description>`, with no apostrophes or quotes in the subject (Jenkins). Nothing is committed without the user's explicit go-ahead.
- [ ] CI green; manual QA on test env once deployed; return P2-3157 to QA with a note on AC1/AC5 and the new inline decisions.

## 8. Cleanup & follow-ups

- [ ] Follow-ups from `design.md` §13: delete the dead `header-panel` and the legacy pop-up members, endpoint and column; fix the stale `src/CLAUDE.md` §2.1; the Decline button's missing `[disabled]` in `notification-item`.

## 9. Roll-back plan

1. Revert the spec's client commits (no server, migration or flag changes).
2. Boot falls back to `get_updates_pop_up_notifications()` and the old popover. No data cleanup is needed: `last_pop_up_viewed` was never written by the new code.
