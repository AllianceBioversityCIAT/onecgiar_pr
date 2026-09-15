# Judgment Day — `design.md` (rev 1 → rev 2)

| Field | Value |
|---|---|
| Target | `docs/specs/changes/cognito-email-otp-login/design.md` rev 1 (immutable at review time), read against `requirements.md`, `proposal.md` and the PRMS server/client code (microservice facts from the proposal) |
| Mode | judgment_day · round 1 · **one round, fixes applied without scoped re-judgment (standing mandate 2026-09-02, pre-approved mode)** |
| Judges | A and B — `akili-reviewer`, model `opus` (author = Fable; author ≠ auditor) — blind, read-only, identical scope |
| Verdicts | A: 6 SEVERE · 5 WARNING · 2 SUGGESTION — B: 3 SEVERE · 5 WARNING · 4 SUGGESTION — both `APPROVE_WITH_FIXES` |
| Counts | Confirmed severe **6** (3 by both judges, 3 by A alone but verified against code) · INFO 11 (all applied) · Contradictions 0 |
| Fix actor | Leader inline (design/requirements/tasks edits only); forward/backward sweep over the spec folder |
| Terminal | `JUDGMENT: APPROVED ✅` — with the re-judgment waiver recorded above |

## Confirmed severe — fixed in rev 2

| ID | A / B | Finding | Fix applied |
|---|---|---|---|
| C-1 | JA-1 / JB-1 | Neutral response broken: `session` required in `OtpVerifyDto` but absent for unknown users → verify returns 400 instead of 401 (enumeration oracle); `session` presence in `start` reveals existence. | `start` always returns a **decoy session** (HMAC-signed, same shape) and masked destination for unknown/inactive users; bodies byte-identical; verify treats decoys as `401 OTP_NOT_AUTHORIZED` without a microservice call (§2.2, §4.1, §5.1, `OTP-DD-3`; `OTP-R-3`, `OTP-AC-5`, scenario R-3, §9 gates; `OTP-T-5`). |
| C-2 | JA-2 / JB-2 | `createSuccessfulLoginResponse` returns `403 needsRoles` unless the user is loaded with `relations: ['obj_role_by_user']`; design specified a bare lookup → every OTP login 403 while a mocked test passes. Response shape mis-stated (`{ token, user }` vs `{ valid, token, user, auth_tokens }`). | Relation spelled out in both `startOtp` and `verifyOtp`; response cell corrected; parity test must build one relation-loaded fixture user and assert the `needsRoles` path too (§2.2, §4.1, §5.1, `OTP-DD-4`; `OTP-T-5` (e)/(e′)). |
| C-3 | JA-8 / JB-3 | Runbook step 2 led with `update-user-pool --policies …`, the exact call that resets omitted pool settings to defaults on a ten-tenant pool. | Step rewritten: console is the sanctioned path; CLI only via `--cli-input-json` built from the *before* export with non-writable keys stripped plus a pre-flight diff and a named approver; sibling-tenant smoke added (§5.4; `OTP-T-1` disqualifier). |
| C-4 | JA-3 | `SELECT_CHALLENGE` follow-up call lacked `Session` (and `ClientId`) — would fail every time. | Second `RespondToAuthChallenge` carries `ClientId` + the `InitiateAuth` session and returns the **new** session (§4.2; `OTP-T-2`). |
| C-5 | JA-4 | Per-email counter ran after the user lookup and unknown users returned early → 429 only for real accounts (second oracle). | Counter moved before any lookup; `OTP-AC-9` and scenario R-3 require 429 for known and unknown alike (§2.2, §4.1, §5.1, `OTP-DD-6`; `OTP-T-5` (d)). |
| C-6 | JA-5 / JB-7 | `OTP-R-13`'s conditional obligation ("design MUST specify the provisioning adjustment") had no design home; verify contract had no shape for a challenge instead of tokens. | §13 contingency (permanent password at registration for passwordless domains → users land `CONFIRMED`), conditional task `OTP-T-10` with budget; `CHALLENGE_NOT_SUPPORTED` stable code across §4.2/§5.1 (`OTP-R-7`, `OTP-R-13` wording). |

## INFO (warnings / suggestions) — all applied

| IDs | Topic | Disposition |
|---|---|---|
| JA-6 / JB-5 | Rate-limit claims: throttler storage is in-memory per instance too; `req.ip` behind API Gateway; raw `ThrottlerException` body not neutral | `OTP-DD-6` rewritten: guard subclass with email tracker (`x-forwarded-for` fallback), neutral 429 envelope, both limits per instance = accepted risk; §13 follow-up for a shared store; `OTP-R-6` wording aligned |
| JA-7 / JB-4 | `JwtMiddleware` never mounts on `/auth/*`; public-path edit is a no-op; §7 claim wrong | Public-path sub-task dropped; §2.1/§5.1/§7 restate the real posture; `OTP-T-4` gains a spec case proving reachability instead of a middleware edit |
| JA-9 | Pool-level factor becomes selectable for sibling clients with `ALLOW_USER_AUTH`; quota shared; client diff cannot see it | Runbook step 2 tabulates and notifies; §13 + §15 + `OTP-OQ-8` record the consequence |
| JA-10 / JB-11 | With `PreventUserExistenceErrors=ENABLED` Cognito returns a simulated challenge for unknown users, not an exception; PRMS user missing in Cognito = "sent" but no mail | §4.2 errors row corrected; §9 runbook case added; `OTP-T-1` captures the simulated challenge; requirements assumption updated |
| JA-11 / JB-6 | Table is `global_parameters`; no `auth` category (seeded: `sharepoint`, `platform_global_variables`, `urls`); `auth.module.ts` wiring missing | §3.2 pins `platform_global_variables` and the seed pattern; §2.1/§5.1 name the module import; `OTP-T-4` verification checks a non-null category id |
| JA-13 (cache) | Bespoke 60 s cache vs existing `GlobalParameterCacheService` | Design reuses `GlobalParameterCacheService.getParam()` (`OTP-DD-5`) |
| JA-12 / JB-10 | `denied_domain` unreachable (event after the 400); outcome enums not pinned | Emitted on the 400 path; both enums pinned in §4.1 and §9 |
| JB-8 | "Fix in passing" log edit contradicts `OTP-R-10` / §15 | Dropped from the spec; recorded as a separate hygiene change (§5.2, §15, `OTP-T-3`) |
| JB-9 | §2.2 throttle annotation ≠ §4.1 | Aligned |
| JA-13 / JB-12 | Budget too low for the §10 inventory; shared docs (TRD) are pending default-branch writes, not deliverables | Budget → 9 (+1 conditional) tasks · ~1,250 LOC · tripwire > 12 / > 1,500; §14 and `OTP-T-9` wording |

## Sweep

Forward: `grep -n "without session\|no \`session\`\|public-path\|publicRoutes\|60 s\|1,050\|1,300\|USER_NOT_FOUND\|global_parameter\b" docs/specs/changes/cognito-email-otp-login/*.md` after the edits → only intentional mentions remain (this ledger, `OTP-DD-3` alternatives, historical budget line in §14). Backward: `requirements.md` and `tasks.md` re-read for claims about the neutral body, rate limiting, JWT middleware, response shape and budget — updated where they asserted the superseded value.
