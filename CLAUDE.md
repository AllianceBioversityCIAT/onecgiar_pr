# CLAUDE.md — Repository Instructions (root)

This is the **monorepo root guide** for PRMS (Planning, Reporting & Management System) at OneCGIAR. It points Claude at the **SDD constitutional baseline** under `docs/` and at the package-level guides in each app folder.

> If you're working inside `onecgiar-pr-client/`, also read `onecgiar-pr-client/CLAUDE.md` for frontend-specific conventions (API base URLs, custom `auth` header, commit format).

---

## Repository layout

```
onecgiar_pr/
├── onecgiar-pr-server/   # NestJS 11 backend (TypeORM/MySQL, Lambda + Docker, RMQ, AWS)
├── onecgiar-pr-client/   # Angular 19 frontend (PrimeNG 19, Jest, Cypress)
├── docs/                 # SDD constitutional baseline (see below)
├── .cursorrules          # Security rule — no secrets in logs/console (READ THIS)
├── .github/, .husky/     # CI + git hooks
├── package.json          # Root husky setup
└── README.md             # Install instructions
```

---

## SDD constitutional baseline (always consult these first)

These four artefacts form the project-level baseline. Module-level specs MUST cite them.

| Document | Purpose | When to consult |
|---|---|---|
| **`docs/prd.md`** | Product Requirements Document. Problem, personas, goals, scope, user stories, acceptance criteria, assumptions, open questions. | Whenever a task is product-shaped: "should we…", "is X in scope", "what's the user story for…", scope debates, success metric questions. |
| **`docs/system-design/design.md`** | UI/UX system blueprint. Principles, IA, flows, screens, navigation, layout, tokens, components, responsive, a11y, dark mode, design decisions. | Whenever a task touches the client UI: new screens, components, layouts, tokens, navigation, a11y, i18n, design system choices. |
| **`docs/detailed-design/detailed-design.md`** | Technical implementation blueprint. Modules, data model, APIs, workflows, frontend state, integrations, security, observability, testing, constraints. | Whenever a task touches code: new modules, entities, endpoints, workflows, integrations, security/auth, testing strategy, performance, rollout. |
| **`docs/specs/general-setup/`** | Templates for module-level specs (`requirements.md`, `design.md`, `task.md`). | Every time `/sdd-specify` is run — module specs MUST start from these templates. |

### Spec taxonomy

Module specs live under `docs/specs/<module>/` (and `docs/specs/<module>/<feature>/` for sub-features). Top-level folders mirror the NestJS / Angular module split: `results/`, `ipsr/`, `bilateral/`, `platform-report/`, `quality-assurance/`, `notifications/`, `auth/`, `clarisa/`, `versioning/`, `admin/`, …

Each module spec is the trio `requirements.md` + `design.md` + `task.md`. They cite project-level requirement IDs from `docs/prd.md` and `docs/detailed-design/detailed-design.md`. They MUST follow the templates in `docs/specs/general-setup/`.

### SDD slash-commands

- **`/sdd-constitution`** — refreshes the baseline above (this file + the four docs).
- **`/sdd-specify`** — generates a module-level spec triplet under `docs/specs/<module>/`.
- **`/sdd-execute`** — runs the tasks in a `task.md`.
- **`/sdd-validate`** — checks a spec follows the templates and references the baseline correctly.
- **`/sdd-test`** — drives test coverage for a spec.

---

## Domain-specific reference docs

| Document | What it covers |
|---|---|
| `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` | **Authoritative payload contract** for `/api/bilateral/*` responses (knowledge product, capacity sharing, innovation development/use, innovation package/IPSR, policy change). Every change to bilateral payloads MUST update this doc's change log. |
| `onecgiar-pr-client/CLAUDE.md` | Frontend operating instructions: custom `auth` header (NOT `Authorization: Bearer`), API base URLs (`apiBaseUrl`, `apiBaseUrlV2`, `baseApiBaseUrl`, `baseApiBaseUrlV2`), `HTTP_METHOD_descriptiveName` API method naming, commit convention. |
| `onecgiar-pr-client/docs/development-context/notifications-module-unification.md` | Notifications module migration context. |
| `.cursorrules` | **Security rule** — never log/echo/print tokens, webhook URLs, API keys, passwords, sensitive env vars. Applies to code, scripts, CI, and docs. |

---

## Working conventions

### Commit messages

Format: `<emoji> <type>(<scope>) [ticket]: <description>` (see `onecgiar-pr-client/CLAUDE.md`).

| Emoji | Type | Use |
|---|---|---|
| ✨ | `feat` | New features. |
| ♻️ | `refactor` | Refactor without behaviour change. |
| 🔧 | `fix` | Bug fix. |
| 🎨 | `style` | UI / formatting. |

Scope = component or service name (`bilateral.service`, `result-review-drawer`, `reporting-metadata-export`). Ticket optional (`P2-2498`).

### Branches & PRs

- Main branch: `master` (production-tracking).
- Staging integration branch: `staging` (merges into `master` via PR).
- Open PRs against `staging` or `master` per the team's release cadence.

### Test gates

- **Server (`onecgiar-pr-server/`):** Jest. Thresholds: branches 5%, functions 20%, lines 35%, statements 40% — minimums, aim higher.
- **Client (`onecgiar-pr-client/`):** Jest + Cypress. Thresholds: branches 50%, functions 60%, lines 60%, statements 60%.
- **Migrations:** `npm run migration:check:ci` blocks merges with pending migrations.
- **Security:** SonarCloud (`sonar-project.properties`).

### Secrets and security (hard rule)

Never print, log, or echo tokens, webhook URLs (full or partial), API keys, passwords, AD/Cognito creds, DB creds, or sensitive env vars anywhere — code, scripts, CI workflows, docs, debug output, error messages. See `.cursorrules` for the full rule and approved alternatives.

---

## Quick install / run

```bash
git clone https://github.com/AllianceBioversityCIAT/onecgiar_pr.git
cd ./onecgiar_pr && npm ci && npm run prepare    # installs husky hooks

# Backend
cd onecgiar-pr-server && npm ci
npm run start:dev     # local dev (port from env)
npm run test          # unit tests
npm run migration:check  # block on pending migrations

# Frontend
cd ../onecgiar-pr-client && npm ci
npm start             # http://localhost:4200
npm run test          # Jest unit tests
npm run cypress:run   # Cypress e2e
```

---

## When in doubt

1. **Product question?** Read `docs/prd.md` first.
2. **UI question?** Read `docs/system-design/design.md` first.
3. **Code/architecture question?** Read `docs/detailed-design/detailed-design.md` first.
4. **Bilateral payload question?** Read `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
5. **Frontend API / auth header question?** Read `onecgiar-pr-client/CLAUDE.md`.
6. **About to log a token or secret?** Stop and re-read `.cursorrules`.
