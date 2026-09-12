# DevOps — the three Cognito trigger Lambdas

Three Node 22 Lambdas implement Cognito's `CUSTOM_AUTH` flow for the PRMS Center login. They are **synchronous triggers on the critical path of every Center sign-in**: Cognito aborts them at 5 s. They hold no AWS SDK and exactly one runtime dependency (`amqplib`).

They are **inert** until a pool's `LambdaConfig` points at them, and they only ever fire for app clients whose `ExplicitAuthFlows` include `ALLOW_CUSTOM_AUTH`.

---

> **Naming and tagging convention (decided 2026-09-12):** stacks are `prms-cognito-otp-triggers-test` / `prms-cognito-otp-triggers-prod`; every deploy passes `--tags Project=PRMS Environment=<test|prod> Area=IBD Service=cognito-otp-triggers` so the functions, role and log groups inherit the tags (CloudFormation propagates stack tags). **Constraint:** Cognito invokes triggers only in the same AWS account and region as the user pool — the PROD stack must be deployed in the account/region that owns the PROD pool (`OTP-OQ-1`), even if that is not IBD-DEV.

## 1. The three functions

| Function (logical) | Deployed name | What it does |
|---|---|---|
| `DefineAuthChallengeFunction` | `<stack>-define-auth-challenge` | State machine. No session → `CUSTOM_CHALLENGE`. Last answer correct → `issueTokens`. Three rounds wrong → `failAuthentication` (Cognito raises `NotAuthorizedException`). Otherwise another `CUSTOM_CHALLENGE` |
| `CreateAuthChallengeFunction` | `<stack>-create-auth-challenge` | Reuses the code in the previous round's `challengeMetadata` (`CODE-<code>`) or mints a fresh `crypto.randomInt` 6-digit one; stores it in `privateChallengeParameters.answer`, exposes only a masked `destination`, and — **only for a fresh code** — publishes the e-mail to the notification queue |
| `VerifyAuthChallengeFunction` | `<stack>-verify-auth-challenge` | `answerCorrect = timingSafeEqual(answer, stored)` |

Two properties worth stating: **one e-mail per Cognito session** (a wrong code rotates the session but keeps the code), and **an unknown user is indistinguishable from a real one** (a challenge is still issued, with a random mask and no e-mail).

## 2. Where the code lives

```
one-cgiar-microservices/cognito-triggers/
├── src/
│   ├── define-auth-challenge.ts        # handler
│   ├── create-auth-challenge.ts        # handler
│   ├── verify-auth-challenge.ts        # handler
│   └── lib/{code,mask,email-template,rmq-publisher,logger}.ts
├── template.yaml                       # AWS SAM: 3 functions + log groups + invoke permissions
├── package.json                        # only runtime dep: amqplib
└── README.md                           # the authoritative package doc
```

Branches follow the repo convention: **`dev-auth`** → TEST, **`main-auth`** → PROD.

## 3. Build, test, deploy

```bash
cd cognito-triggers
npm ci
npm test              # jest — 8 suites, no AWS and no broker required
npm run typecheck     # tsc --noEmit
npm run build         # tsc -> dist/
sam build             # packages dist/ — ALWAYS after npm run build
sam deploy --stack-name prms-cognito-otp-triggers-<env> \
  --resolve-s3 --capabilities CAPABILITY_IAM \
  --profile <profile> --region <region> \
  --parameter-overrides <see table below>
```

| Gotcha | Detail |
|---|---|
| **Docker required** | `sam deploy` needs a running Docker/Finch client even for zip functions; otherwise `ContainerNotReachableException` |
| **Build before package** | `sam build` packages `dist/`. Skipping `npm run build` redeploys stale code silently — this happened once on TEST |
| `samconfig.toml` | Written by `--guided`, and **git-ignored on purpose** — it would otherwise hold the broker password |
| Artifact size | ~1 MB because `sam build` keeps devDependencies. Optional slim: `(cd .aws-sam/build/<Fn> && npm prune --omit=dev)` per function |

**Stack naming:** `prms-cognito-otp-triggers-test` (live) · `prms-cognito-otp-triggers-prod` (not created yet). The stack outputs the three function ARNs — that is what the pool wiring step consumes.

## 4. Parameters and where their values come from

