# Adopting the email-code login in another CGIAR app

Guidance for a second application (PRMS Planning is the motivating case). Since Option D moved the whole lifecycle into PRMS's own server, there is no longer a shared microservice endpoint another app can simply call — the options below are about **how much of PRMS's approach to extract or copy**, not about reusing a running Cognito trigger.

---

## Quick answer

| Question | Answer |
|---|---|
| Can another app call PRMS's implementation directly? | **No.** The code lifecycle (`OtpChallengeService`, the decoy encoder, the allow-list) lives inside the PRMS server process and its own database |
| Is there a shared, reusable endpoint today? | **No** — that is exactly the gap Option A below closes |
| What is reusable **as a pattern**? | The lifecycle itself: a challenge table, `crypto.randomInt`, HMAC-only storage, decoys for inactive/unknown accounts, PRMS's own e-mail pipeline. None of it is Cognito-specific |
| Recommended path today | **Option B** — copy the server-side pattern into the new app. Revisit **Option A** once a second app actually needs it |

---

## Option A (recommended once a second app arrives) — extract to the AUTH microservice

Move the Option D lifecycle out of PRMS and into the shared AUTH microservice, behind two generic routes:

```
POST login/otp/start  { username }        → 200 { sent, session }
POST login/otp/verify { username, code, session } → a signed assertion each app turns into its own session
```

- **Challenge store:** the microservice has no database today and runs with several replicas, so "single use" and "3 attempts" need **shared** state — DynamoDB or Redis, not an in-process map (PRMS's own `otp_challenges` table works only because PRMS itself is the single owner of that state).
- **Each app mints its own session** from the microservice's signed assertion — the microservice does not hand out PRMS JWTs or anyone else's session format.
- **Branding becomes per-caller:** subject, sender name and footer link move from PRMS's hard-coded template into a small `caller → { subject, senderName, appUrl, supportEmail }` map, keyed by the caller's MIS identity.
- **Allow-list and throttling stay per-app** — a shared "which domains may use this" list does not make sense across apps with different rosters; each caller keeps its own gate and calls `start`/`verify` only for domains it has already allowed.

This is **not built** — it is the recommended target the moment a second app needs the Center path, not a currently-running service.

## Option B (today) — copy PRMS's server pattern

Copy the shape, not the code verbatim (PRMS's version is wired into PRMS's user/role model):

| Piece | What to copy | What stays PRMS-specific |
|---|---|---|
| Challenge table | `otp_challenges` shape: `nonce` (unique), `email_hash`, `code_hmac`, `expires_at`, `attempts`, `consumed_at` — never the plaintext address or code | The exact HMAC-key derivation should use the new app's own signing secret, not PRMS's `JWT_SKEY` |
| Code generation | `crypto.randomInt` 6-digit, one row per challenge, 5-minute TTL, 3-attempt cap, single use | — |
| E-mail delivery | Whatever notification pipeline the new app already has (RabbitMQ → notification-microservice → SMTP is a CGIAR-wide pattern, not PRMS-only) | Subject, branding and sender name — PRMS's copy says "PRMS Reporting Tool" throughout |
| Decoy sessions | Same signed-encoder trick: a real and a decoy session must be byte-indistinguishable, told apart only by whether a challenge row exists | The throttler is a route-scoped guard keyed on normalised e-mail (`OtpThrottlerGuard`'s 5/10-per-15-min shape is a reasonable default, not a requirement) |
| First-login rule | PRMS auto-provisions a guest-role user on first successful verify | The role assigned and the provisioning call are specific to PRMS's `UserService` |

### Checklist for a Option-B implementation

- [ ] Challenge table stores only HMACs — never the plaintext e-mail or code.
- [ ] Two domain-separated HMAC keys (email, code) derived from the app's own secret — never share one key across both purposes.
- [ ] Decoys for inactive/unknown accounts, minted by the **same** encoder real sessions use.
- [ ] `timingSafeEqual` for every code and session comparison.
- [ ] A route-scoped throttle keyed on the normalised e-mail, counted before the user lookup — so a rate-limited response looks identical for known and unknown addresses.
- [ ] `email_failed` and `internal_error` outcomes both keep the HTTP response neutral (`200`/`503` as appropriate) — a failed send must never leak through the response shape.
- [ ] The rotated `session` on a wrong-code response is stored by the client before retrying — the single most common integration bug in this pattern.
- [ ] Opportunistic (or scheduled) purge of expired rows — no PII accumulates in the table either way.

> **The dual allow-list rule from the Cognito-trigger era no longer applies.** That rule existed because two independent systems (PRMS's global parameter and the microservice's `PASSWORDLESS_DOMAINS` env) had to agree on the same domain list. Option D has exactly one allow-list, read by the one system that enforces it — there is nothing to keep in sync.

---

**Sources:** `docs/specs/changes/cognito-email-otp-login/design.md` §19.1, §19.5 · `requirements.md` §15 (`OTP-R-37`, `OTP-R-38`) · `execution.md` (rev 4 pivot — user decision "keep D in PRMS now; extraction recorded for later") · `onecgiar-pr-server/src/auth/otp/{otp-challenge.entity.ts,otp-challenge.service.ts}` · `onecgiar-pr-server/src/auth/guards/otp-throttler.guard.ts` · `onecgiar-pr-server/src/auth/auth.service.ts` (decoy encoder, first-login provisioning) · this module's [`README.md`](./README.md)

**Last verified:** 2026-09-12
