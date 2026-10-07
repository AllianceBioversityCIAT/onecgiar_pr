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
- 2026-10-06: D15 and D27 suspicions sent to Santiago Sanchez by Slack on the owner's instruction (owner leans to "it's fine"): https://cgiar-ibd.slack.com/archives/D040EAE8Z71/p1791315422008899 — awaiting answer; no function changed.
- 2026-10-06: **HITL — inventory approved** by the owner with defaults and a progress rule ("avancemos tal como está todo… no quedarnos atascados"). Model-extending defaults D1, D2, D16 deferred → affected fields to `PENDING_CATALOG` (no change to the approved model); D15/D27 follow the live functions. Recorded in `inventory/REVIEW.md` §7. Keys frozen.

### QAC-T-7 — 2026 inventory draft (HITL) — PASS (owner approval)

- Date: 2026-10-06 · Workers: part A (70 calls, 361 621 tokens), part B (132 calls, 478 059 tokens), consolidation (26 calls, 114 484 tokens) — all ended complete
- Files: `inventory/2026-A-common-and-outputs.md`, `inventory/2026-B-outcomes-impact-ipsr.md`, `inventory/REVIEW.md`
- Premises settled: P-6 (live definitions supplied in `tmp/`, 14 functions; 3 declared unnecessary by the owner), P-12 (2026 form = client result-detail routed by `resultDetailRouting`, gated by phase year). P-5 still open (portfolio query) — does not affect the inventory
- Verification: every row cites an origin; per-type control counts vs rows recorded in each table; question mapping A 22/22, B 15/15; totals 338 = 139 + 199
- Closing gate: HITL owner approval (this task's Review = checklist on an artifact the owner reviewed; no code)
- Requirements: QAC-R-5, QAC-R-11 (as amended), QAC-OQ-4

> **Owner mandate (2026-10-06):** "Toma decisiones ahora… Haz que funcione el endpoint y no te extiendas… con buenas prácticas y toda la burocracia." From here the Leader decides open questions itself (recorded, not asked), keeps scope to the endpoint, and keeps the review gates. Escalations still stop.

### QAC-T-8 — Catalog: common sections — PASS

- Date: 2026-10-06 · Attempts: 1
- Files: `definitions/pending-catalog.ts` (new), `definitions/sections/{shared,general-information,toc-alignment,contributors-partners,geographic-location,evidence,linked-results}.ts` (new), `definitions/{completeness,types,scope,excluded-tables,not-for-qa,versions}.ts`, `sections/index.ts`, `__snapshots__/qa-catalog.snapshot.json`, specs (completeness, shape, controller, service)
- Counts: 54 catalogued (43 fields + 11 subfields); 79 common inventory rows = 54 + 24 pending + 1 no-column; 18 tables into scope; `PENDING_CATALOG` 32 column entries; `NOT_FOR_QA` 146 entries; 2026 revision 2 (69 snapshot keys)
- Implementer verification: 9 suites / 112 tests; tsc + eslint clean
- Falsifiers: `general.title` → `result.title_x` → stale + uncatalogued red; removing a pending entry → uncatalogued red. Red run: tables in scope, nothing transcribed → 246 failures
- Evidence re-run (Leader inline): 112/112, tsc OK, snapshot script idempotent (md5 `e68baab7…`) → VERIFIED
- Reviewer: PASS, conditional on two spec tensions → resolved by the Leader under the owner mandate: (1) QAC-R-11 stage 1 excepts D1/D2-deferred fields (3 function-required + 1 UI-required 2-hop fields); (2) QAC-R-5 — subfield conditions stay in the inventory (no `required_when` on subfields). Execute-time spec edits: `requirements.md` QAC-R-5, QAC-R-11; `inventory/REVIEW.md` §7.1. Owner note recorded: ToC can map to several results/indicators/targets → `toc.entries` is a `list`
- Decisions: annual-updating `general.*` block owned here (restricted to innovation_development + innovation_use); `required_when` pseudo-fields `result_type`, `is_replicated`; `linked.results` multi_select; invented subfield labels `directory_user`, `toc_result`
- ADVISORY: `is_replicated` pseudo-field points at a `NOT_FOR_QA` column (QA cannot evaluate that condition); `general.lead_contact_person` required on the text column; pending entries on already-bound columns never go stale — sweep by reason in T-12; `linked_results` with ALL_TYPES vs innovation_use page — check in T-10
- spawns: implementer 35 calls, 223 035 tokens, ended complete; reviewer 17 calls, 135 142 tokens, ended complete
- Requirements: QAC-R-1, R-7, R-11 (common part)
- auto-approved (pre-approved mode)

### QAC-T-9 — Catalog: output types — PASS (attempt 3)

- Date: 2026-10-06 · Attempts: 3
- Files: `definitions/sections/{knowledge-product,capacity-sharing,innovation-development}.ts` (new), `definitions/{scope,excluded-tables,not-for-qa,pending-catalog,versions}.ts`, `sections/index.ts`, snapshot (2026 rev 3, 107 keys), specs (controller, service, shape → revision 3)
- Counts: 60 inventory rows → 35 catalogued (30 fields + 5 subfields), 24 D2-deferred (15 KP child-table rows, 9 budget rows), 1 no-storage (D26); other_output has no type-specific fields
- **Attempt 1** — 112/112; falsifier `capacity_sharing.male_using` → uncatalogued; red 75 uncatalogued. VERIFIED. Reviewer **FAIL**: D2 tables (5 KP child + 2 budget) left in `excluded-tables.ts` instead of in scope with `twoHop` pending entries (QAC-R-7/R-11, T-8 disqualifier). 2-hop claim confirmed at entity source
- **Attempt 2** (xhigh) — 7 tables into scope; NOT_FOR_QA + `twoHop`/`stage2` pending. Red 98 uncatalogued; falsifier `results_kp_metadata.is_isi` → exactly that. VERIFIED. Reviewer **FAIL**: `non_pooled_projetct_budget` invisible (name outside `RESULT_TABLE_PATTERN`), header comment false
- **Attempt 3** (xhigh) — table into scope (10 NOT_FOR_QA, 2 pending); sweep of inventory §6 for non-`result*` names → evidence, evidence_sharepoint, linked_result (already in scope), non_pooled (fixed). Red 12 uncatalogued; falsifier `kind_cash` → exactly that. VERIFIED (112/112). Reviewer **PASS**
- Decisions (Leader mandate): KP child tables + budgets D2-deferred (so `is_isi_cg`, `accessibility_cg` not in stage 1); D17 read-only KP fields stage 1 with description note; D4 `length_of_training` + `degree` subfield; per-question control lists for question-backed rows (D27 `is_active` filter); D12(b) developers/collaborators optional unconfirmed; `required_when` approximations (`melia_previous_submitted=false`, `is_new_variety=true`, `nature eq 12`)
- ADVISORY: guard's name pattern misses non-`result*` tables — scope is the only gate for them (sweep each later task); 4 question-backed fields share one binding, split by control list in results-to-QA; `order` conventions differ; melia_type NULL branch
- spawns: implementer 38/178 367, 14/113 982, 12/84 132; reviewer 20/136 312, 9/71 596, 7/68 931 (calls/tokens) — all ended complete
- Requirements: QAC-R-1, R-7, R-11 (outputs)
- auto-approved (pre-approved mode)

### QAC-T-10 — Catalog: outcome and impact types — PASS (attempt 2)

- Date: 2026-10-06 · Attempts: 2
- Files: `definitions/sections/{policy-change,innovation-use}.ts` (new), `definitions/{scope,excluded-tables,not-for-qa,pending-catalog,versions}.ts`, `sections/index.ts`, snapshot (2026 rev 4, 154 keys), specs (real-catalog revision → 2026.4; fixture-pinned stay 2026.3), **sweep of all section files** (`innovation-development.ts`, `knowledge-product.ts` descriptions), new `qa-catalog.description-provenance.spec.ts`
- Counts: PC 4 catalogued / 3 pending; IU 13 fields + 26 subfields catalogued, 5 + 12 pending; other outcome / impact contribution own no fields (D18); 6 tables into scope; sweep for non-`result*` names → none new
- **Attempt 1** — 112/112; falsifier `result_ip_measure.quantity` → uncatalogued; red: tables neither in scope nor excluded. VERIFIED. Reviewer **FAIL**: authored notes in `description` (QAC-R-11 last bullet), same drift already in T-9
- **Attempt 2** (high) — descriptions restricted to verbatim form help text across all section files (IU rows 3/26/27/28 and PC implementing_organizations from client source; KP read-only notes and D12 note moved to comments); provenance spec (red: 42 offenders on attempt-1 content; falsifier "live function" → red). 114/114 VERIFIED. Reviewer **PASS** (5 spot-checks verbatim)
- Decisions (Leader mandate): IU reuses T-8 `linked.*`; D15 follows live function; D12(b) rows stage 1 optional unconfirmed; D3(a) single `institution_type`; D13 group rule approximated as `required_when` on each list (comment); D28 id-vs-level unverified (comment)
- ADVISORY: provenance guard is pattern-based (does not prove form origin); its `>20` minimum is close to the current ~30
- spawns: implementer 46/180 032, 30/107 301; reviewer 23/126 778, 8/86 406 (calls/tokens) — all ended complete
- Requirements: QAC-R-1, R-7, R-11 (outcomes)
- auto-approved (pre-approved mode)

## Budget tripwire — 2026-10-06 (after QAC-T-10)

- Budget (design §12): 12 tasks · ~4 000–4 500 LOC · ~15 review rounds. Actual: 10 of 12 tasks closed; **16 review rounds** (T-6 4, T-9 3, T-5 2, T-10 2, others 1); remaining T-11 (IPSR), T-12 (close-out).
- Cause: data tasks needed reworks on guard-coverage conventions (D2 tables, non-`result*` names) and description provenance; each lesson is now carried into the next brief.
- Escalated to the owner; execution paused before T-11.
- Owner answer (2026-10-06): "Si" — continue with T-11 and T-12 past the budget, no further stop unless something breaks; `.env` of this worktree points to the DB where the migration ran (owner confirmation).

### QAC-T-11 — Catalog: innovation package (IPSR) — PASS (attempt 3)

- Date: 2026-10-06 · Attempts: 3
- Files: `definitions/sections/{ipsr-shared,ipsr-step-1,ipsr-step-2,ipsr-step-3,ipsr-step-4}.ts` (new), `definitions/sections/{shared,geographic-location,index}.ts`, `definitions/{scope,excluded-tables,not-for-qa,pending-catalog,versions}.ts`, snapshot (2026 rev 5, 197 keys), specs (controller, service, shape)
- Counts: 136 IPSR inventory rows → 35 catalogued keys incl. own geo (13 + 3 fields, 19 subfields), 98 pending/deferred (D1/D2/D16/D19), 2 merged into `institution_type` (D3a); 10 tables into scope; 6 tables excluded with real reasons (§7.2); entity-less `result_ip_step_three_evidence` recorded as a known gap
- **Attempt 1** — 114/114; falsifier facilitators `first_name` → uncatalogued; red 133. VERIFIED. Reviewer **FAIL**: IPSR geography covered by common `geo.*` keys carrying required/confirmed rules no IPSR function applies (QAC-R-5)
- **Attempt 2** (xhigh) — common geo keys restricted to `NON_IPSR_TYPES`; own `ipsr_step_1.geo_scope/regions/countries` (optional, unconfirmed). 116/116 VERIFIED. Reviewer **FAIL**: copied `geo_scope_role_id: 1` filter — IPSR writer never sets it (binding pointed at no data)
- **Attempt 3** (xhigh) — filters `{ is_active: 1 }` per inventory; shape assertion (red on attempt-2 content; falsifier → red). 116/116 VERIFIED. Reviewer **PASS**
- Decisions (Leader mandate): `eoi_outcomes` (function-required, 2-hop) deferred under amended R-11; `complementary_innovations` multi_select (type change when D2 lands — comment); step 2.2 fully pending (D19); D12(b) facilitators/reference materials optional unconfirmed; group rules in comments; mirror evidence columns PENDING instead of §7.3's NOT_FOR_QA (conservative)
- Not Done (carried to T-12): `results_innovations_use_measures` still `PENDING` in `excluded-tables.ts` (T-10 leftover)
- spawns: implementer 49/214 115, 26/106 672, 10/67 940; reviewer 30/142 582, 13/77 855, 5/60 060 (calls/tokens) — all ended complete
- Requirements: QAC-R-1, R-5, R-7, R-11 (IPSR)
- auto-approved (pre-approved mode)

### QAC-T-12 — Close-out: pending list, contract doc, local sync run — PASS

- Date: 2026-10-06 · Attempts: 1
- Files: `definitions/excluded-tables.ts` (17 placeholder reasons → real reasons; `results_innovations_use_measures` excluded — inventory binds IU measures to `result_ip_measure`), `qa-catalog.excluded-tables.spec.ts` (new), `onecgiar-pr-server/docs/qa-catalog.en.md` (new contract + change log v1)
- Verification: 11 suites / 119 tests; tsc + eslint clean; red 2/3 on old reasons (falsifier = leftover pending reason)
- Local run (node v22.23.2 vs contract 20.x — booted fine; port 3400 from `.env`; migration NOT run by agents): before boot 0 rows; boot #1 `qa-catalog sync: inserted=198 updated=0 orphans=[]` → result_type 9, section 21, field 167 (106 + 61), version 1 (2026, P25, rev 5) = 198; boot #2 `inserted=0 updated=0 orphans=[]` (closes the T-3 real-MySQL gap); curl: no key 401, bogus key 401 (CLARISA reached, 0.67 s), JWT-only 401, abc/2023 without key 401 (guard before validation); server stopped
- Evidence re-run (Leader inline): 119/119, tsc OK, nothing listening on 3400 → VERIFIED
- Reviewer: PASS (full) — doc matches controller/DTO/guard/mapper/service; no table/column leakage; no secrets; counts consistent
- Gap: no live 200/400/404 — no QA CLARISA key yet (unit/controller tests only). Run a live check and add a change-log row when the key exists
- ADVISORY: 11 exclusion reasons rest on inventory silence (impact-area/SDG legacy tables still read by `results-toc-results.service.ts:397-413` for level-1 results) — **owner to ratify**; `LEGACY_MAPPING` citation too broad; doc cites REVIEW D# IDs QA cannot look up; `/pending/i` test pattern could flag a legit reason
- spawns: implementer 42 calls, 155 699 tokens, ended complete; reviewer 31 calls, 98 545 tokens, ended complete
- Requirements: QAC-R-6, R-7, R-9, R-10, R-11
- auto-approved (pre-approved mode)

## Constitution Impact: QAC-T-1…T-12

- New backend module `onecgiar-pr-server/src/api/qa-catalog/` (route `qa`, `GET /api/qa/catalog`), new tables `qa_catalog_*`, new contract doc `onecgiar-pr-server/docs/qa-catalog.en.md`, JWT exclude + throttler prefix `/api/qa/` in shared surfaces.
- Child guide: not required now; `onecgiar-pr-server/src/CLAUDE.md` module index should gain a `qa-catalog` row, and §7.4 (throttling) should note that `ThrottlerExcludeBilateralGuard` also exempts `/api/qa/`.
- Pending (apply on `staging`, shared-file discipline): TRD §7 Integration Points row —
  `| QA platform (service consumer) | GET /api/qa/catalog?phase_year= — read-only field catalog (result types, sections, fields) per phase year | Inbound, CLARISA API key (x-api-key, permission /api/qa/catalog), JWT-excluded, throttle-skipped | Contract + change log: onecgiar-pr-server/docs/qa-catalog.en.md; catalog defined in code, mirrored to qa_catalog_* at boot (idempotent, never deletes); additive-only (ADR-004); 404 for uncatalogued years (never an empty 200); spec quality-assurance/qa-field-catalog |`
- CodeGraph re-index pending.

## Summary — 2026-10-06

- **Status:** all 12 tasks `[x]` (T-13, 2025 load, optional — not started).
- **Delivered:** `GET /api/qa/catalog?phase_year=2026` → 9 result types, 21 sections, 106 fields + 61 subfields (catalog_version 2026.5); 2023/2025 → 404; CLARISA key required.
- **Budget:** 12 tasks (as planned); review rounds 21 vs ~15 (tripwire hit after T-10, owner approved continuing); LOC dominated by catalog data as estimated.
- **Deferred to stage 2 (`PENDING_CATALOG`, 146 column entries):** D1 (2-level nesting), D2 (2-hop bindings — ToC indicators/targets per mapping, subnational, KP metadata, budgets, IPSR evidence), D16 (IPSR inline-SQL sections), D19 (step 2.2); subfield `required_when`; `required_when` not exposed in the response (agreed shape).
- **Open for the owner:** ratify the 11 inference-based table exclusions; register QA's CLARISA client and run a live 200 check; paste `tmp/validation_geo_location_P25.FIXED.sql` (geo extra-scope bug) after the impact query; D15/D27 function fixes (owner's own track); client accepting contribution 0 (out of scope).
- 2026-10-06 (post close-out): **live 200 verified** on the local instance with a CLARISA test key provided by the owner (key not recorded): 2026 → 200 (9 result types, 21 sections, 106 fields; body identical to the service dump apart from `generated_at`), 2023 → 404, abc → 400. Responses saved to `tmp/qa-catalog-{2026,2023,abc}-live.json` (git-excluded). Contract doc known gap 5 updated. Error bodies (400/404) come wrapped by the global `HttpExceptionFilter` envelope (`response`, `statusCode`, `message`, `timestamp`, `path`).

