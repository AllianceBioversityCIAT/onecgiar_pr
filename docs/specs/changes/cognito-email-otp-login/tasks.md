# Tasks — Email one-time-code login for CGIAR center staff outside Active Directory

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/cognito-email-otp-login/` · Module code `OTP` |
| Linked | `requirements.md` (OTP-R-*, OTP-AC-*) · `design.md` (OTP-DD-*, §4 contracts, §5.4 runbook) · `proposal.md` · `mockup/login-target.html` |
| Approval Mode | pre-approved (Phase 3 gate: `auto-approved (pre-approved mode)`). **Cognito changes, microservice deploys and PROD steps are HITL inside their tasks** |
| Status | not-started |
| Owner / driver | Juan Carlos Cadavid · AKILI Leader |
| Budget (from `design.md` §14) | 9 tasks (+1 conditional) · ~1,250 LOC incl. tests · ≤ 1 Reviewer round per task; tripwire > 12 tasks or > 1,500 LOC → stop and escalate |
| Repositories | PRMS (`onecgiar-pr-server`, `onecgiar-pr-client`, this checkout) · AUTH microservice (`/Users/jcadavid/Development/one-cgiar-microservices/auth-microservice`, branch `dev-auth`, TEST `authtest-ibd.prms.cgiar.org`) |

### Execution constraints (inherited — standing mandate 2026-09-02)

- Routine gates auto-pass and are logged `auto-approved (pre-approved mode)`; HALT / Pivot / tripwire / `FATAL_FAIL` / `PRODUCT_BUG` and **every cloud mutation or deploy** stop for the user.
- One Reviewer round per task; a second FAIL escalates.
- Targeted verification only: server `npx jest --silent --reporters=summary --forceExit <path>` · client `npx jest --silent --reporters=summary --no-coverage <path>` + `npx tsc --noEmit -p tsconfig.app.json` + `npx ng lint --quiet` · CT `CT_DEV_SERVER_PORT=8091 npx cypress run --component --spec <file>` · microservice `npm test -- <path>` inside `auth-microservice/`.
- Secrets: never print `COGNITO_CLIENT_SECRET`, sessions, codes or tokens — not in logs, fixtures, `execution.md` or chat. Fixtures store response **shapes** with values redacted.
- Working in the microservice repo: never switch its checked-out branch without the user; create a worktree for `dev-auth` (`git worktree add <path> dev-auth`) and work there.

## 1. Scope of this task list

- **Module / feature:** `auth` · email one-time-code sign-in for allow-listed center domains (Cognito `EMAIL_OTP` via the AUTH microservice).
- **Target:** TEST first, PROD after sign-off.
- **Status:** not-started.

## 2. Pre-flight checklist

- ✅ `requirements.md` approved (rev 1, auto-approved pre-approved mode).
- ✅ `design.md` approved (rev 2; judgment-day round 1 findings applied — see `judgment.md`).
- [ ] `OTP-OQ-1` PROD pool/account identified (blocks `OTP-T-9` PROD half only).
- ✅ `OTP-OQ-6` resolved by the user (2026-09-11): microservice client = `general-client` (`6ph57q…`), already `ALLOW_USER_AUTH`; `OTP-T-1` re-confirms from the export.
- [ ] Pool owner (IBD) agrees a change window for the TEST factor toggle (`OTP-T-1`).
- [ ] No conflicting in-flight spec touching `auth/` login routes or `pages/login` (`docs/specs/` grep at start).
- [ ] Migration: one data migration (`OTP-T-4`); `npm run migration:check` green on a clean branch.

## 3. Task list

### [~] `OTP-T-1` — Cognito TEST spike: enable `EMAIL_OTP`, capture fixtures, pin `OQ-6/7/8`, rehearse rollback

- **Type:** `infra` + `tests` + `docs`
- **Description:** With the pool owner's window agreed: (1) export the pool and all ten app clients read-only (`describe-user-pool`, `describe-user-pool-client` ×10, secrets redacted) to `runbook/test-before.json`; (2) tabulate every sibling client with `ALLOW_USER_AUTH` from the *before* export and have the pool owner notify their teams (`design.md` §5.4 step 2); **HITL** — add `EMAIL_OTP` to `AllowedFirstAuthFactors` **via the console** (never a bare `update-user-pool`; CLI only as `--cli-input-json` derived from the *before* export with non-writable keys stripped and a pre-flight diff — §5.4 step 3); (3) export again and diff → exactly one field; smoke one sibling tenant's password login (step 4b); (4) using the `general-client` id + secret **from the local microservice `.env` (never printed)**, run `InitiateAuth` (`USER_AUTH`, `PREFERRED_CHALLENGE=EMAIL_OTP`) and `RespondToAuthChallenge` (`EMAIL_OTP`) against two TEST users — one `CONFIRMED`, one `FORCE_CHANGE_PASSWORD` — with a real mailbox you control; record: response shape (`EMAIL_OTP` direct vs `SELECT_CHALLENGE` — and, if the latter, the exact second `RespondToAuthChallenge` with `Session`), `CODE_DELIVERY_DESTINATION` masking, code length, expiry (retry after N minutes), attempt limit (wrong code ×N), delivery time, the **simulated challenge** returned for an email unknown to Cognito (`PreventUserExistenceErrors=ENABLED`), and what a `FORCE_CHANGE_PASSWORD` user gets (`EMAIL_OTP` or `NEW_PASSWORD_REQUIRED` → triggers conditional `OTP-T-10`); (5) re-confirm `OTP-OQ-6` from the export: client `6ph57q…` (`general-client`) lists `ALLOW_USER_AUTH`; (6) rehearse rollback: set factors back to `[PASSWORD]`, diff equals *before*, then re-enable; (7) write `runbook/cognito-email-otp.md` (steps, diffs, rollback, PROD placeholders) and store redacted fixtures under `fixtures/cognito/` (`initiate-auth.email-otp.json`, `respond-to-auth.success.json`, `respond-to-auth.code-mismatch.json`, `respond-to-auth.expired.json`, `initiate-auth.unknown-user.json` (simulated challenge), `initiate-auth.force-change-password.json`); (8) update `design.md` §4.2 (challenge shape) and `requirements.md` `OTP-OQ-7` with the pinned values; note `OTP-OQ-8` input (delivery time, quota consumed).
- **Implements:** `OTP-R-8` (additive, verified, reversible), `OTP-R-13` (`FORCE_CHANGE_PASSWORD` confirmation), `OTP-AC-11`, `OTP-AC-12`; resolves `OTP-OQ-6`, `OTP-OQ-7`; feeds `OTP-OQ-8`.
- **Files (expected):** `docs/specs/changes/cognito-email-otp-login/runbook/cognito-email-otp.md`, `runbook/test-before.json`, `runbook/test-after.json`, `fixtures/cognito/*.json`, `design.md` §4.2 / §13, `requirements.md` §11.
- **Depends on:** — · **Blocks:** `OTP-T-2`, `OTP-T-5`, `OTP-T-9`, `OTP-T-10` (conditional)
- **Estimate:** M · ~50 LOC docs (JSON excluded)
- **Verification:** `diff <(jq -S . runbook/test-before.json) <(jq -S . runbook/test-after.json)` shows only `Policies.SignInPolicy.AllowedFirstAuthFactors`; the five fixtures exist and `grep -c '"Session": "<redacted>"' fixtures/cognito/*.json ≥ 1`; `grep -rn "COGNITO_CLIENT_SECRET=\|eyJ" runbook fixtures` → nothing. **Input that fails it:** a diff with a second changed field (e.g. a client's `ExplicitAuthFlows`) → not accepted, rollback and investigate. **Disqualifiers:** fixtures typed by hand instead of captured; a session or secret value present in any saved file; the `FORCE_CHANGE_PASSWORD` case not run — report as inconclusive, do not pass; a bare `update-user-pool` call anywhere in the runbook.
- **Definition of done:**
  - [ ] Runbook + redacted fixtures committed (`📝 docs(auth) [OTP-T-1]: …` in PRMS).
  - [ ] `design.md` §4.2 states the observed challenge shape; `OTP-OQ-6/7` resolved in `requirements.md`.
  - [ ] TEST pool left with `[PASSWORD, EMAIL_OTP]`; rollback rehearsed and recorded.

### `OTP-T-2` — Microservice: `startEmailOtp` / `verifyEmailOtp` in `CognitoService` with error mapping (TDD)

- **Type:** `server` (microservice)
- **Description:** In a `dev-auth` worktree of `one-cgiar-microservices`: add `startEmailOtp(username)` and `verifyEmailOtp(username, code, session)` to `src/api/auth/services/cognito/cognito.service.ts`, mirroring `loginWithCustomPassword` (secret hash, `fetch` to `COGNITO_USER_POOL_URL`, `X-Amz-Target`), with `USER_AUTH` + `PREFERRED_CHALLENGE=EMAIL_OTP` and `RespondToAuthChallenge` `EMAIL_OTP` (`EMAIL_OTP_CODE`); handle a `SELECT_CHALLENGE` reply by answering `EMAIL_OTP` with `ClientId` + the incoming `Session` and returning the **new** session (`design.md` §4.2) if the spike observed it; any other challenge in place of tokens → `CHALLENGE_NOT_SUPPORTED`; add `mapCognitoError(__type, message)` → `CODE_MISMATCH | CODE_EXPIRED | ATTEMPTS_EXCEEDED | NOT_AUTHORIZED | CHALLENGE_NOT_SUPPORTED | UPSTREAM_ERROR`; no changes to existing methods or their log lines.
- **Implements:** `OTP-R-7` (Cognito calls, error mapping, no raw Cognito messages), `OTP-R-11` (no code/session/token in logs), `OTP-AC-7`, `OTP-AC-8`, `OTP-AC-10` (upstream), `OTP-AC-14` (microservice half).
- **Files (expected):** `auth-microservice/src/api/auth/services/cognito/cognito.service.ts`, `cognito.service.spec.ts`.
- **Depends on:** `OTP-T-1` (fixture shapes) · **Blocks:** `OTP-T-3`
- **Estimate:** M · ~160 LOC
- **Verification:** `npm test -- cognito.service` — asserts the exact `fetch` body/headers per call (`AuthFlow: 'USER_AUTH'`, `AuthParameters.PREFERRED_CHALLENGE: 'EMAIL_OTP'`, `SECRET_HASH` present; `ChallengeName: 'EMAIL_OTP'`, `ChallengeResponses.EMAIL_OTP_CODE`, `Session`), the `SELECT_CHALLENGE` branch (second call carries `ClientId` and the first `Session`; the returned session is the second reply's), the `CHALLENGE_NOT_SUPPORTED` branch, each fixture error `__type` → stable code, and that every logger call stringified contains no code/session/token/username. **Input that fails it:** send `ChallengeName: 'SMS_MFA'` → assertion fails; pass `error.message` through → mapping test fails. **Disqualifiers:** tests that mock the service's own methods instead of `fetch`; asserting only `toHaveBeenCalled()` without inspecting the body.
- **Definition of done:** red → green evidence; spec green; lint clean; existing `cognito.service.spec.ts` cases untouched and green.

### `OTP-T-3` — Microservice: orchestration, routes, DTOs, Swagger; deploy to TEST

- **Type:** `server` (microservice) + `rollout`
- **Description:** `AuthService.startEmailOtp(dto)` / `verifyEmailOtp(dto)` shaping `{ challengeName, session, codeDeliveryDestination? }` and `{ tokens }` (same object as `authenticateWithCustomPassword`); `AuthController` `@Post('login/otp/start')`, `@Post('login/otp/verify')` with Swagger and the same guards/interceptors as `login/custom`; `EmailOtpStartDto`, `EmailOtpVerifyDto`; `otp.start`/`otp.verify` outcome logs (never username/code/session/tokens); README endpoint table. **No edit to existing methods or log lines** (`OTP-R-10`; the pre-existing `${tokens}` log is a separate hygiene change). Then **HITL**: PR to `dev-auth`, deploy to `authtest-ibd.prms.cgiar.org` per the microservice's pipeline; smoke `POST /auth/login/otp/start` with the TEST user → `challengeName: EMAIL_OTP`.
- **Implements:** `OTP-R-7` (endpoints, response parity with `login/custom`), `OTP-R-12` (microservice events), `OTP-AC-4` (microservice half).
- **Files (expected):** `auth-microservice/src/api/auth/auth.service.ts`, `auth.controller.ts`, `dto/email-otp-start.dto.ts`, `dto/email-otp-verify.dto.ts`, `auth.controller.spec.ts`, `auth.service.spec.ts`, `README.md`.
- **Depends on:** `OTP-T-2` · **Blocks:** `OTP-T-9`
- **Estimate:** S · ~80 LOC
- **Verification:** `npm test -- auth.controller auth.service` green; DTO validation rejects `code: 'abc'` and missing `session`; verify-success body deep-equals the `authenticateWithCustomPassword` success shape for identical mocked tokens. Post-deploy: `curl -s -X POST https://authtest-ibd.prms.cgiar.org/auth/login/otp/start -d '{"username":"<test user>"}'` → `challengeName: "EMAIL_OTP"` (session redacted in the record). **Input that fails it:** return `AuthenticationResult` raw instead of `{ tokens }` → parity test fails. **Disqualifier:** a deploy smoke pasted without the response shape; a smoke that prints the session.
- **Definition of done:** tests green; deployed to TEST with the smoke recorded (shape only); existing routes' tests unmodified and green (`OTP-R-10`).

### [x] `OTP-T-4` — PRMS server: allow-list parameter, `config` route, public paths

- **Type:** `db` + `server`
- **Description:** Data migration inserting into `global_parameters` the row `OTP_ALLOWED_EMAIL_DOMAINS` (empty value, description, `global_parameter_category_id` = id of `platform_global_variables`; pattern `1700836504238-insertGlobalParametersAndCategories.ts`; reversible `down`); import `GlobalParameterCacheModule` into `auth.module.ts`; `AuthService.getOtpAllowedDomains()` reading through `GlobalParameterCacheService.getParam()` (split/trim/lower/drop empties and `@`); `GET auth/login/otp/config` → `{ domains }`. **No `JwtMiddleware` edit** — `/auth/*` is outside its mounts (design §5.1); add one middleware spec case proving `/auth/login/otp/config` is reachable without a token as-is.
- **Implements:** `OTP-R-9` (all clauses), `OTP-R-1` (server half: empty list → hidden), `OTP-R-6` (public routes), `OTP-AC-1`, `OTP-AC-2` (server half).
- **Files (expected):** `onecgiar-pr-server/src/migrations/<ts>-OTP-allowed-email-domains.ts`, `src/auth/auth.module.ts`, `src/auth/auth.service.ts`, `src/auth/auth.controller.ts`, `src/auth/auth.service.spec.ts`, `src/auth/Middlewares/jwt.middleware.spec.ts` (one added case, no middleware code change).
- **Depends on:** — · **Blocks:** `OTP-T-5`, `OTP-T-7`
- **Estimate:** S · ~90 LOC
- **Verification:** `npx jest --silent --reporters=summary --forceExit src/auth` — parser cases (`" ICRISAT.org, @cifor-icraf.org,,"` → `['icrisat.org','cifor-icraf.org']`; empty → `[]`), `getParam` called with `OTP_ALLOWED_EMAIL_DOMAINS`, `config` returns the envelope, the middleware case shows `/auth/login/otp/config` is not intercepted; migration `up` resolves a non-null category id (`platform_global_variables`), `npm run migration:check` green, `migration:revert` then `run` leaves no row. **Input that fails it:** forget `@` stripping → parser test fails; point the category subquery at a non-existent name → `up` fails on the NOT NULL/FK. **Disqualifier:** a middleware test that mocks the middleware itself.
- **Definition of done:** spec green; migration up/down verified; lint clean.

### `OTP-T-5` — PRMS server: `startOtp` / `verifyOtp`, DTOs, throttling, microservice client (TDD)

- **Type:** `server`
- **Description:** `AuthMicroserviceService.startEmailOtp(email)` / `verifyEmailOtp(email, code, session)` (HTTP to `MS_AUTH_URL/auth/login/otp/*`, error-code passthrough); `AuthService.startOtp(dto)` and `verifyOtp(dto)` per `design.md` §5.1 (normalise → domain 400 `denied_domain` → **counter before any lookup** → local user `findOne({ where: { email, active: true }, relations: ['obj_role_by_user'] })` → microservice or **decoy session** (`otp:` + HMAC-SHA256 with `JWT_SKEY` over `email|nonce|exp`, padded to the Cognito session length class) → byte-identical neutral 200 `{ sent, session, destination }`; verify → counter → decoy check (401 `OTP_NOT_AUTHORIZED`, no MS call) → user with relation → microservice → tokens → `updateLastLoginUserByEmail` → **`createSuccessfulLoginResponse(user, tokens)`**, or mapped 401/429/503; `CHALLENGE_NOT_SUPPORTED` → 401 with support copy); `OtpStartDto`, `OtpVerifyDto`; `OtpThrottlerGuard` (subclass: `getTracker` = normalised body email, fallback first `x-forwarded-for` hop, then `req.ip`; `throwThrottlingException` → neutral `429 OTP_RATE_LIMITED` envelope) applied with `@Throttle({ default: { limit: 5|10, ttl: 900000 } })`; events `auth.otp.start/verify` with the exact outcome enums of design §9 (incl. `denied_domain` on the 400 path, `rate_limited` on 429).
- **Implements:** `OTP-R-3` (all clauses), `OTP-R-4` (server half: error codes), `OTP-R-5`, `OTP-R-6` (DTOs, whitelist, limits, 429), `OTP-R-11`, `OTP-R-12` (server events), `OTP-R-13` (never creates users), `OTP-AC-4`, `OTP-AC-5`, `OTP-AC-6`, `OTP-AC-7`, `OTP-AC-8`, `OTP-AC-9`, `OTP-AC-10`, `OTP-AC-14` (server half); scenarios `OTP-R-3` and `OTP-R-4` all clauses; `OTP-DD-3`, `OTP-DD-4`, `OTP-DD-6`.
- **Files (expected):** `src/auth/auth.service.ts`, `auth.controller.ts`, `dto/otp-start.dto.ts`, `dto/otp-verify.dto.ts`, `dto/otp.dto.spec.ts`, `guards/otp-throttler.guard.ts` (+ spec), `auth.service.spec.ts`, `shared/microservices/auth-microservice/auth-microservice.service.ts` (+ spec).
- **Depends on:** `OTP-T-4`; `OTP-T-1` (error shapes); `OTP-T-3` contract (may proceed against `design.md` §4.2 with mocks) · **Blocks:** `OTP-T-6`
- **Estimate:** L · ~330 LOC
- **Verification:** `npx jest … src/auth src/shared/microservices/auth-microservice` — (a) foreign domain → 400, no MS call, `outcome: denied_domain`; (b) unknown/inactive user → 200 whose **keys, types and status deep-equal** the known-user body (decoy `session` matches `/^otp:/` and verifies; `destination` masked from the input), no MS call, `outcome: denied_user`; (c) known user → one MS call, 200 with the Cognito `session`; (d) 6th start within 15 min → 429 `OTP_RATE_LIMITED` with the neutral envelope, **for a known and for an unknown email alike**, and the guard's tracker returns the normalised email (unit test on `getTracker` with `x-forwarded-for` fallback); (e) verify success → response deep-equals `createSuccessfulLoginResponse(user, tokens)` for the same tokens and the **same fixture user loaded with `obj_role_by_user`**, `updateLastLoginUserByEmail` called once; (e′) fixture user without roles → `403 needsRoles` on the OTP path exactly as on `singIn`; (e″) decoy session on verify → 401 `OTP_NOT_AUTHORIZED` and **no** MS call; (f) each MS error code incl. `CHALLENGE_NOT_SUPPORTED` → 401 with the mapped `code`; (g) MS down → 503 `OTP_UPSTREAM_UNAVAILABLE`; (h) every logger argument stringified contains no code, session, token, full email or hostname; (i) DTO through the controller's `ValidationPipe`: `code: '12ab'` 400, extra field 400, missing `session` 400, `email` 255 chars 400; (j) `singIn` and `validateAuthCode` specs unchanged and green. **Input that fails it:** return 404 or omit `session` for the unknown user → (b) fails; count after the lookup → (d) unknown case stays 200 → fails; load the user without the relation → (e) returns 403 vs 200 → fails; build the verify payload by hand → (e) fails. **Disqualifiers:** (e) compared against a literal instead of the real `createSuccessfulLoginResponse` output; a fixture user without `obj_role_by_user` in (e); mocking `AuthService` methods under test; a throttler test that never sends the 6th request or never exercises the unknown-email case.
- **Definition of done:** red → green evidence; folder green; lint clean; no change to existing login methods (`git diff` shows additions only around them).

### `OTP-T-6` — PRMS client: API methods, `CognitoService` OTP calls, `CenterOtpPanelComponent` (state machine)

- **Type:** `client`
- **Description:** `AuthService` (api) `GET_otpConfig`, `POST_otpStart`, `POST_otpVerify`; `CognitoService.startOtp/verifyOtp` reusing `updateCacheService` + `redirectToHome` on success and returning mapped error keys otherwise; new standalone `CenterOtpPanelComponent` (`pages/login/components/center-otp-panel/`) with the §5.3 state machine (`email | code`, `busy`, `error` keys, `resendAt` 30 s cooldown, `back`), inline copy per `design.md` §5.3, `inputmode="numeric" autocomplete="one-time-code"`, `aria-live` status, `@ng-icons/lucide` icons only, `data-test` hooks, Tailwind-first styling matching `mockup/login-target.html`.
- **Implements:** `OTP-R-2` (all clauses: syntax + domain check before any request), `OTP-R-4` (client half: states, resend, back), `OTP-R-5` (client half: same cache + redirect), `OTP-R-14` (states), `OTP-R-20`, `OTP-R-21`, `OTP-R-22`, `OTP-R-23`, `OTP-AC-3`, `OTP-AC-6` (client), `OTP-AC-7/8` (copy), `OTP-DD-8`.
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/api/auth.service.ts` (+ spec), `shared/services/cognito.service.ts` (+ spec), `pages/login/components/center-otp-panel/center-otp-panel.component.{ts,html,spec.ts}`.
- **Depends on:** `OTP-T-5` contract (§4.1; may start with mocks) · **Blocks:** `OTP-T-7`
- **Estimate:** M · ~260 LOC
- **Verification:** `npx jest --silent --reporters=summary --no-coverage <panel spec> <cognito.service spec> <auth.service spec>` + `npx tsc --noEmit -p tsconfig.app.json` + `npx ng lint --quiet`: foreign domain → inline error, `POST_otpStart` **not** called; valid → called once, step becomes `code`, status text contains the masked destination; verify success → `updateCacheService` + `redirectToHome` called; `OTP_CODE_MISMATCH` → "Code incorrect" and session kept; `OTP_CODE_EXPIRED` / `OTP_ATTEMPTS_EXCEEDED` → copy + resend enabled; resend disabled for 30 s (fake timers advanced past 30 000 ms) then re-enabled and issues a new start; back returns to `email` keeping the value; 429/503 → their copy. **Input that fails it:** call start before the domain check → first assertion fails; forget the cooldown → timer test fails. **Disqualifiers:** asserting CSS classes instead of text/`aria-live` content and API call payloads; a cooldown test that never advances timers.
- **Definition of done:** specs green; `tsc` clean; lint clean; strings match `design.md` §5.3.

### `OTP-T-7` — PRMS client: `LoginComponent` integration, one-active-path rule, helper copy

- **Type:** `client`
- **Description:** `LoginComponent` loads `GET_otpConfig` on init into `centerDomains`; renders the Center block (description + button per the mockup) between the CGIAR button and the external block `@if (centerDomains().length)`; opening the Center panel closes the external form and vice-versa; the password-change form hides the Center block; helper text derives labels from domains via the label map (`icrisat.org → ICRISAT`, `cifor-icraf.org → CIFOR-ICRAF`, fallback domain); existing DOM for the two paths unchanged.
- **Implements:** `OTP-R-1` (all clauses), `OTP-R-10` (client half — no change to existing paths), `OTP-R-14` (choose state), `OTP-AC-1`, `OTP-AC-2`, `OTP-AC-13` (client half).
- **Files (expected):** `pages/login/login.component.{ts,html,scss,spec.ts}`.
- **Depends on:** `OTP-T-6`, `OTP-T-4` · **Blocks:** `OTP-T-8`, `OTP-T-9`
- **Estimate:** S · ~90 LOC
- **Verification:** `npx jest … login.component.spec.ts` + `tsc` + lint: `[]` → no `otp-center-button`; `['icrisat.org','cifor-icraf.org']` → button + helper "ICRISAT · CIFOR-ICRAF"; clicking Center then External hides the panel; pre-existing login tests pass unmodified; snapshot of the CGIAR and external blocks equals the pre-change snapshot (capture before editing). **Input that fails it:** render the button unconditionally → `[]` case fails. **Disqualifier:** a "pre-change snapshot" taken after the edit.
- **Definition of done:** spec green (existing cases untouched); `tsc` + lint clean.

### `OTP-T-8` — Cypress CT: `/login` with the Center panel at 1536 / 840 / 375

- **Type:** `tests`
- **Description:** New `login.component.cy.ts` mounting `LoginComponent` with stubbed `AuthService`/`ResultsApiService` (config → two domains; start → session; verify → `OTP_CODE_MISMATCH`), driving to the code step with an error; sweep 1536/840/375 with `assertEffectiveWidth`: `documentElement.scrollWidth <= clientWidth`, every control `getBoundingClientRect().height >= 24`, the `aria-live` region contains the error text, the code input has `inputmode="numeric"`.
- **Implements:** `OTP-R-14` (responsive + a11y), `OTP-AC-15`.
- **Files (expected):** `pages/login/login.component.cy.ts` (new).
- **Depends on:** `OTP-T-7` · **Blocks:** `OTP-T-9`
- **Estimate:** S · ~70 LOC
- **Verification:** `CT_DEV_SERVER_PORT=8091 ELECTRON_EXTRA_LAUNCH_ARGS=--js-flags=--max-old-space-size=2048 npx cypress run --component --spec src/app/pages/login/login.component.cy.ts` — all green, summary pasted into `execution.md`. **Input that fails it:** `white-space: nowrap` on the helper text or a fixed-width panel → 375 overflow fails. **Disqualifiers:** measured `clientWidth` off by > 4 px from the request; a run that never prints "passing".
- **Definition of done:** CT file committed; run output recorded.

### `OTP-T-9` — Docs, TEST HITL, PROD parity runbook

- **Type:** `docs` + `rollout`
- **Description:** Docs: `docs/trd/trd.md` auth/integrations rows (**recorded as pending, applied on the default branch — not a deliverable of this branch**), `onecgiar-pr-server/src/CLAUDE.md`/`AGENTS.md` auth line (new public routes under `/auth/*`, the parameter, the fact that `/auth/*` carries no JWT middleware), support runbook entry "code not received" (incl. the *PRMS user not in Cognito* case) in `runbook/cognito-email-otp.md`. **TEST HITL** (Orca browser at `prtest` or local against `authtest-ibd`): set `OTP_ALLOWED_EMAIL_DOMAINS` on TEST; with a real center-domain mailbox: choose → email → code received → wrong code copy → correct code → session with roles; foreign domain copy; unknown user neutral copy; expired code (wait past the pinned expiry); SAML and password logins re-tested; screenshots + `auth.otp.*` log lines (redacted) into `execution.md`. **PROD parity** (after `OTP-OQ-1`): repeat `design.md` §5.4 on the PROD pool with before/after diff; deploy microservice `main-auth` and PRMS; set the PROD parameter last; record `OTP-OQ-8` decision (SES yes/no) with the TEST delivery evidence.
- **Implements:** `OTP-R-8` (PROD parity), `OTP-R-10` (live re-test), `OTP-R-12` (events observed), `OTP-AC-13`, `OTP-AC-16`; live confirmation of `OTP-AC-4/6/7/8`; the "no automated gate" row of `requirements.md` §9.
- **Files (expected):** `runbook/cognito-email-otp.md`, `runbook/prod-before.json`, `runbook/prod-after.json`, `onecgiar-pr-server/src/CLAUDE.md`, `onecgiar-pr-server/AGENTS.md`, `execution.md`; `docs/trd/trd.md` (pending, default branch).
- **Depends on:** `OTP-T-3` (deployed), `OTP-T-7`, `OTP-T-8`; PROD half on `OTP-OQ-1` · **Blocks:** —
- **Estimate:** S · ~40 LOC docs + HITL
- **Verification:** HITL checklist all ticked with evidence; PROD diff equals the TEST diff (same single field). **Input that fails it:** code never arrives in TEST → `PRODUCT_BUG` (delivery/quota), do not tick. **Disqualifier:** screenshots without the redacted `auth.otp.*` log lines; a PROD step without the before-export.
- **Definition of done:** guides updated; TRD row pending; TEST evidence recorded; PROD parity done or explicitly parked with its blocker.

### `OTP-T-10` — **Conditional:** provisioning adjustment so center users land `CONFIRMED` (only if the spike says `FORCE_CHANGE_PASSWORD` blocks `EMAIL_OTP`)

- **Type:** `server` (microservice)
- **Description:** Executed **only** when `OTP-T-1` records that a `FORCE_CHANGE_PASSWORD` user cannot complete `EMAIL_OTP` (`design.md` §13). In the microservice `createUser` (`/auth/register`): after `AdminCreateUser`, call `AdminSetUserPassword { Permanent: true }` with a random high-entropy password **when the email domain is in a `PASSWORDLESS_DOMAINS` env list** (so existing external users keep today's temporary-password flow), ensure `email_verified=true`, and skip the welcome-password email for those domains; document the env var. Existing behaviour for all other domains unchanged.
- **Implements:** `OTP-R-13` (provisioning adjustment clause), `OTP-AC-12`.
- **Files (expected):** `auth-microservice/src/api/auth/services/cognito/cognito.service.ts` (`createUser`), `auth.service.ts`, specs, README env table.
- **Depends on:** `OTP-T-1` (trigger) · **Blocks:** `OTP-T-9` (HITL must run against a `CONFIRMED` center user)
- **Estimate:** S · ~60 LOC
- **Verification:** `npm test -- cognito.service` — for a `PASSWORDLESS_DOMAINS` email: `AdminCreateUser` then `AdminSetUserPassword { Permanent: true }` called, welcome email suppressed; for another domain: existing behaviour byte-identical (existing tests unchanged). **Input that fails it:** call `AdminSetUserPassword` for every domain → the external-user regression test fails. **Disqualifier:** logging the generated password anywhere.
- **Definition of done:** tests green; documented; a freshly provisioned TEST center user shows `CONFIRMED` in the pool export.

## 4. Dependency graph

```
OTP-T-1 (Cognito TEST spike, fixtures, runbook)
   ├── OTP-T-2 (MS CognitoService, TDD) ── OTP-T-3 (MS routes + deploy TEST) ──┐
   ├── OTP-T-10 (conditional: provisioning adjustment) ─────────────────────────┤
   └── OTP-T-5 (PRMS server start/verify, TDD) ◄── OTP-T-4 (param, config, cache wiring)   │
              └── OTP-T-6 (client panel + services) ── OTP-T-7 (LoginComponent) ── OTP-T-8 (CT) ─┤
                                                                                                └── OTP-T-9 (docs, TEST HITL, PROD parity)
```

Parallel-friendly: `OTP-T-2/T-3` (microservice repo) ∥ `OTP-T-4/T-5` (PRMS server); `OTP-T-6` may start against the §4.1 contract with mocks while `OTP-T-5` lands. Width cap 2.

## 5. Coverage map (scenario / clause level)

| Requirement / clause | Owned by |
|---|---|
| R-1 third path when list non-empty; hidden when empty; existing paths unchanged; placement | T-7 (client), T-4 (empty list → `[]`) |
| R-2 email step; syntax + domain check before any request; foreign-domain inline message; no server call | T-6 |
| R-3 normalise; allow-list + active local user; byte-identical neutral 200 (real or decoy session); rate limit before lookup; 400 only for foreign domain; never creates users | T-5 (all clauses) |
| Scenario R-3: normalisation, one MS call, `outcome: sent`; unknown → same body shape (decoy) and no MS call; 6th call 429 for both; 400 only foreign domain; no user creation | T-5 |
| R-4 code field (numeric, paste, autofocus), masked destination, verify, resend cooldown, back; distinct copy mismatch/expired/attempts; attempt limit → new code | T-6 (UI), T-5 (codes), T-2 (mapping) |
| Scenario R-4: correct code → JWT + redirect; wrong keeps session; expired/used → copy, no retry; resend after expiry/limit | T-6, T-5 |
| R-5 same JWT/user payload, storage, redirect; Center User role effective | T-5 (`createSuccessfulLoginResponse`), T-6 (`updateCacheService`/`redirectToHome`) |
| R-6 public under `/auth/*` (no JWT middleware — proven by a spec case); DTO limits; whitelist; per-email limit before lookup; neutral 429 body | T-4 (middleware case), T-5 (DTOs, guard) |
| R-7 MS endpoints; same client/secret hash/error mapping; stable codes incl. `CHALLENGE_NOT_SUPPORTED`; `SELECT_CHALLENGE` answered with its session; no raw Cognito text | T-2, T-3 |
| R-8 additive factor; PRMS client keeps `ALLOW_USER_AUTH`; nothing else changes; before/after diff; rollback rehearsed; PROD parity | T-1 (TEST), T-9 (PROD) |
| Scenario R-8: single-field diff; `ALLOW_USER_AUTH` present; no other change; reversible byte-for-byte | T-1 |
| R-9 global parameter; 60 s cache; `config` endpoint; copy derives from the list | T-4, T-7 |
| R-10 existing paths unchanged; tests pass unmodified; additions only | T-5 (server diff), T-7 (client snapshot), T-3 (MS tests), T-9 (live) |
| Scenario R-10: suites pass unedited; no route/DTO/copy modified; diff = additions | T-5, T-7, T-3 |
| R-11 no code/session/token/full email/hostname/env in logs or responses | T-2, T-5 (log sweeps) |
| R-12 `auth.otp.start/verify` fields; MS `otp.*` outcome only | T-5, T-3 |
| R-13 provisioning unchanged; no create/activate; `FORCE_CHANGE_PASSWORD` confirmed — or the provisioning adjustment executed | T-5 (no create), T-1 (spike), T-10 (conditional) |
| R-14 states choose/email/code/error; 375 px no overflow; keyboard, labels, live region | T-6, T-7, T-8 |
| R-20 resend cooldown 30 s + fresh session · R-21 masked destination · R-22 pending redirect · R-23 remembered email | T-6 |
| AC-1..AC-16 | AC-1/2 → T-7 (+T-4) · AC-3 → T-6 · AC-4 → T-5 + T-3 (+T-9 live) · AC-5 → T-5 · AC-6 → T-5 + T-6 · AC-7/8 → T-2 + T-5 + T-6 · AC-9 → T-5 · AC-10 → T-2 + T-5 · AC-11/12 → T-1 · AC-13 → T-5/T-7/T-3 (+T-9) · AC-14 → T-2 + T-5 · AC-15 → T-8 · AC-16 → T-9 |

No clause is discharged by citing a different requirement; `OTP-R-30/31` (MAY) are deliberately unowned in this release.

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `OTP-TEST-1` | runbook evidence | R-8, AC-11, AC-12 | `runbook/*.json`, `fixtures/cognito/*.json` |
| `OTP-TEST-2` | unit (microservice) | R-7, R-11, AC-7/8/10/14 | `auth-microservice/src/api/auth/services/cognito/cognito.service.spec.ts` |
| `OTP-TEST-3` | unit (microservice) | R-7, R-12 | `auth-microservice/src/api/auth/auth.controller.spec.ts`, `auth.service.spec.ts` |
| `OTP-TEST-4` | unit (server) | R-9, R-6 (public paths) | `onecgiar-pr-server/src/auth/auth.service.spec.ts`, `Middlewares/jwt.middleware.spec.ts` |
| `OTP-TEST-5` | unit (server, TDD) | R-3, R-4, R-5, R-6, R-11, R-12, R-13, AC-4/5/6/7/8/9/10/14 | `src/auth/auth.service.spec.ts`, `dto/otp.dto.spec.ts`, `guards/otp-throttler.guard.spec.ts`, `auth-microservice.service.spec.ts` |
| `OTP-TEST-10` | unit (microservice, conditional) | R-13 adjustment, AC-12 | `auth-microservice/src/api/auth/services/cognito/cognito.service.spec.ts` |
| `OTP-TEST-6` | unit (client) | R-2, R-4, R-5, R-14, R-20..23, AC-3/6/7/8 | `center-otp-panel.component.spec.ts`, `cognito.service.spec.ts`, `auth.service.spec.ts` |
| `OTP-TEST-7` | unit (client) | R-1, R-10, AC-1/2/13 | `login.component.spec.ts` |
| `OTP-TEST-8` | cypress CT | R-14, AC-15 | `pages/login/login.component.cy.ts` |
| `OTP-TEST-9` | manual HITL + runbook | AC-4/6/7/8/13/16 live | `execution.md`, `runbook/` |

Coverage thresholds unaffected (server 5/20/35/40, client 50/60/60/60); new files target ≥ 80 % lines.

## 7. Rollout & verification

- [ ] PR strategy (~1,250 LOC across two repos): **PR A — microservice** (`dev-auth`: T-2, T-3, T-10 if triggered; review first `cognito.service.ts` payloads and error mapping; out of scope: any PRMS change). **PR B — PRMS server** (T-4, T-5; review first `startOtp` neutral branches and the `createSuccessfulLoginResponse` reuse; links PR A). **PR C — PRMS client** (T-6, T-7, T-8; review first the panel state machine and the one-active-path rule; links PR B). Bodies follow `cognitive-doc-design` review-empathy rules.
- [ ] CI green in both repos (lint, jest, build, `migration:check:ci`, SonarCloud).
- [ ] Deploy order TEST: Cognito factor (T-1) → microservice (T-3) → PRMS server → PRMS client → set `OTP_ALLOWED_EMAIL_DOMAINS`.
- [ ] TEST HITL evidence (T-9); PROD parity after `OTP-OQ-1`; `OTP-OQ-8` decided.
- [ ] Telemetry: `auth.otp.*` visible; no code/session/token strings.

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `/akili-archive` applies the TRD rows and promotes the Center path pattern if reused.
- [ ] Follow-ups (`design.md` §13): per-instance counter, SES for PROD, externals on the code path, tenant federation.

## 9. Roll-back plan

1. Instant: empty `OTP_ALLOWED_EMAIL_DOMAINS` (path hidden; routes answer 400).
2. Revert PR C, then PR B, then PR A (each independently safe: client hides on 404 config; server routes unused; microservice endpoints unused).
3. Cognito: remove `EMAIL_OTP` per the runbook; diff equals the *before* export. Data migration `down` removes the parameter row.
