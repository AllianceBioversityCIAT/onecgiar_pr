# CLAUDE.md — `onecgiar-pr-server` (NestJS backend)

This is the **package-level guide** for the PRMS backend. It complements the root [`../CLAUDE.md`](../CLAUDE.md) and the SDD constitutional baseline under [`../docs/`](../docs/).

> **Always read the root guide first.** Module-level work MUST follow the SDD methodology:
>
> - [`../docs/prd.md`](../docs/prd.md) — product baseline (personas, goals, acceptance criteria `AC-1..AC-9`).
> - [`../docs/system-design/design.md`](../docs/system-design/design.md) — UX system (informs payload labels, validation messages, notification copy).
> - [`../docs/detailed-design/detailed-design.md`](../docs/detailed-design/detailed-design.md) — technical blueprint this guide operationalizes.
> - [`../docs/specs/general-setup/`](../docs/specs/general-setup/) — templates `/sdd-specify` MUST follow.
> - [`docs/bilateral-result-summaries.en.md`](./docs/bilateral-result-summaries.en.md) — authoritative payload contract for `/api/bilateral/*`.
>
> **Source-tree navigation lives in [`src/CLAUDE.md`](./src/CLAUDE.md).** This file covers package-level concerns (runtime, deployment, conventions); `src/CLAUDE.md` is the in-tree guide with folder-by-folder navigation, base classes, naming gotchas, and patterns to follow inside the codebase.

---

## 1. What this package is

NestJS 11 application that powers PRMS. Runs as:

- **Lambda + API Gateway** (Serverless Framework, `serverless.yaml`) for production.
- **Docker container** (Node 20, `Dockerfile`, multi-stage build).
- **Local dev** (`npm run start:dev`) on the port from `env.PORT` (default `3000`).

Bootstraps in `src/main.ts`:

- `cors: true`, `helmet` with explicit CSP for Google Fonts and inline scripts/styles, `json/urlencoded` with 50 MB limit.
- Swagger at `/api` (security scheme: API key `auth` header — NOT `Authorization: Bearer`).
- Optional RabbitMQ microservice (`reporting-metadata-export-queue`) attaches only if `isReportingMetadataExportQueueConfigured()` returns true.
- URI-based versioning enabled (`VersioningType.URI`).

---

## 2. Module map (where everything lives)

Wired in `src/app.module.ts`; routed in `src/main.routes.ts` + `src/api/modules.routes.ts`.

