# Design — QA intake (`quality-assurance/qa-intake`)

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `quality-assurance/qa-intake` · requirements `QIN-R-1..10` |
| Depth | Full |
| Status | approved 2026-10-29 (Juan David) |
| Ticket | P2-4040 |
| Verified at | `81af2f0ee`; the cited files are unchanged at `bbb15f6eb` (`git diff --stat 81af2f0ee bbb15f6eb` over `api/qa-catalog`, `results/submissions`, `bilateral/guards`, `app.module.ts`, `versioning.utils.ts` → empty) |
| Skills | `nestjs-expert`, `api-design-principles`, `error-handling-patterns` |

## 2. Executive Summary

The two write routes live in the existing `QaCatalogModule`, next to the feed, with the feed's guard and conventions.

**One transaction per call:**
1. Lock the batch's `result` rows with `SELECT … FOR UPDATE`.
2. Classify each id under that lock, reusing the feed's `classify` run on the transaction's own connection.
3. Run one batched conditional UPDATE.
4. Run one batched INSERT into a new audit table, `result_qa_intake_log`.

**The unsubmit guard** becomes a conditional UPDATE: "unsubmit unless In QA in an open phase". MySQL's row lock serializes it with intake and release without making unsubmit transactional.

**What is not written:** `result_qaed_log` (DD-7) and `submission` (DD-8).

## 3. Architecture Overview

```
QA platform ──x-api-key──► ClarisaApiKeyGuard (+ @ExternalPlatform → mis {id,name,acronym})
                               │
          QaCatalogController.intake / .release   (no JWT, no envelope, no throttle)
                               │
                       QaIntakeService  ── one DataSource.transaction(manager)
                               │   1 lock rows (FOR UPDATE)
                               │   2 QaResultsRepository.classify(ids, year, manager)   ← reused
                               │   3 QaIntakeRepository.apply(...)  batched CAS UPDATE
                               │   4 QaIntakeRepository.audit(...)  batched INSERT
Program user ──auth JWT──► SubmissionsController.unsubmit / unsubmit-ipsr
                               │
                       SubmissionsService  → conditional UPDATE (refuse if in_qa=1 ∧ phase open)
```

## 4. Extended Directory Structure

```
onecgiar-pr-server/src/api/qa-catalog/
  qa-intake.service.ts (+ spec)          # new: orchestration, transaction, logging
  qa-intake.repository.ts (+ spec)       # new: lock, CAS update, audit insert
  qa-intake.constants.ts                 # new: actions, outcomes, reasons, batch max
  dto/qa-intake.dto.ts, dto/qa-release.dto.ts, dto/qa-intake-response.dto.ts   # new
  entities/result-qa-intake-log.entity.ts                                      # new
  qa-results.repository.ts               # changed: classify accepts an optional query executor
  qa-catalog.controller.ts / .module.ts  # changed: two routes, two providers
onecgiar-pr-server/src/app.module.ts     # changed: 2 JWT-exclude entries
onecgiar-pr-server/src/api/results/submissions/submissions.service.ts  # changed: guard (both unsubmit paths)
onecgiar-pr-server/src/migrations/<ts>-AddResultQaIntakeLog.ts         # new (generated, pruned)
onecgiar-pr-server/docs/qa-catalog.en.md                               # changed
```

## 5. Data Model

**New table `result_qa_intake_log`** (QIN-R-5). It is append-only and never updated.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK auto | |
| `result_id` | bigint, FK → `result.id` | indexed |
| `action` | varchar(20) | `intake` · `release_qaed` · `release_not_qaed` |
| `phase_year` | int | the request's year |
| `platform_id` | int | CLARISA MIS id, from the guard |
| `platform_acronym` | varchar(50) | from the guard; display only |
| `created_date` | timestamp, default `CURRENT_TIMESTAMP` | DB clock (avoids the Node local-time skew) |

