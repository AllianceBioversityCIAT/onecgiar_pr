# Execution — 2026 result PDFs lose their type-specific section

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/pdf-2026-type-section` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` @ `f229d0610` |
| Leader | Claude Code session `f11feeed`, Opus 5.5 |
| Implementer / Reviewer | `.claude/agents/akili-implementer.md` (T2 `sonnet`) / `.claude/agents/akili-reviewer.md` (T3 `opus`) |
| Persona check | `akili doctor --agents` (v2.42.0), 2026-11-12: implementer and reviewer CURRENT. leader `primary-instructions` OUTDATED (matched 2.36.0). tester `context-alignment` CUSTOM-EDITED. Not fixed in this run, because `.agents/` is a shared file. Reported to the user |
| Started | 2026-11-12 |

## How this spec runs

Every DB statement is run by Santiago in DBeaver (tasks.md §2, DD-5). The agents never connect to a database. The flow for each task:
1. The Leader turns the task's steps into queries and pastes them in chat, labelled with the environment and read-only or write.
2. Santiago runs them and pastes the results back.
3. The Leader copies each pasted result verbatim from the session transcript into the session scratchpad. It never retypes them.
4. The Implementer builds the task's files and evidence from those copies.
5. The Reviewer audits the result.

**PROD body from the proposal (source for P-9):** the 2026-11-12 paste is not stored in the repo. It was recovered verbatim from the specify session transcript (`1775878e…jsonl`, line 1459, user message at 2026-11-12T19:06:31Z). The Leader copied it to the session scratchpad as `prod_paste_resultFullData.txt`.

## Task Execution History

### PTS-T-1 — Settle premises and capture the TEST baseline — PASS (attempt 2)

- **Date:** 2026-11-12
- **Skills:** `systematic-debugging` (as the task lists). Effort `medium`.
- **Round 1 (TEST, read-only), sent to Santiago 2026-11-12:**
  - `SHOW CREATE FUNCTION` of `resultFullDataByResultCode`, `reportSectionSevenByResultCode_P25`, `resultFullDataByIPSRCode`, `tocInfoByResultCode` and `reportBasicInfoByResultCode`
  - the version table with active type 1–9 result counts
  - the DB-side callers in `information_schema`
  - the 27926 reproduction on versions 6 and 8
- **Round 1 received** 2026-11-12T19:35:46Z.
  - The five `SHOW CREATE FUNCTION` outputs were copied verbatim from the session transcript into the scratchpad as `test_show_create_<function>.sql`.
  - The version table (Q4) arrived as a screenshot (`images/30.png`).
  - Q5 (DB-side callers) returned no rows. Q6 (27926 on versions 6 and 8) returned no rows, because versions 6 and 8 do not exist on TEST.
- **Leader decision (execute-time spec edit, 2026-11-12):** `tasks.md` §2 Pre-flight gained the version-id clarification. Reporting 2025 and 2026 are versions 6 and 8 on PROD, and 34 and 36 on TEST.
  - Reason: the TEST version table, and the TEST body gating on `= 34`.
  - It does not change the meaning of any approved requirement.
  - Carried to the Reviewer as a named conformance check.
- **Spec tension raised at the gate (2026-11-12):** `tasks.md` T-1 step 6 asks for a type 4 or 8 sample "with non-empty P25 type data". `reportSectionSevenByResultCode_P25` (TEST body) builds only types 1, 2, 5, 6 and 7. Its `else` branch sets the response to NULL, so a type 4 or 8 result can never have non-empty P25 type data. The user was given a one-line amendment proposal.
- **Round 2 (TEST, read-only), sent 2026-11-12:**
  - `portfolio_id` of versions 30, 34 and 36
  - 27926 on TEST
  - candidate samples with their current-function baseline (error flag, key count, P25 keys missing, MD5 "same output" hash)
  - the guard outputs
- **Round 2 received** as screenshots: `images/31.png` (R2-Q1), `32.png` (R2-Q2), `33.png` (R2-Q3, 47 rows), `34.png` (R2-Q4).
  - **R2-Q1:** v30 Reporting 2024 → portfolio 2; v34 Reporting 2025 → portfolio 3; v36 Reporting 2026 → portfolio 3.
  - **R2-Q2:** no rows. 27926 does not exist on TEST.
  - **R2-Q3:** the hashes cannot be taken from a screenshot as evidence, so round 3 re-captures them as text. Two findings shaped the decisions below:
    - On v34, P25 keys are missing from the current payload as well. `json_merge_patch` drops null-valued keys.
    - Every type 4/8 row has `p25_not_null = 0`. Also: 10092 (v36, type 7) has a NULL P25 output, and 10036 (v36, type 4) returns only 2 keys. Neither is a sample.
  - **R2-Q4** (read from the screenshot; text, not a hash):
    - nonexistent, v36 and v34 → `{"error": "The result with code 999999999 does not exist"}`
    - empty URL, v36 and v34, code 347 → `{"internal_error": "The provided PDF URL cannot be empty"}`
    - type 10, v37, code 9733 → `{"error": "The result with code 9733 has a type not supported by this report"}`
- **User decisions, 2026-11-12, via AskUserQuestion:**
  1. Type 4/8: "Key check only".
  2. T-2 (c): "No live P25 key missing".
- **Spec edits made on those decisions**, all carried to the Reviewer as named conformance checks:
  - `tasks.md` §2: the live P25 key definition
  - T-1 step 6, step 7, Verification and Falsifier
  - T-2 (c) and the T-2 Red run
  - §5 rows R-1 S1 and R-1 S2
  - the `requirements.md` §3 Glossary "Type section" clarification
- **Correction-closure sweep** (grep `key count|key set|4 or 8|non-NULL|non-empty P25|type key|inert` over the spec folder): every hit was amended or still holds.
  - `requirements.md` R-1 S1 "same key set" still binds 27926 (checked in T-3).
  - `requirements.md` §7 and `design.md` P-4 wording still hold.
- **Round 3 (TEST, read-only), sent 2026-11-12, text output requested:**
  - Samples are codes active on both v34 and v36, at most 2 per type.
  - Types 1, 2, 5, 6 and 7 must have a non-NULL P25 output on v36. Types 4 and 8 are taken as they are.
  - Pre-2025 samples: v30 8540 (type 2) and 8649 (type 6).
  - Columns: error flag, key count, live P25 keys missing, MD5 hash.
- **Round 3 received** as a screenshot (`images/35.png`, 16 rows). The hashes are not taken from the image.
  - **v34:** `live_p25_keys_missing` is empty on every row. This confirms that the round-2 v34 gaps were null-valued keys.
  - **v36:**
    - 6475 (type 1) is missing `policy_amount, policy_implementing_organizations, policy_stage`.
    - 9073 and 9088 (type 2) are missing `innovation_use_actors`.
    - 8555 (type 7) is missing `innovation_investments, innovation_nature, innovation_type`.
    - 9074 (type 7) is missing `innovation_actors, innovation_investments, innovation_organizations`.
    - 7543 (type 5) is missing nothing, so it is inert. 7568 (type 5) has a NULL P25 output on v34.
  - **v30:** 8540 is missing `innovation_use_actors` (legacy path, expected). 8649 is missing kp_* keys (expected).
  - **No rows** for type 6, 4 or 8 among codes active on both v34 and v36. On TEST, those 2026 results are not carried over from 2025.
- **Round 4 (TEST, read-only), sent 2026-11-12:** the final sample set in one query, text output requested again.
  - the round-3 pairs
  - v34 types 4, 6 and 8 (8434, 8787, 8462)
  - v30 8540 and 8649
  - the 6 most recent v36 results of types 4, 5, 6 and 8, with no v34 requirement
- **Round 4 received** as a screenshot (`images/36.png`, 41 rows). The user does not copy grids as text.
  - **Leader decision:** the Implementer copies the hashes from the image. A check query (TEST, read-only) then compares each copied hash with the live function and returns 1 or 0. The user sends that 1/0 result as a screenshot.
  - Why this is safe: a misread hash can only show up as a false 0. It can never produce a false match.
  - No DB writes and no extra objects are created.
- **User decision 2026-11-12 (AskUserQuestion):** type 5 → "Key check, like 4/8". Reason: all 7 TEST 2026 type 5 candidates are missing no live P25 key.
- **Spec edits made on that decision**, carried to the Reviewer:
  - `tasks.md` T-1 step 6 now separates falsifier samples (types 1, 2, 6, 7) from key-check samples (types 4, 5, 8). For key-check samples, the v6 comparison is marked N/A when no v6 code exists.
  - T-1 Verification now requires the hash check query (`same_as_t1 = 1`).
  - T-1 Falsifier and the T-2 (c) pass rule are amended.
  - The T-2 Falsifier now covers only the falsifier samples.
  - §5 row R-1 S2 is amended.
- **Finding outside scope, for the user (not fixed here):** v36 results 9983, 10001, 10010 and 10036 (type 4), and 10071 and 10072 (type 8), return a payload with only the generation-date keys. Their hash is `99914b932bd37a50b983c5e7c90ae93b`, which is MD5 of `{}`. So basic, type and ToC data are all NULL, and the 2026 PDF of these results would be empty. The likely cause is that they are missing from `result_phase_2025` for their `phase_name` (UNVERIFIED — confirm at source before relying on it).


#### T-1 evidence (Implementer, attempt 1)

Sources: `sql/resultFullDataByResultCode.before.sql` is a byte copy (`cp`, `cmp` identical) of the verbatim TEST `SHOW CREATE FUNCTION` output. Screenshots `30.png`..`36.png` hold the query results. No agent touched a DB.

