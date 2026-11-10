# Execution — QA value labels (`quality-assurance/qa-value-labels`)

## Document Control

| Field | Value |
|---|---|
| Spec | `quality-assurance/qa-value-labels` (requirements QVL-R-1..11, design DD-1..6, tasks QVL-T-1..7) |
| Approval Mode | gated (from `requirements.md` Document Control) |
| Branch | `JuanGuzman-io/p2-3910-qa-value-labels` (base `34eb4b8f0`, on top of `origin/performance-refactor` `4cf7bc01f`) |
| Leader | Claude Code session, `opus` (T1) |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` (T2 `sonnet`) / `.claude/agents/akili-reviewer.md` (T3 `opus`). Author ≠ auditor held by the wrappers |
| Persona check | `akili doctor --agents` on 2026-11-09: no persona drift blocking CI |
| Started | 2026-11-09 |

## Task Execution History

### Leader note: QVL-T-1 blocked on pre-flight (2026-11-09)

- **Assumption the deferral rests on:** "T-1 cannot run because the test DB is not reachable from this machine."
- **Probe:** a `mysql2` connection with the local `.env` credentials (values never printed), `connectTimeout: 8000` → `FAIL ETIMEDOUT`. The blocker is confirmed: the VPN is off.
- **Owner action requested:** connect the VPN, and put the QA CLARISA key in a mode-600 scratch file (pre-flight items 1 and 2). The owner chose "VPN now + key file".
- T-3 has no dependency on T-1, so it ran meanwhile (Step 1, parallel-eligible).

### QVL-T-3 — Collector: (list, id) pairs from the projected values

- **Final status:** PASS
- **Date:** 2026-11-09
- **Implementer attempts:** 1
- **Skills / effort:** `nestjs-expert`, `tdd` (task defaults, no deviation) · effort `medium`
- **Attempt 1**
  - **Files changed:**
    - `onecgiar-pr-server/src/api/qa-catalog/values/label-collector.ts` (new). `collectLabelPairs(fields, values)` handles one result, `collectLabels(results, fields)` returns `{ perResult, union }`. It does not mutate its input.
    - `onecgiar-pr-server/src/api/qa-catalog/values/label-collector.spec.ts` (new, 8 tests over real `CATALOG_FIELDS` entries)
    - `onecgiar-pr-server/src/api/qa-catalog/values/fixtures.ts` (additive: `QVL_VALUES_A`, `QVL_VALUES_B`, +52 lines)
    - `docs/specs/quality-assurance/qa-value-labels/design.md` (§1A P-19 row → VERIFIED)
  - **Implementer verification:**
    - `npx jest src/api/qa-catalog/values/label-collector --silent --reporters=summary` → 1 suite, 8 tests passed
    - `npx jest src/api/qa-catalog/values --silent --reporters=summary --maxWorkers=2` → 12 suites, 138 tests passed
    - `npx tsc --noEmit` → clean; `npx eslint` on the 3 touched `.ts` files → clean
  - **Falsifier reds** (each mutation applied to the final code, spec run, then reverted; `cmp` against a backup confirmed each restore):
    - **M1, walk stops at depth 1:** `collectLabelPairs › walks depth 2: science program ToC results and a country with its subnational areas (D-2)` → `Expected: ["4001", "TR-A1"]` / `Received: undefined`. Also `collectLabels › each result keeps only its own ids; the union holds both (R-2 only this result, D-3)` → `Expected: ["9009"]` / `Received: undefined`.
    - **M2, collect from all fields:** `collectLabelPairs › reads only the fields returned: person-bearing lists need their field (R-6, D-3)` → `- Expected - 0 / + Received + 33`. The extra lists were `countries`, `directory_users`, `initiatives`, `policy_amount_statuses`, `projects`, `subnational_areas` and `toc_levels`.
    - **M3, `text` node through the select branch:** `collectLabelPairs › skips the text node that names a list: only the directory_user subfield is labelled (R-2 non-select)` → `+ "Free Text Name",`. Also the per-result test → `Received: ["Other Free Text"]`.
  - **Evidence re-run (Leader, inline, non-author):** `npx jest src/api/qa-catalog/values/label-collector --silent --reporters=summary` → `Tests: 8 passed, 8 total`; `npx tsc --noEmit` → no output. **VERIFIED**
  - **Reviewer verdict:** `PASS` (lens-checklist mode). Summary: the collector walks only the passed definitions at field, subfield and depth-2 levels, stringifies ids, skips the `text` node and reads its `directory_user`, and returns per-result pairs plus the union. It conforms to QVL-R-1, R-2 (4 scenarios, BUT clauses), R-6, D-2, D-3, D-7, design §2.2 steps 1 and 4, and DD-2. Scope is respected. R-6 holds by construction: the only catalog nodes naming `users` / `directory_users` are `general-information.ts:151, 263, 279`, and 263 is the skipped text node. Fixtures are not inert per the Disqualifier.
  - **runtime events:** none
- **continuations:** none
- **spawns:** implementer 17 calls, 128 706 tokens, ended partial (Not Done / Assumptions with no owed item); reviewer 15 calls, 66 354 tokens, ended complete
- **Not Done / Assumptions (Implementer, verbatim):**
  - "M2 is made concrete as a definitions-set mutation. With `values` as the only data source, a field that was not returned carries no data, so 'collect from all fields' cannot differ unless `values` holds a key with no definition in `fields`. The fixture does this: `fields` is `[policy_type]` while `values` also holds `amount_status`, `created_by` and others. The contract is 'the passed definitions define what is returned'. T-5 must pass the returned fields (`toRead`)."
  - "M1 does not break the geo ids. In the real catalog `geo.countries[].country` and `[].subnational` sit one level under a `list` field, so the mutation only breaks the `science_programs` → `toc_entries` → `toc_level`/`toc_result` ids. The `geo.countries[].subnational[]` ids stay green under M1."
  - "P-19 residual: the driver returning a string for the `text` column `status_amount` is inferred from the column type, not queried against a live DB. The collector gives the same key either way. This is noted in the P-19 row."
  - Leader adjudication: none of these names an owed item or a blocker, so no continuation was sent. The M1 falsifier counts as observed: the named test asserts both the ToC and the geo ids in one `it`, and it went red (the Reviewer confirmed this).
- **ADVISORY (4R, Reviewer; recorded only, never gates):**
  - Readability (spec wording): QVL-R-2 and the T-3 M1 falsifier call `geo.countries[].country` / `subnational[]` "depth-2". In the catalog they are depth 1 (`geographic-location.ts:139-172, 245-264`). The real depth-2 case is `science_programs → toc_entries → toc_result` (`contributors-partners.ts:212, 658`). Fix the wording at archive.
  - Reliability: the R-2 clause "the same id used by two fields appears once" is guaranteed by the `Set`, but no test checks it within one result.
  - Risk (handoff to T-5): M2 only proves anything if T-5 passes the returned fields (filtered by `field_keys` and applicability), not all of `CATALOG_FIELDS`. **Forward pointer to QVL-T-5's brief.**
  - P-19: one remaining unverified assumption (the driver returns a string). It does not matter in practice, because `2` and `"2"` key the same.
- **Requirements covered:** QVL-R-1 (string keys), QVL-R-2 (all four scenarios), QVL-R-6 (collector side), D-2, D-3, D-7; design P-19 settled
- **Decisions made:** P-19 → VERIFIED (`"2"` stays a string through `typeScalar` and `project`), recorded in `design.md` §1A by the Implementer, as the DoD requires. No other spec edit.
- **Issues encountered:** none
- **Budget running totals (design §13):** tasks 1 / 7 · LOC ≈ 275 (223 new + 52 fixtures) / ~1 400 · review rounds 1 / ~10. Within budget.
- **Final verification:** green (re-run VERIFIED, Reviewer PASS)

### Forward pointers

| To task | Pointer | Source |
|---|---|---|
| QVL-T-5 | Call `collectLabels(results, toRead)` after projection. `toRead` must be the **returned** field definitions (`field_keys` and applicability applied), never `CATALOG_FIELDS`. Otherwise R-2 and R-6 break silently | T-3 Implementer note and Reviewer ADVISORY |

### QVL-T-1 evidence (Implementer, test DB + prtest)

Status: premises verified or refuted on the test DB below. **Prod is owed by the owner** (query set: `t1-prod-queries.sql` in the session scratchpad); every prod row stays `UNVERIFIED` until the owner runs it. **The prtest timing baseline was NOT measured**: prtest has no eligible 2026 result (see Timing).

DB identity: read-only connection from the local `.env` (values not printed). The host name carries neither a `test` nor a `prod` hint; the PRMS schema is `prdb`. It matches prtest on one fact: 1 Submitted 2026 result, which the prtest API reports as `not_w1w2`. `<TOC>` below stands for the ToC schema (`DB_TOC`). All queries are SELECT only.

#### Column discovery (the two `UNVERIFIED` names)

```sql
SELECT table_name, column_name, column_key, data_type FROM information_schema.columns WHERE table_schema = <TOC> AND table_name IN ('toc_results_melias','toc_results_indicators') ORDER BY table_name, ordinal_position;
SELECT table_name, column_name, column_key, data_type FROM information_schema.columns WHERE table_schema = <TOC> AND table_name = 'toc_results' AND (column_name LIKE '%phase%' OR column_key<>'');
```
- `toc_results_melias`: PK `id` (int, single column `PRI`); also `melia_id` varchar, `title` longtext.
- `toc_results_indicators`: PK `id` (bigint); `related_node_id` varchar, `indicator_description` text, `toc_results_id` int (`MUL`), `is_active` tinyint. **It has no phase column.** The phase lives on `toc_results.phase` (varchar), reached through `toc_results_indicators.toc_results_id = toc_results.id`. The phase-scoped query below joins that way.
- `clarisa_innovation_use_levels`, `clarisa_innovation_readiness_level`: `id` PK, `level`, `name`, `definition`. `clarisa_geographic_scope`: `id` PK, `name`, `description`.

#### P-14 use levels

```sql
SELECT d.id, d.level, d.name AS dup_name, b.id AS base_id, b.name AS base_name, (d.name = b.name) AS same_name FROM clarisa_innovation_use_levels d LEFT JOIN clarisa_innovation_use_levels b ON b.level = d.level AND b.id BETWEEN 1 AND 10 WHERE d.id > 10 ORDER BY d.id;
```
Result: `ids 13..20 map to base ids 3..10 (levels 2..9); same_name = 1 on all 8 rows: Partners, Partners, Connected next-user, Connected next-user, Unconnected next-user, Unconnected next-user, End-user / Beneficiaries, End-user / Beneficiaries`

```sql
SELECT COUNT(*) AS dup_rows, SUM(b.id IS NULL) AS no_base_row, SUM(b.id IS NOT NULL AND d.name <> b.name) AS name_mismatch, SUM(b.id IS NOT NULL AND d.name = b.name) AS name_equal FROM clarisa_innovation_use_levels d LEFT JOIN clarisa_innovation_use_levels b ON b.level = d.level AND b.id BETWEEN 1 AND 10 WHERE d.id > 10;
```
Result: `{"dup_rows":8,"no_base_row":"0","name_mismatch":"0","name_equal":"8"}`

```sql
SELECT level, COUNT(*) AS n FROM clarisa_innovation_use_levels WHERE id BETWEEN 1 AND 10 GROUP BY level HAVING COUNT(*) > 1;
```
Result: `[] (base ids 1..10 hold one row per level 0..9)`

```sql
SELECT level, COUNT(*) AS n_rows, COUNT(DISTINCT name) AS n_names, GROUP_CONCAT(id ORDER BY id) AS ids FROM clarisa_innovation_use_levels GROUP BY level HAVING COUNT(*) > 1 ORDER BY level;
```
Result: `levels 2..9 each have 2 rows and 1 distinct name (ids 3,13 / 4,14 / 5,15 / 6,16 / 7,17 / 8,18 / 9,19 / 10,20)`

#### P-14 readiness levels

```sql
SELECT COUNT(*) AS rows_total, MIN(id) AS min_id, MAX(id) AS max_id, SUM(id BETWEEN 1 AND 10) AS rows_in_1_10 FROM clarisa_innovation_readiness_level;
```
Result: `{"rows_total":10,"min_id":11,"max_id":20,"rows_in_1_10":"0"}`

```sql
SELECT level, COUNT(*) AS n_rows, COUNT(DISTINCT name) AS n_names, GROUP_CONCAT(id ORDER BY id) AS ids FROM clarisa_innovation_readiness_level GROUP BY level HAVING COUNT(*) > 1;
```
Result: `[] (no level has more than one row)`

Reference rows (quoted): use levels id/level/name = 1/0/No use, 2/1/Project lead organization, 3/2/Partners, 4/3/Partners, 5/4/Connected next-user, 6/5/Connected next-user, 7/6/Unconnected next-user, 8/7/Unconnected next-user, 9/8/End-user / Beneficiaries, 10/9/End-user / Beneficiaries, then the 13..20 duplicates above. Readiness id/level/name = 11/0/Idea, 12/1/Basic Research, 13/2/Formulation, 14/3/Proof of Concept, 15/4/Controlled Testing, 16/5/Model/Early Prototype, 17/6/Semi-Controlled Testing, 18/7/Prototype, 19/8/Uncontrolled Testing, 20/9/Proven Innovation.

**P-14 outcome on test: VERIFIED for use levels** (8 duplicate rows, 0 name mismatches, 0 without a base row). Two things the premise did not say, for the Leader:
- Within ids 1..10 the **names repeat across levels** (levels 2 and 3 are both "Partners"). A label from the id is correct, but two different levels read identically.
- **Readiness has no duplicates on test and no row in ids 1..10** (ids are 11..20). "The row with the same level among ids 1..10" has nothing to point at for readiness; a direct id to name read already equals one row per level. The premise is vacuous for readiness on test, not verified by a comparison.

Prod: UNVERIFIED (owner).

#### P-21

```sql
SELECT id, name, description FROM clarisa_geographic_scope WHERE id = 4;
```
Result: `[{"id":4,"name":"National","description":"The activity scope covers one country"}]`

Full table: 1 Global, 2 Regional, 3 Multi-national, 4 National, 5 Sub-national, 50 This is yet to be determined.

**P-21 outcome on test: VERIFIED** (row 4 exists; its DB name is "National", the client text is "Country"). Prod: UNVERIFIED (owner).

#### P-18 melias

```sql
SELECT COUNT(*) AS rows_total, COUNT(DISTINCT melia_id) AS distinct_melia_id, SUM(melia_id IS NULL OR melia_id = '') AS blank_melia_id FROM <TOC>.toc_results_melias;
```
Result: `{"rows_total":992,"distinct_melia_id":323,"blank_melia_id":"0"}`

```sql
SELECT melia_id, COUNT(*) AS n_rows, COUNT(DISTINCT title) AS n_titles, MIN(id) AS min_pk FROM <TOC>.toc_results_melias GROUP BY melia_id HAVING COUNT(*) > 1 ORDER BY n_titles DESC, n_rows DESC LIMIT 5;
```
Result: `top 5 melia_ids by rows: 32/30/29/26/24 rows, n_titles = 1 each (min_pk 3095, 7237, 7236, 3049, 6979)`

```sql
SELECT COUNT(*) AS melia_ids_with_more_than_one_row, SUM(n_titles > 1) AS melia_ids_with_differing_titles FROM (SELECT melia_id, COUNT(DISTINCT title) AS n_titles FROM <TOC>.toc_results_melias GROUP BY melia_id HAVING COUNT(*) > 1) x;
```
Result: `{"melia_ids_with_more_than_one_row":124,"melia_ids_with_differing_titles":"0"}`

**P-18 outcome on test: VERIFIED** (PK is the single column `id`, per the column discovery above; 124 of 323 melia_ids join several rows, 0 have differing titles). Prod: UNVERIFIED (owner).

#### P-20 indicators

```sql
SELECT COUNT(*) AS rows_total, SUM(related_node_id IS NULL OR related_node_id = '') AS blank_related_node_id FROM <TOC>.toc_results_indicators;
```
Result: `{"rows_total":10229,"blank_related_node_id":"94"}`

```sql
SELECT COUNT(*) AS node_phase_groups_with_more_than_one_row, COALESCE(SUM(n_desc > 1),0) AS groups_with_differing_descriptions, COALESCE(MAX(n_rows),0) AS max_rows_in_group FROM (SELECT r.phase, i.related_node_id, COUNT(*) AS n_rows, COUNT(DISTINCT i.indicator_description) AS n_desc FROM <TOC>.toc_results_indicators i JOIN <TOC>.toc_results r ON r.id = i.toc_results_id WHERE i.related_node_id IS NOT NULL AND i.related_node_id <> '' GROUP BY r.phase, i.related_node_id HAVING COUNT(*) > 1) x;
```
Result: `{"node_phase_groups_with_more_than_one_row":553,"groups_with_differing_descriptions":"316","max_rows_in_group":9}`

```sql
SELECT COUNT(*) AS rows_without_toc_result FROM <TOC>.toc_results_indicators i LEFT JOIN <TOC>.toc_results r ON r.id = i.toc_results_id WHERE r.id IS NULL;
```
Result: `{"rows_without_toc_result":0}`

```sql
SELECT COUNT(*) AS related_node_id_equal_to_other_rows_id FROM <TOC>.toc_results_indicators a JOIN <TOC>.toc_results_indicators b ON a.related_node_id = CAST(b.id AS CHAR) AND a.id <> b.id;
```
Result: `{"related_node_id_equal_to_other_rows_id":0}`

```sql
SELECT COUNT(*) AS node_phase_groups_with_more_than_one_row, COALESCE(SUM(n_desc > 1),0) AS groups_with_differing_descriptions, COALESCE(SUM(n_desc > 1 AND n_active_desc > 1),0) AS differing_among_active_rows FROM (SELECT r.phase, i.related_node_id, COUNT(*) AS n_rows, COUNT(DISTINCT i.indicator_description) AS n_desc, COUNT(DISTINCT CASE WHEN i.is_active = 1 THEN i.indicator_description END) AS n_active_desc FROM <TOC>.toc_results_indicators i JOIN <TOC>.toc_results r ON r.id = i.toc_results_id WHERE i.related_node_id IS NOT NULL AND i.related_node_id <> '' GROUP BY r.phase, i.related_node_id HAVING COUNT(*) > 1) x;
```
Result: `{"node_phase_groups_with_more_than_one_row":553,"groups_with_differing_descriptions":"316","differing_among_active_rows":"198"}`

```sql
SELECT COUNT(*) AS groups_with_more_than_one_row_in_same_toc_result FROM (SELECT i.toc_results_id, i.related_node_id FROM <TOC>.toc_results_indicators i WHERE i.related_node_id IS NOT NULL AND i.related_node_id <> '' GROUP BY i.toc_results_id, i.related_node_id HAVING COUNT(*) > 1) x;
```
Result: `{"groups_with_more_than_one_row_in_same_toc_result":113}`

```sql
SELECT COUNT(*) AS groups_differing_across_phase_free_grouping FROM (SELECT related_node_id FROM <TOC>.toc_results_indicators WHERE related_node_id IS NOT NULL AND related_node_id <> '' GROUP BY related_node_id HAVING COUNT(DISTINCT indicator_description) > 1) x;
```
Result: `{"groups_differing_across_phase_free_grouping":923}`

**P-20 outcome on test: REFUTED.** `related_node_id` is **not** unique per phase: 553 (phase, related_node_id) groups hold more than one row (up to 9), **316 of them with differing `indicator_description`** (198 still differ when only `is_active = 1` rows are counted); 113 repeat even inside one `toc_results` row. The design's fallback applies (lowest PK, record the gap), but "one title per id" does not hold, so the picked title can be another toc result's wording. The other half of the premise held: no `related_node_id` equals another row's numeric `id` (0), so the `related_node_id OR id` read has no cross-match. Prod: UNVERIFIED (owner).

#### Timing baseline (prtest) - NOT MEASURED, blocker

Base URL: `https://prtest-back.ciat.cgiar.org` (appears in repo docs, e.g. `onecgiar-pr-server/docs/p2-3218-parent-acceptance-audit.md`). The QA key was read from the scratchpad file inside the script and never printed.

