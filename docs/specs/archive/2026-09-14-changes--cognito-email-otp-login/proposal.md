# Proposal — Email one-time-code login for CGIAR center staff outside Active Directory

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/cognito-email-otp-login/` |
| Slug | `cognito-email-otp-login` — derived from a free-text argument ("habilitar en /login un botón para usuarios de centros CGIAR con dominios fuera del AD: correo → código → sesión") |
| Type | **Change** |
| Approval Mode | pre-approved (standing mandate 2026-09-02, Juan Carlos Cadavid) — **every Cognito or PROD mutation is a HITL/infra action regardless of mode** (`docs/infrastructure.md` §Boundary rule: agents never mutate cloud) |
| Status | **approved — Option A (2026-09-11, Juan Carlos Cadavid)**; clarifications requested: microservice impact and end-user flow (answered in chat, folded into §Recommended Approach); expected population ≤ 50 center users; SES for PROD to be validated (`R-2`) |
| Owner | Juan Carlos Cadavid |
| Date | 2026-09-11 |
| Baseline | `docs/prd.md` (G4 role-based access, AC-3 backend enforces roles, "identity provisioning is upstream") · `docs/ux-ui/design.md` §6/§7/§8/§10 (login surface, tokens, a11y) · `docs/trd/trd.md` §Auth (`auth/`, `auth-microservice`, ADR-003 custom `auth` header), §Integrations (Cognito, AD) |
| Related specs | `docs/specs/auth/center-user/` (Center User role — the users this change lets in are exactly the Center Users that spec authorises) |
| Depends on | AUTH microservice — **ours**: repo `one-cgiar-microservices/auth-microservice` (local `/Users/jcadavid/Development/one-cgiar-microservices`, dev branch `dev-auth`, release branch `main-auth`, TEST at `authtest-ibd.prms.cgiar.org`) gaining two OTP endpoints (see §AUTH microservice change) · Cognito TEST pool changes (HITL) · the same changes in the PROD pool (HITL) |
| Parallel-safe | no (touches `auth/` server module, `pages/login` client, and shared identity config) |
| Evidence | Cognito TEST configuration read with the local AWS profile `IBD-DEV` on 2026-09-11 (read-only calls; secrets never printed) — see §Current State |

## Intent

Let staff of CGIAR centers whose mailboxes are **not** in the CGIAR Active Directory (today `@cifor-icraf.org`, `@icrisat.org`; more may follow) sign in to PRMS Reporting Tool from `/login` with their **work email and a one-time code sent to that email** — no password, no AD federation — and then continue with the normal PRMS session, roles and flows. Nothing that works today (CGIAR SAML via Azure AD, external users with email + password) may change.

## Problem / Current Behavior

- `/login` offers two paths (screenshot in `mockup/login-current.png`): **Continue with your CGIAR account** (Cognito hosted UI → SAML `CGIAR-AzureAD`) and **Continue as an external user** (email + password against Cognito-native users, with a first-login "new password" challenge).
- Center staff at CIFOR-ICRAF and ICRISAT are CGIAR but their tenants are not federated: the CGIAR button rejects them, and the external path forces a password lifecycle (temporary password by email, change on first login, resets) that is the wrong experience for institutional users and a support burden.
- Federating those tenants into the AD/SAML path is the strategic fix but depends on other organisations' IT and "podría tardar un tiempo".
- PRMS itself never talks to Cognito: the server (`auth/`) proxies everything to the AUTH microservice (`MS_AUTH_URL`: `/auth/login/provider`, `/auth/login/custom`, `/auth/validate/code`, `/auth/complete-new-password-challenge`, `/auth/register`), so any new sign-in method has to be threaded through that boundary or deliberately bypass it.

### Current state — Cognito TEST pool (verified 2026-09-11, `IBD-DEV`, read-only)

| Item | Value | Why it matters here |
|---|---|---|
| User pool | `us-east-1_o9y9Yq5pO` (**OST-TOC**), domain `ost-toc` (managed login v1), tags `Project=PRMS-TEST` | This is the pool behind `COGNITO_URL=https://ost-toc.auth.us-east-1.amazoncognito.com` |
| **Shared by** | 10 app clients: TOC, MARLO, Risk, Alliance, AICCRA, CSICAP, TIP TEST, general-client, "My web app", **PRMS-Reporting** | Any **pool-level** change (sign-in policy, email sender, Lambda triggers) is visible to all ten. Client-level changes are isolated to PRMS |
| Feature plan | `UserPoolTier = PLUS` | Passwordless sign-in (email OTP) is available on Essentials/Plus — no plan change needed |
| Sign-in policy | `AllowedFirstAuthFactors = [PASSWORD]` | **`EMAIL_OTP` is not enabled** — pool-level setting that must be added |
| PRMS-Reporting client | `ExplicitAuthFlows = [ALLOW_USER_AUTH, ALLOW_USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH]`, IdPs `CGIAR-AzureAD + COGNITO`, OAuth `code`, callbacks `localhost:4200`, `prtest`, `qatest`, one CloudFront host, `PreventUserExistenceErrors = ENABLED`, tokens 60 min / refresh 30 d, client secret present | `ALLOW_USER_AUTH` (the choice-based flow that carries `EMAIL_OTP`) is **already on** for PRMS; nothing to change on the client for the flow itself |
| Identity providers | `CGIAR-AzureAD` (SAML, used by PRMS), `CGIAR-Account` (SAML, other apps) | Untouched by this change |
| Username / attributes | username = `email` (case-insensitive), auto-verified `email`, required `sub`, `email`; custom `given_name`/`family_name` | OTP requires a **verified email** on the user — admin-created users get `email_verified=true` from the current register flow (to confirm in the spike) |
| Email sending | `EmailSendingAccount = COGNITO_DEFAULT` | **50 emails/day hard limit, shared by all ten apps** — fine for the TEST spike, not for real usage; moving to SES is a pool-level change |
| MFA | OFF (no email/SMS/TOTP MFA configured) | Not touched; OTP here is a *first factor*, not MFA |
| Lambda triggers | none | Option B below would add pool-level triggers |
| Admin-create only | `false` (self sign-up allowed at pool level) | PRMS never exposes sign-up; the server refuses logins for users absent from its own `users` table |
| Users | ≈ 592; sampled statuses: 19 `EXTERNAL_PROVIDER`, 32 `FORCE_CHANGE_PASSWORD`, 7 `CONFIRMED`, 2 `UNCONFIRMED`; domains include `gmail.com`, `cgiar.org`, `irri.org`, `hotmail.com` | Many external users never completed the password challenge — OTP would also rescue them. `irri.org` (a CGIAR center) already lives here as "external" |
| PROD pool | **not found in the `IBD-DEV` account** (8 pools listed, none tagged PROD) | Open question `OQ-1`: PROD pool id/account must be identified before the parity step |

