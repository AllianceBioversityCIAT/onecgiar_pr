# Tasks — Notifications Inbox Slow Load (Lite, Bug Mode)

Linked spec: `docs/specs/bugfix/notifications-inbox-slow-load/requirements.md` + `design.md`.

## 1. Scope of this task list

- **Module / feature:** `results/share-result-request` performance fix (surfaced via `notifications`)
- **Linked spec:** `docs/specs/bugfix/notifications-inbox-slow-load/requirements.md` + `design.md`
- **Owner / driver:** Santiago Sanchez
- **Status:** in-progress (PERF-T-1 done)

## 2. Pre-flight checklist

- [x] `requirements.md` is approved.
- [x] `design.md` is approved.
- [x] Open questions in `requirements.md` and `design.md` are all resolved (none blocking — Option B explicitly deferred).
- [x] No CLARISA dependency introduced.
- [x] No conflicting in-flight spec touching `share-result-request.service.ts` (only `notifications/inbox-revamp`, which touches the client, not this file).
- [x] No migration involved — `migration:check` not applicable.

## 3. Task list

### [x] `PERF-T-1` — Parallelize per-feed queries and remove the admin duplicate fetch

- **Type:** `server`
- **Description:** In `getReceivedResultRequest` and `getSentResultRequest`, replace the 3 sequential `await this.getRequest(...)` calls with concurrent execution. When `role === 1` (admin), fetch the shared `commonConditions` bucket once and reuse it for both the "pendingOwner" and "pendingShared" positions instead of issuing the identical query twice; otherwise run all fetches concurrently via `Promise.all`. Implements PERF-DD-1 and PERF-DD-2.
- **Implements:** `PERF-R-1`, `PERF-R-2`, `PERF-R-4`, `PERF-AC-2`, `PERF-AC-3`
- **Files (expected):** `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts`, `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.spec.ts`
- **Depends on:** `—`
- **Blocks:** `—` (independent of `PERF-T-2`; both touch the same file but different methods — sequence to avoid merge conflicts, not a true dependency)
- **Estimate:** `S`
- **Review:** `full` (shared method touched by 3 call sites per premise PERF-P-5; correctness of the admin-dedupe branch is easy to get subtly wrong)
- **Verification:**
  - **Falsifier:** mock `ShareResultRequestRepository.find` with a per-call resolution-order tracer (e.g., each mock call pushes its args to an array synchronously, then resolves after a `setTimeout(0)`); assert all 3 (or 2, for admin) calls are *issued* (present in the tracer array) before any of them *resolves*. If the implementation still awaits sequentially, the tracer will show call N+1 issued only after call N resolves — the test fails on that ordering, not on a generic "it's slow" timing assertion.
  - **Red run:** `npx jest --testPathPattern share-result-request.service.spec.ts` — the new concurrency-ordering and admin-dedupe-count assertions fail against current `main` (sequential awaits, duplicate admin call) and pass after the fix.
  - **Disqualifier:** if the ordering tracer shows calls are issued concurrently but `combineAndDistinct`'s output for a fixture with overlapping `share_result_request_id`s differs from the pre-fix output (i.e., parallelizing surfaced a genuine race affecting the dedupe result), STOP — do not patch around it; re-open the design's PERF-P-4 premise, since it would mean concurrent fetches somehow return divergent data for the same row, which is a correctness issue bigger than this task's scope.
  - **Consumers:** `getReceivedResultRequestPopUp` also calls `buildWhereReceivedConditions` + `getRequest` for its 2-bucket case — apply the same admin-dedupe pattern there too in this task (it shares the exact `role === 1` branch), so all 3 call sites from premise PERF-P-5 stay consistent after this task, not just the 2 main list endpoints.
- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` (scope: `share-result-request`).
  - [ ] Lint clean (`npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`).
  - [ ] Unit tests added/updated per Verification above; server coverage thresholds (5/20/35/40) still met.
  - [ ] No migration involved.
  - [ ] No secret/token leaked in logs.
  - [ ] No API surface change — no Swagger/DTO update needed.
  - [ ] No UX change — no i18n update needed.
  - [ ] Not a bilateral/platform-report surface — no change-log entry needed.

### [~] `PERF-T-2` — Batch ToC contribution-review enrichment once per feed across all buckets

- **Type:** `server`
- **Description:** Remove the internal `enrichRequestsWithTocContributionReview` call from inside `getRequest` (which becomes fetch-and-map only). Add an orchestration step in `getReceivedResultRequest`, `getSentResultRequest`, and `getReceivedResultRequestPopUp` that concatenates all fetched buckets, enriches once, then re-splits the enriched rows back into their original per-bucket arrays by `share_result_request_id`. All 3 call sites MUST land together in this task — per PERF-DD-3's reversion challenge, a partial rollout that updates only 2 of the 3 call sites would silently drop `toc_contribution_review` data from the third. Implements PERF-DD-3.
- **Implements:** `PERF-R-3`, `PERF-R-4`, `PERF-AC-4`
- **Files (expected):** `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.ts`, `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.spec.ts`
- **Depends on:** `—` (sequence after `PERF-T-1` in the same file to avoid merge conflicts, not a true functional dependency — both can be reviewed independently)
- **Blocks:** `—`
- **Estimate:** `M` (touches 3 call sites plus the shared `getRequest`/enrichment split)
- **Review:** `full` (this is the reversion-adjacent decision per design.md PERF-DD-3 — the Reviewer must explicitly confirm all 3 call sites listed in premise PERF-P-5 were updated, not just the 2 main ones)
- **Verification:**
  - **Falsifier:** build a fixture where the same `(result_id, initiative_id)` pair appears in two different buckets (e.g., `pendingOwner` and `done`) with `is_map_to_toc: true` on both rows; spy on `ResultsTocResultRepository.getContributionReviewTocByResultAndInitiative` and assert it is called exactly once for that pair per feed fetch, and that BOTH rows in the response carry the same (correct) `toc_contribution_review` value.
  - **Red run:** `npx jest --testPathPattern share-result-request.service.spec.ts` — the "called once across buckets" assertion fails against current `main` (currently called once per bucket the pair appears in) and passes after the fix.
  - **Disqualifier:** if `getReceivedResultRequestPopUp`'s response for any fixture loses `toc_contribution_review` data compared to its pre-fix output (i.e., the popup's `is_map_to_toc` rows come back with an empty/missing `toc_contribution_review` where they previously had data), STOP — this is the exact silent-drop failure mode the DD-3 reversion challenge exists to catch; do not mark this task done until the popup path is verified to still enrich correctly.
  - **Consumers:** `getReceivedResultRequestPopUp` (3rd call site from premise PERF-P-5) — explicitly re-verify its output includes correct `toc_contribution_review` data after this change, not just the 2 main list endpoints.
- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` (scope: `share-result-request`).
  - [ ] Lint clean.
  - [ ] Unit tests added/updated per Verification above, covering all 3 call sites; server coverage thresholds still met.
  - [ ] No migration involved.
  - [ ] No secret/token leaked in logs.
  - [ ] No API surface change — no Swagger/DTO update needed.
  - [ ] No UX change — no i18n update needed.
  - [ ] Not a bilateral/platform-report surface — no change-log entry needed.

### `PERF-T-3` — Content-parity regression test across Received/Sent/Popup

