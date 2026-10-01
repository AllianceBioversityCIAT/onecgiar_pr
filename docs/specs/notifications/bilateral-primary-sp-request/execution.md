# Bilateral Primary Science Program Request — Execution Log

## 1. Document Control

| Field | Value |
|---|---|
| **Spec** | `notifications/bilateral-primary-sp-request` |
| **Approval Mode** | gated |
| **Branch** | `qa-development-2026-ss` |
| **Leader** | Claude Opus 5.5 (T1) |
| **Implementer / Reviewer** | `akili-implementer` (T2) / `akili-reviewer` (T3) wrappers |
| **Started** | 2026-09-30 |
| **Budget (design §13)** | 11 tasks · ~1,600–2,000 LOC · 2 review rounds on T-3/T-5, 1 elsewhere |

## 2. Task Execution History

### `PSR-T-1` — Migration + entity: request kind, nullable draft owner, 3 notice types

- **Status:** `[~]`: Reviewer **PASS** on attempt 1. The DB-side verification is still owed by the user.
- **Date:** 2026-09-30
- **Attempts:** 1
- **Skills / effort:** `nestjs-expert` (as in the task) · medium

#### Attempt 1

- **Files changed:**
  - `onecgiar-pr-server/src/migrations/1790400000000-AddPrimaryProgramRequest.ts` (new). It adds `request_type` as `ENUM('contribution','primary') NOT NULL DEFAULT 'contribution'`, relaxes `owner_initiative_id` to NULL, and seeds 3 rows in `notifications_type`. Every step is guarded, so `up` can run again safely. The `down` deletes `primary` rows that have a NULL owner, **throws** if any other NULL-owner row remains, then restores NOT NULL, drops the column and removes the notification types.
  - `onecgiar-pr-server/src/api/results/share-result-request/entities/share-result-request.entity.ts`. It adds `RequestTypeEnum` and the `request_type` column, and makes `owner_initiative_id` `number | null` (the column and the `ManyToOne`).
  - `onecgiar-pr-server/src/api/notification/enum/notification.enum.ts`. It adds `PRIMARY_PROGRAM_REQUEST_ACCEPTED` / `_DECLINED` / `_MOVED`.
  - `onecgiar-pr-server/src/api/results/share-result-request/entities/share-result-request.entity.spec.ts` (new, 8 tests). They cover the entity metadata and default, the migration `up`/`down` against a mocked QueryRunner, the `down` refusal, and the round trip.
- **Implementer verification:**
  - `npx jest --testPathPattern="share-result-request.entity.spec" --silent --reporters=summary --forceExit` → 8/8 pass
  - `npx tsc --noEmit -p tsconfig.json` → clean
  - `npx eslint <4 files> --quiet` → clean
- **Reviewer verdict:** **PASS**. "The migration, entity and enum do what PSR-T-1 and design §3.1, §3.2 and §11 ask; the DDL is valid, idempotent and reversible, and the guarded `down` is a reasonable reading of the §11 rollback runbook. The DB-side Falsifier is still unproven and should be recorded as pending user evidence."
  - `migration:check` compares migration names only, not the schema, and `enumName` has no effect on MySQL, so neither should produce spurious drift.

#### ADVISORY (4R, non-gating)

1. **RISK/READABILITY.** The migration's DDL puts a column `COMMENT 'PSR-DD-1: …'` on `request_type`, but the entity's `@Column` declares no `comment`. The next `migration:generate` would emit a spurious ALTER to remove it. Fix it by adding a matching `comment:` to the entity or by dropping the COMMENT from the DDL.
2. **RELIABILITY.** The property initializer `request_type = RequestTypeEnum.CONTRIBUTION` also applies to instances TypeORM loads. A partial `select` that leaves out `request_type`, followed by `save()`, could write `contribution` over a `primary` row. **Forward pointer → PSR-T-2 / PSR-T-3 briefs:** never `save()` a partially selected `ShareResultRequest`; use `update()`/`insert()` with explicit columns, or remove the initializer if the task touches the entity.

#### Not Done / Assumptions (scope still owed; this blocks `[x]`)

- **DB verification (handed off to the user by standing rule).** The task's Disqualifier requires a real run:
  1. `cd onecgiar-pr-server && npm run migration:run`
  2. Insert a `share_result_request` row without `request_type`, then SELECT it and confirm it reads `contribution` (Falsifier 1).
  3. `npm run migration:revert`, then `npm run migration:run` (Falsifier 2: `down`→`up`).
  4. `npm run migration:check` → green.
- **Implementer judgment (accepted by the Reviewer).** The `down` is stricter than design §3.2's literal text: it refuses to force NOT NULL over rows other than `primary`.

#### User DB verification of attempt 1 (testing DB `prdb`, 2026-09-30)

- `npm run migration:run` → **OK** (`AddPrimaryProgramRequest1790400000000 has been executed successfully`, COMMIT).
- **Falsifier 1 → PASS.** A row inserted inside a transaction without `request_type` (copied from the latest row) read back as `contribution`. `GROUP BY request_type` → `contribution` 4,425. After the `ROLLBACK`, a check confirmed the test row (id 4534) is gone.
- **Falsifier 2 → FAIL.** `npm run migration:revert` failed on its first statement with `QueryFailedError: Table 'prdb.notification' doesn't exist` (`ER_NO_SUCH_TABLE`), followed by ROLLBACK. The `down` refers to the notification table as `notification`; the real table is `notifications` (`notification.entity.ts:14`, `@Entity('notifications')`). No DDL had run, so the migration is still applied and the schema is intact.
- **Leader adjudication:** this is a spec FAIL. It violates tasks.md PSR-T-1 (Falsifier: "`down` then `up` on a local DB fails → FAIL") and design §3.2 ("`down` reverses all three"). The mocked QueryRunner tests could not catch a wrong table name. The Reviewer's claim that the diff used "the same `notifications_type`/`notification.notification_type` columns" as the exemplar was wrong, so the attempt-1 PASS is **superseded**. Kaizen candidate: a migration's table names must be checked against `@Entity(...)`, not against a mocked runner.

#### Attempt 2

- **Effort:** high (bumped from medium for the retry)
- **Files changed:**
  - `1790400000000-AddPrimaryProgramRequest.ts`: `down()` now reads `notifications` instead of `notification`, and the `COMMENT` is dropped from the `request_type` DDL (closes attempt-1 advisory 1).
  - `share-result-request.entity.spec.ts`: 6 new tests pin the table and column names to the `getMetadataArgsStorage()` metadata, and one test asserts that `down()` emits `` `notifications` n `` and not `` `notification` n ``.
- **Implementer verification:**
  - jest `share-result-request.entity` → 14/14
  - `tsc --noEmit` → clean
  - eslint → clean
- **Reviewer verdict:** **PASS**. The Reviewer checked every identifier in `up`/`down` against the decorators itself (`notification.entity.ts:14,34`, `notification_type.entity.ts:4,8,13`, the `share_result_request` entity). It expects revert → run → check to succeed on MySQL 8:
  - `orm.config.ts` loads the `.ts` source.
  - No error 1093: the subquery reads a different table.
  - No error 1830: the FK is `NO ACTION`.
  - The DML runs before the DDL.
- **ADVISORY (4R, non-gating):**
  1. RISK: the exemplar `1787520000000-SeedContributionDecisionNotificationTypes.ts:46` has the same `` `notification` n `` bug, so its `down` would fail. That is outside this spec. It needs a separate fix-forward ticket or a runbook note, and has been surfaced to the user.
  2. RELIABILITY: `down()` is not atomic, because MySQL DDL auto-commits. Every step is guarded, so re-running the revert completes it. Note this in the §11 rollback runbook.
#### User DB verification of attempt 2 (testing DB `prdb`, 2026-09-30)

- **`npm run migration:revert` → OK.** The 3 `notifications_type` deletes ran with the correct `notifications` subquery, then the primary-row cleanup, the NULL-owner count, `MODIFY owner_initiative_id int NOT NULL`, and `DROP COLUMN request_type`. The run ended with `reverted successfully` and COMMIT.
- **`npm run migration:run` → OK.** `ADD request_type ENUM(...) NOT NULL DEFAULT 'contribution'`, with no COMMENT this time, then `MODIFY ... int NULL` and the 3 guarded inserts. The run ended with `executed successfully` and COMMIT. **Falsifier 2 (`down` then `up`) → PASS.**
- **`npm run migration:check` → green.** Total 486, Executed 495, Pending 0: "No pending migrations found. Database is up to date." The DB has 9 more executed migrations than this branch's source; they come from other branches applied to the shared testing DB and do not affect this task.
- Falsifier 1 was already proven on attempt 1's `up`. The attempt-2 `up` has the same column DDL minus the COMMENT, so the evidence carries over.

- **Final status: PASS** (attempt 2). All DoD items are met: migration, entity and enum; lint clean; `migration:check` green after a real `migration:run`.
- **Requirements covered:** design §3.1 and §3.2 (DD-1, DD-5, and the DD-7 data), requirements §7 backwards compatibility.
- **Decisions:** `down` refuses to force NOT NULL over rows other than `primary` that have a NULL owner (stricter than design §3.2; the Reviewer accepted it). The DDL COMMENT was dropped to match the entity.
- **Issues:** the attempt-1 table-name bug was copied from the exemplar migration. The exemplar's own `down` still has it (advisory 1 above); the fix decision is with the user.
- **Forward pointer → PSR-T-2 / PSR-T-3 briefs:** attempt-1 advisory 2 (the `request_type` property initializer means a partially selected entity must never be `save()`d).

### `PSR-T-2` — `PrimaryProgramRequestService`: request, cancel round, state, alignment, recipients

