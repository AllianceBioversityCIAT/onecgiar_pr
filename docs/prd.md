# PRMS — Product Requirements Document

> **Status:** Living document. Authoritative product-level baseline for PRMS (Planning, Reporting & Management System) at OneCGIAR. Module-specific PRDs live under `docs/specs/<module>/`.

---

## 1. Overview & Purpose

PRMS is the single web platform where CGIAR Initiatives, Centers, and partners **plan, capture, qualify, and submit reportable results** for the OneCGIAR portfolio, and where PMU/portfolio leads consolidate those results into **Type-One Reports, IPSR pathways, bilateral exports, and platform-level narratives**.

The product:

- Captures **typed results** (knowledge product, capacity sharing, innovation development, innovation use, innovation package / IPSR, policy change, others) with shared common fields (identity, ToC alignment, geography, partners, DAC scores, evidence).
- Drives a **submission workflow** (Editing → Quality Assessed → Submitted) backed by review history.
- Integrates with **CLARISA** (master data), **Theory of Change** services, **AWS Cognito** + AD identity, and emits **bilateral / platform-report** payloads for downstream consumers.
- Operates per **reporting phase / year** (versioning), with admin tooling for roles, AD users, global parameters, soft-delete recovery, and CLARISA syncs.

This PRD is intentionally **project-level**. Feature/module specs under `docs/specs/<module>/` MUST cite the requirement IDs they implement here.

---

## 2. Problem Statement

CGIAR result reporting historically suffered from:

- **Fragmented data** spread across spreadsheets, free-text documents, and bespoke tools per Initiative.
- **Inconsistent typology** — the same result reported differently by different teams, breaking aggregation and downstream BI.
- **Weak quality controls** — evidence, ToC alignment, partner attribution, and DAC cross-cutting scoring were captured inconsistently and reviewed late.
- **Friction at submission cycle boundaries** — phase rollover, version snapshots, and bilateral exports required manual reconciliation.
- **Limited reuse for downstream consumers** — bilateral funders, platform reports, BI dashboards each pulled raw data differently.

PRMS exists to make result capture **structured, qualified, and submission-ready by design**, and to expose a **stable, typed payload surface** for downstream platforms without re-engineering each cycle.

---

## 3. Target Personas

| Persona | Primary needs | Where they spend time in PRMS |
|---|---|---|
| **Result submitter** (Initiative / Center staff) | Capture results quickly, attach evidence, align ToC, mark partners and geography, fix QA feedback. | `pages/results/result-creator`, `result-detail`, IPSR pathway, knowledge products. |
| **Quality Assurance (QA) reviewer** | Review submitted results against criteria, push back with structured comments, advance workflow. | `quality-assurance`, result-review drawer, review history. |
| **PMU / portfolio lead** | Run Type-One Reports, oversee IPSR pathways, edit global narratives, monitor submission progress per phase/initiative. | `type-one-report`, `ipsr-framework`, `global-narratives`, `home`. |
| **Platform admin** | Manage roles, AD users, CLARISA syncs, phases/versioning, delete-and-recover data, notification settings, global parameters. | `admin-section`, `init-admin-section`, `manage-data`, `versioning`, `user-notification-settings`. |

Secondary consumers (not interactive personas, but downstream surfaces the product must serve):

- **Bilateral funders / discovery consumers** reading the bilateral list/detail API.
- **Platform reports & BI dashboards** consuming PRMS exports and result-dashboard-bi.

---

## 4. Goals & Success Metrics

Goals describe **why we invest in PRMS**. Each goal has at least one measurable success metric; baselines and targets per phase are tracked in `docs/specs/<module>/` and PMU dashboards, not here.

### G1. Submission completeness and on-time submission

- **M1.1** — % of expected results moving to `status=Submitted` (status_id=3) before the phase deadline, per Initiative.
- **M1.2** — Median days from result creation to first submission, per phase.
- **M1.3** — Count of results blocked at the deadline boundary due to missing required fields (target: trending down phase over phase).

### G2. Data quality (QA pass rate, evidence completeness)

