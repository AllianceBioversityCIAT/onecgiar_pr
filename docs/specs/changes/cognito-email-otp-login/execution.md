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