- **Status:** in progress (rework)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` (as the task lists) · high. The effort was bumped from the medium default because the round and state semantics are ambiguous.

#### Attempt 1

- **Files changed:**
  - new `services/primary-program-request.service.ts` and `.spec.ts` (24 tests)
  - `share-result-request.module.ts`: registers and exports the service, and adds `TypeOrmModule.forFeature([ResultsByProjects, ClarisaProjectMapping])`
  - `RoleByUser.repository.ts` (+`getPlatformAdminUserIds`) and its spec (+6 tests)
- **Design choices:**
  - `BilateralProjectsService` is not reused, because `bilateral.module.ts` already imports `ShareResultRequestModule`. The P-7 predicate and the lead-project rule are copied instead.
  - The return union is `ok | not_aligned(message) | internal_error`, and `request()` never throws.
  - `stateFor` priority is accepted > pending > sent_back > none.
- **Leader intervention:** the first report had no red run. That is scope still owed under the DoD, so the Leader sent it back.
  - Red on neutral stubs: 20 failed / 23 passed / 43 total, with every Falsifier red.
  - Two Disqualifier tests (`excludes a mapping with allocation 0` / `…not Confirmed`) stayed green under an always-`[]` stub. They were strengthened with a Confirmed survivor row and are now red on the stub.
  - Green: 43/43; `tsc` clean; eslint clean.
- **Reviewer verdict: FAIL** (verbatim):
  1. **Discovered Issue:** The primary row is inserted with `owner_initiative_id: null`, and the spec pins that value. The design sets it to the requested SP. **Violated Rule:** design.md §3.1 "Primary row shape: `request_type='primary'`, `shared_inititiative_id = owner_initiative_id = requested SP`, …". DD-5 applies the null owner only to contributor drafts. **Remediation:** write `owner_initiative_id: spInitiativeId` and update the assertion. Keep `approving_inititiative_id = spInitiativeId`.
  2. **Discovered Issue:** `request()` always cancels the active round (every active PENDING/DECLINED `primary` row). T-3's decline auto-move calls `request(other)` after the declined row is set to status 3 and kept active, so the cancel would deactivate it. "The other SP already declined this round" could then never be detected, which produces SP09↔SP12 ping-pong. **Violated Rule:** design.md §5 item 1 "cancel the active round if the Center is re-picking"; §5 item 3; §2.2 decline "status 3 (kept active)"; DD-8 "A Center pick starts a new round". **Remediation:** make the cancel conditional on a Center pick (e.g. `opts?: { cancelRound?: boolean }` defaulting to `true`, or an internal `enqueue()` without the cancel). Add a test: with an active DECLINED SP09 row, `request(1, 12, user, undefined, { cancelRound: false })` makes no `update` call and inserts SP12 pending.
- **Reviewer adjudication of the choices:**
  - accepted: no reuse (both copies are faithful to L401-409, L221-226 and L1444-1468), the return union, the cancel leaving the accepted row alone, `stateFor` priority for T-2, `approving = requested SP`
  - acceptable with forward pointers: `none` after a failed request
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: the re-pick Falsifier asserts through `JSON.stringify(criteria).toContain('10')`. Asserting `criteria.share_result_request_id.value` equals `[10]` would be stronger.
  - RESILIENCE: `request()` takes no lock, so two concurrent picks could insert two pending rows. Callers should pass a transactional `manager`, or T-5 should `SELECT … FOR UPDATE` the result.
  - READABILITY: `stateFor` resolves codes with one `findOne` per declined row. A single `find({ id: In(ids) })` would be cleaner.

#### Forward pointers recorded from the T-2 review (copy into the named briefs)

- **→ T-3:**
  - The decline auto-move must call `request(other)` **without** the round cancel.
  - Swap-accept must deactivate the old ACCEPTED `primary` row, so that two active accepted rows never exist.
  - Pass a transactional `manager` to `request()`.
- **→ T-5:**
  - On `ok:false` from `createResultHeader` / `promoteDraft`, swallow and log, write no role 1, and let creation succeed. Only `updatePrimaryAssignment` maps `not_aligned` to a 400 with `message`.
  - Combine the role-1 owner with `stateFor`: a legacy owner has no accepted `primary` row.
  - Serialize concurrent picks (a transaction or `FOR UPDATE`).
- **→ T-6:** `stateFor` cannot reveal a pending swap (accepted wins). `assertSubmittable` needs its own "active `primary` row with status 1 exists" check, or a `hasPendingPrimary(resultId)` helper.
- **→ T-10 / `getResultInitiativeId`:** treat `state === 'none'` with no role-1 owner as pickable (picker enabled, sent-back banner without codes). Test it.

#### Attempt 2

- **Effort:** xhigh (bumped for the retry). Same Implementer, resumed with the verbatim FAIL.
- **Files changed:** `primary-program-request.service.ts` and `.spec.ts` only.
  - **Fix 1:** the insert sets `owner_initiative_id: spInitiativeId` (design §3.1). Red first: the assertion `13` got `Received null`. Then green.
  - **Fix 2:** new signature `request(resultId, sp, user, manager?, opts?: { cancelRound?: boolean })`, with `cancelRound` defaulting to `true`; the round cancel sits inside `if (cancelRound)`. A new test (`cancelRound: false` with an active declined SP09 row) checks that there is no `update` call and that SP12 is inserted as pending. Red first: TS2554 at compile time. Then green.
- **Implementer verification:**
  - jest `primary-program-request|RoleByUser` → 44/44
  - tsc clean
  - eslint clean
- **Leader re-check (inline):** `npx jest --testPathPattern="primary-program-request|RoleByUser|share-result-request.entity" --silent --reporters=summary --forceExit` → 3 suites, 58/58 passed.
- **Reviewer verdict: PASS.** "Both attempt-1 issues are fixed as the spec requires: the primary row now carries the requested SP as owner, and the round cancel only happens on a Center pick (`cancelRound`, default `true`). Every query in this service filters on `request_type`, so a primary row can't be taken for a contribution here."
- **ADVISORY (4R, non-gating):**
  - READABILITY: the round-cancel comment says "by T-4" but should say T-3.
  - RISK: `share-result-request.repository.ts` L146-151 and L425-429 match on `owner_initiative_id = ? AND shared_inititiative_id = ?` without filtering on `request_type`. A primary row, where owner equals shared, could match. This becomes a forward pointer to T-4.
  - RELIABILITY: forward pointer to T-3 (below).

- **Final status: PASS** (attempt 2 of 3). **Budget note:** design §13 planned 1 review round for T-2; it took 2. The Leader reported this small overrun to the user and is not escalating it as a tripwire.
- **Requirements covered:**
  - `PSR-R-2`: re-pick cancels the round; re-save is idempotent.
  - `PSR-R-3`: non-alignment returns `not_aligned` with the existing message.
  - `PSR-R-7`: state derivation.
  - `DD-8`: rounds.
  - P-8: admin recipients.
- **Decisions:**
  - `BilateralProjectsService` is not reused (it would create a module cycle). The predicate and lead-project rule are copied, and the Reviewer verified them as faithful.
  - The return union `ok | not_aligned | internal_error`.
  - `stateFor` priority accepted > pending > sent_back > none.
  - `approving_inititiative_id = requested SP`, following the contribution-row convention.

#### Forward pointers added by the T-2 attempt-2 review

- **→ T-3:** call `request(other, …, { cancelRound: false })` only **after** the declined row is set to status 3; otherwise there would be two pending rows.
- **→ T-4:** add `request_type = 'contribution'` to the owner/shared lookups in `share-result-request.repository.ts` L146-151 and L425-429, or confirm that no caller passes owner equal to shared.

### `PSR-T-3` — Accept / decline cascade, swap, contributor release, ToC seed, Center notices

- **Status:** in progress (rework)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd`, `error-handling-patterns` (as the task lists) · xhigh (complex: concurrency and business rules)
- **Parallel run:** executed at the same time as PSR-T-5, with disjoint files. T-3 read the moved blocks from git `HEAD`.

#### Attempt 1

- **Files changed:** `primary-program-request.service.ts` and `.spec.ts` only. It adds `accept`, `decline`, `releaseContributors`, `isAuthorized`, `emitCenterNotice`, `sendContributorReleaseEmail` and `PrimaryDecisionOutcome` (`ok | not_found | forbidden | conflict | internal_error`).
- **Moved code:**
  - Swap cleanups from HEAD `bilateral-center.service.ts` L317-381 go into `accept()`, narrowed to `request_type=CONTRIBUTION`. `accept()` also retires the old ACCEPTED `primary` row.
  - The ToC stub from HEAD `bilateral.service.ts` L4779-4797 goes into `accept()`.
  - The contributor emails reuse the public `EmailNotificationManagementService`, with the glue duplicated from `share-result-request.service.ts` L310-425. Injecting `ShareResultRequestService` would create a provider cycle once T-4 lands.
  - The Center notices go through `NotificationService.emitResultNotification`, after commit.
- **Lock:** `manager.transaction` + `findOne` with `lock: pessimistic_write` + a status re-check (`conflict`).
- **Implementer verification:**
  - jest `primary-program-request|RoleByUser` → 62/62
  - tsc 0 errors repo-wide
  - eslint clean
  - The "red" run was 2/38, and both failures were mock-setup gaps. That is **not** a pre-implementation red. Lens A checked instead that the Falsifier tests discriminate (below).
- **Review mode:** parallel lens reviewers, because the task touches authorization and data-loss surfaces.
- **Reviewer lens B (security/authorization): PASS.**
  - `isAuthorized(user.id, row.shared_inititiative_id)` runs before any write.
  - `isUserAdmin` matches P-8.
  - `hasActiveRoleOnInitiative` checks the requested SP.
  - Logs carry ids only, and the recipients match design §5.4 and §5.8.
  - **Guarantees T-4 must provide:**
    1. `user` comes from the JWT `auth` decorator, never from the DTO.
    2. Dispatch uses the loaded row's `request_type`, not a DTO field.
    3. `forbidden`→403, `conflict`→409 ("already answered"), `not_found`→404 (or 403), `internal_error`→a generic 500 that does not echo `error.message`.
    4. The DTO decision only selects accept or decline.
  - **Advisory:**
    1. The not_found/forbidden order reveals whether an id exists. This is minor. T-4 may collapse it to 403.
    2. `isUserAdmin` reads `[0]` without ORDER BY, so it can fail closed. This is pre-existing.
    3. Emails are sent before commit.
    4. No success test covers a non-admin SP member.
    5. The lock is taken before authorization.
- **Reviewer lens A (lifecycle/data integrity): FAIL** (verbatim):
  1. **Discovered Issue:** A decline during a swap auto-moves the request to the current owner. SP09 is the accepted owner, a swap request to SP12 is pending, and the lead project has two alignments (SP09, SP12). When SP12 declines, `getOtherAlignment` returns SP09. SP09 has no active declined `primary` row, so `request(SP09, …, {cancelRound:false})` inserts a new pending `primary` row to the SP that already owns the result, and the Center is told "moved to SP09". Effects:
     - Submit becomes blocked by the pending-primary guard (DD-4/T-6).
     - If SP09 accepts, `isSwap` is false, the old ACCEPTED row is not retired, and two active ACCEPTED `primary` rows coexist.
     - If the owner is a legacy owner that is not an alignment, the "other" SP is a third SP, and its live status-1 contribution request is deactivated by the PSR-R-5 cleanup (`In([1,4])`).
     - Test gap: no decline test has an active role-1 owner. The "decline never touches role 1" assertion is trivially true, because `decline()` never calls `initiativeRepo`.
     * **Violated Rule:** requirements.md PSR-R-2 swap "SP09 stays the primary SP until SP12 accepts (the result keeps working meanwhile) … on decline SP09 stays". design.md §2.2: the auto-move row has Owner = "none"; the "SP declines, otherwise" row says "none (swap: the old owner stays)". tasks.md PSR-T-3 Verification "Table-driven: alignments {1, 2, 3} × other-already-declined {no, yes} × swap {no, yes}"; DoD "all table rows green".
     * **Remediation Suggestion:** In `decline()`, read the active role-1 row inside the transaction. When an owner exists (swap), take the "otherwise" row: status 3, notice *declined*, no `request()`, no contributor cleanup. At minimum, never auto-move to the current owner. Whether a swap-decline should ever auto-move to a third, non-owner alignment is a question for the spec owner; the safe default is no. Add decline tests with an active owner for 1, 2 and 3 alignments, asserting no `insert`, no `ResultsByInititiative` write, the *declined* notice, and that the owner's ACCEPTED row is untouched.
  2. **Discovered Issue:** On the auto-move path, the other SP's contribution rows are removed before the code checks whether the move succeeded. The `requestRepo.update(... CONTRIBUTION, shared=other, In([1,4]) → is_active:false)` runs unconditionally after `request()`. When `moveOutcome.ok` is false, the code falls through to "sent back" and commits, and the other SP's contributor draft is lost. No test covers this.
     * **Violated Rule:** design.md §2.2 has "Remove the other SP from contributor drafts" only on the moved row, and the "otherwise" row lists only the *declined* notice and sent back. requirements.md PSR-R-5.
     * **Remediation Suggestion:** Move the contribution-deactivation `update` inside `if (moveOutcome.ok)`. Add a test where `insert` rejects, so `request()` returns `internal_error`, asserting `state:'declined'`, no CONTRIBUTION update, and the *declined* notice.
  - **GAP (Disqualifier, recorded, not gating):** concurrency is proven only by sequential mocks. The 409 re-check on the locked `findOne` is exercised and the `pessimistic_write` option is asserted, but the DB-level "exactly one outcome" property (requirements §7) is unverified. The real evidence is a staging race check (T-11).
  - **Falsifier discrimination:** the both-decline, second-accept-409, notice-failure and release-twice tests all discriminate.
  - **Advisory:**
    - The contributor emails are sent inside the accept transaction, before commit; sending them after commit would be safer. Both lenses flagged this.
    - The same-transaction release test cannot show that the tx manager was used.
    - After accept, the round's declined rows stay active. This becomes moot once issue 1 is fixed.
    - A status-4 draft with `shared = owner` is left untouched (readability).
