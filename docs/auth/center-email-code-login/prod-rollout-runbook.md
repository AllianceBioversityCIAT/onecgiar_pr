# PROD rollout runbook — Center email-code login

Step-by-step configuration of the Center (email one-time-code) login on **PROD**, mirroring what was executed on TEST on 2026-09-11 (`execution.md` → `OTP-T-14`, steps 0–8). Every step here was performed at least once on TEST; the commands are parameterised — **no values, no secrets, no real addresses**.

> **PROD does not need the `EMAIL_OTP` first-auth factor.** TEST carried it only for the initial spike (`OTP-T-1`) and it was rolled back on 2026-09-11. The `CUSTOM_AUTH` design needs only the three pool triggers plus `ALLOW_CUSTOM_AUTH` on the app client.

> **Order matters.** The PRMS global parameter is the feature switch and is set **last** (step 6). Until then the Center button does not render.

---

## Prerequisites

| # | Item | Status |
|---|---|---|
| 1 | **Which pool / AWS account serves PROD** | ❌ **Unknown — `OTP-OQ-1`.** Not in `IBD-DEV`. Everything below is blocked on this answer |
| 2 | PROD app client with `ALLOW_CUSTOM_AUTH` in `ExplicitAuthFlows`, and its id + secret already configured in the AUTH microservice (`COGNITO_CLIENT_ID` / `COGNITO_CLIENT_SECRET` / `COGNITO_USER_POOL_URL`) | To confirm on the PROD pool |
| 3 | PROD RabbitMQ broker URL (or host/user/password) + the notification queue name + the CLARISA application user/password the notification consumer validates | From DevOps |
| 4 | PROD `EMAIL_SENDER` (expected `PRMS-No-reply@cgiar.org`) and `APP_URL` | From DevOps |
| 5 | A controlled mailbox on an allow-listed PROD domain for the smoke test | Owner-provided |
| 6 | Deploy mechanism for the triggers stack: a DevOps Jenkins job (proposed — see [`devops-lambdas.md`](./devops-lambdas.md)) **or** a manual `sam deploy` from a workstation with **Docker running** | Decide before step 1 |
| 7 | A named approver for each pool-level write, as on TEST | Required by `design.md` §5.4 / `OTP-DD-7` |

---

## Known pre-PROD fixes (blocking)

Two hardening items recorded in `docs/specs/changes/cognito-email-otp-login/design.md` §13 are **required before the PROD rollout starts** (decision 2026-09-12; both are small and have no TEST impact):

| # | Item | Where | Status |
|---|---|---|---|
| 1 | Decoy session: fill the unused trailing bits of each base64url segment with randomness and add a domain-separation byte between the exp-mask HMAC and the decoy-auth HMAC — removes the ~1/256 decoy-vs-real charset classifier (§13 (l)) | PRMS server `src/auth/auth.service.ts` (`buildDecoySession` / `parseDecoySession`) + spec | **open** |
| 2 | Unknown-user destination mask in `CreateAuthChallenge`: derive the mask from `event.userName` instead of random letters (§13 (m)) | `cognito-triggers/src/create-auth-challenge.ts` + spec, redeploy the stack | **open** |

Do not proceed to Step 0 until both are merged and deployed to TEST; record their commits in `execution.md`.

## Step 0 — Before-export of the pool and the client

Capture the rollback source **first**. Redact and keep it with the spec.

```bash
POOL=<prod-pool-id>
CLIENT=<prod-app-client-id>
AWS="aws --profile <prod-profile> --region <region>"

$AWS cognito-idp describe-user-pool        --user-pool-id "$POOL"                       > prod-before.json
$AWS cognito-idp describe-user-pool-client --user-pool-id "$POOL" --client-id "$CLIENT" > prod-client-before.json

# Strip the client secret before the file touches the repo.
jq 'del(.UserPoolClient.ClientSecret)' prod-client-before.json > prod-client-before.redacted.json
```

**Checks:** `grep -c ClientSecret prod-*.json` → 0 after redaction; record `LambdaConfig`, `Policies.SignInPolicy.AllowedFirstAuthFactors`, `AuthSessionValidity` and the pool ARN.

## Step 1 — Deploy the triggers stack

Stack name: **`prms-cognito-otp-triggers-prod`**.

