# Primary SP Decline Rejects the Result — Execution Log

## Document Control

| Field | Value |
|---|---|
| **Spec** | `notifications/primary-decline-rejects-result` |
| **Approval Mode** | gated |
| **Branch** | `qa-development-2026-ss` |
| **Leader** | Claude Opus 5.5 (T1) |
| **Started** | 2026-10-01 |
| **Pre-flight** | Tree clean apart from untracked spec folders; `w1w2-center-tagged` already committed (`3a339ff3f`). No kaizen log, so no Active Lessons to apply. |

---

## Task Execution History

### `PDR-T-3` — Client: `primary-decline-justification-dialog` component

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 2) |
| **Date** | 2026-10-01 |
| **Attempts** | 2 |
| **Effort** | medium → high (bumped on rework) |
| **Skills** | `angular-developer`, `spartan`, `tailwind-design-system` (as listed) |
| **Run with** | `PDR-T-1`, in parallel (disjoint packages) |
| **Requirements** | `PDR-R-1` (opens with title, message and an empty required field; Confirm disabled; blank text; cancel resets; saving disables both buttons; no double send) |

**Files (all new):**
- `onecgiar-pr-client/src/app/internationalization/primary-decline-justification.copy.ts`
- `.../results-notifications/components/primary-decline-justification-dialog/primary-decline-justification-dialog.component.{ts,html,scss,spec.ts}`

#### Attempt 1
- **Implementer:** created the component. `visible` is a `model<boolean>()`; the other inputs are `input()` and the outputs are `output()`. An `effect()` resets the text on open, and a `confirmed` guard blocks a double emit. The W3 reject CSS subset is copied into a local `.scss` instead of a cross-feature `styleUrl`. Jest: 17/17 pass. `ng lint --quiet`: clean.
- **Reviewer: FAIL.**
  1. **Discovered Issue:** the `confirmed` guard was cleared only on reopen. After one Confirm, Confirm stayed disabled for as long as the dialog was open, so a 400 retry (dialog kept open, text kept) was impossible.
     **Violated Rule:** `design.md` §8.1 ("Confirm disabled when `!text.trim() || isSaving`"); `requirements.md` `PDR-R-1`, "server error" scenario.
     **Remediation:** release the guard when `isSaving` goes from true to false, and add a retry test.
- **Advisory (attempt 1):** RISK: the global `::ng-deep .confirmation-modal` rules are now defined in two places. READABILITY: the W3 hex fallbacks are copied verbatim (copy debt). RELIABILITY: no test covered Escape, the mask or Cancel `[disabled]` while saving.

#### Attempt 2
- **Implementer:** added a `wasSaving` tracker and an effect that clears `confirmed` when `isSaving` goes from true to false. Added tests for retry after a save ends, the double click without an `isSaving` toggle, Cancel disabled while saving (through the BrnButton mock, per the Jest caveat), Escape and the mask inert while saving, and Escape working again once not saving. Jest: **23/23 pass**. `ng lint --quiet`: **All files pass linting**.
- **Reviewer: PASS.** Issue 1 is fixed. Confirm is disabled exactly while the text is blank or a save is in flight, and a retry works after a 400. The guard cannot be released before the parent sets `isSaving` (a same-tick double click is still blocked). The retry test fails on the attempt-1 code. No regressions.

#### Advisory (final, recorded only — not tasks)
- RELIABILITY: the mask test uses `mask?.dispatchEvent`, so it would pass vacuously if the selector stopped matching. A not-null assert and a positive control would fix that.
- RESILIENCE: an `isSaving` true→false flip inside one change-detection pass would never release the guard. That is impossible with HTTP and the T-4 wiring.
- RISK / READABILITY: the global `::ng-deep` duplication and the copied hex fallbacks are still open from attempt 1.

#### Decisions
- Local SCSS copy rather than a cross-feature `styleUrl`. The Reviewer judged this conformant with `PDR-DD-6`.
- Visual parity with the W3 dialog is **not** claimed. It stays open for `PDR-T-6` step 9 (disqualifier honored).

**Final verification:** `npx jest --testPathPattern="primary-decline-justification-dialog" --silent --reporters=summary --no-coverage` → 1 suite, 23 passed. `npx ng lint --quiet` → clean.

