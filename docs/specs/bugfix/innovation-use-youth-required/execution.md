# Execution — Innovation Use: Youth required, no silent Non-youth

## Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bugfix/innovation-use-youth-required/` |
| Branch | `qa-development-2026-ss` (base `e76b88603`) |
| Started | 2026-11-12 |

## IUY-T-0 — Live function snapshot

- **Status:** PASS (1 of 2 environments). The second environment is still to be pasted.
- **Date:** 2026-11-12
- **Evidence:** Santiago pasted `SHOW CREATE FUNCTION validation_innovation_use_P25`. It was saved as `sql/validation_innovation_use_P25.before.sql`.
- **Diff:** both bodies compared after normalising whitespace:
  - live body, from `CREATE DEFINER` to `END`;
  - `archive/2026-11-03-changes--innovation-use-farmer-count-nature/sql/validation_innovation_use_P25.after.sql` lines 35-572.
  - Result: `IDENTICAL`, 492 non-empty lines each. Premise P-8 is verified for this environment.
- **Environment:** the paste is from **PROD**, confirmed by Santiago on 2026-11-12. The TEST body has not been pasted. `after.sql` replaces it whole, so it only matters for roll-back on TEST.

## IUY-T-3 — TEST baseline, before applying (2026-11-12, Santiago, DBeaver screenshots)

- **Query 1** (in-scope rows with total > 0 and Youth null): **0 rows**. TEST has no natural sample, so the red must come from an in-transaction sample (Disqualifier: never claim (b) without a row).
- **Query 2** (counts by phase year, source and `valid`):

| phase_year | src | valid=0 | valid=1 |
|---|---|---|---|
| 2022 | W1/W2 | 63 | 6 |
| 2023 | W1/W2 | 31 | 20 |
| 2024 | W1/W2 | 30 | — |
| 2024 | W3 | 1 | — |
| 2025 | W1/W2 | 54 | 10 |
| 2025 | W3 | 85 | 60 |
| 2026 | W1/W2 | 42 | 7 |
| 2026 | W3 | 170 | 107 |

- **Expected after apply:** identical, because query 1 returned 0 rows.

## IUY-T-3 — SQL files (written; not applied)

- `sql/validation_innovation_use_P25.after.sql`: the full DROP + CREATE script. It is generated from `before.sql` and adds one `IF EXISTS … RETURN FALSE` in section 1 and one in section 2, each inside the existing 2026 W1/W2 gate, right after the IFC-R-6 Farmers check.
- **Diff check:** comparing `before.sql` with `after.sql` shows only the header comments and the two inserted blocks.
- `sql/validation_innovation_use_P25.after.body-only.sql`: the same body for the DBeaver routine editor.
- **Checks:** the queries are given inline in chat (user preference) and their results go here once run.

## IUY-T-3 — TEST red probe, before applying (2026-11-12, Santiago)

- **Sample:** result 11026 (2026 W1/W2, valid = 1). Actor 1962 is section 1 (women 10/2, men 20/3); actor 1053 is section 2 (women 123/12, men 345/21).
- **Probe:** two transactions, each ending in ROLLBACK:
  - section 1: `women_youth = NULL`, then `women = 0`;
  - section 2: `men_youth = NULL`, then `men = 0`.
- **Result with the current function:** `@a = 1`, `@b = 1`, `@c = 1`, `@d = 1`. This is the red: Youth null is not caught. Expected after apply: `0, 1, 0, 1`.
- **Roll-back verified:** 1962 and 1053 kept their original values.

## IUY-T-3 — Applied on TEST (2026-11-12, Santiago)

- **How:** through the DBeaver routine editor (body-only); the definer became `prdbusertst`@`%`.
- **Check:** Santiago pasted `SHOW CREATE FUNCTION` from TEST. It contains both `IUY-R-2 (NEW)` blocks, one in each section, inside the 2026 W1/W2 gate. The rest matches `before.sql`.
- **Pending:** re-run the probe (expected `0, 1, 0, 1`) and the counts (expected identical to the baseline).
- **Probe after apply:** `@a = 0`, `@b = 1`, `@c = 0`, `@d = 1`, matching the expected `0, 1, 0, 1`.
  - Youth null now blocks in section 1 (women) and in section 2 (men).
  - Total 0 does not require Youth (IUY-R-2 "zero total").
  - Red before (`1, 1, 1, 1`), green after.
