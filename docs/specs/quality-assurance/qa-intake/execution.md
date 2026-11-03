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

- **TRD §7 (QIN-T-6, 2026-10-29):** add a row for the QA write surface:
  - `POST /api/qa/results/intake` and `POST /api/qa/results/release`, behind the CLARISA key guard (`x-api-key`) and excluded from the JWT middleware;
  - the write boundary: `result.in_qa`, `result.status_id` 3→2 for `qaed` only, and `result_qa_intake_log`;
  - the unsubmit guard (409 while In QA in an open phase).

  Apply it on the apply-capable branch (`staging`), not on this spec branch.

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

### QIN-T-2 — Intake service and repository — PASS (2026-10-29)

- **Final status:** PASS on attempt 1 (effort high). Parallel lens reviewers covered correctness and security.
- **Files** (all under `onecgiar-pr-server/src/api/qa-catalog/`):
  - `qa-results.repository.ts`: `classify(ids, phaseYear, executor = this.dataSource)`, plus a `QaQueryExecutor` type.
  - `qa-results.repository.spec.ts`
  - New: `qa-intake.constants.ts`, `qa-intake.repository.ts`, `qa-intake.repository.spec.ts`, `qa-intake.service.ts`, `qa-intake.service.spec.ts` and `dto/qa-intake-response.dto.ts` (types only).
- **Disqualifier route for (a):** an in-memory fixture runner plus the **real** `classify` code, which is not stubbed. The runner applies the statement effects and has a real staged-commit transaction boundary. SQL-text assertions back it up.
- **Falsifiers (mutation → red, quoted by the Implementer):**
  - (a) Updating every eligible id → 500, because the CAS matches 1 of 2 rows. With the assertion also off, the UPDATE params are `[1]` vs `+ 2`.
  - (b) `markInQa` on `dataSource` → committed `- "in_qa": 0 / + "in_qa": 1`, so the UPDATE survived the rollback. The "every statement runs on the manager" test also fails. The variant that moves only the audit INSERT out of the transaction was argued, not observed.
  - (c) Assertion off → `Received promise resolved instead of rejected`, carrying a lying `changed: true`.
  - (d) `classify` called without `manager` → `Expected: {"query": [Function query]} / Received: undefined`.
  - (e) Ids appended to the log → the log-line regex fails.
- **Implementer verification:** Jest qa-catalog 44 suites, 932 tests. `tsc`: 0. eslint: 0.
- **Consumers:** `qa-results.repository.spec.ts`, `qa-results.service.spec.ts` and `qa-results.details.spec.ts` are green.
- **Evidence re-run (Leader inline): VERIFIED.** Jest 44 suites and 932 tests, `tsc` 0, eslint 0.
- **Reviewer, correctness lens: PASS.**
  - Classify order and reasons follow QRF-R-8 and come out in request order.
  - The changed/unchanged split uses the locked `in_qa`.
  - The snapshot is taken after `FOR UPDATE`.
  - The `affectedRows` assertion is sound whether or not FOUND_ROWS is set, because `in_qa = 0` is in the WHERE clause.
  - The call is idempotent, and the feed default is preserved.
- **Reviewer, security lens: PASS.**
  - Every value is bound as a parameter.
  - The write boundary holds (R-7).
  - The audit row holds the guard's platform and no person or key.
  - Logs carry only the error class name, and the 500 body is fixed.
  - Lock order is `ORDER BY id`.
- **ADVISORY (4R, recorded, does not gate):**
  - RISK: the service accepts any length of `result_ids`. The ≤50 cap depends on the QIN-T-4 DTO; check it there. A second guard in the service is optional.
  - RISK and RESILIENCE: `FOR UPDATE` also locks ineligible and unknown ids. An unknown id above max(id) takes a gap lock that briefly blocks `result` INSERTs. A deadlock or lock timeout returns a generic 500. QIN-T-6 could document that a 500 is safe to retry (the batch is atomic and idempotent).
  - RELIABILITY: a NULL `in_qa` would make the CAS miss and the whole batch return 500. Confirm the column is NOT NULL DEFAULT 0 on prtest and prod with `SHOW CREATE TABLE result` at QIN-T-7.
  - RISK: `error.constructor.name` goes into the log. It is safe today.
  - READABILITY: `QaIntakeTaken.result_code` is non-null only by invariant.
