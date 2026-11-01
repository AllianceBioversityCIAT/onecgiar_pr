# Archive Summary — ToC KPI question optional vs. green check (`bugfix/toc-kpi-optional-green-check`)

## 1. Document Control

| Field | Value |
|---|---|
| Ticket | P2-4061 (Jira comment 44531, 2026-10-31) |
| Original spec path | `docs/specs/bugfix/toc-kpi-optional-green-check/` |
| Archive date | 2026-10-31 |
| Final status | **Done.** 3/3 tasks `[x]`. On `performance-refactor` (PRTest) since 2026-10-31; not yet on staging or master |
| Branch | `qa-development-2026-ss`, a spec branch, so shared guides and the TRD were not written (see the kaizen entry) |
| Mode | Lite · Bug Mode · gated |

## 2. Outcome

For 2026+ results, the Contributors & partners green check no longer fails just because *"Can this result be mapped to a ToC KPI?"* is unanswered. That is what the form already showed ("Section complete").

## 3. Requirements Delivered

| ID | Delivered by | Evidence |
|---|---|---|
| TKG-R-1 (S-1.1 to S-1.5) | Migration `1792100000000` (TKG-T-1) | Regression spec red → green; PRTest read-only checks (TKG-T-3) |
| TKG-R-2 (S-2.1) | QA catalog `toc.planned_result` `required: false` (TKG-T-2) | S-2.1 spec; catalog suite 638/638 |
| TKG-NFR-1/2 | `down` restores the P2-3901 body; body outside the gate identical | Spec cases (b), (c); two lens reviewers |
| TKG-NFR-3 | `npm run migration:check` run by Santiago | Both classes load; 2 pending as expected |

## 4. Files Changed

Commit `7227e8d4c` (15 files), all under `onecgiar-pr-server/src/` except the spec:

| File | Change |
|---|---|
| `migrations/1792100000000-TKG-TocKpiOptionalGreenCheck.ts` | NEW: `up` = P2-3901 body + lines tagged `-- TKG-GATE`; `down` = imported P2-3901 body |
| `migrations/1792000000000-IRS-ImpactResultsFoundation.ts` | `export` added to `CONTRIBUTOR_PARTNER_WITH_IMPACT` only (design §7 exception) |
| `api/results-framework-reporting/contributors-partners/contributor-partner-green-check.migration.spec.ts` | NEW regression spec, cases (a)–(d) |
| `api/qa-catalog/definitions/sections/contributors-partners.ts`, `definitions/versions.ts`, snapshot + 4 catalog specs | `required: false`; revision 30 → 31 (became **32** in the merge into performance-refactor, `ff95c902a`, because P2-4040 had also taken 31) |

## 5. Test Evidence

| Check | Result |
|---|---|
| Regression spec | Red 3 failed / 1 passed → green 4/4. Falsifier (`> 0` → `>= 0`) fails case (b) |
| QA catalog suite | 25/25 suites, 638/638 tests |
| Lint | Clean on all touched files |
| PRTest (TKG-T-3) | Result 12333 (code 8456) green and "Section complete". 2025 NULL stays red; No without narrative stays red; partner failures stay red |

`test-report.md` / `validation-report.md`: not produced (Lite bug spec). Absence accepted; the evidence above lives in `execution.md`.

## 6. Accepted Warnings and Follow-Ups

- TKG-T-3 #2 (Yes incomplete) and #6 (row with NULL answer) are indirect; covered statically by spec case (b).
- Reviewer advisories for the regression spec, not done:
  - pin the gate's THEN line or the exact tagged lines;
  - widen the selector regex to `CREATE DEFINER=… FUNCTION`;
  - pick the class by `prototype.up`;
  - cache `newestFunctionMigration()`.
- Promotion to staging and master follows the usual release cadence (Cristian).

## 7. Historical Notes

- Root cause: client commit `9135ef328` (2026-08-26, `quick/non-mandatory-toc-kpi`) made the question optional for 2026. The DB function's `ELSE` branch kept treating NULL as "Yes".
- The TKG-T-2 implementer stayed alive about 7 h after its hand-back with an idle background shell. The Leader stopped it when Santiago pointed it out.
- The merge into performance-refactor was done by the parallel session of `sp-reporting-entry`. It included that spec's commits and reconciled the catalog to 2026.32.