---

### `PDR-T-1` — Server: `decline()` rejects ownerless results, no auto-move

| Field | Value |
|---|---|
| **Status** | `[~]` **parked**: implemented, Reviewer not yet run |
| **Date** | 2026-10-01 |
| **Attempts** | 1 (Implementer done; review pending) |
| **Effort** | xhigh |
| **Skills** | `nestjs-expert`, `tdd` (as listed) |

#### Blocker: concurrent session in the same checkout
Another session (spec `notifications/primary-notify-on-submit`) was editing the same checkout at the same time, including `primary-program-request.service.ts` and its spec (it adds an `asDraft` option to `request()`). It also touched `bilateral.service.ts`, `bilateral-center.service.*` and `share-result-request.repository.*`. So the T-1 diff cannot be isolated for the Reviewer. **User decision (2026-10-01):** wait until the other session commits, then diff T-1 against that commit and review.

#### Attempt 1: Implementer report (summary)
- **Files:** `services/primary-program-request.service.ts` (+ `.spec.ts`), `share-result-request.service.ts` (`dispatchPrimaryDecision` gained an optional 4th `justification` param; both V1/V2 call sites still pass 3 args, a forward pointer to T-2), `share-result-request.service.spec.ts` (one `it.each` updated for the 3rd arg). The module was not touched.
- **`PDR-P-6`: true.** `orm.config.ts` loads entities by glob. `accept()`/`decline()` already call `manager.getRepository(ResultsByInititiative)` and `ResultsTocResult` outside `forFeature`.
- **Green:** `primary-program-request` 55/55 (48 from T-1, 7 from the concurrent session). `share-result-request` 157/157. `tsc --noEmit` clean. eslint on the 4 files clean.
- **Red run:** **not executed**. The worker did not revert the file because the concurrent session's uncommitted work was in it. Red was argued structurally instead (2→3-arg signature, behavior absent before). The red run is still owed.
- **Old tests rewritten:**
  1. "1 alignment: sends back" → "(b) single-alignment rejects".
  2. "2 alignments auto-moves" → "(a)/(b) rejects, REJECTED history, drops contributor draft, no SP12 primary row".
  3. "2 alignments, other already declined" (PSR-R-7 both-decline) → folded into the ownerless-rejection tests (the round concept is gone).
  4. "3 alignments: sends back" → "(b) three-alignment rejects".
  5. The swap describe (3 tests over 1/2/3 alignments) → one test, "(d) swap: no Result update or history".
  6. "move failure: falls back to declined" → removed (the move concept is gone).
- **`'moved'` grep:** no server string literal remains in the touched files. `PRIMARY_PROGRAM_REQUEST_MOVED` and its render case remain on the server and client (old rows). No client code branches on the outcome state.
- **Removed:** `getOtherAlignment()` (no callers).

#### Not Done / Assumptions (verbatim carry; scope still owed)
1. `request()`'s `opts.cancelRound` is left as inert dead code. No caller passes `cancelRound: false` any more, but it wasn't removed because the concurrent session is editing the same `opts`. **Owed:** delete it once the other work is committed (the T-1 brief says "delete only what is left unused").
2. The red run was reasoned, not executed. **Owed:** run the new tests (a), (b), (d), (e), (g) against the pre-change `decline()` (e.g. from a stash/worktree of the base commit).
3. `mapPrimaryDecisionOutcomeToResponse` has no `invalid_input` case, so it falls to `default` (500). That is in **T-2's scope**, not owed by T-1.
4. Notice texts follow the `PDR-R-10` wording exactly.

#### Resume plan (T-1)
After the other session commits: (1) re-spawn the Implementer to close items 1 and 2; (2) extract the T-1 diff against the other session's commit; (3) spawn the Reviewer with `Review: full`.

---

### `PDR-T-5` — Client: Project Information banner for a rejected result

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 1) |
| **Date** | 2026-10-01 |
| **Attempts** | 1 |
| **Effort** | medium |
| **Skills** | `angular-developer` (as listed) |
| **Requirements** | `PDR-R-9` (client side: no "Pick another" hint; read-only form already holds per `PDR-P-3`) |

