# Design — Sign-in handoff from PRMS to the Bulk Results Uploader

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/bulk-uploader-handoff/` |
| Module code | `BIL-HO` |
| Depth | **Full** — re-checked against this design in §Budget: holds |
| Approval Mode | gated |
| Status | **approved** (Phase 2 gate, owner, 2026-09-14) — DD-1 confirmed: `/api/bilateral/handoff/exchange` |
| Owner | Juan David Delgado |
| Date | 2026-09-14 |
| Requirements | `requirements.md` (approved 2026-09-14) — R-1…R-12, R-20, R-21, R-30 |
| Baseline | `docs/trd/trd.md` ADR-001 (LITE, no new compute), ADR-002 (migrations only), ADR-003 (`auth` header), ADR-004 (additive bilateral), §4 *Error contract*, §8 *Security*, QAS-1/9/12 · `docs/ux-ui/design.md` §6, §8 (6, 7), §10 · `onecgiar-pr-client/CLAUDE.md` §5 *Hard UI rules*, §6 *API service conventions* (cited per **KZ-BOR-1**) |
| Skills applied | `software-architect` (Decision Spine, §12), `nestjs-expert`, `api-design-principles`, `error-handling-patterns`, `angular-developer` |
| Partner contract | vault `w3-bilateral-bulk-handoff-contrato.md` — **v0.3** (paths per DD-1) |

## 1. Summary

Two new routes inside the existing `api/bilateral` module, one throw-away table, one small guard, one additive JWT claim, and one client component that stops being a link. Nothing in `app.module.ts`, nothing in Cognito, nothing in the bilateral payload contract. The design leans on three patterns that already exist in the codebase: the webhook module's partner authentication (`ClarisaApiKeyGuard` + endpoint label + `@ExternalPlatform()`), the OTP module's single-use challenge table, and the centre controller's session routes inside a "public" module.

Key architectural fact the whole design turns on: `JwtMiddleware` lists `/api/bilateral` as a **public route prefix** (`jwt.middleware.ts:20-25`). On a public route the middleware still verifies a present token and sets `req.user`, but it **does not reject** a missing or invalid one. So inside this module, session enforcement is the route's own job — which is exactly R-1.

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Placement | Why here |
|---|---|---|
| Server routes | `api/bilateral/` — new `BilateralHandoffController` registered in `BilateralModule.controllers` | The guard and its validation service are providers of this module and are not exported (`bilateral.module.ts:182`). Placing the routes here needs zero new wiring. Precedent: `BilateralCenterController` (session routes) and `BilateralWebhookController` (partner routes) already coexist here. |
| Server logic | `api/bilateral/services/bilateral-handoff.service.ts` | Same folder as the other bilateral services. |
| Persistence | `api/bilateral/entities/bilateral-handoff-code.entity.ts` + `src/migrations/<ts>-bilateral-handoff-codes.ts` | Module-owned, throw-away table (see §3). |
| Session guard | `api/bilateral/guards/verified-session.guard.ts` | Sibling of `clarisa-api-key.guard.ts`. Kept module-local; if a second module needs it, promote to `shared/guards/`. |
| JWT claim | `auth/auth.service.ts` — `createSuccessfulLoginResponse` gains a parameter; its three callers pass the method | The single sign site; three callers (`validateCognitoCode`, `singIn`, `verifyOtp`). |
| Client | `pages/bilateral/components/bilateral-page-header/` + one method on `shared/services/api/auth.service.ts` | The CTA already lives in the header; the API method follows `HTTP_METHOD_descriptiveName`. |

### 2.2 Sequence / interaction

```
Browser (PRMS)                 PRMS server                                  Partner
──────────────                 ───────────                                  ───────
click CTA
  ├─ window.open('', '_blank'); tab.opener = null   ← synchronous, from the click event (R-12; amended T-7)
  └─ POST api/bilateral/center/handoff  { center_code, audience? }
                               JwtMiddleware: public prefix → verifies token if present, sets req.user
                               VerifiedSessionGuard: req.user.id ? next : 401           (R-1)
                               HandoffService.start:
                                 isUserAdmin || validationCenterPermissions(user, code) ? : 403   (R-2)
                                 invalidate user's live codes                                     (R-4)
                                 code = 32 random bytes → base64url; store SHA-256 + expiry 120 s  (R-3)
                                 opportunistic purge of rows older than 24 h                       (R-20)
                               ← 200 { code, expires_in, redirect_url }                           (R-5)
  tab.location = redirect_url ──────────────────────────────────────────────────────▶ GET /entry/?code&env
                                                                                     Partner backend:
                               ◀──────────────────────── POST api/bilateral/handoff/exchange { code, audience }
                               ClarisaApiKeyGuard (+ endpoint label) → mis on request         (R-6)
                               HandoffService.exchange:
                                 UPDATE … WHERE code_hash=? AND audience=? AND consumed_at IS NULL
                                                AND expires_at > NOW()  → affectedRows === 1 ?     (R-7)
                                 else → 400 (one body for every miss)                              (R-8)
                                 assemble claims from users, role_by_user, clarisa_center,
                                 clarisa_institutions, open Reporting phase                        (R-9)
                                 audit log (platform, user, centre, outcome)                       (R-11)
                               ─────────────────────────────────────────────────────▶ 200 { claims }
                                                                                     provisions / matches by e-mail,
                                                                                     opens its own session
