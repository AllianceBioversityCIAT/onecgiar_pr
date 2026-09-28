# Tasks — Progress Tracker Indicator Mapping and Read Proxy

## 1. Scope of this task list

- **Module / feature:** `progress-tracker` (server + schema), child 1 of the `progress-tracker-pull-bridge` family
- **Linked spec:** `./requirements.md` + `./design.md`
- **Owner / driver:** Juan Carlos Cadavid (PRMS)
- **Status:** `not-started`
- **Budget (design.md §13):** 9 tasks · ≈ 2,350 LOC · 2 review rounds — a **tripwire**, not a cap

## 2. Pre-flight checklist

- [ ] `requirements.md` approved
- [ ] `design.md` approved (including the **depth escalation to Full** proposed in §13)
- [ ] `PTM-OQ-1` and `PTM-OQ-2` resolved in `design.md` (`DD-2`, `DD-3`) — ✅
- [ ] `PTM-OQ-3` (re-resolution trigger ownership) acknowledged as **non-blocking**
- [ ] `PTM-T-2` has re-run the two AWS reads and settled premise `P-5` **before** `PTM-T-3` fixes the timeout constant
- [ ] 🛑 **Watch item (`design.md` §14):** `PTM-T-3` resolves unambiguously whether `tocIndicatorId` is the Integration primary key or the `related_node_id` string, and how the map lookup joins it. Decide **in `T-3`**; do not re-open specify
- [ ] No conflicting in-flight spec touches `results-framework-reporting/application/commands/` (`grep` `docs/specs/` before starting)
- [ ] `npm run migration:check` green on a clean branch

## 3. Task list

---

### [x] `PTM-T-1` — Mapping table: migration + entity  ✅ PASS

- **Type:** `db`
- **Description:** Create `progress_tracker_indicator_map` with the columns in `design.md` §3.1 and a unique key on (`toc_results_indicator_id`(255), `version_id`). Entity extends `BaseEntity`. Migration follows the house pattern: raw `queryRunner.query`, `CREATE TABLE IF NOT EXISTS`, guarded FK helper, and a `down` that refuses to drop a table holding rows.
- **Implements:** `PTM-R-9`, `PTM-AC-11` (the unique key half)
- **Files (expected):** `onecgiar-pr-server/src/migrations/<ts>-CreateProgressTrackerIndicatorMap.ts`, `onecgiar-pr-server/src/api/progress-tracker/entities/progress-tracker-indicator-map.entity.ts`
- **Depends on:** — · **Blocks:** `PTM-T-3`, `PTM-T-5`
- **Estimate:** `S` · **Review:** `full` — a migration; `design.md` §3.2 and the `version_id` key decision (`P-4`) both ride on it
- **Verification:**
  - **Falsifier:** insert two rows with the same `toc_results_indicator_id` and the same `version_id` → the second **must** be rejected by the unique key. Then insert the same `toc_results_indicator_id` against a *different* `version_id` → it **must** succeed. A schema that accepts both, or rejects both, is wrong. (The two rows differ on exactly the column `P-4` says must be the key — a fixture keyed on `phase_year` would let both inserts pass and prove nothing.)
  - **Red run:** `npx jest src/api/progress-tracker --silent --reporters=summary` — fails before the entity exists. Plus a local `migration:run` → `migration:revert` → `migration:run` round trip.
  - **Disqualifier:** if the unique key cannot be created because `toc_results_indicator_id` is `text` and the prefix length is rejected by the target MySQL version, **re-specify the column type** — do not silently drop the unique key, which would delete `PTM-AC-11`'s only structural guarantee.
  - **Consumers:** none (no shared symbol changed) — new table, new entity.
- **Definition of done** _(amended 2026-09-22 — see the amendment note below)_:
  - [x] Commit follows `<emoji> <type>(<scope>): <description>`
  - [x] Unique key proven by the falsifier above, both directions — **structurally**, against the DDL the real `up()` emits
  - [x] Lint clean for the entity/spec (`src/migrations/**` cannot be linted: `eslint.config.mjs:19` globally ignores `**/migrations/`)
  - [x] Migration timestamp strictly above the current maximum
  - ➡️ **Moved to §6 Rollout:** `migration:check:ci`, the live `up`/`down` round trip, FK apply, ROW_FORMAT/error-1071, the `@ManyToOne` nullability diff, and a real duplicate-`INSERT` rejection