| Path | Surface | Responsibility |
|---|---|---|
| `auth/` (+ `auth/modules/user`, `auth/modules/role`, `auth/modules/role-by-user`) | `/auth/*` | JWT issue/verify, AD/Cognito flows, roles. Provides `JwtMiddleware` and `JwtStrategy`. |
| `api/results/` | `/api/results/*` | The largest module: typed result CRUD + dozens of result-association sub-modules (evidences, partners, countries/regions, ToC links, budgets, type-specific blocks). |
| `api/ipsr/` | `/api/ipsr/*` | Innovation Package authoring (pathway steps 1–4). |
| `api/ipsr-framework/` | `/api/ipsr-framework/*` | Cross-result IPSR framework reporting. |
| `api/bilateral/` | `/api/bilateral/*` | **JWT-excluded, throttler-excluded** typed payload surface. Contract lives in [`docs/bilateral-result-summaries.en.md`](./docs/bilateral-result-summaries.en.md). |
| `api/platform-report/` | `/api/platform-report/*` | **JWT-excluded** headless payload surface for platform reports. |
| `api/type-one-report/` | `/type-one-report` | PMU consolidated report (bound separately in `app.module.ts`). |
| `api/results-framework-reporting/` (+ `contributors-partners`, `innovation_dev`, `innovation-use`, `geographic-location`) | `/api/results-framework-reporting/*` + sub-routes | Cross-cutting reporting flows. |
| `api/result-impact-area-scores/` | `/api/result-impact-area-scores/*` | DAC / impact-area scoring. |
| `api/result-qaed/` | `/api/result-qaed/*` | QA decisions and transitions (status_id 1 ↔ 2 ↔ 3). |
| `api/contribution-to-indicators/` | `/contribution-to-indicators/*` (top-level, not under `/api/`) | Indicator-level contributions. |
| `api/notification/` + `api/user-notification-settings/` | `/api/notification/*`, `/api/user-notification-settings/*` | In-app + email notifications respecting user prefs. |
| `api/ai/` | `/api/ai/*` | AI-assisted authoring helpers. |
| `api/ad_users/` | `/api/ad-users/*` | AD lookup. |
| `api/initiative_entity_map/` | `/api/initiatives-entity/*` | Initiative ↔ entity mapping. |
| `api/versioning/` | `/api/versioning/*` | Phase / reporting cycle. |
| `api/global-narratives/` | `/api/global-narratives/*` | PMU-curated narrative blocks. |
| `api/global-parameter/` | `/api/global-parameters/*` | Tunable runtime parameters. |
| `api/delete-recover-data/` | `/api/manage-data/*` | Soft-delete recovery surface. |
| `api/home/` | `/api/home/*` | Landing-page aggregates. |
| `api/m-qap/` | `/api/m-qap/*` | MQAP integration (knowledge-product attributes). |
| `clarisa/` (many sub-modules) | `/clarisa/*` | CLARISA catalog cache + cron sync (`clarisaCron.service.ts`, `clarisatask.service.ts`). |
| `toc/` (+ `toc-results`, `toc-level`) | `/toc/*` | Theory of Change trees and result→ToC mappings. |
| `elastic/` | (internal) | Elasticsearch integration. |
| `result-dashboard-bi/` | `/result-dashboard-bi/*` | BI integration surface. |
| `connection/dynamodb-logs/` | `/logs/*` | Operational log storage (Dynamoose). |
| `shared/microservices/` | (internal) | `auth-microservice`, `email-notification-management`, `reporting-metadata-export-queue`, `socket-management`. |
| `shared/services/share-point/` | (internal) | Document storage integration. |
| `shared/utils/global-utils.module.ts` | (internal) | Cross-module utilities. |

### Standard module layout

Every domain folder is the **NestJS trio** plus repositories/entities/dtos:

```
<module>/
├── <module>.module.ts          # @Module: imports, controllers, providers
├── <module>.controller.ts      # Routes + DTOs + Swagger decorators
├── <module>.service.ts         # Business logic
├── <module>.repository.ts      # TypeORM repository (custom queries)
├── <module>.routes.ts          # Optional: nested route definitions
├── dto/                        # Input DTOs (class-validator)
├── entities/                   # TypeORM entities
├── *.spec.ts                   # Co-located Jest tests
└── (optional) handlers/, repository/, sub-modules/...
```

The `api/results/` and `api/clarisa/` folders break this pattern in scale only: they nest dozens of related sub-modules using the same shape.

---

## 3. Routing & middleware pipeline

### Top-level mounts (`src/main.routes.ts`)

| Mount | Notes |
|---|---|
| `/api/*` | `ModulesRoutes` (most application traffic). |
| `/v2/api/*` | Versioned API; `apiVersionMiddleware` reads `?version=`. |
| `/auth/*` | `AuthModulesRoutes`. |
| `/clarisa/*` | CLARISA proxy and cache. |
| `/toc/*` | ToC trees. |
| `/result-dashboard-bi/*` | BI surface. |
| `/logs/*` | DynamoDB logs. |
| `/contribution-to-indicators/*` | Indicator contributions. |
| `/type-one-report` | Bound with JWT middleware separately in `app.module.ts`. |

### JWT enforcement

`JwtMiddleware` (`src/auth/Middlewares/jwt.middleware.ts`) is applied to:

- `/api/(.*)`, `/v2/(.*)`, `/clarisa/(.*)`, `/toc/(.*)`, `/type-one-report` (separate bind).

**Exclusions (per `app.module.ts`):**

- `/api/platform-report/*`
- `/api/bilateral/*`

The middleware also has an internal `publicRoutes` allowlist for login bootstrap: `/login/provider`, `/login/custom`, `/validate/code`, `/api/bilateral` — keep that list short and audit any addition.

Token rules:

