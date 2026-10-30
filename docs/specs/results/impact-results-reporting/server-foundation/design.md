# Design — Impact Results: Server Foundation

## 1. Summary

Adds server support for **impact results** (existing `result_level` 1 + `result_type` 9) without new taxonomy rows: an impact branch in the framework create handler (validation, no ToC link, score prefill), a new `impact-level` NestJS module with three tables (study-type catalog, per-result impact data, previous-result links), a P25 green check for the new section, and type-9 gates inside the two live SQL functions that would otherwise block impact results (contributors ToC, geography). The biggest constraint: the P25 validation functions live partly outside the repo, so every SQL change starts from the **live** body and is reversible to it.

- Requirements: [`requirements.md`](./requirements.md) · Family: [`../family.md`](../family.md) · Proposal: [`../proposal.md`](../proposal.md)
- Baseline: `docs/prd.md` G1, G2, US-S1, US-S2 · `docs/trd/trd.md` §3, §4, §5 W1/W2/W7 · `docs/ux-ui/design.md` (no server UX)
- Bilateral contract `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`: **not changed** (§4.2).

| Field | Value |
|---|---|
| Depth | Full |
| Approval Mode | gated |
| Delegation | Code facts gathered by 3 Explore scouts (2026-10-29); design written inline |

---

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| IRS-P-1 | Level 1 `Impact`, type 9 `Impact Contribution` and `result_by_level (1,9)` exist | `migrations/1665720566708-insertResultLevelType.ts:36,76,125`; no later migration removes (1,9) | Repo read of seed + later `result_by_level` migrations | `verified` (repo + live, IRS-T-1: row id 13) | Migration inserts/activates the missing rows; `createOwnerResult` otherwise returns NOT_FOUND at `results.service.ts:559` |
| IRS-P-2 | `result_type 9 is_active = 1` live | `getByTypeAndLevel` filters `rt.is_active > 0` (`result-by-level.repository.ts:112`) | Only id 3 was deactivated in repo migrations | `verified` (live, IRS-T-1: `is_active=1`) | Migration sets it active |
| IRS-P-3 | Existing type-9 rows, if any, are P22 or bilateral (`source='API'`) | Live DB | IRS-T-1: 2 rows, portfolio 2 = P22, `source='Result'`; zero P25 and zero `API` type-9 rows | `verified` | Gates must also exclude them — see IRS-DD-6 |
| IRS-P-4 | `createOwnerResultV2` always inserts a `results_toc_result` row with `planned_result=false` | `results.service.ts:3367-3387` | Read | `verified` | Bypass in contributors check is still needed only if row exists — harmless either way |
| IRS-P-5 | `validation_contributor_partner_P25` latest repo body = `1762866499786-updatepartnersContributors.ts:10-162`; no `result_type` variable; ToC block `:37-69`; innovation link `:115-131`; linked results `:133-145` | Repo | Read by scout | `refuted` for live (IRS-T-1): live already declares `result_type_id` (loaded in the `result` SELECT that runs **after** the ToC block) and has no `center_count_*`; innovation-link block is the only linked-results check | Rebase the change on the live body (IRS-T-1); ToC bypass needs `result_type_id` loaded **before** the ToC block (see execution.md IRS-T-1 Leader decision) |
| IRS-P-6 | `validation_geo_location_P25` already loads `geo_scope` and `result_type` (`1762528725798-createValidtionP25.ts:615-642`); scope 50 short-circuits TRUE at `:644-652` | Repo | Read by scout | `verified` (live, IRS-T-1): loads `geographic_scope_id` + `result_type_id`; `NULL ⇒ FALSE` then `ELSEIF scope = 50 ⇒ TRUE`; does **not** load `source` | Same as P-5 |
| IRS-P-7 | Section functions are resolved as `validation_<function_name>_<portfolio acronym>` via `validation_maps`; missing map/function ⇒ FALSE | `1762528725798…:8-109`; `shared/querys/manual/P2-3552-validate_sections_mapped_batch.sql` | Read | `verified` (repo + live, IRS-T-1) | Check live procedure body in IRS-T-1 |
| IRS-P-8 | Create DTO is **not** class-validated (no ValidationPipe on controller or globally) | `create-results-framework.dto.ts` has only `@ApiProperty` | Read by scout | `verified` | If a pipe exists, use decorators instead of manual checks |
| IRS-P-9 | No per-result write authorization exists on create or section PATCHes — JWT only | `results-framework-reporting.controller.ts:470-486`, `geographic-location.controller.ts:28`, `innovation_dev.controller.ts:67` | Read by scout | `verified` | — |
| IRS-P-10 | CLARISA Impact Area ids 1–5 map to the 5 tag columns (`nutrition`, `poverty`, `gender`, `climate_change`, `environmental_biodiversity`) | `clarisa_impact_areas` live rows | IRS-T-1: 1 Nutrition · 2 Poverty · 3 Gender · 4 Climate · 5 Environment (no `smo_code` column) | `verified` | Mapping constant changes; IRS-T-1 reads the 5 rows |
| IRS-P-11 | MySQL 8 (`REGEXP_REPLACE` available) for SQL word count | Live server | IRS-T-1: `8.4.8` | `verified` | Word count via nested `REPLACE` of whitespace chars instead |
| IRS-P-12 | Phase replication switches on `result_type_id` with no case 9 | `versioning.service.ts:350-424` | Read by scout | `verified` | — |
| IRS-P-13 | Result soft delete calls one `logicalDelete` per table | `delete-recover-data.service.ts:224-330` | Read by scout | `verified` | — |
| IRS-P-14 | Program ownership of a result = `results_by_inititiative` with `initiative_role_id=1`, `is_active=1` | `RoleByUser.repository.ts:195` uses the same join; `createOwnerResult` writes role 1 at `results.service.ts:645` | Read | `verified` | Counts query changes join |

