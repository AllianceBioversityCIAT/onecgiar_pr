# CLAUDE.md — `onecgiar-pr-server/src` (source-tree navigation & patterns)

This is the **source-tree guide** for the PRMS backend. It complements the package-level [`../CLAUDE.md`](../CLAUDE.md), the root [`../../CLAUDE.md`](../../CLAUDE.md), and the SDD baseline under [`../../docs/`](../../docs/).

> **Read order:** root → package → this file. Everything below assumes you already know the SDD methodology and the high-level architecture.

This file is intentionally dense. It documents:

- Every top-level folder under `src/`, what lives in it, and why.
- The exact patterns to follow when adding a new module / entity / DTO.
- The patterns to **stop and ask before changing** (load-bearing infrastructure).
- The conventions and anti-patterns I've observed in the current tree.

---

## 0. The 60-second mental model

```
src/
├── main.ts               # Nest bootstrap, helmet, swagger, RMQ microservice
├── main.routes.ts        # Top-level URL → child Routes mapping
├── app.module.ts         # Wires every feature module + middleware bindings
├── app.controller.ts     # Health / root endpoints
├── app.service.ts        # Root service used by app.controller
│
├── api/                  # Most business logic (one folder per domain module)
│   └── modules.routes.ts # /api/* child routes (mounts every api/<feature>)
│
├── auth/                 # Identity, AuthN/AuthZ, JWT, roles, users
├── clarisa/              # CLARISA catalog cache + cron sync (read-only)
├── toc/                  # Theory of Change (toc-results, toc-level)
├── elastic/              # Elasticsearch integration
├── result-dashboard-bi/  # BI integration surface
├── connection/           # External infra connections (DynamoDB logs)
│
├── shared/               # Cross-cutting primitives
│   ├── handlers/         # HttpExceptionFilter, error utils
│   ├── Interceptors/     # ResponseInterceptor (capital I — historical)
│   ├── middleware/       # apiVersionMiddleware
│   ├── guards/           # ValidRoleGuard, ThrottlerExcludeBilateralGuard, DisabledEndpointGuard
│   ├── decorators/       # @Roles, @UserToken, @DecodedUser, @DisabledEndpoint
│   ├── entities/         # BaseEntity, Auditable, VersionBaseEntity, BaseService*
│   ├── extendsGlobalDTO/ # BaseRepository, ReplicableRepository, returnFormatService
│   ├── globalInterfaces/ # TokenDto, replicable.interface, basic-info, clarisa-response
│   ├── constants/        # Project enums (ResultStatusData, ResultTypeEnum, RoleEnum, ...)
│   ├── microservices/    # auth-microservice, email-notification-management, RMQ export, sockets
│   ├── services/         # cache/, share-point/
│   ├── utils/            # array, string, date, object, change-tracker, validation, ...
│   ├── data-model/       # ER diagrams and SQL dumps (NOT code)
│   ├── querys/           # db.sql legacy
│   └── test/             # Shared test helpers
│
├── config/               # orm.config.ts (TypeORM DataSource), dynamo.config.ts, const.config.ts
├── migrations/           # 400+ TypeORM migrations (chronological, *-Description.ts)
└── *.spec.ts             # Bootstrap-level tests
```

Anything not listed here doesn't exist yet — if you need a new top-level concept, prefer extending `shared/` rather than inventing a sibling folder.

---

## 1. Bootstrap & wiring (root files)

### `main.ts`

| Concern | What it does | Don't touch unless… |
|---|---|---|
| `NestFactory.create(AppModule, { cors: true })` | CORS open at the app level. | …you also tighten upstream (API Gateway). |
| `express.json({ limit: '50mb' })` + `urlencoded` | Accepts large evidence payloads. | Lowering breaks evidence uploads. |
| `app.enableVersioning({ type: VersioningType.URI })` | Enables URI versioning (`v1`, `v2`). | Required for the `v2/api/*` mount. |
| `helmet({ contentSecurityPolicy: { ... } })` | CSP allows `'unsafe-inline'`/`'unsafe-eval'` in scripts (Swagger needs it), Google Fonts in `styleSrc`/`fontSrc`. | Tightening MUST keep Swagger working. |
| Swagger at `/api` | Security scheme: `apiKey` header `auth`. | Don't switch to `Authorization: Bearer`. |
| RMQ microservice attach | Only if `isReportingMetadataExportQueueConfigured()` is true. ACK off, prefetch 1, durable queue. | Re-export the helper from `shared/microservices/reporting-metadata-export-queue/reporting-metadata-export-queue.constants.ts` if you reuse it. |
| Port | `env.PORT` or `3000`. Logger prints `localhost:<port>` + `/api` doc URL. | — |

### `app.module.ts`

The single source of truth for **which modules ship**. Two responsibilities:

1. **Imports** — every feature module is listed here. Adding a new top-level domain module requires editing this file AND adding it to the appropriate Routes file (`api/modules.routes.ts`, `clarisa/clarisa.routes.ts`, `auth/modules/auth-modules.routes.ts`, etc.).
2. **Middleware bindings** in `configure(consumer)`:
   - `JwtMiddleware + apiVersionMiddleware` applied to `/api/(.*)`, `/v2/(.*)`, `/clarisa/(.*)`, `/toc/(.*)`.
   - **Exclusions:** `/api/platform-report/(.*)`, `/api/bilateral/(.*)`.
   - `JwtMiddleware` bound separately to `/type-one-report`.
3. **Global providers:**
   - `APP_GUARD = ThrottlerExcludeBilateralGuard`
   - `APP_FILTER = HttpExceptionFilter`
   - `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])`
   - `ScheduleModule.forRoot()`
   - `TypeOrmModule.forRoot({ ...dataSource.options, autoLoadEntities: true })`

