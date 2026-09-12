# Requirements — Email one-time-code login for CGIAR center staff outside Active Directory

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/cognito-email-otp-login/` |
| Module code | `OTP` |
| Type | Change · Depth: **Full** (auth surface, two repositories, shared identity configuration in TEST and PROD) |
| Approval Mode | pre-approved (standing mandate 2026-09-02; inherited from `proposal.md`). Phase 1 gate: `auto-approved (pre-approved mode)`. **Every Cognito/PROD mutation stays HITL** |
| Status | approved (rev 1.1, 2026-09-11 — wording aligned after design judgment-day, see `judgment.md`) |
| Owner | Juan Carlos Cadavid |
| Date | 2026-09-11 |
| Baseline | `docs/prd.md` (G4 role-based access; AC-3 backend enforces roles; AC-8 observability; AC-9 secrets; "identity provisioning is upstream") · `docs/ux-ui/design.md` §6 flows (login), §7 tokens, §8 components, §9 responsive, §10 a11y · `docs/trd/trd.md` §Auth (`auth/`, `auth-microservice`), §Integrations (Cognito, AD), ADR-003 (custom `auth` header) |
| Extends | `docs/specs/auth/center-user/` (Center User role — the population this change lets in) |
| Intent source | `proposal.md` (approved 2026-09-11, Option A) · user clarifications 2026-09-11 (≤ 50 center users expected; SES for PROD to validate) |
| Visual reference | `mockup/login-current.png` (current `/login`); target mockup produced in Phase 2 |
| External repo | `one-cgiar-microservices/auth-microservice` — branches `dev-auth` → `main-auth`, TEST `authtest-ibd.prms.cgiar.org` |

## Executive Summary

PRMS `/login` gains a third path for staff of CGIAR centers whose mailboxes are outside the CGIAR Active Directory (initially `@cifor-icraf.org`, `@icrisat.org`): the user enters their work email, receives a one-time code by email, types it, and lands in the normal PRMS session with their assigned roles. The code is generated, delivered and verified by Amazon Cognito's native passwordless factor (`EMAIL_OTP` under the `USER_AUTH` flow) through the existing AUTH microservice, so PRMS keeps a single identity boundary. Cognito changes are additive and reversible (allow one more first factor; nothing removed; no other application in the shared pool touched) and are applied first in TEST, then identically in PROD. The two existing paths — CGIAR SAML and external email + password — do not change.

## Glossary

| Term | Meaning |
|---|---|
| Center path | The new `/login` option "Continue with your Center account" and its email → code steps |
| OTP | One-time code sent by Cognito to the user's email (`EMAIL_OTP` challenge); single-use, time-limited |
| Session token | Opaque Cognito `Session` string returned by `InitiateAuth` that binds the code to one sign-in attempt |
| Allow-list | Comma-separated set of email domains permitted on the Center path; a PRMS global parameter |
| AUTH microservice | `one-cgiar-microservices/auth-microservice`, the only component that calls Cognito (`MS_AUTH_URL`) |
| Shared pool | Cognito user pool `us-east-1_o9y9Yq5pO` (OST-TOC, TEST) used by ten applications; PROD pool to be identified (`OTP-OQ-1`) |
| Neutral response | A reply that is identical whether or not the email belongs to a known user (no account enumeration) |

## 1. Module / Feature

- **Module:** `auth` (server `auth/`, client `pages/login`, `shared/services/cognito.service.ts`, `shared/services/api/auth.service.ts`) + AUTH microservice
- **Sub-feature:** Email one-time-code sign-in for allow-listed center domains
- **Owner:** Juan Carlos Cadavid
- **Status:** approved
- **Ticket(s):** to be assigned

## 2. Context

Center staff at CIFOR-ICRAF and ICRISAT are CGIAR but their tenants are not federated into the `CGIAR-AzureAD` SAML provider, so the CGIAR button rejects them and the external path forces a password lifecycle designed for non-CGIAR guests. Federation is the strategic fix but depends on other organisations' IT. Meanwhile Cognito already offers a passwordless email factor on the pool's feature plan (PLUS) and the PRMS app client already allows the `USER_AUTH` flow; the pool simply does not list `EMAIL_OTP` among its allowed first factors, and neither the AUTH microservice nor PRMS exposes the two calls that drive it.

Flows touched (`docs/ux-ui/design.md` §6): the login flow only. Surfaces: `pages/login` (client), `auth/` controller + service (server), `auth-microservice` (`/auth/login/otp/*`), Cognito pool sign-in policy (TEST, PROD).

## 3. In Scope / Out of Scope

### In scope

- Third `/login` path with email and code steps, states, copy, a11y and responsive behaviour.
- PRMS server routes `POST auth/login/otp/start` and `POST auth/login/otp/verify`; allow-list global parameter; neutral responses; rate limiting; JWT issuance reused from the password path.
- AUTH microservice endpoints `POST /auth/login/otp/start` and `POST /auth/login/otp/verify` mirroring `/auth/login/custom`.
- Cognito runbook: TEST spike, additive pool change, verification before/after, rollback, PROD parity.
- Observability events; documentation (TRD auth rows, infrastructure env row if any, microservice README).

### Out of scope

- SAML/OIDC federation of CIFOR-ICRAF or ICRISAT tenants; MFA; password-policy or token-lifetime changes; managed-login v2 migration.
- Self sign-up or auto-creation of PRMS users; changes to user provisioning or to `auth/center-user` role rules.
- Offering the code path to existing external (gmail, irri.org) users (`OTP-R-30`, MAY).
- Any change to the other nine applications' Cognito clients or to the SAML identity providers.
- Moving the pool's email sender to SES is a **decision recorded in design**, executed only if `OTP-OQ-8` says so — not a default of this spec.

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center staff (CIFOR-ICRAF, ICRISAT, later domains) | Sign in with email + emailed code; no temporary password, no password reset |
| CGIAR AD users | Nothing |
| Existing external users | Nothing (their password path is untouched) |
| Platform admin | Maintains one global parameter (allowed domains); provisions center users exactly as today |
| PRMS support | New neutral error copy to recognise; a runbook for "code not received" |
| Pool owner (IBD) | Approves one additive Cognito change per environment |

## 5. User Stories

- **`OTP-US-1`** — As a center staff member without a CGIAR AD account, I want to sign in with my work email and a code sent to it, so that I can report without managing a PRMS password. (Refines G4)
- **`OTP-US-2`** — As a platform admin, I want the allowed center domains to be configuration, so that adding a center does not need a release. (Refines G4)
- **`OTP-US-3`** — As the pool owner, I want the Cognito change to be additive, verified and reversible, so that the other nine applications keep working unchanged.
- **`OTP-US-4`** — As PRMS support, I want unknown or foreign emails to get the same neutral message, so that the login page cannot be used to discover who has an account. (Refines AC-9)

## 6. Functional Requirements

### Required (MUST)

- **`OTP-R-1` Login page path.** When the allow-list is non-empty, `/login` MUST render a third path **"Continue with your Center account"** whose helper text names the allowed centers (derived from the allow-list, e.g. "ICRISAT · CIFOR-ICRAF"), placed after the CGIAR button and before the external-user block; the two existing paths MUST render and behave exactly as today. When the allow-list is empty, the third path MUST NOT render.
- **`OTP-R-2` Email step.** Choosing the Center path MUST show an email field and a **Send code** action. The client MUST validate email syntax and that the domain is in the allow-list before calling the server; a domain outside the list MUST show an inline message pointing to the CGIAR or external path and the support contact, and MUST NOT call the server.
- **`OTP-R-3` Start: server decides, replies neutrally.** `POST auth/login/otp/start` MUST accept `{ email }`, normalise it (trim, lower-case), and start the code only when the domain is allow-listed **and** the user exists and is active in PRMS. Whether or not those conditions hold, the HTTP response MUST be a **byte-identical** neutral `200` ("If this account exists, a code was sent") carrying an opaque `session` and a masked destination — a real provider session when a code was started, an indistinguishable server-signed decoy otherwise — **except** when the domain is not allow-listed (`400` with the domain message, since the client already knows the list). Rate limiting MUST be applied before any user lookup so that limits behave identically for known and unknown emails. The server MUST NOT create users.
- **`OTP-R-4` Code step.** After a successful start, the client MUST show a code field (digits only, paste-friendly, autofocus), the masked destination email if provided, a **Verify** action, a **Resend code** action with a visible cooldown, and a way back to the email step. `POST auth/login/otp/verify` MUST accept `{ email, code, session }`; wrong, expired, or already-used codes MUST produce distinct user-facing messages ("code incorrect", "code expired — request a new one") without revealing account existence — an unknown account's decoy session MUST answer exactly as a real session with a wrong code does; after the provider's attempt limit the client MUST require a new code.
- **`OTP-R-5` Session parity.** On a successful verify, PRMS MUST issue exactly the same JWT and user payload the password path issues (`auth` header, user, roles from `role_by_user`), store them the same way, and redirect to the pending URL or home. The Center User role from `auth/center-user` MUST take effect with no extra step.
- **`OTP-R-6` Server contract and validation.** Both routes are unauthenticated (they live under `/auth/*`, which carries no JWT middleware), validated by DTOs (`email` format ≤ 254 chars; `code` 4–10 digits; `session` non-empty string ≤ 4 KB), whitelisted (`forbidNonWhitelisted`), and rate-limited per normalised email (fallback: client IP) — start: ≤ 5 / 15 min; verify: ≤ 10 / 15 min — counted before any user lookup. Limit exceeded MUST return `429` with the neutral copy (never the framework's raw throttling body). Limits are best-effort per instance; the provider's code attempt and expiry limits are the backstop.
- **`OTP-R-7` Microservice contract.** The AUTH microservice MUST expose `POST /auth/login/otp/start` (`{ username }` → `{ challengeName: 'EMAIL_OTP', session, codeDeliveryDestination? }`) and `POST /auth/login/otp/verify` (`{ username, code, session }` → `{ tokens: { accessToken, idToken, refreshToken, expiresIn, tokenType } }`) using the same Cognito app client, secret hash and error mapping as `/auth/login/custom`; Cognito error names (`CodeMismatchException`, `ExpiredCodeException`, `NotAuthorizedException`, `TooManyFailedAttemptsException`) and any unsupported challenge (`NEW_PASSWORD_REQUIRED`, MFA) MUST be mapped to stable microservice error codes (incl. `CHALLENGE_NOT_SUPPORTED`) and MUST NOT leak raw Cognito messages to PRMS users. A `SELECT_CHALLENGE` reply MUST be answered with `EMAIL_OTP` using the session it came with.
- **`OTP-R-8` Cognito change is additive, verified, reversible.** The pool's allowed first factors MUST become `[PASSWORD, EMAIL_OTP]` (PASSWORD kept). The PRMS app client MUST keep `ALLOW_USER_AUTH` (already present); no identity provider, no other app client, no Lambda trigger, no MFA setting and no password policy MAY change. Before and after each change a read-only export of the pool and all app clients MUST be captured and diffed; the diff MUST show only the intended field. Rollback MUST be documented and verified in TEST (remove `EMAIL_OTP`; empty the allow-list).
- **`OTP-R-9` Allow-list as configuration.** The allowed domains MUST live in a PRMS global parameter (`OTP_ALLOWED_EMAIL_DOMAINS`, comma-separated, lower-case, no `@`), read by the server on each request (or cached ≤ 60 s) and exposed read-only to the client via `GET auth/login/otp/config` → `{ domains: string[] }`. Button copy and validation MUST derive from that single value.
- **`OTP-R-10` Existing paths unchanged.** CGIAR SAML login, external email + password login, the `NEW_PASSWORD_REQUIRED` challenge, token validation and refresh MUST pass their existing tests unchanged; their routes, DTOs and copy MUST NOT be modified by this spec.
- **`OTP-R-11` Security.** Codes are single-use and time-limited by the provider; PRMS and the microservice MUST NOT log the code, the session token, tokens, or the email body; PRMS logs MAY carry the email domain (never the full address) at info level for the `auth.otp.*` events; responses MUST NOT expose Cognito hostnames, client ids or env names (AC-9, `.cursorrules`).
- **`OTP-R-12` Observability.** The server MUST emit `auth.otp.start { domain, outcome: sent | denied_domain | denied_user | rate_limited | upstream_error | internal_error, durationMs }` and `auth.otp.verify { domain, outcome: ok | mismatch | expired | attempts_exceeded | not_authorized | upstream_error | internal_error, durationMs }`; the microservice MUST emit `otp.start` / `otp.verify` with outcome only (AC-8).
- **`OTP-R-13` Provisioning unchanged, precondition explicit.** Center users MUST be provisioned exactly as today (admin creates the PRMS user; PRMS registers the Cognito user via `/auth/register` with a verified email). The Center path MUST NOT create or activate users; the TEST spike MUST confirm that a Cognito user still in `FORCE_CHANGE_PASSWORD` can sign in with a code; if not, the provisioning adjustment in `design.md` §13 (permanent password set at registration so center users land `CONFIRMED`) MUST be executed as the conditional task before rollout.
- **`OTP-R-14` UI states, responsive, a11y.** The Center path MUST render distinct states: **choose** (button), **email** (idle / invalid domain / sending), **code** (idle / verifying / wrong / expired / resend-cooldown / attempts-exceeded), **error** (upstream unavailable, with the support contact). At 375 px CSS the card MUST NOT overflow horizontally; fields and buttons MUST be keyboard-operable, labelled, and announce state changes through a live region (`design.md` §9, §10).

### Should (SHOULD)

- **`OTP-R-20`** Resend SHOULD be disabled for 30 s after each send and SHOULD start a fresh session (old code invalid).
- **`OTP-R-21`** The code step SHOULD show the masked destination the provider returns (e.g. `j***@icrisat.org`) so the user knows where to look.
- **`OTP-R-22`** A successful Center login SHOULD honour the same pending-redirect behaviour as the other paths.
- **`OTP-R-23`** The email field SHOULD remember the last value within the page session so a "back" from the code step does not lose it.

### Could / Nice-to-have (MAY)

- **`OTP-R-30`** The Center path MAY later be offered to existing external users (gmail, irri.org) — separate proposal.
- **`OTP-R-31`** The pool's email sender MAY move to SES (`DEVELOPER`) if `OTP-OQ-8` concludes the default quota is insufficient for PROD.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Performance | `start` p95 ≤ 2 s and `verify` p95 ≤ 2 s end-to-end from PRMS (Cognito calls are single round-trips); code email delivered within 60 s in the TEST HITL |
| Availability | Failure of the code path MUST NOT affect the other two login paths (separate routes, no shared state); upstream failure returns a clear error state with the support contact |
| Security | Unauthenticated routes rate-limited (`OTP-R-6`); neutral responses (`OTP-R-3`); no secrets, codes, sessions or tokens in logs or responses (`OTP-R-11`); single Cognito client and secret already in the microservice env; no new secrets in PRMS |
| Privacy | Full email never logged; masked destination only in the UI |
| Backwards compatibility | Additive routes and UI; Cognito change additive; no DB migration (global parameter row inserted by seed/migration data only); other pool tenants unaffected (`OTP-R-8`) |
| Accessibility | WCAG 2.1 AA: labelled inputs, focus order button → email → send → code → verify/resend, `aria-live` for state messages, contrast ≥ 4.5:1 (`docs/ux-ui/design.md` §10) |
| Responsiveness | No horizontal overflow at 375 px; controls ≥ 24 px tall (§9) |
| Observability | Events per `OTP-R-12`; runbook entry "code not received" for support |
| Rollout | TEST first (spike → HITL); PROD only after TEST sign-off with the identical Cognito diff; rollback rehearsed in TEST |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `OTP-AC-1` | Allow-list `cifor-icraf.org,icrisat.org` | `/login` renders | Three paths; Center button helper names ICRISAT and CIFOR-ICRAF; CGIAR and external blocks identical to the pre-change DOM |
| `OTP-AC-2` | Allow-list empty | `/login` renders | Only the two existing paths; no Center button |
| `OTP-AC-3` | Center path, email `someone@gmail.com` | **Send code** | Inline domain message; no request to the server |
| `OTP-AC-4` | Email `user@icrisat.org`, user exists and active in PRMS and Cognito | **Send code** | `200` neutral message + `session`; the user receives one code email; UI moves to the code step |
| `OTP-AC-5` | Email `nobody@icrisat.org` (not a PRMS user) | **Send code** | `200` body **byte-identical in shape** to AC-4 (decoy `session`, masked destination); no microservice call; `auth.otp.start outcome=denied_user`; the UI moves to the code step; any code then yields `401 OTP_CODE_MISMATCH` (same as a wrong code on a real session; an expired decoy → `401 OTP_NOT_AUTHORIZED`) |
| `OTP-AC-6` | Valid session, correct code | **Verify** | `200` with the same JWT/user payload shape as `/auth/login/custom`; redirect to home or pending URL; roles applied |
| `OTP-AC-7` | Valid session, wrong code | **Verify** | "Code incorrect" message; session still usable until the provider's attempt limit; after the limit → "request a new code" |
| `OTP-AC-8` | Code older than the provider expiry | **Verify** | "Code expired" message; **Resend** available |
| `OTP-AC-9` | Six `start` calls for one email within 15 min — once with a known user, once with an unknown one | Sixth call | `429` with neutral copy in **both** cases; `outcome=rate_limited` |
| `OTP-AC-10` | Microservice unavailable | **Send code** | Error state with the support contact; `outcome=upstream_error`; no stack or hostname in the body |
| `OTP-AC-11` | Pool exported before and after the TEST change | Diff | Only `Policies.SignInPolicy.AllowedFirstAuthFactors` changed (`+EMAIL_OTP`); all app clients, IdPs, MFA, Lambda config identical |
| `OTP-AC-12` | Cognito user in `FORCE_CHANGE_PASSWORD` with verified email | Center path | **Spike result: refused** (`SELECT_CHALLENGE` without `EMAIL_OTP`). Therefore: a center user provisioned through the adjusted `/auth/register` (no temporary password) lands `CONFIRMED` and signs in with a code (`OTP-T-10`) |
| `OTP-AC-13` | Existing test suites for SAML, password, challenge, validate, refresh | Run | Green and unmodified |
| `OTP-AC-14` | Any log line from start/verify (server and microservice) | Inspected | No code, session, token, full email, hostname or env name |
| `OTP-AC-15` | Center path mounted at 375 px with the code step and an error message | CT measures | No horizontal document overflow; controls ≥ 24 px; live region announces the message |
| `OTP-AC-16` | PROD pool exported before and after | Diff | Identical single-field change to TEST; rollback procedure documented and rehearsed in TEST |

Cross-cutting project ACs that apply without restating: `AC-3`, `AC-8`, `AC-9`.

### Scenarios (key requirements)

#### Requirement `OTP-R-3` — Start with neutral response
- GIVEN the allow-list contains `icrisat.org` and a PRMS user `a@icrisat.org` is active
- WHEN `POST auth/login/otp/start` receives `{ email: " A@ICRISAT.ORG " }`
- THEN the email is normalised to `a@icrisat.org`, the microservice `otp/start` is called once, and the reply is `200` with the neutral message and a `session`
- AND `auth.otp.start { domain: 'icrisat.org', outcome: 'sent' }` is emitted
- BUT for `unknown@icrisat.org` the reply must be the same `200` body shape (decoy `session`, masked destination), with no microservice call, and the sixth call must be `429` exactly as for a known user
- AND IT MUST return `400` only for a domain outside the allow-list, and MUST never create a PRMS or Cognito user.

#### Requirement `OTP-R-4` — Verify and failure copy
- GIVEN a session from a successful start and the code delivered to the user
- WHEN the user submits the correct code
- THEN `verify` returns the PRMS JWT and the UI redirects like the password path
- AND a wrong code yields "code incorrect" while the session remains valid
- BUT an expired or already-used code must yield "code expired — request a new one" and must NOT be retried against Cognito by the client
- AND IT MUST offer **Resend** (new session) after any expiry or attempt-limit message.

#### Requirement `OTP-R-8` — Additive Cognito change
- GIVEN a read-only export of the pool and its ten app clients before the change
- WHEN `EMAIL_OTP` is added to the allowed first factors
- THEN the after-export differs only in that field and `PASSWORD` remains
- AND the PRMS app client still lists `ALLOW_USER_AUTH`
- BUT no other app client, identity provider, Lambda trigger, MFA or password setting may differ
- AND IT MUST be reversible: removing `EMAIL_OTP` restores the before-export byte-for-byte (timestamps excluded).

#### Requirement `OTP-R-10` — Existing paths unchanged
- GIVEN the current SAML and password login test suites (client and server) and the microservice's `login/custom`, `complete-new-password-challenge`, `validate-token`, `refresh` tests
- WHEN the spec's changes land
- THEN all of them pass without edits
- BUT no existing route, DTO, copy or client method of those paths may be modified
- AND IT MUST be verified by diff: the only files touched on those surfaces are additions.

## 9. Defect classes and gates

| Defect class | Gate that catches it | Input that makes it fail |
|---|---|---|
| Allow-list or existence check bypassed (code sent to unknown/foreign user) | Server Jest on `start`: unknown user → no microservice call; foreign domain → 400 | Remove the local-user lookup → `denied_user` case calls the mock → fails |
| Enumeration via differing responses | Server Jest: body **keys, types and status** for known vs unknown user deep-equal (values of `session`/`destination` differ, shapes do not); 6th call → 429 for both; timing not asserted (accepted risk) | Return `404` for unknown, omit `session` for unknown, or skip the counter for unknown → fails |
| Microservice payload wrong (`AuthFlow`, `PREFERRED_CHALLENGE`, `ChallengeName`, `EMAIL_OTP_CODE`, `SECRET_HASH`) | Microservice Jest asserting the exact `fetch` body/headers per call (existing spec style) | Send `ChallengeName: 'SMS_MFA'` → assertion fails |
| Cognito error leaked or mis-mapped | Microservice Jest: each Cognito error name → stable code; server Jest: body contains no `cognito`, hostname, client id | Pass `error.message` through → fails |
| Token → JWT drift between password and code paths | Server Jest: `verify` result deep-equals the `login/custom` result (`{ valid, token, user, auth_tokens }`) for the same mocked tokens and the same fixture user loaded with `obj_role_by_user`; a user without roles yields the same `403 needsRoles` on both | Omit `user` or the relation → `403` on one path only → fails |
| Rate limit missing or ordered after the lookup | Server Jest: 6th `start` → 429 for a known **and** an unknown email | Remove the guard → 200 → fails; count after the lookup → unknown stays 200 → fails |
| Secrets/codes/sessions in logs | Server + microservice Jest: every logger call stringified contains none of code/session/token/full email | Log `dto` → fails |
| UI state machine wrong (button shown with empty list, no resend after expiry, request on foreign domain) | Client Jest on `login.component` + `cognito.service` with mocked API | Remove the empty-list guard → button rendered → fails |
| Layout at 375 px / a11y | Cypress CT of `/login` with the Center path open (jsdom cannot measure) | `flex-nowrap` on the card → overflow assertion fails |
| Cognito change touched something else | Before/after read-only export diff (`aws cognito-idp describe-user-pool`, `describe-user-pool-client` ×10) in the runbook | Toggle any client → diff shows a second field → not accepted |
| **Real code delivery, expiry, attempt limit, `FORCE_CHANGE_PASSWORD` behaviour** | **No automated gate** — TEST spike + HITL with a real mailbox (accepted residual risk; values pinned into design from the spike) | — |
| PROD parity | Same export diff on the PROD pool, compared to the TEST diff | — |

## 10. Dependencies & Assumptions

### Upstream
- Cognito pool `us-east-1_o9y9Yq5pO` (TEST), PLUS tier; the microservice's app client is **`general-client` (`6ph57q…`)**, which already allows `ALLOW_USER_AUTH`; PROD pool `OTP-OQ-1`.
- AUTH microservice on `dev-auth`, deployed to `authtest-ibd.prms.cgiar.org`; env `COGNITO_CLIENT_ID`/`COGNITO_CLIENT_SECRET`/`COGNITO_USER_POOL_URL` unchanged (`OTP-OQ-6`).
- Email delivery: Cognito default sender (50/day pool-wide) for TEST; PROD per `OTP-OQ-8`.

### Downstream
- None new; the JWT consumed by `JwtMiddleware` is unchanged.

### Assumptions
- Center users are provisioned by admins before first login (as today) **in both PRMS and Cognito**; a PRMS user missing in Cognito reaches the code step (Cognito simulates the challenge) but never receives mail — the support runbook covers it. Their PRMS `is_cgiar` stays `false` (same as `irri.org` users today), and roles come from `auth/center-user`.
- Cognito `EMAIL_OTP` accepts users created by `AdminCreateUser` with `email_verified=true` regardless of password status — **to confirm in the spike** (`OTP-AC-12`).
- Code length and expiry are provider-defined; the UI accepts 4–10 digits and treats expiry copy generically until the spike pins the values.

## 11. Open Questions

- `OTP-OQ-1` **Which pool/account serves PROD?** Not in `IBD-DEV`. Blocks the PROD parity task only.
- `OTP-OQ-3` Initial allow-list: `cifor-icraf.org`, `icrisat.org`. Sub-domains? **Working value: those two, exact match.**
- `OTP-OQ-6` ~~Which app client does the TEST microservice use?~~ **Resolved 2026-09-11 (user):** the microservice serving Reporting and QA uses `COGNITO_CLIENT_ID=6ph57q…` = app client **`general-client`**, whose `ExplicitAuthFlows` already include `ALLOW_USER_AUTH` (plus `USER_PASSWORD_AUTH`, `CUSTOM_AUTH`, `SRP`, `ADMIN_USER_PASSWORD_AUTH`) and whose IdPs are `COGNITO` only. **No client-level change needed.** The spike only re-confirms this from the export.
- `OTP-OQ-7` ~~Code length, expiry and attempt limit~~ **Pinned by the TEST spike (2026-09-11, client `general-client`):** code = **8 digits**; challenge `Session` valid **~3 minutes** (= the app client's `AuthSessionValidity: 3`, a per-client setting — 3 min on `general-client`) and **single-use** (`NotAuthorizedException: Invalid session for the user, session is expired` / `…can only be used once`); **no provider attempt lockout observed** within a session (6 consecutive wrong codes → `CodeMismatchException: Invalid code or auth state for the user.`) — the effective brute-force bound is session expiry + PRMS's verify throttle (10 / 15 min per email, 8-digit space); delivery < 1 min from the Cognito default sender, **landed in Gmail spam**; unknown users receive a *simulated* `EMAIL_OTP` challenge (dummy session ≈ 1,587 chars, masked destination) — `PreventUserExistenceErrors=ENABLED`; **a `FORCE_CHANGE_PASSWORD` user is offered `SELECT_CHALLENGE [PASSWORD_SRP, PASSWORD]` without `EMAIL_OTP`** → contingency `OTP-T-10` triggered; a user created with `AdminCreateUser` **without a temporary password** (`MessageAction=SUPPRESS`, `email_verified=true`) lands **`CONFIRMED`** and gets `EMAIL_OTP` directly.
- `OTP-OQ-8` Is the Cognito default sender (50/day, pool-wide, also drawn on by sibling clients that allow `USER_AUTH`) enough for PROD with ≤ 50 center users, or is SES required? **Decided after the spike measures delivery and after `OTP-OQ-1`.**

Resolved: `OQ-2` (microservice is ours); `OQ-4` deferred as `OTP-R-30`; `OQ-5` (managed login v2 not involved).

## 12. Out-of-Band Notes

- Cognito change window agreed with the pool owner (IBD); other tenants informed that an additive factor is enabled.
- Deploy order: Cognito TEST → microservice TEST → PRMS TEST (server then client). A PRMS client without the server routes hides the path (config endpoint 404 → empty list), so partial deploys degrade safely.

## Requirement ID Index

| ID | Title | ACs |
|---|---|---|
| OTP-R-1 | Login page path | AC-1, AC-2 |
| OTP-R-2 | Email step | AC-3 |
| OTP-R-3 | Start with neutral response | AC-4, AC-5, AC-9 |
| OTP-R-4 | Code step | AC-6, AC-7, AC-8 |
| OTP-R-5 | Session parity | AC-6 |
| OTP-R-6 | Server contract and validation | AC-9, AC-10 |
| OTP-R-7 | Microservice contract | AC-4, AC-7, AC-8, AC-10 |
| OTP-R-8 | Additive Cognito change | AC-11, AC-16 |
| OTP-R-9 | Allow-list as configuration | AC-1, AC-2, AC-3 |
| OTP-R-10 | Existing paths unchanged | AC-13 |
| OTP-R-11 | Security | AC-14 |
| OTP-R-12 | Observability | AC-5, AC-9, AC-10 |
| OTP-R-13 | Provisioning unchanged | AC-12 |
| OTP-R-14 | UI states, responsive, a11y | AC-15 |
| OTP-R-20/21/22/23 | Resend cooldown, masked destination, pending redirect, remembered email | AC-6, AC-8 |
| OTP-R-30/31 | Externals on the code path, SES sender | — |

## 13. Rev 1.2 delta — Option B (2026-09-11, resolves `OTP-OQ-8`)

**MODIFIED**

- `OTP-R-7` — stable codes unchanged; **on `CODE_MISMATCH` the microservice and PRMS MUST return the rotated Cognito `session`** so the user can retry without requesting a new code.
- `OTP-R-4` — "a wrong code keeps the session" now means "the client MUST replace its session with the one returned on mismatch".
- `OTP-R-13` — provisioning (`CONFIRMED`) stays mandatory: `CUSTOM_AUTH` also requires a confirmed user.

**ADDED**

### Requirement `OTP-R-32`: The code email comes from PRMS
The sign-in code email SHALL be sent through PRMS's own notification pipeline from the configured PRMS sender (`EMAIL_SENDER`, today `PRMS-No-reply@cgiar.org`) with the display name "PRMS Reporting Tool", a subject that names the tool, and the PRMS branding block (logo, support address). It MUST NOT be sent by Cognito's default sender.

#### Scenario: familiar sender
- GIVEN an allow-listed, provisioned center user
- WHEN they request a code
- THEN one email arrives from "PRMS Reporting Tool <EMAIL_SENDER>" with the 6-digit code
- AND no email is sent by `no-reply@verificationemail.com`
- BUT retrying a wrong code MUST NOT send a second email for the same session.

### Requirement `OTP-R-33`: Pool triggers are inert for sibling apps
The three Cognito triggers SHALL only act on `CUSTOM_AUTH` flows. Sibling app clients without `ALLOW_CUSTOM_AUTH` MUST observe no behaviour change (verified by a sibling smoke in the runbook), and the `EMAIL_OTP` first-factor enabled by `OTP-T-1` SHALL be rolled back once Option B is live.

### Requirement `OTP-R-34`: Code policy
Codes SHALL be 6 numeric digits from a CSPRNG, one code per Cognito session, at most 3 verification attempts per session, valid for the client's `AuthSessionValidity` (5 min target). Verification MUST use a constant-time comparison. Triggers MUST NOT log the code, the email or the session.

### Requirement `OTP-R-35`: Delivery failure is observable
If the email cannot be queued, the trigger SHALL still return a challenge (no enumeration signal) and SHALL log `outcome: email_failed`; the support runbook lists it under "code not received".

**Acceptance criteria**

- `OTP-AC-17` — TEST HITL: code received from "PRMS Reporting Tool", not in spam for the spike mailbox (Gmail), within 60 s.
- `OTP-AC-18` — wrong code twice then the right code → session with roles, one email only; three wrong codes → "Too many attempts — request a new code."
- `OTP-AC-19` — sibling smoke (`PRMS-Reporting`/`MARLO` password login on TEST) unchanged before/after the trigger wiring.

**Open questions:** `OTP-OQ-8` → **resolved (Option B)**. New `OTP-OQ-9`: broker (`MS_RMQ_HOST`) reachable from a non-VPC Lambda? (answered in `OTP-T-14`, fallback HTTP `POST /send`). `OTP-OQ-1` (PROD account) now also gates the PROD Lambdas.

## 14. Rev 1.3 delta — first-login auto-provisioning (2026-09-11)

**MODIFIED**
- `OTP-R-5` — "the same session as the password path" now also means **the same first-login provisioning as the provider path**: a successful code verification for an email with no PRMS record SHALL create the PRMS user with the *guest* role and return the normal session/`needsRoles` outcome that `createSuccessfulLoginResponse` produces.
- `OTP-R-3` — enumeration resistance for unknown users is provided by Cognito (`PreventUserExistenceErrors`) plus the `userNotFound` fake challenge of the triggers; PRMS decoys remain for **inactive** PRMS users, expired and forged sessions.

**ADDED**
### Requirement `OTP-R-36`: Inactive users never reach Cognito
A PRMS user with `active = false` SHALL receive the neutral decoy at `start` and `OTP_NOT_AUTHORIZED` at `verify`, byte-identical to the unknown-user responses of the same step.

**Acceptance**
- `OTP-AC-20` — GIVEN a Cognito-confirmed center user with no PRMS record, WHEN they complete the code flow, THEN a PRMS user exists with the guest role and the response equals the provider flow's first-login response; a second login reuses the record (`last_login` updated).
- `OTP-AC-21` — an inactive PRMS user gets the same bodies as an unknown user at both steps and no email.

## 15. Rev 1.4 delta — Option D (2026-09-12)

**MODIFIED:** `OTP-R-32` (email from PRMS) — now sent by the PRMS server itself; `OTP-R-33`/`R-34`/`R-35` — the trigger clauses no longer apply; the code policy (6 digits CSPRNG, one code per session, 3 attempts, 5-minute validity, single use, constant-time compare) is enforced by PRMS. `OTP-R-13` — Cognito provisioning no longer required for center users (T-17 skips it). `OTP-R-8` (PROD parity) — PROD needs **no Cognito change**.

**ADDED**
### Requirement `OTP-R-37`: PRMS owns the code lifecycle
PRMS SHALL generate, deliver, verify and consume the sign-in code without any Cognito call; the stored challenge SHALL hold only HMACs of the email and the code, never the plaintext; a challenge SHALL be usable once, for 5 minutes, with at most 3 attempts.
### Requirement `OTP-R-38`: Session without Cognito tokens
A successful code login SHALL produce the standard PRMS session (`token`, `user`) with `auth_tokens` absent or null; no consumer MAY depend on Cognito tokens for center users.
**Acceptance:** `OTP-AC-22` — TEST HITL with the spike mailbox: code from "PRMS Reporting Tool", wrong ×2 → mismatch with rotated session, right → session; second use of the same code → not authorized; 3 wrong → attempts exceeded. `OTP-AC-23` — the TEST pool export after T-18 equals the 2026-09-11 morning export (`LambdaConfig {}`, `AuthSessionValidity 3`, factors `[PASSWORD]`). `OTP-AC-24` — an admin-created `@icrisat.org` user gets no Cognito record and no temporary-password email.