| Call | Result |
|---|---|
| `GET /api/qa/results?phase_year=2026&page=1&page_size=100` | 200, `total: 0`, `breakdown: {by_program: [], by_result_type: []}`, `items: []` |
| `GET /api/qa/results?phase_year=2025` and `2024` | 404 (no catalog) |
| `POST /api/qa/results/details` `{phase_year: 2026, result_ids: [11813]}` (the only Submitted 2026 result on the connected DB) | 200, `results: 0`, `not_eligible: [{result_id: 11813, reason: "not_w1w2"}]` |

DB cross-check (`SELECT r.status_id, COUNT(*) AS n FROM result r JOIN version v ON v.id = r.version_id WHERE r.is_active = 1 AND v.phase_year = 2026 GROUP BY r.status_id`): `1: 930, 2: 39, 3: 1, 4: 3, 5: 147, 6: 41, 7: 18, 8: 242`. Status 3 (Submitted) has one row, and the API classifies it `not_w1w2`.

There is no eligible 2026 batch on prtest today. Timing a batch of ineligible ids would not run the value or label reads, so it is not a baseline and none is recorded. The 6-run table, p50, p95 and spread are **not available**. It needs at least one batch (ideally up to 50) of Submitted, W1/W2, catalogued, lead-programmed 2026 results on prtest. That is a data step, not something a SELECT-only task can create. `statements=` lives in the server log, which was not readable from here in any case; client-side wall clock was the planned measure.

