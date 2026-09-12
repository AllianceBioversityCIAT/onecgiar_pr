# Adopting the email-code login in another CGIAR app

Guidance for a second application on the **same Cognito pool** (PRMS Planning is the motivating case). The honest summary: the *transport* is reusable almost as-is; the *product rules* around it are PRMS's and are not yet extracted.

---

## Quick answer

| Question | Answer |
|---|---|
| Can another app reuse this? | **Yes** — call the AUTH microservice's two OTP routes. They are generic |
| Does it need its own Lambdas? | **No.** The triggers are pool-level and already deployed |
| Will it get PRMS-branded e-mail? | **Yes, today.** The subject, logo, copy and footer link are hard-wired in `CreateAuthChallenge`. Changing that is a small, well-scoped follow-up (§4) |
| Does it get PRMS's allow-list, decoys, throttling and first-login rule? | **No.** Those live in PRMS's own `auth.service.ts` and must be re-implemented (or extracted to a shared package later) |
| Recommended path | **Option A** — through the AUTH microservice. See §4 |

---

## 1. What is already shared

| Piece | Sharing property |
|---|---|
| **Pool triggers** (Define / Create / Verify) | Pool-level, but they fire **only** for app clients whose `ExplicitAuthFlows` include `ALLOW_CUSTOM_AUTH`. On the TEST pool that is only `general-client`; the other 9 clients are unaffected |
| **AUTH microservice OTP routes** | Generic by contract: `POST /auth/login/otp/start { username }` and `POST /auth/login/otp/verify { username, code, session }`, MIS-authenticated with the caller's own CLARISA `auth` header — nothing in them is PRMS-specific |
| **E-mail transport** | RabbitMQ `send` → `notification-microservice` → SMTP, the same pipeline the other microservices already use |
| **Security primitives in the flow** | `crypto.randomInt` 6-digit code, one e-mail per Cognito session, `timingSafeEqual` verification, 3 attempts per session, `AuthSessionValidity` as the code lifetime, unknown users neutralised by a fake challenge |

## 2. What is PRMS-specific today

| Piece | Where it lives | Why it does not transfer |
|---|---|---|
| E-mail branding | `cognito-triggers/src/lib/email-template.ts` | Subject *"Your PRMS Reporting Tool sign-in code"*, PRMS header logo, `PRMSTechSupport@cgiar.org`, and `APP_URL` as the footer link are **hard-wired**, with `EMAIL_SENDER` / `APP_URL` set per **stack**, not per client |
| Domain allow-list | PRMS `global_parameters.OTP_ALLOWED_EMAIL_DOMAINS` + `getOtpAllowedDomains()` | A PRMS DB row and a PRMS cache service |
| Decoy sessions | `onecgiar-pr-server/src/auth/auth.service.ts` | HMAC-signed neutral sessions for inactive users, keyed with PRMS's `JWT_SKEY` |
| Throttling | `onecgiar-pr-server/src/auth/guards/otp-throttler.guard.ts` | 5 start / 10 verify per 15 min per e-mail, in-memory per PRMS instance |
| Error copy & mapping | `mapOtpVerifyError` + the client's `OTP_ERROR_COPY` | PRMS-authored strings |
| First-login rule | `createOrUpdateUserFromAuthProvider` → guest role | PRMS's own user model and role model |
| UI | `pages/login/components/center-otp-panel/` | Angular, PRMS design tokens |

## 3. The two options

| | **Option A — call the AUTH microservice** ✅ recommended | **Option B — enable `ALLOW_CUSTOM_AUTH` and call Cognito directly** ❌ |
|---|---|---|
| Secrets | The app holds only its **MIS credentials**. The Cognito client secret stays in the microservice | The app must hold the Cognito **client id + secret** and compute `SECRET_HASH` itself — a new secret surface per app |
| Error handling | Inherits the stable code set (`CODE_MISMATCH` + rotated session, `CODE_EXPIRED`, `ATTEMPTS_EXCEEDED`, `NOT_AUTHORIZED`, `CHALLENGE_NOT_SUPPORTED`, `UPSTREAM_ERROR`) and the user-safe copy | Must re-derive that mapping — notably that **a wrong code is not an exception** in `CUSTOM_AUTH`: it comes back as a `CUSTOM_CHALLENGE` reply with no `AuthenticationResult` and a **rotated session** |
| Log hygiene | Inherits `redactSensitive()` in the `LoggingInterceptor` and the `{ outcome }`-only telemetry | Must re-implement, and is the most common place a session or token leaks into logs |
| Identity boundary | One boundary, already the PRMS pattern (`OTP-DD-2`) | A second app talking to Cognito directly |
| Verdict | Fewer moving parts, no new secrets, consistent behaviour across apps | Not recommended |

