# `bugfix/w12-overview-phase-origin-alignment` — Design

## 1. Summary

- **Spec:** `bugfix/w12-overview-phase-origin-alignment` · **Depth:** Standard (Bug Mode) · **Status:** approved (2026-08-28)
- **Linked:** `./requirements.md` (W12-R-1..4) · `./proposal.md` §3 diagnosis
- **One-liner:** Two server predicates fixes (meter: add `fundingSource`; matrix: origin + role + `version_id` + reconciled universe with a new optional `versionId` param) and a client one-liner passing the phase and versioning the cache. No migration, no shape change.
- **Budget (Step 2.4):** **3 tasks · ~220 LOC (≈70 src + ≈150 spec) · 1 review round per task.** Matches Standard-Bug; proposal §11 estimated 180–240.

## 2. Architecture Overview

### 2.1 Where this lives

| File | Change |
|---|---|
| `onecgiar-pr-server/src/api/results/results.service.ts` (~:1798 `getScienceProgramProgress`) | `filters` gains `fundingSource: ['Result']` (the repo already applies it at `result.repository.ts:739`). Nothing else. |
| `onecgiar-pr-server/src/api/results/result.repository.ts` (`getIndicatorContributionSummaryByProgram` ~:2614) | Signature `(initiativeId, versionId)`; SQL: `+ AND r.source = 'Result'`, `+ AND rbi.initiative_role_id = 1`, `COALESCE(...) = ?` → `r.version_id = ?`, `status_id IN (1,2,3)` → `status_id != 4`, `result_type_id IN (...)` → `NOT IN (10, 11)` (meter's `excludeType`). Keep `result_level_id IN (3,4)` unless the meter contradicts it (Implementer verifies against `:627-712`; record). |
| `onecgiar-pr-server/src/api/results-framework-reporting/results-framework-reporting.service.ts` (`getProgramIndicatorContributionSummary` ~:558) | Accept optional `versionId`; resolve default via `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)` (inject if not present); stop using `activeYearValue` for this call (`resolveInitiativeAndYear` stays for other callers). Status→bucket mapping unchanged (`others` now receives statuses ∉ {1,2,3}). |
| `…/results-framework-reporting.controller.ts` (~:175) | `@Query('versionId') versionId?: string` → numeric parse, pass through; `@ApiQuery` doc. |
| `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts` (~:1428) | `GET_IndicatorContributionSummary(program, versionId?)` appends `&versionId=` when present (mirror `GET_ResultToReview`'s pattern). |
| `onecgiar-pr-client/…/dashboard-lab/dashboard-lab.component.ts` (~:1631 `loadSummaries`) | Resolve `versionId` exactly like `loadBilateralRows` (agy: `latestVersion(selected)?.versionId ?? reportingCurrentPhase?.phaseId`); pass it; `summariesByCode` key = `${code}::${versionId ?? 'default'}`; all readers of the map use the same key helper. |
| Specs | server: `results.service.spec.ts`, `result.repository` spec (or `results-framework-reporting.service.spec.ts` — whichever already exercises the SQL builder/mapping), controller spec; client: `results-api.service.spec.ts`, `dashboard-lab.component.spec.ts`. |

### 2.2 Interaction
1. **Meter:** unchanged flow; the repo's existing `addInGeneric('r.source', …)` now fires → bilaterals drop out. W3 meter unaffected (different source).
2. **Matrix:** client resolves the phase (agy's helper) → `?program=SP04&versionId=NN` → controller → service (default when absent) → repo SQL scoped by version/origin/role/universe → same response shape → `dashboard-lab` caches per code+version → heatmap/bars unchanged.
3. **Regression fixtures (Bug Mode):** server-side, a mixed fixture (W1/W2 current-phase rows; bilateral rows incl. status 5 and status 1; contributor-role rows; other-version rows) → each spec asserts the excluded class is excluded; the W12-R-3 parity spec runs meter and matrix mappers over the same fixture. **Red first:** the Implementer runs each new spec against the pre-fix code and records the red output in the report.

## 3. Data Model Changes
None.

## 4. API Surface
`GET /api/results-framework-reporting/programs/indicator-contribution-summary?program=SPxx&versionId=NN` — `versionId` optional numeric; absent → active reporting phase. Response unchanged. Documented via `@ApiQuery`. (api-design: additive, backward compatible.)

## 5. Server Workflow
No new workflow; predicate changes only.

## 6. Frontend Plan
No UI change; figures only. Cache key versioning is internal.

## 7. Security / 8. Performance / 9. Observability
`versionId` parsed with `Number`, non-finite → default (never raw into SQL — parameterised anyway) / narrower scans / none.

## 10. Testing Plan

| Spec | Cases |
|---|---|
| Server progress (`results.service.spec.ts`) | filters passed to the repo include `fundingSource: ['Result']` and `versionId` (existing behaviour) — **red before** (no `fundingSource`) |
| Server summary SQL/mapping | with the mixed fixture: bilateral excluded, role-2 excluded, other-version excluded, status-5 row absent for W1/W2, status ∉{1,2,3} lands in `others`; `versionId` default = active phase; explicit `versionId` honored; non-numeric → default |
| Server parity (W12-R-3) | meter breakdown total === Σ matrix totals over the same fixture |
| Client api | `GET_IndicatorContributionSummary('SP04', 12)` URL contains `versionId=12`; absent → no param |
| Client dashboard-lab | `loadSummaries` passes `latestVersion` id; cache keyed by code+version (V1 cached, V2 fetches) |
| Static | no secrets; `npm run migration:check` clean |
| Manual | W12-AC-4 |

## 11. Backwards Compatibility
Endpoint additive; default behaviour changes from year-scoped to phase-scoped — intended (that IS the bug). Other callers of `getIndicatorContributionSummaryByProgram`: Implementer greps; if any exist, they get the same default (record in execution).

## 12. Design Decisions

| # | Decision | Rationale / rejected |
|---|---|---|
| `W12-DD-1` | Fix at the SQL/service layer, not client filtering | Source of truth; rhymes with agy's W3 fix; Option B (client-side over 2000 rows) rejected. |
| `W12-DD-2` | Matrix universe = meter universe (`status != 4`, type ∉ {10,11}) | W12-R-3 parity; the Results tab applies no status filter, so any `IN (1,2,3)` is an unmatchable narrowing. |
| `W12-DD-3` | `version_id` replaces the year-COALESCE | Phase is the owner's contract; `year.active` is a decoupled config row; `reported_year_id` override was silently pulling other versions in. |
| `W12-DD-4` | Client passes the phase via agy's `latestVersion` helper; server defaults to `$_findActivePhase` | Same resolution both sides; the residual risk (>1 open phase) is a pre-flight DB check, not code. |
| `W12-DD-5` | Cache key includes version | Otherwise phase switches serve stale matrices (proposal §3). |

**Reversion challenge (Step 2.3):** two reversions of shipped behaviour — (a) matrix status set `IN (1,2,3)` → `!= 4`; (b) year-scoping → version-scoping. Challenge "what does removing this break?": (a) the `others` bucket becomes live → the heatmap `'Other'` column starts showing real counts (OQ-1 default: keep — it was designed for exactly this); (b) results with `reported_year_id` pointing at the active year but an older `version_id` stop counting → that is the bug's own definition; no consumer depends on it (Implementer greps callers). Both accepted.

## 13. Open Gaps & Follow-ups
- Pre-flight DB check (execution): `SELECT id, phase_name, phase_year, portfolio_id, app_module_id, status, is_active FROM version WHERE app_module_id = 1 AND is_active = 1;` — if >1 open, record and escalate before W12-T-2.
- Meter "Not started" slot always 0 for W1/W2 (OQ-2) → later quick if the owner wants it hidden.