```bash
cd <repo>/cognito-triggers
npm ci && npm test
npm run build          # sam build packages dist/ — tsc MUST run first, or you redeploy the old code
sam build
sam deploy --stack-name prms-cognito-otp-triggers-prod \
  --resolve-s3 --capabilities CAPABILITY_IAM \
  --profile <prod-profile> --region <region> \
  --parameter-overrides \
     UserPoolId=<prod-pool-id> \
     MsNotificationHost=<broker-url> \
     MsNotificationQueue=<queue> \
     MsNotificationUser=<user> MsNotificationPassword=<password> \
     EmailSender=<sender> AppUrl=<app-url>
```

**Two traps observed on TEST:**
- `sam deploy` requires a running **Docker/Finch** client even for zip functions — without it it fails with `ContainerNotReachableException`.
- `npm run build` **must precede** `sam build`. The first TEST redeploy was a silent no-op because `dist/` was stale.

Record the three function ARNs from the stack outputs — step 3 needs them.

## Step 2 — Test invocation of `CreateAuthChallenge`

Proves the broker is reachable from a non-VPC Lambda **and** that the e-mail envelope is accepted, before the pool is touched.

```bash
# Synthetic CreateAuthChallenge_Authentication event, session: [], userName = <controlled mailbox>
$AWS lambda invoke --function-name prms-cognito-otp-triggers-prod-create-auth-challenge \
  --payload file://create-auth-challenge-event.json out.json
```

**Expect:** HTTP 200, no function error; `publicChallengeParameters.destination` masked; a 6-digit `privateChallengeParameters.answer` (do not print or store it); log line `{"event":"create_auth_challenge","outcome":"code_sent","durationMs":<n>,"hasSession":false,"attempt":0}`. `code_sent` means the publish was **confirmed by the broker**.

**Then confirm delivery with the mailbox owner:** sender "PRMS Reporting Tool", subject *"Your PRMS Reporting Tool sign-in code"*, inbox (not spam). The code from a synthetic invocation is bound to no Cognito session and is unusable.

If nothing arrives: check the `to`-as-string assumption first (see `devops-lambdas.md` → Known assumptions).

## Step 3 — Wire `LambdaConfig` on the pool

> 🚫 **Never run a bare `aws cognito-idp update-user-pool`.** It is a full replace: every attribute you omit is reset to its default. On a shared multi-tenant pool that is an outage. The console path is the sanctioned alternative (*User pool → Authentication → Extensions → Add Lambda trigger → Custom authentication → all three*).

```bash
# Build a complete update input from a FRESH export, writable keys only, adding only LambdaConfig.
$AWS cognito-idp describe-user-pool --user-pool-id "$POOL" > pool-fresh.json

jq --arg define "$DEFINE_ARN" --arg create "$CREATE_ARN" --arg verify "$VERIFY_ARN" '
  .UserPool
  | { UserPoolId: .Id, Policies, DeletionProtection, LambdaConfig,
      AutoVerifiedAttributes, SmsVerificationMessage, EmailVerificationMessage,
      EmailVerificationSubject, SmsAuthenticationMessage, VerificationMessageTemplate,
      UserAttributeUpdateSettings, MfaConfiguration, DeviceConfiguration,
      EmailConfiguration, SmsConfiguration, UserPoolTags, AdminCreateUserConfig,
      UserPoolAddOns, AccountRecoverySetting, UserPoolTier }
  | with_entries(select(.value != null))
  | .LambdaConfig += { DefineAuthChallenge: $define,
                       CreateAuthChallenge: $create,
                       VerifyAuthChallengeResponse: $verify }
' pool-fresh.json > pool-update.json

# Pre-flight diff — a named approver reads this BEFORE anything is applied.
diff <(jq -S .UserPool pool-fresh.json) <(jq -S . pool-update.json)
```

Known benign diff noise, both seen on TEST: non-writable keys dropped by the projection, and the deprecated `AdminCreateUserConfig.UnusedAccountValidityDays` (drop it — it conflicts with `Policies.PasswordPolicy.TemporaryPasswordValidityDays`). **Anything else in the diff → stop.**

```bash
$AWS cognito-idp update-user-pool --cli-input-json file://pool-update.json
$AWS cognito-idp describe-user-pool --user-pool-id "$POOL" > prod-after-lambda.json
diff <(jq -S . prod-before.json) <(jq -S . prod-after-lambda.json)   # must be LambdaConfig ONLY
```

## Step 4 — Raise the client's `AuthSessionValidity` to 5 minutes

This is the code's lifetime. `update-user-pool-client` **also resets omitted fields**, so build the input from the client's full current config.

