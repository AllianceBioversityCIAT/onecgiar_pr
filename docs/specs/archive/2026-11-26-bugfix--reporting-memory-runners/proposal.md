# Proposal — Backend CI Jest runs out of memory

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/reporting-memory-runners` |
| Slug | `reporting-memory-runners`, derived from a free-text argument |
| Type | Bug |
| Deliverable | software |
| Approval Mode | gated |
| Requirement source | Cris, relayed by the user on 2026-11-18: "reporting está consumiendo mucha memoria y están colgando los runners". The runners are GitHub Actions (user). The log the user pasted is from run `44436363871` (`reporting-tool-staging-ci`, head `663ead830`). No Jira ticket |
| Status | draft · **root cause confirmed** (§8) |
| Date | 2026-11-18 |

## 1. Intent

Stop the backend unit-test job from exhausting the Jest workers' heap on GitHub Actions. Fix it in code and config, without lowering the coverage gates.

## 2. Problem / Current Behavior

| # | Observation | Citation |
|---|---|---|
| 1 | The staging CI for `663ead830` failed in **backend checks**: `Test Suites: 3 failed, 396 passed` and `Tests: 7381 passed`. Every test that ran passed. Three suites never ran | `gh run view 44436363871 --log-failed` |
| 2 | The three suites died from heap exhaustion: `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory` and `Ineffective mark-compacts near heap limit`, at about 2,000 MB per worker (`Mark-Compact 2009.9 (2092.1) -> 1995.3 MB`). After that, `A jest worker process … was terminated … signal=SIGTERM` | Same log, 01:53:09–01:54:19Z |
| 3 | The suites that die are the ones that load the whole application graph: `src/app.module.spec.ts` (`import { AppModule }`), `src/main.routes.spec.ts`, and `api/results/share-result-request/services/primary-program-request.load-order.spec.ts` | Same log (`FAIL …`); `src/app.module.spec.ts:3` |
| 4 | **It recurs.** Earlier failed backend runs carry the same heap-out-of-memory lines | `gh run view <id> --log-failed \| grep -c "heap out of memory\|Reached heap limit\|Mark-Compact"` → `44352235907: 3`, `44209985289: 2` |
| 5 | Jest config: `ts-jest` with full type-check (no `isolatedModules`/`transpileOnly`), the default coverage provider (`babel`), and no `maxWorkers` or `workerIdleMemoryLimit`. The CI command is `jest --coverage --ci` | `onecgiar-pr-server/package.json` `jest` block (`node -e "…require('./package.json').jest"`), `:19`; `reporting-tool-staging-ci.yml:59`, `reporting-tool-dev-cicd.yml:112` |
| 6 | The two largest services exceed Babel's 500 KB pretty-print limit once instrumented for coverage: `results.service.ts` is 219 KB of source, `bilateral.service.ts` is 265 KB | Pasted log (`[BABEL] Note: … exceeds the max of 500KB`); `wc -c` |
| 7 | The tests log full stack traces through `HandlersError` / Nest `Logger`. That adds thousands of log lines and retained strings per run | Pasted log |
| 8 | The job queued about 26 min before it started (run at 01:22:11, backend job at 01:48:50). It then failed in about 6 min | `gh run view 44436363871 --json jobs` |
| 9 | My earlier statement that the last 8 runs showed no OOM was **wrong**. That sample was dev runs that all passed, plus failed runs grepped only for test errors | Corrected here |

## 3. Proposed Outcome

The backend `test:cov` job completes on the GitHub `ubuntu-24.04` runner with no worker reaching its heap limit. Every suite runs, the coverage gates and the SonarCloud upload stay the same, and the job time does not regress by more than about 20%.

## 4. Scope

> **Constraint (user, 2026-11-18): no added cost.** No larger runner, no paid runner, no extra jobs or shards, no new service. The levers below only reduce what the same free `ubuntu-24.04` runner uses (the repo is public, so standard GitHub-hosted runner minutes are free — `UNVERIFIED — confirm at source before relying on it` against the org's billing).
>
> **Constraint (user, 2026-11-18): only Cris touches CI.** The fix lives in the repo code: the `jest` block and the scripts in `onecgiar-pr-server/package.json`. No workflow file is edited. Any CI-side change (lever 3) goes to Cris as a recommendation, not as part of this spec.

- The server Jest config: the `onecgiar-pr-server/package.json` `jest` block and the `test:cov` script. The CI workflows stay untouched, because they run `npm run test:cov` and so pick up the change.
- Memory levers, applied in this order and measured after each:
  1. **ts-jest without the type checker** (`isolatedModules: true`). Each worker stops building a TypeScript program for every file it loads, which is the biggest per-worker cost when a suite imports `AppModule`. Type safety stays gated by `tsc`/`nest build`.
  2. **Bounded workers:** `workerIdleMemoryLimit` (for example `1GB`) recycles a bloated worker between files, and `--maxWorkers=2` keeps the total under the runner's RAM.
  3. **A heap ceiling sized to the runner**, only if levers 1–2 are not enough. The candidates are an `npm` script flag, or `NODE_OPTIONS=--max-old-space-size=4096` set by Cris on the CI step. Whether a flag on the parent process reaches the Jest worker processes is `UNVERIFIED — confirm at source before relying on it` (owner: Implementer, at specify).
  4. If the numbers still demand it: `coverageProvider: "v8"` instead of Babel instrumentation. Its coverage numbers can differ slightly, so check against the gates first.
- Measurement: run `--logHeapUsage` on one CI run before and after, and record the peak heap of the three whole-app suites and the job time.

## 5. Non-Goals

- The frontend job. It passed in 10 min in the same run, and there is no OOM evidence for it. It is revisited only if this measurement shows the same pattern.
- Splitting `results.service.ts` / `bilateral.service.ts` into smaller files. That is the root of the size, but it is a refactor, not this fix.
- Silencing the test-time error logs. That is a separate readability change.
- Jenkins, the DEV container (`nest start`) and the DEV frontend build. They are listed as follow-ups in §12.
- The 26-min queue wait. Runner availability is org-level, not code.

## 6. Affected Users, Systems, And Specs

- **CI:** `reporting-tool-dev-cicd.yml`, `reporting-tool-staging-ci.yml`, `reporting-tool-prod-ci.yml`. Each one's backend test step needs the same change, `UNVERIFIED — confirm at source before relying on it` for prod (to be checked at specify).
- **Config:** `onecgiar-pr-server/package.json` (`jest` block); `tsconfig` only if `isolatedModules` demands it.
- **Users:** the platform team (Cris), and everyone whose merge goes red on a test that never ran (today: the merge `663ead830` to staging).
- **Specs:** none superseded.

## 7. Visual Reference

- Source: None
- Notes: CI and test config only.

## 8. Bug Diagnosis

### Observed Symptom

The backend checks job fails with `Test Suites: 3 failed` while every test that ran passes. The failed suites never ran: their Jest workers hit the ~2 GB V8 heap limit and were killed.

### Reproduction Steps

1. Push to `staging` (or `performance-refactor`). The `backend checks` job runs `npm run test:cov -- --ci` on `ubuntu-24.04`.
2. Expected: 399/399 suites pass. Actual: `app.module.spec.ts`, `main.routes.spec.ts` and `primary-program-request.load-order.spec.ts` fail with `JavaScript heap out of memory`.
3. Not every time: runs `44352235907`, `44209985289` and `44436363871` reproduce it, and some runs pass. Locally, the full server suite with the default worker count also exhausted memory on 2026-11-18.

### Root Cause (confirmed)

Each Jest worker runs with Node's default old-space heap (~2 GB, see the log in §2 #2). Three suites bootstrap the whole Nest application graph (§2 #3). Under the current config, each file in that graph is:
- type-checked by `ts-jest`, which builds a TypeScript program per worker;
- instrumented by Babel for coverage, with two services already over 500 KB once instrumented (§2 #6).

The worker also keeps the modules of earlier suites, because no `workerIdleMemoryLimit` recycles it (§2 #5). Loading the full graph on top of that crosses the 2 GB heap limit, and V8 aborts.

It is intermittent because the heap a whole-app suite starts from depends on which suites that worker ran before it.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all -i --grep="memory\|OOM\|heap\|max-old-space"` → no CI/Jest memory fix. `node -e` over `package.json` `jest` on HEAD → no `maxWorkers` / `workerIdleMemoryLimit` / `isolatedModules` | Not fixed on any branch checked |
| **Live path?** | `reporting-tool-staging-ci.yml:59` and `reporting-tool-dev-cicd.yml:112` → `npm run test:cov` → `jest --coverage --ci` (`package.json:19`) → the `jest` block → the `ts-jest` transform | On path. It runs on every push to `staging` and `performance-refactor` |
| **Siblings on the same state** | The prod CI backend step (`reporting-tool-prod-ci.yml`, `UNVERIFIED — confirm at source before relying on it`); the local `npm run test` (`jest --forceExit`, same config) | The same config feeds both. The fix lands in the shared `jest` block |
| **Downstream consumers** | Coverage thresholds (`package.json:134`), the `coverageReporters` consumed by SonarCloud (`package.json:142`), and the AKILI agent-lean command `npx jest --silent --reporters=summary --forceExit` (`AGENTS.md`) | Thresholds and reporters must not change; a provider switch is checked against them |

