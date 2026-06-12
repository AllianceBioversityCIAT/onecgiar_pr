# CLAUDE.md — `api/results/` (Result lifecycle & domain mega-module)

This is the **module-level guide** for `api/results`. It complements:

- [`../../CLAUDE.md`](../../CLAUDE.md) — source-tree patterns (auth, response envelope, base classes, anti-patterns).
- [`./AGENTS.md`](./AGENTS.md) — workflow-focused guide (science-program progress, bilateral review workflow, endpoint → service mapping).
- [`../bilateral/CLAUDE.md`](../bilateral/CLAUDE.md) and [`../bilateral/AGENTS.md`](../bilateral/AGENTS.md) — bilateral ingestion module.

> **Read order:** package-level `CLAUDE.md` → `src/CLAUDE.md` → this file → `AGENTS.md` → relevant sub-module file.
>
> `AGENTS.md` covers the **lifecycle-management workflows** (bilateral review approve/reject, title rules, science-program progress, endpoint mapping). This `CLAUDE.md` covers **how the code is organised**, the entry trio, the ~60 sub-folders and what each is for, and what to touch (or not) when extending the largest module in the codebase.

---

## 1. What this module is

`api/results/` is the **domain core**. It owns:

1. The **`Result` entity** and its repository (the workhorse query surface).
2. The **submission lifecycle** — status transitions `1↔2↔3` and the audit trail (`result-review-history`, `result-deletion-audit`).
3. **Every result-association** sub-module (centers, institutions, initiatives, evidence, ToC, geography, partners, budgets, type-specific blocks, …).
4. The **type-specific summary** builders that bilateral and platform-report read from (`summary/`).
5. The **admin panel** for results (phase management, recovery, audits).
6. The **RMQ consumer** for reporting metadata export jobs.

Mount: `/api/results/*`. Total surface: **65 entries** at this level (60+ sub-folders + entry trio + RMQ consumer + AGENTS.md/CLAUDE.md).

---

## 2. Entry trio

The module's public face is **three files** at the root of the folder:

| File | Lines | Responsibility |
|---|---|---|
| [`results.controller.ts`](./results.controller.ts) | ~880 | All `/api/results/*` endpoints not owned by a sub-module. DTO validation, Swagger, JWT-by-default. The bilateral review endpoints are also here (see `AGENTS.md`). |
| [`results.service.ts`](./results.service.ts) | ~4 600 | Business logic for the `Result` row itself: create / update / submit, science-program progress, bilateral review decisions, title updates, ToC metadata updates. Lifecycle is centralised here. |
| [`result.repository.ts`](./result.repository.ts) | ~3 500 | TypeORM repository. Heavy SQL — pagination, joins, search, by-program/centers queries, progress aggregations. **Note the singular `result.repository.ts`** (plural everywhere else). |

Plus:

- [`results.module.ts`](./results.module.ts) — wires the entry trio + 60+ child modules.
- [`results.routes.ts`](./results.routes.ts) — child Routes table for `/api/results/<sub-path>` mounts.
- [`reporting-metadata-export.consumer.ts`](./reporting-metadata-export.consumer.ts) — RMQ consumer (see §6).
- [`AGENTS.md`](./AGENTS.md) — lifecycle workflow guide.
- `entities/` — the `Result` entity and shared entities not big enough to warrant their own sub-folder.
- `dto/` — DTOs shared by the controller methods at this level (`ReviewDecisionDto`, `UpdateTocMetadataDto`, `UpdateResultTitleDto`, …).
- `services/` — sub-services called by `ResultsService` (currently `reporting-full-metadata-export.service.ts`, the synchronous side of the RMQ flow).

---

## 3. Sub-module taxonomy

~60 sub-folders. Every one follows the **standard module layout** documented in `../../CLAUDE.md` §2.1 (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `dto/`, `entities/`, co-located `*.spec.ts`). They're mounted as children of `/api/results/*` via [`results.routes.ts`](./results.routes.ts).

Categorised by purpose:

### 3.1 Result associations (multi-to-multi tables)

These wrap the join tables between `Result` and another entity. Most extend `BaseServiceSimple` (see `../../shared/entities/base-service.ts`).