```bash
$AWS cognito-idp describe-user-pool-client --user-pool-id "$POOL" --client-id "$CLIENT" > client-fresh.json

jq '.UserPoolClient
    | del(.ClientSecret, .CreationDate, .LastModifiedDate)
    | .AuthSessionValidity = 5' client-fresh.json > client-update.json

diff <(jq -S '.UserPoolClient | del(.ClientSecret,.CreationDate,.LastModifiedDate)' client-fresh.json) \
     <(jq -S . client-update.json)      # must be AuthSessionValidity ONLY

$AWS cognito-idp update-user-pool-client --cli-input-json file://client-update.json
```

## Step 5 — Deploy the AUTH microservice

Merge to **`main-auth`** (the PROD branch; TEST used `dev-auth`) so the Jenkins job deploys the `CUSTOM_AUTH` version, with `PASSWORDLESS_DOMAINS` set to the PROD center domains.

**Verify:** PROD Swagger — `login/otp/start` describes `CUSTOM_AUTH`. That description is the deploy detector used on TEST.

## Step 6 — Set the PRMS PROD allow-list (the feature switch)

Set `global_parameters.OTP_ALLOWED_EMAIL_DOMAINS` (category `platform_global_variables`) to the same comma-separated, lower-case, no-`@` list used for `PASSWORDLESS_DOMAINS` in step 5. **Dual allow-list rule:** a domain in only one of the two places produces a user who can never complete the Center login.

The parameter is read through `GlobalParameterCacheService` with a **60 s** staleness window — allow a minute before the button appears.

## Step 7 — Smoke

| # | Case | Expected |
|---|---|---|
| 7a | `POST /auth/login/otp/start` (microservice) for an address unknown to Cognito | `201 { challengeName: 'CUSTOM_CHALLENGE', session, codeDeliveryDestination }` — a **simulated** challenge, **no e-mail** |
| 7b | Real allow-listed user via the PRMS UI → e-mail | Code arrives < 60 s from "PRMS Reporting Tool", inbox |
| 7c | Wrong code | `401 OTP_CODE_MISMATCH` with a **rotated `session`**; Verify trigger logs `answer_rejected`; **no second e-mail** |
| 7d | Right code (with the rotated session) | `201 { tokens }` at the microservice / PRMS session at the UI; Define logs `tokens_issued`. First login for a new user → PRMS guest user created (`auth.otp.verify outcome: provisioned`) |

## Step 8 — Sibling check

Re-read every app client on the PROD pool and confirm **no other client** lists `ALLOW_CUSTOM_AUTH`:

```bash
for c in $($AWS cognito-idp list-user-pool-clients --user-pool-id "$POOL" --query 'UserPoolClients[].ClientId' --output text); do
  $AWS cognito-idp describe-user-pool-client --user-pool-id "$POOL" --client-id "$c" \
    --query 'UserPoolClient.{Name:ClientName,Flows:ExplicitAuthFlows}'
done
```

On TEST this was config-verified: only `general-client` allows `CUSTOM_AUTH`, so the triggers are inert for the other 9 clients. A live login with a real sibling account is the stronger check if a credentialed account is available.

---

## Rollback

| Scope | Action | Effect |
|---|---|---|
| **Instant, no cloud change** | Empty `OTP_ALLOWED_EMAIL_DOMAINS` | The Center button disappears within the 60 s cache window; `start` answers `400` for every address. **Do this first in an incident** |
| Pool | Detach `LambdaConfig` — same `--cli-input-json` recipe as step 3, built from a **fresh** export, with the three entries removed (or the console: remove the three triggers) | The pool behaves exactly as before; nothing in the deployed stack affects it |
| Client | Restore `AuthSessionValidity` from `prod-client-before.redacted.json` | Optional; isolated to the one client |
| Stack | `sam delete --stack-name prms-cognito-otp-triggers-prod` | Only **after** `LambdaConfig` is detached, or `CUSTOM_AUTH` sign-ins break |
| Microservice | Redeploy the previous `main-auth` build | The OTP routes are additive; existing flows are untouched either way |

---

**Sources:** `docs/specs/changes/cognito-email-otp-login/execution.md` (`OTP-T-14` prep + steps 0–8, 2026-09-11 20:26–21:52) · `design.md` §5.4, §18.2, `OTP-DD-7` · `runbook/cognito-email-otp.md` (steps 1–7, step 6 rollback rehearsal, CLI `--cli-input-json` recipe) · `one-cgiar-microservices/cognito-triggers/README.md` (Deploy, *Wire the pool*, Rollback) + `template.yaml` (parameters, stack outputs) · `one-cgiar-microservices/auth-microservice/README.md` (`PASSWORDLESS_DOMAINS`, OTP routes) · `.github/workflows/jenkins-trigger-auth-microservice.yml` (branch → job mapping)

**Last verified:** 2026-09-12