- **M2.1** — % of results passing QA (`status_id=2 → 3`) on the first review pass.
- **M2.2** — % of submitted results carrying at least one valid evidence link, ToC alignment row, and lead center/partner.
- **M2.3** — Count of `result-deletion-audit` / soft-delete events per phase (operational health signal).

### G3. Bilateral / external consumer reliability

- **M3.1** — Backwards-compatible response stability of `bilateral` and `platform-report` payload shapes (no breaking change without a documented change log entry — see `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`).
- **M3.2** — Bilateral list/detail p95 latency under defined SLA (target captured in `docs/detailed-design/detailed-design.md`).
- **M3.3** — Bilateral throttling exceptions and 5xx rate (`ThrottlerExcludeBilateralGuard` path) trending to zero.

### G4. Platform reliability and performance

- **M4.1** — API uptime per environment (test, staging, prod) measured against the AWS Lambda deployment.
- **M4.2** — p95 latency on hot endpoints: results list, results detail, IPSR pathway, home.
- **M4.3** — Background success rate for: CLARISA sync cron, reporting-metadata-export RMQ consumer, email-notification microservice, scheduled jobs.

---

## 5. Scope

### In scope

- **Result capture & lifecycle** for all PRMS result types, including IPSR (innovation package) and policy change.
- **Submission workflow** (Editing / QA / Submitted) with review history and review drawer.
- **Phase / version management** (`versioning` module) — reporting year + phase boundaries.
- **Quality assurance** tooling (QA scoring per result, review comments, status transitions).
- **Bilateral and platform-report** payload surfaces for downstream consumers, with typed summaries per result type.
- **CLARISA integration** as a consumer of master data (centers, initiatives, partners, countries, regions, indicators, etc.) with scheduled syncs.
- **Theory of Change** alignment (consume ToC trees, attach result→ToC mappings).
- **Authentication & authorization** via AWS Cognito + AD, with role-based access in `auth/modules/role`.
- **Notifications** (in-app, email microservice, user notification settings) and **AI helpers** (`api/ai`) where they support the reporting workflow.
- **Admin tooling**: AD users, roles, global parameters, delete/recover, initiative-entity map, global narratives.
- **Operational surface**: Dockerfile + serverless Lambda deployment, DynamoDB logs, Pusher / WebSocket sockets for real-time events.

### Out of scope (explicit non-goals)

- **CLARISA master data ownership** — PRMS consumes CLARISA; the canonical catalog is owned by CLARISA.
- **Theory of Change authoring / governance** — PRMS aligns results to ToC trees; authoring ToC content is external.
- **Downstream BI dashboards / external reporting tools** — PRMS exposes data for them; UI for those tools is not in scope.
- **End-user identity provisioning** — AD/Cognito directories are managed outside PRMS; PRMS integrates but does not own identity sources.
- **Long-term scientific repository for outputs** — knowledge products link to CGSpace handles; PRMS does not host PDFs/datasets as a system of record.

### Deferred / parked (not yet decided)

- Public-facing search experience for results (only stable identifiers and `pdf_link`/`prms_link` are exposed today).
- First-class API key program for third parties beyond the bilateral consumer path.

---

## 6. User Stories

Each story is `As a <persona>, I want <capability>, so that <outcome>.` Stories are intentionally project-level — module specs refine them.

### Result submitter

- **US-S1** As a result submitter, I want to create a typed result and fill the required common fields (title, level, ToC alignment, geography, centers, evidence, DAC scores) so that my result is QA-ready.
- **US-S2** As a result submitter, I want type-specific sections (e.g., innovation development, capacity sharing, policy change, IPSR pathway) so that I can capture domain detail without forcing the wrong shape onto my result.
- **US-S3** As a result submitter, I want to share / request access to a result so that the right Initiative collaborators can contribute.
- **US-S4** As a result submitter, I want to see review history and QA comments so that I can iterate before resubmission.
- **US-S5** As a result submitter, I want autosave / explicit save with clear error messages so that I never lose entered work to a network error.

### QA reviewer

