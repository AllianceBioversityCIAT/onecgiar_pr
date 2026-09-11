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

Approver for the CLI path (placeholder): `___________________`.

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

### 4b. Smoke one sibling tenant
**[phase 2 — not run this phase]** Password login against another app's client (e.g. TOC or Alliance TEST) to prove nothing else moved. **[placeholder — result]**

### 5. Smoke PRMS / spike observations
**[phase 2 — not run this phase]** Using `general-client` (`6ph57qfck44f8d4jgf47if0s11`) id + secret read at run time from the local microservice `.env` (never printed) via `scripts/spike-email-otp.sh`, run `InitiateAuth` (`USER_AUTH`, `PREFERRED_CHALLENGE=EMAIL_OTP`) and `RespondToAuthChallenge` (`EMAIL_OTP`) against two TEST users — one `CONFIRMED`, one `FORCE_CHANGE_PASSWORD` — with a real mailbox. Record:

| Observation | Value |
|---|---|
| Challenge shape returned by `InitiateAuth` | **[placeholder]** direct `EMAIL_OTP` vs `SELECT_CHALLENGE` (if `SELECT_CHALLENGE`, record the exact second `RespondToAuthChallenge` request/response with `Session`) |
| `CODE_DELIVERY_DETAILS` masking | **[placeholder]** e.g. `j***@icrisat.org` |
| Code length | **[placeholder]** (feeds `OTP-OQ-7`) |
| Expiry | **[placeholder]** minutes until a retry is required (feeds `OTP-OQ-7`) |
| Attempt limit | **[placeholder]** wrong code x N before lockout (feeds `OTP-OQ-7`) |
| Delivery time | **[placeholder]** seconds from `InitiateAuth` to mailbox receipt (feeds `OTP-OQ-8`) |
| Simulated challenge for an email unknown to Cognito (`PreventUserExistenceErrors=ENABLED`) | **[placeholder]** shape of the dummy session / masked destination |
| `FORCE_CHANGE_PASSWORD` user result | **[placeholder]** `EMAIL_OTP` accepted, or `NEW_PASSWORD_REQUIRED` returned instead → triggers conditional `OTP-T-10` (`design.md` §13) |

Redacted fixtures captured under `fixtures/cognito/` (see that directory's README for the expected filenames) — **not captured this phase** (phase 1 is export/runbook/script skeleton only).

### 5b. Re-confirm `OTP-OQ-6`
Done (phase 1, from `runbook/test-before.json`): client `6ph57qfck44f8d4jgf47if0s11` (`general-client`) lists `ALLOW_USER_AUTH`. See "Facts confirmed" above.

### 6. Rollback rehearsal (TEST only)
**[phase 2 — not run this phase]** Set `AllowedFirstAuthFactors` back to `["PASSWORD"]` (console, same click path as step 3 — untick the box) → export → diff against `runbook/test-before.normalized.json` must show **zero** differences → re-enable (repeat step 3) before handing back to phase 2's remaining work. **[placeholder — rollback diff output]**

### 7. PROD
**[placeholder — blocked on `OTP-OQ-1`: which pool/account serves PROD; not in `IBD-DEV`]**. Once resolved: identical steps 1–6 on the PROD pool; PRMS allow-list (`OTP_ALLOWED_EMAIL_DOMAINS`) set last, after the PROD Cognito change is verified.

## Support runbook cross-reference

See `design.md` §9 for the "code not received" triage table (this runbook's spike observations feed the specific values there).

## Not done this phase

- Steps 3 (actual toggle — HITL, user does this in the console), 4, 4b, 5 (spike calls), 6 are placeholders only. No AWS write call has been made under this runbook.
- `fixtures/cognito/*.json` are not yet populated (phase 2, using `scripts/spike-email-otp.sh`).
- `design.md` §4.2 and `requirements.md` `OTP-OQ-7` updates with pinned values are phase 2 (need real spike data first).