| Folder | Mount under `/api/results/` | What it joins |
|---|---|---|
| `results-centers/` | `centers` | Contributing centers per result (`is_lead` flag). |
| `results_by_inititiatives/` (sic — DO NOT rename) | `results-by-initiatives` | Initiatives attributed to a result. |
| `results_by_institutions/` | `results-by-institutions` | Partner institutions per result. |
| `results_by_institution_types/` | `results-by-institution-types` | Institution-type aggregates. |
| `results_by_projects/` | (registered in `results.module.ts`) | Bilateral projects attached to a result. |
| `results_by_evidences/` | (registered in `results.module.ts`) | Evidence rows joined to results. |
| `results-toc-results/` | `toc` | Result → ToC outcome mapping. |
| `result-countries/` | `result-countries` | Countries per result. |
| `result-countries-sub-national/` | `subnational` | Sub-national admin divisions. |
| `result-regions/` | (registered in `results.module.ts`) | Regions per result. |
| `result-actors/` | `actors` | Actors (people / orgs) for a result. |
| `result_budget/` (snake_case — DO NOT rename) | (registered in `results.module.ts`) | Initiative / bilateral-project / partner budget lines. |
| `result-folders/` | `result-folders` | Folder organisation (Type-One Report etc.). |
| `result-by-institutions-by-deliveries-type/` | (registered in `results.module.ts`) | Delivery-type breakdown of institution rows. |

### 3.2 Lifecycle, status, and audit

| Folder | Mount | Notes |
|---|---|---|
| `result-status/` | `result-status` | Catalog of statuses (1 Editing … 7 Rejected). Mirror of `../../shared/constants/result-status.enum.ts`. |
| `result-review-history/` | (no controller — repository only) | The audit row written on every status transition. Service-side write only. |
| `result-deletion-audit/` | (registered in `results.module.ts`) | Soft-delete trail used by `delete-recover-data`. |
| `submissions/` | `submissions` | Submission rows attached to status changes. |
| `result_levels/` (snake_case) | `levels` | Result level catalog (output / outcome / impact). |
| `result-by-level/` | `type-by-level` | Type ↔ level mapping. |
| `result_types/` (snake_case) | `types` | Result type catalog. Mirror of `../../shared/constants/result-type.enum.ts`. |

### 3.3 Type-specific data

These hold the data specific to one or more result types.

| Folder | Used by | Notes |
|---|---|---|
| `results-knowledge-products/` | Knowledge product | CGSpace `handle` integration. Used by the bilateral KP handler. |
| `knowledge_product_fair_baseline/` (snake_case) | Knowledge product | FAIR baseline metadata. |
| `capdevs-delivery-methods/` | Capacity sharing | Delivery method catalog. |
| `capdevs-terms/` | Capacity sharing | Training-length catalog. |
| `partner-delivery-type/` | Capacity sharing | Delivery-type discriminator on `results_by_institutions`. |
| `gender_tag_levels/` (snake_case) | All types (DAC) | Gender tag level catalog. |
| `impact_areas_scores_components/` (snake_case) | All types (DAC) | Impact-area scoring components. |
| `results-impact-area-indicators/` | All types (DAC) | Per-result indicator scoring. |
| `results-impact-area-target/` | All types (DAC) | Per-result indicator targets. |
| `result-questions/` | Policy change | Question-engine for "Is this result related to". |
| `legacy-result/` | Reporting | Legacy result rows kept for cross-phase queries. |
| `legacy_indicators_locations/` (snake_case) | Reporting | Legacy locations data. |
| `legacy_indicators_partners/` (snake_case) | Reporting | Legacy partners data. |
| `linked-results/` | All types | Cross-result links (Inno Dev ↔ Inno Use, etc.). |
| `intellectual_property_experts/` (snake_case) | Innovation packages | IP expert catalog. |
| `ost-melia-studies/` | All types | MELIA studies. |
| `non-pooled-projects/` | Bilateral, Inno Dev/Use | Bilateral / non-pooled project catalog. |
| `results-validation-module/` | All types | Per-section validation state. |
| `results-investment-discontinued-options/` | All types | Investment discontinuation reasons (rows). |
| `investment-discontinued-options/` | All types | Catalog of discontinuation reasons. |
| `evidences/` + `evidence_types/` | All types | Evidence rows + type catalog. |
| `units-of-measure/` | All types | Catalog. |
| `initiative_roles/` (snake_case) | All types | Initiative role catalog (lead, contributor, …). |
| `institution_roles/` (snake_case) | All types | Institution role catalog. |
| `years/` | All types | Phase-year catalog. |
| `versions/` | All types | Phase / version catalog (consumed by versioning logic). |