- **US-Q1** As a QA reviewer, I want to open a result-review drawer with all submitted fields, evidence, and ToC alignment so that I can assess quality in one place.
- **US-Q2** As a QA reviewer, I want to add structured QA comments tied to fields/sections so that submitters know what to fix.
- **US-Q3** As a QA reviewer, I want to advance or reject a result and have that transition recorded in submission/review history.

### PMU / portfolio lead

- **US-P1** As a PMU lead, I want a phase-aware home/dashboard showing submission progress so that I can track who is on track for the deadline.
- **US-P2** As a PMU lead, I want to run Type-One Reports so that I can publish the consolidated portfolio narrative per phase.
- **US-P3** As a PMU lead, I want to manage IPSR pathways across the four steps so that innovation packages are reported coherently.
- **US-P4** As a PMU lead, I want to edit global narratives and impact-area scoring so that platform-level outputs reflect curated content.

### Platform admin

- **US-A1** As a platform admin, I want to manage roles and AD users so that the right people see the right modules.
- **US-A2** As a platform admin, I want to manage phases / versioning so that submission cycles open and close cleanly.
- **US-A3** As a platform admin, I want to recover soft-deleted results and audit deletions so that data is never irreversibly lost.
- **US-A4** As a platform admin, I want CLARISA syncs to run on schedule (and on-demand) so that catalogs stay current.
- **US-A5** As a platform admin, I want to edit global parameters and initiative-entity maps so that operational tweaks don't require a release.

### Downstream consumer (bilateral / platform-report)

- **US-D1** As a bilateral consumer, I want a stable typed payload per result type so that downstream systems don't break on schema drift.
- **US-D2** As a platform-report consumer, I want phase-scoped exports so that I can render reports per cycle.

---

## 7. Acceptance Criteria

Acceptance criteria here are **product-level invariants** every module spec must respect. Module-specific criteria live in `docs/specs/<module>/requirements.md`.

### AC-1 — Typed result integrity

- Every result MUST carry a stable `result_code`, a `result_type`, a reporting `year`/phase, an `is_active` flag, and a `status_id` from the canonical workflow.
- Type-specific summaries MUST NOT leak raw FK columns; they MUST use CLARISA-facing ids and human-readable labels per the contract in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.

### AC-2 — Submission workflow

- `status_id` transitions MUST be one of: Editing (1) → Quality Assessed (2) → Submitted (3), with backward transitions only allowed via explicit reviewer / admin action.
- Every transition MUST be recorded in `result-review-history` with the acting user, timestamp, and optional comment.

### AC-3 — Authorization

- Every API route under `api/`, `v2/`, `clarisa/`, `toc/`, `type-one-report` MUST go through the JWT middleware (`JwtMiddleware`) except routes explicitly excluded by `app.module.ts` (`api/platform-report/*`, `api/bilateral/*`).
- Role checks MUST be enforced at the controller/guard layer; the frontend MUST NOT be the sole gatekeeper.

### AC-4 — Bilateral / platform-report stability

- Any change to the bilateral or platform-report payload shape MUST be documented in the relevant change log (see bilateral summaries doc) AND covered by tests before release.
- New fields are additive; removals or renames REQUIRE a versioned rollout (`v2/` namespace or equivalent) and a downstream notification.

### AC-5 — Phase / versioning correctness

- All result reads/writes MUST be scoped to the active phase unless an admin endpoint explicitly opts into cross-phase access.
- Phase rollover MUST snapshot prior-phase data without mutating it.

### AC-6 — Evidence and ToC alignment

- Submitting a result (`status_id=3`) MUST validate: at least one evidence row where required by type, at least one ToC alignment row where required by type, at least one contributing center with `is_lead=true`.

### AC-7 — Soft delete & recovery

- Delete operations on results, partners, evidences, ToC links, etc. MUST be soft (preserving `is_active=false` and audit rows in `result-deletion-audit` where applicable) and recoverable via the admin `manage-data` (`delete-recover-data`) module.

### AC-8 — Observability and notifications

