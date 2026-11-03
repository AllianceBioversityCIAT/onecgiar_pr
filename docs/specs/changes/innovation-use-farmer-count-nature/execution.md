# Execution — Innovation Use: unit and nature of the number for Farmers actors

## Document Control

| Field | Value |
|---|---|
| Spec path | `changes/innovation-use-farmer-count-nature` (P2-4048) |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated |
| Leader model | `opus` (T1, matches the registry) |
| Implementer / Reviewer | `akili-implementer` (T2 `sonnet`) / `akili-reviewer` (T3 `opus`), Step 8E wrappers |
| Started | 2026-11-03 |
| Kaizen log | `docs/specs/kaizen-log.md` absent, so there are no Active Lessons to carry |

**Pre-flight note (2026-11-03):** the user ran `/akili-execute changes/innovation-use-farmer-count-nature`. That invocation is taken as approval of requirements + design (pre-flight item 1). The working tree also holds uncommitted work from another spec (`result-framework-reporting/kpi-row-status-counts`: dashboard-lab, results-framework-reporting, aow-bilateral). None of those files belong to this spec. Every diff in this log is path-scoped to this spec's files, and commits must stage explicit paths.

## Task Execution History

### IFC-T-1 — Verify Farmers id, size the impact, snapshot the live function (HITL)

- **Status:** PASS (HITL, review skip-eligible: no code; each Done item is evidence supplied by Santiago)
- **Date:** 2026-11-03
- **Attempts:** 0 Implementer spawns (rollout task, data supplied by the user)
- **Evidence:**
  - **(a) Farmers id:** Santiago confirmed `actor_type_id = 1` = `Farmers/ (agro)pastoralist/ herders/ fishers` in **test and prod** with screenshots on 2026-11-03 (recorded in `tasks.md` §2). Full catalogue: 1 Farmers, 2 Researchers, 3 Agricultural extension agents (prod) / Extension agents (test), 4 Policy actors, 5 Other. The name of id 3 differs between environments and the ids do not. That supports IFC-DD-4 (match by id). Falsifier (Farmers ≠ 1) not triggered. Disqualifier (ids differ) not triggered.
  - **(b) Sizing (R-1 query, PROD):** **130** W1/W2 2026 Innovation Use results with a Farmers row in current use (section 1) and **34** in the 2030 projection (section 2). Every result has exactly one Farmers row per section. That gives **139 distinct results, all status 1 (Editing)**, none Submitted or QA. IFC-OQ-1 was resolved as option A: the rule applies to all of these rows, and users are told at ship.
  - **(c) Before-body:** `sql/validation_innovation_use_P25.before.sql` (484 lines, live PROD body pasted 2026-11-03). It includes the `result_phase_year` lookup and the `section_id = 1` / `= 2` actor blocks that T-5 edits.
- **Requirements covered:** prerequisite for IFC-R-1 and R-6 (Farmers identity); IFC-OQ-1 sizing.
- **Decisions:** the stale "second environment is still pending" fragment in `tasks.md` §2 contradicts the bold "both confirmed" in the same line. The confirmed reading is the one used here.
- **Issues:** none.

### IFC-T-2 — Schema, entity, write whitelist and replication of the two columns

- **Status:** PASS (code + specs). **HITL owed:** migration up/down and `npm run migration:check` against the DB. Santiago runs them, because the local stack points at the shared prdb. The Done items for those stay unchecked until he does.
- **Date:** 2026-11-03
- **Attempts:** 1 Implementer (`akili-implementer`, effort medium, skills `nestjs-expert` + `tdd`) and 2 parallel lens Reviewers (`akili-reviewer`: conformance + reliability/resilience; conformance + readability/risk). Parallel-lens mode was used because the task adds a migration on a shared table.
- **Files:**
  - `onecgiar-pr-server/src/migrations/1793300000000-AddFarmerCountNatureToResultActors.ts` (new; up adds both `varchar(32) NULL`, down drops them in reverse order; hand-written, not run)
  - `src/api/results/result-actors/entities/result-actor.entity.ts` (2 nullable columns)
  - `src/api/results/result-actors/farmer-follow-up.constant.ts` (new: `FARMERS_ACTOR_TYPE_ID = 1`, code arrays, `toCountUnit` / `toUseNature` exact-match whitelist that returns null otherwise)
  - `src/api/results/result-actors/repositories/result-actors.repository.ts` (both columns in createQueries find / insert / INSERT-SELECT and in `replicable()` default INSERT + SELECT, read-back SELECT and custonFunction SELECT)
  - `src/api/results-framework-reporting/innovation-use/innovation-use.service.ts` (`buildActorData` + import only; save-matching loop untouched)
  - `src/api/results-framework-reporting/innovation-use/innovation-use.service.farmer-count-nature.spec.ts` (new)
  - `src/api/results/result-actors/repositories/result-actors.repository.spec.ts` (new describe "count_unit / use_nature replication (IFC-R-8)"; the entity-driven column guard now covers both columns)
- **Verification (Implementer, from `onecgiar-pr-server/`, `--maxWorkers=2`, one run at a time):**
  - Red before code: `Tests: 27 failed, 18 passed, 45 total` (the 2 new/changed spec files)
  - Green after: `Test Suites: 2 passed, 2 total / Tests: 45 passed, 45 total`
  - `--findRelatedTests` service + repository: `Test Suites: 107 passed / Tests: 2848 passed`
  - `--findRelatedTests` entity: `Test Suites: 1 failed, 261 passed / Tests: 1 failed, 4909 passed`. The failure is `src/api/qa-catalog/qa-catalog.completeness.spec.ts`, which reports `uncatalogued column result_actors.count_unit` and `result_actors.use_nature` (Leader re-ran it: only these 2 columns).
  - `npx eslint <7 files> --quiet`: exit 0
