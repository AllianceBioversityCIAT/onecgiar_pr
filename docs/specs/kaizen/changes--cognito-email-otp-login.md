# Kaizen Entry — changes/cognito-email-otp-login

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/cognito-email-otp-login` |
| Date | 2026-09-14 |
| Branch | qa-development-2026 (spec branch; default `master`) |
| Archive Run | 1 |
| Approval Mode | pre-approved |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 18 (10 planned + T-10 triggered + T-11..T-14 rev 3 + T-15 rev 3.1 + T-16..T-18 rev 4) | tasks.md |
| Reviewer FAIL rework attempts | 9 (T-3 ×2, T-6, T-8, T-11, T-12, T-13, T-14 step 0, docs set) | execution.md task entries |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 3 (rev 3 Option B — sender/spam; rev 3.1 — first-login provisioning; rev 4 Option D — PROD account access) | execution.md — PIVOT sections |
| PRODUCT_BUGs | 2 in-spec (T-8 CT: two controls < 24 px, fixed) + 1 rollout (PROD `503` — migrations not applied by the PROD pipeline) | execution.md — T-8, PROD rollout |
| Judgment-day severe findings | 6 (all fixed in rev 2) | judgment.md |
| Validation FAIL / WARN | n/a (no `/akili-validate`; Sonar gates green at merge) | execution.md |
| Runtime interruptions | 4 worker deaths on HTTP 429 (model session limits); model rotation + one same-model Reviewer waiver | execution.md runtime notes |

## Lessons

- **KZ-changes--cognito-email-otp-login-1 — A spike that proves an external mechanism in TEST must also prove the PROD deployment path (account, permissions, pipeline) before the design commits to it.** (Product + Methodology, High)
  - Root cause: `OTP-T-1` verified Cognito `EMAIL_OTP` behaviour on the TEST pool only; `OTP-OQ-1` ("where is the PROD pool?") stayed open through two design revisions. Option B (Lambda triggers) was built and verified in TEST before discovering the PROD pool lives in an AWS account with console-only Cognito access, forcing the rev 4 pivot.
  - Evidence: execution.md — "PIVOT rev 4" (constraint) and `OTP-T-14` (Option B fully working in TEST the day before); requirements.md §11 `OTP-OQ-1`.
  - Standardization: → P1 (local) + upstream to AKILI (`/akili-specify` Full-depth rollout checklist).

- **KZ-changes--cognito-email-otp-login-2 — The PROD pipeline does not run TypeORM migrations; every rollout with a migration must include an explicit "apply and verify migrations" step, and the server guide must stop implying auto-apply.** (Product, High)
  - Root cause: `onecgiar-pr-server/CLAUDE.md` §5 states the pipeline applies migrations on deploy (true for TEST via Jenkins, false for PROD); the PROD runbook inherited that assumption, so the first PROD smoke returned `503 OTP_UPSTREAM_UNAVAILABLE` until DevOps ran `migration:run`.
  - Evidence: execution.md — "PROD rollout — first smoke" and "Root cause confirmed" (migrations table ending at `1788720000000`).
  - Standardization: → P2 (`factual-sweep` on the server guide) + P3 (`docs/specs/general-setup/design.md` rollout template line).

- **KZ-changes--cognito-email-otp-login-3 — Infrastructure contracts asserted in a Leader brief (env-var semantics, third-party response keys) must be quoted from a source line or marked unverified; two Reviewer FAILs were caused by Leader-asserted facts.** (Methodology, Medium)
  - Root cause: the T-11 brief described `MS_QUEUE_PATH` as an AMQP vhost (it is the queue name in `notification-microservice/main.ts`); the T-12/T-14 briefs assumed Cognito's `CODE_DELIVERY_DESTINATION` key and that `event.userName` carries the typed email for unknown users — all three were the Implementer's instructions, not their guesses.
  - Evidence: execution.md — `OTP-T-11` round-1 FAIL ("`MS_QUEUE_PATH` is a queue name, not a vhost"), `OTP-T-14` fix (m) "live check contradicts fix as implemented".
  - Standardization: → P4 (`.agents/leader.md`, append-only) + upstream to AKILI (`/akili-execute` §2.2 brief contents).

## Noted, not a lesson

- Model session limits (sonnet, opus, fable) killed four workers in one day; rotation worked, but a same-model Reviewer waiver had to be recorded once. Recurrence feed for a "model budget per spec" methodology rule.
- The Cypress CT gate caught two real ≥ 24 px defects that two diff Reviewers had passed — confirms `project-hitl-looks-catch-what-diff-reviews-miss`; not a new lesson.
- SonarCloud in `one-cgiar-microservices` counts spec files as new code (duplication gate) and in `onecgiar_pr` flags click-only `<div>`s as reliability bugs — release gates surfaced them late; consider a Sonar pre-check in `/akili-execute` before opening release PRs.
- Admin-created center users receive no welcome email (follow-up §13 (b)); product decision pending.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Rollout / risks section) |
| Edit | Add: "For every external system the design depends on (identity provider, cloud account, queue), the spike or Full-depth design MUST record the PROD counterpart: account, region, who holds deploy permissions, and the deploy mechanism. An open PROD-access question blocks the design decision, not the rollout." |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | `onecgiar-pr-server/CLAUDE.md` §5 (migrations) |
| Edit | Replace the claim that the pipeline applies migrations on deploy with: "TEST: Jenkins runs `migration:run` on deploy. **PROD does not** — run `npm run migration:run` in the PROD server container after deploying and verify with `SELECT name FROM migrations ORDER BY id DESC LIMIT 3`." |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Rollout section) |
| Edit | Add: "Rollout steps that include a database migration MUST list 'apply and verify the migration' as an explicit step per environment, naming the command and the verification query." |
| Severity | High |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `.agents/leader.md` (Delegation Discipline — append-only) |
| Edit | Add: "Every infrastructure or third-party contract stated in a brief (env-var meaning, message envelope, API response key) MUST cite `file:line` in a repo the worker can read, or be marked `UNVERIFIED — confirm at source before relying on it`." |
| Severity | Medium |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | root `CLAUDE.md` → "Domain-specific reference docs" table |
| Edit | Add row: `docs/auth/center-email-code-login/` — Center email-code login (PRMS-owned OTP): module reference, PROD runbook, infrastructure notes, adoption guide, diagrams. |
| Severity | Low |
| Status | pending |

### P6

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` — Architecture Overview & Decisions (ADR index) + §7 Integration Points + §8 Authentication |
| Edit | New ADR (number allocated at apply time, status `accepted`): "Center email-code login is owned by PRMS — code generated, HMAC-stored (`otp_challenges`), emailed via PRMS's notification pipeline and verified by the PRMS server; session = PRMS JWT; Cognito is not involved for this path. Issue: Cognito's default sender is spam-prone/50 per day and the PROD pool's account grants console-only access, so neither native `EMAIL_OTP` nor `CUSTOM_AUTH` triggers were viable (spec `cognito-email-otp-login` design §18–§19). Supersedes: none (extends ADR-003's `auth`-header session model)." Plus the §7/§8 rows recorded in the spec's `execution.md` (`OTP-T-9` docs half): three new public routes under `/auth/login/otp/*`, `JwtMiddleware` not mounted on `/auth/*`, allow-list parameter and guard-owned throttling. |
| Severity | Medium |
| Status | pending |

## Upstream recommendations (AKILI methodology)

- `/akili-specify` Full depth: require the PROD counterpart of every external dependency in the design's rollout section (KZ-…-1).
- `/akili-execute` §2.2 brief contents: infrastructure contracts must carry a `file:line` citation or an `UNVERIFIED` marker (KZ-…-3).
