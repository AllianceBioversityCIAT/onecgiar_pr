# Execution Log — Notifications Inbox Slow Load (Bug Mode, Lite)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/notifications-inbox-slow-load` |
| Approval Mode | gated (from `proposal.md`) |
| Branch | `qa-development-2026-ss` |
| Leader | Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` (T2 wrapper) / `akili-reviewer` (T3 wrapper) |
| Started | 2026-09-30 |
| Design Budget | 2-3 tasks · ~80-150 service LOC · 1-2 review rounds |

**Context-load note:** `docs/prd.md` and `docs/ux-ui/design.md` were not read in full. This is a server-only internal performance fix with no product or UI surface. `docs/trd/trd.md` has no `share-result-request` section (checked by grep).

**Working-tree note:** the checkout holds unrelated uncommitted client and `api/notification` changes from other work. Every per-task diff and any rollback is limited to `onecgiar-pr-server/src/api/results/share-result-request/`. A tree-wide `git restore .` / `git clean -fd` must never be run on this checkout.

## 2. Task Execution History

### PERF-T-1 — Parallelize per-feed queries and remove the admin duplicate fetch

- **Status:** PASS (attempt 1)
- **Date:** 2026-09-30
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert`, `tdd` · effort `high`. The task's spec lists no skills. `tdd` was assigned because the Falsifier is a concurrency-ordering assertion, where test-first pays. `high` was chosen over the default `medium` because of the concurrency change and the subtle admin branch.
- **Requirements covered:** PERF-R-1, PERF-R-2, PERF-R-4, PERF-AC-2, PERF-AC-3

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts` — changes in 4 places:
    - Added private helpers `fetchThreeBucketsDeduped` and `fetchTwoBucketsDeduped`.
    - The helpers detect the admin case by reference equality (`pendingOwner === pendingShared`), fetch that bucket once and reuse it. Otherwise they use `Promise.all`.
    - Wired into `getReceivedResultRequest`, `getSentResultRequest` and `getReceivedResultRequestPopUp`.
  - `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.spec.ts` — 6 new tests: a tracer concurrency test and an admin call-count test for each of the 3 call sites. `VersioningService` and `UserRepository` mocks were given real stubs.
- **Implementer verification:**
  - Red run before the fix: 6 new tests failed, 6 existing tests passed.
  - `npx jest --silent --reporters=summary --forceExit --testPathPattern share-result-request.service.spec.ts` → 1 suite passed, 12/12 tests.
  - `npx eslint <both files> --quiet` → clean, after a prettier-only `--fix`; tests re-run green.
  - Disqualifier (a change in `combineAndDistinct` output) not triggered.
- **Reviewer verdict:** `STATUS: PASS`. The diff meets PERF-R-1, R-2 and R-4 and PERF-AC-2 and AC-3 at all three call sites:
  - The admin shortcut fires exactly when `role === 1` in both builders. For non-admins each position gets its own spread object, so `===` is never true.
  - Output stays byte-identical because the pending arrays only feed `combineAndDistinct`.
  - The tracer and call-count tests would fail against the old sequential, duplicate-fetch code.
  - Nothing in PERF-T-2's scope was touched.
- **ADVISORY (4R, non-gating, recorded only):**
  - RELIABILITY — admin tests count `find` calls but do not trace that `pendingOwner` and `done` are issued concurrently. An admin tracer test would lock that in. The code is already correct.
  - READABILITY — admin call-count tests do not check which where-conditions reached `find`. A future regression could fetch the wrong bucket twice without changing the count.
  - RISK — the dedupe depends on the builders returning the same `commonConditions` object for admins, which PERF-DD-2 accepts. A comment in each builder would guard against a future "defensive copy" refactor.

- **Decisions:**
  - Reference-equality detection was chosen over an explicit `role === 1` branch. PERF-DD-2 lists it as the more robust accepted option, and the builders' return shape is unchanged.
- **Issues encountered:** none.
- **Final verification:** green (12/12, lint clean).
- **Gate:** gated mode — waiting for the user to approve continuing to PERF-T-2.
- **Commit:** not made. User rule: no commit without an explicit go-ahead.
- **Gate result:** the user said "continue" and PERF-T-2 was started.

### PERF-T-2 — Batch ToC contribution-review enrichment once per feed across all buckets

- **Status:** `[~]` — FAIL on attempt 1 because of a scope problem outside this task; waiting for the user to decide.
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` · effort `high`.
- **Requirements covered (PERF-T-2 hunks only):** PERF-R-3, PERF-R-4, PERF-AC-4

