# Proposal — Sign-in handoff from PRMS to the Bulk Results Uploader

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/bulk-uploader-handoff/` |
| Slug | `bulk-uploader-handoff` — derived from a free-text argument ("Ya sabes que debemos hacer…", i.e. the handoff agreed with the Bulk Results Uploader team on 2026-09-14). Placed under `bilateral/` per the domain-module taxonomy (precedent: `bilateral/webhook-external-platforms`). |
| Type | **Change** |
| Approval Mode | **gated** (default). The standing mandate recorded on `changes/cognito-email-otp-login` belongs to Juan Carlos Cadavid and does not carry over; flip to `pre-approved` only on an explicit instruction from the owner. |
| Status | draft — awaiting approval |
| Owner | Juan David Delgado |
| Date | 2026-09-14 |
| Ticket(s) | none yet. Jira searched 2026-09-14 (`project = P2`, bulk/uploader/handoff): no ticket covers this. Nearest context: epic [P2-3486](https://cgiarmel.atlassian.net/browse/P2-3486) (Bilateral Center) · [P2-3489](https://cgiarmel.atlassian.net/browse/P2-3489) (Reporting tab as entry point) · [P2-3524](https://cgiarmel.atlassian.net/browse/P2-3524) (Bulk Ingest authentication, Done). A ticket must be created under P2-3486 before `/akili-execute`. |
| Baseline | `docs/prd.md` — G3 (bilateral consumer reliability), US-D1, **AC-3** (backend enforces authorization), **AC-4** (bilateral contract changes documented), **AC-9** (no secrets in logs), OQ-2 (partner API program) · `docs/ux-ui/design.md` — §6 *Empty / error / loading*, §8 *Component rules*, §10 a11y · `docs/trd/trd.md` — ADR-003 (custom `auth` header), ADR-004 (bilateral additive-only), §8 Security (*Bilateral perimeter: JWT is OFF, protection comes from a layered perimeter*), QAS-1, QAS-9, QAS-12 (LITE tier, no new always-on compute), W6 |
| Related specs | `bilateral/webhook-external-platforms` (the `ClarisaApiKeyGuard` + `@BilateralClarisaEndpoint` + `@ExternalPlatform()` pattern this reuses) · `auth/center-user` (the centre-scoped role `start` authorises against) · `changes/cognito-email-otp-login` (the `otp_challenges` single-use table pattern; and the third sign-in path this must keep working) |
| Depends on | none in-repo. External: partner callback `/entry/` on STAGING (**deployed**, verified 2026-09-14 — SPA route, host answers `301 → /entry/` then `404` with the app shell) · client env key `bulkUploaderUrl` in TEST (**missing since 2026-09-10**; without it the button does not render) |
| Parallel-safe | **yes, with one shared touch** — new controller/service/entity inside `api/bilateral`, one client component, plus one additive claim (`auth_method`) at the single JWT sign site in `auth.service.ts`. No shared migration, no existing API contract changed. |
| Evidence | Vault: `CGIAR/W3/w3-bilateral-module/w3-bilateral-bulk-handoff-auth.md` (decisions, rejected options) · `…/w3-bilateral-bulk-handoff-contrato.md` (the partner-facing contract, v0.1) · `…/w3-bilateral-bulk-uploader-cta.md` (the CTA as shipped) |

## Intent

When a signed-in PRMS user clicks **Bulk Results Uploader** on `/bilateral/:center/home`, the partner tool must receive — without a second sign-in and without anything sensitive in the URL — who the user is, which centre they came from, their role on that centre and the open reporting phase. The partner redeems an opaque one-time code server-to-server with the CLARISA API key it already uses for ingest. This works for **all three** PRMS sign-in paths — CGIAR federated (Azure AD via Cognito), direct pool credentials, and the email one-time-code path for centres outside the AD (CIFOR-ICRAF, ICRISAT) — and the claims tell the partner **which** path the user came through (`auth_method`), so it can match or provision the account correctly even when no Microsoft identity exists.

## Problem / Current Behavior

- The CTA is a plain `<a href>` to `environment.bulkUploaderUrl` (`bilateral-page-header.component.ts:87`, `.html:130-141`). The partner receives an anonymous visitor.
- Forwarding the PRMS session is impossible: it is a PRMS-issued **HS256** JWT with a shared secret (`auth.service.ts:1375`) whose payload is only `{ id, email, first_name, last_name }`.
- Forwarding the Cognito `idToken` was evaluated and rejected: its `aud` is the app client `general-client`, which serves **Reporting and QA**, so a valid token does not prove "PRMS user"; it carries no centre/role/phase; it lives ~1 h and the partner cannot renew it; and the email one-time-code path produces **no Cognito tokens at all** (`createSuccessfulLoginResponse` is called with `authTokens: null`).
- Both sides have already agreed on the mechanism (Option A, code exchange) and the contract v0.1 exists in the vault. Nothing is implemented.

## Proposed Outcome

1. Clicking the CTA (any sign-in method) opens the partner's `/entry/?code=<opaque>&env=<env>` in a new tab within one round-trip; the code is 32 random bytes, valid 120 s, single-use.
2. The partner backend `POST`s the code with `x-api-key` and receives the claims (user, centre, role, open reporting phase, **`auth_method`**) exactly as specified in the vault contract; a second redemption, an expired code, an unknown code or a wrong `audience` all answer the same `400`.
3. PRMS refuses to mint a code for a centre the user has no role on (`403`), and refuses without a **verified** session (`401`).
4. Every exchange is audited with the resolved calling platform, the user and the centre; the code never appears in any log.
5. When `bulkUploaderUrl` is absent the CTA keeps hiding (PROD stays dark).

## Scope

| Layer | Work |
|---|---|
| Server — persistence | Entity + **generated** migration (`migration:generate`, then prune to the one table) `bilateral_handoff_codes`: `code_hash` (SHA-256 of the code — never the code), `user_id`, `center_code` (FK `clarisa_center.code`), `audience`, `expires_at`, `consumed_at`, `consumed_by_platform`, `created_at`. Model on `otp_challenges` (`1788740000000-OTP-challenges.ts`). |
| Server — `POST api/bilateral/center/handoff` (start) | New `BilateralHandoffController` in `api/bilateral`. Requires a verified session (see Risks R-1: **must not** use `@UserToken()`), authorises with `RoleByUserRepository.validationCenterPermissions(userId, centerCode)` (admin bypass via `isUserAdmin`), invalidates the user's previous unconsumed codes, mints and returns `{ code, expires_in, redirect_url }`. |
| Server — `POST api/bilateral/handoff/exchange` | Same controller; `@UseGuards(ClarisaApiKeyGuard)` + `@BilateralClarisaEndpoint('/api/bilateral/handoff/exchange')` + `@ExternalPlatform()`. Atomic consume: `UPDATE … SET consumed_at = NOW(), consumed_by_platform = :mis WHERE code_hash = :h AND audience = :aud AND consumed_at IS NULL AND expires_at > NOW()`; proceed only when `affectedRows === 1`. Assemble claims from `users`, `role_by_user`, `clarisa_center` + `clarisa_institutions`, and `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)`. |
| Server — session claim | Add `auth_method: 'saml' \| 'password' \| 'otp'` to the JWT payload at the single sign site (`createSuccessfulLoginResponse`, `auth.service.ts:1375`), passed in by its three callers (`validateCognitoCode` → saml, `singIn` → password, `verifyOtp` → otp). Additive; nothing reads it today. The exchange copies it into `user.auth_method`. |
| Server — config | `HANDOFF_AUDIENCE` / `HANDOFF_CALLBACK_URL` per environment (backend `.env`, listed in server `README.md` → *Environment*). `iss` = the environment's front base URL. |
| Client | `bilateral-page-header`: CTA becomes a button with a click handler. Open the tab **synchronously** on click, call `POST_bilateralHandoffStart(centerCode, audience)` through the existing `auth`-header interceptor, then assign `location`; on failure close the tab and surface the standard error toast. Loading/disabled state per `design.md` §6. Spec fixes `bulkUploaderUrl` in `beforeEach` (never reads the real env). |
| Config (ops) | Add `bulkUploaderUrl` = `https://staging.bilateral-results-uploader.synapsis-analytics.com/entry/` to the TEST client environment. Not a code change; it is the gate for anything being visible. |
| Docs | Contract lives in the vault by owner decision (`w3-bilateral-bulk-handoff-contrato.md`). See OQ-1 for the repo-side change-log obligation. |

