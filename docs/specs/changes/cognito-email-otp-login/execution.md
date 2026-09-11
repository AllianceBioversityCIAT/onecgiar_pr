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

