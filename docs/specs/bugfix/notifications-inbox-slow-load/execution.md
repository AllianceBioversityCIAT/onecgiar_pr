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
