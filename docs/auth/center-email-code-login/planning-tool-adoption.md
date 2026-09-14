# Adopting the Center email-code login in the Planning tool — brief for the Codeobia team

**Last verified:** 2026-09-14 · **Source of truth:** PRMS spec `docs/specs/changes/cognito-email-otp-login` (rev 4, Option D), PRMS code in `onecgiar-pr-server` / `onecgiar-pr-client` (`master`), Planning code at `onecgiar-planning-module` branch `production-v2` (`9261968`).

## 1. What PRMS shipped (live in PROD since 2026-09-12)

CGIAR center staff whose mailboxes are **outside Active Directory** (`@cifor-icraf.org`, `@icrisat.org`) sign in with a **6-digit code sent by email**. Cognito is not involved: the PRMS server generates the code, stores only HMACs, emails it through PRMS's own pipeline, verifies it and issues the normal PRMS session. First login auto-creates the user with a default (guest) role.

| Property | Value |
|---|---|
| Allow-list | one parameter, comma-separated domains, empty = feature hidden |
| Code | 6 digits (CSPRNG), valid 5 minutes, 3 attempts, single use |
| Storage | `otp_challenges` (`nonce`, `email_hash`, `code_hmac`, `expires_at`, `attempts`, `consumed_at`) — never the code or the email in clear |
| Enumeration resistance | inactive users get a signed **decoy** session indistinguishable from a real one; unknown users get a real code (they are provisioned on success) |
| Throttling | 5 `start` / 10 `verify` per 15 min per email + IP, neutral 429 |
| Session | the application's own JWT; no Cognito tokens |
| Email | from the application's transactional sender, branded template, code in HTML + plain text |

Reference documents: `README.md` (module reference), `prod-rollout-runbook.md`, `diagrams/architecture.png`.

## 2. Planning today (facts, `production-v2`)

| Area | Fact | Where |
|---|---|---|
| Login | **Only** Cognito hosted-UI redirect; no login page; `AuthGuard` redirects to `${aws_cognito_link}/login?...`; callback `/auth` posts the code to `POST /auth/aws` | `front-end/src/app/guards/auth.guard.ts:23-27`, `services/auth.service.ts:26-57`, `back-end/src/auth/aws.strategy.ts:20-63` |
| Cognito | Direct HTTP to `Cognito_API` (`/oauth2/token`, `/oauth2/userInfo`) with Planning's **own app client**; same user pools as PRMS (`ost-toc` test, `osttoc` prod) but **no AUTH-microservice client**, no `MS_AUTH_*` | `back-end/src/auth/aws.strategy.ts:27`, `front-end/src/environments/*.ts` |
| Session | Planning's own HS256 JWT (`JWT_SECRET_KEY`), user row as payload, **`expiresIn` hard-coded to 10 years**; validated by `JwtStrategy`/`JwtAuthGuard` | `back-end/src/auth/aws.strategy.ts:90-96`, `jwt.strategy.ts` |
| First login | unknown email → `User` created (`email, first_name, last_name`) **without a role** | `back-end/src/auth/aws.strategy.ts:71-87` |
| User model | `id, email, first_name, last_name, role (user\|admin), full_name`; **no `active` flag**, no guest/external concept | `back-end/src/entities/user.entity.ts` |
| Email | SendGrid direct, sender `CGIAR Planning <noreply@planning.cgiar.org>`; **store-and-forward `email` table drained every 30 s, 10 rows per tick** | `back-end/src/email/email.service.ts:16-72` |
| Parameters | no `global_parameters`; `Constants {id, value, label}` addressed by hard-coded id, admin UI `/admin/parameters-settings` | `back-end/src/entities/constants.entity.ts`, `constants.controller.ts` |
| Schema | TypeORM `synchronize: true`, **no migrations folder** | `back-end/src/app.module.ts:41-54` |
| Rate limiting | none (`@nestjs/throttler` not installed) | `back-end/package.json` |
| Errors | raw Nest `{statusCode, message, error}`; the `HttpExceptionFilter` is commented out | `back-end/src/main.ts:9` |
| OTP/passwordless | nothing in the repo | grep |

Stack match: NestJS 10 + TypeORM + MySQL, Angular 19 — PRMS's server-side logic ports with few changes.

## 3. Recommended approach