- **Reviewer verdicts:** both `STATUS: PASS`.
  - Lens A: every replicate path lists both columns in matching positions (20 columns, 4 bind params unchanged); `down` correct; whitelist matches IFC-R-7/DD-3; no reader/sum touched (R-10); tests red-able on the behaviour.
  - Lens B: within the design §4 file list; no bilateral payload change (bilateral paths pick named fields: `bilateral.service.ts` ~L2679/L2876, `bilateral-quality-payload.builder.ts:171`), so no change-log row is needed; migration naming/timestamp follow convention and SQL matches the entity.
- **ADVISORY (4R, non-gating):**
  - RELIABILITY: the existing-row save passes the whole `actorPayload` to `update`, so a caller that omits the keys overwrites stored answers with NULL. **→ T-4 brief must make the client always send both fields on every actor row, with the exact lowercase codes.**
  - RESILIENCE: the whitelist is not restricted to Farmers, so a non-Farmers row could store a valid code (harmless; readers ignore it and the SQL rule is Farmers-scoped). T-3/T-6 must not assume non-Farmers rows are NULL.
  - RESILIENCE: exact-case match, so `'Households'` → NULL silently (as IFC-R-7 asks).
  - RISK: two separate `ALTER TABLE result_actors` statements. On MySQL 5.7 or a non-instant algorithm each one rebuilds the table, and one combined statement would halve the lock time. Santiago should check the prdb version before running. A manual DBeaver run twice fails on a duplicate column (fails safe).
  - READABILITY: the replicable spec reads SQL by call position; the entity types are `string | null` instead of the exported code types. Optional.
- **Forward pointers:**
  - **→ IFC-T-6:** make `qa-catalog.completeness.spec.ts` green by binding `result_actors.count_unit` / `use_nature` (IFC-R-9). T-2 must not be committed or pushed without T-6 (PR 1 = T-2 + T-3 + T-6).
  - **→ IFC-T-4:** always send both fields on each actor row, with exact lowercase codes (see the RELIABILITY advisory).
- **Requirements covered:** IFC-R-7, IFC-R-8 (replication half), IFC-R-10.
- **Decisions:** the completeness-spec failure was adjudicated as T-6 scope, not a T-2 FAIL (narrow-never-widen). The Reviewers got a frozen diff file in the scratchpad instead of the diff inline; it is the same ephemeral content and saved pasting 400 lines twice.
- **Issues:** none beyond the above. Nothing staged or committed.

### IFC-T-5 — Green-check function: Farmers rule in both actor blocks (HITL apply) — in progress

#### Attempt 1 (2026-11-03) — FAIL
- **Implementer:** `akili-implementer`, effort high, no stack skill (pure MySQL). It ran in parallel with IFC-T-6 because it runs no tests. **Files:** `sql/validation_innovation_use_P25.after.sql` (DROP + DELIMITER + CREATE, DEFINER kept), `sql/validation_innovation_use_P25.after.body-only.sql`, `sql/checks.sql`. Body diff: 4 insert hunks, 0 body deletions (a `result_source` DECLARE, a separate `SELECT r.source INTO result_source`, and the Farmers EXISTS check inside the section 1 and section 2 actor blocks, gated by `COALESCE(result_phase_year,0) >= 2026 AND COALESCE(result_source,'') <> 'API'` with `IS NULL OR NOT IN`). Nothing run (no DB).
- **Reviewer A** (conformance + reliability/resilience) — `STATUS: FAIL`. It confirmed that the function change conforms to IFC-R-6: no early RETURN is gated on phase < 2026, section 2 parity holds, and `SourceEnum.Bilateral = 'API'`. Issues:
  1. checks.sql STEP 1 `SELECT id, name FROM actor_type WHERE id = 1;` uses a column that does not exist (PK is `actor_type_id`, actor-type.entity.ts:8). Violated: tasks.md IFC-T-5 / design §12 IFC-RK-3. Remediation: `SELECT actor_type_id, name FROM actor_type WHERE actor_type_id = 1;`.
  2. STEP 2 category D (and STEP 4) does not exclude Farmers rows in a "to be determined" block. The function correctly skips those, so a D id would still return 1, which triggers the falsifier on a correct apply. Violated: IFC-T-5 falsifier; IFC-R-6 scenario. Remediation: join `results_innovations_use riu` and require `(ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined,0) = 0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined,0) = 0)` in D, STEP 4 (and C), plus a header note.
  - ADVISORY: `farmer_rows_incomplete` counts only NULLs and should use the function's predicate; the STEP 3 CASE should use explicit `>= 2026` with an ELSE; the body-only file should ship already stripped.
