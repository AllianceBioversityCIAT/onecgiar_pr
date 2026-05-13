# AGENTS.md - `onecgiar-pr-server` (NestJS backend)

This is the package-level guide for any AI coding agent working in the PRMS backend. It complements the root `../AGENTS.md`, the source-tree guide at `src/AGENTS.md`, and the SDD baseline under `../docs/`.

Legacy note: `CLAUDE.md` is the Claude-specific mirror. This file is standalone and should be preferred by generic agents.

## Read Order

1. `../AGENTS.md`
2. This file
3. `src/AGENTS.md` before editing anything under `src/`
4. Relevant SDD spec under `../docs/specs/<module>/`
5. `docs/bilateral-result-summaries.en.md` for `/api/bilateral/*` or platform-report payload work

Server-side work must follow the SDD methodology:

- `../docs/prd.md`: product baseline, personas, goals, `AC-1..AC-9`.
- `../docs/system-design/design.md`: UX system; informs payload labels, validation messages, and notification copy.
- `../docs/detailed-design/detailed-design.md`: technical blueprint.
- `../docs/specs/general-setup/`: module spec templates.
- `docs/bilateral-result-summaries.en.md`: authoritative contract for `/api/bilateral/*`.

## What This Package Is

NestJS 11 application powering PRMS. It runs as:

- Lambda + API Gateway through Serverless Framework (`serverless.yaml`).
- Docker container using Node 20 and a multi-stage `Dockerfile`.
- Local dev server with `npm run start:dev` on `env.PORT` or default `3000`.

Bootstrap in `src/main.ts`:

- `cors: true`.
- `helmet` with CSP for Google Fonts and inline scripts/styles.
- JSON and URL-encoded limits set to 50 MB.
- Swagger at `/api` with API-key security using the custom `auth` header.
- Optional RabbitMQ microservice for `reporting-metadata-export-queue` when configured.
- URI-based versioning via `VersioningType.URI`.

## Module Map

Wired in `src/app.module.ts`; routed in `src/main.routes.ts` and `src/api/modules.routes.ts`.

| Path | Surface | Responsibility |
|---|---|---|
| `auth/` | `/auth/*` | JWT issue/verify, AD/Cognito flows, roles, users. |
| `api/results/` | `/api/results/*` | Largest module: result CRUD and associations. |
| `api/ipsr/` | `/api/ipsr/*` | Innovation Package authoring. |
| `api/ipsr-framework/` | `/api/ipsr-framework/*` | Cross-result IPSR framework reporting. |
| `api/bilateral/` | `/api/bilateral/*` | JWT-excluded, throttler-excluded typed payload surface. |
| `api/platform-report/` | `/api/platform-report/*` | JWT-excluded headless payload surface. |
| `api/type-one-report/` | `/type-one-report` | PMU consolidated report. |
| `api/results-framework-reporting/` | `/api/results-framework-reporting/*` | Cross-cutting reporting flows. |
| `api/result-impact-area-scores/` | `/api/result-impact-area-scores/*` | DAC and impact-area scoring. |
| `api/result-qaed/` | `/api/result-qaed/*` | QA decisions and status transitions. |
| `api/contribution-to-indicators/` | `/contribution-to-indicators/*` | Indicator-level contributions. |
| `api/notification/` | `/api/notification/*` | In-app notifications. |
| `api/user-notification-settings/` | `/api/user-notification-settings/*` | Channel preferences. |
| `api/ai/` | `/api/ai/*` | AI-assisted authoring helpers. |
| `api/ad_users/` | `/api/ad-users/*` | AD lookup. |
| `api/initiative_entity_map/` | `/api/initiatives-entity/*` | Initiative-to-entity mapping. |
| `api/versioning/` | `/api/versioning/*` | Phase and reporting cycle. |
| `api/global-narratives/` | `/api/global-narratives/*` | PMU narrative blocks. |
| `api/global-parameter/` | `/api/global-parameters/*` | Runtime parameters. |
| `api/delete-recover-data/` | `/api/manage-data/*` | Soft-delete recovery. |
| `api/home/` | `/api/home/*` | Landing-page aggregates. |
| `api/m-qap/` | `/api/m-qap/*` | MQAP integration. |
| `clarisa/` | `/clarisa/*` | CLARISA catalog cache and cron sync. |
| `toc/` | `/toc/*` | Theory of Change trees. |
| `elastic/` | internal | Elasticsearch integration. |
| `result-dashboard-bi/` | `/result-dashboard-bi/*` | BI integration. |
| `connection/dynamodb-logs/` | `/logs/*` | Operational logs. |
| `shared/microservices/` | internal | Auth, email, RMQ export, sockets. |

Standard module layout:

```text
<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.service.ts
├── <module>.repository.ts
├── <module>.routes.ts
├── dto/
├── entities/
├── *.spec.ts
└── (optional) handlers/, repository/, sub-modules/
```

## Routing And Middleware

Top-level mounts:

- `/api/*`: `ModulesRoutes`.
- `/v2/api/*`: versioned API through URI versioning plus `apiVersionMiddleware`.
- `/auth/*`: auth routes.
- `/clarisa/*`: CLARISA proxy/cache.
- `/toc/*`: ToC routes.
- `/result-dashboard-bi/*`: BI surface.
- `/logs/*`: DynamoDB logs.
- `/contribution-to-indicators/*`: indicator contributions.
- `/type-one-report`: bound separately with JWT middleware.

JWT enforcement:

- `JwtMiddleware` applies to `/api/(.*)`, `/v2/(.*)`, `/clarisa/(.*)`, `/toc/(.*)`, and `/type-one-report`.
- Exclusions in `app.module.ts`: `/api/platform-report/*`, `/api/bilateral/*`.
- Custom header is `auth: <JWT>`. Never use or document `Authorization: Bearer` for this API.
- Middleware re-signs valid tokens and returns a fresh `auth` header for rolling sessions.
- JWT payload must contain `id` and `email`.

Throttling:

- Global throttler: 60,000 ms / 100 requests.
- Bilateral endpoints opt out through `ThrottlerExcludeBilateralGuard`.
- Use `@SkipThrottle()` only with a documented reason.

Response pipeline:

- Global filter: `HttpExceptionFilter` wraps errors in `{ response, statusCode, message, timestamp, path }` and never exposes stack traces to clients.
- Controller interceptor: `ResponseInterceptor` wraps standard responses. Arrays pass through unchanged for external/headless endpoints.

## Authentication And Authorization

- Authentication uses custom `auth` header verified by `JwtMiddleware`.
- Swagger uses API-key header named `auth`.
- Server-side authorization uses `ValidRoleGuard` plus `@Roles(role, type)`.
- User role is valid when `userRole <= requiredRole`; lower numeric role means more privileged.
- Frontend role gates are UX only. Backend must enforce authorization.
- Prefer `@UserToken()` and `@DecodedUser()` decorators over hand-decoding JWTs.
- Use `@DisabledEndpoint()` and `DisabledEndpointGuard` for configuration-disabled routes.

Never log JWT secrets, tokens, headers, AD credentials, DB credentials, or environment secrets.

## Persistence

MySQL + TypeORM:

- DataSource: `src/config/orm.config.ts`.
- Entities autoload from `src/api/**`, `src/auth/**`, `src/clarisa/**`, `src/toc/**`, and `src/result-dashboard-bi/**`.
- `synchronize: false` and `migrationsRun: false`.
- Schema changes require migrations.

Migration scripts:

- `npm run migration:empty -- --name=<name>`
- `npm run migration:generate -- --name=<name>`
- `npm run migration:run`
- `npm run migration:revert`
- `npm run migration:check`
- `npm run migration:check:ci`

Migration rules:

- Files live in `src/migrations/`.
- One migration per logical schema change.
- Every migration must have a working `down`.
- Do not edit migrations after they land in `master`; write a new migration.

DynamoDB:

- Configured via `src/config/dynamo.config.ts` and Dynamoose.
- Used only by `connection/dynamodb-logs/`.
- Do not model business entities in DynamoDB.

Repository conventions:

- Custom repositories extend TypeORM `Repository<Entity>`.
- Heavy SQL belongs in repositories.
- Services orchestrate, validate, and emit side effects.
- Pagination/filtering/search should use DTO-typed repository methods.

## Controller And DTO Conventions

Controllers:

- Keep controllers light.
- Use route arrays in `RouterModule.register([...])` or `*.routes.ts` when needed.
- Document endpoints with Swagger decorators.
- Validate input with `ValidationPipe({ whitelist: true, transform: true })`.
- Legacy `/api/*` may use `forbidNonWhitelisted: false`; strict `/v2/api/*` may use `true`.
- Use built-in pipes such as `ParseIntPipe` and `DefaultValuePipe` over manual coercion.
- Apply `@UseInterceptors(ResponseInterceptor)` unless deliberately returning raw arrays/objects.

DTOs:

- Live in `<module>/dto/`.
- Use `class-validator` and `class-transformer`.
- Reuse base DTOs from `shared/extendsGlobalDTO/` and `shared/globalInterfaces/`.
- DTOs are excluded from coverage.

Responses:

- Default response envelope: `{ response, statusCode, message, timestamp, path }`.
- Service return shape should generally be `returnFormatService { response, message, status }`.
- Bilateral/platform-report endpoints may return plain arrays/objects per contract.

## Microservices, Schedules, Real-Time

