# Requirements — Sign-in handoff from PRMS to the Bulk Results Uploader

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/bulk-uploader-handoff/` |
| Module code | `BIL-HO` |
| Type | Change · Depth: **Full** (auth surface, new persistence, partner-facing contract) |
| Approval Mode | gated (inherited from `proposal.md`) |
| Status | **approved** (Phase 1 gate, owner, 2026-09-14) — OQ-1/2/3 resolved below |
| Owner | Juan David Delgado |
| Date | 2026-09-14 |
| Baseline | `docs/prd.md` — G3, US-D1, **AC-3**, **AC-4**, **AC-9**, OQ-2 · `docs/ux-ui/design.md` — §6 *Empty / error / loading*, §8 *Component rules* (6. Buttons, 7. Custom alerts), §10 *Accessibility* · `docs/trd/trd.md` — ADR-003, ADR-004, §4 *Error contract*, §8 *Security* (Authentication, Authorization, *Bilateral perimeter*), QAS-1, QAS-9, QAS-12, W6 |
| Intent source | `proposal.md` (2026-09-14) · partner-facing contract v0.2 (vault, `CGIAR/W3/w3-bilateral-module/w3-bilateral-bulk-handoff-contrato.md`) · owner decision 2026-09-14: `auth_method` is returned so OTP users are first-class |
| Extends | `docs/specs/bilateral/webhook-external-platforms/` (partner authentication pattern) · `docs/specs/auth/center-user/` (the centre-scoped role `start` authorises against) · `docs/specs/changes/cognito-email-otp-login/` (single-use table pattern; third sign-in path) |
| Ticket(s) | none yet — to be created under epic [P2-3486](https://cgiarmel.atlassian.net/browse/P2-3486) before `/akili-execute` |
| Authoritative external doc | `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (bilateral contract change log — see `BIL-HO-OQ-1`) |

## Executive Summary

A signed-in PRMS user on `/bilateral/:center/home` clicks **Bulk Results Uploader** and lands on the partner tool already identified, without a second sign-in and without anything sensitive in the URL. PRMS mints a 32-byte opaque code that lives 120 seconds and is redeemable once; the browser carries only the code; the partner backend redeems it server-to-server with the CLARISA API key it already uses for ingest and receives the user, centre, role, open reporting phase and the method the user signed in with. The mechanism is the same for the three PRMS sign-in paths, which is what lets the partner serve centre staff who have no Microsoft identity.

## Glossary

| Term | Meaning |
|---|---|
| Handoff | The whole flow: mint → redirect → exchange → claims |
| Code | 32 random bytes, base64url (43 chars), opaque, 120 s, single-use. Only its SHA-256 is stored |
| `start` | `POST /api/bilateral/center/handoff` — PRMS-internal, session-authenticated, mints a code |
| `exchange` | `POST /api/bilateral/handoff/exchange` — partner-facing, CLARISA-API-key-authenticated, redeems a code for claims |
| Claims | The JSON the exchange returns (contract v0.2 §4) |
| Audience (`aud`) | Identifier of the partner application the code was minted for (`w3-bilateral-uploader:test`) |
| Calling platform | The external system CLARISA resolves from the API key (`mis.id`, `mis.acronym`) — the same identity `webhook-external-platforms` persists as `external_platform_id` |
| Centre role | An active `role_by_user` row with `role = 9` (Center User) on the centre code, or an admin |
| `auth_method` | How the session was opened: `saml` (CGIAR account via Azure AD), `password` (direct pool credentials), `otp` (email one-time code) |
| Verified session | `req.user` populated by `JwtMiddleware` after a **successful signature check** — never a decoded-but-unverified header |

## 1. Module / Feature

- **Module:** `bilateral` (server `api/bilateral/`, client `pages/bilateral/components/bilateral-page-header`) + one additive claim in `auth/`
- **Sub-feature:** `bulk-uploader-handoff`
- **Owner:** Juan David Delgado
- **Status:** approved
- **Ticket(s):** pending (epic P2-3486)

## 2. Context