- Custom header `auth: <JWT>`. **NEVER `Authorization: Bearer ...`** — the middleware rejects `Basic` and treats `Authorization` differently.
- On valid token, the middleware **re-signs and returns a fresh `auth` header on the response** for rolling sessions. Clients pick that up via the interceptor.
- JWT payload MUST contain `id` and `email`; payload is exposed as `req.user` and `res.locals.jwtPayload`.

### Throttling

Global throttler: `60_000ms / 100 req`. Bilateral endpoints opt out via `ThrottlerExcludeBilateralGuard` (registered as `APP_GUARD`). Use `@SkipThrottle()` on a controller only with a documented reason.

### Global filter & interceptor

- **Filter:** `HttpExceptionFilter` (`shared/handlers/error.exception.ts`) — wraps every response in `{ response, statusCode, message, timestamp, path }` and logs status > 300 as warn + error stack.
- **Interceptor:** `ResponseInterceptor` (`shared/Interceptors/Return-data.interceptor.ts`) — applied per-controller via `@UseInterceptors(ResponseInterceptor)`. Arrays pass through unchanged (used by external API endpoints); objects are wrapped with the standard envelope.

### Helmet & CORS

`helmet` is on with a CSP that allows Google Fonts. `cors: true` (open). Tighten per-environment via API Gateway or upstream proxy — do not relax CSP in code without a security review.

---

## 4. Auth & authorization patterns

### Authentication

- Header: `auth: <JWT>` (custom). Verified by `JwtMiddleware`.
- Strategy file: `auth/jwt.strategy.ts` (passport-jwt) — also used for Swagger `addSecurity('Authorization', { type: 'apiKey', name: 'auth', in: 'header' })`.

### Authorization

- Roles modeled in `auth/modules/role` + `auth/modules/role-by-user`.
- Server-side enforcement uses the **`ValidRoleGuard`** (`shared/guards/valid-role.guard.ts`) + **`@Roles(role, type)`** decorator (`shared/decorators/roles.decorator.ts`). The guard reads `role` metadata via `Reflector`, parses the user id from the `auth` header, and asks `RoleByUserRepository.$_isValidRole(userId, type)`. A user is authorized when `role <= data.roles`.
- Frontend role gates are UX only — backend MUST enforce (`AC-3` in `../docs/prd.md`).

Usage example:

```ts
@UseGuards(JwtAuthGuard, ValidRoleGuard)
@Roles(RoleEnum.ADMIN, RoleTypeEnum.APP)
@Post('/admin/action')
adminAction() { ... }
```

### Decoding the user

Prefer the decorators over hand-decoding:

- `@UserToken()` (`shared/decorators/user-token.decorator.ts`) decodes the JWT payload from the `auth` header.
- `@DecodedUser()` reads `req.user` populated by the middleware.

### Disabling endpoints

- `@DisabledEndpoint()` decorator + `DisabledEndpointGuard` (`shared/guards/disabled-endpoint.guard.ts`) shuts a route off via configuration (use for phase-locked flows).

### Secrets

JWT secret comes from `env.JWT_SKEY`. **Never log it**, never include it in error messages, never echo it from a script (`../.cursorrules`).

---

## 5. Persistence

### MySQL + TypeORM

- Single `DataSource` in `src/config/orm.config.ts` (`type: 'mysql'`, connection from env).
- Entities are autoloaded from `src/api/**`, `src/auth/**`, `src/clarisa/**`, `src/toc/**`, `src/result-dashboard-bi/**` (`*.entity.{ts,js}`).
- `synchronize: false` and `migrationsRun: false` — **schema changes only via migrations**.

### Migration scripts (`package.json`)

| Script | Use |
|---|---|
| `npm run migration:empty -- --name=<name>` | Generate an empty migration. |
| `npm run migration:generate -- --name=<name>` | Diff entities → migration. |
| `npm run migration:run` | Apply pending migrations. |
| `npm run migration:revert` | Roll back the last applied migration. |
| `npm run migration:check` | Local guard — fails if entities drift from migrations. |
| `npm run migration:check:ci` | Same check, CI-friendly output (blocks merges). |

