# PRMS — Detailed Design (Technical Blueprint)

> **Status:** Living document. Authoritative technical blueprint for PRMS. Module-level technical specs live under `docs/specs/<module>/design.md`.
>
> Companion docs: `docs/prd.md` (product), `docs/system-design/design.md` (UX).

This document captures **how PRMS is built and operated** — modules, data, APIs, workflows, security, testing, and constraints. It is grounded in the current code under `onecgiar-pr-server/src/` and `onecgiar-pr-client/src/`.

---

## 1. System Overview

PRMS is a TypeScript-based monorepo with two top-level apps:

| Path | Stack | Deploy target |
|---|---|---|
| `onecgiar-pr-server/` | NestJS 11, TypeORM 0.3, MySQL, AWS Cognito, RabbitMQ, DynamoDB | AWS Lambda + API Gateway (Serverless Framework) — also containerizable (Dockerfile, Node 20). |
| `onecgiar-pr-client/` | Angular 19, PrimeNG 19, Jest, Cypress, ngx-socket-io, chart.js | Static SPA fronted by Nginx (`nginx.conf` + Dockerfile). |

External systems PRMS integrates with:

- **CLARISA** — read-only catalog source (institutions, centers, initiatives, ToC phases, indicators, geography, etc.).
- **Theory of Change services** — ToC trees and outcomes (`src/toc` module).
- **AWS Cognito + Active Directory (LDAP)** — identity and authentication (`auth-cognito` client; AD users + `ldapts` server).
- **CGSpace** — handle source for knowledge products.
- **Pusher** + WebSocket sockets — real-time client updates.
- **AWS DynamoDB** — operational logs.
- **AWS S3 / SharePoint** — evidence and document storage (via `share-point` module).
- **Email microservice** — outbound transactional email (via `email-notification-management`).
- **RabbitMQ** — async messaging for reporting metadata export.

### High-level diagram (textual)

```
Browser (Angular 19 SPA)
   │
   │ HTTPS, custom `auth` header (JWT)
   ▼
API Gateway / Nginx
   │
   ▼
NestJS app (Lambda or container)
   ├── /api/*        → JWT middleware → domain modules
   ├── /v2/api/*     → JWT middleware → versioned domain modules
   ├── /clarisa/*    → JWT middleware → CLARISA proxy/sync
   ├── /toc/*        → JWT middleware → ToC modules
   ├── /api/platform-report/*   (JWT excluded — public payload surface)
   ├── /api/bilateral/*          (JWT excluded — bilateral consumers)
   └── /auth/*, /logs/*, /result-dashboard-bi/*, /contribution-to-indicators/*
        │
        ├── TypeORM ────► MySQL
        ├── AWS SDK ────► Cognito, S3, DynamoDB (logs), SharePoint
        ├── HTTP   ────► CLARISA, ToC services, CGSpace
        ├── LDAP   ────► AD (ldapts)
        ├── RMQ    ────► reporting-metadata-export consumer
        ├── Sockets/Pusher ──► real-time client
        └── Cron (schedule) ─► CLARISA sync, recurring jobs
```

---

## 2. Domain Modules & Responsibilities

### Server (`onecgiar-pr-server/src/`)

Top-level modules wired in `app.module.ts` and routed in `main.routes.ts` + `api/modules.routes.ts`.

