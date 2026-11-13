# Design — 2026 result PDFs lose their type-specific section

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/pdf-2026-type-section` |
| Requirements | `requirements.md` (PTS-R-1..4, PTS-NFR-1..3) |
| Depth | Lite · Bug Mode |
| Code | MySQL function `resultFullDataByResultCode`; no repo code change. SQL record in `docs/specs/bugfix/pdf-2026-type-section/sql/` |
| Repo base | `onecgiar_pr` @ `f229d0610` |
| Skills | none mapped for SQL functions → project conventions plus the pattern of `bugfix/innovation-use-youth-required/sql/` |

## 2. Executive Summary

The fix changes one branch condition in `resultFullDataByResultCode`: from "version id is 6" to "the version's phase year is 2025 or later". It also assigns `char_lim` on that branch. All other parts of the function stay byte-identical, except the definer line of `after.sql` (`prmsadmin`, the PROD script, DD-4). The user applies it through DBeaver, first on TEST and then on PROD. A before/after SQL record and verification queries prove three things:
- 2026 gains the P25 keys.
- 2025 and older output stays the same.
- The guards behave as before.

## 3. Architecture Overview

```text
PDF request (result page / public report page)
  → platform-report.service.ts:96-117   (result by code + version_id)
  → platform-report.repository.ts:28    select resultFullDataByResultCode(code, version_id, pdf_url)
       guards (not found · type 10/11 · empty url)                ← unchanged
       branch: version.phase_year >= 2025 ?                       ← CHANGED (was: p_version_id = 6)
          yes → char_lim := @@group_concat_max_len (NEW) → basic + reportSectionSevenByResultCode_P25 + toc
          no  → unchanged legacy branch (basic + reportSectionSevenByResultCode + toc)
  → platform-report.service.ts:458-468  template results_p25 / results_bilaterals_p25 / ipsr_p25 (unchanged)