**User-run live checks (IRS-T-1)** — the agent never connects to the DB:

```sql
SELECT * FROM result_by_level WHERE result_level_id = 1;
SELECT id, name, is_active FROM result_type WHERE id = 9;
SELECT v.portfolio_id, r.source, COUNT(*) FROM result r JOIN version v ON v.id = r.version_id
 WHERE r.result_type_id = 9 AND r.is_active = 1 GROUP BY v.portfolio_id, r.source;
SELECT id, name, financialCode FROM clarisa_impact_areas ORDER BY id;
SELECT VERSION();
SHOW CREATE FUNCTION validation_contributor_partner_P25;
SHOW CREATE FUNCTION validation_geo_location_P25;
SHOW CREATE PROCEDURE validate_sections_mapped_batch;
```

---

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Touched |
|---|---|
| Create flow | `application/commands/create-result-from-framework/create-result-from-framework.handler.ts`, `api/results/dto/create-result.dto.ts` (+ `impact_area_id`) |
| New module | `api/results-framework-reporting/impact-level/` (controller, service, repositories, entities, dto, `CLAUDE.md`), wired in `results-framework-reporting.module.ts` and `api/modules.routes.ts` |
| Green checks | `results-validation-module/enum/validation-maps.enum.ts`, `results-validation-module.repository.ts:48-85` |
| Geography | `results-framework-reporting/geographic-location/geographic-location.service.ts` (`saveGeoScopeV2`) |
| Lifecycle | `api/versioning/versioning.service.ts` (`$_phaseChangeReporting` switch), `api/delete-recover-data/delete-recover-data.service.ts` |
| SQL | one migration: tables + seed + `validation_maps` row + 1 new and 2 replaced functions |

### 2.2 Primary flows

