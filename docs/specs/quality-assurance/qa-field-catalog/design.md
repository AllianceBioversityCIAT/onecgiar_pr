# Design — QA field catalog (`quality-assurance/qa-field-catalog`)

## Document Control

| Field | Value |
|---|---|
| Depth | Full |
| Status | approved 2026-10-06 (Juan David) |
| Owner | Juan David Delgado |
| Date | 2026-10-06 |
| Requirements | `requirements.md` (`QAC-R-1…12`) |
| Verified at | `356ea3c24` |
| Baseline | TRD ADR-001 (no new compute), ADR-002 (generated migrations), ADR-004 (additive contract), QAS-10 |
| Kaizen | no `kaizen-log.md` in repo — none applied |

## 1. Executive Summary

A new NestJS module `api/qa-catalog` holds the catalog as typed TypeScript literals (one file per section group / result type). The **code is the source of truth and what the endpoint serves**; a boot-time sync mirrors it into four MySQL tables for future consumers (validation, reports, results-to-QA). Three DB-free Jest tests keep it honest: a **completeness guard** over TypeORM metadata, a **snapshot test** (keys never disappear, version bumps on change) and a **shape validator**. `GET /api/qa/catalog?phase_year=` is excluded from the JWT middleware and guarded by the existing CLARISA API-key guard (pending QAC-OQ-1).

## 2. Architecture Overview

```
QA platform ──GET /api/qa/catalog?phase_year=Y──► JwtMiddleware (excluded) ► ClarisaApiKeyGuard
                                                     ► QaCatalogController ► QaCatalogService
                                                        └─ filters CODE catalog by year, strips storage bindings
App start ► QaCatalogSyncService (OnApplicationBootstrap) ► upsert ► qa_catalog_* tables (mirror, never deleted)
Jest (CI, no DB) ► completeness guard · snapshot/version test · shape validator
```

## 3. Extended Directory Structure

```
onecgiar-pr-server/src/api/qa-catalog/
  qa-catalog.module.ts · qa-catalog.controller.ts · qa-catalog.service.ts · qa-catalog-sync.service.ts
  definitions/        types.ts (CatalogResultType, CatalogSection, CatalogField, CatalogSubField, StorageBinding, RequiredWhen)
                      result-types.ts · versions.ts (year → portfolio, revision)
                      sections/<section>.ts (fields grouped by section; per-type sections in their own files)
                      not-for-qa.ts · scope.ts (in-scope entity classes + excluded result_* tables with reason)
  entities/           qa-catalog-result-type / section / field / version .entity.ts
  dto/                qa-catalog-query.dto.ts · qa-catalog-response.dto.ts
  __snapshots__/      qa-catalog.snapshot.json (per year: revision, content hash, key list)
  scripts/            (npm script) qa-catalog:snapshot — regenerates the snapshot after an intentional change
  *.spec.ts           shape · completeness guard · snapshot · service · controller · sync
onecgiar-pr-server/src/migrations/<ts>-QaCatalogTables.ts
onecgiar-pr-server/docs/qa-catalog.en.md   (contract + change log)
docs/specs/quality-assurance/qa-field-catalog/inventory/2026.md (+ 2025.md)  — HITL review artifact
```

## 4. Data Model

| Table | Key columns | Notes |
|---|---|---|
| `qa_catalog_result_type` | `key` (PK), `label`, `level` | |
| `qa_catalog_section` | `key` (PK), `label`, `order`, `result_types` JSON, `valid_from`, `valid_to` | |
| `qa_catalog_field` | `id` (PK), `key` (unique with `parent_key`), `parent_key` (null for top-level; set for subfields), `label`, `description`, `type`, `control_list`, `section_key`, `order`, `result_types` JSON, `required`, `required_confirmed` bool, `required_when` JSON, `valid_from`, `valid_to`, `storage` JSON, `created_at`, `updated_at` | Subfields are rows with `parent_key` — one table, no second hierarchy |
| `qa_catalog_version` | `phase_year` (PK), `portfolio`, `revision`, `content_hash`, `synced_at` | |