## Amendment v1.1 — catalog 2026.6 (owner decisions, 2026-10-06) — PASS

- Owner decisions (reverse REVIEW defaults D6 and D21): (1) ToC alignment lives inside Contributors & partners in P25 → section `toc_alignment` removed, `toc.*` moved into `contributors_partners`; (2) the standalone "Links to results" section existed until 2024 → section `linked_results` removed, `linked.*` moved into `contributors_partners` (client `rd-contributors-and-partners.component.html:586-634`; innovation use renders the same question on its own page); (3) result envelope fields added to `general_information` (orders 1–6): `general.result_code`, `result_type`, `result_level`, `created_by`, `created_date`, `status` (required true, required_confirmed false), removed from NOT_FOR_QA.
- Rule adopted: a catalog section follows a form page / `validation_*` function, never a table (`validation_contributor_partner_P25` validates ToC + centers + partners + linked results together).
- Snapshot: one-time, owner-authorized pre-release regeneration (two section keys removed; no field key removed; `snapshot-check.ts` unchanged). Revision 5 → 6.
- Result: 19 sections, 112 fields + 61 subfields; NOT_FOR_QA 357. Tests 121/121; tsc/eslint clean; falsifiers (toc field back, linked field back, created_by renamed) → red. Leader re-run + live call with CLARISA test key → 200, 2026.6, 19 sections, 112 fields — VERIFIED. Reviewer PASS.
- ADVISORY: orphan rows `toc_alignment`, `linked_results` remain in `qa_catalog_section` (sync never deletes; optional manual cleanup); doc line on revision-5 boot counts; v1 "additive-only" note vs v1.1 section removal; `linked.has_innovation_link` binds `result.has_innovation_link` but for innovation use the client stores `results_innovations_use.has_innovation_link` — check separately.
- Diagram: `diagram/qa-catalog.html` (Archify dataflow, showcase validation + delivery + visual-check pass).

