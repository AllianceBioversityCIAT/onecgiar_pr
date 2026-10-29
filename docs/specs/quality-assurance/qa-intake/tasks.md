# Tasks — QA intake (`quality-assurance/qa-intake`)

## 1. Scope of this task list

- **Module / feature:** `quality-assurance` / `qa-intake`
- **Linked spec:** `requirements.md` (QIN-R-1..10) + `design.md` (QIN-DD-1..11, Premise Ledger P-1..15)
- **Ticket:** [P2-4040](https://cgiarmel.atlassian.net/browse/P2-4040). Commits use `<emoji> <type>(qa-catalog) [P2-4040]: …`
- **Owner / driver:** Juan David Delgado
- **Status:** not-started — tasks approved 2026-10-29 (Juan David)
- **Budget (design §13):** 7 tasks · ~1 600 LOC · 10 review rounds. This is the tripwire for `/akili-execute`
- **Branch:** `JuanGuzman-io/p2-4040-qa-intake` from `performance-refactor` (not on the feed branch)

## 2. Pre-flight checklist

- [x] `requirements.md` and `design.md` approved (2026-10-29)
- [ ] CLARISA: grant the QA client `/api/qa/results/intake` and `/api/qa/results/release` (before T-7)
- [ ] P-15: owner and QA team confirm that no direct `prdb` writer of `in_qa` or `status_id` exists in prod (before T-7)
- [ ] Copy `onecgiar-pr-server/.env` into the new worktree, and run `npm ci` if `node_modules` is missing

## 3. Task list

### [ ] QIN-T-1 — Audit entity and migration

- **Type:** server (data)
- **Description:**
  - Add the `ResultQaIntakeLog` entity (design §5) under `api/qa-catalog/entities/`, with a FK to `result` and an index on `result_id`.
  - Generate the migration with `npm run migration:generate` and prune it to this table only.
  - Add a working `down`.
  - Settle P-14 first: run the `qa-catalog` suite with the entity present.
- **Implements:** QIN-R-5 (storage) — QIN-DD-6
- **Files (expected):** `entities/result-qa-intake-log.entity.ts`, `src/migrations/<ts>-AddResultQaIntakeLog.ts`, possibly `definitions/excluded-tables.ts` (P-14)
- **Depends on:** —
- **Blocks:** T-2, T-3
- **Estimate:** S
- **Review:** checklist — a pruned migration and the entity, with no logic
- **Verification:**
  - **Falsifier:** leave the generator's unrelated tables in the migration → the review checklist item "touches only `result_qa_intake_log`" fails. Remove `down` → the checklist fails. `npm run migration:check` red on drift.
  - **Red run:** `predicted — greenfield artifact (observed in QIN-T-1)` for the migration check before the migration exists.
  - **Disqualifier:** a migration written by hand instead of generated.
  - **Consumers:** `qa-catalog` scope and excluded-table guards (P-14); `npx jest src/api/qa-catalog`.
- **Definition of done:**
  - [ ] P-14 outcome recorded
  - [ ] `npm run migration:check` green
  - [ ] `npx tsc --noEmit` green
  - [ ] scoped Jest green

### [ ] QIN-T-2 — Intake service and repository

- **Type:** server
- **Description:**
  - `QaIntakeRepository`: `lockRows(ids, manager)` (`SELECT … FOR UPDATE`), `markInQa(ids, manager)` (a batched CAS UPDATE that returns `affectedRows`), and `insertAudit(rows, manager)`.
  - `QaResultsRepository.classify` gains an optional executor (P-1). The feed calls are unchanged.
  - `QaIntakeService.intake(dto, platform)` follows design §7.2:
    1. a catalog 404 when the year has no catalog;
    2. dedupe the ids;
    3. one transaction: lock → classify → changed/unchanged split → CAS UPDATE → assert `affectedRows` → audit INSERT;
    4. one log line;
    5. the generic 500 boundary.
- **Implements:** QIN-R-3, QIN-R-5, QIN-R-7, QIN-R-8, QIN-R-9 (intake half), NFR concurrency/observability — QIN-DD-2, DD-3, DD-6
- **Files (expected):** `qa-intake.repository.ts`, `qa-intake.service.ts`, `qa-intake.constants.ts` (+ specs); `qa-results.repository.ts` (executor parameter)
- **Depends on:** T-1
- **Blocks:** T-4
- **Estimate:** M
- **Review:** lenses — correctness and security (external write path)
- **Verification:**
  - **Falsifier, each case observed red under its mutation:**
    - (a) **Mixed batch:** A eligible with `in_qa` 0, B eligible with `in_qa` 1, C Editing, D unknown → `taken` = [A changed, B unchanged], `not_taken` = [C `not_submitted`, D `not_found`]. Exactly one audit row (A). The UPDATE id list is exactly [A]. A service that updates every eligible id issues an UPDATE for B, and the audit count becomes 2.
    - (b) The audit INSERT throws → the transaction rejects, and the generic 500 has no SQL text. A service that writes outside `manager` leaves the UPDATE applied in the test's call log.
    - (c) `affectedRows` 0 while `changed` has one id (simulating a race) → 500 and rollback. Remove the assertion → 200, with a lying `changed: true`.
    - (d) `classify` is called with the transaction's executor, not the default `dataSource`. Assert the executor identity.
    - (e) The log line contains no id list and no key.
  - **Red run:** `predicted — greenfield artifact (observed in QIN-T-2)`.
  - **Disqualifier:** a test that stubs `classify` to return eligibility proves nothing about DD-2. Case (a) must run the real `classify` SQL on the fixture runner, or assert the SQL text. A mocked transaction that runs its callback without a `manager` boundary proves nothing about (b).
  - **Consumers:** `qa-results.repository.spec.ts` and `qa-results.service.spec.ts` (the `classify` signature); feed `details`.
- **Definition of done:**
  - [ ] Falsifiers (a)–(e) executed, reds quoted
  - [ ] `npx jest src/api/qa-catalog --maxWorkers=2` green
  - [ ] `tsc` and eslint green

### [ ] QIN-T-3 — Release service

- **Type:** server
- **Description:** `QaIntakeService.release(dto, platform)` follows design §7.3:
  - reason order `not_found` → `other_phase` → `not_in_qa` → `not_submitted`;
  - two batched CAS UPDATEs, `qaed` and `not_qaed`, each guarded by `in_qa = 1 AND status_id = 3`;
  - the `affectedRows` assertion, then the audit with `release_qaed` / `release_not_qaed`.
- **Implements:** QIN-R-4 (all three scenarios), QIN-R-5, QIN-R-7, QIN-R-8, QIN-R-9 (release half) — QIN-DD-3, DD-9, DD-11
- **Files (expected):** `qa-intake.service.ts`, `qa-intake.repository.ts` (+ specs)
- **Depends on:** T-2
- **Blocks:** T-4
- **Estimate:** M
- **Review:** lenses — correctness and security (it writes the workflow status)
- **Verification:**
  - **Falsifier:**
    - (a) A `qaed` (In QA, Submitted) → `status_id` 2 and `in_qa` 0 in the UPDATE. B `not_qaed` → only `in_qa` 0, with no `status_id` in its SET. A service that sets `status_id` for both fails on B.
    - (b) C Submitted with `in_qa` 0 and outcome `qaed` → `not_released` with `not_in_qa`, and no UPDATE includes C (requirements scenario *never taken*; DD-11). Drop the `in_qa` check → C gets status 2.
    - (c) D In QA but `status_id` 2 → `not_submitted`.
    - (d) The SET clause never names `status` or any column other than `status_id` and `in_qa`. Assert the SQL text (R-7).
    - (e) Audit actions match the outcomes.
  - **Red run:** `predicted — greenfield artifact (observed in QIN-T-3)`.
  - **Disqualifier:** checking only the response lists without asserting the UPDATE statements and SET clauses.
  - **Consumers:** the readers of `status_id = 2` (design P-7: versioning, ToC KPI coverage, admin panel, AoW, IPSR, delete guard) consume the transition by design. No code change; checked at T-7.
- **Definition of done:**
  - [ ] Falsifiers (a)–(e) executed, reds quoted
  - [ ] scoped Jest, `tsc` and eslint green

### [ ] QIN-T-4 — Routes, DTOs, auth wiring

- **Type:** server
- **Description:**
  - DTOs `QaIntakeDto` and `QaReleaseDto`, validated with `forbidNonWhitelisted`:
    - `phase_year` 2000–2100;
    - ids 1–50, as positive integers;
    - release items unique by id, with `outcome ∈ {qaed, not_qaed}`.
  - The response DTOs.
  - Two controller methods, each with `@BilateralClarisaEndpoint`, its own permission string, `@ExternalPlatform()`, `@ApiOperation` and `@ApiHeader`, and no interceptor.
  - Module providers.
  - `app.module.ts`: add `api/qa/results/intake` and `api/qa/results/release` to the JWT exclude list.
- **Implements:** QIN-R-1, QIN-R-2, QIN-R-9 (shape) — QIN-DD-1, DD-10
- **Files (expected):** `dto/qa-intake.dto.ts`, `dto/qa-release.dto.ts`, `dto/qa-intake-response.dto.ts` (+ spec), `qa-catalog.controller.ts`, `qa-catalog.module.ts` (+ specs), `src/app.module.ts`, `src/app.module.spec.ts`
- **Depends on:** T-2, T-3
- **Blocks:** T-6, T-7
- **Estimate:** M
- **Review:** lenses — security (auth on a write route)
- **Verification:**
  - **Falsifier:**
    - (a) Remove `@BilateralClarisaEndpoint` from either method → the controller metadata test, which reads the real method metadata, fails.
    - (b) Leave `api/qa/results/release` out of the exclude list → `app.module.spec.ts` fails.
    - (c) `outcome: "approved"` → 400 naming `outcome`, and the service is not called.
    - (d) A duplicate id in `items` → 400.
    - (e) 51 ids → 400.
    - (f) An extra property → 400.
    - (g) The platform comes from `@ExternalPlatform()` even when the body carries `platform_id`, which is rejected by (f).
  - **Red run:** (b) on the existing `src/app.module.spec.ts`: add the two expected entries first → a `toHaveBeenCalledWith` mismatch. Observe it at task start and quote it.
  - **Disqualifier:** a 401 test that stubs `canActivate` proves nothing about the decorator.
  - **Consumers:** `src/app.module.spec.ts` (pins the exclude list); `qa-catalog.controller.spec.ts`; `qa-catalog.module.spec.ts`; `throttler-exclude-bilateral.guard.spec.ts` (re-run).
- **Definition of done:**
  - [ ] Falsifiers executed and quoted
  - [ ] Swagger decorators present
  - [ ] `npx jest src/api/qa-catalog src/app.module.spec.ts src/shared/guards --maxWorkers=2` green
  - [ ] `tsc` green

### [x] QIN-T-5 — Unsubmit guard (Reporting and IPSR)

- **Type:** server + client (client added by the pivot of 2026-10-29)
- **Description:**
  - **First step: settle P-13.** Read the client's unsubmit call and error handling and confirm that a `status: 409` message reaches the user. Record the outcome. If it does not reach the user, report it in a checkpoint before widening scope. *(Done 2026-10-29: it does not reach the user. Owner approved the client change of design §8.)*
  - Then, in `unsubmitFunction` and `unsubmitFunctionIPSR`, replace the plain update with the conditional UPDATE of design §7.5:
    - it is evaluated after the role, not-found and justification checks;
    - `affectedRows` 0 → return the 409 refusal before any `submission` save or other IPSR write.
  - **Client (design §8):** in both unsubmit modals, the error callback uses `err?.error?.message` as the alert `description`, falling back to `''`. Update the specs that pin `description: ''`.
- **Implements:** QIN-R-6 (both scenarios, "clear message", and "`in_qa = 0` behaves exactly as today") — QIN-DD-4, DD-5
- **Files (expected):** `src/api/results/submissions/submissions.service.ts` and a new `submissions.service.spec.ts`; possibly `result.repository.ts` (a conditional-update helper); in the client, `unsubmit-modal.component.ts` and `ipsr-unsubmit-modal.component.ts` (+ their specs)
- **Depends on:** —
- **Blocks:** T-7
- **Estimate:** M
- **Review:** full — it changes a user-facing workflow action on two paths
- **Verification:**
  - **Falsifier:**
    - (a) A result with `in_qa` 1 in an open phase → 409, no submission save. Removing the guard from the IPSR path only makes the IPSR case fail. One test per path.
    - (b) `in_qa` 1 in a closed phase (`version.status` 0) → it unsubmits as today. A guard that ignores the phase refuses here.
    - (c) `in_qa` 0 → it unsubmits as today, and the submission row is saved with the same fields.
    - (d) The guard condition is part of the UPDATE's WHERE clause, not a prior SELECT. Assert the SQL text or the update criteria.
    - (e) Client: an error carrying `error.message` → both modals' alert `description` equals that message. One with no message → `''`. Revert either component → its spec fails.
  - **Red run:** (a) on a new `submissions.service.spec.ts` (no such spec exists; the only one is `submissions.service.ip-emails.spec.ts`) with the new test added before the code → an assertion red (expected 409, got 200). (e) on the modal specs updated before the code. Observe both at task start and quote them.
  - **Disqualifier:** a test that mocks `affectedRows` without checking that the WHERE clause carries the guard proves nothing about DD-4.
  - **Consumers:** `submissions.service.ip-emails.spec.ts` (no controller spec exists); `unsubmit-modal.component.spec.ts`, `ipsr-unsubmit-modal.component.spec.ts`; `grep -rn "unsubmit" onecgiar-pr-client/src` for e2e/cypress pins.
- **Definition of done:**
  - [x] P-13 recorded
  - [x] Falsifiers (a)–(e) executed
  - [x] `npx jest src/api/results/submissions --maxWorkers=2` green
  - [x] Client modal specs green (`npx jest <both spec paths> --no-coverage`) and `ng lint` clean on the changed files
  - [x] `tsc` green

### [ ] QIN-T-6 — Contract documentation

- **Type:** docs
- **Description:** In `onecgiar-pr-server/docs/qa-catalog.en.md`, add an "Intake and release" part covering:
  - routes, auth and the two permission strings;
  - limits;
  - request and response shapes;
  - reasons and outcomes;
  - idempotency;
  - the audit;
  - the unsubmit effect;
  - the rule that `qaed` requires a prior intake.

  Add a change-log row. Record the TRD §7 row as a pending item in `execution.md` (shared-file discipline).
- **Implements:** QIN-R-10
- **Files (expected):** `onecgiar-pr-server/docs/qa-catalog.en.md`
- **Depends on:** T-4
- **Blocks:** T-7
- **Estimate:** S
- **Review:** checklist — doc against the shipped DTOs
- **Verification:**
  - **Falsifier:** a grep of every DTO property and reason or outcome constant over the doc returns ≥ 1 hit; removing one from the doc fails that check.
  - **Red run:** n/a (no test gate).
  - **Disqualifier:** a doc written from the design instead of the DTOs.
  - **Consumers:** the QA platform team.
- **Definition of done:**
  - [ ] The grep check passes
  - [ ] Change-log row added

### [ ] QIN-T-7 — Live verification (HITL)

- **Type:** rollout
- **Description:** On the local server against the dev/test DB, then on prtest after merge:
  1. Intake a real mixed batch of 2026 results → compare `in_qa` before and after in SQL. Only the eligible ids changed, plus one audit row each.
  2. Repeat the same call → no change and no new audit rows.
  3. Unsubmit an In-QA 2026 result from the UI → refused with a clear message.
  4. Release `not_qaed` → unsubmit works again.
  5. Release `qaed` on a disposable test result → `status_id` 2. The result shows the QAed state in Reporting, and the badge in `get_qa_info` is no longer "in progress".
  6. **Two-session race (manual):** hold the intake transaction open in session 1 and unsubmit in session 2 → it ends consistent.
  7. Timing p95 for a batch of 50, with at least 5 runs.
  8. 401 without a key.
  9. Revert the test data afterwards.
- **Implements:** QIN-R-3, QIN-R-4, QIN-R-6, NFR (concurrency, performance) — settles P-15 (with the owner)
- **Files (expected):** `execution.md` only
- **Depends on:** T-4, T-5, T-6
- **Blocks:** —
- **Estimate:** M
- **Review:** checklist — evidence quoted, not summarized
- **Verification:**
  - **Falsifier:** any non-eligible id changed, an audit row missing or duplicated, an unsubmit allowed while In QA in an open phase, or a `qaed` without a prior intake fails the task.
  - **Red run:** n/a.
  - **Disqualifier:** timings from a cold first call only, or from fewer than 5 runs. A race check run in a single session.
  - **Consumers:** none.
- **Definition of done:**
  - [ ] Evidence quoted in `execution.md`, with no key or token
  - [ ] Test data reverted
  - [ ] P-15 recorded

## 4. Dependency graph

```
QIN-T-1 ── QIN-T-2 ── QIN-T-3 ── QIN-T-4 ── QIN-T-6 ──┐
                                                     ├── QIN-T-7
QIN-T-5 ─────────────────────────────────────────────┘
```

Parallel-safe: T-5 ∥ T-1..T-4 (different modules).

## 5. Coverage map (scenario / clause → task)

| Requirement clause | Task |
|---|---|
| R-1 401 for missing, wrong or unpermitted key; BUT no row change, no id reveal; JWT not accepted; excluded from JWT, no throttle, no envelope, key not logged | T-4 (+ T-2 log), T-7 (live 401) |
| R-2 `phase_year` required 2000–2100; ids 1–50 deduped (intake); items unique, outcome enum (release); unknown props 400; 404 with no catalog; scenario *unknown outcome* AND write nothing | T-4 (validation), T-2 (404, dedupe) |
| R-3 scenario *Mixed batch* (A changed, B unchanged, C/D reasons; BUT C/D untouched; AND no audit for B); independent of `pgv_in_qa`; idempotent | T-2 (a), T-7 (1, 2) |
| R-4 scenario *QA passes* (status 2, `in_qa` 0, audit) | T-3 (a, e), T-7 (5) |
| R-4 scenario *QA reopens* (`in_qa` 0, status stays 3; AND the program can unsubmit) | T-3 (a), T-7 (4) |
| R-4 scenario *never taken* (`not_in_qa`; BUT status must not change) | T-3 (b) |
| R-4 reasons `not_found`, `other_phase`, `not_submitted` | T-3 (c), T-2 (classify reuse) |
| R-5 one record per change, same atomic unit; no-op records nothing; audit failure → no change; no key or person data | T-2 (a, b), T-3 (e), T-1 (columns) |
| R-6 scenario *pull back under review* (refused; BUT no change, no submission row) | T-5 (a), T-7 (3) |
| R-6 scenario *old flag, closed phase* (unchanged behavior) | T-5 (b) |
| R-6 `in_qa = 0` unchanged | T-5 (c) |
| R-7 only `in_qa`, `status_id` (3→2, `qaed` only) and the audit; never outside the requested year | T-3 (d), T-2 (a: UPDATE id list), T-2/T-3 (classify `other_phase`) |
| R-8 non-per-id failure → generic 500, no SQL in body, nothing changed | T-2 (b, c), T-3 (shared boundary) |
| R-9 every id in exactly one list, request order, echo `phase_year` | T-2 (a), T-3 (a–c), T-4 (response DTO) |
| R-10 doc part + change-log row | T-6 |
| NFR concurrency | T-2 (c, d), T-5 (d), T-7 (6) |
| NFR performance | T-7 (7) |
| NFR observability | T-2 (e) |
| NFR compatibility (feed unchanged) | T-2 (`classify` default executor; feed specs green) |