No person and no key is stored. `result` gets no new columns: `in_qa` and `status_id` already exist.

## 6. API Design

| Route | Body | 200 body | Errors |
|---|---|---|---|
| `POST /api/qa/results/intake` | `{ phase_year, result_ids: int[1..50] }` | `{ phase_year, taken: [{result_id, result_code, changed}], not_taken: [{result_id, result_code, reason}] }` | 400 · 401 · 404 (no catalog) · 500 generic |
| `POST /api/qa/results/release` | `{ phase_year, items: [{result_id, outcome: 'qaed'\|'not_qaed'}] (1..50, unique ids) }` | `{ phase_year, released: [{result_id, result_code, outcome}], not_released: [{result_id, result_code, reason}] }` | same |

- **Intake reasons** are the feed's QRF-R-8 set, in the same order: `not_found`, `not_submitted`, `other_phase`, `not_w1w2`, `type_not_catalogued`, `no_lead_program`.
- **Release reasons:** `not_found`, `other_phase`, `not_in_qa`, `not_submitted`.
- **Unsubmit refusal:** the existing response shape of `SubmissionsService` (`{response, message, status}`) with `status: 409` and a fixed message: "This result is under QA review and cannot be unsubmitted until QA releases it."

## 7. Backend Module Design

1. **Controller.**
   - Two methods, each with `@BilateralClarisaEndpoint` (its own permission string), `@ApiOperation`, `@ApiHeader`, and `ValidationPipe({whitelist:true, forbidNonWhitelisted:true, transform:true})`.
   - `@ExternalPlatform()` supplies the caller.
   - No `ResponseInterceptor`.
2. **Service, `intake(dto, platform)`:**
   1. `getCatalog(year)` gives the 404 (feed rule).
   2. Dedupe the ids.
   3. Open `dataSource.transaction(manager)`.
   4. `lockRows(ids, manager)` runs `SELECT id, in_qa FROM result WHERE id IN (…) FOR UPDATE`.
   5. `classify(ids, year, manager)` gives the reasons.
   6. Eligible with `in_qa = 0` → `changed`. Eligible with `in_qa = 1` → `unchanged`.
   7. One `UPDATE result SET in_qa = 1 WHERE id IN (changed) AND is_active = 1 AND status_id = 3 AND in_qa = 0`.
   8. **Assert `affectedRows === changed.length`.** Otherwise throw, and the whole batch rolls back (QIN-R-8).
   9. One INSERT of audit rows for `changed`.
   10. Commit, then log one line.
3. **Service, `release(dto, platform)`:**
   - Same skeleton.
   - Per item: `not_found` (from classify) → `other_phase` → `not_in_qa` → `not_submitted` (`status_id ≠ 3`).
   - Two batched UPDATEs, each with its CAS predicate `AND in_qa = 1 AND status_id = 3`:
     - `qaed` → `SET status_id = 2, in_qa = 0`;
     - `not_qaed` → `SET in_qa = 0`.
   - Same `affectedRows` assertion, then one audit INSERT.
4. **Failure boundary.** `HttpException` passes through. Anything else is logged as `route year write failed (<ErrorClass>)` and becomes the feed's generic `InternalServerErrorException`. No table names or SQL reach the body.
5. **Unsubmit guard** (both `unsubmitFunction` and `unsubmitFunctionIPSR`). The existing `this._resultRepository.update(result.id, {status:0, status_id:1})` is replaced by a conditional UPDATE:
   - `UPDATE result r JOIN version v ON v.id = r.version_id SET r.status = 0, r.status_id = 1 WHERE r.id = ? AND NOT (r.in_qa = 1 AND v.status = 1)`.
   - `affectedRows = 0` → return the 409 refusal **before** the submission row is saved.
   - Role, not-found and justification checks keep their current order. **IPSR unsubmit has extra steps; the guard goes before any of its writes.**

## 8. Frontend / UX