## Amendment v1.2 — catalog 2026.7 (owner, 2026-10-07) — PASS

- Owner: bilateral projects (`results_by_projects` → `clarisa_projects`) were missing. Added frozen inventory key `contributors.bilateral_projects` ("Contributing W3 and/or bilateral projects", `multi_select`, control list `projects`, all types, required false / unconfirmed — no rule in `validation_contributor_partner_P25`), order 8 in `contributors_partners` (client `rd-contributors-and-partners.component.html:270-281`; no per-project % or lead control in 2026). `contribution_percentage` stays PENDING, `is_lead` NOT_FOR_QA.
- Revision 6 → 7 (pure addition, guarded snapshot accepted). Counts verified from the service: 19 sections, 113 fields, 61 subfields, pending 144, not-for-qa 357 — match the contract doc (v1.2 row).
- Tests 122/122, tsc/eslint clean; falsifier (field removed) → completeness `uncatalogued column results_by_projects.project_id` + shape + snapshot red. Reviewer PASS. Advisory applied: IPSR project picker `ipsr_step_4.bilateral_investment.project` kept visible in the D2 pending reason.

## Amendment v1.3 — catalog 2026.8 (owner, 2026-10-07) — PASS

- Form walk-through, General information: `contributors.submitter` (key unchanged) moved to `general_information` as "Primary Program"; section reordered to the form: level, type, Primary Program, title, description, lead contact, each tag followed by its impact-area component, then code, created by, created date, status, annual-updating block. `contributors_partners` renumbered 1–14.
- Revision 7 → 8 (no key removed; guarded snapshot accepted). Tests 123/123; falsifier (title/description swapped) → red. Reviewer PASS.
- Owner Q&A: conditional fields (impact-area components when tag = Principal) are delivered; only the condition (`required_when`) is internal, so they read `required: false`. Owner: not needed in the response for now; values will arrive with the future results endpoint regardless.