The CTA shipped on 2026-09-10 as a plain external link (`bilateral-page-header.component.html:130-141`). The partner receives an anonymous visitor and cannot tell who is uploading, for which centre, or with what authority. Two shortcuts were evaluated with the partner and rejected in `proposal.md` §Problem: forwarding the PRMS session (HS256, only PRMS can verify) and forwarding the Cognito `idToken` (audience shared with QA, no business context, ~1 h life, and **absent** for OTP sessions). Both sides agreed on an authorization-code-style exchange; the partner's callback is deployed on STAGING.

Flows touched (`docs/ux-ui/design.md`): none new — the centre band header on the three tabbed centre pages. Surfaces touched (`docs/trd/trd.md`): `api/bilateral` (new controller, service, entity), `auth/` (one claim in the JWT payload), the `bilateral-page-header` component. PRD anchors: G3 (bilateral consumer reliability), US-D1, **AC-3** (backend enforces authorization), **AC-4** (bilateral contract changes documented), **AC-9** (no secrets in logs), OQ-2 (partner API program — this is a step in that direction, keyed on CLARISA API keys as everything bilateral already is).

## 3. In Scope / Out of Scope

### In scope

- Minting a code for a verified session that holds a role on the requested centre.
- Redeeming a code once, from the partner backend, for the agreed claims.
- Recording `auth_method` in the session JWT and returning it in the claims.
- The CTA becoming a button that mints and then opens the partner tab, popup-blocker safe, with loading and error states.
- Audit of every exchange; no code value in any log.
- Environment configuration for audience, callback and environment label; `bulkUploaderUrl` in the TEST client config.

### Out of scope

- Partner-side account provisioning, SSO, and the PRMS-role → partner-permission mapping (Nicoleta).
- PROD callback / audience (no partner destination yet). The CTA stays hidden there by absent config.
- Project-level handoff (`project`, `programs` claims).
- Gating the CTA by sign-in method — all methods are in.
- Fixing the pre-existing unverified-token decode on `api/bilateral/center/*` (`proposal.md` R-1). This spec **avoids** it; a `bugfix/` spec fixes it.
- Any Cognito, AD or AWS change.

## 4. Personas Affected

| Persona (`docs/prd.md` §3) | What changes for them |
|---|---|
| Result submitter — **Center staff** (Center User role) | One click opens the partner tool signed-in for their centre. Works whether they signed in with a CGIAR account, a password, or an email code. |
| Platform admin | Same, for any centre they open. |
| Bilateral consumer (downstream) — **the Bulk Results Uploader** | Gains `exchange`; must implement `/entry/` redemption and JIT provisioning on its side. |
| QA reviewer, PMU lead | No change. |

## 5. User Stories

- **`BIL-HO-US-1`** — As a Center User, I want the Bulk Results Uploader button to open the partner tool already knowing who I am and which centre I report for, so that I do not sign in twice and cannot pick the wrong centre by accident.
- **`BIL-HO-US-2`** — As a Center User whose organisation is outside the CGIAR directory (CIFOR-ICRAF, ICRISAT), I want the same button to work for me, so that the partner tool does not depend on a Microsoft account I do not have.
- **`BIL-HO-US-3`** — As the partner platform, I want to redeem a short-lived one-time code with the API key I already hold, so that I receive a PRMS-verified identity and context without parsing PRMS tokens or trusting URL parameters.
- **`BIL-HO-US-4`** — As the PRMS security owner, I want every redemption audited and nothing sensitive in URLs or logs, so that a leaked browser history or log line yields nothing usable.

Refines `US-D1`; implements `AC-3`, `AC-9`; respects `AC-4`.

## 6. Functional Requirements

### Required (MUST)

#### `BIL-HO-R-1` — Minting requires a verified session

The system MUST mint a handoff code only for a request whose session was **verified by signature** by `JwtMiddleware`. A request with no `auth` header, or with a header whose signature does not verify, MUST be rejected with `401` **before** any authorisation or database work.

##### Scenario: forged header

