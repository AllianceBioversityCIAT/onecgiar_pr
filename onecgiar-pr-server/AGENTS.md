# AGENTS.md — PRMS NestJS Backend

> Agent role: **Server-side specialist** for the PRMS NestJS 11 backend. Read this file before editing anything under `onecgiar-pr-server/`.

## Project overview

PRMS (Planning, Reporting & Management System) backend. NestJS 11, TypeORM/MySQL, deployed as Lambda + API Gateway (`serverless.yaml`) or Docker (`Dockerfile`). Local dev runs on `env.PORT` or `3000`.

## Read order

1. Root [`AGENTS.md`](../AGENTS.md) for ecosystem orientation and project-level rules.
2. This file for server-specific conventions.
4. `src/AGENTS.md` for source-tree navigation.
5. Module guides (`src/api/bilateral/AGENTS.md`, `src/api/results/AGENTS.md`) when touching those surfaces.
6. Relevant SDD spec under [`docs/specs/<module>/`](../docs/specs/).

## Quick commands

- Install: `npm ci`
- Dev server: `npm run start:dev`
- Tests: `npm run test`, `npm run test:cov`, `npm run test:e2e`
- Lint: `npm run lint`
- Migration empty: `npm run migration:empty -- --name=<name>`
- Migration generate: `npm run migration:generate -- --name=<name>`
- Migration run: `npm run migration:run`
- Migration check: `npm run migration:check`
- Lambda offline: `npm run lambda:test`
- Lambda deploy: `npm run lambda:deploy`

## Module map

API modules live under `src/api/` and are wired in `src/app.module.ts`, routed via `src/main.routes.ts` and `src/api/modules.routes.ts`.

| Module | Route | Responsibility |
|---|---|---|
| `ad_users` | `/api/ad-users/*` | AD lookup |
| `ai` | `/api/ai/*` | AI-assisted authoring helpers |
| `bilateral` | `/api/bilateral/*` | JWT-off, throttler-off headless ingestion (CGSpace, training, policy, innovation) |
| `contribution-to-indicators` | `/contribution-to-indicators/*` | Indicator-level contributions |
| `delete-recover-data` | `/api/manage-data/*` | Soft-delete recovery |
| `global-narratives` | `/api/global-narratives/*` | PMU narrative blocks |
| `global-parameter` | `/api/global-parameters/*` | Runtime parameters |
| `home` | `/api/home/*` | Landing aggregates |
| `initiative_entity_map` | `/api/initiatives-entity/*` | Initiative-to-entity mapping |
| `ipsr` | `/api/ipsr/*` | Innovation Package authoring |
| `ipsr-framework` | `/api/ipsr-framework/*` | Cross-result IPSR framework reporting |
| `m-qap` | `/api/m-qap/*` | MQAP integration |
| `notification` | `/api/notification/*` | In-app notifications |
| `platform-report` | `/api/platform-report/*` | JWT-off headless payload surface |
| `result-impact-area-scores` | `/api/result-impact-area-scores/*` | DAC and impact-area scoring |
| `result-qaed` | `/api/result-qaed/*` | QA decisions and status transitions |
| `results` | `/api/results/*` | Largest module: result CRUD, associations, bilateral review lifecycle, RMQ export consumer |
| `results-framework-reporting` | `/api/results-framework-reporting/*` | Cross-cutting reporting flows |
| `type-one-report` | `/type-one-report` | PMU consolidated report |
| `user-notification-settings` | `/api/user-notification-settings/*` | Channel preferences |
| `versioning` | `/api/versioning/*` | Phase and reporting cycle |

Other top-level surfaces:

| Path | Route | Responsibility |
|---|---|---|
| `auth` | `/auth/*` | JWT issue/verify, AD/Cognito flows, roles, users |
| `clarisa` | `/clarisa/*` | CLARISA catalog cache and cron sync |
| `toc` | `/toc/*` | Theory of Change trees |
| `elastic` | internal | Elasticsearch integration |
| `result-dashboard-bi` | `/result-dashboard-bi/*` | BI integration |
| `connection/dynamodb-logs` | `/logs/*` | Operational logs only |

## Coding conventions

### Module shape

Use this layout for new features:

```text
<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.routes.ts
├── dto/
├── entities/
└── *.spec.ts
```

### Authentication

- Use custom header `auth: <JWT>`. Never use or document `Authorization: Bearer`.
- `JwtMiddleware` applies to `/api/(.*)`, `/v2/(.*)`, `/clarisa/(.*)`, `/toc/(.*)`, `/type-one-report`.
- Excluded from JWT: `/api/platform-report/*`, `/api/bilateral/*`.
- JWT payload must contain `id` and `email`. Middleware re-signs and returns a fresh `auth` header.
- Prefer `@UserToken()` and `@DecodedUser()` over hand-decoding JWTs.

### Authorization

- Enforce with `ValidRoleGuard` + `@Roles(role, type)`.
- `RoleTypeEnum`: `INITIATIVE`, `ACTION_AREA`, `APPLICATION`.
- Valid when `userRole <= requiredRole` (lower numeric role = more privileged).
- Frontend role gates are cosmetic only; backend must enforce.

### DTOs and validation