- **Leader adjudication:** both lens-A issues are in scope and are spec FAILs. For issue 1, the Leader adopts the Reviewer's safe default, because it follows directly from PSR-R-2 ("on decline SP09 stays"): **when a swap request is declined there is no auto-move at all**, it is status 3 plus the *declined* notice. Auto-move applies only to results without an owner.

#### Attempt 2

- **Effort:** xhigh. Same Implementer, resumed with the verbatim FAIL plus the T-2 defect routed from the T-5 review.
- **Files changed:** `primary-program-request.service.ts` + `.spec.ts` only.
  - **Fix 1:** `decline()` reads the active role-1 owner through the tx manager. If an owner exists, there is no `getOtherAlignment` and no `request()`: status 3 + the *declined* notice.
  - **Fix 2:** the contributor-draft cleanup now runs only inside `if (moveOutcome.ok)`.
  - **Fix 3 (T-2 defect):** `findLeadProjectId` / `getAlignments` / `isAligned` accept `manager`. `request()` routes all four reads through it (`ResultsByProjects`, `ClarisaProjectMapping`, `ClarisaInitiative`, `ShareResultRequest`).
- **Red** (against a temporary revert):
  - the swap-decline "no move to current owner" test (got `moved`)
  - the move-failure "no contributor cleanup" test
  - `request() — manager routing`
  - 3 mock-queue artifacts from the revert. The Reviewer's hand trace shows that no test passes because of leftover mocks.
- **Implementer verification:**
  - jest `primary-program-request|RoleByUser` → 67/67
  - tsc 0 errors
  - eslint clean
- **Reviewer lens A: PASS.** "Rework attempt 2 is correct on lifecycle and data integrity, and it closes both attempt-1 issues plus the T-5 routing defect."
  - The swap decline follows PSR-R-2 and the §2.2 "otherwise" row.
  - Fix 3 is verified. The routing test asserts that no injected repo is called.
  - `decline()`'s own lookups on plain repos are accepted, because nothing in that transaction writes those tables.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY (tests): the swap-decline tests (1/2/3 alignments) all assert no `insert` and no `ResultsByInititiative.update`. They lack the *declined* notice check (1 and 3 alignments), `save` not called (3 alignments), and an "owner's ACCEPTED row untouched" pin. The code guarantees these; the tests don't pin them. The Leader's brief asked for them, but the tasks.md Falsifier ("Swap decline removes the old owner") is covered, so the Leader does not gate on them.
  - RELIABILITY (tests): `jest.resetAllMocks()` instead of `clearAllMocks()` would make leftover `Once` queues fail loudly.
  - RESILIENCE: `decline()` could also pass `manager` to its alignment lookups.
  - Still open from attempt 1: **contributor-release emails are sent before commit** (both lenses); lens B's advisories 1-5.
- **Leader re-check (inline), all T-1..T-5 scoped specs together:** `npx jest --testPathPattern="primary-program-request|RoleByUser|share-result-request.entity|bilateral-center|bilateral-ai.service|bilateral.service" --silent --reporters=summary --forceExit` → 921/921 passed. `npx tsc --noEmit` → 0 errors.
- **Gap (Disqualifier, recorded):** lock/409 concurrency is proven only by sequential mocks. The 409 re-check on the locked `findOne` is exercised, and `pessimistic_write` is asserted. The DB-level "exactly one outcome" check is owed to T-11 staging.

- **Final status: PASS** (attempt 2 of 3). Within budget: design §13 planned 2 review rounds for T-3.
- **Requirements covered:**
  - PSR-R-4 (incl. idempotency → `conflict`/409)
  - PSR-R-5, PSR-R-6
  - PSR-R-7 (single-SP, both-decline)
  - PSR-R-8 (lens B)
  - PSR-R-12 (release on accept)
  - PSR-R-14 (emit after commit)
  - PSR-R-2 swap (the accept/decline half)
  - DD-3, DD-4, DD-8, DD-9 (the release half)
- **Decisions:**
  - Swap decline never auto-moves (Leader, per PSR-R-2).
  - The email glue is duplicated to avoid a provider cycle with `ShareResultRequestService`.
  - The outcome union `ok | not_found | forbidden | conflict | internal_error`, which T-4 maps to HTTP codes.

#### Forward pointers recorded from T-3 (copy into the named briefs)

- **→ T-4** (lens B guarantees):
  1. `user` comes from the JWT `auth` decorator only.
  2. Dispatch on the **loaded row's** `request_type`, never on a DTO field.
  3. Map `forbidden`→403, `conflict`→409 "This request was already answered", `not_found`→404 (or collapse it to 403 for non-admins), and `internal_error`→a generic 500 without `error.message`.
  4. The DTO decision only selects accept or decline.
  - Plus the T-2 pointer: add `request_type = 'contribution'` to `share-result-request.repository.ts` L146-151 / L425-429.
- **→ T-6:** `stateFor` hides a pending swap (accepted wins), so `assertSubmittable` needs its own "active `primary` row with status 1" check. `BilateralCenterService`'s literal `[1,3]` duplicates the service's private `RequestStatusId`; consider exporting it.

### `PSR-T-5` — Creation paths create requests instead of writing role 1

