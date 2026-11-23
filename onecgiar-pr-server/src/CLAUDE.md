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

## 1. Bootstrap & wiring — rules only

- `main.ts`: the 50 MB `express.json` limit carries evidence uploads — lowering it breaks them. The helmet CSP allows `'unsafe-inline'`/`'unsafe-eval'` because Swagger needs it — tightening MUST keep Swagger working. Swagger's security scheme is the `apiKey` header `auth` — don't switch to `Authorization: Bearer`.
- `app.module.ts` is the single source of truth for which modules ship: a new top-level module needs an import there AND an entry in the matching `*.routes.ts`. Don't add a new global guard / filter / interceptor without a spec — global behaviour is load-bearing.
- `/v2/api/*` is not declared in `main.routes.ts` — it is served by URI versioning + `apiVersionMiddleware`; endpoints opt in with `@Version('2')` or by reading `req['apiVersion']`.
- `/contribution-to-indicators` is mounted top-level (NOT under `/api/`).

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

### 2.2–2.3 Module gotchas

- `api/bilateral/` and `api/results/` have their own module guides (`CLAUDE.md` + `AGENTS.md` in each folder) — read them before touching those modules.
- `bilateral/` is JWT-off and throttler-off (`@SkipThrottle()`); `platform-report/` is JWT-off. Both return raw arrays/objects per [`../docs/bilateral-result-summaries.en.md`](../docs/bilateral-result-summaries.en.md).
- `api/results/result.repository.ts` is singular (plural everywhere else).
- `results_by_inititiatives/` is misspelled — do NOT rename; the entity, FK, and column names match. Snake_case and kebab-case folder names coexist — match the existing entity table name.
- The RMQ consumer `reporting-metadata-export.consumer.ts` lives in `api/results/` (NOT under `shared/microservices/`).
- KP Discovery proxy (`results-knowledge-products/cgspace-discovery/`): `CGSPACE_DISCOVERY_URL`, `MELSPACE_DISCOVERY_URL`, `WORLDFISH_DISCOVERY_URL` are each required for their repository with no in-code fallback; a missing one reports that repository as `unconfigured`, never a 5xx, and never names the variable to the client. MQAP stays the metadata source after an item is selected.
- `global-parameter/` values are read through `shared/services/cache/global-parameter-cache.service.ts` (invalidated on parameter writes).

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

`auth/Middlewares/` has a capital `M` (historical) — do not rename.

### 3.1 `JwtMiddleware` rules (`Middlewares/jwt.middleware.ts`)

- **Header:** custom `auth: <JWT>` (NOT `Authorization: Bearer`).
- **`Basic` auth is rejected** — 401 with `shouldRedirectToLogin: true`.
- **Public routes** (allowlist — keep tiny): `/login/provider`, `/login/custom`, `/validate/code`, `/api/bilateral`. New feature paths SHOULD use `exclude(...)` in `app.module.ts` instead.
- **The whole `/auth/*` mount carries no `JwtMiddleware` at all** — `main.routes.ts` binds the middleware only to `/api/(.*)`, `/v2/(.*)`, `/clarisa/(.*)`, `/toc/(.*)`, `/type-one-report`, so every route under `/auth/*` (including the Center email-OTP routes `GET auth/login/otp/config`, `POST auth/login/otp/start`, `POST auth/login/otp/verify`) is public by construction and MUST gate itself. The OTP routes gate via the `OTP_ALLOWED_EMAIL_DOMAINS` global parameter (`global_parameters`, category `platform_global_variables`; comma-separated domains, no `@`; empty value = the path stays hidden) and a per-normalised-email `OtpThrottlerGuard` (`start` 5 / `verify` 10 per 15 min, neutral `429 OTP_RATE_LIMITED`), never by a token.
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

Central registry of every CLARISA catalog. A new catalog needs a `public static readonly` instance on `ClarisaEndpoints` plus its module/route registration.

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

## 6. `elastic/`, `result-dashboard-bi/`, `connection/` — rules only

- DynamoDB (`connection/`) is **logs only** — never business entities. A new operational log shape goes in a sibling under `connection/`, not in `shared/`.
- The client hits Elasticsearch directly with separate credentials (the Angular interceptor skips the `auth` header for ES URLs).

---

## 7. `shared/` — Cross-cutting infrastructure

Rules and gotchas (the folder inventory was removed — read the tree):

- `shared/Interceptors/` is PascalCase (capital `I`) — don't rename; imports reference the exact path.
- `ResponseInterceptor` (per-controller): **arrays pass through unchanged** (bilateral/external endpoints); objects get the standard envelope. `HttpExceptionFilter` logs the stack but it NEVER reaches the client body.
- Prefer `@UserToken()` / `@DecodedUser()` over hand-decoding the JWT.
- Base entities: `BaseEntity` (default; `is_active`, `created_date`, `last_updated_date`, `created_by`, `last_updated_by`), `VersionBaseEntity` (same columns, kept separate for migration history), `BaseEntityControlList` (+ `justification`), `Auditable` (auth-side; `created_at`/`updated_at`, NOT `*_date`). **Don't mix base classes** — the migration history depends on these names.
- Join-table services: extend `BaseServiceSimple` / `BaseDeleteService` (`shared/entities/base-service.ts`) instead of writing per-feature soft-delete loops. Prefer the `{ options }` form of `create(...)` (`dataRole`, `manager`, `userId`, …) for new code; use `upsertByCompositeKeys(...)` when uniqueness spans several columns.
- Non-trivial service returns use `returnFormatService` (`shared/extendsGlobalDTO/returnServices.dto.ts`) so the interceptor produces a consistent envelope.
- `ResultStatusData` (`shared/constants/result-status.enum.ts`) is a class, **not** a plain enum — don't convert it; the class carries both `name` and numeric `value`.
- A new enum consumed by more than one module goes in `shared/constants/`.
- RMQ publisher + `isReportingMetadataExportQueueConfigured()` live in `shared/microservices/reporting-metadata-export-queue/`; the consumer lives in `api/results/` by design (proximity to the producing entity).
- Before writing a new utility, grep `shared/utils/`. `orm.util.ts → selectManager(...)` is what makes services transaction-aware.
- `shared/data-model/` and `shared/querys/` are reference material only — no TypeScript there.
- `shared/test/` holds cross-module test factories (excluded from coverage).

---

## 8. `config/`

`orm.config.ts`: `synchronize: false`, `migrationsRun: false`; migrations table `migrations`, metadata table `orm_metadata`. **Don't add new top-level config files** without coordinating — the migration tooling expects this exact layout.

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

## 15. SDD workflow (inside `src/`)

When you sit down to edit anything in this tree:

1. Confirm the spec at `../../docs/specs/<module>/` (`requirements.md`, `design.md`, `task.md`). If missing, run `/sdd-specify` first — templates live in `../../docs/specs/general-setup/`.
2. Cite `G#`, `US-*`, `AC-*` from `../../docs/prd.md` and the relevant workflow id (`W1..W8`) and module section from `../../docs/trd/trd.md`.
3. Implement using the folder pattern in §2.1 (or extend the right `shared/` primitive).
4. Migration if entities changed.
5. Tests co-located. Don't lower coverage.
6. If you changed `/api/bilateral/*` or `/api/platform-report/*` — change-log row in `../docs/bilateral-result-summaries.en.md`.
7. Commit using the project's `<emoji> <type>(<scope>) [ticket]: <description>` convention.
