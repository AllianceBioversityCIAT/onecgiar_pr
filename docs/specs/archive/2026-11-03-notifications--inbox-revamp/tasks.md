# Notifications Inbox Revamp — Tasks

## 1. Scope of this task list

- **Module / feature:** `notifications/inbox-revamp`
- **Linked spec:** `docs/specs/notifications/inbox-revamp/requirements.md` + `docs/specs/notifications/inbox-revamp/design.md`
- **Sprint / target phase:** next available client sprint (unset)
- **Owner / driver:** Santiago Sanchez
- **Status:** all 7 tasks PASS (2026-09-29) — implementation complete, uncommitted; not `shipped` yet per §7 (commit/PR/merge still pending explicit user action)

---

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` are resolved (`NOTIF-OQ-1`, `NOTIF-OQ-2` resolved 2026-09-29; `NOTIF-OQ-3` deferred by `NOTIF-DD-5`, not blocking).
- [ ] CLARISA dependencies: none — this spec touches no CLARISA-backed endpoint.
- [ ] No conflicting in-flight spec touching the same files — **confirm before T-4/T-5 start**: `docs/specs/changes/contribution-request-drawer/` shipped 2026-09-25 and should be `done`/merged; re-check its `Status` before editing the same component so this spec's diff isn't racing an unmerged branch.
- [ ] Migration: n/a — no schema change.

---

## 3. Task list

### `NOTIF-T-1` — Build the unified notification list (merge + classify) `[x]` PASS 2026-09-29

- **Type:** `client`
- **Description:** Add `buildUnifiedList(received, sent, updates)` (co-located in `results-notifications.service.ts` or a new pure helper file if the service is judged too large to extend) that tags every row with `source: 'request' | 'update'`, `needsDecision: boolean` (per `NOTIF-P-1`: `source==='request' && !isSent && request_status_id===1`), and a normalized `activityDate` (`requested_date` for Requests rows, `created_date` for Updates rows).
- **Implements:** `NOTIF-R-1`, `NOTIF-AC-1`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service.ts`, new `.../results-notifications/utils/build-unified-list.ts` (if extracted), `+ .spec.ts`
- **Depends on:** —
- **Blocks:** `NOTIF-T-2`, `NOTIF-T-3`, `NOTIF-T-6`
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** given a fixture with 2 pending Received rows, 1 resolved Received row, 1 Sent row, 2 Updates rows, `buildUnifiedList()` must return exactly 2 rows with `needsDecision:true` and 4 with `needsDecision:false`.
  - **Red run:** `npx jest --testPathPattern="build-unified-list|results-notifications.service" --silent --reporters=summary --no-coverage` — new test fails on current code (function doesn't exist), passes after.
  - **Disqualifier:** if a Sent row is ever found with `request_status_id===1` behaving as pending in production data, the classification premise (`NOTIF-P-1`) is false — stop and re-specify NOTIF-R-1 rather than patching around it.
  - **Consumers:** none yet (new symbol) — becomes a shared symbol once `NOTIF-T-2`/`T-3`/`T-6` consume it.
- **Definition of done:**
  - [ ] Code merged via `♻️ refactor(notifications) [ticket]: ...` or `✨ feat(notifications) [ticket]: ...` per root `CLAUDE.md`. *(Diff complete and Reviewer-PASSed; commit deferred to explicit user go-ahead per standing memory — not yet run.)*
  - [x] Lint + format clean (`npx ng lint --quiet`).
  - [x] Unit tests added; client coverage stays ≥ 50/60/60/60 (46/46 green, no regression).
  - [x] i18n: n/a (no new UI strings in this task).

---

### `NOTIF-T-2` — Recency grouping over the unified list `[x]` PASS 2026-09-29

- **Type:** `client`
- **Description:** Pass `dateKey: 'activityDate'` into `group-notifications-by-recency` when grouping the unified list (the pipe already supports a parametrized key per `NOTIF-P-6`); confirm Today/This week/Earlier boundaries behave identically to today for pure-Requests and pure-Updates fixtures (regression), and correctly for a mixed fixture.
- **Implements:** `NOTIF-R-2`
- **Files (expected):** `.../results-notifications/pipes/group-notifications-by-recency.pipe.ts` (+ `.spec.ts`), the page/template that invokes it (e.g. `results-notifications.component.html` or `pages/requests/...`)
- **Depends on:** `NOTIF-T-1`
- **Blocks:** `NOTIF-T-6`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a mixed fixture with one Requests row `requested_date` = today and one Updates row `created_date` = today both land in the "Today" bucket; a row with a bad/missing date lands in "Earlier", last-sorted (unchanged existing behavior, now also true for Updates rows).
  - **Red run:** `npx jest --testPathPattern="group-notifications-by-recency" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if `NOTIF-P-6` is false (pipe is not actually key-parametrized), this task's approach doesn't work — re-open `design.md` §6.2 before patching.
  - **Consumers:** `results-notifications.component` template; `pages/requests/received-requests`, `pages/updates` (verify no other call site hardcodes the old default key).
- **Definition of done:**
  - [ ] Code merged; lint clean. *(Diff complete and Reviewer-PASSed; commit deferred to explicit user go-ahead — not yet run.)*
  - [x] Existing recency tests still pass unmodified in intent (pipe needed no change — `NOTIF-P-6` was already true).
  - [x] New mixed-source test added.

---

### `NOTIF-T-3` — Filter pipes wired over the unified list (+ DD-4 exclusion behavior) `[x]` PASS 2026-09-29

- **Type:** `client`
- **Description:** Apply the five existing `filter-notification-by-*` pipes to the unified list unchanged in matching logic. Add a test proving `NOTIF-DD-4`: an Updates-tab row lacking `result_center_array`/`obj_result_by_project` is excluded (not passed through) when the center/bilateral-project filter is active.
- **Implements:** `NOTIF-R-10`, `NOTIF-DD-4`
- **Files (expected):** `.../results-notifications/pipes/filter-notification-by-center.pipe.ts`, `filter-notification-by-bilateral-project.pipe.ts`, `filter-notification-by-initiative.pipe.ts`, `filter-notification-by-phase.pipe.ts`, `filter-notification-by-search.pipe.ts` (+ their `.spec.ts` files), toolbar/filter-chip template
- **Depends on:** `NOTIF-T-1`
- **Blocks:** `NOTIF-T-6`
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** with the center filter active for center X, a fixture Updates row with no `result_center_array` at all is absent from the filtered output; a Requests row whose `result_center_array[0]` matches X is present.
  - **Red run:** `npx jest --testPathPattern="filter-notification-by-center|filter-notification-by-bilateral-project" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if product feedback treats the DD-4 exclusion as a regression (users expect Updates rows to still show under a center filter), stop — this needs a backend enrichment (`design.md` §13 Open Gaps), not a client workaround that would silently show unfiltered data.
  - **Consumers:** search/center/initiative/phase/bilateral-project filter chips in the toolbar (all reuse the same pipes) — verify no chip's UI assumed a Requests-only shape.
- **Definition of done:**
  - [ ] Code merged; lint clean. *(Diff complete and Reviewer-PASSed; commit deferred to explicit user go-ahead — not yet run.)*
  - [x] One regression test per pipe confirming pre-existing Requests-only behavior is unchanged.
  - [x] One new test per pipe confirming DD-4's exclusion for a field-less Updates row (or, for initiative/phase, confirming safe non-throwing behavior + regression match — DD-4's exclusion doesn't apply to those two per `NOTIF-P-2`).

---

### `NOTIF-T-4` — Add `view` mode + per-source field adapter to `contribution-request-drawer` `[x]` PASS 2026-09-29 (2 attempts)

- **Type:** `client`
- **Description:** Add `mode: 'view'` to `contribution-request-drawer.component.ts`'s existing `mode: 'decide' | 'confirm-decline'` input, rendering the result card + metadata grid with no footer (no Accept/Decline). Build the per-source field adapter from `design.md` §6.2's table (result type / phase / primary program / reporting center / submitted-by), omitting any field absent on the given row rather than rendering it blank.
- **Implements:** `NOTIF-R-5`, `NOTIF-R-9` (no approval-chain content added), `NOTIF-AC-7`, `NOTIF-DD-2`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/components/contribution-request-drawer/contribution-request-drawer.component.ts` (+ `.html`, `.spec.ts`)
- **Depends on:** —
- **Blocks:** `NOTIF-T-5`
- **Estimate:** L
- **Review:** `full` (shared component, drawer already carries `CRD-DD-*` decisions — audit that none are disturbed)
- **Verification:**
  - **Falsifier:** opening the drawer in `view` mode for a fixture Updates row (no `result_center_array`) renders a metadata grid with no "Reporting center" row at all — not a "Reporting center: –" placeholder. Opening in `decide` mode for an unrelated pending fixture still shows the Accept/Decline footer exactly as before this task.
  - **Red run:** `npx jest --testPathPattern="contribution-request-drawer" --silent --reporters=summary --no-coverage` — new `view`-mode tests fail before this task, pass after; **all pre-existing `decide`/`confirm-decline` tests must stay green unmodified**.
  - **Disqualifier:** if any pre-existing `decide`/`confirm-decline` test needs to change to make this task pass, stop — that means `view` mode is not additive as designed (`NOTIF-DD-2`'s reversion challenge assumed zero changes to the other two modes); re-open the design decision before proceeding.
  - **Consumers:** `notification-item.component.ts` (the only caller of `<app-contribution-request-drawer>`).
- **Definition of done:**
  - [ ] Code merged; lint clean. *(Diff complete and Reviewer-PASSed; commit deferred to explicit user go-ahead per standing memory — not yet run.)*
  - [x] `view` mode tests added (footer absent, field-omission per fixture, close/Escape wiring proven — real DOM focus-trap remains a manual/HITL gap per `design.md` §10/§13, documented not silently claimed).
  - [x] Full audit confirms `CRD-DD-3/4/5/6/10` are untouched by the diff (two Reviewer passes).
  - [x] i18n: new copy (`DETAILS` section title, 5 field labels) added under `src/app/internationalization/contribution-request-drawer.copy.ts`.

---

### `NOTIF-T-5` — Extend row click-to-open to resolved and Updates rows; real chip taxonomy `[x]` PASS 2026-09-29 (2 attempts)

- **Type:** `client`
- **Description:** Extend the `role="button"` / `openDrawer(...)` wiring in `notification-item.component.ts` (today scoped to the pending-row template block only) to also cover resolved Received rows, Sent rows, and Updates rows — opening `contribution-request-drawer` in `view` mode. Render a single `"Contribution request"` chip for every `source:'request'` row and the resolved `NotificationType` label for every `source:'update'` row (reusing `resolveNotificationType()` / `getResultNotificationTextParts()` — no new labels invented). Add the close-panel toggle (`NOTIF-R-11`): clicking the same open row again closes the panel, in addition to the drawer's existing ✕/scrim/Escape close.
- **Implements:** `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-R-11`, `NOTIF-DD-3`
- **Files (expected):** `.../components/notification-item/notification-item.component.ts` (+ `.html`, `.spec.ts`)
- **Depends on:** `NOTIF-T-4`
- **Blocks:** `NOTIF-T-7`
- **Estimate:** M
- **Review:** `full` (click-target correctness is safety-critical per `NOTIF-AC-2`/`NOTIF-AC-3`)
- **Verification:**
  - **Falsifier:** simulated click on the person-name link and on the result-title link each fire their existing navigation and do **NOT** call `openDrawer()`; a simulated click anywhere else on a resolved/Updates row DOES call `openDrawer('details')` (or equivalent) in `view` mode. A pending row's existing click behavior (`CRD-DD-10`) is unchanged — same click still routes to `decide` mode.
  - **Red run:** `npx jest --testPathPattern="notification-item" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if extending `role="button"` to Updates rows breaks any existing keyboard-navigation test for that template block (e.g. screen-reader row semantics for an announcement row), stop and reconsider the a11y treatment before shipping — do not silently strip `role="button"` to make the test pass.
  - **Consumers:** none external — `notification-item` is not consumed by the bell popup (`pop-up-notification-item` is a separate component per `NOTIF-DD-5`).
- **Definition of done:**
  - [ ] Code merged; lint clean. *(Diff complete and Reviewer-PASSed; commit deferred to explicit user go-ahead — not yet run.)*
  - [x] Click-target tests added for `NOTIF-AC-2`/`NOTIF-AC-3` on all three previously-non-clickable row kinds.
  - [x] Chip rendering test confirms no fabricated label ever renders (property-based: every rendered chip text is a member of the known `NotificationType` set ∪ `{"Contribution request"}`).
  - [x] i18n keys added for the "Contribution request" chip label (and the status-badge/aria-label copy).

---

### `NOTIF-T-6` — Tabs UI: All / Needs your decision / For your information `[x]` PASS 2026-09-29 (Pivot + 2 rework attempts under corrected scope; see `NOTIF-DD-6`)

- **Type:** `client`
- **Description:** Add the three-tab filter (`All`, `Needs your decision`, `For your information`) over the unified, grouped, filtered list from `NOTIF-T-1`–`T-3`, with live counts per tab. Visual/toolbar reskin (chip row) using existing Helm/PrimeNG tokens only (no new design tokens per `design.md` §6.3). **Re-scoped 2026-09-29 (`NOTIF-DD-6`):** attempt 1's tab-row/counts/wiring work (the Falsifier, Disqualifier, and DoD items below marked done) is correct and stands — do NOT redo it. What remains: (a) the unified list must render ONLY inside `results-notifications.component`'s own view, never on the `settings` sibling route or duplicated on any other route (attempt 1's blocking bug); (b) retire the "Requests | Updates" routed tabs — remove/redirect their routes in `results-notifications-routing.module.ts`, retire `received-requests.component.*`/`sent-requests.component.*`/`updates.component.*`, porting any test coverage they uniquely had into `results-notifications.component.spec.ts` before deleting them (per `design.md` §13's Open Gap); (c) migrate the filter toolbar (search/center/initiative/phase/bilateral-project) from the retiring components into `results-notifications.component`; (d) add a Received/Sent **in-list toggle** (not a route) satisfying `NOTIF-R-8` as amended; (e) repoint the bell popup's click-through target if it linked to a now-removed route (`requirements.md` Downstream consumers, amended).
- **Implements:** `NOTIF-R-1`, `NOTIF-R-8` (amended), `NOTIF-R-10`, `NOTIF-US-1`
- **Files (expected):** `.../results-notifications/results-notifications.component.ts` (+ `.html`, `.scss`, `.spec.ts`), `.../results-notifications/results-notifications-routing.module.ts`, `.../results-notifications/results-notifications.module.ts`, `.../pages/requests/` (`requests.component.*`, `received-requests.component.*`, `sent-requests.component.*` — retire), `.../pages/updates/` (`updates.component.*` — retire), `shared/components/header-panel/components/pop-up-notification-item/` (only if it linked to a removed route — check first, don't touch if unaffected).
- **Depends on:** `NOTIF-T-1`, `NOTIF-T-2`, `NOTIF-T-3`
- **Blocks:** `NOTIF-T-7`
- **Estimate:** L *(revised from M, per `NOTIF-DD-6`'s Budget revision in `design.md`)*
- **Review:** `full` *(revised from `checklist`, per `NOTIF-DD-6` — route removal + component retirement is exactly the "migration/design-token change" class that `general-setup/task.md`'s `Review` table reserves for `full`)*
- **Verification:**
  - **Falsifier (attempt 1, confirmed done):** with the `NOTIF-T-1` fixture (2 decision, 4 info rows), the "Needs your decision" tab shows a badge/count of 2 and renders exactly those 2 rows; "All" renders all 6; "For your information" renders the other 4.
  - **Falsifier (re-scope, NEW):** navigating to `results-notifications/settings` renders the Settings page with NO notification list above it. Navigating to the base `results-notifications` route (whatever path the removed `requests`/`updates` routes redirect to) renders the unified list exactly once — never duplicated.
  - **Red run:** `npx jest --testPathPattern="results-notifications|received-requests|sent-requests|updates.component" --silent --reporters=summary --no-coverage` — widened pattern since this attempt touches/retires those files.
  - **Disqualifier:** if the tab counts don't match the rendered row count in any fixture, stop. **New disqualifier:** if retiring a component silently drops test coverage that isn't ported first, stop and port it before deleting the file.
  - **Consumers:** the bell popup (`pop-up-notification-item`) if it linked to a removed route; no other external consumer.
- **Definition of done:**
  - [x] Tab-count and tab-filter tests added (attempt 1).
  - [x] i18n keys added for tab labels (attempt 1).
  - [ ] Code merged; lint clean. *(Diff complete and Reviewer-PASSed; commit deferred to explicit user go-ahead, per standing instruction — not blocking task completion)*
  - [x] Unified list confirmed absent from the `settings` route and not duplicated anywhere.
  - [x] `requests.component.*`/`received-requests.component.*`/`sent-requests.component.*`/`updates.component.*` retired; their routes removed/redirected (+ 3 compatibility redirects); unique test coverage ported first.
  - [x] Filter toolbar migrated and functioning against the unified list.
  - [x] Received/Sent in-list toggle implemented, satisfying amended `NOTIF-R-8`.
  - [x] Bell popup's click-through target confirmed still valid — plus 4 OTHER navigation call sites found broken by the same route removal and fixed (`shell-topbar`, `header-panel`, `assistant-tools`, 2 service methods) — see `execution.md`'s rework-attempt-1 FAIL for how this was caught.
  - [ ] Manual/HITL responsive check at mobile width (accepted gap in automated coverage, per `design.md` §13) — still not performed, recorded as an open gap for the PR description / staging QA pass.

---

### `NOTIF-T-7` — Panel isolation across rows and across Received/Sent; regression suite `[x]` PASS 2026-09-29

- **Type:** `client`, `tests`
- **Description:** Ensure switching the open detail panel from notification A to notification B discards A's transient state (none expected to persist beyond what `contribution-request-drawer`'s own `@Input()`s already reset on re-open); ensure switching the Received/Sent **in-list toggle** (re-scoped 2026-09-25 → `NOTIF-DD-6`, 2026-09-29: no longer a route/segmented-control across pages — `received-requests`/`sent-requests` are retired by `NOTIF-T-6`) closes an open panel. Run and confirm the full existing regression suite for the touched components stays green.
- **Implements:** `NOTIF-R-7` (regression only — confirms the pre-existing `decide`-mode inline Accept/Decline is untouched by this spec), `NOTIF-R-8` (amended), `NOTIF-AC-5`, `NOTIF-AC-6`
- **Files (expected):** `.../results-notifications/results-notifications.component.ts` *(amended 2026-09-29: `received-requests`/`sent-requests` removed from this list — they no longer exist post-`NOTIF-T-6`; the Received/Sent toggle isolation test now lives entirely in `results-notifications.component.spec.ts`)*
- **Depends on:** `NOTIF-T-5`, `NOTIF-T-6`
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** open the panel for row A, click row B — the panel's rendered content is entirely B's (no leftover field or footer state from A). Open the panel on Received, switch to Sent — the panel is closed (not still open showing the Received row).
  - **Red run:** `npx jest --testPathPattern="results-notifications|notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage` — full touched-area regression, must be green.
  - **Disqualifier:** any pre-existing test in this regression run that fails and requires a *behavior* change (not just an updated fixture) to pass means this task broke something outside its stated scope — stop and isolate before merging.
  - **Consumers:** none new.
- **Definition of done:**
  - [ ] Code merged; lint clean. *(Diff complete and Reviewer-PASSed; commit deferred to explicit user go-ahead — not yet run.)*
  - [x] New isolation tests added and green.
  - [x] Full regression command above run: 16 suites / 373 tests green.
  - [ ] Client coverage not explicitly re-measured (scoped-run convention used throughout this execution run, not a full coverage pass — see `execution.md`'s Spec Summary).

---

## 3.1 New tasks — added 2026-09-30 (`NOTIF-DD-7`, user feedback + data re-verification)

All 7 original tasks are PASS (see `execution.md`). These 4 new tasks close real gaps found after execution: the mockup's row badges (funding window, result type/level, bilateral project name) turned out to be backed by real, already-returned data on Requests-tab rows, and a small backend widening extends that to Updates-tab rows.

### `NOTIF-T-8` — Widen Updates-tab select/relations for row badges `[x]` PASS 2026-09-30 (2 attempts)

- **Type:** `server`
- **Description:** In `onecgiar-pr-server/src/api/notification/notification.service.ts`, widen `getNotificattionSelect()`/`getNotificationRelations()` (the Updates-tab query, ~lines 747-800) to additionally select/relate `obj_result.source`, `obj_result.obj_result_type`, `obj_result.obj_result_level`, and `obj_result.obj_result_by_project.obj_clarisa_project` — mirroring what `share-result-request.service.ts::getRequestRelations()` (~lines 800-814) already does for Requests-tab rows. Additive only: no field removed, no new endpoint, same response envelope.
- **Implements:** `NOTIF-R-13`
- **Files (expected):** `onecgiar-pr-server/src/api/notification/notification.service.ts` (+ `.spec.ts`)
- **Depends on:** —
- **Blocks:** `NOTIF-T-9` (for the Updates-row badge rendering half), `NOTIF-T-11`
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a fixture Updates row for a bilateral-project-tagged notification, after the widening, includes `obj_result.source_name` (`'W3/Bilaterals'`), `obj_result.obj_result_type`, `obj_result.obj_result_level`, and `obj_result.obj_result_by_project[0].obj_clarisa_project` in the server's returned payload.
  - **Red run:** `npx jest notification.service.spec.ts --silent --reporters=summary` (server-side; adjust pattern to actual test file location).
  - **Disqualifier:** if widening the `select`/`relations` object measurably slows the Updates query beyond an acceptable margin, or breaks an existing consumer of the narrower shape, stop and reconsider (unlikely given this mirrors an already-shipped, already-performant pattern on the Requests side).
  - **Consumers:** `results-notifications.component`'s Updates-tab row rendering (`NOTIF-T-9`).
- **Definition of done:**
  - [x] Server tests added/updated for the widened select; existing tests unmodified and green (58/58, 5 new payload-level).
  - [x] No `migration:check` impact (read-only query change, no schema change).
  - [x] Lint clean.

---

### `NOTIF-T-9` — Render funding/type/level badges + bilateral project name per row `[x]` PASS 2026-09-30

- **Type:** `client`
- **Description:** Add per-row badges to `results-notifications.component`'s row template (or wherever `notification-item`'s successor markup lives post-`NOTIF-T-6`): funding-window tag (`W1/W2`/`W3/Bilateral` from `source_name`), result level + type (e.g. "Output · Innovation Development"), immediately for Requests-tab rows (data already present); extend to Updates-tab rows once `NOTIF-T-8` lands (same fields, now present there too). Also render the tagged bilateral project's name inline for any row where `obj_result_by_project`/`obj_clarisa_project` is populated (`NOTIF-R-14`) — confirm at implementation time whether `short_name` or `full_name` is the populated field.
- **Implements:** `NOTIF-R-12`, `NOTIF-R-14`
- **Files (expected):** `.../results-notifications/results-notifications.component.ts` (+ `.html`, `.spec.ts`) — the row-rendering logic now lives here post-`NOTIF-T-6`; check whether it delegates to `notification-item.component.*` still (closed scope from earlier tasks, but this new badge work may need to touch it — confirm at task time, it's no longer closed if this task's own scope requires it).
- **Depends on:** `NOTIF-T-8` (for Updates-row badges; Requests-row badges can ship without waiting)
- **Blocks:** —
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** a Requests-tab row with `source_name: 'W3/Bilaterals'`, `obj_result_type: {name: 'Innovation Development'}`, `obj_result_level: {name: 'Output'}` renders all three as distinct badges; a row with `obj_result_by_project` populated shows the project name inline, not a generic label; a row with none of these fields (defensive) omits them without a placeholder.
  - **Red run:** `npx jest --testPathPattern="results-notifications" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if a field the mockup shows turns out NOT to be reliably present (re-verify `NOTIF-T-9`'s own premise before building on it — the research this task is based on was thorough but re-confirm against the actual live payload if a token to test with is available), omit rather than fabricate.
  - **Consumers:** none external.
- **Definition of done:**
  - [ ] Badges rendered per the Falsifier; i18n for any new label text.
  - [ ] Lint clean; tests added.

---

### `NOTIF-T-10` — Tab badge visual styling (subtle circular pills) `[x]` PASS 2026-09-29 (pending user visual confirmation)

- **Type:** `client`
- **Description:** Restyle the three tab-count badges (`All`/`Needs your decision`/`For your information`) to match the mockup's subtle circular pill weight — small, muted background, not the current bold/heavy chip styling. Visual-only; no new design tokens (reuse existing `--pr-*`/Tailwind utilities per `design.md` §6.3).
- **Implements:** `NOTIF-R-15`
- **Files (expected):** `.../results-notifications/results-notifications.component.html` (+ `.scss` if needed)
- **Depends on:** — (independent of `NOTIF-T-8`/`T-9`, purely visual)
- **Blocks:** —
- **Estimate:** S
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** visual diff against the mockup screenshot — badge is a small circular/pill shape with muted background, not a bold rectangular chip.
  - **Red run:** n/a (visual change) — a snapshot or manual/HITL check per `design.md` §13's existing accepted-gap pattern for visual regressions.
  - **Disqualifier:** none functional; user's own visual judgment is the gate here.
  - **Consumers:** none.
- **Definition of done:**
  - [x] Styling updated; screenshot or description of the change recorded for user confirmation.

---

### `NOTIF-T-11` — Additional filters: Type, Funding, Result type `[x]` PASS 2026-09-30

- **Type:** `client`
- **Description:** Add Type (row's rendered type chip/label), Funding (`source_name`), and Result type (`obj_result_type`) filters to the toolbar, alongside the five already-preserved filters. Re-verify at task time whether "Program / Accelerator" duplicates the existing Initiative filter before building a redundant control (per `NOTIF-R-16`'s explicit deferral).
- **Implements:** `NOTIF-R-16`
- **Files (expected):** new filter pipes (`filter-notification-by-type.pipe.ts`, `-funding.pipe.ts`, `-result-type.pipe.ts` or equivalent) + `.spec.ts`, toolbar template in `results-notifications.component.html`
- **Depends on:** `NOTIF-T-8` (Funding/Result-type filters need the field present on Updates rows too, for the filter to work across the whole unified list, not just Requests-tab rows)
- **Blocks:** —
- **Estimate:** M
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** filtering by Funding = "W3/Bilateral" excludes W1/W2 rows from both Requests and Updates sources; filtering by Result type excludes non-matching rows; filtering by Type behaves like the existing chip taxonomy (no fabricated sub-types).
  - **Red run:** `npx jest --testPathPattern="filter-notification-by-type|filter-notification-by-funding|filter-notification-by-result-type" --silent --reporters=summary --no-coverage`
  - **Disqualifier:** if "Program / Accelerator" turns out to be a genuine duplicate of the existing Initiative filter, don't ship a second control for the same data — fold it in or drop it, and note the finding.
  - **Consumers:** none external.
- **Definition of done:**
  - [ ] New filter pipes + tests; toolbar UI updated; i18n for new filter labels.

---

### `NOTIF-T-12` — Fix bilateral-project-tagged message text; remove erroneous per-row caption; fix pending-row wording/button label `[x]` PASS 2026-09-30 (2 attempts)

- **Type:** `client`, `server`
- **Description:** User feedback (2026-09-30, two rounds) identified real defects introduced by `NOTIF-T-9` and pre-existing wording gaps:
  1. **`RESULT_BILATERAL_PROJECT_TAGGED`'s message text is wrong.** Current: `"The result {code-title} created by {SP} has tagged the {project}. Click to see the result."` Correct (user-specified, exact): `"{emitter name} from {Science Program code} has tagged project {project name} as contributor to result {code} - {title}"`. Fix in `onecgiar-pr-server/src/api/notification/services/result-tagged-notification.service.ts`'s `emitFor()`: for `RESULT_BILATERAL_PROJECT_TAGGED` targets specifically (not `RESULT_CENTER_TAGGED` — leave that type's message untouched, out of this fix's scope), store just the project label in `notification.text` rather than the whole composed sentence. Then in `onecgiar-pr-client/src/app/shared/constants/notification-type.constants.ts`'s `getResultNotificationTextParts()`, split `RESULT_BILATERAL_PROJECT_TAGGED` out of its current shared case block (`RESULT_CENTER_TAGGED`/`RESULT_CONTRIBUTION_ACCEPTED`/`RESULT_CONTRIBUTION_DECLINED`/`BILATERAL_RESULT_SUBMITTED`) into its own case building: `prefix: "${getEmitterName(notification)} from ${getProgramCode(notification) ?? 'a Science Program'} has tagged project ${notification.text} as contributor to result", suffix: null` — the existing template mechanics (prefix → identity link → suffix) place the result code/title link right after "result", matching the target text exactly with no further change needed.
  2. **`NOTIF-T-9`'s generic `bilateralProjectName` caption was a genuine defect, confirmed by the user twice.** `obj_result.obj_result_by_project` is a per-RESULT list (every bilateral project ever tagged to it across its lifetime), not tied to any specific notification event — rendering it as a caption on EVERY row (contribution requests, resolved rows, decision updates, all four template branches) produced misleading text unrelated to what each row is actually about. **Remove this caption entirely from all 4 branches** (`data-notif-bilateral-project`, the `bilateralProjectName` getter and its template usage) — per fix #1, the real per-notification project name now flows correctly through the `RESULT_BILATERAL_PROJECT_TAGGED` message text itself, which is the only place it should ever appear. Correct now says: `NOTIF-R-14` (already corrected in `requirements.md`).
  3. **Pending contribution-request row (case 1) wording gap:** missing "the" — should read "has requested **the** inclusion of {code} as a contributor to result", not "has requested inclusion of {code}".
  4. **Pending row's Accept button label:** currently plain `"Accept"` (`buttonTextConfirm`) — per the user's confirmed reference image, it MUST read **"Accept contribution"** (Decline stays plain "Decline", asymmetric on purpose, matching the reference exactly). This reverses a prior session's "amends P2-3106... shortened here on purpose" comment — the user's own reference image is the tie-breaker; update or remove that comment, don't leave it contradicting the new code.
  5. **Per-row status chip (`data-notif-status-chip`, `rowStatusLabel`) does not appear in the reference image at all** — only the type chip (Contribution request), funding badge (W1/W2), and level·type badge (Output · Innovation Development) appear under the row text, then Accept contribution / Decline below. Re-reading `NOTIF-R-5`: it requires status to show in the **detail panel** ("the detail panel MUST show, at minimum: the notification's decision/info status"), not as a row-level badge — the earlier decision to render it in the row (made when the drawer had no obvious projection slot) turns out to visually clutter the row and doesn't match the reference. **Remove the per-row status chip rendering** (keep the `rowStatusLabel` getter itself if the panel or another spot still needs it — check `contribution-request-drawer`'s `view` mode metadata grid, `NOTIF-T-4`'s work, to confirm status is/could be shown there instead, satisfying `NOTIF-R-5`'s actual textual requirement without the row-level clutter).
- **Implements:** `NOTIF-R-14` (corrected), `NOTIF-R-3`, `NOTIF-R-5` (re-scoped to the panel, per finding above)
- **Files (expected):** `result-tagged-notification.service.ts` (+ `.spec.ts`), `notification-type.constants.ts` (+ any spec), `notification-item.component.ts`/`.html`/`.spec.ts` (remove caption + status chip, fix wording/button label)
- **Depends on:** `NOTIF-T-9` (this is a correction to it)
- **Review:** `full` (touches message content across server+client, corrects a previously-approved requirement)
- **Verification:**
  - **Falsifier:** a bilateral-project-tagged Updates row renders exactly "{emitter} from {SP} has tagged project {name} as contributor to result {code} - {title}" with the code-title as the clickable link; a pending Requests-tab row renders "{name} from {SP} has requested the inclusion of {code} as a contributor to result {code2} - {title2}" with an "Accept contribution"/"Decline" button pair and no status chip; no row of any type ever shows a generic bilateral-project caption.
  - **Red run:** `npx jest --testPathPattern="notification-item|notification.service" --silent --reporters=summary` (client) and equivalent server pattern.
  - **Disqualifier:** if removing the status chip breaks a `NOTIF-T-5`/`T-9` test that specifically asserted its presence, update that test to reflect the corrected understanding — don't leave contradictory tests.

---

## 4. Dependency graph

```
NOTIF-T-1 (unified list: merge + classify)
   ├── NOTIF-T-2 (recency grouping)
   ├── NOTIF-T-3 (filter pipes + DD-4)
   └── NOTIF-T-6 (tabs UI) ──────────────┐
                                          │
NOTIF-T-4 (drawer `view` mode)            │
   └── NOTIF-T-5 (click wiring + chips) ─┼── NOTIF-T-7 (isolation + regression)
                                          │
NOTIF-T-2, NOTIF-T-3 ─────────────────────┘ (also feed T-6)
```

Parallel-friendly: `NOTIF-T-1`→`T-2`/`T-3` can run alongside `NOTIF-T-4` (independent files: service/pipes vs. drawer component) until both branches converge at `NOTIF-T-6`/`T-7`.

---

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `NOTIF-TEST-1` | unit (client) | `NOTIF-R-1`, `NOTIF-AC-1` | `.../results-notifications/utils/build-unified-list.spec.ts` (or `results-notifications.service.spec.ts`) |
| `NOTIF-TEST-2` | unit (client) | `NOTIF-R-2` | `.../pipes/group-notifications-by-recency.pipe.spec.ts` |
| `NOTIF-TEST-3` | unit (client) | `NOTIF-R-10`, `NOTIF-DD-4` | `.../pipes/filter-notification-by-center.pipe.spec.ts` (+ bilateral-project) |
| `NOTIF-TEST-4` | component (client) | `NOTIF-R-5`, `NOTIF-AC-7`, `NOTIF-DD-2` | `.../contribution-request-drawer/contribution-request-drawer.component.spec.ts` |
| `NOTIF-TEST-5` | component (client) | `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-AC-2`, `NOTIF-AC-3` | `.../notification-item/notification-item.component.spec.ts` |
| `NOTIF-TEST-6` | component (client) | `NOTIF-R-1`, `NOTIF-US-1` | `.../results-notifications.component.spec.ts` |
| `NOTIF-TEST-7` | component (client) | `NOTIF-R-8`, `NOTIF-AC-5`, `NOTIF-AC-6` | `.../results-notifications.component.spec.ts` (isolation cases) |
| `NOTIF-TEST-8` (manual/HITL) | visual | Responsive layout + focus order (accepted automation gap, `design.md` §13) | PR description, screenshots at mobile width |

Client coverage MUST stay ≥ 50/60/60/60 (`docs/trd/trd.md` §10).

---

## 6. Rollout & verification

- [ ] PR(s) opened with the commit message convention. **PR strategy recommendation:** split into two PRs given the two independent branches in §4 — **PR 1: unified list + filters + tabs, INCLUDING the `NOTIF-T-6` route/component retirement** (`NOTIF-T-1/2/3/6`), **PR 2: drawer `view` mode + click wiring + isolation** (`NOTIF-T-4/5/7`). PR 2 depends on PR 1 only at the template-integration point (`results-notifications.component.html` wiring the tab state to row rendering) — call this out explicitly in PR 2's description per `cognitive-doc-design` review-empathy rules (what to review first, link back to PR 1). **Amended 2026-09-29 (`NOTIF-DD-6`):** PR 1 is no longer purely additive — it deletes `received-requests.component.*`/`sent-requests.component.*`/`updates.component.*` and removes their routes. Call this out prominently in PR 1's description (files deleted, routes removed, where their responsibility moved) so reviewers don't mistake it for a routine additive change.
- [ ] CI green (lint, tests, build) for both PRs.
- [ ] Manual QA on staging: click through all three previously-non-clickable row kinds (resolved Received, Sent, Updates) confirming `view` mode opens; confirm pending-row popups still work exactly as before (`CRD-DD-10` regression check); confirm the retired routes (old `.../requests`, `.../updates` URLs, if bookmarked) redirect sensibly rather than 404.
- [ ] No bilateral / platform-report payload touched — no downstream notice needed.
- [ ] Telemetry: n/a (no new logging).

---

## 7. Cleanup & follow-ups

- [ ] `NOTIF-R-20` (mark-as-read on panel open, MAY) is **not implemented** by this task list — no task above wires `PATCH_readNotification` to panel-open. File as a follow-up if wanted; do not assume it shipped.
- [ ] Move spec status to `shipped` once both PRs merge.
- [ ] File a follow-up spec for `NOTIF-DD-4`'s open gap (center/bilateral-project filters excluding Updates rows) if product wants it closed — needs a backend enrichment to `notification/updates`.
- [ ] File a follow-up spec for `NOTIF-DD-5` (bell popup parity) if requested.
- [ ] No `docs/prd.md` Open Question resolved by this spec.

---

## 8. Roll-back plan

1. Revert PR 2 first (drawer `view` mode + click wiring) if only the new click-to-open surface misbehaves — the pending-row `decide` flow (`CRD-DD-10`) is untouched by PR 1 alone, so this alone restores today's `view`-mode access without touching the merged tabs.
2. Revert PR 1 (unified list + tabs + route retirement) if the classification, filter-exclusion behavior (`NOTIF-DD-4`), or the route/component retirement itself is wrong in production — **since a straight git revert restores the deleted files and routes** (`received-requests`/`sent-requests`/`updates` + their routes), this fully restores the current separate Requests/Updates split. **Amended 2026-09-29 (`NOTIF-DD-6`):** because PR 1 now includes a deletion, confirm the revert is a clean file-restore (no partial revert that leaves routes pointing at deleted components) before merging the rollback.
3. No migration to revert. **Amended 2026-09-29:** the original "no feature flag needed, both PRs are additive" reasoning no longer holds for PR 1 post-`NOTIF-DD-6` (it deletes routes/components) — if `/akili-execute` re-confirms this risk at PR-1 execution time and judges a flag warranted (e.g. to allow a fast toggle back to the old routed pages without a full revert), add one before rollout, not after. If the Implementer judges a straight revert is fast enough given this is an internal reporting tool (not a high-traffic consumer product), documenting that judgment in `execution.md` is an acceptable alternative to adding a flag.
4. No bilateral/platform-report payload involved — nothing to verify downstream.
5. Notify: none required (no external consumers of this UI) — but confirm the bell popup's click-through target survives the rollback (it may have been repointed at the new merged route by `NOTIF-T-6`; a revert should restore its original target along with the routes it points to).

---

## Required cross-references

- `docs/specs/notifications/inbox-revamp/requirements.md`, `design.md` (same folder).
- `docs/specs/changes/contribution-request-drawer/design.md` — do not reopen `CRD-DD-*`.
- `docs/prd.md` — US-S3.
- `docs/trd/trd.md` — client coverage thresholds (§10), `Notification` module.
