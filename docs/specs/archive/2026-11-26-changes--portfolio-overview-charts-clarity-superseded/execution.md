# Execution — Portfolio Overview charts clarity (`POC`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-charts-clarity` |
| Branch | `qa-development-2026-ss` (base `b143445bd`) |
| Approval Mode | gated |
| Started | 2026-11-20 (`/akili-execute`) |
| Leader model | `opus` (T1) · Implementer `akili-implementer` (T2 `sonnet`) · Reviewer `akili-reviewer` (T3 `opus`) |
| Persona drift | `akili doctor --agents`: `leader.md` → `primary-instructions` OUTDATED (matched 2.36.0). Implementer/Reviewer current. Not fixed here: `.agents/` is a shared file, so it is a pending item for `staging` |
| Pre-flight waiver | POD closed/merged: **waived by the user 2026-11-20** ("Start now"). POD code is committed on this branch (`cfc18d03e`); only POD-T-2's HITL browser check remains, and it changes no code |
| Staging access | The user confirmed (2026-11-20) they can run the POC-T-2 staging `EXPLAIN` + read-only query |
| Working tree | Unrelated `docs/specs/bugfix/reporting-memory-runners/*` changes stay out of this spec's commits |

## 2. Task Execution History

**Wave 1:** POC-T-1 (client) ∥ POC-T-2 (server). Disjoint packages, separate `node_modules` and Jest trees.

### POC-T-1 — By Center note copy + Typology key guard for the By Center tab

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1) |
| Date | 2026-11-20 |
| Implementer attempts | 1 |
| Requirements covered | POC-R-1 Scenario 1.1 ("BUT … only in one tab"), POC-R-2 Scenario 2.1 (all clauses) |