- **Type:** `tests`
- **Description:** Add a fixture-based test asserting that, for a representative dataset (non-admin user with both owner-side and shared-side pending/done rows; an admin user; a user with `is_map_to_toc` rows spanning multiple buckets), the row content and count returned by `getReceivedResultRequest`, `getSentResultRequest`, and `getReceivedResultRequestPopUp` after `PERF-T-1`+`PERF-T-2` are identical to a captured pre-fix snapshot. This is the mandatory Bug Mode regression test proving PERF-R-4 (no behavior change) holds across both optimizations together, not just per-task in isolation.
- **Implements:** `PERF-R-4`, `PERF-AC-1`
- **Files (expected):** `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.spec.ts`
- **Depends on:** `PERF-T-1`, `PERF-T-2`
- **Blocks:** `—`
- **Estimate:** `S`
- **Review:** `checklist`
- **Verification:**
  - **Falsifier:** run the fixture through both the pre-fix and post-fix code paths (or against a manually-authored expected-output fixture capturing pre-fix behavior) and assert deep-equality of `receivedContributionsPending`, `receivedContributionsDone`, `sentContributionsPending`, `sentContributionsDone`, and the popup's array — for all three user types (non-admin, admin, multi-bucket ToC).
  - **Red run:** `npx jest --testPathPattern share-result-request.service.spec.ts` — this test is written against the *target* (post-fix) behavior, so it is expected to fail if run against pre-`PERF-T-1`/`PERF-T-2` code (proving it actually exercises the combined change) and pass once both tasks are merged. If it passes unmodified against pre-fix code, the fixture is not exercising the fixed paths — treat that as a fixture design defect, not a pass.
  - **Disqualifier:** if any of the 3 response shapes differ between pre-fix and post-fix for ANY of the 3 user-type fixtures, this is not a passable state — do not adjust the assertion to match the new (wrong) output; fix `PERF-T-1`/`PERF-T-2` instead, since PERF-R-4 is a hard requirement, not a nice-to-have.
  - **Consumers:** `none (test-only task, no shared symbol changed)`.
- **Definition of done:**
  - [ ] Code merged via `<emoji> <type>(<scope>) [ticket]: <description>` (scope: `share-result-request`).
  - [ ] Lint clean.
  - [ ] Test added; server coverage thresholds still met.
  - [ ] No migration involved.
  - [ ] No secret/token leaked in logs.
  - [ ] No API surface change.
  - [ ] No UX change.
  - [ ] Not a bilateral/platform-report surface.

## 4. Dependency graph

```
PERF-T-1 (parallelize + admin dedupe)
PERF-T-2 (batch ToC enrichment, all 3 call sites)  — sequenced after T-1 in the same file, not functionally dependent
   └── PERF-T-3 (content-parity regression across all 3 endpoints, both fixes combined)
```

`PERF-T-1` and `PERF-T-2` touch the same file (different methods/concerns) — land them as sequential, small diffs rather than parallel Implementers to avoid a merge conflict; `PERF-T-3` needs both merged first since it asserts on the combined behavior.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PERF-TEST-1` | unit (server) | `PERF-R-1`, `PERF-R-2`, `PERF-AC-2`, `PERF-AC-3` | `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.spec.ts` |
| `PERF-TEST-2` | unit (server) | `PERF-R-3`, `PERF-AC-4` | `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.spec.ts` |
| `PERF-TEST-3` | unit (server) | `PERF-R-4`, `PERF-AC-1` | `onecgiar-pr-server/src/api/results/share-result-request/share-result-request.service.spec.ts` |

Server coverage MUST stay above 5/20/35/40 (existing thresholds); this spec only touches one already-tested service file, so no new module needs a coverage uplift plan.

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build; no migration to check).
- [ ] Manual QA: user re-opens the Notifications inbox and confirms the page feels fast enough to resume manual testing of `notifications/inbox-revamp` (the original trigger for this spec).
- [ ] Not bilateral/platform-report — no downstream notification needed.
- [ ] No admin/role/phase change — no runbook update needed.
- [ ] Telemetry: confirm no new error-log entries appear for `ShareResultRequestService` post-deploy (existing `_logger.error` calls unchanged, but worth a quick check given the control-flow restructuring).

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once `PERF-T-1`–`T-3` land and the user confirms perceived speed.
- [ ] No new cross-cutting decision to promote to `docs/trd/trd.md` — this is a module-internal optimization.
- [ ] File a follow-up spec for Option B (single merged query per feed) ONLY if post-fix manual testing still shows the page slow.
- [ ] No `docs/prd.md` Open Question resolved by this spec.

## 8. Roll-back plan

1. Revert the PR(s) implementing `PERF-T-1`–`T-3` (single PR expected, given the small combined scope).
2. No migration to revert.
3. No feature flag introduced — nothing to disable.
4. N/A — not a bilateral/platform-report payload.
5. N/A — no downstream consumer notification needed for an internal-only fix.

## Required cross-references

- `docs/specs/bugfix/notifications-inbox-slow-load/requirements.md` and `design.md` (same folder).
- `docs/trd/trd.md` — `api/results` module.
- `docs/specs/notifications/inbox-revamp/` — the spec this bug blocks manual testing of.
