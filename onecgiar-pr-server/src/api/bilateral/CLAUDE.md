# CLAUDE.md — `api/bilateral/` (Headless ingestion & sync surface)

This is the **module-level guide** for `api/bilateral`. It complements:

- [`../../CLAUDE.md`](../../CLAUDE.md) — source-tree patterns (auth, response envelope, base classes, anti-patterns).
- [`./AGENTS.md`](./AGENTS.md) — workflow-focused guide (ingestion flow, handler strategy, security posture, intent → file).
- [`../../../docs/bilateral-result-summaries.en.md`](../../../docs/bilateral-result-summaries.en.md) — **authoritative payload contract** for `/api/bilateral/*` responses.

> **Read order:** package-level `CLAUDE.md` → `src/CLAUDE.md` → this file → `AGENTS.md` → payload contract.
>
> `AGENTS.md` covers **what the module does** (ingestion flow, handlers, review workflow). This `CLAUDE.md` covers **how the code is laid out**, the security/contract rules that apply, and what to touch (or not) when extending it.

---

## 1. What this module is

A **headless API surface** for bilateral / external consumers. Two roles:

1. **Outbound (read):** typed payloads per result type, consumed by downstream systems (funders, BI, platform reports). The shape is the contract — see the payload doc.
2. **Inbound (write):** structured ingestion endpoint (`POST /create`) used by external syncs to push results into PRMS, plus per-id reads (`GET /:id`), bulk reads (`GET /results`), and a filterable list (`GET /list`).

Mount: `/api/bilateral/*`.

### Critical postures

- **JWT-excluded** — listed in `app.module.ts` `.exclude(...)`. Protection is at the perimeter (API Gateway, IP allowlist, signed query params), NOT in NestJS.
- **Throttler-excluded** — `@SkipThrottle()` on the controller; `ThrottlerExcludeBilateralGuard` is the global guard that respects this. Large sync batches MUST not be rate-limited.
- **Payload stability is a hard rule.** Changes are **additive**; field removals or renames require a `v2` rollout. Every change updates the change log in [`../../../docs/bilateral-result-summaries.en.md`](../../../docs/bilateral-result-summaries.en.md).
- **No JWT means no `req.user`.** Audit columns (`created_by`, `last_updated_by`) are resolved from payload emails via `findOrCreateUser` — see `AGENTS.md` §Ingestion Flow.

---

## 2. Folder map

```
api/bilateral/
├── CLAUDE.md                                    # ← you are here
├── AGENTS.md                                    # workflow guide
├── bilateral.module.ts                          # 30+ imports — bilateral pulls in most of api/results + clarisa
├── bilateral.controller.ts                      # 4 endpoints, heavy Swagger
├── bilateral.service.ts                         # ~4 600 lines — orchestration + enrichment
├── bilateral.service.spec.ts
├── dto/
│   ├── create-bilateral.dto.ts                  # ~1 350 lines — full ingestion contract
│   └── list-results-query.dto.ts                # Filters for GET /list
└── handlers/                                    # Strategy pattern, one per ingestion-capable result type
    ├── bilateral-result-type-handler.interface.ts
    ├── knowledge-product.handler.ts             # CGSpace-driven; ignores title/description in payload
    ├── capacity-change.handler.ts
    ├── innovation-development.handler.ts
    ├── innovation-use.handler.ts
    ├── policy-change.handler.ts
    └── noop.handler.ts                          # OTHER_OUTPUT — accepted, no extra processing
```

### Sizes (rough)

| File | Lines | Notes |
|---|---|---|
| `bilateral.service.ts` | ~4 600 | The orchestrator. Split into private helpers per concern (toc, partners, geo, evidence, summary, list, sync). Do not refactor monolithically; carve discrete helpers when one grows. |
| `dto/create-bilateral.dto.ts` | ~1 350 | One `RootResultsDto` + many nested DTOs covering every type-specific block. |
| `bilateral.controller.ts` | ~230 | Thin pass-through. Heavy `@ApiQuery` / `@ApiOperation` documentation — keep Swagger in sync with the payload doc. |
| `handlers/*.handler.ts` | 100–400 each | One per result type. Implement `BilateralResultTypeHandler`. |

---

## 3. Endpoints

All routed at `/api/bilateral/*`. JWT-off, throttler-off.

| Method | Path | Service method | Purpose |
|---|---|---|---|
| `POST` | `/create` | `BilateralService.create(body)` | Idempotent ingestion. `ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })`. Body type: `RootResultsDto`. |
| `GET` | `/` | `BilateralService.findAll(limit?)` | All active bilateral results. Default `limit=10`. Returns array — bypasses the envelope. |
| `GET` | `/list` | `BilateralService.listAllResults(query)` | Filterable list (pagination, portfolio, phase_year, result_type, status, dates, center, initiative_lead_code, search, source). Heavy `@ApiQuery` block — keep it documented. |
| `GET` | `/results` | `BilateralService.getResultsForSync(bilateral?, type?)` | Bulk read for external sync — same shape as `/create` body. |
| `GET` | `/:id` | `BilateralService.findOne(id)` | Single enriched result by id. |

