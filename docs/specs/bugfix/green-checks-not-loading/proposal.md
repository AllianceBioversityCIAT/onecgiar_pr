# Proposal: Green Checks 404 on Result Detail (P25 endpoint)

## 1. Document Control

| Field | Value |
|---|---|
| Slug | `green-checks-not-loading` — derived from free-text bug report (404 on green-checks endpoint, section shows complete but check never loads) |
| Spec Path | `docs/specs/bugfix/green-checks-not-loading/` |
| Type | **Bug** |
| Parent Spec | none |
| Approval Mode | `gated` (default) |
| Reported by | santiago.sanchez@cgiar.org |
| Date | 2026-08-27 |

## 2. Intent

Stop the 404/500-style failure the client gets when fetching P25 green-checks for a result, so section-completeness indicators load as expected — on `prtest` and locally.

## 3. Problem / Current Behavior

On both the test environment (`prtest.ciat.cgiar.org`) **and the reporter's local dev stack**, opening a P25 result's General Information section shows all fields answered, but the green-check indicator never turns on. DevTools shows the underlying request failing:

```
GET https://prtest-back.ciat.cgiar.org/v2/api/results/results-validation/get/green-checks/11401
→ 404 Not Found
```

The same request against a local `npm run start:dev` backend, hit directly (bypassing the client), returns:

```
GET http://localhost:3400/v2/api/results/results-validation/get/green-checks/11401
→ 404 Not Found  { "message": "Result not found" }
```

## 4. Proposed Outcome

The request above returns `200` with `{ green_checks, submit }`, and the UI reflects real section completeness for P25 results, both locally and on `prtest`.

## 5. Scope

- Recreate the `validation_contributor_partner_P25` MySQL function from the committed migration SQL wherever it has drifted from that source (confirmed: the reporter's local DB; to be confirmed: `prtest`'s DB).
- No application code change is needed — the bug is in database-level state (a stored function), not in the NestJS source.

## 6. Non-Goals

- Changing the green-checks calculation logic (`calculateValidationSections`) or any migration file — they are already correct.
- Touching the P22 (non-versioned) green-checks endpoint — it is unaffected.
- Any client-side change — the client already calls the correct, documented URL.
- Any change to the Nest route decorators — `findAllV2` is correctly registered (`@Version('2') @Get('get/green-checks/:resultId')`) in the current codebase; that is a red herring from an earlier hypothesis (see Risks).

## 7. Affected Users, Systems, And Specs

- **Users:** Anyone reporting a P25 result — the section-completeness / Submit-readiness signal is invisible, on any environment whose DB carries the stale function.
- **Systems:** MySQL function `validation_contributor_partner_P25` (created by migrations `1762528725798-createValidtionP25` then replaced by `1762866499786-updatepartnersContributors`), called from the stored procedure `validate_sections_mapped_batch`, called from `ResultsValidationModuleService.calculateValidationSections` (`onecgiar-pr-server/src/api/results/results-validation-module/`).
- **Client call sites (unaffected, already correct):** `results-api.service.ts:786-788` (`GET_p25GreenChecksByResultId`), routed to by `green-checks.service.ts` when `FieldsManagerService.isP25()` is true.

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: Backend/DB issue — no UI surface to mock. The attached screenshot (network tab) is diagnostic evidence, already reflected in the Bug Diagnosis below.

## 9. Bug Diagnosis

### Observed Symptom
On a P25 result's Result Detail page, section-completeness ("green check") never activates even when a section (e.g. General Information) is fully filled in. Network tab shows the request the frontend makes for this indicator returning `404 Not Found` — reproduced both on `prtest` and on the reporter's local backend.

### Reproduction Steps
1. Start the local backend (`npm run start:dev`, port from `.env`) against a local DB with the current migrations applied.
2. Call `GET /v2/api/results/results-validation/get/green-checks/:resultId` for any active P25 result (e.g. id `11401`, portfolio `P25`, `result_type_id = 7`).
3. Response is `404 Not Found` — `{"message":"Result not found"}` — even though `GET /api/results/results-validation/get/green-checks/:resultId` (the v1/P22 path) returns `200` for the same id.