**Before-file.** `sql/resultFullDataByResultCode.before.sql` starts with ``CREATE DEFINER=`prdbusertst`@`%` FUNCTION `resultFullDataByResultCode`(``, no header comment.

##### P-9 — TEST body vs PROD body: REFUTED

`diff` of the PROD paste body (2026-11-12, between the `<pasted_content>` tags) against `before.sql`, CRLF stripped, found 2 differing lines:

| Line | PROD | TEST |
|---|---|---|
| 1 | ``CREATE DEFINER=`prmsadmin`@`%` FUNCTION …`` | ``CREATE DEFINER=`prdbusertst`@`%` FUNCTION …`` |
| 39 | `if p_version_id = 6 then` | `if p_version_id = 34 then` |

The rest is identical. Consequence for T-3: the PROD rollback must be PROD's own body (definer `prmsadmin`, `= 6`), never `before.sql`.

##### P-3 — Versions with phase_year >= 2025 (from `30.png`): CONFIRMED

| id | phase_name | year | app_module_id | active type 1-9 results |
|---|---|---|---|---|
| 14 | ddddd | 2025 | 1 | 0 |
| 16 | Test | 2025 | 1 | 0 |
| 21 | IPSR 2025 | 2025 | 2 | 0 |
| 22 | IPSR 2025 | 2025 | 2 | 0 |
| 31 | IPSR 2025 | 2025 | 2 | 0 |
| 32 | Reporting 2025 | 2025 | 1 | 0 |
| 33 | Reporting 2025 | 2025 | 1 | 0 |
| **34** | Reporting 2025 | 2025 | 1 | **1,562** |
| **36** | Reporting 2026 | 2026 | 1 | **1,402** |
| 37 | IPSR 2026 | 2026 | 2 | 0 |

Only v34 and v36 hold type 1-9 results with year >= 2025, and both are Reporting (app_module_id 1). Every IPSR version (module 2) with year >= 2025 has 0 results of types 1-9. Verdict: P-3 holds on TEST, so the `phase_year >= 2025` gate adds no IPSR or test-version exposure that has data. (Other rows seen: v1 Reporting 2022 = 3,548; v3 IPSR 2023 = 4; v18 = 477; v30 Reporting 2024 = 299, all year < 2025.) Caveat: this is TEST data. PROD was not queried for P-3.

##### P-4 — P25 builder has no version gate: CONFIRMED (with a NULL branch)

From `test_show_create_reportSectionSevenByResultCode_P25.sql` (677 lines):

- The version is only used as a filter: `select r.result_type_id into rt_id from result r where r.result_code = p_result_code and r.version_id = p_version_id and r.is_active > 0;` (line 6). The `grep` for `phase` found nothing. The only `= 6` in the body is `elseIF rt_id = 6 THEN` (line 312), a result type, not a version.
- It builds types 1, 2, 5, 6, 7 (lines 8, 107, 227, 312, 417).
- Its else branch (lines 673-674) is `else` / `set section_seven_response = null;`. Line 676 then runs `json_merge_patch(section_seven_response, concat('{"result_type_id":', rt_id, "}"))`. Rounds 2 and 4 show `p25_not_null = 0` on every type 4 and 8 row (`33.png`, `36.png`), which matches a NULL result for those types. I did not run the merge on TEST; the observed `p25_not_null = 0` is the evidence, not MySQL's documented behavior.
- So no Pivot trigger: no internal version gate. Types 4 and 8 can never have non-empty P25 type data (key check only, per the user decision).

##### P-5 — Sibling gates (report only, nothing to fix)

| Function | Finding | Line quoted |
|---|---|---|
| `resultFullDataByIPSRCode` | Gates on a year list that skips 2028 | `and `v_phase_year` in (2025, 2026, 2027, 2029, 2030) ) then` (line 72) |
| `reportBasicInfoByResultCode` | Handles 2022-2026 explicitly, any other year falls to the error | `ELSEIF phase_year = 2026 THEN` (line 198), then `"error", "Invalid version id"` (line 254) |
| `tocInfoByResultCode` | Picks P25 by `version.portfolio_id`, not by version id | `IF v_portfolio_id = 3 THEN` (line 19) |

`portfolio_id` of v30 / v34 / v36 = 2 / 3 / 3 (`31.png`), so v34 and v36 both reach the P25 ToC. Impact: `reportBasicInfoByResultCode` returns `{"error":"Invalid version id"}` as basic data for a 2027+ reporting version (gap for the future, outside this spec). For IPSR, 2028 is missing. Both reported to the user per DD-6, not fixed.

##### P-6 — DB-side callers: NONE

Q5 (`information_schema.ROUTINES` and `VIEWS`, `LIKE '%resultFullDataByResultCode%'`): "No records" for both. Repo-side readers stay as in the ledger (PDF path only).

##### Samples and baseline

20 rows (the brief said 21; the listed set is 6 + 3 + 9 + 2 = 20, so 20 is used). Transcribed from `36.png` (round 4). Every hash was cross-checked against `35.png` or `33.png`, marked ✓ when all 32 characters agree. Each hash is 32 hex characters (script check).

| version | type | code | role | has_error | cur_n_keys | p25_not_null | live_p25_keys_missing | cur_hash | cross-check |
|---|---|---|---|---|---|---|---|---|---|
| 30 | 2 | 8540 | pre-2025 | 0 | 42 | 1 | innovation_use_actors | `d67c1d9c09674442285a5e2a2047b8a9` | 35.png ✓ |
| 30 | 6 | 8649 | pre-2025 | 0 | 56 | 1 | kp_agrovocs,kp_authors,kp_cgspace_metadata,kp_comodity,kp_fair_score,kp_handle,kp_keywords,kp_knowledge_product_type,kp_licence,kp_sponsors | `82ec46c69e06fd435a01b34b98755417` | 35.png ✓ |
| 34 | 1 | 6475 | baseline v34 | 0 | 55 | 1 | NULL | `bf889ef21ef973e5497b4e78b3bfb8b2` | 35.png ✓ |
| 34 | 2 | 9073 | baseline v34 | 0 | 51 | 1 | NULL | `cf32f17735c987e02845d8c22e870dbe` | 35.png ✓ |
| 34 | 2 | 9088 | baseline v34 | 0 | 49 | 1 | NULL | `0ce7c6a32ad78296d45cb9568105bb0f` | 35.png ✓ |
| 34 | 4 | 8434 | baseline v34 | 0 | 46 | 0 | NULL | `ff7ed6e952d630f973589a59688ea99a` | 33.png ✓ |
| 34 | 5 | 7543 | baseline v34 | 0 | 55 | 1 | NULL | `1aa5ba6a63648500ae06b9acaedc9d54` | 35.png ✓ |
| 34 | 6 | 8787 | baseline v34 | 0 | 57 | 1 | NULL | `b06cb0aa4f6211f6e3bf430b2ecd9374` | 33.png ✓ |
| 34 | 7 | 8555 | baseline v34 | 0 | 58 | 1 | NULL | `cb1afcfe2f4d685dfe337eab521cd138` | 35.png ✓ |
| 34 | 7 | 9074 | baseline v34 | 0 | 54 | 1 | NULL | `e7d9246b8d5953328a1e085e69ee534b` | 35.png ✓ |
| 34 | 8 | 8462 | baseline v34 | 0 | 46 | 0 | NULL | `b940c6bde6a1ef0e549ce80ce7f1e338` | 33.png ✓ |
| 36 | 1 | 6475 | falsifier | 0 | 56 | 1 | policy_amount,policy_implementing_organizations,policy_stage | `308e27277769f856b5e5294aa3ad867b` | 35.png ✓ |
| 36 | 2 | 9073 | falsifier | 0 | 48 | 1 | innovation_use_actors | `8abdd7b768e8b1540e55619f1cd89414` | 35.png ✓ |
| 36 | 2 | 9088 | falsifier | 0 | 50 | 1 | innovation_use_actors | `fe19f55f7e48fce16f9b045dc870770e` | 35.png ✓ |
| 36 | 6 | 9980 | falsifier | 0 | 63 | 1 | kp_agrovocs,kp_authors,kp_cgspace_metadata,kp_comodity,kp_fair_score,kp_handle,kp_keywords,kp_knowledge_product_type,kp_licence,kp_sponsors | `c9ce58a56426f70379cfd4be0a39020c` | 33.png ✓ |
| 36 | 7 | 8555 | falsifier | 0 | 66 | 1 | innovation_investments,innovation_nature,innovation_type | `8badd3c5e179fa171a7c217d40746f4d` | 35.png ✓ |
| 36 | 7 | 9074 | falsifier | 0 | 60 | 1 | innovation_actors,innovation_investments,innovation_organizations | `f8e6928a2718cceb82887cdc8cda8968` | 35.png ✓ |
| 36 | 4 | 10059 | key-check | 0 | 46 | 0 | NULL | `6cba86f3309259c6e803683d3c855c6a` | 33.png ✓ |
| 36 | 5 | 7543 | key-check | 0 | 57 | 1 | NULL | `67f9875cdd8c6916631c2ebb127a1ecf` | 35.png ✓ |
| 36 | 8 | 10074 | key-check | 0 | 48 | 0 | NULL | `3ae5238fd41de3ac8eec5b3a68f70672` | 33.png ✓ |

Falsifier rule (all six v36 falsifier samples): each shows a non-empty `live_p25_keys_missing` and `p25_not_null = 1`. None is inert. The key-check samples (10059 t4, 7543 t5, 10074 t8) are exempt: `p25_not_null = 0` for t4/t8 by construction, and 7543 is missing no live key. v34 and v30 rows are baselines only, not falsifiers. Sample 7543 exists on both v34 and v36, so its v34-vs-v36 comparison applies. 10059 and 10074 are v36-only, so their v34 comparison is N/A. No sample carries `error` or `internal_error` (`has_error = 0` on all 20).

##### Guards baseline (from `34.png`)

| case_name | output |
|---|---|
| nonexistent, v36 | `{"error": "The result with code 999999999 does not exist"}` |
| nonexistent, v34 | `{"error": "The result with code 999999999 does not exist"}` |
| empty url, v36 code 347 | `{"internal_error": "The provided PDF URL cannot be empty"}` |
| empty url, v34 code 347 | `{"internal_error": "The provided PDF URL cannot be empty"}` |
| type 10, v37 code 9733 | `{"error": "The result with code 9733 has a type not supported by this report"}` |

##### Red run (TEST)

27926 does not exist on TEST (`32.png`, no rows). Substitute: v36 result 9073 (type 2), `live_p25_keys_missing = innovation_use_actors`, `cur_n_keys = 48`, against the same code on v34 with `cur_n_keys = 51` and nothing missing (`35.png`, rows 4-5). PROD observation of 27926 (NULL actors on v8, array on v6) stays as recorded in the task.

##### Hash check query (TEST, read-only; T-2 reuses it)

Run before T-1 closes. Expected: `same_as_t1 = 1` on all 20 rows. A 0 means either a misread hash or a function that changed.

```sql
SELECT s.version_id, s.result_code,
       (MD5(CAST(JSON_REMOVE(resultFullDataByResultCode(s.result_code, s.version_id, 'x'),
                             '$.generation_date_footer', '$.generation_date_filename') AS CHAR)) = s.baseline) AS same_as_t1
FROM (
    SELECT 30 AS version_id, 8540 AS result_code, 'd67c1d9c09674442285a5e2a2047b8a9' AS baseline UNION ALL
    SELECT 30 AS version_id, 8649 AS result_code, '82ec46c69e06fd435a01b34b98755417' AS baseline UNION ALL
    SELECT 34 AS version_id, 6475 AS result_code, 'bf889ef21ef973e5497b4e78b3bfb8b2' AS baseline UNION ALL
    SELECT 34 AS version_id, 7543 AS result_code, '1aa5ba6a63648500ae06b9acaedc9d54' AS baseline UNION ALL
    SELECT 34 AS version_id, 8434 AS result_code, 'ff7ed6e952d630f973589a59688ea99a' AS baseline UNION ALL
    SELECT 34 AS version_id, 8462 AS result_code, 'b940c6bde6a1ef0e549ce80ce7f1e338' AS baseline UNION ALL
    SELECT 34 AS version_id, 8555 AS result_code, 'cb1afcfe2f4d685dfe337eab521cd138' AS baseline UNION ALL
    SELECT 34 AS version_id, 8787 AS result_code, 'b06cb0aa4f6211f6e3bf430b2ecd9374' AS baseline UNION ALL
    SELECT 34 AS version_id, 9073 AS result_code, 'cf32f17735c987e02845d8c22e870dbe' AS baseline UNION ALL
    SELECT 34 AS version_id, 9074 AS result_code, 'e7d9246b8d5953328a1e085e69ee534b' AS baseline UNION ALL
    SELECT 34 AS version_id, 9088 AS result_code, '0ce7c6a32ad78296d45cb9568105bb0f' AS baseline UNION ALL
    SELECT 36 AS version_id, 6475 AS result_code, '308e27277769f856b5e5294aa3ad867b' AS baseline UNION ALL
    SELECT 36 AS version_id, 7543 AS result_code, '67f9875cdd8c6916631c2ebb127a1ecf' AS baseline UNION ALL
    SELECT 36 AS version_id, 8555 AS result_code, '8badd3c5e179fa171a7c217d40746f4d' AS baseline UNION ALL
    SELECT 36 AS version_id, 9073 AS result_code, '8abdd7b768e8b1540e55619f1cd89414' AS baseline UNION ALL
    SELECT 36 AS version_id, 9074 AS result_code, 'f8e6928a2718cceb82887cdc8cda8968' AS baseline UNION ALL
    SELECT 36 AS version_id, 9088 AS result_code, 'fe19f55f7e48fce16f9b045dc870770e' AS baseline UNION ALL
    SELECT 36 AS version_id, 9980 AS result_code, 'c9ce58a56426f70379cfd4be0a39020c' AS baseline UNION ALL
    SELECT 36 AS version_id, 10059 AS result_code, '6cba86f3309259c6e803683d3c855c6a' AS baseline UNION ALL
    SELECT 36 AS version_id, 10074 AS result_code, '3ae5238fd41de3ac8eec5b3a68f70672' AS baseline
) s
ORDER BY s.version_id, s.result_code;
```

#### Live P25 key query: round 4, verbatim as sent (Leader record, attempt 2)

This is the query that produced the T-1 baseline (`images/36.png`). It was copied from the session transcript, from the assistant message at 2026-11-12T19:51:58Z, with no retyping. Round 3 used the same column definitions; only its `ORDER BY` differs.

Its `live_p25_keys_missing` column is the **live P25 key** computation that `tasks.md` §2 defines. T-1 Falsifier, T-2 (c), T-2 Red run and T-3 reuse that column **unchanged**:
- the `JSON_TYPE(...) <> 'NULL'` filter keeps only non-null P25 values;
- `JSON_CONTAINS_PATH(cur, ...) = 0` keeps keys absent from the payload.

Round 2 used a variant without the null filter. That variant flags null-valued keys as missing (e.g. `capdev_organizations` on v36 type 5, `images/33.png`), so it must not be used for a pass/fail rule.

```sql
-- ===== TEST · READ-ONLY · PTS-T-1 round 4 (final sample set) =====
WITH v36_extra AS (
  SELECT y.result_type_id, y.result_code, 36 AS version_id
  FROM (SELECT r.result_type_id, r.result_code,
               ROW_NUMBER() OVER (PARTITION BY r.result_type_id ORDER BY r.result_code DESC) AS rn
        FROM result r
        WHERE r.version_id = 36 AND r.is_active > 0
          AND r.result_type_id IN (4, 5, 6, 8)) y
  WHERE y.rn <= 6
),
s AS (
  SELECT r.result_type_id, r.result_code, r.version_id
  FROM result r
  WHERE r.is_active > 0 AND (
        (r.version_id IN (34, 36) AND r.result_code IN (6475, 9073, 9088, 7543, 8555, 9074))
     OR (r.version_id = 34 AND r.result_code IN (8434, 8787, 8462))
     OR (r.version_id = 30 AND r.result_code IN (8540, 8649)))
  UNION
  SELECT result_type_id, result_code, version_id FROM v36_extra
),
f AS (
  SELECT s.result_type_id, s.result_code, s.version_id,
         resultFullDataByResultCode(s.result_code, s.version_id, 'x') AS cur,
         reportSectionSevenByResultCode_P25(s.result_code, s.version_id) AS p25
  FROM s
  LIMIT 1000
)
SELECT f.result_type_id, f.result_code, f.version_id,
       JSON_CONTAINS_PATH(f.cur, 'one', '$.error', '$.internal_error') AS has_error,
       JSON_LENGTH(JSON_KEYS(f.cur))                                    AS cur_n_keys,
       f.p25 IS NOT NULL                                                AS p25_not_null,
       (SELECT GROUP_CONCAT(jt.k ORDER BY jt.k SEPARATOR ',')
          FROM JSON_TABLE(JSON_KEYS(f.p25), '$[*]' COLUMNS (k VARCHAR(100) PATH '$')) jt
         WHERE JSON_TYPE(JSON_EXTRACT(f.p25, CONCAT('$.', jt.k))) <> 'NULL'
           AND JSON_CONTAINS_PATH(f.cur, 'one', CONCAT('$.', jt.k)) = 0) AS live_p25_keys_missing,
       MD5(CAST(JSON_REMOVE(f.cur, '$.generation_date_footer', '$.generation_date_filename') AS CHAR)) AS cur_hash
FROM f
ORDER BY f.version_id, f.result_type_id, f.result_code;
```

#### Hash check result (user, TEST)

`images/37.png`. Santiago ran the T-1 hash check query in DBeaver on the **PRTest** connection, schema `prdb` (shown in the toolbar). Result: `same_as_t1 = 1` on **all 20 rows** (v30 ×2, v34 ×9, v36 ×9). Every baseline hash in the T-1 evidence table is therefore confirmed against the live TEST function, not only against the screenshots.

#### Attempt log (Leader)

- **Attempt 1:**
  - **Implementer** (`akili-implementer`, T2 sonnet, effort medium) produced `sql/resultFullDataByResultCode.before.sql` and the "T-1 evidence" subsection.
  - **Implementer verification:** `cmp` identical; `head -1` = `CREATE DEFINER`; 20 literal rows; all 6 falsifier samples have live keys missing.
  - **Evidence re-run (Leader-inline, non-author): VERIFIED.** Same `head -1`; `cmp` reported identical; 20 literal rows; 20 hash literals.
  - **Reviewer** (`akili-reviewer`, T3 opus): **FAIL**, 1 issue. Verbatim:
    > 1. **Discovered Issue:** `tasks.md` §2 "Live P25 key" says "The `JSON_TABLE` query in `execution.md` (PTS-T-1, round 3) computes it". `execution.md` contains no such query. Its only SQL block is the hash check (l.211-238), and the round 3 entry (l.73-77) lists column names only. The T-1 Falsifier, T-2 (c) and the T-2 Red run all depend on this computation, and the exact form matters:
    >    - Round 2's variant had no null filter. It reported keys such as `capdev_organizations` as missing on v36 type 5 (`33.png`).
    >    - The round 3 and 4 variant has the filter. It reports nothing missing for type 5 (`36.png`).
    >    - If T-2 re-derives the query, it can silently change its own pass rule.
    >    - **Violated Rule:** `tasks.md` §2 "Live P25 key" (a reference that resolves to nothing); T-2 (c) pass rule; brief check (b), consistency.
    >    - **Remediation Suggestion:** In the T-1 evidence, next to the hash check query, record the live-key subquery verbatim as it was sent in chat. Then repoint the `tasks.md` §2 reference to that entry.
  - **Reviewer summary of what passed:** `before.sql` matches DD-4; P-3, P-4, P-5, P-6 and P-9 are correct; the samples follow amended step 6; the hash query uses the exact §2 formula; 10 hashes were spot-checked against `36.png`; no Pivot; no query file; no edits outside the spec folder.
  - **spawns:**
    - implementer: 34 calls, 132,721 tokens, ended partial (the `Not Done` item was the user-run hash check)
    - reviewer: 26 calls, 109,980 tokens, ended fail
- **Attempt 2 (rework, effort high):**
  - **Who fixed it:** the Leader. The FAIL was in text the Leader wrote: its own spec edit (`tasks.md` §2) and its own record of the query rounds, which listed the columns but not the query. The Implementer's deliverables were left unchanged, so no Implementer spawn was needed.
  - **Fixes:**
    - (a) Added the subsection "Live P25 key query: round 4, verbatim as sent". The query was copied by script from the session transcript, with no retyping.
    - (b) `tasks.md` §2 now points to that subsection and states that the round 2 variant is not a pass/fail rule.
  - **Further corrections to the Leader's own edits**, from the Reviewer's readability and reliability advisories. They fix wording the Leader introduced; they add no scope:
    - `tasks.md` T-1 step 6 "Version 6" now covers the v34 extras 8434, 8787 and 8462 (for PTS-R-2 S1).
    - T-2 (c) "reported only" marks the comparison N/A for codes not active on version 6 (9980, 10059, 10074).
    - `requirements.md` §7 row "2026 still missing type keys": red/green applies to types 1, 2, 6 and 7 only.
  - **Re-review:** sent to the same Reviewer context (override e, rework).
- **Forward pointers, recorded now:**
  - **T-2.** `after.sql` will be built from the TEST body, so its `DEFINER` is `prdbusertst`. A PROD apply needs the PROD definer, or a check that compares the body only. The `= 34` / `= 6` difference disappears in `after.sql`.
  - **T-3:**
    - P-9 is refuted, so re-running `before.sql` (the TEST body, `= 34`) on PROD would send Reporting 2025 PDFs to the legacy builder. T-3 step 1 must capture PROD's own body as the PROD rollback file. `tasks.md` §6 Rollback and the T-3 DoD currently say "re-run `before.sql`"; this goes to the user at the T-1 gate as a spec gap.
    - P-3 is verified on TEST only. Read the PROD version table, with type 1–9 counts, before the PROD write.
  - **Archive.** Sync the `design.md` §11 Premise Ledger statuses from the T-1 evidence: P-3, P-4, P-5 and P-6 verified/reported, P-9 refuted.
- **Process note.** The Reviewer saw `docs/specs/changes/innovation-use-w3-hide-2030/` files modified after `before.sql`, so another session is writing in this checkout. Those files are unrelated to this spec, and this spec touches nothing outside its own folder.

#### Closing record (Leader)

- **Attempt 2 Reviewer verdict** (same `akili-reviewer` context, T3 opus, resumed): **PASS**.
  - Summary: "Issue 1 is fixed, the three wording corrections keep every approved requirement's meaning, and T-1's Verification and DoD are met."
  - It confirmed the following:
    - The recorded query matches the SQL pane of `36.png`.
    - The CTE logic reproduces the 41 output rows.
    - `37.png` shows 20 of 20 rows with `same_as_t1 = 1` on PRTest/prdb.
    - No stale restatement is left in the spec folder.
- **Evidence re-run for attempt 2 (Leader-inline): VERIFIED.** No new commands were added in attempt 2. The `head -1` / `cmp` / 20-literal results from attempt 1 still hold, because `before.sql` was not touched.
- **ADVISORY** from the attempt 2 Reviewer:
  - (reliability) Type 5 "cannot be red" was true only of TEST data. → The `requirements.md` §7 row now reads "Type 5 had no red candidate on TEST". A PROD type 5 result with `capdev_organizations` or `capdev_unkown_using` values could show red in T-3.
  - (readability) `tasks.md` §2 "only SQL kept on disk" contradicted the SQL blocks in `execution.md`. → Now reads "only SQL file kept on disk".
  - (readability) "Round 3 used the same final SELECT" was inexact. → It now says only the `ORDER BY` differs.
  - (readability) The 1/0 hash check the user ran was a reformatted copy of the recorded block (positional literal rows). It is sound: 20 of 20 = 1, and the visible literals match. → For T-2, paste the recorded block as it stands.
  - These three post-PASS wording edits fix the Leader's own text. They are carried to the T-2 Reviewer as named conformance checks.
- **spawns (whole task):**
  - implementer: 34 calls, 132,721 tokens, ended partial (attempt 1; the `Not Done` item was the user-run hash check, since done)
  - reviewer: 26 calls, 109,980 tokens, ended fail (attempt 1)
  - reviewer: 7 calls, 133,386 tokens (cumulative context of the resumed agent), ended complete (attempt 2)
- **Requirements covered:**
  - PTS-R-1 / PTS-R-2 / PTS-R-4: evidence base. That covers the samples, the baseline hashes, the guard outputs and the red run on the 9073 substitute.
  - P-3, P-4, P-6 settled; P-5 reported; P-9 refuted.
- **Decisions made:**
  - Version-id mapping (TEST 34/36).
  - Live P25 key definition.
  - Types 4/8 key check (user), type 5 key check (user), T-2 (c) pass rule (user).
  - The Implementer copies the hashes, and the user confirms them with a 1/0 check query.
  - Attempt 2 fixed by the Leader, because the defect was in Leader text.
- **Issues encountered:**
  - The user's DBeaver results arrive as screenshots, so the hashes were confirmed with the 1/0 query.
  - 27926 does not exist on TEST.
  - An empty payload on six v36 type 4/8 results. This is out of scope and was reported to the user.
- **Final verification:** `before.sql` byte-identical to the TEST capture and starting with `CREATE DEFINER`; P-3, P-4, P-5, P-6 and P-9 recorded; six falsifier samples live; hash check 20 of 20 = 1.
- **Budget running totals vs `design.md` §12:**

  | Measure | Used so far | Budget |
  |---|---|---|
  | Tasks | 1 | 3 |
  | Review rounds | 2 | 3 |
  | Record lines (`before.sql`) | 82 | ~90 |
  | Function lines changed | 0 | — |

  Not exceeded yet. T-2 will bring review rounds to 3. Any T-2 rework, or T-3's own review, will exceed the budget, and that stops the run for the user.
- **Gate (continue/pause):** gated mode, so the run stops for the user. The P-5 sibling report (DoD item 4) and the PROD rollback spec gap are delivered at this gate.

## Gate after PTS-T-1 (2026-11-12)

- **Delivered to the user at the gate:**
  - the P-5 sibling report (DoD item 4)
  - the out-of-scope empty-payload finding
  - budget running totals
- **User decisions** (AskUserQuestion):
  1. PROD rollback → "Save before.prod.sql in T-3".
  2. Definer → "Follow P2-4049".
  3. → "Continue with T-2".
- **Spec edits made on those decisions** (execute-time; they settle the PROD-rollback spec gap raised by the T-1 Reviewer). Each is carried to the T-2 Reviewer as a named conformance check:
  - **`tasks.md`:**
    - T-2: a definer bullet in the Description; TEST applies the body-only file; (a) and (b) rewritten for the definer.
    - T-3: step 1 saves `before.prod.sql` and diffs it against `before.sql`; step 3 is the PROD apply route; a Files line; the first two Verification bullets; the DoD.
    - §5: the NFR-1 row.
    - §6 Rollback: per environment.
  - **`requirements.md`:** PTS-NFR-1 now keeps a before file per environment. The meaning stands: rollback is kept, TEST before PROD.
  - **`design.md`:** §4 gains a `before.prod.sql` row and the `after.sql` definer; the before.sql row says it is the TEST rollback; the DD-4 rationale mentions the definer line.
- **Correction-closure sweep** (grep `before.sql|definer|DEFINER|re-run` over `requirements.md`, `design.md`, `tasks.md` and `proposal.md`): every remaining hit is consistent.
  - `proposal.md` R-2 is the approved historical proposal and is not edited.
  - The `design.md` P-9 ledger row is pending the archive ledger sync (forward pointer).
- **Still open for T-3:** read the PROD version table (P-3 on PROD) before the PROD write. This was an advisory from the attempt-1 Reviewer and is not in the approved T-3 steps. It will be raised at the T-2 gate.

### PTS-T-2 — Fix the branch, apply on TEST, verify — IN PROGRESS

- **Date:** 2026-11-12
- **Skills:** `systematic-debugging` (as the task lists).
- **Effort:** `high`, one level above the T2 default. Reason: a shared function behind every result PDF, where exactness matters. It is not `max`, because this is a T2 worker and its correctness is gated by a deterministic diff.
- **Order:**
  1. The Implementer writes the two files.
  2. The Reviewer audits them before any apply.
  3. The user applies `after.body-only.sql` on TEST and runs (b)–(f).
- **(c), (d) and (e) reuse the recorded queries unchanged:**
  - the round 4 query (live keys plus hashes)
  - the T-1 hash check block
  - round 2 R2-Q4 (guards)
- **Forward pointers carried into the brief:**
  - the definer handling, settled by user decision
  - the round-4 live-key column as the pass rule
  - "paste the recorded hash block as it stands" (T-1 attempt-2 advisory)
- **Attempt 1, Implementer** (`akili-implementer`, T2 sonnet, effort high):
  - **Files changed:** `sql/resultFullDataByResultCode.after.sql` (112 lines) and `sql/resultFullDataByResultCode.after.body-only.sql` (79 lines). Both are new.
  - **Implementer verification:**
    - (a) `diff before.sql <CREATE…end block>` shows 3 changes: the definer line; the gate `= 34` → `(select v.phase_year from version v where v.id = p_version_id) >= 2025`; and the inserted `set char_lim = (SELECT @@group_concat_max_len);`. The only other difference is the EOF newline marker.
    - Body-only check: identical.
    - Greps: one active `COMMIT;`, `DROP FUNCTION IF EXISTS`, `DELIMITER $$` / `;`.
  - **Not Done / Assumptions** (verbatim summary):
    - (1) The diff was run against a temp extract. Trailing whitespace was preserved, because the block was built with `sed`.
    - (2) The consumer path `platform-report.service.ts:112-117` was not found at the path tried. **Leader resolved it:** `git ls-files` shows `onecgiar-pr-server/src/api/platform-report/platform-report.service.ts` and `…/repositories/platform-report.repository.ts`. The design's citation is right; only the path the Implementer tried was wrong.
    - (3) The `after.sql` header refers to `before.prod.sql`, which T-3 creates.
    - (4) The apply and checks (b)–(f) are user-run.

    None of these names a blocker or an owed item for the Implementer, so no continuation is needed. (b)–(f) are the user's step after the Reviewer.
  - **Evidence re-run** (Leader-inline, non-author): **VERIFIED**.
    - The same (a) diff, character for character.
    - The body-only file minus its 3-line header equals block lines 7..(last−1) (`BODY_IDENTICAL`).
    - Greps: l.17 `DROP`, l.19 `DELIMITER $$`, l.106 `DELIMITER ;`, l.108 `COMMIT;`, l.112 `SHOW CREATE FUNCTION`.
  - **Reviewer:** spawned fresh (`akili-reviewer`, T3 opus, effort high, lens checklist). It audits the files before the apply.
    - Named conformance checks: the post-T-1-PASS wording edits and the T-1 gate amendments.
    - Mode reason: the code diff is 3 lines and is gated by a deterministic diff; the function is read-only, so this is not a data-loss surface. Parallel lens reviewers are not warranted.
  - **Reviewer verdict** on the files, attempt 1: **PASS**. Verbatim summary: "Both files match PTS-T-2 (a), DD-1..DD-4, PTS-R-1..4 and PTS-NFR-1..3. Mode: lens checklist with 4R advisories. Nothing in the files blocks the apply or checks (b)–(f)."
    - It confirmed:
      - The gate is the proposal's Fix Strategy text word for word, and a NULL year goes to legacy.
      - The `set char_lim` line is byte-identical to the legacy line (l.60 = l.80) and placed before the compare.
      - Trailing whitespace is preserved and the files use LF only. The signature is unchanged (`platform-report.repository.ts:23-28`, `platform-report.service.ts:114`).
      - `end` followed by `$$` is valid.
    - None of the named checks is a Pivot, and they agree with each other. Minor: `design.md` §2 "byte-identical" leaves out the definer.
  - **ADVISORY** (4R), verbatim summary, with the action taken:
    1. (reliability) Body-only lines 1–3 are comments. Pasted into the routine editor, they would be stored in the function, and (b) would fail. → The TEST apply instructions say to paste lines 4–79 only. At (b), compare the 76 body lines strictly.
    2. (risk) The routine editor sets the definer to the connection user, not "keeps" it: archive `…innovation-use-youth-required/execution.md:58` records `prmsadmin` → `prdbusertst`. On TEST the result is the same. → Forward pointer to T-3: apply `after.sql` (full script) on PROD and confirm the definer is `prmsadmin` at (b). The header wording "keeps" in `after.sql` l.12 and body-only l.3 is inaccurate but harmless on TEST. It is recorded here, and the file is not edited after the PASS.
    3. (reliability) Run `SELECT @@global.group_concat_max_len, @@session.group_concat_max_len;` before (d). If both are ≥ 150000, a v34 mismatch cannot come from PTS-R-3. → Added to the TEST check batch.
    4. (resilience) The before files are bare `SHOW CREATE` output, so re-running one fails while the function exists. → `tasks.md` §6 Rollback now names two routes: the routine editor with lines 7–81, or `DROP` and then the file as a single statement. On PROD, prefer route 2 and confirm the definer. This is a Leader clarification of its own §6 text, carried to the T-3 Reviewer as a named check.
  - **Leader edit:** `design.md` §2 "byte-identical" now mentions the `after.sql` definer (the Reviewer's minor note). Carried to the T-3 Reviewer.
  - **spawns:**
    - implementer: 9 calls, 94,370 tokens, ended complete (`Not Done` held assumptions only)
    - reviewer: 26 calls, 125,515 tokens, ended complete
  - **Budget:** review rounds are now 3 of 3, so the budget is reached. T-3's review would be round 4, which trips the budget and stops the run for the user before T-3.
  - **Status:** files PASS. Waiting for the user's TEST apply and the (b)–(f) results; T-2 stays `[~]` until they come back.
- **TEST apply, attempt 1 (user, 2026-11-12): it did not take effect.**
  - **Evidence:**
    - **(b)** The `SHOW CREATE FUNCTION` pasted as text by the user still has `if p_version_id = 34 then`, and there is no `set char_lim` line in the P25 branch. The body is byte-identical to `before.sql`. Only the header changed: it now reads ``FUNCTION `prdb`.`resultFullDataByResultCode` ``. That suggests DBeaver re-saved the routine with its old body, or rendered the name schema-qualified (UNVERIFIED — confirm at source before relying on it).
    - **Hash check** (`images/40.png`): 20 of 20 rows give `same_as_t1 = 1`, including the six v36 falsifier rows that must turn 0 after the fix.
    - **Round 4 re-run** (`images/41.png`): identical to the baseline. v36 still misses `innovation_use_actors`, `policy_*`, `kp_*` and `innovation_*`.
    - **Guards** (`images/42.png`): the same 5 outputs as T-1.
  - **Disqualifier applied** (`tasks.md` T-2: "If (b) does not match, the body is wrong or partial: every other result is void until it matches"). (c)–(e) from this run are void as post-fix evidence.
    - They do stand as a second capture of the **pre-fix state**: the red run is reproduced, and 20 of 20 hashes are stable.
    - Not an Implementer FAIL and not a Reviewer FAIL; no attempt is consumed. The files passed review, and the step that failed was the user's DB apply.
  - **New fact** (`images/39.png`): on TEST, `@@global.group_concat_max_len = 1024`, and the check tab's session = 150000.
    - So a **fresh** connection starts at 1024. The current P25 branch never raises it (`char_lim` is unassigned), so a 2025 payload built first on a fresh connection can be truncated at 1024 chars. PTS-R-3 is a real defect, not only a theoretical one.
    - The 20 of 20 match at session 150000 shows that the baseline hashes correspond to session 150000.
    - **Leader proposal to the user:**
      - (i) Start the post-apply check tab with `SET SESSION group_concat_max_len = 150000;`, so (d) compares like with like.
      - (ii) PTS-R-3 is in fact observable, contrary to `requirements.md` §7 and `tasks.md` §5 "not observable". Set the session to 1024, call the function on a v34 code, then read `@@session.group_concat_max_len`. Before the fix it stays 1024; after the fix it reads 150000. Offered as an optional red/green check; it is session-only and writes no data. Pending the user's answer.
  - **Safety check requested:** the user's DBeaver has PRMSPROD tabs open. A read-only `SHOW CREATE` on PROD confirms that line 39 still says `= 6`, i.e. that the routine-editor save did not go to PROD. The original PROD body is also kept in the scratchpad copy of this morning's paste.
- **TEST apply, attempt 2 (user, 2026-11-12):**
  - In this DBeaver version, the routine editor's Source tab shows the **whole** function: header, `begin`, body, and the final `end`.
  - The first save failed with `SQL Error [1064] … near '' at line 82` (`images/43.png`). The paste had replaced the final `end` (`images/44.png`).
  - The user added `end` back and saved.
- **(b) PASS.**
  - The user pasted the TEST `SHOW CREATE` (transcript, user message 2026-11-12T21:04:38Z). The Leader copied it verbatim to the scratchpad as `t2_test_after_apply_show_create.sql` and diffed it against the `CREATE … end` block of `after.sql`.
  - The only differences are line 1 and the newline at end of file:
    - TEST keeps ``DEFINER=`prdbusertst`@`%` ``, as T-2 (b) expects.
    - DBeaver schema-qualifies the name as `` `prdb`.`resultFullDataByResultCode` ``. That is how this editor renders and saves the name, not a body change.
  - Every body line matches, including the new gate and the `set char_lim` line.
- **Note for T-3 / kaizen:** in the DBeaver routine editor, the Source tab includes the header and `begin` / `end`. The body-only file therefore replaces only the text between the outer `begin` and `end`, never the `end` itself.
- **(d) and falsifier: PASS.** Run on PRTest/prdb after the apply (`images/46.png`), in a tab that started with `SET SESSION group_concat_max_len = 150000;`.
  - **v30 and v34, 11 rows: all `same_as_t1 = 1`.** Reporting 2024 and 2025 output is unchanged (PTS-R-2 S1/S2).
  - **v36 falsifier samples: all `same_as_t1 = 0`.** These are 6475 (t1), 8555 (t7), 9073 (t2), 9074 (t7), 9088 (t2) and 9980 (t6). Their 2026 output changed, so the falsifier is observed.
  - **v36 key-check samples: all `same_as_t1 = 1`.** These are 7543 (t5), 10059 (t4) and 10074 (t8).
    - For types 4 and 8, the current payload equals the pre-fix one: the P25 builder returns NULL for them, and evidently the legacy builder added no keys either.
    - For type 5, the legacy and P25 output are identical for this result.
    - These values are reported only (not pass/fail); no 2026 PDF of types 4, 5 or 8 loses anything.
- **(c) PTS-R-1: PASS** (`images/47.png`, round 4 query re-run unchanged on PRTest/prdb after the apply).
  - **Every v36 row** (30 rows, types 1, 2, 4, 5, 6, 7 and 8) shows `live_p25_keys_missing` = NULL and `has_error` = 0. That covers all six falsifier samples, which before the fix were missing `policy_*`, `innovation_use_actors`, `kp_*` and `innovation_*`.
  - **v34:** still NULL, so no change.
  - **v30:** still misses `innovation_use_actors` (8540) and `kp_*` (8649). That is expected: pre-2025 stays on the legacy builder (PTS-R-2 S2).
  - **Reported only, not pass/fail:** cur_n_keys for codes active on both v34 and v36, given as v34 → v36. The differences come from phase data, because `json_merge_patch` drops null-valued keys.

    | Code | Type | v34 | v36 |
    |---|---|---|---|
    | 6475 | t1 | 55 | 56 |
    | 9073 | t2 | 51 | 49 |
    | 9088 | t2 | 49 | 51 |
    | 7543 | t5 | 55 | 57 |
    | 8555 | t7 | 58 | 56 |
    | 9074 | t7 | 54 | 52 |

    9980, 10059 and 10074 are not on v34, so their comparison is N/A.
  - **Out-of-scope rows unchanged:** 9983, 10001, 10010, 10036, 10071 and 10072 still return `{}` (2 keys). This is the finding already reported.
- **(e) PTS-R-4: PASS** (`images/48.png`, round 2 R2-Q4 re-run unchanged on PRTest/prdb after the apply). The 5 outputs are identical to the T-1 baseline:
  - nonexistent v36 and v34 → `{"error": "The result with code 999999999 does not exist"}`
  - empty URL v36 and v34, code 347 → `{"internal_error": "The provided PDF URL cannot be empty"}`
  - type 10, v37, code 9733 → `{"error": "The result with code 9733 has a type not supported by this report"}`
- **Remaining for T-2:** (f), the HITL look at two 2026 PDFs on PRTest.
- **(f) HITL PDFs, partial** (PRTest, after the apply):
  - **9980** (KP, Reporting 2026, bilateral "C-S287"): `C:\Users\santiagosanchez\Downloads\PRMS-Result-9980_P25_20261112_2312.pdf`, read by the Leader, 3 pages, footer "22:12 CET".
    - The **Knowledge Product** block renders: Handle, issue date, authors, KP type, peer reviewed, WoS, DOI, accessibility, licence, keywords, AGROVOC, commodity, FAIR score. These are the `kp_*` keys that were missing on v36 before the fix (T-1 baseline).
    - The layout is intact.
    - **PASS** for the bilateral half.
  - **9073** (Innovation Use, Reporting 2026, bilateral, "No project name provided"): screenshot `images/49.png`, footer "22:11 CET", so it was generated in the same minute as 9980 and after the fix.
    - **No Innovation Use block appears.**
    - Hypothesis: this QA test result ("P2-3515 QA test - 2030 projection rollover source") has an empty actors array and no organizations, measures or readiness, so the template has nothing to render. An empty `JSON_ARRAY()` counts as a live key in the round-4 column (`JSON_TYPE` = 'ARRAY'), which is why 9073 qualified as a falsifier sample.
    - UNVERIFIED — confirm at source before relying on it: a read-only query on 9073's innovation-use keys was sent to the user.
  - **Still owed:** one W1/W2 2026 result of another type. The same query returns `source` for the sample codes; bilateral = `source = 'API'`.
  - **Leader correction:** in chat, the Leader first suggested that the 9073 PDF predated the apply. It did not; both PDFs carry the same generation clock.
- **9073 explained** (`Screenshot 2026-11-12 163546.png` in the user's Downloads folder; TEST, read-only, after the fix):
  - `iu_blocks` for 9073 = `[[]]`: `innovation_use_actors` is an empty array, and `organizations`, `measures` and `readiness` are null, so `json_merge_patch` drops them. With nothing to render, the absence of an Innovation Use block in its PDF is correct.
  - 9088 is the same (`[[]]`).
  - Hypothesis confirmed.
- **Sources:**
  - bilateral (`API`): 9073, 9088, 9980
  - W1/W2 (`Result`): 6475 (t1), 8555 (t7, `readiness_level` "Level 1: Basic Research"), 9074 (t7)
- **W1/W2 PDF sample chosen: 8555** (Innovation Development). Before the fix, v36 was missing `innovation_investments`, `innovation_nature` and `innovation_type` for it, so its PDF block should now show them.
  - **8555** (Innovation Development, Reporting 2026, W1/W2 SP01): `C:\Users\santiagosanchez\Downloads\PRMS-Result-8555_P25_20261112_2345.pdf`, read by the Leader, 2 pages, footer "22:45 CET".
    - The **Innovation Development details** block renders: developer, current readiness "Level 1: Basic Research" with the readiness graphic, readiness justification, collaborators, **innovation nature**, **innovation type**, and the **CGIAR and Partners estimated USD investment** table. Nature, type and investments are exactly the keys v36 was missing before the fix.
    - The layout is intact.
    - **PASS** for the W1/W2 half.
  - **(f) PASS:** bilateral 9980 (KP) and W1/W2 8555 (Innovation Development) both render their type block. 9073 has no block because its data is empty, and that is correct.

#### Closing record (Leader), PTS-T-2 — PASS (attempt 1)

- **(a)–(f) all green, falsifier observed:**
  - (a) the diff shows 3 changes
  - (b) the TEST body matches `after.sql` except line 1
  - (c) no live P25 key is missing on v36
  - (d) the 11 v34 and v30 hashes are unchanged
  - falsifier: the 6 v36 falsifier hashes changed
  - (e) the guards are identical
  - (f) the 2 PDFs render their type block
- **Review:**
  - The conformance Reviewer gave PASS on the files (attempt 1).
  - The post-apply checks (b)–(f) are deterministic and were executed by a non-author, the user in DBeaver and the browser. The Leader compared them with the expectations stated before each run: the (b) diff was done by script, the rest read from screenshots and PDFs.
  - Evidence re-run: **VERIFIED.**
  - Apply attempt 1 failed (DBeaver save) and attempt 2 succeeded. That is a HITL event; no rework attempt was consumed.
- **ADVISORY carried forward:**
  - The `after.sql` header says "keeps the definer" (routine editor). That is inaccurate, but harmless on TEST.
  - The DBeaver Source tab includes the header and `begin`/`end`. Note it in the T-3 apply instructions and in kaizen.
- **spawns (whole task):**
  - implementer: 9 calls, 94,370 tokens, ended complete
  - reviewer: 26 calls, 125,515 tokens, ended complete
- **Requirements covered on TEST:** PTS-R-1 S1 (via the 9073/9088 substitutes, plus PDF), PTS-R-1 S2, PTS-R-2 S1/S2, PTS-R-3 (assignment present; the runtime effect was not measured), PTS-R-4, PTS-NFR-1 (TEST half), PTS-NFR-3.
- **Decisions made:**
  - `SET SESSION group_concat_max_len = 150000` before (d), so the comparison is like for like with the baseline.
  - 8555 chosen as the W1/W2 PDF sample.
  - The extra PTS-R-3 runtime check that was offered was dropped to save rounds (user asked for fewer iterations).
- **Issues encountered:**
  - DBeaver save failure (missing final `end`).
  - TEST `@@global.group_concat_max_len = 1024`, so PTS-R-3 is a live defect on fresh connections, and the fix addresses it.
- **Budget running totals vs `design.md` §12:**

  | Measure | Used so far | Budget |
  |---|---|---|
  | Tasks | 2 | 3 |
  | Review rounds | 3 | 3 |
  | Record lines | `before.sql` 82 + `after.sql` 112 + `body-only` 79 = 273 | ~180 |
  | Function lines changed | 3 | ~6 |

  - **BUDGET TRIPWIRE: record lines are over budget (273 vs ~180).** Cause: `after.sql` carries a header, DROP/DELIMITER/COMMIT and checks, and the body-only file a header, as in the P2-4049 exemplar.
  - Review rounds are at the ceiling. T-3's review (Review: checklist) would be round 4. Cause: T-1 needed 2 rounds, because the Leader's own record lacked the live-key query.
  - Per the command, the run stops for the user before T-3. It is not auto-approved.

## Gate after PTS-T-2: budget tripwire (2026-11-12)

- **Stop raised:** review rounds were at the ceiling (3 of 3), so T-3 would be round 4. Record lines were 273 against ~180.
- **User decision** (AskUserQuestion): **"Continue to T-3"**, accepting the overrun. This is a user decision on a tripwire, not an auto-approval.

### PTS-T-3 — Apply on PROD and confirm in the production PDF — IN PROGRESS

- **Date:** 2026-11-12
- **Mode:** the user asked for one step at a time, so each step is sent only after the previous result is back.
- **Step 1 (PROD, read-only), sent:** `SHOW CREATE FUNCTION resultFullDataByResultCode` on PROD, pasted as text.
- **Optional addition offered** (P-3 on PROD, an advisory from the T-1 Reviewer): the PROD version table with type 1–9 counts.
  - If the user runs it, they have approved it. If they skip it, it is recorded as not run.
- **Step 1 result** (user, PROD, read-only; paste at 2026-11-12T22:09:46Z, plus `Screenshot 2026-11-12 170828.png` in Downloads):
  - **`sql/resultFullDataByResultCode.before.prod.sql` saved.** The Leader copied it inline with `cp` from a script-made verbatim copy of the transcript paste, never retyped. `cmp` with the scratchpad copy: identical. It starts with ``CREATE DEFINER=`prmsadmin`@`%` ``.
    - Why the Leader did it inline: it is a single verbatim file copy with no authored content (*Delegation Thresholds*: 1 file, mechanical). The T-3 Reviewer audits it.
  - **Diff against this morning's PROD paste:** identical except the EOF newline. Nothing changed on PROD today, and the routine-editor attempts went only to TEST.
  - **Diff against `before.sql` (TEST):** only line 1 (definer `prdbusertst` / `prmsadmin`) and line 39 (`= 34` / `= 6`). This matches T-3 Verification bullet 1 exactly (P-9).
  - **P-3 on PROD** (the optional query; the user ran it, which approves it):
    - Versions with `phase_year >= 2025`:
      - 6 Reporting 2025 (app 1, 8,233 results)
      - 7 IPSR 2025 (app 2, 0)
      - 8 Reporting 2026 (app 1, 2,215)
      - 9 IPSR 2026 (app 2, 0)
    - Only the Reporting phases carry type 1–9 results, so **P-3 holds on PROD.** Pre-2025 sample version: 4, Reporting 2024.
  - **Observation:** the DBeaver PRMSPROD toolbar shows manual-commit mode, with "Rollback" and a pending-statement counter of 2 (selects only). DDL (`DROP` / `CREATE FUNCTION`) commits implicitly, and `after.sql` also ends with an active `COMMIT`.
- **Step 2 (PROD, read-only) sent:** the baseline before the apply.
  - It is the round-4 query adapted to PROD ids: one code per type active on both v6 and v8, plus 27926; the same codes on v6; one type 2 and one type 6 code on v4.
  - It runs under `SET SESSION group_concat_max_len = 150000`.
  - It outputs a 10-character MD5 fingerprint (`fp`), so the before and after screenshots can be compared reliably by eye. A 10-hex-character prefix collision is negligible for 18 rows.
- **Step 2 result** (PROD, read-only; `Screenshot 2026-11-12 172808.png` in Downloads; 8 rows, `has_error = 0` on all):

  | Type | Code | Version | Keys | live_p25_keys_missing | fp |
  |---|---|---|---|---|---|
  | 2 | 20462 | v4 | 45 | `innovation_use_actors, innovation_use_organizations` (legacy, expected) | `41234af582` |
  | 2 | 27926 | v6 | 52 | NULL | `e21a50af63` |
  | 2 | 27926 | v8 | 49 | `innovation_use_actors, readiness_level` | `36f6ec78e4` |
  | 2 | 28738 | v6 | 52 | NULL | `b00f187fd6` |
  | 2 | 28738 | v8 | 49 | `innovation_use_actors, readiness_level` | `e340be921b` |
  | 6 | 27870 | v4 | 53 | `kp_*` (legacy, expected) | `02843eac65` |
  | 7 | 28708 | v6 | 58 | NULL | `df04aaeb2e` |
  | 7 | 28708 | v8 | 69 | `innovation_actors, innovation_investments, innovation_nature, innovation_organizations, innovation_type` | `00e8005c35` |

  - **Red run re-observed on PROD:** 27926 v8 is missing `innovation_use_actors`, and its key count is 49 against 52 on v6 (`proposal.md` Problem #4).
  - **Gap:** on PROD only types 2 and 7 have codes active on both v6 and v8, because innovations are replicated into the new phase and other types are not. PTS-R-2 S1 asks for a version-6 sample "covering every type", and T-3 implements PTS-R-2 on production. So a supplementary baseline (PROD, read-only) was sent, before the apply:
    - v6 and v8 codes of types 1, 4, 5, 6 and 8
    - no pairing required
    - top 2 per type and version
- **Step 2b result** (PROD, read-only; screenshot pasted in chat, 2026-11-12; 20 rows, `has_error = 0` on all):

  | Type | Code | Version | Keys | p25 not null | live_p25_keys_missing | fp |
  |---|---|---|---|---|---|---|
  | 1 | 28502 | v6 | 57 | 1 | NULL | `cdface957f` |
  | 1 | 28613 | v6 | 57 | 1 | NULL | `36a77608f3` |
  | 1 | 31195 | v8 | 2 | 0 | NULL | `99914b932b` |
  | 1 | 31303 | v8 | 55 | 1 | `policy_amount, policy_implementing_organizations, policy_stage` | `a7bc91d8d4` |
  | 4 | 28477 | v6 | 46 | 0 | NULL | `73c34b594c` |
  | 4 | 28632 | v6 | 46 | 0 | NULL | `2751f64bbe` |
  | 4 | 31205 | v8 | 2 | 0 | NULL | `99914b932b` |
  | 4 | 31206 | v8 | 2 | 0 | NULL | `99914b932b` |
  | 5 | 28709 | v6 | 55 | 1 | NULL | `66342c7384` |
  | 5 | 28752 | v6 | 48 | 0 | NULL | `00ea0404fd` |
  | 5 | 31299 | v8 | 46 | 0 | NULL | `c30086add9` |
  | 5 | 31301 | v8 | 54 | 1 | NULL | `1347f4f5d7` |
  | 6 | 30995 | v6 | 62 | 1 | NULL | `7d30921452` |
  | 6 | 31046 | v6 | 60 | 1 | NULL | `9f9102f634` |
  | 6 | 31304 | v8 | 63 | 1 | `kp_agrovocs, kp_authors, kp_cgspace_metadata, kp_comodity, kp_fair_score, kp_handle, kp_knowledge_product_type, kp_licence, kp_sponsors, kp_wos_metadata` | `00f22137e5` |
  | 6 | 31305 | v8 | 64 | 1 | the same plus `kp_keywords` | `190040bac1` |
  | 8 | 28729 | v6 | 48 | 0 | NULL | `c635ce5d46` |
  | 8 | 28730 | v6 | 48 | 0 | NULL | `47ad61aba0` |
  | 8 | 31292 | v8 | 48 | 0 | NULL | `13c56b67a0` |
  | 8 | 31297 | v8 | 48 | 0 | NULL | `db3c6a4f9d` |

  - **Red on PROD for types 1 and 6** (31303, 31304, 31305), in addition to types 2 and 7 from step 2.
  - **Type 5 is not red on PROD either:** 31301 has a non-null P25 payload, and every live P25 key is already present. It stays key check only, as the user decided.
  - **`{}` payloads on PROD:** 31195, 31205 and 31206 (v8) return only the two generation-date keys (`fp` `99914b932b` = MD5 of `{}`). So basic info, section seven and ToC are all NULL. This is the same pattern as the TEST v36 out-of-scope finding. The P25 builder is NULL for all three, so the fix does not change them. Reported, not fixed.
- **T-3 sample, fixed list for the after-apply rerun** (Leader decision; an explicit list because PROD keeps creating v8 results, so a "top 2" selection could shift between runs):
  - **Must stay identical (`fp` unchanged), 15 rows:**
    - v4: 20462, 27870
    - v6: 28502, 28613, 27926, 28738, 28477, 28632, 28709, 28752, 30995, 31046, 28708, 28729, 28730
  - **Falsifiers (v8), 6 rows:** 31303 (t1), 27926 and 28738 (t2), 31304 and 31305 (t6), 28708 (t7). After the apply, `fp` must change and `live_p25_keys_missing` must be NULL. 27926 must also carry the actor (Other, 513753) and the same key set as on v6 (superseded by the "Narrow the clause" decision below).
  - **Key check only (v8), 7 rows:** 31195 (t1), 31205 and 31206 (t4), 31299 and 31301 (t5), 31292 and 31297 (t8). After the apply: `has_error = 0` and `live_p25_keys_missing` NULL. `fp` is not a pass criterion here.
- **Step 3 (PROD, WRITE) sent:** apply `after.sql` as a full script (SQL Editor tab on PRMSPROD, Alt+X), then `SHOW CREATE FUNCTION` from a fresh tab, pasted as text. The user runs it, and sending it is not an approval. If the `CREATE` fails after the `DROP`, PROD has no function, and the rollback is `before.prod.sql` (route 2).
- **Fingerprints re-read:** every `fp` and code in the step 2 and step 2b tables was checked against enlarged crops of both screenshots (scratchpad `fp59.png`, `codes59.png`, `s2_bottom.png`). All match.
- **Step 3 result (PROD, WRITE, run by the user; 2026-11-12):** the user reported "asi quedo en prod" with a screenshot of the DBeaver routine editor's Source tab on PRMSPROD. The user did not say which route was used.
  - **(b) PROD, read by eye** (the `requirements.md` §7 gate is a human by-eye read):
    - Line 1 reads ``CREATE DEFINER=`prmsadmin`@`%` FUNCTION `prdb`.`resultFullDataByResultCode`(``. The definer is `prmsadmin`, as T-3 requires. The `prdb`. schema prefix is how DBeaver displays the name; TEST showed the same at T-2 (b).
    - Every other line matches `after.sql` l.22–103: the guards, `if (select v.phase_year from version v where v.id = p_version_id) >= 2025 then`, `set char_lim = (SELECT @@group_concat_max_len);`, the P25 call, the unchanged legacy branch, and `return full_data; end`.
    - The editor tab has no unsaved `*` marker, so the text is what the DB returned, not a pending edit. The toolbar transaction counter reads "None".
    - **Limit:** this is a screenshot read, not a text diff. The step 4 behaviour check (`fp` changes on the v8 falsifiers only) covers the same risk independently.
- **Step 4 (PROD, read-only) sent:** one query for (c), (d), (e) and the falsifier together. It returns 31 rows with a computed `verdict` per row:
  - 15 `same` rows
  - 6 `fix` rows; the 27926 row also checks the actor and its key set against v6
  - 7 `key` rows
  - 3 `guard` rows: 999999999 on v8; the newest active type 10/11 result on its own version; 27926 on v8 with an empty URL
  - The guards are compared with the literal messages in the function body. PROD guard outputs were not captured before the apply, but the guard lines of `before.prod.sql` are identical to `after.sql`, and TEST (T-2 e) returned the same texts.
- **Step 4 result** (PROD, read-only; screenshot pasted in chat, 2026-11-12; the query is in scratchpad `t3_after_check.sql`; detail and verdict columns checked on enlarged crops): **30 PASS, 1 FAIL.**
  - **(d) PTS-R-2: PASS, 15 of 15.** Every v4 and v6 `fp` is identical to its baseline: 20462, 27870, 28502, 28613, 27926, 28738, 28477, 28632, 28709, 28752, 30995, 31046, 28708, 28729, 28730.
  - **Falsifier observed on all 6 v8 samples.** `live_missing` is now NULL on each, and every `fp` changed:

    | Code | Type | fp before | fp after | Keys before | Keys after |
    |---|---|---|---|---|---|
    | 31303 | 1 | `a7bc91d8d4` | `6a1fba576a` | 55 | 55 |
    | 27926 | 2 | `36f6ec78e4` | `f67b5f1f40` | 49 | 50 |
    | 28738 | 2 | `e340be921b` | `908f8cdb71` | 49 | 50 |
    | 31304 | 6 | `00f22137e5` | `75cc05e5c3` | 63 | 60 |
    | 31305 | 6 | `190040bac1` | `18df01a8e5` | 64 | 61 |
    | 28708 | 7 | `00e8005c35` | `4c512b21fe` | 69 | 58 (equals v6) |

  - **(c) Key check samples: PASS, 7 of 7** (31195, 31205, 31206, 31299, 31301, 31292, 31297). `has_error = 0` and `live_missing` is NULL. All 7 `fp` values are also unchanged. That includes type 5's 31301, whose P25 payload is not null.
  - **(e) PTS-R-4: PASS, 3 of 3.**
    - `{"error": "The result with code 999999999 does not exist"}`
    - `{"internal_error": "The provided PDF URL cannot be empty"}` (27926 on v8)
    - `{"error": "The result with code 27562 has a type not supported by this report"}`: type 10 on v9, IPSR 2026, the newest active type 10/11 result
  - **FAIL: 27926 v8, the PTS-R-1 S1 "same key set" clause.**
    - The detail column reads `actor_ok=1 | keys v8/v6=50/52 | only_v8=- | only_v6=primary_submitter_data,toc_primary`.
    - The type section passes: the actor (513753) is present and no live P25 key is missing.
    - What fails is that the 2026 payload lacks the 2 ToC-block keys that the 2025 payload has.
    - Both keys are ToC-block names: `primary_submitter_data` is built by `tocInfoByResultCode` (migration `1684500648607-TOCFullInfoFunctPDF.ts:49`, `:89`), and `toc_primary` appears beside it in the INC-168048 fixtures.
    - Both branches call `tocInfoByResultCode(p_result_code, p_version_id)` identically, and `json_merge_patch` drops null-valued keys.
    - **Leader hypothesis, not yet verified:** 27926 has no 2026 ToC data, so the ToC function emits these keys as null or leaves them out. That would match the proposal's note that "the 2026 PDF of 27926 also had no ToC block; may be data".
    - **The spec premise behind the clause was too wide.** `tasks.md` T-2 (c) says "P-2 shows its data is identical on both versions", but P-2 compared only the `result_actors` rows.
  - **Leader adjudication:** this is not an Implementer or rework FAIL. No SQL file is wrong, and (b) through (e) for the type section are green. It is a spec-clause FAIL on a premise.
    - Before any amendment, one read-only query (step 4b) has to show which source drops the two keys on v8, and that neither key came from the legacy builder. Otherwise the fix itself could have removed them.
    - The decision on S1 goes to the user, with that evidence.
- **Step 4b (PROD, read-only) sent:** for 27926 on v6 and v8:
  - `tocInfoByResultCode` keys, and the JSON type of the two keys (absent or null)
  - whether either key appears in the legacy builder, the P25 builder or basic info
  - the count of active `results_toc_result` rows
- **Step 4b result** (PROD, read-only; screenshot pasted in chat, 2026-11-12):

  | Version | `toc_keys` | `primary_submitter_data` | `toc_primary` | In legacy builder | In P25 builder | In basic info | Active `results_toc_result` rows |
  |---|---|---|---|---|---|---|---|
  | 6 | `["toc_primary", "primary_submitter_data"]` | OBJECT | ARRAY | 0 | 0 | 0 | 1 |
  | 8 | `["toc_primary", "primary_submitter_data"]` | NULL (JSON null) | NULL (JSON null) | 0 | 0 | 0 | 0 |

  - **Hypothesis confirmed: this is data, not the fix.** 27926 has no active ToC mapping in 2026 (0 rows, against 1 in 2025).
    - `tocInfoByResultCode` therefore emits both keys as JSON null, and `json_merge_patch` drops them.
    - Neither builder carries either key, on either version. So the before payload lacked them too, and the fix cannot have added or removed them.
  - **S1's "same key set" clause cannot pass for 27926 on current data.** It asks for a ToC block that 27926 does not have in 2026, so the user decides how to treat it (gated mode; amending an approved requirement).
- **User decision** (AskUserQuestion, 2026-11-12): **"Narrow the clause"**.
  - `requirements.md` PTS-R-1 S1: the key set may differ from v6 only in ToC-block keys (`tocInfoByResultCode`).
  - `tasks.md` T-2 (c), the 27926 bullet: amended to match.
  - **Under the amended clause, the 27926 FAIL row is a PASS:** `only_v8` is empty, and `only_v6` holds only the two ToC-block keys.
  - **Reported, not fixed:** 27926 has no 2026 ToC mapping. That is data the submitter enters.
- **(c)–(e) on PROD: green.** All 31 rows pass, including 27926 under the amended S1.
- **Step 5 (HITL, production PDF) sent:** the user downloads the 2026 and 2025 PDFs of 27926 again from the public report page, after the apply. The Leader reads them from Downloads:
  - The 2026 file must show Innovation Use → Actors (Other, 513753).
  - The 2025 file must show Actors only, no readiness (the INC-168048 state).
  - The filename timestamp (CET) must be later than this morning's `_2046` and `_2038` files.
- **Step 5 result** (PROD public report page, after the apply; files in the user's Downloads, read by the Leader on 2026-11-13):

  | File | Phase | Footer (CET) | Type block | ToC block | Verdict |
  |---|---|---|---|---|---|
  | `PRMS-Result-27926_P25_20261113_20261454.pdf` (1 page) | Reporting 2026 | 13 Nov 2026, 13:54 | Innovation Use → Actors: Other: Other, -, Not applicable, Not applicable, 513753 | absent | **PASS** |
  | `PRMS-Result-27926_P25_20261113_1458_2025.pdf` (2 pages) | Reporting 2025 | 13 Nov 2026, 13:58 | Innovation Use → Actors only (same row), no readiness | SP09 Scaling for Impact, 2030-OC 2 | **PASS** |

  - **The reproduction is closed on PROD:** before the apply, the 2026 PDF had no Innovation Use block; now it renders the actor row the 2025 PDF has. The P25 template renders the 2026 payload without layout problems.
  - The 2026 PDF has no ToC block. That matches step 4b (no 2026 ToC mapping for 27926) and the amended S1.
  - **Observed, not caused by the fix:** the bilateral project reads `N-606015` on 2026 and `N-606015-BIO-FORTIFICATION DEPLOYM` on 2025. The project name comes from the contributors data, outside the branch this fix changes.
  - Both footers are 13 Nov 2026, later than the 12 Nov `_2046` / `_2038` files.
- **T-3 PROD verification: complete.** (a) rollback file saved, (b) definer and body by eye, (c)–(e) 31/31 rows, (f) both production PDFs. Next: the T-3 Reviewer.

### PTS-T-3 — Review (checklist, round 4; `akili-reviewer`, T3 `opus`)

- **Attempt 1, verdict FAIL** (2026-11-13, about 50 min). The 6 checklist items:
  1. `before.prod.sql` is a verbatim copy: PASS. Against `before.sql` it differs only at l.1 (definer) and l.39 (`= 6` / `= 34`).
  2. §6 Rollback: PASS. Lines 7–81 are the body in both before files; route (2) is executable.
  3. `design.md` §2 / DD-4: PASS. Against `before.prod.sql`, `after.sql` differs only in the gate (l.59) and the added `char_lim` line (l.60).
  4. "Keeps the definer" wording: CONFIRMED but advisory. `after.sql:12`, `after.body-only.sql:3` and `tasks.md:62` say the routine editor keeps the definer; `tasks.md:147` says it sets the connection user. The T-2 Reviewer had already recorded it, and the outcome was correct in both environments.
  5. S1 amendment: **FAIL.** The §5 test plan row at `tasks.md:128` still stated the old "same key set" rule.
  6. T-3 evidence against Verification, Falsifier, Red run, Disqualifier and DoD: PASS. The DoD items for OQ-1 and P-5 are open, as expected.
- **Rework (Leader, doc-only, wording given by the Reviewer):**
  - `tasks.md` §5 row: "key set = v6 except ToC-block keys (amended 2026-11-12)".
  - Advisories taken:
    - `tasks.md` §6 route (2) now says to run the before file in a tab that holds only the file.
    - `execution.md` step 3 falsifier line marked superseded.
  - Advisory declined: the 2026 PDF filename is the real name of the file the user gave.
  - Grep `same key set` over requirements, design, tasks and proposal: no matches.
- **Attempt 2, verdict PASS** (narrow re-check, about 8 min): the §5 row matches `requirements.md:59` and `tasks.md:79`, and no normative line still states the old rule.
- **PTS-T-3: `[x]`** (2026-11-13). DoD: the user is told about OQ-1 (no Jira ticket) and the P-5 report in the closing message.

## Closing

- All 3 tasks are `[x]`. The fix is live on TEST (v36) and PROD (v8), and 27926's 2026 PDF renders the Innovation Use block.
- **Rollback:** `sql/resultFullDataByResultCode.before.prod.sql` (PROD) and `before.sql` (TEST), following `tasks.md` §6.
- **Reported, not fixed (out of scope):**
  - **P-5 siblings:**
    - `resultFullDataByIPSRCode` lists `phase_year IN (2025, 2026, 2027, 2029, 2030)`, so 2028 is missing.
    - `reportBasicInfoByResultCode` covers only 2022–2026.
  - **`{}` payloads:** TEST v36 (9983, 10001, 10010, 10036, 10071, 10072) and PROD v8 (31195, 31205, 31206).
  - **27926** has no 2026 ToC mapping (data the submitter enters). Its 2026 bilateral project name, `N-606015`, differs from the 2025 one.
  - **OQ-1:** no Jira ticket.
- **Advisories open:** in the `after*.sql` headers, "keeps the definer" should read "sets the connection user". These files are a record copy and are not edited after a PASS.
- **At archive:** sync the `design.md` §11 Premise Ledger. P-2 was narrower than assumed, P-3 holds on PROD, P-4 and P-5 were settled in T-1, and P-9 was refuted. Kaizen note: the DBeaver Source tab includes `begin`/`end`.
- **Budget:** 3 tasks, as planned. Review rounds: 4 plus one re-check, against 3 planned (accepted at the T-2 tripwire).
