# Tasks — QA results feed (`quality-assurance/qa-results-feed`)

## 1. Scope of this task list

- **Module / feature:** `quality-assurance` / `qa-results-feed`
- **Linked spec:** `requirements.md` (QRF-R-1..10) + `design.md` (QRF-DD-1..12, Premise Ledger P-1..19)
- **Ticket:** [P2-4037](https://cgiarmel.atlassian.net/browse/P2-4037) — commits `<emoji> <type>(qa-catalog) [P2-4037]: …`
- **Owner / driver:** Juan David Delgado
- **Status:** not-started — tasks approved 2026-10-28 (Juan David)
- **Budget (design §13):** 8 tasks · ~6 200 LOC (re-baselined 2026-10-28 from ~1 600, then from ~4 500 at the T-5 tripwire) · 12 review rounds — tripwire for `/akili-execute`

## 2. Pre-flight checklist

- [x] `requirements.md` approved (2026-10-28, amended at Phase 2)
- [x] `design.md` approved (2026-10-28)
- [ ] Open questions: Q1 and OQ-5 resolved, Q2 decided as a separate spec (2026-10-28). OQ-8 resolved (`field_keys`). Q3 and OQ-4 remain open. **None blocks T-1..T-7**; OQ-4 (P-12) is settled at T-8 and may adjust one predicate in T-1
- [ ] CLARISA: the QA client's grants for the two endpoint strings (P-2) — requested before T-8
- [x] No conflicting in-flight spec on `api/qa-catalog` (`qa-field-catalog` is executed)
- [x] No migration in this spec
- [ ] **Worktree has no `node_modules` at specify time** (`npx jest` → `Module ts-jest in the transform option was not found`). Run `npm ci` in `onecgiar-pr-server/` and copy its `.env` before T-1; every "Red run" below that targets an existing file is **observed at the start of its task** and quoted in `execution.md`

## 3. Task list

### [x] QRF-T-1 — Type-key map and eligibility repository

- **Type:** server
- **Description:** Add `definitions/result-type-ids.ts` (id ↔ catalog key for the 9 catalog types; 3 and 11 absent) and `QaResultsRepository` with one parameterized eligibility query used three ways: page (ORDER BY `submitted_at`, `result_id`), count, breakdown (by lead program, by type key), plus `classify(ids, year)` that returns every requested id with the first failing reason (`not_found`, `not_submitted`, `other_phase`, `not_w1w2`, `type_not_catalogued`, `no_lead_program`). `submitted_at` per QRF-DD-5; phase predicate covers both app modules (QRF-DD-3, pending OQ-4).
- **Implements:** QRF-R-3 (all clauses + scenario *Mixed population*), QRF-R-4 (lead-program match, AND, empty = no filter), QRF-R-5 (order clause), QRF-R-6, QRF-R-8 (reason order) — QRF-DD-2..5
- **Files (expected):** `onecgiar-pr-server/src/api/qa-catalog/definitions/result-type-ids.ts`, `qa-results.repository.ts` (+ `.spec.ts`), `qa-catalog.module.ts`
- **Depends on:** —
- **Blocks:** QRF-T-2, QRF-T-6
- **Estimate:** M
- **Review:** full — eligibility is the contract's core and has no DB in CI
- **Verification:**
  - **Falsifier:** (a) drop `source = 'Result'` from the built SQL → the predicate test fails; (b) drop the `result_id` tie-breaker → the order test fails; (c) interpolate `:year` into the SQL string instead of binding it → the parameter test (asserts the year value appears in params and not in the SQL text) fails; (d) map test: change the key of id 6 → the test comparing the map against `CATALOG_RESULT_TYPES` keys and `ResultTypeEnum` fails; (e) classify fixture with one id per reason, where a wrong check order yields a different reason for the id that is both Editing and bilateral (expected `not_submitted`, mutated order gives `not_w1w2`).
  - **Red run:** `predicted — greenfield artifact (observed in QRF-T-1)`: `npx jest src/api/qa-catalog/qa-results.repository.spec.ts` → "Cannot find module './qa-results.repository'" is NOT a red; the red to quote is the assertion failure of (a) after the file exists with the predicate removed.
  - **Disqualifier:** a predicate test that matches on SQL substrings without anchoring the column (e.g. `'Result'` found inside a comment) does not count; SQL semantics are not proven here — only at T-8.
  - **Consumers:** none (new symbols). `qa-catalog.module.ts` providers change → `qa-catalog.module.spec.ts` (P-18).
- **Definition of done:**
  - [ ] Falsifiers (a)–(e) executed against the post-change code, each red quoted in `execution.md`
  - [ ] `npx jest src/api/qa-catalog --maxWorkers=2` green; `npx tsc --noEmit` green; eslint clean on touched files
  - [ ] No year, id or SQL logged

### [x] QRF-T-2 — `GET /api/qa/results` route

- **Type:** server
- **Description:** Query DTO (`phase_year` required int, `program_ids` / `result_type_keys` CSV, `page` ≥ 1 default 1, `page_size` 1..200 default 100), service method (404 when the year has no catalog, 400 naming unknown type keys, empty page past the end with real `total`), controller method with `@BilateralClarisaEndpoint('/api/qa/results')`, no interceptor; add both new paths to the JWT exclude list and to `app.module.spec.ts`. Log line per QRF NFR.
- **Implements:** QRF-R-1 (scenario *No key*; JWT not accepted; exclude; no envelope; throttle via P-5), QRF-R-2 (scenario *Year omitted*; BUT no clock fallback; 404), QRF-R-4 (scenario *Filter by program and type*; AND IT MUST count `total` over the filtered set; unknown key → 400; unknown program → empty), QRF-R-5 (item fields, page validation, body keys, past-end page), QRF-R-6 — QRF-DD-1, DD-12
- **Files (expected):** `dto/qa-results-query.dto.ts` (+ spec), `dto/qa-results-response.dto.ts`, `qa-results.service.ts` (+ spec), `qa-catalog.controller.ts` (+ spec), `src/app.module.ts`, `src/app.module.spec.ts`
- **Depends on:** QRF-T-1
- **Blocks:** QRF-T-7, QRF-T-8
- **Estimate:** M
- **Review:** full — auth and an external contract
- **Verification:**
  - **Falsifier:** (a) remove `@BilateralClarisaEndpoint` from the method → controller metadata test fails (guard would 401 every call, P-1); (b) default `phase_year` to `new Date().getFullYear()` in the DTO → *Year omitted* test (expects 400) fails; (c) leave `api/qa/results/details` out of `app.module.ts` → `app.module.spec.ts` fails; (d) add `@UseInterceptors(ResponseInterceptor)` → test asserting the controller has no interceptor metadata fails; (e) service fixture with 3 eligible rows of program 5 and 2 of program 7, filter `program_ids=5` → `total` 3 (a count over the unfiltered set gives 5).
  - **Red run:** (c) on existing `src/app.module.spec.ts`: add the two expected entries first → `toHaveBeenCalledWith` mismatch on the exclude list. **Not observable at specify time** (no `node_modules`, see pre-flight); observe at task start and quote verbatim. Others: `predicted — greenfield artifact (observed in QRF-T-2)`.
  - **Disqualifier:** a 401 test that stubs `canActivate` to false proves nothing about the decorator; (a) must read the real method metadata.
  - **Consumers:** `src/app.module.spec.ts:52` (pins the exclude list); `src/shared/guards/throttler-exclude-bilateral.guard.spec.ts:23` (unchanged; re-run); `qa-catalog.controller.spec.ts`; QA platform (external) — P-18, P-19.
- **Definition of done:**
  - [ ] Falsifiers (a)–(e) executed, reds quoted
  - [ ] Swagger: `@ApiOperation`, `@ApiHeader` present
  - [ ] `npx jest src/api/qa-catalog src/app.module.spec.ts src/shared/guards --maxWorkers=2` green; `npx tsc --noEmit` green

### [x] QRF-T-3 — Value reader core: read plans, `column` and `relation`, typing

- **Type:** server
- **Description:** **First step: settle P-14** — a metadata test lists every table a `relation`/`path` binding uses as an element and asserts a single-column PK (via the entity classes in `definitions/scope.ts`); record the outcome in `execution.md`. Then: read-plan builder grouping bindings (QRF-DD-6), resolvers for `column` and `relation` (filter equality, NULL `value_column` row is not an element, subfield `column` read from the element row), element identity by PK (DD-7), typing per field type (DD-9). Batched `IN (:resultIds)` only.
- **Implements:** QRF-R-7 (value shapes for text/number/boolean/date/selects/list; null and `[]` fill), QRF NFR *Query shape* — QRF-DD-6, DD-7, DD-9
- **Files (expected):** `onecgiar-pr-server/src/api/qa-catalog/values/read-plan.ts`, `column.resolver.ts`, `relation.resolver.ts`, `value-typing.ts` (+ specs), `values/fixtures.ts`
- **Depends on:** —
- **Blocks:** QRF-T-4, QRF-T-5, QRF-T-6
- **Estimate:** L
- **Review:** full — the reader is the source of every value QA sees
- **Verification:**
  - **Falsifier:** (a) relation fixture holding a row with NULL `value_column` and a row that fails `filter` → expected 1 element; dropping either rule gives 2 or 3; (b) two `column` bindings on the same table → one plan; a builder that does not group gives 2 (asserted by plan count); (c) tinyint `0` for a `boolean` field → `false`; a typer that passes driver output returns `0`; (d) a multi_select fixture with no rows → `[]`, never `null`; (e) batch 1 vs batch 50 over the same fixture catalog → identical plan count.
  - **Red run:** `predicted — greenfield artifact (observed in QRF-T-3)`.
  - **Disqualifier:** if P-14 fails (a composite-PK element table), stop and raise a Pivot — DD-7 changes; do not key elements by row position.
  - **Consumers:** none (new symbols; reads `CATALOG_FIELDS` and binding types without changing them).
- **Definition of done:**
  - [ ] P-14 outcome recorded; falsifiers (a)–(e) executed and quoted
  - [ ] Jest + `tsc --noEmit` green

### [x] QRF-T-4 — `path` resolver

- **Type:** server
- **Description:** Resolve `path` bindings: steps from `result` (top-level) or from the parent element row (subfield, catalog DD-12); every `join` pair must hold; step `filter` equality; step `pick` = first row by `order_by`/`direction`; `columns` read with the value; grouped per DD-6.
- **Implements:** QRF-R-7 (scenario *Whole object of a selected field*; AND IT MUST use only catalog keys at every level) — QRF-DD-6, DD-7
- **Files (expected):** `values/path.resolver.ts` (+ spec)
- **Depends on:** QRF-T-3
- **Blocks:** QRF-T-6
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** (a) a two-pair join fixture (result + initiative) where joining on one pair only yields a row from another initiative → expected 1 row, mutated 2; (b) a `pick desc` fixture with two re-uploaded rows → newest; flipping direction returns the oldest; (c) a subfield path that starts at `result` instead of the parent row → attaches the child to both parent elements (fixture with two parents, one child each).
  - **Red run:** `predicted — greenfield artifact (observed in QRF-T-4)`.
  - **Disqualifier:** a fixture where both join pairs select the same rows proves nothing about (a).
  - **Consumers:** none.
- **Definition of done:**
  - [ ] Falsifiers executed and quoted; Jest + `tsc --noEmit` green

### [x] QRF-T-5 — `lookup` resolver and source registry

- **Type:** server
- **Description:** Source registry for the 7 logical sources (P-13; `toc.*` → `${DB_TOC}` read from config at call time, never logged). Lookup run after base values: keys from sibling subfield first, else top-level; alternatives as OR; qualifiers with `PHASE_YEAR` → request year and `match:'year'` per the canonical year read; `pick` first row; one SELECT per source per batch over distinct keys.
- **Implements:** QRF-R-7 (values of lookup fields), QRF-R-9 (no source name in errors) — QRF-DD-8
- **Files (expected):** `values/lookup.resolver.ts`, `values/lookup-sources.ts` (+ specs)
- **Depends on:** QRF-T-3
- **Blocks:** QRF-T-6
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** (a) KPI fixture where the key matches `related_node_id` for one row and `id` for another → both resolved; an AND of alternatives resolves neither; (b) target rows for 2025 and 2026 with `match:'year'` on `2026-06-30` and `2026` → 2026 row picked; equality match misses the date-form row; (c) sibling key `toc_result` present both as subfield and top-level → sibling value used; (d) registry test: every `source` string in `CATALOG_FIELDS` has a registry entry — add a fake source to a fixture field → test fails.
  - **Red run:** `predicted — greenfield artifact (observed in QRF-T-5)`.
  - **Disqualifier:** a lookup test whose fixture has one candidate row cannot show `pick` or alternatives working.
  - **Consumers:** none.
- **Definition of done:**
  - [ ] Falsifiers executed and quoted; Jest + `tsc --noEmit` green; `DB_TOC` never in logs or errors

### QRF-T-6 — `POST /api/qa/results/details` route

- **Type:** server
- **Description:** Body DTO (`phase_year` required, `result_ids` 1..50 positive ints, duplicates collapsed, optional `field_keys` validated against the year's top-level keys), service: classify (T-1) → field selection per year, type and `field_keys` → reader (T-3..5) → normalizer list with the capdev entry (DD-10) → key-by-key projection (DD-9; a scalar field with subfields as `{ value, <subfield key>: … }`, R-7 amended 2026-10-28 — the T-3 planner drops those subfields today, so plan them here) → `catalog_version` from `CATALOG_VERSIONS`; controller method with `@BilateralClarisaEndpoint('/api/qa/results/details')`; generic 500 on a failing plan (log names field keys only).
- **Implements:** QRF-R-1, QRF-R-2 (details side), QRF-R-7 (all clauses; `catalog_version` equality), QRF-R-8 (scenario *Unsubmitted after listing*; BUT must NOT fail as a whole), QRF-R-9 (no non-catalog key at any level; no table/column names in errors) — QRF-DD-9, DD-10, DD-11
- **Files (expected):** `dto/qa-results-details.dto.ts` (+ spec), `qa-results.service.ts` (+ spec), `values/normalizers.ts` (+ spec), `values/read-plan.ts` (+ spec, scalar subfields), `qa-catalog.controller.ts` (+ spec)
- **Depends on:** QRF-T-1, QRF-T-3, QRF-T-4, QRF-T-5
- **Blocks:** QRF-T-7, QRF-T-8
- **Estimate:** M
- **Review:** full
- **Verification:**
  - **Falsifier:** (a) batch `[eligible, unsubmitted]` → 200 with one in each list; a service that throws on the first ineligible id fails; (b) whitelist walk: inject an extra column into a fixture row → absent from output at depth 2; a spread-based projection leaks it; (c) a field valid only from 2027 → absent for 2026; (d) capdev raw 2 → `length_of_training` `{ value: 4, degree: 2 }`; raw 3 → `{ value: 3, degree: null }`; a projection that returns the bare scalar fails (scenario *Scalar field with subfields*); (e) `result_ids` of 51 → 400; (f) `catalog_version` equals `getCatalog(year).catalog_version` (same fixture source); (g) a reader error whose message contains a table name → the 500 body contains no table name; (h) `field_keys: ["general.title"]` → `values` has that key only, and the read-plan count equals the plans of that field alone (a service that reads everything and filters at projection passes the key check but fails the plan count); (i) a subfield key or an unknown key in `field_keys` → 400 naming it.
  - **Red run:** `predicted — greenfield artifact (observed in QRF-T-6)`.
  - **Disqualifier:** a whitelist test that compares only top-level keys does not cover nesting.
  - **Consumers:** `qa-catalog.controller.spec.ts`; QA platform (external).
- **Definition of done:**
  - [ ] Falsifiers (a)–(g) executed and quoted; Jest + `tsc --noEmit` green; eslint clean

### QRF-T-7 — Contract documentation

- **Type:** docs
- **Description:** In `onecgiar-pr-server/docs/qa-catalog.en.md`: a "Results feed" part (routes, eligibility incl. the two new reasons, filters, order, limits, value shapes, null/[] rule, capdev normalization now applied, `not_eligible` reasons, person-bearing keys per OQ-8) and a change-log row. Record TRD §7 QA row as a **pending** item in `execution.md` (shared-file discipline).
- **Implements:** QRF-R-10, QRF-R-9 (person-bearing keys listed)
- **Files (expected):** `onecgiar-pr-server/docs/qa-catalog.en.md`
- **Depends on:** QRF-T-2, QRF-T-6
- **Blocks:** QRF-T-8
- **Estimate:** S
- **Review:** checklist — doc against the shipped DTOs
- **Verification:**
  - **Falsifier:** every response key and reason code in the DTOs appears in the doc — a grep of each DTO property name over the doc returns ≥ 1 hit; a reason removed from the doc fails that check. The person-bearing key list is derived by grepping `CATALOG_FIELDS` labels/keys for person/contact/author/email/name terms, command quoted.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** a doc written from the design instead of the shipped DTOs.
  - **Consumers:** QA platform team (reads the doc).
- **Definition of done:**
  - [ ] Change-log row added; known gap 17 marked as applied by the feed

### QRF-T-8 — Live verification (HITL)

- **Type:** rollout
- **Description:** Against the local server on the dev/test DB, then prtest after merge: (1) P-12 / OQ-4 — count eligible 2026 results per `app_module_id` and per type; owner decides; adjust T-1 predicate if needed; (2) P-7 — `SELECT source, COUNT(*) … status_id=3 GROUP BY source`; (3) `total` vs direct SQL count; (4) page through the full 2026 set (`page_size` 200), assert no duplicate and no gap; (5) golden comparison: ≥ 2 results per catalog type, `details` vs the 2026 form, field by field; (6) timing p95 for list (max page) and details (batch 50); (7) P-2 — call both routes with the QA test key; grant request to CLARISA if 401.
- **Implements:** QRF-R-3, QRF-R-5 (scenario *Stable paging*), QRF-R-7 (real data), NFR performance — settles P-2, P-7, P-12
- **Files (expected):** `execution.md` only
- **Depends on:** QRF-T-2, QRF-T-6, QRF-T-7
- **Blocks:** —
- **Estimate:** M
- **Review:** checklist — evidence quoted, not summarized
- **Verification:**
  - **Falsifier:** a `total` differing from the SQL count, a duplicate id across pages, or any golden field mismatch fails this task.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** timings from a cold first call only, or from fewer than 5 runs, are not evidence — report the spread. A golden comparison against the read-only summary instead of the form does not count.
  - **Consumers:** none.
- **Definition of done:**
  - [ ] OQ-4 decided by the owner and recorded; P-2, P-7, P-12 rows updated in `design.md`
  - [ ] Evidence (commands, counts, ms) quoted in `execution.md`; no key or token in it

## 4. Dependency graph

```
QRF-T-1 ──┬── QRF-T-2 ─────────────┐
          │                        ├── QRF-T-7 ── QRF-T-8
QRF-T-3 ──┼── QRF-T-4 ──┐          │
          └── QRF-T-5 ──┴── QRF-T-6┘
          (T-1 also feeds T-6)
```

Parallel-safe: T-1 ∥ T-3; T-4 ∥ T-5; T-2 ∥ T-3..T-5.

## 5. Coverage map (scenario / clause → task)

| Requirement clause | Task |
|---|---|
| R-1 key required; JWT not a substitute; scenario *No key* (BUT no data) | T-2 (list), T-6 (details) |
| R-1 exclude list, no envelope, no throttle, key not logged | T-2 (+ T-6 log line) |
| R-2 400 / 404; BUT no clock or open-phase fallback | T-2, T-6 |
| R-3 six eligibility conditions; scenario *Mixed population*; same rule both routes | T-1 (SQL), T-8 (real data) |
| R-4 optional CSV filters, AND, lead-only match, unknown key 400, unknown program empty; AND IT MUST count `total` filtered | T-1, T-2 |
| R-5 item fields, page validation, fixed order, body keys, past-end page; scenario *Stable paging* (BUT no swap) | T-1, T-2, T-8 |
| R-6 breakdown | T-1, T-2 |
| R-7 batch validation, duplicates, values per type/year, `catalog_version`, shapes, null/[] | T-3, T-4, T-5, T-6 |
| R-7 scenario *Whole object* (AND IT MUST catalog keys at every level) | T-4, T-6 |
| R-8 six reasons, order; scenario *Unsubmitted after listing* (BUT not fail as a whole) | T-1, T-6 |
| R-7 `field_keys` (top-level only, 400 on unknown, absent = all) | T-6 |
| R-9 no non-catalog key at any level; no table/column names; person-bearing keys listed; unrequested field never read; scenario *Only the configured fields* (BUT not even as `null`) | T-6, T-5, T-7 |
| R-10 contract doc + change log | T-7 |
| NFR performance / query shape / observability | T-3 (shape), T-2/T-6 (log), T-8 (timing) |

## 6. Rollout & verification

- [ ] PR to `staging` (or the branch the owner names) with `[P2-4037]`; CI green
- [ ] CLARISA grants for both endpoint strings (P-2)
- [ ] T-8 on prtest after the automatic deploy
- [ ] QA team pointed to the doc's change-log row

## 7. Cleanup & follow-ups

- TRD §7 QA row (pending item, applied on `staging`)
- Q2 → new spec: lock unsubmit by QA round (Reporting must learn the round of a result)
- Q3 decision → separate change if it needs a new catalog key
