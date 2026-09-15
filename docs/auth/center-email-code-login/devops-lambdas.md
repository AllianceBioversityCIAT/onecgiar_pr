# Infrastructure notes (Option D)

**There is nothing new for DevOps to deploy beyond PRMS itself.** As of rev 4, the Center email-code login is entirely PRMS server code plus one migration and one global parameter — the same deploy pipeline, the same monitoring surface, the same on-call ownership as every other PRMS feature.

---

## 1. What actually ships

| Item | Detail |
|---|---|
| Migration `1788740000000-OTP-challenges` | Creates `otp_challenges` (5-minute rows, opportunistically purged). Applied by the same Jenkins deploy pipeline that applies every other PRMS migration — no separate step, no manual trigger |
| Migration `1788730000000-OTP-allowed-email-domains` | Inserts the `OTP_ALLOWED_EMAIL_DOMAINS` global parameter, empty. Also applied automatically |
| E-mail pipeline | Reuses `EmailNotificationManagementService` — the RabbitMQ → notification-microservice → SMTP path every other PRMS e-mail already goes through. No new queue, no new broker credentials, no new SMTP configuration |
| Runtime env | `EMAIL_SENDER`, `JWT_SKEY`, `RABBITMQ_URL`, `EMAIL_QUEUE` — all pre-existing PRMS variables. Nothing new to provision or rotate on account of this feature |

## 2. Monitoring

`auth.otp.start` / `auth.otp.verify` outcome lines are emitted by `logOtpEvent` (`onecgiar-pr-server/src/auth/utils/otp-shared.util.ts`) straight into the **PRMS server's own container logs** — the same log stream every other PRMS request logs to. No new log group, no new IAM policy for log access.

| Outcome | Alert? |
|---|---|
| `email_failed` (`auth.otp.start`) | **Yes.** The challenge was minted but the notification pipeline could not take the message — the user sees "check your inbox" and it never arrives. Silent user-facing breakage |
| `internal_error` (either event) | **Yes.** A local DB/cache fault on PRMS's own side (allow-list read, challenge insert/lookup) |
| `rate_limited` | Trend only |
| Everything else (`sent`, `ok`, `provisioned`, `mismatch`, `expired`, `attempts_exceeded`, `consumed`, `denied_domain`, `denied_user`, `not_authorized`) | Expected traffic shape, no alert |

Log line shape: `auth.otp.<start|verify> { domain: '<domain>', outcome: '<outcome>', durationMs: <n> }` — never the address, the code, the session or the JWT.

## 3. Retired: the `cognito-triggers` SAM stack and pool triggers

Option B (2026-09-11) built and proved a `CUSTOM_AUTH` design on the TEST Cognito pool: three Lambda triggers (`Define`/`Create`/`VerifyAuthChallenge`) in `one-cgiar-microservices/cognito-triggers/`, wired onto the pool's `LambdaConfig`. Option D replaces that design entirely — PRMS owns the whole code lifecycle now, and nothing in that package runs on this path any more.

**How to remove it in TEST:**

1. **Detach `LambdaConfig` from the pool**, built from a fresh `describe-user-pool` export (writable keys only, `Policies`/every other field re-sent unchanged) with the three trigger entries removed:
   ```bash
   aws cognito-idp describe-user-pool --user-pool-id "$TEST_POOL" > pool-fresh.json
   jq '.UserPool | { UserPoolId: .Id, Policies, LambdaConfig: {}, ... }' pool-fresh.json > pool-update.json
   # diff against the fresh export first — must be LambdaConfig only
   aws cognito-idp update-user-pool --cli-input-json file://pool-update.json
   ```
   Never run a bare `update-user-pool` — it is a full replace, and any writable field you omit resets to its default.
2. **Delete the stack:**
   ```bash
   sam delete --stack-name prms-cognito-otp-triggers-test
   ```
   Only after step 1 — deleting the stack first would leave the pool pointing at Lambda ARNs that no longer exist.
3. **Restore `general-client`'s `AuthSessionValidity` to 3** (it was raised to 5 for Option B's code lifetime; Option D's lifetime lives in the `otp_challenges.expires_at` column, not the Cognito client config). Built from a fresh `describe-user-pool-client` export the same way, changing only `AuthSessionValidity`.

After these three steps the TEST pool returns to its pre-spec state — `LambdaConfig {}`, `AuthSessionValidity 3` — and the `cognito-triggers/` package stays in its repo as reference only (its README carries a "not in use" banner).

**PROD never had any of this.** The Cognito-trigger design was proven on TEST but was never deployable to the PROD pool (that account grants Cognito console access only — no Lambda/CloudFormation/IAM), which is exactly why Option D exists. There is no PROD teardown to perform.

## 4. If a future app needs Cognito-native OTP

Option D is PRMS-specific: it works because PRMS already has its own JWT session and its own e-mail pipeline, and does not need Cognito to mediate either. An app that genuinely needs Cognito to issue its own tokens for a passwordless flow (rather than a PRMS-style server-owned code) would revisit the retired `cognito-triggers` design — see that package's own README for the trigger contracts, IAM shape and RabbitMQ envelope it used, and `adopting-in-other-apps.md` in this folder for the options available to a second PRMS-family app today.

---

**Sources:** `docs/specs/changes/cognito-email-otp-login/design.md` §19.1, §19.3 · `execution.md` (`OTP-T-16`, rev 4 pivot, T-18 note) · `onecgiar-pr-server/src/auth/utils/otp-shared.util.ts` (`logOtpEvent`) · `onecgiar-pr-server/src/auth/otp/otp-challenge.service.ts` (purge, TTL, attempts) · `onecgiar-pr-server/src/migrations/{1788730000000-OTP-allowed-email-domains.ts,1788740000000-OTP-challenges.ts}` · `onecgiar-pr-server/CLAUDE.md` §5 (migration ownership) · `one-cgiar-microservices/cognito-triggers/README.md` (retired design, kept as reference)

**Last verified:** 2026-09-12