**Files:** `onecgiar-pr-client/src/app/internationalization/bilateral-primary-assignment.copy.ts` (new `banner.rejected(codes)`), `section-zero-dashboard.component.ts` (`sent_back` branch checks `readOnly()`), `section-zero-dashboard.component.spec.ts` (+3 tests, appended describe).

#### Attempt 1
- **Implementer:** when `sent_back` and `readOnly()`, the component returns `{ tone: 'error', message: banner.rejected(codes) }`. Otherwise the old `sentBack` warning is unchanged. No template change was needed. Jest went from 27 to **31 passed**, and no existing expectation changed. `ng lint --quiet`: clean. Consumers: `banner.*` is used only by section-zero; section-toc uses `.tocNotice`.
- **Reviewer: PASS.** The rejected copy shows with the severest available tone and no "Pick another". Results that are not read-only keep the old banner and picker (§10.1). The picker is hidden via `canEditAssignment()` (`!readOnly()`). All three falsifiers are real tests.

#### Decisions
- **Spec tone `danger` → `'error'`.** `app-alert-status` only accepts `'info' | 'warning' | 'success' | 'error'`. The Reviewer judged this conformant (no token bypass).
- **Disqualifier (readOnly breadth): deferred to the DB, not failed.** `readOnly = !isEditableByCenterUser()`, so it is also true for PendingReview (5) and Approved (6), not only Rejected (7). Through the app, `sent_back` combined with 5 or 6 should be unreachable: `assertSubmittable` refuses to submit without a role-1 owner or while a primary request is pending, and once an owner exists, `stateFor` reports `accepted`. Only legacy or hand-edited rows could break this.

#### Open item for the HITL pause (from the disqualifier; user-run, agent does not connect to the DB)
- **`PDR-T-5-DB`:** on `prdb`, confirm that no bilateral result with `status_id IN (5, 6)` has a declined primary row and no active role-1 owner. If any row exists, re-specify T-5 to key on `status_id = 7` (tasks.md disqualifier). Run it together with `PDR-T-6`.

#### Advisory (recorded only)
- RELIABILITY: falsifier 3 (`pending` + `readOnly`) has only a negative assertion. A positive check (pending tone or copy) would rule out a vacuous pass.
- READABILITY / repo rule: the client package `CLAUDE.md` §10 "Folder docs" says `section-zero-dashboard/CLAUDE.md` must be updated, with its `Verified:` line re-stamped, in the same commit. Its contract paragraph describes `sent_back` only as the re-pick path. **Surfaced to the user before commit** (see the gate summary).

**Final verification:** `npx jest --testPathPattern="section-zero-dashboard" --silent --reporters=summary --no-coverage` → 1 suite, 31 passed. `npx ng lint --quiet` → clean.

---

### `PDR-T-2` — Server: DTO + dispatcher + 400 mapping

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 1) |
| **Date** | 2026-10-01 |
| **Attempts** | 1 |
| **Effort** | medium |
| **Skills** | `nestjs-expert`, `api-design-principles` (as listed) |
| **Requirements** | `PDR-R-3` (endpoint 400, nothing changes, ignored on accept/contribution); `PDR-R-2` server guard |
| **Dependency override** | `PDR-T-1` is still `[~]` (implemented, not reviewed). **The user explicitly chose to run T-2 anyway (2026-10-01).** The T-2 PASS covers only T-2's hunks; T-1's hunks in the same files remain under T-1's pending review. |

**Files:** `dto/create-share-result-request.dto.ts` (optional `justification`, `@ApiProperty({ required: false })`, `@IsOptional() @IsString()`); `share-result-request.service.ts` (constant `JUSTIFICATION_REQUIRED_MESSAGE`; V1 and V2 pass `dto.justification`; a blank-justification guard in `dispatchPrimaryDecision` before the service call and lock; `invalid_input` → 400); `share-result-request.service.spec.ts` (+8 tests; the decline routing `it.each` now passes a justification).

