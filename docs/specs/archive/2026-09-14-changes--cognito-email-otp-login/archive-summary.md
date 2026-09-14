# Archive Summary — `changes/cognito-email-otp-login`

## Document Control

| Field | Value |
|---|---|
| Original spec path | `docs/specs/archive/2026-09-14-changes--cognito-email-otp-login/` |
| Archive path | `docs/specs/archive/2026-09-14-changes--cognito-email-otp-login/` |
| Archive date | 2026-09-14 |
| Approval mode | pre-approved (standing mandate 2026-09-02); every pivot and cloud step confirmed by the user |
| Branch at archive | `qa-development-2026` (spec branch; default `master`) — shared-file syncs recorded as pending |
| Final status | **Shipped to PROD 2026-09-12** (release PR `onecgiar_pr#752`), spec 18/18 tasks done |

## Outcome in one paragraph

CGIAR center staff outside Active Directory (`@cifor-icraf.org`, `@icrisat.org`) sign in to PRMS with a 6-digit code emailed by PRMS itself; the first login creates the user with the guest role. The delivered design (**Option D, rev 4**) keeps Cognito untouched: PRMS generates, stores (HMAC-only), emails, verifies and consumes the code and issues its own JWT. Two earlier mechanisms were built, verified in TEST and retired: Cognito's native `EMAIL_OTP` (spam-prone default sender, 50/day quota) and Cognito `CUSTOM_AUTH` Lambda triggers (blocked because the PROD pool lives in an AWS account with console-only access). The TEST Cognito pool was restored to its original state; no Cognito, Lambda or SES change exists in PROD.

## Requirements delivered

| Group | Status |
|---|---|
| `OTP-R-1..14` (login path, allow-list, neutral responses, throttling, session parity, UI states, log hygiene, provisioning, contracts) | Delivered; `OTP-R-3`/`R-4`/`R-5`/`R-7`/`R-13` modified by revs 3.1/4 and delivered in their final form |
| `OTP-R-20..23` (UI a11y/responsive) | Delivered (Cypress CT 1536/840/375) |
| `OTP-R-30/31` (externals on the code path, PROD sender) | Out of scope / superseded by D (sender = PRMS's own) |
| `OTP-R-32..35` (email from PRMS, trigger isolation, code policy, delivery observability) | Delivered in the PRMS-owned form (trigger clauses retired) |
| `OTP-R-36..38` (inactive users neutral, PRMS owns the lifecycle, session without Cognito tokens) | Delivered |
| Acceptance `OTP-AC-1..24` | AC-1..16 met (unit/CT/HITL); AC-17..19 met in TEST for the retired Option B; AC-20..24 met for Option D (TEST HITL, DB evidence, PROD smoke) |

## Files changed (from `execution.md`)

| Repo / area | Summary |
|---|---|
| `onecgiar-pr-server` | `auth/auth.service.ts` (`startOtp`/`verifyOtp`, decoys, provisioning), `auth/otp/*` (challenge entity/service, email template), `auth/guards/otp-throttler.guard.ts`, `auth/dto/otp-*.dto.ts`, `auth/utils/otp-shared.util.ts`, `auth/modules/user/user.service.ts` (T-17 skip Cognito for center domains), modules wiring, migrations `1788730000000-OTP-allowed-email-domains`, `1788740000000-OTP-challenges`; `src/CLAUDE.md`/`AGENTS.md` auth lines |
| `onecgiar-pr-client` | `pages/login/login.component.*` (Center block, one-active-path), `pages/login/components/center-otp-panel/*`, `shared/services/cognito.service.ts`, `api/auth.service.ts`, `login.component.cy.ts`, pre-change DOM snapshots |
| `one-cgiar-microservices` (`dev-auth`) | OTP routes, `CognitoService` CUSTOM_AUTH variant, `OtpHttpExceptionFilter`, `LoggingInterceptor` redaction, `PASSWORDLESS_DOMAINS`, `cognito-triggers/` package — **all unused by PRMS since rev 4** (kept as reference; README banner); PR #43 to `main-auth` closed |
| Docs | `docs/auth/center-email-code-login/` (README, PROD runbook, infrastructure notes, adoption guide, Planning brief, diagrams) |
| Data | `global_parameters.OTP_ALLOWED_EMAIL_DOMAINS` set on TEST and PROD |

≈ 40 source files across server and client; 105 commits touching the spec folder.

## Test evidence

| Layer | Evidence |
|---|---|
| Server Jest | auth suites green at every task; final 12 suites / 215 tests (`src/auth`) |
| Client Jest | login/panel/services green; 284 tests in the touched modules at the a11y fix |
| Cypress CT | `login.component.cy.ts` 12/12 at 1536/840/375 (caught two real ≥ 24 px defects, fixed in-spec) |
| HITL TEST | user: code received in inbox from "PRMS Reporting Tool", wrong/right codes, first-login guest provisioning (DB: user 1157, role 2) — later deleted |
| PROD | user: end-to-end test passed after applying the migrations; Leader external smoke `start` 200 / disallowed 400 |
| `test-report.md` / `validation-report.md` | **Absent — accepted** (pre-approved mode); the per-task Reviewer verdicts, CT summaries and HITL records in `execution.md` stand as the evidence |

## Validation summary

No `/akili-validate` run. Reviewer rounds: every task PASSed before commit (author ≠ auditor; two rounds with a same-model waiver recorded during the 429 window). SonarCloud gates green on all merged PRs (microservice #38–#42, #44; PRMS #752 after fixing 5 non-OTP a11y bugs).

## Accepted warnings and follow-ups

| # | Item | Where recorded |
|---|---|---|
| 1 | Account-created email for admin-created center users (they receive no welcome mail) | `design.md` §13 (b) |
| 2 | `/login` support link 15 px tall (pre-existing a11y gap) | §13 (j) |
| 3 | Sonar counts spec files as new code in `one-cgiar-microservices` | §13 (k) |
| 4 | Residual decoy statistics (trailing bits done; SUF vs EUF note) | §13 (l), T-14 fix (l) |
| 5 | Inactive-vs-unknown code oracle at `verify` (accepted, tiny admin-controlled set) | §18.5 note |
| 6 | Planning tool adoption / future extraction to the AUTH microservice | `docs/auth/center-email-code-login/planning-tool-adoption.md`, `design.md` §19.5 |
| 7 | Pending default-branch syncs: TRD rows/ADR, root guide index row for `docs/auth/`, `onecgiar-pr-server/CLAUDE.md` §5 migration wording | kaizen entry `## Pending Items` |

## Historical notes

- **Rev 1 → 2 (judgment day):** decoy sessions, `needsRoles` relation, runbook `update-user-pool` danger, counter-before-lookup.
- **Rev 3 (2026-09-11):** pivot to Option B (Cognito `CUSTOM_AUTH` triggers, code emailed by PRMS's pipeline) because Cognito's default sender landed in spam and is capped at 50/day.
- **Rev 3.1:** first-login auto-provisioning (product rule).
- **Rev 4 (2026-09-12):** pivot to Option D (PRMS-owned code) because the PROD Cognito pool sits in an account with console-only access; nothing in PRMS consumes Cognito tokens. TEST pool restored; Lambda stack deleted.
- **PROD (2026-09-12):** first smoke failed with `503` — the PROD pipeline does not run TypeORM migrations; applied manually, then green.
- Model rate limits (sonnet/opus/fable) interrupted workers four times; rotation and one same-model Reviewer waiver recorded in `execution.md`.
