# PRMS — Planning, Reporting & Management System

The single web platform where **OneCGIAR Initiatives, Centers, and partners plan, capture, qualify, and submit reportable results** for the CGIAR portfolio, and where PMU / portfolio leads consolidate those results into Type-One Reports, IPSR pathways, bilateral exports, and platform-level narratives.

This monorepo contains both halves of the system:

- **Backend** — `onecgiar-pr-server/` — NestJS 11 + TypeORM + MySQL, deployed to AWS Lambda (Serverless) or Docker.
- **Frontend** — `onecgiar-pr-client/` — Angular 19 + PrimeNG 19, served as a static SPA behind Nginx.

> **Hosted documentation:** [PRMS Wiki on Mintlify](https://mintlify.wiki/AllianceBioversityCIAT/onecgiar_pr/introduction) — browse the project documentation online, including module references and onboarding material.

---

## Table of contents

- [What PRMS does](#what-prms-does)
- [Who uses it](#who-uses-it)
- [Architecture at a glance](#architecture-at-a-glance)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Build, test, deploy](#build-test-deploy)
- [Documentation map](#documentation-map)
- [Conventions](#conventions)
- [Security](#security)
- [External systems](#external-systems)
- [Contributing](#contributing)
- [License](#license)

---

## What PRMS does

PRMS captures **typed results** across the CGIAR portfolio (knowledge product, capacity sharing, innovation development, innovation use, innovation package / IPSR, policy change, others) with shared common fields — identity, ToC alignment, geography, partners, DAC scores, evidence — and drives them through a structured **submission workflow** (Editing → Quality Assessed → Submitted).

Core capabilities:

- **Typed result capture & lifecycle** for all result types, including IPSR pathway steps and policy change.
- **Quality assurance** tooling — review queue, drawer, structured comments, status transitions, review history.
- **Phase / version management** (reporting year + sub-phases) with snapshot-on-rollover semantics.
- **CLARISA integration** as a consumer of master data (centers, initiatives, partners, countries, indicators) with scheduled syncs.
- **Theory of Change alignment** — attach results to ToC outcomes sourced from external ToC services.
- **Bilateral and platform-report payload surfaces** for downstream consumers, with stable typed shapes per result type.
- **Admin tooling** — roles, AD users, global parameters, phases, delete/recover, narratives, initiative-entity maps.
- **Real-time** notifications and updates via Pusher + WebSockets, plus transactional email.
- **AI helpers** for assisted authoring.

For the full product picture — problem statement, goals, success metrics, scope, acceptance criteria — see [`docs/prd.md`](./docs/prd.md).

---

## Who uses it

| Persona | What they do in PRMS |
|---|---|
| **Result submitter** (Initiative / Center staff) | Create typed results, attach evidence, align ToC, mark partners and geography, fix QA feedback. |
| **Quality Assurance reviewer** | Review submissions, comment by field, advance or send back. |
| **PMU / portfolio lead** | Run Type-One Reports, oversee IPSR pathways, edit global narratives, monitor submission progress per phase. |
| **Platform admin** | Manage roles, AD users, CLARISA syncs, phases / versioning, delete-and-recover, notification settings, global parameters. |
| **Bilateral / platform-report consumers** (non-interactive) | Read the typed payload APIs at `/api/bilateral/*` and `/api/platform-report/*`. |

---

## Architecture at a glance

```
                            Browser (Angular 19 SPA)
                                     │
                                     │ HTTPS, custom `auth` header (JWT)
                                     ▼
                          API Gateway / Nginx
                                     │
                                     ▼
                            NestJS app (Lambda or container)
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
        TypeORM ► MySQL          AWS SDK              HTTP integrations
                                    │                       │
                                    ├── Cognito             ├── CLARISA (catalogs)
                                    ├── S3 / SharePoint     ├── Theory of Change
                                    ├── DynamoDB (logs)     ├── MQAP (KP attrs)
                                                            └── CGSpace (handles)
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
            LDAP                  RabbitMQ           Pusher / Sockets
            (AD)             (reporting-metadata)     (real-time)
```

Highlights:

- **Auth header is a custom `auth: <JWT>`** — NOT `Authorization: Bearer`. The Angular interceptor attaches it and the NestJS middleware verifies it.
- **`/api/bilateral/*` and `/api/platform-report/*` are JWT-excluded** — they're headless typed surfaces protected at the perimeter.
- **MySQL is the system of record.** DynamoDB is operational logs only.
- **AWS Cognito + Active Directory (LDAP)** for identity. PRMS doesn't own user provisioning.

Full technical blueprint: [`docs/detailed-design/detailed-design.md`](./docs/detailed-design/detailed-design.md).

---

## Repository layout

```
onecgiar_pr/
├── onecgiar-pr-server/         NestJS 11 backend
│   ├── src/                    Source tree (see src/CLAUDE.md for in-tree navigation)
│   ├── docs/                   Server-specific reference (bilateral contract)
│   ├── scripts/                Migration checks, etc.
│   ├── serverless.yaml         AWS Lambda deploy config
│   ├── Dockerfile              Node 20 multi-stage build
│   └── CLAUDE.md               Backend package guide
├── onecgiar-pr-client/         Angular 19 frontend
│   ├── src/                    Source tree (see src/CLAUDE.md for in-tree navigation)
│   ├── cypress/                E2E tests
│   ├── guides/                 Lint & format setup notes
│   ├── nginx.conf              Production static-server config
│   ├── Dockerfile              Container build
│   └── CLAUDE.md               Frontend package guide
├── docs/                       SDD constitutional baseline
│   ├── prd.md                  Product Requirements Document
│   ├── system-design/          UI/UX system blueprint
│   ├── detailed-design/        Technical implementation blueprint
│   └── specs/                  Module-level specs + general-setup templates
├── .github/                    CI workflows
├── .husky/                     Git hooks
├── .cursorrules                Hard security rule (no secrets in logs)
├── CLAUDE.md                   Root operating guide
├── sonar-project.properties    SonarCloud config
└── README.md
```

---

## Quick start

### Prerequisites

- Node.js **20.x** (matches the Docker image and Lambda runtime).
- npm (bundled with Node).
- A running MySQL 8.x instance (for the server).
- Optional: Docker for containerized runs; AWS CLI + Serverless Framework for Lambda deploys.

### Clone and install

```bash
git clone https://github.com/AllianceBioversityCIAT/onecgiar_pr.git
cd onecgiar_pr

# Root: installs husky hooks
npm ci && npm run prepare

# Backend
cd onecgiar-pr-server && npm ci && cd ..

# Frontend
cd onecgiar-pr-client && npm ci && cd ..
```

### Environment

Both apps read from environment variables. Common keys:

- **Backend** (`onecgiar-pr-server/.env`): `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER_NAME`, `DB_USER_PASS`, `JWT_SKEY`, `JWT_EXPIRES`, plus RabbitMQ, AWS, Cognito, AD, CLARISA, MQAP, SharePoint vars.
- **Frontend** (`onecgiar-pr-client/src/environments/environment.ts`): `apiBaseUrl`, Cognito + Pusher keys, etc.

Secrets live in environment variables, AWS Secrets Manager, or GitHub Secrets. **Never commit `.env` files or paste tokens / webhook URLs into logs or commits** — see [Security](#security).

### Run locally

```bash
# Backend (port from env.PORT, default 3000)
cd onecgiar-pr-server
npm run start:dev          # auto-reload
# Swagger at http://localhost:3000/api

# Frontend (port 4200)
cd onecgiar-pr-client
npm start                  # ng serve, http://localhost:4200
```

---

## Build, test, deploy

### Backend (`onecgiar-pr-server`)

```bash
npm run build              # nest build
npm run start              # production mode
npm run start:prod         # serve dist/main

npm run test               # Jest unit tests
npm run test:cov           # with coverage (thresholds: 5/20/35/40)
npm run test:e2e           # e2e tests (test/jest-e2e.json)

npm run migration:generate -- ./src/migrations/<Name>   # generate migration
npm run migration:run                                    # apply pending migrations
npm run migration:revert                                 # roll back last migration
npm run migration:check                                  # local guard
npm run migration:check:ci                               # CI guard (blocks merges)

npm run lambda:test        # serverless offline
npm run lambda:deploy      # sls deploy -v
```

Containerized:

```bash
cd onecgiar-pr-server
docker build -t prms-server .
docker run --env-file .env -p 3000:3000 prms-server
```

### Frontend (`onecgiar-pr-client`)

```bash
npm run build              # production build
npm run build:dev          # development build
npm run watch              # dev rebuild on change

npm run test               # Jest unit tests
npm run test:coverage      # with coverage (thresholds: 50/60/60/60)
npm run lint               # ng lint
npm run lint:fix           # auto-fix

npm run cypress:open       # Cypress GUI
npm run cypress:run        # headless
npm run cypress:run:record # recorded run
```

Containerized (static via Nginx):

```bash
cd onecgiar-pr-client
docker build -t prms-client .
docker run -p 8080:80 prms-client
```

### CI

CI runs lint, tests, build, `migration:check:ci`, and SonarCloud (`sonar-project.properties`). Husky pre-commit hook is installed by `npm run prepare` at the repo root.

---

## Documentation map

**Hosted reference:** the full PRMS documentation is also published as a navigable wiki on Mintlify — [PRMS Wiki](https://mintlify.wiki/AllianceBioversityCIAT/onecgiar_pr/introduction). Use it as the entry point when you don't want to clone the repo.

PRMS uses **Spec-Driven Development** (SDD). The hierarchy is:

```
README.md                                ← you are here
  └── CLAUDE.md                          (operating instructions)
        ├── docs/prd.md                  Product baseline (problem, personas, goals, AC-1..AC-9)
        ├── docs/system-design/design.md UI/UX system blueprint (tokens, components, flows, a11y)
        ├── docs/detailed-design/        Technical implementation blueprint
        ├── docs/specs/general-setup/    Templates that module specs MUST follow
        ├── docs/specs/<module>/         Module-level specs (requirements + design + task)
        ├── onecgiar-pr-server/CLAUDE.md Backend package guide
        │     └── src/CLAUDE.md          In-tree navigation, base classes, patterns
        └── onecgiar-pr-client/CLAUDE.md Frontend package guide
              └── src/CLAUDE.md          In-tree navigation, route tables, patterns
```

### Where to look (by intent)

| I want to… | Read |
|---|---|
| Browse the docs online without cloning | [PRMS Wiki on Mintlify](https://mintlify.wiki/AllianceBioversityCIAT/onecgiar_pr/introduction) |
| Understand the product, scope, goals, metrics, personas | [`docs/prd.md`](./docs/prd.md) |
| Understand UI/UX rules, tokens, components, screens | [`docs/system-design/design.md`](./docs/system-design/design.md) |
| Understand the technical architecture | [`docs/detailed-design/detailed-design.md`](./docs/detailed-design/detailed-design.md) |
| Write a new module spec | Start from [`docs/specs/general-setup/`](./docs/specs/general-setup/) |
| Work on the backend | [`onecgiar-pr-server/CLAUDE.md`](./onecgiar-pr-server/CLAUDE.md) → [`onecgiar-pr-server/src/CLAUDE.md`](./onecgiar-pr-server/src/CLAUDE.md) |
| Work on the frontend | [`onecgiar-pr-client/CLAUDE.md`](./onecgiar-pr-client/CLAUDE.md) → [`onecgiar-pr-client/src/CLAUDE.md`](./onecgiar-pr-client/src/CLAUDE.md) |
| Understand bilateral payload contracts | [`onecgiar-pr-server/docs/bilateral-result-summaries.en.md`](./onecgiar-pr-server/docs/bilateral-result-summaries.en.md) |

### SDD slash-commands (Claude Code)

These commands operate against the SDD baseline above:

- `/sdd-constitution` — refresh the project-level baseline (PRD, system design, detailed design, templates, root CLAUDE.md).
- `/sdd-specify` — generate a module spec triplet (`requirements.md`, `design.md`, `task.md`) under `docs/specs/<module>/`.
- `/sdd-execute` — run the tasks defined in a `task.md`.
- `/sdd-validate` — check a module spec follows the templates and references the baseline.
- `/sdd-test` — drive test coverage for a spec.

---

## Conventions

### Commits

Format: `<emoji> <type>(<scope>) [ticket]: <description>`

| Emoji | Type | Use |
|---|---|---|
| ✨ | `feat` | New features or functionality |
| ♻️ | `refactor` | Refactor without behavior change |
| 🔧 | `fix` | Bug fixes |
| 🎨 | `style` | UI / formatting / styling |

Scope = component or service name (`bilateral.service`, `result-review-drawer`, `phase-management-table`). Ticket optional (`P2-2498`).

Examples:

```
✨ feat(knowledge-product-info): Integrate FieldsManagerService and enhance test coverage
♻️ refactor(result-review-drawer) P2-2498: Extract toNum function for number coercion
🔧 fix(submissions.service): Correct formatting and remove unnecessary comment
🎨 style(share-request-modal) P2-2498: Update modal title layout and button styles
```

### Branches

- `master` — production-tracking.
- `staging` — integration branch that merges into `master` via PR.
- Open PRs against `staging` or `master` per the team's release cadence.

### Coverage thresholds (enforced)

- **Backend:** branches 5%, functions 20%, lines 35%, statements 40% — floors, aim higher.
- **Frontend:** branches 50%, functions 60%, lines 60%, statements 60%.

### Code conventions

- **Backend:** module-per-feature under `src/api/<feature>/` with the standard NestJS trio (`module.ts`, `controller.ts`, `service.ts`), DTOs validated with `class-validator`, response envelope via `ResponseInterceptor`, errors via `HttpExceptionFilter`. Schema changes only via TypeORM migrations.
- **Frontend:** page-module-per-feature under `src/app/pages/<feature>/`, HTTP methods named `HTTP_METHOD_descriptiveName`, state in Angular signals (no NgRx), strings via `internationalization/` (P22 vs P25 vocabulary), tokens from `src/styles/colors.scss` with `--pr-*` prefix mirrored in `src/app/theme/reportingTheme.ts`.

Full conventions in the package guides.

---

## Security

PRMS has a **hard, project-wide rule**: **never print, log, or echo tokens, webhook URLs, API keys, passwords, AD/Cognito credentials, DB credentials, or sensitive environment variables anywhere** — code, scripts, CI workflows, docs, debug output, error messages.

The rule applies equally to:

- Backend services, repositories, scripts, and CI pipelines.
- Frontend components, services, and telemetry.
- Documentation and example commands.

The full policy lives in [`.cursorrules`](./.cursorrules). Secrets live in environment variables, AWS Secrets Manager, or GitHub Secrets. PRs MUST NOT add `.env` content.

Authentication uses a custom `auth: <JWT>` header verified by `JwtMiddleware`. Authorization uses `ValidRoleGuard` + `@Roles()` decorator with the role hierarchy in [`onecgiar-pr-server/src/shared/constants/role-type.enum.ts`](./onecgiar-pr-server/src/shared/constants/role-type.enum.ts).

---

## External systems

PRMS integrates with — but does not own — these systems:

| System | How PRMS uses it |
|---|---|
| **CLARISA** | Catalog source (institutions, centers, initiatives, countries, regions, indicators, etc.) — read-only via HTTP + scheduled syncs. |
| **Theory of Change services** | ToC trees and outcomes (`/toc/*`). PRMS aligns results to ToC; it does not author ToC. |
| **AWS Cognito + Active Directory (LDAP)** | Identity and authentication. PRMS doesn't provision users. |
| **CGSpace** | Stable `handle` for knowledge products. |
| **MQAP** | External knowledge-product attribute lookup. |
| **AWS S3 / SharePoint** | Evidence files and PRMS documents. |
| **AWS DynamoDB** | Operational logs only (`/logs/*`). |
| **RabbitMQ** | `reporting-metadata-export` async pipeline. |
| **Pusher + WebSockets** | Real-time notifications and updates. |
| **Hotjar + Microsoft Clarity** | Client-side session telemetry. |

---

## Contributing

1. Read [`CLAUDE.md`](./CLAUDE.md) (root operating instructions) and the relevant package guide.
2. Find or open a spec under `docs/specs/<module>/` — start from `docs/specs/general-setup/` if creating a new one.
3. Implement per the conventions in the package guides (`onecgiar-pr-server/src/CLAUDE.md` for backend code, `onecgiar-pr-client/src/CLAUDE.md` for frontend code).
4. Run `npm run lint` + `npm run test` (+ `npm run migration:check` on backend). Keep coverage above thresholds.
5. Open a PR against `staging` (or `master` per cadence) using the commit format above.
6. If the change touches `/api/bilateral/*` or `/api/platform-report/*`, add a change-log row in [`onecgiar-pr-server/docs/bilateral-result-summaries.en.md`](./onecgiar-pr-server/docs/bilateral-result-summaries.en.md).

Pre-commit hooks (Husky) run lint-staged checks; please do not bypass them.

---

## License

See [`LICENSE`](./LICENSE).