- **Status:** in progress (rework)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` (as the task lists) · high
- **Parallel run:** executed at the same time as PSR-T-3, with disjoint files.

#### Attempt 1

- **Files changed:**
  - `bilateral-center.service.ts`: `createResultHeader` and `updatePrimaryAssignment` now call `request()`. The swap cleanups and ToC clear are removed (they move to T-3). A new `buildPrimaryRequestState` builds the response. `tocCleared` is replaced by `primary_request`.
  - `bilateral.service.ts`: `populateInitiativeAndTocFromProgramCode` now calls `request()`. The role-1 upsert and the ToC seed are removed.
  - Both specs.
  - `bilateral-result-summaries.en.md`: new change-log row, 2026-09-30.
  - `bilateral-ai.service.ts` was read but not edited, because the signature is unchanged. `bilateral-center.controller.spec.ts:147-148` was not edited (it is a pure delegate test).
- **Implementer verification:**
  - Red: 2 failed / 128 on the unmodified `bilateral-center.service.spec`. Then green.
  - jest `bilateral-center|bilateral-ai.service|bilateral.service` → 21 suites, 830/830.
  - tsc clean. eslint clean on 4 files.
- **Reviewer verdict: FAIL** (verbatim, condensed only in layout):
  1. **Discovered Issue:** Manual create never produces a pending request. `request()` runs at `bilateral-center.service.ts:458-463`, but the lead-project row (`is_lead: true`) is saved later, at L519-526. So `findLeadProjectId` returns `null`, `request()` returns `not_aligned`, and the code swallows it. The result ends up with no owner and no request. The AI path is fine. **Violated Rule:** PSR-R-1 "manual create … the behavior is the same as the AI-draft scenario"; design §2.2 row 1. **Remediation:** save the `dto.project_id` project before the `program_code` block (still before `syncContributingPrograms`). Add an order test (`invocationCallOrder`).
  2. **Discovered Issue:** `updatePrimaryAssignment` checks alignment against a stale lead project. `findLeadProjectId` reads through the injected repository, not through the passed `manager`, so it does not see the lead project written in the same transaction. The result is a wrong 400 when the project and the SP change together, or when the first lead project is set by this PATCH. **Violated Rule:** PSR-R-3; PSR-R-2. **Remediation:** make `findLeadProjectId` read through `manager` when one is passed, or pass the lead project id into `request()`. That is T-3's file, so the Leader routes it. Add a spec showing that `manager.getRepository(ResultsByProjects)` is used.
  3. **Discovered Issue:** Once a swap request exists, the Center cannot cancel it. With owner SP09 and a pending SP12 request, re-picking SP09 leaves `changed` false, `request()` is skipped, and the SP12 row stays active. Submit stays blocked, and SP12 can still take over later. (Correct as it is: for an ownerless result `currentPrimaryId = 0`, so it always requests. A pending re-save is idempotent. A sent-back re-pick starts a new round.) **Violated Rule:** DD-8 "A Center pick starts a new round (deactivates old rows)"; PSR-R-2 swap "the result keeps working meanwhile". **Remediation:** when `!changed`, deactivate the active pending and declined `primary` rows through `manager` with `update()`. Add a test.
  4. **Discovered Issue:** `buildPrimaryRequestState` falls back to the owner only when `stateFor` returns `none`. A legacy owner with a pending or declined swap round therefore reports `pending`/`sent_back`, while a post-feature owner in the same situation reports `accepted`. The only test checks presence, and the default mock `{id:1}` hides the gap. **Violated Rule:** the T-2 forward pointer → T-5 (combine the owner with `stateFor`); DD-4. **Remediation:** check the owner first, returning `accepted` plus the owner code, and otherwise return `stateFor`. Add value tests for none / legacy owner / legacy owner + pending swap / ownerless pending / ownerless declined.
  5. **Discovered Issue:** Two Falsifiers have no test. No request at AI-job finish is true by construction but unproven, and no spec covers the ingest path `processToc` → `upsertResultInitiative` (`bilateral.service.ts:1632`). **Violated Rule:** the tasks.md PSR-T-5 Falsifiers. **Remediation:** (a) a test that job completion or `createDraftFromCandidate` never calls `populateInitiativeAndTocFromProgramCode`; (b) a test that ingest with a primary ToC mapping still saves role 1 and never calls `request()`.
  - **Answers to the Leader's questions:**
    - Concurrency: only `updatePrimaryAssignment` passes `manager`. The Reviewer accepts this for brand-new results.
    - Disqualifier: met.
    - Removed code: everything reappears in T-3 `accept`.
    - The client has no reader of `tocCleared`.
  - **ADVISORY:**
    - RESILIENCE: the transaction does not serialize concurrent picks, because of the InnoDB snapshot. A `pessimistic_write` read of the `Result` row should come first.
    - RELIABILITY: `buildPrimaryRequestState` runs after commit and can throw, turning a committed save into a 500. Wrap it.
    - READABILITY: `CONTRIBUTION_REQUEST_STATUSES` and the `In` import may now be unused.
    - CONTRACT DOC: the change-log sentence becomes true only after fix 4.
- **Leader adjudication:**
  - Issues 1, 3, 4 and 5 → the T-5 Implementer (attempt 2).
  - Issue 2 is a defect in T-2's `request()` (`findLeadProjectId` ignores `manager`). It is in `primary-program-request.service.ts`, which the T-3 Implementer currently owns in its rework. It is routed to the T-3 Implementer as a T-2 defect fix, not a scope widening, and the T-3 re-review verifies it.
  - The RESILIENCE advisory (lock the `Result` row first) is **promoted to required**. It is not a new task: it restates the unmet binding forward pointer T-2 → T-5 #3 ("Serialize concurrent picks … `SELECT … FOR UPDATE` on the result row"), and the Reviewer showed that the transaction alone does not satisfy it.

#### Attempt 2

- **Effort:** xhigh (bumped from high). Same Implementer, resumed with the verbatim FAIL; issue 2 was routed to T-3.
- **Files changed:**
  - `bilateral-center.service.ts` and its spec
  - `bilateral.service.spec.ts` (test only)
  - `bilateral-ai.service.spec.ts` (test only)
- **Fixes** (red → green recorded for each):
  - **Issue 1:** in `createResultHeader`, the project save now runs before `request()` (order test).
  - **Issue 3:** on the `!changed` branch, active `primary` rows with status `[1,3]` get `update(is_active:false)` via `manager`.
  - **Issue 4:** `buildPrimaryRequestState` checks the owner first. 5 value tests; "legacy owner + pending swap" was red.
  - **Issue 5a/5b:** tests for "AI-job finish never calls `populateInitiativeAndTocFromProgramCode`" and "ingest still writes role 1 and never calls `request()`". Both passed on their first run, because the behaviour already held.
  - **Lock:** `manager.findOne(Result, {lock: pessimistic_write})` is the first statement in the `updatePrimaryAssignment` transaction (call-order test; red first).
- **Implementer verification:**
  - jest `bilateral-center|bilateral-ai.service|bilateral.service` → 21 suites, 840/840
  - tsc 0 errors
  - eslint clean on 5 files
- **Reviewer verdict: PASS.** "All five attempt-1 findings that are in T-5's scope are fixed, and the lock the Leader made required is in place."
  - (a) The cancel excludes status 2, so the owner's ACCEPTED row is never touched.
  - (b) The ownerless re-pick uses `request()`'s default `cancelRound: true`.
  - The `FOR UPDATE` read comes before the snapshot, so it serializes concurrent picks.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: the cancel test does not pin the status filter. Add `request_status_id: In([1,3])` to the expected criteria.
  - READABILITY: the literal `[1,3]` duplicates the service's private `RequestStatusId`. Export it later (T-3's file).
  - RELIABILITY (carried over): `buildPrimaryRequestState` runs after commit and can throw, which turns a committed save into a 500. Wrap it.
  - DEPENDENCY: issue 2 must pass in T-3's re-review.
- **Gap (recorded):** there is no DB-backed concurrency test. The staging check happens in T-11.
- **Status:** Reviewer **PASS**, but the task stays `[~]` until the T-3 re-review verifies the routed issue 2 (`findLeadProjectId` through `manager`). `updatePrimaryAssignment` is only correct end to end once that fix lands.
- **Dependency closed:** the T-3 attempt-2 lens-A review verified issue 2 (all of `request()`'s reads go through `manager`). The Leader's combined re-check passed 921/921 with tsc clean.
- **Final status: PASS** (attempt 2 of 3; within the 2 review rounds budgeted).
- **Requirements covered:** PSR-R-1 (AI draft, manual, single-SP, not on AI-job finish, failure → `none`/pickable), PSR-R-2 (entry points, including re-picking the owner to cancel a swap), DD-2.
- **Decisions:** `updatePrimaryAssignment` locks the `Result` row first. `buildPrimaryRequestState` checks the owner first. `tocCleared` is replaced by `primary_request`, with a bilateral doc change-log row added.
- **Forward pointer → T-10 / T-6:** treat `none` without an owner as pickable. `buildPrimaryRequestState` can throw after commit (advisory: wrap it).

## Out-of-spec fix (user-requested, 2026-09-30): old migrations' `down` table name

The user explicitly asked for this: "corrígela tú mismo". The Leader applied it inline, because it is a one-word change per file outside this spec's task list. It is not part of any PSR task. Commit it separately.

- `onecgiar-pr-server/src/migrations/1787520000000-SeedContributionDecisionNotificationTypes.ts:46` and `1787340000000-SeedResultTaggedNotificationTypes.ts:48`: `` FROM `notification` n `` → `` FROM `notifications` n `` (`@Entity('notifications')`, `notification.entity.ts:14`).
- **Why:** this is the same bug PSR-T-1 attempt 1 copied from the exemplar. Each migration's `down()` failed with `ER_NO_SUCH_TABLE` on revert. The `up()` is untouched, so environments that already ran these migrations are unaffected, and TypeORM reads `down` from the source when it reverts.
- **Verification:** grep → no remaining `` FROM `notification` `` in `src/migrations/`. No DB revert was run: reverting these older migrations would first revert every newer one.

### `PSR-T-4` — Decide endpoint branch + request rows payload

- **Status:** in progress (rework)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `api-design-principles` (as the task lists) · high
- **Mode notes:**
  - It ran in parallel with PSR-T-6 on disjoint files.
  - Pre-flight: the user's direction "continua hasta que termines" is recorded as pre-approval for routine PASS gates. HALTs, pivots, tripwires and user-owned steps still stop the run.

#### Attempt 1

- **Files changed:**
  - `share-result-request.service.ts` + spec
  - `share-result-request.repository.ts` (`shareResultRequestExists` gets the `request_type='contribution'` filter. `getRequestByUserId` has zero callers, so it is left with a comment.)
  - new `share-result-request.repository.spec.ts`
- **Dispatch:** V1/V2 load the row by id and branch on `row.request_type`. The DTO decision only selects 2 or 3; anything else returns 400.
- **Error mapping:** 403/409 ("This request was already answered")/404/generic 500.
- **Enrichment:** `attachPrimaryRequestFields` runs inside `enrichBucketsOnce` and adds no queries. The existing joins already provide the lead center institution and the owner `official_code`. A 25-row test pins `find()` at 3 calls.
- **Red:** the service file was stashed (the tests were kept) → 21/86 failed, then restored. The Leader checked that the stash was popped and the parallel worker's files were intact; the 3 remaining stashes predate this session.
- **Implementer verification:**
  - jest `share-result-request` → 5 suites, 125/125
  - tsc 0 errors
  - eslint clean
- **Reviewer: FAIL** (verbatim, layout condensed):
  1. **Discovered Issue:** A cancelled primary request can still be accepted or declined. A Center re-pick cancels the round with `is_active=false` only, so `request_status_id` stays `1`. The dispatch loads with no `is_active` filter (V1 L1196, V2 equivalent), and `accept()`/`decline()` reload the same way (primary-program-request.service.ts L499-505). The status re-check sees PENDING and the decision goes through. A stale tab or a hand-built PATCH can therefore accept the cancelled SP09 row after the Center re-picked SP12, writing role 1 for SP09. No test covers this. **Violated Rule:** PSR-R-2 "the SP09 request is no longer pending and **no longer actionable**"; PSR-R-8 "The server MUST enforce this; hiding buttons is not enough (AC-3)". **Remediation:** in the dispatch (V1 and V2), if `!loadedRequest.is_active`, return 409 "This request was already answered" before calling accept or decline. Add a test per handler. As defense in depth, `accept`/`decline` should also add `is_active: true` to their locked `findOne` (that is T-3's file).
  2. **Discovered Issue:** The Falsifier "a pending primary row is missing from an SP09 member's received list or from a platform admin's" is untested. The code is correct on inspection: `pendingOwner` matches `shared In(inits)` + `is_map_to_toc:false`, admins are unscoped, there are only LEFT joins and no role-1 or owner join, and the ToC enrichment skips `is_map_to_toc=false`. But the only primary-row GET test mocks `find` regardless of `where`, with a user who doesn't belong to the row's SP. V2's contribution path also has no "never calls primary" test (DoD "V1 and V2 both covered"). **Violated Rule:** the tasks.md PSR-T-4 Falsifier and DoD. **Remediation:** add `where`-condition tests for `getReceivedResultRequest` and `…PopUp`: (a) an SP member (`role=3`, inits `[55]`) matches a primary row fixture; (b) an admin gets conditions with no `shared`/`owner` scoping. Add the V2 contribution "never calls primary" case.
  - **Verified OK:** pointers 1-6, the not-found contribution path, `SourceEnum.Bilateral === 'API'`, value assertions (Disqualifier met), and `mapExpectedRow` only adding fields.
  - **ADVISORY:**
    - RISK: the handlers' outer catch (`returnErrorRes`) returns `error.message`. This is pre-existing; a follow-up should use a generic message.
    - READABILITY: `not_found` is kept as 404, not collapsed to 403. This is the recorded choice.
- **Leader adjudication:**
  - Both issues are in scope.
  - The service-level `is_active: true` in `accept`/`decline` is a **T-3 defect** (defense in depth). `primary-program-request.service.ts` is owned by T-6 in this wave, so the fix is queued for after T-6 lands: **forward pointer → post-T-6 follow-up**, re-reviewed with that change.

#### Attempt 2

- **Effort:** xhigh. Same Implementer, resumed with the verbatim FAIL.
- **Files changed:** `share-result-request.service.ts` and its spec only.
- **Fix:** `dispatchPrimaryDecision` (shared by V1 and V2) returns `conflict` (409 "This request was already answered") when `!row.is_active`, before `accept`/`decline` runs.
- **Tests added:**
  - a 4-case `it.each` (V1/V2 × accept/decline) on an inactive row with status 1: 409, and the service is never called;
  - visibility tests that evaluate the real `buildWhereReceivedConditions` output against a pending ownerless primary fixture, for an SP member (role 3, init 55), an admin (unscoped) and the pop-up's merged conditions;
  - a V2 contribution-path test showing the primary service is never called.
- **Red → green:** the 4 new inactive-row tests failed first (4 failed / 46 passed) and pass after the fix. The visibility tests were green from the first run, because the code was already correct (the Reviewer confirmed this on inspection).
- **Implementer verification:**
  - jest `share-result-request` → 5 suites, 133/133
  - eslint clean
  - tsc: 1 error, in T-6's in-progress `result.spec.ts`
- **Reviewer: PASS.** "Both issues from attempt 1 are fixed, and both of your questions check out." The visibility tests evaluate the real conditions, and the `primaryRow()` defaults don't hide any existing test's intent.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: the visibility tests have no negative control (e.g. an SP 12 row checked against an init-55 user).
  - RISK: pre-existing: the handlers' outer catch returns `error.message`.
- **Final status: PASS** (attempt 2 of 3). Budget planned 1 review round for T-4 and it took 2: a small overrun, reported to the user.
- **Requirements covered:** DD-6; `PSR-R-9` / `PSR-R-10` data; `PSR-OQ-1` (admins decide both kinds); PSR-R-2 "no longer actionable" (endpoint half); PSR-R-8 (wiring).
- **Decisions:**
  - `not_found` stays 404; it is not collapsed to 403.
  - `getRequestByUserId` is left without the `request_type` filter, because it has zero callers.
  - The enrichment adds no queries; it reuses the existing joins.
- **Forward pointer → post-T-6 follow-up (T-3 defect, defense in depth):** `accept`/`decline` must add `is_active: true` to their locked `findOne` (`primary-program-request.service.ts` ~L499-505 and in `decline`). Re-review it when it is applied.

### `PSR-T-7` — Center notices: ownerless read path + sentence

- **Status:** in progress (rework)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert` · medium. Parallel with PSR-T-6 (disjoint files).

#### Attempt 1

- **Files changed:** `notification.service.ts` + spec (+11 tests).
  - A new `findCenterNoticeNotifications(userId, {read?, after?})`, modelled on `findBilateralAiJobFinishedNotifications`. It is scoped to the target user, requires `obj_result.is_active`, filters to the 3 types, and has no role-1 condition.
  - The role-1 finds in `getAllNotifications` / `getPopUpNotifications` now exclude the 3 types with `Not(In(...))`, and the results of the new query are merged in.
  - `buildResultNotificationDescription` gains a case for the 3 types that uses `buildTaggedSuffixDescription`.
- **Implementer verification:**
  - jest `notification.service` → 2 suites, 71/71
  - tsc 0 errors
  - eslint clean
