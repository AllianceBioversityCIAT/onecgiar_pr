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