| Module | Path | Responsibility |
|---|---|---|
| **Auth** | `auth/` (+ `auth/modules/user`, `auth/modules/role`) | JWT issue/verify, AD/Cognito flows, role catalog, JwtMiddleware. |
| **Results** | `api/results/` | Result CRUD, all type-specific sub-modules (innovation dev/use, capacity sharing, knowledge product, policy change, evidence, partners, geography, ToC alignment, etc.). Largest module — many sub-folders. |
| **IPSR** | `api/ipsr/` | Innovation package authoring, pathway steps 1–4 (`innovation-pathway`, `result-innovation-package`, `assessed-during-expert-workshop`, etc.). |
| **IPSR Framework** | `api/ipsr-framework/` | Cross-result IPSR framework reporting. |
| **Bilateral** | `api/bilateral/` | Headless typed payload surface for bilateral consumers. JWT-excluded; throttler-excluded. |
| **Platform Report** | `api/platform-report/` | Headless typed payload surface for platform reports. JWT-excluded. |
| **Type-One Report** | `api/type-one-report/` | PMU-level consolidated report (separate middleware bind). |
| **Results Framework Reporting** | `api/results-framework-reporting/` | Cross-cutting reporting workflows (contributors-partners, innovation dev/use, geographic-location). |
| **Result Impact Area Scores** | `api/result-impact-area-scores/` | DAC / impact-area scoring per result. |
| **Result QAed** | `api/result-qaed/` | QA decision data + transitions. |
| **Contribution To Indicators** | `api/contribution-to-indicators/` | Indicator-level contribution mappings (own top-level route). |
| **Notification** | `api/notification/` + `api/user-notification-settings/` | In-app + email notifications respecting user prefs. |
| **AI** | `api/ai/` | AI-assisted authoring helpers. |
| **AD Users** | `api/ad_users/` | AD lookup and management endpoints. |
| **Initiative Entity Map** | `api/initiative_entity_map/` | Map between initiatives and entity rows used in reporting. |
| **Versioning** | `api/versioning/` | Phase / reporting cycle management. |
| **Global Narratives** | `api/global-narratives/` | PMU-curated narrative blocks. |
| **Global Parameter** | `api/global-parameter/` | Tunable runtime parameters (no redeploy). |
| **Delete / Recover Data** | `api/delete-recover-data/` | Soft-delete recovery surface (Admin / Manage data). |
| **Home** | `api/home/` | Landing-page aggregates and progress widgets. |
| **MQAP** | `api/m-qap/` | External MQAP integration (knowledge-product attribute lookup). |
| **CLARISA** | `clarisa/` (many sub-modules) | CLARISA catalog cache + sync (`clarisaCron.service.ts`, `clarisatask.service.ts`). |
| **ToC** | `toc/` (+ `toc-results`, `toc-level`) | Theory of Change tree, outcomes, and result→ToC mappings. |
| **Elastic** | `elastic/` | Elasticsearch integration where applicable. |
| **Result Dashboard BI** | `result-dashboard-bi/` | BI integration surface (top-level route). |
| **DynamoDB Logs** | `connection/dynamodb-logs/` | Operational log storage routed under `/logs`. |
| **Shared / Microservices** | `shared/microservices/` | `auth-microservice`, `email-notification-management`, `reporting-metadata-export-queue`, `socket-management`. |
| **SharePoint** | `shared/services/share-point/` | Document storage integration. |
| **Global Utils** | `shared/utils/global-utils.module.ts` | Cross-module utilities. |

### Client (`onecgiar-pr-client/src/app/`)

Top-level surfaces routed from `app-routing.module.ts` + `shared/routing/routing-data.ts`. Each is its own Angular Module.

| Page module | Path | Backing server module(s) |
|---|---|---|
| `home` | `pages/home` | `api/home` |
| `login`, `auth-cognito` | `pages/login`, `pages/auth-cognito` | `auth/`, AWS Cognito |
| `results` | `pages/results` (result-creator, result-detail, results-outlet) | `api/results/*`, `api/notification`, `api/ai` |
| `quality-assurance` | `pages/quality-assurance` | `api/result-qaed`, review history |
| `ipsr` | `pages/ipsr` | `api/ipsr/*` |
| `type-one-report` | `pages/type-one-report` | `api/type-one-report` |
| `result-framework-reporting` | `pages/result-framework-reporting` | `api/results-framework-reporting/*` |
| `outcome-indicator` | `pages/outcome-indicator` | `api/contribution-to-indicators` |
| `pdf-reports` | `pages/pdf-reports` | `api/platform-report`, `api/results` |
| `admin-section`, `init-admin-section` | `pages/admin-section`, `pages/init-admin-section` | `api/global-parameter`, `api/versioning`, `api/delete-recover-data`, `api/initiative_entity_map`, `api/global-narratives`, `api/ad_users`, `auth/modules/role`, `auth/modules/user`, `clarisa/*` |
| `whats-new` | `pages/whats-new` | local content |

Shared client primitives live in `src/app/shared/`: `services/api/`, `interceptors/`, `interfaces/`, `guards/`, `components/`, `modals/`, `sections-components/`, `pipes/`, `directives/`, `routing/`, `data/`, `enum/`.

---

## 3. Data Model & Entities

### Persistence platform