## Proposed Outcome

1. `/login` shows a third path, **"Continue with your Center account"** (label lists the allowed domains, e.g. *ICRISAT · CIFOR-ICRAF*), below the CGIAR button and above/next to the external-user button. Existing two paths render and behave exactly as today.
2. Clicking it asks for the **full work email**; if the domain is in the allow-list and the user exists and is active in PRMS, the system sends a **one-time code** to that email; the user types the code; on success PRMS issues its usual JWT and the session continues like any other login (roles from `role_by_user`, Center User role from `auth/center-user`).
3. Wrong domain, unknown user, expired or wrong code produce clear, non-enumerating messages with a "resend code" path and the support contact.
4. Cognito changes are **additive and reversible**: `EMAIL_OTP` added to the pool's allowed first factors (PASSWORD stays), nothing removed, no IdP or client of the other nine apps touched. The identical change set is applied to PROD only after TEST sign-off.

## Scope

- **Cognito (TEST, then PROD — HITL/infra, runbook produced by this spec):** add `EMAIL_OTP` to `Policies.SignInPolicy.AllowedFirstAuthFactors`; confirm the PRMS-Reporting client keeps `ALLOW_USER_AUTH`; decide the email sender (keep `COGNITO_DEFAULT` for the TEST spike; SES for PROD volume — see risks); verify a pre-existing `FORCE_CHANGE_PASSWORD` user can sign in with OTP.
- **AUTH microservice (external repo, dependency):** `POST /auth/login/otp/start` (email → `InitiateAuth AuthFlow=USER_AUTH, PREFERRED_CHALLENGE=EMAIL_OTP` → session token) and `POST /auth/login/otp/verify` (session + code → `RespondToAuthChallenge EMAIL_OTP` → Cognito tokens), same response contract as `/auth/login/custom` so the PRMS server reuses its token-to-JWT path.
- **PRMS server (`auth/`):** `POST /auth/login/otp/start` and `POST /auth/login/otp/verify` controller routes; domain allow-list from a **global parameter** (`OTP_ALLOWED_EMAIL_DOMAINS`, comma-separated) so adding a center is configuration, not a release; reuse `singIn`'s local-user existence/active checks; reuse the JWT issuance used by `/login/custom`; no user auto-creation.
- **PRMS client (`pages/login`, `shared/services/api/auth.service.ts`, Cognito client service):** third button, email step, code step (6 digits, paste-friendly, resend with cooldown, expiry message), loading/error states per `design.md` §7/§8/§10; allowed-domain list read from the server so the button copy and validation never drift.
- **Docs:** TRD integrations/auth rows, `docs/infrastructure.md` env row if a new variable appears, `.cursorrules` compliance (no OTPs, sessions or tokens in logs).

