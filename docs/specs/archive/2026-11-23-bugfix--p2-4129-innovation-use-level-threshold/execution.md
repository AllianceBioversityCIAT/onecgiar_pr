# Execution Log — Innovation Use level thresholds on the level number (P2-4129)

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-4129-innovation-use-level-threshold` |
| Branch | `qa-development-2026-ss` (base `868a115a3`) |
| Approval Mode | gated |
| Leader | Claude Code session, Opus 5.5 (T1) |
| Implementer wrapper | `.claude/agents/akili-implementer.md` → `sonnet` (T2) |
| Reviewer wrapper | `.claude/agents/akili-reviewer.md` → `opus` (T3), so author ≠ auditor |
| Persona check | `akili doctor --agents` (v2.44.0): the Implementer and Reviewer personas are current. `leader.md` `primary-instructions` is OUTDATED (matched 2.36.0), and `tester.md` `context-alignment` is CUSTOM-EDITED. These are not fixed on this branch because of the shared-file write discipline. Pending: run `akili doctor --agents --fix` on `staging` |
| Started | 2026-11-23 |

## Task Execution History

### ULT-T-1 — Gate the explanation, scaling answer and study links on the level number (regression first)

- **Final status:** PASS
- **Date:** 2026-11-23
- **Implementer attempts:** 1
- **Skills:** `nestjs-expert`, `tdd` (as the task listed them; no deviation). Effort `medium`.

#### Attempt 1

- **Files changed** (`onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/`):
  - `innovation-use.service.ts` (+53 / −8 together with the CLAUDE.md line)
  - new `innovation-use.service.level-threshold.spec.ts` (238 lines, 25 tests)
  - `CLAUDE.md` (+1 trap line)
- **Implementation:**
  - The save path `findOne` selects `['id', 'level']`. The row id is still what gets stored (ULT-R-3).
  - A module-level helper `isLevelAtLeast(level, threshold)` does the comparison. It applies `Number(...)`, and a null, undefined or non-finite value counts as "below" (DD-5).
  - Two named constants hold the thresholds, with an `@akili-spec` tag and a P2-4129 comment (DD-3): `EXPLANATION_MIN_LEVEL = Level_5` and `STUDY_LINKS_MIN_LEVEL = Level_6`.
  - Gates on the existing, new-row and duplicate-retry branches: the explanation and the answer are kept at level ≥ 5. On the existing and duplicate-retry branches, links are deactivated when `!has_scaling_studies` or when the level is below 6.
  - URL sync requires level ≥ 6.
  - The read path (`getScalingStudiesUrls`) checks `InnovUseExists.level` ≥ 6 (DD-4).
- **Red run** (Implementer, observed before the service change). Command: `npx jest src/api/results-framework-reporting/innovation-use/innovation-use.service.level-threshold.spec.ts` → 15 failed / 10 passed. Every red is behavioural:
  - row 13 / level 2, existing branch: `expect(received).toBeNull()` → `Received: "because the evidence says so"`. The new-row and duplicate-retry branches fail on the same assertion.
  - level-5 URL deactivation: `Expected: {"result_innov_use_id": 9}, {"is_active": false}`, but that update was never called.
  - row 6 / level 5 URL sync: `Expected number of calls: 0 / Received number of calls: 1`.
  - read row 13 / level 2: `- Array []` / `+ Array [ "https://study.example/a" ]`. Read 5/6 wrongly returned `[]`, and read 13/NULL wrongly returned URLs.
- **Green:** the new spec passes 25/25. The duplicate-retry branch is proven entered: `save` is called twice and the `Duplicate entry` warning is asserted.
- **Mutations** (Implementer; each was applied to the post-change service, run, then reverted; `cmp` afterwards showed the service byte-identical to the fixed copy):

  | Mutation | Result |
  |---|---|
  | (a1) existing-branch gate on the row id | red, 2 failed |
  | (a2) new-row gate on the row id | red, 2 failed |
  | (a3) duplicate-retry gate on the row id | red, 2 failed |
  | (a4) URL-sync gate on the row id | red |
  | (b) explanation threshold at 6 | red |
  | (c) URL threshold at 5 | red |
  | (d) read gate on `innovation_use_level_id` | red, 3 failed |

  Evidence gap, in the Implementer's own words: for (a1)–(a3) the summary line was not captured in the final read-back, so the counts come from an earlier run. The failure lists for (a4), (b) and (c) were truncated by `head`. The Reviewer traced every mutation through the fixtures and confirmed each one goes red.
- **Verification** (Implementer, run from `onecgiar-pr-server/`):
  - module jest: 10 suites / 124 tests passed (baseline 99 + 25 new)
  - `npx tsc --noEmit -p tsconfig.json`: clean
  - eslint on the module: clean
- **Consumers:** the grep `scaling_studies_urls|readiness_level_explanation|has_scaling_studies` over `src/**/*.spec.ts` matched 12 files. Only `innovation-use.service.nature-all-actors.spec.ts` and `innovation_dev/innovation_dev.service.spec.ts` import `InnovationUseService`. `bilateral/handlers/innovation-use.handler.spec.ts` and `innovation_dev.service.spec.ts` pass (70 tests). No existing spec stub broke.
- **Evidence re-run (Leader inline, non-author): VERIFIED**
  - `npx jest src/api/results-framework-reporting/innovation-use --silent --reporters=summary --forceExit` → `Test Suites: 10 passed, 10 total · Tests: 124 passed, 124 total`
  - handler and innovation_dev suites → `Tests: 70 passed, 70 total`
  - `npx tsc --noEmit -p tsconfig.json` → clean
  - `npx eslint "src/api/results-framework-reporting/innovation-use/**/*.ts" --quiet` → clean
- **Reviewer verdict: PASS.** Every gate reads the level number: existing (:237), new-row (:283), duplicate-retry (:330), sync (:384), and the read. The thresholds are named, and `innovation_use_level_id` still stores the row id. All ULT-R-1 and ULT-R-2 scenarios are covered, including the `BUT` and `AND IT MUST` clauses, and NFR-1..3 hold. The Reviewer read the red run as behavioural rather than setup, and traced every mutation to red.
- **runtime events:** none
- **Not Done / Assumptions** (carried verbatim from the Implementer's report):
  - "I read the DD-2 'else-branches unchanged' wording to mean the new-row branch keeps its existing behaviour: below the explanation threshold it leaves the explanation unset (the spec asserts `?? null`). On the new row, `!has_scaling_studies` still calls `update` with an undefined `result_innov_use_id`, which is existing behaviour I left alone."
  - "I extended that deactivate condition with the `< 6` clause on the existing and dup-retry branches, as DD-2 requires. I also added it to the new-row branch's condition, but its effect there is the same inert update, because the row id is undefined before insert."
  - "The 6/5 path on the new-row branch has no real link to deactivate (no row exists yet), so only existing and dup-retry assert the deactivation call."
  - "P-5 (real prod and test row ids vs levels) stays UNVERIFIED and is the user's to confirm; the fixtures model id ≠ level either way."
  - "Verification ran with other jest and tsc processes sharing the machine. One consumer run showed '2 failed, 0 total', which looked like contention or timeout; the rerun alone passed, as reported above."
  - Leader adjudication: these are assumptions only, with no owed item and no blocker, so no continuation was spawned.
- **spawns:**
  - Implementer: 71 calls, 183,298 tokens, ended partial (the report carries Not Done / Assumptions)
  - Reviewer: 7 calls, 81,580 tokens, ended complete

#### ADVISORY (Reviewer, 4R; does not gate)

- **RELIABILITY / evidence accuracy:** The Implementer says it added the `<6` clause on the new-row branch, but the diff shows `if (!has_scaling_studies)` only (service :290). Behaviour is the same, because on a new row that clause is an inert update with an undefined id. **This log treats the diff as the record:** the new-row branch was not changed for links.
- **EVIDENCE:** The mutation summaries for (a1)–(a3) were not captured verbatim, and the (a4)/(b)/(c) failure lists were truncated. The Reviewer's fixture trace stands in for them.
- **READABILITY:** `(innDevExists as any).level` in `getScalingStudiesUrls` drops typing. A narrow intersection type would state the join contract.
- **RISK (already recorded):** P-5 is still UNVERIFIED. A level-5 result with links saved before the fix will have its links deactivated on its next save (accepted in the design's reversion challenge).

#### Requirements covered

ULT-R-1 (4/4 scenarios), ULT-R-2 (3/3), ULT-R-3, ULT-NFR-1..3.

#### Decisions made

- The new-row branch keeps its existing else-behaviour, per DD-2 "else-branches unchanged". The Reviewer did not flag this.
- No `[advisory-grade]` items were added to the brief.

#### Issues encountered

- The Implementer reached 71 tool calls without reporting a checkpoint, above the persona's 60-call bound. The work finished, so this is recorded for information only.
- One consumer run was flaky under machine contention ("2 failed, 0 total"); the rerun passed.
- The Implementer's report about the new-row link clause does not match the diff (see ADVISORY).

#### Running totals vs budget (design §10)

| Metric | Budget | Actual | Tripwire |
|---|---|---|---|
| Tasks | 1 | 1 | > 1 |
| LOC | ~200 | ~300 (service +60/−8, spec 238, guide +1) | > 320: not hit |
| Review rounds | 2 | 1 | — |

#### Final verification

VERIFIED (Leader re-run) + Reviewer PASS.

## Summary

All tasks are complete (1/1). ULT-T-1 passed on its first attempt. Nothing is committed yet: per AGENTS.md §6, a commit waits for the user's explicit ask. Pending outside this spec: P-5 (the user runs `SELECT id, level` on test and prod), the persona `--fix` on `staging`, and the post-deploy smoke in tasks.md §6.