- **MySQL** via TypeORM (`onecgiar-pr-server/src/config/orm.config.ts`).
- **Migrations** under `onecgiar-pr-server/src/migrations/`; gated by `npm run migration:check` (`scripts/check-pending-migrations.ts`) — CI rejects PRs with pending migrations.
- **DynamoDB** for operational logs (`connection/dynamodb-logs/`, `dynamoose`).
- **No NoSQL document store** for primary entities — DynamoDB is logs-only.

### Core entity families

Detailed entity definitions live with each module. The high-level shape:

#### Identity & access

- `User`, `Role`, `RoleByUser` (or equivalent join), AD user mirror in `api/ad_users/`.
- JWT carries user id, role(s), and is verified by `JwtMiddleware` / `JwtStrategy`.

#### Result core

- `Result` (with `result_code`, `result_type_id`, `result_level_id`, `version_id`/phase, `status_id`, `is_active`, audit columns).
- `ResultStatus`, `ResultLevel`, `ResultType`.
- `ResultReviewHistory` — workflow audit trail.
- `ResultDeletionAudit` — soft-delete trail.
- `Submission` rows — captured under `api/results/submissions` family.

#### Result associations (selected)

- `ResultsCenters`, `ResultByInstitutions`, `ResultByInstitutionsByDeliveriesType` — center + partner attribution.
- `ResultsTocResults` — ToC alignment.
- `ResultCountries`, `ResultRegions`, `ResultCountriesSubNational` — geography.
- `ResultsByEvidences`, `EvidenceTypes`, `Evidences` — evidence rows.
- `ResultsByInititiatives` — initiative attribution.
- `ResultBudget`, `Result_*_budget` — investment lines (initiative / bilateral / partner).
- `ResultsImpactAreaIndicators`, `ResultsImpactAreaTarget`, `ImpactAreasScoresComponents`, `GenderTagLevels` — DAC and impact-area cross-cutting scoring.

#### Type-specific

- **Knowledge product:** `results-knowledge-products`, `KnowledgeProductFairBaseline`, MQAP integration.
- **Capacity sharing:** `capdevs-delivery-methods`, `capdevs-terms`, on-behalf institution rows (role 3).
- **Innovation development / use:** `results-innovation-packages-*`, `result-actors`, `results-by-ip-innovation-use-measures`, linked-results, scaling studies.
- **Innovation package (IPSR):** `result-innovation-package`, `results-package-by-initiatives`, `results-package-centers`, `results-package-toc-result`, `result-innovation-package-countries/regions`, `result-ip-measures`, `share-result-innovation-package-request`.
- **Policy change:** policy-stage and policy-type joins (CLARISA-driven), `result-questions`, `result-answers` for the "Is this result related to" engine, `legacy-result`.

#### Phase / versioning

- `Versioning` entities — phase id, reporting year, open/closed flags. Most result reads/writes resolve a phase from middleware or query (`?phase=`).

#### CLARISA catalogs (read-mostly, cached)

- One sub-module per CLARISA endpoint (e.g., `clarisa-institutions`, `clarisa-initiatives`, `clarisa-countries`, `clarisa-regions`, `clarisa-policy-types`, `clarisa-innovation-readiness-levels`, etc.) with its own entity + repository, refreshed by `clarisaCron.service.ts`.

#### Notifications & settings

- `Notification`, `UserNotificationSettings`, email-notification-management messages.

### Data-model invariants

- Soft-delete via `is_active=false` or per-table delete-audit row. Hard delete is admin-only and audited.
- `created_date` / `last_updated_date` audit columns on most entities.
- CLARISA-facing ids in bilateral / platform-report payloads must use the **Clarisa id**, not the PRMS join PK (see AC-1).

---

## 4. API Surface & Contracts

### Routing layout

From `main.routes.ts`:

| Mount | Source | Notes |
|---|---|---|
| `/api/*` | `api/modules.routes.ts` (`ModulesRoutes`) | Main authenticated API. |
| `/v2/api/*` | Versioning middleware `apiVersionMiddleware` | Forward-compatible API version. |
| `/auth/*` | `AuthModulesRoutes` | Login, refresh, user/role management. |
| `/clarisa/*` | `ClarisaRoutes` | CLARISA proxy and cache. |
| `/toc/*` | `TocRoutes` | ToC trees. |
| `/result-dashboard-bi/*` | `ResultDashboardBIRoutes` | BI surface. |
| `/logs/*` | `dynamoRoutes` | DynamoDB logs. |
| `/contribution-to-indicators/*` | `ContributionToIndicatorRoutes` | Indicator contributions. |
| `/type-one-report` | `TypeOneReportModule` | Bound with JWT middleware separately. |
| `/api/bilateral/*` | `BilateralModule` | **JWT-excluded** and **throttler-excluded** (`ThrottlerExcludeBilateralGuard`). |
| `/api/platform-report/*` | `PlatformReportModule` | **JWT-excluded**. |