## Non-Goals

- Partner-side SSO, account provisioning or the PRMS-role → partner-permission mapping (Nicoleta).
- PROD callback / `aud` (partner has no destination yet).
- Project-level handoff (`project`, `programs` claims) — centre-level only, by agreement.
- Gating the button by sign-in method. The exchange authenticates for every path and **reports** the path (`auth_method`); the partner's earlier "federated only" restriction is theirs and is being withdrawn. OTP users (CIFOR-ICRAF, ICRISAT) are explicitly **in**.
- Fixing the pre-existing unverified-token decode on `api/bilateral/center/*` (R-1). It is real and it is **not** this spec's job; it gets its own `bugfix/` spec.
- Any Cognito or AWS change. None is needed.

## Affected Users, Systems, And Specs

| Who / what | Effect |
|---|---|
| Centre users (Center User role, `auth/center-user`) | One click lands them signed-in on the partner tool. |
| PRMS admins | Same, for any centre. |
| Bulk Results Uploader (Synapsis) | Gains `POST /api/bilateral/handoff/exchange`; must implement `/entry/` code redemption and JIT provisioning. |
| `api/bilateral` module | +1 controller, +1 service, +1 entity, +1 migration, +1 guard (`SessionRequiredGuard`, or equivalent). |
| `bilateral-page-header` component | Link → button + handler; spec rework. |
| `bilateral-result-summaries.en.md` | Possibly a change-log line (OQ-1). |

