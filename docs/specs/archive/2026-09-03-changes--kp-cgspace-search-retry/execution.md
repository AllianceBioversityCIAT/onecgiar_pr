# Execution Log — CGSpace Search Auto-Retry

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/changes/kp-cgspace-search-retry/` |
| Depth | Lite |
| Approval Mode | interactive |
| Budget | 1 task · ~170 LOC · 1 review round (actual: 2 review rounds — TEST-5 late-success gap) |
| Started | 2026-09-03 |
| Leader | AKILI Leader (session) |
| Skills (KCSR-T-1) | `angular-developer`, `tdd` (kept from `tasks.md`) |
| Effort start | `medium` → bumped to `high` after attempt 1 FAIL |

---

## 2. Task Execution History

### KCSR-T-1 — Retry failed CGSpace searches three times before Try again

- **Final status:** PASS
- **Date:** 2026-09-03
- **Implementer attempts:** 2
- **Requirements covered:** `KCSR-R-1`, `KCSR-R-2`, `KCSR-R-10`, `KCSR-AC-1`…`KCSR-AC-6`

#### Attempt 1 — Reviewer FAIL

- **Files changed:**
  - `onecgiar-pr-client/.../kp-cgspace-browse/kp-cgspace-browse.component.ts`
  - `onecgiar-pr-client/.../kp-cgspace-browse/kp-cgspace-browse.component.spec.ts`
- **Implementer verification:**
  ```
  cd onecgiar-pr-client && npm run test -- --testPathPattern="kp-cgspace-browse.component.spec" --forceExit
  Test Suites: 1 passed, 1 total
  Tests:       29 passed, 29 total
  Time:        1.215 s
  ```
- **TDD (Implementer):** 7 tests red on HEAD before the pipeline change (existing error-copy case + KCSR-TEST-1, 2, 4, 5, 6, 7).
- **Not Done / Assumptions:** none (scope complete). Notes: `flush()` unreliable for `timer(0)` chains — used explicit `tick(0)`; leftover subscriber `res.status >= 400` guard left in place.
- **Reviewer verdict:** `STATUS: FAIL`

Reviewer report (verbatim):

> STATUS: FAIL
>
> ISSUES:
>
> 1. **Discovered Issue:** The clause "A's late success must not paint B" has no test that can prove it. In `KCSR-TEST-5: new query cancels leftover retries`, the mock makes query `old` throw on *every* call (`firstQueryCalls++; return throwError(...)`), so query A never produces a late success. The assertions (`firstQueryCalls === 1`, `items()[0].handle === '10568/new'`) prove only that A stopped retrying and that B painted — they cannot discriminate the bug the clause exists to catch, because the discarded emission never happens. This is the presence-vs-effect gap: the test is green against an implementation where a stale A success *would* overwrite B.
>    * **Violated Rule:** `docs/specs/changes/kp-cgspace-search-retry/tasks.md` — `KCSR-T-1` clause ownership row "`KCSR-R-2` Cancel — BUT must not apply A to B | A's late success must not set B's `items` / query params"; `requirements.md` `KCSR-R-2` scenario *New query cancels leftover retries* — "BUT it must NOT apply A's later response to B's results"; `design.md` §10 `KCSR-AC-5` — "A's late success must not paint B" and `KCSR-DD-4` consequence — "Tests must start B before A's delayed retry fires, then assert B's params." The task's Definition of done requires every clause row to have a named spec, with the already-passing allowance limited to first-success / empty.
>    * **Remediation Suggestion:** Extend `KCSR-TEST-5` (or add a sibling case) where A **fails once then succeeds** on its retry with a non-zero `retryDelayMs`: fail attempt 1 for `query: 'old'`, arm the second `old` call to return items with a distinguishable handle (e.g. `10568/old`), fire B before the delay elapses, then `flush()`. Assert `component.items()[0].handle === '10568/new'`, `component.items().every(i => i.handle !== '10568/old')`, and that the last `GET_cgspaceSearch` call's params carry B's query. That is what makes `KCSR-DD-4`'s `switchMap` unsubscription observable rather than assumed. While re-running the scoped spec, also close the DoD lint checkbox (`npx eslint` on the two touched files) — the reported evidence covers Jest only.
>
> Everything else in the clause table checks out against the source: three total attempts with `RETRY_COUNT = 2` and a spec-overridable `retryDelayMs = 600` (`KCSR-DD-2`), retry placed inside the existing `switchMap` and before the `catchError` that paints UI state (`KCSR-DD-1`, `KCSR-DD-4`), the 502-shaped body lifted into the attempt via the pre-retry `map` (`KCSR-DD-3`, proven by `KCSR-TEST-7`), empty-200 not retried (`KCSR-TEST-3`), no error flash (`KCSR-TEST-4`), facet isolation (`KCSR-TEST-8`), and Manual entry still reachable after three failures via the updated `switch-to-manual-error` case. No template, token, copy, API or scope drift.
>
> ADVISORY:
> - **Readability:** `throwError` was added to the `rxjs` import in `kp-cgspace-browse.component.ts` but is never used (the pipeline throws a plain `Error` inside `map`). The client's `.eslintrc.json` has `@typescript-eslint/no-unused-vars` commented out and `tsconfig.json` sets no `noUnusedLocals`, so nothing will catch it — drop the symbol.
> - **Reliability:** `KCSR-TEST-2` asserts three calls after two `tick(0)`s but never drains the remaining timer queue, so the "BUT no 4th retry" clause rests on `status() === 'error'` rather than on an exhausted scheduler. A trailing `flush()` plus a repeat of the call-count assertion would make it robust against a retry that is scheduled but not yet fired.
> - **Traceability:** two clause rows are satisfied by existing coverage rather than a new named test — Load more `loadingMore` (same inner pipe per `KCSR-DD-1`, which `tasks.md` explicitly permits) and first-success = 1 call (covered by the pre-existing debounce and Enter specs). Both are legitimate, but `tasks.md` asks for them to be *recorded*; write them into `execution.md` so the DoD rows close on paper instead of silently.

- **Leader adjudication:** FAIL is in-scope (clause ownership + DoD named-spec rule). ADVISORY items recorded; they do not consume a rework attempt. Unused `throwError` is mentioned in the FAIL remediation — Implementer attempt 2 may drop it while touching the file. Load more / first-success already-passing notes will be written into this log on PASS (Reviewer advisory, not a new task).

#### Attempt 2 — Reviewer PASS

- **Files changed:**
  - `kp-cgspace-browse.component.ts` — dropped unused `throwError` import (retry wrap unchanged)
  - `kp-cgspace-browse.component.spec.ts` — added `KCSR-TEST-5b`
- **Implementer verification:**
  ```
  cd onecgiar-pr-client && npm run test -- --testPathPattern="kp-cgspace-browse.component.spec"
  Tests: 30 passed, 30 total (1.766s)

  npx ng lint --quiet
  All files pass linting.
  ```
- **Not Done / Assumptions:** none
- **How TEST-5b proves late-A discard:** `retryDelayMs = 200`; A attempt 1 throws; A attempt 2 is armed to return `10568/old`; B fires before the 200 ms timer; `flush()`. Asserts `items()[0].handle === '10568/new'`, no `10568/old`, `oldQueryCalls === 1`, last call query is `new`.
- **Reviewer verdict:** `STATUS: PASS`

Reviewer summary (verbatim):

> STATUS: PASS
> SUMMARY: `KCSR-TEST-5b` closes the attempt-1 gap by arming A's retry to succeed with a distinguishable `10568/old` handle and then proving it never lands — a test that fails under a non-cancelling pipeline and passes only with `retry` inside the `switchMap`, exactly as `KCSR-DD-4` and the `tasks.md` cancel clause require. Production behavior is unchanged apart from removing the now-unused `throwError` import, and all `KCSR-DD-1`…`3` constraints still hold.

Reviewer note (not a finding): `KCSR-TEST-5b` proves cancellation by non-occurrence rather than by an emitted-then-dropped response. That is the only provable form here, because `KCSR-DD-4` specifies that unsubscription cancels the in-flight call and the timer.

#### ADVISORY (attempt 1, recorded — no rework, no new task)

- **Readability:** unused `throwError` — closed in attempt 2.
- **Reliability:** `KCSR-TEST-2` could add a trailing `flush()` + repeat call-count. Not done (advisory).
- **Traceability — already-passing / same-pipe rows (DoD):**
  - Load more `loadingMore`: same inner pipe as page-0 search (`KCSR-DD-1`); `tasks.md` permits documenting instead of a dedicated case.
  - First-success items = 1 call: pre-existing debounce / Enter specs already assert a single `GET_cgspaceSearch` on first success.
  - Manual entry after 3 failures: existing `switch-to-manual-error` case plus updated 3-tick error path.

#### Decisions

- Client-only retry inside `initSearchPipeline` (`KCSR-DD-1`).
- RxJS `retry` count **2** (3 total HTTP calls), delay 600 ms overridable (`KCSR-DD-2`).
- HTTP 200 + body `status`/`statusCode` ≥ 400 is a failed attempt (`KCSR-DD-3`).
- Retry stays inside existing `switchMap` (`KCSR-DD-4`).

#### Issues encountered

- Attempt 1: `KCSR-TEST-5` could not prove A-late-success discard (Reviewer FAIL).
- Attempt 2: `KCSR-TEST-5b` closed that gap.

#### Final verification

```
cd onecgiar-pr-client && npm run test -- --testPathPattern="kp-cgspace-browse.component.spec"
Tests: 30 passed, 30 total
```

Lint: `npx ng lint --quiet` — all files pass.

#### Budget note

Expected 1 review round; actual 2. Cause: TEST-5 late-success gap, closed on attempt 2. Single task; no further work in this spec.

---

## 3. Summary

All tasks complete. `KCSR-T-1` PASS after 2 Implementer attempts. Browse CGSpace now retries a failed search twice (3 total HTTP calls, 600 ms apart) before showing Try again. Empty 200 lists are not retried. A new query cancels leftover retries. Facets, MQAP, Manual entry, and server are unchanged.

STATUS: PASS

