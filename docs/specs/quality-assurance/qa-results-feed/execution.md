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
