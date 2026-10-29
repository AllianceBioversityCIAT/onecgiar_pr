# Execution — QA intake (`quality-assurance/qa-intake`)

## Document Control

| Field | Value |
|---|---|
| Spec | `quality-assurance/qa-intake` |
| Ticket | P2-4040 |
| Branch | `JuanGuzman-io/p2-4040-qa-intake` (base `7537b0fd1`) |
| Approval Mode | gated |
| Leader | Claude Code session, Opus 5.5 (T1) |
| Implementer / Reviewer | `akili-implementer` / `akili-reviewer` wrappers (Step 8E) |
| Started | 2026-10-29 |
| Budget (design §13) | 7 tasks · ~1 600 LOC · 10 review rounds |

## Pending shared-file items

_(none yet; QIN-T-6 adds the TRD §7 row)_

## Pivot Record: QIN-T-5

- **Date:** 2026-10-29
- **Trigger:** The QIN-T-5 Implementer (attempt 1) reached checkpoint 1 at step 1 and settled P-13. It wrote no code.
- **Finding:** P-13 is false. The server's 409 reaches the client, but the user never sees its `message`:
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/components/unsubmit-modal/unsubmit-modal.component.ts:33-36` ignores `err`. It shows `{id:'unsubmodalerror', title:'Error in unsubmitted', description:'', status:'error'}`.
  - `onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/components/ipsr-unsubmit-modal/ipsr-unsubmit-modal.component.ts:28-31` behaves the same way.
  - `general-interceptor.service.ts:69-71,82-84` only rethrows the error.
  - `unsubmit-modal.component.spec.ts:94-114` pins `description: ''`.
- **Impact:** The server alone cannot meet the "clear message" clause of QIN-R-6.
- **Alternatives presented:**
  1. Widen QIN-T-5 to the client.
  2. A new client task, QIN-T-8.
  3. Leave the client out of the spec and amend R-6.
- **Decision:** (1) Widen QIN-T-5 to the client. The owner chose it on 2026-10-29 through AskUserQuestion.
- **Spec amendments:**
  - `design.md` §8: client change described.
  - `design.md` §11: P-13 and P-14 rows settled; summary line updated.
  - `requirements.md` §3 Out of scope: UI exception for the unsubmit modals.
  - `tasks.md` QIN-T-5: Type, Description, Implements, Files, falsifier (e), Red run, Consumers, DoD.
- **Sweep:**
  - Forward: `grep -n "P-13\|UI change\|Frontend\|client\|UNVERIFIED"` over the spec folder. `proposal.md` lines 48 and 67 ("no client change") are left untouched, because they are the historical proposal.
  - Backward: `requirements.md:61` (out of scope, "Any UI change") was amended.
  - `requirements.md:18` ("`docs/ux-ui/design.md`: n/a, no UI") is kept, because the change is error copy and not a new UI surface.
- **ADR affected:** none.

## Task Execution History

### QIN-T-5 — Unsubmit guard (Reporting and IPSR) — PASS (2026-10-29)

- **Final status:** PASS. 1 attempt with 2 spawns: a checkpoint, then a respawn after the pivot.
- **Attempt 1, spawn 1:** `STATUS: CHECKPOINT`. The brief's hard rule stopped it on P-13, and the checkpoint carried a Pivot flag. It changed no files.
- **Attempt 1, spawn 2** (effort high; the respawn after the approved pivot, checkpoint 1)
  - **Files:**
    - `onecgiar-pr-server/src/api/results/result.repository.ts`: new `unsubmitUnlessUnderQaReview`, the §7.5 SQL. It returns `affectedRows`.
    - `onecgiar-pr-server/src/api/results/submissions/submissions.service.ts`: the guard in `unsubmitFunction` and `unsubmitFunctionIPSR`, and the `UNSUBMIT_UNDER_QA_REVIEW_MESSAGE` constant.
    - `onecgiar-pr-server/src/api/results/submissions/submissions.service.spec.ts`: new, 11 tests.
    - Client: `unsubmit-modal.component.ts` and its spec; `ipsr-unsubmit-modal.component.ts` and its spec.
  - **Red runs (quoted by the Implementer):**
    - Server (a): expected `status: 409` with the QA-review message, received `status: 200` with "the result has been unsubmitted successfully".
    - Client: `- "description": "error message" / + "description": ""` and the IPSR equivalent, `Tests: 2 failed, 6 passed`.
  - **Falsifiers (mutation → red):**
    - Guard off on the IPSR path only → only IPSR (a) fails, 1 failed.
    - Guard off on the Reporting path only → only Reporting (a) fails.
    - WHERE guard removed → (a) and (d) fail on both paths, 4 failed.
    - Phase ignored → (b) and (d) fail on both paths.
    - Either component reverted to `''` → its modal spec fails.
    - (c) asserts the `Submission` fields and the SQL params, and it was red before the code.
  - **Implementer verification:**
    - Server Jest (submissions and result.repository): 4 suites, 134 tests.
    - `tsc`: 0. eslint: clean.
    - Client modal specs: green. `ng lint`: clean.
    - No cypress pin.
  - **Evidence re-run (Leader inline): VERIFIED.**
    - Server: 4 suites, 134 passed; `tsc` 0.
    - Client (`npx jest` over both modal folders): 3 suites, 9 passed.
  - **Reviewer: PASS** (lens checklist, high).
    - The SQL matches §7.5.
    - The guard runs after the role, not-found and justification checks and before `submission.save` and `findInnovationDetail`.
    - The 409 reaches the client through `ResponseInterceptor` (`Return-data.interceptor.ts:30,46`).
    - The client matches amended §8.
    - The change of the success `response` to `{affected}` has no consumer.
    - The disqualifier does not apply: the fake DB evaluates the received WHERE clause, and (d) asserts the SQL text.
- **ADVISORY (4R, recorded, does not gate):**
  - **RISK, `last_updated_date`.** The old `repository.update` added `last_updated_date` through `@UpdateDateColumn`, and the raw UPDATE does not. **Leader settled it from migration evidence:** `src/migrations/1664395287550-addingStatusColumn.ts:17` defines `result.last_updated_date` as `timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`, the latest migration that alters that column. The DB bumps it on a real change, so R-6 holds. It has not been checked against the live DB (`SHOW CREATE TABLE result`).
  - **RELIABILITY (pre-existing):** the role check reads `result.id` before the `!result` check, so an unknown id gives a 500 instead of a 404. Out of scope.
  - **RISK:** the modals now show any server `message` on any error status. Someone should check that `returnErrorRes` never puts driver or SQL text into `message`.
  - **RESILIENCE:** IPSR unsubmit is still non-transactional (P-9). Unchanged.
  - **READABILITY:** the spec's `Function(...)` fake handles only `= / AND / NOT`. It should carry a comment saying so.
- **Not Done / Assumptions (verbatim summary, no owed item):**
  - The worktree's client `environment*.ts` was copied from `/Users/jguzman/GitHub/CGIAR/onecgiar_pr/`. It is untracked.
  - `npm ci --ignore-scripts` was run in the client.
  - `node_modules/canvas` was moved to the session scratchpad because jsdom failed to load it. This is in ignored files only.
  - `affectedRows` counts matched rows, because mysql2's default flags include FOUND_ROWS. The real-DB behavior is left to QIN-T-7 step 3.
  - The success `response` is now `{affected}`.
  - `package-lock.json` was already modified before this task and was not touched.
- **Requirements covered:** QIN-R-6, both scenarios, the "clear message" clause and the unchanged `in_qa = 0` path. QIN-DD-4, DD-5.
- **Decisions:**
  - The Pivot Record above.
  - The new server spec is `submissions.service.spec.ts`, because no such spec existed.
- **Checkpoints:** 1 (the P-13 hard rule and a Pivot flag, not a bound).
- **Spawns:**
  - implementer: not reported by host (19 tool uses, ~120k tokens). Ended: checkpoint.
  - implementer: not reported by host (40 tool uses, ~151k tokens). Ended: complete.
  - reviewer: not reported by host (17 tool uses, ~63k tokens). Ended: pass.
- **Running totals:**
  - 1 of 7 tasks closed.
  - 3 of 10 review rounds.
  - ~240 LOC so far (T-5 ≈ 370 diff lines including tests, T-1 ≈ 80).
  - Within budget.

### QIN-T-1 — Audit entity and migration — in progress

- **Attempt 1 (effort medium)**
  - **Files:**
    - `onecgiar-pr-server/src/api/qa-catalog/entities/result-qa-intake-log.entity.ts` (new)
    - `onecgiar-pr-server/src/migrations/1793282971371-AddResultQaIntakeLog.ts` (new)
    - `onecgiar-pr-server/src/api/qa-catalog/definitions/excluded-tables.ts`
  - **P-14:** it tripped. `qa-catalog.completeness.spec.ts` went red with `"result table result_qa_intake_log is neither in scope.ts nor in excluded-tables.ts"`, and one `excluded-tables.ts` entry fixed it.
  - **Implementer verification:**
    - Jest `src/api/qa-catalog`: 42/42 suites, 910/910 tests.
    - `tsc`: 0. eslint: 0.
    - `migration:check`: `Pending: 1`, because the migration is not applied to the shared DB. Migrations are applied by the owner.
  - **Evidence re-run (Leader inline): VERIFIED.** Jest 42/42 and 910/910, `tsc` 0, eslint 0.
  - **Reviewer: FAIL.** Report copied verbatim:
    > 1. **Discovered Issue:** The `created_date` definition is invalid in MySQL, so the migration will fail with `ER_INVALID_DEFAULT` (1067) when it is applied. The generated column is `timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP`. MySQL requires the default's fractional-seconds precision to match the column's: `TIMESTAMP(6)` needs `CURRENT_TIMESTAMP(6)`. The documented example `TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP` is rejected. The cause is in the entity (`result-qa-intake-log.entity.ts:49-54`). `@CreateDateColumn` defaults to precision 6 with a `CURRENT_TIMESTAMP(6)` default, and the explicit `default: () => 'CURRENT_TIMESTAMP'` replaces that default but leaves precision at 6. In `src/migrations`, this migration is the only one with this mismatch; the other 121 `created_date`-style definitions use either `timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP` or `timestamp(6) ... DEFAULT CURRENT_TIMESTAMP(6)`. None of the recorded evidence could catch this. tsc and eslint don't run SQL, the qa-catalog Jest suite doesn't run the migration, and `migration:check` only counts pending migrations. So the "VERIFIED" verdict covers the entity compiling, not the migration applying.
    >    - **Violated Rule:** `docs/specs/quality-assurance/qa-intake/tasks.md` QIN-T-1 Definition of done ("`npm run migration:check` green", which means the migration must apply) and the "working `down`" item. `onecgiar-pr-server/CLAUDE.md` §5 requires migrations with a working up and down. `design.md` §5 says `created_date` is `timestamp, default CURRENT_TIMESTAMP` (the DB clock). The shipped `timestamp(6)` also differs from the spec's plain `timestamp`.
    >    - **Remediation Suggestion:** Fix the entity first, then regenerate rather than hand-editing the SQL, so the Disqualifier still does not apply. To match §5 literally, add `precision: 0` (or `precision: null`) to the `@CreateDateColumn` options and keep `default: () => 'CURRENT_TIMESTAMP'`. That should generate `timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`, the form most existing tables use. Alternatively, remove the explicit `default` and accept `timestamp(6) ... DEFAULT CURRENT_TIMESTAMP(6)`, which is still the DB clock. Then run `npm_config_name=AddResultQaIntakeLog npm run migration:generate` again, prune it to this table again, and confirm the generated `created_date` definition is consistent. For evidence, run `migration:run` and then `migration:revert` against a disposable local MySQL, not the shared database. That is the only check that proves `up` and `down` actually work. If no disposable database is available, state that gap explicitly in the evidence instead of claiming VERIFIED.
  - **Not Done / Assumptions (verbatim summary):**
    - npm 11 rejects `-- --name=`, so the migration was generated with `npm_config_name=…`.
    - The generator's timestamp `1793282971371` was kept.
    - `excluded-tables.ts` was needed (P-14).
    - `package-lock.json` was already modified before the task and was not touched.
    - None of these is an owed item, so there is no continuation.
  - **Spawns:**
    - implementer: not reported by host (17 tool uses, ~99k tokens). Ended: complete.
    - reviewer: not reported by host (12 tool uses, ~56k tokens). Ended: fail.
- **Attempt 2 (effort high; override (e) rework, so a Reviewer was owed)**
  - **Files:**
    - entity: `created_date` is now a plain `@Column({type:'timestamp', default: () => 'CURRENT_TIMESTAMP'})`, mimicking `result-ip-step-three-evidence.entity.ts:59-62`.
    - The migration was regenerated as `1793283760300-AddResultQaIntakeLog.ts`, and the attempt-1 file `1793282971371-…` was deleted.
    - `excluded-tables.ts` is unchanged.
  - **Generated column:** `` `created_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ``. Up has CREATE TABLE and ADD FK. Down drops the FK, the index and the table.
  - **Implementer verification:**
    - `tsc`: clean.
    - Jest qa-catalog: 42/42 suites, 910/910 tests.
    - eslint: 0.
    - `migration:check`: `Pending: 1 — AddResultQaIntakeLog1793283760300`.
  - **Evidence re-run (Leader inline): VERIFIED.** Jest 42/42 and 910/910, `tsc` 0, eslint 0.
  - **Reviewer: PASS.**
    - The attempt-1 FAIL is fixed.
    - The entity, the migration and the excluded-tables entry conform to §5, DD-6 and P-14 (as amended).
    - The FK `bigint` matches `result.id`.
    - `down` is complete and in the right order.
    - The migration was generated, so the disqualifier does not apply.
  - **Not Done / Assumptions (verbatim summary):**
    - **Owed:** apply and revert against a real MySQL. No disposable DB exists here (no docker, no mysqld), and nothing was run against the shared DB.
    - The raw generator output carried unrelated pre-existing drift, which was pruned.
    - Judgment call: a plain `@Column` was used instead of `precision: 0`.
  - **Spawns:**
    - implementer: not reported by host (14 tool uses, ~94k tokens). Ended: partial.
    - reviewer: Ended: pass.
  - **Status:** `[~]`, held at the gate. The owed apply/revert is environmental, and only the owner, who applies migrations, can clear it. Escalated to the user.
  - **Running totals:**
    - 0 of 7 tasks closed.
    - 2 of 10 review rounds used (T-1 ×2; the T-5 checkpoint adds none).
    - LOC is not tallied yet.
    - Within budget.
  - **Owner decision (2026-10-29):** the owner runs `migration:run` → `migration:revert` → `migration:run` on the dev DB and pastes the output. T-1 closes on `Pending: 0`.
  - **Owner decision, superseding the one above (2026-10-29):** "Hagamos commit y push. Que el pipeline ejecuta la migración y hace sync."
    - The apply check is **deferred** to the deploy pipeline, which applies migrations automatically (root `onecgiar-pr-server/CLAUDE.md` §5).
    - `down` stays unexecuted. It was verified only on its SQL text, by the Reviewer.
    - The DoD item "`migration:check` green" is deferred: it reads `Pending: 1` until the pipeline runs.
- **Final status:** PASS. The apply/revert check is deferred by the owner's decision.
- **Requirements covered:** QIN-R-5 (storage), QIN-DD-6. P-14 is settled.