```

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `sql/resultFullDataByResultCode.before.sql` | New: verbatim `SHOW CREATE FUNCTION` from TEST before the change (TEST rollback; `= 34`, definer `prdbusertst`) |
| `sql/resultFullDataByResultCode.before.prod.sql` | New in T-3: verbatim `SHOW CREATE FUNCTION` from PROD before the apply, the PROD rollback (`= 6`, definer `prmsadmin`). Added 2026-11-12 by user decision, because P-9 was refuted |
| `sql/resultFullDataByResultCode.after.sql` | New: full `DROP` + `CREATE` script with a trailing `COMMIT` and check queries. Definer `prmsadmin`, because it is the PROD script; follows the P2-4049 pattern (user decision 2026-11-12) |
| `sql/resultFullDataByResultCode.after.body-only.sql` | New: body only, for the DBeaver routine editor |

The PTS-R-1..4 verification queries are **not** a file. They are written in `tasks.md` and pasted in chat with the environment label (PROD / TEST, read-only or write), per the standing rule "queries inline, never as files".

## 5. Data Model · 6. API Design · 7. Backend Module Design · 8. Frontend

None. No table, entity, endpoint, payload contract or template changes. 2026 payloads gain the keys 2025 payloads already have.

## 9. Shared Contracts

`resultFullDataByResultCode` keeps its signature and return type. Its only reader in the repo is the PDF path (P-6).

## 10. Design Decisions

| ID | Decision | Rationale / rejected |
|---|---|---|
| DD-1 | Gate on `version.phase_year >= 2025`, read once by PK at the start of the else-block | Covers 2026 and future phases. Matches the export's P25 rule, 2025–2030 (`reporting-full-metadata-export.service.ts:47-58`). Rejected: `in (6, 8)` breaks again at the next phase. Rejected: routing in the app is a bigger change for the same result |
| DD-2 | A missing version row (NULL phase year) goes to the legacy branch | Today's behavior for any version other than 6. No new failure mode |
| DD-3 | Assign `char_lim` from `@@group_concat_max_len` at the top of the P25 branch, mirroring the legacy branch | Fixes the unassigned-variable compare (PTS-R-3) with the line the legacy branch already uses |
| DD-4 | Keep everything else byte-identical. `before.sql` must be the **live TEST body** at apply time, not the PROD paste from the proposal | The diff of before vs after shows only DD-1 and DD-3, plus the definer line of `after.sql` (`prmsadmin`, user decision 2026-11-12). TEST may differ from PROD, so the before file must be what is actually replaced (P-7) |
| DD-5 | Apply order: TEST, then verify, then the PRTest PDF look, then PROD. All DB steps are run by the user in DBeaver | Standing rule: DB-connected steps are handed to the user. DBeaver needs the body-only variant in the routine editor, and the full script ends with an active `COMMIT` and a check from a fresh tab |
| DD-6 | Siblings with the same gate (P-5) are reported at the T-1 gate, not fixed in this spec | Scope approved in the proposal. A sibling fix is a separate decision for the user |

Reversion challenge (Step 2.3): not triggered. DD-1 widens an existing branch and removes nothing that ships. Versions 6 and below are proven unchanged by PTS-R-2.

## 11. Premise Ledger

Count: 5 verified · 4 UNVERIFIED (Impact: High 1, Low 3)
Blast-radius triggers: `live-path` (the user downloads a PDF; branch point = version), `shared-state` (sibling report functions read the same version id), `consumer` (the function's JSON is read by the PDF path).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | A 2026 PDF reaches the legacy builder through this branch | live-path | `platform-report.service.ts:96-117` (result by `result_code` + `version_id`) → `:112-117` `getDataFromProcedure(report.function_data_name, [code, version, FRONT_END_PDF_ENDPOINT])` → `platform-report.repository.ts:28` `select ${procedureName}(?,?,?)`; `platform_report.id=1` → `resultFullDataByResultCode` (user query, 2026-11-12) → body `if p_version_id = 6 then … _P25 … else … reportSectionSevenByResultCode` (`SHOW CREATE FUNCTION`, user, 2026-11-12) | f229d0610 | Wrong function changed (High) | — |
| P-2 | Version 6 = Reporting 2025 and version 8 = Reporting 2026; on 8, result 27926 gets NULL actors and 49 keys, against the array and 52 keys on 6 | data-env | Queries by the user, 2026-11-12: `JSON_EXTRACT(resultFullDataByResultCode(27926, v.id, 'x'), '$.innovation_use_actors')`, `JSON_LENGTH(JSON_KEYS(…))` for `v.id IN (6,8)`; `result_actors` rows 9312 / 13953 identical | f229d0610 | Root cause wrong (High) | — |
| P-3 | Every version with `phase_year >= 2025` that can reach this function is a P25 reporting phase. No IPSR or other module version with year ≥ 2025 has results of types 1–9 | data-env | UNVERIFIED — confirm at source before relying on it | — | DD-1 adds an `app_module_id` / `reporting_phase` condition (Low) | T-1: `SELECT id, phase_name, phase_year, app_module_id, status FROM version`, plus a count of type 1–9 results per version, run by the user |
| P-4 | `reportSectionSevenByResultCode_P25` has no internal version-6 gate and returns the type keys for a version-8 result | existence | UNVERIFIED — confirm at source before relying on it | — | The builder also needs a change, which is a scope change and goes to the Pivot Protocol (High) | T-1: `SHOW CREATE FUNCTION reportSectionSevenByResultCode_P25`, read for `version`, `= 6` and `phase`; plus `JSON_EXTRACT(reportSectionSevenByResultCode_P25(27926, 8), '$.innovation_use_actors')` |
| P-5 | Siblings that read the same `p_version_id`: `resultFullDataByIPSRCode` (IPSR PDF, `platform_report.id=2`), `tocInfoByResultCode`, `reportBasicInfoByResultCode`. Whether any carries a `= 6` gate | shared-state | UNVERIFIED — confirm at source before relying on it | — | Reported at the T-1 gate; the user decides (DD-6) (Low) | T-1: `SHOW CREATE FUNCTION` of each, searched for `= 6` / `version_id` |
| P-6 | Readers of the function's output: the PDF path only. The Excel export does not call it | consumer | `grep -rn "RESULT_FULL_METADATA\|resultFullData" --include=*.ts onecgiar-pr-server/src` (excluding specs/migrations) → `platform-report-contributors.ts:3` (comment), `results.controller.ts:636` (stale API description string), `reporting-full-metadata-export.service.ts:49` (P25 years only); the export reads `getResultDataForBasicReport` `:488` and `getP25ExcelRowsByResultCodes` `:590`. DB-side callers (views, routines) not searched | f229d0610 | Another reader's output changes (Low) | T-1: `SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_DEFINITION LIKE '%resultFullDataByResultCode%'`, plus the same against `information_schema.VIEWS.VIEW_DEFINITION`, run by the user |
| P-7 | The function body lives only in the DB; the repo copy is stale | existence | `git log --all --oneline -S "resultFullDataByResultCode"` → `cbe145fc2f` (LFUB-186, 2023) plus P2-3095 / export commits that do not edit it; `migrations/1684501200975-FullReportDataFunctPDF.ts` | f229d0610 | A migration would be the deploy path (Low) | — |
| P-8 | The function returns `internal_error` on an empty `p_pdf_url`; tests pass `'x'` | data-env | Function body `elseif trim(coalesce(p_pdf_url,'')) = ''` (user paste, 2026-11-12); a query with `''` returned NULL for both versions (user, 2026-11-12) | f229d0610 | Checks read NULL for the wrong reason (Low) | — |
| P-9 | The TEST body equals the PROD body pasted on 2026-11-12 | data-env | UNVERIFIED — confirm at source before relying on it | — | `before.sql` and `after.sql` are built from TEST, not from the paste (DD-4) (Low) | T-1: `SHOW CREATE FUNCTION` on TEST, saved as `before.sql`, diffed against the proposal paste |

## 12. Budget (tripwire)

| Measure | Expected |
|---|---|
| Tasks | 3 |
| LOC | ~6 changed lines in the function. About 90 lines each in before/after SQL (record copies); verification queries live in tasks.md (no file) |
| Review rounds | 3 (one per task) |

Depth check: Lite fits. The logic change is a few lines. The 3 tasks exist because TEST, then PROD, are separate gated DB steps run by the user.