### 3.4 Operational sub-modules

| Folder | Mount | Notes |
|---|---|---|
| `admin-panel/` | `admin-panel` | Admin-only operations (phase reporting controls, etc.). Has its own controller / service / repository. |
| `summary/` | `summary` | **Per-type summary builders** consumed by `bilateral` and `platform-report`. Houses `repositories/results-innovations-dev.repository.ts`, `results-innovations-use.repository.ts`, `results-capacity-developments.repository.ts`, `results-policy-changes.repository.ts`. **Touching this directly affects the bilateral payload contract.** |
| `share-result-request/` | `request` | Share-request workflow (used by Result Detail "Share" action). |
| `services/` | (sub-services consumed by `ResultsService`) | `reporting-full-metadata-export.service.ts` — synchronous executor invoked by the RMQ consumer. |

### 3.5 The `entities/` and `dto/` at module root

- [`entities/`](./entities/) — the `Result` entity plus shared entities not big enough to live in their own sub-folder.
- [`dto/`](./dto/) — DTOs used by the entry-trio controller methods (review decision, title update, ToC metadata update, list filters, …).

---

## 4. Routing layout (`results.routes.ts`)

Every sub-module declares its own `*.module.ts` and is mounted in [`results.routes.ts`](./results.routes.ts) under a kebab-case path. Examples:

- `path: 'gender-tag-levels'` → `GenderTagLevelsModule`
- `path: 'levels'` → `ResultLevelsModule`
- `path: 'types'` → `ResultTypesModule`
- `path: 'centers'` → `ResultsCentersModule`
- `path: 'toc'` → `ResultsTocResultsModule`
- `path: 'summary'` → `SummaryModule`
- `path: 'admin-panel'` → `AdminPanelModule`
- `path: 'subnational'` → `ResultCountriesSubNationalModule`

Not every sub-folder has a public mount — some (notably `result-review-history/`, `result-deletion-audit/`, `result_budget/`, `result-regions/`, `results_by_projects/`, `results_by_evidences/`, `result-by-institutions-by-deliveries-type/`, `non-pooled-projects/`, etc.) are wired into `results.module.ts` but consumed only internally (by `ResultsService` or by sibling modules like `bilateral`).

When you add a new sub-folder:

1. Decide whether it's **publicly routed** (add to `results.routes.ts`) or **internal-only** (register only in `results.module.ts` `imports`).
2. The folder name and the mount path are **independent** — match the established convention but don't rename existing folders just to align.

---

## 5. Standard sub-module shape (recap)

Every sub-folder under `api/results/` follows the canonical layout — `../../CLAUDE.md` §2.1 is the source of truth. Quick reminder:

```
<sub-feature>/
├── <sub-feature>.module.ts
├── <sub-feature>.controller.ts        # Optional — many sub-modules are repository-only
├── <sub-feature>.controller.spec.ts
├── <sub-feature>.service.ts
├── <sub-feature>.service.spec.ts
├── <sub-feature>.repository.ts
├── <sub-feature>.repository.spec.ts
├── dto/
└── entities/
```

For join-table services, **extend `BaseServiceSimple`** (`../../shared/entities/base-service.ts`) — don't reinvent the upsert / soft-delete pattern.

---

## 6. RMQ consumer — `reporting-metadata-export.consumer.ts`

Lives at the module root rather than under `../../shared/microservices/` because it's tightly coupled to the result row.

- **Pattern:** `@EventPattern(REPORTING_METADATA_EXPORT_RMQ_PATTERN)`.
- **Consumer service:** delegates to `services/reporting-full-metadata-export.service.ts`.
- **ACK rules** (verbatim from [`reporting-metadata-export.consumer.ts`](./reporting-metadata-export.consumer.ts)):
  - **Success →** `channel.ack(originalMsg)`.
  - **Validation errors** (`mix P25`, `Too many results`, `No results match`, `No rows were returned from the P25 Excel view`) → **ACK and drop** — retrying won't fix a bad filter selection.
  - **Technical errors** (S3, DB connection, …) → `channel.nack(originalMsg, false, true)` — requeue.
