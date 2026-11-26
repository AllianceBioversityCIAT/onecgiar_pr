# Execution — Backend CI Jest runs out of memory

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/reporting-memory-runners` |
| Approval Mode | gated |
| Verification route | A: local Node 20.13.1 through `npx -y -p node@20.13.1 node`. User chose it on 2026-11-18; CI confirms at the end |
| CI branch | `qa-development-2026-ss` (user). A push there triggers no reporting CI. `reporting-tool-staging-ci` would need a `workflow_dispatch`, and the user approves it first |
| Status | **Closed — resolved in CI, no app change** (2026-11-26). BRM-T-1 stays `[~]` (not applied) |

## Pending (shared files, apply on `staging`)

- `akili doctor --agents` on 2026-11-18: `.agents/leader.md` `primary-instructions` is OUTDATED (matched 2.36.0). `tester.md` `context-alignment` is CUSTOM-EDITED. Not fixed here, per the shared-file write discipline.

## Task Execution History

### BRM-T-1 — Bound Jest memory in the server config, measured on Node 20

- **Final status:** parked, `[~]`. Not a HALT or a pivot
- **Date:** 2026-11-18
- **Why parked:** the user relayed that Cris (platform team) asked not to touch the app yet, because he has already increased the runner capacity. The working tree was restored. The Implementer's diff is kept as `brm-t-1-parked.patch` in this folder; `git apply --check` passes against the restored tree
- **Attempts:** 1 Implementer run, which completed its report. No Reviewer was spawned. Evidence re-run: not done
- **spawns:** implementer 58 calls, 121164 tokens, ended complete (stopped by the Leader after hand-back)
- **Files changed (now reverted):** `onecgiar-pr-server/package.json` only

#### Implementer findings (Node 20.13.1, local; not yet re-run by a non-author)

- **Premises:**
  - **P-3 confirmed.** `workerIdleMemoryLimit` is in jest-config 29.7.0 (`ValidConfig.js:220`, `:340`).
  - **P-7 confirmed safe.** The only real `const enum` is `RequestStatusId` (`primary-program-request.service.ts:66`). It is not exported and has no importers.
  - **P-8 swept.** The workflows call `npm run test:cov -- --ci` / `test:coverage`. The root `sonar-project.properties` sets only `sonar.exclusions`, with no coverage paths.
- **Baseline red, 1536 MB:** `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`. The 1536 MB budget is a valid falsifier.
- **Lever 1** (`maxWorkers: 2`, `workerIdleMemoryLimit: "1GB"`, `--logHeapUsage`): not enough. All 3 whole-app suites still OOM at ~1533 MB, and the workers get SIGTERM. `workerIdleMemoryLimit` only acts between suites.
- **Lever 2** (ts-jest `isolatedModules: true`): all 3 pass. `main.routes` 897 MB, `load-order` 765 MB, `app.module` 815 MB. Stopped here; lever 3 was not applied.
- **BRM-R-3:** a type error planted in `src/main.routes.ts` turns `tsc --noEmit` red (`TS2322`, exit 2). The plant was reverted.
- **Full suite** (final config): `Test Suites: 1 failed, 398 passed, 399 total`, `Tests: 1 failed, 7386 passed`, max heap 1102 MB, coverage well above the thresholds.
  - **Time:** wall time 9m02s locally, above the +20% line. No local baseline was run for comparison.
  - **The one failure:** `qa-catalog.snapshot.spec.ts`. The Implementer reports that the same failure reproduces on the unchanged config. Unverified by a non-author.

#### Open before resuming

1. Evidence re-run by a non-author, then the conformance Reviewer (Review = full).
2. Decide whether to drop `workerIdleMemoryLimit` (no effect on the whole-app suites).
3. Check the `qa-catalog.snapshot.spec.ts` failure on `master` / CI.
4. Measure the job time on CI against the +20% limit.
5. Two green CI runs (BRM-R-2), each approved by the user.

**Resume:** `git apply docs/specs/bugfix/reporting-memory-runners/brm-t-1-parked.patch`, then `/akili-execute bugfix/reporting-memory-runners`.

## Closure (2026-11-26): resolved in CI, no app change

- **What fixed it:** the platform team raised the Node heap for the backend Jest workers in the three workflows, outside this spec: `fc5ae5dbd` and `8398d4edc` (STAGING), `78d26807c` (DEV CI/CD), `da6fb5106` (PROD), promoted to `staging` in `7e28b5dd6`.
- **Evidence** (`gh run list` / `gh run view --log-failed`, read-only):
  - The last heap OOM is run `44436363871` (2026-11-19, staging). Earlier OOMs: `44352235907`, `44209985289`.
  - Since 2026-11-20, every backend run is green on heap: dev-cicd 40 success, staging-ci 11 success, prod-ci 4 success. The two 2026-11-20 dev-cicd failures (`44728038271`, `44727310399`) carry no OOM line.
  - Staging run `45830552345`: backend job 13:35:07 → 13:38:56 (≈4 min).
- **Decision (user, 2026-11-26):** archive without applying BRM-T-1. This honours the platform team's request not to change the app's Jest config.
- **Plan B kept:** `brm-t-1-parked.patch` (lever 2, ts-jest `isolatedModules`, measured ≈900 MB peak on Node 20) stays with the archived spec in case the OOM returns. Before using it, the open items listed above under "Open before resuming" still apply.