| SAM parameter | Lambda env var | `NoEcho` | Source (TEST, from the PRMS Lambda `prstaging-dev-main`) |
|---|---|---|---|
| `UserPoolId` | — (used for the invoke-permission ARN) | no | The pool the triggers serve. Default is the IBD-DEV TEST pool; **PROD is a different account (`OTP-OQ-1`, unresolved)** |
| `MsNotificationHost` | `MS_NOTIFICATION_HOST` | yes | `RABBITMQ_URL` — a complete broker URL; **takes precedence and is used verbatim** |
| `MsRmqHost` / `MsRmqUser` / `MsRmqPassword` | `MS_RMQ_HOST` / `MS_RMQ_USER` / `MS_RMQ_PASSWORD` | host no, rest yes | Alternative to the above; assembled as `amqps://<user>:<pass>@<host>`, credentials **percent-encoded**, scheme/port preserved, **no path segment ever appended** |
| `MsNotificationQueue` | `MS_NOTIFICATION_QUEUE` | no | `EMAIL_QUEUE` |
| `MsNotificationUser` / `MsNotificationPassword` | `MS_NOTIFICATION_USER` / `MS_NOTIFICATION_PASSWORD` | yes | Same names on the PRMS Lambda — CLARISA application credentials the notification consumer's `AuthInterceptor` validates |
| `EmailSender` | `EMAIL_SENDER` | no | Same name on the PRMS Lambda; default `PRMS-No-reply@cgiar.org` |
| `AppUrl` | `APP_URL` | no | Footer link; default `https://reporting.cgiar.org/` |
| `LogRetentionInDays` | — | no | Default `30` |

On TEST these were piped straight from `prstaging-dev-main`'s environment into `sam deploy --parameter-overrides` without ever being printed.

> **Follow-up (recommended, not implemented):** move the broker and notification credentials to **Secrets Manager or SSM Parameter Store** and read them at cold start. `NoEcho` keeps them out of stack events, but they remain readable from the Lambda configuration by anyone with `lambda:GetFunctionConfiguration`. Recorded in `design.md` §18.3.

## 5. IAM

