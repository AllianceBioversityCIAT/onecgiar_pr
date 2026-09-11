# Execution Log — Email one-time-code login for CGIAR center staff outside Active Directory

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/cognito-email-otp-login/` · Module code `OTP` |
| Linked | `requirements.md` (rev 1.1) · `design.md` (rev 2) · `tasks.md` · `judgment.md` · `proposal.md` |
| Approval Mode | pre-approved (standing mandate 2026-09-02) — routine gates logged `auto-approved (pre-approved mode)`; **Cognito toggles, microservice deploys, PROD steps stop for the user** |
| Budget (design §14) | 9 tasks (+1 conditional) · ~1,250 LOC · ≤ 1 Reviewer round per task; tripwire > 12 tasks or > 1,500 LOC |
| Leader | Claude Fable 5.1 (registry T1 row says `opus`; newer session model passes silently) |
| Implementer / Reviewer | `akili-implementer` (`sonnet`) / `akili-reviewer` (`opus`) wrappers; model rotation on 429 per project practice |
| Repositories | PRMS worktree `qa-development-2026` (shared with other sessions — explicit-path commits) · microservice `/Users/jcadavid/Development/one-cgiar-microservices` (`main` checked out; `dev-auth` via a worktree) |
| Started | 2026-09-11 |
| Status | in-progress |

### Pre-flight (2026-09-11)

- `OTP-OQ-6` resolved by the user before execution: the microservice serving Reporting and QA uses `COGNITO_CLIENT_ID=6ph57q…` = `general-client`, which already carries `ALLOW_USER_AUTH` → no client-level Cognito change. Docs updated (`requirements.md` §11 + current-state row, `design.md` §1/§4.2, `tasks.md` pre-flight + `OTP-T-1`).
- `OTP-OQ-1` (PROD pool) still open — blocks only the PROD half of `OTP-T-9`.
- No other spec under `docs/specs/` touches `pages/login`, `auth/login` or OTP.
- The microservice checkout has no `auth-microservice/.env`; the spike reads the `general-client` secret at run time through `describe-user-pool-client` (`IBD-DEV`, read-only) into a shell variable — never printed, never saved.
- Eligible now (no dependencies): `OTP-T-1` (read-only export phase; the `EMAIL_OTP` toggle is HITL for the user) and `OTP-T-4` (PRMS server parameter/config). Disjoint files and packages → parallel, width 2.

## Task Execution History

### `OTP-T-1` — Cognito TEST spike (phase 1: read-only export, sibling tabulation, runbook, spike script)

| Field | Value |
|---|---|
| Status | **`[~]` — phase 1 done; awaiting the HITL toggle of `EMAIL_OTP` in the console (user), then phase 2 (after-export/diff, spike calls, fixtures, rollback rehearsal)** |
| Date | 2026-09-11 |
| Implementer | `akili-implementer` (`sonnet`), effort `high`, skill `aws-security`; AWS calls read-only (`describe-user-pool`, `list-user-pool-clients`, `describe-user-pool-client`), profile `IBD-DEV` |

**Phase 1 evidence**

- Files: `runbook/test-before.json` (`{ pool, clients[10] }`, sorted keys, `ClientSecret` stripped), `runbook/test-before.normalized.json` (volatile fields dropped for the phase-2 diff), `runbook/sibling-clients.md`, `runbook/cognito-email-otp.md` (design §5.4 steps with the console click path as the sanctioned change; `--cli-input-json` recipe with the strip-key list cross-checked against `update-user-pool --generate-cli-skeleton`; bare `update-user-pool` forbidden in bold), `scripts/spike-email-otp.sh` (reads the `general-client` secret at run time via `describe-user-pool-client`, computes `SECRET_HASH` with `openssl`, `initiate-auth USER_AUTH PREFERRED_CHALLENGE=EMAIL_OTP`, `respond-to-auth-challenge EMAIL_OTP` (+ `SELECT_CHALLENGE` variant), writes fixtures with `Session`/tokens redacted; `set +x`; not executed), `fixtures/cognito/README.md`.
- Facts from the export: `general-client` (`6ph57q…`) lists `ALLOW_USER_AUTH` (`OTP-OQ-6` re-confirmed); pool `AllowedFirstAuthFactors = ["PASSWORD"]`; `EmailSendingAccount = COGNITO_DEFAULT`; `UserPoolTier = PLUS`; 10 app clients.
- Sibling clients that gain a *selectable* `EMAIL_OTP` factor once the pool allows it (already `ALLOW_USER_AUTH`): My web app-3qpmje (`1g5t8h`), MARLO (`6kb9tc`), general-client (`6ph57q`), TIP TEST (`706plh`), PRMS-Reporting (`u0fum2`) — pool owner to notify per runbook step 2.
- Verification: `jq empty` PASS; `grep -c ClientSecret runbook/*.json` → 0; `grep -rn "eyJ\|ClientSecret\":" runbook fixtures scripts` → nothing; `bash -n scripts/spike-email-otp.sh` PASS; `update-user-pool` appears only in the prohibition and the `--cli-input-json` recipe.
- Not done (phase 2): toggle, after-export + diff, spike calls, fixtures, `design.md` §4.2 / `OTP-OQ-7` pin, rollback rehearsal.

### `OTP-T-4` — PRMS server: allow-list parameter, `config` route, cache wiring

| Field | Value |
|---|---|
| Final status | **PASS** (attempt 1 of 3) |
| Date | 2026-09-11 |
| Implementer | `akili-implementer` (`sonnet`), effort `medium`, skill `nestjs-expert` |
| Reviewer | `akili-reviewer` (`opus`), lens checklist mode |
| Requirements covered | `OTP-R-9` (parameter, parser, `config` route; cache semantics see decision), `OTP-R-1` server half, `OTP-R-6` (public by construction), `OTP-AC-1/2` server half; `OTP-DD-5` |
| Ran in parallel with | `OTP-T-1` phases 1–2a (docs/runbook only) |

**Attempt 1**

- Files changed: `src/migrations/1788730000000-OTP-allowed-email-domains.ts` (new; inserts `OTP_ALLOWED_EMAIL_DOMAINS` = `''` into `global_parameters`, category via subquery on `platform_global_variables`; `down` deletes by name; pattern `1787850000000-MRFSeedAiNarrativeParameters.ts`), `src/auth/auth.module.ts` (imports `GlobalParameterCacheModule`), `src/auth/auth.service.ts` (`getOtpAllowedDomains()` via `GlobalParameterCacheService.getParam()`; `getOtpConfig()` envelope), `src/auth/auth.controller.ts` (`@Get('/login/otp/config')`), `src/auth/auth.service.spec.ts` (+ parser/config suites), `src/auth/Middlewares/jwt.middleware.spec.ts` (+1 mount-level case: real `AuthModule.configure()` with a mocked `MiddlewareConsumer`, precedent `app.module.spec.ts` — proves `/auth/login/otp/config` is in neither `forRoutes` list; `AppModule` mounts cover `api/*`, `v2/*`, `clarisa/*`, `toc/*`, `type-one-report` only). No `JwtMiddleware` code change.
- Implementer verification: `npx jest --silent --reporters=summary --forceExit src/auth` → `Test Suites: 7 passed · Tests: 111 passed, 111 total`; `npx tsc --noEmit -p tsconfig.json` clean; eslint clean. Migration against the TEST DB (the `:3400` backend's `.env`): `run` → row `value=''`, `global_parameter_category_id=2` (`platform_global_variables`); `migration:check` → `Pending: 0`; `revert` → row gone; `run` → re-inserted; left applied.
- Reviewer verdict: **PASS**. Summary: implements `OTP-T-4` as written — accessor through the existing cache service per `OTP-DD-5`/JA-13, envelope matches §4.1 and the `ResponseInterceptor` convention, migration matches §3.2 and the exemplar, middleware proof genuine (not disqualified; both mount points covered — one by the new case, one by `app.module.spec.ts`), existing login flows untouched (`OTP-R-10`).
- **Leader decision on the Reviewer's risk advisory:** `GlobalParameterCacheService.getParam()` has **no TTL and no live invalidation caller**, so a domain added by an admin is invisible until the process restarts — this contradicts `OTP-R-9` ("cached ≤ 60 s") and weakens `OTP-US-2`. Requirement kept as written; **forward pointer → `OTP-T-5`:** add a 60 s staleness check in `getOtpAllowedDomains()` that calls `clearCacheByKey('OTP_ALLOWED_EMAIL_DOMAINS')` before `getParam()` when the last read is older than 60 s (≈ 6 lines + 1 test with fake timers). Not a T-4 rework: T-4 followed the authoritative design decision.

**ADVISORY (recorded — folded into the `OTP-T-5` forward pointer where cheap)**

- Readability: design §5.1 says "drops … any `@`" but the parser strips only a leading `@`; a pasted full address survives as a junk entry (fail-closed). → T-5: drop entries still containing `@` after the leading-strip.
- Reliability: no de-duplication → helper copy could render a center twice. → T-5: `[...new Set(...)]`.
- Risk: migration `up` has no duplicate guard (same as the exemplar) — note only.
- Readability: `getOtpConfig(): Promise<any>` could be `Promise<returnFormatService>`.

**Decisions / issues**: see the cache decision above. Budget: 1 Reviewer round. Gate: `auto-approved (pre-approved mode)`.

### `OTP-T-1` — phase 2a: after-export and single-field diff (2026-09-11)

- User performed the console toggle (design §5.4 step 3; approver Juan Carlos Cadavid, 2026-09-11; screenshots held by the approver).
- Implementer (`sonnet`, read-only AWS): `runbook/test-after.json`, `test-after.normalized.json`, `test-diff.txt`; runbook steps 3–4 filled.
- Diff (verbatim): `680c680,681 · <  "PASSWORD" · --- · >  "PASSWORD", · >  "EMAIL_OTP"` — the only differing line (`OTP-AC-11`). Per-client `ExplicitAuthFlows`/`SupportedIdentityProviders`/`CallbackURLs` (all 10) and pool `LambdaConfig`/`MfaConfiguration`/`EmailConfiguration`/`AdminCreateUserConfig`/`DeletionProtection`/`AutoVerifiedAttributes`: no change. `grep ClientSecret` → 0; no tokens saved.
- Next (phase 2b, Leader-driven HITL with the user in the loop): provision a TEST user via the microservice `/auth/register` (user's decision — lands `FORCE_CHANGE_PASSWORD`, the case to prove), run `scripts/spike-email-otp.sh` (`InitiateAuth` → code from the user's mailbox → `RespondToAuthChallenge`), capture redacted fixtures, pin `OTP-OQ-7`, rehearse rollback (steps 4b, 5, 6).

### `OTP-T-5` — PRMS server: `startOtp` / `verifyOtp`, DTOs, throttling, microservice client

| Field | Value |
|---|---|
| Final status | _in progress — attempt 1 FAIL (two lens Reviewers), attempt 2 running_ |
| Date | 2026-09-11 |
| Implementer | `akili-implementer` (`sonnet`), effort `xhigh`, skills `nestjs-expert`, `error-handling-patterns`, `tdd` |
| Reviewers | parallel lens mode (xhigh + security surface): lens A contract/reliability, lens B security/log hygiene — both `opus` |
| Requirements covered | `OTP-R-3` (+ scenario), `OTP-R-4` server half, `OTP-R-5`, `OTP-R-6`, `OTP-R-9` (60 s cache pointer), `OTP-R-11`, `OTP-R-12`, `OTP-R-13`, `OTP-AC-4..10`, `OTP-AC-14`; `OTP-DD-3/4/6` |

**Attempt 1 — FAIL**

- Files: `auth.service.ts` (+spec) — `startOtp`/`verifyOtp`, decoy session, masking, error mapping, T-4 pointers (60 s staleness via `clearCacheByKey`, `@`-drop, dedupe, `getOtpConfig` typing); `auth.controller.ts` (+spec DI fix) — 2 routes; `auth.module.ts` (guard provider); `dto/otp-start.dto.ts`, `dto/otp-verify.dto.ts`, `dto/otp.dto.spec.ts`; `guards/otp-throttler.guard.ts` (+spec, real Nest app + supertest); `shared/microservices/auth-microservice/auth-microservice.service.ts` (+spec) — `startEmailOtp`/`verifyEmailOtp`.
- Red → green per group (`TS2339 startEmailOtp`, `Cannot find module './otp-throttler.guard'`, `TS2339 startOtp`); final `Test Suites: 10 passed · Tests: 172 passed`; `tsc` clean; eslint clean. (e) compared against the real `createSuccessfulLoginResponse(mockOtpUser, tokens)` with a relation-loaded fixture; (e′) `403 needsRoles`; (e″) decoy → 401 no MS call; decoy = `otp:<hmac>.<nonce>.<exp>.<filler>` = 685 chars.
- Implementer `Not Done / Assumptions`: destination mask derived from the submitted email for both branches (accepted — it is what keeps the value class identical; design §5.1 wording corrected); (d) asserted at the guard layer; `migration:check` not run (no entities touched).
- **Lens A — FAIL (3 issues):** (1) the app-global `ThrottlerExcludeBilateralGuard` (`APP_GUARD`) also enforces the OTP routes' `@Throttle` limits keyed on `req.ip` with the raw `ThrottlerException` body — under API Gateway one shared bucket would cap all OTP starts at 5/15 min (`OTP-R-6`, §4.1, `OTP-AC-9/4`); remediation: named `otp` throttler + `@SkipThrottle({ default: true })` + composition test with both guards; (2) `outcome: rate_limited` never emitted (`OTP-R-12`, `OTP-AC-9`); (3) `OtpVerifyDto.session` accepts `''` (`OTP-R-6`). Advisories: guard a `start` reply without `session` → 503; PRMS-side failures should not read as `upstream_error`; `auth.controller.spec.ts` DI-only edit to be recorded as an accepted `OTP-AC-13` deviation; §5.1 "its masked destination" wording outdated. Verified clean: ordering, relation-loaded lookups, `updateLastLoginUserByEmail → createSuccessfulLoginResponse` parity, error map, MS client mirroring, `ThrottlerModule` `@Global()`, 60 s staleness test, DTO pipe.
- **Lens B — FAIL (3 issues):** (1) `session: ''` accepted; (2) `rate_limited` not emitted; (3) the decoy HMAC is never verified on the live path (`isDecoySession` checks only the `otp:` prefix; `verifyDecoySession`/`timingSafeEqual` reached only from tests) and the key falls back to `''` when `JWT_SKEY` is unset. Advisories: the `otp:` prefix in `response.session` is a one-request existence oracle and the fixed 685-char length fingerprints decoys (real sessions vary); a wrong code on a real session → `OTP_CODE_MISMATCH` while a decoy → `OTP_NOT_AUTHORIZED` (second oracle, contradicts `OTP-DD-3`); microservice outage turns `start` into an existence channel; `getTracker` uses the raw body email uncapped; `auth.otp.*` logs at info vs `OTP-R-11` "debug"; duplicated normalisation.
- **Leader decisions (spec amended before the rework — design §4.1/§5.1/`OTP-DD-3`/§13, requirements `OTP-R-4`/`OTP-R-11`):** decoy becomes **prefix-free**, base64url, layout `hmac‖nonce‖exp‖filler`, length **jittered 1,400–1,700** (the spike measured a real Cognito session at 1,543 chars — the design's 500–900 class was wrong), HMAC verified on the live path with `timingSafeEqual`, key `JWT_SKEY` with a per-process random fallback; a verified decoy answers **`401 OTP_CODE_MISMATCH`** like a wrong real code (expired decoy → `OTP_NOT_AUTHORIZED`); **named throttler `otp`** + `@SkipThrottle({ default: true })` so the global guard skips the routes; `getTracker` caps/normalises the email; `rate_limited` emitted by the guard; log level stays info (domain only) — `OTP-R-11` relaxed; outage-time existence channel and the `auth.controller.spec.ts` DI edit recorded as accepted in §13. Rework attempt 2 spawned with both reports verbatim.

### `OTP-T-1` — phase 2b (Leader-driven HITL spike, in progress, 2026-09-11)

- **Local `.env` finding:** the PRMS server `.env` in this checkout points `MS_AUTH_URL` at the **PROD** auth microservice (`auth-ibd.prms.cgiar.org`, inline `# Prod`). The attempted `/auth/register` call did not leave the machine (malformed host → `http 000`), **nothing was created through PROD**. Test users were created directly in the TEST pool instead (`AdminCreateUser`, the same API `/auth/register` uses). Operational note for the user: local development currently authenticates against PROD auth.
- **User 1** `jucacar22@gmail.com` (user-provided mailbox): `admin-create-user --message-action SUPPRESS`, no temporary password, `email_verified=true` → landed **`CONFIRMED`** (not `FORCE_CHANGE_PASSWORD`) — relevant to the `OTP-R-13` contingency: creating without a temporary password yields a confirmed passwordless user.
- **User 2** `jucacar22+fcp@gmail.com` (Gmail alias, same inbox) with a temporary password (`SUPPRESS`) → **blocked by the harness permission classifier**; not created yet — pending the user's decision (create in console, or allow the CLI call).
- `InitiateAuth USER_AUTH PREFERRED_CHALLENGE=EMAIL_OTP` (client `general-client`, secret read at run time, never printed): `ChallengeName: EMAIL_OTP` **direct** (no `SELECT_CHALLENGE`), `AvailableChallenges: ["EMAIL_OTP"]`, `CODE_DELIVERY_DESTINATION: j***@g***`, `Session` 1,543 chars → `fixtures/cognito/initiate-auth.email-otp.json` (redacted). Code **8 digits**, delivered to the **spam folder** within ~1 min (Cognito default sender) — runbook note.
- First `RespondToAuthChallenge` attempt failed with an unreadable CLI response (the script captured no JSON; session discarded). Script hardened to wrap AWS CLI text errors as JSON fixtures; `InitiateAuth` re-run at 14:16:33 (new session, new code) — awaiting the user's code.