### Fix Strategy

Apply the config levers in §4 in order, measuring after each. Stop at the first set that brings the three whole-app suites well under the heap limit (target a peak below 1.5 GB per worker). Route: `/akili-specify` (Lite) in **Bug Mode**. The regression check is a measured CI run: the three suites pass, with their peak heap logged before and after, in `execution.md`.

## 9. Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — Lighter workers (recommended)** | `isolatedModules: true` + `workerIdleMemoryLimit` + `maxWorkers=2` + a 4 GB heap ceiling on the CI step | Removes the biggest per-worker cost; small diff; also faster locally | Drops type errors from Jest output (still caught by `tsc`/build, and the lint step) |
| B — Only raise the heap | `NODE_OPTIONS=--max-old-space-size=4096` | One line | Hides the growth. As the services keep growing, it will hit the new ceiling, and 3+ workers at 4 GB can exhaust the runner itself |
| C — Isolate the whole-app suites | Run the 3 `AppModule` suites in their own Jest project with `maxWorkers=1`, and the rest in parallel | Targets exactly the heavy suites | More config; does not reduce the per-worker cost of everything else |

## 10. Recommended Approach

**Option A.** It removes the cost rather than raising the ceiling, and it is reversible with one config revert. Keep the heap ceiling in A as headroom, not as the fix. C is the fallback if A's measurement still shows a whole-app suite above ~1.5 GB.