- GIVEN a request to `start` carrying an `auth` header that is a well-formed JWT with a valid user id in its payload but **no valid signature**
- WHEN the request is processed
- THEN the response is `401`
- AND no row is written
- BUT it must NOT fall back to decoding the header payload (the `@UserToken()` fallback, `user-token.decorator.ts:17-45`, is forbidden on this route)
- AND IT MUST behave identically for a missing header, an expired token and a malformed token.

#### `BIL-HO-R-2` — Minting requires a role on the centre

The system MUST mint only when the verified user holds an active Center User role (`role_by_user.role = 9`, `active > 0`) on the requested centre code, or is a PRMS admin. Otherwise it MUST answer `403`.

##### Scenario: user of another centre

- GIVEN a verified session for a user with an active Center User role on `CENTER-05` only
- WHEN they request a code for `CENTER-11`
- THEN the response is `403`
- AND no row is written
- BUT it must NOT reveal whether `CENTER-11` exists.

##### Scenario: admin

- GIVEN a verified session for a PRMS admin with no `role_by_user` row on `CENTER-11`
- WHEN they request a code for `CENTER-11`
- THEN a code is minted for `CENTER-11`.

#### `BIL-HO-R-3` — Code shape, lifetime and storage

A code MUST be 32 bytes from a cryptographically secure random source, encoded base64url without padding (43 characters). It MUST expire exactly 120 s after minting. The system MUST persist only the SHA-256 of the code together with `user_id`, `center_code`, `audience`, `expires_at`, `consumed_at`, `consumed_by_platform`, `created_at`. The plaintext code MUST exist only in the `start` response and in the redirect URL.

##### Scenario: database dump

- GIVEN any row of the handoff table
- WHEN it is read
- THEN it does not contain a value from which the original code can be recovered
- AND IT MUST NOT contain the user's e-mail or any claim payload (claims are assembled at exchange time, never stored).

#### `BIL-HO-R-4` — One live code per user

Minting a new code MUST invalidate the same user's previously unconsumed, unexpired codes (any audience) so that at most one redeemable code per user exists at any moment.

##### Scenario: double click

- GIVEN a user who minted code A ten seconds ago and has not redeemed it
- WHEN they mint code B
- THEN redeeming A answers `400` and redeeming B succeeds.

#### `BIL-HO-R-5` — `start` response and redirect URL

On success `start` MUST return `{ code, expires_in: 120, redirect_url }` where `redirect_url` is the configured partner callback for the environment with `code` and `env` as query parameters and a trailing slash on the path (the partner host redirects the slash-less form).

##### Scenario: happy path

- GIVEN a verified Center User of `CENTER-05` on TEST
- WHEN they request a code with audience `w3-bilateral-uploader:test`
- THEN the response is `200` with a 43-character `code`, `expires_in = 120` and a `redirect_url` beginning with the configured callback and containing `?code=<code>&env=test`
- BUT it must NOT include any claim data (no e-mail, no centre name, no role) in the response.

#### `BIL-HO-R-6` — Exchange is authenticated by CLARISA API key

`exchange` MUST require a valid `x-api-key` validated against CLARISA through the existing `ClarisaApiKeyGuard` with its own endpoint label. Missing or invalid key MUST answer `401` with the module's existing generic message. CLARISA unreachable MUST answer `503` with `retry-after: 30`.

##### Scenario: no key

- GIVEN a `POST` to `exchange` with a valid, unconsumed code and no `x-api-key`
- WHEN it is processed
- THEN the response is `401`
- AND IT MUST leave the code unconsumed (an unauthenticated attempt cannot burn a code).

#### `BIL-HO-R-7` — Single, atomic redemption

A code MUST be redeemable exactly once. Redemption MUST be an atomic compare-and-set on the row (unconsumed, unexpired, audience matches) so that two concurrent redemptions cannot both succeed. The successful redemption MUST stamp `consumed_at` and the calling platform.

##### Scenario: replay

- GIVEN a code redeemed successfully one second ago
- WHEN the same code is posted again with a valid key
- THEN the response is `400`
- AND the row is unchanged.