#### Attempt 1

- **Files changed:**
  - `share-result-request.service.ts`:
    - `getRequest` is now fetch-and-map only.
    - New `enrichBucketsOnce(buckets)`: removes a duplicated bucket array (by reference), combines the rows, enriches them once, then puts them back into their buckets by `share_result_request_id`.
    - `enrichBucketsOnce` is called from `fetchThreeBucketsDeduped` (Received and Sent) and `fetchTwoBucketsDeduped` (PopUp).
  - `.spec.ts`: 4 new tests — a pair split across buckets for Received, Sent and PopUp (the PopUp test also covers the Disqualifier), plus an admin guard against counting the shared bucket twice.
- **Implementer verification:**
  - Callers grep: only the 2 fetch helpers call `getRequest`, and `enrichRequestsWithTocContributionReview` has one caller left.
  - Red run: 3 of 4 new tests failed on the PERF-T-1 code (lookup called 2× instead of 1×). The admin guard passed before the fix, which is expected.
  - Green run: 16/16.
  - Lint: clean.
- **Review diff:** incremental only. It was built against a reconstructed PERF-T-1 baseline (HEAD + `perf-t1.diff`) kept in the session scratchpad.
- **Reviewer verdict: `STATUS: FAIL`** — scope. The PERF-T-2 code itself passes every conformance check:
  - All 3 PERF-P-5 call sites go through the single enrichment pass.
  - Output is identical: enrichment works row by row, and each bucket keeps its order and count.
  - The admin shared array is enriched once.
  - The tests would fail against per-bucket enrichment.

  Reviewer issue (verbatim summary):
  1. **Discovered Issue:** the diff also changes the `done` condition in `buildWhereReceivedConditions` (≈L589) and `buildWhereSentConditions` (≈L1041), marked `// NOTIF-BUG-1`. For `role === 1` the resolved bucket is no longer limited to the user's initiatives. This changes the count and content of rows in admin `receivedContributionsDone` / `sentContributionsDone`. It is not part of PERF-T-2, the Implementer's report does not mention it, and no test covers it.
  2. **Violated Rule:** requirements.md PERF-R-4; design.md §11; tasks.md PERF-T-2 scope; the Disqualifier of PERF-T-3 would be tripped.
  3. **Remediation:** take NOTIF-BUG-1 out of PERF-T-2:
     - If the Implementer added it, revert it.
     - If it is a separate change the user asked for, move it into the review baseline and record it as its own change with its own ticket, commit and test. PERF-T-3's admin parity fixture must then treat the admin `done` change as intended.
- **ADVISORY (non-gating):**
  - RELIABILITY — add a mixed-bucket test showing `is_map_to_toc: false` rows come back unchanged.
  - READABILITY — the admin guard test already passed before the fix; rename it or add a `done` assertion.
  - RISK — make `enrichBucketsOnce` generic so the `as any` tuple casts go away.
- **Leader adjudication:** this is not a PERF-T-2 code defect, so no rework attempt was used.
  - The NOTIF-BUG-1 comment says "2026-09-30, user-reported" and describes a real admin bug. The Implementer's report does not claim it.
  - Most likely it came from another session editing the same file at the same time. The tree already had uncommitted `api/notification` changes before this run. That breaks the one-session-per-checkout rule.
  - Reverting it without asking could destroy the user's own work, so this is escalated to the user.
- **Budget tripwire:** cumulative service-file change is ≈250 lines (git stat, comments included), against the design's ~80-150 LOC. Task count (3) and review rounds are still within budget. Flagged to the user together with the NOTIF-BUG-1 question.
- **User decisions (2026-09-30):**
  - NOTIF-BUG-1 is the user's own separate fix. Keep it, and review and commit it on its own, outside this spec.
  - Budget overrun accepted; continue.
- **Baseline correction (Leader; not a rework attempt, no code changed):**
  - The NOTIF-BUG-1 service hunks were moved into the review baseline (PERF-T-1 state + `notif-bug-1.diff`, session scratchpad).
  - The user's other session had also added two NOTIF-BUG-1 `it(...)` blocks inside the PERF-T-2 `describe`. The Reviewer was told to leave them out.
  - Leader re-run on the current tree: `npx jest --silent --reporters=summary --forceExit --testPathPattern share-result-request.service.spec.ts` → 18/18 (16 + 2 NOTIF-BUG-1).