#### Attempt 1
- **Implementer:** the disqualifier grep found that `decline()` has 1 caller and `dispatchPrimaryDecision` has 2 (V1, V2). `PDR-P-5` holds. Jest `share-result-request.service` glob: **125 passed**. The "before" count of 117 was reconstructed, not run, because of the concurrent session's edits. tsc and eslint on the 3 files: clean. Concurrency rules were followed (surgical edits only, no restore or stash).
- **Reviewer: PASS.** Every falsifier is a real test (`clearAllMocks` in `beforeEach`; the accept test uses an exact-argument match). The 400 fires before any lock or write, the message is exact, the contribution path is untouched, nothing is stored or logged, and Swagger shows the field as optional. No hunks from the concurrent session appear in these files.

#### Advisory (recorded only)
- READABILITY: the T-1 forward-pointer comment on the `justification?` param (`share-result-request.service.ts` ~L1429-1432) is now **stale**. It still says the DTO has no field and that `invalid_input` maps to 500. **T-1's review must not flag it as a T-1 defect.** It should be fixed before commit (see the gate summary).
- RELIABILITY/RESILIENCE: `@IsString()` is inert here because there is no `ValidationPipe` on `@Body()` and no global pipe. A non-string `justification` (a number or an array) makes `justification?.trim()` throw, which comes back as **500 instead of 400**. No user text leaks. Suggested fix: `typeof justification !== 'string' || !justification.trim()`. Surfaced to the user.
- READABILITY (minor): a blank justification on an inactive row gets 409 rather than 400, because of the order of the checks. That is defensible.

**Final verification:** `npx jest --testPathPattern="share-result-request.service" --silent --reporters=summary --forceExit` → 125 passed. `npx tsc --noEmit -p tsconfig.json` → clean.

---

### `PDR-T-4` — Client: wire the dialog into the inbox row and the drawer

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 2) |
| **Date** | 2026-10-01 |
| **Attempts** | 2 |
| **Effort** | high → xhigh |
| **Skills** | `angular-developer`, `spartan` (as listed) |
| **Requirements** | `PDR-R-1` (both surfaces; not sent until Confirm; server error incl. 400 keeps text), `PDR-R-2`, `PDR-R-3` (client sends the field) |
| **Dependency note** | `PDR-T-2` `[x]`, `PDR-T-3` `[x]`. Ran in parallel with the `PDR-T-1` resume (server only, disjoint package). |

**Files:** `notification-item/notification-item.component.{ts,html,spec.ts}`, `notification-item.module.ts` (registers the standalone dialog), `notification-item/CLAUDE.md` (folder doc, `Verified:` re-stamped). The drawer is unchanged.

#### Attempt 1
- **Implementer:**
  - `PDR-P-7`: the drawer output is `declineClicked`, so no drawer change was needed. `onDrawerDeclineClicked()` closes the drawer and then opens the dialog for a primary row.
  - Added a `showPrimaryDeclineDialog` signal. `acceptOrReject(..., justification?)` adds `body['justification']` only for `!isAccept && isPrimaryRequest`.
  - A new `submitPrimaryDecline()` pipe skips the close on 400 (`keepPrimaryDeclineDialogOpen`).
  - Toast: "Request successfully declined".
  - Jest (`notification-item|contribution-request-drawer`): 292/292 across 5 suites, 13 new tests. **The before-count of 279 was not run literally**; the Reviewer verified that no existing test was edited. Lint clean. `npm run build:dev` passed, after a TS4111 fix to bracket notation. The build ran while the T-1 Implementer was active, which breaks the measurement-concurrency rule; the result was not relied on.
- **Reviewer: FAIL.**
  1. **Discovered Issue:** the 400 test checked only the `showPrimaryDeclineDialog()` signal. It never checked that the text survives or that Confirm is re-enabled.
     **Violated Rule:** `tasks.md` PDR-T-4 falsifier "PATCH errors 400: the dialog closes or the text is lost"; `PDR-R-1` server-error scenario.
     **Remediation:** a real-dialog test with an async `Subject` and assertions on text, visible and `confirmDisabled`.
  - Verified in this attempt: PDR-R-2 is byte-for-byte, no existing test was edited, the server message reaches `err.error.message` (`ResponseInterceptor`), and the popups are mutually exclusive.