## 11. Risks, Dependencies, And Open Questions

- **Risk:** `isolatedModules` can surface code that depends on type-only cross-file information (`const enum`, re-exported types). If so, it shows up as test failures in the first run and is fixed in place or the lever is dropped.
- **Risk:** `workerIdleMemoryLimit` restarts workers, which can expose suites that depend on module state left by earlier files. Watch for this over two runs.
- **OQ-1:** Is `reporting-tool-prod-ci.yml` on the same command? To check at specify.
- **Dependency:** the staging merge `663ead830` is red only because of this. A green re-run proves the fix and unblocks it.

## 12. Success Criteria

- Two consecutive CI runs on `staging` with `Test Suites: 399 passed` (or whatever the current total is), and no `heap out of memory` line.
- The logged peak heap of the 3 whole-app suites is below 1.5 GB.
- Backend job time is within +20% of today's ~5 min.
- Coverage gates and SonarCloud upload are unchanged.
- Follow-ups, offered separately and not in this spec:
  - `bugfix/dev-backend-nest-start`: the DEV image uses `CMD ["node","dist/main.js"]`;
  - `changes/dev-frontend-optimized-build`: an optimized DEV frontend build;
  - splitting the two >200 KB services.

## 13. Next Step

```text
/akili-specify bugfix/reporting-memory-runners
```

(Bug Mode, Lite depth.)
