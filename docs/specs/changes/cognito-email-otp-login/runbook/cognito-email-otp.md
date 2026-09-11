# Cognito TEST runbook — enable `EMAIL_OTP`

Pool `us-east-1_o9y9Yq5pO` (TEST, `us-east-1`). Source of truth for facts below: `runbook/test-before.json` (captured 2026-09-11, read-only `describe-user-pool` + `describe-user-pool-client` x10, secrets stripped).

## Facts confirmed from the export (phase 1)

| Fact | Value |
|---|---|
| `general-client` (`6ph57q…`) `ExplicitAuthFlows` includes `ALLOW_USER_AUTH`? | **Yes** — `ALLOW_ADMIN_USER_PASSWORD_AUTH`, `ALLOW_CUSTOM_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_AUTH`, `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SRP_AUTH`. No client-level change needed (`OTP-OQ-6` re-confirmed). |
| Pool `Policies.SignInPolicy.AllowedFirstAuthFactors` today | `["PASSWORD"]` |
| `EmailConfiguration.EmailSendingAccount` | `COGNITO_DEFAULT` (feeds `OTP-OQ-8`) |
| `UserPoolTier` | `PLUS` |
| App clients on the pool | 10 (see `runbook/sibling-clients.md`) |
| Clients gaining selectable `EMAIL_OTP` (already `ALLOW_USER_AUTH`) | My web app - 3qpmje (`1g5t8h`), MARLO (`6kb9tc`), general-client (`6ph57q`), TIP TEST (`706plh`), PRMS-Reporting (`u0fum2`) |

## Step-by-step (design.md §5.4)

### 1. Export before
Done (phase 1). `describe-user-pool` + `describe-user-pool-client` x10, secrets redacted → `runbook/test-before.json` (`{ pool, clients: [...] }`, sorted keys, `ClientSecret` deleted from every client). Normalised copy with volatile fields dropped (`LastModifiedDate`, `CreationDate`, `EstimatedNumberOfUsers`) → `runbook/test-before.normalized.json`. This is what phase 2's diff runs against.

### 2. Tabulate sibling exposure
Done (phase 1) — `runbook/sibling-clients.md`. 5 of 10 clients already allow `ALLOW_USER_AUTH` and therefore gain `EMAIL_OTP` as a selectable factor pool-wide the moment the toggle is on (it is a `SignInPolicy` setting on the pool, not a per-client flag), and they share the pool's 50/day default email quota. **The pool owner notifies those 5 teams before step 3.**

### 3. Change — console is the sanctioned path

**Console click path** (sanctioned):
1. AWS Console → Cognito → User pools → `us-east-1_o9y9Yq5pO`.
2. **Sign-in** tab → **Options for choice-based sign-in** section.
3. Screenshot the current state first (only `Password` ticked) — attach to this runbook as evidence.
4. Tick **Email message one-time password**.
5. Save.
6. Screenshot the new state (`Password` + `Email message one-time password` both ticked) — attach to this runbook as evidence.

Performed by a **named approver**: `Juan Carlos Cadavid`, date/time: `2026-09-11` (console click path). Screenshots for step 3/6 above are held by the approver, not attached to this runbook.

**A bare `aws cognito-idp update-user-pool` call is FORBIDDEN.** It resets every parameter you omit (`AutoVerifiedAttributes`, `EmailConfiguration`, `AdminCreateUserConfig`, `LambdaConfig`, `MfaConfiguration`, `DeletionProtection`, …) to service defaults — on a ten-tenant pool that is an outage, not a scoped change. **Never run it without `--cli-input-json` built from the current export as described below.**

**CLI alternative (only if the console path is unavailable), fully specified:**