**Port PRMS's Option D into Planning** (Planning generates, emails and verifies the code itself). Reasons: no Cognito change for a shared pool, no dependency on the AUTH microservice (Planning is not onboarded to it), same stack, PROD-proven design. The alternative "call the AUTH microservice OTP routes" is **not available today**: those routes are unused/retired and Planning has no MIS credentials for the microservice; it would become the right path only if a shared implementation is extracted later (see §7).

## 4. Change set (backend `back-end/src`)

| # | Change | Port from PRMS (`onecgiar-pr-server/src`) | Notes for Planning |
|---|---|---|---|
| B1 | `auth/otp/otp-challenge.entity.ts` + `otp-challenge.service.ts` (+spec) | `auth/otp/*` | Same code; keys derived from `JWT_SECRET_KEY` with distinct tags (`otp-challenge-email`, `otp-challenge-code`); atomic `consume` (`WHERE consumed_at IS NULL`) and conditional `attempts + 1 WHERE attempts < 3`. With `synchronize: true` the table appears automatically; still add a `down`-able migration when Planning adopts migrations |
| B2 | `auth/otp/otp-email.template.ts` | same | Replace branding (Planning logo/name/support address/app URL). Subject `Your CGIAR Planning sign-in code`. Keep the 5-minute / single-use copy |
| B3 | Routes `GET /auth/otp/config`, `POST /auth/otp/start`, `POST /auth/otp/verify` (public, no JWT) | `auth/auth.controller.ts` (`login/otp/*`), DTOs `auth/dto/otp-*.dto.ts` | Add `class-validator` DTOs (`email` IsEmail; `code` `/^\d{4,10}$/`; `session` IsString ≤ 4096) |
| B4 | `startOtp`: normalise → allow-list (else 400 `OTP_DOMAIN_NOT_ALLOWED`) → user lookup → inactive → decoy; else create challenge → **send email synchronously** (bypass the 30-second `email` queue: call the SendGrid send directly for this template) → `200 { sent: true, session, destination }` | `auth/auth.service.ts` `startOtp`, decoy helpers (`buildDecoySession`, `parseDecoySession`, `verifyDecoySession`, `encodeOtpSegment`) | Decoy encoder ports verbatim (needs `JWT_SECRET_KEY`); mask helper `s***@i***` |
| B5 | `verifyOtp`: envelope HMAC → row by nonce → consumed/attempts/expiry → constant-time code compare → consume → **first-login provisioning with a default role** → Planning JWT | `auth/auth.service.ts` `verifyOtp`, `handleOtpCodeMismatch` | Reuse `AwsStrategy`'s user creation, but assign `role = 'user'` (or a new guest role) — today a new user is role-less and every `RolesGuard` fails |
| B6 | Throttling: install `@nestjs/throttler`, `ThrottlerModule.forRoot`, port `OtpThrottlerGuard` (5/10 per 15 min, own storage namespace, tracker = normalised email, fallback `x-forwarded-for` → `req.ip`, neutral 429 `OTP_RATE_LIMITED`) | `auth/guards/otp-throttler.guard.ts` | Apply `@UseGuards(OtpThrottlerGuard)` on `start`/`verify` only |
| B7 | Allow-list parameter | PRMS `global_parameters.OTP_ALLOWED_EMAIL_DOMAINS` | Planning: add a `Constants` row **read by label** `OTP_ALLOWED_EMAIL_DOMAINS` (not by numeric id), 60 s in-memory cache; editable in `/admin/parameters-settings`. Empty = feature hidden |
| B8 | Error envelope for the three routes only: `{ statusCode, code, message }` with the stable codes `OTP_DOMAIN_NOT_ALLOWED`, `OTP_RATE_LIMITED`, `OTP_UPSTREAM_UNAVAILABLE` (internal error), `OTP_CODE_MISMATCH` (+ rotated `session`), `OTP_ATTEMPTS_EXCEEDED`, `OTP_NOT_AUTHORIZED` | `auth/auth.service.ts` constants | Do not retrofit a global filter |
| B9 | Session for OTP logins: reuse the JWT signer but with a **normal expiry** (e.g. `JWT_EXPIRATION_TIME`), not 10 years | `aws.strategy.ts:90-96` | Recommended for all logins, mandatory for the code path |
| B10 | Log hygiene: never log the code, the email, the session or the JWT; structured events `auth.otp.start/verify { domain, outcome, durationMs }` | `auth/utils/otp-shared.util.ts` | Outcomes: `sent`, `email_failed`, `denied_domain`, `denied_user`, `rate_limited`, `mismatch`, `attempts_exceeded`, `not_authorized`, `consumed`, `ok`, `provisioned`, `internal_error` |