> 🛑 **DoD amendment (2026-09-22, approved by the requester).** `scripts/check-pending-migrations.ts` compares migration **files on disk** against rows in the DB's migrations table (`:71-72`), so a newly authored migration is **pending by definition** until applied — making "`migration:check:ci` green" *unsatisfiable by construction* for the two tasks whose deliverable **is** a migration. It remains the correct gate for proving non-migration work introduced no drift, and for CI after Jenkins applies migrations (`onecgiar-pr-server/CLAUDE.md` §5). The engine-level checks move to §6, where deployment-time verification already lives. `migration:run` was **not** executed against the shared dev database — shared state, side effect outliving the session, explicitly withheld.

---

### [x] `PTM-T-2` — Module skeleton, environment keys, and the declared timeout  ✅ PASS

- **Type:** `infra`
- **Description:** Create `src/api/progress-tracker/` (module importing bare `HttpModule`, per `results-knowledge-products.module.ts:67-68`), register it in `modules.routes.ts` and `app.module.ts`. Add `PT_INTEROP_BASE_URL`, `PT_INTEROP_API_KEY`, `PT_INTEROP_TIMEOUT_MS` to `serverless.yaml`'s environment block beside the three discovery URLs, and declare `timeout: 30` on `functions.main`.
- **🛑 First step — settle premise `P-5`:** run `aws lambda get-function-configuration --function-name prstaging-dev-main --profile IBD-DEV` and the corresponding `aws apigateway get-integration` for `/{any+}`, record both values in this task's execution notes, and **update `design.md` §1A `P-5` from `UNVERIFIED` to verified with the commit**. If either value contradicts 30 s / 29 000 ms, **stop and escalate** — `PTM-DD-4` is built on it.
- **Implements:** `PTM-R-5`, `PTM-R-8`, `PTM-AC-15`
- **Files (expected):** `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.module.ts`, `onecgiar-pr-server/src/api/modules.routes.ts`, `onecgiar-pr-server/src/app.module.ts`, `onecgiar-pr-server/serverless.yaml`
- **Depends on:** — · **Blocks:** `PTM-T-3`
- **Estimate:** `S` · **Review:** `full` — touches `app.module.ts`, `modules.routes.ts` and deployment config; a mistake here is global, not local
- **Verification:**
  - **Falsifier:** delete the `timeout:` line from `serverless.yaml` → the config assertion **must** go red. A test that passes with the line absent is asserting nothing. Equally: set `timeout: 29` and the "strictly below the gateway ceiling" assertion on the *call* timeout must still pass, while `timeout: 5` must fail the "≥ the configured call timeout" assertion.
  - **Red run:** `npx jest src/api/progress-tracker --silent --reporters=summary` on the new config spec — fails before `serverless.yaml` is edited, on the **assertion**, not on a missing file (the spec reads the YAML that already exists).
  - **Disqualifier:** if the AWS reads contradict `P-5`, this task does not "adjust the number" — it **halts and re-opens `PTM-DD-4`**, because a ceiling below ~25 s makes the synchronous design unworkable and the spec needs re-specifying, not patching.
  - **Consumers:** `onecgiar-pr-server/src/app.module.ts`, `onecgiar-pr-server/src/api/modules.routes.ts` — both are repo-wide composition roots; a bad import breaks every route, so the whole server suite is part of this task's gate.
- **Definition of done:**
  - [ ] `P-5` settled in `design.md` §1A with the commit, or escalated
  - [ ] `timeout: 30` declared; env keys added; **no secret value committed** (`.cursorrules`)
  - [ ] `npx jest --silent --reporters=summary --forceExit` green across the whole server (composition-root change)
  - [ ] Lint clean

---

### [x] `PTM-T-3` — Proxy service: mapping lookup, upstream call, total status classification  ✅ PASS (attempt 2, after Pivot)

