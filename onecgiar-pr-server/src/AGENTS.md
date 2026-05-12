# AGENTS.md - `onecgiar-pr-server/src` (source-tree navigation and patterns)

This is the source-tree guide for any AI coding agent editing the NestJS backend source. It complements `../AGENTS.md`, `../../AGENTS.md`, and the SDD baseline under `../../docs/`.

Legacy note: `CLAUDE.md` is the Claude-specific mirror. This file is standalone and agent-neutral.

## Read Order

1. `../../AGENTS.md`
2. `../AGENTS.md`
3. This file
4. Relevant SDD spec under `../../docs/specs/<module>/`
5. `../docs/bilateral-result-summaries.en.md` for bilateral/platform-report payload changes

## 60-Second Mental Model

```text
src/
├── main.ts
├── main.routes.ts
├── app.module.ts
├── app.controller.ts
├── app.service.ts
├── api/
│   └── modules.routes.ts
├── auth/
├── clarisa/
├── toc/
├── elastic/
├── result-dashboard-bi/
├── connection/
├── shared/
├── config/
├── migrations/
└── *.spec.ts
```

If a new top-level concept is needed, prefer extending `api/` or `shared/` instead of inventing a sibling folder.

## Bootstrap And Wiring

`main.ts`:

- Creates `AppModule` with open CORS.
- Accepts 50 MB JSON and URL-encoded payloads for evidence uploads.
- Enables URI versioning.
- Configures Helmet CSP.
- Serves Swagger at `/api` using custom `auth` API-key header.
- Attaches RMQ microservice only when reporting metadata export queue is configured.
- Listens on `env.PORT` or `3000`.

`app.module.ts`:

- Imports every shipped feature module.
- Binds `JwtMiddleware` and `apiVersionMiddleware` to `/api/(.*)`, `/v2/(.*)`, `/clarisa/(.*)`, and `/toc/(.*)`.
- Excludes `/api/platform-report/(.*)` and `/api/bilateral/(.*)` from JWT middleware.
- Binds `JwtMiddleware` separately to `/type-one-report`.
- Registers `ThrottlerExcludeBilateralGuard`, `HttpExceptionFilter`, throttling, scheduling, and TypeORM.

Do not add new global guards, filters, interceptors, or middleware without a spec.

`main.routes.ts` maps top-level route groups:

- `/api` to `api/modules.routes.ts`.
- `/auth` to auth module routes.
- `/clarisa` to CLARISA routes.
- `/toc` to ToC routes.
- `/result-dashboard-bi` to BI routes.
- `/logs` to DynamoDB log routes.
- `/contribution-to-indicators` to indicator routes.

`/v2/api/*` is served through URI versioning and `apiVersionMiddleware`.

## API Modules

Standard module layout:

```text
api/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.controller.spec.ts
├── <feature>.service.ts
├── <feature>.service.spec.ts
├── <feature>.repository.ts
├── <feature>.repository.spec.ts
├── <feature>.routes.ts
├── dto/
├── entities/
└── (optional) handlers/, services/, repository/, <sub-feature>/
```

Known top-level API modules:

- `ad_users/`: AD lookup.
- `ai/`: AI helpers.
- `bilateral/`: JWT-off, throttler-off external payloads.
- `contribution-to-indicators/`: mounted top-level, not under `/api`.
- `delete-recover-data/`: soft-delete recovery.
- `global-narratives/`: PMU narratives.
- `global-parameter/`: tunable runtime parameters.
- `home/`: landing aggregates.
- `initiative_entity_map/`: initiative/entity mapping.
- `ipsr/`: mega module for innovation packages.
- `ipsr-framework/`: cross-result IPSR framework reporting.
- `m-qap/`: MQAP lookup.
- `notification/`: notifications.
- `platform-report/`: JWT-off headless payloads.
- `result-impact-area-scores/`: DAC scoring.
- `result-qaed/`: QA decisions.
- `results/`: largest result module.
- `results-framework-reporting/`: cross-cutting reporting flows.
- `type-one-report/`: PMU consolidated report.
- `user-notification-settings/`: user preferences.
- `versioning/`: phases/reporting cycles.

Adding a top-level API feature:

1. Create `api/<feature>/` using standard layout.
2. Register the module in `app.module.ts`.
3. Add a route entry in `api/modules.routes.ts` or parent route file.
4. Choose response shape: standard `ResponseInterceptor` envelope or deliberate raw external shape.
5. Choose auth posture: default JWT, explicit public exclusion with perimeter protection, or role-gated.
6. Add DTOs with validation.
7. Add Swagger decorators.
8. Add migration if entities changed.
9. Add co-located tests.

## Results Module

`api/results/` is the largest module.

Entry files:

- `results.controller.ts`
- `results.service.ts`
- `result.repository.ts` (singular file name)
- `results.module.ts`
- `results.routes.ts`