Migration files live in `src/migrations/`. Every migration MUST have a working `down`. Migrations are excluded from coverage and from test discovery (see jest config in `package.json`).

### DynamoDB (operational logs only)

- Configured via `src/config/dynamo.config.ts` + Dynamoose.
- Used exclusively by `connection/dynamodb-logs/` and surfaced at `/logs/*`.
- Do NOT model business entities here — DynamoDB is logs-only.

### Repository conventions

- Custom repositories extend TypeORM `Repository<Entity>` (the codebase uses `Repository` injection, not the legacy `@EntityRepository`).
- Heavy SQL belongs in the repository, not the service. The service orchestrates, validates, and emits side effects.
- Pagination, filtering, and search go through repository methods with DTO-typed inputs.

---

## 6. Controller / DTO conventions

### Controllers

- Use route arrays inside `@Module({ imports: RouterModule.register([...]) })` or `*.routes.ts` files; controllers themselves stay light.
- Document every endpoint with `@ApiTags`, `@ApiOperation`, `@ApiQuery`, `@ApiBody`, `@ApiOkResponse`. Swagger surfaces at `/api`.
- Validate input with `class-validator` via `ValidationPipe`:

  ```ts
  @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }))
  body: SomeDto
  ```

  Default to **whitelist + transform**. Use `forbidNonWhitelisted: true` for strict surfaces (`/v2/api/*`); the legacy `/api/*` keeps it `false` for backwards-compatibility — don't tighten without a deprecation plan.

- Wrap responses with `@UseInterceptors(ResponseInterceptor)` unless the route MUST stream raw arrays (the interceptor lets arrays pass through unchanged).
- `ParseIntPipe`, `DefaultValuePipe`, and similar built-ins are preferred over hand-rolled coercion in services.

### DTOs

- Live in `<module>/dto/`.
- Use `class-validator` decorators (`@IsString`, `@IsInt`, `@IsOptional`, `@ValidateNested`, `@Type` from `class-transformer`).
- Reuse base DTOs from `shared/extendsGlobalDTO/` and `shared/globalInterfaces/` (e.g., `TokenDto`).
- DTOs are excluded from coverage (`!**/*.dto.ts`).

### Responses

- Default envelope (from `ResponseInterceptor`): `{ response, statusCode, message, timestamp, path }`.
- Error envelope (from `HttpExceptionFilter`): `{ response, statusCode, message, timestamp, path }` with logged stack — but the stack NEVER reaches the client body.
- **Bilateral / platform-report endpoints return plain arrays/objects** — they bypass the envelope by returning arrays (the interceptor passes them through) or by being explicitly shaped per [`docs/bilateral-result-summaries.en.md`](./docs/bilateral-result-summaries.en.md).

---

## 7. Microservices, schedules, real-time

### RabbitMQ — reporting metadata export

- Server consumes a queue defined by `env.REPORTING_METADATA_EXPORT_QUEUE` on `env.RABBITMQ_URL`.
- Bootstrapped in `main.ts` only when configured (`isReportingMetadataExportQueueConfigured()`).
- Consumer: `src/api/results/reporting-metadata-export.consumer.ts`.
- Rules:
  - `noAck: false` — ACK only after successful processing.
  - `prefetchCount: 1` — one message at a time.
  - `queueOptions.durable: true`.
  - On error: log structured failure (NO secret data) and let the broker re-deliver / DLQ.

### Cron / schedule

- `@nestjs/schedule` registered globally (`ScheduleModule.forRoot()`).
- Primary user: CLARISA (`clarisaCron.service.ts` + `clarisatask.service.ts`).
- New scheduled tasks MUST be idempotent — a re-run leaves state identical.

### Real-time

- Server emits Pusher events via the `pusher` SDK and supports WebSocket sockets through `shared/microservices/socket-management/`.
- Client subscribes via `pusher-js` and `ngx-socket-io`.

### Email

- `shared/microservices/email-notification-management/` orchestrates outbound mail, templating with `handlebars`. Respect `UserNotificationSettings` before dispatch.

---

## 8. Bilateral & platform-report (headless surfaces)