- **Not Done / Assumptions (verbatim summary, no owed item):**
  - `EntityManager.query` returns the OkPacket for an UPDATE (`MysqlQueryRunner.js:144-186`). It was not run on a real DB.
  - The CAS predicate is asserted as text only.
  - All deduped ids are locked.
  - The service also dedupes.
  - The wording of `QA_WRITE_FAILED_MESSAGE` was chosen by the Implementer: "The QA change could not be applied".
- **Requirements covered:** QIN-R-2 (404 and dedupe), R-3, R-5, R-7, R-8, R-9 (intake half). NFR concurrency and observability. DD-2, DD-3, DD-6.
- **Spawns:**
  - implementer: not reported by host (32 tool uses, ~171k tokens). Ended: complete.
  - reviewer, correctness: not reported by host. Ended: pass.
  - reviewer, security: not reported by host (8 tool uses, ~73k tokens). Ended: pass.
- **Running totals:**
  - 3 of 7 tasks closed.
  - 5 of 10 review rounds.
  - ≈ 1 380 diff lines including tests and docs (T-1 ≈ 80, T-5 ≈ 370, T-2 ≈ 930) against the ~1 600 LOC budget.
  - Within budget. The projection crosses the LOC line during QIN-T-3 or T-4, and the tripwire stops there.

### QIN-T-3 — Release service — PASS (2026-10-29)

- **Final status:** PASS on attempt 1 (effort high). Parallel lens reviewers covered correctness and security.
- **Files** (all under `onecgiar-pr-server/src/api/qa-catalog/`):
  - `qa-intake.service.ts`: `release`, `applyRelease`, `releaseReason`, `QaReleaseInput`; `guarded` now takes `route`.
  - `qa-intake.repository.ts`: `lockRowsForRelease`, `releaseQaed`, `releaseNotQaed`, a private `casRelease`.
  - `dto/qa-intake-response.dto.ts`: the release types.
  - `qa-results.repository.ts`: `PHASE_APP_MODULE_IDS` is now exported.
  - New: `qa-release.service.spec.ts` (24 tests), `qa-release.repository.spec.ts` (6 tests).
  - Intake specs: byte-identical.
- **SQL:**
  - `releaseQaed`: `SET status_id = 2, in_qa = 0`.
  - `releaseNotQaed`: `SET in_qa = 0`.
  - Both use `WHERE id IN (…) AND is_active = 1 AND status_id = 3 AND in_qa = 1`.
  - Lock: `SELECT id, in_qa, status_id, EXISTS(version in phase) AS in_phase … ORDER BY id FOR UPDATE`.
- **Falsifiers (mutation → red, quoted by the Implementer):**
  - (a) `not_qaed` also sets `status_id` → `Object { "in_qa": 0, + "status_id": 2 }`.
  - (b) Dropping the service's `not_in_qa` check → the CAS catches it, 500. Dropping the CAS check too → `+ Array [ Object { "outcome": "qaed", "result_id": 3 } ]`.
  - (c) Dropping `not_submitted` → 500 through the CAS.
  - (d) Adding `status = 1` to the SET → the SET-columns whitelist test fails.
  - (e) `qaed` audited as `release_not_qaed` → `- "release_qaed" + "release_not_qaed"`.
- **Implementer verification:** Jest qa-catalog 46 suites, 962 tests. `tsc`, eslint and prettier: OK.
- **Evidence re-run (Leader inline): VERIFIED.** Jest 46 suites and 962 tests, `tsc` 0, eslint 0.
- **Reviewer, correctness lens: PASS.** It ruled on the Implementer's declared gaps:
  1. Only `not_found` comes from `classify`; the other reasons come from the locked row. **Conforming:** the "(from classify)" in §7.3 qualifies only `not_found`, and DD-2's requirement column is R-3.
  2. Intake-only reasons do not block a release. **Conforming:** R-4 names exactly three conditions, and §6 names four reasons.
  3. `is_active = 1` added to the CAS. **Conforming.**
  4. Duplicate ids fail closed (500 and rollback). **Hand-off to QIN-T-4: the 400 for a duplicate `result_id` (R-2).**
  5. The duplicated fixture runner: a readability cost only.

  No spec tension was found.
