# Tasks — Phase replication keeps the lead Centre / lead partner

## 1. Scope

| Field | Value |
|---|---|
| Linked spec | `requirements.md` (VER-R-1..4) + `design.md` |
| Depth | Lite · Bug Mode |
| Branch | `JuanGuzman-io/fix-p2-3228-result` — re-check it before committing (memory `feedback_recheck_branch_before_commit`) |
| Status | done (VER-T-1 shipped; VER-T-2 descoped) |
| Budget | 2 tasks · ~195 LOC · 1 review round (design §13) |

## 2. Pre-flight

- [x] `git branch --show-current` = `JuanGuzman-io/fix-p2-3228-result`, and it contains `origin/performance-refactor`
- [x] Server `.env` present in this worktree if any suite needs it (memory `project_env_file_not_travels_in_merge`)
- [x] Never run the full server suite: always `--testPathPattern` (memory `feedback_run_scoped_tests`)

## 3. Task list

### [x] VER-T-1 — Carry the lead columns in replication, with red-first regression tests

- **Type:** server + tests
- **Description:** Extract the P2-3663 `insertLists` parser into a shared spec helper parameterised by table and alias (DD-3), and switch the P2-3663 block to it. Write the regression tests for the three tables and run them **against unchanged source first** to see them fail. Then add the columns to `insertQuery` and `findQuery` in the three `createQueries` (design §5, DD-2, DD-4).
- **Implements:** VER-R-1, VER-R-2, VER-R-3
- **Files:**
  - `onecgiar-pr-server/src/shared/extendsGlobalDTO/replication-insert-lists.spec-helper.ts` (new)
  - `onecgiar-pr-server/src/api/results/results-centers/results-centers.repository.ts` + `.spec.ts` (new spec)
  - `onecgiar-pr-server/src/api/results/results_by_institutions/result_by_intitutions.repository.ts` + `.spec.ts` (extend)
  - `onecgiar-pr-server/src/api/results/result.repository.ts` + `.spec.ts` (extend the P2-3663 block)
- **Depends on:** — · **Blocks:** VER-T-2 (the script mirrors the same columns)
- **Estimate:** S · **Review:** checklist
- **Skills:** `nestjs-expert`, `tdd`
- **Clause ownership:**

| Clause | Test that owns it |
|---|---|
| S-1.1 THEN new row has `is_leading_result = 1` | `results_center`: `insertQuery` column `is_leading_result` ↔ value `rc.is_leading_result` |
| S-1.1 BUT not change `is_primary` / `is_active` / `center_id` | `results_center`: those three still map to `rc.is_primary`, `rc.is_active`, `rc.center_id` |
| S-1.1 AND IT MUST keep lists aligned | `results_center`: every column equals its value's alias; counts equal |
| S-1.2 non-lead stays non-lead | `results_center`: value is the bare `rc.is_leading_result` — no literal, `COALESCE`, or `CASE` that could promote it |
| VER-R-1 `from_toc`, `from_cgspace` | `results_center`: both map to `rc.from_toc` / `rc.from_cgspace` |
| DD-2 `findQuery` consistent | each table: the added columns appear in `findQuery` |
| S-2.1 THEN + AND IT MUST aligned | `results_by_institution`: `is_leading_result` ↔ `rbi.is_leading_result`; full alignment |
| S-3.1 THEN | `result`: `is_lead_by_partner` ↔ `r2.is_lead_by_partner` |
| S-3.1 BUT not alter `status_id`, `source`, `creation_method`, `external_*` | `result`: `status_id` ↔ `1 as status_id`, and the six still map to `r2.<col>`; the existing P2-3663 alignment test stays green |
| S-1.1 AND grid shows the Centre | **not ownable here** → Rollout §6 R-1 (HITL) |

- **Verification:**
  1. **Red:** with source unchanged, `cd onecgiar-pr-server && npx jest --testPathPattern="(results-centers|result_by_intitutions|result)\.repository\.spec" --silent` → the new assertions FAIL on the missing columns, and only those.
  2. **Green:** after the fix, the same command passes, along with `npx jest --testPathPattern="versioning|bilateral-versioning" --silent --reporters=summary`.
  3. `npx tsc --noEmit` clean (the entity-built specs are only visible there, per memory `feedback_test_and_lint`); `npx eslint <touched files> --quiet` clean.