These are the most consumer-visible APIs and the most tightly contracted.

- **Authority:** [`docs/bilateral-result-summaries.en.md`](./docs/bilateral-result-summaries.en.md). Every shape change MUST update the change log there.
- **JWT off, throttler off (bilateral) / throttler on (platform-report):** perimeter protection lives at API Gateway / IP allowlist, NOT in NestJS.
- **Payload rules:**
  - Discriminate by `type` (`knowledge_product`, `capacity_sharing`, `innovation_development`, `innovation_use`, `innovation_package`, `policy_change`).
  - Identifiers in payload use **CLARISA ids**, not PRMS join PKs.
  - Field names are `camelCase` on `data`.
  - Changes are **additive** unless a `v2` rollout is in scope (`AC-4`).
- **Tests are non-negotiable:** payload-fixture tests live next to the controller/service. Update them whenever the shape changes.

---

## 9. Testing

### Framework

Jest with `ts-jest`. `npm run test`, `npm run test:watch`, `npm run test:cov`, `npm run test:e2e` (uses `test/jest-e2e.json`).

### Layout

- Unit tests co-located with the source: `*.spec.ts` (e.g., `bilateral.service.spec.ts`, `clarisatask.service.spec.ts`).
- E2E tests under `test/`.

### Excluded from coverage

`*.spec.ts`, `*.e2e-spec.ts`, `*.module.ts`, `*.dto.ts`, `*.entity.ts`, `*.enum.ts`, `*.constant.ts`, `*.routes.ts`, `*.interface.ts`, `index.ts`, `main.ts`, `migrations/**`, `shared/test/**`.

### Coverage thresholds (enforced)

- branches **5%**, functions **20%**, lines **35%**, statements **40%**.

These are **floors, not targets**. New code should ship with higher coverage. Specs MAY raise the bar per module.

### What to test (priority order)

1. Workflow transitions (`status_id 1→2→3`) and review history writes.
2. Bilateral / platform-report payload mappers against fixtures (do NOT mock the mapper).
3. Repositories with non-trivial SQL (pagination, joins, search).
4. Guards, middleware, interceptors, filters.
5. RMQ consumers and cron tasks (ACK behavior, idempotency).
6. DTO validation (forbid extras where required; reject bad input).

### Mocks & fixtures

- `shared/test/` is the canonical place for shared test helpers and mocks.
- Avoid mocking TypeORM repositories where the SQL is the test target.

---

## 10. Operations & deployment

### Local dev

```bash
cd onecgiar-pr-server
npm ci
cp .env.example .env   # if available; otherwise mirror keys from src/config/orm.config.ts and main.ts
npm run start:dev      # auto-reload
```

Required env vars include (non-exhaustive): `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER_NAME`, `DB_USER_PASS`, `JWT_SKEY`, `JWT_EXPIRES`, plus RabbitMQ, AWS, Cognito, AD, CLARISA, MQAP, SharePoint variables. **NEVER print or commit these.**

### Docker

`Dockerfile` is multi-stage (Node 20 alpine): `base → development | production`. Use the production stage for image builds.

### Serverless (Lambda)

- `serverless.yaml` deploys a single `main` Lambda with `dist/lambda.handler`.
- `npm run lambda:test` runs `sls offline start`.
- `npm run lambda:deploy` deploys with `sls deploy -v`.
- Watch bundle size — `serverless-plugin-optimize` + `serverless-plugin-typescript` are in play; avoid pulling new heavy deps without measuring cold start.

### CI gates

- `npm run lint`, `npm run test`, build, `npm run migration:check:ci`, SonarCloud (`sonar-project.properties` at the repo root).
- Husky hooks (`../package.json` root → `husky` install via `npm run prepare`).

---

## 11. Conventions cheat-sheet