- **Reviewer: FAIL** (verbatim, layout condensed):
  1. **Discovered Issue:** The socket push sentence is garbled. T-3 stores a complete sentence whose subject is the SP ("SP09 accepted to be the primary Science Program of this result. Click to see the result."). `buildTaggedSuffixDescription` puts "The result {code} - {title}" in front of it, which gives "The result 501 - An ownerless bilateral result SP09 accepted to be the primary Science Program of this result. …". That sentence has two subjects and names the result twice, and the `it.each` test locks it in. **Violated Rule:** design.md §6.1 Center notice row ("`{sp}` accepted to be the primary Science Program of result …" etc.); tasks.md PSR-T-7 "handle them in `buildResultNotificationDescription`". **Remediation:** give the 3 types their own branch. Replace "of this result" with `of result ${identity}` (e.g. "SP09 accepted to be the primary Science Program of result 501 - An ownerless bilateral result. Click to see the result."), fall back to the stored text when there is no identity, and update the `it.each` expectations.
  2. **Discovered Issue:** The Falsifier-2 duplicate tests cannot fail, because the mocked role-1 finds return `[]`. Nothing asserts the exclusion on `getAllNotifications` call 2 (pending) or on the pop-up `whereConditions`, so deleting either exclusion keeps the suite green. **Violated Rule:** the tasks.md PSR-T-7 Falsifier "The same notice appears twice … → FAIL"; the DoD "payload-level tests". **Remediation:** assert `Not(In([...3 types]))` on role-1 call 2 of `getAllNotifications` and on call 1 of `getPopUpNotifications`, or make the role-1 mock return the row only when the exclusion is absent. Make the Falsifier-1 assertions check values (`text`, `obj_notification_type.type`, `obj_result.source_name`).
  - **Holds:** the ownerless path, the user scoping, the viewed/pending split, and `is_active` (a sent-back result stays active). `getRecentResultActivity` feeds the RFR home recent activity, not the inbox, and uses a LEFT join, so it is advisory only.
  - **ADVISORY:**
    - RELIABILITY: `getGlobalResultNotifications` is not user-scoped, so another user's notices can show there. This is pre-existing and affects every type.
    - READABILITY: the new case duplicates the fall-through group.
    - "Click to see the result." matches the existing suffixes.
- **Forward pointer → T-8 (client):** the T-7 Implementer suggested that the client render these types as `prefix 'The result' + suffix = notification.text`. That would produce the **same garbled sentence** as issue 1. T-8 must render the stored sentence with "this result" replaced by the result identity, or render it standalone. It must not put "The result {code}" in front.

#### Attempt 2

- **Effort:** high (bumped from medium). Same Implementer, resumed with the verbatim FAIL.
- **Files changed:** `notification.service.ts` and its spec.
- **Fix 1:** the 3 types get their own branch in `buildResultNotificationDescription`. It replaces "of this result" with `of result ${identity}`. With no code or title it falls back to the stored sentence; with no text it falls back to the generic line. Red first: the rewritten `it.each` plus the no-identity test failed 4 times against the attempt-1 code.
- **Fix 2:**
  - The duplicate test now asserts the exclusion on `getAllNotifications` calls 1 and 2 and on the pop-up `whereConditions`. Red first: with the exclusions deleted, `-t "Falsifier 2"` failed twice.
  - Falsifier 1 now asserts `text`, `type` and `source_name`.
- **Implementer verification:**
  - jest `notification.service` → 72/72
  - tsc 0 errors
  - eslint clean
- **Reviewer: PASS.** "Rework attempt 2 of PSR-T-7 fixes both issues from attempt 1."
  - All 3 emitter sentences contain "of this result" (T-3 L674, L877, L885).
  - The only other caller is `getRecentResultActivity`. The client shows its message verbatim, so it benefits from the fix.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: the "of this result" coupling between T-3 and T-7 is hand-copied. A shared constant or an emitter-built test input would catch drift.
  - RISK (pre-existing): `getGlobalResultNotifications` is not user-scoped.
- **Final status: PASS** (attempt 2 of 3). Budget planned 1 round and it took 2: a small overrun.
- **Requirements covered:** PSR-R-14 (read path: visible and not duplicated; the socket sentence), DD-7.
- **Forward pointer → T-8 (confirmed by the Implementer):** render the 3 types as a single composed sentence, with "of this result" replaced by `of result {code} - {title}`, the same splice as the server. Never use prefix "The result" + suffix. Add the 3 `NotificationType` enum members with exactly these strings: 'Primary Program Request Accepted' / 'Primary Program Request Declined' / 'Primary Program Request Moved'.

### `PSR-T-6` — Ownerless guards

- **Status:** `[~]`, rework, with a pending spec decision (Pivot Record below)
- **Date:** 2026-09-30
- **Skills / effort:** `nestjs-expert`, `tdd` · high. Parallel with PSR-T-4 and then PSR-T-7 (disjoint files).

#### Attempt 1

- **Files changed:**
  - `bilateral-center.service.ts` + spec: `syncContributingPrograms` excludes the pending SP and releases once an owner exists; the swap guard in `assertSubmittable`; `getResultInitiativeId` + `primary_request` via `safeBuildPrimaryRequestState`
  - `results.service.ts` + `result.spec.ts`: the `_updateTocMapping` null-owner guard; the draft→pending `resultRequest` conversion is **removed**
  - `versioning.service.ts` + spec: `$_phaseChangeReporting` skips ownerless bilateral results and returns `null`; its callers are guarded
  - `primary-program-request.service.ts` + spec: new `findPendingPrimaryInitiativeId`
- **Red:** each of the 7 guards was reproduced by reverting its hunk (names in the Implementer report: exclusion, release, swap guard, `primary_request`, null-owner guard, no conversion, versioning skip).
- **Implementer verification:**
  - jest 303/303 (`bilateral-center|results.service|versioning.service`)
  - jest 147/147 (`result.spec`)
  - 349/349 combined
  - tsc 0 errors
  - eslint clean
- **Reviewer: FAIL** (verbatim, layout condensed):
  1. **Discovered Issue:** Any contributors save cancels the pending `primary` request. The `activeRequests` query in `syncContributingPrograms` (`bilateral-center.service.ts` L1854-1863) filters on `result_id`, `is_active`, `request_status_id IN (1,4)` and `is_map_to_toc:false`, with **no `request_type` filter**. The pending primary row matches it. T-6 now always removes `pendingPrimaryId` from `wanted`, so the cancel loop (L1866-1874) always deactivates the primary row, including a pending swap. The same happens in `createResultHeader`: `request()` runs at L526, then `syncContributingPrograms` runs at L545 and kills the request it just created. The result is left with no owner and no pending request. The test misses this because its `shareRepo.find` fixture returns `[]`. **Violated Rule:** PSR-R-12 "SP12 saved before SP09 accepts"; design §2.2 row 1; PSR-R-1; design §5 item 5. **Remediation:** add `request_type: CONTRIBUTION` to the `activeRequests` where clause and to the `dormantDraft` `findOne`. Add a regression test with an active pending primary row, asserting it is never deactivated; the mock must honour `where.request_type`, or the test must assert on the where clause. Record the red run, and cover the swap case too.
  2. **Discovered Issue:** Falsifier 1 ("saving contributors on an ownerless result throws") has no evidence. `saveContributors` catches every error and returns `{status:500}`. The only ownerless-save test asserts only that `releaseContributors` was not called. No test asserts the success response, or a `save` with `owner_initiative_id:null` (DD-5). **Violated Rule:** tasks.md PSR-T-6 Falsifier + DoD; DD-5. **Remediation:** assert the success message, `shareRepo.save` called with `objectContaining({owner_initiative_id:null, request_status_id:4})`, and `releaseContributors` not called. Record the red: T-1 nullability, plus a mutation red such as a temporary `owner.id` dereference.
  3. **Discovered Issue (spec-premise conflict):** Guard 6 removes the approval-time draft→pending conversion for every result, relying on design §5 item 6's premise "no status-4 rows remain after release". That premise is false for (a) **API-ingest results** (`bilateral.service.ts` L1496-1524 writes status-4 drafts with the owner already set, and the results are born in Pending Review) and (b) **results already in flight at deploy** that have an owner and status-4 drafts. For both groups, approval was the only release point, so those contributor SPs would **never** get a request. **Violated Rule:** the requirements §Out of scope ("The API ingest path" / "Results that already have a primary SP (no backfill)") and design P-3 conflict with requirements L59 / design §5 item 6. **Remediation (for the Leader/user):** at approval, replace the old conversion with `releaseContributors(resultId)`. It touches status-4 rows only, so there are no duplicates (PSR-R-13 holds) and ingest and legacy results keep working. Rewrite the test and amend design §5 item 6 and L59.
  - **Passes:**
    - `findPendingPrimaryInitiativeId` (`request_type=PRIMARY`, status 1, active)
    - the owner is still excluded
    - `safeBuildPrimaryRequestState` falls back to `none` and logs ids
    - the swap guard
    - the null-owner guard is really red-tested
    - versioning `null` is handled at both callers
    - `pendingIds` and the role-2 deactivation at approval are unchanged
    - the "only caller is bilateral" claim is true (L4339)
  - **ADVISORY:**
    - RELIABILITY: the annual innovation replication rows may not select `source`, in which case the skip never fires.
    - RESILIENCE: a throw from `getOwnerInitiativeByResult` in the versioning skip would still abort that result.
    - **RISK (outside T-6):** the reject branch of `reviewBilateralResult` (L4346) deactivates every active `share_result_request`, including `primary` rows.
    - RELIABILITY: a declined contributor that is re-sent becomes a new draft on every save and is released straight away.

## Pivot Record: PSR-T-6 (the approval-time release, DD-9)

- **Blocker:** design §5 item 6 / DD-9 and requirements L59 ("[review approval] no longer releases bilateral contributor drafts") rest on the premise that "no status-4 rows remain after release". That premise is false for API-ingest results (out of scope, P-3, which must keep their behaviour) and for in-flight legacy results (out of scope, "no backfill"). Removing the conversion silently stops their contributor requests.
- **Alternatives:**
  - (A) **Recommended:** at approval, call `releaseContributors(resultId)` instead of the old conversion. It is status-4-only and idempotent, fills the owner, and sends the same emails. PSR-R-13's "no duplicate" is preserved.
  - (B) Keep the old `resultRequest` conversion only for results that have no `primary` row (ingest/legacy), and skip it for the new lifecycle.
  - (C) Leave the conversion removed. This regresses ingest and legacy results.
- **ADR impact:** none. It is a feature-level design decision (DD-9 amended), not a TRD ADR.
- **Status:** **approved by the user (2026-09-30): option A.**
- **Spec amended:**
  - requirements.md: the §4 Out-of-scope bullet, `PSR-R-13` (retitled and rewritten, with an amendment note) and the index row
  - design.md: §5 item 6 and `PSR-DD-9` (retitled, with an amendment paragraph)
  - tasks.md: the T-6 description bullet and the coverage row
- **Correction closure sweep:**
  - forward: a grep for "no longer releases|no longer converts|skip the bilateral draft|no status-4 rows remain" across requirements, design, tasks and proposal finds only the quoted amendment note
  - backward: the references to R-13/DD-9 in tasks.md L50 and L91 still read correctly
- Issue 3 is dispatched to the T-6 Implementer as part of attempt 2.

### `PSR-T-9` — Drawer: kind-aware decide/view + stale-accept handling

- **Status:** `[~]`: rework. The remaining wiring is carried to T-8.
- **Date:** 2026-09-30
- **Skills / effort:** `angular-developer`, `spartan` · medium

#### Attempt 1

- **Files changed:**
  - `contribution-request-drawer.component.{ts,html,spec.ts}` + its `CLAUDE.md` (re-stamped). New inputs: `acceptLabel` (default `null` → `acceptContribution`), `showAlignSlot` (default `true`), and the optional view field `requestKind`.
  - `contribution-request-drawer.copy.ts`: `acceptAsPrimary`, `requestKind`, `staleRequestMessage`.
  - `notification-item.component.{ts,spec.ts}`: only the `acceptOrReject` error branch changed. A 409 now shows an `information` toast "This request was already answered". The existing `finalize` closes the drawer and emits the refetch.
