# Design — Email one-time-code login for CGIAR center staff outside Active Directory

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/cognito-email-otp-login/` · Module code `OTP` |
| Type / Depth | Change · **Full** (re-checked in §14) |
| Approval Mode | pre-approved (Phase 2 gate: `auto-approved (pre-approved mode)`; judgment-day runs once per the standing mandate, §16). Cognito/PROD mutations always HITL |
| Status | approved (rev 2, 2026-09-11 — judgment-day round 1 fixes applied, see `judgment.md`) |
| Linked | `requirements.md` (OTP-R-*, OTP-AC-*), `proposal.md`, `mockup/login-current.png`, `mockup/login-target.html` |
| Budget | **10 tasks (`OTP-T-10` triggered by the spike) · ~1,250 LOC incl. tests (microservice ~240, PRMS server ~420, PRMS client ~400, CT ~70, runbook/docs ~60, conditional provisioning ~60) · ≤ 1 review round per task; tripwire > 12 tasks or > 1,500 LOC → stop and escalate** |
| Skills (Skill Map) | `nestjs-expert`, `api-design-principles`, `error-handling-patterns` (server + microservice) · `angular-developer`, `frontend-design` (client) · `aws-security`/`aws-auth` for the Cognito runbook · `tdd` on the server start/verify service |

## 1. Summary

The Center path reuses Cognito's native passwordless factor: the pool gains `EMAIL_OTP` as an allowed first factor (additive; the microservice's app client `general-client` already allows `USER_AUTH`), the AUTH microservice gains two endpoints that call `InitiateAuth`(`USER_AUTH`, `PREFERRED_CHALLENGE=EMAIL_OTP`) and `RespondToAuthChallenge`(`EMAIL_OTP`) with the same client, secret hash and error mapping as the password flow, and the PRMS server gains two public routes that gate the request (allow-list + local user) and then hand Cognito tokens to the **existing** `createSuccessfulLoginResponse` so the JWT and user payload are byte-identical to the password path. The client adds one button and two inline steps to `pages/login`. Biggest accepted constraint: the pool is shared by ten applications, so every Cognito change is a runbook step with a before/after export diff, never a code path.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server (PRMS):** `auth/auth.controller.ts` (+2 routes, +1 config route), `auth/auth.service.ts` (`startOtp`, `verifyOtp`, allow-list read), `auth/dto/otp-*.dto.ts` (new), `auth/auth.module.ts` (import `GlobalParameterCacheModule`), `shared/microservices/auth-microservice/auth-microservice.service.ts` (+2 client methods), global parameter row `OTP_ALLOWED_EMAIL_DOMAINS` in `global_parameters` (data migration), `@nestjs/throttler` route overrides with a custom tracker. **No JWT-middleware edit:** `JwtMiddleware` is bound to `api/*`, `v2/*`, `clarisa/*`, `toc/*`, `type-one-report` only — `/auth/*` never passes through it (judgment JA-7/JB-4).
- **Client (PRMS):** `pages/login/login.component.{ts,html,scss}` (third path + two steps), `shared/services/cognito.service.ts` (state + calls), `shared/services/api/auth.service.ts` (`GET_otpConfig`, `POST_otpStart`, `POST_otpVerify`), new `pages/login/components/center-otp-panel/` (standalone, the two steps).
- **AUTH microservice (`one-cgiar-microservices/auth-microservice`, `dev-auth`):** `src/api/auth/services/cognito/cognito.service.ts` (`startEmailOtp`, `verifyEmailOtp`), `auth.service.ts` (orchestration), `auth.controller.ts` (+2 routes), `dto/email-otp-*.dto.ts`, specs.
- **External:** Cognito pool `us-east-1_o9y9Yq5pO` (TEST) sign-in policy; PROD pool (`OTP-OQ-1`). No CLARISA, no DB entity change.

### 2.2 Sequence — Center path

```
[/login] click "Continue with your Center account"  (rendered iff GET auth/login/otp/config → domains.length > 0)
  └─ email step: client validates syntax + domain ∈ domains
       └─ POST auth/login/otp/start { email }                         (public route — /auth/* has no JWT middleware; @Throttle 5/15 min, tracker = normalised email)
            └─ AuthService.startOtp
                 ├─ normalise email; domain ∉ allow-list → 400 OTP_DOMAIN_NOT_ALLOWED (client already knows the list); emit outcome denied_domain
                 ├─ per-email counter (before any lookup) → 429 neutral on the 6th / 15 min, known or unknown alike
                 ├─ users.findOne({ email, active }, relations: ['obj_role_by_user']) → miss/inactive → 200 neutral { sent: true, session: <decoy> } (HMAC decoy, same shape), log denied_user
                 └─ AuthMicroserviceService.startEmailOtp(email)
                      └─ MS POST /auth/login/otp/start { username }
                           └─ Cognito InitiateAuth { AuthFlow: USER_AUTH, AuthParameters: { USERNAME, SECRET_HASH, PREFERRED_CHALLENGE: EMAIL_OTP } }
                                └─ { ChallengeName: EMAIL_OTP, Session, ChallengeParameters.CODE_DELIVERY_DESTINATION }
                      ← { challengeName, session, codeDeliveryDestination }
                 ← 200 { sent: true, session, destination }   ── byte-identical shape for known and unknown users; client shows code step
       └─ code step: POST auth/login/otp/verify { email, code, session }   (@Throttle 10/15min)
            └─ AuthService.verifyOtp
                 ├─ decoy session (HMAC valid, unknown user) → 401 OTP_NOT_AUTHORIZED without any MS call
                 ├─ users.findOne({ email, active }, relations: ['obj_role_by_user']) (re-check; miss → 401 OTP_NOT_AUTHORIZED)
                 └─ AuthMicroserviceService.verifyEmailOtp(email, code, session)
                      └─ MS POST /auth/login/otp/verify → Cognito RespondToAuthChallenge { ChallengeName: EMAIL_OTP, ChallengeResponses: { USERNAME, EMAIL_OTP_CODE, SECRET_HASH }, Session }
                      ← { tokens } | error code ∈ { CODE_MISMATCH, CODE_EXPIRED, ATTEMPTS_EXCEEDED, NOT_AUTHORIZED, CHALLENGE_NOT_SUPPORTED, UPSTREAM_ERROR }
                 ├─ tokens → updateLastLoginUserByEmail → createSuccessfulLoginResponse(user, tokens)   ← same method and same user shape as /login/custom
                 └─ error → 401 { code, message } (stable copy, no Cognito text)
            ← 200 { response: { valid, token, user, auth_tokens }, message, status } ── identical to /login/custom; client stores token/user as today → redirect
```

Other paths (SAML, password) are untouched; they do not pass through any new code.

## 3. Data Model Changes

### 3.1 Entities
None.

### 3.2 Migrations
One **data** migration (`<timestamp>-OTP-allowed-email-domains.ts`, pattern `1700836504238-insertGlobalParametersAndCategories.ts`): inserts into `global_parameters` the row `OTP_ALLOWED_EMAIL_DOMAINS` (description, `global_parameter_category_id` = `SELECT id FROM global_parameter_categories WHERE name = 'platform_global_variables'` — the only seeded categories are `sharepoint`, `platform_global_variables`, `urls`; the column is `NOT NULL` with an FK; value **empty** by default so the path stays hidden until an admin sets it). `down` deletes the row. Schema unchanged; `migration:check` must be green.

### 3.3 CLARISA / external-data implications
None. Cognito configuration is operated by runbook (§5.4), not by code.

## 4. API Surface

### 4.1 New endpoints (PRMS server)

| Field | `GET auth/login/otp/config` | `POST auth/login/otp/start` | `POST auth/login/otp/verify` |
|---|---|---|---|
| Auth | public (JWT middleware public-path list) | public | public |
| Throttle | global default | `@Throttle({ default: { limit: 5, ttl: 900_000 } })` with a route-scoped guard whose `getTracker` returns the **normalised email** (fallback: first `x-forwarded-for` hop, then `req.ip`), so the bucket is per account, not per proxy; a custom `throwThrottlingException` returns the neutral 429 body below. Counted **before** the user lookup — known and unknown emails hit 429 identically (JA-4). **Both limits are per-instance** (default in-memory storage) — see `OTP-DD-6` | `@Throttle({ default: { limit: 10, ttl: 900_000 } })`, same tracker and body |
| Request DTO | — | `OtpStartDto { email: IsEmail, MaxLength(254) }` | `OtpVerifyDto { email: IsEmail; code: Matches(/^\d{4,10}$/); session: IsString, MaxLength(4096) }` — `whitelist + forbidNonWhitelisted`; `session` **required** and always present because `start` always returns one (real or decoy) |
| Response | `{ response: { domains: string[] }, message, status }` | `200 { response: { sent: true, session: string, destination: string }, message: 'If this account exists, a code has been sent.', status: 200 }` — **byte-identical shape for known and unknown users**: unknown/inactive users get a server-signed **decoy session** — **prefix-free**, same charset as a Cognito session (base64url), layout `hmac(43) ‖ nonce(22) ‖ exp(13 digits) ‖ filler`, HMAC-SHA256 keyed with `JWT_SKEY` (fallback: a per-process `randomBytes(32)` secret, never a literal) over `email|nonce|exp`, total length **jittered within the observed real class (spike 2026-09-11: 1,543 chars → 1,400–1,700)** — and a masked destination derived from the submitted email (`j***@icrisat.org`) for **both** branches (the Cognito-style `j***@g***` mask is never echoed) | `200` exactly the `/login/custom` success shape: `response: { valid: true, token, user: {…}, auth_tokens }` (the object `createSuccessfulLoginResponse` builds) |
| Errors | — | `400 OTP_DOMAIN_NOT_ALLOWED` (domain outside list) · `429 OTP_RATE_LIMITED` neutral copy (custom body, not the raw `ThrottlerException`) · `503 OTP_UPSTREAM_UNAVAILABLE` (microservice/Cognito down) | `401 OTP_CODE_MISMATCH` — **also the answer for a verified decoy session** (so an unknown account behaves exactly like a real account with a wrong code) · `401 OTP_CODE_EXPIRED` · `401 OTP_ATTEMPTS_EXCEEDED` (client must restart) · `401 OTP_NOT_AUTHORIZED` (malformed/expired/foreign session, unknown user at verify time, or a Cognito challenge the flow does not support) · `403 needsRoles` (same as `/login/custom` when the PRMS user has no roles) · `429` · `503` |
| Telemetry | — | `auth.otp.start { domain, outcome: sent \| denied_domain \| denied_user \| rate_limited \| upstream_error, durationMs }` — `denied_domain` is emitted on the 400 path, `rate_limited` on the 429 path | `auth.otp.verify { domain, outcome: ok \| mismatch \| expired \| attempts_exceeded \| not_authorized \| upstream_error, durationMs }` |

Unknown/inactive users receive the same `200` body with a decoy session; the client renders the code step; their verify fails with `401 OTP_NOT_AUTHORIZED` ("code incorrect or expired") **without** a microservice call. A known-but-not-in-Cognito user also reaches the code step (Cognito simulates the challenge under `PreventUserExistenceErrors=ENABLED`) and never receives mail — the support runbook covers it (§9). Wire format stays the project envelope (`ResponseInterceptor`).

### 4.2 New endpoints (AUTH microservice)

| Field | `POST /auth/login/otp/start` | `POST /auth/login/otp/verify` |
|---|---|---|
| Request DTO | `EmailOtpStartDto { username: IsEmail }` | `EmailOtpVerifyDto { username: IsEmail; code: Matches(/^\d{4,10}$/); session: IsString }` |
| Cognito call | `InitiateAuth` — `AuthFlow: 'USER_AUTH'`, `ClientId`, `AuthParameters: { USERNAME, SECRET_HASH, PREFERRED_CHALLENGE: 'EMAIL_OTP' }`; same `fetch` + `X-Amz-Target` style as `loginWithCustomPassword` | `RespondToAuthChallenge` — `ChallengeName: 'EMAIL_OTP'`, `ClientId`, `Session`, `ChallengeResponses: { USERNAME, EMAIL_OTP_CODE, SECRET_HASH }` |
| Response | `{ challengeName: 'EMAIL_OTP', session, codeDeliveryDestination? }`; if Cognito answers `SELECT_CHALLENGE` (listing factors) the service answers it with a second `RespondToAuthChallenge { ClientId, ChallengeName: 'SELECT_CHALLENGE', Session: <session from InitiateAuth>, ChallengeResponses: { USERNAME, ANSWER: 'EMAIL_OTP', SECRET_HASH } }` and returns the **new** `Session` from that reply (the one PRMS must replay on verify) — **spike-pinned (2026-09-11):** a `CONFIRMED` passwordless user gets `EMAIL_OTP` **directly** (`AvailableChallenges: ["EMAIL_OTP"]`, Session ≈ 1,543 chars, ~3 min, single-use); a `FORCE_CHANGE_PASSWORD` user gets `SELECT_CHALLENGE` with `AvailableChallenges: ["PASSWORD_SRP","PASSWORD"]` (no `EMAIL_OTP`) → `CHALLENGE_NOT_SUPPORTED`; an unknown user gets a **simulated** `EMAIL_OTP` challenge (dummy session ≈ 1,587 chars). Any other challenge (`NEW_PASSWORD_REQUIRED`, MFA…) → `CHALLENGE_NOT_SUPPORTED` | `{ tokens: { accessToken, idToken, refreshToken, expiresIn, tokenType } }` — identical to `authenticateWithCustomPassword`; a challenge instead of tokens → `CHALLENGE_NOT_SUPPORTED` |
| Errors (stable codes) | `NOT_AUTHORIZED`, `CHALLENGE_NOT_SUPPORTED`, `UPSTREAM_ERROR` (502). **Session errors (spike-pinned):** `NotAuthorizedException` "Invalid session for the user, session is expired." → `CODE_EXPIRED` (the ~3-min session *is* the code's lifetime for the user; PRMS renders "Code expired — request a new one"); "…session can only be used once." → `NOT_AUTHORIZED`. **Unknown users do not error**: with `PreventUserExistenceErrors=ENABLED` Cognito returns a *simulated* `EMAIL_OTP` challenge with a dummy session and masked destination (JA-10/JB-11) — the spike confirms; PRMS never reaches this for unknown PRMS users (decoy path), only for PRMS users missing in Cognito | `CODE_MISMATCH` (`CodeMismatchException`), `CODE_EXPIRED` (`ExpiredCodeException`), `ATTEMPTS_EXCEEDED` (`NotAuthorizedException` with the attempts message, or `TooManyFailedAttemptsException`), `NOT_AUTHORIZED` (incl. invalid/dummy session), `CHALLENGE_NOT_SUPPORTED`, `UPSTREAM_ERROR` |
| Env | reuses `COGNITO_CLIENT_ID` (= `general-client`, `6ph57q…`, already `ALLOW_USER_AUTH` — `OTP-OQ-6` resolved), `COGNITO_CLIENT_SECRET`, `COGNITO_USER_POOL_URL` |
| Logs | `otp.start { outcome }`, `otp.verify { outcome }` — never username, code, session, tokens |

### 4.3 Bilateral / platform-report impact
None.

## 5. Server Workflow / Business Rules

### 5.1 PRMS server
- **Controller:** three routes on `AuthController`; DTO validation via the existing per-route `ValidationPipe` options; `@Throttle` overrides + the OTP throttler guard (email tracker, neutral 429 body) on start/verify. `/auth/*` is outside `JwtMiddleware`'s mounts, so the routes are public by construction — nothing to add to the middleware's `publicRoutes` (documented, not edited).
- **Allow-list:** `AuthService.getOtpAllowedDomains()` reads `global_parameters.name = 'OTP_ALLOWED_EMAIL_DOMAINS'` through the existing `GlobalParameterCacheService.getParam()` (`shared/services/cache/`, imported into `auth.module.ts`) — no bespoke cache; splits on `,`, trims, lower-cases, drops empties and any `@`. Empty → `config` returns `[]`, `start` returns `400 OTP_DOMAIN_NOT_ALLOWED` for every email.
- **startOtp:** normalise → domain check (400, `denied_domain`) → **per-email counter (429 `OTP_RATE_LIMITED`, `rate_limited` — emitted by the guard itself) — before any lookup so known and unknown emails behave identically (JA-4)** → local user lookup `findOne({ where: { email, active: true }, relations: ['obj_role_by_user'] })`; miss/inactive → neutral 200 with a **decoy session** and a destination masked from the submitted email, `outcome: denied_user`, no microservice call → otherwise microservice `startEmailOtp` → 200 with the Cognito `session` (a reply without `session` → 503 `upstream_error`) and the **same** submitted-email mask (never Cognito's mask). Upstream failure → 503 `OTP_UPSTREAM_UNAVAILABLE`, `outcome: upstream_error`. Never creates users, never calls `/auth/register`.
- **verifyOtp:** normalise → counter (429) → decoy check (**HMAC verifies over the fixed layout** — `verifyDecoySession` on the live path, `timingSafeEqual`; a verified decoy → `401 OTP_CODE_MISMATCH`, `outcome: mismatch`, no microservice call; `exp` past → same 401) → local user lookup **with `relations: ['obj_role_by_user']`** (miss → 401 `OTP_NOT_AUTHORIZED`) → microservice `verifyEmailOtp` → map error codes (`CHALLENGE_NOT_SUPPORTED` → 401 `OTP_NOT_AUTHORIZED` with support copy) → on tokens: `updateLastLoginUserByEmail` then **`createSuccessfulLoginResponse(user, tokens)`** exactly as `singIn` does after the password flow (same method, same arguments, same relation-loaded `user`, no new branch inside it — including its `403 needsRoles` guard, JA-2/JB-2).
- **Rate limiting:** **no change to the global `ThrottlerModule.forRoot` array** — a named throttler there would make the app-global guard enforce it on every undecorated route (T-5 attempt-2 finding). Instead the two routes carry `@SkipThrottle()` so the app-global `ThrottlerExcludeBilateralGuard` (`APP_GUARD`, default throttler, `req.ip` tracker) **skips them entirely**, and `OtpThrottlerGuard` (`@UseGuards`, a `ThrottlerGuard` subclass with a full `canActivate` override that ignores `THROTTLER_SKIP`) enforces its **own** limits — `start` 5 / 15 min, `verify` 10 / 15 min, defined as constants in the guard (or read from `@Throttle` metadata under its own key) — using the module's shared `ThrottlerStorage` with a guard-specific key prefix: `getTracker` → normalised body email capped at 254 chars and required to contain `@` (fallback first `x-forwarded-for` hop, then `req.ip`); `throwThrottlingException(context, detail)` emits `auth.otp.<start|verify> { domain, outcome: 'rate_limited', durationMs }` and throws the neutral 429 envelope. Storage is the module default (**in-memory, per instance**) — accepted for ≤ 50 users on a single Lambda/container, Cognito's own attempt/expiry limits are the real backstop; horizontal scaling requires a shared store (§13). One composition test boots the real `APP_GUARD` + the route guard together and proves: the 6th call for one email returns `OTP_RATE_LIMITED`; a different email from the same IP passes; and an **undecorated control route** in the same test module is still governed only by the default 100 / 60 s limit (11 rapid calls pass) — i.e. the OTP limits leak nowhere.
- **Copy** lives in the server responses (`message`) so the client never invents security wording; the client maps `code` → its own inline state.

### 5.2 AUTH microservice
- `CognitoService.startEmailOtp(username)` and `verifyEmailOtp(username, code, session)` mirror `loginWithCustomPassword` / `completeNewPasswordChallenge`: compute `SECRET_HASH`, `fetch` the pool URL with the `X-Amz-Target` header, parse `__type`/`message` on non-2xx, map to stable codes via one `mapCognitoError()` helper (also reused by nothing else — keep the existing flows untouched, `OTP-R-10`).
- `AuthService.startEmailOtp(dto)` / `verifyEmailOtp(dto)` orchestrate and shape the responses per §4.2; `AuthController` exposes the routes with Swagger; DTOs in `dto/`.
- **No edits to existing flows or their log lines** (`OTP-R-10`, §15). The pre-existing `Authorization code validated successfully: ${tokens}` log in `auth.service.ts` is recorded as a separate one-line hygiene change outside this spec (JB-8).

### 5.3 Client
- `LoginComponent` requests `GET_otpConfig()` on init; `centerDomains = signal<string[]>([])`; the Center block renders under `@if (centerDomains().length)`. Existing `cognito.loginWithAzureAd()` / `loginWithCredentials()` / `changePassword()` paths untouched (`OTP-R-10`).
- New standalone `CenterOtpPanelComponent` (`pages/login/components/center-otp-panel/`), inputs `domains`, outputs none (it calls `CognitoService`). Internal state machine (signals): `step: 'email' | 'code'`, `email`, `session`, `destination`, `code`, `busy`, `error: null | 'domain' | 'mismatch' | 'expired' | 'attempts' | 'upstream' | 'rate'`, `resendAt` (cooldown 30 s). Actions: `sendCode()`, `verify()`, `resend()`, `back()`.
- `CognitoService` gains `startOtp(email)`, `verifyOtp(email, code, session)` that call `AuthService.POST_otpStart/POST_otpVerify`, reuse `updateCacheService(resp)` + `redirectToHome()` on success (same as `loginWithCredentials`), and surface errors through the panel's `error` signal (not the global alert) so copy stays inline.
- Copy (English, inline like the rest of `pages/login`): button "Continue with your Center account"; helper "For CGIAR centers outside the CGIAR directory: {{ centers }}" where `centers` is derived from domains via a small label map (`icrisat.org → ICRISAT`, `cifor-icraf.org → CIFOR-ICRAF`, fallback = domain); email placeholder `name@icrisat.org`; neutral sent copy "If this account exists, we sent a code to {{ destination || 'your email' }}"; errors "That email domain is not enabled for this option — use your CGIAR account or the external-user option, or contact PRMSTechSupport@cgiar.org", "Code incorrect. Try again.", "Code expired — request a new one.", "Too many attempts — request a new code.", "We could not reach the sign-in service. Try again in a minute or contact support.", "Too many requests — wait a few minutes."

### 5.4 Cognito runbook (HITL, TEST then PROD)
1. **Export before:** `describe-user-pool` + `describe-user-pool-client` for all clients (JSON, secrets redacted) → `runbook/before-<env>.json`.
2. **Tabulate sibling exposure:** from the *before* export list every app client with `ALLOW_USER_AUTH` (TEST today: MARLO, TIP TEST, general-client, "My web app", PRMS-Reporting) — these gain `EMAIL_OTP` as a *selectable* factor and share the pool's email quota; the pool owner notifies their teams before step 3 (JA-9).
3. **Change — console is the sanctioned path** (User pool → Sign-in → Options for choice-based sign-in → tick *Email message one-time password*), performed by a named approver after a screenshot of the current setting. **Never run a bare `aws cognito-idp update-user-pool`**: it resets every omitted parameter (`AutoVerifiedAttributes`, `EmailConfiguration`, `AdminCreateUserConfig`, `LambdaConfig`, `MfaConfiguration`, `DeletionProtection`, …) to defaults — on a ten-tenant pool that is an outage. CLI only as `update-user-pool --cli-input-json file://input.json` where `input.json` is assembled from the *before* export with the non-writable keys stripped (`Id`, `Name`→`UserPoolId`, `Status`, `SchemaAttributes`, `EstimatedNumberOfUsers`, `LastModifiedDate`, `CreationDate`, `Arn`, `Domain`, `UserPoolTier`…) and only `SignInPolicy.AllowedFirstAuthFactors` changed, **and** a pre-flight `diff` of that input against the current state shows the single intended change.
4. **Export after** and **diff** → only `AllowedFirstAuthFactors` differs (`OTP-AC-11`).
4b. **Smoke one sibling tenant** (a password login on another app's client, e.g. TOC or Alliance TEST) to prove nothing else moved.
5. **Smoke PRMS** with a test user (`OTP-T-1` captures responses as fixtures, including the simulated challenge for an email unknown to Cognito).
6. **Rollback rehearsal (TEST only):** set factors back to `[PASSWORD]` (console), diff equals *before*, restore.
7. **PROD:** identical steps on the PROD pool after `OTP-OQ-1`; PRMS allow-list set last.

## 6. Frontend Plan

### 6.1 Routes / modules
No route change. `pages/login` stays the entry; `pages/auth-cognito` untouched.

### 6.2 Components & services

| Piece | Responsibility |
|---|---|
| `LoginComponent` (modified) | Loads `centerDomains`; renders the Center block between the CGIAR button and the external block; passes `domains` to the panel; hides the panel when the external form or the password-change form is open (one active path at a time). |
| `CenterOtpPanelComponent` (new, standalone) | Email step and code step, state machine §5.3, inline errors, resend cooldown, back link; `aria-live="polite"` region for status/error text; `data-test` hooks `otp-center-button`, `otp-email`, `otp-send`, `otp-code`, `otp-verify`, `otp-resend`, `otp-back`, `otp-status`. |
| `CognitoService` (modified) | `startOtp`, `verifyOtp`, shared success handling. |
| `AuthService` (api, modified) | `GET_otpConfig`, `POST_otpStart`, `POST_otpVerify` (`HTTP_METHOD_descriptiveName`). |

### 6.3 Design system usage
- Reuse the login card, `login-title`/`login-description` classes and the existing primary button style so the third path is visually a sibling of the two buttons (`mockup/login-target.html`). Tokens from `docs/ux-ui/design.md` §7 via the existing SCSS; Tailwind utilities only inside the new panel.
- Icons: `@ng-icons/lucide` (client guide rule 21): `lucideBuilding2` (center button), `lucideMail`, `lucideKeyRound`, `lucideRefreshCw`, `lucideArrowLeft`.
- Responsive (§9): the card is already single-column; the code input is full-width; at 375 px no horizontal overflow (CT gate `OTP-AC-15`).
- A11y (§10): labelled inputs, `inputmode="numeric" autocomplete="one-time-code"` on the code field, focus moves to the code field after send, `aria-live` announcements, contrast from existing tokens.

### 6.4 Real-time / notification UX
None.

## 7. Security & Authorization
- The three routes live under `/auth/*`, which carries no JWT middleware by construction; what gates them is DTO validation (whitelist), the OTP throttler, the allow-list and the local-user lookup (`OTP-R-6`).
- Neutral responses (`OTP-R-3`); Cognito's `PreventUserExistenceErrors=ENABLED` keeps the microservice neutral too.
- Rate limits at route (IP) and service (email) level; Cognito enforces code attempts and expiry.
- No new secrets in PRMS; the microservice reuses its client secret; codes/sessions/tokens never logged (`OTP-R-11`, `.cursorrules`); logs carry the domain only.
- No open redirect: success reuses `redirectToHome()` (pending URL is internal state, not a query param).

## 8. Performance & Capacity
- Two Cognito round-trips per login; p95 ≤ 2 s per route (`requirements.md` §7). Volume ≤ 50 users → negligible; Cognito default email quota 50/day pool-wide is the only capacity constraint (`OTP-OQ-8`).

## 9. Observability
- PRMS: `auth.otp.start { domain, outcome: sent | denied_domain | denied_user | rate_limited | upstream_error, durationMs }`, `auth.otp.verify { domain, outcome: ok | mismatch | expired | attempts_exceeded | not_authorized | upstream_error, durationMs }`; microservice: `otp.start`, `otp.verify` with `{ outcome }`. Support runbook entry "code not received": (1) `auth.otp.start outcome` — `denied_user` means the PRMS user is missing/inactive; (2) `sent` but no mail → user exists in PRMS but **not in Cognito** (simulated challenge) → re-run the admin provisioning; (3) Cognito message delivery in CloudWatch, spam folder, 50/day pool quota.

## 10. Testing Plan (forward-looking)
- **Microservice Jest:** `cognito.service.spec.ts` payload/header assertions for both calls (`AuthFlow`, `PREFERRED_CHALLENGE`, `ChallengeName`, `EMAIL_OTP_CODE`, `SECRET_HASH`), error mapping table, no-leak log assertions; `auth.controller.spec.ts` routes.
- **PRMS server Jest (`tdd`):** `auth.service.spec.ts` start/verify — domain 400, unknown user → byte-identical neutral 200 with a decoy session and no MS call; 6th start → 429 for known and unknown alike, known user → MS call + session, rate limit 429, verify success deep-equals `createSuccessfulLoginResponse` output for the same tokens, each MS error code → HTTP 401 code, upstream 503, logger no-leak sweep; DTO spec through `ValidationPipe`; `jwt.middleware.spec` public paths.
- **Client Jest:** `login.component.spec` (button hidden when `[]`, shown with domains, helper text), `center-otp-panel.component.spec` (state machine, domain validation without request, send → code step, error mapping, resend cooldown with fake timers, back), `cognito.service.spec` (success path reuses cache + redirect).
- **Cypress CT:** `login.component.cy.ts` at 1536/840/375 with the panel in the code step + an error: no overflow, controls ≥ 24 px, live region text.
- **Runbook evidence:** before/after exports + diff (TEST, PROD); spike fixtures.
- **HITL (TEST):** real mailbox at a center domain, code received, wrong/expired code copy, `FORCE_CHANGE_PASSWORD` user, existing SAML and password logins re-tested.

## 11. Backwards Compatibility & Migration Plan
- Additive routes, additive UI, additive Cognito factor; empty allow-list = feature dark. Data migration reversible. Rollback: empty the parameter (instant), revert PRs, remove `EMAIL_OTP` (runbook).
- Deploy order: Cognito TEST → microservice (`dev-auth` → `authtest-ibd`) → PRMS server → PRMS client → set allow-list. Partial deploys degrade to "path hidden" or `503` copy, never to a broken existing path.

## 12. Design Decisions (ADRs)

### `OTP-DD-1` — Cognito native `EMAIL_OTP` over custom-auth Lambdas or a PRMS-owned OTP
- **Context:** shared pool, PLUS tier, PRMS client already on `USER_AUTH`; identity provisioning is upstream (PRD).
- **Decision:** use the built-in factor; one additive pool setting; no triggers.
- **Alternatives:** Define/Create/Verify Lambdas (pool-wide triggers, more code); PRMS-side OTP table (PRMS owning an identity primitive).
- **Consequences:** code format, expiry and attempt limits are Cognito's (pinned by the spike); email sender is the pool's (`OTP-OQ-8`).

### `OTP-DD-2` — Through the AUTH microservice, not direct SDK calls from PRMS
- **Context:** PRMS never calls Cognito today; the microservice is ours (`dev-auth`).
- **Decision:** two microservice endpoints mirroring `login/custom`; PRMS keeps one identity boundary.
- **Alternatives:** PRMS direct `@aws-sdk` calls (would need the client secret in PRMS env — a new secret surface).
- **Consequences:** two repos change; deploy order matters; contract in §4.2.

### `OTP-DD-3` — Neutral `200` for unknown users at `start`, `400` only for foreign domains
- **Context:** enumeration risk vs usable feedback.
- **Decision:** the domain is public knowledge (it is on the button), so a foreign domain gets a helpful 400; existence is never revealed — unknown/inactive users receive a **byte-identical** 200 with a prefix-free, length-jittered, server-signed decoy session and a submitted-email mask, the rate limiter counts before the lookup, and their verify fails with **`401 OTP_CODE_MISMATCH`, the same code a wrong code on a real session produces** (JA-1/JB-1, JA-4; T-5 review lens B).
- **Alternatives:** always 200 (worse UX for typos); 404 for unknown (enumeration); 200 without `session` (rejected — the field's presence was itself an oracle and the required DTO made verify return 400 instead of 401).
- **Consequences:** the client shows the code step even when nothing was sent; response timing is not equalised (accepted residual risk, §13).

### `OTP-DD-4` — Reuse `createSuccessfulLoginResponse` for session parity
- **Decision:** no new JWT code path; the OTP verify hands tokens **and a user loaded with `relations: ['obj_role_by_user']`** to the same method the password flow uses (`createSuccessfulLoginResponse` returns `403 needsRoles` otherwise).
- **Consequences:** parity is structural, including the `needsRoles` guard; the test builds one fixture user with the relation and feeds both paths, asserting deep equality of `{ valid, token, user, auth_tokens }`.

### `OTP-DD-5` — Allow-list as a global parameter read through the existing `GlobalParameterCacheService`, exposed read-only
- **Alternatives:** env var (needs a deploy per center); hard-coded (drift).
- **Consequences:** admins add centers by data; the client derives copy from the same list.

### `OTP-DD-6` — Rate limiting: `@Throttle` with an email tracker, counted before the lookup, in-memory per instance
- **Context:** Lambda/container single instance today; ≤ 50 users; `ThrottlerModule.forRoot` uses the default in-memory storage; behind API Gateway `req.ip` may be the proxy.
- **Decision:** one guard subclass with its own limits (5 / 10 per 15 min) keyed on the normalised email (fallback `x-forwarded-for`), applied before any user lookup so 429 behaviour is identical for known and unknown emails, with a neutral custom 429 body; the routes carry `@SkipThrottle()` so the global guard ignores them; **no named throttler is added to the global module** (it would throttle every undecorated route app-wide); Cognito's attempt/expiry limits are the real backstop.
- **Alternatives:** separate in-service map (duplicate mechanism); DB/global-parameter-backed counter (needed only when PRMS scales horizontally — §13).
- **Consequences:** **both** limits are per instance and best-effort; the Jest gate proves the logic, not multi-instance behaviour — recorded as an accepted risk.

### `OTP-DD-7` — Cognito change by runbook with before/after export diff
- **Decision:** never a bare `update-user-pool`; console or a CLI call derived from the *before* export; diff must show one field.
- **Consequences:** the runbook is the deliverable of `OTP-T-1`/`OTP-T-9`; PROD repeats it.

### `OTP-DD-8` — Standalone `CenterOtpPanelComponent` inside `pages/login`
- **Alternatives:** grow `LoginComponent` (already carries the password-change form).
- **Consequences:** isolated state machine and tests; `LoginComponent` only toggles which path is open.

## 13. Open Gaps & Follow-ups
- **`FORCE_CHANGE_PASSWORD` contingency (`OTP-R-13`, JA-5/JB-7) — TRIGGERED by the spike (2026-09-11):** Cognito offers no `EMAIL_OTP` to a user holding a temporary password. The adjustment is in the **provisioning path, not the login path**: the AUTH microservice's `/auth/register` (`createUser`), for emails whose domain is in a `PASSWORDLESS_DOMAINS` env list, calls `AdminCreateUser` **without `TemporaryPassword`**, with `MessageAction: SUPPRESS` and `email_verified=true` — observed to land the user **`CONFIRMED`** and eligible for `EMAIL_OTP` directly (simpler than `AdminSetUserPassword`); no welcome-password email for those domains; other domains unchanged. `OTP-T-10` is now a **mandatory** task (~60 LOC, microservice, before `OTP-T-3`'s TEST deploy).
- Rate limiting is per instance for both IP and email (`OTP-DD-6`); if PRMS scales horizontally, move the counter to a shared store (DB row or cache) before relying on it.
- Response timing between known and unknown users is not equalised (a decoy path is faster than a Cognito round-trip); accepted for this population.
- While the microservice is down, a known user gets `503` and an unknown user still gets the neutral `200` (decoy path has no upstream) — an outage-time existence channel; accepted, recorded (T-5 lens B).
- `auth.otp.*` events log at info level (not `debug`) so the runbook can read them in CloudWatch; payload is `domain`/`outcome`/`durationMs` only — `OTP-R-11`'s "debug or below" clause is relaxed to "domain only, never the full address" (Leader decision, T-5 review).
- `auth.controller.spec.ts` needed a DI-only edit (throttler module + guard providers) — an accepted deviation from `OTP-AC-13` "unmodified": no assertion changed.
- **Dual allow-list (T-10 review):** PRMS `OTP_ALLOWED_EMAIL_DOMAINS` (global parameter) and the microservice's `PASSWORDLESS_DOMAINS` (env) must be changed together — a domain present only in PRMS provisions a `FORCE_CHANGE_PASSWORD` user whose Center login cannot succeed; runbook + `OTP-T-9` check. Follow-up: derive one from the other (e.g. PRMS passes a `passwordless: true` flag to `/auth/register`).
- **No provisioning email for passwordless users (T-10 review):** the microservice skips the welcome-password mail and PRMS skips its own confirmation (`registerInCognitoIfNeeded` returns `false` = "Cognito mails"); the new user is never told the account exists. Follow-up proposal: PRMS sends an account-created email (no password, points to the Center path) for passwordless domains.
- Enabling `EMAIL_OTP` pool-wide makes it selectable for sibling clients that already allow `USER_AUTH` and shares the 50/day default email quota with them (`OTP-OQ-8`); the runbook notifies those teams.
- Email sender for PROD (`OTP-OQ-8`, `OTP-R-31`).
- `SELECT_CHALLENGE` vs direct `EMAIL_OTP` response shape — pinned by the spike; the microservice handles both.
- Offering the code path to existing external users (`OTP-R-30`).
- Federation of the center tenants remains the strategic path (proposal Option C).

## 14. Size check (Step 2.4)
Estimate: **9 tasks (+1 conditional) · ~1,250 LOC incl. tests · 1 review round per task** — consistent with Full depth (auth, two repos, cloud runbook). Raised from ~1,050 after judgment-day (JA-13): the §10 inventory (eight service cases, DTO through the pipe, decoy/HMAC helper, throttler subclass, three client specs, CT) did not fit the first figure. Docs that live in shared files (`docs/trd/trd.md`) are **pending default-branch writes**, not task deliverables. Tripwire for `/akili-execute`: > 12 tasks or > 1,500 LOC → stop and escalate.

## 15. Reversion challenge (Step 2.3)
No design decision removes, disables or inverts delivered behaviour inside PRMS or the microservice: every change is additive (routes, UI block, data row), and the formerly planned "in passing" log edit was dropped (JB-8). **Pool-wide**, enabling `EMAIL_OTP` is additive too, but it is *visible* to sibling clients with `ALLOW_USER_AUTH` — handled by runbook step 2 (tabulate + notify) rather than by a code challenge (JA-9). **Challenge not applicable — recorded.**

## 16. Spike outcomes (`OTP-T-1`, 2026-09-11)
See `requirements.md` `OTP-OQ-7` and `execution.md`: 8-digit code; ~3-min single-use session; no in-session attempt lockout observed (≤ 6); default sender → Gmail spam; unknown user → simulated challenge; `FORCE_CHANGE_PASSWORD` → no `EMAIL_OTP` (→ `OTP-T-10` mandatory); `AdminCreateUser` without a temporary password → `CONFIRMED`. Decoy length class set to 1,400–1,700 from the observed 1,543 / 1,587.

## 17. Judgment Day
Round 1 (2026-09-11, two blind `opus` judges): 6 confirmed severe findings fixed in this rev 2, 6 warnings applied, 5 suggestions applied; scoped re-judgment waived under the standing pre-approved mandate. Ledger in `judgment.md`.