| Grant | Scope |
|---|---|
| Execution role | CloudWatch **Logs only** (SAM's default `AWSLambdaBasicExecutionRole`). No AWS SDK is bundled and no AWS API is called at runtime |
| `lambda:InvokeFunction` | Granted to principal `cognito-idp.amazonaws.com`, `SourceArn` scoped to **this pool's ARN** (`arn:<partition>:cognito-idp:<region>:<account>:userpool/<UserPoolId>`), one permission per function |

Wiring the triggers through the **console** would add an *unscoped* invoke permission of its own — `sam deploy` already grants the scoped one, so prefer the CLI (`--cli-input-json`) path for `LambdaConfig`.

## 6. Runtime limits

| Limit | Value | Why |
|---|---|---|
| Cognito sync-trigger ceiling | **5 s, hard** | Cognito aborts the sign-in past it |
| `Timeout` | **5** (`Globals.Function`) | Never outlive Cognito's own ceiling |
| AMQP connect timeout | **3 s** | Leaves headroom inside the 5 s budget |
| `MemorySize` / `Architectures` / `Runtime` | 256 MB / `arm64` / `nodejs22.x` | — |
| Publish semantics | confirm channel + `waitForConfirms()` before returning, `persistent: true` | A Lambda freezes the instant its handler resolves, so an unconfirmed publish can be lost |
| Queue assertion | **The queue is not asserted** | It is owned by `notification-microservice`; re-asserting with different arguments kills the channel with `PRECONDITION_FAILED` |

## 7. Proposed Jenkins job

Not built yet. Mirror `.github/workflows/jenkins-trigger-auth-microservice.yml`, which maps a push on `dev-auth` / `main-auth` to `https://automation.prms.cgiar.org/job/auth-microservice-<branch>/build`.

**Jobs:** `cognito-triggers-dev-auth` (TEST) and `cognito-triggers-main-auth` (PROD).

| Stage | Command |
|---|---|
| 1 | `checkout` the branch, working dir `cognito-triggers/` |
| 2 | `npm ci` |
| 3 | `npm test` (fail the build on red) |
| 4 | `npm run build` |
| 5 | `sam build` |
| 6 | `sam deploy --no-confirm-changeset --stack-name prms-cognito-otp-triggers-<env> --resolve-s3 --capabilities CAPABILITY_IAM --parameter-overrides <…>` |

Parameter overrides come from **Jenkins credentials**, not the repo (`MsNotificationHost` / `MsRmqPassword` / `MsNotificationUser` / `MsNotificationPassword` at minimum). The agent needs a Docker daemon and an AWS role allowed to deploy the stack.

**Not automated on purpose:** wiring `LambdaConfig` on the pool and changing `AuthSessionValidity`. Those are HITL steps with a before/after export diff — see [`prod-rollout-runbook.md`](./prod-rollout-runbook.md).

## 8. Monitoring

Log groups: `/aws/lambda/prms-cognito-otp-triggers-<env>-{define,create,verify}-auth-challenge`, retention `LogRetentionInDays` (default 30).

One single-line JSON record per invocation, fields restricted by an **allow-list in `lib/logger.ts`**:

```json
{"event":"create_auth_challenge","outcome":"code_sent","durationMs":84,"hasSession":false,"attempt":0}
```

| `outcome` | Meaning | Alert? |
|---|---|---|
| `email_failed` | The broker publish failed. The challenge was still returned — the user sees "check your inbox" and never gets the mail | **Yes — any occurrence.** This is silent user-facing breakage |
| `code_sent` | Fresh code minted and e-mail queued — **also what a decoy challenge for an unknown user logs**, so CloudWatch cannot be used to enumerate addresses | No |
| `code_reused` | Retry reused the session's code; no e-mail | No |
| `challenge_issued` / `tokens_issued` | Define asked for another challenge / accepted the answer | No |
| `attempts_exceeded` | Define failed the flow after three rounds | Trend only |
| `answer_accepted` / `answer_rejected` | Verify's decision on one answer | Trend only |
| — | Lambda `Errors` metric > 0, or `Duration` p95 approaching 5,000 ms | **Yes** — a timeout aborts the sign-in |

**Never logged:** the code, the address, the Cognito session, `challengeMetadata`, broker credentials, or the broker error object (it can carry the connection URL with credentials). `create-auth-challenge.spec.ts` scans every logger call for all of these.

## 9. Rollback

1. Detach the three `LambdaConfig` entries from the pool (console, or `--cli-input-json` from a fresh export — see the PROD runbook). With the triggers unwired the pool behaves exactly as before.
2. Only then `sam delete --stack-name prms-cognito-otp-triggers-<env>`.
3. Redeploying an older build is just steps 3–6 of §3 from the previous commit.

## 10. Known assumptions

| # | Assumption | Status |
|---|---|---|
| 1 | **RMQ envelope.** The publisher reproduces `@nestjs/microservices` `ClientRMQ.dispatchEvent` — `Buffer.from(JSON.stringify({ pattern, data }))`, **no `id` / `correlationId`** (that absence is how `ServerRMQ` tells an event from a request) | ✅ **Verified live on TEST** (`OTP-T-14` step 2, 2026-09-11): broker confirmed the publish and the e-mail was delivered |
| 2 | **`to` and `cc` are strings, not arrays.** Matches the emitter already proven against the deployed TEST consumer (`auth-microservice/.../bulk-registration.service.ts:173`) and the consumer's `String.split(',')`. PRMS's own `email-notification-management` DTO types them `string[]` — a different consumer version | ✅ Verified on TEST. **If a PROD consumer rejects a string**, it is a one-line change in `lib/email-template.ts` (`buildOtpEmailMessage`): `to: [email]` / `cc: []`. Check this first if a smoke test queues a message that never becomes an e-mail |
| 3 | **`socketFile` is an HTML string, not a Buffer.** The consumer does `typeof file === 'string' ? Buffer.from(file) : file`; a serialised Buffer would arrive as `{ type: 'Buffer', data: [...] }` | ✅ Verified on TEST |
| 4 | **Percent-encoded credentials** in the assembled fallback URL are decoded correctly by `amqplib` | ✅ Verified live on TEST with the TEST broker |
| 5 | Broker reachable from a **non-VPC** Lambda (`OTP-OQ-9`) | ✅ Answered yes on TEST. Recorded fallback if a PROD broker is not: HTTP `POST /send` on the notification microservice's API Gateway with the `auth` header — same `ConfigMessageDto`, different transport |

---

**Sources:** `one-cgiar-microservices/cognito-triggers/README.md` (flow, layout, queue contract, environment, develop/deploy, pool wiring, observability, test) · `cognito-triggers/template.yaml` (parameters, `Globals`, log groups, invoke permissions, outputs) · `cognito-triggers/package.json` (scripts, engines, deps) · `docs/specs/changes/cognito-email-otp-login/execution.md` (`OTP-T-11`, `OTP-T-14` prep + steps 1–2, logo redeploy note) · `design.md` §18.2, §18.3 · `.github/workflows/jenkins-trigger-auth-microservice.yml`

**Last verified:** 2026-09-12