**Interceptor note:** the controller carries `@UseInterceptors(ResponseInterceptor)`. Arrays from these endpoints **pass through unchanged** (the interceptor explicitly skips arrays — that's the whole reason the rule exists). When you add a new endpoint that returns a raw array, lean on this behavior; for object responses you'll get the standard envelope.

---

## 4. Ingestion contract (`POST /create`)

See `AGENTS.md` §Ingestion Flow for the **flow**. Rules that apply here:

- **DTO validation is strict on shape, lenient on extras.** `forbidNonWhitelisted: false` is intentional — external syncs may carry extra columns they read elsewhere. We **whitelist** so unknown fields are dropped without 400'ing the sync.
- **`RootResultsDto`** is the single root entry. Sub-DTOs cover ToC alignment, geography, partners, evidence, type-specific blocks, and bilateral project budget lines.
- **Identity resolution:** `findOrCreateUser` maps incoming emails → PRMS users; external profiles are created on demand. Audit columns (`created_by`, `last_updated_by`) come from there — see `AGENTS.md`.
- **Transactions:** the create call is wrapped in a single ACID transaction. Sub-entity helpers (`processToc`, `processGeo`, `processPartners`, …) accept an injected `EntityManager`.
- **Handlers (Strategy pattern):**
  - Map: `resultTypeHandlerMap: Record<number, BilateralResultTypeHandler>` in `BilateralService`.
  - Interface: [`handlers/bilateral-result-type-handler.interface.ts`](./handlers/bilateral-result-type-handler.interface.ts):
    - `readonly resultType: number` — the `ResultTypeEnum` value the handler claims.
    - `initializeResultHeader?(context)` — first call; can return `{ resultHeader, isDuplicate? }` or `null` (defaults to standard creation).
    - `afterCreate?(context)` — second call; persist type-specific blocks after the result row is in place.
  - `NoopBilateralHandler` is registered for `OTHER_OUTPUT` — accept but do nothing extra. Mirror this pattern when adding a new "no extra processing" result type.
- **`KnowledgeProductBilateralHandler`** is the only handler that **does NOT** take title/description from the payload — it uses the `handle` to call `ResultsKnowledgeProductsService` and fetches authoritative metadata from CGSpace. Don't generalise this pattern unless the new type genuinely has a third-party master.

---

## 5. The module's deep dependency graph

`bilateral.module.ts` imports ~30 sibling modules. This is **intentional** — bilateral is a cross-domain orchestrator and needs:

- Every result-association module (`ResultsTocResultsModule`, `ResultsCentersModule`, `ResultsKnowledgeProductsModule`, `ResultsByInstitutionsModule`, `ResultsByProjectsModule`, `ResultsByInititiativesModule`, `EvidencesModule`, `NonPooledProjectsModule`, `ResultCountriesModule`, `ResultCountriesSubNationalModule`, `ResultRegionsModule`, `CapdevsDeliveryMethodsModule`, `CapdevsTermsModule`, `ShareResultRequestModule`, …).
- Every CLARISA module it validates against (`ClarisaCountriesModule`, `ClarisaRegionsModule`, `ClarisaInstitutionsModule`, `ClarisaCentersModule`, `ClarisaProjectsModule`, `ClarisaPolicyTypesModule`, `ClarisaPolicyStagesModule`, `ClarisaInnovationReadinessLevelsModule`, `ClarisaInnovationUseLevelsModule`, `ClarisaSubnationalScopeModule`, `ClarisaGeographicScopesModule`).
- Versioning + Years + Submissions + InnovationUseModule + PathwayModule.
- Direct repository providers: `ResultsInnovationsDevRepository`, `ResultsInnovationsUseRepository`, `ResultsCapacityDevelopmentsRepository`, `ResultsPolicyChangesRepository`, `NonPooledProjectBudgetRepository` — pulled from `api/results/summary/repositories/` and `api/results/result_budget/repositories/` because the summary/enrichment paths need them directly.

**Rule:** when you add a new sibling module that bilateral needs, register it in `bilateral.module.ts` `imports`. Don't try to inject services from modules that aren't imported here — Nest will fail at DI graph compile time.

---

## 6. Payload contract discipline

Every change that affects what a consumer sees on `data` MUST:

1. **Update [`../../../docs/bilateral-result-summaries.en.md`](../../../docs/bilateral-result-summaries.en.md)** — both the section for the affected `type` and the change log at the bottom.
2. **Keep changes additive.** New fields are fine. Removals / renames require a `v2` rollout (AC-4 in [`../../../../docs/prd.md`](../../../../docs/prd.md)).
3. **Use CLARISA ids, not PRMS join PKs.** A `policy_type`, `institution`, `initiative`, `project`, etc. on the payload carries the CLARISA `id`, not an internal `results_by_*` row id.
4. **Field names are `camelCase` on `data`.** `data.policy_change_summary`, `data.knowledge_product_summary.handle`, `data.innovation_development_summary.innovation_development_questionnaire`, etc.
5. **Update or add payload-fixture tests** — co-located `*.spec.ts` files validate shape, not behaviour. They are the regression net for downstream consumers.

When ingestion shape (`RootResultsDto`) changes, document it in the same change log row — `/create` and the read surfaces are versioned together.

---

## 7. Patterns to follow

### 7.1 Adding a new result-type handler

1. Add the type to `ResultTypeEnum` (`../../shared/constants/result-type.enum.ts`) if it's new on the project.
2. Create `handlers/<type>.handler.ts` implementing `BilateralResultTypeHandler`.
3. Co-locate `handlers/<type>.handler.spec.ts`.
4. Register the provider in `bilateral.module.ts`.
5. Wire it in `resultTypeHandlerMap` inside `BilateralService`.
6. Update the payload doc with the new `<type>_summary` block.

### 7.2 Adding a new field to the ingestion DTO

1. Add it to `dto/create-bilateral.dto.ts` with the right `class-validator` decorators.
2. Decide whether the field is required (most external fields are optional — sync sources are heterogeneous).
3. Update the handler that consumes it (or `BilateralService` if it's cross-type).
4. Add a payload-doc change-log row even if the field is **input-only** — external syncs read the doc too.

### 7.3 Adding a new list / filter parameter

1. Add the field to `dto/list-results-query.dto.ts` with validation.
2. Plumb it through `BilateralService.applyListResultsFilters` (or the equivalent helper).
3. Document it with `@ApiQuery({ name, required, type, description, example })` on `BilateralController.listAll` — Swagger here is the consumer-facing docs.
4. Confirm pagination / `limit` caps still apply.

### 7.4 Validating against CLARISA

Always validate external ids (institution code, country code, region id, project id, policy type / stage id) against the CLARISA repository for that catalog. Never trust ingestion ids blindly — sync sources occasionally send legacy codes.

### 7.5 Logging

- Nest `Logger` named after the class.
- **Never log emails, payloads, or `idempotencyKey`** in production-level debug logs (see `AGENTS.md` and `../../../../.cursorrules`).
- For batch operations log counts and outcomes, not body content.

---

## 8. Anti-patterns to avoid

(extending `AGENTS.md`'s list)

- **Skipping the handler** for type-specific blocks — `BilateralService` calls handlers; don't reach into result-type-specific repositories from the service directly.
- **Hardcoding `result_type_id` numerics** — use `ResultTypeEnum`.
- **Bypassing CLARISA validation** for institutions / countries / projects / policy stages.
- **Returning a wrapped envelope from a list endpoint that's expected to be a raw array** — the bilateral list/sync endpoints return arrays for downstream compatibility. The interceptor passes arrays through unchanged; new endpoints follow that posture.
- **Re-enabling JWT or throttler** on bilateral without a perimeter strategy.
- **Editing the payload doc but not the code (or vice versa)** — they ship together.
- **Renaming `results_by_inititiatives`** (sic) in any imports the module depends on — the typo is in DB column names and entity property names.

---

## 9. Quick reference paths

- Controller (Swagger source): [`./bilateral.controller.ts`](./bilateral.controller.ts)
- Service (orchestration + enrichment): [`./bilateral.service.ts`](./bilateral.service.ts)
- Module wiring: [`./bilateral.module.ts`](./bilateral.module.ts)
- Ingestion DTO: [`./dto/create-bilateral.dto.ts`](./dto/create-bilateral.dto.ts)
- List query DTO: [`./dto/list-results-query.dto.ts`](./dto/list-results-query.dto.ts)
- Handler interface: [`./handlers/bilateral-result-type-handler.interface.ts`](./handlers/bilateral-result-type-handler.interface.ts)
- Handlers: [`./handlers/`](./handlers/)
- **Authoritative payload contract:** [`../../../docs/bilateral-result-summaries.en.md`](../../../docs/bilateral-result-summaries.en.md)
- Workflow guide: [`./AGENTS.md`](./AGENTS.md)
- Lifecycle / review (sibling): [`../results/CLAUDE.md`](../results/CLAUDE.md)

---

## 10. SDD checklist (this module)

1. Spec for the change at `../../../../docs/specs/bilateral/<feature>/` (`requirements.md`, `design.md`, `task.md`). If missing, run `/sdd-specify`.
2. Cite the relevant project IDs — at minimum `AC-1`, `AC-4`, `AC-9` from `../../../../docs/prd.md`.
3. Update the payload doc and add a change-log row.
4. Update / add fixture tests for any shape change.
5. Keep Swagger docs in sync with the doc.
6. Commit using `<emoji> <type>(<scope>) [ticket]: <description>` with `bilateral.service` / `bilateral.controller` / `bilateral.handlers` as the scope.