**Rule:** Don't add a new global guard / filter / interceptor here without a spec — global behavior changes are load-bearing.

### `main.routes.ts`

Top-level routes table:

| Mount | Child routes file | Notes |
|---|---|---|
| `/api` | `api/modules.routes.ts` (`ModulesRoutes`) | The main app traffic. |
| `/auth` | `auth/modules/auth-modules.routes.ts` (`AuthModulesRoutes`) | Login, refresh, users, roles. |
| `/clarisa` | `clarisa/clarisa.routes.ts` (`ClarisaRoutes`) | One child per catalog endpoint. |
| `/toc` | `toc/toc.routes.ts` (`TocRoutes`) | ToC trees and results. |
| `/result-dashboard-bi` | `result-dashboard-bi/result-dashboard-bi.routes.ts` | BI surface. |
| `/logs` | `connection/dynamoRoutes.routes.ts` | DynamoDB log surface. |
| `/contribution-to-indicators` | `api/contribution-to-indicators/contribution-to-indicators.routes.ts` | Top-level (NOT under `/api/`). |

`/v2/api/*` is **not** declared here — it's served by URI versioning + `apiVersionMiddleware`. Endpoints opt in by adding `@Version('2')` on the handler or by referring to `req['apiVersion']`.

### `app.controller.ts` / `app.service.ts`

Root health and entry endpoints. Light intentionally — feature work belongs in `api/<feature>/`.

---

## 2. `api/` — Feature modules (most of the codebase)

22 top-level folders. Every folder follows the **standard module shape** unless noted.

### 2.1 Standard module layout (the canonical pattern)

```
api/<feature>/
├── <feature>.module.ts        # @Module(imports, controllers, providers, exports)
├── <feature>.controller.ts    # @Controller + @ApiTags + DTO bindings + @UseInterceptors(ResponseInterceptor)
├── <feature>.controller.spec.ts
├── <feature>.service.ts       # Orchestration, business rules
├── <feature>.service.spec.ts
├── <feature>.repository.ts    # TypeORM repository (custom queries, joins, search)
├── <feature>.repository.spec.ts
├── <feature>.routes.ts        # Optional: child Routes (when there are sub-modules)
├── dto/
│   ├── create-<feature>.dto.ts
│   ├── update-<feature>.dto.ts
│   ├── list-<feature>-query.dto.ts
│   └── responses/             # Optional, for documented response DTOs
├── entities/
│   └── <feature>.entity.ts
└── (optional)
    ├── handlers/              # Helper classes called by the service
    ├── services/              # Sub-services when the main service is too large
    ├── repository/            # Nested repositories when there are multiple tables
    └── <sub-feature>/         # A nested module (see api/results, api/ipsr below)
```

### 2.2 The module map

| Folder | Mount | Standard layout? | Notes worth knowing |
|---|---|---|---|
| `ad_users/` | `/api/ad-users/*` | Yes | AD lookup via `ldapts`. |
| `ai/` | `/api/ai/*` | Yes | Uses `@UserToken()` and DTOs in `dto/responses/`. Auth-gated. |
| `bilateral/` | `/api/bilateral/*` | Yes (+ `handlers/`) | **JWT-off, throttler-off** via `@SkipThrottle()`. Returns raw arrays/objects per [`../docs/bilateral-result-summaries.en.md`](../docs/bilateral-result-summaries.en.md). **Has its own module guide:** [`api/bilateral/CLAUDE.md`](./api/bilateral/CLAUDE.md) + workflow notes in [`api/bilateral/AGENTS.md`](./api/bilateral/AGENTS.md). |
| `contribution-to-indicators/` | `/contribution-to-indicators/*` (top-level) | Yes | Mounted in `main.routes.ts`, not under `/api/`. |
| `delete-recover-data/` | `/api/manage-data/*` | Yes | Admin surface for soft-delete recovery. |
| `global-narratives/` | `/api/global-narratives/*` | Yes | PMU narrative blocks. |
| `global-parameter/` | `/api/global-parameters/*` | Yes | Tunable runtime parameters — read by `shared/services/cache/global-parameter-cache.service.ts`. |
| `home/` | `/api/home/*` | Yes | Landing-page aggregates. |
| `initiative_entity_map/` | `/api/initiatives-entity/*` | Yes | Initiative ↔ entity mappings. |
| `ipsr/` | `/api/ipsr/*` | **Mega module** | Nests `assessed-during-expert-workshop`, `innovation-packaging-experts`, `innovation-pathway`, `non-pooled-package-projects`, `result-innovation-package`, `result-innovation-package-countries`, `result-innovation-package-regions`, `result-ip-measures`, `results-by-ip-innovation-use-measures`, `results-complementary-innovations`, `results-complementary-innovations-functions`, `results-innovation-packages-enabler-type`, `results-innovation-packages-validation-module`, `results-ip-actors`, `results-ip-institution-type`, `results-package-by-initiatives`, `results-package-centers`, `results-package-toc-result`, `share-result-innovation-package-request`. |
| `ipsr-framework/` | `/api/ipsr-framework/*` | Yes | Cross-result IPSR framework reporting. |
| `m-qap/` | `/api/m-qap/*` | Yes | External MQAP knowledge-product lookup. |
| `notification/` | `/api/notification/*` | Yes | In-app notifications. Talks to `socket-management` and `email-notification-management`. |
| `platform-report/` | `/api/platform-report/*` | Yes (+ `repositories/`, `platform-report-payloads.ts`, `platform-report.constants.ts`) | **JWT-off**. Headless. |
| `result-impact-area-scores/` | `/api/result-impact-area-scores/*` | Yes | DAC / impact-area scoring. |
| `result-qaed/` | `/api/result-qaed/*` | Yes | QA decisions & transitions (status_id 1↔2↔3). |
| `results/` | `/api/results/*` | **Mega module** (see §2.3) | 60+ sub-folders. **Has its own module guide:** [`api/results/CLAUDE.md`](./api/results/CLAUDE.md) + workflow notes in [`api/results/AGENTS.md`](./api/results/AGENTS.md). |
| `results-framework-reporting/` | `/api/results-framework-reporting/*` + nested mounts | Yes | Hosts `contributors-partners/`, `innovation_dev/`, `innovation-use/`, `geographic-location/`. |
| `type-one-report/` | `/type-one-report` (separate JWT bind) | Yes | PMU consolidated report. |
| `user-notification-settings/` | `/api/user-notification-settings/*` | Yes | Channel preferences per user. |
| `versioning/` | `/api/versioning/*` | Yes | Phase / reporting cycle management. |
| `modules.routes.ts` | n/a | Routes manifest | `ModulesRoutes: Routes[]` mounting each child path. |