##### Scenario: race

- GIVEN two redemption requests for the same code arriving within the same millisecond
- WHEN both are processed
- THEN exactly one answers `200` and the other `400`
- AND IT MUST NOT rely on application-level locking or a read-then-write.

#### `BIL-HO-R-8` — Indistinguishable failures

Unknown, expired, already-consumed, and wrong-audience codes MUST all answer the same status (`400`) and the same body. The response MUST NOT indicate which condition applied. Timing differences are not required to be masked.

##### Scenario: probing

- GIVEN a valid key
- WHEN four requests are made — a random never-issued code, an expired code, a consumed code, and a live code with the wrong audience
- THEN all four responses have identical status and body
- BUT it must NOT log the submitted code value on any of them.

#### `BIL-HO-R-9` — Claims payload

On success `exchange` MUST return the claims exactly as specified in the partner contract v0.2 §4: `iss`, `aud`, `iat`, `issued_for_env`; `user { user_id, email, first_name, last_name, auth_method }`; `center { clarisa_code, acronym, name, institution_id }`; `role { role_id, description, is_admin }`; `reporting_phase { phase_id, name, status }`. `project` and `programs` MUST be absent. All values MUST be resolved at exchange time from current data, never from the row.

##### Scenario: claims for an OTP user

- GIVEN a code minted by a user whose session carries `auth_method = 'otp'` with a Center User role on `CENTER-05`
- WHEN the partner redeems it
- THEN `user.auth_method` is `"otp"`, `user.email` is that user's stored e-mail (which need not be `@cgiar.org`), `center.clarisa_code` is `CENTER-05`, `role.is_admin` is `false`
- AND `reporting_phase` is the currently open Reporting phase (`status = true`, `is_active = true`, `app_module_id = 1`)
- AND IT MUST NOT contain `project` or `programs` keys.

##### Scenario: legacy session

- GIVEN a code minted by a session issued before the `auth_method` claim existed
- WHEN the partner redeems it
- THEN `user.auth_method` is `null`
- BUT it must NOT fail the exchange.

#### `BIL-HO-R-10` — `auth_method` in the session JWT

Every JWT issued by PRMS MUST carry `auth_method` with one of `saml`, `password`, `otp`, set by the sign-in path that produced it. The claim is additive: no existing consumer of the JWT changes behaviour.

##### Scenario: three paths

- GIVEN successful sign-ins through the CGIAR provider callback, the custom credentials route, and the email-code verify route
- WHEN each JWT is decoded
- THEN `auth_method` is respectively `saml`, `password`, `otp`
- AND IT MUST NOT change `id`, `email`, `first_name`, `last_name` or the token's expiry.

#### `BIL-HO-R-11` — Audit, and nothing sensitive in logs

Every successful exchange MUST be recorded with the calling platform (`mis.id`, `mis.acronym`), the user id, the centre code, the audience and the timestamp. The plaintext code MUST NOT appear in any log line, error message, exception, audit record or response other than the `start` response — on either endpoint, on success or failure (AC-9, `.cursorrules`).

##### Scenario: failed redemption is logged without the code

- GIVEN a redemption attempt with an unknown code
- WHEN it is rejected
- THEN a log line records the calling platform and the outcome `rejected`
- BUT it must NOT include the submitted code or its hash.

#### `BIL-HO-R-12` — CTA behaviour

The CTA MUST open the partner tab **from the click event**, then mint the code, then navigate that tab to `redirect_url`. While minting, the CTA MUST be disabled and show a loading affordance. On failure the opened tab MUST be closed and an error alert shown through the shared custom alert; the CTA MUST return to its idle state. The CTA MUST remain hidden when `bulkUploaderUrl` is empty (unchanged behaviour).

##### Scenario: mint fails

- GIVEN a configured `bulkUploaderUrl` and a user on the Reporting tab
- WHEN they click the CTA and `start` answers `403`
- THEN the tab opened on click is closed, an error alert is shown, and the CTA is enabled again
- BUT it must NOT navigate anywhere and must NOT leave a blank tab open.

