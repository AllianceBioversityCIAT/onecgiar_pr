# Tasks — 2026 result PDFs lose their type-specific section

## 1. Scope

- **Module:** platform-report PDF data — DB function `resultFullDataByResultCode` (MySQL, no repo code)
- **Linked spec:** `requirements.md` + `design.md` (this folder) · Lite · Bug Mode
- **Ticket:** none yet (OQ-1)
- **Status:** in-progress (PTS-T-1 started 2026-11-12)

## 2. Pre-flight

- [ ] Every DB statement is run by the user in DBeaver. The agent writes the SQL and pastes each query in chat, labelled **TEST or PROD** and **read-only or write**. Query files are never created (standing rule). The function record (`sql/*.sql`) is the only SQL file kept on disk
- [ ] Every write script ends with an active `COMMIT` and a check run from a fresh DBeaver tab. The routine editor takes the body-only variant
- [ ] Every function test passes a non-empty URL (`'x'`), because an empty URL returns `internal_error` (P-8)
- [ ] "Same output" is compared as `MD5(CAST(JSON_REMOVE(fn(code, ver, 'x'), '$.generation_date_footer', '$.generation_date_filename') AS CHAR))`
- [ ] No commit without the user's go-ahead
- [ ] **Version ids depend on the environment** (execute-time clarification, 2026-11-12, from the TEST `version` table). Reporting 2025 and Reporting 2026 are versions **6 and 8 on PROD**, and versions **34 and 36 on TEST**. In this spec, "version 6" and "version 8" mean the Reporting 2025 and Reporting 2026 version of the environment where the query runs. The approved requirements keep their meaning. The live TEST body gates on `p_version_id = 34`, which is TEST's Reporting 2025
- [ ] **Live P25 key** (execute-time definition, user decision 2026-11-12). A live P25 key is a key whose value is not null in `reportSectionSevenByResultCode_P25(code, ver)`. `json_merge_patch` drops null-valued keys, so the payload never carries null keys, and a key count depends on the data (v34 type 2: 54, 51 and 49 keys). The check is "live P25 keys missing from the payload". It is the `live_p25_keys_missing` column of the round 4 query, recorded verbatim in `execution.md` → PTS-T-1 → "Live P25 key query: round 4, verbatim as sent". T-2 and T-3 reuse that column unchanged. The round 2 variant, which has no null filter, is not a pass/fail rule

## 3. Task list

### [x] PTS-T-1 — Settle premises and capture the TEST baseline