- **Reviewer B** (conformance + readability/risk) — `STATUS: FAIL`. Issues:
  1. Category C/D ids are picked by their current answered state, so the before and after runs pick different ids, and no query re-evaluates the before ids. Violated: tasks.md IFC-T-5 Description/Falsifier; design §12 IFC-RK-3. Remediation: add a "Step 2b — AFTER run" query over `r.id IN (/* ids from BEFORE run */)` with the live incomplete count; fix the header's "same ids" claim; note that C may be empty in the prod before run, and that in test one id must be answered between runs.
  2. The body-only file keeps `BEGIN`…`END`, which contradicts the user's DBeaver routine-editor rule (inner statements only; a pasted BEGIN/END gave SQL Error 1064). Remediation: strip BEGIN/END and fix the header.
  - ADVISORY: a DROP followed by a failing CREATE (non-prmsadmin applier without SET_USER_ID) leaves the function missing, so check `CURRENT_USER()` in test first; the rollback is not runnable from before.sql as written, so add a rollback recipe to the after.sql header (before.sql itself stays untouched); STEP 3 is indicative only and should run off-peak; the falsifier list lacks C; NULL phase years fall into the 2026 bucket in STEP 3.
- **Leader adjudication:** all 4 issues are in scope (checks.sql and body-only are T-5 deliverables). Reading recorded per Reviewer A: IFC-R-6's "any active Farmers row of either block" means a block in play. The skip when a block is "to be determined" is intended, because the client hides that block and today's actor checks skip it too. Rework with effort bumped to xhigh.

### IFC-T-3 — Save matching: Farmers rows de-dup on (type, unit, nature) — [~] stopped at disqualifier

#### Attempt 1 (2026-11-03) — STOPPED (disqualifier, not a FAIL; no attempt consumed)
- **Implementer:** `akili-implementer`, effort medium, skills `nestjs-expert` + `tdd`. No code written; the tree is unchanged.
- **Disqualifier tripped:** `saveInnovationUse` has a second caller, `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use.handler.ts:125` (`afterCreate`), besides the v2 controller (`innovation-use.controller.ts:30`). `prepareActors` spreads each payload actor (`{ ...actor, actor_type_id }`, no `result_actors_id`). It runs once, on a new result. Today two same-type actors in one bilateral payload merge through the type-only lookup.
- **Implementer impact analysis (untested):** the bilateral DTO has no `count_unit`/`use_nature` (0 grep matches in `src/api/bilateral`). Both values therefore become NULL, `IsNull()` matches, and bilateral merges as today. The one gap: `forbidNonWhitelisted` is false and the actor is spread, so a bilateral caller that sends extra keys could make two Farmers rows insert separately instead of merging. The same gap means T-2's `buildActorData` would store codes on a bilateral row.
- **Planned change (ready):** in the lookup `else` branch after `whereOptions.actor_type_id = el.actor_type_id;`: `if (Number(el.actor_type_id) === FARMERS_ACTOR_TYPE_ID) { whereOptions.count_unit = toCountUnit(el?.count_unit) ?? IsNull(); whereOptions.use_nature = toUseNature(el?.use_nature) ?? IsNull(); }`
- **Status:** waiting for the user's decision (tasks.md disqualifier: "stop and re-specify").

#### IFC-T-3 — user decision (2026-11-03)
- Santiago chose **"Guard bilateral"**: go ahead with the Farmers lookup and, in the bilateral handler's `prepareActors`, force `count_unit` / `use_nature` to null so bilateral behaves exactly as today. **Spec edit:** the T-3 Files and Description in `tasks.md` now include `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use.handler.ts` plus a test case. This edit goes into the T-3 Reviewer brief as a named conformance check. Bilateral payload contract: there is no payload shape change (the input is ignored), so no change-log row is needed in `bilateral-result-summaries.en.md`. The Reviewer must confirm that.

### IFC-T-5 — attempt 2 (2026-11-03) — PASS (authoring; HITL apply owed)
- **Implementer (rework, effort xhigh):**
  - Files: checks.sql regenerated, BEGIN/END removed from body-only, after.sql header comments only (4 function hunks unchanged).
  - STEP 1 now uses `actor_type_id`.
  - The TBD active-block predicate `EXISTS (SELECT 1 FROM results_innovations_use riu WHERE riu.results_id = r.id AND riu.is_active = 1 AND ((ra.section_id = 1 AND COALESCE(riu.innov_use_to_be_determined,0)=0) OR (ra.section_id = 2 AND COALESCE(riu.innov_use_2030_to_be_determined,0)=0)))` applies in C/D, the counts, 2b and Step 4.
  - The incomplete predicate matches the function.
  - New STEP 2b re-evaluates the pasted BEFORE ids (`WHERE r.id IN (0 /* paste */)`).
  - The header says A/B ids are stable and C/D/E ids are not, notes that C is likely empty in the prod BEFORE run, and gives the test recipe (one D id unanswered, one answered between runs).
  - Step 3 is indicative only, off-peak, with an explicit CASE.
  - C is added to the falsifier list.
  - after.sql header: CURRENT_USER() pre-flight and a rollback recipe.
- **Reviewer A** (conformance + reliability/resilience): `STATUS: PASS`.
  - Function = before + 4 insert hunks (checks at l.234-254 / l.422-442).
  - The riu names match the function's own lookup.
  - Excluding results with no active riu row is correct (TBD vars `DEFAULT TRUE`, before.sql l.11-12).
  - Body-only is 533 lines and identical to after.sql's inner body.
  - ADVISORY: Step 2b has no category column, so categories carry over from BEFORE. Duplicate active riu rows make the function's SELECT INTO fail (pre-existing behaviour).
- **Reviewer B** (conformance + readability/risk): `STATUS: PASS`.
  - Step 2b fixes the id drift, and the `IN (0)` placeholder cannot fake a pass.
  - The body-only header is unambiguous and matches the DBeaver rule.
  - The rollback recipe is runnable by hand.
  - ADVISORY: pin the rollback range to "before.sql lines 3–484, then append `$$`". Optional category CASE in 2b.