None. The client already shows `inQA` (`api.service.ts:195`). The unsubmit refusal message is rendered by the existing unsubmit error handling. Whether that handling shows a 409's `message` is `UNVERIFIED` (P-13).

## 9. Shared Contracts

- `QaResultsRepository.classify(ids, year, executor?)`: the optional executor defaults to `this.dataSource`. The feed's behavior is unchanged.
- The `ExternalPlatform` decorator and the `ClarisaApiKeyValidationMis` type are imported from `api/bilateral`, as the feed does for the guard.

## 10. Design Decisions

| ID | Decision | Rejected | Why | Req |
|---|---|---|---|---|
| QIN-DD-1 | The routes live in `QaCatalogModule` under `/api/qa/results/*` | A new module | Same guard, the same exclude-list and throttle prefix, and the same `classify`. A new module re-wires all three | R-1 |
| QIN-DD-2 | Eligibility = the feed's `classify`, run on the transaction's connection | A second eligibility query | Intake and feed can never disagree (R-3). `dataSource.query` outside the manager would read outside the lock (P-10) | R-3 |
| QIN-DD-3 | `SELECT … FOR UPDATE`, then a batched CAS UPDATE with an `affectedRows` assertion | Per-id updates · named locks (`GET_LOCK`) | Constant statements per call (NFR). The row lock serializes against unsubmit's UPDATE without making unsubmit transactional. The assertion catches any drift between classify and write | R-3, R-4, R-8, NFR |
| QIN-DD-4 | Unsubmit guard as a conditional UPDATE (CAS), checked through `affectedRows` | Read-then-check-then-update | A read-then-update races with intake. The CAS is evaluated under the row lock that intake holds (P-9) | R-6, NFR |
| QIN-DD-5 | Open phase = `version.status = 1` | `pgv_in_qa` · `is_active` | Owner decision (R-3, "open phase only"). `pgv_in_qa` is excluded by OQ-3. The 2025 versions are active but `status = 0` (P-8) | R-6 |
| QIN-DD-6 | Audit in a new `result_qa_intake_log`, inserted in the same transaction | Reuse `result_qaed_log` · log lines only | Covers all three actions, and stores the platform (not a user) | R-5 |
| QIN-DD-7 | **Do not write `result_qaed_log`** (answers requirements OQ-1) | Make `qaed_user` nullable and write it | 0 rows, no reader in code (P-4), and its `qaed_user` is a NOT NULL FK to `users` that a platform cannot fill. `release_qaed` in DD-6 carries the same fact. **Owner can overrule at this gate** | R-4, R-5 |
| QIN-DD-8 | **Do not write a `submission` row on `qaed`** (answers requirements OQ-2) | Write `status_id = 2` submissions | `submission` records a user's own submit and unsubmit (`user_id`, `comment`). No row with `status_id = 2` exists in test (P-11). The audit table is the record. **Owner can overrule** | R-5 |
| QIN-DD-9 | `qaed` writes `status_id = 2` only. `result.status` stays as is (1 for Submitted) | Also toggle `status` | 3 308 of 3 345 status-2 rows have `status = 1` (P-11), so Submitted's 1 already matches | R-4, R-7 |
| QIN-DD-10 | Batch limit 50, the same as `details` | 200 | Bounds the row lock and the `IN` list; the same mental model for QA | R-2 |
| QIN-DD-11 | Release also requires `in_qa = 1` for `qaed` | Allow `qaed` from any Submitted | Owner rule: QAed is reached only through intake (requirements R-4 scenario). It keeps the audit chain intake → release complete | R-4 |

**Reversion challenge (Step 2.3):** no DD removes delivered behavior. The unsubmit change adds a refusal and keeps every existing check; results with `in_qa = 0` are unaffected (R-6). Not triggered.

## 11. Premise Ledger

Verified 12 · UNVERIFIED 3 (High 1: P-13 · Low 2: P-14, P-15).