- **Reviewer, security lens: PASS.**
  - Every value is bound as a parameter.
  - Only `releaseQaed` writes `status_id = 2`, and only under the locked conditions plus the CAS.
  - Phase is enforced by the locked `in_phase` read, which is sound because `version_id` is locked.
  - DD-11 holds.
  - The audit and log output are clean.
  - Only `result` rows are locked.
- **ADVISORY (4R, recorded, does not gate):**
  - RISK: optional defense in depth, an `EXISTS(version in phase)` predicate inside `casRelease`.
  - RESILIENCE: document that `lockRowsForRelease` deliberately does not lock `version`.
  - READABILITY: narrow the `set` type to a literal union, and simplify the tuple loop in `applyRelease`.
  - RELIABILITY: `result_code` is non-null only by invariant.
- **Forward pointer → QIN-T-4:** the DTO must reject a duplicate `result_id` in `items` with 400, and cap both lists at 50. Without that, duplicates become opaque 500s. Raised by both reviewers here and by the T-2 security advisory.
- **Requirements covered:** QIN-R-4 (all three scenarios), R-5, R-7, R-8, R-9 (release half). DD-3, DD-9, DD-11.
- **Spawns:**
  - implementer: not reported by host (28 tool uses, ~174k tokens). Ended: complete.
  - reviewer, correctness: not reported by host. Ended: pass.
  - reviewer, security: not reported by host (7 tool uses, ~73k tokens). Ended: pass.
- **Running totals:**
  - 4 of 7 tasks closed.
  - 7 of 10 review rounds.
  - LOC ≈ 2 530 insertions from `7537b0fd1`: 1 462 committed before T-3, plus T-3's 288 production lines and 777 new spec lines.

## Budget tripwire: QIN-T-3 (2026-10-29)

- **Budget (design §13):** 7 tasks, ~1 600 LOC (≈ 550 production, ≈ 1 050 specs, fixtures and doc), 10 review rounds.
- **Actual after 4 of 7 tasks:** LOC ≈ 2 530, **about 1.6× the budget**, with T-4 and T-6 still to come. Review rounds 7 of 10, with T-4 (security lens, likely 2) and T-6 and T-7 (checklists) still to come, so rounds will also exceed the budget.
- **Cause:**
  - Test volume. The disqualifiers forbid stubbing `classify` and forbid checking only the response, so T-2 and T-3 each built an in-memory SQL fixture runner with a real staged-commit boundary. T-3 duplicated it to keep the intake specs untouched. About 1 450 spec lines came from T-2 and T-3 alone.
  - T-5 grew by the pivot's client change, about 4 files.
  - Production code is close to the ≈ 550 estimate.
- **Action:** the run stops for the owner. No further task starts without approval. This tripwire is never auto-approved.
- **Owner decision (2026-10-29):** "Si", in answer to "¿Seguimos con T-4 aceptando el exceso, o prefieres pausar aquí?". The overrun is accepted, and the run continues with QIN-T-4. Projection at approval: about 3 100 LOC and 11 review rounds at close.

### QIN-T-4 — Routes, DTOs, auth wiring — PASS (2026-10-29)

- **Final status:** PASS on attempt 1 (effort high). One reviewer: the spec gate with a security lens.
- **Files:**
  - New: `onecgiar-pr-server/src/api/qa-catalog/dto/qa-intake.dto.ts` and `dto/qa-release.dto.ts`, each with a spec.
  - Edited: `qa-catalog.controller.ts`, `qa-catalog.module.ts`, `src/app.module.ts`, and the specs `qa-catalog.controller.spec.ts`, `qa-catalog.module.spec.ts`, `src/app.module.spec.ts`.