## Amendment v1.4 — catalog 2026.9 (owner, 2026-10-07) — PASS

- Correction of v1.3 (Leader misread "también" as "move"): the primary program appears in BOTH sections. `contributors.submitter` back in `contributors_partners` as "Submitter", order 1 (client `rd-contributors-and-partners.component.html:9-24`); new key `general.primary_program` ("Primary Program", order 3 in `general_information`) mirroring the same stored value (`results_by_inititiative`, role 1).
- Revision 8 → 9 (pure addition; no key removed). 114 fields. Tests 123/123; falsifier → red. Reviewer PASS (advisory: share the storage literal as a constant).

## Spec amendment — display rules and nested data (owner, 2026-10-07)

- Owner: "que quede contributors and partners melo… reglas explícitas de qué mostraría y cuándo… QA debe armar la consulta" + granularity question. Answered: granularity valid as description; QA selects top-level fields; the results endpoint returns the whole object.
- Added QAC-R-13 (visible_when / required_when exposed), QAC-R-14 (depth 2, path and lookup bindings; top-level field = QA unit), DD-12, DD-13, tasks QAC-T-14, QAC-T-15. Approval Mode unchanged (pre-approved; owner mandate to decide).

### QAC-T-14 — Model extension: display rules, depth 2, path and lookup bindings — PASS (attempt 3)