- **Counts after apply:** identical to the baseline row by row (2022–2026, W1/W2 and W3). Nothing outside the target moved (IUY-R-2 "unaffected results").
- **TEST status: PASS.** PROD is pending: apply `after.sql` at deploy and run the PROD read-only query first (expected: the 2 Editing results).

## IUY-T-1 — Server null-safe Non-youth (PASS, 2026-11-12)

- **Files:** `onecgiar-pr-server/src/api/results/summary/summary.service.ts` (a `nonYouth` helper: `null` when the total or Youth is null) and `summary.service.spec.ts` (one new case covering 3 rows).
- **Red, before the fix:** `npx jest --testPathPattern "summary/summary.service.spec" -t "IUY-R-3" --maxWorkers=2` → `Received: 5000`, `Tests: 1 failed, 60 skipped`.
- **Green:** the same suite passes, 61/61. `npx tsc --noEmit -p tsconfig.json` is clean, and eslint `--quiet` is clean on both files.
- **Falsifier re-applied:** the guard was put back to `total - youth`, the test showed `Received: 5000` again, and the fix was restored.
- **Consumers checked:**
  - `bilateral/services/innovation-use-mds-validator.service.ts` calls `getInnovationUse` but never reads `*_non_youth`, so the bilateral payload contract and the change log need no update.
  - IPSR step one/three and `innovation-use.service.ts:941` derive their own values and are untouched (out of scope).

## IUY-T-2 — Client: empty Non-youth and Youth hint (PASS, 2026-11-12)

- **Files:**
  - `innovation-use-form.component.{ts,html,spec.ts}`;
  - new `internationalization/innovation-use-youth-required.copy.ts`;
  - folder `CLAUDE.md` (re-stamped).
- **Shared with another session:** the same 4 form files also hold uncommitted IWH changes (`changes/innovation-use-w3-hide-2030`). Commit them separately, selecting the hunks.
- **Discovered (in scope for IUY-R-1 "both grids"):** `validateYouth` wrote Non-youth on `body.innovatonUse.actors[i]` even when called from the 2030 grid, so the 2030 row was never recalculated while typing. The derivation now uses `actorItem`, the row actually edited. The clamp and "Youth cannot be greater" branch still use the current-use row. It is left as is (out of scope) and noted in the folder `CLAUDE.md`.
- **Red, before the fix:** `npx jest --testPathPattern "innovation-use-form.component.spec" -t "IUY-R-1" --maxWorkers=2` → `Received: 100` (the main case), `Tests: 7 failed`. The other failures came from `showYouthRequiredHint` not existing yet.
- **Green:** the `innovation-use-form` pattern passes, 4 suites and 239 tests. `--findRelatedTests` on the changed `.ts`, `.html` and copy files passes 24 suites and 1076 tests, IPSR step-n1 and innovation-use-info included. `ng lint --quiet` passes on the touched files, and `tsc --noEmit -p tsconfig.app.json` is clean.
- **Falsifier re-applied:** the gate in the derivation was replaced by `false`. Two tests failed with `Received: 100`, and the fix was restored.
- **Cannot prove here:**
  - hint placement and look → T-4 on PRTest;
  - strict template type-check → only `ng build`, which was not run locally; it runs in CI.

## IUY-T-3 — PROD pre-apply impact (2026-11-12, Santiago, read-only)

- **Query 1 on PROD:** 2 results, both section 1 and both Editing (`status_id 1`), matching the proposal's measured impact:

| result_id | code | women / youth | men / youth | valid today |
|---|---|---|---|---|
| 32484 | 18241 | 12 / NULL | 9 / NULL | 0 (already red for another reason) |
| 32503 | 18805 | 14 / NULL | 26 / NULL | 1 → will turn red after apply |

- **Net effect of the PROD apply:** 1 result changes from green to red (18805). Its owner fills Youth to clear it (R-2).