### Root Cause (confirmed)
The v1 vs v2 split is a **red herring** — both routes are correctly registered in the current codebase (`results-validation-module.controller.ts:19-30`, fix from commit `072acf1ef`, present on `master`/`staging`/`dev`). The real defect is in **database state**, not application code.

`calculateValidationSections` (v2) delegates to `resultValidationRepository.validateResultById`, which calls the stored procedure `validate_sections_mapped_batch`. For a P25 result, that procedure dynamically invokes the MySQL **function** `validation_contributor_partner_P25(resultId)`.

Verified by direct DB inspection (local dev DB):

```sql
SHOW CREATE FUNCTION validation_contributor_partner_P25;
-- contains:
--   FROM results_toc_result rtr
--     INNER JOIN results_by_inititiative rbi
--       ON rbi.result_id = rtr.results_id
--      AND rbi.initiative_id = rtr.initiative_id   -- ← broken column name
```

`results_by_inititiative` has no `initiative_id` column — the project deliberately keeps the misspelled `inititiative_id` (see `onecgiar-pr-server/src/CLAUDE.md` §2.3, "naming gotchas"). Calling the procedure directly reproduces the exact underlying error:

```
ER_BAD_FIELD_ERROR (1054): Unknown column 'rbi.initiative_id' in 'on clause'
```

`validateResultById` swallows that SQL error (`.catch(() => [null])`) and returns `null`, which `calculateValidationSections` maps to `NotFoundException('Result not found')` — surfacing as the HTTP `404` the client sees. **The 404 is a mislabeled 500**: the result exists and is perfectly valid; the query that's supposed to check it never ran.

Critically, **this join text does not exist anywhere in the current source tree** (`grep -r "rbi.initiative_id = rtr.initiative_id" src/` → no matches). Neither migration that ever defined this function — `1762528725798-createValidtionP25` (original) nor `1762866499786-updatepartnersContributors` (the update that superseded it, and whose row is marked applied in the local `migrations` table) — contains the broken join. I extracted the exact `CREATE FUNCTION` SQL committed in `1762866499786`'s `up()`, dropped the live (broken) function, and recreated it from that committed SQL. Result:

```
GET /v2/api/results/results-validation/get/green-checks/11401 → 200
{"response":{"green_checks":[{"section_name":"general-information","validation":true}, ...
```

This confirms the migration file is correct — the local database's stored function had **drifted from what the migrations define**, most likely because the local DB is a shared/inherited dump or snapshot taken from a point where an intermediate, hand-patched, or since-corrected version of this function was in place, and the `migrations` table's bookkeeping (which only records that a migration *ran*, not that its current DDL still matches disk) never re-synced it.

### Impact & Scope
- Confirmed root cause and fix **locally**. Not yet confirmed whether `prtest-back`'s database has the same drift — the earlier hypothesis (stale Jenkins deploy, code-level 404) was wrong: the *code* on `dev` is fine, but if `prtest`'s **database** was seeded/migrated the same way as the reporter's local DB, it would show the identical symptom for the identical DB-state reason, independent of which backend build is deployed.
- Only `validation_contributor_partner_P25` was found broken; this is a single stored function affecting the `contributor-partners` section validation for P25 results specifically. Other validation functions (`validation_geo_location_P25`, `validation_evidences_P25`, `validation_innovation_dev_P25`, etc.) were spot-checked and do not contain the same broken pattern.
- No data integrity or security impact — this is a read-only validation query.

### Fix Strategy
No source-code change — the migration files are already correct. The fix is **operational, per-database**: drop and recreate `validation_contributor_partner_P25` from the current `1762866499786-updatepartnersContributors` migration's `up()` SQL, wherever the live function has drifted. Concretely:
- **Local:** already fixed and verified in this session (see above) — the reporter's local dev DB now has the correct function.
- **`prtest`:** needs the same check — connect to the `prtest` MySQL instance, run `SHOW CREATE FUNCTION validation_contributor_partner_P25`, and compare against the committed migration. If it matches the broken pattern, apply the same drop/recreate.
- **Root cause of the drift** is still an open question (see Risks) — worth understanding before writing this off as a one-time fix, since any other environment seeded the same way could carry the same stale function.