#### Attempt 2
- **Implementer:** added the real-dialog 400 test on an async `Subject`, using `fixture.detectChanges(false)` plus `whenStable()` (a plain `detectChanges()` threw NG0100). Corrected the `keepPrimaryDeclineDialogOpen` doc comment.
  - **Mutant:** forcing the 400 path through the unconditional close turned the test red ("Expected: true, Received: false"); the mutant was reverted.
  - The Leader's synchronous set(false)/set(true) mutant did **not** go red. The Reviewer judged that correct: the `[(visible)]` binding is compared by value at change detection, so it cannot manifest in the app either.
  - Jest **293/293**, lint clean.
- **Reviewer: PASS.** All the PDR-T-4 falsifiers are real tests. PDR-R-1, R-2 and R-3 hold, and no existing test was edited.

#### Advisory (recorded only)
- **RELIABILITY, a probable T-3 defect.** `primary-decline-justification-dialog` is OnPush, and `confirmDisabled` reads the plain field `confirmed`, which an effect mutates. After a 400 the guard is released without marking the view dirty. Confirm **probably stays disabled on screen** until the user interacts, and NG0100 should fire in dev builds.
  - This contradicts `design.md` §8.1 ("Confirm disabled when `!text.trim() || isSaving`"), so it is a T-3 conformance gap rather than a pure advisory.
  - It was found by static analysis only. **Surfaced to the user** with a proposal to reopen T-3.
  - Fix: turn `confirmed`/`wasSaving` into signals, or make `confirmDisabled` a `computed`. Then drop `detectChanges(false)` and assert the DOM `disabled`.
- READABILITY: the test comment calls NG0100 "noise". It most likely is evidence; reword it once T-3 is fixed.
- Still open from attempt 1:
  - the new toast strings are hard-coded (client §10 i18n rule; the sibling toasts are also hard-coded);
  - a primary `acceptOrReject(false)` without a justification would reach `submitPrimaryDecline` (unreachable today);
  - the folder `CLAUDE.md` is over its line cap (pre-existing).

**Final verification:** `npx jest --testPathPattern="notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage` → 5 suites, 293 passed. `npx ng lint --quiet` → clean.

---

### `PDR-T-1`: resumed and finalized

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 3 of 3) |
| **Date** | 2026-10-01 |
| **Unblocked by** | Work 1 committed `e97d9e8da` (PNS-T-1). The T-1 diff against HEAD is clean. |
| **Review mode** | parallel lens reviewers (xhigh, transactional/data-loss): **A** = spec + RELIABILITY, **B** = spec + RISK/RESILIENCE/security |
| **Effort** | xhigh (not raised to `max`: the T2 Implementer is a cheaper tier, per the registry rule) |

#### Resume: owed items closed (before review)
- **`cancelRound`:** removed from `request()`. No caller passes it any more (`bilateral.service.ts:5013`, `bilateral-center.service.ts:361,549`). The round-cancel block is now unconditional, which matches the old default. `asDraft` and its idempotency branch are untouched. Removed the test "cancelRound:false does not touch the round".
- **Red run executed.** HEAD's `primary-program-request.service.ts` was swapped in. A plain run hits TS2554 (2 vs 3 args). With ts-jest `isolatedModules`: **9 failed / 46 passed**: (g)×3, (a)/(b) ownerless, (b) 1-alignment, (b) 3-alignment, (c), (i), (d). (e) is asserted inside the (a)/(b) body. The file was restored afterwards.
- **Comment fix:** the stale forward-pointer comment on `dispatchPrimaryDecision`'s `justification?` param was replaced (the T-2 advisory).

#### Attempt 1 review: A FAIL · B FAIL
- **A, Issue 1:**
  - **Discovered issue:** the test's `beforeEach` wired the outer `mockShareResultRequestRepository.manager.getRepository` to the same `txRepoFor` as the callback's `fakeManager()`. Test (c) therefore could not tell a transactional write from a non-transactional one. A mutant routing the Result/History writes through the outer manager kept (a), (b) and (c) green.
  - **Violated rule:** `tasks.md` PDR-T-1 Disqualifier ("(c) must assert on the `manager` passed in") and falsifier (c); `PDR-R-4` atomic scenario.
  - **Remediation:** separate the managers and run a mutant check.
  - **Production code was correct;** the defect was in the falsifier only.