### 2.3 `api/results/` — the largest module

Read this section before touching anything under `api/results/`. For a deeper map (sub-folder taxonomy by purpose, RMQ consumer rules, summary builder discipline, anti-patterns), open the in-module guide: [`api/results/CLAUDE.md`](./api/results/CLAUDE.md) (and [`api/results/AGENTS.md`](./api/results/AGENTS.md) for the lifecycle / review workflows).

- **Entry trio:** `results.controller.ts`, `results.service.ts`, `result.repository.ts` (note singular `result.repository.ts`, plural everywhere else), `results.module.ts`, `results.routes.ts`.
- **Sub-modules** (~60 folders) follow the standard layout and are wired in `results.routes.ts`. They cover:
  - **Result associations:** `evidences/`, `evidence_types/`, `results-centers/`, `results_by_inititiatives/` (sic — preserved typo), `results_by_institutions/`, `results_by_institution_types/`, `results_by_evidences/`, `results-toc-results/`, `result-countries/`, `result-countries-sub-national/`, `result-regions/`, `result-actors/`, `result_budget/`, `result-folders/`.
  - **Lifecycle:** `result-status/`, `result-review-history/`, `result-deletion-audit/`, `result_levels/`, `result-by-level/`, `submissions/`.
  - **Type-specific data:** `results-knowledge-products/`, `knowledge_product_fair_baseline/`, `capdevs-delivery-methods/`, `capdevs-terms/`, `partner-delivery-type/`, `gender_tag_levels/`, `impact_areas_scores_components/`, `results-impact-area-indicators/`, `results-impact-area-target/`, `result-questions/`, `legacy-result/`, `legacy_indicators_locations/`, `legacy_indicators_partners/`, `linked-results/`, `intellectual_property_experts/`, `ost-melia-studies/`, `non-pooled-projects/`, `results_by_projects/`, `result-by-institutions-by-deliveries-type/`, `result-types/`, `results-validation-module/`, `results-investment-discontinued-options/`, `investment-discontinued-options/`, `results-package-centers/` *(IPSR cross-ref)*.
  - **Operational:** `admin-panel/`, `summary/` (per-type summary builders — pairs with bilateral payloads), `share-result-request/`, `years/`, `versions/`, `units-of-measure/`, `institution_roles/`, `initiative_roles/`.
- **RMQ consumer:** `reporting-metadata-export.consumer.ts` lives at this level (NOT under `shared/microservices/`). When the queue config is present, `main.ts` attaches the microservice and this consumer receives messages.
- **Naming gotchas (preserve these — DB columns depend on them):**
  - `results_by_inititiatives/` is misspelled; do NOT rename — the entity, FK, and column names match.
  - Snake_case folder names (`gender_tag_levels`, `result_levels`, `result_budget`) coexist with kebab-case ones — both are accepted; match the existing entity table name.

### 2.4 Adding a new feature module under `api/`