- **Type:** `server`
- **Description:** `ProgressTrackerService` — resolve the PT id from `progress_tracker_indicator_map` for the active version; on a miss or `match_quality='none'`, return `not_found` **without any HTTP call**. Otherwise call the upstream with `timeout: PT_INTEROP_TIMEOUT_MS` (default 25 000), sending `X-API-Key` only when non-empty. Classify every outcome into `ok` / `not_found` / `unavailable` and return `statusCode: 200` always (`PTM-DD-1`). Adopt the `SourceFailure` primitives-only contract from `cgspace-discovery.service.ts:48-60` verbatim.
- **Implements:** `PTM-R-1`, `PTM-R-3a`, `PTM-R-3b`, `PTM-R-3c`, `PTM-R-4`, `PTM-R-5`, `PTM-R-7`, `PTM-R-20`, `PTM-R-22`; `PTM-AC-1`–`PTM-AC-7`
- **Files (expected):** `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.service.ts` (+ `.spec.ts`)
- **Depends on:** `PTM-T-1`, `PTM-T-2` · **Blocks:** `PTM-T-4`, `PTM-T-8`
- **Estimate:** `L` · **Review:** `full` — secret-bearing, and the leak-free contract is the spec's highest-severity defect class (`D-1`)
- **Verification:**
  - **Falsifier:** in the catch block, replace the primitives-only return with `{ status: 'unavailable', message: error.message }` → the leak assertion **must** go red. The fixture must stub an Axios rejection whose `message`, `config.url` and `response.data` each contain a distinctive sentinel string (e.g. `SENTINEL-HOST`, `SENTINEL-KEY`); the test asserts the sentinel appears in **neither** the returned object nor any captured logger call. A fixture whose error carries an empty message would leave correct and mutated code indistinguishable — the sentinels are what make the mutation observable.
  - **Red run:** `npx jest src/api/progress-tracker/progress-tracker.service.spec.ts --silent` — each of the seven status cases fails on its **behavioral assertion** before implementation, not on a missing import. For `PTM-AC-2`, the assertion is that the `HttpService.get` spy was **called zero times** — a red from a missing stub does not count.
  - **Disqualifier:** if the three-way classification cannot be made total — an upstream outcome that maps to none of `ok`/`not_found`/`unavailable` — do **not** add a fourth status locally. `PTM-R-4` is a behavior contract; a new status is a requirements change and goes back to Phase 1.
  - **Consumers:** none yet (`PTM-T-4` is the first caller; child 2 consumes the route, not the symbol). Per `design.md` `P-10`, no out-of-module reader exists.
- **Definition of done:**
  - [ ] All seven cases (`PTM-AC-1`–`PTM-AC-7`) covered, each asserting behavior not shape
  - [ ] Sentinel leak test green, and proven red under the named mutation
  - [ ] `PTM-AC-2` proves **zero** upstream calls on an unmapped indicator
  - [ ] Server coverage ≥ 5/20/35/40; lint clean

---

### [x] `PTM-T-4` — Query DTOs, controller, and both read routes  ✅ PASS

- **Type:** `server`
- **Description:** Whitelist DTOs (`max_results` 1–10, `refresh`, `mode`; `min_evidence` for ready-counts) and `ProgressTrackerController` exposing `GET indicators/:tocIndicatorId/results` and `GET programs/:programId/ready-counts`, both with `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` and `@UseInterceptors(ResponseInterceptor)` — the shape `results-knowledge-products.controller.ts:39-50` uses.
- **Implements:** `PTM-R-1`, `PTM-R-2`, `PTM-R-6`; `PTM-AC-8`
- **Files (expected):** `onecgiar-pr-server/src/api/progress-tracker/progress-tracker.controller.ts` (+ `.spec.ts`), `.../dto/pt-results-query.dto.ts`, `.../dto/pt-ready-counts-query.dto.ts` (+ specs)
- **Depends on:** `PTM-T-3` · **Blocks:** `PTM-T-8`
- **Estimate:** `M` · **Review:** `checklist` — standard scoped controller over an already-reviewed service
- **Verification:**
  - **Falsifier:** drop `forbidNonWhitelisted: true` → a request carrying `?evil=1` must stop being rejected, turning `PTM-AC-8`'s test red. Fixture must send **both** an out-of-range known param (`max_results=20`) and an entirely unknown param (`evil=1`): the first fails on `@Max(10)` alone, so only the second distinguishes whitelisting from range validation.
  - **Red run:** `npx jest src/api/progress-tracker/progress-tracker.controller.spec.ts --silent` — red on the 400 assertion before the DTO exists.
  - **Disqualifier:** if `ValidationPipe` cannot reject unknown params because the global pipe configuration overrides the per-route one, re-specify rather than hand-rolling a parameter check in the controller.
  - **Consumers:** `onecgiar-pr-server/src/api/modules.routes.ts` (route registration). No client consumer in this child — the route is child 2's contract and is deliberately fixed here.