## Visual Reference

- Source: **None**
- Location: n/a — the CTA already exists (`data-testid="bilateral-bulk-uploader-cta"`, icon `upload_file`); only its behaviour changes.
- Notes: the only new UI state is a brief loading/disabled state on the button while the code is minted (`design.md` §6 *Empty / error / loading*, §8 *Component rules*). No mockup needed.

## Requirement Delta Preview

### ADDED Requirements

- `BIL-HO-R-1` Minting a handoff code requires a verified PRMS session and a role on the requested centre (or admin); otherwise `401` / `403`.
- `BIL-HO-R-2` A code is 32 random bytes (base64url), expires 120 s after minting and is single-use; only its SHA-256 is persisted.
- `BIL-HO-R-3` Minting a new code invalidates the user's earlier unconsumed codes.
- `BIL-HO-R-4` `exchange` is authenticated by CLARISA API key (`ClarisaApiKeyGuard`); missing/invalid key → `401`, CLARISA unavailable → `503` + `retry-after: 30`.
- `BIL-HO-R-5` Unknown, expired, consumed, or wrong-audience codes answer an indistinguishable `400`.
- `BIL-HO-R-6` The claims payload matches the contract v0.1 (user, center, role, reporting_phase; no project/programs).
- `BIL-HO-R-7` Every exchange is audited (platform, user, centre, timestamp); the code value never reaches a log (AC-9).
- `BIL-HO-R-8` The CTA opens the partner tab from the click event and only then resolves the code (popup-blocker safe); on failure the tab is closed and an error is shown.
- `BIL-HO-R-9` The CTA stays hidden when `bulkUploaderUrl` is empty.
- `BIL-HO-R-10` The session JWT carries `auth_method` (saml / password / otp) and the exchange returns it under `user.auth_method`; a session issued before this change (no claim) exchanges with `auth_method: null`, never an error.

### MODIFIED Requirements

- The CTA target changes from a static external URL to `{bulkUploaderUrl}?code=…&env=…` resolved per click.

### REMOVED Requirements

- none.

## Approach Options

| | A — Handoff controller inside `api/bilateral` (recommended) | B — `start` under `auth/`, `exchange` under `api/bilateral` | C — Redis/ElastiCache code store |
|---|---|---|---|
| Wiring | Zero changes to `app.module.ts`: `/api/bilateral` is already in `JwtMiddleware.publicRoutes`, so `exchange` needs no exclusion and `start` gets `req.user` populated when a valid token is present. `ClarisaApiKeyGuard` stays inside its module (it is **not exported** — `bilateral.module.ts:182` exports only `BilateralService`). | Requires exporting the guard + validation service from `BilateralModule` or duplicating them; `auth` controller routes are outside `api/*` so no middleware runs there either — same guard problem, more plumbing. | New infra; violates QAS-12 (no new always-on compute without an ADR). A 120 s row in MySQL is plenty. |
| Session enforcement | Explicit `SessionRequiredGuard`: `401` unless `req.user.id` was set **by the middleware's signature check**. | Same guard needed. | n/a |
| Precedent | `bilateral-center.controller.ts` (session routes in the module) + `bilateral-webhook.controller.ts` (partner routes with the guard). | none | none |
| Verdict | **Smallest safe path.** | More plumbing, no benefit. | Over-engineering. |

## Recommended Approach