## 4. Option A — step by step

1. **Get MIS credentials** for the app from the AUTH microservice owners (the same CLARISA application credentials pattern the other consumers use).
2. **Decide the client story.**
   - *Reuse `general-client`* — nothing to configure on the pool, and the e-mail is PRMS-branded. Acceptable for a sibling PRMS product; wrong for an unrelated app.
   - *Own app client* — create one with `ALLOW_CUSTOM_AUTH` in `ExplicitAuthFlows` and `AuthSessionValidity: 5`, and have the microservice select its id/secret per caller.
3. **If you took an own client, add branding per client** — the small follow-up in `cognito-triggers`: a `clientId → { subject, logo, supportEmail, appUrl }` map consulted by `CreateAuthChallenge` (the `clientId` is available on the trigger event), defaulting to the current PRMS block. Redeploy the stack; **no pool change**.
4. **Implement your own allow-list.** Decide which e-mail domains may use the path, and keep it in step with the microservice's `PASSWORDLESS_DOMAINS` (see the checklist).
5. **Implement your own rate limiting** on `start` / `verify`. Cognito's 3-attempts-per-session and the 5-minute session are a backstop, not a rate limit.
6. **Implement neutral responses.** Either copy PRMS's decoy approach or make sure your own `start` cannot distinguish a known from an unknown account (same status, same body shape, same timing class as far as practical).
7. **Build the two-step UI** (e-mail → code) and store the **rotated `session`** returned with `CODE_MISMATCH` before the retry. This is the single most common integration bug.
8. **Decide the first-login rule** — auto-provision with a default role (PRMS creates a guest user from the ID-token claims) or require a pre-existing record.
9. **Smoke it** exactly as the PROD runbook's step 7: unknown user → simulated challenge and no e-mail; real user → e-mail → wrong code (rotated session, no second e-mail) → right code → tokens.

> If more than one app ends up needing steps 4–8, extract PRMS's server-side logic (allow-list, decoys, throttler, error mapping) into a shared package rather than copying it. That extraction has not been done.

## 5. Pool-level prerequisites checklist

- [ ] The three triggers are wired on the pool's `LambdaConfig` (once per pool, not per app).
- [ ] Your app client lists `ALLOW_CUSTOM_AUTH` — **and no client that should not use this flow does.** Wiring is pool-level; `ALLOW_CUSTOM_AUTH` is the only gate.
- [ ] Your app client's `AuthSessionValidity` is **5** minutes (it *is* the code's lifetime; the e-mail says "expires in 5 minutes").
- [ ] The trigger stack's `UserPoolId` parameter matches the pool, so the scoped `lambda:InvokeFunction` permission covers it.
- [ ] Center users are provisioned `CONFIRMED`, not `FORCE_CHANGE_PASSWORD` — a user holding a temporary password can never complete the code flow.
- [ ] **Dual allow-list:** the app's domain list and the microservice's `PASSWORDLESS_DOMAINS` env are changed **together**. A domain in only the app's list produces users provisioned with a temporary password, who then fail forever.
- [ ] Notify the pool owner before any `LambdaConfig` or client change; every pool write goes through a before/after export diff and a named approver, never a bare `update-user-pool`.

---

**Sources:** `docs/specs/changes/cognito-email-otp-login/design.md` §18.1, §18.2, §18.3, §13 (dual allow-list), `OTP-DD-2` · `execution.md` (`OTP-T-14` steps 3–8, sibling verification 21:42) · `one-cgiar-microservices/cognito-triggers/README.md` (*Wire the pool*, environment, e-mail template) + `template.yaml` · `one-cgiar-microservices/auth-microservice/README.md` (OTP routes, `PASSWORDLESS_DOMAINS`, telemetry/redaction) · `onecgiar-pr-server/src/auth/{auth.service.ts,guards/otp-throttler.guard.ts}` · `runbook/cognito-email-otp.md` (sibling-client exposure)

**Last verified:** 2026-09-12