- **B, Issue 1:**
  - **Discovered issue:** no log line was written on the reject outcome.
  - **Violated rule:** `design.md` §11 ("one line on the reject outcome with `resultId` and `requestId`, no text"); `results/CLAUDE.md` §8.6.
  - **Remediation:** add one post-commit ids-only `logger.log` and a test for it.

#### Attempt 2: A FAIL · B PASS
- **Implementer:**
  - a local `beforeEach` in decline() makes the outer `getRepository` throw for Result and ResultReviewHistory;
  - (c) now also asserts that the contribution deactivation was not reached, and (a) again asserts no write to the role-1 owner;
  - a new success log, `result {id} rejected by primary decline (requestId=…, userId=…)`, with a test;
  - mutant (Result/History rerouted): 6 red. 323/323 green.
- **A, Issue 1:**
  - **Discovered issue:** `ShareResultRequest` was still shared between the two managers. A mutant that sends the contribution deactivation or the status-3 update through the outer manager stays green.
  - **Violated rule:** falsifier (c), "the Result update **or the contribution deactivation**… everything through the transaction manager".
  - **Remediation:** extend the throw to `ShareResultRequest`.
- **B: PASS.** Exactly one log line, ids only, and the leak test is real. Advisory: the positive assertions were loose.

#### Attempt 3: A PASS (B's PASS stands; test-only change)
- **Implementer:**
  - the throw now also covers `ShareResultRequest`. decline() uses the outer manager only for `.transaction(...)` (L825);
  - the (h) assertion was tightened to the exact substring `'result 100 rejected by primary decline (requestId=1, userId=99)'`, with exactly one matching line;
  - **mutants, each reverted:** contribution deactivation through the outer manager → 5 red; status-3 update through the outer manager → 11 red; Result through the outer manager → 6 red;
  - green **323/323** (7 suites), tsc clean, eslint clean.
- **A: PASS.** All four ownerless writes have a test that fails if the write is routed outside the transaction manager. (c) not reaching the contribution write is correct by design, and (a) covers that write. No legitimate outer-manager use is masked.

#### Requirements covered
`PDR-R-3` (service side), `PDR-R-4` (all 4 writes, any number of alignments, atomic, race), `PDR-R-5`, `PDR-R-6` (no request), `PDR-R-7`, `PDR-R-10` (texts, no "moved", notice failure does not undo), `PDR-R-11` (row stays active). `PDR-P-6` is verified true (no module change).

#### Advisory (recorded only)
- RISK: the catch warn logs the raw DB `error?.message`. If `result_review_history` is not utf8mb4, an emoji in the justification yields "Incorrect string value: '\xF0…'", which contains hex-escaped user text. Confirm the table charset, or log only `error.code` / `error.name`.
- RESILIENCE: if the post-commit `resolveOfficialCode` fails, the user gets `internal_error` (500) although the reject has already committed, and a retry then gets 409. The same pattern existed before. Suggestion: reuse the code resolved inside the transaction.
- RISK: `Result.update` to status 7 does not check the current `status_id` / `is_active`, so a discontinued or soft-deleted ownerless result that still has a pending primary row would be flipped.
- READABILITY: the declined SP code is resolved twice (inside the transaction and after commit).

#### Budget check (design §13)
Review rounds on T-1: **3 actual vs 2 expected**, one over. Cause: the transaction-manager separation in the test harness needed two corrections. Production code was right from attempt 1. **Surfaced to the user at the gate.**

**Final verification:** `npx jest --testPathPattern="primary-program-request|share-result-request|bilateral-center.service" --silent --reporters=summary --forceExit` → 7 suites, 323 passed. `npx tsc --noEmit -p tsconfig.json` → clean. eslint on the touched files → clean.

---

### `PDR-T-3`: reopened (2026-10-01)

| Field | Value |
|---|---|
| **Status** | `[~]` reopened by user decision ("reabre") |
| **Cause** | Found by the PDR-T-4 attempt-2 Reviewer: the dialog is OnPush, and `confirmDisabled` reads the plain field `confirmed`, which an effect mutates. After a 400, Confirm probably stays disabled on screen, and NG0100 fires in dev. This contradicts `design.md` §8.1 ("Confirm disabled when `!text.trim() \|\| isSaving`"). |
| **Scope** | Signal-based `confirmed` / `wasSaving` (or `computed` `confirmDisabled`) in the dialog. In the T-4 400 test, drop `detectChanges(false)` and assert the DOM `disabled` attribute. No other change. |