**Attempt 1**
- Files changed:
  - `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` (+1/−1, `centerNote` only)
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/components/typology-block/typology-block.component.spec.ts` (+24/−0, two new tests in the By Center describe)
- Red run (new tests written first, copy unchanged): 1 failed, 112 passed.
  ```
  ● … By Center tab … › POC-R-2 the Center note is plain: …
      expect(received).not.toMatch(expected)
      Expected pattern: not /matches/i
      Received string:  "Counts the lead Center; the Center filter also matches contributing Centers."
  ```
  The key test was green on current code, so the disqualifier did not fire: POC-R-1 is built.
- Falsifier 1 (removed `{{ copy.centerNote }}` from `typology-block.component.html`): 2 failed, 28 passed. The new note test got `Received: ""`; the existing "…with the note" test also went red.
- Falsifier 2 (key `<ul>` wrapped in `@if (dimension() === 'program')`): 1 failed, 29 passed. The new key test got `Received: null`.
- Both mutations were reverted by hand. `typology-block.component.html` has no diff.
- Verification: `npx jest --silent --reporters=summary --no-coverage src/app/pages/result-framework-reporting/pages/portfolio-overview/components/typology-block` → `Test Suites: 4 passed, 4 total · Tests: 113 passed, 113 total`. Lint: `npx ng lint --quiet --lint-file-patterns` on both files → "All files pass linting."
- Evidence re-run (Leader inline, non-author): the same Jest command gave 4 suites, 113 tests passed. **VERIFIED**.
- Reviewer: **PASS**. The note is POC-DD-5 verbatim and is the only copy key changed. The spec only adds tests. Points 1–3 of POC-R-2 and the one-tab clause of POC-R-1 are asserted. Both falsifiers trace to the template.
- Runtime events: none.

- Review intensity: the `skip-eligible` claim was **not earned**. Conditions 1 and 2 held, but condition 3 failed: `Consumers` names `typology-block.component.spec.ts:289,301`, not `none`. A conformance Reviewer ran. Reported at the continue gate.
- spawns: implementer 13 calls, 133746 tokens, ended complete; reviewer 6 calls, 88528 tokens, ended complete.
- ADVISORY: none (diff under 50 LOC, checklist mode).
- Decisions:
  - Lint was scoped to the two touched files with `--lint-file-patterns`. Plain `npx eslint` has no `eslint.config.*` in the client.
  - Commit deferred to the user's gate: the root `AGENTS.md` says "Do not commit unless the user explicitly asks". That rule takes precedence over `/akili-execute` Step 3.3.
- Issues encountered: none.

**Running totals (budget tripwire):** tasks 1 of 5 · LOC +25/−1 · review rounds 1 of 9 (budget 6). Within budget.

### POC-T-2 — Repository: `getW3ResultProgramPairs(versionId)`

| Field | Value |
|---|---|
| Final status | **`[~]` — Reviewer PASS (attempt 1); held open on the HITL staging check (P-12, DoD item 3)** |
| Date | 2026-11-20 |
| Implementer attempts | 1 |
| Requirements covered | POC-R-4 (Glossary "named on", Scenario 4.2 status set, Scenario 4.5 filters) |

**Attempt 1**
- Files changed:
  - `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.ts` (+100/−0)
  - `onecgiar-pr-server/src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts` (+132/−0)
- What it adds: `getW3ResultProgramPairs(resolvedVersionId)` and the exported `W3ResultProgramPairRow`. Two `UNION` branches; 9 placeholders, bound `['API', version, 4, [1, 2], 'API', version, 4, [1, 4], ['contribution', 'primary']]`. Rows map to `{ projectId: Number(project_id), programCode: String(program_code).trim() }`. Errors go through `returnErrorRepository({ error, className, debug: true })`.
- Sources cited by the Implementer:
  - `share-result-request.entity.ts:21-24` (`RequestTypeEnum`), `:26,34,51,92,126,148`
  - `results_by_inititiative.entity.ts:17-18,23,36,49,62`
  - `clarisa-initiative.entity.ts:21-24`
  - status ids: `primary-program-request.service.ts:66-72`
- First run before the method existed (verbatim):
  ```
  FAIL src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts
    ● Test suite failed to run
      src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts:195:39 - error TS2339: Property 'getW3ResultProgramPairs' does not exist on type 'ClarisaProjectsRepository'.
      src/clarisa/clarisa-projects/clarisa-projects.repository.spec.ts:311:31 - error TS2339: Property 'getW3ResultProgramPairs' does not exist on type 'ClarisaProjectsRepository'.
  Test Suites: 1 failed, 1 total
  Tests:       0 total
  ```
  That is a compile red, not a behavioural one. A stub returning `[]` then gave `Tests: 11 failed, 13 skipped, 24 total`: 10 × `TypeError: undefined is not iterable`, plus 1 × `Received promise resolved instead of rejected`.
- Falsifier mutations: each was applied by script, run with `-t getW3ResultProgramPairs`, then reverted (`RESTORED_IDENTICAL=true`).

  | # | Mutation | Red |
  |---|---|---|
  | M01 | drop `request_status_id IN (?)` | 2 failed |
  | M02 | status bind `[1,3,4]` | 1 failed |
  | M03 | status bind `[1,2,4]` | 1 failed |
  | M04, M05 | drop `rbp.is_active = 1` (branch 1, branch 2) | 1 failed each |
  | M06, M07 | drop `r.is_active = 1` (branch 1, branch 2) | 1 failed each |
  | M08 | drop `rbi.is_active = 1` | 1 failed |
  | M09 | drop `srr.is_active = 1` | 1 failed |
  | M10, M11 | drop `r.version_id = ?` (branch 1, branch 2) | 3 failed each |
  | M12 | roles `(1, 2)` → `(1)` | 1 failed |
  | M13, M14 | drop `r.source = ?` (branch 1, branch 2) | 3 failed each |
  | M15, M16 | drop the Discontinued filter (branch 1, branch 2) | 3 failed each |
  | M17 (extra) | drop `request_type IN (?)` | 2 failed |
  | M18 (extra) | types `[contribution]` only | 1 failed |
  | M19 (extra) | `UNION` → `UNION ALL` | 1 failed |

  **First pass:** M07 stayed green. `srr.is_active = 1` contains the substring `r.is_active = 1`, so the test could not see the clause go missing. The assertion was changed to `/\br\.is_active = 1/`, and all 19 mutations were re-run; the table above is that second pass.
- Verification (in `onecgiar-pr-server`):
  - `npx jest --silent --reporters=summary --forceExit src/clarisa/clarisa-projects` → `Test Suites: 3 passed · Tests: 34 passed`
  - `npx eslint "src/clarisa/**/*.ts" --quiet` → exit 0
  - `npx tsc --noEmit -p tsconfig.json` → exit 0
- Evidence re-run (Leader inline, non-author): Jest gave 3 suites, 34 tests passed; `tsc` exit 0. **VERIFIED**.
- Reviewer: **PASS**.
  - The result filter matches `has_bilateral` (`repository.ts:117-121`) clause by clause, NULL-status handling included.
  - Branch (a) uses roles `[1, 2]`. Branch (b) uses statuses `[1, 4]` and types `['contribution', 'primary']`.
  - The bind order lines up.
  - `getPortfolioProjectFacts` and its pins are unchanged (additions only).
- Runtime events: none.

- Not Done / Assumptions (verbatim from the Implementer):
  - **P-12 is not settled.** Nobody has run the SQL or EXPLAIN on a real MySQL. The spec pins the clauses and binds, not execution. POC-T-2 should stay `[~]` until the user runs section 3 on staging and reports the plan and timing, plus the check (b) result.
  - Judgment call: the three constants are module-private in the repository file, with comments citing the spec (roles `[1, 2]`, statuses `[1, 4]`, types from `RequestTypeEnum`). The only new import is `RequestTypeEnum` from the `share-result-request` entity; `tsc` and Jest show no circular-import problem.
  - Judgment call: I filter out null or blank `official_code` in both branches and do not filter on `clarisa_initiatives.active`. The spec says only "trimmed", and the service keeps only codes in the seed (Scenario 4.6).
  - Judgment call: the per-branch spec assertions split the squashed SQL on ` UNION `, which depends on the branch order (role first, request second).
  - The two files are CRLF on disk (git normalises to LF), and I preserved that.
- Leader action on Not Done: the blocker is the HITL step the task itself names (user-owned). The task stays `[~]`. The staging SQL (a) and the agreement check (b) were handed to the user on 2026-11-20.
- spawns: implementer 66 calls, 194703 tokens, ended partial (P-12 owed to HITL); reviewer 10 calls, 74753 tokens, ended complete.
- ADVISORY (Reviewer, 4R, non-gating):
  - RISK: only the SQL text is pinned; MySQL execution, including array expansion in `IN (?)`, is unproven until P-12. The same pattern already works for `APPROVED_MAPPING_STATUSES` in this file.
  - READABILITY: the spec splits on `' UNION '` and assumes the role branch comes first. A short comment would help.
  - READABILITY: `SELECT DISTINCT` inside each branch is redundant under `UNION`. Harmless.
  - RELIABILITY: `String(null).trim()` would return `'null'`, but the SQL already filters out NULL codes.
- Decisions: none beyond the Implementer's judgment calls, which the Reviewer accepted.
- Issues encountered: the M07 false green (substring masking). The Implementer found and fixed it before reporting.
- Pending HITL (P-12): the staging `EXPLAIN` plan, the row count and time of (a), and the row count of (b), which must be 0. If either table shows a full scan not bound to the version, or (a) takes more than ~2 s, use the Pivot Protocol before T-3. If (b) returns rows, the disqualifier fires: stop and re-specify.

**Running totals (budget tripwire):** tasks 2 of 5 (1 `[x]`, 1 `[~]`) · LOC +257/−1 · review rounds 2 (budget 6, tripwire 9). Within budget.