- **Logging:** structured error message + stack via `Logger`. No payload bodies — payloads can contain user-identifying filters.

The producer is `../../shared/microservices/reporting-metadata-export-queue/reporting-metadata-export-queue-publisher.service.ts`. The hybrid microservice attach happens in `../../main.ts` only when `isReportingMetadataExportQueueConfigured()` is true.

When adding new error categories: extend the `isValidationError` list (in `consumer.ts`) — don't swallow technical errors into the validation bucket.

---

## 7. Workflow rules (`AGENTS.md` complement)

The day-to-day workflows live in [`./AGENTS.md`](./AGENTS.md). The non-negotiables this `CLAUDE.md` enforces:

- **Every `status_id` transition writes a `result-review-history` row.** Don't update `Result.status_id` from a service without writing the audit row in the same transaction.
- **Reject decisions require `justification`.** Validate at the DTO layer (`class-validator`) and at the service layer.
- **Title uniqueness is per active phase.** Use the repository helper — don't issue raw `SELECT COUNT(*)`.
- **`source = SourceEnum.Bilateral`** drives review-workflow branching. Bilateral results enter at `PENDING_REVIEW` (5), not `EDITING` (1). Don't normalise this away.
- **ToC mapping updates go through `ResultsTocResultsService`.** Direct repository writes skip indicator-target sync.

For the full picture (science-program progress, endpoint table, review workflow) read `AGENTS.md`.

---

## 8. Patterns to follow

### 8.1 Adding a new association sub-module

1. `api/results/<sub-feature>/` with the standard layout.
2. Extend the right base service: `BaseServiceSimple` (most join tables) or `BaseDeleteService` (delete-only).
3. Register the module in [`results.module.ts`](./results.module.ts) `imports`.
4. If publicly routed, add to [`results.routes.ts`](./results.routes.ts) with a kebab-case path.
5. If the new table is consumed by `bilateral` enrichment, also import it in [`../bilateral/bilateral.module.ts`](../bilateral/bilateral.module.ts).
6. Generate a TypeORM migration (`npm run migration:generate -- ./src/migrations/<name>`).
7. Co-locate `*.spec.ts`.

### 8.2 Adding a new endpoint to the entry trio

1. Method on `ResultsService` (with the right base / transaction posture).
2. Repository method if SQL is non-trivial.
3. Controller method on `ResultsController` with `@ApiTags('Results')`, `@ApiOperation`, `@ApiQuery` / `@ApiBody` / `@ApiOkResponse`, and `@UseInterceptors(ResponseInterceptor)`.
4. DTO under [`./dto/`](./dto/) with `class-validator` decorators.
5. Update [`./AGENTS.md`](./AGENTS.md) "Endpoint Mapping" if the endpoint is part of the bilateral review surface.
6. If status transitions are involved: write the `result-review-history` row in the same transaction.

### 8.3 Modifying a summary builder

`summary/` is the **upstream of bilateral payloads**. When you touch any of:

- `summary/repositories/results-innovations-dev.repository.ts`
- `summary/repositories/results-innovations-use.repository.ts`
- `summary/repositories/results-capacity-developments.repository.ts`
- `summary/repositories/results-policy-changes.repository.ts`
- `summary/innovation_dev.service.ts`
- `summary/summary.service.ts`

…you need to:

1. Update [`../../../docs/bilateral-result-summaries.en.md`](../../../docs/bilateral-result-summaries.en.md) (change-log row + the affected `<type>_summary` section).
2. Re-run the bilateral payload-fixture tests (in `../bilateral/`).
3. Keep changes **additive** unless rolling out under `v2`.

### 8.4 Soft delete with audit

- Soft delete is `is_active = false` on the row.
- For `Result` deletes (and major associations), also write a `result-deletion-audit/` row so the admin recovery surface can restore.
- Don't write deletion audit rows for every sub-table — only for surfaces the admin Manage Data flow needs to recover.

### 8.5 Pagination, search, filtering

Push the SQL into [`result.repository.ts`](./result.repository.ts) (or the sub-module repository for sub-modules). The service orchestrates and validates; the repository knows columns and joins. Use a `list-<X>-query.dto.ts` for query params.

### 8.6 Logging