- **Red run (b), observed at task start:** `app.module.spec.ts › should configure middlewares…`, `toHaveBeenCalledWith` with `- {"path": "api/qa/results/intake"}` and `- {"path": "api/qa/results/release"}` missing.
- **Falsifiers (mutation → red):**
  - (a) Removing `@BilateralClarisaEndpoint` from release → the metadata test on the real method fails, and 8 tests return 401 through the real guard.
  - (b) Removing the exclude entry → `app.module.spec` fails.
  - (c) Adding `approved` to the outcome list → the 400 naming `outcome` fails, in both the DTO and controller specs, and the service is not called.
  - (d) Removing `@ArrayUnique` → the duplicate-id test fails.
  - (e) Removing `@ArrayMaxSize` from either DTO → the 51-entries test fails on both routes.
  - (f) `forbidNonWhitelisted: false` → the platform_id-in-body test fails.
  - (g) Passing `undefined` as the platform → the platform-from-guard test fails.
- **Implementer verification:**
  - Jest (qa-catalog, `app.module.spec`, `shared/guards`): 52 suites, 1028 tests.
  - `tsc`: 0. eslint: 0. prettier: clean.
- **Evidence re-run (Leader inline): VERIFIED.** 52 suites and 1028 tests, `tsc` 0.
- **Reviewer: PASS.**
  - The class-level `@ApiHeader` meets the per-method wording of §7.1, the same as the feed.
  - The throttler skips the routes through the `/api/qa/` prefix and the class-level `@SkipThrottle`.
  - The JWT cannot substitute for the key: the guard reads only `x-api-key`, and a missing decorator fails closed.
  - Intake duplicates count against the 50 cap as sent, which agrees with R-2.
  - The forward pointer from T-2 and T-3 is closed: duplicates in release items return 400, and both lists are capped at 50.
- **ADVISORY (4R, recorded, does not gate):**
  - RELIABILITY: tasks.md lists a spec for `qa-intake-response.dto.ts`, but none exists. The file holds types only, and the controller tests cover its shape. **Accepted gap.**
  - READABILITY: `@ArrayUnique` adds a misleading message when the items are not objects. Cosmetic.
  - RISK: until CLARISA grants the two permission strings, every call returns 401. Tracked in the pre-flight checklist and QIN-T-7.
- **Not Done / Assumptions (verbatim summary, no owed item):**
  - Class-level `@ApiHeader`.
  - `@HttpCode(200)`.
  - No null-platform handling.
  - The docs are T-6.
- **Requirements covered:** QIN-R-1, R-2, R-9 (shape). DD-1, DD-10.
- **Spawns:**
  - implementer: not reported by host (21 tool uses, ~149k tokens). Ended: complete.
  - reviewer: not reported by host. Ended: pass.
- **Running totals:**
  - 5 of 7 tasks closed.
  - 8 of 10 review rounds.
  - LOC ≈ 3 160, an overrun the owner accepted on 2026-10-29.

### QIN-T-6 — Contract documentation — PASS (2026-10-29)

- **Final status:** PASS on attempt 1 (effort low). Override (a) applies, because the QA team executes against this contract, so a Reviewer was owed.
- **Files:** `onecgiar-pr-server/docs/qa-catalog.en.md`: a new "Intake and release" part (+140 lines) and the v1.28 change-log row.
- **Implementer verification:** a grep check (`scratchpad/chk.sh`, not committed) of 31 items over the new part. The items are every DTO property, every reason, outcome and action, both routes, the table name and the audit columns.
  - Green: `FAIL=0`.
  - Red: removing `not_in_qa` gave `not_in_qa 0 / FAIL=1`. The doc was then restored.
- **Evidence re-run (Leader inline): VERIFIED.** `FAIL=0`.
- **Reviewer: PASS.** Every factual statement matches the code at `d1c3a1fb9`, and the doc follows the code, not the design. The four statements the Implementer flagged were confirmed:
  - request order (`qa-results.repository.ts:204,227`);
  - a repeated release answers `not_in_qa`;
  - `not_in_qa` applies to both outcomes;
  - a closed phase does not block unsubmit (`result.repository.ts:286`).

  The examples contain no keys or real ids.