- DTOs live in `<module>/dto/`.
- Default pipe: `ValidationPipe({ whitelist: true, transform: true })`.
- Legacy `/api/*` may use `forbidNonWhitelisted: false`; strict `/v2/api/*` may use `true`.
- Reuse base DTOs from `shared/extendsGlobalDTO/` and `shared/globalInterfaces/`.

### Responses

- Default envelope: `{ response, statusCode, message, timestamp, path }`.
- Services return `{ response, message, status }`; `ResponseInterceptor` wraps it.
- Bilateral/platform-report endpoints return deliberate raw shapes per contract.

### Persistence

- MySQL + TypeORM. DataSource: `config/orm.config.ts`.
- `synchronize: false`, `migrationsRun: false`. Schema changes require migrations.
- One migration per logical change; every migration must have a working `down`.
- Do not edit migrations already in `master`.
- DynamoDB (Dynamoose) is used only by `connection/dynamodb-logs/`. No business entities in DynamoDB.
- Push heavy SQL into repositories; services orchestrate.

### Bilateral and platform report

- Authority: `docs/bilateral-result-summaries.en.md`.
- Every payload shape change must update that doc's change log and payload-fixture tests.
- Keep changes additive unless a `v2` rollout is in scope.
- Bilateral is JWT-off and throttler-off; perimeter protection lives outside NestJS.

### Microservices, schedules, real-time

- RMQ consumer: `src/api/results/reporting-metadata-export.consumer.ts`.
  - `noAck: false`, ACK only after success, `prefetchCount: 1`, durable queue.
- CLARISA sync is the primary scheduled task; must be idempotent.
- Pusher/WebSocket events are hints; client reconciles via API.
- Respect `UserNotificationSettings` before sending email.

## Security rules

Never print, log, echo, expose, commit, or partially reveal:

- JWTs or `auth` headers.
- Webhook URLs.
- API keys.
- Passwords.
- AD, Cognito, database, RabbitMQ, AWS, SharePoint, MQAP, Elasticsearch, or third-party credentials.
- Sensitive environment variables.

## Dependency context map

| Dependency | Usage | Key file |
|---|---|---|
| MySQL | Primary relational store via TypeORM | `config/orm.config.ts` |
| DynamoDB | Operational logs only | `connection/dynamodb-logs/`, `config/dynamo.config.ts` |
| RabbitMQ | Reporting metadata export queue | `main.ts`, `src/api/results/reporting-metadata-export.consumer.ts` |
| Elasticsearch | Search integration | `elastic/` |
| AWS / Cognito / AD | Identity and deployment | `auth/`, `serverless.yaml`, `Dockerfile` |
| CLARISA | Master-data catalog cache | `clarisa/` |
| MQAP | Integration lookup | `api/m-qap/` |
| SharePoint | File/notification services | `shared/services/` |
| Pusher / WebSocket | Real-time hints | `shared/microservices/socket-management/` |
| Swagger | API docs at `/api` | `main.ts` |

## Testing

- Framework: Jest + `ts-jest`.
- Coverage thresholds (floors, not targets): branches 5%, functions 20%, lines 35%, statements 40%.
- Priorities: workflow transitions, bilateral/platform-report payload mappers, non-trivial repository SQL, guards/middleware/interceptors/filters, RMQ consumers, cron tasks, DTO validation.

## Anti-patterns

- Do not log tokens, headers, credentials, secrets, or full JWTs.
- Do not add public routes to `JwtMiddleware.publicRoutes`; use middleware `exclude(...)`.
- Do not model business entities in DynamoDB.
- Do not rename `results_by_inititiatives/` or `shared/Interceptors/`.
- Do not add top-level folders under `src/` without a spec.
- Do not hand-decode JWTs in services.
- Do not duplicate soft-delete loops; prefer `BaseServiceSimple`.
- Do not mix `created_date` and `created_at` on one entity.

## Where to start

| Intent | Start here |
|---|---|
| Add a top-level API feature | `api/<feature>/`, `app.module.ts`, `api/modules.routes.ts` |
| Add a result sub-feature | `api/results/<sub-feature>/`, `api/results/results.routes.ts` |
| Add a bilateral payload field | `api/bilateral/`, `api/results/summary/`, `docs/bilateral-result-summaries.en.md` |
| Add a CLARISA catalog | `clarisa/clarisa-<name>/`, endpoint enum, routes, module |
| Add a role-gated endpoint | `@UseGuards(ValidRoleGuard)` + `@Roles(...)` |
| Change schema | New migration under `migrations/` |
| Add a shared utility | `shared/utils/<name>.ts` with spec |
| Manage join tables | Prefer `BaseServiceSimple` |

## Quick reference paths

- Bootstrap: `src/main.ts`
- Root module: `src/app.module.ts`
- Top-level routes: `src/main.routes.ts`
- API routes: `src/api/modules.routes.ts`
- ORM datasource: `src/config/orm.config.ts`
- JWT middleware: `src/auth/Middlewares/jwt.middleware.ts`
- Global filter: `src/shared/handlers/error.exception.ts`
- Response interceptor: `src/shared/Interceptors/Return-data.interceptor.ts`
- Role guard: `src/shared/guards/valid-role.guard.ts`
- Throttler guard: `src/shared/guards/throttler-exclude-bilateral.guard.ts`
- API versioning middleware: `src/shared/middleware/api-versioning.middleware.ts`
- Bilateral contract: `docs/bilateral-result-summaries.en.md`
- Migration check script: `scripts/check-pending-migrations.ts`