##### Scenario: order of operations

- GIVEN a configured `bulkUploaderUrl`
- WHEN the CTA is clicked
- THEN the new tab is opened **before** the HTTP request to `start` is issued
- AND IT MUST sever the opener link (`tab.opener = null`) so the partner page gets no handle on PRMS. *(Amended 2026-09-15, T-7: the `noopener` feature returns no window handle, which steps (4)/(5) of the design need.)*

### Should (SHOULD)

- **`BIL-HO-R-20`** `start` SHOULD purge rows whose `expires_at` is older than 24 h opportunistically (on mint), so the table stays bounded without a scheduler. Falling back to no purge is acceptable if it complicates the transaction.
- **`BIL-HO-R-21`** The exchange SHOULD include `iat` as Unix seconds at redemption time, not mint time, so the partner's own freshness window starts when it received the claims.

### Could (MAY)

- **`BIL-HO-R-30`** `start` MAY accept an explicit `audience`; when omitted it uses the environment's configured default. Only the configured audience(s) are accepted.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Security** | `start` MUST be session-verified (R-1) and centre-authorised (R-2) on the server; the frontend is not a gate (AC-3). `exchange` MUST be CLARISA-key-gated (R-6). No secrets, codes, hashes or URLs with codes in logs (R-11, AC-9). No new public surface beyond the two routes. |
| **Privacy** | Claims contain the user's e-mail and name by agreement; nothing else personal. Error bodies contain no personal data. |
| **Integrity** | Single-use enforced at the database (R-7); no read-then-write. |
| **Performance** | `start` and `exchange` p95 MUST stay under 500 ms on TEST (two indexed lookups and one update each; CLARISA validation dominates and is already paid on every bilateral call). |
| **Availability** | Inherits the platform SLO (G4). CLARISA outage degrades `exchange` to `503`, never to a false `400`. |
| **Backwards compatibility** | Additive only: new routes, new table, one new JWT claim (R-10). No existing bilateral payload changes (AC-4, ADR-004). Sessions without the claim keep working (R-9 legacy scenario). |
| **Accessibility** | The CTA keeps its `aria-label`, remains keyboard-operable, exposes `aria-busy` while minting, and the error alert uses the shared live-region alert (`design.md` §10). |
| **Internationalization** | One new English string, per module practice (`BIL-HO-OQ-2`, resolved). |
| **Observability** | One structured log line per mint (user, centre, outcome) and per exchange (platform, outcome). |
| **Cost / tier** | No new infrastructure; one MySQL table (QAS-12). |

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `BIL-HO-AC-1` | Forged/unsigned `auth` header | `POST start` | `401`, no row written (R-1) |
| `BIL-HO-AC-2` | Verified user without role on the centre | `POST start` | `403`, no row written (R-2) |
| `BIL-HO-AC-3` | Verified Center User of the centre | `POST start` | `200`, 43-char code, `expires_in 120`, `redirect_url` with trailing slash, `code`, `env` (R-3, R-5) |
| `BIL-HO-AC-4` | Same user mints twice | redeem first code | `400`; second code redeems `200` (R-4) |
| `BIL-HO-AC-5` | Live code, no `x-api-key` | `POST exchange` | `401`, code still redeemable (R-6) |
| `BIL-HO-AC-6` | Live code, valid key | `POST exchange` twice | first `200`, second `400`, row stamped once (R-7) |
| `BIL-HO-AC-7` | Unknown / expired / consumed / wrong-aud codes | `POST exchange` | four identical `400` bodies (R-8) |
| `BIL-HO-AC-8` | Code minted by an `otp` session | `POST exchange` | claims per contract v0.2, `auth_method = "otp"`, open phase resolved, no `project`/`programs` (R-9) |
| `BIL-HO-AC-9` | Sign-in through each of the three paths | decode JWT | `auth_method` is `saml` / `password` / `otp`; other claims unchanged (R-10) |
| `BIL-HO-AC-10` | Any `exchange` (success or failure) | inspect logs | platform + outcome present; code and hash absent (R-11) |
| `BIL-HO-AC-11` | Configured URL, click CTA, `start` fails | observe UI | tab closed, alert shown, CTA re-enabled, no navigation (R-12) |
| `BIL-HO-AC-12` | Configured URL, click CTA | observe call order | `window.open` precedes the HTTP call; opener severed (R-12) |
| `BIL-HO-AC-13` | `bulkUploaderUrl` empty | render header | no CTA (R-12, unchanged) |
| `BIL-HO-AC-14` | Two concurrent redemptions of one code | run in parallel against TEST DB | exactly one `200` (R-7 race) — **manual/HITL**, see §Defect classes |

