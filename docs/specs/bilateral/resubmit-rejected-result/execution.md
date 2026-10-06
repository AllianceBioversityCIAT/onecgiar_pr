# Execution — Reporting platforms resubmit a rejected bilateral result through `create`

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/resubmit-rejected-result` |
| Approval Mode | `gated` (from `requirements.md` Document Control) |
| Branch | `qa-development-2026-ss` (base `2587e28b0`) |
| Leader | Claude Code session, Opus 5.5 (T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer` (T2) / `.claude/agents/akili-reviewer` (T3) |
| Budget (design §12) | 7 tasks · ~1,500 LOC · 1 review round for T-1/T-6, 2 for T-3/T-4/T-5 |
| Started | 2026-10-06 |

## 2. Task Execution History

### `RSB-T-1` — History with Science Program, formal enum, and decline fix

| Field | Value |
|---|---|
| Final status | **Reviewer PASS (code) · task `[~]`**: the DoD item owned by the user (migration `up`/`down` on a test DB + Disqualifier checks) is still open |
| Date | 2026-10-06 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `tdd` · `xhigh` (migration + shared entity; `max` not used on the T2 tier) |
| Requirements | `RSB-R-18` (decision + decline), `RSB-R-19`, `RSB-R-20`; `DD-9` |
| Review mode | Parallel lens reviewers (migration surface): A = conformance + reliability/risk, B = conformance + readability/resilience |

**Attempt 1: files changed** (all under `onecgiar-pr-server/src/`):

| File | Change |
|---|---|
| `migrations/1790500000000-ReviewHistoryInitiativeAndResubmit.ts` (new) | `up`: `initiative_id int NULL` + `IDX_result_review_history_initiative` + `FK_result_review_history_initiative` → `clarisa_initiatives(id)`, and `action` set to `ENUM('APPROVE','REJECT','UPDATE','RESUBMIT') NOT NULL`. Each step is existence-guarded. `down`: `RESUBMIT`→`UPDATE`, then the 3-value enum, then drop FK, index and column |
| `api/results/result-review-history/entities/result-review-history.entity.ts` | `ReviewActionEnum` = `APPROVE`/`REJECT`/`UPDATE`/`RESUBMIT`; `initiative_id` + `obj_initiative` (ManyToOne `ClarisaInitiative`) |
| `api/results/result-review-history/result-review-history.repository.ts` + spec | Readout adds `rrh.initiative_id` and `ci.official_code AS initiative_code`, via `LEFT JOIN clarisa_initiatives ci ON ci.id = rrh.initiative_id` |
| `api/results/results.service.ts:4354` + spec | Review decision writes `initiative_id: owner.id` (the guard at :4327 guarantees the owner exists) |
| `api/results/share-result-request/services/primary-program-request.service.ts:987` + spec | Ownerless decline writes `initiative_id: declinedInitiativeId`; doc comment updated to `REJECT` |

**Verification:**

