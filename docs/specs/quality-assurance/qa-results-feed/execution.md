# Execution Log — `quality-assurance/qa-results-feed`

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/quality-assurance/qa-results-feed/` |
| Branch | `JuanGuzman-io/chore-check-akili-access` @ `72fad2b88` (spec authored here) |
| Approval Mode | gated (requirements.md Document Control) |
| Leader | Claude Opus 5.5 (T1) · Implementer `akili-implementer` (sonnet) · Reviewer `akili-reviewer` (opus) |
| Persona check | `akili doctor --agents` → "No persona drift blocking CI" (one CUSTOM-EDITED section, maintainer's call) |
| Budget (design §13) | 8 tasks · ~1 600 LOC · 12 review rounds |
| Pre-flight | `npm ci` run in `onecgiar-pr-server/`; `.env` copied from the main checkout (gitignored, never committed) |

## Task Execution History

### QRF-T-1 — Type-key map and eligibility repository — PASS

- Date: 2026-10-28 · Attempts: 1 · Parallel with QRF-T-3 · Effort: high (one step above default; eligibility is the contract's core)
- Skills assigned: `nestjs-expert`, `tdd`
- Files: `onecgiar-pr-server/src/api/qa-catalog/definitions/result-type-ids.ts` (new), `qa-results.repository.ts` (new), `qa-results.repository.spec.ts` (new, 26 tests), `qa-catalog.module.ts` (provider added), `qa-catalog.module.spec.ts` (global `DataSource` stub + resolve test — consumer named by the task, P-18)
- Implementer verification: `npx jest src/api/qa-catalog --maxWorkers=2` → 26 suites / 664 tests passed; `npx tsc --noEmit` exit 0; eslint on the 5 touched files exit 0
- Red run: greenfield; reds observed by mutating the post-change code (below)
- Falsifiers (each mutated → red → restored, restore confirmed by `diff` against saved copies):
  - (a) drop `AND r.source = '${W1W2_SOURCE}'` → `● QaResultsRepository eligibility SQL (QRF-R-3) › anchors every eligibility clause to its column` — `Expected pattern: /^\s+AND r\.source = 'Result'$/m` (breakdown test red on the same pattern)
  - (b) drop `, r.id ASC` → `● QaResultsRepository.findPage › orders by submitted_at then result_id, then pages` — `Expected pattern: /^ORDER BY submitted_epoch ASC, r\.id ASC\nLIMIT \? OFFSET \?$/m`
  - (c) interpolate the year → `● …eligibility SQL (QRF-R-3) › binds the year (and every other value) instead of interpolating it` — `Expected substring: not "2026"` (+ anchor test `/^\s+AND v\.phase_year = \?$/m` and the filter test)
  - (d) id 6 → `knowledge_products` → `● result-type-ids map (QRF-DD-2) › ResultTypeEnum 6 -> knowledge_product` — `Expected: "knowledge_product" Received: "knowledge_products"` (+ the `CATALOG_RESULT_TYPES` comparison)
  - (e) swap `not_submitted` / `not_w1w2` → `● …classify (QRF-R-8) › returns every id, in request order, with the first failing reason` — ids 107 (Editing + bilateral) and 108 (2025 + bilateral) received `not_w1w2`
- Disqualifier: every predicate matched by a line-anchored regex; a separate test asserts the SQL holds no `--` / `/*` comment
- Evidence re-run (Leader inline): `npx jest src/api/qa-catalog/qa-results src/api/qa-catalog/qa-catalog.module --maxWorkers=2` → 2 suites / 31 tests passed; eslint on the 5 files exit 0 → VERIFIED (`tsc` deferred to the combined run with QRF-T-3, whose files were in flight)
- Reviewer: PASS — R-3 (Mixed population), R-4 (lead-only, AND, empty = no filter), R-5 order, R-6 (count/breakdown reuse the same FROM and params), R-8 order; DB column names checked against the entities; DD-5 `UNIX_TIMESTAMP` on a `timestamp` column is session-TZ independent
- ADVISORY (recorded, not tasks):
  - RELIABILITY: no unique constraint on active lead rows; a result with two active role-1 rows would appear twice and tie on sort (against R-5 *Stable paging*). Suggest `rbi.id` tie-breaker or `MIN(rbi.id)` derived table; T-8 to count results with > 1 active lead row
  - RELIABILITY: Submitted result without a submission row returns `submitted_at: null` and sorts first; R-5 says ISO — T-7 to document, T-8 to count
  - RISK: OQ-4 settles in one constant `PHASE_APP_MODULE_IDS`; classify reads the same constant
  - READABILITY: `LEAD_ROLE_ID = 1` local literal; use an enum if one exists
- Not Done / Assumptions (Implementer, verbatim in substance; no blocker, no owed item — not a continuation):
  - SQL semantics unproven (stubbed DataSource); real SQL runs at T-8
  - `submitted_at` = `UNIX_TIMESTAMP(MAX(created_date))` over active `status = 1` submission rows → UTC ISO in Node (avoids the mysql2 TZ issue); missing submission row → `null`, sorts first — T-2/T-8 decide
  - `is_active = 0` classified `not_found` (spec silent on soft-deleted)
  - Phase predicate `v.phase_year = ? AND v.app_module_id IN (1, 2)` (DD-3, pending OQ-4); no version row → `other_phase`
  - No dedupe for duplicate active lead rows (exemplar SQL has none)
  - Unknown `resultTypeKeys` → empty without querying; the 400 belongs to the service (T-2)
- Return shapes handed to T-2/T-6: `findPage` → `{result_id, result_code, program:{clarisa_id, code}, result_type_key, submitted_at}[]`; `breakdown` → `{by_program:[{clarisa_id, code, count}], by_result_type:[{key, count}]}`; `classify(ids, phaseYear)` → `{result_id, reason|null, result_type_key|null}[]`, deduped, request order
- Forward pointers: QRF-T-2 — decide `submitted_at: null` handling; QRF-T-7 — document null `submitted_at`; QRF-T-8 — count duplicate active lead rows and Submitted results without submission rows
- spawns: implementer 22 calls, 135 206 tokens, ended partial (assumptions only); reviewer 10 calls, 62 737 tokens, ended complete
- Requirements: QRF-R-3, R-4, R-5 (order), R-6, R-8
- Running totals vs budget: tasks 1/8 · LOC ~670/1 600 · review rounds 1/12

### QRF-T-3 — Value reader core: read plans, `column` and `relation`, typing — PASS

- Date: 2026-10-28 · Attempts: 1 · Parallel with QRF-T-1 · Effort: high
- Skills assigned: `nestjs-expert`, `tdd`
- Files (all new, `onecgiar-pr-server/src/api/qa-catalog/values/`): `read-plan.ts`, `column.resolver.ts`, `relation.resolver.ts`, `value-typing.ts`, `table-metadata.ts`, `value-reader.ts`, `fixtures.ts`, and `*.spec.ts` for `read-plan`, `column.resolver`, `relation.resolver`, `value-typing`, `table-metadata`, `value-reader`. `table-metadata.ts` and `value-reader.ts` are outside the expected-files list; the Reviewer accepted them as seams DD-7/DD-9 and design §8 need
- **P-14 outcome: holds.** The `table-metadata.spec.ts` walk covers 43 tables (17 `relation`, 30 `path`, subfields included); each one resolves to a `scope.ts` entity with exactly one PK column. `primaryKey()` throws on a composite key. Keys that are not `id`/`<table>_id`: `result_answers`=`result_answer_id`, `result_indicators_targets`=`indicators_targets`, `result_ip_result_actors`=`result_ip_actors_id`, `results_knowledge_product`=`result_knowledge_product_id`, `results_kp_authors`=`result_kp_author_id`, `results_toc_result_indicators`=`result_toc_result_indicator_id`, `results_investment_discontinued_options`=`results_investment_discontinued_option_id`. DD-7 stands, so no Pivot is needed
- Implementer verification: `npx jest src/api/qa-catalog/values --maxWorkers=2` → 6 suites / 90 tests; `npx jest src/api/qa-catalog` → 32 suites / 754 tests; `npx tsc --noEmit` clean; eslint on `values/*.ts` clean
- Red run: greenfield. Each red below was observed by mutating the post-change code
- Falsifiers (each mutated → red → restored, with a diff against a backup confirming the restore):
  - (a1) dropped the NULL `value_column` rule → `relation.resolver.spec`: `Expected length: 1 / Received length: 2 / Received array: [10, null]`
  - (a2) dropped `filter` from `planQuery` → `Expected length: 1 / Received length: 2 / Received array: [10, 12]`. Dropping both rules gives 3
  - (b) column plans not grouped by table → `read-plan.spec`: `Expected length: 1 / Received length: 2`. `readBaseValues` also went red: `Expected length: 5 / Received length: 7`
  - (c) boolean typer returns the driver value → `-   "fx.is_open": false, / +   "fx.is_open": 0,`
  - (d) empty multi_select → `null` → `-   "fx.tags": Array [], / +   "fx.tags": null,`
  - (e) per-result queries → `many.calls`: `Expected length: 5 / Received length: 250` (a batch of 1 gives 5)
- Evidence re-run (Leader inline): `npx jest src/api/qa-catalog --maxWorkers=2` → 32 suites / 754 tests passed; `npx tsc --noEmit` exit 0 over the combined T-1 + T-3 tree; `npx eslint "src/api/qa-catalog/values/*.ts" --quiet` exit 0 → VERIFIED. This run also closes the `tsc` that T-1 deferred
- Reviewer: PASS. It confirmed P-14 is settled by a test, DD-6 grouping, DD-7 PK order with the NULL rule applied per field, and DD-9 key-by-key construction with no spread. Errors carry no table or column name (R-9). Each plan is one parameterized statement, identifiers are regex-checked, and concurrency is capped at 4 (§8)
- **Spec tension (Reviewer, raised at the gate — not a FAIL).** For a scalar field, R-7 gives a bare value. Several other texts expect the field's subfields to come back with it:
  - `docs/qa-catalog.en.md:203` and `:252` ("subfields always travel with their parent" / "whole object of a selected field")
  - OQ-8 (`general.lead_contact_person` + `directory_user` id)
  - `general-information.ts:267-269`
  - DD-10 (`length_of_training` → length + degree)

  The affected fields are `general.lead_contact_person`, `capacity_sharing.length_of_training`, `innovation_dev.gesi_stage`, `innovation_dev.risk_stage` and `innovation_dev.team_diversity`. `buildReadPlans` drops their subfields silently: they are neither planned nor placed in `deferred`. The owner's answer is needed before T-6
- ADVISORY (recorded, not tasks):
  - RELIABILITY: `column` plans on per-type tables read the lowest-PK row with no `is_active` term, so a stale inactive row can win. Verify at T-8, or add an active filter to the result-key registry
  - RELIABILITY: `renderPlanSql` and the resolvers build `IN ()` for an empty id list. Only `readBaseValues` guards against it; move the guard into `planQuery`
  - RESILIENCE: `toOption` passes driver ids through unchanged, so with `bigNumberStrings` an id arrives as `'4'` instead of `4`. Normalize the ids, or pin the driver option in a test
  - READABILITY: `read-plan.ts:760` types list/object/multi_select values as `single_select` only for the NULL check. Add a comment saying so
  - RISK: date typing relies on TypeORM `timezone: 'local'` and on the DB storing UTC. Pin this in a test or check it at T-8
- Not Done / Assumptions (from the Implementer). None names a blocker or an owed item, so no continuation is owed:
  1. Scalar fields with subfields return only the value (the spec tension above)
  2. `path` and `lookup` bindings come back in `deferred` (`{fieldKey, subfieldPath, kind}`) for T-4/T-5. Until those tasks run, list elements hold only the subfield `column` keys
  3. The NULL `value_column` rule runs in JS per field, because plans are shared across fields
  4. Date typing reads the mysql2 `Date` local components as the stored wall clock, assumed UTC. DATE vs DATETIME comes from the entity column type
  5. `''` stays `''`; an unparseable number becomes `null`; a single-select or scalar relation takes the first element by PK; select ids pass through unchanged
  6. `IN (?, ?, …)` is expanded per id, so the statement text varies with batch size but the statement count does not
  7. `readBaseValues` fills every planned field for every result; T-6 must drop fields that do not apply to the result's type
  8. Errors name catalog field keys only
- Forward pointers:
  - QRF-T-4/T-5: consume `deferred`; inherit the empty-ids guard
  - QRF-T-6: drop fields not applicable to the result's type (assumption 7); depends on the scalar-with-subfields decision
  - QRF-T-8: check stale inactive per-type rows and the DB time zone
- spawns: implementer 31 calls, 201 635 tokens, ended partial (assumptions only); reviewer 13 calls, 84 175 tokens, ended complete
- Requirements: QRF-R-7 (value shapes, null/[] fill), NFR *Query shape*
- Running totals vs budget: tasks 2/8 · LOC ~2 350/1 600 (T-1 ~670 + T-3 ~1 683, tests and fixtures included) · review rounds 2/12. **Budget tripwire fired**: LOC is above budget with 6 tasks still open. Execution is stopped for the owner (see below)

## Budget Tripwire — after QRF-T-3

- Budget (design §13): ~1 600 LOC in total (≈ 650 production, ≈ 950 tests, fixtures and doc)
- Actual after 2 of 8 tasks: ~2 350 LOC (all uncommitted, new files)
- Cause: the reader is generic over 181 bindings and carries metadata-driven PK and type resolution (`table-metadata.ts`). Each falsifier also has its own fixture-backed spec with an in-memory runner. T-3 alone is ~1 680 LOC, against an L estimate inside a ~1 600 total
- Projection: T-2, T-4, T-5 and T-6 at a similar test density would bring the spec to roughly 4 000–5 000 LOC
- Status: stopped for the owner's decision. This stop is not auto-approved
- Owner decision (Juan David, 2026-10-28, at the gate): **re-baseline and continue.** `design.md` §13 and `tasks.md` §1 now read ~4 500 LOC. Tasks (8) and review rounds (12) are unchanged

## Execute-time spec edits — 2026-10-28 (owner decision at the QRF-T-3 gate)

- `requirements.md` QRF-R-7 adds a clause: a scalar field (`text`, `date`, `number`, `boolean`, `single_select`) that declares subfields is returned as `{ value, <subfield key>: … }`, and `value` is a key this requirement defines (QRF-R-9). It also adds the scenario *Scalar field with subfields* (capdev raw 2 → `{ "value": 4, "degree": 2 }`). Reason: the T-3 Reviewer found a spec tension with `qa-catalog.en.md` ("subfields always travel with their parent"), OQ-8 (`directory_user`) and DD-10 (length + degree). The owner chose the object form
- `design.md` QRF-DD-9 adds the projection of a scalar field with subfields; its subfields are planned like list subfields
- `design.md` §13 and `tasks.md` §1: budget re-baselined (see above)
- `tasks.md` QRF-T-6:
  - the description now covers planning scalar subfields, which the T-3 planner drops today
  - `values/read-plan.ts` is added to the expected files
  - falsifier (d) now expects the object form
- Correction closure:
  - Forward: grep of `option id|bare|length 4|degree` over the spec documents. The base shape line in R-7 stays valid, because the new clause narrows only scalars that have subfields
  - Backward: the R-7 citers are `tasks.md` T-6 (updated) and T-7 (documents value shapes, so it covers the new rule)
- Conformance carry: the next Reviewer brief, and the one after it (T-2 and onward), names "conformance to `requirements.md#QRF-R-7` as amended 2026-10-28"

## QRF-T-4 — `path` resolver — PASS (2026-10-28)

- Run in parallel with QRF-T-2 (tasks.md §4: T-2 ∥ T-3..T-5); disjoint files
- Attempts: 1 · effort medium · skills `nestjs-expert`, `tdd`
- Files changed: `values/path.resolver.ts` (new, 355), `values/path.resolver.spec.ts` (new, 267), `values/read-plan.ts` (exports `filterPredicates`, +3/−1)
- Implementer verification: `npx jest src/api/qa-catalog --maxWorkers=2` → 35 suites / 814 tests passed; after `eslint --fix`, `values/` → 7 suites / 96 tests; `npx tsc --noEmit` exit 0; eslint clean
- Falsifier reds (mutate → observe → revert, file diffed identical to backup):
  - (a) join on the first pair only (`step.join.slice(0, 1)`): "every join pair must hold: result 1 reads only its own initiative row" → `+ 999,` (the other initiative's row)
  - (b) pick direction flipped: "pick desc reads the newest active row…" → `- "fx.file": "new", + "fx.file": "old",`
  - (c) subfield path started from `result`: "a subfield path starts at its parent element…" → `- "child": 111, + "child": null,` / `- "child": 222, + "child": null,`. The symptom is "attached to none", not the predicted "attached to both", because the fixture's parent key `parent_row_id` does not exist on `result`. The Reviewer confirmed that the assertion still discriminates
- Evidence re-run (Leader inline): `npx jest src/api/qa-catalog/values --maxWorkers=2` → 7 suites / 96 tests passed; eslint on the 3 files exit 0 → **VERIFIED**. `tsc` re-ran after QRF-T-2 completed, over the combined tree → exit 0
- Reviewer (`akili-reviewer`, lens checklist): **PASS**. Conforms to QRF-R-7 as amended 2026-10-28 and DD-6/7/9 as amended. All three falsifiers were traced through their fixtures. Number conversion of join keys is consistent: every `join` pair in `definitions/sections/*.ts` is an integer id or foreign key
- ADVISORY (recorded, not tasks):
  - RELIABILITY: `PathBinding.columns` is never read. The task wording names this read, but R-7 and DD-6 do not require it. No 2026 catalog binding declares `columns`; only the secret-leak fixture `qa-catalog.fixtures.ts:251` does. Projection uses catalog keys only, so the read would have no effect on output
  - RELIABILITY: fixture (c) does not model the real catalog. Real subfield paths start `from: 'id'` (contributors-partners.ts:145, :964). A `result`-start mutant would join silently on the result's `id` rather than return null
  - RESILIENCE: `joinKey` throws for the whole batch, and the message omits the field key
  - READABILITY: when a scalar field with subfields has no elements, its value carries a `lookup` subfield key; when it has elements, that key is missing until lookup runs
- Not Done / Assumptions (from the Implementer). Assumptions only, nothing owed, so no continuation:
  1. A `path` row with NULL `value_column` is not an element (mirrors the relation rule, catalog DD-13)
  2. Join keys are coerced to numbers; a non-numeric key throws
  3. Groups run sequentially, not through the `value-reader.ts` concurrency helper
  4. The resolver is not wired into `readBaseValues`, which still returns `path` as `deferred` (T-6). The relation resolver still returns a bare scalar for a scalar field with subfields, which conflicts with the amended R-7 (T-6)
- Forward pointers:
  - QRF-T-5: fill the `lookup` subfield key for scalar fields with subfields when elements exist (the empty-element path already sets `emptyValue`)
  - QRF-T-6: wire `resolvePathFields`/`followPath`. Catch a `joinKey` throw so one result cannot fail the batch (QRF-R-8). Fix the relation resolver's bare scalar for a scalar field with subfields (amended R-7)
- spawns: implementer 18 calls, 164 174 tokens, ended partial (assumptions only); reviewer 15 calls, 109 170 tokens, ended complete
- Requirements: QRF-R-7 (scenario *Whole object of a selected field*; catalog keys only) — QRF-DD-6, DD-7
- Running totals vs budget: tasks 3/8 · LOC ~2 975/4 500 (T-1 ~670 + T-3 ~1 683 + T-4 ~625; T-2 under review) · review rounds 3/12. Within budget

## QRF-T-2 — `GET /api/qa/results` — attempt 1 FAIL (2026-10-28)

- Effort high · skills `nestjs-expert`, `tdd`, `api-design-principles`
- Files: new `dto/qa-results-query.dto.ts` (+ spec), `dto/qa-results-response.dto.ts`, `qa-results.service.ts` (+ spec), `qa-results.constants.ts`; edited `qa-catalog.controller.ts` (+ spec), `qa-catalog.module.ts` (+ spec), `src/app.module.ts`, `src/app.module.spec.ts`
- Implementer verification: `npx jest src/api/qa-catalog src/app.module.spec.ts src/shared/guards --maxWorkers=2` → 39 suites / 827 tests passed; tsc 0; eslint + prettier clean
- Reds:
  - (c) red run at task start: `- {"method": 5, "path": "api/qa/results"}` / `- {"method": 5, "path": "api/qa/results/details"}`
  - (c) falsifier: `results/details` missing
  - (a): `Expected: "/api/qa/results" Received: undefined`
  - (b): `Expected: 400 Received: 200`
  - (d): `Received: [[Function ResponseInterceptor]]`
  - (e): `Expected: 3 Received: 5`
- Evidence re-run (Leader inline, same command) → 39 / 827 green, tsc 0 → **VERIFIED**
- Reviewers (parallel lens, override f — auth surface):
  - Conformance + readability + reliability → **PASS**. R-1/2/4/5/6 and DD-1/12 met; the disqualifier does not apply (real `ClarisaApiKeyGuard`); R-7 as amended is not contradicted
  - Security + resilience + risk → **FAIL**. The Leader ruled the finding in scope, since it is T-2's own input validation against the NFR Security clause, so it consumes attempt 1. Verbatim:
    > 1. **Discovered Issue:** `page` has no upper bound. `toStrictInt` accepts any string of digits, and `@IsInt()` accepts `Number('10000000000000000000') === 1e19` because `Number.isInteger(1e19)` is true. The repository then binds `(page-1)*pageSize` as the OFFSET (`qa-results.repository.ts:118`). Once that value reaches 1e21 … JS turns it into the string `"1e+21"`. mysql2 formats parameters on the client, so the query ends in `LIMIT 100 OFFSET 1e+21`, which is a MySQL syntax error. The service does not map repository errors, so the `QueryFailedError` reaches the global `HttpExceptionFilter`. That filter puts `exception.message` into the 500 body (`error.exception.ts:22-41`), so the client gets the MySQL parser text … I traced this; I did not run it.
    > **Violated Rule:** `requirements.md` §6 NFR Security: "no secret or SQL in logs or errors (QAS-10, AC-9)". `design.md` §7: "Errors never carry SQL, table or column names… → 500 with a generic message".
    > **Remediation Suggestion:** Cap `page` in `QaResultsQueryDto` with `@Max(...)`, and keep `page * QA_RESULTS_PAGE_SIZE_MAX` within `Number.MAX_SAFE_INTEGER` (a business cap such as 1e6 also works). Cap each `program_ids` value with `@Max(2147483647, { each: true })`. Defence in depth: in `QaResultsService.list`, catch any failure that is not an `HttpException` from the `Promise.all`; log only the route and year, then throw `InternalServerErrorException` with a generic message. Add falsifiers: a DTO test where `page=10000000000000000000` gives 400, and a service test where a rejected repository leads to a generic 500 whose message contains no SQL.
- ADVISORY:
  - Conformance lens:
    - The year bounds 2000–2100 are an invented contract value and need owner sign-off. They must be documented in T-7 together with the 400-vs-404 difference from the catalog route. Move them into `qa-results.constants.ts`
    - The log line omits the design §9 "statement count"
    - No log line on the error path
    - `toTokens` is typed `string[] | unknown`
    - Possibly add `@ApiOkResponse`
  - Security lens:
    - `HttpExceptionFilter` logs `request.url`, including the id lists, on status > 300. This is pre-existing global behaviour
    - The `program_ids` and `result_type_keys` lists are unbounded (consider `@ArrayMaxSize`)
    - Unknown type keys are echoed without a length cap
    - The `'/api/qa/results'` route string is spelled out twice
- Implementer Assumptions (verbatim summary):
  - `phase_year` is 2000–2100, invented
  - CSV or repeated parameter; empty tokens dropped; non-positive program id → 400; `page=''` → 400
  - The log line is `route year items eligible not_eligible=0 duration_ms`
  - The fake repository honours the filter
  - `breakdown` is always returned
- spawns: implementer 31 calls, 140 717 tokens, ended partial (assumptions only); reviewer (conformance) 10 calls, 95 253 tokens, complete; reviewer (security) 15 calls, 102 153 tokens, complete

## QRF-T-2 — `GET /api/qa/results` — PASS on attempt 2 (2026-10-28)

- Attempts: 2 (attempt 1 FAIL above). Attempt 2 effort `xhigh` (bumped from high); skills `nestjs-expert`, `tdd`, `error-handling-patterns`
- Attempt 2 files: `qa-results.constants.ts` (`QA_RESULTS_PAGE_MAX = 1_000_000`, `QA_RESULTS_PROGRAM_ID_MAX = 2_147_483_647`, year bounds 2000/2100 moved here), `dto/qa-results-query.dto.ts` (+ spec), `qa-results.service.ts` (+ spec: `readFeed` + `toGenericFailure` → `InternalServerErrorException('The QA results could not be read')`; `HttpException` rethrown unchanged; log `route year read failed (<ErrorClass>)`)
- New falsifier reds (mutate → observe → revert):
  - Cap removed: `✕ page="10000000000000000000" -> 400` · `Received promise resolved instead of rejected` · `Tests: 3 failed, 35 passed`
  - Catch removed: `✕ a failing repository.findPage|count|breakdown -> generic 500 …` · `Expected constructor: InternalServerErrorException Received constructor: Error` · `Tests: 4 failed, 11 passed`
  - Driver text echoed: `Expected pattern: not /SELECT|FROM|WHERE|syntax|1e\+21|result_code|`result`|31084/i`
  - `program_ids` `@Max` removed: `✕ program_ids="2147483648" -> 400` · `Tests: 2 failed, 36 passed`
- Implementer verification: `npx jest src/api/qa-catalog src/app.module.spec.ts src/shared/guards --maxWorkers=2` → 39 suites / 840 tests; tsc 0; eslint clean
- Evidence re-run (Leader inline, same command) → 39 / 840 green, tsc 0 → **VERIFIED**
- Decisions made:
  - **Owner decision (Juan David, 2026-10-28):** `phase_year` plausibility range 2000–2100 approved. 1999 → 400 on this route vs 404 on `/api/qa/catalog`; T-7 documents both
  - Leader edit: changed the comment on `QA_RESULTS_PHASE_YEAR_MIN/MAX` from "not yet signed off" to the sign-off note. Comment only; reviewed in attempt 2
  - Parallel-lens review for attempt 1 (override f, auth surface); one combined lens for the rework (override e). The Leader ruled the security FAIL in scope
- Reviewer attempt 2 (`akili-reviewer`, security + baseline conformance) → **PASS**. FAIL resolved; no regressions; the generic 500 passes through `HttpExceptionFilter` carrying only its own stack; logging the error class name is acceptable under NFR §6; R-1/2/4/5/6 and DD-1/12 still hold; R-7 as amended is not contradicted
- ADVISORY (recorded, not tasks):
  - RISK: the global `HttpExceptionFilter` logs `request.url` (with `program_ids`/`result_type_keys`) on status > 300, against NFR Observability "never ids lists". This is pre-existing cross-cutting behaviour, recorded as a gap
  - RELIABILITY: `qaCatalogService.getCatalog` runs outside the generic-failure boundary. Safe while the catalog stays in code
  - CONTRACT: `QA_RESULTS_PAGE_MAX` and `QA_RESULTS_PROGRAM_ID_MAX` are limits that DD-12 does not list
  - Carried from attempt 1: the log line has no statement count; no per-call log on the 404/400 paths; `toTokens` typing; `@ApiOkResponse`; `@ArrayMaxSize` on the lists; unknown keys echoed without a length cap; the route string spelled out twice
- Not Done / Assumptions (attempt 2): `page` cap 1e6 chosen; error class name logged; `docs/qa-catalog.en.md` has no results-feed section yet. Assumptions only, nothing owed
- Forward pointers:
  - QRF-T-7: document `page` 1..1 000 000, `page_size` 1..200, `program_ids` ≤ 2 147 483 647, `phase_year` 2000–2100 with the 400-vs-404 difference from `/api/qa/catalog` (QRF-R-10)
  - QRF-T-6: reuse the generic-failure boundary for `details`; consider `statements=` in the log line (design §9)
  - QRF-T-8 / follow-up: `HttpExceptionFilter` URL logging on `/api/qa/*`
- spawns: implementer (attempt 2) 23 calls, 121 108 tokens, ended partial (assumptions only); reviewer (attempt 2) 6 calls, 88 269 tokens, ended complete
- Requirements: QRF-R-1, R-2, R-4, R-5, R-6, NFR Security/Observability — QRF-DD-1, DD-12
- Running totals vs budget: tasks 4/8 · LOC ~3 900/4 500 (T-1 ~670 + T-3 ~1 683 + T-4 ~625 + T-2 ~920) · review rounds 6/12. Within budget, but 4 tasks remain (T-5 M, T-6 L, T-7 doc, T-8 HITL), and at the T-3/T-4 density T-5 + T-6 project to ~1 500–2 000 LOC. **Expect the tripwire to fire during T-6**

## QRF-T-5 — `lookup` resolver and source registry — PASS (2026-10-28)

- Attempts: 1 · effort high (env-derived schema in SQL) · skills `nestjs-expert`, `tdd`
- Files: new `values/lookup-sources.ts` (67) + spec (49), `values/lookup.resolver.ts` (299) + spec (270). Edited:
  - `values/read-plan.ts` (+24: `any_in` predicate, optional `schema`, checked against `^[A-Za-z0-9_$-]+$`)
  - `values/read-plan.spec.ts` (+23)
  - `values/fixtures.ts` (+6/−5: the runner handles `any_in`)
  - `values/value-reader.ts` (exports `mapBounded`)
- Entry point for T-6: `resolveLookups(fields, { values, deferred }, { run, phaseYear, env? })` fills `values` in place and consumes only `kind: 'lookup'` items from `deferred`. It runs one SELECT per (source, key columns, qualifiers) group, which is one per source in the 2026 catalog, and none on an empty key set
- Implementer verification: `npx jest src/api/qa-catalog --maxWorkers=2` → 37 suites / 840 tests; tsc 0; eslint `values/` clean
- Falsifier reds (mutate → observe → revert; files byte-identical after):
  - (a) OR → AND: `alternatives are OR …` received `[null, null]`, expected `["Counter","Percent"]`
  - (b) year as equality: expected `[20, 40]`, received `null, null`. Pick flipped: `Expected: 60 Received: 50`
  - (c) top-level first: expected `["sibling", null]`, received `["top-level","top-level"]`
  - (d) `prms.fair_fields` entry removed: `+ Array [ "prms.fair_fields" ]`
- Evidence re-run (Leader inline, same command): 37 / 840 green; tsc 0; eslint 0. A grep shows `DB_TOC` only as `env.DB_TOC` (`lookup-sources.ts:65`) and as fake values in specs → **VERIFIED**
- Reviewer (`akili-reviewer`, overrides b + f): **PASS**. Conforms to QRF-R-7, R-9, DD-8, and the carried R-7/DD-9 as amended 2026-10-28; that carry ends here. The schema regex blocks breaking out of the backtick quoting. `any_in` binds every value and leaves existing predicates unchanged (no T-3/T-4 regression). The statement count depends on the catalog, never on the batch (*Query shape* met). The T-4 forward pointer is met
- ADVISORY (recorded, not tasks):
  - RISK, carried to T-6: a failing ToC query is thrown as-is, and MySQL "Unknown database 'X'" carries the `DB_TOC` value. T-6 must catch errors from both the base plans and `resolveLookups`, return a generic 500, and never log `error.message`. The T-5 DoD "`DB_TOC` never in errors" holds end to end only once T-6 does this
  - RELIABILITY (T-8): `getIndicatorTargetCatalog` falls back to rows from any year when the phase year has none, while the resolver returns null. This may show up in the golden comparison
  - RESILIENCE: no test pins groups == distinct sources over `CATALOG_FIELDS`
  - RISK (low): string keys are bound against an int `id`, which MySQL casts to 0; the JS re-check drops the false match
  - READABILITY: the `sortable` comparator mixes `-Infinity` and strings
- Not Done / Assumptions (Implementer). Assumptions only; nothing owed:
  - The year match runs in JS per `getIndicatorTargetCatalog`
  - Key matching is case-insensitive
  - A sibling is defined by the catalog, and a null sibling gives null
  - Registry primary keys are hard-coded, and the ToC primary keys come from repository code
  - One lookup round only
  - A non-object container (bare relation scalar) is skipped
  - String keys are bound against int ids
  - Not run against a DB
- Forward pointers:
  - QRF-T-6:
    - one generic-failure boundary around base plans, `resolvePathFields` and `resolveLookups`, with no `error.message` in logs or responses
    - fix the relation resolver's bare scalar for a scalar field with subfields (amended R-7); `resolveLookups` skips non-object containers
    - merge the `deferred` lists from `readBaseValues` and `resolvePathFields` before `resolveLookups`
  - QRF-T-8: compare against the year fallback in `getIndicatorTargetCatalog`
- spawns: implementer 27 calls, 169 829 tokens, ended partial (assumptions only); reviewer 14 calls, 113 688 tokens, ended complete
- Requirements: QRF-R-7 (lookup values), QRF-R-9 — QRF-DD-8, P-13
- Running totals vs budget: tasks 5/8 · LOC ~4 640/4 500 (T-1 ~670 + T-3 ~1 683 + T-4 ~625 + T-2 ~920 + T-5 ~740) · review rounds 7/12. **Budget tripwire fired** on LOC, with T-6 (L), T-7 (doc) and T-8 (HITL) still open

## Budget Tripwire — after QRF-T-5

- Budget (re-baselined at the QRF-T-3 gate): ~4 500 LOC · 8 tasks · 12 review rounds
- Actual after 5 of 8 tasks: ~4 640 LOC (committed through T-5) · 7 review rounds
- Cause: test density stayed at roughly 45–50 % of each task even when briefs asked for lean specs. T-2 took a rework round that added a cap and generic-failure tests. T-5 extended the shared `read-plan.ts` with `any_in` and `schema`
- Projection:
  - T-6 (L) wires reader + path + lookup into `POST /api/qa/results/details`, with the generic-failure boundary and the relation scalar fix: ~900–1 300 LOC
  - T-7 (doc): ~150–250
  - Spec total ≈ 5 700–6 200 LOC. Review rounds stay well under 12
- Status: stopped for the owner. This stop is not auto-approved
- Owner decision (Juan David, 2026-10-28, at the gate): **option 1. Re-baseline to ~6 200 LOC and continue with T-6.** `design.md` §13 and `tasks.md` §1 are updated. Tasks (8) and review rounds (12) are unchanged

## QRF-T-6 — `POST /api/qa/results/details` — attempt 1 FAIL (2026-10-28)

- Effort high · skills `nestjs-expert`, `tdd`, `error-handling-patterns`, `api-design-principles`
- Files: about 1 460 LOC (production ~540, specs and fixtures ~920).
  - New: `dto/qa-results-details.dto.ts` (+ spec), `qa-results.details.spec.ts`, `values/normalizers.ts` (+ spec), `values/projection.ts` (+ spec)
  - Edited: `qa-results.service.ts` (+ spec), `qa-catalog.controller.ts` (+ spec), `dto/qa-results-response.dto.ts`, `qa-results.constants.ts`, `qa-catalog.service.ts` (exports `CODE_CATALOG`), `qa-results.repository.ts` (+ spec, `result_code` in classify)
  - Edited under `values/`: `read-plan.ts`, `column.resolver.ts`, `relation.resolver.ts`, `path.resolver.ts` (each + spec), `fixtures.ts`
- Implementer verification: `npx jest src/api/qa-catalog src/app.module.spec.ts src/shared/guards --maxWorkers=2` → 45 suites / 909 tests, 3 reruns. One earlier unreproduced failure in `qa-catalog.controller.spec.ts`, likely a load flake. tsc 0; eslint + prettier clean on 25 files
- Falsifier reds:
  - (a) `BadRequestException: mutant: first ineligible id`, 4 failed
  - (b) in `projection.spec`: `+ "secret_column": "LEAK-DEEP",` at depth 2. The service-level runner stays green under the spread mutant
  - (c) `Received array: [..., "fx.future"]`
  - (d) `- "value": 4, + "value": 2,` and bare scalar `Expected: {"degree": 2, "value": 4} / Received: 4`
  - (e) `Received promise resolved instead of rejected`
  - (f) `Expected: "2026.7" / Received: "2026"`
  - (g) `Expected pattern: not /fx_result|prdb_secret|toc_secret_db|Table|database|exist/i`
  - (h) `Expected length: 1 / Received length: 3`
  - (i) `Received promise resolved instead of rejected`
  - Extended specs:
    - read-plan, column, relation: bare scalar
    - path: element row
    - controller: `@HttpCode(200)`, endpoint string
    - repository: `result_code`
- Smoke run over the real 2026 catalog with an empty runner: 9 types → 51 statements (design §8 budget ~110)
- Evidence re-run (Leader inline, same command, run twice) → 45 / 909 green both times; tsc 0 → **VERIFIED**
- Reviewers (parallel lens; overrides b and f): both lenses **FAIL** on the same issue. The Leader ruled it in scope (task text "log names field keys only"; design §7 and §9). Verbatim (conformance lens):
  > 1. **Discovered Issue:** On a failing read, the log carries only the route, year and error class. It does not name the field keys of the failing plan (`toGenericFailure` in `qa-results.service.ts`). This is Assumption 5. The Implementer says the failure "cannot be attributed to a plan", but it can: `readBaseValues` iterates the plans, and the path, element and lookup groups know their members' field keys.
  >    * **Violated Rule:** `design.md` §7: "A failing read plan → 500 with a generic message; **the log names the plan's field keys**, not the SQL." Also §9: "**On failure: field keys of the failing plan.** Never key, ids, values, SQL." Both are positive obligations. The "only" in the task text contrasts field keys with SQL and driver text. It does not make naming the field keys optional.
  >    * **Remediation Suggestion:** At each read stage (base plan, path group, element-path group, lookup source), catch the error and rethrow an internal error such as `PlanReadError { fieldKeys }` that does not copy the original message. In `toGenericFailure`, add `fields=<keys>` to the log line when the error carries field keys; keep the client body generic. Extend falsifier (g): the reader-failure log contains the failing plan's key (e.g. `fx.title`) and still has no table, database or driver text, and the 500 body has no field keys.
  - Security lens: the same issue, citing §7 and §9 ("as shipped, a 500 from one of about 110 plans cannot be traced to a field without reproducing it"). Otherwise it found:
    - the auth decorator exact; JWT-only → 401 proven against the real guard
    - every read inside `guarded`, and the fresh exception carries no `cause`
    - input bounds hold; `ELEMENT_ROWS` cannot leak
    - the success log is clean
- ADVISORY (recorded, not tasks):
  - Spec tension (Assumption 1): a `joinKey` throw → whole-batch generic 500. R-8's list of reasons is closed and §7 routes read failures to a 500. Raise it with the owner. The T-4 forward pointer stays **undischarged** until the owner decides
  - `field_keys` has no `ArrayMaxSize`, and the body limit is 50 MB. That allows about 250k unknown keys echoed in the 400 body and logged through the filter's stack
  - `normalize` and `project` run outside `guarded`
  - Element-path and lookup `IN` lists grow with stored rows × 50 and are not chunked (measure at T-8)
  - Plans run sequentially, not with concurrency 4 (within bounds)
  - A subfield key literally `value` would collide with the wrapper key
  - `guarded()` route defaults to `DETAILS_ROUTE`
  - `Number(null)` → 0 for `result_code`
  - Assumptions 2 and 3 must be documented in T-7
  - Cross-field lookup keys for unrequested fields resolve to null (no case today)
- Implementer Assumptions (verbatim summary):
  1. `joinKey` tension
  2. `ArrayMaxSize(50)` counts ids before dedupe
  3. `field_keys: []` → 400
  4. `result_code` comes from classify
  5. No field keys in the failure log (the FAIL above)
  6. `RESULT_ID_MAX` and `FIELD_KEY_MAX_LENGTH` constants
  7. `statements` includes classify; `DataSource` is injected
  8. Not run against a DB
- spawns: implementer 65 calls, 261 180 tokens, ended partial (assumptions + tension); reviewer (conformance) 14 calls, 125 501 tokens, complete; reviewer (security) 11 calls, 111 131 tokens, complete
- Owner decision (Juan David, 2026-10-28, at the T-6 gate): **the `joinKey` tension is resolved by keeping the whole-batch generic 500.** `requirements.md` QRF-R-8 gains a clarifying clause: the reason list is closed, and a failing read is not a per-id reason. This narrows nothing approved, because R-8's list was already closed and §7 already routed read failures to a 500. The T-4 forward pointer "catch a `joinKey` throw so one result cannot fail the batch" is closed as **decided: not applicable**
  - Correction closure:
    - Forward: grep of `read_failed|per-result read|one result cannot fail` outside execution.md finds no hits
    - Backward: the R-8 citers are tasks.md T-6, which already expects the 500 via falsifier (g), and T-7, which documents R-8
  - Conformance carry: the next T-6 Reviewer brief and the T-7 brief name "conformance to `requirements.md#QRF-R-8` as clarified 2026-10-28"

## QRF-T-6 — `POST /api/qa/results/details` — PASS on attempt 2 (2026-10-28)

- Attempts: 2 (attempt 1 FAIL above). Attempt 2 effort `xhigh` (bumped); skills `nestjs-expert`, `tdd`, `error-handling-patterns`
- Attempt 2 files (~169 LOC: production ~64, tests ~105):
  - `values/read-plan.ts`: `PlanReadError { fieldKeys, causeName }` and `readStage`
  - `readStage` wraps 5 read sites: `values/value-reader.ts` (per base plan), `values/path.resolver.ts` (starting rows, path group, element-path group), `values/lookup.resolver.ts` (per source)
  - `qa-results.service.ts`: `toGenericFailure` appends ` fields=<keys>`
  - tests: `values/fixtures.ts` (`failingOn`, `DRIVER_LEAK`), `qa-results.details.spec.ts` (falsifier (g) extended), one test per wrapped site
- Reds:
  - before wiring: `Expected pattern: / fields=fx\.title$/ Received string: "route=/api/qa/results/details year=2026 read failed (Error)"` · `Expected constructor: PlanReadError Received constructor: Error`
  - mutations, each reverted:
    - (1) `fields=` dropped → red
    - (2) `cause.message` copied → 8 red, with the log leaking `Table 'prdb_secret.fx_result' doesn't exist; Unknown database 'toc_secret_db'`
    - (3) each of the 5 sites unwrapped in turn → exactly its own test red
- Implementer verification: `npx jest src/api/qa-catalog src/app.module.spec.ts src/shared/guards --maxWorkers=2` → 45 suites / 915 tests; tsc 0; eslint + prettier clean
- Evidence re-run (Leader inline, same command) → 45 / 915 green; tsc 0 → **VERIFIED**
- Reviewer attempt 2 (`akili-reviewer`, conformance + security) → **PASS**
  - FAIL resolved: `PlanReadError` never reaches `HttpExceptionFilter`; the body is a fixed message; the logged keys are always `CatalogField.key`
  - The T-5 unavailable-source error is unchanged (built outside `readStage`)
  - Conforms to `requirements.md#QRF-R-8` as clarified 2026-10-28: a `joinKey` throw → whole-batch generic 500 with `fields=`
  - R-7 as amended unchanged since attempt 1. The R-7 carry ends here; the R-8 carry continues into T-7
- Decisions made:
  - **R-8 clarification**, recorded above at the moment it was made: owner decision, whole-batch 500, so the T-4 forward pointer is decided as not applicable
  - Plan- and query-building errors are left unwrapped (no `fields=`); a `classify` failure logs no `fields=`. Both accepted by the Reviewer
- ADVISORY (attempt 2):
  - If wraps ever nest, `causeName` would read `PlanReadError`; pass inner ones through
  - The element-path stage logs the parent key; add a comment
  - The year-qualifier `fail()` and `table-metadata` errors log without `fields=`
  - Attempt 1 advisories stand as recorded above, notably: no `field_keys` `ArrayMaxSize` against the 50 MB body limit; `normalize`/`project` outside `guarded`; unchunked element and lookup `IN` lists (measure at T-8); sequential plans
- Not Done / Assumptions: assumptions only, nothing owed
- Forward pointers:
  - QRF-T-7 documents:
    - `result_ids` 1..50, counted before dedupe
    - `field_keys: []` → 400
    - `field_keys` entries ≤ 200 characters
    - `RESULT_ID_MAX`
    - the R-8 closed reason list and whole-batch 500
    - the scalar-with-subfields shape
    - the `page`, `program_ids` and `phase_year` limits from T-2
  - QRF-T-8 measures:
    - statements per call (empty-runner smoke: 51)
    - element-path and lookup `IN` list sizes on the result with the most partners or ToC links
    - latency with sequential plans
    - the ToC year fallback (T-5)
- spawns: implementer (attempt 2) 41 calls, 189 590 tokens, ended partial (assumptions only); reviewer (attempt 2) 10 calls, 105 674 tokens, ended complete
- Requirements: QRF-R-1, R-2 (details), R-7 (all clauses), R-8 (as clarified), R-9 — QRF-DD-9, DD-10, DD-11
- Running totals vs budget: tasks 6/8 · LOC ~6 270/6 200 (T-6 ~1 630 across both attempts) · review rounds 10/12. **Budget tripwire fired** on LOC; T-7 (doc, ~200) and T-8 (HITL, no code expected) remain

## Budget Tripwire — after QRF-T-6

- Budget (re-baselined at the T-5 gate): ~6 200 LOC · 8 tasks · 12 review rounds
- Actual after 6 of 8 tasks: ~6 270 LOC · 10 review rounds
- Cause: T-6 needed a rework round (+~170 LOC). Attempt 1 landed at ~1 460, against the ~1 100 aim
- Projection: T-7 adds ~150–250 LOC of documentation, for a total of ~6 400–6 500. T-7 takes 1–2 review rounds, which puts the total at 11–12 of 12. T-8 is live verification with no code expected
- Status: stopped for the owner. This stop is not auto-approved
- Owner decision (Juan David, 2026-10-28, at the gate): **option 1. Re-baseline to ~6 500 LOC and continue with T-7.** `design.md` §13 and `tasks.md` §1 are updated. Review rounds (12) are unchanged

## QRF-T-7 — Contract documentation — attempt 1 FAIL (2026-10-28)

- Effort high · skills `cognitive-doc-design`, `api-design-principles`
- Files: `onecgiar-pr-server/docs/qa-catalog.en.md` +207/−5. Adds the "Results feed" part, a v1.26 change-log row, known gap 17 marked as applied, and 4 consistency edits
- Falsifier: `scratchpad/falsify.sh`. Its first run was red on `by_program`, `by_result_type`, `clarisa_id` and `count`, which appeared only in compound cells; those rows were split. Full-hit run: 33 names `ok`, `exit=0`. Red run: with `no_lead_program` un-backticked → `MISS no_lead_program exit=1`, then restored (identical to the backup)
- Person-bearing grep (`ts-node` over `CATALOG_FIELDS`, regex `/person|contact|author|e-?mail|name|facilitator|developer|collaborator|submitter|created_by|user/i`): 6 keys listed, OQ-8's five plus `general.created_by`. The other hits were excluded with reasons
- Evidence re-run (Leader inline): falsifier `exit=0`; the secret scan of the doc found nothing → **VERIFIED**
- Reviewer (`akili-reviewer`, override b) → **FAIL**: the doc contradicts the shipped code on value shapes, which is the disqualifier. Verbatim:
  > 1. The value-shape table says `object` is "reserved: no field uses it at revision 30". Two fields do use it: `knowledge_product.accessibility_cg` (`definitions/sections/knowledge-product.ts:360`) and `knowledge_product.altmetric` (`:436`). Violated: `requirements.md#QRF-R-10` and the task disqualifier. Remediation: remove "reserved…" and name both fields as the `object` cases. Their value is an object keyed by subfield key, or `null` (`projection.ts:31-32`).
  > 2. The doc says `single_select` is "the option id (number)", and `multi_select` holds "option ids" in the same sense. The shipped typing returns the stored id unchanged, number **or string** (`values/value-typing.ts:136-144`, "never reinterpreted"). Violated: `requirements.md#QRF-R-7`. Remediation: write "the option id as stored (number, or string for a control list with text ids)", or show that every control list in revision 30 has numeric ids and cite where that is enforced.
  > 3. "A field with no stored value is present… `null`" is stated for every non-list type. A scalar field that declares subfields never returns `null`. It returns `{ "value": null, "<sub>": null|[] }` (`projection.ts:35-37`); e.g. `general.lead_contact_person` → `{ "value": null, "directory_user": null }`. The capdev table already shows the object form, so the doc contradicts itself. Violated: `requirements.md#QRF-R-7` (amended 2026-10-28). Remediation: add the exception to the null/[] bullet and to the scalar-with-subfields table row: "no stored value → `{ value: null, <subfield>: null or [] }`, never bare `null`".
- Reviewer judgements:
  - `general.created_by` is correctly included: a PRMS user id, pseudonymous and person-identifying; OQ-8 was a snapshot, not a closed list
  - per-route permission confirmed (`qa-catalog.controller.ts:48,69,92`; `clarisa-api-key.guard.ts:29-42`)
  - "two new reasons" read correctly
  - date format correct
  - no leak
- ADVISORY:
  - NULL `submitted_at` sorts first, which the doc does not say
  - Phase scope should be marked "subject to OQ-4"
  - Example `result_id: 31084` is a real prod id; replace it with an obviously fake one
  - **CODE (outside T-7), carried to T-8 and validation:** a result with two active lead rows (role 1) appears twice in `items` and is counted twice. `buildEligibility` joins `rbi` without deduplicating (`qa-results.repository.ts`)
  - The grep falsifier cannot catch wrong shape descriptions; re-check by reading the doc against `projection.ts` and `value-typing.ts`
- spawns: implementer 30 calls, 138 560 tokens, ended partial (assumptions only); reviewer 30 calls, 132 083 tokens, ended complete

## QRF-T-7 — Contract documentation — PASS on attempt 2 (2026-10-28)

- Attempts: 2 (attempt 1 FAIL above). Attempt 2 effort `xhigh`; skill `cognitive-doc-design`
- Attempt 2: 11 lines changed in the feed section of `onecgiar-pr-server/docs/qa-catalog.en.md`. Final doc diff is +207/−5 net
  - Each shape sentence was checked against the code:
    - `object` → `projection.ts:31-32`, plus `knowledge-product.ts:360` and `:436`
    - `single_select` → `value-typing.ts:136-144`
    - `multi_select` → `read-plan.ts:291-294` and `projection.ts:27-28`
    - scalar with subfields and no stored value → `projection.ts:35-37`
  - `[advisory-grade]` items applied:
    - NULL `submitted_at` sorts first (`qa-results.repository.ts:111-116`, `:46`)
    - "subject to OQ-4"
    - example ids 31084/31085/41231 → 900001/900002/900003
  - `result_code: 5120` is left as an illustrative example
- Verification:
  - `falsify.sh` → 33 names `ok`, `exit=0`
  - `grep -n "reserved\|31084\|(number)"` → no hits in the feed section; the 4 remaining hits are untouched catalog text
- Evidence re-run (Leader inline): `falsify.sh` → `exit=0`; grep for `31084|(number)|41231` → no hits → **VERIFIED**
- Reviewer attempt 2 (`akili-reviewer`) → **PASS**: all three issues fixed, verified against the code itself; no regressions; R-7 as amended, R-8 as clarified and R-10 conform. The R-8 carry ends here
- **Pending item (shared-file discipline; apply on `staging`, never on this spec branch):**
  > **TRD §7 (QA row):** add `GET /api/qa/results` and `POST /api/qa/results/details` next to `GET /api/qa/catalog`.
  > - Auth: CLARISA `x-api-key`, with one registered permission per route; the PRMS `auth` JWT is not accepted.
  > - Eligibility: active, Submitted, phase year of Reporting or IPSR (subject to OQ-4), `source = 'Result'`, catalogued type, active lead program.
  > - Limits: `page_size` 1–200 default 100, `page` ≤ 1 000 000, `result_ids` 1–50, `phase_year` 2000–2100.
  > - A failing read is a whole-batch generic 500.
  > - Link: `onecgiar-pr-server/docs/qa-catalog.en.md#results-feed`.
- spawns: implementer (attempt 2) 19 calls, 121 737 tokens, ended partial (assumptions only); reviewer (attempt 2) 10 calls, 81 659 tokens, ended complete
- Requirements: QRF-R-10, QRF-R-9 (person-bearing keys: OQ-8's five plus `general.created_by`, confirmed by the Reviewer)
- Running totals vs budget: tasks 7/8 · LOC ~6 480/6 500 · review rounds **12/12**. Within budget, but review rounds are exhausted. T-8 is HITL live verification with no code expected. Any code fix that T-8 surfaces (for example the duplicate-lead-row finding below) would need a review round and therefore a budget decision first
- Carried to QRF-T-8 (from the T-7 attempt 1 review, code outside T-7): a result with two active lead rows (role 1) may appear twice in `items` and be counted twice, because `buildEligibility` joins `rbi` without deduplicating. Check this on prtest with a query for results that have >1 active role-1 row

## QRF-T-8 — Live verification (HITL) — in progress (2026-10-28)

- Environment: local server (`npm run start:dev`, HEAD `b595ab251`) on the dev/test DB (`prdb`, confirmed by the owner as dev/test). The CLARISA QA test key is read from a private file and never printed. The SQL was run with `mysql2` against the same `.env`
- **(1) P-12 / OQ-4:** active, Submitted, `source='Result'`, 2026, by `app_module_id` × type: module 1 → type 1:3, 2:2, 4:2, 5:5, 6:9, 7:7, 8:4 (32). Module 2 → none
  - Versions with `phase_year=2026`: 36 `Reporting 2026` (module 1) and 37 `IPSR 2026` (module 2)
  - Active type 10, by module, year and status: always module 2 (2023: 154 Editing, 2 QA; 2024: 162/3/1 Submitted/6; 2025: 224/1; 2026: 24 Editing). Type 11 is also module 2 only
  - **OQ-4 decided by the owner: Reporting + IPSR (unchanged predicate)**
- **(2) P-7:** `SELECT source, COUNT(*) … status_id=3 AND is_active=1 GROUP BY source` → `Result` 107, `API` 1, **no NULL**. 2026 → `Result` 32, `API` 1
- **(3) `total` vs SQL:** `GET /results?phase_year=2026` → `total 32`. Direct SQL: `COUNT(DISTINCT r.id)` 32, joined rows 32 → **equal**
- **(4) Paging:** `page_size` 200 → 1 page, 32 items. `page_size` 5 → 7 pages, 32 items. **0 duplicates, 0 gaps**
- **Carried duplicate-lead-row risk:** results with more than one active role-1 `results_by_inititiative` row (Submitted, 2026 and 2025) → **0 rows**. Not observed in this data
- `phase_year=2025` → 404 `No QA catalog available for phase_year 2025` (expected: the catalog exists for 2026 only)
- **(6) Timing** (client wall-clock from the developer laptop to the remote DB; 1 warm-up call discarded):
  - List, `page_size` 200 (32 items), 10 runs: min 563, p50 595, **p95 664**, max 664 ms. Server `duration_ms` was 36–177; the remainder is spent outside the service (guard and transport)
  - Details, batch 32 (all eligible), 10 runs: min 3601, p50 3995, p95 4352 ms
  - Details, **batch 50** (32 eligible, 18 not eligible: 12 `not_found`, 6 `not_submitted`), 7 runs: min 3291, p50 3559, **p95/max 3696 ms**. Server 2766–3224 ms
  - Both are within the NFR (≤ 1 s / ≤ 5 s). The NFR's prtest measurement is still owed after merge
- **Query shape:** the service logs `statements=` per call.
  - knowledge_product prefixes 1..9 → 39, 45, 47, 47 … 47. KP singles → 38–46
  - innovation_development prefixes 1..7 → 42, 42, 48 … 48. Singles → 38–48
  - Mixed batch 32 or 50 → 82
  - The count saturates at the plans the data touches (child and lookup rounds run only when parent rows exist). It does not grow per result, so the NFR holds
- **(7) P-2:** `GET /api/qa/results` without a key → **401**. With the QA test key → **200**. `POST /api/qa/results/details` with the key → **200**. No CLARISA grant request is needed in test
- **(5) Golden comparison:** pending. `details` for 14 results (2 per type with 2026 data) dumped to the session scratchpad: other_output 8569/9754, capacity_sharing 8572/9171, knowledge_product 8778/9532, innovation_development 8799/9351, other_outcome 8907/8917, policy_change 8908/9674, innovation_use 8960/9527 (result codes)
  - `impact_contribution` and `innovation_package` have no Submitted 2026 results in this DB and cannot be compared
- Spec rows updated: `design.md` P-2, P-7 and P-12 (verified), DD-3 and the header count. `requirements.md` OQ-4 is marked decided

### QRF-T-8 (5) Golden comparison — partial, **FAIL** (2026-10-28)

- Owner decision: compare 1 result per type, in the browser (DoD asks for ≥ 2). This is a recorded deviation
- Form: prtest (`prtest.ciat.cgiar.org`, Reporting 2026, `?phase=36`) under the owner's session. prtest reads the same DB as the local `.env`: the title and lead program of 8569 are identical on both
- Results compared so far:
  - **8569** other_output: general, contributors, geo and evidence compared
  - **8572** capacity_sharing: general, contributors, geo and CapSharing compared
  - **8778** knowledge_product: KP info and lead center compared
  - **8799** innovation_development: Innovation Dev info compared
- Not compared yet: 8907 other_outcome, 8908 policy_change, 8960 innovation_use
- Matching (sample):
  - title, description, lead contact, lead program, result level and type
  - impact tags: the feed sends `tag_level` ids (1 Not Targeted / 2 Significant / 3 Principal), as the catalog defines; the form shows them as 0/1/2
  - ToC mapping: HLO statement, typology, unit, target and contribution (55, 1)
  - "Other" science program SP01 with its own KPI
  - partners not applicable, led-by-partner No, geo scope and countries (Global; Country/Colombia 170)
  - evidence: file, private flag, "Other Output" tag
  - capdev: 0/1/0/0, Long-term + Master → `{value:4, degree:2}`, Virtual, attending No
  - KP: handle metadata, authors, type, peer reviewed, ISI, OA, licence, AGROVOC, sponsors, FAIR scores
  - innovation dev: short title, characterization 1, nature 12, new variety No, readiness (form level 3), justification, developers, collaborators
- **Mismatches:**
  - **G-1 `contributors.lead_center` (every type).**
    - Form: 8572 = Bioversity (Alliance) `CENTER-02`; 8778 = IWMI `CENTER-14`
    - Feed: `1`, `1`; 8799 gets `0`
    - Cause: the binding `relation results_center.value_column = 'is_leading_result'` (`definitions/sections/contributors-partners.ts:506`) returns the flag, not the center
    - Same pattern: `partners.lead_partner` (`:784`, `results_by_institution.is_leading_result`)
  - **G-2 answer-bound fields of innovation development return the wrong question's answers.**
    - 8799 stores 17 active answered `result_answers` rows across questions 78, 79, 84, 101, 102, 103, 112, 113, 125, 136, 137, 138
    - Feed: `gesi_stage`, `risk_stage`, `ipr_consideration` and `team_diversity` all = `"80"`, which is the first answered row (an option of question 78)
    - Feed `team_diversity.actions` = all 17 rows
    - Form: GESI and risk stage unanswered; IPR unanswered; team diversity = 113 with actions 116 and 117 only
    - Cause: `answerBinding()` and `sameResultAnswers()` (`sections/innovation-development.ts:79-107`) filter only `answer_boolean=1, is_active=1`. The catalog leaves question identity to the closed control list, and the reader does not apply it
    - The GESI, risk and IPR options have no closed list (ids resolved by text, `closed-control-lists.ts` note), so the binding itself cannot select them
    - `policy-change.ts:101` uses the same table: check it when 8908 is compared
  - **G-3 `linked.has_innovation_link` stored NULL.** 8569 and 8572 store NULL; the feed sends `null`. The form shows **No**, because the client model defaults to `false` (`contributorsAndPartnersBody.ts:11`). The feed matches the stored value, not what the form displays. Owner decision
- Verdict: T-8 falsifier "any golden field mismatch" → **FAIL**. G-1 and G-2 need code or catalog changes outside T-8 (`execution.md`-only task); the review-round budget is exhausted (12/12). Escalated to the owner
