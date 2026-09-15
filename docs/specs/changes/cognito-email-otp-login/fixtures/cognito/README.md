# Cognito spike fixtures (`OTP-T-1`)

Redacted (`Session`/`AccessToken`/`IdToken`/`RefreshToken` → `"<redacted>"`) Cognito responses captured during the phase-2 TEST spike (2026-09-11) via `scripts/spike-email-otp.sh`, once the pool owner toggled `EMAIL_OTP` (`design.md` §5.4 step 3). See `runbook/cognito-email-otp.md` "Spike observations" for the narrative behind each file.

Files present:

- `initiate-auth.email-otp.confirmed-user.json` — `CONFIRMED` TEST user, `InitiateAuth USER_AUTH PREFERRED_CHALLENGE=EMAIL_OTP` → direct `EMAIL_OTP` challenge.
- `initiate-auth.email-otp.force-change-password.json` — `FORCE_CHANGE_PASSWORD` TEST user → `SELECT_CHALLENGE [PASSWORD_SRP, PASSWORD]`, no `EMAIL_OTP` (triggers `OTP-T-10`).
- `initiate-auth.unknown-user.json` — email unknown to Cognito (`PreventUserExistenceErrors=ENABLED`) → simulated `EMAIL_OTP` challenge, dummy session, masked destination.
- `respond-to-auth.success.json` — correct code, `EMAIL_OTP` challenge answered → `AuthenticationResult` (tokens redacted).
- `respond-to-auth.code-mismatch.json` — wrong code → `CodeMismatchException`.
- `respond-to-auth.code-mismatch.attempt-6.json` — 6th consecutive wrong code on the same session → `CodeMismatchException` again; byte-identical to the file above — no lockout was observed within the session (see the runbook's step 5 notes for what that claim does and does not rest on).
- `respond-to-auth.session-expired.json` — code verified after the session's ~3-minute expiry → `NotAuthorizedException` ("session is expired").

No `respond-to-auth.select-challenge.json` exists: the `CONFIRMED` user's `InitiateAuth` returned a direct `EMAIL_OTP` challenge rather than `SELECT_CHALLENGE`, so that branch (offering `EMAIL_OTP` as one of several challenges) was never exercised — it remains design-derived, not observed.

No secret, hash, code, session or token value may appear in any file in this directory.