Blast-radius triggers fired: **live-path** (the user action unsubmit; QA calls) · **shared-state** (`result.status_id` and `in_qa` are written by several components) · **consumer** (the new `status_id = 2` writes are read by many modules; new response shapes).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | `classify(ids, phaseYear)` returns per-id reasons in the QRF-R-8 order and reads through `this.dataSource.query` | location | `src/api/qa-catalog/qa-results.repository.ts:188` (signature), `:194` (`this.dataSource.query`) | 81af2f0ee | DD-2 needs a different reuse seam — Low | — |
| P-2 | The CLARISA guard puts the caller on the request as `{id, name, acronym}`, readable through `@ExternalPlatform()` | location | `src/api/bilateral/guards/clarisa-api-key.guard.ts:51`; `interfaces/clarisa-api-key-validation.interface.ts:9-11`; `decorators/external-platform.decorator.ts:20`; used at `bilateral.controller.ts:62` | 81af2f0ee | DD-6 has no platform to store — High | — |
| P-3 | No code writes `result.in_qa` | existence | `grep -rnE "in_qa\s*[:=]\|inQA\s*[:=]\|'in_qa'\|\"in_qa\"" onecgiar-pr-server/src` → only `not-for-qa.ts:31` and `result.entity.ts:260` (definitions). Test DB: no trigger or event touches it; the only routine is `get_qa_info` (read), 2026-10-29 | 81af2f0ee | Another writer would race intake — High | — |
| P-4 | `result_qaed_log` has no reader or writer in code and 0 rows in test; `qaed_user` is a NOT NULL FK to `users` | existence | `grep -rn "result_qaed_log\|ResultQaedLog" onecgiar-pr-server/src` (excluding migrations) → entity, relations on `user.entity.ts:117` and `result.entity.ts:668`, `excluded-tables.ts:82`; `result-qaed-log.entity.ts` (`qaed_user` bigint, no `nullable`); test DB `SELECT COUNT(*) FROM result_qaed_log` → 0 | 81af2f0ee | DD-7 flips (it must be written) — Low | — |
| P-5 | Unsubmit has exactly two entry points | live-path | `grep -rniE "unsubmit" src` filtered to route and method declarations → `submissions.controller.ts:46` `@Patch('unsubmit/:resultId')` → `submissions.service.ts:177`; `:59` `@Patch('unsubmit-ipsr/:resultId')` → `:234` | 81af2f0ee | A third path bypasses R-6 — High | — |
| P-6 | Other writers of `result.status_id` (siblings on that state): `unsubmitFunction` (`submissions.service.ts:213-216`), `unsubmitFunctionIPSR` (`:270-273`), the submit flows (`submitFunction` `:58`, `submitFunctionIPSR` `:105`), and bilateral-ai, which moves bilateral results to Editing (`bilateral-ai.service.ts:875-877`; bilateral results are `source ≠ 'Result'`, so never eligible) | shared-state | `grep -rnE "status_id:\s*1\b\|ResultStatusData\.Editing\.value" src` (excluding spec/migrations) → the sites listed; submit at `submissions.service.ts:58,105` | 81af2f0ee | A writer that moves an In-QA result out of Submitted unguarded — Low (release CAS reports `not_submitted`) | — |
| P-7 | Readers of `status_id = 2` treat it as "QA'd/approved", so a QAed write by release is consumed as designed: `versioning.utils.ts:11,29`, `toc-kpi-coverage-status.constant.ts:11`, `result.repository.ts:61,1738,1977,3096,3118`, `ipsr.repository.ts:242`, `linked-results.repository.ts:197`, `admin-panel.repository.ts:100`, `aow-bilateral.repository.ts:978-1275`, `results.service.ts:1239` (delete blocked), `innovation-pathway-step-two.service.ts:80` | consumer | `grep -rnE "status_id\s*(=\|IN\|in)\s*\(?[^)]*\b2\b\|QualityAssessed\.value\|status_id = 2" src` (excluding spec/migrations/qa-catalog/request_status) → 18 hits, all listed | 81af2f0ee | A reader that needs a side effect on QAed (re-index, notify) → an extra task — Low | — |
| P-8 | Open phase = `version.status = 1`. 2026 Reporting and IPSR are 1; 2025 versions are active with `status = 0` | data-env | Test DB `SELECT id, phase_name, phase_year, app_module_id, status, is_active FROM version WHERE phase_year >= 2025 AND is_active = 1` → 31/34 status 0, 36/37 status 1, 2026-10-29 | 81af2f0ee | DD-5 uses the wrong predicate — High | — |
| P-9 | Unsubmit is not transactional: a plain `repository.update`, then `submissionRepository.save` | location | `submissions.service.ts:213-222` (Reporting), `:270-279` (IPSR) | 81af2f0ee | DD-4 must change — Low | — |
| P-10 | Writes and reads must go through the transaction's `manager` to be inside the transaction (the repo pattern) | other | `results.service.ts:4345`, `clarisatask.service.ts:295` use `dataSource.transaction(async (manager) => …)`; the lock-and-recheck exemplar is `primary-program-request.service.ts:616-661` (`pessimistic_write`) | 81af2f0ee | DD-2/DD-3 lose atomicity — High | — |
| P-11 | `submission` has no `status_id = 2` rows. Of 3 345 status-2 results, 3 308 have `status = 1` | data-env | Test DB: `SELECT status_id, COUNT(*) FROM submission WHERE is_active = 1 GROUP BY 1` → null 8 322, 3: 271, 1: 152; `SELECT status_id, status, COUNT(*) … GROUP BY 1,2` → (2,1) 3 308, (2,0) 37, 2026-10-29 | 81af2f0ee | DD-8/DD-9 revisited — Low | — |
| P-12 | `api/qa/results` and `api/qa/results/details` are in the JWT exclude list. The throttler skips `/api/qa/` | location | `src/app.module.ts:155-156`; throttler prefix verified in `qa-results-feed` P-ledger | 81af2f0ee | Routes need extra wiring — Low | — |
| P-13 | The client's unsubmit error path shows a 409 `message` to the user | consumer | `UNVERIFIED — confirm at source before relying on it` | — | Users see a generic error — High (R-6 says "clear message") | QIN-T-5, first step (read the client unsubmit handler; adjust or record) |
| P-14 | A new entity with a FK to `result` does not trip a `qa-catalog` completeness/scope guard | other | `UNVERIFIED — confirm at source before relying on it` | — | One line in `excluded-tables.ts` — Low | QIN-T-1 (run `npx jest src/api/qa-catalog`) |
| P-15 | In prod, no external process writes `in_qa` or `status_id = 2` concurrently (the QA platform writing `prdb` directly) | data-env | `UNVERIFIED — confirm at source before relying on it` (user-stated: Reporting sets `in_qa` manually) | — | Two writers; the audit is incomplete — Low | Owner + QA team, before rollout (QIN-T-7) |

## 12. Rollout & Rollback

- **Order:**
  1. Merge, which deploys automatically, and the pipeline applies the migration.
  2. CLARISA grants the QA client `/api/qa/results/intake` and `/api/qa/results/release`.
  3. QA integrates.
  4. Reporting stops the manual UPDATE.
- **Rollback:** revert the code; the audit table stays, inert. Flags already set stay valid data.

## 13. Budget (tripwire)

| Item | Estimate |
|---|---|
| Tasks | 7 (T-1 entity/migration · T-2 intake · T-3 release · T-4 routes/DTO/auth · T-5 unsubmit guard · T-6 docs · T-7 live HITL) |
| LOC | ~1 600 (≈ 550 production, ≈ 1 050 specs/fixtures/doc; the feed spec ran 4× over a production-only guess) |
| Review rounds | 10 (security lens on T-2..T-5; T-5 estimated at 2) |