- **Red:** the source files were stashed while the specs were kept → 4/226 failed (exactly the new assertions), then the stash was restored. The Leader verified the stash list is unchanged (3 pre-existing entries).
- **Implementer verification:**
  - jest `contribution-request-drawer|notification-item` → 5 suites, 226/226
  - `ng lint` pass
- **Not Done (Implementer):** the capabilities are exposed, but nothing calls them with per-row data yet. The header sentence per kind was not built, because `drawerHeader()` lives in `notification-item`, which the brief kept to the error branch.
- **Reviewer: FAIL** (verbatim, layout condensed):
  - **Verified OK:** zero-touch (additive only; the defaults keep today's rendering). The 409 is a real HTTP 409, `err.status` is the correct check, and `finalize` resets all busy and popup state. Copy lives in `internationalization/`. No new tokens.
  1. **Discovered Issue:** `ContributionRequestDrawerHeaderParts` and its markup cannot express the bilateral-contributor sentence. (a) Nothing renders after `resultTitle`, so there is no place for "on behalf of {center}", which is also the only place the Creating Center appears for this kind (PSR-R-11). (b) There is no bold leading `{owner sp}`: `lead` is plain, and `requesterCode` forces the "from" prefix. The primary sentence fits the current shape. The fix lies in the drawer's files, which are outside T-8's Files list. **Violated Rule:** tasks.md PSR-T-9 Description + Files; design §6.1 "Bilateral contributor request" row and §6.2; PSR-R-10, PSR-R-11. **Remediation:** add the optional `leadCode?` (bold mono, rendered right after `lead`) and `suffix?` (rendered after `resultTitle`), each behind an `@if` guard so the output is byte-identical when they are absent. Add 2 drawer specs: the new fields render, and without them the text is unchanged.
  - **Scope verdict:** carrying the rest to T-8 is sound, except for issue 1. **Carried to T-8 (binding forward pointer):**
    - the header sentence per kind via `drawerHeader()`
    - the Accept label per kind, adding a plain "Accept" copy key
    - no Align for primary. Today `isBilateralResult && tocInitiative` projects Align, so the Falsifier currently **fails end to end**.
    - `requestKind` resolved from `request_type` + source, using the chip copy
  - **T-8's spec must assert**, for a pending `request_type:'primary'` bilateral notification after `openDrawer('details')`:
    1. `[data-testid="align-slot"]` is absent from the rendered DOM
    2. `tocInitiative` is unseeded and `drawerFocusAlign` is false
    3. `onDrawerAccept()` and the row Accept send the inert ToC payload and never open the "Map to your Theory of Change?" step
    4. the Accept text is `acceptAsPrimary`
    - Also: W1/W2 still shows `acceptContribution` with Align, and a bilateral contributor shows Align with a plain "Accept".
  - **ADVISORY:**
    - RISK: `notification-item/CLAUDE.md` was not re-stamped. The client §10 rule requires it in the same commit, so T-8's DoD must cover it, and T-9 must not be committed alone.
    - RELIABILITY: `acceptLabel() ?? …` renders an empty button if a caller passes `''`.

#### Attempt 2

- **Effort:** high. Same Implementer, resumed with the verbatim FAIL.
- **Files changed:** only the drawer `.ts/.html/.spec.ts`, its `CLAUDE.md` and the copy file.
- **Changes:**
  - `ContributionRequestDrawerHeaderParts` gains `leadCode?` (bold mono, rendered right after `lead` through a dedicated `@if/@else`) and `suffix?` (rendered after `resultTitle`).
  - The `@else` branch keeps the old markup unchanged.
  - New copy: `header.bilateralContributorVerb`, `header.bilateralContributorTail`, `header.onBehalfOf`, `footer.accept`.
- **Red → green:** the new positive test failed first. The next run exposed a whitespace bug ("SP09 , as primary…"), which the `@if/@else` split fixed. No stash was used.
- **Implementer verification:** jest `contribution-request-drawer|notification-item` → 228/228; `ng lint` passes.
- **Reviewer: PASS.** "With the new optional `leadCode?` and `suffix?` fields, the drawer can now build the bilateral-contributor sentence from design.md §6.1 / PSR-R-10." No DOM wrapper was added, and the existing header specs are untouched.
- **ADVISORY:**
  - READABILITY: the `leadCode`/`requesterCode` exclusivity is enforced only by convention, so T-8's `drawerHeader()` spec should assert that the contributor kind leaves `requesterCode` empty.
  - RISK: `notification-item/CLAUDE.md` must be re-stamped (T-8's DoD) in the same commit.
- **Status: `[~]`.** What was built passed. The remaining clauses are carried to **PSR-T-8** (binding) and verified by T-8's tests; T-9 flips to `[x]` when T-8 passes:
  - header per kind
  - `acceptLabel` per kind
  - `showAlignSlot=false` for primary
  - `requestKind`

#### PSR-T-6 Attempt 2 (appended after the Pivot Record)

- **Effort:** xhigh. Same Implementer, resumed with issues 1-2 verbatim, then issue 3 once the pivot was approved.
- **Files changed:**
  - `bilateral-center.service.ts` + spec: `request_type: CONTRIBUTION` on `activeRequests` and `dormantDraft`. Three where-clause tests (ownerless, swap, dormant) and one ownerless-save Falsifier test.
  - `results.service.ts` + `result.spec.ts`: `@Optional()` injection of `PrimaryProgramRequestService`. `_updateTocMapping` calls `releaseContributors(resultId)` where the conversion used to be. The approval tests are split: (a) already released, (b) ingest/legacy.
- **Reds:**
  - issue 1a/b/c: where-clause assertions
  - issue 2: a mutation that dropped the null guard → TypeError
  - issue 3a/b: red against attempt 1
- **Implementer verification:**
  - jest 307/307 (`bilateral-center|results.service|versioning.service`)
  - jest 148/148 (`result.spec`)
  - tsc 0 errors
  - eslint clean
- **Reported gaps:**
  - `results.service.ts:4324`: the approve-branch `find` has no `request_type` filter.
  - `_updateContributingInitiatives` (L4865-4945): same pattern.
- **Reviewer: FAIL** (verbatim, layout condensed):
  - Issues 1 and 2 are confirmed fixed, and the approval `releaseContributors` matches the amended PSR-R-13 / §5.6 / DD-9.
  1. **Discovered Issue:** Nothing proves approval can't create a duplicate. "No duplicate" rests entirely on `releaseContributors`' `find` criteria (`request_type: CONTRIBUTION`, `request_status_id: DRAFT`, `is_active: true`, L947-955), and no test checks them. Test (a) mocks `releaseContributors`, and T-3's idempotency test fakes it by having the second `find` return `[]`. Deleting the DRAFT filter keeps every test green while approvals re-release rows. **Violated Rule:** PSR-R-13 (amended) "MUST NOT create duplicate contributor requests for contributors already released"; tasks.md PSR-T-6 Falsifier "Review approval after release creates any new status-1 row → FAIL"; the Disqualifier. **Remediation:** in `primary-program-request.service.spec.ts` `releaseContributors()`, assert that `mockRequestRepoTx.find` is called with `where: objectContaining({ request_type: CONTRIBUTION, request_status_id: 4, is_active: true })`. Get the red by dropping the DRAFT filter temporarily.
     - Also in this rework: switch the injection to `@Optional() @Inject(forwardRef(() => PrimaryProgramRequestService))`, because of an import cycle `primary-program-request.service` → `notification.service` → `share-result-request.service` → …, which could crash at boot. Add `request_type: CONTRIBUTION` to the approve-branch `find` at L4316-4322.
  - **(a):** the provider resolves (it is exported by `ShareResultRequestModule`, and `ResultsModule` forwardRef-imports it), so it cannot skip silently. The only risk is the import cycle, which would crash at boot and is fixed with `forwardRef`.
  - **(c):**
    - L4316 is not a defect today, but it is fragile, so fix it now.
    - `_updateContributingInitiatives` is out of T-6 scope. The claim that it is "unreachable" is wrong: `updateBilateralResultReview` L4508 is the bilateral admin-edit path, and with `targetRequestStatusId=1` it could deactivate a pending primary swap row. **Follow-up (out of spec)**, logged here.
  - **ADVISORY:** RISK: nothing has booted the app since the new constructor dependency was added. The Leader runs a `start:dev` boot, or a DI metadata check, once no delegated agent is active.

#### PSR-T-6 Attempt 3 (final allowed)

- **Effort:** xhigh.
- **Files changed:**
  - `results.service.ts`: the injection is now `@Optional() @Inject(forwardRef(() => PrimaryProgramRequestService))`; `request_type: CONTRIBUTION` added to the approve-branch `find` (~L4336)
  - `result.spec.ts`: a where-clause test for that `find`
  - `primary-program-request.service.spec.ts` (test only): `releaseContributors` `find` criteria `{request_type: CONTRIBUTION, request_status_id: 4, is_active: true}`
- **Reds:**
  - dropping the DRAFT filter from the service temporarily → the criteria test failed
  - removing the new key temporarily → the where-clause test failed
  - Both were restored.
- **Implementer verification:**
  - jest 70/70 (`primary-program-request|RoleByUser`)
  - jest 307/307 (`bilateral-center|results.service|versioning.service`)
  - jest 149/149 (`result.spec`)
  - tsc 0 errors
  - eslint clean
- **Reviewer: PASS.** "All three items from the attempt-2 review are fixed in the attempt-3 delta, and nothing new came up." Everything confirmed in attempts 1 and 2 still holds.
- **ADVISORY:** RISK: the forwardRef DI fix is unverifiable by unit tests. **The Leader must boot `start:dev` once no delegated agent is active** (pending).
- **Final status: PASS** (attempt 3 of 3). Design §13 planned 1 review round and it took 3; see the Budget Tripwire below.
- **Requirements covered:**
  - PSR-R-12 (save while on hold doesn't fail; release on save after accept; no duplicate on re-save)
  - PSR-R-13 (amended)
  - PSR-R-15 (submit clause)
  - PSR-R-16
  - PSR-R-2 swap (block submit)
  - DD-5, DD-9 (amended)
- **Follow-ups (out of spec, recorded):**
  - `_updateContributingInitiatives` (`results.service.ts` L4865-4955, reachable from `updateBilateralResultReview` L4508): its unfiltered status-1 queries could deactivate a pending primary swap row when an admin edits an Approved result.
  - `reviewBilateralResult`'s reject branch (L4346) deactivates every active `share_result_request`, including `primary` rows.

## Budget Tripwire (2026-09-30, raised after PSR-T-6)

| Metric | design.md §13 | Actual so far | Delta |
|---|---|---|---|
| Tasks | 11 | 11 (7 `[x]`, T-9 `[~]`, T-8 in flight, T-10/T-11 pending) | 0 |
| LOC incl. tests | ~1,600–2,000 | ~7,100 (3,791 insertions in tracked files + 3,345 lines in new files; server + client so far, T-8 still in flight) | **≈ +5,000 (3.5×)** |
| Review rounds | 2 on T-3/T-5, 1 elsewhere | T-1 2, T-2 2, T-3 2, T-4 2, T-5 2, T-6 **3**, T-7 2, T-9 2 | +7 rounds |

- **Cause:**
  1. Tests dominate the LOC. Every Falsifier and regression demanded a real red run, so spec files grew several times over. `primary-program-request.service.spec.ts` alone is about 1,500 lines.
  2. The review rounds found **real defects**, not nitpicks: the `down` table name, owner null on the primary row, the round cancel on every call, swap-decline auto-moving to the owner, manual create never requesting, stale lead-project reads, cancelled rows still actionable, contributor save cancelling the primary request, the pivot on approval release, and the garbled socket sentence.
  3. One pivot (PSR-T-6 / DD-9).
- **Leader action:** per the Budget Tripwire rule, **stop and escalate to the user**. T-8 was already dispatched before the tripwire was raised; it is left to land, and no new task is opened until the user decides.

- **User decision on the Budget Tripwire (2026-09-30): "Continue to the end"**, at the same rigor. T-11 (the visual check and staging) stays with the user.

## PSR-T-3 follow-up (post-T-6): boot DI crash + `is_active` defense in depth

- **Leader boot check** (in place of `start:dev`, which would connect to the shared testing DB): a `ts-node` metadata script (in the scratchpad, not committed) loads `AppModule` first and reads `design:paramtypes`.
  - `ResultsService` (64 params), `BilateralCenterService`, `BilateralService`, `ShareResultRequestService`: every param resolves, and every forwardRef resolves.
  - **`PrimaryProgramRequestService` param 12 (`NotificationService`) = `Object`**, i.e. undefined at decoration time because of the import cycle that `ShareResultRequestService` already avoids with `forwardRef`. Nest would fail at boot ("can't resolve dependencies … index [12]"). Unit tests can't see it, because they use mocks.
- **Defect A (T-3):** fix with `@Inject(forwardRef(() => NotificationService))`.
- **Defect B (T-3, routed from the T-4 review):** `accept`/`decline` must add `is_active: true` to the locked `findOne`.
- **Dispatched** to an Implementer: effort high, only this file and its spec.

### `PSR-T-8` — Inbox rows: primary / bilateral contributor / Center notices (+ carried PSR-T-9 wiring)

- **Status:** rework
- **Date:** 2026-09-30
- **Skills / effort:** `angular-developer`, `spartan`, `tailwind-design-system` · high

#### Attempt 1

- **Files changed:**
  - `notification-type.constants.ts`: 3 enum members plus a splice case for the Center notices
  - copy: `header.primaryVerb`/`primaryTail`, `notificationItem.primaryRequestChip`/`contributorRequestChip`/`unknownCenterFallback`
  - `notification-item.component.{ts,html,spec.ts}`: kind getters, per-kind sentence/icon/chip, drawer wiring (`acceptLabel`, `showAlignSlot`, `requestKind`, header per kind), and a primary Accept that short-circuits the ToC step
  - `notification-item/CLAUDE.md` re-stamped
  - `build-unified-list.ts` untouched (classification is generic)
- **Red:** a temporary revert. **Green:** jest `notification-item|notification-type|build-unified-list` → 242/242; drawer 55/55; `ng lint` passes.
- **Reviewer: FAIL** (verbatim, layout condensed).
  - **Holds:** the §6.1 wording matches the mockups; W1/W2 is unchanged (DOM-proven); the missing-acronym fallback; *Needs your decision* (`build-unified-list` L77); the Center-notice composed sentence; the T-9 assertions (1)-(4).
  1. **Discovered Issue:** the row's result link changed behaviour unasked, and the row and drawer now disagree.
     - The contributor row dropped the in-app `navigateToResult()` in favour of `resultUrl()` in a new tab, while `onDrawerResult()` still navigates in-app.
     - For primary rows, the drawer's Result card goes through `navigateToResult()` → `obj_owner_initiative`, which is the requested SP. The user lands on SP09's bilateral-review page for a result that must not be in SP09's queue.
     - The test at spec L977-990 dropped `expect(navigateSpy)`, which weakens it.
     - **Violated Rule:** scope (none of PSR-R-9/10/11 or §6.1/§6.2 asks for this); CRD-R-3 (`docs/specs/changes/contribution-request-drawer/requirements.md` L113, L118); requirements L94 ("MUST NOT appear in any SP09 list, count or review queue").
     - **Remediation:** restore the contributor row's `navigateToResult` and the spy. Give primary requests one target (`resultUrl()` in a new tab) in both the row and `onDrawerResult()`. Add a test that the primary Result card never calls `navigateToResult`.
  2. **Discovered Issue:** the row sentences hard-code their copy in the `.html` in 6 places, although identical `copy.header.*` keys exist and the drawer reads them, so the row and drawer can drift. **Violated Rule:** tasks.md PSR-T-8 "Copy goes in `contribution-request-drawer.copy.ts`"; design §6.4; client CLAUDE.md §10 "No hard-coded English". **Remediation:** bind to `copy.header.*`, ideally building the row sentence from `drawerHeader()`.
  3. **Discovered Issue:** the carried T-9 clause `drawerViewFields().requestKind` is untested (deleting the line keeps the suite green), and the "showAlignSlot is false" test only checks `isPrimaryRequest`. **Violated Rule:** design §6.2; PSR-R-11; the T-9 carry; the T-8 DoD. **Remediation:** assert `requestKind` for primary, contributor, W1/W2 and Updates (null), and record the red. Read the drawer debug instance's `showAlignSlot()` and `acceptLabel()`.
  - **ADVISORY (4R):**
    - RISK: the blue chip reuses the "Submitted" status pair. `colors.scss` L275-280 rejects status pairs for kind chips, so use the primitives `--pr-color-blue-100/-700`.
    - RELIABILITY: a bilateral contribution row whose `owner_program_code` is null renders a broken sentence; add a fallback.
    - READABILITY: the Center is bolded on primary rows while the mockup shows it plain, and the link style differs from the mockup → T-11 HITL.
    - RELIABILITY: missing tests for: the `getResultNotificationTextParts` no-text/no-marker branches; the exact Center-notice sentence; a `build-unified-list` primary fixture.
    - READABILITY: `notification-item/CLAUDE.md` is ~255 lines against a 120-line cap (mostly pre-existing).
    - RISK (low): PrimeIcons `pi-flag`/`pi-users`, which §6.1 allows.

#### Attempt 2

- **Effort:** xhigh. Same Implementer, resumed with the verbatim FAIL.
- **Fix 1 (result link):**
  - `onDrawerResult()` navigates in-app only for `isBilateralResult && !isPrimaryRequest`; a primary row opens `resultUrl()` in a new tab from both the row and the drawer.
  - The contributor row is back to `navigateToResult()`, and the spy assertion is restored.
  - New test: the primary `onDrawerResult()` never navigates in-app.
- **Fix 2 (copy):** the row sentences are built with `@let h = drawerHeader()` from `copy.header.*`, so no literal English is left. Two copy-mutation tests change the copy at runtime and check the row. Red: a temporary hard-code in `drawerHeader()` made the test fail.
- **Fix 3 (tests):**
  - `requestKind` is asserted for primary, contributor, W1/W2 and Updates.
  - `showAlignSlot()`/`acceptLabel()` are read from the real drawer debug instance.
  - A null-`owner_program_code` fallback (`unknownProgramFallback`) was added, with a test.
- **Implementer verification:** jest `notification-item|notification-type|build-unified-list|contribution-request-drawer` → 7 suites, 306/306. `ng lint` is clean.
- **Reviewer: PASS.** "Rework attempt 2 of PSR-T-8 fixes all three issues from attempt 1."
  - No red was recorded for `requestKind`, and the Reviewer accepted that. Deleting the line yields `undefined`, which fails all four assertions.
  - "PSR-T-9's carried clauses … are now covered by T-8's tests, so T-9 can flip to `[x]`."
- **ADVISORY:**
  - READABILITY: the null-owner fallback reads "The primary Science Program , as primary Science Program, has tagged…" (a stray space and a repeated phrase). It is an edge case; give it its own verb.
  - Carried: prefer the `--pr-color-blue-100/-700` primitives over `--pr-status-submitted-*`. The bold Center on the primary row goes to the T-11 HITL check. The `notification-type.constants.spec` branches are missing.
- **DoD follow-up:** `notification-item/CLAUDE.md` was updated (link routing per kind, sentence from `drawerHeader()`, `unknownProgramFallback`) and re-stamped. The Leader grep-verified it.
- **Final status: PASS** (attempt 2 of 3).
- **Requirements covered:**
  - PSR-R-9 (incl. missing acronym)
  - PSR-R-10 (incl. W1/W2 BUT)
  - PSR-R-14 (render)
  - DD-10
  - and through the carry, PSR-R-11 and the T-9 clauses.

### `PSR-T-9` closure

- The clauses carried to T-8 (header per kind, `acceptLabel` per kind, `showAlignSlot=false` for primary with no ToC step, `requestKind` in view) are verified by T-8 attempt 2's tests, and the T-8 Reviewer confirmed it.
- **Final status: PASS.**
- **Implementer result:**
  - Defect A: `@Inject(forwardRef(() => NotificationService))` on param 12, with a comment. The other params were checked and are clean.
  - Defect B: `is_active: true` on both locked `findOne` calls. `!row` → `conflict` in both methods (`accept` used to return `not_found`). The pre-existing accept not_found test now expects `conflict`.
  - Red: the accept inactive-row test failed (`Received: not_found`). Then green.
  - jest `primary-program-request|RoleByUser|share-result-request` → 6 suites, 159/159. tsc clean. eslint clean.
- **Leader DI re-check** (`AppModule` loaded first): PrimaryProgramRequestService, ResultsService, BilateralCenterService, BilateralService, ShareResultRequestService, NotificationService and VersioningService all show **0 unresolved params and 0 broken forwardRefs**.
- **Reviewer (lens A): PASS.** "Both defects are fixed, and collapsing `not_found` into `conflict` matches the design." Design §4 lists 403/409/400 and no 404, and "cancelled" is explicitly a 409 case.
- **ADVISORY:**
  - READABILITY: `not_found` is now unreachable in `PrimaryDecisionOutcome` and in T-4's `case 'not_found'`. Remove it or mark it reserved.
  - RELIABILITY: the decline inactive-row test should also assert no `initiativeRepo` writes.
  - Still open: emails are sent before commit; the concurrency gap is recorded; some swap-decline assertions are missing.
- **Status: PASS.** T-3 and T-4 remain `[x]`.

## Post-T-8 compile defect (reported by the user, 2026-09-30)

- **Symptom:** the user's `ng serve` overlay showed `TS2339: Property 'leadCode' does not exist on type 'DrawerHeaderParts'` (`notification-item.component.html:151:21`).
- **Cause:** T-8's row template (`@let h = drawerHeader()`) reads `h.leadCode` / `h.suffix`, but `notification-item`'s local `DrawerHeaderParts` interface never got the two optional fields that T-9 added to `ContributionRequestDrawerHeaderParts`. Jest (`jest-preset-angular`) does not type-check templates, and neither does `tsc --noEmit` (client src CLAUDE.md §21.7). Only `ng build`/`ng serve` does, and no agent ran it, so all 306 specs stayed green.
- **Fix (Leader inline, 2 lines, the user was blocked):** added `leadCode?: string; suffix?: string;` to `DrawerHeaderParts` in `notification-item.component.ts`.
- **Gate added for the remaining client work:** after T-10 lands, the Leader runs `ng build` (template type-check) once no agent is active. The T-10 brief is amended to require a template type-check too.
- **Kaizen candidate:** client task verification must include an `ng build` (or `ng serve` compile) step, because Jest + `ng lint` cannot catch template type errors.

### `PSR-T-10` — Center side: on-hold / sent-back banner, ToC notice, primary-assignment response

- **Status:** rework
- **Date:** 2026-09-30
- **Skills / effort:** `angular-developer`, `spartan`, `tailwind-design-system` · high

#### Attempt 1

- **Files changed:**
  - `bilateral-api.service.ts` + spec: `GET_resultInitiativeId`
  - new `internationalization/bilateral-primary-assignment.copy.ts`
  - `section-zero-dashboard.component.*` + `CLAUDE.md`: the banner, picker disable / "(declined)" marks, and `primaryRequest` from GET plus the PATCH response
  - `section-toc.component.*`: the existing `!initiativeId()` notice now reads "Available once the primary Science Program accepts."
  - `tocCleared`: 0 code reads remain
  - PSR-R-17 skipped (MAY)
- **Implementer verification:**
  - jest `section-zero-dashboard|bilateral-api|section-toc` → 4 suites, 171/171
  - `ng lint` clean
  - **`ng build --configuration development` → 0 errors app-wide**: templates type-check, and this also confirms the Leader's `DrawerHeaderParts` fix
- **Reviewer: FAIL** (verbatim, layout condensed):
  1. **Discovered Issue:** for `sent_back` the banner shows an empty SP code. The server's `stateFor` (`primary-program-request.service.ts` L346-350) returns `program_code: null` with `declined_by_codes: [...]`. The client's `sentBack(request.program_code ?? '')` therefore renders "Declined by . Pick another primary Science Program". The test fixtures set `program_code` on a sent-back state, which is not the server's shape. **Violated Rule:** PSR-R-15; design §4. **Remediation:** build the banner from `declined_by_codes` (join them for the two-alignment case), falling back to `program_code`. Use server-shaped fixtures and add a two-code case.
  2. **Discovered Issue:** `none` with no owner renders nothing. The server returns `accepted` whenever an owner exists, so `none` always means ownerless. This contradicts the binding pointer at execution.md L132 ("sent-back banner without codes. Test it."). `submitBlockedReason()` renders only inside the banner, so the reason is never shown, despite the evidence table. PSR-R-1 says a failed auto-request must leave the result in the sent-back state. **Violated Rule:** execution.md L132; PSR-R-1; PSR-R-15 (submit unavailable while there is no primary SP); design §6.3. **Remediation:** for `none`, render the warning banner with no codes, plus `submitBlockedReason`, and add the copy. Alternatively the Leader records a decision to keep it silent and corrects the evidence.
  - **Verified OK:**
    - the envelope and field names match the server for both endpoints
    - legacy owners return `accepted`, so they never get the sent-back UI
    - the `tocCleared` grep
    - the sent_back and pending picker Falsifier tests would be red on the old code
    - copy lives in `internationalization/`, the pending string is exact, and no new tokens were added
    - the pending swap → `accepted`, and submit 400s come through the existing paths
  - **ADVISORY:**
    - RELIABILITY: the section-toc "Falsifier" test checks presence only (no DOM assertion of the notice).
    - RESILIENCE: the `currentResultId()` effect subscribe has no cancellation, so a stale GET can overwrite the PATCH state. Prefer `toObservable` + `switchMap` + `takeUntilDestroyed`.
    - READABILITY: the ToC notice also shows for an SP that was picked but never saved → T-11 HITL.
- **Leader adjudication:**
  - Both issues are in scope.
  - For issue 2, a `none` result was never picked or was never successfully requested, so "Pick **another**" is the wrong wording. The decision is a warning banner reading **"Pick a primary Science Program"** (no codes), plus `submitBlockedReason`, with the picker enabled. This follows the pointer's intent (pickable, sent-back-like) with wording that fits a first pick.

#### Attempt 2

- **Effort:** xhigh. Same Implementer, resumed with the verbatim FAIL and the Leader's wording decision.
- **Files changed:** the copy file (`banner.noneUnpicked` = "Pick a primary Science Program"), `section-zero-dashboard.component.ts` and its spec.
- **Changes:**
  - `sent_back` builds its codes from `declined_by_codes.join(', ')`, falling back to `program_code`.
  - `none` → a warning banner + `submitBlockedReason`, with the picker enabled.
  - The fixtures use the server shape. New test for the two-code case.
- **Red:** 3 tests failed for the right reasons. **Green:** 28/28.
- **Implementer verification:**
  - jest `section-zero-dashboard|bilateral-api|section-toc` → 172/172
  - `ng lint` clean
  - `ng build --configuration development` 0 errors
- **Reviewer: PASS.** "Rework attempt 2 fixes both issues from attempt 1." Both new tests would fail on the old code.
  - The first re-review run was cut by an API rate limit. It was re-dispatched to the same Reviewer; this is an environment event, not a FAIL.
- **ADVISORY:**
  - RESILIENCE: the effect subscribe has no cancellation, so a stale GET can overwrite fresher state.
  - RELIABILITY: the section-toc test checks presence only.
  - RELIABILITY: a null code on `pending` renders "Awaiting  acceptance…".
  - READABILITY: the folder `CLAUDE.md` note is stale. Dispatched as a doc-only fix.
- **Final status: PASS** (attempt 2 of 3).
- **Requirements covered:** PSR-R-15, PSR-R-2 (Center UI). PSR-R-17 (MAY) skipped as not cheap.
- **Decision:** the `none` wording is "Pick a primary Science Program" (Leader).

## Boot crash #2 (reported by the user, 2026-09-30): UnknownDependencies in `ResultsTocResultsModule`

- **Symptom:** `start:dev` fails with `Nest can't resolve dependencies of the ShareResultRequestService (… ?, NotificationService). Please make sure that the argument PrimaryProgramRequestService at index [16] is available in the ResultsTocResultsModule context.`
- **Cause:** `ResultsTocResultsModule` and `ResultsPackageTocResultModule` both **re-provide `ShareResultRequestService` locally** in their `providers` instead of importing it. They only call `resultRequest()`. T-4 added a required `PrimaryProgramRequestService` constructor param, and that service doesn't exist in those module contexts. The Leader's metadata DI check verified param *types*, not per-module provider resolution, so it could not catch this. Only a real Nest bootstrap can.
- **Fix (Leader inline, the user was blocked):** in `share-result-request.service.ts`:
  - `@Optional()` on `_primaryProgramRequestService`, with a comment explaining the two re-providing modules.
  - `dispatchPrimaryDecision` returns the `internal_error` mapping (generic 500, id-only log) when the service is absent. That never happens on the real decide endpoint, which lives in `ShareResultRequestModule`.
- **Sweep of other re-provided services that received new deps:**
  - `BilateralService`/`BilateralCenterService`/`BilateralAiService`: only in `bilateral.module`, which imports `ShareResultRequestModule` (exports `PrimaryProgramRequestService`). OK.
  - `ResultsService`: re-provided in `delete-recover-data` and `results-knowledge-products`, but its injection is already `@Optional`. OK.
  - `VersioningService`/`NotificationService`: no new constructor params.
  - `PrimaryProgramRequestService` deps: `NotificationModule` exports `NotificationService`, and the email module exports its service. OK.
- **Verification:**
  - tsc clean
  - jest `share-result-request` → 5 suites, 136/136
  - eslint clean
  - **Real boot pending:** the user re-runs `start:dev`.
- Sent for independent review (author ≠ auditor).
- **Kaizen candidate:** server tasks that add a constructor dependency must grep for modules that re-provide the service (`grep -rn "^\s+<Service>,$" --include=*.module.ts`), or boot the app.
- **Reviewer: PASS** (Boot crash #2 fix).
  - `@Optional` is the right minimal fix. Making `ResultsTocResultsModule` import `ShareResultRequestModule` back would create a module cycle.
  - The absent-service path is unreachable on the real decide endpoint, because the controller and its two callers live only in `ShareResultRequestModule`, which provides the service.
  - The sweep table confirms no other re-provided service is missing a required dependency.
- **ADVISORY:**
  - RELIABILITY: `@Optional` would hide a future removal of the provider from `ShareResultRequestModule`. A module-compile test or an absent-branch unit test would catch it.
  - RISK: a real `start:dev` boot is still the only end-to-end proof → **owed by the user**.
- **T-10 doc follow-up:** `section-zero-dashboard/CLAUDE.md` was updated (`none` banner, `sent_back` codes) and re-stamped.

## 3. Summary (2026-09-30)

| Task | Result | Attempts |
|---|---|---|
| PSR-T-1 migration + entity | PASS (with the real DB round trip, done by the user) | 2 |
| PSR-T-2 request/state service | PASS | 2 |
| PSR-T-3 accept/decline cascade | PASS, plus a follow-up (boot DI forwardRef, `is_active`) | 2 + follow-up |
| PSR-T-4 decide endpoint + payload | PASS | 2 |
| PSR-T-5 creation paths | PASS | 2 |
| PSR-T-6 ownerless guards | PASS (Pivot: PSR-R-13/DD-9 amended, user-approved) | 3 |
| PSR-T-7 Center notices read path | PASS | 2 |
| PSR-T-8 inbox rows | PASS, plus the Leader compile fix (`DrawerHeaderParts`) | 2 |
| PSR-T-9 drawer | PASS (wiring verified through T-8) | 2 |
| PSR-T-10 Center banner | PASS | 2 |
| PSR-T-11 HITL visual + staging | **Pending (user-owned)** | — |

- **Budget:** exceeded, about 3.5× the LOC (mostly tests) and roughly 20 review rounds. The tripwire was escalated, and the user chose "Continue to the end".
- **Out-of-spec changes in the tree:** `1787520000000-…` / `1787340000000-…` migration `down` table-name fix (user-requested). Commit it separately.
- **Owed by the user:**
  1. a real `npm run start:dev` boot of the server
  2. T-11, the visual check against `mockup/` plus the staging script in tasks.md §6, including the DB-level race check for concurrent accept/decline
  3. commits. Suggested split: PR 1 server (T-1..T-7 + follow-ups), PR 2 client (T-8..T-10); the migration fix as its own commit.
- **Open advisories worth a follow-up ticket:**
  - contributor-release emails are sent before commit (T-3);
  - `_updateContributingInitiatives` could deactivate a pending swap (T-6);
  - `reviewBilateralResult`'s reject branch deactivates `primary` rows (T-6);
  - the client effect has no request cancellation (T-10);
  - prefer the `--pr-color-blue-*` primitives for the primary chip (T-8);
  - the null-owner fallback wording (T-8).
- **Kaizen candidates:**
  - check migration table names against `@Entity`;
  - client tasks must run `ng build` (template type-check);
  - server tasks that add constructor deps must grep for modules that re-provide the service, or boot the app;
  - mock-only tests need value and criteria assertions (several FAILs were "a test that can't fail").

## PSR-T-11 — HITL evidence (partial, user, 2026-09-30)

- **Environment:** local server + client on this branch, against the testing DB. **The server booted**, which closes the "Boot crash #2" open item.
- **Result 9728** (bilateral, W3/Bilateral, Output · Innovation development), Center Bioversity (Alliance), primary SP01, contributor SP12:
  1. The primary row rendered as "Bioversity (Alliance) has tagged **SP01** as the primary Science Program of result 9728 - …", with the flag icon and the blue "Primary program request" chip. The user **accepted it** → it became an "Accepted by … · Sep 30, 2026" row with the green Accepted chip.
  2. **Only after the primary accepted** did the contributor row appear: "**SP01**, as primary Science Program, has tagged **SP12** as a contributing Science Program to result 9728 - … on behalf of Bioversity (Alliance)", with the people icon and the violet "Contributor request" chip. The user accepted it → Accepted.
- **Covers** staging-script steps 1–3 in spirit (create → primary row → accept → contributor released), plus PSR-R-9, R-10 and R-12 visually. User verdict: "funciona re lindo".
- **Still owed for T-11:**
  - the decline cascade (2 alignments → moved; both decline → sent back; 3 alignments → sent back);
  - the Center notices (accepted / moved / declined) in the Center user's inbox;
  - the W1/W2 regression row;
  - the Project Information banners;
  - a side-by-side check against the `mockup/` PNGs. Open visual point from the T-8 review: the Center name is **bold** on the primary row, while the mockup shows it plain.
  - the concurrent-accept race check.
- **Status:** `[~]`.