- **Storage binding** (JSON): `{kind:'column', table, column}` or `{kind:'relation', table, fk_to_result, value_column, control_list_table?, filter?}`. Subfields bind to columns of their parent's relation table.
- **`required_when`** (JSON): a small declarative condition (`{field, operator: eq|in|not_null, value}` + `all/any`) transcribed from `validation_*`. Not evaluated in this spec.
- No FK to `version`: years are plain integers (IDs differ per environment).
- `catalog_version` exposed = `${phase_year}.${revision}`.

## 5. API Design

`GET /api/qa/catalog?phase_year=<int>` — contract per `requirements.md` QAC-R-9 and the agreed shape in `proposal.md`.

| Case | Status |
|---|---|
| OK | 200 `{portfolio, phase, catalog_version, generated_at, result_types[], sections[], fields[]}` |
| `phase_year` missing / non-integer | 400 (class-validator DTO) |
| year not in `versions.ts` | 404 |
| no / bad API key | 401 generic body |

- `fields[]` = top-level fields with `subfields[]` nested; storage, `required_confirmed`, DB ids stripped by an explicit response mapper (whitelist, not blacklist).
- A sub-entry valid-year rule: subfields inherit their parent's validity.
- `result_types` filtered to types having at least one field that year.
- Ordering: section `order`, then field `order`.
- Documented in `onecgiar-pr-server/docs/qa-catalog.en.md` with a change log (ADR-004).

## 6. Backend Module Design

| Unit | Responsibility | Req |
|---|---|---|
| `definitions/*` | Typed literals; `versions.ts` declares catalogued years `{2026: {portfolio:'P25', revision:1}}` (2025 added if loaded) | R-1, R-3, R-8, R-11 |
| `QaCatalogService` | `getCatalog(year)` pure over definitions; 404 when year not declared | R-3, R-9, R-12 |
| Response mapper | Whitelist projection; strips storage | R-4 |
| `QaCatalogController` | `@UseGuards(ClarisaApiKeyGuard)`, `@BilateralClarisaEndpoint('/api/qa/catalog')`, query DTO | R-9, R-10 |
| `QaCatalogModule` | Provides `ClarisaApiKeyValidationService` + `ClarisaApiKeyGuard` itself (they are not exported by `BilateralModule`) + `HttpModule`; registers route `qa` in `modules.routes.ts`; `app.module.ts` JWT `exclude` gains `api/qa/catalog` | R-10 |
| `QaCatalogSyncService` | On bootstrap: load table keys, insert missing, update changed (field-by-field compare), never delete; warn on orphan keys; try/catch → log counts only | R-6 |
| Completeness guard spec | For each class in `scope.ts`: table name + columns from `getMetadataArgsStorage()` (tables, columns, `joinColumns`), walking the prototype chain for base-class columns; subtract all `storage` bindings (fields + subfields) and `not-for-qa.ts`; fail on leftovers; fail on bindings/`NOT_FOR_QA` naming a non-existent column; fail on an `@Entity` whose table matches `^results?_` that is neither in scope nor in the excluded list | R-7 |
| Snapshot spec | Per year compute canonical hash of the effective catalog; content changed & same revision → fail; revision changed & same content → fail; key in snapshot missing from code → fail. `qa-catalog:snapshot` rewrites the file | R-2, R-8 |
| Shape spec | select ⇒ control_list; list/object ⇒ subfields; `valid_from ≤ valid_to`; unique keys; section exists; result types exist; `NOT_FOR_QA` reason non-empty | R-1, R-7 |

Logging: sync logs `qa-catalog sync: inserted=n updated=m orphans=[keys]`. The API key is never logged (guard already complies).

## 7. Frontend / UX

n/a — no client change.

## 8. Shared Contracts

- New external contract `docs/qa-catalog.en.md`.
- The `storage` binding and `required_when` vocabulary are the seam the future results-to-QA and validation work will reuse; they are versioned with the catalog types.