It contains result associations, lifecycle modules, type-specific data, admin/summary modules, and the RMQ consumer `reporting-metadata-export.consumer.ts`.

Preserve naming gotchas:

- `results_by_inititiatives/` is misspelled and must not be renamed.
- Snake_case and kebab-case folders coexist. Match surrounding table/entity naming.

## Auth

`auth/` contains identity, JWT, roles, and users:

- `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`.
- `jwt.strategy.ts`.
- `dto/`.
- `entities/`.
- `Middlewares/` with capital `M`; do not rename.
- `modules/` for role, role-by-user, user, restrictions, and auth routes.

`JwtMiddleware` rules:

- Custom header: `auth: <JWT>`.
- `Basic` auth is rejected.
- Public allowlist is intentionally small; new public features should use middleware `exclude(...)` in `app.module.ts` instead.
- Token verification uses `env.JWT_SKEY`.
- Payload must include `id` and `email`.
- Middleware re-signs and returns a fresh `auth` header.
- `updateLastLogin` runs async and must not block requests.

Authorization:

- `RoleTypeEnum`: `INITIATIVE`, `ACTION_AREA`, `APPLICATION`.
- `RoleEnum`: numeric; lower means more privileged.
- Enforcement: `ValidRoleGuard` plus `@Roles(role, type)`.
- Do not invert the `userRole <= requiredRole` comparison.

## CLARISA

`clarisa/` is a read-only master-data cache and sync layer.

Key files:

- `clarisa.connection.ts`
- `clarisaCron.service.ts`
- `clarisatask.service.ts`
- `clarisa-endpoints.enum.ts`
- `dtos/`
- `clarisa-<endpoint>/` modules

Adding a catalog:

1. Create `clarisa-<name>/`.
2. Register it on `ClarisaEndpoints`.
3. Add the mount in `clarisa.routes.ts`.
4. Register the module in `clarisa.module.ts`.
5. Add a mapper if response flattening is needed.

Sync must be idempotent. Failures must log safely without secrets. The frontend must not call CLARISA directly.

Preserve CLARISA naming quirks such as PascalCase repository files and plural `dtos/`.

## ToC, Elastic, BI, Connection

- `toc/`: Theory of Change modules; PRMS reads from source-of-truth and maps results to ToC.
- `elastic/`: Elasticsearch integration.
- `result-dashboard-bi/`: BI reporting surface mounted under `/result-dashboard-bi/*`.
- `connection/dynamodb-logs/`: DynamoDB-backed logs only. Do not put business entities here.

## Shared Infrastructure

Important shared folders:

- `handlers/`: `HttpExceptionFilter`, error helpers.
- `Interceptors/`: `ResponseInterceptor`; capital `I` is historical and must not be renamed.
- `middleware/`: `api-versioning.middleware.ts`.
- `guards/`: throttler exclusion, role validation, disabled endpoints.
- `decorators/`: `@Roles`, `@UserToken`, `@DecodedUser`, `@DisabledEndpoint`.
- `entities/`: base entity and service classes.
- `extendsGlobalDTO/`: base repositories, replicable repository, return service DTO.
- `globalInterfaces/`: token and shared DTO contracts.
- `constants/`: project enums and response constants.
- `microservices/`: auth, email, RMQ export, sockets.
- `services/`: cache, SharePoint.
- `utils/`: common helpers.
- `data-model/` and `querys/`: reference material, not TypeScript code.
- `test/`: shared test helpers.

## Base Entities And Services

Base entities:

- `BaseEntity`: default audit + soft-delete columns.
- `VersionBaseEntity`: version-tracked rows with same audit columns.
- `BaseEntityControlList`: control-list rows with `justification`.
- `Auditable`: auth-side audit columns using `created_at` and `updated_at`.

Do not mix base classes in one entity.

Base services:

- `BaseDeleteService`: soft-delete joins.
- `BaseServiceSimple`: common upsert/delete pattern for result joins.
- Prefer `BaseServiceSimple` over per-feature soft-delete loops.

When using `BaseServiceSimple.create(...)`, prefer the options object form and pass `userId` for audit columns.

## Service Patterns

Return `returnFormatService` for non-trivial service returns:

```ts
{ response, message, status }
```

The `ResponseInterceptor` turns it into the standard envelope. Throw `HttpException` for errors.

Transactions:

```ts
public async doThing(input: SomeDto, manager?: EntityManager) {
  const repo = manager ? manager.getRepository(MyEntity) : this.mainRepo;
}
```

Use `shared/utils/orm.util.ts` and `selectManager(...)` where appropriate.

Audit:

- Set `created_by` and `last_updated_by` on manual saves.
- Pass `userId` into base-service options.

Soft delete:

- Use `is_active = false`.
- Reactivation flips it back.
- Result deletions may require audit rows.

Pagination/filtering/search:

- Push SQL into repositories.
- Use query DTOs with validation and transformation.