1. Derive `input.json` from `runbook/test-before.json` (the pool object, `.pool`), keeping every field the API accepts so nothing un-named gets reset, and stripping the fields that are not valid `update-user-pool` input (confirmed against `aws cognito-idp update-user-pool --generate-cli-skeleton`, client-side, no API call):
   ```bash
   jq '.pool
     | del(
         .Id, .Name, .Status, .SchemaAttributes, .EstimatedNumberOfUsers,
         .LastModifiedDate, .CreationDate, .Arn, .Domain, .CustomDomain,
         .UserPoolTier, .UserPoolTags,
         .SmsConfigurationFailure, .EmailConfigurationFailure,
         .UsernameAttributes, .UsernameConfiguration,
         .IssuerConfiguration, .KeyConfiguration
       )
     | .UserPoolId = "us-east-1_o9y9Yq5pO"
   ' runbook/test-before.json > /tmp/input.json
   ```
   Key notes:
   - `Id` → becomes the top-level `UserPoolId` field (not passed under its export name).
   - `Status` is listed in design.md §5.4 step 3 as a non-writable key to strip; it does not appear in this pool's current export (no-op `del`, kept for template completeness in case a future export includes it).
   - `UsernameAttributes`, `UsernameConfiguration`, `IssuerConfiguration`, `KeyConfiguration` are additional fields found in *this* pool's actual export that are either immutable after creation or better left untouched; stripped defensively (`generate-cli-skeleton` lists `IssuerConfiguration`/`KeyConfiguration` as technically accepted, but this pool's export shows no custom-domain JWT config to resend, so they are excluded rather than round-tripped).
   - `CustomDomain`, `SmsConfigurationFailure`, `EmailConfigurationFailure` are not present in this pool's export today; the `del()` above is a no-op for them and stays in the recipe so it is safe to reuse if a later export carries them.

2. **Change only one field** in `/tmp/input.json`:
   ```bash
   jq '.Policies.SignInPolicy.AllowedFirstAuthFactors = ["PASSWORD", "EMAIL_OTP"]' /tmp/input.json > /tmp/input.changed.json
   ```

3. **Pre-flight diff** — must show exactly the one intended change before anything is applied:
   ```bash
   diff <(jq -S . /tmp/input.json) <(jq -S . /tmp/input.changed.json)
   ```
   Expected output: only the `AllowedFirstAuthFactors` array gains `"EMAIL_OTP"`. Any other line in the diff → stop, do not proceed, investigate.

4. Named approver reviews the diff and the full `/tmp/input.changed.json`, then (and only then):
   ```bash
   aws cognito-idp update-user-pool --user-pool-id us-east-1_o9y9Yq5pO \
     --cli-input-json file:///tmp/input.changed.json --region us-east-1
   ```

Approver for the CLI path: not applicable this run — the initial toggle used the console click path (named approver in step 3 above). The CLI path itself was exercised for the rollback rehearsal (step 6), approved by the user (see step 6 below).

### 4. Export after and diff
**Done (phase 2a).** `describe-user-pool` + `describe-user-pool-client` x10 again (read-only, same 10 `ClientId`s as phase 1) → `runbook/test-after.json` (same jq recipe as step 1, `ClientSecret` deleted from every client, sorted keys) → `runbook/test-after.normalized.json` (same volatile fields dropped: pool `EstimatedNumberOfUsers`/`CreationDate`/`LastModifiedDate`, each client `CreationDate`/`LastModifiedDate`). Verification:
```bash
diff <(jq -S . runbook/test-before.normalized.json) <(jq -S . runbook/test-after.normalized.json) | tee runbook/test-diff.txt
```
Expected: only `pool.Policies.SignInPolicy.AllowedFirstAuthFactors` differs (`OTP-AC-11`). **Actual output (`runbook/test-diff.txt`):**
```
680c680,681
<           "PASSWORD"
---
>           "PASSWORD",
>           "EMAIL_OTP"
```
Confirms `OTP-AC-11`: `AllowedFirstAuthFactors` gains `EMAIL_OTP`, `PASSWORD` is kept, and this is the **only** line that differs across the pool object and all 10 clients.

Additional targeted diffs run to satisfy the phase-2a brief (all empty — zero differences):
- Per-client `{ExplicitAuthFlows, SupportedIdentityProviders, CallbackURLs}` across all 10 clients: unchanged.
- Pool-level `{LambdaConfig, MfaConfiguration, EmailConfiguration, AdminCreateUserConfig, DeletionProtection, AutoVerifiedAttributes}`: unchanged.

Sanity: `grep -c ClientSecret runbook/*.json` → 0 in all four files; `grep -rn "eyJ" runbook` → no matches.