- **Definition of done:**
  - [ ] Both routes reachable under `/api/progress-tracker/`; JWT inherited, **no new guard added** (`design.md` `P-7`)
  - [ ] `PTM-AC-8` green with both fixture params
  - [ ] Swagger annotations present (API surface changed)
  - [ ] Lint clean

---

### [x] `PTM-T-5` — `/resolve` client and the idempotent fill routine  ✅ PASS (attempt 2)

- **Type:** `server`
- **Description:** Call the upstream `/resolve` with the PORB texts read from `env.DB_TOC` (**read-only**), upsert on (`toc_results_indicator_id`, `version_id`), and record `match_quality`, `match_score`, `resolved_at`. `match: none` writes an explicit unmapped row with `pt_indicator_id = NULL`. Expose the JWT-gated trigger `POST /api/progress-tracker/indicator-map/resolve` (`PTM-DD-3`). Log structured per-outcome counts.
- **Implements:** `PTM-R-10`, `PTM-R-11`, `PTM-R-21`, `PTM-R-30`, `PTM-R-22`; `PTM-AC-9`, `PTM-AC-10`, `PTM-AC-11`
- **Files (expected):** `onecgiar-pr-server/src/api/progress-tracker/progress-tracker-resolve.service.ts` (+ `.spec.ts`), `.../progress-tracker.controller.ts` (trigger route), `.../dto/pt-resolve-trigger.dto.ts`
- **Depends on:** `PTM-T-1`, `PTM-T-2` · **Blocks:** —
- **Estimate:** `L` · **Review:** `full` — `PTM-R-11` is the "never guess" invariant and `D-7` is a silent-wrongness class
- **Verification:**
  - **Falsifier:** change the `match: none` branch to store `candidates[0].indicator_id` → `PTM-AC-10` **must** go red. The fixture's `/resolve` stub must return `match: 'none'` **with a non-empty `candidates[]`** — a stub with an empty candidate list would leave correct and mutated code writing the same `NULL` and prove nothing. Separately, for idempotency: run the fill twice over the same stubbed responses and assert the row **count** is unchanged and `resolved_at` was updated, not duplicated.
  - **Red run:** `npx jest src/api/progress-tracker/progress-tracker-resolve.service.spec.ts --silent` — red on the `pt_indicator_id === null` assertion, and on the second-run row-count assertion.
  - **Disqualifier:** **if any code path in this task issues a write against `env.DB_TOC`, abandon the approach entirely** — that is `PTM-R-12`, an absolute constraint, not a bug to patch. The fill reads PORB texts and writes only the PRMS table.
  - **Consumers:** none (no shared symbol changed). Reads `env.DB_TOC` through the existing read-only repositories; adds no new reader of a shared symbol.
- **Definition of done:**
  - [ ] `PTM-AC-9`, `PTM-AC-10`, `PTM-AC-11` green, each proven red under its named mutation
  - [ ] Trigger route is JWT-gated — explicitly **not** modelled on `clarisa-connections.controller.ts:17-18` (`design.md` `P-13`)
  - [ ] Structured counts logged; **no** host/URL/key/body in any log line
  - [ ] Lint clean

---

### [x] `PTM-T-6` — Provenance table: migration + entity  ✅ PASS