**Prerequisite data-model change:** add `active` (boolean, default true) to `User` so deactivated accounts can be refused neutrally (decoy), and decide the default role for first-login users.

## 5. Change set (frontend `front-end/src/app`)

| # | Change | Port from PRMS (`onecgiar-pr-client/src/app`) |
|---|---|---|
| F1 | A **login page** (`/login`) with two buttons: "Continue with your CGIAR account" (existing hosted-UI redirect) and "Continue with your Center account" — today the guard redirects straight to Cognito, so this route and the guard change are new | `pages/login/login.component.*` (structure, one-active-path rule, helper copy derived from the allow-list) |
| F2 | `GET /auth/otp/config` on init; render the Center block only when the list is non-empty | `login.component.ts` |
| F3 | `CenterOtpPanelComponent`: email step → code step, 30 s resend cooldown, back, inline copy, `inputmode="numeric" autocomplete="one-time-code"`, `aria-live` status, autofocus after render, error keys mapped from the stable codes, rotated session stored on mismatch | `pages/login/components/center-otp-panel/*` (Angular signals, standalone) |
| F4 | On success: store the returned Planning JWT exactly as `AuthComponent` does after `/auth/aws`, then navigate to the intended route | `services/auth.service.ts` |
| F5 | Tests: unit specs per component + a component test at 1536/840/375 (no horizontal overflow, controls ≥ 24 px, `aria-live` text) | `login.component.cy.ts`, `center-otp-panel.component.spec.ts` |

## 6. Configuration and rollout

| Item | Planning |
|---|---|
| New env | none required (`JWT_SECRET_KEY`, `SENDGRID_API_KEY`, `CAN_SEND_EMAIL` already exist). Optional: `OTP_CODE_TTL_MINUTES=5` |
| Data | `Constants` row `OTP_ALLOWED_EMAIL_DOMAINS` = `''` at deploy; set `icrisat.org,cifor-icraf.org` last (feature switch); `otp_challenges` created by `synchronize` |
| Cognito | **no change** (pool, client, hosted UI untouched) |
| Rollout | deploy with the list empty → verify hosted-UI login unchanged → set the list → HITL with a controlled mailbox (code arrives, wrong ×2 + right, reuse rejected, 3 wrong → attempts exceeded) → rollback = empty the list |
| Support | "code not received" triage: domain not allowed / user deactivated / SendGrid failure (`email_failed`) / rate limited / spam folder |

## 7. Later: one shared implementation

If a third application needs the same login, extract the code lifecycle to the **AUTH microservice** (challenge store in DynamoDB or Redis; `login/otp/start|verify` returning a signed assertion; each app mints its own session). Planning would then need MIS credentials for the microservice. Not required for this adoption.

## 8. Acceptance checklist (what we will verify together)

- [ ] Hosted-UI login unchanged (regression).
- [ ] Allow-list empty → no Center button; disallowed domain → 400 with the domain message; no email.
- [ ] Allowed domain → email within 60 s from `noreply@planning.cgiar.org`, inbox not spam, code in HTML and text.
- [ ] Wrong code ×2 → "Code incorrect" and the session keeps working; right code → session with the default role; same code again → not authorized; 3 wrong → attempts exceeded.
- [ ] Deactivated user → neutral response, no email; unknown user → provisioned on first success.
- [ ] 6th `start` in 15 min → 429; no code/email/session in any log line; `otp_challenges` holds HMACs only.
- [ ] JWT issued by the code path expires like a normal session.

## 9. Effort (indicative)

Backend ≈ 3–4 days (B1–B10 incl. tests), frontend ≈ 3 days (F1–F5), rollout + HITL ≈ 1 day. PRMS files above can be copied as a starting point; the PRMS team can review the port.

## 10. Open questions for Codeobia

1. Default role for first-login center users (`user`? a new `guest`?) and whether an admin must still assign per-program roles afterwards.
2. Confirm SendGrid sender reputation for `noreply@planning.cgiar.org` and whether SPF/DKIM are set (deliverability of the code email).
3. Do you want the allow-list editable from `/admin/parameters-settings` (recommended) or an env var?
4. Is shortening the 10-year JWT acceptable for all logins now, or only for the code path?
5. Preferred branch/PR flow for this change (`development` → `production-v2`?).

**Sources:** PRMS spec rev 4 (`design.md` §19), PRMS code paths listed in §4–5, Planning `production-v2` files cited in §2 (read-only scout 2026-09-14).
