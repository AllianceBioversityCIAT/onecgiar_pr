# Proposal — 2026 result PDFs lose their type-specific section

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/pdf-2026-type-section` |
| Slug | `pdf-2026-type-section`, taken from the first token of the argument; the rest of the argument is context |
| Type | **Bug** |
| Deliverable | software (DB function; no app code expected) |
| Approval Mode | gated |
| Ticket | none yet. Found on 2026-11-12 while closing INC-168048 (`changes/bilateral-pdf-mds-only`) |
| Requirement source | Investigation in this session: SHOW CREATE FUNCTION output and 3 read-only queries run by Santiago Sanchez in DBeaver on 2026-11-12 |
| Visual source | None. The PDF templates do not change; only the data feeding them does |
| Repos / systems | MySQL DB functions (PROD + TEST). `onecgiar_pr` is touched only for the spec and the before/after SQL record, following the `bugfix/innovation-use-youth-required/sql/` pattern |
| Depends on | none · Parallel-safe: yes |
| Date | 2026-11-12 |

## Intent

Every result PDF generated for the **Reporting 2026** phase should print its type-specific block, as 2025 PDFs do. Examples of that block: Innovation Use actors, Innovation Development details, Capacity Sharing and Policy Change.

## Problem / Current Behavior

| # | Fact | Citation |
|---|---|---|
| 1 | The PDF payload comes from DB function `resultFullDataByResultCode(result_code, version_id, pdf_url)` | `platform-report.service.ts:112-117` → `platform-report.repository.ts:28` (`select <fn>(?,?,?) as result`); `platform_report` row 1 = `resultFullDataByResultCode` (query by the user, 2026-11-12) |
| 2 | The function uses the P25 type-section builder **only when `p_version_id = 6`**. Every other version falls to the legacy `reportSectionSevenByResultCode` | `SHOW CREATE FUNCTION resultFullDataByResultCode` (pasted by the user, 2026-11-12): `if p_version_id = 6 then … reportSectionSevenByResultCode_P25 … else … reportSectionSevenByResultCode` |
| 3 | Version 6 = Reporting 2025, version 8 = Reporting 2026 | Query `version.id IN (6, 8)` (user, 2026-11-12) |
| 4 | For the same result, v6 returns `innovation_use_actors` and 52 keys. v8 returns `innovation_use_actors` = NULL and 49 keys | `JSON_EXTRACT(resultFullDataByResultCode(27926, v.id, 'x'), …)`, `JSON_LENGTH(JSON_KEYS(…))` (user, 2026-11-12) |
| 5 | The underlying data is identical: both `result_actors` rows are type 5 "Other", `how_many` 513753, `sex_and_age_disaggregation` 1, `section_id` 1, active | `SELECT ra.* FROM result_actors WHERE result_id IN (31281, 32704)` (user, 2026-11-12) |
| 6 | Visible effect: the 2026 PDF of result 27926 has no Innovation Use section, while the 2025 PDF shows the Actors table | Production PDFs `PRMS-Result-27926_P25_20261112_2046.pdf` (v8, 1 page) vs `…_2038.pdf` (v6, page 2 Actors), read 2026-11-12 |
| 7 | In the v6 branch `char_lim` is never assigned before `if (char_lim < 150000)`, so `group_concat_max_len` is not raised for 2025 PDFs | Same function body, v6 branch |
| 8 | The function body exists **only in the DB**. The repo copy is a stale 2023 migration | `git log --all -S resultFullDataByResultCode` → `cbe145fc2f` (LFUB-186) only; `migrations/1684501200975-FullReportDataFunctPDF.ts` |
| 9 | The function returns `internal_error` when `p_pdf_url` is empty, so ad-hoc tests must pass a non-empty URL | Function body, `elseif trim(coalesce(p_pdf_url,'')) = ''` |

## Proposed Outcome

- A Reporting 2026 PDF (W1/W2 `results_p25` and bilateral `results_bilaterals_p25`) prints the same type-specific block a 2025 PDF prints, from the same P25 builder.
- `group_concat_max_len` is raised on every P25 path.
- Pre-2025 phases keep the legacy builder, unchanged.

## Scope

- `resultFullDataByResultCode`: route P25-era phases (2025+) to `reportSectionSevenByResultCode_P25`, and assign `char_lim` on that path.
- Before/after SQL record in the spec folder; verification queries in `tasks.md`, pasted in chat (no query files).
- Check the sibling functions listed under Blast Radius and fix only those with the same version gate.

## Non-Goals

- Adding 2026-only fields to the P25 builder (Youth split, `count_unit` / `use_nature`, farmer follow-up). That is a separate change once 2026 renders at all.
- PDF template changes (pdf-viewer repo).
- The full-metadata Excel export. It uses its own P25 tabular view for 2025–2030 (`reporting-full-metadata-export.service.ts:47-58`).

## Affected Users, Systems, And Specs

| Who / what | Impact |
|---|---|
| Anyone downloading a 2026 result PDF (submitters, PMU, public report page `/reports/result-details/<code>`) | The type block appears again |
| `results_p25`, `results_bilaterals_p25` templates | Receive P25 keys for 2026 |
| `changes/bilateral-pdf-mds-only` (INC-168048) | Its bilateral MDS filtering then also shows on 2026 PDFs |
| P2-3095 (`platform-report-contributors.ts`) | Already adds 2026 contributors data in the app; must keep working |

## Visual Reference

- Source: None
- Notes: data-layer bug. The expected output is the 2025 PDF layout, already in production.

## Bug Diagnosis

### Observed Symptom
A 2026 result PDF prints no type-specific section, even when the data exists. Seen on result 27926 (Innovation Use, bilateral): no Actors table.

### Reproduction Steps
1. Run `SELECT JSON_EXTRACT(resultFullDataByResultCode(27926, 8, 'x'), '$.innovation_use_actors');` → expected the actors array, actual `NULL`.
2. Run the same with `6` → returns the array.
3. In production, open `reporting.cgiar.org/reports/result-details/27926` (2026) → the PDF has no Innovation Use section.

### Root Cause (confirmed)
`resultFullDataByResultCode` hard-codes `p_version_id = 6` as the only P25 version. Reporting 2026 (version 8) goes to the legacy `reportSectionSevenByResultCode`, whose keys the P25 templates do not read. Facts 2–6 confirm it. The data is identical, only the version differs, and the output differs at exactly that branch.

### Blast Radius

| Check | Recorded as | Result |
|---|---|---|
| **Already fixed?** | `git log --all --oneline -S "reportSectionSevenByResultCode"` and `-S "resultFullDataByResultCode"` → only `cbe145fc2f` (LFUB-186, 2023), `009915733a`, `aa7c8fb807`, `c760fe8b5b`, `1e314e8c9e`, `b1faf707f4` / `8822ad2dbd` (P2-3095: app-side 2026 contributors, does not touch the function); `grep docs/` → 0. The live function body (2026-11-12) still has `= 6` | **Not fixed** |
| **Live path?** | PDF request → `platform-report.service.ts:96-117` (result lookup by code + `version_id`) → `select resultFullDataByResultCode(code, version_id, FRONT_END_PDF_ENDPOINT)` → branch `p_version_id = 6` (false for 8) → `reportSectionSevenByResultCode` → template chosen at `:458-468` (`results_p25` / `results_bilaterals_p25`, regardless of phase) | **On the live path**; reproduced in production |
| **Siblings on the same state** | (a) `resultFullDataByIPSRCode` (IPSR PDF, `platform_report` row 2): same version-gate pattern **UNVERIFIED, confirm at source before relying on it** (settled by `SHOW CREATE FUNCTION` in specify). (b) `tocInfoByResultCode`, `reportBasicInfoByResultCode`: take `p_version_id`, internal phase gates **UNVERIFIED** (the 2026 PDF of 27926 also had no ToC block; may be data). (c) `reportSectionSevenByResultCode_P25`: may itself assume version 6 internally, **UNVERIFIED** | Feeds scope; all three settled in `/akili-specify` |
| **Downstream consumers** | `platform-report.service.ts` (PDF, both templates); public report page; full-metadata export `reporting-full-metadata-export.service.ts` only for non-P25 phases (P25 uses the tabular view, `:47-58`, `:523`); `results.controller.ts:636` documents the export default. pdf-viewer templates `results_p25`, `results_bilaterals_p25`. No Jest test covers the SQL function (it is not in the repo) | Export not affected for 2026; both PDF templates affected |

- **Data integrity:** read-only function, no writes. The only effect is incomplete PDFs since the 2026 phase opened. Users may hold incomplete 2026 PDFs already downloaded.

### Fix Strategy
The smallest safe correction is in the function, applied as a DB change (TEST, then PROD) with before/after SQL kept in the spec:

```sql
-- was: if p_version_id = 6 then
if (select v.phase_year from version v where v.id = p_version_id) >= 2025 then
  set char_lim = (select @@group_concat_max_len);
  ...