- **Type:** `db`
- **Description:** Create `progress_tracker_result_provenance` per `design.md` §3.1, with an index on (`pt_indicator_id`, `pt_result_key`). Entity extends `BaseEntity`. Same migration conventions as `PTM-T-1`.
- **Implements:** `PTM-R-13` (storage half)
- **Files (expected):** `onecgiar-pr-server/src/migrations/<ts>-CreateProgressTrackerResultProvenance.ts`, `onecgiar-pr-server/src/api/progress-tracker/entities/progress-tracker-result-provenance.entity.ts`
- **Depends on:** — · **Blocks:** `PTM-T-7`
- **Estimate:** `S` · **Review:** `full` — migration
- **Verification:**
  - **Falsifier:** drop the index and run the by-indicator query against a seeded table → the query plan must stop using it. More decisively for correctness: insert a row and query by `pt_indicator_id` alone; a schema that cannot answer that query without a join to the mapping table has failed `PTM-R-13`'s "queryable **by indicator**" clause.
  - 🛑 **Timestamp trap (from `PTM-T-1`'s review):** `PTM-T-1` used `1790010000000`, which clears the prior max `1790002419754` by only **~2.1 hours of wall-clock milliseconds**. A fresh `Date.now()` taken today lands **below** it and would sort this migration **ahead of** the mapping table's — a wrong-order schema that is invisible in review and only fails at deploy. Pick a value explicitly above `1790010000000`.
  - **Red run:** `npx jest src/api/progress-tracker --silent --reporters=summary`. The live `migration:run` → `revert` → `run` round trip is **§6 Rollout**, not this task's gate (DoD amendment 2026-09-22).
  - **Disqualifier:** if `result_id` cannot carry an FK to `result.id` because of engine or charset mismatch, re-specify the column — do not ship the table without the FK and call it done.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done** _(amended 2026-09-22 — same amendment as `PTM-T-1`)_:
  - [ ] By-indicator query answerable without joining the mapping table — proven structurally against the emitted DDL
  - [ ] Index on (`pt_indicator_id`, `pt_result_key`) present in the DDL
  - [ ] Lint clean for the entity/spec (migrations are un-lintable — `eslint.config.mjs:19`)
  - [ ] 🛑 **Migration timestamp strictly above `1790010000000`** — see the Verification note; **never `Date.now()`**
  - ➡️ **Moved to §6 Rollout:** `migration:check:ci`, the live `up`/`down` round trip, and FK apply

---

### [x] `PTM-T-7` — Optional provenance block on the create path, written at the handler hook  ✅ PASS

- **Type:** `server`
- **Description:** Add an optional `progress_tracker_provenance` block to `CreateResultsFrameworkResultDto`, and a `ProgressTrackerProvenanceService` invoked at `create-result-from-framework.handler.ts:46` — after `applyFrameworkResultAssociations`, before the return. **No-op when the block is absent.**
- **Implements:** `PTM-R-13`, `PTM-R-14`; `PTM-AC-12`, `PTM-AC-13`
- **Files (expected):** `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts`, `.../application/commands/create-result-from-framework/create-result-from-framework.handler.ts`, `onecgiar-pr-server/src/api/progress-tracker/progress-tracker-provenance.service.ts` (+ specs)
- **Depends on:** `PTM-T-6` · **Blocks:** —
- **Estimate:** `M` · **Review:** `full` — changes a shared request DTO and the live create path (`design.md` `P-8`)
- **Verification:**
  - **Falsifier:** make the provenance step unconditional (drop the absent-block guard) → `PTM-AC-13` **must** go red because a create with no provenance block would start writing a row. The fixture must include a create payload that carries **no** `progress_tracker_provenance` key at all (not an empty object) — an empty-object fixture would be truthy in a naive guard and hide the mutation.
  - **Red run:** `npx jest src/api/results-framework-reporting/application/commands/create-result-from-framework --silent` — red on the "provenance row exists after create" assertion before the hook is added; and the **existing** suite must stay green **unchanged** throughout (`PTM-AC-13`).
  - **Disqualifier:** if the hook cannot sit at `handler.ts:46` because the associations step throws before it on some path, do **not** move the write earlier to dodge the problem — provenance must not be written for a result whose associations failed. Re-specify the ordering.
  - **Consumers:** from `design.md` `P-10`, the 7 readers of `CreateResultsFrameworkResultDto`: `dto/create-results-framework.dto.ts`, `results-framework-reporting.controller.ts`, `results-framework-reporting.service.ts`, `create-result-from-framework.command.ts`, `link-framework-result-toc.service.ts`, `apply-framework-result-associations.service.ts`, `create-framework-result-entity.service.ts` — **plus** their `.spec.ts` siblings, which must be run, not only compiled.
- **Definition of done:**
  - [ ] `PTM-AC-12` and `PTM-AC-13` green, each proven red under its mutation
  - [ ] The existing `results-framework-reporting` suite passes **unchanged** — no test edited to accommodate the change
  - [ ] Swagger/DTO updated (API surface changed)
  - [ ] Lint clean

---

### [x] `PTM-T-8` — Upstream contract fixture test (settles `P-14`)  ✅ PASS

- **Type:** `tests`
- **Description:** Pin the upstream staging response shape as a committed fixture and assert the service's whitelist DTO projects it correctly — including the `422` case that PT DEV already produces. Record in the execution notes whether the observed staging shape matched the Guide §4.1 field table, and update `design.md` §1A `P-14` accordingly.
- **Implements:** `PTM-R-4`, `PTM-R-20`; re-confirms `PTM-AC-4`
- **Files (expected):** `onecgiar-pr-server/src/api/progress-tracker/fixtures/pt-results.staging.json`, `.../fixtures/pt-results-422.json`, `.../fixtures/fixtures-keys.spec.ts` (mirroring `cgspace-discovery/fixtures/`)
- **Depends on:** `PTM-T-3`, `PTM-T-4` · **Blocks:** —
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** remove a field the whitelist DTO is supposed to project (e.g. `evidence_fingerprint`) from the mapper → the fixture-key test **must** go red. A fixture captured from `mode=template` alone would not contain `cache.evidence_fingerprint`, so the fixture **must** be a cold `mode=auto` capture; this is exactly the inert-fixture trap.
  - **Red run:** `npx jest src/api/progress-tracker/fixtures --silent` — red on the missing-key assertion.
  - **Disqualifier:** the fixture is only evidence if it was captured from **staging**. A fixture captured from PT DEV is disqualified outright (`design.md` `P-14`, `DD-6`) and must be re-captured.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [ ] Fixture captured from **staging**, `mode=auto`, cold — provenance of the capture recorded in the file header, as `cgspace-discovery/fixtures/README.md` does
  - [ ] `P-14` updated in `design.md` §1A with the outcome
  - [ ] Lint clean

---

### [x] `PTM-T-9` — Repository guard: no writes to the ToC Integration schema  ✅ PASS

- **Type:** `tests`
- **Description:** Add an automated check asserting that no source file issues a write statement against `env.DB_TOC`, with the baseline recorded in `design.md` `P-2` (0 hits today).
- **Implements:** `PTM-R-12`; `PTM-AC-14`
- **Files (expected):** `onecgiar-pr-server/src/api/progress-tracker/db-toc-write-guard.spec.ts`
- **Depends on:** — · **Blocks:** —
- **Estimate:** `S` · **Review:** `checklist`
- **Verification:**
  - **Falsifier:** add `await this.dataSource.query(\`UPDATE ${env.DB_TOC}.toc_results_indicators SET x = 1\`)` to any file under `src/` → the guard **must** go red. If it stays green, the pattern is wrong and the guard is worthless. The check must also be proven **not** to fire on the 115 existing read references (`design.md` `P-2`), or it will be disabled on its first false positive.
  - **Red run:** `npx jest src/api/progress-tracker/db-toc-write-guard.spec.ts --silent` — green on today's tree (baseline 0), red once the falsifier mutation is applied. **This is the one task whose gate starts green**, which is why the falsifier run is mandatory rather than optional evidence.
  - **Disqualifier:** if the regex cannot distinguish a write from a read without unacceptable false positives, record the gap explicitly in `requirements.md` §9 rather than shipping a guard that must be muted — a muted guard is worse than a named blind spot.
  - **Consumers:** none (no shared symbol changed).
- **Definition of done:**
  - [ ] Guard green on the clean tree; **proven red** under the named mutation, with the mutation reverted afterwards
  - [ ] Proven not to fire on the 115 existing reads
  - [ ] The exact pattern and scope recorded in the spec file's header comment
  - [ ] Lint clean

---

## 4. Dependency graph

```
PTM-T-1 (mapping migration) ──┬── PTM-T-3 (proxy service) ── PTM-T-4 (DTOs + routes) ──┐
PTM-T-2 (module + timeout) ───┤                                                         ├── PTM-T-8 (contract fixture)
                              └── PTM-T-5 (resolve + fill)                              │
                                                                                        │
PTM-T-6 (provenance migration) ── PTM-T-7 (DTO block + handler hook)                     │
                                                                                        │
PTM-T-9 (DB_TOC write guard) ── independent ────────────────────────────────────────────┘
```

**Parallel-friendly branches:** `{T-1, T-2, T-6, T-9}` can all start at once. `T-5` and the `T-3 → T-4` chain run in parallel once `T-1`/`T-2` land. `T-7` runs in parallel with everything after `T-6`.

⚠️ **`T-1` and `T-6` both carry a migration.** They must not be authored concurrently in separate worktrees without coordinating timestamps — run them sequentially or in one session, per the family's own migration rule (`../family.md` §6).

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `PTM-TEST-1` | unit (server) | `PTM-R-9`, `PTM-AC-11` | `src/api/progress-tracker/entities/*.spec.ts` |
| `PTM-TEST-2` | unit (server) | `PTM-R-8`, `PTM-AC-15` | `src/api/progress-tracker/progress-tracker.config.spec.ts` |
| `PTM-TEST-3` | unit (server) | `PTM-R-1`–`PTM-R-7`, `PTM-AC-1`–`PTM-AC-7` | `src/api/progress-tracker/progress-tracker.service.spec.ts` |
| `PTM-TEST-4` | unit (server) | `PTM-R-6`, `PTM-AC-8` | `src/api/progress-tracker/progress-tracker.controller.spec.ts` |
| `PTM-TEST-5` | unit (server) | `PTM-R-10`, `PTM-R-11`, `PTM-R-21`, `PTM-AC-9`–`PTM-AC-11` | `src/api/progress-tracker/progress-tracker-resolve.service.spec.ts` |
| `PTM-TEST-6` | unit (server) | `PTM-R-13`, `PTM-R-14`, `PTM-AC-12`, `PTM-AC-13` | `src/api/results-framework-reporting/application/commands/create-result-from-framework/*.spec.ts` |
| `PTM-TEST-7` | fixture (server) | `PTM-R-4`, `PTM-AC-4` | `src/api/progress-tracker/fixtures/fixtures-keys.spec.ts` |
| `PTM-TEST-8` | guard (server) | `PTM-R-12`, `PTM-AC-14` | `src/api/progress-tracker/db-toc-write-guard.spec.ts` |

Server coverage must stay ≥ 5/20/35/40. No client or Cypress surface in this child.

### Coverage closure — every AC and every strict clause owned

| AC / clause | Owning task |
|---|---|
| `PTM-AC-1` + *must NOT contain host/URL/id/key* | `PTM-T-3` |
| `PTM-AC-2` + *must NOT call the upstream at all* | `PTM-T-3` |
| `PTM-AC-3` + *must NOT be a 4xx/5xx from PRMS* | `PTM-T-3` |
| `PTM-AC-4` + *IT MUST be a classified failure, never an exception* | `PTM-T-3`, re-confirmed by `PTM-T-8` |
| `PTM-AC-5` + *must NOT include message/config.url/body* | `PTM-T-3` |
| `PTM-AC-6` + *must NOT throw, must NOT name the variable* | `PTM-T-3` |
| `PTM-AC-7` + *IT MUST never be logged* | `PTM-T-3` |
| `PTM-AC-8` + *must NOT reach the upstream* | `PTM-T-4` |
| `PTM-AC-9` | `PTM-T-5` |
| `PTM-AC-10` + *must NOT store any entry from candidates[]* | `PTM-T-5` |
| `PTM-AC-11` | `PTM-T-1` (unique key) + `PTM-T-5` (double-run) |
| `PTM-AC-12` + *IT MUST be readable without parsing free text* | `PTM-T-6` (schema) + `PTM-T-7` (write) |
| `PTM-AC-13` + *must NOT fail validation* | `PTM-T-7` |
| `PTM-AC-14` | `PTM-T-9` |
| `PTM-AC-15` | `PTM-T-2` |

## 6. Rollout & verification

- [ ] PR(s) per the strategy below; CI green (lint, tests, build, `migration:check:ci`, SonarCloud)
- [ ] 🛑 **Migration checks deferred here by the 2026-09-22 DoD amendment — tracked, not waived.** On the first TEST apply:
  - [ ] `npm run migration:check:ci` green **after** the migrations are applied
  - [ ] Live `up` → `revert` → `up` round trip for **both** migrations
  - [ ] **ROW_FORMAT / error-1071 — `PTM-T-1`'s migration ONLY:** its 255-char utf8mb4 prefix key is 1020 bytes — fine on `DYNAMIC`, **fails with error 1071 on a `COMPACT`/767-byte schema**. Confirm the target schema's row format. *The single condition that can turn `PTM-T-1`'s migration red on first apply.* ✅ **`PTM-T-6` is NOT exposed** — its only composite index is (`varchar(32)`, `varchar(64)`) with no prefix length, 384 bytes at utf8mb4, under even the 767-byte `COMPACT` limit (verified by `PTM-T-6`'s Reviewer).
  - [ ] **FK actually creates** against `version.id`
  - [ ] **`@ManyToOne` nullability diff:** `progress-tracker-indicator-map.entity.ts:59` omits `{ nullable: false }` (siblings `result.entity.ts:273`, `result-innovation-merge-split.entity.ts:55` pass it). Catch via `migration:check`
  - [ ] **Real duplicate `INSERT` rejected** by the unique key — the engine-level half of `PTM-AC-11`
  - [ ] `down` **table-absent** branch exercised (untested in unit scope)