### 4b. Smoke one sibling tenant (done, substitute form)
Without sibling credentials, ran `InitiateAuth USER_PASSWORD_AUTH` with a non-existent user against the `Alliance` and `TOC` app clients (secret hash computed at run time, never stored) — expected `NotAuthorizedException`, confirming the password flow is still served on sibling clients, unaffected by the pool-level `EMAIL_OTP` toggle. Also confirmed the hosted-UI `/oauth2/authorize` endpoint for `PRMS-Reporting` and `CGIAR-AzureAD` still answers. Exact call outcomes are recorded in `execution.md` (this runbook describes the method only, not the response bodies). A full login with a real, credentialed sibling account remains a **`OTP-T-9` TEST HITL item** (see "Not done this phase" below).

### 5. Smoke PRMS / spike observations
**Done (phase 2, 2026-09-11).** Using `general-client` (`6ph57qfck44f8d4jgf47if0s11`) id + secret read at run time read at run time via `describe-user-pool-client` (never stored — see `scripts/spike-email-otp.sh`)) via `scripts/spike-email-otp.sh`, ran `InitiateAuth` (`USER_AUTH`, `PREFERRED_CHALLENGE=EMAIL_OTP`) and `RespondToAuthChallenge` (`EMAIL_OTP`) against two TEST users — one `CONFIRMED`, one `FORCE_CHANGE_PASSWORD` — with a real mailbox. Full results are recorded once, in the canonical "Spike observations (step 5, …)" table further down this file — see that section for the challenge shape, `CODE_DELIVERY_DETAILS` masking, code length, expiry, attempt limit, delivery time, the simulated-challenge shape for an unknown email, and the `FORCE_CHANGE_PASSWORD` result (feeds `OTP-OQ-7`/`OTP-OQ-8`, triggers `OTP-T-10`).

Notes on that table:
- The `SELECT_CHALLENGE` branch offering `EMAIL_OTP` as one of several challenges (`design.md` §4.2) was **not observed** — the `CONFIRMED` user got a direct `EMAIL_OTP` challenge instead. That branch remains design-derived, not spike-confirmed.
- `respond-to-auth.code-mismatch.json` and `respond-to-auth.code-mismatch.attempt-6.json` are byte-identical (`CodeMismatchException` every time) — the "×6, no lockout" claim rests on the recorded call sequence, not on any difference between the two fixture files.
- `AdminCreateUser` → `CONFIRMED` (last row of the table below) is proven end-to-end by `OTP-T-10`'s Definition of Done (`admin-get-user` on a freshly provisioned TEST user), not by a fixture in this directory.

Redacted fixtures captured under `fixtures/cognito/` — see that directory's README for the exact files present and what each one shows.

### 5b. Re-confirm `OTP-OQ-6`
Done (phase 1, from `runbook/test-before.json`): client `6ph57qfck44f8d4jgf47if0s11` (`general-client`) lists `ALLOW_USER_AUTH`. See "Facts confirmed" above.

### 6. Rollback rehearsal (TEST only)
**Done (2026-09-11, CLI path, approved by the user).** Rollback (`AllowedFirstAuthFactors` back to `["PASSWORD"]`) diffed clean against `test-before.normalized.json` at the pool level, then `EMAIL_OTP` was re-enabled and diffed clean against `test-after.normalized.json` across pool + all 10 clients. See "Step 6 — Rollback rehearsal (TEST, 2026-09-11, CLI path, approved by the user)" further down this file for the exact calls, evidence files and the shell word-splitting note.

### 7. PROD
**Blocked on `OTP-OQ-1`** — which pool/account serves PROD; not in `IBD-DEV`. Genuinely outstanding, not started. Once resolved: identical steps 1–6 on the PROD pool; PRMS allow-list (`OTP_ALLOWED_EMAIL_DOMAINS`) set last, after the PROD Cognito change is verified.

## Support runbook cross-reference

