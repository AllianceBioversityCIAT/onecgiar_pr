# Requirements — Backend CI Jest runs out of memory

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/reporting-memory-runners` |
| Type | Bug (Bug Mode) |
| Deliverable | software |
| Depth | Lite |
| Approval Mode | gated |
| Source | `proposal.md` (approved by the user, 2026-11-18) · CI run `44436363871` |
| Constraints | **No added cost**: same free `ubuntu-24.04` runner, no extra jobs or shards, no new services. **CI untouched**: only Cris edits `.github/workflows/*`. The fix lives in `onecgiar-pr-server/package.json` |
| Status | draft |

## 2. Executive Summary

The backend `test:cov` run must finish on the standard GitHub runner without any Jest worker exhausting its heap. The fix changes only the server's Jest configuration and scripts. Coverage gates, coverage reports and the test set stay the same.

## 3. Glossary

| Term | Meaning |
|---|---|
| Whole-app suites | `src/app.module.spec.ts`, `src/main.routes.spec.ts`, `src/api/results/share-result-request/services/primary-program-request.load-order.spec.ts`. They load the full Nest module graph |
| Heap OOM | `FATAL ERROR: … JavaScript heap out of memory` in a Jest worker |

## 4. System Context & Scope

- **Today:**
  - CI runs `npm run test:cov -- --ci` (`reporting-tool-{dev-cicd,staging-ci,prod-ci}.yml`: `:112`, `:59`, `:67`) on Node 20.13.1 (`reporting-tool-staging-ci.yml:51`).
  - The Jest config has `ts-jest` with type-check, the default Babel coverage, and no worker or memory limits (`onecgiar-pr-server/package.json` `jest` block).
  - The three whole-app suites hit the heap limit at ~2 GB per worker (run `44436363871`; also `44352235907`, `44209985289`).
- **In scope:** the `jest` block and the test scripts in `onecgiar-pr-server/package.json`.
- **Out of scope:**
  - CI workflow files;
  - the client suite;
  - splitting the large services;
  - log noise in tests;
  - the DEV container start command.

## 5. Stakeholders

- **Platform team (Cris):** owns CI and reported the problem.
- **Developers:** today their merges go red on suites that never ran.

## 6. Functional Requirements

### BRM-R-1 — The whole-app suites run within a bounded heap

The backend coverage run SHALL complete the three whole-app suites without a heap OOM on the CI runtime (Node 20.13.1, `ubuntu-24.04`), with no CI file changed.

#### Scenario: Regression (the failing case from run 44436363871)

- GIVEN the three whole-app suites, run with coverage on Node 20.13.1 under a fixed heap budget of 1536 MB
- WHEN `test:cov` runs them
- THEN all three report `PASS`, and no output line contains `heap out of memory`
- BUT it must NOT pass by lowering the coverage thresholds, deleting or skipping a suite, or adding a CI step
- AND IT MUST log the peak heap per suite (`--logHeapUsage`), so the figure is visible in the CI log

### BRM-R-2 — Nothing else regresses

The full backend `test:cov` run MUST keep the same number of suites and tests, the same coverage thresholds (`package.json` `coverageThreshold`) and the same `coverageReporters` (SonarCloud input). Job time MUST stay within +20% of the ~5-min baseline.

#### Scenario: Full run on CI

- GIVEN the change is pushed to a branch that triggers the reporting CI
- WHEN the backend checks job runs
- THEN `Test Suites: N passed, N total`, with N ≥ 399 and no `heap out of memory`, on two consecutive runs
- BUT it must NOT change any `.github/workflows/*` file (`git diff --stat` shows only `onecgiar-pr-server/package.json`, plus spec docs)

### BRM-R-3 — Type safety is still gated

If the fix turns off type-checking inside Jest, a type error in `src` MUST still fail an existing gate (`nest build` / `tsc --noEmit -p tsconfig.json`).

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Cost | $0 added: same runner class, same number of jobs |
| Time | Backend job ≤ +20% of ~5 min |
| Reversibility | One-file revert |

## 8. Defect Classes And Gates

| Defect class | Gate |
|---|---|
| A whole-app suite still OOMs | BRM-R-1 regression run with a 1536 MB budget on Node 20 + the CI log (`heap out of memory` count = 0) |
| A suite breaks under the new transform or worker recycling | The full `test:cov` run (BRM-R-2), counts compared with the baseline |
| Type errors stop being caught | `npx tsc --noEmit -p tsconfig.json` with a planted type error goes red (BRM-R-3) |
| Coverage drops or a report is missing | The thresholds in the run, and `coverage/` containing the same reporter outputs |
| A local measurement taken on the wrong runtime | **Gap:** this machine runs Node 26.13.1. There `@nestjs/jwt` → `buffer-equal-constant-time` fails to load (`SlowBuffer.prototype`), so local green or red on the whole-app suites is **not evidence**. Substitute: a Node 20.13.1 runtime, or the CI run itself (HITL) |

## 9. Requirement ID Index

| ID | Title | Strength |
|---|---|---|
| BRM-R-1 | Whole-app suites within a bounded heap | SHALL |
| BRM-R-2 | Nothing else regresses | MUST |
| BRM-R-3 | Type safety still gated | MUST |