```
Create (impact)
POST /api/results-framework-reporting/create  { result: { result_level_id:1, result_type_id:9, impact_area_id, ... } }
 └ handler
    ├ assertImpactCreatePayload()        → 400 on missing/invalid area or any ToC/target field (IRS-R-1)
    ├ createOwnerResultV2()              (unchanged; writes result, owner initiative, planned_result=false toc row)
    ├ applyImpactAreaPrefill()           → chosen column = tag 3, other 4 = tag 1 (IRS-R-2)
    ├ skip LinkFrameworkResultToc        (impact branch)
    └ associations / provenance as today

Impact level info
GET   …/impact-level/get/result/:resultId     → section DTO (IRS-R-4)
PATCH …/impact-level/save/result/:resultId    → validate → transaction: upsert results_impact_level, sync links (IRS-R-5)

Green check
GET /results-validation… → repository builds list; P25 + type 9 ⇒ [general-information, contributor-partners, geographic-location, evidences, impact-level-info]
 → CALL validate_sections_mapped_batch → validation_impact_level_info_P25 / contributor (ToC bypass) / geo (scope gate)
```

---

## 3. Data Model Changes

### 3.1 Entities (new, under `impact-level/entities/`)

| Entity / table | Columns | Notes |
|---|---|---|
| `ImpactStudyType` / `impact_study_type` | `id` int PK (no auto-increment, seeded 1, 2), `name` varchar(100) NOT NULL, `definition` text NOT NULL, `is_active` boolean default 1 | Seed: 1 Learning study, 2 Accountability study, definitions verbatim from requirements §3 |
| `ResultImpactLevel` / `results_impact_level` | `id` bigint PK AI; `result_id` bigint NOT NULL FK `result.id`, **unique**; `impact_study_type_id` int NULL FK; `cgiar_contribution` text NULL; `previously_reported` boolean NULL; `is_active` boolean default 1; `created_by`, `last_updated_by` int FK users; `created_date`, `last_updated_date` timestamps | 1:1 with result, created lazily on first PATCH |
| `ResultImpactPreviousResult` / `results_impact_previous_result` | `id` bigint PK AI; `result_id` bigint NOT NULL FK; `previous_result_id` bigint NOT NULL FK `result.id`; `is_active` boolean default 1; audit columns as above | **unique (`result_id`, `previous_result_id`)**; index on `previous_result_id` |

`Result` entity: **no change** (scores reuse the five `*_tag_level_id` columns).

### 3.2 Migration

- One file: `migrations/<ts>-IRS-ImpactResultsFoundation.ts`, idempotent style of `1790347604000-IpsrStepThreeEvidence.ts`.
- `up`: create 3 tables + FKs + seed catalog; ensure `result_by_level (1,9)` and `result_type 9 active` (no-op if present, per P-1/P-2); insert `validation_maps` row `impact-level-info → impact_level_info`; `CREATE FUNCTION validation_impact_level_info_P25`; `DROP + CREATE` `validation_contributor_partner_P25` and `validation_geo_location_P25` from the **live** bodies plus the gates of IRS-DD-5/6.
- `down`: restore the two live bodies verbatim, drop the new function, delete the map row, drop the 3 tables. It does **not** undo P-1/P-2 rows (they pre-existed in seed).
- Gate: `npm run migration:check:ci`.

### 3.3 CLARISA

Reads `clarisa_impact_areas` only (ids 1–5). No sync change. Mapping id → tag column is one constant in the module (`IMPACT_AREA_TAG_COLUMN`), confirmed by IRS-T-1 (P-10).

---

## 4. API Surface

### 4.1 Endpoints

All under the existing `results-framework-reporting` route tree, JWT via `auth` header, `@UserToken()` for audit.

| # | Method + path | Request | Response | Errors |
|---|---|---|---|---|
| E1 | `POST …/results-framework-reporting/create` (changed) | `result.impact_area_id` (int 1–5) when level 1/type 9 | unchanged | 400 `Impact results require an Impact Area` · 400 `Impact results cannot have targets, indicators or Theory of Change` |
| E2 | `GET …/impact-level/study-types` | — | `[{id, name, definition}]` active only | — |
| E3 | `GET …/impact-level/get/result/:resultId` | — | `{impact_study_type_id, cgiar_contribution, previously_reported, previous_results:[{result_id, result_code, title, result_type_name, phase_name, portfolio_acronym, status_name}]}` | 400 `Not an impact result` · 404 result |
| E4 | `PATCH …/impact-level/save/result/:resultId` | `{impact_study_type_id?, cgiar_contribution?, previously_reported?, previous_result_ids?: number[]}` | same as E3 | 400 word cap (`at most 100 words`), unknown study type, invalid/self/inactive link ids, not impact |
| E5 | `GET …/impact-level/previous-results/search` | `q?`, `versionId?`, `portfolioId?`, `typeIds?` (csv), `excludeResultId?`, `page` (≥1, default 1), `limit` (1–50, default 20) | `{items:[same shape as E3 item], meta:{total, page, limit, totalPages}}` | 400 bad paging |
| E6 | `GET …/impact-level/counts` | `initiativeId`, `versionId` | `{areas:[{impact_area_id, count}] (5 rows, zeros included), total}` | 400 missing params |