RabbitMQ reporting metadata export:

- Queue configured by `env.REPORTING_METADATA_EXPORT_QUEUE` and `env.RABBITMQ_URL`.
- Bootstrapped in `main.ts` only when configured.
- Consumer: `src/api/results/reporting-metadata-export.consumer.ts`.
- `noAck: false`, ACK only after success.
- `prefetchCount: 1`.
- Queue durable.
- On error, log structured failure without secrets and allow broker redelivery or DLQ behavior.

Schedules:

- `@nestjs/schedule` registered globally.
- CLARISA sync is the primary scheduled task.
- New scheduled tasks must be idempotent.

Real-time:

- Server emits Pusher events and supports WebSocket through `shared/microservices/socket-management/`.
- Client treats real-time events as hints and re-fetches via API.

Email:

- `shared/microservices/email-notification-management/` handles outbound mail.
- Respect `UserNotificationSettings` before dispatch.

## Bilateral And Platform Report

These are tightly contracted external/headless APIs.

- Authority: `docs/bilateral-result-summaries.en.md`.
- Every shape change must update that doc's change log.
- Bilateral is JWT-off and throttler-off; perimeter protection lives outside NestJS.
- Platform-report is JWT-off.
- Payloads discriminate by `type`.
- Identifiers use CLARISA IDs, not PRMS join primary keys.
- Field names use `camelCase` on `data`.
- Changes should be additive unless a `v2` rollout is in scope.
- Payload-fixture tests are required for shape changes.

## Testing

Framework:

- Jest with `ts-jest`.
- Commands: `npm run test`, `npm run test:watch`, `npm run test:cov`, `npm run test:e2e`.
- Unit tests are co-located as `*.spec.ts`.
- E2E tests live under `test/`.

Coverage thresholds:

- branches 5%
- functions 20%
- lines 35%
- statements 40%

These are floors, not targets. New code should aim higher.

Testing priorities:

1. Workflow transitions and review history writes.
2. Bilateral/platform-report payload mappers against fixtures.
3. Repositories with non-trivial SQL.
4. Guards, middleware, interceptors, filters.
5. RMQ consumers and cron tasks.
6. DTO validation.

## Operations And Deployment

Local dev:

```bash
cd onecgiar-pr-server
npm ci
cp .env.example .env
npm run start:dev
```

Do not print or commit environment values. Required variables include DB, JWT, RabbitMQ, AWS, Cognito, AD, CLARISA, MQAP, SharePoint, and related integration settings.

Docker:

- Multi-stage `Dockerfile` based on Node 20 alpine.
- Use production stage for image builds.

Serverless:

- `serverless.yaml` deploys `dist/lambda.handler`.
- `npm run lambda:test` runs offline.
- `npm run lambda:deploy` deploys.
- Avoid heavy dependencies without measuring cold start impact.

CI gates:

- `npm run lint`
- `npm run test`
- build
- `npm run migration:check:ci`
- SonarCloud
- Husky hooks from root package

## Conventions Cheat Sheet

| Topic | Rule |
|---|---|
| Auth header | Custom `auth: <JWT>`, not `Authorization: Bearer` |
| Public route | Justify in spec; prefer middleware `exclude(...)` with perimeter protection |
| DTO validation | `ValidationPipe({ whitelist: true, transform: true })` |
| Response wrapping | Use `ResponseInterceptor` unless deliberately raw |
| Roles | `@Roles(...)` + `ValidRoleGuard` |
| Bilateral/platform-report | Update contract docs and tests; keep changes additive |
| Migration | One per schema change; up and down required |
| Logs | Nest `Logger`; no secrets, tokens, headers, PII |
| Schedules | Idempotent; log start/finish/outcome safely |
| RMQ | `noAck: false`; ACK only on success |
| Coverage | Keep server thresholds or raise them |
| Commit | `<emoji> <type>(<scope>) [ticket]: <description>` |

## SDD Workflow

When working on a server feature or fix:

1. Open `src/AGENTS.md` before editing under `src/`.
2. Confirm the spec under `../docs/specs/<module>/`.
3. If missing, create or request it using `../docs/specs/general-setup/`.
4. Cite relevant `G#`, `US-*`, `AC-*`, workflow IDs `W1..W8`, and module design sections.
5. Implement using routing, JWT, DTO, validation, response-envelope, repository, and migration conventions.
6. Add a migration if entities changed.
7. Test unit, integration, and payload shapes where relevant.
8. Update `docs/bilateral-result-summaries.en.md` for bilateral/platform-report shape changes.
9. Update `../docs/detailed-design/detailed-design.md` for project-level module shape changes.
10. Commit only when explicitly asked.

## Quick Reference Paths

- Source-tree guide: `src/AGENTS.md`
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