**Option A.** One new controller in `api/bilateral` with two routes, one service, one entity/migration, one small guard. Reuses the webhook module's authentication pattern verbatim and the OTP module's single-use table pattern. The client change is confined to one component.

Effort dial: **`max`** for the server tasks (auth surface + migration + partner-facing contract are all "correctness-critical"), `medium` for the client task.

## Risks, Dependencies, And Open Questions

| ID | Risk / dependency | Mitigation |
|---|---|---|
| **R-1 (pre-existing, confirmed)** | `@UserToken()` (`shared/decorators/user-token.decorator.ts:17-45`) falls back to **base64-decoding the `auth` header without verifying the signature** when `req.user` is unset, and `JwtMiddleware` **silently swallows invalid tokens on public routes** (`jwt.middleware.ts:38-58`) — and `/api/bilateral` is a public route. Net effect: on `api/bilateral/center/*` a forged, unsigned JWT is accepted as any user id. | Out of scope here, but **the handoff must not inherit it**: `start` uses `@DecodedUser()` behind a guard that requires the middleware-verified `req.user`. Open a separate `bugfix/bilateral-center-unverified-token` spec; note it on the P2-3486 epic per the lateral-findings rule. |
| R-2 | `/api/bilateral/*` is also **throttler-excluded**, so `start` and `exchange` have no rate limit. | Codes are 256-bit (brute force infeasible); `start` invalidates prior codes so a user can hold at most one; add per-user mint logging. Accept. |
| R-3 | Popup blockers kill `window.open` after an `await`. | Open the tab synchronously in the click handler, then set `location` (BIL-HO-R-8). |
| R-4 | `bulkUploaderUrl` missing in TEST → nothing visible, nothing testable in the browser. | Ops task, listed in Scope; block UAT until present. |
| R-5 | Phase ids differ between TEST and PROD. | Claims resolve the open phase at exchange time; never hard-coded. |
| R-6 | Partner `/entry/` is an SPA route (host `404`). | Partner to confirm it reads `code`/`env`; PRMS builds `redirect_url` with the trailing slash to skip the `301`. |
| R-7 | Partner self-registration could claim a handoff-created account by e-mail. | Contract §6 requirement on the partner; not enforceable by PRMS. |
| R-8 | Contract in the vault, not in the repo. AC-4 / ADR-004 expect bilateral contract changes to be logged in `bilateral-result-summaries.en.md`. | **OQ-1** below. |
| OQ-1 | Does a one-line change-log entry pointing at the vault contract satisfy AC-4, or is the owner's "nothing in the repo" absolute? | Owner decision at approval. Recommendation: one line in the change log ("2026-xx — handoff endpoints added; contract maintained externally") keeps the gate honest without duplicating the document. |
| ~~OQ-2~~ → decided | `exchange` **does** return `auth_method` (owner, 2026-09-14): it is the selling point for OTP users — "we cannot hand you a Microsoft token for them, but we tell you exactly who they are and how they signed in". Added to Scope and BIL-HO-R-10. |
| OQ-3 | Ticket creation under P2-3486 — before `/akili-execute`. | Owner. |

No Active Lessons file (`docs/specs/kaizen-log.md`) exists; the bilateral kaizen entry's pending standardisations (KZ-BOR-1/2) concern client hard-rules citation and DoD checks — `/akili-specify` must cite `onecgiar-pr-client/CLAUDE.md` §5 for the button change and carry a grep-able DoD for R-1 avoidance (`grep -L UserToken` on the handoff controller).

## Success Criteria

- A centre user clicks the CTA in TEST and lands on the partner STAGING with their identity and centre resolved, without a second sign-in — for a federated account, a direct-credential account **and** an email-code (OTP) account; each exchange reports the matching `auth_method`.
- Replaying a redeemed code, an expired code, a foreign audience, or a request without `x-api-key` fails as specified; the failures are indistinguishable where the contract says so.
- A user with no role on the centre gets `403` from `start`; a request with a forged/unsigned `auth` header gets `401` (this single test is the guard against R-1).
- Server: handoff suite green under `jest --testPathPattern="bilateral"`; `npm run migration:check` clean; lint clean. Client: header spec green **with and without** `bulkUploaderUrl`, per the CTA note's rule.
- No code value in any log line (grep the test output).

## Next Step

```text
/akili-specify bilateral/bulk-uploader-handoff
```

Standard depth (Full): auth surface, new persistence, partner-facing contract. The regression test for the forged-token `401` is mandatory in `tasks.md`.
