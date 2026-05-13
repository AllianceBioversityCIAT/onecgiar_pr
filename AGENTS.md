# AGENTS.md - Repository Instructions (root)

This is the agent-neutral monorepo guide for PRMS (Planning, Reporting & Management System) at OneCGIAR. It is intended for any AI coding agent working in this repository, including Claude, OpenCode, Copilot coding agents, Cursor agents, Codex-style agents, and similar tools.

## Read Order

1. Read this root guide first.
2. If working in `onecgiar-pr-client/`, read `onecgiar-pr-client/AGENTS.md`.
3. If editing client source under `onecgiar-pr-client/src/`, read `onecgiar-pr-client/src/AGENTS.md`.
4. If working in `onecgiar-pr-server/`, read `onecgiar-pr-server/AGENTS.md`.
5. If editing server source under `onecgiar-pr-server/src/`, read `onecgiar-pr-server/src/AGENTS.md`.
6. Always apply `.cursorrules` before logging, printing, scripting, or documenting anything that could contain secrets.

## Repository Layout

```text
onecgiar_pr/
├── onecgiar-pr-server/   # NestJS 11 backend (TypeORM/MySQL, Lambda + Docker, RMQ, AWS)
├── onecgiar-pr-client/   # Angular 19 frontend (PrimeNG 19, Jest, Cypress)
├── docs/                 # SDD constitutional baseline
├── .cursorrules          # Security rule: no secrets in logs/console
├── .github/, .husky/     # CI + git hooks
├── package.json          # Root husky setup
└── README.md             # Install instructions
```

## SDD Constitutional Baseline

These documents are the project-level baseline. Module-level specs must cite them.

| Document | Purpose | Consult when |
|---|---|---|
| `docs/prd.md` | Product requirements: problem, personas, goals, scope, user stories, acceptance criteria, assumptions, open questions. | The task is product-shaped: scope, user story, success metrics, acceptance criteria. |
| `docs/system-design/design.md` | UI/UX system blueprint: IA, flows, screens, navigation, layout, tokens, components, responsive behavior, accessibility, dark mode, design decisions. | The task touches client UI, UX, navigation, a11y, i18n, tokens, or design patterns. |
| `docs/detailed-design/detailed-design.md` | Technical blueprint: modules, data model, APIs, workflows, frontend state, integrations, security, observability, testing, constraints. | The task touches code, modules, entities, endpoints, workflows, integrations, security, auth, testing, or rollout. |
| `docs/specs/general-setup/` | Templates for module-level specs: `requirements.md`, `design.md`, `task.md`. | Running or simulating `/sdd-specify`; module specs must start from these templates. |

## SDD Methodology

Module specs live under `docs/specs/<module>/` and under `docs/specs/<module>/<feature>/` for sub-features. Top-level folders mirror NestJS and Angular module boundaries: `results/`, `ipsr/`, `bilateral/`, `platform-report/`, `quality-assurance/`, `notifications/`, `auth/`, `clarisa/`, `versioning/`, `admin/`, and similar domains.

Each module spec is a trio:

- `requirements.md`
- `design.md`
- `task.md`

Specs must cite project-level requirement IDs from `docs/prd.md` and `docs/detailed-design/detailed-design.md`. They must follow the templates in `docs/specs/general-setup/`.

Supported SDD slash-command concepts:

- `/sdd-constitution`: refreshes the baseline files.
- `/sdd-specify`: generates a module-level spec triplet.
- `/sdd-execute`: runs tasks in a `task.md`.
- `/sdd-validate`: checks spec structure and baseline references.
- `/sdd-test`: drives test coverage for a spec.

If the current agent does not support these slash commands, follow the same intent manually: read the baseline, check or create the spec trio, implement from `task.md`, validate, test, and update docs.

## Domain Reference Docs

| Document | Covers |
|---|---|
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | Authoritative payload contract for `/api/bilateral/*` responses. Every bilateral payload change must update this doc change log. |
| `onecgiar-pr-client/AGENTS.md` | Frontend operating instructions: custom `auth` header, API base URLs, API method naming, build/test, commit conventions. |
| `onecgiar-pr-client/docs/development-context/notifications-module-unification.md` | Notifications module migration context. |
| `.cursorrules` | Hard security rule: never log, echo, print, commit, or document secrets. |

## Security Rules

Never print, log, echo, expose, commit, or partially reveal:

- JWTs or `auth` headers.
- Webhook URLs.
- API keys.
- Passwords.
- AD, Cognito, database, RabbitMQ, AWS, SharePoint, MQAP, Elasticsearch, or third-party credentials.
- Sensitive environment variables.

Use `.cursorrules` as the authority. If debugging auth or integration failures, redact sensitive values completely and describe the presence or absence of values instead of showing them.

## Working Conventions For Agents

- Build context before editing. Read the relevant `AGENTS.md`, SDD baseline, package guide, and source-tree guide.
- Prefer the smallest correct change. Do not add compatibility layers unless there is persisted data, shipped behavior, external consumers, or an explicit requirement.
- Do not rewrite unrelated files or revert changes you did not make.
- Preserve current architecture, naming, typos that are load-bearing, and module boundaries.
- Update documentation when changing behavior, API contracts, UX patterns, or module architecture.
- Add or update tests for meaningful behavior changes.
- Use existing services, utilities, components, guards, interceptors, and patterns before creating new ones.
- Do not lower test coverage thresholds.
- Do not commit unless the user explicitly asks.

## Commit Messages

Format: `<emoji> <type>(<scope>) [ticket]: <description>`.

| Emoji | Type | Use |
|---|---|---|
| ✨ | `feat` | New feature. |
| ♻️ | `refactor` | Refactor without behavior change. |
| 🔧 | `fix` | Bug fix. |
| 🎨 | `style` | UI, formatting, styling. |

Scope is a component or service name, for example `bilateral.service`, `result-review-drawer`, or `reporting-metadata-export`. Ticket is optional, for example `P2-2498`.

## Branches And PRs

- Main branch: `master`.
- Staging integration branch: `staging`.
- Open PRs against `staging` or `master` according to release cadence.

## Test Gates

- Server (`onecgiar-pr-server/`): Jest. Thresholds: branches 5%, functions 20%, lines 35%, statements 40%.
- Client (`onecgiar-pr-client/`): Jest + Cypress. Thresholds: branches 50%, functions 60%, lines 60%, statements 60%.
- Migrations: `npm run migration:check:ci` blocks merges with pending migrations.
- Security: SonarCloud via `sonar-project.properties`.

## Quick Install And Run

```bash
git clone https://github.com/AllianceBioversityCIAT/onecgiar_pr.git
cd ./onecgiar_pr && npm ci && npm run prepare

# Backend
cd onecgiar-pr-server && npm ci
npm run start:dev
npm run test
npm run migration:check

# Frontend
cd ../onecgiar-pr-client && npm ci
npm start
npm run test
npm run cypress:run
```

## When In Doubt

1. Product question: read `docs/prd.md` first.
2. UI question: read `docs/system-design/design.md` first.
3. Code or architecture question: read `docs/detailed-design/detailed-design.md` first.
4. Bilateral payload question: read `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
5. Frontend API or auth header question: read `onecgiar-pr-client/AGENTS.md`.
6. About to log a token or secret: stop and reread `.cursorrules`.