- **Re-review verdict: `STATUS: PASS`.**
  - ToC enrichment moved out of `getRequest` into one shared `enrichBucketsOnce` pass, split back by `share_result_request_id`.
  - All 3 PERF-P-5 call sites use it, the popup included.
  - Output is identical to the baseline for the same where-conditions (PERF-R-4).
  - The Falsifier and the popup Disqualifier are covered by tests that check behaviour, not just presence.
- **ADVISORY (non-gating):**
  - READABILITY — the `as any` tuple casts could be removed with a generic `enrichBucketsOnce` signature.
  - RELIABILITY — the `?? row` fallback would silently return a row without enrichment if a row ever came back with no id. Today the select always includes the id, so this is informational only.
- **Final status:** PASS (1 Implementer attempt, 2 Reviewer passes because the baseline was corrected).
- **Concurrency note:** the user's other session is editing the same two files. PERF-T-3 must be reviewed with NOTIF-BUG-1 in the baseline. Its admin parity fixture must treat the unscoped admin `done` as intended behaviour, not a regression.
- **Commit:** not made (user rule).
- **Correction (found during PERF-T-3):** the user's other session committed the service changes from PERF-T-1, PERF-T-2 and NOTIF-BUG-1, together with a snapshot of this spec's docs, inside `487200d8a ✨ feat(notifications) [SPEC:notifications/inbox-revamp]: …`. So "Commit: not made" above no longer holds for the service code. The pre-fix baseline is now `HEAD~1` (`96afc19b0`); `git diff HEAD~1 HEAD` on the service is exactly PERF-T-1 + T-2 + NOTIF-BUG-1 (253 lines).
- **Gate result:** the user said "continua" and PERF-T-3 was started.

### PERF-T-3 — Content-parity regression test across Received/Sent/Popup