DTO validation for E4–E6 uses `class-validator` decorators **and** explicit service checks (P-8: no global pipe — the service checks are the gate). Phase/portfolio filter options come from existing versioning endpoints (client child #3).

### 4.2 Bilateral / platform-report impact

None. No file under `api/results/summary/` or bilateral mappers changes. Bilateral list already filters by type 9 — unchanged.

---

## 5. Server Workflow / Business Rules

- **Create (IRS-R-1, R-2):** impact branch decided by `result_level_id === 1 && result_type_id === 9`. Validation before any write. Prefill runs once, after `createOwnerResultV2` returns, in the handler — never in `createResultGeneralInformation` (so later saves cannot re-trigger it). Non-impact requests: `impact_area_id` ignored.
- **Save (IRS-R-5):** load result (type must be 9) → validate fields → one transaction: upsert `results_impact_level`; if `previously_reported === false` deactivate all links; if `previous_result_ids` sent, validate existence (`is_active=1`, `id ≠ resultId`), dedupe, activate/insert present, deactivate absent. Fields not sent are left as stored (partial draft).
- **Word count:** single shared function `countWords` = trimmed text split on runs of Unicode whitespace; empty ⇒ 0. SQL check mirrors it (whitespace runs collapsed, then count separators + 1). Both tested at 99/100/101, leading/trailing/multiple spaces, newlines, tabs.
- **Search (IRS-R-10):** query builder over `result` ⋈ `version` ⋈ portfolio ⋈ `result_type` ⋈ status; `is_active=1`; optional `LIKE` on `title` / exact on `result_code`; order: `version_id = active reporting phase` first (`VersioningService.$_findActivePhase(REPORTING)`), then phase year desc, then `result_code`; `skip/take/getManyAndCount` per `bilateral.service.ts:1070-1113`.
- **Counts (IRS-R-11):** one aggregate over results owned by the initiative (`results_by_inititiative` role 1, active), `version_id = :versionId`, level 1 / type 9, `is_active=1`: `SUM(col = 3)` per tag column, `COUNT(DISTINCT id)` where any column = 3 for total.
- **Green check (IRS-R-6, R-7):** enum `IMPACT_LEVEL_INFO = 'impact-level-info'`; in `results-validation-module.repository.ts` switch, `case 9` adds it **only when portfolio is P25**. New SQL function returns TRUE iff active row exists AND study type not null AND 1 ≤ words ≤ 100 AND `previously_reported` not null AND (`previously_reported = 0` OR ≥ 1 active link).
- **Replication (IRS-R-14, W2):** `case 9` in `$_phaseChangeReporting` copies `results_impact_level` and active `results_impact_previous_result` rows to the new result id via a `ReplicableRepository` (pattern `results-policy-changes.repository.ts:14-87`). Links keep pointing at the same `previous_result_id`s. Inert until impact results are replicated (OQ-1).
- **Delete (IRS-R-13, W7):** add `logicalDelete` of both tables to `deleteResult` (`delete-recover-data.service.ts:224-330`). On result-type change away from 9, add `fisicalDelete` of both tables to the common delete path (`CoomonDelete` `:835`, if it runs for every type — confirmed in IRS-T-7; otherwise add to each `DELETE_*`).

---

## 6. Frontend Plan

Not in this child. Contracts E1–E6 are consumed by `sp-reporting-entry` (E1, E6) and `result-detail-impact` (E2–E5).

---

## 7. Security & Authorization

- JWT on all endpoints (global middleware). No new JWT exclusion.
- **Per-result write authorization: parity with today (IRS-DD-8).** Create and section PATCHes have no result-level role check today (P-9); the new endpoints match that. Gap recorded in §13 for a platform-wide ticket.
- Inputs: all ids parsed as integers; text bounded (word cap + max 5,000 characters on `cgiar_contribution` to stop oversized payloads).
- No secrets/tokens in logs or error messages (`.cursorrules`, AC-9). Errors never echo SQL.

---

## 8. Performance & Capacity

- Volume: near zero writes ("we just need it as an option"); reads on SP Reporting load (E6) and picker typing (E5, debounced client side).
- E5: `LIKE '%q%'` on `title` cannot use an index; acceptable at current `result` size — verified by NFR p95 < 800 ms on PRTest (IRS-T-8). If it fails: restrict to `result_code` prefix + `title` FULLTEXT follow-up.
- E6: one aggregate per page load, filtered by indexed `version_id` and the initiative join; target p95 < 300 ms.
- No new dependencies (Lambda bundle unchanged).

---

## 9. Observability

- 400s carry the rule name in `message`; logged at `warn` with result id and user id only.
- No new metrics; moves PRD M1.3 only indirectly.

---

## 10. Testing Plan

| Level | What |
|---|---|
| Unit (Jest) | `countWords`; impact create payload guard; prefill mapping; link set sync; search ordering builder; counts mapping; validation repository section list (P25 type 9 vs other types vs P22) |
| Service (Jest, mocked repos) | save transaction branches (Yes/No/partial/invalid ids/self link); geo guard for type 9 vs others; replication case 9 |
| SQL (manual, user-run on a dev copy / PRTest after deploy) | before/after green checks for 10 non-impact P25 results across types (must be identical) + 1 impact result walking every rule |
| Migration | `npm run migration:check:ci` |

All Jest runs: `--maxWorkers=2`, scoped with `--findRelatedTests` on touched files.

---

## 11. Backwards Compatibility & Migration Plan

- Additive tables and endpoints; E1 change is additive (new optional field).
- SQL functions: changes gated by `result_type = 9` (and `source <> 'API'` for geo, IRS-DD-6) — non-impact results compute identically. `down` restores live bodies.
- No backfill. No feature flag: the entry point (child #2) is the user-visible switch.
- Deploy order: this child ships first; children #2/#3 consume it.

---

## 12. Design Decisions

### IRS-DD-1 — Reuse level 1 / type 9 with dedicated tables
- **Context:** catalog rows exist; type 9 already handled by delete/recover, bilateral filter, qa-catalog.
- **Decision:** reuse; add `results_impact_level`, `impact_study_type`, `results_impact_previous_result`.
- **Alternatives:** new type 12 (duplicates wiring, orphans 9); store links in `linked_result` (single-writer conflict with `ContributorsPartnersService`, resolves code→newest version, loses phase row).
- **Consequences:** a third link table in the schema; clear ownership.

### IRS-DD-2 — Study types as a seeded catalog table, not an enum
- **Context:** definitions must be shown to users and are "adopted as written, or replaced".
- **Decision:** table with `name` + `definition`; replacing a definition is a data change.
- **Alternatives:** TS enum + client copy (definition change ⇒ deploy of two packages); CLARISA (terms not in glossary).

### IRS-DD-3 — Impact branch in the create handler, manual validation
- **Context:** create DTO is not class-validated (P-8); ToC linking must not run.
- **Decision:** guard + prefill + ToC skip inside the handler, keyed on level 1/type 9; reject (400) rather than silently drop target/ToC fields.
- **Alternatives:** separate `create-impact` endpoint (duplicates ownership/provenance logic); silently ignore target fields (hides client bugs).

### IRS-DD-4 — Prefill in the handler, once
- **Decision:** write tag columns right after creation; `createResultGeneralInformation` untouched.
- **Alternative:** reuse Progress Tracker prefill path (writes only NULL columns — would work, but couples impact to provenance semantics). Rejected for clarity.

### IRS-DD-5 — Contributors check: bypass ToC + linked-results/innovation-link blocks for type 9
- **Context:** V2 always writes a `planned_result=false` row (P-4), so an unbypassed check requires a ToC narrative forever.
- **Decision:** add `result_type` to the existing `result` SELECT (IRS-T-1: that SELECT runs after the ToC block in the live body, so `result_type_id` is loaded once more before it — execution.md IRS-T-1 Leader decision 1); skip blocks `:37-69` and `:115-145` (by live line equivalents) when `result_type = 9`. Partner/center rules unchanged.
- **Reversion challenge — "what does removing this break?":** (a) P22 type-9 results — not affected, P25 function only; (b) bilateral type-9 results reviewed via `bilateral-projects.service.ts`, which calls this function — the bypass only *relaxes* their check, which matches BR2 (impact has no ToC); acceptable. (c) The ToC row written by V2 stays in DB — harmless, not read for type 9. **No breakage that the design leaves unaddressed.**

### IRS-DD-6 — Geography: Region/Country only, PRMS-created impact results
- **Decision:** TS guard at the top of `saveGeoScopeV2` (covers the PATCH and the admin data-standard path) loading `result_type_id` and `source`; SQL gate `result_type = 9 AND source <> 'API' AND geo_scope NOT IN (2,3) ⇒ FALSE`, placed **before** the scope-50 shortcut.
- **Reversion challenge — "what does removing this break?":** removing Global/Sub-national/TBD for type 9 would turn **bilateral** type-9 results (source `API`, possibly Global or TBD) red in the bilateral review, a flow out of this ticket's scope. Addressed by the `source <> 'API'` gate (P-3 confirms the count). P22 type-9 results unaffected (P25 function).
- **Requirement sync:** IRS-R-9 updated to "impact results created in PRMS".

### IRS-DD-7 — Section only for P25 impact results
- **Decision:** `case 9` in the validation repository adds `impact-level-info` only when the portfolio is P25; P22 type-9 results keep their current list (P-3).

### IRS-DD-8 — Authorization parity, gap recorded
- **Context:** no per-result write check exists on create or any section PATCH (P-9).
- **Decision:** new endpoints match current behavior (JWT). A stricter check only here would be inconsistent and risks blocking shared-access editors whose role set is not modeled by `validationRolePermissions`.
- **Alternative:** `validationRolePermissions` on owner initiative — rejected for this child; proposed as platform-wide follow-up.
- **Requirement sync:** IRS-R-12 reworded to state parity explicitly.

### IRS-DD-9 — Search returns phase rows, not result codes
- **Decision:** each item is one `result.id` (one phase row), labeled with phase and portfolio, as in Guide step 6; links store that exact id.
- **Alternative:** group by `result_code` (hides which phase was meant).

---

## 12A. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 9 (1 user-run HITL + 8 code) |
| LOC (incl. tests and migration) | ~1,300 (≈ 650 prod incl. ~250 SQL, ≈ 650 tests) |
| Review rounds | ≤ 2 per task, ≤ 12 total |

Exceeding any line ⇒ Leader stops and escalates. The estimate matches **Full** depth.

---

## 13. Open Gaps & Follow-ups

| ID | Gap | Handling |
|---|---|---|
| IRS-G-1 | Live SQL bodies may differ from repo (P-5, P-6, P-7) | IRS-T-1 HITL, migration built from live text |
| IRS-G-2 | Premises P-2, P-3, P-10, P-11 assumed | IRS-T-1 queries |
| IRS-G-3 | No server completeness guard on Submit (all types) | Separate ticket |
| IRS-G-4 | No per-result write authorization (all types) | Separate ticket (IRS-DD-8) |
| IRS-G-5 | Replication of impact results undecided (OQ-1, Nicoleta) | Code path ready, inert |
| IRS-G-6 | Search `LIKE` scalability | NFR measured in IRS-T-8; FULLTEXT follow-up if needed |