- Background pipelines (CLARISA cron, reporting-metadata-export RMQ consumer, email notifications) MUST log structured outcomes and ACK only after success; failures MUST be recoverable without manual SQL.
- User-facing changes (submission, QA outcome, share request) MUST fire the appropriate in-app + email notification respecting `user-notification-settings`.

### AC-9 — Security and secrets

- Tokens, webhooks, API keys, and credentials MUST NEVER be logged, printed, or echoed in console / CI logs (enforced project-wide — see `.cursorrules`).
- Secrets live in environment variables, AWS Secrets Manager, or GitHub Secrets. PRs MUST NOT add `.env` content.

---

## 8. Assumptions, Dependencies, & Constraints

### Assumptions

- The CGIAR portfolio model (Initiatives → Centers → Partners; ToC outcomes; phases per year) remains the organizing taxonomy.
- CLARISA stays the system of record for institutional catalogs; PRMS continues to consume it via the CLARISA module + cron syncs.
- Reporting cycles continue to be phase-bound (annual + sub-phases), driving the `versioning` module.

### Dependencies

- **CLARISA** REST endpoints (catalog of centers, initiatives, partners, countries, indicators, etc.).
- **Theory of Change** services (`toc` module) supplying ToC trees and outcomes.
- **AWS Cognito** + Active Directory for identity (`auth-cognito` client module, AD users server module, `ldapts`).
- **AWS Lambda + API Gateway** (Serverless Framework) for backend deployment.
- **MySQL** via TypeORM, with migrations gated by `migration:check` and CI.
- **RabbitMQ** (`amqplib`, `amqp-connection-manager`) for `reporting-metadata-export` and related microservices.
- **DynamoDB** for logs (`dynamodb-logs`).
- **Pusher** + `ngx-socket-io` for real-time client events.
- **PrimeNG + Angular 19** for the client; Jest + Cypress for tests.
- **CGSpace** (handle-based) for knowledge product references.

### Constraints

- **Frontend stack:** Angular 19 (`pages/<feature>` module-per-feature), PrimeNG components, Jest unit tests, Cypress e2e — coverage thresholds in `package.json` are enforced.
- **Backend stack:** NestJS 11, TypeORM 0.3, MySQL, Lambda runtime — bundle size and cold-start budget apply to Lambda deploy.
- **API conventions:** Custom `auth` header (NOT `Authorization: Bearer`); `apiBaseUrl` vs `apiBaseUrlV2` split per `onecgiar-pr-client/CLAUDE.md`; `HTTP_METHOD_descriptiveName` method naming on the client API service.
- **Throttling:** Global throttler (60s/100 req) with bilateral routes excluded by `ThrottlerExcludeBilateralGuard`.
- **Commit convention:** `<emoji> <type>(<scope>) [ticket]: <description>` (see root `CLAUDE.md`).
- **Security rules:** No printing/echoing of secrets, tokens, or webhook URLs anywhere (`.cursorrules`).

---

## 9. Open Questions

- **OQ-1** Should public/anonymous read access to non-sensitive result data become a first-class scope, or stay limited to the bilateral path?
- **OQ-2** Should we formalize an external partner API program (rate-limited, API-keyed) on top of `bilateral` and `platform-report`, or keep them internal-by-policy?
- **OQ-3** Are there phase-level KPIs (M1.x / M2.x targets) PMU wants enshrined in the PRD vs kept in PMU dashboards?
- **OQ-4** What is the long-term plan for the `v2/` API namespace — sunset legacy `api/` once parity is reached, or maintain both indefinitely?
- **OQ-5** Should AI-assisted authoring (`api/ai`) become a goal in this PRD (e.g., reduction in time-to-submit) or stay a support feature without product-level metrics?

---

## Related documents

- `docs/system-design/design.md` — UI/UX system blueprint.
- `docs/detailed-design/detailed-design.md` — Technical implementation blueprint.
- `docs/specs/general-setup/` — Templates `/sdd-specify` MUST follow.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — Authoritative spec for bilateral result payloads.
- `onecgiar-pr-client/CLAUDE.md` — Frontend conventions (auth header, API base URLs, commit format).
- `.cursorrules` — Security rule (no secrets in logs).