- **ADVISORY (4R, recorded, does not gate):**
  - The `[advisory-grade]` statement "a 500 changes nothing; repeating is safe" is supported by the code.
  - READABILITY: line 15, "The calls write nothing else", sits awkwardly next to the audit row. Suggested wording: "nothing else on the result; each change also writes one audit row".
  - READABILITY: an unsubmit in a closed phase does not clear `in_qa`, so a later release answers `not_submitted`. One sentence in "Unsubmit while In QA" could explain it.
- **Requirements covered:** QIN-R-10.
- **Spawns:**
  - implementer: not reported by host (14 tool uses, ~113k tokens). Ended: complete.
  - reviewer: not reported by host. Ended: pass.
- **Running totals:**
  - 6 of 7 tasks closed.
  - 9 of 10 review rounds.
  - LOC ≈ 3 300.


---

## Pivot Record — QIN-T-4b added (2026-11-03)

- **Trigger:** 2026-11-03 probe from the Leader of `validate-api-key`, made with the QA test key against CLARISA prod. It returned `valid: true` for every route, including `/zzz/nada` and `/api/bilateral/result/create`. A random key → 401. CLARISA does not refuse a key on a route outside its list. So any valid key, including the bilateral one, passes the guard on `/api/qa/*`, the write routes included.
- **Context:** every PRMS environment validates against CLARISA **prod**, which centralises the logs; `environment: "TEST"` in the response is the key's. The CLARISA team is adding `allowed_endpoints` and `endpoint_allowed` to the response. The request is unchanged, and the contract was supplied by the owner on 2026-11-03.
- **Owner decision (2026-11-03):** Reporting enforces the grant. A protected route requires `endpoint_allowed === true`; otherwise it returns 401. Routes without protection (bilateral) are unchanged.
- **Spec amendment:**
  - new task QIN-T-4b in `tasks.md`;
  - QIN-DD-1 amended there: the guard now also checks the grant on the QA controller.
  - Scope: all 5 `/api/qa/*` routes, protected at class level.
- **Rollout dependency:** until CLARISA **prod** returns `endpoint_allowed`, every `/api/qa/*` call answers 401, in every environment. The guard fails closed by design.

---

## QIN-T-4b — Per-endpoint CLARISA grant on the QA routes

- **Date:** 2026-11-03 · **Mode:** gated (owner order: "tú debes proteger el servicio acá en Reporting")
- **Attempt 1 — Implementer (T2, medium):**
  - Added the optional `allowed_endpoints` / `endpoint_allowed` fields to the interface.
  - Added `@RequireClarisaEndpointGrant()` (new) and applied it at class level on `QaCatalogController`.
  - Guard: `getAllAndOverride([handler, class])`; a required grant with `endpoint_allowed !== true` → 401 with the generic body, before `mis` is set.
  - `qa-catalog.en.md`: auth and 401 rows, plus change-log v1.29.
- **Red run (quoted by the Implementer):** written against the unchanged guard, with the decorator and interface already present:
  ```
  ✕ (b) endpoint_allowed false -> 401 generic body
    expect(received).rejects.toThrow()
    Received promise resolved instead of rejected
    Resolved to value: true
  ```
  (c), (e), the `"true"` string case and (f) also failed; (a), (d) and (g) passed, as expected.
- **Falsifiers after the change:** (a) through (g) and the `"true"` string all PASS through a real `Reflector` and real decorator metadata. (f) with the decorator removed → `Tests: 7 failed, 73 passed, 80 total`; the decorator was then restored.
- **Evidence re-run (Leader, non-author): VERIFIED**
  - `npx jest src/api/bilateral src/api/qa-catalog --maxWorkers=2` → Test Suites 93 passed, Tests 2535 passed.
  - `tsc --noEmit` clean.
- **Reviewer (T3), attempt 1: PASS.** Lenses: security and regression. Fail-closed confirmed; class-level metadata covers all 5 handlers; no change for routes without the metadata; 401 body is generic; the docs match the code; no secrets.
- **Advisories (not gating):**
  - add `BilateralWebhookController` to (g);
  - a separate undecorated class for the unprotected half of (e);
  - assert the 401 body end to end on one QA route.
- **Rollout dependency:** every `/api/qa/*` call is a 401 until CLARISA **prod** returns `endpoint_allowed`.
- **Totals:** 7 tasks closed of 8 · 10 review rounds.
