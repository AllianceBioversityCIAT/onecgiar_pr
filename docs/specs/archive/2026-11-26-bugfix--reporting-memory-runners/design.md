# Design — Backend CI Jest runs out of memory

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/reporting-memory-runners` |
| Depth | Lite · Bug Mode |
| Verified at | `349bde8c0` (onecgiar_pr) |
| Requirements | `requirements.md` BRM-R-1..R-3 |
| Skills | `nestjs-expert` (Skill Map: server Jest/TypeORM work) |
| Verification route | **B — on CI** (the user did not pick A; there is no local Node 20). If the user installs Node 20.13.1, route A (local) takes over |

## 1. Summary

The change touches only the server Jest config in `onecgiar-pr-server/package.json`. It applies three levers in order and measures after each. It stops at the first set that keeps the whole-app suites under budget:

1. **Worker hygiene**: `workerIdleMemoryLimit` (≈1 GB) and `maxWorkers: 2`, plus `logHeapUsage` in `test:cov` so CI prints each suite's heap.
2. **ts-jest without the type checker**: `isolatedModules: true`, with type safety kept by `tsc`/`nest build` (BRM-R-3).
3. **V8 coverage**: `coverageProvider: "v8"`, only if 1 + 2 are not enough, and only if the thresholds still hold.

There is no CI edit, no new dependency, no runner change and no cost.

## 2. Premise Ledger

Count: 6 verified · 3 `UNVERIFIED` (2 High, 1 Low).
Blast-radius triggers: `live-path` (the CI step reaches `test:cov`) · `consumer` (the coverage reports and the `jest` config are read by SonarCloud and the agent-lean command). `shared-state`: none applies — the change edits one config object, read only by Jest.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | All three reporting CIs run `npm run test:cov -- --ci` for the backend | live-path | `grep -n test:cov .github/workflows/reporting-tool-{dev-cicd,staging-ci,prod-ci}.yml` → `:112`, `:59`, `:67`; `package.json:19` `jest --coverage` | 349bde8c0 | A CI edit would be needed (High — conflicts with the CI constraint) | — |
| P-2 | The CI backend runtime is Node 20.13.1 on `ubuntu-24.04` | data-env | `reporting-tool-staging-ci.yml:51` (`node-version: 20.13.1`), `:38` (`runs-on`) | 349bde8c0 | The heap budget and the probes target the wrong runtime (High) | — |
| P-3 | Jest 29.7.0 and ts-jest 29.2.5 are installed. Jest 29 supports `workerIdleMemoryLimit` | existence | `node -e "require('jest/package.json').version"` → 29.7.0; ts-jest → 29.2.5. Option support: `UNVERIFIED — confirm at source before relying on it` | 349bde8c0 | Lever 1 is unavailable (High) | BRM-T-1 first step: Jest docs/CLI `--help` for `workerIdleMemoryLimit` (owner BRM-T-1) |
| P-4 | The current config has no `maxWorkers`, `workerIdleMemoryLimit`, `isolatedModules` or `coverageProvider` | existence | `node -e` over `package.json` `jest` → keys `transform` (`ts-jest`), `collectCoverageFrom`, `testEnvironment`, … — none of the four | 349bde8c0 | Already partly applied (Low) | — |
| P-5 | The three whole-app suites OOM under a 1536 MB heap with the current config | data-env | `node --max-old-space-size=1536 node_modules/jest/bin/jest.js <3 suites> --coverage --runInBand --logHeapUsage` → `FATAL ERROR: Ineffective mark-compacts near heap limit … heap out of memory`, exit 134. **Runtime: Node 26.13.1 (local), not CI** | 349bde8c0 | The regression red is not reproducible (High) | Rule (f): re-observe on Node 20.13.1 in BRM-T-1 (CI run or local Node 20) |
| P-6 | On Node 26 the whole-app suites fail before running: `@nestjs/jwt` → `buffer-equal-constant-time/index.js:37` reads `SlowBuffer.prototype` | data-env | `npx jest src/app.module.spec.ts --runInBand` → `TypeError: Cannot read properties of undefined (reading 'prototype')` at `buffer-equal-constant-time/index.js:37:35`. Node 26.13.1 | 349bde8c0 | Local probes are valid evidence (Low — only widens the options) | — |
| P-7 | `const enum` is declared in `src` (relevant to `isolatedModules`) | data-env | `grep -rln "const enum" src` → `api/ai/ai.service.ts`, `api/results/share-result-request/services/primary-program-request.service.ts`, `api/qa-catalog/qa-catalog.shape.spec.ts`. Whether any is imported across files: `UNVERIFIED — confirm at source before relying on it` | 349bde8c0 | Lever 2 breaks those modules (High → drop lever 2) | BRM-T-1, while applying lever 2 (owner BRM-T-1) |
| P-8 | SonarCloud reads the reporters listed in `coverageReporters`; the thresholds are in `coverageThreshold` | consumer | `onecgiar-pr-server/package.json:134` (`coverageThreshold`), `:142` (`coverageReporters`). Readers: `grep -rn "coverage" .github/workflows/reporting-tool-*.yml sonar-project.properties` — to run in BRM-T-1 | 349bde8c0 | A provider switch silently changes the Sonar input (Low) | BRM-T-1 (consumer sweep) |
| P-9 | `tsc --noEmit -p tsconfig.json` type-checks `src` independently of Jest | other | `CLAUDE.md` *Test gates* plus `AGENTS.md` agent-lean table; `tsconfig.json` present | 349bde8c0 | BRM-R-3 needs another gate (Low) | — |

## 3. Design Decisions

### BRM-DD-1 — Fix in the Jest config, not in CI

All three CIs call `npm run test:cov` (P-1), so a `package.json` change reaches them with no workflow edit. This honours the CI constraint and the no-cost constraint.

### BRM-DD-2 — Levers in cost order, measured, stop early

Each lever is applied, then measured on Node 20 (P-2/P-5). The order is: worker hygiene (no behaviour change for tests), then `isolatedModules` (removes the per-worker TypeScript program), then the v8 provider (it changes how coverage is computed, so it goes last).

*Rejected:*
- raising the heap only. It hides the growth, and a raised heap per worker can exhaust the 16 GB runner;
- sharding the suite. More jobs means more minutes, which breaks the cost constraint;
- splitting the services. That is the right long-term fix, but it is a refactor (non-goal).

**Reversion challenge (Step 2.3):** lever 2 removes type-checking from Jest. *What does removing it break?* A type error that only Jest caught would ship. That is covered by `tsc --noEmit` and `nest build` (P-9, BRM-R-3). The task plants a type error to prove it.

### BRM-DD-3 — Make the heap visible in CI

`test:cov` gains `--logHeapUsage`. Every CI log then shows each suite's heap, so the next growth is visible before it OOMs (BRM-R-1 "AND IT MUST"). The cost is one flag and slightly longer logs.

### BRM-DD-4 — Where it is measured

Route B (CI): push to `performance-refactor` and read `heap size` for the three suites and the job time in the log. Each attempt is one push plus ~15 min. The push needs the user's go-ahead. If the user installs Node 20.13.1, route A (local, same command as P-5) is used instead, and CI confirms once.

## 4. Budget (tripwire)

| Measure | Estimate |
|---|---|
| Tasks | 1 |
| LOC | ~10 (`package.json`) + spec docs |
| Review rounds | 2 |
| CI measurement runs (route B) | ≤ 3 |