| Topic | Rule |
|---|---|
| **Auth header** | Custom `auth: <JWT>`. NOT `Authorization: Bearer`. |
| **Public route?** | Justify in the spec; either exclude in `app.module.ts` or add to `JwtMiddleware.publicRoutes` (preferred: exclude in module config). |
| **DTO validation** | Always `ValidationPipe({ whitelist: true, transform: true })`. |
| **Controller wrapping** | Apply `@UseInterceptors(ResponseInterceptor)` unless returning a raw array. |
| **Roles** | `@Roles(RoleEnum.X, RoleTypeEnum.Y)` + `ValidRoleGuard`. |
| **Bilateral / platform-report** | Update [`docs/bilateral-result-summaries.en.md`](./docs/bilateral-result-summaries.en.md) and tests; keep changes additive. |
| **Migration** | One per change. Up + Down. `migration:check` must pass. |
| **Logs** | Use Nest `Logger`. No tokens, secrets, full webhook URLs, or PII. |
| **Schedules** | Idempotent. Log start/finish/outcome. |
| **RMQ consumer** | `noAck: false`. ACK only on success. |
| **Coverage** | Server thresholds: 5/20/35/40. Don't lower them. |
| **Commit** | `<emoji> <type>(<scope>) [ticket]: <description>` (see root `CLAUDE.md`). |

---

## 12. SDD workflow (server-side)

When working on a server-side feature or fix:

0. **Open the in-tree map.** [`src/CLAUDE.md`](./src/CLAUDE.md) describes the folder where you're about to work, the base classes you should extend, and the naming conventions you MUST preserve.
1. **Confirm the spec.** Find or open `../docs/specs/<module>/requirements.md`, `design.md`, `task.md`. If missing, run `/sdd-specify` first — module templates live in `../docs/specs/general-setup/`.
2. **Cite the baseline.** Reference the relevant `G#`, `US-*`, `AC-*` ids from `../docs/prd.md`, and the workflow id (`W1..W8`) and module section from `../docs/detailed-design/detailed-design.md`.
3. **Implement.** Follow this guide's conventions (routing, JWT, DTO, validation, response envelope).
4. **Migrate.** Add a migration if you touched entities; verify `migration:check` locally.
5. **Test.** Unit + integration + payload-shape tests where relevant. Keep coverage above the thresholds.
6. **Update docs.**
   - If `/api/bilateral/*` or `/api/platform-report/*` changed: add a change-log row in [`docs/bilateral-result-summaries.en.md`](./docs/bilateral-result-summaries.en.md).
   - If module shape changed at the project level: refresh `../docs/detailed-design/detailed-design.md`.
7. **Commit.** Use the project commit format.
8. **Roll out.** Follow the rollout & verification checklist in the module's `task.md`.

---

## 13. Quick reference paths

- **In-tree navigation guide:** [`src/CLAUDE.md`](./src/CLAUDE.md) — folder-by-folder map, base classes, naming gotchas, anti-patterns. Read this before editing anything under `src/`.
- Bootstrap: [`src/main.ts`](./src/main.ts)
- Root module: [`src/app.module.ts`](./src/app.module.ts)
- Top-level routes: [`src/main.routes.ts`](./src/main.routes.ts)
- API routes: [`src/api/modules.routes.ts`](./src/api/modules.routes.ts)
- ORM datasource: [`src/config/orm.config.ts`](./src/config/orm.config.ts)
- JWT middleware: [`src/auth/Middlewares/jwt.middleware.ts`](./src/auth/Middlewares/jwt.middleware.ts)
- Global filter: [`src/shared/handlers/error.exception.ts`](./src/shared/handlers/error.exception.ts)
- Response interceptor: [`src/shared/Interceptors/Return-data.interceptor.ts`](./src/shared/Interceptors/Return-data.interceptor.ts)
- Role guard: [`src/shared/guards/valid-role.guard.ts`](./src/shared/guards/valid-role.guard.ts)
- Throttler guard: [`src/shared/guards/throttler-exclude-bilateral.guard.ts`](./src/shared/guards/throttler-exclude-bilateral.guard.ts)
- API versioning middleware: [`src/shared/middleware/api-versioning.middleware.ts`](./src/shared/middleware/api-versioning.middleware.ts)
- Bilateral contract: [`docs/bilateral-result-summaries.en.md`](./docs/bilateral-result-summaries.en.md)
- Migration check script: [`scripts/check-pending-migrations.ts`](./scripts/check-pending-migrations.ts)