## Non-Goals

- Federating CIFOR-ICRAF / ICRISAT tenants as SAML/OIDC IdPs (strategic path, separate proposal when their IT is ready).
- Changing the CGIAR SAML path, the external-user password path, MFA, password policy, token lifetimes, or any other app's client in the shared pool.
- Self sign-up: users still have to exist in PRMS (admin-created, `auth/center-user` assignment) — this change is about *how they prove identity*, not *who is let in*.
- Replacing the AUTH microservice or moving PRMS to talk to Cognito for the existing flows.
- SMS or WhatsApp codes; magic links.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Center staff at CIFOR-ICRAF, ICRISAT (and any domain later added to the allow-list) | New passwordless path; no temporary passwords |
| Existing external users (gmail, irri.org, …) | Unchanged today; a follow-up could offer them OTP too (out of scope) |
| CGIAR AD users | Unchanged |
| Platform admins | One new global parameter to maintain; user provisioning unchanged |
| Cognito OST-TOC pool (shared) | One additive sign-in factor; email sender decision (see risks) |
| AUTH microservice | Two new endpoints |
| PRMS server `auth/` · client `pages/login`, `auth.service.ts` | New routes/UI; existing routes untouched |
| Spec `auth/center-user` | Consumer: the roles these users receive |

## Visual Reference

- Source: current-state screenshot supplied by the user; **no target mockup yet**.
- Location: `docs/specs/changes/cognito-email-otp-login/mockup/login-current.png` (current `/login`: CGIAR button, "or" divider, external-user button, support link, T&C).
- Notes: the target adds one button ("Continue with your Center account · ICRISAT, CIFOR-ICRAF") plus two inline steps (email → code) in the same card, reusing the existing button/input tokens. A generated mockup (`stitch-design` or a self-contained HTML in `mockup/`) is **offered, not required** — say so at approval and `/akili-specify` will produce it before the client tasks.

## Requirement Delta Preview

### ADDED Requirements