- **Type:** investigation (read-only, TEST)
- **Description:** Settle P-3, P-4, P-5, P-6 (DB side) and P-9. Save the live TEST body as `before.sql`. Pick the verification samples and record their pre-change state.
- **Implements:** evidence base for PTS-R-1..4
- **Steps:**
  1. Run `SHOW CREATE FUNCTION resultFullDataByResultCode` on TEST and save it verbatim as `sql/resultFullDataByResultCode.before.sql`. Diff it against the PROD body pasted on 2026-11-12 (`proposal.md`, Problem #2) and record same or different (P-9).
  2. Run `SELECT id, phase_name, phase_year, app_module_id, status FROM version ORDER BY id`, plus a count of active results of types 1–9 per version. Every version with `phase_year >= 2025` and type 1–9 results must be a reporting phase (P-3).
  3. Run `SHOW CREATE FUNCTION reportSectionSevenByResultCode_P25` and read it for `version` / `= 6` / `phase`. Run `JSON_EXTRACT(reportSectionSevenByResultCode_P25(<code>, 8), '$.<type key>')` for the samples (P-4).
  4. Run `SHOW CREATE FUNCTION` for `resultFullDataByIPSRCode`, `tocInfoByResultCode` and `reportBasicInfoByResultCode`, and search each for `= 6` / `version_id` (P-5). Report only.
  5. Run `information_schema.ROUTINES.ROUTINE_DEFINITION` and `information_schema.VIEWS.VIEW_DEFINITION` `LIKE '%resultFullDataByResultCode%'` (P-6, DB side).
  6. Pick the samples:
     - **Version 8, falsifier samples:** one active result per type 2, 7, 1 and 6. Each must have at least one live P25 key missing from the current payload. Include 27926 when it exists on TEST. Prefer result codes that are also active on version 6.
     - **Key-check samples: types 4, 8 and 5** (amended 2026-11-12 by user decisions: "key check only" for 4/8, "key check, like 4/8" for 5). Why each type cannot be red:
       - Types 4 and 8: the P25 builder returns NULL by construction (TEST round 2: `p25_not_null = 0` on every type 4/8 row).
       - Type 5: the current function is already missing no live P25 key on every TEST 2026 candidate (round 4: 7 of 7).

       Take one result of each type, active on version 8 and also on version 6 when such a code exists. On TEST none exists for types 4 and 8 (round 3), so a version-8-only code with a non-empty payload is used. These samples are checked for no `error` / `internal_error`. Their payload is compared with the same code on version 6 where one exists, otherwise marked N/A. They are not falsifier samples.
     - **Version 6:** the same result codes, wherever they are active on version 6. Add one version-6 result for every type that has no code active on both versions (on TEST: types 4, 6 and 8, i.e. 8434, 8787 and 8462). That way the PTS-R-2 S1 sample covers every type.
     - **One pre-2025 version:** two results.
  7. For each sample, record its MD5 "same output" hash and the live P25 keys the current function is missing.
- **Depends on:** — · **Blocks:** PTS-T-2 · **Estimate:** S
- **Review:** checklist — read-only evidence; its samples feed T-2's gate (override c)
- **Verification:** `before.sql` exists and starts with `CREATE DEFINER`. The P-3/P-4/P-5/P-6/P-9 results are recorded in `execution.md`. Every version-8 sample of types 1, 2, 6 and 7 has at least one live P25 key missing from the current payload. The type 4, 5 and 8 samples are exempt (key check only). The baseline hashes are confirmed against the live TEST function by a check query (`same_as_t1 = 1` on every row) before T-1 closes.
- **Falsifier:** a version-8 sample of types 1, 2, 6 or 7 whose P25 builder output is NULL, or whose payload is missing no live P25 key, is an inert fixture: after the fix it would read the same as before. It must be replaced before T-2.
- **Red run:** observed on PROD on 2026-11-12: `JSON_EXTRACT(resultFullDataByResultCode(27926, 8, 'x'), '$.innovation_use_actors')` → `NULL` (v6 → array, 52 vs 49 keys). Re-observe on TEST in step 7 and quote it.
- **Disqualifier:** a sample whose payload carries `error` or `internal_error` is not a sample. P-4 **refuted** (a version gate inside the P25 builder) → stop and go to the Pivot Protocol; do not continue to T-2. A sibling gate found (P-5) → report it at the gate; do not fix it.
- **Consumers:** none (read-only)
- **DoD:** `before.sql` saved. Premises settled or escalated. Samples plus baseline hashes recorded. The P-5 report is given to the user.
- **Skills:** `systematic-debugging`

### [x] PTS-T-2 — Fix the branch, apply on TEST, verify

- **Type:** fix (DB function, TEST)
- **Description:** Per DD-1..DD-4, produce `after.sql` and `after.body-only.sql` from `before.sql`:
  - Change the branch condition to `version.phase_year >= 2025` (one PK read; a NULL year goes to legacy).
  - Assign `char_lim` from `@@group_concat_max_len` at the top of the P25 branch.
  - Leave every other byte of the function unchanged, except the `after.sql` definer line described next.
  - **Definer** (amended 2026-11-12 by user decision: "Follow P2-4049"). The `CREATE` line of `after.sql` carries ``DEFINER=`prmsadmin`@`%` ``, because `after.sql` is the PROD script. `after.body-only.sql` has no definer.
  
  The user applies `after.body-only.sql` on TEST in the DBeaver routine editor, which keeps TEST's definer `prdbusertst`. The verification queries run on TEST.
- **Implements:** PTS-R-1 (both scenarios), PTS-R-2 (both scenarios), PTS-R-3, PTS-R-4, PTS-NFR-1 (TEST half), PTS-NFR-3
- **Files:** `sql/resultFullDataByResultCode.after.sql`, `sql/resultFullDataByResultCode.after.body-only.sql`
- **Depends on:** PTS-T-1 · **Blocks:** PTS-T-3 · **Estimate:** S
- **Review:** full — a shared function read by every result PDF
- **Verification:** all on TEST and read-only except the apply.
  - **(a)** `diff` of `before.sql` against the `CREATE … end` block of `after.sql` shows only:
    - the definer line (`prdbusertst` → `prmsadmin`)
    - the DD-1 condition
    - the DD-3 assignment

    `after.body-only.sql` holds the lines between the outer `begin` and `end` of that block, plus its header comment.
  - **(b)** After the apply, `SHOW CREATE FUNCTION` on TEST matches the `CREATE … end` block of `after.sql` on every line except the `CREATE DEFINER` line, because TEST keeps `prdbusertst` (user read).
  - **(c) PTS-R-1** (amended 2026-11-12 by user decision: "no live P25 key missing").
    - **Pass rule:** no version-8 sample of types 1, 2, 5, 6 or 7 is missing any live P25 key. Type 5 already passes before the fix; it is a key-check sample.
    - **Reported only, not pass/fail:** each sample's key set is compared with the same result code on version 6, and the differences are listed. The comparison is N/A when the code is not active on version 6 (on TEST: 9980, 10059, 10074).
    - **Type 4, 5 and 8 samples:** no `error` / `internal_error`. Their comparison with version 6 is reported where a version-6 code exists, otherwise N/A.
    - **Result 27926 exists only on PROD**, so this check runs in T-3. There it must return its actor (`actor_type` "Other", `how_many` 513753), and its key set may differ from its version-6 key set only in ToC-block keys. This is PTS-R-1 S1, amended 2026-11-12 by user decision ("Narrow the clause"): P-2 compared only the actor rows, and 27926 has no 2026 ToC mapping (`execution.md`, T-3 step 4b).
  - **(d) PTS-R-2:** every version-6 and pre-2025 sample hash equals its T-1 baseline.
  - **(e) PTS-R-4:** a nonexistent code, a type 10/11 code and an empty URL each return the same object as before (quote the T-1 values).
  - **(f) HITL:** on PRTest, generate the PDF of one 2026 bilateral result and one 2026 W1/W2 result of another type. The type block shows with no broken layout (human / T6).
- **Falsifier:** the version-8 hashes of the falsifier samples (types 1, 2, 6 and 7) must **differ** from their T-1 baseline. The hashes of the key-check samples (types 4, 5 and 8) are only reported. If a falsifier sample's hash is equal, the hash check cannot see a change and (d) proves nothing. Quote both values. Also, `after.sql` with the old `= 6` condition left in place must give (c) NULL; this is the T-1 baseline already observed.
- **Red run:** the T-1 step 7 values: the live P25 keys missing on the current function for each version-8 sample. 27926 does not exist on TEST, so quote the type 2 substitute.
- **Disqualifier:**
  - A check whose payload has `error` / `internal_error` is not evidence. Check that key first.
  - A hash compared on a payload that still contains the generation-date keys is not evidence, because those keys change every minute.
  - If (b) does not match, the body is wrong or partial: every other result is void until it matches.
- **Consumers:** PDF path `platform-report.service.ts:112-117` (P-6), plus any DB-side caller found in T-1 step 5
- **DoD:** (a)–(f) green and quoted in `execution.md`, falsifier observed.
- **Skills:** `systematic-debugging`

### [x] PTS-T-3 — Apply on PROD and confirm in the production PDF

- **Type:** release (DB function, PROD; a **write** — stops for the user)
- **Description:**
  1. Read `SHOW CREATE FUNCTION` on PROD and save it verbatim as `sql/resultFullDataByResultCode.before.prod.sql`. This is the PROD rollback (amended 2026-11-12 by user decision: "Save before.prod.sql in T-3"). Diff it against `before.sql`: it may differ only in the definer line and in `= 6` vs `= 34` (P-9). If anything else differs, stop and tell the user before the apply.
  2. Record the PROD baseline hashes for the same sample codes.
  3. The user applies `after.sql` on PROD: the full script, definer `prmsadmin`, in a SQL Editor tab. The alternative is `after.body-only.sql` in the routine editor.
  4. Rerun T-2 checks (b)–(e) on PROD.
  5. Look at the production PDF of result 27926 (Reporting 2026).
- **Implements:** PTS-R-1 S1 (production), PTS-R-2 (production), PTS-NFR-1 (PROD half)
- **Files:** `sql/resultFullDataByResultCode.before.prod.sql`
- **Depends on:** PTS-T-2 · **Blocks:** — · **Estimate:** S
- **Review:** checklist — same artifact as T-2; produces release evidence (override c)
- **Verification:**
  - The PROD body before the apply is saved verbatim as `before.prod.sql`. Its diff against `before.sql` is only the definer line and `= 6` / `= 34`; otherwise the user is told what else differs.
  - After the apply, (b)–(e) are green on PROD. On PROD, (b) compares every line, including the `prmsadmin` definer line.
  - The 27926 2026 PDF on `reporting.cgiar.org/reports/result-details/27926` shows Innovation Use → Actors (Other, 513753).
  - The 27926 2025 PDF is unchanged: Actors only, no readiness. That is the INC-168048 state.
- **Falsifier:** the same "version-8 hash must differ from baseline" check as T-2, on PROD.
- **Red run:** PROD on 2026-11-12, 27926 version 8 → `innovation_use_actors` NULL (proposal, Problem #4).
- **Disqualifier:** same as T-2. A PDF read from the browser cache or an older S3 file is not evidence; use a file whose timestamp is after the apply.
- **Consumers:** same as T-2
- **DoD:** PROD checks green and quoted. `before.prod.sql` is kept for the PROD rollback and `before.sql` for the TEST one; to revert, re-run the file of that environment. The user is told about OQ-1 (ticket) and the P-5 report.
- **Skills:** none mapped (project conventions)

## 4. Dependency graph

```text
PTS-T-1 → PTS-T-2 → PTS-T-3   (serial: TEST evidence before PROD write)
```

## 5. Test plan / coverage

| Scenario / clause | Task |
|---|---|
| R-1 S1: 27926 v8 actors · key set = v6 except ToC-block keys (amended 2026-11-12) · MUST NOT error | T-3 (27926 exists only on PROD); T-2 (c) with the type 2 substitute on TEST |
| R-1 S2: one 2026 result per type | T-2 (c): no live P25 key missing (types 1, 2, 5, 6, 7). Red/green is proved on types 1, 2, 6 and 7. Types 4, 5 and 8 get the key check only |
| R-2 S1: 2025 output the same | T-2 (d), T-3 |
| R-2 S2: pre-2025 output the same · MUST stay legacy | T-2 (d) (hash equality = same builder) |
| R-3: concat limit raised | T-2 (a) (assignment present). Runtime effect not observable: accepted risk (requirements §7) |
| R-4: guards unchanged | T-2 (e), T-3 |
| NFR-1: TEST before PROD, rollback kept | T-2 → T-3 order; `before.sql` (TEST), `before.prod.sql` (PROD) |
| NFR-2: no slowdown | accepted risk (requirements §7) |
| NFR-3: DBeaver body-only + COMMIT + fresh-tab check | T-2 files; T-3 apply |

## 6. Rollback

Re-run the before file of the affected environment, then check with `SHOW CREATE FUNCTION`. Each file is the `CREATE` script of that environment's previous body:
- TEST: `sql/resultFullDataByResultCode.before.sql` (`= 34`, definer `prdbusertst`)
- PROD: `sql/resultFullDataByResultCode.before.prod.sql` (`= 6`, definer `prmsadmin`, saved in T-3 step 1)

Never run one environment's file on the other (amended 2026-11-12, user decision).

**Route.** A before file is bare `SHOW CREATE` output: it has no `DROP` and no `DELIMITER`, so re-running it while the function exists fails. Use one of these:
- **(1) DBeaver routine editor:** replace the body with lines 7–81 of the before file, everything between the outer `begin` and `end`, and save. The editor sets the definer to the connection user.
- **(2) SQL Editor tab:** run `DROP FUNCTION IF EXISTS resultFullDataByResultCode;`, then execute the whole before file as a single statement (select all, Ctrl+Enter) in a tab that holds only the file. If the `DROP` is in the same tab, select-all sends two statements and the run fails.

On PROD, prefer route (2) and confirm afterwards that the definer is `prmsadmin` (clarified 2026-11-12, from a T-2 Reviewer advisory).

**Estimated LOC:** ~6 changed function lines, plus ~180 lines of before/after record copies. **PR strategy:** a single docs commit in `onecgiar_pr` (spec + `sql/`). The deploy is the DB apply, not a code PR.