```

## 3. Data Model Changes

### 3.1 Entities

**`bilateral_handoff_codes`** (new; not a `BaseEntity`/`Auditable` descendant — same reasoning as `OtpChallenge`: authentication state with a 120 s life, nothing to soft-delete).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK auto | |
| `code_hash` | char(64), **unique index** | SHA-256 hex of the plaintext code. Never the code (R-3). Plain SHA-256 is enough: the input has 256 bits of entropy, so a keyed HMAC buys nothing here — unlike OTP codes, which are short. |
| `user_id` | int, index, FK → `users.id` | |
| `center_code` | varchar(45), FK → `clarisa_center.code` | The CLARISA code (`OQ-3` resolved). |
| `audience` | varchar(100) | e.g. `w3-bilateral-uploader:test` |
| `expires_at` | datetime | `created_at + 120 s` |
| `consumed_at` | datetime NULL | Stamped by the single successful exchange (R-7). |
| `consumed_by_platform_id` | int NULL | `mis.id` from the CLARISA validation (R-11). |
| `consumed_by_platform_acronym` | varchar(50) NULL | `mis.acronym`, denormalised so the audit survives a CLARISA rename. |
| `created_at` | datetime default now | |

Index on `(user_id, consumed_at, expires_at)` serves R-4's invalidation and R-20's purge.

Nothing stored that R-3's dump scenario forbids: no e-mail, no claims, no plaintext.

### 3.2 Migrations

One generated migration (`npm run migration:generate`), pruned to this table only (the generator is known to emit unrelated tables), with a working `down` that drops it. Applied by the Jenkins pipeline on deploy (`onecgiar-pr-server/CLAUDE.md` §Migrations). Reverting with rows inside loses at most two minutes of in-flight codes; users click again.

### 3.3 CLARISA / external-data implications

Read-only reads of `clarisa_center` (code → institution) and `clarisa_institutions` (name, acronym, id) at exchange time. No cache table, no sync change.

## 4. API Surface

### 4.1 New endpoints

| Route | Auth | Body (validated DTO) | Success | Errors |
|---|---|---|---|---|
| `POST /api/bilateral/center/handoff` | `VerifiedSessionGuard` (session verified by `JwtMiddleware`) | `center_code` (string, `CENTER-\d+`), `audience` (optional string, must be a configured audience) | `200` `{ code, expires_in: 120, redirect_url }` through `ResponseInterceptor` envelope | `401` no/invalid session (with `shouldRedirectToLogin`) · `403` no role on centre · `400` unknown audience · `503` upstream |
| `POST /api/bilateral/handoff/exchange` | `ClarisaApiKeyGuard` + `@BilateralClarisaEndpoint('/api/bilateral/handoff/exchange')` | `code` (string, 43 base64url chars), `audience` (string) | `200` claims (contract §4) | `401` key missing/invalid (`BILATERAL_UNAUTHORIZED_MESSAGE`) · `503` + `retry-after: 30` CLARISA unavailable · `400` `{"message":"Invalid or expired code"}` for every miss (R-8) |

Both DTOs use `class-validator` with `whitelist`/`forbidNonWhitelisted` per TRD §4 conventions; Swagger `@ApiTags('Bilateral handoff')`.

**Path decision — see DD-1.** The partner contract v0.2 documents `/api/auth/handoff/exchange`. This design places the route under `/api/bilateral/…`. One of the two must change; DD-1 recommends changing the (unsent) contract.

### 4.2 Bilateral / platform-report impact

None on existing payloads (ADR-004). The change-log row agreed in `OQ-1` goes into `bilateral-result-summaries.en.md`: date, the two routes, "contract maintained externally".

## 5. Server Workflow / Business Rules

| Step | Rule | Requirement |
|---|---|---|
| S1 | `VerifiedSessionGuard` accepts only `req.user.id` set by the middleware. It never reads the `auth` header itself. The controller uses `@DecodedUser()`; `@UserToken()` is **forbidden** on both routes and a DoD grep enforces it. | R-1 |
| S2 | Authorisation: `RoleByUserRepository.isUserAdmin(userId)` **or** `validationCenterPermissions(userId, centerCode) === 1`. Order: admin check first (cheaper, and admins have no centre row). | R-2 |
| S3 | Audience: request value or the configured default; must be in the configured allow-list, else `400`. | R-30 |
| S4 | Invalidate: `UPDATE … SET consumed_at = NOW(), consumed_by_platform_acronym = 'superseded' WHERE user_id = ? AND consumed_at IS NULL AND expires_at > NOW()`. Marking rather than deleting keeps the audit trail. | R-4 |
| S5 | Mint: `crypto.randomBytes(32)` → base64url (no padding) → SHA-256 hex stored; `expires_at = now + 120 s`. Insert. | R-3 |
| S6 | Purge (best effort, outside the transaction): `DELETE … WHERE expires_at < NOW() - INTERVAL 1 DAY LIMIT 500`. Failure is logged and swallowed. | R-20 |
| S7 | Response: `redirect_url = <callback with trailing slash>?code=<code>&env=<env label>`. Built with `URL`/`URLSearchParams`, never string concatenation. | R-5 |
| E1 | Exchange consume: single `UPDATE` compare-and-set; proceed iff `affectedRows === 1`. No `SELECT` first. | R-7 |
| E2 | Any other outcome → the one `400` body. The service distinguishes internally for the audit log only (`rejected: unknown | expired | consumed | audience`) and the log never carries the code or hash. | R-8, R-11 |
| E3 | Claims assembly (read-only): `users` (id, email, first_name, last_name); `role_by_user` row for `(user, center_code, active)` → `role_id`, `role.description`; `is_admin` from `isUserAdmin`; `clarisa_center` → `institutionId` → `clarisa_institutions` (name, acronym); `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)` → `phase_id`, `phase_name`, `status: 'open'`; `auth_method` copied from the row (see S5′). `iss` = front base URL derived from `FRONT_END_PDF_ENDPOINT` by stripping `/reports/result-details/` (the same derivation `bilateral.service.ts` uses for `prms_link`). `iat` = now (R-21). | R-9 |
| S5′ | To return `auth_method` at exchange time without re-reading the session, `start` copies `req.user.auth_method ?? null` into a nullable `auth_method` varchar(16) column on the row. **Amends §3.1:** add that column. It is not personal data. | R-9, R-10 |
| A1 | JWT: `createSuccessfulLoginResponse(user, authTokens, successMessage, authMethod)` adds `auth_method` to the `sign()` payload. Callers: `validateCognitoCode` → `'saml'`, `singIn` and `completePasswordChallenge` → `'password'`, `verifyOtp` → `'otp'`. `JwtStrategy`/`JwtMiddleware` need no change (they pass the payload through). | R-10 |

Error contract: every error flows through the existing `HttpExceptionFilter`; bodies are `{ statusCode, message }`; no stack, no code, no hash (TRD §4).

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. The header component is standalone and already imported by the three tabbed centre pages.

### 6.2 Components & services

| Piece | Change |
|---|---|
| `bilateral-page-header.component.html` | The CTA `<a>` becomes a `<button type="button">` with the same classes, icon, labels and `data-testid`; adds `[disabled]` and `[attr.aria-busy]` bound to a `isMinting` signal; spinner glyph replaces the icon while minting. **Reversion challenge — see DD-5.** |
| `bilateral-page-header.component.ts` | New `isMinting = signal(false)`; new `openBulkUploader()` handler: (1) `const tab = window.open('', '_blank')` **synchronously**, then `tab.opener = null` (amended 2026-09-15, T-7: the `noopener` feature makes `window.open` return `null`, and steps (4)/(5) need the handle); (2) if `tab` is `null` (blocked) → alert and return; (3) call the API; (4) on success `tab.location.href = redirect_url`; (5) on error `tab.close()` + alert; (6) always reset `isMinting`. Injects `AuthService` (shared API service) and `CustomizedAlertsFeService`. |
| `shared/services/api/auth.service.ts` | `POST_bilateralHandoffStart(body: { center_code: string; audience?: string })` → `${environment.apiBaseUrl}api/bilateral/center/handoff` via `HttpClient`; the `general-interceptor` attaches the `auth` header (ADR-003). Placed on `AuthService` because the endpoint is about the session, and it already hosts the sign-in calls. |
| Error alert | `CustomizedAlertsFeService.show({ id: 'bulkHandoffAlert', title: 'Oops!', description: <server message or generic>, status: 'error' })` — the same service and shape `cognito.service.ts` uses. English string per module practice (`OQ-2` resolved). |
| `bilateral-page-header.component.spec.ts` | Rewrite the two CTA tests: (a) button renders when the key is set, hidden when empty (pattern kept: key set in `beforeEach`, restored in `afterEach`); (b) **call order**: `window.open` spy invoked before the `HttpClient` request is flushed (`HttpTestingController`); (c) success → `location.href` assigned on the returned stub; (d) failure → `close()` called, alert `show` called with `status: 'error'`, `isMinting` back to `false`; (e) blocked popup (`window.open` returns `null`) → alert, no HTTP call. |

### 6.3 Design system usage

Cited per **KZ-BOR-1** from `onecgiar-pr-client/CLAUDE.md` §5: Tailwind utilities only (no new SCSS); primary button colour stays `var(--pr-color-primary-300)` with the existing hover/focus ring; icon set stays Material Icons Round (`upload_file`, and `progress_activity` with `animate-spin` while minting); no native `<a>`-as-button — a real `<button>` gives keyboard and disabled semantics for free. A11y (`design.md` §10): keep `aria-label`, add `aria-busy`, keep the visible focus ring; the alert is the shared live-region alert (§8 rule 7).

### 6.4 Real-time / notification UX

None.

## 7. Security & Authorization

| Concern | Design |
|---|---|
| Identity on `start` | Middleware-verified only (S1). The pre-existing `@UserToken()` fallback (`user-token.decorator.ts:17-45`) is the vulnerability `proposal.md` R-1 names; this module's new routes never touch it. |
| Authorisation on `start` | Server-side, S2 (AC-3). The client's `centerId` is a convenience; the server re-derives permission from `role_by_user`. |
| Partner identity | CLARISA key → `mis`; the same identity `external_platform_id` records on ingest. `endpoint_accessed` label `/api/bilateral/handoff/exchange` distinguishes this hop in CLARISA's audit. |
| Code secrecy | 256-bit random, hashed at rest, 120 s, single-use, one live per user. Appears only in the `start` response and the redirect URL. Browser history exposure is bounded by TTL + single use. |
| Log hygiene | Structured log objects with an explicit field allow-list (`userId`, `centerCode`, `audience`, `platformAcronym`, `outcome`); the DTOs are never spread into a log call. A logger spy test enforces it (D4). |
| Rate limiting | `/api/bilateral/*` is throttler-excluded. Accepted: brute force against 256 bits is not a threat; `start` abuse is bounded by R-4 (one live code) and by the session requirement. Recorded as accepted risk (proposal R-2). |
| CORS / opener | Partner tab opened with `_blank` and the opener link severed (`tab.opener = null`) before any HTTP call; `noreferrer` is not applicable — the referrer carries the PRMS origin only, never the code. PRMS never receives anything back from it. (Amended 2026-09-15, T-7.) |
| Secrets | Callback URL and audience are config, not secrets; the CLARISA key is the partner's. Nothing new to redact beyond the code. |

## 8. Performance & Capacity

`start`: two indexed reads + one update + one insert (+ best-effort delete). `exchange`: CLARISA validation (already paid on every bilateral call) + one update + five reads. Both comfortably under the 500 ms p95 target on TEST. Table size is bounded by R-20 (24 h retention; at most a few thousand rows).

## 9. Observability

| Event | Level | Fields |
|---|---|---|
| `handoff.start` | log | `userId`, `centerCode`, `audience`, `outcome: minted | forbidden | unauthorized | bad_audience` |
| `handoff.exchange` | log | `platformId`, `platformAcronym`, `outcome: redeemed | rejected:<reason>`, and on `redeemed` also `userId`, `centerCode`, `audience` |
| `handoff.purge_failed` | warn | `error.name` only |

Never logged: code, hash, e-mail, request body.

## 10. Testing Plan (forward-looking)

| Test | Type | Covers |
|---|---|---|
| `verified-session.guard.spec.ts` | unit | R-1: `req.user` absent → 401; present → pass; header present but `req.user` absent (unverified) → 401 |
| `bilateral-handoff.service.spec.ts` | unit | R-2 (admin / centre / neither), R-3 (43 chars, hash stored, plaintext not stored, expiry 120 s), R-4 (invalidation update issued), R-7 (`affectedRows` 1 vs 0), R-8 (four misses → one body; logger spy never receives code), R-9 (claims snapshot vs fixture; `auth_method` null for legacy), R-20 (purge failure swallowed), R-30 (unknown audience → 400) |
| `bilateral-handoff.controller.spec.ts` | unit (Nest testing module) | routes wired, guards applied (metadata assertions: `ClarisaApiKeyGuard` + endpoint label on `exchange`, `VerifiedSessionGuard` on `start`), DTO validation rejects extra fields |
| `auth.service.spec.ts` (extend) | unit | R-10: three callers → three `auth_method` values; other claims unchanged |
| `bilateral-page-header.component.spec.ts` (rewrite CTA block) | unit (client) | R-12: order of `window.open` vs HTTP, success, failure, blocked, hidden-without-key |
| HITL on TEST | manual | AC-14 race (two parallel `curl`s → exactly one `200`), real popup behaviour, `phase_id` equals the open TEST phase, fixture ↔ vault contract equality |

Run scoped: `npx jest --testPathPattern="bilateral" --silent --reporters=summary` (never the whole suite — repo rule), plus `--testPathPattern="auth.service"` for the claim; client `npx jest src/app/pages/bilateral/components/bilateral-page-header --silent`.

## 11. Backwards Compatibility & Migration Plan

- Additive everywhere: new table, new routes, new optional JWT claim. Existing bilateral payloads untouched (ADR-004).
- Sessions issued before A1 lack `auth_method`; `start` stores `null`, `exchange` returns `null` (R-9 legacy scenario). No forced re-login.
- Deploy order: server first (routes are inert until called); client second; then add `bulkUploaderUrl` to the TEST client config to make the CTA appear. PROD stays dark by absent config.
- Rollback: revert the client commit (CTA returns to a plain link — see DD-5 on why that is acceptable), revert the server commit, `migration:revert` drops the table. No data anyone needs is lost.

## 12. Design Decisions (ADRs)

### `BIL-HO-DD-1` — Partner route lives under `/api/bilateral/handoff/exchange`, not `/api/auth/…`

- **Context.** The partner contract v0.2 (and the e-mail thread) names `POST /api/auth/handoff/exchange`. Under `/api/*` that path is **not** in `JwtMiddleware.publicRoutes`, so without a PRMS JWT it would be rejected before reaching any guard — the partner has no PRMS JWT by design.
- **Options.** (a) Route under `/api/bilateral/…`: already public at the middleware, guard and validation service are in-module, zero shared-file changes; the unsent contract changes one path. (b) Keep `/api/auth/…`: add an exclusion in `app.module.ts` (shared, high-blast-radius file) **and** export `ClarisaApiKeyGuard` + `ClarisaApiKeyValidationService` from `BilateralModule` or duplicate them in `AuthModule`.
- **Decision.** **(a).** Everything partner-facing in PRMS already lives under `/api/bilateral` with the CLARISA key (ingest, webhook registration); the handoff belongs with them. Contract bumps to **v0.3** with the new path; the partner has not implemented the call yet. **Confirmed by the owner at the Phase 2 gate (2026-09-14).**

### `BIL-HO-DD-2` — Single-use enforced by a compare-and-set `UPDATE`, not by a transaction or a lock

- **Context.** R-7's race scenario. The runtime is Lambda **and** Docker in parallel; there is no shared process memory.
- **Decision.** One `UPDATE … WHERE consumed_at IS NULL AND expires_at > NOW()`; success iff `affectedRows === 1`. MySQL row locking makes this atomic without `SELECT … FOR UPDATE` or a serialisable transaction. Same mechanism the OTP challenge uses for `consumed_at`.
- **Rejected.** Redis `SETNX` (new infrastructure, QAS-12); in-memory map (wrong under multi-instance).

### `BIL-HO-DD-3` — Plain SHA-256 at rest, not an HMAC

- **Context.** `OtpChallenge` HMACs its code under a `JWT_SKEY`-derived key because a 6–8 digit code is guessable from its hash. A 32-byte random code is not: the hash of a 256-bit secret is not invertible in practice.
- **Decision.** SHA-256, no key. Simpler, no secret dependency, no key-rotation story. **Rejected:** HMAC (adds a `JWT_SKEY` dependency to a table that does not need it).

### `BIL-HO-DD-4` — `auth_method` is copied onto the row at mint time

- **Context.** The exchange runs without the user's session; it only has the row.
- **Decision.** `start` copies `req.user.auth_method ?? null` into the row; `exchange` returns it. Alternative rejected: persisting `auth_method` on `users` (`last_login_method`) — it would need a migration on a core table and would be wrong for a user with two concurrent sessions of different kinds.

### `BIL-HO-DD-5` — The CTA becomes a `<button>` (reverts the `<a href target=_blank>` shipped 2026-09-10)

- **Reversion challenge (Step 2.3) — "what does removing the link break?"**
  - The two existing spec tests asserting `href`, `target`, `rel` **break** → they are rewritten in this spec (§6.2), not deleted.
  - Middle-click / "open in new tab" / "copy link address" affordances are **lost** → intentional: a link without a code is useless, and a copied one would be a dead URL. Nothing else in the codebase references the anchor (grep for the `data-testid` finds only the component and its spec).
  - The rollback story is unaffected: reverting the client commit restores the link (§11).
- **Decision.** Proceed. The button also gives disabled/`aria-busy` semantics the anchor could not.

### `BIL-HO-DD-6` — `VerifiedSessionGuard` is module-local, not a change to `JwtMiddleware`

- **Context.** The root fix for `proposal.md` R-1 is to stop `@UserToken()` decoding unverified headers, or to remove `/api/bilateral` from the public prefixes. Both change behaviour for every existing bilateral centre route.
- **Decision.** A tiny guard scoped to this controller. The systemic fix is `bugfix/bilateral-center-unverified-token` and is explicitly not folded in here (Non-goals).

### `BIL-HO-DD-7` — Redirect URL built server-side

- **Context.** The client already holds `bulkUploaderUrl`; it could append the code itself.
- **Decision.** The server returns the full `redirect_url` from `BULK_HANDOFF_CALLBACK_URL`. One source of truth for the callback (server config), trailing slash and `env` label handled in one place, and the client cannot mis-assemble it. `bulkUploaderUrl` on the client remains only the **visibility switch** (R-12) — it is not used for navigation any more. **Follow-up gap:** the two config values must agree; recorded in §13.

## 13. Open Gaps & Follow-ups

| # | Gap | Owner / when |
|---|---|---|
| G-1 | ~~Contract v0.2 → v0.3~~ done 2026-09-14 in the vault. **Send to partner.** | Owner |
| G-2 | Client `bulkUploaderUrl` and server `BULK_HANDOFF_CALLBACK_URL` point at the same host; drift shows the button and then navigates elsewhere. Rollout checklist item. | DevOps / owner at deploy |
| G-3 | `bugfix/bilateral-center-unverified-token` — the systemic fix for `@UserToken()` on public bilateral routes. | Separate spec |
| G-4 | Server `.env` keys `BULK_HANDOFF_CALLBACK_URL`, `BULK_HANDOFF_AUDIENCES` (comma-separated allow-list; first is default), `BULK_HANDOFF_ENV` (`test` / `prod`) to be listed in `onecgiar-pr-server/README.md` → Environment. | Docs task |
| G-5 | Change-log row in `bilateral-result-summaries.en.md` (`OQ-1`). | Docs task |

## Extended Directory Structure

```
onecgiar-pr-server/src/
├── api/bilateral/
│   ├── bilateral-handoff.controller.ts          (new)
│   ├── bilateral-handoff.controller.spec.ts     (new)
│   ├── dto/
│   │   ├── handoff-start.dto.ts                 (new)
│   │   └── handoff-exchange.dto.ts              (new)
│   ├── entities/
│   │   └── bilateral-handoff-code.entity.ts     (new)
│   ├── guards/
│   │   ├── verified-session.guard.ts            (new)
│   │   └── verified-session.guard.spec.ts       (new)
│   ├── services/
│   │   ├── bilateral-handoff.service.ts         (new)
│   │   └── bilateral-handoff.service.spec.ts    (new)
│   └── bilateral.module.ts                      (edit: controller, provider, forFeature entity)
├── auth/auth.service.ts                         (edit: auth_method at the sign site + 4 callers)
├── auth/auth.service.spec.ts                    (edit)
└── migrations/<timestamp>-bilateral-handoff-codes.ts   (generated, pruned)

onecgiar-pr-client/src/app/
├── pages/bilateral/components/bilateral-page-header/
│   ├── bilateral-page-header.component.ts       (edit: isMinting, openBulkUploader)
│   ├── bilateral-page-header.component.html     (edit: <a> → <button>)
│   └── bilateral-page-header.component.spec.ts  (edit: CTA block rewritten)
└── shared/services/api/auth.service.ts          (edit: POST_bilateralHandoffStart)

onecgiar-pr-server/docs/bilateral-result-summaries.en.md   (edit: one change-log row)
onecgiar-pr-server/README.md                               (edit: three env keys)
```

## Budget (Step 2.4)

| Measure | Estimate |
|---|---|
| Tasks | **9** (db · guard · service · controller+DTOs · auth claim · client API method · client CTA · docs/config · HITL verification) |
| LOC | **~1,050** — server ~650 (entity 60, migration 50, guard 40, DTOs 40, service 220, controller 70, specs ~170) · auth claim ~25 + spec ~40 · client ~230 (component 60, template 15, API method 15, spec 140) · docs ~15 |
| Review rounds | **2** (one for the server slice, one for the client slice) |

Depth **Full** holds: auth surface, migration, partner contract. Not oversized — there is no decomposition below nine tasks that keeps the guard, the service and the claim independently reviewable.

## Required cross-references

- `requirements.md` — every §5 row and §12 decision cites its `R-n`.
- `docs/trd/trd.md` — ADR-001/002/003/004, §4, §8, QAS-1/9/12.
- `docs/ux-ui/design.md` — §6, §8 (6, 7), §10.
- `onecgiar-pr-client/CLAUDE.md` §5, §6 (KZ-BOR-1).
- Partner contract — vault `w3-bilateral-bulk-handoff-contrato.md` (→ v0.3 after DD-1).