```

Route: `/akili-specify` (Lite) in **Bug Mode**. The function lives outside the repo, so the regression "test" is a SQL check:
- **Red before the fix:** v8 → `innovation_use_actors` NULL.
- **Green after the fix:** v8 → the array. v6 output is byte-identical before vs after, so 2025 does not regress.
- Plus one 2026 result per type.

## Approach Options

| Option | What | Pros | Cons |
|---|---|---|---|
| **A — Phase-year gate (recommended)** | `phase_year >= 2025` from `version` | Covers 2026 and future phases without new edits; one-line change; same rule the export uses (2025–2030) | Must confirm no non-reporting version (e.g. IPSR) with `phase_year >= 2025` reaches this function. Types 10/11 are already rejected at the top |
| B — Version list | `p_version_id in (6, 8)` | Smallest diff | Breaks again at the next phase; same class of bug |
| C — Route in the app | One `platform_report` row per phase model; the server picks the function by phase | Logic in versioned code | Bigger change (entity data + service + tests); the legacy/P25 split still lives in SQL |

## Recommended Approach

**Option A.** One condition plus `char_lim` assigned, verified with SQL:
- v6 byte-identical before vs after.
- v8 returns P25 keys for one result per type (Innovation Use, Innovation Development, Capacity Sharing, Policy Change, KP, Other outcome/output).
- The 2026 PDF of 27926 rendered after the change.

## Risks, Dependencies, And Open Questions

| ID | Item |
|---|---|
| R-1 | The P25 builder may not know 2026-only fields (Youth split, new actor follow-ups), so 2026 PDFs may show 2025-shaped data. Better than nothing, but list the gaps in specify (Non-Goal, follow-up) |
| R-2 | Shared function used by every PDF. Verify on TEST first; keep the `before.sql` for rollback (pattern from `bugfix/innovation-use-youth-required/sql/`) |
| R-3 | DBeaver routine editor wants a body-only script; scripts end with an active COMMIT and a check from a fresh tab |
| OQ-1 | Is there a Jira ticket to attach, or should one be opened (P2 / INC)? |
| OQ-2 | Is the version → phase_year mapping safe? `SELECT id, phase_name, phase_year, app_module_id FROM version` settles it in specify |
| OQ-3 | Siblings (a)–(c) in Blast Radius: same gate or not |
| OQ-4 | Who applies to PROD (user via DBeaver, as with P2-4049)? |

## Success Criteria

- `JSON_EXTRACT(resultFullDataByResultCode(27926, 8, 'x'), '$.innovation_use_actors')` returns the actors array.
- For a sample of 2025 results, `resultFullDataByResultCode(code, 6, 'x')` is identical before vs after.
- The production PDF of result 27926 (2026) shows Innovation Use with the Actors table, and a W1/W2 2026 result of another type shows its type block.

## Next Step

```text
/akili-specify bugfix/pdf-2026-type-section   (Lite, Bug Mode)
```