- [ ] 🛑 **PORB-text SQL correctness — DB-dependent, added 2026-09-22 after `PTM-T-5`'s review.** The fill routine's join reads program / AoW / center / HLO-title texts from `env.DB_TOC`. Its **structure** was corrected in-run (one row per indicator, guaranteed by aggregation; precedent `wp.year` predicate added). What remains **unverifiable without a database**:
  - [ ] the five projected columns are the texts `/resolve` actually expects — compare a sample of real rows against the PORB values the Progress Tracker seeded from
  - [ ] the multi-center simplification: an indicator whose target names several centers sends **one** `/resolve` call using `MIN(acronym)`, not one per center. Verify against real multi-center data
  - [ ] the center chain omits the precedent's `trit.target_date = ?`, so `MIN(ci.acronym)` picks alphabetically across **all** target years (Reviewer advisory, accepted)
  ⚠️ **Why this belongs on the rollout list and not a code gate:** a wrong join does **not** fail loudly. It returns plausible-looking wrong mappings, and every unit gate passes — the resolve service's tests depend only on the *row shape* the repository produces, never on the SQL's correctness. Treat a low `exact` / high `fuzzy` ratio on the first real fill as the signal.
  - [ ] ⚠️ **Reading the non-empty revert correctly:** `down` returns silently when the table holds rows, so TypeORM records the revert as complete **while the table survives**. This is exactly what `design.md` §3.2 mandates and both migrations do it. Expect a non-empty revert to leave the `migrations` row deleted and the table present — **do not read that as a failure.**
