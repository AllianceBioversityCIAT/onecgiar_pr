# PRMS — Infrastructure Blueprint

> **Status:** living document · **Owner:** platform team · **Last updated:** 2026-08-26
>
> This is the environments blueprint for PRMS — from a developer laptop to PROD. It derives from the **TRD tier decision**: `docs/trd/trd.md` §2 → **LITE tier, modular monolith on serverless/container compute** (ADR-001). Infrastructure never precedes that decision; if the tier changes, this document changes with it.

---

## 1. Target Environment

| Layer | Target | Evidence |
|---|---|---|
| Cloud | **AWS** (single primary cloud) | `onecgiar-pr-server/serverless.yaml`, AWS SDK deps (Cognito, S3, DynamoDB) |
| Backend runtime | AWS Lambda behind API Gateway (Serverless Framework) — **or** a Node 20 container (`Dockerfile`) | `serverless.yaml` (`dist/lambda.handler`, `http any /{any+}`), `onecgiar-pr-server/Dockerfile` |
| Frontend runtime | Static Angular SPA served by Nginx container | `onecgiar-pr-client/Dockerfile`, `nginx.conf` |
| Database | MySQL (managed; assumed RDS/Aurora MySQL — **confirm**) | TypeORM `mysql2` driver, `DB_*` env vars |
| CI/CD | GitHub Actions → Jenkins (`automation.prms.cgiar.org`) | `.github/workflows/jenkins-trigger.yml`, `security-scan.yml` |
| Quality gate | SonarCloud | `sonar-project.properties` |

> ⚠️ `serverless.yaml` still declares `runtime: nodejs14.x` while the Dockerfile and README target Node 20. Treat this as **drift to resolve** (see §5 open items) — do not copy the Lambda runtime value into new configs.

---

## 2. Core Cloud Components

| Component | Role | Notes |
|---|---|---|
| **API Gateway + Lambda** (`prtesting` service) | HTTP entry for the NestJS app | Single catch-all function (`main`), `serverless-plugin-optimize` bundling, cold-start sensitive |
| **Nginx container / static hosting** | Serves the Angular build | Routes all paths to `index.html` |
| **MySQL** | System of record (results, ToC alignment, partners, evidence, versioning) | Schema managed **only** by TypeORM migrations |
| **AWS Cognito** | Identity provider (JWT issuance/verification) | Combined with Active Directory (LDAP) for institutional users |
| **AWS S3 / SharePoint** | Evidence & document storage | Via `share-point` module |
| **AWS DynamoDB** | Operational logs (`connection/dynamodb-logs`) | Never business data |
| **RabbitMQ** | Async backbone (reporting metadata export queue) | Broker location per environment — **confirm** (Amazon MQ vs self-hosted) |
| **Pusher / WebSockets** | Real-time updates to the client | External SaaS |
| **CloudWatch** | Lambda logs & metrics | Redacted logs only (`.cursorrules`) |
| **External read-only services** | CLARISA, ToC services, CGSpace, MQAP, Elasticsearch, email microservice | See TRD §7 |

---

## 3. Deployment Strategy

| Stage | Mechanism | Trigger |
|---|---|---|
| Build & test | Jenkins job `prms-reporting-tool-dev` (lint, unit tests, coverage thresholds, `migration:check:ci`, build) | GitHub Actions `jenkins-trigger.yml` on push to the configured branch, or manual dispatch |
| Security | `security-scan.yml` + SonarCloud | Per push / PR |
| Backend deploy | `npm run lambda:deploy` (`sls deploy -v`) **or** `docker build` + push to the container host | Jenkins pipeline (details live in Jenkins, not in this repo — **confirm**) |
| Frontend deploy | `npm run build` → Nginx image / static bucket | Jenkins pipeline |
| DB schema | `npm run migration:run` executed as a deploy step **before** the new app version receives traffic | Never by hand on PROD |

**Environments (as referenced by branches and Jenkins):** `dev` → `staging` (branch `staging`) → `production` (branch `master`). Branch-to-environment mapping is owned by Jenkins; treat `master` as production-tracking.

**IaC status:** the only IaC in-repo is `serverless.yaml`. Network, database, queue, and DNS are provisioned outside this repository (**assumption — confirm**). Adding CDK/Terraform is a candidate ADR, not a default.

---

## 4. Network & Security Architecture

- **Edge:** HTTPS only. API Gateway (Lambda) or Nginx (container) in front of NestJS. Helmet + CORS configured in the Nest bootstrap (TRD §8).
- **Auth perimeter:** every `/api/*`, `/v2/api/*`, `/clarisa/*`, `/toc/*` route passes the JWT middleware using the custom **`auth`** header. Public read surfaces: `/api/platform-report/*`, `/api/bilateral/*` (JWT-excluded; stability governed by the bilateral payload contract doc).
- **Secrets:** environment variables / AWS Secrets Manager / GitHub Secrets. `.env` files are never committed. Nothing secret is ever logged (`.cursorrules`).
- **Data boundaries:** MySQL and RabbitMQ must not be publicly reachable; only the app runtime's security group / VPC access reaches them (**assumption — confirm VPC layout**).
- **Throttling:** Nest `ThrottlerModule` on the API (TRD §8.3).
- **Telemetry:** Hotjar + Microsoft Clarity on the client; mocked in tests.