- **Input that must make it FAIL:** delete `rc.is_leading_result` from the `SELECT` while keeping the column, or put it one position off. The alignment test must go red. If it stays green, the helper is not parsing the table and the test is not evidence.
- **Disqualifier:** if step 1 is green before the fix, the tests prove nothing: fix the tests, do not proceed. A pass on a suite that ran 0 tests (`Tests: 0`) is not a pass.
- **What this cannot prove:** that MySQL executes the SQL and stores the value → Rollout R-1.
- **Done:** red captured and then green; three repositories carry the columns in both queries; the helper is used by all four blocks; commit `🔧 fix(results-centers) P2-3228: carry lead flags through phase replication`.

### ~~VER-T-2~~ (descoped 2026-09-22: damaged rows exist only on prtest; no repair needed) — Idempotent repair script for already-replicated results

- **Type:** db (script delivered, **not executed** by the agent)
- **Description:** Write `repair-lead-flags.sql` in this spec folder, per design §5: a dry-run `SELECT` with counts first, then three guarded `UPDATE`s (`results_center`, `results_by_institution`, `result.is_lead_by_partner`). Targets are limited to active results whose version has `phase_year = 2026` (VER-OQ-1, resolved 2026-09-22). The source is the immediately previous active version of the same `result_code` by `phase_year` → `version.id`.
- **Implements:** VER-R-4
- **Files:** `docs/specs/bugfix/p2-3228-lead-center-replication/repair-lead-flags.sql`
- **Depends on:** VER-T-1 · **Estimate:** S · **Review:** full (data write)
- **Skills:** `systematic-debugging` (source-row matching)
- **Clause ownership:**

| Clause | Where it lives |
|---|---|
| S-4.1 THEN sets the flag from the previous version | `UPDATE` join: same `result_code`, previous version, same `center_id` / (`institutions_id`, `institution_roles_id`) |
| S-4.1 BUT never touch a version that already has a lead | `NOT EXISTS` an active lead row on the new version, in every `UPDATE` |
| S-4.1 AND IT MUST be idempotent | Consequence of the guard; verified by the 2nd dry-run returning 0 |
| S-4.1 AND IT MUST ship a dry-run | First block of the file: `SELECT` + counts, before any `UPDATE` |
| S-4.1 AND IT MUST NOT be run by the agent | Header comment + handoff; the agent only writes the file |

- **Verification (by review; no DB in reach):** the dry-run and the `UPDATE` share the exact same predicates. Tracing 9073 by hand, the script targets result 12026 / `CENTER-02` and not 11545, which is inactive.
- **Input that must make it FAIL:** a new version whose lead was changed to another Centre must appear in **no** dry-run row. If the predicate would list it, the guard is wrong.
- **Disqualifier:** if the dry-run on prtest lists a row whose source and target versions have the same `phase_year`, VER-P-5 is refuted: stop before the `UPDATE`.
- **Done:** file written; Juan David has the run order (dry-run → review → `UPDATE` → dry-run = 0).

## 4. Dependency graph

`VER-T-1 → VER-T-2`. No cycles.

## 5. Test plan

| Defect class (req §8) | Owner |
|---|---|
| D1 presence, D2 alignment, D3 regression | VER-T-1 |
| D4 SQL runs / data right in env | Rollout R-1 (HITL) |
| D5 repair overwrite / mismatch | VER-T-2 review + Rollout R-2 |
| D6 types / lint | VER-T-1 step 3 |

## 6. Rollout & verification

| # | Step | Owner |
|---|---|---|
| R-1 | After merge to the prtest branch (deploy is automatic; allow for its delay), roll a 2025 result with a lead Centre into 2026: `results_center.is_leading_result = 1` on the copy, and the Results Center grid shows the Centre | QA (Cristian) / Juan David |
| ~~R-2~~ | Descoped (prtest-only data). ~~Run `repair-lead-flags.sql`: dry-run → review → `UPDATE` → dry-run again = 0. Confirm 9073's 2026 row shows the Centre | Juan David |

## 7. Follow-ups (not in this spec)

- VER-OQ-2: 9073 has two 2026 versions (11545 inactive, 12026 active). Check whether the flow can duplicate.
- VER-OQ-3: confirm on reload that the 2026 detail shows no Lead center before the repair.

## 8. Roll-back

Revert the VER-T-1 commit. The repair only sets flags that were `NULL`. Its dry-run output, saved before running, lists exactly those rows, so a reverse `UPDATE` can be written from it.