Swagger:

- Every endpoint needs `@ApiTags` and `@ApiOperation` at minimum.
- Add query, body, and response docs for non-trivial endpoints.

Logging:

- Use Nest `Logger` named after the class.
- Log status transitions and job outcomes safely.
- Never log tokens, request headers, secrets, webhook URLs, AD credentials, or full JWTs.

## Config And Migrations

`config/`:

- `orm.config.ts`: TypeORM DataSource, entities, migrations config.
- `dynamo.config.ts`: Dynamoose logs config.
- `const.config.ts`: project constants.

Do not add top-level config files without coordination; tooling expects this layout.

`migrations/`:

- Files are timestamp-prefixed.
- One migration per logical change.
- Every migration must have a working `down`.
- Do not squash old migrations.
- Do not edit landed migrations.
- `npm run migration:check` must pass.

## Tests

Most files have co-located specs:

- Service specs verify orchestration and business rules.
- Controller specs verify DTO-to-service behavior.
- Repository specs verify SQL/find conditions.
- Module specs verify DI graph.
- Route specs verify mount tables.
- Bootstrap specs protect app shell behavior.

Do not delete specs when refactoring. Update them.

## Bilateral And Platform Report

If changing response shape:

- Update `../docs/bilateral-result-summaries.en.md`.
- Add a change-log row.
- Update payload-fixture tests.
- Keep changes additive unless a versioned rollout is specified.

## Anti-Patterns To Avoid

- Hand-decoding JWTs in services.
- Logging request headers verbatim.
- Adding new public paths to `JwtMiddleware.publicRoutes` instead of middleware exclusion.
- Duplicating soft-delete loops.
- Mixing `created_date` and `created_at` on one entity.
- Adding new top-level folders under `src/`.
- Adding global guards, filters, or interceptors without a spec.
- Letting the client bypass CLARISA.
- Hard-coded business strings in services that surface to users; use constants.
- Renaming `results_by_inititiatives/`.
- Renaming `shared/Interceptors/`.
- Modeling business entities in DynamoDB.
- Editing migrations already landed in `master`.

## Where To Start

| Intent | Start here |
|---|---|
| Add typed result feature | `api/results/<sub-feature>/` and `api/results/results.routes.ts` |
| Add top-level domain module | `api/<feature>/`, `app.module.ts`, `api/modules.routes.ts` |
| Add bilateral payload field | `api/bilateral/`, `api/results/summary/`, contract doc |
| Add CLARISA catalog | `clarisa/clarisa-<name>/`, endpoint enum, routes, module |
| Add role-gated endpoint | Controller `@UseGuards(ValidRoleGuard)` and `@Roles(...)` |
| Add background job | Scheduled service under the owning module |
| Add RMQ consumer | Co-locate with producing module |
| Touch response shape | Check `ResponseInterceptor` or deliberate raw response |
| Change schema | New migration under `migrations/` |
| Add shared utility | `shared/utils/<name>.ts` with spec |
| Manage join tables | Prefer `BaseServiceSimple` |

## SDD Workflow Inside `src/`

1. Confirm the spec at `../../docs/specs/<module>/`.
2. Cite `G#`, `US-*`, `AC-*` from `../../docs/prd.md` and relevant `W1..W8` workflow/module sections from `../../docs/detailed-design/detailed-design.md`.
3. Implement using the standard module shape or existing shared primitive.
4. Add a migration if entities changed.
5. Add or update co-located tests.
6. Do not lower coverage.
7. Update bilateral/platform-report contract docs if those payloads changed.
8. Commit only when explicitly asked.

## Quick Reference Paths

- Bootstrap: `main.ts`
- Root module: `app.module.ts`
- Top-level routes: `main.routes.ts`
- API routes: `api/modules.routes.ts`
- CLARISA routes: `clarisa/clarisa.routes.ts`
- CLARISA endpoints: `clarisa/clarisa-endpoints.enum.ts`
- Auth routes: `auth/modules/auth-modules.routes.ts`
- TypeORM: `config/orm.config.ts`
- JWT middleware: `auth/Middlewares/jwt.middleware.ts`
- Global filter: `shared/handlers/error.exception.ts`
- Response interceptor: `shared/Interceptors/Return-data.interceptor.ts`
- Role guard: `shared/guards/valid-role.guard.ts`
- Throttler guard: `shared/guards/throttler-exclude-bilateral.guard.ts`
- Base entity: `shared/entities/base-entity.ts`
- Base service: `shared/entities/base-service.ts`
- Replicable repository: `shared/extendsGlobalDTO/replicable-repository.ts`
- Result status enum: `shared/constants/result-status.enum.ts`
- Result type enum: `shared/constants/result-type.enum.ts`
- Role enum: `shared/constants/role-type.enum.ts`
- Bilateral contract: `../docs/bilateral-result-summaries.en.md`