See `design.md` §9 for the "code not received" triage table (this runbook's spike observations feed the specific values there).

## Not done this phase

- **Step 7 (PROD)** is blocked on `OTP-OQ-1` (which pool/account serves PROD) — genuinely outstanding, not started.
- **Sibling credentialed login** — a real sibling account signing in end-to-end, as opposed to step 4b's substitute negative-auth probe — is parked as a **`OTP-T-9` TEST HITL checklist item**: full login with a real sibling account remains a T-9 HITL item, not a phase-1/2 spike deliverable.
- Test users `<spike mailbox>` (`CONFIRMED`) and `<spike mailbox>+fcp` (`FORCE_CHANGE_PASSWORD`) are still live in the TEST pool for `OTP-T-9`'s HITL pass — delete via `admin-delete-user` once that HITL is done.

Steps 3–6 (console toggle, sibling smoke, spike, rollback) have all been executed and recorded — see those steps above and the "Spike observations" / "Step 6" sections below. Every `update-user-pool` write made under this runbook went through the approved `--cli-input-json` recipe in step 3; the bare, unscoped form remains forbidden and was never used.

## Spike observations (step 5, 2026-09-11 — client `general-client`, TEST pool)

| Observation | Value | Fixture |
|---|---|---|
| `CONFIRMED` passwordless user, `InitiateAuth USER_AUTH PREFERRED_CHALLENGE=EMAIL_OTP` | `ChallengeName: EMAIL_OTP` directly, `AvailableChallenges: ["EMAIL_OTP"]`, `CODE_DELIVERY_DESTINATION: j***@g***`, Session 1,543 chars | `fixtures/cognito/initiate-auth.email-otp.confirmed-user.json` |
| `FORCE_CHANGE_PASSWORD` user (temporary password) | `ChallengeName: SELECT_CHALLENGE`, `AvailableChallenges: ["PASSWORD_SRP","PASSWORD"]` — **no `EMAIL_OTP`** → `OTP-T-10` | `initiate-auth.email-otp.force-change-password.json` |
| Unknown user (`PreventUserExistenceErrors=ENABLED`) | simulated `EMAIL_OTP` challenge, dummy Session 1,587 chars, masked destination from the input | `initiate-auth.unknown-user.json` |
| Correct code (8 digits) 93 s after start | `AuthenticationResult { AccessToken, IdToken, RefreshToken, ExpiresIn: 3600, TokenType: Bearer }` | `respond-to-auth.success.json` |
| Same session reused after success | `NotAuthorizedException: Invalid session for the user, session can only be used once.` | — |
| Verify 3 min 54 s after start | `NotAuthorizedException: Invalid session for the user, session is expired.` → **session ≈ 3 min** | `respond-to-auth.session-expired.json` |
| Wrong code ×6 on a live session | `CodeMismatchException: Invalid code or auth state for the user.` every time — no lockout observed | `respond-to-auth.code-mismatch.json`, `…attempt-6.json` |
| Delivery | < 1 min, Cognito default sender, **Gmail spam folder** | — |
| `AdminCreateUser` without `TemporaryPassword`, `SUPPRESS`, `email_verified=true` | user lands **`CONFIRMED`** | — |

Test users left in the TEST pool for the HITL: `<spike mailbox>` (`CONFIRMED`), `<spike mailbox>+fcp` (`FORCE_CHANGE_PASSWORD`) — delete after `OTP-T-9` (`admin-delete-user`).

## Step 6 — Rollback rehearsal (TEST, 2026-09-11, CLI path, approved by the user)

Executed with `aws cognito-idp update-user-pool --cli-input-json file://input.json` where `input.json` was derived from `test-after.json` `.pool` per the recipe in step 3 (non-writable keys stripped; deprecated `AdminCreateUserConfig.UnusedAccountValidityDays` dropped because it conflicts with `Policies.PasswordPolicy.TemporaryPasswordValidityDays`), after a pre-flight diff against the live pool that showed **only** `Policies.SignInPolicy.AllowedFirstAuthFactors` (plus the deprecated field drop) as intended changes.

| Step | Call | Live factors after | Evidence |
|---|---|---|---|
| 6a rollback | `AllowedFirstAuthFactors = ["PASSWORD"]` | `["PASSWORD"]` | `test-rollback.json` (pool section); `test-rollback-diff.txt` = pool-level diff vs `test-before` → **empty** |
| 6b re-enable | `AllowedFirstAuthFactors = ["PASSWORD","EMAIL_OTP"]` | `["PASSWORD","EMAIL_OTP"]` | `test-reenabled.json` (pool + 10 clients); `test-reenabled-diff.txt` = full normalized diff vs `test-after` → **empty** |

Notes: the first export attempt in 6a hit a shell word-splitting bug and did not capture the clients (only the pool) — the pool-level comparison is the rollback evidence; the re-enabled export was redone with the corrected loop and covers pool + clients. `update-user-pool` never touches app clients, and the 6b full diff proves all 10 are unchanged end-to-end. Result: **rollback and re-enable are reversible with the `--cli-input-json` recipe; no other field moved.**