- **Status:** in rework
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert` · effort `medium` (test-only task), raised to `high` for the rework.
- **Leader rulings (spec gap, resolved inline):**
  1. A pure content-parity assertion passes on pre-fix code by definition (PERF-R-4). So each scenario asserts (a) content against a hand-written pre-fix fixture and (b) the combined `find` and ToC-lookup call counts. The red run is (b) failing on pre-fix code while (a) passes.
  2. The pre-fix code is obtained by a temporary service-file swap, restored from the scratchpad snapshot `t3base/`.
  3. The unscoped admin `done` (NOTIF-BUG-1) is intended, so its where-shape is not asserted.

#### Attempt 1

- **Files changed:** `share-result-request.service.spec.ts` only — 9 tests (3 scenarios × Received/Sent/PopUp). The `find` mock picks what to return from the shape of the `where` condition, not from call order. The Leader confirmed afterwards that the service file is byte-identical to the snapshot.
- **Implementer verification:**
  - Pre-fix code came from `HEAD~1`, because `HEAD` already holds the fix. The Leader verified this.
  - Pre-fix run: (a) content passed on all 9 tests. (b) Call counts passed for Scenario 1 (non-admin, no reduction expected) and failed for all of Scenarios 2 and 3, each time on the `toHaveBeenCalledTimes` line.
  - Service file restored and confirmed identical.
  - Green run: 27/27. Lint clean.
- **Reviewer verdict: `STATUS: FAIL`.** The reviewer confirmed that the fixtures really encode pre-fix behaviour, that Scenario 1 passing (b) on pre-fix code is acceptable at the suite level, and that the shape-based routing does not hide regressions. Issue:
  1. **Discovered Issue:** the popup assertions in Scenario 1 and Scenario 3 check rows by id through a `bySharedId` Map, which ignores order. Scenario 3 has no count check, so an extra or duplicated popup row would still pass. Order is deterministic both before and after the fix.
  2. **Violated Rule:** the tasks.md PERF-T-3 Falsifier ("deep-equality of … the popup's array"), the scope wording ("content and **count**"), and requirements.md PERF-R-4.
  3. **Remediation:** replace both Map-based checks with a full ordered `toEqual([...])`, as in Scenario 2:
     - Scenario 1: `[mapExpectedRow(sharedKeyRow), mapExpectedRow(ownerKeyRow, tocReviewS1)]`
     - Scenario 3: `[mapExpectedRow(ownerSideRow, tocReviewS3), mapExpectedRow(sharedSideRow, tocReviewS3)]`

     Then re-run the pre-fix swap.
- **ADVISORY (non-gating):**
  - RELIABILITY — `getRequest` changes `obj_result` in place, and the fixture rows are shared with the mock. Build the expected values before the call, or deep-clone inside `installRoutedFind`.
  - RISK — the routing ignores non-key `where` filters. Check whether the PERF-T-1 tests assert the non-admin where-shape; if they don't, record it as a known coverage gap.

#### Attempt 2 (rework, effort `high`)

- **Feedback passed on:** the attempt-1 Reviewer FAIL, verbatim, plus attempt history ("id-keyed Map cannot see order/count — do not repeat").
- **Files changed:** `share-result-request.service.spec.ts` only. The two popup Map checks (Scenarios 1 and 3) were replaced with full ordered `expect(response).toEqual([...])`. The Leader diffed attempt 1 against attempt 2: those two assertions and their comments are the only change. The service file is still byte-identical to the snapshot.
- **Implementer verification:**
  - Pre-fix run (`HEAD~1` swapped in): (a) all 9 content checks pass, including both ordered popup checks. (b) Call counts give the same result as attempt 1: Scenario 1 passes; all of Scenarios 2 and 3 fail on `toHaveBeenCalledTimes`. Overall 17 failed / 10 passed; the total includes the PERF-T-1/T-2 tests, which are also expected to fail on `HEAD~1`.
  - Restore confirmed.
  - Green run: 27/27. Lint: clean.
- **Reviewer verdict: `STATUS: PASS`.** All three user types now check that response content and count on all 5 arrays (Received, Sent, Popup) are exactly equal to hand-built pre-fix fixtures (PERF-R-4, PERF-AC-1). The call-count checks fail on pre-fix code and pass on current code, which meets the red-run requirement under ruling 1.
- **ADVISORY (non-gating, carried over from attempt 1):**
  - RELIABILITY — the expected values are built from row objects the service changes in place. Cloning inside `installRoutedFind` would stop a future in-place field from leaking into the expected value.
  - RISK — the routing ignores non-key `where` filters.
- **Known coverage gap (Leader, recorded per the RISK advisory):** the PERF-T-1 tests assert only call order and call counts, not the non-admin where-shape (`request_status_id`, `is_map_to_toc`, `is_active`). The only where-shape assertions in the suite are the NOTIF-BUG-1 admin `done` tests. This spec does not close the gap; it is a possible follow-up.
- **Final status:** PASS on attempt 2.
- **Commit:** not made (user rule).

## 3. Summary

| Task | Result | Implementer attempts | Reviewer passes |
|---|---|---|---|
| PERF-T-1 | PASS | 1 | 1 |
| PERF-T-2 | PASS | 1 | 2 (baseline corrected for NOTIF-BUG-1, no code rework) |
| PERF-T-3 | PASS | 2 | 2 |

- **Requirements covered:** PERF-R-1, R-2, R-3 and R-4; PERF-AC-1, AC-2, AC-3 and AC-4. PERF-R-10 (SHOULD) is met by design: at most 2 heavy queries per feed for admins, 3 running concurrently for non-admins, and one ToC enrichment pass per feed.
- **Final verification:** `npx jest --silent --reporters=summary --forceExit --testPathPattern share-result-request.service.spec.ts` → 27/27. Lint clean on both files.
- **Budget:** 3 tasks (on budget). Service change is ≈250 lines against the ~80-150 estimate (the user accepted this). 4 Reviewer passes across 3 tasks: over the 1-2 estimate for PERF-T-2 and PERF-T-3.
- **Outside this spec:** NOTIF-BUG-1 (the user's fix to the admin resolved-request scope). Its service code is already in `487200d8a`, together with the PERF-T-1 and PERF-T-2 service code.
- **Still open (tasks.md §6–7):**
  - Manual QA: the user re-opens the Notifications inbox and judges whether it is fast enough.
  - Telemetry check after deploy.
  - Commit the remaining uncommitted files (the PERF-T-3 spec file and this spec's docs).
  - A follow-up spec for Option B, only if the page is still slow.