This does **not** route to `/akili-specify` — no source code changes. It routes to an operational DB fix on whichever environments are affected.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Drop + recreate the function from the committed migration on every affected DB** (recommended) | Directly fixes the drifted state; matches what the migration already defines. | Needs DB write access on each affected environment (already done locally; `prtest` still pending). |
| B. Write a new "repair" migration that re-runs `DROP FUNCTION` + `CREATE FUNCTION` for `validation_contributor_partner_P25` | Makes the fix replayable via `migration:run` on any environment, including ones nobody has DB console access to. | Slightly odd to add a migration whose net DDL effect is identical to one already in history — but it's the standard way to force convergence on a MySQL object that migration bookkeeping can't detect has drifted (TypeORM only tracks "did this migration run," not "does the DB still match its DDL"). |
| C. Investigate *why* the function drifted before fixing anything | Prevents recurrence if this is a symptom of a bad DB-seeding/refresh process shared across dev machines. | Slower; the user is currently blocked, so diagnosis-first delays the actual unblock. |

## 11. Recommended Approach

**Option A** to unblock immediately (already done locally), **Option B** if `prtest` (or any other shared environment) turns out to have the same drift — a repair migration is safer than one-off manual `DROP`/`CREATE` on a shared DB, since it's auditable and replayable. Option C's investigation (how did local DBs get this stale function) is worth a follow-up but shouldn't block the immediate fix.

## 12. Risks, Dependencies, And Open Questions

- **Open question:** Does `prtest`'s database have the same drifted function? Needs direct DB access to `prtest`'s MySQL instance (not checked in this session — only the reporter's local DB was inspected).
- **Open question:** How did the local DB end up with a function body that matches no migration in git history? Candidates: DB seeded from an old shared dump/snapshot; a manual patch applied directly against the DB at some point and never reconciled; or a since-reverted migration that ran once locally and was never re-run after being fixed. Worth a short follow-up so other developers' local DBs (or `prtest`) aren't silently carrying the same drift.
- **Dependency:** Fixing `prtest` requires DB credentials/access this session doesn't have configured.
- **Risk:** If the drift mechanism is systemic (e.g., a shared onboarding DB dump), other stored functions/procedures could carry similar staleness that hasn't surfaced yet because nothing has exercised them. A quick audit of the other `validation_*_P25`/`validation_*_P22` functions against their migrations (already spot-checked, see Impact & Scope) is cheap insurance.
- **Correction to earlier hypothesis:** An initial pass at this diagnosis (before the user confirmed local reproduction) assumed the 404 meant a stale Jenkins deploy of `prms-reporting-tool-dev` — that was wrong. The route is correctly registered in the current code on every branch checked. Local reproduction disproved the deploy theory and pointed at DB state instead.

## 13. Success Criteria

- `GET .../v2/api/results/results-validation/get/green-checks/:resultId` returns `200` with `{ green_checks, submit }` for a valid P25 result id, on local **and** on `prtest`.
- The green-check indicator updates correctly in the UI for a P25 result with a complete section, in both environments.
- `SHOW CREATE FUNCTION validation_contributor_partner_P25` matches the SQL in `1762866499786-updatepartnersContributors.ts`'s `up()` on every environment checked.

## 14. Next Step

No `/akili-specify` needed for the local fix — already applied and verified in this session, no source change. For `prtest` (and any other shared environment):

```text
# 1. Connect to the prtest MySQL instance and check for drift:
SHOW CREATE FUNCTION validation_contributor_partner_P25;
# 2. If it contains "rbi.initiative_id = rtr.initiative_id" (or otherwise doesn't match
#    src/migrations/1762866499786-updatepartnersContributors.ts's up()), recreate it from
#    that migration's committed SQL (drop + create).
# 3. Re-test: GET /v2/api/results/results-validation/get/green-checks/:resultId → expect 200.
```

If a repair migration (Option B) is preferred over a manual fix on `prtest`, that would be the next `/akili-specify bugfix/green-checks-not-loading` — a single migration whose `up()` drops and recreates `validation_contributor_partner_P25` with the already-correct DDL, so the fix ships through the normal `migration:run` pipeline instead of a manual DB session.
