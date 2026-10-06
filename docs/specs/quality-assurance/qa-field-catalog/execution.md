# Execution Log — `quality-assurance/qa-field-catalog`

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/quality-assurance/qa-field-catalog/` |
| Branch | `JuanGuzman-io/feature-qa-result-fields` (base `performance-refactor` @ `356ea3c24`) |
| Approval Mode | pre-approved (Juan David, 2026-10-06) — HITL (T-7) and escalations still stop |
| Leader | Claude Opus 5.5 (T1) · Implementer `akili-implementer` (sonnet) · Reviewer `akili-reviewer` (opus) |
| Persona check | `akili doctor --agents` → sections UNMARKED (no OUTDATED/MISSING); `--fix` not run: `.agents/` is a shared file on a spec branch — pending for `staging` |
| Budget (design §12) | 12 tasks · ~4 000–4 500 LOC · ~15 review rounds |

## Task Execution History

### QAC-T-1 — Catalog types, shape validator, skeleton definitions — PASS

- Date: 2026-10-06 · Attempts: 1 · Parallel with T-2
- Files: `onecgiar-pr-server/src/api/qa-catalog/definitions/{types,result-types,versions,validity,shape-validator,not-for-qa}.ts`, `definitions/sections/index.ts`, `qa-catalog.shape.spec.ts`
- Implementer verification: jest `qa-catalog.shape` 22/22; `tsc --noEmit` clean; eslint clean on own files
- Falsifier: control-list check disabled → 2 failed (`SELECT_WITHOUT_CONTROL_LIST` select case + multi_select/subfield case); restored
- Red run: 12 rejection tests failed on `toEqual` (Received `[]`) against a stub validator
- Evidence re-run (Leader inline): jest 22/22, eslint clean → VERIFIED
- Reviewer: PASS — all R-1 clauses, both AND IT MUST, R-3 rule, R-7 reason check covered one-fixture-per-rule
- ADVISORY (recorded, not tasks): duplicate subfield keys under one parent not detected (would collide on the unique index at sync); subfield `type` may be `list`/`object` with no nested subfields; duplicate `NOT_FOR_QA` entries not flagged; `['*', 'x']` mix accepted
- Decisions: `isValidIn` generic over `{valid_from, valid_to}`; `not-for-qa.ts` and `sections/index.ts` created under `definitions/**`; result-type `level` provisional (T-7 may revise)
- spawns: implementer 14 calls, 89 179 tokens, ended complete; reviewer 8 calls, 41 390 tokens, ended complete
- Requirements: QAC-R-1, QAC-R-3 (rule), QAC-R-7 (reason)
- auto-approved (pre-approved mode)

### QAC-T-2 — Catalog entities and migration — PASS

- Date: 2026-10-06 · Attempts: 1 · Parallel with T-1
- Files: `onecgiar-pr-server/src/api/qa-catalog/entities/qa-catalog-{result-type,section,field,version}.entity.ts`, `entities/qa-catalog.entities.spec.ts`, `src/migrations/1791305975048-QaCatalogTables.ts`
- Implementer verification: entity spec 8/8; `tsc` clean; eslint clean. Generator (against the reachable `.env` DB) emitted 305 statements; pruned to 9 (4 CREATE TABLE up; 4 DROP TABLE + 1 DROP INDEX down). Migration NOT run (owner runs migrations)
- Falsifier: `grep -c "queryRunner.query"` = 9 = `grep -c "qa_catalog"`
- Red run: metadata spec failed on missing entity modules before entities existed
- Evidence re-run (Leader inline): entity spec 8/8, tsc OK, eslint OK, counts 9/9 → VERIFIED
- Reviewer: PASS (full sweep) — columns match design §4, no FKs (DD-9), `valid_to` nullable
- Decisions: `parent_key` NOT NULL DEFAULT `''` (top-level) instead of NULL. **Execute-time spec edit:** `design.md` §4 `qa_catalog_field` row + new **DD-10** (reason: NULL would let duplicate top-level keys through the unique index; requirement meaning unchanged). Carry as a named conformance check into the next Reviewer briefs (T-3, T-6)
- ADVISORY: generator drift of 305 statements shows the `.env` DB differs from entities — confirm `migration:check:ci` in CI; unique index on 2×varchar(255) fits DYNAMIC row format only; entities intentionally not on `BaseEntity` (now in DD-10); section/result-type tables lack timestamps
- spawns: implementer 12 calls, 79 914 tokens, ended complete; reviewer 8 calls, 63 175 tokens, ended complete
- Requirements: QAC-R-6 (tables), QAC-R-3 (`valid_to`)
- auto-approved (pre-approved mode)

> **Owner instruction (2026-10-06):** the `QaCatalogTables` migration must NOT be run by agents — the owner reviews it first and runs it. Applies to T-12's local run as well.

### QAC-T-4 — Completeness guard — PASS

- Date: 2026-10-06 · Attempts: 1 · Parallel with T-6
- Files: `onecgiar-pr-server/src/api/qa-catalog/definitions/{completeness,scope,excluded-tables}.ts`, `qa-catalog.completeness.spec.ts`
- Implementer verification: completeness spec 11/11; 3 qa-catalog suites 41/41; lint clean
- Falsifier: prototype walk stopped at first class → "detects a column inherited from the base class" red (Expected `fixture_table.updated_by`) + 3 more cases red; restored
- Red run: stub `[]` → 7 tests failed on message assertions (one exposed a real bug: `@Entity()` without name → fixed with snakeCase resolution)
- Evidence re-run (Leader inline): 11/11, lint clean → VERIFIED
- Reviewer: PASS — single code path, not vacuous (asserts >20 result tables + `result`), snakeCase matches default naming (no namingStrategy in repo)
- Not Done / Assumptions (verbatim gist, no owed items): fixture extends `Auditable` (actual export, not `AuditableEntity`); pattern `^(result|results?_.*)$` matches 72 tables (67 pending, 5 real reasons); relation binding covers `fk_to_result`, `value_column` and `filter` keys; unnamed `@JoinColumn` assumed `<prop>Id`
- ADVISORY: unnamed `@JoinColumn` guess wrong when referenced PK ≠ `id` (zero occurrences today); owning `@ManyToOne`/`@OneToOne` without `@JoinColumn` invisible (none found); `control_list_table` not stale-checked; DD-8 coupling — binding a field to an out-of-scope table fails by design
- spawns: implementer 17 calls, 122 236 tokens, ended partial (assumptions only); reviewer 21 calls, 85 339 tokens, ended complete
- Requirements: QAC-R-7, DD-3
- auto-approved (pre-approved mode)

### QAC-T-6 — Service, mapper, controller, route, auth — PASS (attempt 3)

- Date: 2026-10-06 · Attempts: 3 · Parallel with T-4 (attempt 1)
- Files: `src/api/qa-catalog/qa-catalog.{service,mapper,controller,module,fixtures}.ts` + specs (`service`, `mapper`, `controller`, `module`), `dto/qa-catalog-{query,response}.dto.ts`, `src/api/modules.routes.ts` (route `qa`), `src/app.module.ts` (module import + JWT exclude `api/qa/catalog`), `src/app.module.spec.ts`, `src/shared/guards/throttler-exclude-bilateral.guard.ts` (+ new spec)
- P-11 settled: global throttle 100/min applied to `api/qa` → guard prefix list `['/api/bilateral','/api/qa/']` + `@SkipThrottle()` on the controller (bilateral parity)
- **Attempt 1** — Implementer: 15 suites/136 tests incl. consumer specs; falsifiers red (mapper spread-then-delete 5/5 red; exclude removed → app.module spec red). Evidence re-run: 7 suites/58 VERIFIED. Reviewers (parallel lenses): security PASS; conformance **FAIL** — declared-but-empty year returned 200 `{[],[],[]}` (requirements.md:176/186/195-198; controller spec locked it in)
- **Attempt 2** (effort xhigh) — 404 when undeclared or no valid field; controller spec on FIXTURE_SOURCE + real-catalog 2026 → 404 test. Red 4 tests; falsifier same 4. Re-run 61 VERIFIED. Reviewer **FAIL** — check ran before the section filter; field valid 2026 in section retired 2025 → empty 200
- **Attempt 3** (effort xhigh) — 404 check on the final projected `fields`. Red: new test "did not throw"; falsifier (check moved back) → 1 failed. Re-run 62/62 VERIFIED. Reviewer **PASS** — traced every path; no empty 200 remains
- Execute-time spec edit: `design.md` §5 line 71 + §6 line 85 widened to "404 when year not declared or the projected response has no fields" (aligns design with R-9; requirement unchanged)
- Not Done / Assumptions (no owed items): `required_when` not in the response (not in agreed shape); field whose section is invalid that year is dropped; `generated_at` ends `.000Z`; no `ResponseInterceptor` envelope (raw contract body); no 429 test through the real AppModule
- ADVISORY: anyone sending a non-empty `x-api-key` triggers one CLARISA validate call per request with no rate limit (same exposure as bilateral — cache or keep throttling); `@SkipThrottle` and the prefix list overlap — the **prefix list is the effective mechanism**; never-logged test runs without the global `HttpExceptionFilter`; guard class name `ThrottlerExcludeBilateralGuard` now also covers `/api/qa/` (rename / doc in `src/CLAUDE.md` §7.4 pending for `staging`); fixtures file under `src/`; empty `result_types: []` scope accepted by the shape validator
- Open with owner: auth mechanism question re-raised 2026-10-06 ("¿Podemos usar APIKey?") — CLARISA key (implemented, DD-6) vs dedicated env key; awaiting answer. A change would be a spec amendment + T-6 rework
- spawns: implementer 26 calls, 126 488 tokens, ended partial (assumptions); reviewer(conformance) 10 calls, 93 450 tokens; reviewer(security) 13 calls, 94 076 tokens; implementer 8 calls, 87 424 tokens; reviewer 6 calls, 32 134 tokens; implementer 9 calls, 71 109 tokens; reviewer 9 calls, 58 206 tokens — all ended complete
- Requirements: QAC-R-3, R-4, R-9, R-10, R-12
- auto-approved (pre-approved mode)

### QAC-T-3 — Boot-time sync service — PASS

- Date: 2026-10-06 · Attempts: 1 · continuations: 1 (module wiring — `TypeOrmModule.forFeature` + provider, deferred until T-6 closed because both touch `qa-catalog.module.ts`)
- Files: `src/api/qa-catalog/qa-catalog-sync.service.ts` + `.spec.ts`, `definitions/content-hash.ts` (`stableStringify`, `computeCatalogContentHash`), `qa-catalog.module.ts` (wiring), `qa-catalog.module.spec.ts`
- Implementer verification: sync spec 10/10; module/app.module 16/16; tsc + eslint clean
- Red run: stub `sync()` → (a) "Expected 7 Received 0", (b) log line missing, (d) orphans `[]`, (c),(c2),(c3),(e), version red
- Falsifiers: delete orphans → (d),(f) "Expected 0 Received 1"; compare always changed → (b) "Expected 0 Received 7"; provider removed → module spec red
- Evidence re-run (Leader inline): all qa-catalog + app.module + throttler suites 115/115 (twice), tsc OK → VERIFIED
- Reviewer: PASS — R-6 idempotence via normalized compare, no delete path, failure caught with class + counts only, DD-10 named check holds (`parent_key ''`)
- Decisions: `synced_at` via SQL `CURRENT_TIMESTAMP`; a field edit also updates the version row hash; subfield rows inherit parent section/result types/validity, `order` = index, `required_confirmed` false, `description` null; no transaction (next boot re-syncs, DD-1)
- ADVISORY: content hash covers `storage`/`required_confirmed` → a storage-only change forces a revision bump (T-5 accepted as "effective content"); **`onApplicationBootstrap` is awaited before `listen` — a slow-but-reachable DB delays startup (no query timeout); detaching the sync would harden R-6 — raised to owner, not actioned**; concurrent container boots → unique-index error caught; `idOf` dot-joined ids; real MySQL idempotence pending T-12
- spawns: implementer 15 calls, 104 861 tokens, ended partial (wiring owed); implementer (continuation) 9 calls, 94 489 tokens, ended complete; reviewer 11 calls, 81 849 tokens, ended complete
- Requirements: QAC-R-6, QAC-R-3
- auto-approved (pre-approved mode)

### QAC-T-5 — Snapshot and catalog-version integrity — PASS (attempt 2)

- Date: 2026-10-06 · Attempts: 2
- Files: `definitions/snapshot-check.ts`, `qa-catalog.snapshot.spec.ts`, `scripts/qa-catalog-snapshot.ts`, `__snapshots__/qa-catalog.snapshot.json` (2026 rev 1, 9 `result_type:` keys), `package.json` (`qa-catalog:snapshot`)
- Consumers: `grep -n '"qa-catalog' package.json` before → 0 hits, after → line 28
- **Attempt 1** — 10/10; script idempotent (md5 `c2daa009…` twice); red runs for each rule; falsifier (unsorted hash) → 3 red. Re-run VERIFIED. Reviewer **FAIL** — script overwrote the snapshot unconditionally and the freshness message pointed at it, laundering removals/unbumped changes (QAC-R-2, R-8)
- **Attempt 2** (effort high) — `guardedSnapshotWrite` refuses to write on violations (exit 1); message reworded; advisory-grade extras: `subfield:<parent>/<sub>` namespace, revision decrease rejected, valid_to-only fixture, section/result_type removal fixtures. Falsifier (guard removed) → 2 guarded-write tests red "Expected false Received true" (no pre-guard red: guard written first). Manual: removing `policy_change` → "NOT written", exit 1, file unchanged. Re-run 19/19 VERIFIED. Reviewer **PASS**
- Execute-time spec edit: `requirements.md` §7 row "Key removed or renamed" — gap recorded (committed snapshot tamper caught only by PR review; key reuse has no gate)
- ADVISORY: valid_to fixtures use shape-invalid `2026→2025`; corrupt snapshot JSON throws raw parse error (fail-closed); `scripts/` under `src/` counted in coverage
- spawns: implementer 11 calls, 96 061 tokens; reviewer 7 calls, 35 833 tokens; implementer 10 calls, 78 019 tokens; reviewer 8 calls, 67 741 tokens — all ended complete
- Requirements: QAC-R-2, QAC-R-8
- auto-approved (pre-approved mode)

## Spec amendment — 2026-10-06 (owner decision, before T-7)

- Owner: "tener los procedimientos no indica que tengamos todos los campos… es un buen inicio al menos mostrar estos campos obligatorios mientras se terminan de añadir los demás campos".
- Edits: `requirements.md` QAC-R-11 (validation functions define required-ness, not the field set; staged load — stage 1 = at least every required field; `PENDING_CATALOG` list) + index row; `design.md` new **DD-11**; `tasks.md` T-7 (inventory lists every field, marks required vs optional), T-8 (create `definitions/pending-catalog.ts`, guard subtracts it), T-12 (`PENDING_CATALOG` allowed, count reported). Forward sweep: `grep -n "every field\|all fields\|no \`pending\`"` → remaining hits consistent.
- Inputs received in `tmp/` (git-excluded locally): 14 `validation_*_P25` definitions. Not received: `validation_link_result_P25`, `validation_partners_P25`, `validation_toc_P25`; portfolio query output.
- Migration `QaCatalogTables` run by the owner (2026-10-06).
- Owner (2026-10-06): `validation_link_result_P25`, `validation_partners_P25`, `validation_toc_P25` are not needed — not used for required-ness; fields governed only by them are recorded as "no live rule". Relayed to the T-7 part-A worker.
- 2026-10-06: T-7 inventory drafts written — part A `inventory/2026-A-common-and-outputs.md` (139 rows; 22 open questions), part B `inventory/2026-B-outcomes-impact-ipsr.md` (199 rows; 15 open questions). Owner: `result_questions` ids are equal across environments (verification query handed over). Questions 1–3 of part A (geo extra scope bug, contribution value 0, impact-area list shape) sent to Santiago Sanchez Correa by Slack DM on the owner's instruction: https://cgiar-ibd.slack.com/archives/D040EAE8Z71/p1791314287953399
- 2026-10-06: `result_questions` check run by the owner in test and prod. Innovation P25 questions 101–121, 138, 147–149 (24 rows): identical ids, parents and texts in both → refutes inventory A's "ids differ per environment" for these (§9 Q16 closed: bind by id). Fingerprints still differ (test n=27 `8abe3e1c…`, prod n=26 `c3103f05…`) only because of the **policy change "related to" options** (result_type 1, version null): test 50 "Policy change" + 51 "The capacity development…" under parent 49; prod 50 = "The capacity development…" under parent 48, no 51. → `policy_change.related_to` must NOT be bound by question id or parent id; follow-up query requested.
- 2026-10-06: policy change questions (result_type 1) — test: root 49 "Is this result related to", options 50 "Policy change", 51 "The capacity development…"; prod: root 48, options 49, 50 (same texts, ids shifted by one). Decision for the inventory review: bind `policy_change.related_to` structurally — options = children of the single level-1 question of `result_type_id = 1` (no hard-coded ids); control list `policy_related_questions` resolved per environment. Note for the future results-to-QA proposal: option ids for this list are environment-specific; QA must match on label, not id.
- 2026-10-06: Santiago Sanchez answered: (1) geo extra scope — bug, it should be validated → catalog follows the intended rule (conditionally required; function bug recorded as lateral finding); (2) contribution value must be > 0 → required_when value > 0 (client accepting 0 = lateral finding); (3) impact areas → one control list per area (no join filter needed). Relayed to the T-7 consolidation worker.
- 2026-10-06: owner chose to fix the geo extra-scope bug themselves. Corrected function written to `tmp/validation_geo_location_P25.FIXED.sql` (not in the repo; applied manually by the owner in test and prod): reads `result.extra_geo_scope_id`, fails when `has_extra_geo_scope = TRUE` and no extra scope is chosen, and branches on the extra scope id instead of the boolean (old lines 142, 144, 187, 204). No DEFINER clause. Contribution > 0 needs no function change (the function already enforces it); the client accepting 0 is a client-side fix, not done here.
- 2026-10-06: T-7 consolidated for HITL — `inventory/REVIEW.md` (28 decisions D1–D28 from 31 open questions; 11 change or define keys: D1–D8, D12, D17, D19; stage 1 = 169 fields, PENDING_CATALOG = 168, NOT_FOR_QA = 1; 47 in-scope tables). Mapping A 22/22, B 15/15; totals 338 = 139 + 199. **HITL pause: awaiting owner review — keys not frozen.** T-7 stays `[~]`.