---

## 5. Infrastructure Rules & Constraints

1. **LITE tier is the default.** No new deployable, broker topology, or database engine without an ADR in `docs/trd/trd.md` §2.
2. **Migrations are the only schema path.** `npm run migration:check:ci` blocks merges with pending migrations.
3. **Deployments are governed, not improvised.** Agents never run `sls deploy`, `docker push`, or any cloud mutation. Cloud changes follow §1–§4 and the Jenkins pipeline.
4. **Node 20.x everywhere.** Docker images, Lambda runtime, and CI must match (`serverless.yaml` currently drifts — fix pending).
5. **Payload stability.** `/api/bilateral/*` and `/api/platform-report/*` are additive-only without a version bump.
6. **No secrets in this document.** Broker URLs, DB hosts, bucket names with credentials, and webhook URLs stay in secret stores.

**Open items to confirm with the platform owner**

- [ ] Managed MySQL flavour (RDS vs Aurora) and backup/PITR policy.
- [ ] RabbitMQ hosting (Amazon MQ vs self-managed) per environment.
- [ ] VPC / security-group layout for Lambda ↔ MySQL ↔ RMQ.
- [ ] Whether the Lambda path or the container path is the **primary** production runtime today.
- [ ] Fix `runtime: nodejs14.x` in `serverless.yaml` to `nodejs20.x`.

---

## 6. Local Environment

The local stack is **disposable**: agents may freely start, seed, and reset it to verify work. It is the opposite of §1–§5, which are governed.

| Element | Value |
|---|---|
| **Primary route (recommended)** | Native Node — two terminals:<br>`cd onecgiar-pr-server && npm run start:dev` (port `PORT`, default 3000)<br>`cd onecgiar-pr-client && npm start` (http://localhost:4200) |
| **Fallback route (containers)** | `cd onecgiar-pr-server && docker build -t prms-server . && docker run --env-file .env -p 3000:3000 prms-server`<br>`cd onecgiar-pr-client && docker build -t prms-client . && docker run -p 8080:80 prms-client`<br>*(there is no `docker-compose` file today — scaffolding one is optional, not required)* |
| **Pre-check** | `node -v` must be 20.x. For the container route: `docker info` — if it fails (daemon off / not installed), surface it and use the primary route; never block silently. |
| **Database** | A dev MySQL reachable via `DB_HOST/DB_PORT/DB_NAME/DB_USER_NAME/DB_USER_PASS` in `onecgiar-pr-server/.env` (shared dev instance or local MySQL 8). Never point local at PROD. |
| **Seed / reset data** | `npm run migration:run` applies schema. There is **no committed seed script** — dev data comes from the shared dev database or a sanitized dump (**confirm the team's dump procedure**). |
| **Lambda-shaped local run** | `npm run lambda:test` (serverless offline) when a change touches the Lambda handler or bundling. |
| **Health check** | Backend: `GET http://localhost:3000/api` opens Swagger (200 = up). Frontend: http://localhost:4200 renders the login page. |
| **URLs / ports** | Backend `3000` (Swagger at `/api`) · Frontend `4200` · Nginx image `8080` · MySQL `3306` (per env) |
| **Env templates** | Backend `.env` keys listed in `README.md` → *Environment*; includes `CGSPACE_DISCOVERY_URL` (required, no in-code fallback; recommended value `https://cgspace.cgiar.org/server/api`); client config in `onecgiar-pr-client/src/environments/environment.ts`; Cypress env example at `onecgiar-pr-client/cypress.env.js.example`. |

**Agent-lean verification commands** (failure-only output; failures still print complete and verbatim):

| Package | Tests | Lint |
|---|---|---|
| `onecgiar-pr-server` | `npx jest --silent --reporters=summary --forceExit` (or `npm test -- --silent`) | `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet` (note: `npm run lint` auto-fixes) |
| `onecgiar-pr-client` | `npx jest --silent --reporters=summary --no-coverage` | `npx ng lint --quiet` |
| Migrations | `npm run migration:check` (server) | — |

**Boundary rule:** local = disposable (start/seed/reset freely). Cloud/PROD = governed (§1–§5, Jenkins, never improvised by agents).

---

## Related documents

- `docs/trd/trd.md` §2 (tier decision, ADRs) · §7 (integrations) · §8 (security) · §9 (observability).
- `README.md` → *Quick start*, *Build, test, deploy*.
- `.cursorrules` — secrets rule.