- `/login` renders a third sign-in path for allow-listed center domains; the allow-list is server-provided configuration.
- Email → one-time code → session flow, with resend, expiry and attempt-limit handling; non-enumerating error copy (`PreventUserExistenceErrors` semantics preserved end-to-end).
- Server routes `POST /auth/login/otp/start`, `POST /auth/login/otp/verify` (JWT-less, rate-limited), reusing local-user checks and JWT issuance.
- AUTH microservice endpoints `/auth/login/otp/start`, `/auth/login/otp/verify`.
- Cognito: `EMAIL_OTP` allowed as a first factor on the pool; runbook with rollback (remove the factor) for TEST and PROD.
- Observability: `auth.otp.start|verify` events with outcome only (never the email body, code or session).

### MODIFIED Requirements

- Login page layout gains a third block; copy "Use your organization email to easily connect" is reviewed so the three paths read as one choice.
- Cognito pool sign-in policy widens from `[PASSWORD]` to `[PASSWORD, EMAIL_OTP]` (additive; other clients unaffected unless they opt in).

### REMOVED Requirements

- None.

## Approach Options

| # | Option | How | Pros | Cons |
|---|---|---|---|---|
| **A** | **Cognito native email OTP (`USER_AUTH` + `EMAIL_OTP`)** — recommended | Pool: allow `EMAIL_OTP`. Client PRMS-Reporting already has `ALLOW_USER_AUTH`. MS AUTH adds start/verify endpoints; PRMS wires routes + UI | Managed by Cognito (code generation, expiry, attempt lockout, audit); no Lambdas; tokens identical to today's so downstream JWT path is reused; additive and reversible; PLUS tier already paid | Pool-level toggle visible to the shared pool (harmless unless another client opts in); Cognito email sender = 50/day until SES; needs the MS AUTH change or the fallback |
| B | Custom auth challenge (Define/Create/Verify Lambdas) sending the code via SES or PRMS's email service | Pool: three Lambda triggers; client: `ALLOW_CUSTOM_AUTH`; MS/PRMS wire the challenge loop | Full control of email template/sender; works on any tier | Three pool-level triggers **execute for every client that uses CUSTOM_AUTH** (general-client already allows it) — highest blast radius on a shared pool; more code, more failure modes, own rate-limiting |
| C | Federate CIFOR-ICRAF and ICRISAT (Azure AD / M365) as SAML/OIDC IdPs on the pool and add them to the PRMS client | Same as today's CGIAR button, per tenant | Best long-term UX (SSO), no codes | Depends on external IT; weeks-to-months; the user explicitly wants a faster path now — keep as the strategic follow-up |
| D | PRMS-issued OTP outside Cognito (own OTP table + email service, then `AdminInitiateAuth`) | PRMS server owns the code; MS AUTH mints tokens | No Cognito change | Re-implements an identity primitive PRMS should not own (PRD: identity provisioning is upstream); weaker audit; rejected |

## AUTH microservice change (verified against `origin/dev-auth`, 2026-09-11)

The custom-password login today is `POST /auth/login/custom` → `AuthService.authenticateWithCustomPassword` → `CognitoService.loginWithCustomPassword`, which calls Cognito over raw HTTPS (`fetch` to `COGNITO_USER_POOL_URL` with `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth`, `AuthFlow: USER_PASSWORD_AUTH`, `SECRET_HASH` from `COGNITO_CLIENT_ID` + `COGNITO_CLIENT_SECRET`) and returns either `{ tokens }` or a `NEW_PASSWORD_REQUIRED` challenge `{ challengeName, session, … }`. The OTP path is the same shape with two steps:

| Layer | Change | Mirrors |
|---|---|---|
| `src/api/auth/services/cognito/cognito.service.ts` | `startEmailOtp(username)` → `InitiateAuth` with `AuthFlow: 'USER_AUTH'`, `AuthParameters: { USERNAME, SECRET_HASH, PREFERRED_CHALLENGE: 'EMAIL_OTP' }` → returns `{ challengeName: 'EMAIL_OTP', session, codeDeliveryDestination }` (masked email from `ChallengeParameters`) · `verifyEmailOtp(username, code, session)` → `RespondToAuthChallenge` (`X-Amz-Target: …RespondToAuthChallenge`, `ChallengeName: 'EMAIL_OTP'`, `ChallengeResponses: { USERNAME, EMAIL_OTP_CODE, SECRET_HASH }`, `Session`) → returns `AuthenticationResult` | `loginWithCustomPassword` (lines 49–122) and `completeNewPasswordChallenge` (123–169): same headers, same secret hash, same error mapping |
| `src/api/auth/auth.service.ts` | `startEmailOtp(dto)` / `verifyEmailOtp(dto)` orchestration; the verify branch maps `AuthenticationResult` to the same `{ tokens: { accessToken, idToken, refreshToken, expiresIn, tokenType } }` object `authenticateWithCustomPassword` returns, so PRMS reuses its token → JWT step | `authenticateWithCustomPassword` (≈ lines 166–200) |
| `src/api/auth/auth.controller.ts` | `@Post('login/otp/start')`, `@Post('login/otp/verify')` with Swagger, same guards/interceptors as `login/custom` | `login/custom` (line 65), `/complete-new-password-challenge` (403) |
| `src/api/auth/dto/` | `EmailOtpStartDto { username }`, `EmailOtpVerifyDto { username, code, session }` | `custom-auth.dto.ts`, `new-password-challenge.dto.ts` |
| Tests | `cognito.service.spec.ts` (payload/header assertions incl. `PREFERRED_CHALLENGE` and `EMAIL_OTP_CODE`; error paths `CodeMismatchException`, `ExpiredCodeException`, `NotAuthorizedException`), `auth.controller.spec.ts` | existing spec style (`fetch` mocked, `calculateSecretHash` spied) |
| Env | **none new** — reuses `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, `COGNITO_USER_POOL_URL` (`OQ-6`) | — |
| Logs | outcome only (`otp.start ok/denied`, `otp.verify ok/mismatch/expired`); never the code, session, or tokens (the existing `Authorization code validated successfully: ${tokens}` log line is a pre-existing smell to fix in passing) | `.cursorrules` |

Branch flow: work on `dev-auth`, deploy TEST (`authtest-ibd.prms.cgiar.org`) for the PRMS TEST HITL, promote to `main-auth` for PROD together with the PROD Cognito change.

## Recommended Approach

**Option A**, as the smallest safe path: it needs one additive Cognito setting, zero Lambdas, no change to the nine sibling clients, and reuses the PRMS-Reporting client flow that is already enabled. Threading the two calls through the **AUTH microservice** keeps one identity boundary (as today), and the microservice is ours (`OQ-2` resolved), so the direct-SDK fallback is dropped from the plan.

Sequencing that respects "no tocar lo que funciona": (1) TEST spike on the pool — enable `EMAIL_OTP`, run `InitiateAuth`/`RespondToAuthChallenge` against a test user in `FORCE_CHANGE_PASSWORD` and one `CONFIRMED`, measure email delivery; (2) AUTH microservice endpoints on `dev-auth`, deployed to `authtest-ibd`; (3) PRMS server + client behind the allow-list (empty list = feature invisible); (4) HITL in TEST with a CIFOR-ICRAF/ICRISAT user; (5) PROD runbook: identical pool change + allow-list value, with rollback = remove `EMAIL_OTP` and empty the parameter.

## Risks, Dependencies, And Open Questions

| # | Risk / question | Mitigation |
|---|---|---|
| R-1 | **Shared pool** — pool-level settings reach ten apps | Only additive changes (allow a factor; never remove PASSWORD, never touch IdPs/triggers); change window agreed with the pool owner; rollback documented |
| R-2 | **Cognito default email sender = 50/day, shared** — user estimate: fewer than 50 center users in total, so daily OTP volume is low, but the quota is shared with the other nine apps' Cognito emails and with resends | TEST spike within the quota; PROD: validate whether SES is needed (`DEVELOPER` sender) (`EmailSendingAccount=DEVELOPER`, verified sender) — a pool-level sender change that affects every app's Cognito emails → coordinate, or scope SES per-pool only if PROD is a PRMS-only pool (`OQ-1`) |
| R-3 | Users in `FORCE_CHANGE_PASSWORD` / unverified email may be refused by `EMAIL_OTP` | Spike verifies; if refused, register flow sets `email_verified=true` and the admin path pre-confirms center users |
| R-4 | User enumeration via the OTP start endpoint | Keep `PreventUserExistenceErrors`; PRMS returns the same "if the account exists, a code was sent" for unknown/inactive/foreign-domain; rate-limit per IP/email |
| R-5 | Brute force on codes | Cognito limits attempts per session and expires codes; PRMS adds a cooldown on resend |
| R-6 | Allow-list drift between button copy and validation | Single source: server global parameter, exposed read-only to the client |
| R-7 | Copy `is_cgiar` semantics — center users are CGIAR but not in AD | They stay `is_cgiar=false` (Member/Center User roles), consistent with how `irri.org` users exist today; document in `auth/center-user` |
| OQ-1 | **Which pool/account serves PROD?** Not in `IBD-DEV` | Identify before specify's rollout task; parity step is blocked without it |
| OQ-2 | ~~Who owns the AUTH microservice?~~ **Resolved 2026-09-11:** it is ours (`one-cgiar-microservices/auth-microservice`, `dev-auth` → `main-auth`, TEST `authtest-ibd.prms.cgiar.org`). Option A goes through the microservice; the direct-SDK fallback is no longer needed | — |
| OQ-6 | The microservice's custom-password flow uses **one** Cognito client per deployment (`COGNITO_CLIENT_ID`/`COGNITO_CLIENT_SECRET` from env). Confirm the TEST instance's `COGNITO_CLIENT_ID` is the `PRMS-Reporting` client (`u0fum2…`), which already allows `ALLOW_USER_AUTH`; if it points at another client, that client needs `ALLOW_USER_AUTH` added (client-level, isolated) | Check the TEST deployment env by name only; never print the secret |
| OQ-3 | Initial allow-list: `cifor-icraf.org`, `icrisat.org` only? Sub-domains? | Confirm with PRMS support; parameter is editable anyway |
| OQ-4 | Should existing external users (gmail, irri.org) get the OTP path too? | Out of scope now; natural follow-up |
| OQ-5 | Managed login v1 vs v2 — the hosted UI is not used by this flow, so no upgrade needed; confirm nobody plans a v2 migration in the same window | Coordination note |

Kaizen: no `docs/specs/kaizen-log.md` Active Lessons apply (file absent).

## Success Criteria

- A CIFOR-ICRAF or ICRISAT user provisioned in PRMS signs in from `/login` with email + emailed code in under 60 s, lands with the roles `auth/center-user` assigned, and the JWT/`auth` header behaves exactly as for the other two paths.
- CGIAR SAML login and external email + password login pass their existing tests unchanged; no other app on the OST-TOC pool changes behaviour (their clients' `ExplicitAuthFlows`/IdPs untouched, verified before/after).
- Unknown or foreign-domain emails receive the same neutral response; wrong/expired codes are rejected with a resend path; nothing sensitive appears in logs (`.cursorrules`).
- TEST and PROD pools end with the same additive settings; rollback = remove `EMAIL_OTP` + empty allow-list, verified in TEST.

## Next Step

```text
/akili-specify changes/cognito-email-otp-login
```

Standard depth (Change track). Specify should open with the TEST Cognito spike task (fixture-first: real `InitiateAuth`/`RespondToAuthChallenge` responses captured), then MS AUTH contract, then PRMS server, client, docs and the TEST→PROD runbook; `OQ-1`/`OQ-2` must be answered before the rollout task is written.