- **Requirements covered:** IFC-R-6 (server half, both blocks). 2025 and bilateral results stay unchanged by construction, because the gate only adds a RETURN FALSE.
- **HITL owed (Santiago):** apply in test, then record the before/after table here; prod at deploy. Prerequisite: the T-2 migration is applied in that environment. Steps in test:
  1. CURRENT_USER pre-flight.
  2. Step 0 disqualifier diff.
  3. BEFORE run of checks.sql, Steps 1–4.
  4. Apply the function.
  5. AFTER run with Step 2b.
- **Decision recorded:** IFC-R-6's "any active Farmers row of either block" is read as a block in play, so TBD blocks are skipped on purpose.

### IFC-T-6 — QA catalog: two subfields per block, closed lists, revision 33

#### Attempt 1 (2026-11-03) — FAIL
- **Implementer:** `akili-implementer`, effort medium, skill `nestjs-expert`. Files:
  - `definitions/sections/innovation-use.ts`: `count_unit` / `use_nature` single_select subfields in both actor lists, with `visible_when`/`required_when` = `whenEq('actor_type', FARMERS_ACTOR_TYPE_ID)`, inheriting FROM_2026.
  - `definitions/closed-control-lists.ts`: a new `CLOSED_CODE_LISTS` export, spread from the server constants. `CLOSED_CONTROL_LISTS` is `number[]`, and widening it broke the shape.spec compile.
  - `definitions/versions.ts`: 32 → 33.
  - `docs/qa-catalog.en.md`: counts updated and a v1.29 row added.
  - Snapshot regenerated: revision, hash and 4 new keys only.
  - Revision literals bumped in `qa-catalog.controller.spec.ts`, `qa-catalog.service.spec.ts` and `qa-catalog.shape.spec.ts`. These files are outside the declared list, but the bump forced the change; the Reviewer accepted it.
- **Verification:**
  - `npx jest --maxWorkers=2 src/api/qa-catalog` → 42 suites / 911 tests passed.
  - The completeness spec is green, which closes the T-2 forward pointer. Golden-bindings is green with no mapper change.
  - The scoped red run was not re-run in its exact scope after the fixes.
  - eslint clean.