#### Reopen, attempt 3 (2026-10-01): PASS
- **Implementer:**
  - `text = signal('')` and `confirmed = signal(false)`. `wasSaving` stays a plain field, because it is read only inside its own effect.
  - `confirmDisabled = computed(() => !text().trim() || isSaving() || confirmed())`.
  - Template: `[ngModel]="text()"` + `(ngModelChange)="text.set($event)"`, and `[disabled]="confirmDisabled()"`.
  - New dialog test "OnPush reactivity after a 400": a plain `detectChanges()`, then the rendered Confirm is checked as enabled through the BrnButton mock.
  - T-4's 400 real-dialog test:
    - `detectChanges(false)` replaced with a plain `detectChanges()`, so an NG0100 now fails the test;
    - a DOM-level `BrnButton.disabled` falsy assertion was added;
    - the "noise" comment was corrected;
    - the test above it was adapted to `text.set()`.
  - Jest (`primary-decline-justification-dialog|notification-item|contribution-request-drawer`): **6 suites, 317/317**, with no NG0100. Lint clean.
  - Implementer's mutant (back to plain fields): 21/24 red, **but via `TypeError: text is not a function`**. That is a shape mismatch, not semantic evidence, and the Leader flagged it.
- **Reviewer: PASS.**
  - `confirmDisabled` is a computed over signals only and matches §8.1, so the OnPush view is marked dirty on release.
  - The old behaviors still hold: reset on open, the same-tick double-click guard, Escape/mask/Cancel inert while saving.
  - T-4's falsifiers are preserved and strengthened.
  - The Reviewer reasoned about two mutants without running them:
    - **M1** (a computed over a plain flag) is killed by the double-click tests and by the T-4 400 test.
    - **M2** (the exact attempt-2 shape, keeping the template API) is caught only by the T-4 400 test's final DOM assertion. That conclusion depends on Angular's effect timing and was **inferred, not executed**.
- **Recorded gap:** the M2 semantic-mutant detection is inferred. The PDR-T-6 manual check should exercise a 400 in a dev build and watch whether Confirm re-enables on screen, with no NG0100 in the console. A 400 needs a crafted request: the dialog itself never sends blank text.

#### Advisory (recorded only)
- RELIABILITY: run and record a real M2 mutant, or comment in the dialog test which test kills M1 and which kills M2. Add an explicit `detectChanges()` after `whenStable()` in the T-4 400 test.
- Still open from earlier attempts: the mask test's vacuous `mask?.`; the global `::ng-deep .confirmation-modal`; the copied hex fallbacks.

**Final verification:** `npx jest --testPathPattern="primary-decline-justification-dialog|notification-item|contribution-request-drawer" --silent --reporters=summary --no-coverage` → 6 suites, 317 passed. `npx ng lint --quiet` → clean.

---

### Pre-commit follow-up: `section-zero-dashboard/CLAUDE.md` (2026-10-01)
- This is the PDR-T-5 advisory on repo rule client `CLAUDE.md` §10 "Folder docs". The user approved it.
- The doc now covers the `sent_back` + `readOnly()` "Rejected" variant: `banner.rejected`, tone `'error'`, picker hidden, old sent-back results unchanged, and the caveat that a DB check is pending at PDR-T-6. `Verified:` was re-stamped to 2026-10-01. The file is 75 lines, under the 120-line cap. Doc only.

## Summary (code tasks complete; HITL pending)
- **PDR-T-1** PASS on attempt 3. Parallel lens reviewers; review rounds ran 1 over budget.
- **PDR-T-2** PASS on attempt 1.
- **PDR-T-3** PASS: attempt 2, then reopened and PASS on attempt 3 (OnPush fix).
- **PDR-T-4** PASS on attempt 2.
- **PDR-T-5** PASS on attempt 1.
- **PDR-T-6** (HITL) still pending. Run it with `PDR-T-5-DB` and the dev-build 400/NG0100 check.
- **Committed and pushed** to `qa-development-2026-ss` with the user's explicit OK.