- [ ] `PT_INTEROP_BASE_URL` set to **PT staging** on PRMS TEST (`PTM-DD-6`)
- [ ] Deployed smoke call on PRMS TEST once family gate **D1 (egress)** is confirmed — this is the only check for defect class `D-11`
- [ ] **Human spot-check** of N `fuzzy` mapping rows against the Progress Tracker UI before the fill is trusted for a phase — the only check for defect class `D-10`
- [ ] No error-rate change on `/api/results-framework-reporting/create` post-deploy

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `../family.md` child 1 `Status` → `done`
- [ ] `docs/trd/trd.md` §5 gains a W11 sibling to W9; §7 gains the Progress Tracker integration row
- [ ] `onecgiar-pr-server/src/CLAUDE.md` notes the new module
- [ ] Hand `../family.md` §5.1's infra name drift (`prtesting-dev-main` → `prstaging-dev-main`) to infra
- [ ] Unblock sibling child 2

## 8. Roll-back plan

1. Revert the PR(s) in reverse order (client-facing routes first, migrations last).
2. `npm run migration:revert` twice — provenance, then mapping. Both `down` migrations refuse to drop a table holding rows, so **clear the tables first or use a forward fix**; this is deliberate, not an obstacle to work around.
3. Unset `PT_INTEROP_BASE_URL` — the service then answers `unavailable` for every call, which is a valid state and needs no other change.
4. Leave `timeout: 30` in `serverless.yaml`: it matches the deployed function and reverting it would **re-introduce** the 6 s drift.
5. No downstream consumer to notify — no bilateral or platform-report payload was touched.

---

## Required cross-references

`./requirements.md` · `./design.md` · `./proposal.md` · `../family.md` · `docs/prd.md` · `docs/trd/trd.md` · `docs/infrastructure.md` · `.cursorrules`