- Nest `Logger` named after the class.
- Log status transitions (with old → new + user id), QA decisions, RMQ ACK / NACK outcomes.
- **NEVER** log full result bodies, tokens, emails, or secrets (`../../../../.cursorrules`).

---

## 9. Anti-patterns to avoid

(extending `AGENTS.md` and `../../CLAUDE.md`)

- **Manually setting `status_id`** without going through the review/transition methods — bypasses `result-review-history`.
- **Missing justification on REJECT** — DTO and service must both enforce.
- **Ignoring `source = SourceEnum.Bilateral`** in management code — bilateral and editor flows diverge on review.
- **Direct ToC writes** instead of `ResultsTocResultsService` — skips indicator-target sync.
- **Renaming `results_by_inititiatives/`** (sic) — the typo is encoded in DB column names, entity property names, and consumer imports across modules.
- **Renaming `result_levels/`, `result_budget/`, `gender_tag_levels/`, `impact_areas_scores_components/`, etc.** — snake_case folders match snake_case table names; the singular `result.repository.ts` (vs plural `results.*`) is also intentional.
- **Adding business logic to `result-review-history/`** — it's an audit table; writes happen from services that mutate the corresponding state.
- **New top-level folders here that aren't a result association** — if it's cross-cutting, it belongs under `../../shared/` or a sibling `api/<feature>/`.
- **Coupling `summary/` to a specific consumer** — summary builders are read by both `bilateral` and `platform-report`. Don't bake bilateral-only assumptions in.
- **Refactoring `results.service.ts` monolithically** — it's large by design (4.6k lines) because it owns the whole lifecycle. Extract narrow helpers as needed; don't shotgun-split it.
- **Changing a migration that's already in `master`** — write a new one (the standard project rule).

---

## 10. Quick reference paths

- Controller (entry): [`./results.controller.ts`](./results.controller.ts)
- Service (lifecycle): [`./results.service.ts`](./results.service.ts)
- Repository (queries): [`./result.repository.ts`](./result.repository.ts)
- Module wiring: [`./results.module.ts`](./results.module.ts)
- Sub-module routes: [`./results.routes.ts`](./results.routes.ts)
- RMQ consumer: [`./reporting-metadata-export.consumer.ts`](./reporting-metadata-export.consumer.ts)
- Bilateral payload builders: [`./summary/`](./summary/) + [`./summary/repositories/`](./summary/repositories/)
- Admin panel: [`./admin-panel/`](./admin-panel/)
- Submissions: [`./submissions/`](./submissions/)
- Review history (audit): [`./result-review-history/`](./result-review-history/)
- Deletion audit: [`./result-deletion-audit/`](./result-deletion-audit/)
- Lifecycle workflow guide: [`./AGENTS.md`](./AGENTS.md)
- Ingestion module (sibling): [`../bilateral/CLAUDE.md`](../bilateral/CLAUDE.md)
- Payload contract: [`../../../docs/bilateral-result-summaries.en.md`](../../../docs/bilateral-result-summaries.en.md)
- Base classes: [`../../shared/entities/base-service.ts`](../../shared/entities/base-service.ts), [`../../shared/entities/base-entity.ts`](../../shared/entities/base-entity.ts)
- Project enums: [`../../shared/constants/result-type.enum.ts`](../../shared/constants/result-type.enum.ts), [`../../shared/constants/result-status.enum.ts`](../../shared/constants/result-status.enum.ts), [`../../shared/constants/role-type.enum.ts`](../../shared/constants/role-type.enum.ts)

---

## 11. SDD checklist (this module)

1. Spec at `../../../../docs/specs/results/<feature>/` (`requirements.md`, `design.md`, `task.md`). For a sub-module spec, use `docs/specs/results/<sub-feature>/`. If missing, run `/sdd-specify` first.
2. Cite the right project IDs: `AC-1` (typed result integrity), `AC-2` (submission workflow), `AC-5` (phase correctness), `AC-6` (evidence + ToC at submit), `AC-7` (soft delete + recovery).
3. Migration if entities changed. `migration:check` green locally.
4. If `summary/` changed → update the bilateral payload doc + add a change-log row.
5. Tests co-located. Server thresholds 5/20/35/40 minimum — aim higher for new code.
6. Commit using `<emoji> <type>(<scope>) [ticket]: <description>` with `results.service`, `results.controller`, `result.repository`, or the specific sub-module folder name as the scope.