### Conventions

- **Auth header:** Custom `auth: <JWT>` header. NOT `Authorization: Bearer`. Frontend interceptor at `shared/interceptors/general-interceptor.service.ts` attaches it automatically; exclude path is Elasticsearch.
- **Base URLs on the client:** `apiBaseUrl`, `apiBaseUrlV2`, `baseApiBaseUrl`, `baseApiBaseUrlV2` — defined in `environments/`. Use the right one per endpoint version.
- **Method naming on the client:** `HTTP_METHOD_descriptiveName` (e.g., `GET_allRequest`, `PATCH_readNotification`) in `shared/services/api/results-api.service.ts`.
- **DTOs and validation:** `class-validator` + `class-transformer` on every controller input. Reject extra properties at the validation pipe.
- **Swagger:** `@nestjs/swagger` is installed; documented endpoints SHOULD carry `@ApiTags` / `@ApiOperation` and DTO schemas.
- **Versioning posture:** New features land in `/v2/` once contracts diverge. Legacy `/api/` is maintained until parity (OQ-4 in `docs/prd.md`).

### Bilateral / platform-report payload contract

**Authoritative reference:** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`. Every bilateral response shape MUST follow that doc; changes go through the change log there.

Headline rules:

- Discriminated by `type` (`knowledge_product`, `capacity_sharing`, `innovation_development`, `innovation_use`, `innovation_package`, `policy_change`).
- Identifiers are **CLARISA ids**, not PRMS join PKs.
- Field names are `camelCase` on `data`; type-specific summaries hang off `data.<type>_summary`.

### Error contract

- All errors flow through `HttpExceptionFilter` (`shared/handlers/error.exception.ts`).
- Responses MUST include a deterministic shape: `statusCode`, `message`, optionally `error`. Internal stack traces NEVER leak.
- Secrets, tokens, and URLs with credentials MUST NOT appear in error messages, logs, or stack traces (`.cursorrules`).

---

## 5. Backend Workflows & Business Rules

### W1. Result lifecycle (Editing → QA → Submitted)

- Created in `status_id=1` (Editing).
- Pre-submit validation runs on the server before the transition: required common fields per `AC-6` (`docs/prd.md`), type-specific required fields per module spec.
- Submit transitions to `status_id=2` (Quality Assessed) or directly to QA queue depending on the configured cycle. QA reviewer transitions to `status_id=3` (Submitted) or back to `1` with comments.
- Every transition writes `result-review-history` and may emit notifications via `NotificationModule`.

### W2. Phase rollover (Versioning)

- New phase opens with the `versioning` module — prior-phase data is snapshotted and marked closed.
- Cross-phase admin endpoints are explicitly opt-in; default read/write is **active phase only**.

### W3. CLARISA sync

- Scheduled by `@nestjs/schedule` via `clarisaCron.service.ts`.
- Each CLARISA sub-module (`clarisa-institutions`, `clarisa-initiatives`, …) handles its own endpoint and cache table.
- Sync MUST be idempotent: re-runs leave the cache identical.
- Manual re-sync is available to platform admins from the admin module.

### W4. Notifications

- In-app socket + Pusher event AND email via `email-notification-management` microservice.
- Respect `UserNotificationSettings` per user/channel/type.
- Email content is templated via `handlebars` server-side.

### W5. Reporting metadata export (RMQ)

- `reporting-metadata-export.consumer.ts` consumes RMQ messages produced by upstream processes.
- Consumer MUST ACK only after successful processing; errors MUST be logged and re-queueable (DLQ pattern).

### W6. Bilateral / platform-report enrichment

- Bilateral list/detail builds an enriched `data` document from the result + type-specific service + CLARISA-faced ids. Logic centralized in `bilateral.service.ts` (`enrichBilateralResultResponse`).
- Platform-report assembles per-phase payloads using `platform-report-payloads.ts` and `platform-report.constants.ts`.
- Both surfaces are JWT-excluded — protect by IP allowlist, signed tokens, or other layer as appropriate **at the perimeter**.

### W7. Soft-delete & recovery

- Delete writes `is_active=false` + audit row (`result-deletion-audit` where applicable).
- Recovery via `api/delete-recover-data` re-flips `is_active=true` and writes a recovery audit.
- Hard-delete is admin-only and uncommon; document each occurrence in the audit trail.

### W8. AI helpers

- `api/ai` exposes assistive endpoints (summarization, suggestion). All AI requests MUST be:
  - Auth-gated (JWT middleware).
  - Audit-logged so PMU can attribute outputs.
  - Stripped of secrets/PII before being sent to any third-party model.

---

## 6. Frontend Architecture & State Boundaries

### Project structure

```
onecgiar-pr-client/src/app/
├── app.module.ts, app-routing.module.ts, app.component.*
├── pages/<feature>/<feature>.module.ts + <feature>-routing.module.ts
├── shared/
│   ├── services/api/        # API services (HTTP_METHOD_descriptiveName)
│   ├── services/             # Auth, state helpers, util services
│   ├── interceptors/         # general-interceptor (auth header)
│   ├── interfaces/           # API response types
│   ├── guards/               # Route guards (login, role)
│   ├── components/           # Reusable UI components
│   ├── modals/               # Recurring dialogs
│   ├── sections-components/  # Form sections (geography, partners, evidence, ...)
│   ├── pipes/, directives/
│   ├── routing/, data/, enum/
│   ├── icon-components/      # Custom SVG icons
│   └── constants/
├── internationalization/     # i18n strings
├── sockets/                  # ngx-socket-io / Pusher integration
├── theme/reportingTheme.ts   # PrimeNG theme (mirrors src/styles/colors.scss)
└── custom-fields/            # Bespoke field components
```

### Routing

- Top-level `routes = [...extraRoutingApp, ...routingApp]` (in `shared/routing/routing-data.ts`).
- Feature modules lazy-load via their own routing module.
- Guards under `shared/guards/` enforce auth and role-based access.

### HTTP & state

- All HTTP goes through `shared/services/api/results-api.service.ts` (and feature-specific services). The interceptor at `shared/interceptors/general-interceptor.service.ts` attaches the `auth` header — except for Elasticsearch and known external endpoints.
- State is held in **services with `signals` / `BehaviorSubject`** rather than a global store (no NgRx in the project).
- Phase context is shell-level and propagated via query params on links / navigation.

### Real-time

- WebSocket via `ngx-socket-io`, plus `pusher-js`.
- Events: notifications (new review, QA assignment), submission updates, lock/unlock signals.

### Tooling

- **Build:** `ng build` (Angular 19 CLI) → static assets served by Nginx (`nginx.conf` + Dockerfile).
- **Unit tests:** Jest (`jest-preset-angular`). Coverage thresholds in `package.json` (60/60/60/50 for lines/functions/statements/branches).
- **E2E:** Cypress (`cypress.config.js`, `cypress.env.js.example`).
- **Analytics:** Hotjar + Microsoft Clarity (mocked in tests via `tests/mocks/clarityMock.ts`).
- **Charts:** chart.js + chartjs-plugin-datalabels; PDF view via `pdfjs-dist`.
- **Excel/CSV:** `exceljs`, `file-saver`.

### Frontend rules

- Hard coded English strings are anti-pattern — use `internationalization/`.
- New API methods follow `HTTP_METHOD_descriptiveName`.
- Use PrimeNG components and the `reportingTheme` preset; don't introduce a competing UI lib.
- Shared section components are preferred over per-feature re-implementation.

---

## 7. Integration Points

| External | Direction | How | Notes |
|---|---|---|---|
| **CLARISA** | PRMS reads | HTTP (`clarisa.connection.ts`), cron sync, on-demand sync. | Source of truth for catalogs; never write back. |
| **Theory of Change services** | PRMS reads | `toc/` module, HTTP. | ToC tree, outcomes; PRMS attaches results to ToC, never authors ToC. |
| **AWS Cognito** | PRMS reads (auth) | `@aws-sdk/client-cognito-identity-provider`, `auth-cognito` client module. | JWT issued + verified server-side. |
| **Active Directory (LDAP)** | PRMS reads | `ldapts`, `activedirectory`. | AD users module; identity provisioning is upstream. |
| **CGSpace** | PRMS reads | HTTP (knowledge product handles). | Source of `handle` on `knowledge_product_summary`. |
| **MQAP** | PRMS reads | HTTP, `api/m-qap`. | Knowledge-product attribute lookup. |
| **AWS S3 / SharePoint** | PRMS reads/writes | AWS SDK, `share-point` module. | Evidence files and PRMS documents. |
| **AWS DynamoDB** | PRMS writes | `dynamoose`, `connection/dynamodb-logs/`. | Operational logs only. |
| **RabbitMQ** | PRMS produces & consumes | `amqplib`, `amqp-connection-manager`, `reporting-metadata-export-queue`. | Async pipelines. |
| **Pusher + WebSockets** | PRMS publishes | `pusher` server SDK; `ngx-socket-io` + `pusher-js` client. | Real-time events. |
| **Email service** | PRMS sends | `email-notification-management` microservice. | Transactional email; templated with `handlebars`. |
| **Elasticsearch** | PRMS reads | `elastic/` module. | Where applicable; the client interceptor excludes the `auth` header for ES paths. |
| **Hotjar + Clarity** | Client telemetry | `@hotjar/browser`, `@microsoft/clarity`. | Mocked in tests. |
| **Bilateral consumers** | PRMS publishes (read API) | `/api/bilateral/*` HTTP, JWT-excluded. | Stability per the bilateral summaries doc. |
| **Platform-report consumers** | PRMS publishes (read API) | `/api/platform-report/*` HTTP, JWT-excluded. | Stability per change log entries. |

---

## 8. Security & Authorization Model

### Authentication

- **JWT** in a custom `auth` header (NOT `Authorization: Bearer`).
- Issued by `auth/` module (Cognito + AD integration), verified by `JwtMiddleware` (`auth/Middlewares/jwt.middleware.ts`) and `JwtStrategy` (`passport-jwt`).
- Middleware is applied to `/api/*`, `/v2/*`, `/clarisa/*`, `/toc/*`, and `/type-one-report` per `app.module.ts`. Exclusions: `/api/platform-report/*`, `/api/bilateral/*`.

### Authorization

- **Roles** managed via `auth/modules/role`. Authorization SHOULD be enforced at the controller layer via guards in `shared/guards/`.
- Frontend role gates are UX only — backend MUST enforce (AC-3).
- Admin endpoints (`global-parameter`, `versioning`, `delete-recover-data`, `ad_users`, `role`, `clarisa`) MUST require an admin role.

### Throttling

- Global throttler from `@nestjs/throttler`: 60 000 ms TTL, 100 requests.
- `ThrottlerExcludeBilateralGuard` exempts bilateral endpoints to avoid blocking high-volume consumers.

### Headers & web security

- `helmet` enabled in `main.ts`.
- CORS allowed origins are environment-driven; never `*` in non-dev environments.

### Secret handling

- Tokens, webhook URLs, API keys, passwords, AD/Cognito creds, DB creds: NEVER printed/logged/echoed anywhere (`.cursorrules`). Applies to controllers, services, scripts, CI workflows, and docs.
- Secrets live in environment variables, AWS Secrets Manager, or GitHub Secrets.
- The `.env` files are excluded from version control (`.gitignore`).

### Bilateral / platform-report perimeter

- JWT is OFF, so protection MUST come from network perimeter (IP allowlist, API gateway auth, or signed query params) layered on top. Document the layer used per environment in operational runbooks (not in this repo).

---

## 9. Error Handling & Observability

### Server

- **Global filter:** `HttpExceptionFilter` (`shared/handlers/error.exception.ts`) standardizes error responses.
- **Validation pipe:** `class-validator` rejects bad input with deterministic error shape (controllers MUST use DTOs).
- **Logging:**
  - Nest's logger for request-scoped events.
  - DynamoDB logs for cross-cutting operational events (`/logs/*`, `connection/dynamodb-logs`).
  - Lambda CloudWatch logs for the serverless deploy.
- **Background jobs:** RMQ consumers and cron tasks MUST log start/finish + outcome and ACK only on success.
- **Sensitive data redaction:** No tokens, no full webhook URLs, no PII in logs. Use generic messages.

### Client

- HTTP errors are surfaced via PrimeNG `Toast`/`Message` and modal dialogs; raw stack traces never reach the user.
- Hotjar + Clarity capture session telemetry (mocked in tests).
- Sentry / equivalent crash reporting is NOT currently wired — track in `docs/specs/<observability>/` if/when added.

### Health & readiness

- Lambda warmup and AWS health checks per the API Gateway config.
- A `/health` style endpoint (or equivalent) SHOULD exist; if it doesn't yet, the module spec that adds it MUST document liveness/readiness semantics.

---

## 10. Testing Strategy

### Server (`onecgiar-pr-server/`)

- **Framework:** Jest (`jest --forceExit`).
- **Layout:** `*.spec.ts` co-located with the code; e2e tests under `test/` (`jest-e2e.json`).
- **Coverage thresholds** (enforced):
  - branches: 5%
  - functions: 20%
  - lines: 35%
  - statements: 40%
  Coverage thresholds skew low because the codebase is incrementally adopting tests. **New code SHOULD ship with higher coverage**; specs MAY require module-level targets.
- **What to test:**
  - Services and repositories (business rules, mappers).
  - DTO validation.
  - Guards, middleware, interceptors.
  - RMQ consumers (`reporting-metadata-export.consumer.ts` etc.).
  - Workflow transitions (status, soft delete, phase boundaries).
- **What NOT to mock away:** entity-to-payload mappers in bilateral / platform-report — test the actual shape (AC-4).

### Client (`onecgiar-pr-client/`)

- **Unit:** Jest + `jest-preset-angular`.
- **Coverage thresholds** (enforced):
  - branches: 50%
  - functions: 60%
  - lines: 60%
  - statements: 60%
- **E2E:** Cypress (`cypress:open` / `cypress:run` / `cypress:run:record`).
- **What to test:**
  - Services in `shared/services/api/` against typed interfaces.
  - Guards and interceptors.
  - Form validation and required-field behavior on Result Detail sections.
  - Component logic via `@testing-library`-style patterns where possible.
- **Mocks:** Clarity is mocked via `tests/mocks/clarityMock.ts`. Add a similar pattern for any new third-party telemetry.

### CI gates

- `migration:check:ci` (server) blocks merges with pending migrations.
- `lint`, `test`, coverage thresholds, and build steps run per branch.
- SonarCloud per `sonar-project.properties`.

---

## 11. Technical Constraints & Assumptions

### Constraints

- **Runtime:**
  - Server: Node 20.x (Docker), Lambda runtime in serverless.
  - Client: Angular 19.x, Node 20 build host.
- **Database:** MySQL via TypeORM 0.3 (migrations are first-class; do not edit production schema by hand).
- **Lambda:** Bundle size, cold start, and `serverless-plugin-optimize` constraints apply.
- **Auth header:** Custom `auth` header is non-negotiable for compatibility with existing clients and reverse proxies.
- **Module-per-feature:** Don't introduce flat folder dumps; align new features to the existing Module → Routes pattern.
- **Bilateral / platform-report payload stability:** Additive changes only without a version bump (AC-4).
- **CLARISA dependency:** PRMS cannot operate offline from CLARISA for catalog reads; caches mitigate but don't replace.
- **Security:** No secrets in code, logs, or commits (`.cursorrules`).
- **Commit convention:** `<emoji> <type>(<scope>) [ticket]: <description>` (see root `CLAUDE.md`).

### Assumptions

- The CGIAR portfolio taxonomy (Initiatives → Centers → Partners; ToC outcomes; phase-bound cycles) remains stable.
- AWS remains the primary cloud (Cognito, Lambda, DynamoDB, S3).
- CLARISA and ToC services remain available as REST/HTTP integrations.
- AD / Cognito provisioning continues to be upstream-owned.
- RMQ continues to be the async backbone (no migration to SQS/SNS planned).
- Angular 19 + PrimeNG 19 remain the client baseline at least through the next phase cycle.

### Pending technical decisions

- Sunset path for legacy `api/` once `v2/` reaches parity (OQ-4 in `docs/prd.md`).
- First-class observability (Sentry / OTel / structured logs) — not yet adopted system-wide.
- Formal client-side state library — current pattern is service+signals; consider NgRx / NgRx SignalStore only if cross-feature shared state grows beyond manageable.
- Dark mode (deferred — see `docs/system-design/design.md` §11).

---

## Related documents

- `docs/prd.md` — Product requirements driving this design.
- `docs/system-design/design.md` — UX system blueprint.
- `docs/specs/general-setup/design.md` — Template that module-level `design.md` files MUST follow.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — Authoritative payload contract for bilateral.
- `onecgiar-pr-client/CLAUDE.md` — Frontend API conventions and commit format.
- `.cursorrules` — Security rule (no secrets in logs).