- Date: 2026-10-07 · Attempts: 3
- Delivered: `Condition` type shared by `required_when` / `visible_when` (fields and subfields); subfields depth 2; `PathBinding` (subfield paths start from the parent element's table) and `LookupBinding`; validator rules `UNKNOWN_CONDITION_KEY`, `CONDITION_KEY_NOT_VALID`, `MAX_DEPTH_EXCEEDED`, `MALFORMED_PATH_BINDING`, `MALFORMED_LOOKUP_BINDING`, `MALFORMED_CONDITION`, `UNKNOWN_LOOKUP_KEY`; completeness guard handles path columns, ignores lookups; mapper exposes `visible_when` / `required_when` and nested subfields (never storage); `CONTRACT_VERSION` in the content hash + `PROJECTION_FINGERPRINTS` map + 71-path structural pin; new field `general.is_replicated` (conditions no longer use a non-catalog pseudo-key; only `result_type` remains); catalog 2026.10 (115 fields); depth-2 persistence `parent_key = '<field>.<sub>'`; contract doc v1.5 (+ caveat restored, gap 7: `visible_when` not persisted — migration pending, owner runs it).
- Attempt 1 → FAIL (doc caveat dropped; response changed w/o version; `is_replicated` pseudo-key). Attempt 2 → FAIL (pinned fixture missed field-level description/control_list). Attempt 3 → PASS. Final: 183/183, tsc/eslint clean; falsifiers red for each guard.
- Spec edits by the Leader (2a2fba021): DD-12 and QAC-R-13 (only pseudo-key `result_type`; response change ⇒ version change; subfield paths from parent).
- Requirements: QAC-R-13, QAC-R-14 (mechanics)

### QAC-T-15 — Contributors & partners fully parametrized — PASS (attempt 3)

- Date: 2026-10-07 · Attempts: 3
- Delivered (catalog 2026.12): 17 fields in owner order with `visible_when` / `required_when` from the client (citations in code): Submitter; ToC KPI yes/no; Multiple WPs (`toc.entries`: level, output/outcome, HLO statement [lookup], KPI [path], typology / unit [lookup, any-of keys], target [lookup, `target_date` year match, latest pick], contribution [path]); program invested; why reported; lead center; contributing centers (from ToC) + `contributors.other_centers` (new); `contributors.science_programs` (depth 2, own ToC mapping per program, joins on result + initiative); bilateral projects; external partners applicability → list (institution, partner type [lookup], partner role [path]); led by partner → lead partner; linked/bundled → results; KP partners.
- Model additions: multi-column path joins, keyed lookups (`keys` any-of, `qualifiers` with `match: 'year'`, `pick`); `toc.*` scoped to the submitter's active role-1 row; Submitter / Primary Program filter `is_active = 1`.
- Attempt 1 → FAIL (science-program path not scoped to the result; `toc.entries` duplicated contributors; single-key lookups; client-only required on subfields; stale tmp). Attempt 2 → FAIL (year stored as YYYY and YYYY-MM-DD; no single-row pick; change-log cell). Attempt 3 → PASS. Final 238/238; falsifiers red. Spec edits by the Leader: DD-13 (b3cb06afb, b125a53e4).
- Known gaps recorded in the contract doc: initiative-41 narrative exemption, "Other(s)" centers UI state, `not_applicable` NULL vs `eq false`, typology/unit active-row preference, repeated values per mapping (consumer takes distinct), `visible_when` not persisted (migration pending).
- Requirements: QAC-R-13, QAC-R-14 (C&P)

## Amendment v1.8 — catalog 2026.13 (owner, 2026-10-07) — PASS

- Owner: "En GI debemos retornar el year también". New key `general.reported_year` ("Reporting year", number — `result.reported_year_id` is a MySQL YEAR column, result.entity.ts:342-347), all types, required true / unconfirmed, order 21 after `general.status`; removed from NOT_FOR_QA. Revision 12 → 13. 238/238; falsifier → completeness red. Reviewer PASS.

## Amendment v1.9 — condition semantics, catalog 2026.14, CONTRACT_VERSION 2 (owner, 2026-10-07) — PASS

- Rules: `$` namespace for result-header keys (`$result_type`; unknown `$x` rejected); comparison by referenced type (single_select by id; multi_select `in` only, `eq` rejected; `$result_type` by type key); `not_null` ("" and [] null, false/0 not); closed-list id checks (`tag_levels` {1,2,3} — Principal = 3, migration 1666187001104; `result_types` 1..11 — ResultTypeEnum; `assessed_workshop_options` {1,2,3} — migration 1684849314892); UNVERIFIED and excluded: geographic scopes, innovation use levels, innovation types (CLARISA), discontinued reasons; subfield scope documented (sibling first, then top-level; depth-2 cannot reach parent's subfields).
- Open points closed: `general.is_discontinued` stores the inverse of the form question (client `rd-annual-updating.component.ts:672-673`) → label "Is this innovation discontinued?" + note; `general.primary_program` = `contributors.submitter` (same value, edited in C&P, identity in GI) documented.
- Pre-release breaking rename (`result_type` → `$result_type`) authorized by the owner; recorded in the change log.
- Reviews: FAIL (spec triplet not amended; change-log justification missing) → Leader doc fixes → PASS. Tests 252/252; falsifiers red.
- 2026-10-07: owner — focus is Results, not IPSR; IPSR geography alignment deferred. Added QAC-T-16 (Geo, Results). Owner's CLARISA test key now returns 401 (rejected by CLARISA); live checks wait for a valid key.

### QAC-T-16 — Geographic location (Results) — PASS

- Date: 2026-10-07 · Attempts: 1 · catalog 2026.15
- Delivered: `visible_when` / `required_when` for all 11 Results geo fields (client geoscope-management / rd-geographic-location; validation_geo_location_P25 + owner's FIXED version for the extra scope); `geo.countries` / `geo.extra_countries` → list (country + subnational path on `result_country_subnational`, role 1/2, active) — owner-authorized pre-release type change; corrections to T-8 rules matching the function (regions_specified scope 1 only; countries not required for scope 5; extra relations active); closed list `geographic_scopes` [1,2,3,4,5,50] (4 UNVERIFIED as a CLARISA row, kept because stored data and the function use it).
- Evidence: 274/274; falsifiers red. Leader re-run: one intermittent failure in `QaCatalogController` "user JWT in the auth header is not a substitute -> 401" (outside this diff; 5 isolated runs green) — flake to investigate separately. Reviewer PASS.
- ADVISORY: subnational required_when stricter than the function for countries without CLARISA areas (documented); wrong citation on WHEN_EXTRA_QUESTION (should be V-GEO:136-138 / V-FIX:143-145); verify id 4 in `clarisa_geographic_scope` when the DB is reachable.
- 2026-10-07: Jira User Story **P2-3925** "[QA Platform - Fields] Reporting Tool field parameterization" (epic P2-3902; basis for P2-3907) linked to this spec. ACs: all Reporting Tool fields, every result type, by phase, enough for the QA Admin to mark core / hidden. Commits from here carry P2-3925.

### QAC-T-17 — Evidence (Results) — PASS (attempt 2) · P2-3925

- Date: 2026-10-07 · catalog 2026.16
- Delivered: `evidence.items` with 18 subfields — source (closed list `evidence_sources` 0 Link / 1 Upload from `evidence.is_sharepoint`), link, is_public_file, file_name (path to newest active `evidence_sharepoint` row: `pick created_date desc`), file_url, description, 5 impact-area flags (visible when the GI tag = 3 Principal; owner instruction — the form always shows them), per-type flags (innovation dev/use, policy change, capacity sharing, KP, other output, other outcome). `PathStep.pick` added (DD-13 amended 968b38c0c). `document_id` / `folder_path` → NOT_FOR_QA. Pending 135 → 122.
- Attempt 1 → FAIL (sharepoint path not one row per evidence). Attempt 2 → PASS. 310/310; falsifiers red.
- Owner clarification recorded: QA receives ALL evidence data; validations only drive `required`.
- 2026-10-07: owner decision (option B) — `required` follows what the form requires so QA shows what the user had to fill; QAC-R-5 amended; tasks QAC-T-19 (sweep done sections) and QAC-T-20 (innovation use) added; T-18 instructed to apply B.

### QAC-T-18 — Innovation development (Results) · P2-3925 — PASS (attempt 2)

- Date: 2026-10-07 · catalog 2026.17
- Attempt 1 (Implementer): 16 top-level fields, 3 investment lists (`estimates_pooled|non_pooled|partners`), closed lists `question_options_team_diversity` [113,114,115] and `…_actions` [116..121]; GESI / risk / IPR bound by option label (AUTO_INCREMENT ids, not owner-verified). Evidence re-run by Leader: 339/339, tsc and eslint clean; snapshot keys 243 → 258, none removed.
- Reviewer → **FAIL**: (1) frozen inventory key `estimates_*.kind_cash` renamed to `total_usd`; (2) wrong EST.html / IDI.html line citations; (3) four descriptions not verbatim; (4) contract doc stale (pending count 122 vs 116, budget gap) and missing the form's value-or-"to be determined" rule. Declared deviations 1, 2, 4, 5 accepted; 3 accepted pending owner sign-off.
- Leader decisions: `required` = form ∪ live function for now (`number_of_varieties`, `team_diversity.actions` are function-stated, documented as such). Owner decision 2026-10-07: no `depends_on` field — contract rule "selecting a field includes the fields named in its `visible_when` (transitively); subfields travel with their parent", added to the contract doc in attempt 2.
- 2026-10-07: tasks QAC-T-21 (policy change) and QAC-T-22 (knowledge product: M-QAP author affiliations, CGSpace metadata, `from_cgspace`) added from the owner's walk-through of results 9674 and 9532.
- Attempt 2 (same Implementer, resumed): `kind_cash` restored; citations corrected; four descriptions verbatim; contract doc fixed (116 pending, investment either-or rule, function-stated rules, question-row attribution note, selection rule in Display rules). Leader re-run: 339/339, tsc and eslint clean; snapshot 243 → 258 keys, none removed, no `total_usd`. Reviewer → **PASS**. ADVISORY: v1.12 cites an internal client file in a QA-facing doc (to tidy in T-19).