- **Reviewer** (`akili-reviewer`, lens checklist) — `STATUS: FAIL`:
  1. **The v1.28 change-log row was rewritten.**
     - Discovered Issue: the v1.28 (2026-10-31) row in `onecgiar-pr-server/docs/qa-catalog.en.md` now says "2026.33" instead of "catalog_version 2026.32", which contradicts its own text "Revision 32 is the merged content of both". It looks like a global replace.
     - Violated: tasks.md IFC-T-6 ("row in `docs/qa-catalog.en.md`": add, don't rewrite). The change log is append-only.
     - Remediation: restore the v1.28 row verbatim. Keep the v1.29 row and the example bumps on lines 40 and 428.
  2. **Nothing guards the "fifth code" falsifier.**
     - Discovered Issue: nothing reads or asserts `CLOSED_CODE_LISTS`, no tests were written, and `qa-catalog.innovation-use.spec.ts` has nothing for the new subfields.
     - Violated: tasks.md IFC-T-6 Falsifier; IFC-R-9.
     - Remediation: add exact-equality tests for both lists. For both blocks, assert each new subfield's type, `control_list`, `required: false`, and `required_when`/`visible_when` = `{field:'actor_type',operator:'eq',value:1}`. Re-run the exact scoped red run.
  - ADVISORY:
    - Add a JSDoc on `CLOSED_CODE_LISTS` saying it is declarative only, because a row filter on result_actors would drop rows.
    - The catalog labels were chosen by the Implementer; align them with the T-4 client copy.
    - The out-of-list spec literal bumps are accepted.
  - Answers: the hand-updated counts check out (253 / 74). `whenEq('actor_type', 1)` is numeric and correct (the sibling `other_actor_type` uses 5).
- **Leader adjudication:** both issues are in scope. Rework at effort high; the feedback was sent verbatim.

#### IFC-T-6 attempt 2 (2026-11-03) — PASS
- **Implementer (rework, effort high):**
  - `docs/qa-catalog.en.md`: the v1.28 row is restored to "catalog_version 2026.32" by an exact-string edit. The v1.29 row and the L40/L428 example bumps are kept.
  - `qa-catalog.innovation-use.spec.ts`: new describe "IFC-R-9 Farmers follow-up subfields".
    - Exact `toEqual` on both `CLOSED_CODE_LISTS` lists, against literals.
    - `it.each` over both blocks, checking each subfield's type `single_select`, `control_list`, `required: false`, `required_when`/`visible_when` = `{field:'actor_type',operator:'eq',value:1}`, and column storage in `result_actors`.
    - The actors list has valid_from 2026 and valid_to null.
  - JSDoc on `CLOSED_CODE_LISTS` saying it is declarative only.
- **Verification:**
  - **Red (mutation):** `'fifth_code'` temporarily added to `USE_NATURE_CODES` → `Tests: 1 failed, 170 passed, 171 total` (fails the "no fifth code" assertion). Restored; the Leader confirmed the constant holds the 2 codes.
  - **Green:** `npx jest --maxWorkers=2 src/api/qa-catalog/qa-catalog.innovation-use.spec.ts src/api/qa-catalog/qa-catalog.shape.spec.ts src/api/qa-catalog/qa-results.golden-bindings.spec.ts src/api/qa-catalog/qa-catalog.snapshot.spec.ts src/api/qa-catalog/qa-catalog.completeness.spec.ts` → `Test Suites: 5 passed / Tests: 171 passed`.
  - eslint: clean.
- **Reviewer** (same reviewer, re-review) — `STATUS: PASS`. Both issues are closed. Every IFC-R-9 clause is guarded: the `get`/`sub` helpers throw on a missing key, the exact list equality catches a fifth code, shape.spec fails if the revision is still 32, and the snapshot diff is limited to the revision, hash and 4 keys. No regression. ADVISORY: none.
- **Requirements covered:** IFC-R-9 (all clauses). This also closes the T-2 forward pointer: `qa-catalog.completeness.spec.ts` is green.
- **Decisions:**
  - The code lists live in a separate `CLOSED_CODE_LISTS` export, because widening `CLOSED_CONTROL_LISTS` breaks a numeric line in shape.spec and a row filter would drop result_actors rows.
  - The catalog labels "Unit of the reported numbers" / "Nature of the innovation use number" were chosen by the Implementer. → **Forward pointer to IFC-T-4/T-7:** check them against the client copy.
  - The out-of-list revision-literal bumps in `qa-catalog.controller.spec.ts`, `qa-catalog.service.spec.ts` and `qa-catalog.shape.spec.ts` are accepted (forced by the bump).

#### IFC-T-3 attempt 1, continued after the user decision (2026-11-03) — PASS
- **Implementer:** the same agent continued the attempt (the earlier stop was the disqualifier, not a FAIL). Files:
  - `onecgiar-pr-server/src/api/results-framework-reporting/innovation-use/innovation-use.service.ts`: Farmers lookup branch, plus `FARMERS_ACTOR_TYPE_ID` in the import.
  - `.../innovation-use/innovation-use.service.farmer-follow-up.spec.ts`: new, 5 tests.
  - `onecgiar-pr-server/src/api/bilateral/handlers/innovation-use.handler.ts`: `prepareActors` pushes `{ ...actor, actor_type_id, count_unit: null, use_nature: null }`.
  - `.../bilateral/handlers/innovation-use.handler.spec.ts`: one new test.
- **Lookup:** `if (Number(el.actor_type_id) === FARMERS_ACTOR_TYPE_ID) { whereOptions.count_unit = toCountUnit(el?.count_unit) ?? IsNull(); whereOptions.use_nature = toUseNature(el?.use_nature) ?? IsNull(); }`
- **Verification (`--maxWorkers=2`, one run at a time):**
  - Red before the code: `Tests: 1 failed, 4 passed`. The case "different answers -> insert" failed with `expect(update).not.toHaveBeenCalled() ... Received number of calls: 1`.
  - Green: `Test Suites: 1 passed; Tests: 5 passed`.
  - `--findRelatedTests` on the service and the handler: `Test Suites: 81 passed; Tests: 2453 passed`.
  - eslint on the 4 files: exit 0.
- **Reviewer** (`akili-reviewer`, lens checklist) — `STATUS: PASS`:
  - The actor loop is `saveAnticipatedInnoUser` (:453-515), which `saveInnovationUse` calls for CURRENT and FUTURE.
  - The Farmers branch (:493-496) applies only to id-less rows.
  - The red run failed on the falsifier itself.
  - The lookup and `buildActorData` share the whitelist, so what is matched equals what is stored.
  - Old clients send no codes → `IsNull` → merge.
  - `section_id` is in the where clause, so rows never match across sections.
  - **Named check (amendment):** the bilateral guard holds. There is no payload shape change, and `bilateral-result-summaries.en.md` needs no row. Confirmed.
- **ADVISORY:**
  - RISK: `saveAnticipatedInnoUser` has two more callers that the Implementer did not list:
    - `results-framework-reporting/innovation_dev/innovation_dev.service.ts:229` (section null)
    - `results/results.service.ts:5434` (review update, CURRENT)

    Both are harmless today, because they carry no codes and so merge through `IsNull`. **The IFC-R-10 non-impact claim therefore rests on four callers:** the v2 controller, bilateral `afterCreate` (guarded), innovation_dev, and the review update.
  - RELIABILITY: on the review-update path, a code-less Farmers row without an id on a 2026 result that already has an answered Farmers row inserts a new NULL row. This is consistent with DD-8. **→ Forward pointer to IFC-T-7:** add one line about it to `innovation-use/CLAUDE.md`.
- **Requirements covered:** IFC-R-4 (server half), DD-8, IFC-R-1 out-of-scope and IFC-R-10 for bilateral.
- **Decisions:** the bilateral guard, per Santiago's choice.

### IFC-T-4 — Client: follow-up block, gate, duplicates, Households coupling

#### Attempt 1 (2026-11-03) — PASS
- **Implementer:** `akili-implementer`, effort high, skills `angular-developer` + `spartan`. **Files** (client, under `onecgiar-pr-client/src/app/`):
  - `shared/components/innovation-use-form/farmer-follow-up.ts` (new)
  - `shared/components/innovation-use-form/innovation-use-form.component.{ts,html,spec.ts}`
  - `shared/components/innovation-use-form/CLAUDE.md` (now 177 lines; it was already over the 120-line cap, at 148)
  - **Outside the declared list (execute-time amendment, recorded below):** `pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component.{ts,spec.ts}` + its `CLAUDE.md`. These carry out the T-2 forward pointer: `saveSectionWith` sends a payload copy with `count_unit ?? null` / `use_nature ?? null` on every row of both blocks, the bound rows are not mutated, and the 2030 block is mapped only when `actors` is an array.
  - Also outside the declared list: the `Actor` models in `pages/ipsr/.../step-n1/model/Ipsr-step-1-body.model.ts` and `pages/results/.../innovation-dev-info/model/innovationDevInfoBody.ts` gained `count_unit?` / `use_nature?: string | null`. This is type-only and avoids TS2339.
- **Disqualifier:** not triggered. `source_name` and `phase_year` come from the same `getResultById` SELECT (`result.repository.ts:1591/1593`); the Reviewer verified it.
- **Radio primitive decision:**
  - `app-pr-radio-button` cannot render option descriptions.
  - Spartan `radio-group` is not installed under `src/app/spartan/`. Installing it touches shared infra (helm files, tsconfig path, jest moduleNameMapper, brain mocks), which is out of scope.
  - So Q-a uses `app-pr-radio-button`. Q-b uses `app-pr-radio-button [hideOptions]="true"` for the card, the REQUIRED pill and `.pr-field.mandatory`, plus native radios with the `pr-native-radio` class, each with a bold label and a grey description.
  - Deviation from the user's "use Spartan" rule: forced by the missing primitive. A Spartan radio-group install would be a separate infra task.
- **Copy (verbatim from `mockup/farmer-follow-up-questions.png`; Reviewer A compared it character by character):**
  - Title: "Follow-up questions for actor type Farmers/(agro)pastoralists/herders/fishers"
  - Q-a: "Do the reported numbers refer to households or individual actors?" ("Households" / "Individual actors")
  - Q-b: "What best characterises the nature of this innovation use number?" ("Actors who received information, advice or inputs" + description; "Actors who applied the innovation" + description)
  - Helper (italic): "If your numbers include both groups, add the actor type a second time and report each group separately. Receiving and applying are not the same as benefiting; benefit is reported as impact evidence."
  - The developer note is not rendered (asserted in a spec).
- **Verification:**
  - **Red:** `npx jest --no-coverage --maxWorkers=2 .../innovation-use-form.component.spec.ts -t "Farmers follow-up"` → `Tests: 20 failed, 146 skipped, 23 passed, 189 total`. The "NOT visible" cases passed before the implementation; each is paired with a positive render case.
  - **Green:** form spec `189 passed`.
  - **Related:** `--findRelatedTests` on the form, innovation-use-info and IPSR step-n1 → `Test Suites: 25 passed; Tests: 1044 passed`.
  - **Lint:** `ng lint --quiet --lint-file-patterns` on the 6 changed files → "All files pass linting". `npx eslint` fails here with "couldn't find eslint.config" (the client uses `.eslintrc.json`).
  - **Build:** `npm run build` → exit 0 (only pre-existing NG8112/NG8113/pdfjs warnings).
  - **Env note:** `npm run test:local` exits 1 with no output on Windows. `scripts/run-jest-local.js` calls `spawnSync('npx')` without a shell, so `npx jest --maxWorkers=2` was used directly. → Kaizen candidate.
- **Reviewer A** (conformance + copy + readability/reliability) — `STATUS: PASS`.
  - Every copy string matches the PNG.
  - Each of IFC-R-1..R-6 (client half) is satisfied.
  - Every falsifier has a case in both blocks.
  - Only token colours and explicit px sizes are used.
  - The Households judgment call (no `cleanActor` when the row is already on a single total) conforms to the R-5 scenario and RK-5, and is pinned by a spec.
- **Reviewer B** (conformance + resilience/risk) — `STATUS: PASS`.
  - The gate is verified.
  - No IPSR leakage: the null keys are added only when `!isIpsr`, and the 2030 wrapper renders only when `!isIpsr`.
  - The model edits are type-only (`useDefineForClassFields: false`).
  - The scope extension is (a) justified by IFC-R-4 "through save and reload" plus the T-2 forward pointer, and (b) safe: the payload is a copy with `?? null`, IPSR and innovation-dev send no codes, and bilateral is already guarded.
  - Accessibility: the native radios have a wrapping `<label>`, `role="radiogroup"` with an `aria-label`, and a per-row unique `name`, so rows and blocks cannot cross-select and keyboard works.
  - Mandatory feedback still lists an unanswered Q-b (IFC-R-6 client half).
- **ADVISORY (non-gating):**
  - RELIABILITY: Households on an already-single-total row leaves stale women/men/youth values if a row is inconsistent. Possible improvement: null only the gender/youth fields there.
  - RESILIENCE: deselecting Households by re-clicking leaves `sex_and_age_disaggregation = true`, so the checkbox reappears ticked. Possible improvement: `onCountUnitChange(null)` restores the grid. → T-7 manual check.
  - RELIABILITY: Farmers (Households) → another type runs `cleanActor`, which also wipes `how_many`. → Note in the folder CLAUDE.md.
  - READABILITY: `farmerCountUnit` is exposed but unused in the template. The copy lives in a TS constant rather than i18n, which is acceptable; a one-line note would help.
  - RELIABILITY: two Q-b controls (the hidden pr-radio-button and the native radiogroup) stay in sync only through `[ngModel]`, and no spec proves that `complete` flips. → Gap for T-7/CT.
  - RISK: the gate trusts `currentResultSignal` to carry `source_name`. → T-7 smoke on a 2026 bilateral result. Q-a "one line" layout → T-7 visual check.
- **Forward pointers → IFC-T-7:**
  - Visual check of Q-a on one line, Q-b card/pill, native radio look and description wrapping vs the mock-up.
  - Households deselect behaviour.
  - Smoke on a 2026 bilateral result.
  - Catalog vs UI labels: T-6 uses "Unit of the reported numbers" / "Nature of the innovation use number"; the UI uses the mock-up questions. Decide whether to align.
- **Not done (Implementer, recorded):** `projection2030Signature` does not include the new answers, so a change of answers alone does not require the 2030 justification text. This was not asked for in the spec; left as is.
- **Requirements covered:** IFC-R-1, R-2, R-3, R-4 (client half), R-5, R-6 (client half), RK-4.

### IFC-T-2 / IFC-T-5 — HITL run in TEST (2026-11-03, Santiago)
- **T-2 migration:** `migration:run` → `migration:revert` → `migration:run` all succeeded; `migration:check` → Pending: 0; `SHOW COLUMNS` shows `count_unit` / `use_nature` `varchar(32)` NULL.
- **T-5 B1:** `CURRENT_USER()` = `prdbusertst@%`, which is the test DEFINER.
- **T-5 Step 0:** the test live body was diffed with `diff -w` against `before.sql`. **It is identical except the DEFINER** (`prdbusertst` in test vs `prmsadmin` in prod), so the disqualifier is not triggered. Because of that, the test apply uses the DBeaver Function Editor with the body-only file, which keeps the existing DEFINER; `after.sql` hard-codes `prmsadmin` and is for prod only.
- **Step 1:** `1 = Farmers/ (agro)pastoralist/ herders/ fishers` ✅
- **Step 2 BEFORE** (fn: 1 = green, 0 = red):

| cat | result_id | farmer rows (active) | incomplete | before | expected after |
|---|---|---|---|---|---|
| A 2025 | 8582 | 1 | 1 | 0 | 0 |
| A 2025 | 8616 | 2 | 2 | 0 | 0 |
| A 2025 | 8617 | 1 | 1 | 0 | 0 |
| A 2025 | 8658 | 1 | 1 | 0 | 0 |
| A 2025 | 8732 | 1 | 1 | 0 | 0 |
| B bilateral | 11064 | 1 | 1 | 1 | 1 |
| B bilateral | 11193 | 1 | 1 | 0 | 0 |
| B bilateral | 11323 | 1 | 1 | 1 | 1 |
| B bilateral | 11351 | 1 | 1 | 0 | 0 |
| B bilateral | 11382 | 1 | 1 | 0 | 0 |
| C | — (empty, as expected) | | | | |
| D | 11026 | 1 | 1 | 1 | **0** |
| D | 11357 | 1 | 1 | 0 | 0 |
| D | 11619 | 1 | 1 | 1 | **0** |
| E | 11012 / 11049 / 11077 / 11121 / 11126 | 0 | 0 | 0 | 0 |

- **Step 4 BEFORE:** section 1 → 1 result / 1 row; section 2 → 2 results / 2 rows (test).
- Note: A ids are all 0 before, so the 2025 non-regression is proved on red results only. The B ids 11064 / 11323 (green) are the strong bilateral non-regression cases.
- **Apply attempt 1 (DBeaver Function Editor, body-only):** not persisted. `SHOW CREATE` still returned the old body and 11026/11619 stayed 1. Nothing broke. Lesson: in test, verify the apply with the `information_schema` count below, not only by trusting the editor's save → kaizen candidate.
- **Apply attempt 2 (SQL Editor, `after.sql` with line 35 DEFINER changed to `prdbusertst` in the editor only, not saved; Alt+X):** OK. B7a: `count_unit IS NULL` appears **2** times in `ROUTINE_DEFINITION` (one per actor block).
- **Step 2b AFTER:** every id matches the "expected after" column above.
  - **11026 1→0** and **11619 1→0** (the D rule fires).
  - Bilateral **11064 = 1** and **11323 = 1** (unchanged), 11193/11351/11382 = 0 (unchanged).
  - A (2025), 11357 and E unchanged at 0. **Falsifier not triggered → T-5 PASS in test.**
- **Prod:** pending, at deploy. Use `after.sql` as-is (DEFINER `prmsadmin`) after the T-2 migration has run in prod, and repeat Step 0/2/2b there.

### IFC-T-7 — read-only browser pass (2026-11-03, local stack → test DB, Claude in Chrome, nothing saved)
- **8558 / id 11026** (2026 W1/W2, "Result for 2026 InnoUse", Editing):
  - The Farmers row in the 2030 block shows the follow-up block. The current block is TBD, so it is skipped.
  - Title, Q-a and Q-b copy, the two descriptions and the italic helper match `mockup/farmer-follow-up-questions.png` word for word. The developer note is not rendered ✅
  - The Innovation use info section is not green and Submit is disabled. This is consistent with fn = 0 after T-5 ✅
- **6324 / id 8582** (2025 W1/W2): Farmers row present, **no** follow-up block ✅ (IFC-R-1 out of scope 2025).
- **8596 / id 11064** (2026 bilateral, Approved): Farmers row present, **no** follow-up block; the section stays green ✅ (IFC-R-1 bilateral + T-5 non-regression).
- **Visual deltas vs mockup** (to decide):
  - V-1: the unanswered question headers render in the orange/amber "missing required" tone, while the mockup shows them green. This is likely the standard PRMS mandatory-state styling; to confirm after an answer.
  - V-2: there is an extra empty gap (~40 px) between the Q-b header and the first option. The cause is probably the hidden `app-pr-radio-button [hideOptions]` wrapper (T-4 advisory); Q-a has no such gap.
  - V-3: the Q-b descriptions wrap to 3 lines (left column width); the mockup has 2. Acceptable.
- Not yet checked: IPSR step 1, save/reload, the red→green transition, Households, and phase duplication. These need writes or extra navigation.

### IFC-T-7 — write pass on 8558 (id 11026), authorised by Santiago in chat (2026-11-03)
- **BUG found (T-4 rework, fixed):** the first answer "Individual actors" on a Farmers row that the reporter had put on a single total (ticked "does not apply", `how_many = 88`) unticked the box and wiped `how_many`, through `cleanActor`. Nothing was saved: the page was reloaded and the changes discarded.
  - Cause: `onCountUnitChange` restored the grid on any Individuals answer when `sex_and_age_disaggregation` was true. IFC-R-5 only says "choosing Individuals **again**", i.e. after Households.
  - Fix: `innovation-use-form.component.ts`, which now restores the grid only when `previous === households`.
  - Red: 2 new specs ("T-7 finding") failed with `Expected 88 / Received null`. Green: form spec 193/193; `--findRelatedTests` 24 suites / 1022 tests passed. Folder CLAUDE.md updated and re-stamped.
- **After the fix, in the browser:**
  - Individuals keeps 88 and the tick ✅
  - Q-b "Actors who applied" selects ✅ The first attempt's failed click was a stale ref after the row re-rendered, not a code issue.
  - Save draft → "Section saved successfully" → **Innovation use info turns green, 5 of 5, Submit enabled** (red → green, IFC-R-6 + T-5 end to end) ✅
  - Reload → both answers persist and `how_many = 88` is kept ✅ (IFC-R-4 save/reload)
  - The question headers turn green once answered, so V-1 is closed: the orange tone is only the unanswered mandatory state.
  - Households hides the tick and keeps the single total 88; saved, still green ✅
  - Re-clicking Households deselects it: the row shows the tick + 88 again, the bottom bar says "1 field missing", nothing is lost ✅ (T-4 advisory, acceptable).
  - Final saved state of 8558: Farmers row (2030 block) = individuals / innovation_applied / how_many 88, section green.
- **Still open in T-7:**
  - V-2: the ~40 px gap under the Q-b header (hidden `app-pr-radio-button`) is still present.
  - Not exercised in the browser: Individuals-after-Households restoring the grid (unit-tested only, to avoid wiping 88 again); IPSR step 1; phase duplication keeping the answers.
  - Optional: re-run checks.sql Step 2b for 11026 (expect 1 now).

### Ship status (2026-11-03)
- qa-dev: 9e7354d4d (server) + 123c068a5 (client, includes the T-7 Individuals fix), pushed.
- performance-refactor: merge 3b30d1f32 (session onecgiar-pr-41).
  - Conflict `qa-catalog.en.md`: our row became v1.31, revision 2026.33.
  - Tests on the merged tree: server 289 suites, client 454 suites green; `nest build` OK.
  - PRTest deploy pending (~30 min).
- **Ship note:** real result **34582** (ENABEL, Marc Schut, Editing) turns red with the new function (unanswered Farmers row). Tell users at release.
- Open: T-7 (V-2 gap, IPSR step 1, phase duplication, catalog vs UI labels, innovation-use server CLAUDE.md line); prod migration + `after.sql` at deploy; this execution.md and the form CLAUDE.md re-stamp are still uncommitted on qa-dev.
- **V-2 fixed (2026-11-03):** the Q-b radiogroup has `-mt-[27px]`. Header→options is now 10px on both questions, measured in the browser; it was 41px vs 10px. `--findRelatedTests` 24/1022 green; `ng lint` on the template passes.

### IFC-T-7 — PRTest pass (2026-11-03, session onecgiar-pr-41, perf 3b30d1f32, Claude in Chrome; writes on test result #8558 approved by Santiago)
- PASS: the existing Farmers row (2030 block) renders the follow-up block under the Actor type, with the copy as in the mock-up, and reloads with Individual actors / received. Researchers and Extension agents rows show no block.
- PASS IFC-R-4: Add actor → the select keeps Farmers enabled and disables Researchers and Extension agents (already used). Second Farmers row = Households / applied / How many 50; after save + reload, both Farmers rows survive with their own answers (first keeps its grid, total 468).
- PASS IFC-R-5: Households replaces the grid with a single "How many" and hides the "does not apply" tick.
  - **Finding F-1 (open):** before the first save, the new row's "How many" did not show REQUIRED and the counter did not count it; after saving it does. **Sized → pre-existing, not a regression:** every field of an unsaved actor row (Actor type, Women, Men, How many) binds `[required]="!!actorItem?.result_actors_id"` (since 7a5519f7b, Angular 19 upgrade), so new rows only become mandatory after their first save. Out of scope for P2-4048.
- PASS IFC-R-6 (server): unit cleared by re-click + save → sidebar not green, "4 of 5"; Households re-selected + save → green, 5 of 5.
- CONFIRMED T-4 advisory: deselecting Households brings the "does not apply" tick back already ticked and the grid does not return. Acceptable (no data lost, the reporter can untick), documented.
- Left in place on #8558: the second Farmers row (Households / applied / 50) as evidence.
- Covered elsewhere: 2025 / bilateral no-block was checked locally by onecgiar-pr-02 (6324 and 8596). Not run: IPSR step 1 (jsdom falsifier specs only), phase duplication, Santiago visual approval.
