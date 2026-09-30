# Notifications Inbox Revamp — Execution Log

## 1. Document Control

- **Module / feature:** `notifications/inbox-revamp`
- **Linked spec:** `requirements.md` + `design.md` + `tasks.md` (same folder)
- **Approval Mode:** `gated` (per `requirements.md` §1) — continue/pause gate never auto-passes; user is asked after every task
- **Leader model:** session model (Sonnet 5) — registry (`AGENTS.md` → Model Routing) recommends `opus` for T1; noted once, not blocking (see run start note below)
- **Started:** 2026-09-29
- **Branch:** `qa-development-2026-ss` (no new branch created — matches current checkout)
- **Commit policy:** per standing user memory (`feedback_no_autocommit`), the Leader does NOT run `git commit` on task PASS even though the command's default Step 3.3 calls for it. Diffs are left uncommitted for explicit user review/commit.

### Run start note

Registry (`AGENTS.md` §Model Routing) maps T1 Leader → `opus`; this session runs on Sonnet 5, a newer generation than the registry's dated alias. Per the model-checkpoint rule, continuing silently rather than recommending a downgrade.

---

## 2. Task Execution History

### NOTIF-T-1 — Build the unified notification list (merge + classify)

- **Status:** PASS
- **Date:** 2026-09-29
- **Implements:** `NOTIF-R-1`, `NOTIF-AC-1`
- **Attempts:** 1