Cross-cutting ACs that apply without restating: `AC-3`, `AC-4`, `AC-8`, `AC-9`.

## Defect classes and the gate that catches each

| # | Defect class this spec can produce | Gate | Falsifying input |
|---|---|---|---|
| D1 | `start` accepts an unverified identity (R-1) | Jest: request with an unsigned JWT → expects `401` | A guard that reads `@UserToken()` makes this test go red |
| D2 | `start` mints for a centre the user has no role on (R-2) | Jest with `validationCenterPermissions` mocked to `0` and `isUserAdmin` to `false` → `403` | A controller that skips the check |
| D3 | Code replay or double redemption (R-7) | Jest: repository mocked to return `affectedRows 0` on the second call → `400`. **The true race cannot be proven with mocks** → `BIL-HO-AC-14` is a **HITL check**: two parallel `curl`s against TEST, exactly one `200`. Recorded in `tasks.md` as a manual gate. | Two `200`s |
| D4 | Plaintext code in a log (R-11) | Jest: logger spy asserted to never receive the code string; plus `grep <code>` over the test output in CI | A log template that interpolates the DTO |
| D5 | Claims drift from contract v0.2 (R-9) | Jest snapshot of the claims JSON against a checked-in fixture. **The fixture ↔ vault contract equality is not automatable** (the contract lives outside the repo) → reviewer compares fixture to contract §4 at the Phase 3 HITL pause | A renamed key |
| D6 | Schema drift (R-3) | `npm run migration:check` | An entity column without migration |
| D7 | Popup blocked / tab opened after `await` (R-12) | Jest: spy order — `window.open` call index < `HttpClient.post` call index. **Real blocker behaviour is not observable in jsdom** → manual browser check on TEST at UAT | Opening the tab in the `subscribe` callback |
| D8 | CTA visible without config (R-12) | Existing spec pattern: env key set in `beforeEach`, cleared in the negative test | A `showBulkCta` that ignores the key |
| D9 | Wrong phase in claims across environments (R-9) | Jest with mocked open phase; **environment-specific ids are not testable in CI** → HITL check on TEST that `phase_id` matches the open phase there | A hard-coded phase id |
| D10 | `auth_method` missing on one path (R-10) | Jest on the three sign-in service methods asserting the `sign()` payload | A caller that forgets the argument |

Accepted blind spots: none unsubstituted. D3, D5, D7, D9 have named human gates.

## 9. Dependencies & Assumptions

### Upstream dependencies

- `auth/` — `JwtMiddleware` (populates `req.user` on verified tokens even on public routes), `createSuccessfulLoginResponse` (single sign site for R-10), `RoleByUserRepository.validationCenterPermissions` / `isUserAdmin`.
- `api/bilateral` — `ClarisaApiKeyGuard`, `@BilateralClarisaEndpoint`, `@ExternalPlatform()`, `ClarisaApiKeyValidationService` (all module-internal).
- `versioning` — `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)`.
- CLARISA — API key validation (already on every bilateral call).
- Partner — `/entry/` on STAGING (deployed, SPA route; must read `code`/`env`).
- Config — server env keys for callback URL, audience(s), environment label; client `bulkUploaderUrl` in TEST.
- Migrations — applied by the Jenkins pipeline on deploy (`onecgiar-pr-server/CLAUDE.md` §Migrations); locally by the owner.