Rerun: list `GET /api/qa/results`, take up to 50 `result_id`, then 6 sequential `POST /api/qa/results/details` calls timed by wall clock (no `field_keys`).

#### Summary

| Premise | Test | Prod |
|---|---|---|
| P-14 | VERIFIED for use levels; vacuous for readiness (no duplicates, no ids 1..10) | UNVERIFIED (owner) |
| P-18 | VERIFIED | UNVERIFIED (owner) |
| P-20 | REFUTED (316 of 553 duplicate groups differ in text) | UNVERIFIED (owner) |
| P-21 | VERIFIED (row 4 = "National") | UNVERIFIED (owner) |
| Baseline | NOT MEASURED: no eligible 2026 result on prtest | n/a |

*Prod column superseded by "QVL-T-1 prod evidence (owner)" below. The baseline was dropped by owner decision (see "Owner decisions").*

### Leader note: QVL-T-1 parked `[~]` (2026-11-09)

- **Status:** `[~]`. The Implementer report carries `Not Done / Assumptions` with owed items, and both need the owner, so no continuation can close them:
  1. **Prod run of the premise queries** (owed by the owner). The file is `scratchpad/t1-prod-queries.sql`: 22 SELECTs, with ToC schema placeholder `<TOC_SCHEMA>`. Until then P-14, P-18, P-20 and P-21 stay `UNVERIFIED` for prod.
  2. **prtest timing baseline**: not measurable. `GET /api/qa/results?phase_year=2026` → 200 `total: 0`; the only Submitted 2026 result (11813) is `not_w1w2`. There is no eligible batch, so no runs were made and the 30 % rule has nothing to apply to.
- **Evidence re-run:** deferred until the owner's prod results arrive. It will re-run the test-side SELECTs non-author against the Implementer's quoted counts.
- **spawns:** implementer 29 calls, 125 606 tokens, ended partial
- **Leader adjudication of the test outcomes (pending prod):**
  - **P-20 refuted on test.** This routes to the fallback design §1A already names ("Pick by lowest PK, and record the gap"), which §5 already encodes ("lowest PK first"). DD-4 does not change. The contract (T-6) gets a known gap: one `related_node_id` can carry different `indicator_description`s.
  - **P-14 vacuous for readiness on test** (ids 11..20, one row per level, no duplicates). A direct id → `name` read equals the form for all three lists. If prod agrees, DD-4 keeps kind T with no level-normalized read.
  - **Spec tension (presented to the owner):** the T-1 Verification says "`git diff --stat` shows only `execution.md`", but its Definition of done asks to mark the premises in `design.md` §1A. Proposed amendment: allow the §1A rows P-14, P-18, P-20 and P-21 in T-1's diff.

