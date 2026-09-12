# PROD rollout runbook — Center email-code login

**PROD rollout is now PRMS-only.** Deploy the PRMS server and client, run the migration, then set one global parameter. **No Cognito change, no Lambda, no SES.** This replaces the earlier Cognito-based runbook — see "Superseded" at the bottom.

---

## Prerequisites

| # | Item | Status |
|---|---|---|
| 1 | PRMS PROD deploy pipeline (server + client), same release flow as any other change | Existing |
| 2 | PRMS PROD `EMAIL_SENDER` set | Existing PRMS env — no new variable |
| 3 | Migration `1788740000000-OTP-challenges` applied — creates `otp_challenges` | Jenkins applies pending migrations automatically as part of the deploy (confirmed practice for this repo) |
| 4 | `JWT_SKEY` present in the PRMS PROD environment | Existing — it already signs the PRMS JWT; Option D reuses it to derive the challenge HMAC keys |
| 5 | A controlled mailbox on an allow-listed PROD domain for the HITL | Owner-provided |

No PROD Cognito pool access, no broker credentials beyond what PRMS's notification pipeline already uses, and no named cloud approver are needed — **this is the entire prerequisite list.**

---

## Step 0 — Confirm the parameter row and that it is empty

Migration `1788730000000-OTP-allowed-email-domains` inserts `OTP_ALLOWED_EMAIL_DOMAINS` with an **empty** value. Confirm the row exists and is still empty before deploying the rest of the feature — an empty value is what keeps the Center button hidden through steps 1–2.

```sql
SELECT name, value FROM global_parameters WHERE name = 'OTP_ALLOWED_EMAIL_DOMAINS';
-- expect: name = 'OTP_ALLOWED_EMAIL_DOMAINS', value = ''
```

If the row is missing, the migration has not run yet — stop and confirm the pipeline before continuing.

## Step 1 — Deploy PRMS server + client

Follow the repo's normal `master` release flow (root `CLAUDE.md` / `onecgiar-pr-server/CLAUDE.md` §10). Nothing about this deploy is special-cased for Option D: the code, the migration and the client bundle ship together like any other change.

## Step 2 — Smoke with the parameter still empty

| Check | Expected |
|---|---|
| PROD `/login` | The Center button is **not rendered** (`GET auth/login/otp/config` returns `domains: []`) |
| `POST auth/login/otp/start` for any disallowed domain | `400 OTP_DOMAIN_NOT_ALLOWED` |

This confirms the new code is live and fails safe before the feature is switched on for anyone.

## Step 3 — Set `OTP_ALLOWED_EMAIL_DOMAINS` (the feature switch)

```sql
UPDATE global_parameters
SET value = '<comma-separated, lower-case, no-@ domain list>'
WHERE name = 'OTP_ALLOWED_EMAIL_DOMAINS';
```

The parameter is read through `GlobalParameterCacheService` with a **60 s** staleness window — allow a minute before the Center button appears.

## Step 4 — HITL with a controlled mailbox

| # | Case | Expected |
|---|---|---|
| 4a | `start` for the controlled mailbox | Code e-mail arrives from **"PRMS Reporting Tool"**, subject "Your PRMS Reporting Tool sign-in code" |
| 4b | `verify` with a wrong code, twice | `401 OTP_CODE_MISMATCH` each time, a **rotated `session`** in the body both times — store it before the next attempt |
| 4c | `verify` with the right code | `200 { valid: true, token, user }` — no `auth_tokens` key; first-time mailbox → PRMS guest user auto-provisioned |
| 4d | Re-submit the same (already-consumed) code | `401 OTP_NOT_AUTHORIZED` — a code is single-use |
| 4e | Three wrong codes on a fresh challenge | The third wrong attempt itself returns `401 OTP_ATTEMPTS_EXCEEDED` — not a fourth submission |

## Step 5 — Sibling logins unchanged

CGIAR SAML and external password logins are untouched by this rollout — smoke them once as a regression check, not because Option D could plausibly affect them (they share no code path with `startOtp`/`verifyOtp`).

---

## Rollback

| Scope | Action | Effect |
|---|---|---|
| **Instant, no deploy** | Empty `OTP_ALLOWED_EMAIL_DOMAINS` | The Center button disappears within the 60 s cache window; `start` answers `400` for every address. **Do this first in an incident** |
| Full revert | Revert the PRMS server/client deploy | Removes the routes entirely; `otp_challenges` stays in the schema (harmless empty table) |

**No Cognito rollback step exists because none was touched.** There is no pool, client or Lambda state to undo in PROD.

---

## Superseded

An earlier revision of this runbook (Option B) walked through wiring three Cognito Lambda triggers onto the PROD pool. That design was abandoned because the PROD pool's AWS account grants Cognito **console access only** — no Lambda, CloudFormation or IAM — so the triggers could never be deployed there. See `docs/specs/changes/cognito-email-otp-login/design.md` §19 and this module's [`README.md`](./README.md) §8 for the full option history and why Option D replaced it. `PR #43` (microservice `dev-auth` → `main-auth`, the Option B promotion) is **not required** for Option D and was left open, unmerged, without consequence.

---

**Sources:** `docs/specs/changes/cognito-email-otp-login/design.md` §19.1, §19.3 · `requirements.md` §15 (`OTP-AC-22`) · `execution.md` (rev 4 pivot entry, `OTP-T-16`/`OTP-T-17`) · `onecgiar-pr-server/src/migrations/{1788730000000-OTP-allowed-email-domains.ts,1788740000000-OTP-challenges.ts}` · `onecgiar-pr-server/src/auth/auth.service.ts` (`startOtp`, `verifyOtp`) · `onecgiar-pr-server/CLAUDE.md` §5, §10 (migration ownership, deploy) · this module's [`README.md`](./README.md)

**Last verified:** 2026-09-12
