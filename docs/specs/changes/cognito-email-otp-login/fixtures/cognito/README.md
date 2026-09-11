# Cognito spike fixtures (`OTP-T-1`)

Empty in phase 1 (read-only export phase only — no spike calls made). Populated in phase 2 by `scripts/spike-email-otp.sh` against the TEST pool once the pool owner has toggled `EMAIL_OTP` (design.md §5.4 step 3).

Expected filenames (per `tasks.md` `OTP-T-1` and `design.md` §5.4 step 7), each redacted (`Session`/`AccessToken`/`IdToken`/`RefreshToken` → `"<redacted>"`) before being written:

- `initiate-auth.email-otp.json` — successful `InitiateAuth` with `PREFERRED_CHALLENGE=EMAIL_OTP` against a `CONFIRMED` TEST user.
- `respond-to-auth.success.json` — correct code, `EMAIL_OTP` challenge answered.
- `respond-to-auth.code-mismatch.json` — wrong code.
- `respond-to-auth.expired.json` — expired/already-used code.
- `initiate-auth.unknown-user.json` — email unknown to Cognito; the simulated `EMAIL_OTP` challenge (`PreventUserExistenceErrors=ENABLED`).
- `initiate-auth.force-change-password.json` — the `FORCE_CHANGE_PASSWORD` TEST user's response (`EMAIL_OTP` accepted, or `NEW_PASSWORD_REQUIRED` instead — pins whether `OTP-T-10` is required).
- `respond-to-auth.select-challenge.json` — only if the pool answers `InitiateAuth` with `SELECT_CHALLENGE` rather than a direct `EMAIL_OTP` challenge.

No secret, hash, code, session or token value may appear in any file in this directory.