- **Red run** (Implementer), 4 failed / 132 passed. The decline test `expect(savedHistory.action).toBe('REJECT')` received `"REJECTED"`. The decision payload lacked `initiative_id: 9`. The repo SQL lacked `initiative_id`/`initiative_code`/the JOIN. The pre-existing decline test asserted `ReviewActionEnum.REJECT`, so it passed by construction; literal `'REJECT'` assertions were added.
- **Green** (Leader re-run on the final diff, after the Implementer's last title rename): `npx jest --maxWorkers=2 --testPathPattern="primary-program-request.service.spec|result-review-history.repository.spec|results.service.spec|webhook-dispatch" --silent --reporters=summary` gave **6 suites / 160 tests passed**.
- `npm run migration:check` (Implementer): `Pending: 1 — ReviewHistoryInitiativeAndResubmit1790500000000`. This is expected, since agents never apply migrations, and it does not prove `up`/`down`.
- `tsc --noEmit`: no errors in touched files · `eslint` on 8 touched files: clean (Implementer).
- **Consumers grep:**
  - `ReviewActionEnum.UPDATE`: `bilateral-center.service.ts:414,747,2430`, `results.service.ts:5449,5542` (value unchanged).
  - `REJECT`: only `ppr:987`.
  - No `APPROVE` writer.
  - No `'APPROVED'`/`'REJECTED'` literal on this table. The only hits are `result-field-ai-state.entity.ts:30` and `achieved-value-derivation.ts`, both unrelated.

**Reviewer A (conformance + reliability/risk): PASS.** It confirmed that `clarisa_initiatives.id` is a signed int, so the FK type is compatible, and that the original `action` column had no DEFAULT to lose. Appending `RESUBMIT` is metadata-only on MySQL 8. The `down` order (FK, then index, then column) is correct. Webhook equality by name is unaffected (`webhook-dispatch.service.ts:202-204`). Data lost on revert is accepted by design §5/§13.

**Reviewer B (conformance + readability/resilience): PASS.** All three Falsifiers are caught; the JOIN-grain falsifier is proven by structure (a PK join), which is sufficient. The null paths are safe: the owner guard is at :4327, and `declinedInitiativeId` comes from `row.shared_inititiative_id` (ppr:930).

**ADVISORY** (recorded, no rework):

- A · RISK: the FK and index have custom names that the entity does not declare (`foreignKeyConstraintName` / `@Index`). A future `migration:generate` could emit a spurious drop/recreate, so check the next generated migration.
- B · READABILITY: the repo test "returns an entry without a Science Program … with null initiative fields" is tautological (mock in, same rows out).
- B · READABILITY: `obj_initiative` is typed non-null while the column is nullable. The inverse selector `(i) => i.id` should be checked against sibling entities.
- B · RESILIENCE: `results.service.ts:4352` still writes `decision as any`. It only works because `ReviewDecisionEnum` and `ReviewActionEnum` now share values, and an explicit mapping would prevent another silent drift.
- B · READABILITY: the migration comment cites "repo rule 25", an opaque reference.
- A+B · PROCESS: the green run did not match the final diff. This is resolved by the Leader re-run above.

**Not Done / Assumptions** (from the Implementer, verbatim in substance). The migration is not applied. Per the Disqualifier, the user must, on a test DB:

1. Run `SHOW COLUMNS FROM result_review_history LIKE 'action'` and expect `('APPROVE','REJECT','UPDATE')`.
2. Run `SELECT @@GLOBAL.sql_mode;`.
3. Check for rows with `action=''`; under strict mode they would make the `up` `MODIFY` fail.
4. Then run `up`/`down`/`up`.

**Decisions:**

- The Leader sequenced T-1 before T-2 rather than in parallel, to honour the one-test-run-at-a-time rule.
- The Leader's first Reviewer brief carried an unfilled diff placeholder. It was corrected by message with the saved diff path before the review ran, and Reviewer A's PASS cites real diff lines.

**Commit:** none. The user's go-ahead is required (PR 1 = T-1 alone).

**Disqualifier check 1/3 (user, 2026-10-06):** `SELECT @@GLOBAL.sql_mode;` returned `ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`. This is **strict**. Consequence: on this server, today's `PDR-R-4` ownerless decline (writing `'REJECTED'`) fails with a DB error and rolls back. That confirms the `RSB-R-20` defect is live, not hypothetical, and that the `requirements.md` §6 R-20 open question resolves to "fails". Still pending: the `SHOW COLUMNS` enum and the `action=''` count.

**Disqualifier checks 2/3 and 3/3 (user, 2026-10-06, connection `PRTest` / schema `prdb`):**
- `SHOW COLUMNS … LIKE 'action'` returned `enum('APPROVE','REJECT','UPDATE')`, `NOT NULL`, no default. This matches `RSB-P-17`, so the `down` stays as specified.
- `COUNT(*) WHERE action = ''` returned `0`.

**Disqualifier: cleared.** The migration may be applied on PRTest by the user. Still open: the `up`/`down`/`up` run.

**Migration run 1/3 `up` (user, PRTest `prdb`, 2026-10-06): OK.**
- Log: 495 executed in the DB vs 487 in source (8 come from other branches on the shared DB). The last executed migration was `AddPrimaryProgramRequest1790400000000`, and exactly 1 new one was applied.
- Sequence: `ADD initiative_id int NULL`, then `CREATE INDEX IDX_result_review_history_initiative`, then `ADD CONSTRAINT FK_result_review_history_initiative … REFERENCES clarisa_initiatives(id)`, then `MODIFY action ENUM('APPROVE','REJECT','UPDATE','RESUBMIT') NOT NULL`, then the migrations-table insert, then `COMMIT`.
- Every existence guard ran before its DDL, as designed.

**Migration run 2/3 `down` (user, PRTest `prdb`, 2026-10-06): OK.**
- TypeORM chose `ReviewHistoryInitiativeAndResubmit1790500000000` as the last executed migration (496 in the DB), so no other branch's migration was touched.
- Sequence:
  1. `UPDATE … SET action='UPDATE' WHERE action='RESUBMIT'`
  2. `MODIFY action ENUM('APPROVE','REJECT','UPDATE') NOT NULL`
  3. guarded `DROP FOREIGN KEY FK_result_review_history_initiative`
  4. guarded `DROP INDEX IDX_result_review_history_initiative`
  5. guarded `DROP COLUMN initiative_id`
  6. migrations-table delete
  7. `COMMIT`
- This is the design §5 order. The "executed on Sep 27 2026" date in the log is TypeORM deriving it from the class timestamp, not the real run time.

**Migration run 3/3 `up` (user, PRTest `prdb`, 2026-10-06): OK.** `SHOW COLUMNS` afterwards:
- `action`: `enum('APPROVE','REJECT','UPDATE','R…` (the DBeaver cell truncates the fourth value), `NO`, no default.
- `initiative_id`: `int`, `YES`, `MUL`.

This is the design §5 target state. PRTest is left in the `up` state.

**`RSB-T-1` final status: PASS → `[x]`.** All DoD items are closed: Jest scoped green, eslint clean, `migration:check` (1 pending, then applied), and the user's `up`/`down`/`up` on test. No commit yet; it awaits the user's go-ahead (PR 1).

**Commit (user go-ahead, 2026-10-06):** `7f11bdbb2` (PR 1 = T-1 only, 8 files, not pushed).

### `RSB-T-2` — Resolver: Rejected only, immutable type, delegation, and lock

**Pre-flight (Leader, 2026-10-06):**
- `changes/bilateral-create-upsert-by-code`: T-5 is `[~]` but doc-only (the contract doc and Notion), and T-6 is cross-repo/manual. Neither edits `bilateral.service.ts` code, so there is no ordering conflict. Its T-3/T-4 stay superseded per `requirements.md` §10.
- **T-2 Disqualifier** ("`GET_LOCK` not available on Lambda/RDS"): **cleared by probe**. `api/bilateral-ai/services/bilateral-ai-dispatch.service.ts:250` already runs `SELECT GET_LOCK(?, ?)` on a dedicated `QueryRunner` in this stack (`AIQ-T-2`). It is used as the exemplar.

| Field | Value |
|---|---|
| Final status | **PASS → `[x]`** |
| Date | 2026-10-06 |
| Attempts | 1 |
| Skills / effort | `nestjs-expert`, `tdd`, `api-design-principles` · `high` (lock/concurrency on the live create path) |
| Requirements | `RSB-R-2`, `R-6`, `R-7`, `R-10`, `R-11`, `R-22`; NFR Concurrency; `DD-4`, `DD-8` (+ `R-1` regression) |
| Review mode | Lens checklist (single Reviewer) |

**Attempt 1: files changed** (all under `onecgiar-pr-server/src/api/bilateral/`):

- **`bilateral.service.ts`**
  - `ResolvedResultCodeTarget` becomes a union that includes `{operation:'updated', target}`.
  - Open-phase guard order: `assertIsBilateral`, then `assertCallerMayVersion` (403), then `assertNotKnowledgeProduct` (409), then `assertResultCodeStatusIsEditable` (Rejected only, §6 message), then the new `assertSameResultType` (409, §6 message).
  - `create()` delegates an `updated` target to `BilateralResubmissionService.resubmit()`. The no-code and `versioned` paths are unchanged.
  - The dead `not_wired` log label is removed.
- **`services/bilateral-resubmission.service.ts`** (new, plus `describeResultStatus`)
  - A dedicated `QueryRunner` runs `GET_LOCK('rsb:<id>',0)`; if the lock is held, the response is 409 `already being resubmitted`.
  - It then re-reads `status_id` on the same connection: not 7 → 409 naming the code and status; row gone → 404.
  - It then calls `runResubmissionPipeline`. This is the T-3..T-5 placeholder: it issues no SQL and throws the previous "not available yet" 409, so the endpoint behaves as before for Rejected.
  - `RELEASE_LOCK` and `release()` run in `finally`, and their errors are logged and swallowed.
  - One `RSB-R-21` line is logged per refusal.
- **`services/bilateral-resubmission.service.spec.ts`** (new, 13 cases), **`bilateral.service.spec.ts`**, **`bilateral.module.ts`** (provider).
- **UBC consumer:** one test, `rejects an eligible update target … T-3 placeholder`, was replaced by the 8-status table (design §9 Reversion row 2). The Approved-status UBC test is unchanged and green.

**Verification (Implementer):**
- **Red:** the spec first failed to compile (TS2307, TS2554). With a stub, 6 tests failed: status 7 got "not available yet"; statuses 1, 2, 5 and 8 did not name the code; the type mismatch did not 409.
- **Green:**
  - `npx jest --maxWorkers=2 --testPathPattern="api/bilateral/(bilateral.service|services/bilateral-resubmission.service).spec" --silent`: **2 suites / 158 tests passed**.
  - The other bilateral specs (versioning-rules, bilateral-versioning.service, innovation-use-summary): 3 suites / 35 tests passed.
  - `tsc --noEmit`: 0 errors. `eslint` on the 5 touched files: clean.
- The lock is covered only against a fake `QueryRunner`; real `GET_LOCK` semantics are exercised in `RSB-T-7`.

**Reviewer: PASS.** Checks (a) through (g) all pass: no-code untouched; `versioned` untouched; 8-status table with code and name; guard order and HTTP codes per §6; lock on a dedicated connection released in `finally`; no write before a refusal (asserted: no INSERT/UPDATE/DELETE/REPLACE); logs carry no payload or keys. The declared assumptions were accepted: `assertIsBilateral` comes first per §4 step 1, the humanized status follows the R-2 scenario text, and the DI cycle is correctly deferred.

**ADVISORY** (recorded, no rework):
- RISK: an RDS Proxy pinning/multiplexing could break a session-scoped `GET_LOCK`. Leader note: the Disqualifier was probed and cleared by the existing `bilateral-ai-dispatch` usage on the same stack (see pre-flight above), and `RSB-T-7` exercises it for real.
- RELIABILITY: `GET_LOCK` returning `NULL` (an error) is mapped to the 409 "already being resubmitted". It should be a 5xx.
- RELIABILITY: a missing payload `result_type_id` gives "a undefined" in the type 409. Check that DTO validation always fills it.
- READABILITY: the `assertIsBilateral` refusal is a 400 with versioning wording.
- OBSERVABILITY (`R-21`): the accepted outcome line is not logged yet. This belongs to T-5.
- CONTRACT: the success row uses the raw `status`, while §6 expects "pending review". T-5 should use `describeResultStatus`.

**Forward pointers** (to be copied into the briefs named):
- **→ T-3/T-4/T-5:** DI cycle. `BilateralService` injects `BilateralResubmissionService`, and the pipeline needs `bs` writers. Resolve it with `forwardRef` or by passing the writers in through `ResubmissionParams`.
- **→ T-3:** the pipeline replaces `runResubmissionPipeline` (the placeholder that throws "not available yet").
- **→ T-5:** own the `updated` response body (status humanized via `describeResultStatus`), `announcePendingReview`, and the `R-21` accepted log line.
- **→ T-6:** the "not available yet" grep must return 0 once T-5 replaces the placeholder.

**Commit:** none. It belongs to PR 2 (T-2..T-6), so commit when the user says.

### `RSB-T-3` — Resubmission preflight (zero writes before any refusal)

**Runtime event (2026-10-06):** the attempt-1 Implementer was cut off by an API rate limit (HTTP 429, session limit), not by a work FAIL. Its partial changes (bs + spec, 4 handlers + specs, handler interface, module) stayed in the working tree. After the user re-logged in, the **same** Implementer was resumed with its context intact, so this still counts as attempt 1.

**Concurrency note:** the working tree also holds changes from another session that are outside this spec (`onecgiar-pr-client/src/app/shared/components/shell-topbar/*`, `docs/specs/quick/quick-log.md`). They are excluded from this spec's diff, review and commits.

| Field | Value |
|---|---|
| Final status | **PASS → `[x]`** |
| Date | 2026-10-06 |
| Attempts | 1 (interrupted by HTTP 429 and resumed, see above) |
| Skills / effort | `nestjs-expert`, `tdd` · `xhigh` |
| Requirements | `RSB-R-8` (validations), `R-12`, `R-13`, `R-16`; `DD-1`, `DD-2`, `DD-7` (+ `R-1` regression) |
| Review mode | Parallel lens reviewers: A = conformance + reliability/risk, B = conformance + readability/resilience. Both reviewed the cumulative bilateral diff minus the T-2 diff |

**Attempt 1: files changed** (`onecgiar-pr-server/src/api/bilateral/`):
- `services/bilateral-resubmission.service.ts`: `runPreflight`, the `ResubmissionPreflightPort`, and a refusal log line.
- `bilateral.service.ts`:
  - `buildResubmissionPreflightPort`, `preflightGeoFocus`, `findPayloadLeadProjectId`.
  - Shared geo `lookupRegions/Countries/SubnationalAreas`, which `handleRegions/Countries/Subnationals` now also call.
  - `ensureUniqueTitle(..., excludeResultId?)`.
- `handlers/{policy-change,capacity-change,innovation-development,innovation-use}.handler.ts` + `bilateral-result-type-handler.interface.ts`: `resolveAndValidate` extracted verbatim from `afterCreate`, which consumes it.
- Specs: `bilateral.service.spec.ts`, `bilateral-resubmission.service.spec.ts`, and the 4 handler specs.

**DI cycle (forward pointer from T-2): resolved.** `create()` builds the port from its helpers and passes it as `ResubmissionParams.preflight`. There is no `forwardRef` and no module change.

**Preflight order** (as implemented in `runPreflight`):
1. Type MDS gate + handler `resolveAndValidate`
2. geo_focus / scope / region / country / subnational lookups
3. Duplicate evidence
4. `validateTocMappingInitiatives` → `resolveContributingProjects`
5. No primary → 400
6. `isAligned(payloadLead ?? storedLead, primary)` → 400
7. `ensureUniqueTitle(title, versionId, target.id)`

After step 7 the code ends at the T-4/T-5 placeholder 409, which writes nothing.

**Verification (Implementer):**
- **Red:** the handler `resolveAndValidate` specs failed (method missing). A mutation that skipped the country lookup turned the unknown-country and unknown-subnational cases red; the file was restored afterwards.
- **Green:**
  - `--testPathPattern="api/bilateral/(bilateral.service|services/bilateral-resubmission.service).spec|api/bilateral/handlers/"`: **8 suites / 295 tests**.
  - Versioning specs: 2 suites / 28 tests. These ran before a final `eslint --fix`, which only touched formatting.
  - `tsc`: 0 errors in `api/bilateral`. `eslint` on 13 files: clean.
- **17 refusal cases** run through the real `create()`, each asserting zero writer or repository calls and no write SQL. They cover:
  - unknown country, region, subnational area and scope;
  - `geo_focus` missing;
  - invalid `innovation_use_level`;
  - unknown actor type;
  - `policy_stage` missing;
  - unsupported `delivery_method`;
  - unsupported typology;
  - duplicate evidence;
  - SP99 not in CLARISA;
  - unresolvable contributing project;
  - no primary;
  - SP09 not allocated (the message names the SP);
  - another result's title;
  - active year missing.
- **Own title:** passes the preflight (asserted `id: Not(501)`).
- **No-code regression per handler:** same message, raised after the header and section writers, and before the contributing centres. The call order is asserted.

**Reviewer A (conformance + reliability/risk): PASS.**
- Both UBC-T-3 attempt-1 FAILs (R-A #1 geo/evidence, R-B #1 innovation-use) are hoisted.
- Every `throw` after the header was swept. Only `handleTocMapping` DB-fault rethrows remain, which is the risk DD-1 already accepts.
- DD-1 verbatim moves are confirmed.
- The lead rule matches `handleNonPooledProject` and `findLeadProjectId`.

**Reviewer B (conformance + readability/resilience): PASS.**
- The tests genuinely falsify the Falsifier list, and the own-title case can fail.
- The geo helpers mirror the handlers exactly.
- `afterCreate` is unchanged on the no-code path.
- Null paths are handled.

**ADVISORY** (recorded, no rework):
- **A · RISK (escalated to the user as a spec gap, see below):** the DD-7 fallback to the *stored* lead project conflicts with the T-4 reset of `results_by_projects`. `ppr.request()` re-reads the lead after the writers (`findLeadProjectId`, `is_lead DESC, id DESC`), which gives two failure cases:
  - (a) the payload has projects but none is flagged lead: the preflight checks the stored lead, while `request()` sees the newest payload project;
  - (b) the payload has no projects: after the reset there is no lead, so `request()` returns `not_aligned`.

  Either way a validation refusal lands **after** writes, which breaks R-8. B raised the same point.
- **A · RELIABILITY → T-4/T-5:** the user resolution (`findOrCreateUser`, `bs:~1442-1500`) can refuse (400 "User email is required."). It must run before the reset.
- **A · RISK (pre-existing):** in a batch, results created earlier in the same request stay if a later one is refused. That is today's per-result loop behaviour.
- **B · RESILIENCE:** `expectNothingWritten` uses a named list of writers. Suggestion for T-4/T-5: a closed-world fake that throws on any non-read method.
- **B · SPEC TRACE:** the R-12 "single SP project" scenario has no named test. It uses the same mechanism as SP09 (`isAligned` false).
- **B · READABILITY:** `Promise<unknown | null>` reduces to `unknown`. The discarded `ResubmissionPreflightResult` needs a "consumed by T-4" comment. `assertNoDuplicateEvidenceLinks` throws a plain object, as before.

**Forward pointers:**
- **→ T-4:** consume the `ResubmissionPreflightResult`. Resolve users (`findOrCreateUser`) before the reset. Use a closed-world writer fake in the specs.
- **→ T-4/T-5:** the lead-project rule is pending the user's decision on the DD-7 gap.
- **→ T-5:** add a named test for the R-12 single-SP scenario.

**Commit:** none (PR 2).

## Pivot Record: RSB-T-3 (spec gap found in review, decided by the user 2026-10-06)

- **Blocker.** `DD-7` / `RSB-OQ-2` told the preflight to check allocation against the **stored** lead project when the payload names none. Two facts break that:
  - the `RSB-T-4` reset deactivates the stored `results_by_projects` (replace semantics, `R-4`);
  - `ppr.request()` re-reads the lead *after* the writers (`findLeadProjectId`, `is_lead DESC, id DESC`).

  So the check can pass in two cases where `request()` later sees something different: (a) several payload projects with none flagged, where `request()` sees the newest one; (b) no payload projects, where after the reset no lead remains and `request()` returns `not_aligned`. Either way a validation refusal lands after writes, which breaks `RSB-R-8`. Both T-3 Reviewers raised it as ADVISORY.
- **Alternatives** put to the user:
  1. Refuse when the payload yields no lead project.
  2. Skip the projects reset when none is sent.
  3. Make the preflight mimic `findLeadProjectId`.
- **Decision (user):** option 1. The new **`RSB-R-23`** (400 before any write) replaces the stored-lead fallback.
- **Spec amended:**
  - `requirements.md`: `R-23` added, `R-8` refusal list, `OQ-2` resolved, ID index.
  - `design.md`: `DD-7` amended; §6 error row added.
  - `tasks.md`: T-3 step 6 note; T-4 description, Implements and coverage row.
- **Delivery:** in `RSB-T-4`, whose preflight consumption and reset work touch the same code. T-3 stays `[x]` for what it was approved to deliver.
- **Correction closure:**
  - Forward sweep for `storedLead` / "stored lead" / "fall back" / `OQ-2` across the spec folder. The remaining hits are in `proposal.md` `OQ-3` (historical input, superseded by `RSB-OQ-2`) and the struck-through text in `DD-7`.
  - Backward sweep: `R-12` scenarios and the Coverage Closure still hold. Allocation is now checked against the payload lead only, and the "single SP" scenario is unaffected.
- **ADR impact:** none (no TRD ADR covers this).

### `RSB-T-4` — Section reset and replace-safe writers

**Attempt 1** (2026-10-06 · `nestjs-expert`, `tdd` · `xhigh`)

- **Files** (all under `onecgiar-pr-server/src/`):
  - `api/bilateral/services/bilateral-resubmission.service.ts`:
    - preflight with `R-23` and a final `resolveUsers` step; `findStoredLeadProjectId` removed;
    - `ResubmissionPreflightResult` now carries the users;
    - `resetSectionsForResubmission`, not wired into the pipeline yet;
    - `refuseUntilWritersLand` T-5 hook.
  - `api/bilateral/bilateral.service.ts`:
    - `resolveResubmissionUsers`;
    - `persistLeadCenter`/`handleLeadCenter` `{replacePreviousLead}`;
    - `persistContributingCenter` reactivates inactive rows;
    - `handleCountries` `{writeSubnationalsForAllCountries}`.
  - Specs + `shared/test/closed-world.test-helper.ts`, `shared/test/in-memory-db.test-helper.ts`.
- **Verification:**
  - Red by mutation: 5 mutants, 18 tests failed, files restored.
  - Green:
    - 335 tests (bilateral.service, resubmission, handlers);
    - 28 tests (versioning);
    - 262 tests (bilateral-ai + bilateral-center callers);
    - tsc 0 errors; eslint clean.
- **Reviewer B (conformance + readability/resilience): PASS.**
- **Reviewer A (conformance + reliability/risk): FAIL**, verbatim:

  > 1. **Discovered Issue:** reset + `writeSubnationalsForAllCountries` duplicates subnationals on the common resubmission (same country, same subnational S re-sent). The reset deactivates S. Then `handleSubnationals` (bs:6103-6116) runs `bulkUpdateSubnational` and `upsertSubnational` in parallel (`Promise.all`). `upsertSubnational` checks `findOneBy({is_active:true,...})` (repo:123), and that read is issued alongside bulk's FIRST query, while the reactivation is bulk's SECOND query (`upDateActive`, repo:202, which also reactivates inactive rows). So upsert sees no active S → inserts a new S, then bulk reactivates the old S → 2 active S rows. The order is effectively deterministic. Without the reset there is no duplicate (upsert sees S active), so T-4 introduces it. The spec at 1356-1382 is call-level only; the in-memory "reset + real writers" block has no subnational case.
  >    **Violated Rule:** requirements.md RSB-R-4 ("not added a second time"); tasks.md RSB-T-4 Falsifier ("countries with subnationals … → written", under "active rows = {C}, no duplicate").
  >    **Remediation:** under the opt-in flag, await `bulkUpdateSubnational` BEFORE `upsertSubnational` (sequential; the create path stays parallel), OR scope the reset to subnationals of countries the payload drops (bulk is already replace-safe per re-sent country). Add an in-memory test: existing country with S active, reset, resend S → exactly one active S. Mutate back to parallel and confirm it goes red.

- **Leader adjudication:** the FAIL is in scope, because the duplicate is introduced by T-4's own reset. Rework: attempt 2. Effort stays `xhigh`: the T2 tier is never `max`, and the brief flags the hard part instead.

**Attempt 2** (same Implementer, resumed with its context)

- **Fix:** `bilateral.service.ts` `handleSubnationals(..., sequential = false)`. `handleCountries` passes `options?.writeSubnationalsForAllCountries`. When it is set, each country awaits `bulkUpdateSubnational` and then `upsertSubnational`; when it is unset, the original `Promise.all` runs. Create, AI promotion and `ResultCountriesService` never pass the flag, so `R-1` holds.
- **New test:** "SUBNATIONALS: same country, same subnational S re-sent -> exactly ONE active S".
  - It runs the real reset, the real `handleCountries`/`handleSubnationals` and the real `ResultCountrySubnationalRepository` methods.
  - Only `query`/`findOneBy`/`save` are modelled, and each resolves one tick later, so a parallel read can overtake a write.
  - It asserts 0 active rows after the reset and exactly `['S1']` after the writers.
- **Red:** with the sequential branch forced off, the test failed with 1 extra active row; the file was restored.
- **Green:** 8 suites / 336 tests; versioning 2 suites / 28 tests, run after formatting; tsc 0 errors; eslint clean.
- **Reviewer A re-review: PASS.** FAIL #1 is fixed; the reset is untouched and the pipeline still writes nothing.

**Final status: PASS on attempt 2 → `[x]`** (budget: 2 review rounds expected for T-4, 2 used).

**Reset table list** (DoD; also in the JSDoc of `resetSectionsForResubmission`; DRD = `DeleteRecoverDataService.deleteResult`)

The reset runs in one `dataSource.transaction`, as `manager.update(Entity, {..., is_active: true}, {is_active: false, last_updated_by: userId})`. It never deletes.

| Table | How | Source |
|---|---|---|
| `evidence` | all active rows of the result | DRD `evidences.repository.ts:175`; the writer is a plain insert |
| `results_by_projects` | all active rows | not in DRD; `bs.saveResultProject` (~bs:4154) is a plain insert |
| `non_pooled_projetct_budget` | by `result_project_id` In(the result's project ids) | DRD joins the legacy `non_pooled_project`, so it is not reused; bilateral keys on `result_project_id` |
| `results_center` | active rows with `is_leading_result` not true (NULL flags included) | `results-centers.repository.ts:102` also takes the lead, so it is not reused |
| `results_toc_result` + indicators, `result_indicators_targets`, `result_toc_sdg_targets`, `result_toc_impact_area_target`, `result_toc_action_area` | parents by `result_id`, children by parent id, targets via indicator id | `results-toc-results.repository.ts:73`, `:94-135` |
| `share_result_request` | filtered update: every active row except `request_type='primary' AND request_status_id=2` (accepted); `is_active` only (no `last_updated_by` column) | `share-result-request.repository.ts:384` (`logicalDelete` not used, per the Disqualifier) |
| `result_country_subnational` | all rows under every `result_country` of the result | `ResultCountrySubnationalRepository.logicalDelete` (`:224`) joins a non-existent `rc.id`, so it is not reused |
| `results_by_institution`, role PARTNER | only if `payloadSendsPartners` is false | `updateInstitutions` (`result_by_intitutions.repository.ts:403`) replaces them otherwise |
| `result_actors`, `results_by_institution_type` (role 5), `result_ip_measure` | INNOVATION_USE only | `innovation-use.service.ts:399-486` |
| `results_by_inititiative`, role 1 | only if `primaryChanged` | `upsertResultInitiative` (~bs:5602) |

Deliberately not reset: `result_review_history` (`R-18`), `result_initiative_budget`, `result_institutions_budget`.

**Other writer changes:**
- `persistLeadCenter` `{replacePreviousLead}` (opt-in). The demotion sets `is_leading_result=0, is_primary=0, is_active=0`, and a demoted centre that the payload lists as a contributor is reactivated.
- `persistContributingCenter` now reactivates an inactive row (not opt-in; benign on the create path per Reviewer A).
- `handleCountries` `{writeSubnationalsForAllCountries}`.
- **Non-result write:** the preflight `resolveUsers` (`findOrCreateUser`) may create a user row before the placeholder 409. This was approved in the task.

**ADVISORY** (recorded, no rework):
- A · RISK: when `primaryChanged`, the accepted-primary exemption still applies. If that row were active, `ppr.stateFor` would report ACCEPTED for the old owner with role 1 deactivated. P-10 makes this unreachable today; apply the exemption only when `!primaryChanged`.
- A · RELIABILITY gap (a): if partners are sent but none resolve in CLARISA, `handleInstitutions` returns early and the stale PARTNER rows stay. Derive `payloadSendsPartners` from the *resolved* partners, or deactivate unconditionally.
- A gap (b): acceptable, since the DTO requires `lead_center`. An unresolvable lead logs at debug; raise it to warn and cover it in T-7.
- A+B · RESILIENCE gap (c): `persistLeadCenter` swallows errors, so a failed demotion silently leaves zero or two leads. Under `replacePreviousLead`, let the error propagate.
- A · RISK (attempt 2): `upDateActive` reactivates every inactive row with a matching code, including historic duplicates. T-7 should check results that have duplicate subnational history.
- B · the closed-world harness traps only calls on the fake (a `.manager.update()` gives a TypeError, not a recorded violation). Return a recording proxy at any depth.
- B · `in-memory-db` `matches()` over/under-matches numeric, array and nested criteria; it should throw on them.
- B · the "ONE transaction / half-reset" and "idempotent retry" test names claim more than they prove. Add a k-th-update-throws test, or rename.
- B · several `is_lead` flags: the last one wins (it conforms to R-23). Write that rule into design §6 so T-7 tests it.
- B · the reset body is ~160 lines; extract per-section methods if T-5 grows it.

**Forward pointers:**
- **→ T-5 (preconditions when wiring reset → writers):**
  1. Pass `replacePreviousLead` and `writeSubnationalsForAllCountries` to the writers.
  2. Compute `payloadSendsPartners` from the *resolved* partners (gap a).
  3. Under `replacePreviousLead`, `persistLeadCenter` must rethrow, never swallow (gap c), so a failed demotion keeps the result Rejected and retryable (DD-3).
  4. Apply the accepted-primary exemption only when `!primaryChanged`.
  5. Compute `primaryChanged` from the stored owner.
  6. Keep the closed-world harness and strengthen it to record any-depth calls.
- **→ T-7:**
  - duplicate subnational history;
  - an unresolvable `lead_center`;
  - several flagged `is_lead` projects;
  - the row-level partners {A,B}→{C}.

**Commit:** none (PR 2).

### `RSB-T-5` — Orchestration: header, primary, contributors, status flip last

**Pre-flight:** another session (`notifications/bell-read-state`) is active in this checkout, editing the `share-result-request.{service,controller,module}` files, a `-seen` entity, `repositories/` and migration `1790600000000`. T-5 was briefed with a hard boundary (do not touch them; stop if needed). None were touched.

**Attempt 1** (2026-10-06 · `nestjs-expert`, `tdd`, `error-handling-patterns`, `api-design-principles` · `xhigh`)

- **Files** (all under `onecgiar-pr-server/src/`):
  - `api/bilateral/services/bilateral-resubmission.service.ts`: the pipeline, `ResubmissionWritersPort`, `commitResubmission`, and a lock tri-state.
  - `api/bilateral/bilateral.service.ts`: `buildResubmissionWritersPort`, `writeResubmittedResult`, `updateResubmissionHeader`, `countResolvablePartners`, `resolvePartnerInstitutions`. Also `handleTocMapping {suppressPrimaryRole}` and a `persistLeadCenter` rethrow under `replacePreviousLead`.
  - Specs: bs, resubmission, and `primary-program-request.service.spec.ts`. One test was added there; the ppr code is unchanged.
  - `shared/test/closed-world.test-helper.ts` (+ new spec) and `in-memory-db.test-helper.ts`.
- **Pipeline order:**
  1. lock (`GET_LOCK` NULL → 503);
  2. preflight;
  3. stored owner + `countResolvablePartners`;
  4. reset;
  5. writers;
  6. `requestPrimary` if the primary changed or there is no owner (`ok:false` → 503/500, no flip);
  7. `commitResubmission`: CAS 7→5 + RESUBMIT in one transaction (0 rows → 409, no history);
  8. post-commit log + `announcePendingReview` (same owner only).
- **Forward pointers 1–9:** all handled (Reviewer A confirmed).
- **`RSB-P-13`: HOLDS.**
  - `ppr.accept`'s ToC stub is a find-or-create on (`result_id`, `initiative_ids`=new primary, `is_active`) (ppr:782-800).
  - The bilateral ToC writer sets `initiative_ids` (bs:1818/1858).
  - The old-owner ToC clear needs `currentPrimaryId > 0` (ppr:744), and that is 0 on this branch.
  - New test in the ppr spec: "RSB-P-13: accepting finds the ToC row…". No design §13 alternative was needed.
- **Red:** 29/75 failed against the placeholder; the helper spec failed 2/6 with the flat recorder; 8 mutations → 13 red, then restored.
- **Green:** 392 (bilateral 8 suites) · 62 (ppr) · 28 (versioning, after formatting) · 268 (bilateral-ai/center + helper) · tsc 0 · eslint clean · `grep "not available yet"` = 0 across `src`.
- **Process note:** the Implementer once ran two Jest commands at the same time (free RAM ~7 GB, both green). That breaks the one-run-at-a-time rule, and is recorded for kaizen.
- **Reviewer A (conformance + reliability/risk): FAIL**, verbatim in substance:

  > 1. **Discovered Issue:** the declared DATA-LOSS GAP is a spec violation. On the primary-changed or ownerless branch, an innovation-type resubmission returns 200 `updated`, but the lead-program investment is never stored. `saveLeadProgramInvestment` (bs:5772) needs a `results_by_inititiative` row, DD-5 suppresses it, and `accept` creates role 1 without a budget. Severity medium-high: silent, undetectable by the platform, and permanent after accept; every resubmission after an ownerless PDR decline goes this way. The outcome depends on history, because the lookup has no role/`is_active` filter:
  >    - a former role-1 row survives (accept reactivates it);
  >    - with no row, the budget is lost;
  >    - with an accepted role-2 row, the budget lands on it, accept deactivates it (ppr:694), and the budget is lost.
  >
  >    **Violated Rule:** RSB-R-4; RSB-R-14 ("MUST become the result's primary once that SP accepts", and it does so without its investment). It is a DD-5 spec gap.
  >    **Remediation:** the Implementer's fix stays inside the T-5 Disqualifier (accept reactivates a former role-1 row, ppr:719-731; ppr is unchanged). It needs:
  >    - (a) find-or-create one INACTIVE role-1 row for the requested SP carrying the budget;
  >    - (b) do not convert an existing active role-2 row; write a separate inactive role-1 row;
  >    - (c) a test that runs the REAL `accept` and ends with `usd_budget` on the reactivated row;
  >    - (d) a test that a decline leaves no active role 1.
  >
  >    Alternatively, the user accepts the gap and it is recorded in requirements.md §9 / design.md §13.

  **ADVISORY A:**
  - RISK, NFR §7 Atomicity: `requestPrimary` runs outside the commit transaction (manager `undefined`), while DD-5's own signature passes `manager`. A CAS 409 or a commit fault therefore leaves a live PENDING request on a Rejected result that SP06 can accept, and a decline writes a spurious `REJECT`. Fix: run `ppr.request(…, manager)` inside `commitResubmission` before the CAS, and throw on `ok:false`.
  - RELIABILITY: a post-commit `findOne`/`enrichBilateralResultResponse` error can turn a committed resubmission into a 500, and the retry then gets a 409. Catch it, log it, and return the outcome anyway.
  - R-4 consistency: omitted fields are handled inconsistently. `description` and the submitter comment become NULL; lead contact, identity values and the same-owner investment keep their old values. Fix one rule and document it in T-6.
  - RISK, R-15: accepted contributor role-2 rows that the payload dropped are never deactivated (the reset spares role 2). This is not a violation (R-15 says "requests"); note it for T-7.
  - PERF: `countResolvablePartners` repeats the CLARISA lookups. Measure in T-7.

- **Leader:** the data-loss decision was escalated to the user, who is forwarding it to Juan David (options A: inactive role-1 row [recommended], B: accept the loss, C: refuse). Reviewer B is pending.

- **Reviewer B (conformance + readability/resilience): PASS.**
  - Falsifiers (a)–(i) are all present and each one can fail.
  - The pipeline order, the single CAS+RESUBMIT transaction, DD-5/DD-6 and the error mapping match design §6/§9.
  - P-13 is tested (`ppr spec:1011`).
  - No tautologies found.

  **ADVISORY B:**
  - The post-commit `findOne`/`enrich` can turn a committed resubmission into a 5xx; A raised the same point.
  - In the in-memory `transaction()` model, non-manager writes are rolled back too, which MySQL would not do. Flag them as violations.
  - With `writes:true`, `getRepository` returns a plain object, so `.delete()` is not recorded. There is also no `construct` trap.
  - No T-5 test asserts that `world.violations` is empty. Add an `afterEach`.
  - T-4's `matches()` advisory is still open.
  - `ResubmissionWritersPort` mixes reads and side effects; rename or split it.
  - `arrange` is ~260 lines, uses positional `undefined as any` for `ppr`, and the fake `writeResult` reactivates role 1 itself.
  - Snapshot (i) asserts arity, not argument values.
  - CONTRACT for T-6: `updated` returns `"pending review"`, while `created`/`versioned` return `"pending-review"`. Document this.

- **Leader adjudication: scope of attempt 2.** The rework addresses spec violations only:
  1. **Reviewer A FAIL #1, the lead-program investment:** per the decision (pending the answer from Juan David).
  2. **NFR §7 Atomicity**, restated by the Leader as a spec violation. It is backed by `requirements.md` §7 ("status, history and requests either complete together or roll back together") and by DD-5's `ppr.request(…, manager, …)` signature. `requestPrimary` must run inside `commitResubmission`, before the CAS, and `ok:false` must throw so it rolls back.
  3. **Post-commit 5xx on a committed resubmission (A + B):** this violates `RSB-R-17` ("a successful resubmission MUST return `operation:"updated"`…"). Catch, log, and return the outcome row.
  4. **The rest of A+B's ADVISORY:** recorded, not reworked. The harness hardening (`afterEach` violations, recording `getRepository`) is cheap and protects (2) and (3), so attempt 2 may include it as test-only work.

- **Decision on A FAIL #1 (user relayed Juan David Delgado, 2026-10-06): option A**, with two conditions verbatim in substance:
  1. Keep the amount (budget) rows **active**, even though the SP's role-1 row stays inactive. Otherwise, on accept the owner is reactivated but the amount stays hidden.
  2. Also test the case where SP06 **declines**: the inactive row with the amount must not appear anywhere.

  He verified that `accept` finds the SP's row without an `is_active` filter and reactivates it (`primary-program-request.service.ts:718`). Spec amended: `design.md` DD-5 (+ the NFR §7 atomicity line) and the `tasks.md` T-5 amendment.

**Attempt 2** (same Implementer, resumed · `xhigh`)

- **Changes:**
  - `bs.findOrCreatePendingPrimaryRow` (on the ownerless branch, called from `handleTocMapping`): it reuses an existing role-1 row with any `is_active`, otherwise creates ONE `is_active:false` role-1 row. It never converts role 2.
  - `saveLeadProgramInvestment` takes that exact row id, and the budget is saved **active** (JD condition 1).
  - `requestPrimary(manager)` runs inside `commitResubmission` before the CAS; `ok:false` throws 503/500 and rolls back (NFR §7).
  - `create()` catches the post-commit `findOne`/`enrich` errors, logs them without the payload, and still returns `outcomes[]` (`R-17`).
  - Test-only: an `afterEach` asserting empty violations; `getRepository` under `writes:true` is closed-world; the in-memory db gains `not`/`isNull`, update-by-key and save-as-update.
  - `ppr` code is unchanged; no forbidden file was touched.
- **Proofs** use the real writer, the real `ppr.accept`/`decline` and the real bilateral budget reader over in-memory rows:
  - (a) inactive role 1 plus an active budget, invisible while ownerless, with no duplicates on retry;
  - (b) role 2 is not converted, and a former role-1 row is reused;
  - (c) accept reactivates the row and `kind_cash 1500` is read back;
  - (d) decline leaves no active role 1 and an empty budget reader (JD condition 2);
  - atomicity ×4 (via the manager; CAS 0 rows; history fault; `ok:false`);
  - `R-17` ×2.
- **Red:** 3 mutations gave 10 red; the files were restored byte-identical.
- **Green** (one Jest run at a time): 411 (bilateral + helper, 9 suites) · 62 (ppr) · 28 (versioning, after formatting) · 262 (bilateral-ai/center) · tsc 0 · eslint clean · `grep "not available yet"` = 0.
- **Reviewer A re-review: PASS.**
  - FAIL #1 is resolved under the amended DD-5 and both JD conditions.
  - Atomicity and `R-17` conform.
  - The notification exposure (SP code only, never the amount; it already exists with retired owners) is not a T-5 violation, *on condition that* the follow-up names the lines and is linked from the spec. **Done:** `design.md` §13 row "`DD-5` inactive role-1 row vs notifications", listing `notification.service.ts:460/743/910/1412` and `result-tagged-notification.service.ts:322/430`. §13 also records the `sql_mode` item as resolved.
- **Reviewer B re-check: PASS.**
  - Every new test can fail.
  - `transactions===2` catches a request made outside the transaction.
  - The `afterEach` is effective.
  - No regression against (a)–(i).

**ADVISORY** (recorded, no rework):
- A · RISK: several inactive role-1 rows plus a `findOne` with no `ORDER BY` means the row is chosen only by convention. Add `order: {id:'DESC'}` to `findOrCreatePendingPrimaryRow`.
- A · RISK (pre-existing, made likelier by (b)): `upsertResultInitiative` and the default `saveLeadProgramInvestment` lookup filter only `{result_id, initiative_id}`. A later same-owner resubmission could therefore turn a role-2 row into a second active role 1. Filter by role; T-7 checks real rows.
- A · RELIABILITY: the `R-17` fallback returns `response = {}`. The T-6 contract must state that this is acceptable.
- B · honesty: in-memory save-as-update is shared by `insert()`, where MySQL would raise ER_DUP_ENTRY. The update path is logged in neither `inserted` nor `updated`, so it could evade check (g) and the reset's "only `is_active`" test. Restrict it to `save` and log it as an update. Non-PK unique indexes are not modelled.
- B · GAP: the DD-5 rule "must not surface anywhere" is proven only for the bilateral reader. The "replayed filter" assertion in (d) is a tautology. B spot-checked the validation SQL (`results-validation-module.repository.ts:1546-1565`), `results-innovations-dev.repository.ts:486-491` and the replicate INSERT (`result_initiative_budget.repository.ts:89-90`); all filter `rbi.is_active`. About 40 other files touch the table. **The reader audit goes to T-7.**
- B · READABILITY: the third parameter of `commitResubmission` is named `request`; the investment group uses a plain `repositoryOf` and does not assert violations.
- B · RESILIENCE: after a decline, the inactive role-1 row and its ACTIVE budget remain. A later resubmission reuses them, so nothing piles up, but T-7 should check that export/reporting readers never show them.
- Attempt 1 ADVISORY still open: the R-4 omitted-field consistency rule (document it in T-6), the role-2 contributors dropped by the payload (T-7), and the repeated CLARISA lookups (T-7 performance).

**Final status: PASS on attempt 2 → `[x]`.** Budget: 2 review rounds expected, 2 used. The spec was amended in flight twice (`RSB-R-23`, and DD-5 per JD), both user-approved.

**Forward pointers:**
- **→ T-6 (contract doc):**
  1. The `updated` outcome uses `status:"pending review"` while `created`/`versioned` use `"pending-review"`; document both.
  2. On a post-commit read failure (`R-17`) the `response` body can be `{}` while `outcomes[]` is valid.
  3. Retry guidance: a 409 "status is pending review" after a timeout means the earlier attempt committed.
  4. The omitted-field rule (R-4): which fields reset to NULL and which keep their stored value. Document what the code does today.
  5. Error codes: 400 R-13/R-12/R-23, 409 status/type/concurrency, 503 for lock or primary-request failure, 500 for `not_aligned`.
  6. A changed primary results in "hidden until the SP accepts".
- **→ T-7:**
  - the reader audit of `result_initiative_budget` under an inactive parent;
  - the role-2→second-role-1 risk;
  - multiple inactive role-1 rows;
  - duplicate subnational history;
  - an unresolvable `lead_center`;
  - multiple `is_lead` flags;
  - partners {A,B}→{C};
  - role-2 contributors dropped;
  - p95 against a regular create.

### `RSB-T-6` — Contract and specs record what was built

| Field | Value |
|---|---|
| Final status | **PASS → `[x]`** |
| Date | 2026-10-06 |
| Attempts | 1 |
| Skills / effort | `api-design-principles`, `cognitive-doc-design` · `medium` |
| Review mode | Checklist (single Reviewer, doc checked against the code) |

**Files**

- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`:
  - New section "Resubmitting a rejected result" (~499-610). It covers the quick path, a table by status, 11 errors, retrying safely, what is replaced (omitted-field table), primary/contributing SPs, history and known limitations.
  - New change-log row 2026-10-06 (~616).
  - Stale placeholder rows updated: the three-operations row, the rejection row, the outcomes `operation` row and the known-limitations bullet. The 2026-09-30 row's "not live yet … not available yet" clause now reads "Superseded 2026-10-06".
- `docs/specs/changes/bilateral-create-upsert-by-code/requirements.md`: `UBC-R-2` and `UBC-R-9` marked superseded; `UBC-R-5` marked modified ({7} only). History kept.
- `docs/specs/changes/bilateral-create-upsert-by-code/tasks.md`: `UBC-T-3` and `UBC-T-4` headings tagged `[SUPERSEDED by bilateral/resubmit-rejected-result]`.

**Grep (DoD):** `not available yet` returns 0 in the doc and 0 across `onecgiar-pr-server/src`.

**Cross-check (DoD): statement → test.** Test files: RS = `api/bilateral/services/bilateral-resubmission.service.spec.ts`, BS = `api/bilateral/bilateral.service.spec.ts`, VR = `api/bilateral/versioning-rules/bilateral-versioning-rules.service.spec.ts`, RES = `api/results/results.service.spec.ts`.

| Statement | Test (file) |
|---|---|
| Rejected ends in Pending Review; `keep_editing` ignored | "(e) keep_editing: true still ends in Pending Review (5), never Editing" (RS) |
| Statuses 1,2,3,4,5,6,8 → 409 naming code and status | "open-phase status table (RSB-R-2): status %s (%s) -> 409 naming the code and the status; resubmit never called" (BS) |
| Same 409 on the re-read under the lock | "status changed under us to %s -> 409 naming code and …" (RS) |
| 403 other platform · 409 KP · 404 not found | "another platform -> 403 (RSB-R-6)", "a Knowledge Product target -> 409 (RSB-R-7)", "a result_code found in no phase is still a 404 … (RSB-R-10)" (BS) |
| 409 different type, naming both types | "a payload of a different type than the stored one -> 409 … (RSB-R-22)" (BS) |
| Rejected in an earlier phase → version-path 409 | "refuses a result that is %s, not approved" (`rejected` case) (VR) |
| Own title accepted; another result's title refused | "the SAME title as the result itself passes (R-16)" (BS); "a title equal to ANOTHER result (R-16) -> 400 …" (RS) |
| 400 no primary | "no primary Science Program (R-13) -> 400 …", "no primary: %s" (RS) |
| 400 no lead project; a single project is the lead | "no lead project in the payload … -> 400 …" (RS); "RSB-R-23 … several projects, none flagged is_lead -> 400", "a single project is the lead even without the flag" (BS) |
| 400 SP not allocated / unknown to CLARISA | "primary not allocated to the lead project (R-12) -> 400 …", "a primary CLARISA does not know -> the same 400" (RS) |
| R-12 single-SP project | "RSB-R-12 scenario: a project with a single SP" (BS) |
| 409 concurrent | "lock already held -> 409 already being resubmitted …" (RS) |
| 503 lock fault | "GET_LOCK answering NULL (an error) -> 503, NOT the 409 …" (RS) |
| 404 row vanished before the lock | "the row vanished between resolve and lock -> refused …" (RS) |
| 409 CAS "status changed" | "(d) the CAS: … 409, no history row, no announce" (RS) |
| 503 `internal_error` / 500 otherwise; result stays Rejected | "(c) … request() answers %s: 5xx, status still 7, no RESUBMIT row, no announce, lock released" (RS) |
| Every 4xx is raised before any write | "each refusal writes nothing and never reaches a later step" (RS); "create() - resubmission preflight: zero writes before any refusal (RSB-T-3)" (BS) |
| 5xx leaves the result Rejected and retryable; a resend completes | "ORDER: when the primary is requested the result is still Rejected …", "a failed writer … keeps the result Rejected …", "a retry after the failure completes the resubmission" (RS) |
| 409 "pending review" after a timeout means the attempt committed | Inference from the status table (5 → 409) plus the RSB-R-17 test (BS). To be confirmed for real in T-7 |
| The outcome row is authoritative; a read-back failure still returns it | "RSB-R-17: %s throws after the commit -> the `updated` outcome is STILL returned …" (BS) |
| `updated` → "pending review"; `created` → "pending-review" | "returns operation data of the SAME id … humanized status pending review" (RS); "stamps response.outcomes with operation created …" (BS) |
| Description / submitted date / comment cleared when omitted | "a description the payload omits replaces the old one with NULL …" (BS) |
| Header updated in place; id, code, status and creator untouched | "the header is updated IN PLACE: one update of the payload columns, never the status, the id, the code or the creator" (BS) |
| Evidence, projects + budgets, non-lead centres, ToC + children, subnationals deactivated | Reset tests "evidence…", "results_by_projects and their non_pooled_project_budget…", "centres: every active NON-lead row goes … the lead row stays", "ToC: …", "subnationals of every country row…" (RS) |
| Partners replaced; none remain if none are sent or none resolve | "PARTNERS ({A,B} -> {C}) …" (BS); "partners SENT but NONE resolves …", "no partners at all …" (RS) |
| Innovation Use actors, orgs and measures reset | "Innovation Use: actors, organisation types (role 5 only) and measures are deactivated" (RS) |
| Previous lead demoted | "replacePreviousLead: the previous lead (another centre) is demoted and deactivated …" (BS) |
| Innovation Use investment omitted = TBD | "marks an omitted Innovation Use lead program amount as yet to be determined" (BS) |
| Draft/pending/declined requests deactivated; accepted contributors kept | "drafts, pending and declined rounds are deactivated; the ACCEPTED primary … survive", "primary changed: role 1 is deactivated; role 2 (an accepted contributor) is not" (RS) |
| Contributors written as drafts (status 4) | "suppressed: no ACTIVE role 1 … the contributor draft (status 4) is owned by the requested primary" (BS) |
| Same owner: stays owner, announced once after the commit | "(a) same owner … announces ONCE, after the commit" (RS) |
| Changed or no owner: old owner retired, PENDING request, not announced, ownerless | "(b) … deactivates SP01 role 1 and its accepted primary … requests SP06 PENDING, does NOT announce …", "an ownerless result … counts as CHANGED" (RS) |
| Hidden from queues; decisions refused "awaiting the primary…" | "no owner -> same refusal on a REJECT decision too" (RES, PNS-R-2 describe) |
| Accept: becomes owner, investment visible | "(c) the REAL accept reactivates that row and the amount appears" (BS) |
| Decline: Rejected again, REJECT(SP) recorded, can be resubmitted | "(h) … SP06 declines … through the REAL ppr.decline -> Rejected + REJECT(SP06); the same payload resubmits again" (RS) |
| Request, flip and history commit together | "the primary request is part of the final transaction (NFR §7)" (4 tests) (RS) |
| RESUBMIT entry carries the requested primary; 3 cycles in order | "writes the RESUBMIT row with initiative_id = the REQUESTED primary …", "(g) REJECT(SP01), RESUBMIT(SP01), …" (RS) |
| History is never edited | "never touches result_review_history (RSB-R-18)" (RS) |
| Partial data is left on a mid-write fault | "a failed writer … keeps the result Rejected" (RS) |
| Payload validation messages are the same as a regular create | Refusals it.each (geo, evidence, SP codes, projects, type blocks) (BS); the `resolveAndValidate` describes in `handlers/*.handler.spec.ts` |

**Dropped or softened** (behaviour that exists only in code, with no test):
- An omitted `external_reference` is documented as "Not specified here".
- The investment is not documented for the same-owner case when it is omitted on non-Innovation-Use types.
- An omitted `lead_contact_person` is documented as "Stored value kept". The Reviewer noted that only the create-path test backs this (BSs:1790, through the shared `resolveLeadContactColumns`).

**Reviewer: PASS.**
- Every message and HTTP code matches the code word for word: 409 at BS:4689/RS:815, BS:4712, RS:274, RS:444; 404 at RS:810; 503 at RS:268/471; 400 at RS:520/529/541.
- The omitted-field table matches `updateResubmissionHeader` (BS:4930-4946).
- All 12 sampled tests exist and assert what is claimed.
- All 6 T-5 forward pointers are present, and the change is additive (AC-4).
- All five of the Implementer's self-declared limits were accepted.

**ADVISORY:**
- Add a resubmission-writer test for an omitted `lead_contact_person`.
- Word the 500 row as "any non-internal failure (e.g. `not_aligned`)", because RS:472 returns 500 for every reason other than `internal_error`.
- T-7 should confirm that a 409 "pending review" after a timeout really means the earlier attempt committed.

**Commit:** none yet. PR 2 (T-2..T-6) is pending the user's go-ahead.