## 9. Design Decisions

| ID | Decision | Rejected alternative | Why | Req |
|---|---|---|---|---|
| DD-1 | Endpoint serves from the **code** catalog; DB tables are a mirror | Serve from DB | A failed/partial sync cannot change what QA sees; no DB read on the hot path; tables still exist for future SQL consumers | R-6, R-9 |
| DD-2 | Guard reads **TypeORM metadata**, not `information_schema` | DB query in CI | CI has no DB (P-4); ADR-002 makes entities the schema path (P-7) | R-7 |
| DD-3 | In-scope = explicit class list + "every `results?_` table is in scope or excluded with reason" | Only explicit list | A brand-new result table would otherwise escape the guard silently | R-7 |
| DD-4 | Subfields are rows in `qa_catalog_field` with `parent_key` | Separate subfield table | One upsert path; same columns | R-1, R-6 |
| DD-5 | Portfolio per year is **declared in `versions.ts`**, not read from `version` at request time | Query `version.portfolio_id` per request | Keeps the endpoint DB-free and deterministic; P-5 is checked once at inventory time | R-9 |
| DD-6 | Auth reuses `ClarisaApiKeyGuard` re-provided in the new module | Dedicated env key; or export from `BilateralModule` | No new secret; exporting would couple the modules. QAC-OQ-1 resolved 2026-10-06: CLARISA key (owner accepted the default) | R-10 |
| DD-7 | `required` is accompanied by `required_confirmed`; `required_when` is data only | Implement conditional validation now | Matches R-5; validation engine is the future vision | R-5 |
| DD-8 | Guard lands with the **common** sections; each per-type task adds its tables to `scope.ts` together with its fields | Enable full scope at the end | CI stays green between tasks without a "report-only" mode | R-7, R-11 |
| DD-9 | Catalog years are integers; no FK to `version` | FK to `version.id` | Phase IDs differ per environment | R-3 |

Step 2.3 reversion challenge: **n/a** — no DD removes or disables shipped behavior (the JWT `exclude` adds one path; existing paths untouched).

## 10. Premise Ledger