### Downstream consumers

- The Bulk Results Uploader (Synapsis) — sole consumer of `exchange`.

### Assumptions

- `role_by_user.role = 9` remains the Center User role id in every environment (it is what `validationCenterPermissions` already hard-codes).
- The partner keeps one CLARISA API key per environment and it is the same key used for ingest.
- Clock skew between PRMS and the partner is irrelevant: expiry is evaluated by PRMS only.

## 10. Open Questions

- **`BIL-HO-OQ-1`** — AC-4 expects bilateral contract changes logged in `bilateral-result-summaries.en.md`. Owner decided the contract lives in the vault. **Proposed resolution:** one dated line in that file's change log naming the two routes and stating the contract is maintained externally. **Resolved 2026-09-14 (owner): yes, one line.** The change-log row is a deliverable of the docs task.
- **`BIL-HO-OQ-2`** — The client hard rule says all user-facing strings go through `src/app/internationalization/`; the bilateral pages use none today (0 files) and the CTA label is a hard-coded computed string. **Proposed resolution:** follow module practice for the one new error string, record the deviation, and let the module-wide i18n debt be its own change. **Resolved 2026-09-14 (owner): follow module practice.** The single new string is plain English like the rest of `pages/bilateral`; the deviation is recorded here and the module-wide i18n debt is not this spec's.
- **`BIL-HO-OQ-3`** — Should `start` accept the centre as the route's acronym (`AfricaRice`) and resolve it server-side, or require the CLARISA code (`CENTER-XX`) that `BilateralContextService.centerId` already holds? **Proposed resolution:** require the code; the client already has it, and it avoids re-implementing the Alliance alias logic. **Resolved 2026-09-14 (owner): the CLARISA code.** `start` takes `center_code` (`CENTER-XX`); the client sends `BilateralContextService.centerId()`.

## 11. Out-of-Band Notes

- **R-1 in `proposal.md` (pre-existing unverified-token decode on `api/bilateral/center/*`)** is confirmed and out of scope. It is the reason R-1 here is written the way it is. Open `bugfix/bilateral-center-unverified-token` and note the finding on epic P2-3486.
- Rollout order: server (migration + routes) can deploy before the client; the client change is inert until `bulkUploaderUrl` exists.

## Requirement ID Index

| ID | Title | ACs | Strength |
|---|---|---|---|
| R-1 | Minting requires a verified session | AC-1 | MUST |
| R-2 | Minting requires a role on the centre | AC-2 | MUST |
| R-3 | Code shape, lifetime, storage | AC-3 | MUST |
| R-4 | One live code per user | AC-4 | MUST |
| R-5 | `start` response and redirect URL | AC-3 | MUST |
| R-6 | Exchange authenticated by CLARISA key | AC-5 | MUST |
| R-7 | Single, atomic redemption | AC-6, AC-14 | MUST |
| R-8 | Indistinguishable failures | AC-7 | MUST |
| R-9 | Claims payload | AC-8 | MUST |
| R-10 | `auth_method` in the JWT | AC-9 | MUST |
| R-11 | Audit; nothing sensitive in logs | AC-10 | MUST |
| R-12 | CTA behaviour | AC-11, AC-12, AC-13 | MUST |
| R-20 | Opportunistic purge | — | SHOULD |
| R-21 | `iat` at redemption | — | SHOULD |
| R-30 | Explicit audience | — | MAY |

## Required cross-references

- `docs/prd.md` — G3, US-D1, AC-3, AC-4, AC-9, OQ-2.
- `docs/ux-ui/design.md` — §6 *Empty / error / loading*, §8 *Component rules* 6–7, §10.
- `docs/trd/trd.md` — ADR-003, ADR-004, §4 *Error contract*, §8 *Security*, QAS-1, QAS-9, QAS-12, W6.
- `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` — change log (`BIL-HO-OQ-1`).
- Partner contract v0.2 — vault, `CGIAR/W3/w3-bilateral-module/w3-bilateral-bulk-handoff-contrato.md`.