1. **Create the folder** `api/<feature>/` with the standard layout (§2.1).
2. **Register the module** in `app.module.ts` (`imports: [..., MyFeatureModule]`).
3. **Add the route entry** in `api/modules.routes.ts` (or in the parent feature's `*.routes.ts` if nested).
4. **Pick the response shape:**
   - Default — wrap with `@UseInterceptors(ResponseInterceptor)`.
   - Headless / external (bilateral/platform-report style) — return arrays/objects; the interceptor passes arrays through unchanged.
5. **Pick auth posture:**
   - Default — JWT enforced by middleware.
   - Public surface — add the path to the `exclude(...)` list in `app.module.ts` AND coordinate perimeter protection (API Gateway / IP allowlist). Do NOT add to `JwtMiddleware.publicRoutes` for a new feature — that allowlist is for the login bootstrap path.
   - Role-gated — `@UseGuards(ValidRoleGuard)` + `@Roles(RoleEnum.X, RoleTypeEnum.Y)`.
6. **DTOs** — `class-validator` decorators, defaults `whitelist: true, transform: true`.
7. **Swagger** — `@ApiTags`, `@ApiOperation`, `@ApiQuery`, `@ApiBody`, `@ApiOkResponse`, document path + auth.
8. **Migration** — if you added entities, generate one (`npm run migration:generate -- ./src/migrations/<name> -d ./src/config/orm.config.ts`).
9. **Tests** — co-located `*.spec.ts`.

---

## 3. `auth/` — Identity, JWT, roles, users

```
auth/
├── auth.controller.ts / auth.service.ts / auth.module.ts
├── jwt.strategy.ts                  # passport-jwt strategy (used by Swagger spec)
├── dto/                             # LoginUserDto, AuthCodeValidationDto, PusherAuthDto, ...
├── entities/auth.entity.ts
├── Middlewares/                     # capital M — historical, do not rename
│   ├── jwt.middleware.ts            # The middleware (see §3.1)
│   ├── jwt.middleware.spec.ts
│   ├── middlewareDTOs/
│   └── search-throttle.middleware.ts
├── services/active-directory.service.ts   # ldapts wrapper
├── utils/bcrypt.util.ts
└── modules/
    ├── auth-modules.routes.ts       # /auth/* child routes
    ├── role/                        # Roles catalog
    ├── role-by-user/                # User↔role join (used by ValidRoleGuard)
    ├── role-levels/
    ├── restrictions/, restrictions-by-role/
    └── user/                        # User module trio + repositories
```

### 3.1 `JwtMiddleware` rules (`Middlewares/jwt.middleware.ts`)

- **Header:** custom `auth: <JWT>` (NOT `Authorization: Bearer`).
- **`Basic` auth is rejected** — 401 with `shouldRedirectToLogin: true`.
- **Public routes** (allowlist — keep tiny): `/login/provider`, `/login/custom`, `/validate/code`, `/api/bilateral`. New feature paths SHOULD use `exclude(...)` in `app.module.ts` instead.
- **Token verify** via `JwtService.verifyAsync(token, { secret: env.JWT_SKEY })`. `TokenExpiredError` → 401 with `shouldRefreshToken: true`. Other errors → 401 with `shouldRedirectToLogin: true`.
- **Payload contract:** MUST contain `id` and `email`. Exposed as `req.user` and `res.locals.jwtPayload`.
- **Session rolling:** the middleware re-signs and **returns a fresh `auth` header on the response**. The Angular interceptor picks that up.
- **`updateLastLogin`** runs async (no await) — failures are logged, never blocking.

### 3.2 Authorization

- Roles modeled as enums in `shared/constants/role-type.enum.ts`:
  - `RoleTypeEnum` = `INITIATIVE | ACTION_AREA | APPLICATION`.
  - `RoleEnum` = `ADMIN | GUEST | LEAD | CO_LEAD | COORDINATOR | MEMBER | ACTION_AREA_GLOBAL_DIRECTOR | ACTION_AREA_COORDINATOR`. Numeric — **lower = more privileged** (`ADMIN = 1`).
  - `ModuleTypeEnum` (`ALL | REPORTING | IPSR`) and `AppModuleIdEnum` (`REPORTING = 1, IPSR = 2`).
  - `StatusPhaseEnum`, `ActiveEnum`.
- Enforcement: `ValidRoleGuard` + `@Roles(role, type)` decorator. The guard accepts when `userRole <= data.roles` (i.e., user has the required level **or higher privilege**). Don't invert the comparison.

### 3.3 `auth/modules/user/`

Standard trio plus `constants/`, `dto/`, `entities/`, `enum/`, `repositories/`. The `UserRepository` here is injected by `JwtMiddleware` for `updateLastLogin`. Avoid making `UserRepository` async-heavy — it sits on the request hot path.

---

## 4. `clarisa/` — Master-data cache (read-only by design)

```
clarisa/
├── clarisa.module.ts / clarisa.routes.ts
├── clarisa.connection.ts             # HTTP client to CLARISA
├── clarisaCron.service.ts            # Schedules the catalog sync
├── clarisatask.service.ts            # Executes one catalog sync
├── clarisa-endpoints.enum.ts         # ★ Central registry of every CLARISA endpoint
├── dtos/                             # External DTOs (raw CLARISA payload shapes)
└── clarisa-<endpoint>/               # Per-catalog Nest module (standard layout)
    ├── *.controller.ts / .service.ts / .module.ts
    ├── *Repository.ts                # PascalCase repository name — preserve it
    ├── dto/
    └── entities/
```

### 4.1 `clarisa-endpoints.enum.ts`

The **registry** of every CLARISA catalog the server consumes. Each `ClarisaEndpoints` instance encodes: HTTP path, method (always `GET`), target entity class, optional mapper DTO→entity, optional query params.

When adding a new catalog:

1. Create `clarisa-<name>/` with the standard layout.
2. Register a `public static readonly` instance on `ClarisaEndpoints`.
3. Add the mount in `clarisa/clarisa.routes.ts`.
4. Register the module in `clarisa.module.ts`.
5. Add a mapper static method if the CLARISA response shape needs flattening.

### 4.2 Sync rules

- `clarisaCron.service.ts` schedules sync via `@nestjs/schedule`.
- Sync MUST be **idempotent** — re-runs leave the cache identical.
- Failures MUST log structured outcome (no secrets) and not crash the app.
- Frontend MUST NOT call CLARISA directly — always go through `/clarisa/*`.

### 4.3 Naming gotchas

- `*Repository.ts` here uses **PascalCase** (e.g., `ClarisaInitiatives.repository.ts`). Other modules use lowercase. Match the surrounding folder.
- `dtos/` is plural here (project-wide we use `dto/`). Don't unify without a sweeping refactor.
- Entity files inside `clarisa-<name>/entities/` use the singular table name (`clarisa-initiative.entity.ts`) while the folder uses plural (`clarisa-initiatives/`). Preserve this.

---

## 5. `toc/` — Theory of Change

```
toc/
├── toc.module.ts / toc.routes.ts
├── toc-results/   # Result↔ToC mapping (standard layout)
└── toc-level/     # ToC level catalog (standard layout)
```

Smaller and well-behaved. Follows the standard module layout. Treat ToC data as **read-from-source-of-truth** — PRMS aligns results to ToC; PRMS does not author ToC nodes.

---

## 6. `elastic/`, `result-dashboard-bi/`, `connection/`

### `elastic/`

Standard trio (`controller`, `service`, `module`) + `dto/`. Wraps Elasticsearch queries. The Angular interceptor **skips the `auth` header for ES URLs** — the client hits ES directly with separate credentials.

### `result-dashboard-bi/`

```
result-dashboard-bi/
├── result-dashboard.module.ts
├── result-dashboard-bi.routes.ts
├── clarisa-credentials-bi.service.ts
└── bi-reports/                      # BI report modules
```

Mounted at `/result-dashboard-bi/*`. Used by the Type-One Report embed in the client.

### `connection/`

```
connection/
├── dynamoRoutes.routes.ts           # /logs/* routes
└── dynamodb-logs/                   # Dynamoose-backed module (standard layout)
```

DynamoDB is **logs only**. Don't model business entities here. If you need a new operational log shape, add a sibling under `connection/` rather than mixing into `shared/`.

---

## 7. `shared/` — Cross-cutting infrastructure

The biggest folder after `api/`. Read this carefully before touching anything inside.

### 7.1 `shared/handlers/`

| File | Purpose |
|---|---|
| `error.exception.ts` | `HttpExceptionFilter` (global filter via `APP_FILTER`). Wraps responses as `{ response, statusCode, message, timestamp, path }`. Logs status > 300 with stack — but the stack NEVER reaches the client body. |
| `error.utils.ts` | Helper for formatting service-level errors. |

### 7.2 `shared/Interceptors/` (capital `I`)

| File | Purpose |
|---|---|
| `Return-data.interceptor.ts` | `ResponseInterceptor`. Applied per-controller via `@UseInterceptors(ResponseInterceptor)`. **Arrays pass through unchanged** (used by external/bilateral endpoints); objects are wrapped with the standard envelope. |

> Naming gotcha: the folder is `Interceptors` (PascalCase). Don't rename — imports across the codebase reference it.

### 7.3 `shared/middleware/`

| File | Purpose |
|---|---|
| `api-versioning.middleware.ts` | Reads `?version=` from the query and writes `req['apiVersion']` (prefixed with `v` if missing). Bound globally alongside `JwtMiddleware` in `app.module.ts`. |

### 7.4 `shared/guards/`

| Guard | Purpose |
|---|---|
| `ThrottlerExcludeBilateralGuard` | Global guard (registered as `APP_GUARD`). Exempts `/api/bilateral/*` from throttling. |
| `ValidRoleGuard` | Per-handler role enforcement. Pairs with `@Roles(role, type)`. Decodes the JWT from the `auth` header to fetch the user id. |
| `DisabledEndpointGuard` | Lets you switch endpoints off via configuration. Pair with `@DisabledEndpoint(...)`. |

### 7.5 `shared/decorators/`

| Decorator | Use |
|---|---|
| `@Roles(roles: RoleEnum, type: RoleTypeEnum)` | Sets `role` metadata read by `ValidRoleGuard`. |
| `@UserToken()` | Param decorator — decodes JWT payload from the `auth` header into a `TokenDto`. |
| `@DecodedUser()` | Param decorator — reads `req.user` populated by `JwtMiddleware`. |
| `@DisabledEndpoint()` | Switches a route off via config. |

**Rule:** Prefer `@UserToken()` / `@DecodedUser()` over hand-decoding the JWT in services.

### 7.6 `shared/entities/` — base entity classes

Every PRMS entity inherits one of these. Pick the right one when creating a new entity.

| Base class | Use when… | Columns |
|---|---|---|
| `BaseEntity` (`base-entity.ts`) | The entity carries soft-delete + full audit. **Default choice.** | `is_active` (bool, default `true`), `created_date`, `last_updated_date`, `created_by` (bigint), `last_updated_by` (bigint). |
| `VersionBaseEntity` (`version-base-entity.ts`) | Same as `BaseEntity` but used for version-tracked rows. Same column set. | Same as `BaseEntity`. Kept as a separate class for migration history. |
| `BaseEntityControlList` (`base-entity-control-list.ts`) | Reference / control-list tables needing a `justification` text field. | Inherits `BaseEntity` + `justification` (text). |
| `Auditable` (`auditableEntity.ts`) | Auth-side rows that audit by `created_at`/`updated_at` (note: NOT `*_date`). | `created_at`, `updated_at`, `updated_by` (int). |

**Don't mix base classes** — if you inherit `BaseEntity` you get `created_date`; auditable rows use `created_at`. The migration history depends on these names.

### 7.7 `shared/entities/base-service.ts` — service base classes

Use these when writing a service whose only job is to maintain a join table (`result_id` ↔ something with an optional `role` discriminator). They give you battle-tested upsert/delete behavior.

| Class | When to extend |
|---|---|
| `BaseServiceProperties<Entity, Repo>` | Foundation. You probably won't extend this directly. |
| `BaseDeleteService<Entity, Repo>` | When the service only needs `delete(resultId, roleId?, date?, userId?)`. Soft-deletes (`is_active=false`) and writes `last_updated_by`. |
| `BaseServiceSimple<Entity, Repo>` | **The workhorse.** Adds `create(...)`, `find(...)`, `transformArrayToSaveObject(...)`, `upsertByCompositeKeys(...)`. Used widely under `api/results/`. |

`BaseServiceSimple.create(...)` supports two call signatures (positional and `{ options }`). Prefer the `options` form for new code:

```ts
this.create(resultId, dataToSave, generalCompareKey, {
  dataRole,
  manager,        // TypeORM EntityManager (for transactions)
  otherAttributes,
  deleteOthersAttributes,
  notDeleteIds,
  userId,         // For created_by / last_updated_by audit
});
```

`upsertByCompositeKeys(...)` is the right call when uniqueness depends on multiple columns rather than a single FK. Reads existing rows once, deactivates rows not in the incoming set, and saves the rest in 2–3 DB calls regardless of dataset size.

**Anti-pattern to avoid:** writing per-feature soft-delete loops. If the service shape fits, extend `BaseServiceSimple`.

### 7.8 `shared/extendsGlobalDTO/`

| File | Purpose |
|---|---|
| `base-repository.ts` | `BaseRepository<T>` extends `ReplicableRepository<T>`. Constructor takes `(target, manager, queryRunner?)`. |
| `replicable-repository.ts` | `ReplicableRepository<T>` extends `Repository<T>` and adds a `replicate(manager, config, lastInsertId?)` method backed by `ConfigCustomQueryInterface` (custom INSERT/FIND/RETURN SQL). Used by phase-rollover style logic. |
| `returnServices.dto.ts` | `returnFormatService { response: any; message: string; status: HttpStatus; }` — the canonical service return shape consumed by `ResponseInterceptor`. |
| `order-administrative-division.dto.ts` | Shared DTO for sorting administrative divisions. |

When a service has anything other than a trivial return, **return `returnFormatService`** so the interceptor produces a consistent envelope.

### 7.9 `shared/globalInterfaces/`

| File | What it defines |
|---|---|
| `token.dto.ts` | `TokenDto { id, email, first_name, last_name }` — JWT payload contract. |
| `replicable.interface.ts` | `ReplicableConfigInterface`, `ConfigCustomQueryInterface`, `GetQueryConfigurationsInterface` — used by `ReplicableRepository`. |
| `basic-info.dto.ts` | Shared mini-DTO for `{ id, name }` style references. |
| `clarisa-response.interfaces.ts`, `clarisa.interfaces.ts` | CLARISA payload helpers. |
| `data-cache.interface.ts` | Cache contract used by `shared/services/cache/`. |
| `delete.interface.ts` | Soft-delete request/response contract. |
| `form-data-json.interface.ts` | Multipart payload shape (used by evidence uploads). |
| `headers.dto.ts` | Shared header reading helpers. |

### 7.10 `shared/constants/`

Project-wide enums. **Adding a new enum?** Put it here, not in a feature folder, if more than one module will consume it.

| File | Notes |
|---|---|
| `result-status.enum.ts` | `ResultStatusData` class with `Editing=1, QualityAssessed=2, Submitted=3, Discontinued=4, PendingReview=5, Approved=6, Rejected=7`. Provides `getFromName` / `getFromValue` helpers. **Don't switch to a plain enum** — the class form lets us carry both `name` and numeric `value`. |
| `result-type.enum.ts` | `ResultTypeEnum`: `POLICY_CHANGE=1, INNOVATION_USE=2, CAPACITY_CHANGE=3, OTHER_OUTCOME=4, CAPACITY_SHARING_FOR_DEVELOPMENT=5, KNOWLEDGE_PRODUCT=6, INNOVATION_DEVELOPMENT=7, OTHER_OUTPUT=8, IMPACT_CONTRIBUTION=9, INNOVATION_USE_IPSR=10, COMPLEMENTARY_INNOVATION=11`. |
| `role-type.enum.ts` | See §3.2. |
| `result-level.enum.ts` | Output / outcome / etc. |
| `result-folder-type.enum.ts` | Folder discriminators. |
| `evidence-type.enum.ts` | Evidence categories. |
| `active-element.enum.ts` | Generic active/inactive flag. |
| `indicator-type-mapping.constant.ts` | Maps result type ↔ indicator type. |
| `Responses.constant.ts` | Stock response messages. |

### 7.11 `shared/microservices/`

| Folder | What it does |
|---|---|
| `auth-microservice/` | Companion auth service (wrapped by `AuthMicroserviceService`). |
| `email-notification-management/` | Outbound email orchestration. Uses Handlebars templates. DTOs in `dto/`, enums in `enum/`. |
| `reporting-metadata-export-queue/` | RMQ publisher + constants (`isReportingMetadataExportQueueConfigured()`). The **consumer** lives at `api/results/reporting-metadata-export.consumer.ts` (NOT here) — symmetric naming was traded for proximity to the producing entity. |
| `socket-management/` | Pusher + WebSocket plumbing. DTO contracts in `dto/`. |

### 7.12 `shared/services/`

| Folder | Purpose |
|---|---|
| `cache/global-parameter-cache.service.ts` | In-process cache for `api/global-parameter/`. Invalidated on parameter writes. |
| `share-point/share-point.service.ts` | SharePoint document storage integration. |

### 7.13 `shared/utils/`

| File | Use |
|---|---|
| `array.util.ts` | `formatDataToArray`, `updateArray`, `filterPersistKey`, common array munging. Used heavily by `BaseServiceSimple`. |
| `change-tracker.ts` | Diff-detection helper for partial updates. |
| `current-user.util.ts` | Helpers to extract the current user id from a request context. |
| `date-formatter.ts` | Date/time formatting helpers. |
| `environment-extractor.ts` | Env helpers. |
| `global-utils.module.ts` | Wraps providers so any module can `imports: [GlobalUtilsModule]`. |
| `object-flattener.ts`, `object.utils.ts` | `isEmpty`, flatten, deep-merge. |
| `orm.util.ts` | `selectManager(...)` — picks between an injected `EntityManager` and the default repo. **Used inside `BaseServiceSimple` to make services transaction-aware.** |
| `prms-user-support.util.ts` | Support-flow helpers. |
| `response.util.ts` | `ReturnResponseUtil.format(...)` — wraps responses into `returnFormatService`. |
| `string-content-comparator.ts`, `string.utils.ts` | String comparators (including normalize-and-compare). |
| `validation.utils.ts` | Cross-DTO validation helpers. |
| `versioning.utils.ts` | Phase / version math helpers. |

**Rule:** before writing a new utility, grep `shared/utils/` — most cross-cutting helpers already exist.

### 7.14 `shared/data-model/` and `shared/querys/`

- `data-model/` — MySQL Workbench files (`*.mwb`), SQL dumps (`*.sql`), and PNG diagrams of the ER model. Reference material only.
- `querys/db.sql` — legacy SQL. Read-only.

**Don't put TypeScript here.** Code lives elsewhere.

### 7.15 `shared/test/`

Shared test helpers and mocks. Excluded from coverage. Put cross-module test factories here.

---

## 8. `config/`

| File | Purpose |
|---|---|
| `orm.config.ts` | `DataSource` for TypeORM. Entities autoloaded from `api/**`, `auth/**`, `clarisa/**`, `toc/**`, `result-dashboard-bi/**`. `synchronize: false`, `migrationsRun: false`. Migrations table: `migrations`, metadata table: `orm_metadata`. |
| `dynamo.config.ts` | Dynamoose configuration for logs. |
| `const.config.ts` | Project-wide config constants. |

**Don't add new top-level config files** without coordinating — the migration tooling expects this exact layout.

---

## 9. `migrations/`

400+ files, all in the format `<timestamp>-<Description>.ts`. Sorted chronologically by filename.

### Conventions

- One migration per logical change.
- Every migration MUST have a working `down`.
- File name from `npm run migration:generate -- ./src/migrations/<name>` (timestamp is auto-prefixed).
- `npm run migration:check` blocks merges with pending migrations.
- Migrations are **excluded** from coverage and from test discovery.

### Rules

- Don't squash old migrations.
- Don't edit a migration after it lands in `master` — write a new one to amend.
- Don't model business entities under `connection/dynamodb-logs/` to avoid the migration system.

---

## 10. The `*.spec.ts` companions

Most files have a co-located `*.spec.ts`. Patterns:

- Service spec: `<feature>.service.spec.ts` — Jest, `@nestjs/testing`, mock repository.
- Controller spec: `<feature>.controller.spec.ts` — verify DTO → service call.
- Repository spec: `<feature>.repository.spec.ts` — verify raw SQL / find conditions.
- Module spec: `<feature>.module.spec.ts` — DI graph compiles.
- Routes spec: `<feature>.routes.spec.ts` — mount path table is correct.
- Bootstrap specs at the root (`main.spec.ts`, `app.module.spec.ts`, `app.service.spec.ts`, …) — guard against regressions in the app shell.

**Don't delete spec files** when refactoring — they form the coverage floor (5/20/35/40). Update them.

---

## 11. Patterns to follow

### 11.1 Service return shape

Return `returnFormatService` (`{ response, message, status }`). The `ResponseInterceptor` will wrap it with the standard envelope. Throw `HttpException` for errors — `HttpExceptionFilter` handles them.

### 11.2 Transactions

When a flow writes to more than one entity, accept an optional `EntityManager`:

```ts
public async doThing(input: SomeDto, manager?: EntityManager) {
  const repo = manager ? manager.getRepository(MyEntity) : this.mainRepo;
  // ...
}
```

Use `shared/utils/orm.util.ts → selectManager(...)` to keep the pattern consistent — `BaseServiceSimple` already does this.

### 11.3 Audit columns

When saving via `BaseServiceSimple`, pass `userId` in the options bag. The base class writes `created_by` / `last_updated_by` for you. Manual saves MUST set these too.

### 11.4 Soft delete

`is_active = false`. Reactivation flips it back. For results, also write a row in `result-deletion-audit/` (admin/PMU flows).

### 11.5 Pagination, filtering, search

Push the SQL into the repository. Services orchestrate; repositories know columns and joins. Use DTOs (`list-*-query.dto.ts`) for query params, with `class-validator` + `class-transformer` to coerce types.

### 11.6 Swagger

Every endpoint MUST carry `@ApiTags` and at least `@ApiOperation({ summary })`. Document `@ApiQuery`, `@ApiBody`, `@ApiOkResponse` when the surface is non-trivial. The Swagger schema serves both internal devs and bilateral consumers.

### 11.7 Logging

Use Nest's `Logger` named after the class. Log status transitions, RMQ ACK outcomes, CLARISA sync results. **NEVER** log tokens, secrets, webhook URLs, AD credentials, or full JWTs (`../../.cursorrules`).

### 11.8 Bilateral / platform-report

If you change response shape, update [`../docs/bilateral-result-summaries.en.md`](../docs/bilateral-result-summaries.en.md) and add a row to its change log. Add or update payload-fixture tests next to the service.

---

## 12. Anti-patterns to avoid

- **Hand-decoding the JWT in services** — use `@UserToken()` / `@DecodedUser()`.
- **Logging request headers verbatim** — they contain the `auth` JWT.
- **Adding to `JwtMiddleware.publicRoutes`** for a new feature — use `exclude(...)` in `app.module.ts` instead and document it.
- **Duplicating soft-delete loops** — extend `BaseServiceSimple` / `BaseDeleteService`.
- **Mixing `created_date` and `created_at` on the same entity** — pick one base class and stick with it.
- **New top-level folders under `src/`** — extend `shared/` or `api/` instead.
- **New global guard / filter / interceptor** without a spec — `app.module.ts` is load-bearing.
- **Bypassing CLARISA from the client** — always go through `/clarisa/*`.
- **Hard-coded business strings** in services that surface to users — move them to `shared/constants/Responses.constant.ts`.
- **Renaming the misspelled `results_by_inititiatives/` folder** — DB column names depend on it.
- **Renaming `shared/Interceptors/`** (capital I) — many imports reference this exact path.
- **Modeling business entities in DynamoDB** — DynamoDB is logs only.
- **Editing a migration that's already in `master`** — write a new one instead.

---

## 13. Where to start (by intent)

| I want to… | Start here |
|---|---|
| Add a new typed result feature | `api/results/<sub-feature>/` + `api/results/results.routes.ts`. |
| Add a new top-level domain module | `api/<feature>/` + `app.module.ts` + `api/modules.routes.ts`. |
| Add a new bilateral payload field | `api/bilateral/` + `api/results/summary/` (typed summaries) + change log in `../docs/bilateral-result-summaries.en.md`. |
| Add a new CLARISA catalog | `clarisa/clarisa-<name>/` + `clarisa/clarisa-endpoints.enum.ts` + `clarisa/clarisa.routes.ts` + `clarisa/clarisa.module.ts`. |
| Add a new role-gated endpoint | `@UseGuards(ValidRoleGuard) @Roles(RoleEnum.X, RoleTypeEnum.Y)` on the controller; verify role rows exist via `auth/modules/role-by-user`. |
| Add a new background job | `@nestjs/schedule` cron in a new service under `<module>/`; ensure idempotency; log start/finish. |
| Add a new RMQ consumer | Co-locate the consumer with the producing module (mirror `api/results/reporting-metadata-export.consumer.ts`); register the microservice in `main.ts`. |
| Touch the response shape | Confirm it returns through `ResponseInterceptor` (or is deliberately raw for bilateral/platform-report). |
| Change schema | New file under `migrations/`. `migration:generate` + verify `up`/`down`. |
| Add a shared utility | `shared/utils/<name>.ts` (+ co-located `.spec.ts`). |
| Add a shared component for join tables | Extend `BaseServiceSimple` rather than re-implementing the upsert pattern. |

---

## 14. Quick reference paths

- **In-module guides:**
  - [`api/bilateral/CLAUDE.md`](./api/bilateral/CLAUDE.md) — bilateral ingestion + read surface (sibling [`api/bilateral/AGENTS.md`](./api/bilateral/AGENTS.md) covers the ingestion workflow).
  - [`api/results/CLAUDE.md`](./api/results/CLAUDE.md) — domain mega-module (sibling [`api/results/AGENTS.md`](./api/results/AGENTS.md) covers the lifecycle / review workflows).
- Bootstrap: [`main.ts`](./main.ts)
- Root module: [`app.module.ts`](./app.module.ts)
- Top-level routes: [`main.routes.ts`](./main.routes.ts)
- API routes: [`api/modules.routes.ts`](./api/modules.routes.ts)
- CLARISA routes: [`clarisa/clarisa.routes.ts`](./clarisa/clarisa.routes.ts) + [`clarisa/clarisa-endpoints.enum.ts`](./clarisa/clarisa-endpoints.enum.ts)
- Auth routes: [`auth/modules/auth-modules.routes.ts`](./auth/modules/auth-modules.routes.ts)
- TypeORM: [`config/orm.config.ts`](./config/orm.config.ts)
- JWT middleware: [`auth/Middlewares/jwt.middleware.ts`](./auth/Middlewares/jwt.middleware.ts)
- Global filter: [`shared/handlers/error.exception.ts`](./shared/handlers/error.exception.ts)
- Response interceptor: [`shared/Interceptors/Return-data.interceptor.ts`](./shared/Interceptors/Return-data.interceptor.ts)
- Role guard: [`shared/guards/valid-role.guard.ts`](./shared/guards/valid-role.guard.ts)
- Throttler guard: [`shared/guards/throttler-exclude-bilateral.guard.ts`](./shared/guards/throttler-exclude-bilateral.guard.ts)
- Base entity: [`shared/entities/base-entity.ts`](./shared/entities/base-entity.ts)
- Base service: [`shared/entities/base-service.ts`](./shared/entities/base-service.ts)
- Replicable repository: [`shared/extendsGlobalDTO/replicable-repository.ts`](./shared/extendsGlobalDTO/replicable-repository.ts)
- Result status enum: [`shared/constants/result-status.enum.ts`](./shared/constants/result-status.enum.ts)
- Result type enum: [`shared/constants/result-type.enum.ts`](./shared/constants/result-type.enum.ts)
- Role enum: [`shared/constants/role-type.enum.ts`](./shared/constants/role-type.enum.ts)
- Bilateral contract: [`../docs/bilateral-result-summaries.en.md`](../docs/bilateral-result-summaries.en.md)

---

## 15. SDD workflow (inside `src/`)

When you sit down to edit anything in this tree:

1. Confirm the spec at `../../docs/specs/<module>/` (`requirements.md`, `design.md`, `task.md`). If missing, run `/sdd-specify` first — templates live in `../../docs/specs/general-setup/`.
2. Cite `G#`, `US-*`, `AC-*` from `../../docs/prd.md` and the relevant workflow id (`W1..W8`) and module section from `../../docs/detailed-design/detailed-design.md`.
3. Implement using the folder pattern in §2.1 (or extend the right `shared/` primitive).
4. Migration if entities changed.
5. Tests co-located. Don't lower coverage.
6. If you changed `/api/bilateral/*` or `/api/platform-report/*` — change-log row in `../docs/bilateral-result-summaries.en.md`.
7. Commit using the project's `<emoji> <type>(<scope>) [ticket]: <description>` convention.