Count: 13 premises — 9 verified, 4 `UNVERIFIED` (High: 1 — P-6 · Low: 3 — P-5, P-11, P-12).
Blast-radius triggers: `live-path` fires (new route through the global middleware chain); `consumer` fires (new response shape; new stored tables); `shared-state` fires (edits `app.module.ts` middleware exclude list, read by every route).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | A result's phase is `result.version_id`, and `version` carries `phase_year` and `portfolio_id` | location | `src/api/results/entities/result.entity.ts:266-271`; `src/api/versioning/entities/version.entity.ts:56-61,92-97` | 356ea3c24 | Year axis wrong → DD-5/DD-9 redesigned (High) | — |
| P-2 | `getMetadataArgsStorage()` exposes table and column args without a DB connection; base-class columns are registered on the base target | data-env | precedent `src/api/progress-tracker/entities/progress-tracker-indicator-map.entity.spec.ts:191-196`; `grep -rln "extends \(AuditableEntity\|BaseEntity\|VersionBaseEntity\)" src/api/results \| wc -l` → 19 | 356ea3c24 | Guard needs another mechanism (DD-2) (High) | — |
| P-3 | `ClarisaApiKeyGuard` + `ClarisaApiKeyValidationService` are providers of `BilateralModule`, not exported; guard requires `@BilateralClarisaEndpoint` metadata or rejects | existence | `src/api/bilateral/bilateral.module.ts:189-191,275`; `src/api/bilateral/guards/clarisa-api-key.guard.ts:30-38`; decorator `src/api/bilateral/decorators/bilateral-clarisa-endpoint.decorator.ts:5-6` | 356ea3c24 | DD-6 wiring changes (Low) | — |
| P-4 | The GitHub CI workflow has no MySQL service | data-env | `.github/workflows/jenkins-trigger.yml` — 29 lines, `grep -n "services:"` → 0 hits | 356ea3c24 | Could add an `information_schema` check (Low) | — |
| P-5 | Phase years 2025 and 2026 each map to a single portfolio, P25, in every environment; the portfolio's display code is `P25` | data-env | `UNVERIFIED — confirm at source before relying on it` | — | `versions.ts` portfolio wrong (Low) | T-7 first step: `SELECT phase_year, portfolio_id … FROM version` + `clarisa_portfolios` in the env — owner Juan David |
| P-6 | The live `validation_*` P25 definitions differ from the repo migrations; required rules must come from the env | data-env | `UNVERIFIED — confirm at source before relying on it` (user-stated / project memory) | — | `required` values wrong (High) | T-7 dependency: user supplies `SHOW CREATE FUNCTION` per procedure |
| P-7 | Schema changes go through entities + `migration:generate`; the generator emits unrelated tables that must be pruned | other | TRD ADR-002 (`docs/trd/trd.md:106`); project rule "generate and prune" | 356ea3c24 | T-2 approach (Low) | — |
| P-8 | No field catalog or field-metadata table/module exists today | existence | `grep -rliE "field_catalog\|qa_catalog\|catalog_field\|field_metadata\|form_field" onecgiar-pr-server/src --include='*.ts' \| wc -l` → 0 | 356ea3c24 | Would extend instead of create (High) | — |
| P-9 | New `*.entity.ts` under `src/api/**` are auto-registered by the ORM config | location | `src/config/orm.config.ts:14-20` | 356ea3c24 | Register explicitly (Low) | — |
| P-10 | `JwtMiddleware` is applied to API routes except an explicit exclude list; the new path must be added there | live-path | `src/app.module.ts:142-151` (`apply(JwtMiddleware, apiVersionMiddleware).exclude({path:'api/bilateral'…}).forRoutes(…)`); route mount `RouterModule.register(MainRoutes)` `src/app.module.ts:94` → `src/api/modules.routes.ts` | 356ea3c24 | 401 from JWT before the guard runs (High) | — |
| P-11 | The global `APP_GUARD` throttler does not block service calls of a catalog read | shared-state | `src/app.module.ts:129` provides `ThrottlerExcludeBilateralGuard` — whether `api/qa` is throttled `UNVERIFIED — confirm at source before relying on it` | — | Add `api/qa` to the exclusion (Low) | T-6 first step — read `src/shared/guards/throttler-exclude-bilateral.guard.ts` |
| P-12 | The 2026 form per result type lives in the client result-detail components and the P25 framework-reporting modules | location | `UNVERIFIED — confirm at source before relying on it` | — | Inventory source changes (Low) | T-7 — Explore over `onecgiar-pr-client/src/app/pages/results/**` |
| P-13 | No code in the repo consumes `/api/qa/catalog` or the new tables | consumer | `grep -rn "qa/catalog\|qa-catalog" --include='*.ts' . \| grep -v node_modules \| wc -l` → 0 (whole repo) | 356ea3c24 | n/a — new contract; external consumer is the QA platform (Low) | — |

Shared-state note for P-10/P-11: the edit to the JWT `exclude` list is read by every route; the change only appends one path, siblings unchanged.

## 11. Rollout, Rollback, Observability

- **Rollout:** migration creates empty tables; first boot fills them; endpoint live once QA's CLARISA client has `/api/qa/catalog` permission.
- **Rollback:** revert the module + JWT exclude; tables can stay (inert) or be dropped by `migration:revert`.
- **Observability:** sync summary log line; 401/404 counts visible in existing request logs.

## 12. Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | 12 (8 framework/infra + inventory HITL + 2026 load split in 3 + docs; 2025 is an optional 13th) |
| LOC | ~1 000 framework + tests; **~3 000–3 500 catalog data** (≈ 300 field literals for 2026) |
| Review rounds | ~15 (1–2 per task; data tasks may need 2) |

Depth check: matches **Full**. LOC is dominated by declarative data; recommend PR split (framework vs. data).