**Attempt 1:**
- Files changed (new only, no existing file touched): `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/utils/build-unified-list.ts`, `.../utils/build-unified-list.spec.ts`.
- Implementer verification: `npx jest --testPathPattern="build-unified-list|results-notifications.service" --silent --reporters=summary --no-coverage` → 2 suites / 46 tests passed (9 new + 37 pre-existing per Reviewer's recount; Implementer originally reported 8+38, same total). `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS**. `buildUnifiedList` matches design.md §6.2 and tasks.md's Falsifier (traced by hand: 2 true / 4 false); NOTIF-P-1 correctly implemented (Sent rows hardcoded `needsDecision:false` regardless of status); inputs never mutated (spread copies); no scope creep.
- **ADVISORY (non-gating):**
  - READABILITY: `UnifiedNotification` return type drops the generic `T`'s fields — downstream consumers (T-2/T-3/T-6) will need casts to reach fields like `obj_result`. Consider `(T & UnifiedNotificationTags)[]`.
  - RELIABILITY: `results-notifications.service.ts` stores Received/Sent as `{ receivedContributionsPending, receivedContributionsDone }` / `{ sentContributionsPending, sentContributionsDone }` objects, not flat arrays — **NOTIF-T-6's Implementer brief must flag that Pending+Done need to be joined into a flat array before calling `buildUnifiedList`, or the `.map` call inside it will throw at runtime.**

**Requirements covered:** `NOTIF-R-1`, `NOTIF-AC-1`.
**Decisions made:** none beyond design.md (extracted to a new `utils/` file per the design's own fallback clause, since the service is already ~330 lines).
**Issues encountered:** none blocking; two advisories recorded above for T-6's brief.
**Final verification:** Jest 46/46 green, lint clean.
**Continue/pause gate:** deferred — held until the parallel `NOTIF-T-4` wave also lands, per Leader's batching call for this wave (not a silent skip of the gated-mode gate; both are reported to the user together).

---

### NOTIF-T-4 — Add `view` mode + per-source field adapter to `contribution-request-drawer`

- **Status:** IN PROGRESS (attempt 1 FAILed, attempt 2 dispatched)
- **Date:** 2026-09-29
- **Implements:** `NOTIF-R-5`, `NOTIF-R-9`, `NOTIF-AC-7`, `NOTIF-DD-2`
- **Review depth:** `full` (shared component, prior `CRD-DD-*` decisions)

**Attempt 1: FAIL**
- Files changed: `contribution-request-drawer.component.ts` (+65/-1), `.component.html` (+24), `.component.spec.ts` (+150/-3), `onecgiar-pr-client/src/app/internationalization/contribution-request-drawer.copy.ts` (+16).
- Implementer verification: `npx jest --testPathPattern="contribution-request-drawer" --silent --reporters=summary --no-coverage` → 1 suite / 41 tests passed (10 new `view`-mode tests, not 11 as Implementer first reported — Reviewer recounted; 31 pre-existing unmodified and green). `npx ng lint --quiet` clean.
- Reviewer verdict: **FAIL** (full audit). All `CRD-DD-3/4/5/6/10` confirmed untouched (traced by hand: both new template guards — `mode() !== 'view' || reviewRows().length` and `mode() !== 'view'` — are always-true for `decide`/`confirm-decline`, so those modes render byte-identical DOM). Field adapter confirmed matching design.md §6.2 exactly, including NOTIF-P-2's by-source (not just by-presence) omission. Two blocking issues:
  1. **DoD gap:** "focus-trap reused" was claimed but never tested — none of the 10 new `view`-mode tests exercise close/Escape/focus in `view` mode. Violates tasks.md NOTIF-T-4 DoD + design.md §6.3.
  2. **Stale folder doc:** `contribution-request-drawer/CLAUDE.md` still describes `mode: 'decide' | 'confirm-decline'` (no `view`, no `viewFields`/`viewMetadataRows`), `Verified:` stamp still 2026-09-25. Violates `onecgiar-pr-client/CLAUDE.md` §10 folder-doc convention (same-commit update rule).
- **ADVISORY (non-gating, carried into T-5's brief):**
  - RISK — `[crdAlign]` projection is unconditional; T-5 must gate it on `drawerMode() !== 'view'` or the Align/ToC controls will wrongly render in a read-only panel.
  - Spec gap (not an Implementer fault): `NOTIF-R-5` requires showing "decision/info status" but design.md §6.2's field table has no status row and T-4 followed the design faithfully — Leader decision needed: does T-5 add a status row, or does §6.2 get amended? **Leader note:** deferring to T-5's brief — will instruct the Implementer to add a status indicator (decision/info) per NOTIF-R-5, reading design.md §2.2's `needsDecision`/`source` tagging as the data source, since amending design.md itself is out of an Implementer's authority and the requirement is a MUST.
  - `drawerHeader()`'s pending-style wording ("has asked … to contribute") reads wrong for a resolved/Updates row in `view` mode — T-5's concern.
  - RELIABILITY: emptiness check is `!== ''`, not trimmed — a whitespace-only value would render a blank-looking row (violates `NOTIF-AC-7`'s spirit). Fix in the remediation pass.
  - "DETAILS" section title is the Implementer's own copy choice — accepted, no product objection raised.
- **Leader decision:** feedback passed verbatim to a second Implementer attempt; effort bumped medium... high → **xhigh** (rework retry rule, `AGENTS.md` Effort dial). Not a Pivot — both issues are additive fixes within the task's existing scope, no spec ambiguity or unviability surfaced.

**Attempt 2: PASS**
- Files changed (additive to attempt 1's diff): `contribution-request-drawer.component.ts` (trim fix in `viewMetadataRows`'s `push()` helper), `.component.spec.ts` (+4 tests: close-button presence/aria-label, click-to-close, Escape-to-close, whitespace-only value omission — all inside the existing `NOTIF-T-4` describe block, no pre-existing test body touched), `contribution-request-drawer/CLAUDE.md` (documents `view` mode, `viewFields`, `viewMetadataRows`, the deliberate `CRD-R-4` departure; re-stamped `Verified: 2026-09-29 · qa-development-2026-ss · 28a4bd678`).
- Implementer verification: `npx jest --testPathPattern="contribution-request-drawer" --silent --reporters=summary --no-coverage` → 1 suite / 45 tests passed (41 previously-passing + 4 new). `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS** (full audit, second pass). Trim fix confirmed correct (null/undefined guards run before `.trim()`, non-whitespace values render unchanged, pushed value is the original untrimmed string — not the trimmed one). Folder doc confirmed accurate, under 120-line cap, current `Verified:` stamp. All 4 new tests confirmed to target the real close mechanism (`hlmSheetClose`/`crd-close-btn`, real `hlm-sheet (closed)` binding — not a no-op stand-in); tests would fail if the close button were missing. `CRD-DD-3/4/5/6/10` re-confirmed untouched (`notification-item/*` has zero `view`/`viewFields`/`NOTIF-T-4` references; footer/review-section guards still always-true for non-`view` modes).
- **ADVISORY (non-gating):** the new `## view mode` section in `CLAUDE.md` was inserted mid-list, pushing the pre-existing `[crdAlign]` projection bullet under the `view`-mode heading where it now reads as `view`-only (it isn't). Cosmetic doc-ordering fix, deferred to a future edit of that folder — not worth a third attempt for a documentation reflow.
- **Reviewer's stated caveats (recorded for transparency, not blocking):** the Reviewer (Read/Grep/Glob only, no Bash) could not run `git diff`/`git status` or re-run Jest/lint itself; it verified "no pre-existing test body altered" by reading the whole spec file and checking consistency, and verified "notification-item untouched" via grep + file-modification-time ordering rather than a git diff. Leader accepts this as sufficient given the Implementer's own explicit diff-scoped report and the first attempt's already-confirmed baseline.

**Requirements covered:** `NOTIF-R-5`, `NOTIF-R-9`, `NOTIF-AC-7`, `NOTIF-DD-2`.
**Decisions made:** `view` mode hides "Where it contributes" entirely when empty (deliberate, documented departure from `CRD-R-4`'s always-show rule, scoped to `view` only). "DETAILS" section title is the Implementer's own copy choice (accepted).
**Issues encountered:** 1 rework round (2 blocking + 1 advisory-turned-fixed). Resolved, no Pivot.
**Final verification:** Jest 45/45 green, lint clean.
**Continue/pause gate:** per `requirements.md` §1 Approval Mode `gated`, held for both `NOTIF-T-1` and `NOTIF-T-4` together. User asked (AskUserQuestion): "Continue to next wave" — approved 2026-09-29.

**Leader note — NOTIF-R-5 status-indicator gap, resolved with user:** before dispatching `NOTIF-T-5`, the Leader surfaced the gap above (design.md's field table has no status row; `NOTIF-R-5` MUST requires one) to the user rather than unilaterally deciding it, per the "ask before passing an ambiguous task into the loop" rule. **User decision:** add a status badge in `NOTIF-T-5`, sourced from the existing `needsDecision`/`source` tagging (no backend change, no `design.md` amendment needed). This is folded into `NOTIF-T-5`'s Implementer brief below as an explicit addition to its stated scope, with the user's decision cited.

### NOTIF-T-2 — Recency grouping over the unified list

- **Status:** PASS
- **Date:** 2026-09-29
- **Implements:** `NOTIF-R-2`
- **Attempts:** 1

**Attempt 1:**
- Files changed: `group-notifications-by-recency.pipe.spec.ts` only (+2 tests). No production code change — Implementer verified `NOTIF-P-6` was already true by reading the pipe source: `transform<T>(list, dateKey = 'requested_date')` already threads `dateKey` through both bucketing and the final sort, with `'requested_date'` appearing only as the default parameter value.
- Implementer verification: `npx jest --testPathPattern="group-notifications-by-recency" --silent --reporters=summary --no-coverage` → 14/14 (12 pre-existing + 2 new). `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS**. Independently re-confirmed the pipe source has no hardcoded key beyond the default. Confirmed both new tests actually prove the tasks.md Falsifier (mixed Requests+Updates rows both land in "Today"; a missing-date row sorts last into "Earlier"). Confirmed the two existing call sites (`received-requests`/`sent-requests` templates) are correctly left on the default key since they aren't fed `buildUnifiedList()`'s output yet — that wiring is `NOTIF-T-6`'s job. No scope creep.
- **ADVISORY:** none raised.

**Requirements covered:** `NOTIF-R-2`.
**Decisions made:** none — premise held, no design deviation.
**Issues encountered:** none.
**Final verification:** Jest 14/14 green, lint clean.

---

### NOTIF-T-5 — Extend row click-to-open to resolved and Updates rows; real chip taxonomy

- **Status:** IN PROGRESS (attempt 1 FAILed, attempt 2 pending)
- **Date:** 2026-09-29
- **Implements:** `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-R-11`, `NOTIF-DD-3` (+ Leader/user-approved additions: `[crdAlign]` view-mode gating, `NOTIF-R-5` status badge)
- **Review depth:** `full` (click-target correctness safety-critical)

**Attempt 1: FAIL**
- Files changed: `notification-item.component.ts` (+124/-12), `.component.html` (+113/-4), `.component.scss` (+16), `.component.spec.ts` (+332), `contribution-request-drawer.copy.ts` (+36, `notificationItem` copy section), `notification-item/CLAUDE.md` (re-stamped).
- Implementer verification: `npx jest --testPathPattern="notification-item" --silent --reporters=summary --no-coverage` → 4 suites / 149 tests passed. `npx ng lint --quiet` clean. Also ran `npx ng build --configuration development` successfully.
- Reviewer verdict: **FAIL** (full audit). Confirmed correct: click-target correctness (all result-title links + bilateral span have `stopPropagation()`, no person-name link exists), `CRD-DD-10` pending-row flow genuinely unchanged (traced), `[crdAlign]` gate correctly excludes only `'view'` (confirmed Align stays visible during `confirm-decline` per `CRD-DD-5`), status badge logic sound (no approval-chain violation), chip taxonomy never fabricates (`resolveNotificationType()` returns falsy → chip omitted), close toggle is per-row-instance (no cross-row bug), i18n clean, folder doc accurate, two rewritten pre-existing tests judged legitimate (asserted the exact old behavior the spec is tasked to supersede; added semantics, stripped none — does not trigger the Disqualifier). One blocking issue:
  1. **`view` mode still shows a dash-filled "Where it contributes" table.** `drawerReviewTables()` (the method feeding `[reviewRows]`) never returns an empty array — when there's no real ToC data it returns one table of 7 dash placeholders. `NOTIF-T-4`'s drawer only hides that section in `view` mode when `reviewRows` is actually empty (`execution.md`'s recorded NOTIF-T-4 decision), but since the caller never passes an empty array, that hide-branch can never fire. Every `view` panel without real ToC data (every Updates row, every resolved/Sent request without a ToC mapping) shows a fabricated-looking dash table — violates `NOTIF-R-5`/`NOTIF-AC-7` and defeats `NOTIF-T-4`'s own recorded decision. Live-today bug: Received/Sent pages already render resolved rows through this component.
- **ADVISORY (non-gating):**
  - Two unused copy keys (`statusResolved`, `rowAriaLabelDecide`) — dead code, cosmetic cleanup.
  - The `[crdAlign]` view-mode test doesn't actually isolate the new gate (passes regardless, since `openDrawer` never seeds `tocInitiative` in view mode anyway) — test-quality gap, not a behavior bug.
  - Real-browser risk: the NOTIF-R-11 toggle is only proven in jsdom; a real sheet scrim may intercept the re-click before it reaches the row. Note for the manual/HITL browser pass.
  - Nested-interactive a11y pattern (row `role="button"` containing links/buttons) now covers every row, not just pending — pre-existing pattern, worth recording for the §10 HITL a11y pass.
- **Leader decision:** feedback passed verbatim to a second Implementer attempt; effort bumped high → **xhigh**.

**Attempt 2: PASS**
- Files changed (additive): `notification-item.component.ts` (new `drawerReviewRowsForMode()` wrapper — `drawerReviewTables()` itself untouched), `.component.html` (`[reviewRows]` binding switched to the new wrapper), `.component.spec.ts` (+4 tests), `contribution-request-drawer.copy.ts` (removed dead `statusResolved`/`rowAriaLabelDecide` keys), `notification-item/CLAUDE.md` (re-documented).
- Implementer verification: `npx jest --testPathPattern="notification-item" --silent --reporters=summary --no-coverage` → 153/153 (149 previously-passing + 4 new). `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS** (full audit, second pass). Confirmed `drawerReviewTables()` byte-identical/untouched; traced all 4 cases of the new `drawerReviewRowsForMode()` wrapper exhaustively (decide/confirm-decline always delegate unchanged; view+data delegates and shows real data; view+no-data returns `[]`, triggering the drawer's existing hide guard). Confirmed the 4 new tests assert exactly what's claimed, including a genuine regression proof that `decide` mode still shows the dash fallback. Confirmed `rowStatusLabel`'s dead-branch removal is behaviorally identical (grepped the template — `.notification_status_chip` is never rendered for status 2/3 rows). Confirmed the `[crdAlign]` test strengthening is real (plants non-null `tocInitiative`, still asserts absence in view mode).
- **ADVISORY (non-gating, fixed inline by Leader):** the folder `CLAUDE.md` still listed a "Resolved" status label that no longer exists after the dead-code removal. One-line, single-file doc fix — made directly by the Leader (Delegation Thresholds: puntual 1-file verification, no Implementer dispatch needed) rather than spawning a third attempt.

**Requirements covered:** `NOTIF-R-3`, `NOTIF-R-4`, `NOTIF-R-5` (via the Leader/user-approved status-badge addition), `NOTIF-R-11`, `NOTIF-DD-3`.
**Decisions made:** `[crdAlign]` gated to `decide`/`confirm-decline` only (item 1); status badge rendered in the row, not the drawer sheet (item 2, user-approved 2026-09-29); `view` mode never shows a dash-fallback "Where it contributes" table (attempt 2 fix).
**Issues encountered:** 1 rework round (1 blocking bug + 2 advisory cleanups). Resolved, no Pivot.
**Final verification:** Jest 153/153 green, lint clean.
**Continue/pause gate:** per `requirements.md` §1 Approval Mode `gated`, held for the whole wave 2 (`NOTIF-T-2` + `NOTIF-T-5`). User asked (AskUserQuestion): "Continue" — approved 2026-09-29.

### NOTIF-T-3 — Filter pipes wired over the unified list (+ DD-4 exclusion behavior)

- **Status:** PASS
- **Date:** 2026-09-29
- **Implements:** `NOTIF-R-10`, `NOTIF-DD-4`
- **Attempts:** 1

**Attempt 1:**
- Files changed: all 5 filter pipe `.spec.ts` files only (196 lines, additive) — no pipe source change needed, same "already correct, just needs tests" outcome as `NOTIF-T-2`. No template touched (template wiring is `NOTIF-T-6`'s job).
- Implementer verification: `npx jest --testPathPattern="filter-notification-by-center|filter-notification-by-bilateral-project"` → 2/13 passed; `npx jest --testPathPattern="filter-notification-by-initiative|filter-notification-by-phase|filter-notification-by-search"` → 5/30 passed (incl. 2 unrelated pre-existing IPSR-module spec files, untouched).
- Reviewer verdict: **PASS**. Independently re-verified all 5 pipes' safe optional-chaining, and independently re-confirmed `NOTIF-P-2` at the server source (`notification.service.ts` `getNotificattionSelect()`/`getNotificationRelations()`, L747-801) — Updates rows genuinely lack `result_center_array`/`obj_result_by_project` but carry `obj_result_by_initiatives`/`obj_version`. Confirmed all new tests prove what's claimed per pipe. No scope creep (grepped for `buildUnifiedList`/template wiring — none found).
- **ADVISORY (non-gating, explicitly flagged to fold into `NOTIF-T-6`'s brief, not new scope for T-3):**
  1. **Latent bug in `filter-notification-by-initiative.pipe.ts` L30:** `?.[0].initiative_id` is missing an optional-chain after `[0]` — throws if `obj_result_by_initiatives` is a non-null empty array. Low risk today (server always populates it for Updates rows), but `NOTIF-T-6` widens this pipe's real input surface, so the one-character fix (`?.[0]?.initiative_id`) should land there.
  2. **`filter-notification-by-search.pipe.ts` takes one `isUpdateTab` boolean for the whole list**, not per-row. On a genuinely mixed unified list (T-6's actual wiring), every row goes through one text-builder branch regardless of its real source — an Updates row searched as a Requests row would produce garbled text and miss real matches. `NOTIF-T-6` needs to pick the branch per-row (e.g. from `item.source === 'update'`), not pass one flag for the whole array.

**Requirements covered:** `NOTIF-R-10`, `NOTIF-DD-4`.
**Decisions made:** none — all 5 premises held; no design deviation.
**Issues encountered:** none blocking; 2 advisories carried forward into `NOTIF-T-6`'s brief (see above).
**Final verification:** Jest 13/13 + 30/30 green (checklist-scoped commands), lint not re-run by Implementer this task (test-only diff) — will be covered by `NOTIF-T-6`'s broader verification.

### NOTIF-T-6 — Tabs UI: All / Needs your decision / For your information

- **Status:** `[~]` BLOCKED — Pivot Protocol triggered
- **Date:** 2026-09-29
- **Implements:** `NOTIF-R-1`, `NOTIF-US-1` (+ carried-forward `NOTIF-T-3` advisory fixes)

**Attempt 1:**
- Files changed: `results-notifications.component.ts/.html/.spec.ts`, `results-notifications.module.ts`, `filter-notification-by-initiative.pipe.ts` (+.spec.ts, the T-3-flagged one-char fix), `filter-notification-by-search.pipe.ts` (+.spec.ts, the T-3-flagged per-row source fix), `contribution-request-drawer.copy.ts` (new `tabs.*` keys, reusing existing constants).
- Implementer verification: scoped run → 8 suites/231 tests passed; wider regression run → 22 suites/413 tests passed; lint clean; `ng build` succeeded.
- Implementer's own flag: explicitly did NOT remove/replace the pre-existing "Requests | Updates" routed tabs — the new unified block renders alongside them, since fully replacing them would require touching `requests.component.*`/`received-requests.component.*`/`sent-requests.component.*`/`updates.component.*`, none of which are in `NOTIF-T-6`'s stated file scope.
- Reviewer verdict: **FAIL**, plus an explicit escalation recommendation. Confirmed correct: the Pending+Done join before `buildUnifiedList()` (closing NOTIF-T-1's advisory), the Falsifier (badge counts match rendered counts on all 3 tabs), `isSentRow()`'s correctness, both T-3-flagged pipe fixes (verified they don't alter existing single-source call-site behavior), i18n for the tab labels. One blocking defect found squarely inside T-6's own file scope:
  1. **The new unified list renders unconditionally on every child route** — including `/results-notifications/settings` (a full live notification list with Accept/Decline appears above the Settings page) and duplicated on `/requests/*`/`/updates` (same rows rendered twice: once in the new unified block, once in the still-present routed child — a pending row gets two independent Accept/Decline surfaces and two separate drawers).
  - **Reviewer's structural finding (escalated, not a checklist FAIL by itself):** the Reviewer's own reading of `design.md`'s `NOTIF-DD-1` ("reject keep Requests/Updates as fully separate tabs... doesn't deliver the All view") and `requirements.md` §4 ("redesign of the list", not an additional list) is that the spec's *intent* is for the new tabs to REPLACE the Requests/Updates split — but the *approved design as written* never reconciles that with: (a) the filter toolbar (`NOTIF-R-10`) which today only exists inside `RequestsComponent`/`updates.component`, outside T-6's file scope; (b) `NOTIF-R-8`/`NOTIF-US-4`'s requirement that Received/Sent stay independent contexts with the panel closing on switch — the unified list as designed (`buildUnifiedList(received, sent, updates)`) merges Received+Sent into one list with no Received/Sent switch for that requirement to act on. This is a genuine contradiction inside the approved spec, not an implementation shortcut.

**Leader assessment — Pivot Protocol triggered, not a routine rework retry:** per the Error Handling & Pivot Protocol section of `/akili-execute`, this qualifies: the Reviewer's discovery reveals the *approved design* (not just the implementation) doesn't actually resolve how the toolbar/Received-Sent-independence requirements migrate if the old routed tabs are removed — spawning a 3rd-attempt rework here would either (a) leave the coexistence bug half-fixed by patching only the Settings-route leak while leaving the deeper "which UI wins" question unresolved, or (b) have the Implementer unilaterally decide to rewrite 4 out-of-scope files under time/attempt pressure. Neither is acceptable without the user's explicit direction. `NOTIF-T-6` is marked `[~]` (blocked) even though rework attempts remain (this is attempt 1 of 3).

**Pivot Record: NOTIF-T-6**

- **Blocker:** `design.md` §6.1/§6.2/`NOTIF-DD-1` establish that the notifications page should present ONE unified, tab-filterable list — but the approved design never specifies what happens to the existing "Requests | Updates" routed tabs, their filter toolbar (which `NOTIF-R-10` requires preserving), or how `NOTIF-R-8`'s Received/Sent-independence requirement applies to a list that already merges Received+Sent together.
- **Alternatives identified by the Reviewer** (none is clearly the "correct" reading of the current spec — this is why it needs the user, not the Leader, to decide):
  1. **Replace:** the new tab row fully replaces the Requests/Updates routed tabs and their routed child pages; the filter toolbar migrates into `results-notifications.component`; `NOTIF-R-8`'s Received/Sent independence is either dropped (superseded by the merged view) or re-expressed as a filter/sub-grouping within the merged list.
  2. **Nest:** the new tab row lives *inside* the Received/Sent context (i.e., one merged All/Decision/Info view scoped to Received, another scoped to Sent, Updates folded into whichever context makes sense) — closer to preserving `NOTIF-R-8` literally, but a materially different structure than `design.md` §6.2's `buildUnifiedList(received, sent, updates)` signature implies.
  3. **Coexist (current state, rejected):** both UIs stay, which duplicates rows, duplicates Accept/Decline surfaces, and leaks the notification list onto the unrelated Settings route — not a viable end state, but flagged as the literal-minimal reading of "add a client-side tab state inside the existing page" that produced today's bug.
- **This also affects `NOTIF-T-7`** (isolation + regression, depends on `T-5`+`T-6`) and indirectly `NOTIF-T-3`'s already-shipped pipe work — whichever alternative is chosen may change which files own the filter toolbar and thus what `T-7`'s regression scope actually is.
- **No TRD ADR is affected** — this is spec-local (`docs/specs/notifications/inbox-revamp/`), not a project-wide architecture decision.
- **Immediate, uncontested fix regardless of which alternative is chosen:** the unrestricted-route-rendering bug (list appearing on Settings) is a bug under any resolution and should be fixed as part of whichever path is chosen — not deferred further.

**Status:** Stopped for user review per Pivot Protocol Step 4. Not resumed until the user picks a direction.

**User decision (2026-09-29, AskUserQuestion):** **Replace.** The new All/Needs-decision/For-info tab row fully replaces the Requests/Updates routed tabs. The filter toolbar migrates into `results-notifications.component`. `NOTIF-R-8`'s Received/Sent independence is re-expressed as an in-list toggle/sub-grouping rather than separate routes.

**Pivot Protocol Step 3 — spec correction applied:** `requirements.md`, `design.md`, and `tasks.md` amended below to map the updated plan (see each file's own changes for specifics). Two-direction sweep performed:
- **Forward** (grep for superseded values across the spec folder): searched `docs/specs/notifications/inbox-revamp/` for `Requests | Updates`, `routed tabs`, `received-requests`, `sent-requests`, `updates.component` — found and corrected references in `design.md` §6.1/§2.2/Budget and `tasks.md` `NOTIF-T-6`/`NOTIF-T-7`/dependency graph/rollout plan.
- **Backward** (grep for references TO the corrected sections): searched for `NOTIF-DD-1`, `NOTIF-R-8`, `client-side tab state` across the folder — `requirements.md`'s `NOTIF-R-8` itself needed a corrective annotation (see its entry) since other requirements/ACs cite it as written.
- **No ADR affected** (spec-local pivot, not a TRD-level architecture decision).

Re-marking `NOTIF-T-6` `[ ]` (re-opened, re-scoped) below the corrected task block, ready for re-execution against the amended spec.

**Spec amendments applied:**
- `design.md`: §6.1 rewritten (routes removed/redirected, toolbar migration, Received/Sent in-list toggle), new `NOTIF-DD-6` decision entry, Budget table revised (7 tasks unchanged, LOC ~500–650 → ~750–950, review rounds 1–2 → 2–3 for T-6), §2.1 module list corrected, §13 Open Gaps gained 2 new entries (port test coverage before deleting; bell popup target).
- `requirements.md`: `NOTIF-R-8` amended (in-list toggle, not routes), §4 In-scope bullet amended, `NOTIF-AC-6` reworded, Downstream consumers section amended (bell popup repoint).
- `tasks.md`: `NOTIF-T-6` re-scoped (Description, Implements, Files, Estimate M→L, Review checklist→full, new Falsifier/Disqualifier, DoD items), `NOTIF-T-7`'s Files corrected (received-requests/sent-requests removed — no longer exist), §6 Rollout note amended (PR 1 no longer purely additive), §8 Roll-back plan amended (revert restores deleted files; feature-flag reasoning revisited).

`NOTIF-T-6` re-launched below against the corrected spec.

**Re-scoped attempt 1: FAIL**
- Files changed: deleted 20 files (`pages/requests/**`, `pages/updates/**` and their modules/routing/specs); modified `shared/routing/routing-data.ts` (removed `updates`/`requests` from `notificationsRouting`, deleted `requestsNotificationsRouting`), `build-unified-list.ts` (+.spec.ts — added `origin: 'received'|'sent'|'update'` discriminator), `results-notifications.component.ts/.html/.scss/.spec.ts` (settings-route gating, Received/Sent in-list toggle, migrated filter toolbar, ported Announcements + "Mark all as read"), `results-notifications.module.ts`, `contribution-request-drawer.copy.ts` (new `sourceToggle`/`filterToolbar` copy), `pop-up-notification-item.component.ts` (+.spec.ts, repointed both nav branches).
- Implementer verification: scoped run 14/334 green; wider run 15/362 green; even-wider regression 29/656 green; lint clean; `ng build` succeeded.
- Reviewer verdict: **FAIL** (full audit, all 4 lenses). Confirmed correct: routing cleanup, settings-route gating (entire block wrapped, nothing leaks), the Received/Sent toggle and its `@switch`-forced remount (closes any open drawer — no CDK overlay to worry about, drawer renders inline), `origin` discriminator correctly assigned with `source`/`needsDecision`/`activityDate` unchanged from `NOTIF-T-1`, the migrated filter toolbar (faithful port, real-DOM-driven tests), the "no lying badge" test (genuinely iterates both toggle sides × 3 tabs), the settings-isolation test, and the bell-popup repoint itself (`generateUrlLink()`'s two branches now point at a route that exists). One blocking issue:
  1. **Five other live navigation call sites still target the now-deleted `.../requests` / `.../updates` routes**, silently redirecting users to the Results list via the wildcard fallback instead of Notifications: `shell-topbar.component.ts`'s `goToNotifications()` (the bell popover's main "See all notifications" entry point in the current shell), `header-panel.component.ts`'s `goToNotifications()` (legacy header bell), `ai-assistant/tools/assistant-tools.ts`'s notifications navigate target, and **`results-notifications.service.ts`'s `readUpdatesNotifications()`/`markAllUpdatesNotificationsAsRead()`** — the second of which backs the very "Mark all as read" button this attempt ported from the retired `updates.component.html`, meaning the ported button is itself broken (clicking it throws the user off the page). The stale spec assertions in 3 of these files' `.spec.ts` still assert the dead URLs, which is why the green test runs didn't catch it.
- **Reviewer's structured remediation:** (a) add compatibility redirects in `routing-data.ts` for `requests`/`requests/:side`/`updates` → the parent path (protects any bookmark/caller the grep missed — belt-and-suspenders on top of fixing the 5 call sites directly); (b) repoint all 5 call sites at the merged route; (c) update the 3 stale spec assertions; (d) add a test proving "Mark all as read" doesn't navigate away; (e) `shell-topbar/` has its own `CLAUDE.md` — update and re-stamp it in the same commit per the folder-doc convention, since this fix touches that folder.
- **Leader assessment — this is a mechanical bug-fix widening, not a new Pivot.** The 5 broken call sites are a direct, foreseeable consequence of THIS task's own route deletion (not a new design question) — fixing them is squarely "make T-6's own change actually work," not new scope requiring user sign-off. Approved for the next attempt without re-escalating to the user.
- **ADVISORY (non-gating, recorded per Reviewer's explicit request to document rather than silently accept):**
  1. **Scope-decision process note (Reviewer's Issue-3 position):** the Implementer's mid-task decision to port real Announcements + "Mark all as read" *functionality* (not just test coverage) from the retired `updates.component` was NOT cleared with the Leader first, even though the Reviewer agrees the outcome (porting, not dropping) is the more defensible reading of `design.md` §6.1 ("anything it uniquely covered... gets a look before deletion") and `requirements.md` §4 (removing notification kinds is out of scope). Recorded here as the process gap the Reviewer asked to have on record — not re-litigated, since the outcome is accepted and the actual bug (Mark-all-as-read's broken nav) is being fixed as Issue 1.
  2. **Updates-row toggle behavior is an open interpretation, not a bug:** Updates rows currently render under BOTH Received and Sent toggle positions (Implementer's judgment call, since they're neither). The Reviewer's alternative reading — Updates rows belong under Received only (things sent *to* you), matching `NOTIF-US-4`'s "track what I've requested independently of what's been sent to me" — is plausible and arguably a better fit. **Recorded as an open interpretation for the user to weigh in on if they notice it in QA; not gating, not re-escalated now** (the Leader judges this doesn't rise to Pivot-Protocol severity the way the Requests/Updates replacement question did — it's a UX nuance, not a structural contradiction in the approved spec).
  3. **Init double-fetch:** `ngOnInit` fetches all three feeds directly, and `getAllPhases()`'s own `onPhaseChange()` fetches them again once a phase resolves — up to 6 requests per page load, last-response-wins on shared state. Reviewer could not confirm this is pre-existing (no git access) — fold a fix into the next attempt since it's already in scope territory (same file).
  4. **Perf:** the `unifiedList`→`filteredUnifiedList`→`sourceScopedList` getter chain re-spreads every row on every read; template reads it ~9+ times per change-detection cycle. Not a correctness bug today (no `ngOnChanges` on `notification-item`), but worth a `computed()`/memoization pass if this becomes noticeable.
  5. Per-tab empty state, settings-page back-link, a few stale comments referencing retired components, and `src/CLAUDE.md`'s stale route-map section (§3.3/§4.2) — all recorded as pending cleanup, not blocking. `src/CLAUDE.md` is out of `NOTIF-T-6`'s approved file list per shared-file write discipline; flagged for the next `/akili-archive` guide sync or an explicit user ask to fix now.
- **Leader decision:** feedback passed verbatim to the next Implementer attempt; effort bumped xhigh → **max** (rework rule; this is now a correctness-critical navigation-breaking bug). Scope for the next attempt explicitly includes `shell-topbar.component.*` (+ its `CLAUDE.md`), `header-panel.component.*`, `ai-assistant/tools/assistant-tools.*`, `results-notifications.service.ts` — approved widening, not re-escalated to the user (see assessment above).

**Re-scoped attempt 2: PASS**
- Files changed: `shell-topbar.component.ts` (+.spec.ts, +`CLAUDE.md` re-stamped), `header-panel.component.ts` (+.spec.ts, no folder `CLAUDE.md` exists there), `assistant-tools.ts` (+.spec.ts, no folder `CLAUDE.md` exists there), `results-notifications.service.ts` (removed dead navigation from `readUpdatesNotifications()`/`markAllUpdatesNotificationsAsRead()`; `getAllPhases()` gained an `onPhaseUnresolved` fallback callback param; removed now-unused `Router` dependency), `results-notifications.component.ts` (`ngOnInit()` delegates the fetch to `getAllPhases()`'s callback instead of fetching directly), `routing-data.ts` (3 compatibility redirects: `requests`/`requests/:side`/`updates` → `''`), plus corresponding `.spec.ts` updates.
- Implementer verification: scoped run 18/427 green; broader `notification`-pattern run 21/420 green; lint clean; `ng build` succeeded; grep confirmed zero remaining dead-route references anywhere in `onecgiar-pr-client`.
- Reviewer verdict: **PASS** (full audit, second pass, this attempt's changes only). All 5 navigation call sites independently confirmed repointed correctly (including verifying `header-panel`'s relative-path style resolves correctly despite no leading slash). Removing navigation from the two service methods confirmed safe (traced why the old code navigated — a "force re-render" trick needed by the retired routed component — and confirmed the merged page's getter chain already reacts without it). The 3 routing redirects confirmed syntactically valid Angular (traced the redirect-resolution mechanics, confirmed no loop risk). Double-fetch fix confirmed correct for both branches (phase resolves → single fetch via `onPhaseChange`; no phase → fallback fetches) and confirmed no other caller of the same-named `getAllPhases()` on unrelated components is affected (same method name, different classes). Folder-doc re-stamp confirmed accurate and under the line cap; confirmed via glob that `header-panel/`/`ai-assistant/` genuinely have no `CLAUDE.md` to update. Test correctness confirmed (prototype spies are real, not false-passing no-ops; the two double-fetch branches are genuinely distinguished).
- **ADVISORY (non-gating, new this pass):**
  1. **RESILIENCE:** `getAllPhases()`'s `GET_versioning` subscription has no `error` handler — if that call fails, the fallback never fires either (only the `else`-branch "no phase resolved" case does), so the page would now load with zero data on a versioning-fetch failure, where the old unconditional `ngOnInit` fetch would have still populated the lists. Suggested fix: `error: () => onPhaseUnresolved?.()`. Not fixed this round — recorded as a follow-up, not blocking, since it's a failure-mode edge case, not a normal-path regression.
  2. **READABILITY:** the two `Router.prototype` spies in `results-notifications.service.spec.ts` aren't restored (no `afterEach(jest.restoreAllMocks)`); harmless today (scoped to one file, no leakage observed) but a minor test-hygiene nit.
  - **Carried forward, still open (not re-litigated, not re-argued):** Updates-row toggle interpretation (renders under both Received/Sent), the Announcements-port process note (outcome accepted, process gap recorded), the getter-chain perf note, per-tab empty state / settings back-link / stale comments, and `src/CLAUDE.md`'s stale §3.3/§4.2 route-map section — all still pending for a future cleanup pass or `/akili-archive`.

**Requirements covered:** `NOTIF-R-1`, `NOTIF-R-8` (amended), `NOTIF-R-10`, `NOTIF-US-1`.
**Decisions made:** `NOTIF-DD-6` (Pivot, replace not coexist); Updates rows render under both toggle positions (Implementer judgment, flagged as open interpretation); Announcements/Mark-all-as-read ported as real functionality (accepted outcome, process gap noted); dead navigation removed rather than repointed in the two service methods (Reviewer-confirmed safe).
**Issues encountered:** 1 Pivot (spec-level contradiction, resolved by user decision) + 2 rework rounds under the corrected spec (1 real bug: 5 broken nav call sites). Total for this task: Pivot + 2 attempts under the corrected scope.
**Final verification:** Jest 427/427 (scoped) green, 420/420 (broader) green, lint clean, build succeeded.
**Continue/pause gate:** User asked (AskUserQuestion) after `NOTIF-T-6` PASS — "Continue to NOTIF-T-7" — approved 2026-09-29.

### NOTIF-T-7 — Panel isolation across rows and across Received/Sent; regression suite

- **Status:** PASS
- **Date:** 2026-09-29
- **Implements:** `NOTIF-R-7` (regression), `NOTIF-R-8` (amended), `NOTIF-AC-5`, `NOTIF-AC-6` (amended)
- **Attempts:** 1

**Attempt 1:**
- Files changed: `notification-item.component.spec.ts` only — one new test proving `NOTIF-AC-5` (re-opening the drawer for a different notification without an intervening close discards the previous unsubmitted Align selection rather than merging it). No source files touched; `NOTIF-T-6`'s toggle-closes-panel test judged already solid, not duplicated.
- Implementer verification: `npx jest --testPathPattern="results-notifications|notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage` → 16 suites/373 tests green. `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS** (checklist). Traced `openDrawer()`/`seedTocInitiative()` directly and found one correction to the Implementer's framing (non-blocking): the reseed is NOT unconditional — it only fires when `mode === 'decide' && isBilateralResult` — but this doesn't matter in practice because the leftover `tocInitiative` from a prior open can never be read/acted on outside that same gate (`[crdAlign]` projection, `onDrawerAccept()`'s ToC checks, and `drawerAcceptHelper()` all share the identical bilateral+decide gate). Separately, traced whether the test's own scenario (same instance reactivated for a different notification, no intervening close) is actually reachable through the live unified list: **it isn't** — `trackNotificationKey(item)` is unique per notification, so `@for` always mints a new component instance for a different notification, and the modal `hlm-sheet` makes clicking a second row while one is open physically unreachable in the browser regardless. The test is legitimate defense-in-depth (proves the reset logic is correct if the scenario ever became reachable) but the Implementer's claim that this is "the one place a leak IS structurally possible" is overstated — recorded, not fixed, since the test itself is correct and harmless.
- **ADVISORY (non-gating):**
  - **`notification-item/CLAUDE.md` was stale post-`NOTIF-T-6`** (still described retired `received-requests`/`sent-requests` pages as consumers, `@for … track $index` instance-reuse semantics that only applied to those retired pages, and a since-superseded "no page feeds this component an isUpdateSource row" claim). **Fixed inline by the Leader** (puntual, single-file-folder doc correction — same folder this task's diff touched) rather than spawning another agent: corrected the "Where it is used" section, the DD-6 trap description (now correctly attributes `trackNotificationKey` tracking to the surviving host), the stale isUpdateSource claim, and the `Contract` section's `received-requests`/`sent-requests` reference; re-stamped `Verified:`.
  - `src/CLAUDE.md` §3.3/§4.2 remains stale (out of this spec's approved file list per shared-file write discipline) — carried forward from `NOTIF-T-6`'s advisory, still pending for `/akili-archive` or an explicit user ask.
  - Client coverage threshold (≥50/60/60/60) was not explicitly re-measured this task (consistent with how every other task in this run verified via scoped Jest runs rather than a full coverage pass, per the standing "no full test suites" convention) — this is a known limitation of the whole execution run's verification approach, not specific to T-7.

**Requirements covered:** `NOTIF-R-7`, `NOTIF-R-8` (amended), `NOTIF-AC-5`, `NOTIF-AC-6` (amended).
**Decisions made:** none — this task confirmed existing `NOTIF-T-6` mechanisms rather than building new ones.
**Issues encountered:** none blocking; 1 non-blocking framing correction, 1 stale folder-doc fixed inline.
**Final verification:** Jest 373/373 green, lint clean.

---

## 3. Spec Summary — all 7 tasks complete

| Task | Status | Attempts | Notes |
|---|---|---|---|
| `NOTIF-T-1` | PASS | 1 | Unified list merge + classify |
| `NOTIF-T-2` | PASS | 1 | Recency grouping (no code change needed — premise already held) |
| `NOTIF-T-3` | PASS | 1 | Filter pipes (no code change needed; 2 real fixes flagged forward into T-6) |
| `NOTIF-T-4` | PASS | 2 | Drawer `view` mode (rework: missing focus/close test, stale folder doc) |
| `NOTIF-T-5` | PASS | 2 | Click wiring + chips + status badge (rework: dash-fallback table bug) |
| `NOTIF-T-6` | PASS | Pivot + 2 | Tabs UI — mid-execution Pivot (`NOTIF-DD-6`: replace, not coexist, the old Requests/Updates routed split) + rework (5 broken nav links from the route removal) |
| `NOTIF-T-7` | PASS | 1 | Isolation + regression (mostly verification; one new test) |

**Total Reviewer FAILs across the run:** 4 (T-4×1, T-5×1, T-6×2) — all resolved, no task left in a HALT state.

**Open items carried to follow-up (not blocking, all recorded above at their origin):**
- `NOTIF-DD-4`'s center/bilateral-project filters still miss Updates-tab rows (needs backend enrichment, explicitly out of this spec's scope).
- Updates-row behavior under the Received/Sent toggle (renders under both — open interpretation, Reviewer offered an alternative reading).
- `getAllPhases()`'s missing `error` handler on `GET_versioning` (resilience edge case).
- `src/CLAUDE.md` §3.3/§4.2 stale route-map section (needs `/akili-archive` guide sync).
- Manual/HITL responsive + focus-order check at mobile width — never performed (accepted automation gap per `design.md` §13/§10, same as `requirements.md`'s own accepted gap).
- `NOTIF-R-20` (mark-as-read on panel open, MAY) — not implemented, as `tasks.md` §7 always said it wouldn't be.

**Commits:** none made this run, per standing user memory (no auto-commit). All diffs are uncommitted in the working tree, ready for explicit user review/commit.

---

## 4. Second round — added 2026-09-30 (user feedback on the visual mockup)

The user reviewed the mockup screenshot against the shipped implementation and flagged 4 gaps: missing per-row badges (funding window W1/W2 vs W3/Bilateral, result type/level), missing bilateral-project-name display when a project is tagged, tab-count badge styling not matching the mockup's subtle circular pills, and several mockup filters (Type/Funding/Result type/Program-Accelerator) never built.

**Leader response — verified before acting, did not just implement blind:** dispatched a research fork to check whether the underlying data for these fields actually exists, since `NOTIF-R-3`'s 2026-09-29 correction had explicitly stated "the mockup's five-chip taxonomy does not exist in the data model." **Finding: that correction was half right, half wrong.** Right that the 3-way decision-chip sub-typing (Contribution/Primary-program/Contributor request) genuinely has no backend discriminator. Wrong to imply the OTHER badges (funding window, result type/level, bilateral project name) don't exist — they're already eager-loaded and returned on every Requests-tab row today (`share-result-request.service.ts::getRequestRelations()`: `obj_result.source` → `source_name`, `obj_result_type`, `obj_result_level`, `obj_result_by_project.obj_clarisa_project`), just never rendered client-side. Updates-tab rows lack these fields today (a narrower select), but widening it is small and additive.

**User decision (AskUserQuestion):** widen the backend too (not just client-side work limited to Requests-tab rows), so the same badges work everywhere.

**Spec amended:** `requirements.md` (`NOTIF-R-3` re-corrected with a second note; new `NOTIF-R-12`–`NOTIF-R-16`; Out-of-scope bullet gained a narrow, explicit exception for this one backend widening), `design.md` (new `NOTIF-DD-7`), `tasks.md` (4 new tasks: `NOTIF-T-8` backend widening, `NOTIF-T-9` client badges + project name, `NOTIF-T-10` tab-badge visual fix, `NOTIF-T-11` additional filters).

**Execution plan:** `NOTIF-T-8` (backend) and `NOTIF-T-10` (pure visual, independent) run in parallel first; `NOTIF-T-9` (needs `T-8` for the Updates-row half, though Requests-row badges don't strictly need it) and `NOTIF-T-11` (needs `T-8` for Funding/Result-type filters to work across the whole unified list) follow.

### NOTIF-T-9 — Render funding/type/level badges + bilateral project name per row

- **Status:** PASS
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-12`, `NOTIF-R-14`

**Attempt 1:**
- Files changed: `notification-item.component.ts`/`.html` (row rendering, confirmed as the correct home — `results-notifications.component.*` only composes `<app-notification-item>`, needed no changes), `.spec.ts` (+9 tests), `contribution-request-drawer.copy.ts` (+3 i18n keys). `notification-item.component.*` was previously treated as closed scope in earlier task briefs — explicitly reopened for this task since the badges' natural home is there.
- Implementer verification: `npx jest --testPathPattern="results-notifications|notification-item"` → 16/382 green. `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS** (checklist). Confirmed all 3 getters wired into all 4 row-kind template branches (Updates + Requests cases 1/2/3) — not partially wired. Confirmed `null` genuinely omits the element (no blank/dash placeholder), confirmed via trim-then-check. Confirmed the `shortName`/`fullName` field-naming choice is real — cross-referenced against both the existing client code (`results-notifications.component.ts`'s `bilateralProjectFacetOptions`) and the server entity (`clarisa-projects.entity.ts`, DB `short_name`/`full_name` mapped to TypeORM camelCase `shortName`/`fullName` — confirms `requirements.md`'s snake_case guess was wrong and the Implementer correctly checked ground truth instead). Confirmed all 9 new tests are genuine behavioral checks, not just markup-exists checks.
- **Judgment call, Reviewer agrees:** `resultLevelTypeBadge` shows whichever of level/type is present when only one exists, rather than omitting the whole badge — Reviewer's position: consistent with `NOTIF-R-5`/`NOTIF-AC-7` (those rules forbid fabricating/blank-filling, not showing a real partial value); dropping the whole badge would hide real data for cosmetic symmetry. Kept as implemented.
- **ADVISORY (non-gating):**
  - Only the Updates branch and `@case (1)` have dedicated DOM tests proving the badges render; cases 2/3 were confirmed correct by direct code reading but have no parameterized test — a future partial-wiring regression on those two cases wouldn't be caught automatically. Worth a follow-up test.
  - The badge/caption markup is duplicated near-identically across 4 template branches — a shared `ng-template` or sub-component would prevent future drift. Not blocking.
  - `bilateralProjectName` only reads the FIRST `obj_result_by_project` entry; a `.find()` over all links would be marginally more robust if a result ever has a project link with empty names followed by one with real names. Cosmetic-risk only given today's one-project-per-result norm.
  - Reviewer noted a spec-wording inconsistency (non-blocking): `tasks.md`'s Falsifier says "three distinct badges" but `NOTIF-R-12`'s own example combines level+type into one badge — the implementation matches the requirement's stated example, the Falsifier's wording is just imprecise.

**Requirements covered:** `NOTIF-R-12`, `NOTIF-R-14`.
**Decisions made:** partial level/type badge (show what's real, don't hide it for symmetry); `shortName` preferred over `fullName`.
**Issues encountered:** none blocking.
**Final verification:** Jest 382/382 green, lint clean.

### NOTIF-T-11 — Additional filters: Type, Funding, Result type

- **Status:** PASS
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-16`

**Attempt 1:**
- Files changed: 3 new filter pipes (`filter-notification-by-type.pipe.ts`, `-funding.pipe.ts`, `-result-type.pipe.ts`, + `.spec.ts` each), `notification-item.module.ts` (pipe registration, `CLAUDE.md` re-stamped inline by Leader), `results-notifications.service.ts`/`.ts`/`.html` (filter state, toolbar UI, facet options), `contribution-request-drawer.copy.ts` (new i18n keys). **Program/Accelerator explicitly NOT built** — confirmed genuine duplicate of the existing Initiative filter (Science Programs/Accelerators are stored as initiatives in the 2025-2030 data model; no second field exists to filter on).
- Implementer verification: `npx jest --testPathPattern="filter-notification-by-type|filter-notification-by-funding|filter-notification-by-result-type|results-notifications"` → 17/367 green. Lint clean, dev build succeeded.
- Reviewer verdict: **PASS** (checklist). Confirmed all 3 pipes follow the established `NOTIF-DD-4` exclusion pattern; confirmed the Type pipe genuinely reuses `resolveNotificationType()`/the existing chip constant (no drift risk from duplicated label logic); confirmed Funding and Result-type filter on the exact same fields the `NOTIF-T-9` badges read (`source_name`, `obj_result_type.name`) — filter and badge can't disagree. Independently re-verified the Program/Accelerator duplicate-field finding by reading the payload/service code directly, not just trusting the claim.
- **ADVISORY (non-gating):**
  - Folder-doc `Verified:` stamp was stale after this task touched `notification-item.module.ts` — **fixed inline by the Leader** (1-file puntual doc correction).
  - The request/update label-resolution branching now exists in 3 places (row getter, filter pipe, a component helper) — all delegate to the same underlying functions, so no drift risk today, but a shared exported helper would remove even the theoretical risk. Not blocking.
  - The Implementer's framing of "Type = bounded checkbox list, Result-type = open-ended search box" as mirroring an existing UI distinction was inaccurate (Reviewer found no such pre-existing split — it's a new UI variant, and by raw label count Type is actually the larger set) — cosmetic doc/comment inaccuracy, not a functional issue. Comments could be corrected to describe this as a new choice rather than a copied pattern.

**Requirements covered:** `NOTIF-R-16`.
**Decisions made:** Program/Accelerator filter dropped as a confirmed duplicate of Initiative.
**Issues encountered:** none blocking.
**Final verification:** Jest 17/367 green, lint clean, build succeeded.

---

## 5. Second-round summary — 4 of 4 tasks complete (as of NOTIF-T-11)

| Task | Status | Attempts |
|---|---|---|
| `NOTIF-T-8` | PASS | 2 (real bugs: missing computed field, missing soft-delete filter) |
| `NOTIF-T-9` | PASS | 1 |
| `NOTIF-T-10` | PASS | 1 (visual-only, no automated gate — awaiting user's own confirmation) |
| `NOTIF-T-11` | PASS | 1 |

### NOTIF-T-12 — Fix bilateral-project-tagged message text; remove erroneous per-row caption; fix pending-row wording/button label

- **Status:** IN PROGRESS (attempt 1 FAILed, attempt 2 pending)
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-14` (corrected), `NOTIF-R-3`, `NOTIF-R-5` (re-scoped)
- **Review depth:** `full`

**Attempt 1: FAIL**
- Files changed: `result-tagged-notification.service.ts`(+.spec.ts), `notification-type.constants.ts`(+.spec.ts), `notification-item.component.ts/.html/.spec.ts`, `contribution-request-drawer.copy.ts`.
- Implementer verification: server 1/35 green; client 5/201 green; lint clean both sides.
- Reviewer verdict: **FAIL** (full audit). Confirmed correct: Updates rows carry the fields needed (`obj_emitter_user`, owner-initiative code via `initiative_role_id:1`); the `!leadIn` server guard correctly isolates the direct-tag flow from `BCT-T-4`'s submission flow; `RESULT_CENTER_TAGGED` untouched; caption/status-chip genuinely removed from all 4 branches; wording/button text fixed correctly. Four issues:
  1. **Client can't distinguish "bare project name" (new format) from "full composed sentence" (BCT-T-4's submission-flow rows, and any pre-existing/legacy data) in the same `notification.text` field** — both render through the same new case, producing garbled text for BCT-T-4 rows (a different, already-shipped sibling spec) and for any historical data. A row with empty text renders "has tagged project undefined".
  2. **Server's `buildResultNotificationDescription`, the real-time socket push, and `getRecentResultActivity`'s message field were not updated** — same garbling appears in those 3 surfaces too, which weren't touched by the fix.
  3. **No tests for the wording/button fixes** (the "the inclusion of" and "Accept contribution"/"Decline" Falsifier items).
  4. **Stale docs**: `notification-item/CLAUDE.md`, a `.ts` docstring, and the copy file's docstring still say the status indicator is "rendered in the row" — no longer true.
- **NOTIF-R-5 gap independently re-confirmed by Reviewer** (read the drawer's `view`-mode template directly): no status field anywhere in the panel. Reviewer's explicit recommendation: the Leader must decide now, not carry this as a silent gap into `/akili-archive`.
- **Leader escalated to user** (AskUserQuestion): add status to the drawer panel now, or leave as a documented follow-up gap. **User did not directly answer** but provided a precise HTML/Tailwind reference for the exact target row card markup (pill badge for the type chip `bg-brand-50 text-brand-700 rounded-full`, outlined badge for funding `border-slate-200`, a plain-text subtitle combining level · type · time-ago with no badge chrome, specific button styling for Accept contribution/Decline, and a final "Accepted by X"/"Declined by X" text line for resolved rows) — did not object to the Recommended option. **Leader proceeding with "add status to panel" (the Recommended, unchallenged option) plus the new visual reference, bundled into attempt 2.**

### NOTIF-T-13 — Restyle notification row badges/buttons to match user reference (ad-hoc, not in original tasks.md)

- **Status:** PASS (after 1 inline fix)
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-3`, `NOTIF-R-12`, `NOTIF-R-15` (visual correction)

**Attempt 1:**
- Files changed: `notification-item.component.html`/`.scss`/`.spec.ts` — type chip restyled to a filled violet pill (`!bg-[var(--pr-color-primary-50)] !text-[var(--pr-color-primary-400)]` override on `hlmBadge variant="secondary"`); funding badge confirmed already correct, untouched; `resultLevelTypeBadge` converted from a separate badge chip to plain text merged with the row's timestamp (`"Output · Innovation Development · 2 hours ago"`, no dangling separator when null); Accept/Decline buttons restyled to outlined (bordered) instead of filled.
- Implementer verification: `npx jest --testPathPattern="notification-item"` → 4/169 green. Lint clean.
- Reviewer verdict: **FAIL** (checklist) — one real bug: the Decline button's border used `--pr-color-neutral-300`, which despite its name is a saturated violet (`#6b5eeb`), making Accept and Decline nearly indistinguishable — directly contradicting the comment's own stated intent ("neutral outline"). Everything else confirmed correct (type chip tokens real, funding badge reasoning verified, level/type text conversion applied consistently across all 4 branches with no dangling separator, "Accepted by"/"Declined by" caption untouched, no hardcoded hex anywhere, rewritten test assertions are genuine behavioral checks, no scope leakage into `.ts`/drawer files).
- **Fixed inline by the Leader** (1-line, single-file token swap: `--pr-color-neutral-300` → `--pr-border-strong`, a real grey token — comment already stated correct intent, only the token was wrong).

**Requirements covered:** `NOTIF-R-3`, `NOTIF-R-12`, `NOTIF-R-15`.
**Final verification:** Jest 169/169 green (pre-fix; the 1-line token swap doesn't change any test assertion). **Visual confirmation is still the user's own call** — no automated check for this class of change.

### NOTIF-T-14 — Add status field to drawer view-mode metadata grid (ad-hoc, not in original tasks.md)

- **Status:** IN PROGRESS (attempt 1 FAILed)
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-5` (closes the gap `NOTIF-T-12` opened by removing the row-level status chip)

**Attempt 1: FAIL**
- Files changed: `contribution-request-drawer.component.ts` (+`status?: string | null` on `ContributionRequestDrawerViewFields`, pushed first in `viewMetadataRows`), `contribution-request-drawer.copy.ts` (+`status: 'Status'` label), `notification-item.component.ts` (`drawerViewFields()` now includes `status: this.rowStatusLabel`), `.spec.ts` for both components.
- Implementer verification: `npx jest --testPathPattern="contribution-request-drawer|notification-item"` → 5/216 green. Lint clean.
- Reviewer verdict: **FAIL** (full audit). Confirmed correct: the field uses the identical omit-if-empty `push()` helper as every other field, not source-gated; `decide`/`confirm-decline`/footer/`[crdAlign]` gate genuinely untouched (independently traced, not just trusted); `rowStatusLabel` unmodified; tests are real; the "all fields in order" test correctly updated for the new 6th row. Two issues:
  1. **Stale folder doc** — `contribution-request-drawer/CLAUDE.md`'s `view`-mode section still lists the field order without `status`, and its `Verified:` stamp is unchanged despite this task editing files in that folder — the same class of defect that FAILed `NOTIF-T-4` attempt 1.
  2. **Docstring conflict with a parallel task:** `contribution-request-drawer.copy.ts`'s `notificationItem` docstring still says the status indicator "is rendered in the ROW itself... no seam to render it inside the sheet panel" — now false, but `NOTIF-T-12`'s rework (running in parallel) may also be touching sibling docs referencing this same history. Needs coordination so both agents don't collide on the same lines.
- **Substantive gap, not gating this task but needs a decision before archiving:** the Reviewer traced production reachability and found **"Needs your decision" can never actually appear in the panel** — a pending Received row always opens in `decide` mode (not `view`), and the metadata grid (where `status` now lives) only renders in `view` mode. So in practice the panel only ever shows "For your information" (`decide`/`confirm-decline` panels show no explicit status at all — the Accept/Decline footer itself is the only signal that a decision is needed). Closing this fully would mean touching `decide` mode's template, which is exactly what this component's zero-touch history (enforced across `NOTIF-T-4`, `NOTIF-T-5`, this task) forbids without explicit sign-off.

**Attempt 2 (Leader-inline doc fixes, no new Implementer round needed — both remaining issues were doc-only):**
- **Issue 1 fixed:** `contribution-request-drawer/CLAUDE.md`'s `view`-mode section now lists `status` first in the field order, documents it's never source-gated, documents the known `decide`-mode gap explicitly, and the `Verified:` stamp is re-stamped to `NOTIF-T-14`.
- **Issue 2 resolved without collision:** checked `contribution-request-drawer.copy.ts`'s `notificationItem` docstring — `NOTIF-T-12`'s parallel rework had already corrected it accurately (no longer claims status is "rendered in the row"; correctly describes the `NOTIF-T-14` handoff). No edit needed, no collision occurred.
- **Substantive gap resolved by user decision (2026-09-30):** status showing only in `view` mode (never `decide`/`confirm-decline`) is **accepted as final, not a gap** — the Accept/Decline footer already communicates "a decision is needed" implicitly; adding a redundant badge to `decide` mode isn't worth reopening that mode's zero-touch history. Recorded as a design decision, not carried forward as an open item.

**Status: PASS** (both blocking issues resolved; substantive question closed by explicit user decision, not left ambiguous).

**Requirements covered:** `NOTIF-R-5` — met as designed: explicit status in the panel for `view`-mode rows (resolved/Sent/Updates); implicit status via the Accept/Decline footer for `decide`-mode rows (accepted final state, not a gap).
**Final verification:** Jest 216/216 green (unchanged by the doc-only attempt 2), lint clean.

*(Leader correction: this entry was briefly and incorrectly recorded as PASS before the Reviewer's actual verdict arrived — that was the Leader's own error, corrected once the real FAIL came in, then genuinely resolved through attempt 2 above.)*

**NOTIF-T-12 attempt 2: PASS**
- Files changed: `notification-type.constants.ts` (+`isComposedProjectTaggedText()` disambiguation helper, new dedicated case branch), `.spec.ts` (+4 shape tests), `notification.service.ts` (server-side twin disambiguation in `buildResultNotificationDescription()`, extracted `buildTaggedSuffixDescription()` helper, fixed `getRecentResultActivity()`'s missing program code), `.spec.ts` (+payload-level tests for all 4 shapes across 2 call sites), `notification-item.component.ts`/`.spec.ts` (wording/button tests), 4 doc files (folder `CLAUDE.md`, 2 docstrings, 1 template comment).
- Implementer verification: client 5/210 green, lint clean; server 2/63 green, eslint clean.
- Reviewer verdict: **PASS** (full audit, second pass). Independently confirmed the detection substrings genuinely match both `BCT-T-4`'s and legacy rows' literal templates; confirmed all 4 text shapes render correctly on all 3 surfaces (inbox row, socket push, recent-activity feed); confirmed `getRecentResultActivity()`'s fix reuses an already-resolved value rather than adding a second lookup; confirmed the pending-row button-text test technique is sound (not a false-passing shortcut); confirmed all 4 docs are now mutually consistent and match the actually-current code.
- **ADVISORY (non-gating):** resolved-row branches (`case 2`/`case 3`) still say "inclusion of" without "the" — same wording gap as the pending row had, just not in this task's stated Falsifier scope. No server test pins `buildResultNotificationDescription`'s output for the untouched types (`RESULT_CENTER_TAGGED` etc.) — the extraction looks behavior-preserving by inspection but isn't regression-locked. A stale code comment references pre-refactor variable naming (logic is correct, wording only). A pre-existing (not introduced by this task) minor inconsistency: the socket-push emitter-name fallback is the user's email, while the client/recent-activity fallback is "A user" — now slightly more visible since the emitter name is up-front in the new sentence.

**Requirements covered:** `NOTIF-R-14` (fully corrected), `NOTIF-R-3`, `NOTIF-R-5` (re-scoped, closed by `NOTIF-T-14`).
**Issues encountered:** 2 rework rounds total for this task (attempt 1 built the wrong shape entirely; attempt 2 added the shape-disambiguation this class of fix needed). Resolved, no Pivot.
**Final verification:** client 210/210 green, server 63/63 green, lint/eslint clean both sides.

**Follow-up investigation (2026-09-30, in response to renewed user request to match the mockup's full 5-chip taxonomy):** re-verified — even harder this time — whether "Primary program request"/"Contributor request"/"CG Center tagged" (as 3 chips distinct from generic "Contribution request") have real backend support. **Confirmed again, more conclusively:** `share-result-request.service.ts`'s accept path *hardcodes* `initiative_role_id = 2` (contributor) on every acceptance — there is no code path anywhere that can produce a "primary" assignment via this flow, so "Primary program request" has **zero backend support**, not just a missing label (this rules out building it even as a client-side label, since the "Accept as primary" action it implies genuinely cannot happen). "Contributor request" vs "Contribution request" trace to the same entity's existing `is_map_to_toc`-driven requester/approver direction flip — a real field, but not a distinct request *type*, just two legitimate phrasings of the same one type (which the sentence-building code already handles via `requesterCode`/`responderCode`). `RESULT_CENTER_TAGGED` is confirmed real and already correctly rendered for Updates rows. **Recommendation standing: the single "Contribution request" chip for decision rows remains correct — do not build a richer taxonomy for those rows, the mockup's 3 extra decision-chip variants are not achievable without new schema/business-logic work far beyond this spec's presentation-only scope.**

### NOTIF-T-8 — Widen Updates-tab select/relations for row badges

- **Status:** IN PROGRESS (attempt 1 FAILed, attempt 2 pending)
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-13`

**Attempt 1: FAIL**
- Files changed: `notification.service.ts` (widened `getNotificattionSelect()`/`getNotificationRelations()` — confirmed field-for-field mirror of `share-result-request.service.ts::getRequestRelations()`), `notification.service.spec.ts` (+1 test, query-shape only).
- Implementer verification: `npx jest --testPathPattern="notification.service"` → 2/53 green. Lint clean.
- Reviewer verdict: **FAIL**. Confirmed correct: the select/relations mirror is accurate and purely additive; all call sites (`getAllNotifications`, `getPopUpNotifications`, and one the Implementer missed — `emitResultNotification`'s socket-payload `findOne`, harmless but now also widened) pick up the change automatically; the bilateral-AI-job notification claim (inert since `result_id` is always null there) confirmed. Two blocking issues, both because the Implementer copied the Requests-side **select** but not its **post-processing**:
  1. **`obj_result.source_name` still missing from the payload.** The Implementer's stated reasoning (client can derive it from raw `source` the same way the Requests-side ternary does) was based on a wrong premise — **`source_name` is actually computed server-side** in `share-result-request.service.ts::getRequest()` (`source === 'Result' ? 'W1/W2' : 'W3/Bilaterals'`), not client-side. Leaving this to the client would mean the funding-window badge is computed two different ways for Requests vs Updates rows. Violates the task's own Falsifier (explicitly named `source_name` in the expected payload) and `NOTIF-R-13`.
  2. **Soft-deleted `obj_result_by_project` links are NOT filtered out.** The Requests-side mapper explicitly filters to `is_active` links only (a deliberate fix from a prior incident, "P2-3188 REWORK... so a result never surfaces under a project it is no longer tagged to") — the widened Updates query returns them unfiltered, meaning an unlinked/removed bilateral project tag could still render via `NOTIF-R-14`'s inline project name. This reintroduces exactly the bug that prior fix closed, on the Updates side.
- **Reviewer's remediation:** add a small server-side mapper (mirroring `share-result-request.service.ts`'s `.map()`) applied to the result-scoped rows in `getAllNotifications`/`getPopUpNotifications`: compute `source_name` from `source` (guarded for null `obj_result`), and filter `obj_result_by_project` to `is_active` links only. Add payload-level tests (not just query-shape tests) proving both.
- **Leader assessment:** legitimate FAIL, not a Pivot — both issues are within `NOTIF-T-8`'s existing scope (the task was always about making Updates rows carry the same *usable* data as Requests rows; the mapper is part of "mirroring," not new scope). No user escalation needed.

**Attempt 2: PASS**
- Files changed: `notification.service.ts` (+1 private method `mapNotificationResultFields()`, wired into `getAllNotifications`/`getPopUpNotifications`), `notification.service.spec.ts` (+5 payload-level tests).
- Implementer verification: `npx jest --testPathPattern="notification.service"` → 2/58 green (53 previously-passing + 5 new). `npx eslint` clean.
- Reviewer verdict: **PASS** (checklist). Confirmed `source_name` computation matches `share-result-request.service.ts` line-for-line. Confirmed the `is_active` filter is the only condition the Requests side applies too (no second soft-delete flag missed). Confirmed 4 of 5 new tests genuinely assert against the returned payload. One minor test-quality observation (non-blocking): the "bilateral-AI-job row passes through unchanged" test doesn't actually exercise the mapper's null-guard (job-finished rows are appended after the mapper, never passed through it) — the guard is correct by inspection and no production path could feed it a null-`obj_result` row anyway, so this doesn't affect the PASS.

**Requirements covered:** `NOTIF-R-13`.
**Decisions made:** server-side mapper mirrors `share-result-request.service.ts`'s post-processing exactly (source_name computation + active-link filter), applied at both `getAllNotifications`/`getPopUpNotifications`.
**Issues encountered:** 1 rework round (2 real bugs: missing computed field, missing soft-delete filter). Resolved, no Pivot.
**Final verification:** Jest 58/58 green, lint clean.

### NOTIF-T-10 — Tab badge visual styling (subtle circular pills)

- **Status:** PASS
- **Date:** 2026-09-30
- **Implements:** `NOTIF-R-15`

**Attempt 1:**
- Files changed: `results-notifications.component.html` only — the three tab-count `<span>` badges restyled from `hlmBadge variant="secondary"` (bold rectangular chip) to small circular pills (`h-[18px] min-w-[18px] rounded-full`, 11px mono digits): muted grey (`--pr-color-accents-2`/`-6`) for All/For-your-information, subtle violet (`--pr-color-primary-50`/`-400`) for Needs-your-decision.
- Implementer verification: `npx jest --testPathPattern="results-notifications"` → 14/340 green (no test asserts badge classes). `npx ng lint --quiet` clean.
- Reviewer verdict: **PASS** (checklist). Confirmed all 4 CSS variables are pre-existing tokens in `colors.scss` (no new tokens introduced — the hard gate here). Confirmed the recency-group badges and other `hlmBadge` uses were left untouched, confirmed nothing else in the file was touched by reading (no git access this pass, so verified by direct read rather than diff).
- **Visual description for user confirmation:** badges are now 18×18px minimum, fully circular, tight padding, 11px semibold monospace digits. All/For-your-information use a muted light-grey background with dark-grey text. Needs-your-decision uses a subtle violet tint so it stands out slightly as the actionable tab, without being a bold solid chip — matches the mockup's `min-width:18px;height:18px;border-radius:999px;font-size:11px` spec.

**Requirements covered:** `NOTIF-R-15`.
**Final verification:** Jest 14/340 green, lint clean. **No automated visual check exists for this task by design — user's own visual confirmation is the real gate.**

---

**Wave 2 sequencing note:** `NOTIF-T-2` and `NOTIF-T-3` both touch `received-requests.component.html` and `sent-requests.component.html` (confirmed by grep) — despite `tasks.md`'s dependency graph only claiming the `T-1→T-2/T-3` branch is independent from the `T-4` branch (not that `T-2`/`T-3` are mutually parallel-safe). Running them concurrently risks two agents editing the same template files at once. Leader decision: **`NOTIF-T-2` and `NOTIF-T-5` run in parallel this wave** (fully independent files — pipe + received/sent templates vs. `notification-item` component); `NOTIF-T-3` is deferred to the next wave, after `T-2`'s edits to the shared templates have landed.

---

## 6. Third round — row layout restructure (ad-hoc, 2026-09-30)

After `NOTIF-T-8`–`T-14` landed, the user reviewed the live row layout and found the timestamp/badges/buttons rendered inline to the right of the message (in the same horizontal row as the avatar), not stacked below it — the opposite of what they wanted. Root cause: `.notification_content` was `display:flex` with the message-column, timestamp, badges, and buttons all as flex ROW SIBLINGS at the same level; only the message text itself lived inside a column wrapper.

### NOTIF-T-15 — Restructure notification row to 3 stacked lines (ad-hoc, not in original tasks.md)

- **Status:** PASS
- **Date:** 2026-09-30
- **Implements:** visual correction of `NOTIF-R-3`/`NOTIF-R-12`/`NOTIF-R-15`'s row layout (user-driven, confirmed by direct visual sign-off: "Epaaa asi es que es")

**Attempt 1:**
- Files changed: `notification-item.component.html`/`.scss` only. Restructured all 4 template branches so `.notification_content` has exactly 2 direct children (avatar + `.notification_content_body`), and the body is a 3-line column: message → `.notification_meta_row` (type chip + funding badge + level/type text + timestamp, inline with each other) → either `.notification_content_actions_buttons` (pending rows) or a new `.notification_content_footer_row` (resolved rows — wraps the "Accepted/Declined by X · date" caption together with the decision chip, previously a loose sibling at the very end of the old flat row). Updates-row branch has only lines 1–2. Content/wording byte-identical to before — only DOM position and CSS moved.
- Implementer verification: `npx jest --testPathPattern="notification-item"` → 4/171 green (no spec needed updating — nothing asserted a specific DOM parent-child relationship). Lint clean. `npm run build:dev` succeeded, zero warnings touching this component.
- Reviewer verdict: **PASS** (checklist). Independently counted tags to confirm the 2-children/3-line nesting holds in all 4 branches; confirmed `.notification_meta_row`'s exact contents/order; confirmed the footer row wraps both caption and chip with the chip's own styling unaffected by the move; confirmed wording unchanged (cross-checked against pre-existing spec assertions for "Accepted by"/"Rejected by"); confirmed no hardcoded hex; confirmed nothing outside the `.html`/`.scss` was touched.
- **ADVISORY (non-gating, fixed inline by Leader):** 3 stale/self-contradictory SCSS comments (meta-row gap comment contradicted itself; actions-buttons comment cited the wrong gap value meant for the footer row; decision-chip comment said "last in `.notification_content`" when it's now last in the new footer row) — all corrected inline. Folder `CLAUDE.md` re-stamped with a new "Row layout: 3 stacked lines" section (also inline).
- **User confirmed the resulting layout is correct** ("Epaaa asi es que es") before the Reviewer pass even ran — visual sign-off already given, this Reviewer pass covered code-quality/correctness only.

**Requirements covered:** visual correction, no functional requirement change.
**Final verification:** Jest 171/171 green, lint clean, build clean.
