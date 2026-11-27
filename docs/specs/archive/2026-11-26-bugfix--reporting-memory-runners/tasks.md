# Tasks — Backend CI Jest runs out of memory

## 1. Scope

- **Spec:** `requirements.md` BRM-R-1..R-3 · `design.md` BRM-DD-1..DD-4
- **Ticket:** none (Cris's report, 2026-11-18). Commits use `[TBD]`
- **Status:** not-started
- **Approvals:** proposal 2026-11-18 · requirements 2026-11-18 ("1") · design 2026-11-18 ("2"; Review Design not chosen) · tasks 2026-11-18 ("1")

## 2. Task list

### BRM-T-1 — Bound Jest memory in the server config, measured on Node 20

- **Status:** [ ]
- **Size:** S
- **Depends on:** — · **Blocks:** —
- **Implements:** BRM-R-1 (regression scenario incl. "BUT must NOT" and "AND IT MUST log the peak heap"), BRM-R-2 (full run, `.github/workflows/*` untouched), BRM-R-3 (type safety still gated)
- **Design refs:** BRM-DD-1..DD-4; Premise Ledger P-1..P-9
- **Files:** `onecgiar-pr-server/package.json` only
- **Backend route:** `nestjs-expert` (Skill Map) · none — project conventions for the Jest config
- **Skills:** `nestjs-expert`
- **Review:** full — the config is read by every server suite, by SonarCloud (reporters) and by the agent-lean command (consumer, P-8)
- **Scope (in order):**
  1. **Settle P-3, P-7 and P-8 first:**
     - P-3: is `workerIdleMemoryLimit` supported in Jest 29.7 (`npx jest --help` or the Jest docs)?
     - P-7: is any `const enum` imported across files (grep the importers of the three files)?
     - P-8: the sweep of coverage readers (`grep -rn "coverage" .github/workflows/reporting-tool-*.yml sonar-project.properties`).
     - Record each result in `execution.md`. A refuted P-3 drops lever 1's memory cap. A cross-file `const enum` drops lever 2.
  2. **Baseline on Node 20.13.1.** Route A: local Node 20, run the P-5 command. Route B: the CI log of the run made after step 3. Record the peak `heap size` of the three whole-app suites, or the OOM line.
  3. **Lever 1:**
     - `maxWorkers: 2` and `workerIdleMemoryLimit` (≈`1GB`) in the `jest` block;
     - `--logHeapUsage` appended to `test:cov`;
     - measure.
  4. **Lever 2, only if step 3 leaves a whole-app suite at or above ~1.5 GB or with an OOM:**
     - the ts-jest transform with `isolatedModules: true`;
     - plant a type error in a `src` file, run `npx tsc --noEmit -p tsconfig.json`, observe red, revert;
     - measure.
  5. **Lever 3, only if still over budget:** `coverageProvider: "v8"`; confirm the thresholds hold; measure.
- **Verification:**
  - **Falsifier:** revert `package.json` to `349bde8c0` → the regression run (P-5 command, Node 20, 1536 MB budget) shows `heap out of memory` for a whole-app suite. If, on Node 20, the baseline does **not** OOM under 1536 MB, the budget is not a falsifier: lower it to the largest value at which the baseline OOMs, and record that value.
  - **Red run:** `node --max-old-space-size=1536 node_modules/jest/bin/jest.js src/app.module.spec.ts src/main.routes.spec.ts src/api/results/share-result-request/services/primary-program-request.load-order.spec.ts --coverage --runInBand --logHeapUsage`
    - Observed on **Node 26.13.1** (local, 2026-11-18): `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`, exit 134.
    - Must be **re-observed on Node 20.13.1** (rule f) and quoted in `execution.md` before the fix is measured.
    - On CI, the red is already observed in run `44436363871`: `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`, `Test Suites: 3 failed, 396 passed`.
  - **Green:**
    - the same command on Node 20 → three `PASS`, no OOM line;
    - a CI run of `test:cov` → `Test Suites: N passed, N total` (N ≥ 399), with a `heap size` figure per suite, on two consecutive runs.
  - **Disqualifier:**
    - Any local result on Node 26 is not evidence (P-6).
    - If two CI runs differ in pass/fail with no code change, report the flake; never record PASS.
    - If the job time exceeds +20% of ~5 min, report it instead of PASS.
    - A green obtained by lowering thresholds, skipping suites or editing a workflow is a FAIL.
  - **Consumers:**
    - every server suite (they share the `jest` block);
    - SonarCloud via `coverageReporters` (`package.json:142`), plus the readers found by the P-8 sweep;
    - the agent-lean command in `AGENTS.md` (`npx jest --silent --reporters=summary --forceExit`).
- **Done criteria:**
  - [ ] P-3, P-7 and P-8 settled and recorded
  - [ ] The baseline red on Node 20 is quoted (or the CI red of run `44436363871`, if route B)
  - [ ] Levers applied in order; the stop point recorded, with the per-suite heap after each lever
  - [ ] Two consecutive green CI runs, with job time ≤ +20%; thresholds and reporters unchanged
  - [ ] If lever 2 is applied: the planted type error turns `tsc --noEmit` red (quoted)
  - [ ] `git diff --stat` shows only `onecgiar-pr-server/package.json` (plus spec docs)
  - [ ] Commit `🔧 fix(jest) [TBD]: … [SPEC:bugfix/reporting-memory-runners]`
  - [ ] **Every CI push is approved by the user** (route B)

## 3. Test plan

| ID | Covers | How |
|---|---|---|
| BRM-TEST-1 | BRM-R-1 | Regression command on Node 20, 1536 MB budget: red before, green after |
| BRM-TEST-2 | BRM-R-2 | CI `test:cov`, two consecutive runs, counts and time |
| BRM-TEST-3 | BRM-R-3 | Planted type error → `tsc --noEmit` red |

## 4. Rollback

Revert `onecgiar-pr-server/package.json`.