### Owner decisions and execute-time spec edits (2026-11-09)

Asked through AskUserQuestion; answers recorded as given.

| Decision | Answer | Spec edits (file · section) |
|---|---|---|
| T-1 latency baseline cannot be measured (prtest has no eligible 2026 batch) | **Deterministic proxy.** The statement count (1 vs 50, QVL-R-7) is the NFR gate. Latency is a known gap | `requirements.md` §6 Performance and §7 D-11 (amended; it changes the NFR's meaning, so it was approved by the owner, not edit-carried); `design.md` §8, §10 D-11, DD-6, §14 (new gap row); `tasks.md` T-1 (title, timing bullet, Implements, Blocks, Disqualifier, DoD), T-6 (new known gaps), T-7 (step 3, Implements, DoD), §4 graph note, §5 NFR row |
| P-20 refuted on test | **Fallback + known gap.** `toc_results_indicators` labels by lowest PK; the contract documents it. DD-4 unchanged | `design.md` §14 (new gap row); `tasks.md` T-6 (new known gap). The §1A P-20 row is updated after the prod run |

- **Two-direction sweep:** `grep -nE "p95|p50|baseline|6 runs|6-run|30 ?%|D-11|latency"` over `requirements.md`, `design.md` and `tasks.md`. What remains is only the amended text. `proposal.md` was left as history.
- **Diff read:** every removed line in the three documents is an intended removal (12 lines, all latency/baseline).
- **Carry to the next Reviewer briefs (T-2, then T-4):** conformance to `requirements.md` §6 Performance and §7 D-11 as amended 2026-11-09, and `design.md` §8 / §10 D-11 / §14 as amended.

### QVL-T-1 prod evidence (owner, 2026-11-09)

The owner ran `scratchpad/t1-prod-queries.ready.sql` (verbatim in the appendix below) on prod. The ToC schema is `Integration_information`. Results below are transcribed from the owner's message in this session; the statements match the file. The owner did not paste the statements that returned no rows or NULL; they said so ("las que no pegué es porque retorna null vacíos").

| Query | Prod result |
|---|---|
| ToC column discovery | `toc_results_melias.id` PRI int; `toc_results_indicators.id` PRI bigint; phase is `toc_results.phase` (varchar), not on `toc_results_indicators` |
| PRMS column discovery | `clarisa_innovation_use_levels(id PRI, name, level, definition)`, `clarisa_innovation_readiness_level(id PRI, name, definition, level)`, `clarisa_geographic_scope(name, description, id PRI)` |
| P-14 (a) per id, (b), (c), (e) | no rows (not pasted, per the owner). These are row-returning queries, so "empty" is a possible result. Read: no use-level row with id > 10, and no level with more than one row in either table |
| P-14 (a) summary | not pasted; result not recorded. *Inferred, not observed:* if the owner's "null vacíos" remark covers it, the result is `dup_rows 0` with NULL sums, which is consistent with P-14 (a) per id being empty |
| P-14 (d) readiness id range | `{rows_total:10, min_id:11, max_id:20, rows_in_1_10:0}` |
| P-21 row 4 | `{id:4, name:"National", description:"The activity scope covers one country"}` |
| P-18 (a) totals | `{rows_total:840, distinct_melia_id:303, blank_melia_id:0}` |
| P-18 (b) top 5 | each `n_titles: 1` (32, 30, 29, 26 and 24 rows) |
| P-18 (c) summary | `{melia_ids_with_more_than_one_row:121, melia_ids_with_differing_titles:0}` |
| P-20 (b) | `{node_phase_groups_with_more_than_one_row:530, groups_with_differing_descriptions:135, max_rows_in_group:12}` |
| P-20 (e) | `{…:530, groups_with_differing_descriptions:135, differing_among_active_rows:20}` |
| P-20 (f) | `{groups_with_more_than_one_row_in_same_toc_result:190}` |
| P-20 (g) | `{groups_differing_across_phase_free_grouping:796}` |
| P-20 (a) | not pasted; result not recorded. It is a bare totals `COUNT(*)` and cannot be empty; by (b) its `rows_total` is ≥ 1 060 |
| P-20 (c), (d) | not pasted; result not recorded (single-row `COUNT(*)` queries; per the owner's remark, presumably 0) |

**Residual:** an empty P-14 result would also fit an empty `clarisa_innovation_use_levels` table on prod; the row listing was not pasted. Either way the claim holds: there are no duplicates with different names, so a direct id → `name` read equals the form. DD-4 (kind T) does not depend on which case it is.

**Evidence re-run (Leader, inline, non-author) on test:** re-executed P-14 (a) summary, P-14 (c), P-14 (e), P-21, P-18 (c), P-20 (b), (d), (e) and (f) from `t1-prod-queries.sql` (verbatim in the appendix below), with the ToC schema taken from the environment. All nine results equal the Implementer's quoted values (`dup_rows 8 / name_equal 8`; levels 2..9 paired 3/13 … 10/20; readiness `[]`; `National`; `124 / 0`; `553 / 316 / 9`; `0`; `553 / 316 / 198`; `113`). **VERIFIED**

**Outcomes (now in `design.md` §1A):** P-14 VERIFIED · P-18 VERIFIED · P-20 REFUTED (fallback: lowest PK + known gap, owner decision) · P-21 VERIFIED. P-20 is refuted on prod too, so the gap is not test-only.


### Appendix — QVL-T-1 query set, verbatim (labels used above)

This is the Implementer's `t1-prod-queries.sql`, with `<TOC_SCHEMA>` replaced by `Integration_information`, the ToC schema name visible in the owner's pasted statements. The test run used the same statements with the test `DB_TOC`. Each `-- <label>` line is the label the tables above refer to ("P-14 (a) summary", "P-20 (e)", …), and the statement below it is that query.

```sql
-- QVL-T-1 prod query set. SELECT only. Run each statement as-is.
-- Statements that contain Integration_information run against the ToC schema: replace the placeholder with its name (the DB_TOC value). All other statements run on the PRMS schema (the one holding clarisa_*).
-- Do not paste person data back. All results are counts or reference-table rows.

-- ToC column discovery (quote this result; PK of toc_results_melias, phase column location)
SELECT table_name, column_name, column_key, data_type FROM information_schema.columns WHERE table_schema = 'Integration_information' AND table_name IN ('toc_results_melias','toc_results_indicators','toc_results') AND (column_key <> '' OR column_name IN ('melia_id','title','related_node_id','indicator_description','toc_results_id','phase','is_active')) ORDER BY table_name, ordinal_position;
-- PRMS column discovery
SELECT table_name, column_name, column_key FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name IN ('clarisa_innovation_use_levels','clarisa_innovation_readiness_level','clarisa_geographic_scope') ORDER BY table_name, ordinal_position;
-- Row listings (reference tables, safe to quote)
SELECT id, level, name FROM clarisa_innovation_use_levels ORDER BY id;
SELECT id, level, name FROM clarisa_innovation_readiness_level ORDER BY id;
SELECT id, name, description FROM clarisa_geographic_scope ORDER BY id;

-- P-14 (a) use-level duplicates vs base row, per id
SELECT d.id, d.level, d.name AS dup_name, b.id AS base_id, b.name AS base_name, (d.name = b.name) AS same_name FROM clarisa_innovation_use_levels d LEFT JOIN clarisa_innovation_use_levels b ON b.level = d.level AND b.id BETWEEN 1 AND 10 WHERE d.id > 10 ORDER BY d.id;
-- P-14 (a) summary
SELECT COUNT(*) AS dup_rows, SUM(b.id IS NULL) AS no_base_row, SUM(b.id IS NOT NULL AND d.name <> b.name) AS name_mismatch, SUM(b.id IS NOT NULL AND d.name = b.name) AS name_equal FROM clarisa_innovation_use_levels d LEFT JOIN clarisa_innovation_use_levels b ON b.level = d.level AND b.id BETWEEN 1 AND 10 WHERE d.id > 10;
-- P-14 (b) base ids 1..10 unique per level (expect empty)
SELECT level, COUNT(*) AS n FROM clarisa_innovation_use_levels WHERE id BETWEEN 1 AND 10 GROUP BY level HAVING COUNT(*) > 1;
-- P-14 (c) any level with more than one row
SELECT level, COUNT(*) AS n_rows, COUNT(DISTINCT name) AS n_names, GROUP_CONCAT(id ORDER BY id) AS ids FROM clarisa_innovation_use_levels GROUP BY level HAVING COUNT(*) > 1 ORDER BY level;
-- P-14 (d) readiness: id range
SELECT COUNT(*) AS rows_total, MIN(id) AS min_id, MAX(id) AS max_id, SUM(id BETWEEN 1 AND 10) AS rows_in_1_10 FROM clarisa_innovation_readiness_level;
-- P-14 (e) readiness: levels with more than one row
SELECT level, COUNT(*) AS n_rows, COUNT(DISTINCT name) AS n_names, GROUP_CONCAT(id ORDER BY id) AS ids FROM clarisa_innovation_readiness_level GROUP BY level HAVING COUNT(*) > 1;
-- P-21 row 4
SELECT id, name, description FROM clarisa_geographic_scope WHERE id = 4;
-- P-18 (a) totals
SELECT COUNT(*) AS rows_total, COUNT(DISTINCT melia_id) AS distinct_melia_id, SUM(melia_id IS NULL OR melia_id = '') AS blank_melia_id FROM `Integration_information`.toc_results_melias;
-- P-18 (b) top 5 melia_ids by rows
SELECT melia_id, COUNT(*) AS n_rows, COUNT(DISTINCT title) AS n_titles, MIN(id) AS min_pk FROM `Integration_information`.toc_results_melias GROUP BY melia_id HAVING COUNT(*) > 1 ORDER BY n_titles DESC, n_rows DESC LIMIT 5;
-- P-18 (c) summary (expect differing_titles = 0)
SELECT COUNT(*) AS melia_ids_with_more_than_one_row, SUM(n_titles > 1) AS melia_ids_with_differing_titles FROM (SELECT melia_id, COUNT(DISTINCT title) AS n_titles FROM `Integration_information`.toc_results_melias GROUP BY melia_id HAVING COUNT(*) > 1) x;
-- P-20 (a) totals
SELECT COUNT(*) AS rows_total, SUM(related_node_id IS NULL OR related_node_id = '') AS blank_related_node_id FROM `Integration_information`.toc_results_indicators;
-- P-20 (b) node+phase groups, differing descriptions
SELECT COUNT(*) AS node_phase_groups_with_more_than_one_row, COALESCE(SUM(n_desc > 1),0) AS groups_with_differing_descriptions, COALESCE(MAX(n_rows),0) AS max_rows_in_group FROM (SELECT r.phase, i.related_node_id, COUNT(*) AS n_rows, COUNT(DISTINCT i.indicator_description) AS n_desc FROM `Integration_information`.toc_results_indicators i JOIN `Integration_information`.toc_results r ON r.id = i.toc_results_id WHERE i.related_node_id IS NOT NULL AND i.related_node_id <> '' GROUP BY r.phase, i.related_node_id HAVING COUNT(*) > 1) x;
-- P-20 (c) indicator rows without a toc_results parent
SELECT COUNT(*) AS rows_without_toc_result FROM `Integration_information`.toc_results_indicators i LEFT JOIN `Integration_information`.toc_results r ON r.id = i.toc_results_id WHERE r.id IS NULL;
-- P-20 (d) related_node_id equal to another row's id
SELECT COUNT(*) AS related_node_id_equal_to_other_rows_id FROM `Integration_information`.toc_results_indicators a JOIN `Integration_information`.toc_results_indicators b ON a.related_node_id = CAST(b.id AS CHAR) AND a.id <> b.id;
-- P-20 (e) differing descriptions, and among active rows
SELECT COUNT(*) AS node_phase_groups_with_more_than_one_row, COALESCE(SUM(n_desc > 1),0) AS groups_with_differing_descriptions, COALESCE(SUM(n_desc > 1 AND n_active_desc > 1),0) AS differing_among_active_rows FROM (SELECT r.phase, i.related_node_id, COUNT(*) AS n_rows, COUNT(DISTINCT i.indicator_description) AS n_desc, COUNT(DISTINCT CASE WHEN i.is_active = 1 THEN i.indicator_description END) AS n_active_desc FROM `Integration_information`.toc_results_indicators i JOIN `Integration_information`.toc_results r ON r.id = i.toc_results_id WHERE i.related_node_id IS NOT NULL AND i.related_node_id <> '' GROUP BY r.phase, i.related_node_id HAVING COUNT(*) > 1) x;
-- P-20 (f) groups inside one toc_result
SELECT COUNT(*) AS groups_with_more_than_one_row_in_same_toc_result FROM (SELECT i.toc_results_id, i.related_node_id FROM `Integration_information`.toc_results_indicators i WHERE i.related_node_id IS NOT NULL AND i.related_node_id <> '' GROUP BY i.toc_results_id, i.related_node_id HAVING COUNT(*) > 1) x;
-- P-20 (g) differing descriptions ignoring phase
SELECT COUNT(*) AS groups_differing_across_phase_free_grouping FROM (SELECT related_node_id FROM `Integration_information`.toc_results_indicators WHERE related_node_id IS NOT NULL AND related_node_id <> '' GROUP BY related_node_id HAVING COUNT(DISTINCT indicator_description) > 1) x;
```

### QVL-T-1 — Settle the row premises (task record)

- **Final status:** PASS (attempt 3)
- **Date:** 2026-11-09
- **Implementer attempts:** 1 Implementer spawn (test DB + query set), then the Leader-authored HITL prod record and two reworks of that record. The HITL record is the Leader's by rule (`leader.md`: a HITL evidence record is derived from the session transcript).
- **Skills / effort:** `systematic-debugging` (task default) · effort `medium`
- **Review intensity:** the task claimed `skip-eligible`. The claim was **not earned**: condition 1 failed (no falsifier executed red; red run n/a), and override (c) applies (derived evidence that T-4 consumes). A conformance Reviewer ran. Reported at the continue gate.
- **Attempt 1**
  - Files: `execution.md` (Implementer evidence section; Leader prod section), `design.md` §1A (P-14, P-18, P-20, P-21 rows, Count line)
  - Verification: every outcome quotes its query; Leader non-author re-run of 9 test queries → **VERIFIED** (all equal)
  - Reviewer: **FAIL**. (1) The prod rows were labelled "P-14 (a) summary", "P-20 (e)" and so on, but the labels were defined only in a scratchpad file; the P-18, P-20 and P-21 rows in §1A had no query pointer. (2) "not pasted (no rows / NULL)" was written for `COUNT(*)` queries, which cannot return no rows (P-20 (a), and the same for the P-14 summary, P-20 (c) and (d)). Full report in the conversation transcript; the issues are quoted in the attempt-2 brief.
- **Attempt 2** (effort bump: n/a, Leader-authored doc rework)
  - Changes: verbatim appendix of the 22 labelled queries; COUNT rows reworded; appendix pointers in §1A; P-14 residual copied to §1A; superseded note on the first prod column.
  - Reviewer: **FAIL**. The "P-14 (a) summary" row said "returned `dup_rows 0` with NULL sums", a value inferred from the owner's remark, not observed. The §1A P-14 row repeated it ("returned no rows / NULL sums").
- **Attempt 3**
  - Changes: the row now reads "not pasted; result not recorded. *Inferred, not observed* …"; §1A P-14 now reads "reported empty/NULL by the owner (not pasted)"; "(verbatim in the appendix below)" next to both scratchpad file names.
  - Reviewer: **PASS**. The inferred value is labelled as such; no regressions; the §1A count is 20 verified / 1 refuted / 1 UNVERIFIED (22 premises); no secrets or person data.
  - **runtime events:** none
- **continuations:** none (the owed items, the prod run and the baseline, went to the owner. The baseline was dropped by owner decision)
- **spawns:** implementer 29 calls, 125 606 tokens, ended partial; reviewer 7 calls, 64 323 tokens, ended complete (FAIL); reviewer 3 calls, 53 584 tokens, ended complete (FAIL); reviewer 3 calls, 51 628 tokens, ended complete (PASS)
- **ADVISORY:** none open (the attempt-1 and attempt-2 advisories were applied in the reworks)
- **Requirements covered:** design P-14, P-18, P-20, P-21 (DD-6). The NFR baseline was removed from T-1 by owner decision 2026-11-09.
- **Decisions made:** P-20 → lowest PK + known gap (owner). Latency → statement-count proxy (owner). Spec edits recorded in "Owner decisions and execute-time spec edits".
- **Issues encountered:** the test DB was unreachable at first (VPN; probe recorded). prtest has no eligible 2026 batch. The owner's partial paste left P-20 (a), (c) and (d) unrecorded; no outcome depends on them.
- **Open spec tension (owner not yet answered):** T-1 Verification "`git diff --stat` shows only `execution.md`" vs its DoD "marked … in `design.md` §1A". The Leader followed the DoD.
- **Open owner question for T-4:** P-20 pick rule: lowest PK, or active row first, then lowest PK (prod: 135 → 20 ambiguous groups).
- **Budget running totals (design §13):** tasks 2 / 7 · LOC ≈ 275 code + ≈ 330 spec/evidence lines / ~1 400 · review rounds 4 / ~10. Within budget.
- **Final verification:** green (re-run VERIFIED, Reviewer PASS on attempt 3)

### QVL-T-2 — Label-source registry with its three checks

- **Final status:** PASS
- **Date:** 2026-11-09
- **Implementer attempts:** 1
- **Skills / effort:** `nestjs-expert`, `api-design-principles`, `tdd` (task defaults) · effort **`high`**, one level above the T2 default. Reason: 55 lists, and a wrong key column returns wrong labels silently. Model unchanged (T2)
- **Dependency note:** T-2 lists T-1 as a dependency only for the use-level shape. It started while T-1's attempt-3 review ran, after P-14 was settled (test + prod) and on the owner's "continue with T-2". T-1 closed PASS before T-2 was finalized.
- **Attempt 1**
  - **Files changed:** `onecgiar-pr-server/src/api/qa-catalog/values/label-sources.ts` (new, 489 lines), `label-sources.spec.ts` (new, 445 lines)
  - **Implementer verification:** `npx jest src/api/qa-catalog/values/label-sources src/api/qa-catalog/values/lookup-sources src/api/qa-catalog/qa-catalog.snapshot --silent --reporters=summary --maxWorkers=2` → 3 suites, 198 tests passed (label-sources: 166). Snapshot guard green, no revision bump. `npx tsc --noEmit` exit 0. `npx eslint src/api/qa-catalog/values/ --quiet` exit 0
  - **Registry vs walk:** 55 = 55, asserted in both directions
  - **Falsifier reds** (applied to the final code, run, reverted; the saved copy diffs identical):
    1. Delete `toc_levels` → `✕ every list has a source (a missing list is named in the failure)` / `- Array []` / `+ Array [` / `+   "toc_levels",` (2 failed: the second is the constants count guard)
    2. `actor_type` `name` → `nmae` → `✕ column actor_type.nmae exists in its entity` / `Expected: true` / `Received: false`
    3. "Upload file" → "Upload File" → `✕ evidence_sources[1] Upload File` / `Array [ "Upload File", - true, + false,`
  - **Evidence re-run (Leader, inline, non-author):** the same jest command → `Test Suites: 3 passed, 3 total` / `Tests: 198 passed, 198 total`; `npx tsc --noEmit` → exit 0. **VERIFIED**
  - **Reviewer verdict:** `PASS` (lens-checklist mode). All 55 entries match design §5: kind, key column, columns, composition and the type-9 override. The Reviewer spot-checked entity metadata (`clarisa_center.code` `@PrimaryColumn`, `institutionId` `@JoinColumn`; no `namingStrategy`, so the green metadata spec is real evidence for P-17). Disqualifiers do not apply: completeness walks the real `CATALOG_FIELDS` for each year in `CATALOG_VERSIONS`, and the mirror reads the real client files with `readFileSync`. The reds fail on behavioral assertions. R-10 holds. No contradiction with the 2026-11-09 amendments. Sources: 30 table + 3 ToC + 1 chain (matches §8). Adaptation (1) is within the task.
  - **runtime events:** none
- **continuations:** none
- **spawns:** implementer 58 calls, 226 343 tokens, ended partial (assumptions only, no owed item); reviewer 13 calls, 83 408 tokens, ended complete
- **Adaptations (Implementer), recorded as spec deviations:**
  1. **`toc_melia_studies`**: `toc_results_melias` is not in `LOOKUP_SOURCES`, and `lookup-sources.ts` had to stay unchanged (Consumers). A `TOC_LABEL_ONLY_SOURCES` fallback map in `label-sources.ts` (PK `id`, P-18) is used by `resolveTocLabelSource`, which delegates to `resolveLookupSource` for the three registered ToC sources. This departs from §5 / T-2's "ToC through `resolveLookupSource`" for one list. The Reviewer judged it the only narrow path. **Deviation accepted by the Leader**; a one-line `LOOKUP_SOURCES` entry would remove it if that file is ever reopened.
  2. `toc_levels` cites the server file `toc/toc-level/toc-level.service.ts:30-48` (`tree: 'server'`, P-9).
  3. The partner-roles citation was disambiguated to the full path (`rd-contributors-and-partners/.../multiple-wps/normal-selector.component.html`).
  4. Table sources carry no separate logical name: `table` + `keyColumn` is the grouping key for T-4.
- **Not Done / Assumptions (Implementer, verbatim gist):** "The registry carries the 'lowest PK wins' rule only as data … Applying it is T-4's job." "Client, server and ToC-repository text and line citations are checked against the working tree at this commit. A later client edit will turn the mirror spec red, which is the intent (D-1a)." "No ToC column was checked against the ToC database … Only the repository SQL text is checked." No owed item, so no continuation.
- **ADVISORY (4R, Reviewer; recorded only):**
  - RISK: `resolveTocLabelSource` returns `undefined` both for an unknown source and for an unset `DB_TOC`. T-4 must turn either case into a throw via `fail(...)`, never a `null` label, or R-9's generic 500 is bypassed. **Forward pointer to T-4.**
  - RISK: the `TOC` prefix string is duplicated in `lookup-sources.ts` and `label-sources.ts` (the known-source spec catches drift).
  - RELIABILITY: the mirror check matches substrings, so short labels ("Other", "Link", "Global", "Country") prove little; word-boundary matching would be stricter.
  - RELIABILITY: `entityColumns()` merges the columns of entities that share a table name.
  - READABILITY: the spec's `compose` helper has two equivalent branches.
- **Requirements covered:** QVL-R-3 (canonical text; constants documented with citations), QVL-R-8, QVL-R-10, D-1 (a), D-6, D-6b; design P-17 settled
- **Decisions made (execute-time spec edit):** `design.md` §1A P-17 → VERIFIED (by the T-2 metadata spec), and the Count line updated. The meaning of no approved requirement changed.
- **Issues encountered:** none
- **Budget running totals (design §13):** tasks 3 / 7 · LOC code + tests ≈ 1 209 (collector 223 + fixtures 52 + registry 934) against the ~1 200 estimated for code and tests (~1 400 with docs) · review rounds 5 / ~10. **The total is not exceeded yet, but code + tests are already at the estimate, with T-4 and T-5 to go.** The registry alone is ~930 lines against ~250 estimated for production. Raised to the owner at this gate; the tripwire stops the run when the total is crossed.
- **Final verification:** green (re-run VERIFIED, Reviewer PASS)

### Forward pointers (added after T-2)

| To task | Pointer | Source |
|---|---|---|
| QVL-T-4 | `resolveTocLabelSource` returns `undefined` for an unknown source **and** for an unset `DB_TOC`. The resolver must throw (`fail(...)`), never map it to `null` labels (R-9, P-6) | T-2 Reviewer ADVISORY |
| QVL-T-4 | ToC indicator pick rule: lowest PK (owner decision 2026-11-09). Whether to prefer active rows first is a pending owner question | Owner decisions |

### Owner decisions at the T-2 gate (2026-11-09)

The owner answered "Si, adelante" to three pending questions. The Leader recorded the reading of that answer and stated it to the owner, with an offer to change item 1.

| Decision | Reading recorded | Spec edits |
|---|---|---|
| P-20 pick rule | **Active row first, then lowest PK.** No row is filtered out, so OQ-1 holds. Prod ambiguity: 135 groups → 20 | `design.md` §5 `toc_results_indicators` row, §1A P-20, §14; `tasks.md` T-6 (gap wording), T-4 Files (the `toc_results_indicators` entry of `label-sources.ts` may change: `is_active` column and comments) |
| Budget | **Overrun accepted.** New escalation point: total LOC > ~2 800 (2× the §13 estimate). Recorded as an owner decision, not `auto-approved` | none (design §13 stays as the original estimate) |
| T-1 spec tension | **Approved.** T-1 may touch the §1A rows | `tasks.md` T-1 Verification amended |

- **Sweep:** `grep "lowest PK wins"` over `requirements.md`, `design.md` and `tasks.md` → no matches. The registry comments at `label-sources.ts:84-85,429` still say "lowest primary key wins" for indicators; T-4 updates them, per its amended Files line. `toc_melia_studies` keeps "lowest PK" (P-18: equal titles).
- **Superseded:** the forward pointer "ToC indicator pick rule: lowest PK" (T-2 table) → active row first, then lowest PK.
- **Carry to the T-4 Reviewer brief:** conformance to `design.md` §5 (indicators row), §1A P-20 and §14, as amended at this gate.

### QVL-T-4 — Resolver: batched label reads

- **Final status:** PASS
- **Date:** 2026-11-10
- **Implementer attempts:** 1 (+1 continuation)
- **Skills / effort:** `nestjs-expert`, `tdd`, `error-handling-patterns` (task defaults) · effort **`high`**, one level above the T2 default. Reason: SQL over 30+ tables, where a wrong key column or pick rule fails silently
- **Attempt 1**
  - **Files changed:** `onecgiar-pr-server/src/api/qa-catalog/values/label.resolver.ts` (new, 302 lines), `label.resolver.spec.ts` (new, 479 lines, 25 tests); `label-sources.ts` (the `toc_results_indicators` entry adds `is_active` to its columns and changes its `sql` cite to `938,1023-1030`; the pick-rule comments and the `TocSource.columns` doc comment are corrected)
  - **Implementer verification:** `npx jest src/api/qa-catalog/values/label.resolver src/api/qa-catalog/values/label-sources src/api/qa-catalog/values/read-plan src/api/qa-catalog/values/lookup-sources --silent --reporters=summary --maxWorkers=2` → 4 suites, 210 passed; `npx tsc --noEmit` clean; eslint clean
  - **1 vs 50:** 6 statements each (`clarisa_countries`, `clarisa_institutions`, `clarisa_center` hop 1, `clarisa_institutions` hop 2, `result`, `toc_results`); every statement in the 50-id batch carries 50 ids
  - **Falsifier reds** (applied to the final code, run, reverted; byte-identical restore):
    1. One query per id → `✕ a union of 1 id and a union of 50 ids over the same lists issue the same statements` (`- Expected - 0 / + Received + 147`); `✕ the 50-id batch really carries 50 ids per statement ...` (`Expected: 50 / Received: 1`); `✕ lists that share a table share ONE statement, and each list keeps only its own ids` (`+ Received + 3`)
    2. `eq is_active 1` filter → `✕ an INACTIVE row still labels (OQ-1)` (`- "301": "Retired Partner", / + "301": null,`), plus 9 other tests
    3. Drop ids with no row → `✕ an id with no row is null and stays in the map; the other ids are answered (QVL-R-4)` (`- "999": null,`)
    4. Read `clarisa_center` without the chain → `✕ reads the center, then its institution, and labels acronym - name` (`- "CENTER-02": "CIAT - International Center for Tropical Agriculture", / + "CENTER-02": null,`)
    5. Indicators by lowest PK only → `✕ indicators: the ACTIVE row with the lowest pk wins, whatever the order the rows arrive in` (`- "node-1": "Active low", / + "node-1": "Inactive low",`)
    6. Pick by returned row order (reversing runner) → 3 reds, incl. `✕ melias: the lowest pk wins, whatever the order the rows arrive in` (`- "m-1": "Lowest pk", / + "m-1": "Higher pk",`)
  - **Not Done / Assumptions (Implementer):** the `<` assertion would 500 a batch on user-entered text, so it **needed an owner decision**. Plus assumptions with no owed item: no red-before-green (greenfield; mutation reds stand in); the first row by key order wins on a non-unique table key (none today); driver errors propagate raw to T-5's `guarded`; an unknown list throws; keys match case-insensitively (column collation).
- **Spec tension → owner decision (2026-11-10):** T-4 "asserts that no label contains `<`" vs QVL-R-4 "Resolution of one id SHALL never fail the batch". The owner chose **"Keep text, no check"**. Execute-time spec edits: `requirements.md` QVL-R-3 clarified ("never contains HTML **that the server adds** … a stored text with `<` is returned as-is and never fails the batch"); `tasks.md` T-4 Description (assertion struck) and §5 coverage row R-3. Two-direction sweep: `grep -nE "contains \`<\`|no \`<\`|never contains HTML|no markup|strips no HTML"` over the three spec documents → only the amended text remains.
- **Continuation 1** (owed item from the owner decision; no attempt consumed): removed the markup check (`put` helper; 4 call sites became `out.set`); fixed the header comments; replaced the exact-markup-failure spec with `a stored text that holds < comes back as-is and the batch answers (QVL-R-3 amended, R-4)`. The red for the old assertion re-applied: `label resolver: list results built a label with markup` / `Tests: 1 failed, 24 passed, 25 total`. **Slip disclosed:** the spec file was truncated mid-edit (the "statements depend on the lists" block was lost) and then restored; the Reviewer confirmed the block is intact (3 tests).
- **Evidence re-run (Leader, inline, non-author), after the continuation:** the same 4-suite jest command → `Tests: 210 passed, 210 total`; `npx tsc --noEmit` → exit 0; the resolver spec has 25 tests in 6 describe blocks. **VERIFIED**
- **Reviewer verdict:** `PASS` (lens-checklist). Conforms to the task, R-1/2/3/4/7/9, NFR §6, D-5, design §2.2/§5/§7/§8/DD-3 and P-5/P-6/P-20. All four forward pointers hold, and so do all the execute-time edits. Statement grouping matches §8 (`toc_results` + `eoi_outcomes` share one statement). An undefined ToC source throws before any query (`calls: []`). Messages carry only the public control-list name. Output keys are the exact `union` ids. All 7 reds fail on behavioral assertions. The `TocSource.columns` doc-comment edit is accepted as within "fix its pick-rule comments".
  - **runtime events:** none
- **continuations:** 1 (remove the `<` assertion after the owner decision)
- **spawns:** implementer 39 calls, 189 707 tokens, ended partial (owner decision owed); implementer (continuation, resumed) 10 calls, 200 225 tokens cumulative, ended complete; reviewer 13 calls, 82 606 tokens, ended complete
- **ADVISORY (4R, Reviewer; recorded only):**
  - RISK/READABILITY: active-first is switched on implicitly by `columns.includes('is_active')`. Adding `is_active` to another ToC source later would silently change its pick rule. An explicit `pick` field, or a registry spec that only indicators list `is_active`, would close this.
  - RELIABILITY: lower-casing keys merges ids that differ only in case on a case-sensitive collation, and MySQL PAD SPACE (`'X '` = `'X'`) misses in the TypeScript lookup, giving `null`. **Forward pointer to T-6 (contract gap).**
  - RELIABILITY: table and chain sources take the first row by key order. That is deterministic only while the key is unique; no spec pins uniqueness for code keys (`clarisa_subnational_scopes.code`, `clarisa_regions.um49Code`).
  - RESILIENCE: the chain skips hop 2 when no hop-1 row has a foreign key, so §8's "+1 per chain" is an upper bound. **Forward pointer to T-6 (one contract line).**
  - READABILITY: the Implementer's note describes an "exact post-check" that does not exist as such; the map lookup does that job.
  - READABILITY: the fixture runner sorts text `orderBy` keys with `Number(...)` (NaN; order undefined). It is harmless while no spec relies on fixture order.
- **Requirements covered:** QVL-R-3 (server adds no markup; stored `<` as-is), QVL-R-4 (both scenarios), QVL-R-7, QVL-R-9 (throws propagate; no partial map), D-5; AC-3, AC-5 (unit level)
- **Decisions made:** the owner decision on `<` (above), with execute-time edits to `requirements.md` QVL-R-3 and `tasks.md` T-4 and §5
- **Issues encountered:** the VPN dropped (test DB `ETIMEDOUT`) before the Leader could count stored `<` titles. That count was informational and not needed after the owner decision.
- **Budget running totals:** tasks 4 / 7 · LOC code + tests ≈ 2 000 (+ ~790 this task) · review rounds 6 / ~10. Above the §13 estimate of ~1 400; overrun accepted by the owner on 2026-11-09, with the re-escalation point at ~2 800.
- **Final verification:** green (re-run VERIFIED, Reviewer PASS)

### Forward pointers (added after T-4)

| To task | Pointer | Source |
|---|---|---|
| QVL-T-5 | Call `resolveLabels(union, { run, env })` inside `guarded` with the counted `run`. Driver errors and the unavailable-ToC throw propagate raw; `guarded` must turn them into the generic 500 (R-9). Collect with `collectLabels(results, toRead)`, where `toRead` is the returned fields only (T-3 pointer) | T-4 report |
| QVL-T-6 | Contract gaps: (a) the chain's second statement is skipped when no hop-1 row has a foreign key, so "+1 per chain" is an upper bound; (b) keys match case-insensitively, per column collation; a trailing-space id gives `null` | T-4 Reviewer ADVISORY |

### QVL-T-5 — Wire `labels` into `details`

- **Final status:** PASS
- **Date:** 2026-11-10
- **Implementer attempts:** 1
- **Skills / effort:** `nestjs-expert`, `api-design-principles`, `tdd` (task defaults) · effort **`high`**, one level above the T2 default. Reason: a payload contract change in a shared service
- **Attempt 1**
  - **Files changed:**
    - `onecgiar-pr-server/src/api/qa-catalog/qa-results.service.ts` (+40). After projection, `collectLabels(projected, toRead)` and `resolveLabels(union, { run, env })` run inside one `guarded`, through the counted `run`. `sliceLabels` builds a new per-result object, and items become `{ ...item, labels }`.
    - `dto/qa-results-response.dto.ts` (+10): `QaResultsDetailsItem.labels`, typed and documented.
    - `qa-results.details.spec.ts` (+336): the `:218` pin, the log assertion, and a new `labels` block.
  - **Implementer verification:**
    - `npx jest src/api/qa-catalog --silent --reporters=summary --forceExit --maxWorkers=2` → 51 suites, 1227 passed. The snapshot guard is included, and `catalog_version` stays 2026.34.
    - `npx eslint "src/api/qa-catalog/**/*.ts" --quiet` → clean.
    - `npx tsc --noEmit` → clean.
  - **Reds (verbatim):**
    - Pin, before the spec update: `> 218 | expect(Object.keys(res.results[0]).sort()).toEqual(` / `+   "labels",`
    - Old log assertion: received `"route=/api/qa/results/details year=2026 eligible=1 not_eligible=1 statements=2 labels=0 duration_ms=0"`
    - F1, collect from raw `values` before `project`/`normalize`: `"capdev_training_lengths": Object { - "4": "Long-term", + "1": "PhD",` (2 specs)
    - F2, `resolveLabels` outside `guarded`: `Expected constructor: InternalServerErrorException` / `Received constructor: Error` (2 specs)
    - F3, mutate `values` in place: the golden `expect(realSerialized).toBe(stubbed)` fails. The stubbed run had `"countries":{"840":null}` and the real run `"countries":{"840":"United States"}`, plus keys added inside `values`. The normalized-value spec also fails.
  - **Evidence re-run (Leader, inline, non-author):**
    - The same jest command → `Tests: 1227 passed, 1227 total`.
    - eslint → exit 0.
    - `tsc` → exit 0.
    - **VERIFIED**
  - **Reviewer verdict: `PASS`** (lens checklist). Points the Reviewer checked:
    - Labels are collected from the projected, normalized `values` with `toRead`.
    - Collection and resolution run inside `guarded` through the counted `run`, and `values` is never written.
    - The log line carries counts only.
    - The R-3 clarification holds, because `sliceLabels` adds no markup.
    - D-9 holds.
    - The golden meets its Disqualifier: two separate instances, each serialized at production time, and `toHaveBeenCalledTimes(1)` shows the stub was really used.
    - Mixed-type batches are sound for every catalog shape. Subfields carry no `result_types`, and the collector walks only the keys a result holds.
    - R-9: the body is `READ_FAILED_MESSAGE`, and the log holds only the error class. The driver case fails on a table only the label step reads.
    - `labels=` (sum per result) matches §9's "pairs in the response".
    - Swagger needs no decorator. §4 names the interface file as "the Swagger DTO", and the route has no response schema.
  - **runtime events:** none
- **continuations:** none
- **spawns:**
  - implementer: 35 calls, 179 569 tokens, ended partial (assumptions only, no owed item)
  - reviewer: 20 calls, 83 923 tokens, ended complete
- **Not Done / Assumptions (Implementer, verbatim gist):**
  - "Position and meaning of `labels=` (after `statements=`, per-result sum) are my reading of design §9. The task did not fix either." The Reviewer judged this acceptable.
  - The new specs build their own labelled fixtures inside the spec file. Existing `SOURCE` fields carry no `control_list`, so older specs see `labels: {}`.
  - The reds for the pin and the log line came from running the new service against the old spec. The behaviour specs were written after the code, and the falsifiers show them red.
- **ADVISORY (4R, Reviewer; recorded only, never gates):**
  - RELIABILITY: the golden body `[2,1,3]` has no ineligible id, so `not_eligible` is covered only as "both empty".
  - READABILITY: `labels=` counts a shared id once per result. **Forward pointer to T-6** (contract and log docs).
  - RISK: the golden's `jest.spyOn` relies on CommonJS output from ts-jest. Under ESM, the `toHaveBeenCalledTimes(1)` check would fail loudly.
- **Requirements covered:** QVL-R-1, R-2 (end to end), R-5, R-6, R-9, R-10; NFR Observability and Privacy; D-4, D-8, D-9; AC-4, AC-7
- **Decisions made:** none beyond the Implementer's reading of `labels=`, which the Reviewer accepted.
- **Issues encountered:** none
- **Budget running totals:**
  - tasks: 5 / 7
  - LOC code + tests: ≈ 2 380 (+378 this task)
  - review rounds: 7 / ~10
  - The owner's re-escalation point is ~2 800 LOC, and T-6 adds only docs and the QA fixture.
- **Final verification:** green (re-run VERIFIED, Reviewer PASS)

### Forward pointers (added after T-5)

| To task | Pointer | Source |
|---|---|---|
| QVL-T-6 | Document the log field: `labels=<n>` follows `statements=`, and is the sum over results of the (list, id) pairs each result holds, so a shared id counts once per result | T-5 report and Reviewer ADVISORY |

### Owner decisions before T-6 (2026-11-10)

| Decision | Reading recorded | Spec edits |
|---|---|---|
| T-6 scope | **`onecgiar_pr` only.** Update `qa-catalog.en.md` (details example with `labels`, synthetic data, the `labels=` log note). `onecgiar_qa` is not touched: QA copies its fixture from the contract example inside its own spec (`assessment/step-1-assessment`). A standalone example, if needed, lives under `onecgiar-pr-server/docs/` | `tasks.md` T-6 Description, Files, Verification, Falsifier, Consumers, DoD |
| Push | **Ordered** ("Haz push"). Branch `JuanGuzman-io/p2-3910-qa-value-labels` only. The merge to `performance-refactor` is not part of this order | `tasks.md` T-6 DoD |
