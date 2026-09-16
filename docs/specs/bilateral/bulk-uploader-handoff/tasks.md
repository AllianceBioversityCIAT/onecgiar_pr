# Tasks — Sign-in handoff from PRMS to the Bulk Results Uploader

## 1. Scope of this task list

- **Module / feature:** `bilateral` / `bulk-uploader-handoff` (`BIL-HO`)
- **Linked spec:** `requirements.md` (approved 2026-09-14) + `design.md` (approved 2026-09-14)
- **Depth:** Full · **Approval Mode:** gated · **Budget (design §Budget):** 9 tasks · ~1,050 LOC · 2 review rounds — `/akili-execute` stops and escalates when actuals exceed this
- **Owner / driver:** Juan David Delgado
- **Branch base:** `performance-refactor` (bilateral work never bases on `staging`)
- **Status:** merged to `performance-refactor` 2026-09-15 (9 commits, `63e936832..53d1e965d`, fast-forward; no Jira key yet). T-1…T-7 PASS; T-8 repo part PASS, ops part owner-pending; T-9 owner HITL on TEST pending. Open: Pivot Record on R-6's 503 clause, `exchange` envelope vs contract v0.3, Jira key. See `execution.md` §Summary.

## 2. Pre-flight checklist

- [x] `requirements.md` approved.
- [x] `design.md` approved; DD-1 confirmed (`/api/bilateral/handoff/exchange`).
- [x] Open questions resolved (OQ-1/2/3 in `requirements.md`; G-1 done).
- [ ] **Jira ticket created under epic P2-3486** and its key written into `requirements.md` §1 and every commit (`[P2-XXXX]`).
- [x] No in-flight spec touches `bilateral.module.ts` providers or `auth.service.ts` `createSuccessfulLoginResponse` (search `docs/specs/` — as of 2026-09-14: none; re-checked at execution start).
- [x] `npm run migration:check` green on the base branch before T-1 (2026-09-15, 474 files / 483 executed / 0 pending).
- [ ] Working branch verified with `git branch --show-current` **before every commit** (repo rule: the branch at the start is not the branch at the end).

Skill map for this spec (from `.agents/model-routing.md`): server tasks → `nestjs-expert` (+ `api-design-principles` for T-5, `error-handling-patterns` for T-4/T-5, `tdd` for T-2/T-4); client tasks → `angular-developer`; nothing here needs `aws-serverless`.

## 3. Task list

### `BIL-HO-T-1` — Handoff code entity, migration and module wiring — [x]

- **Status:** [x] PASS 2026-09-15 (attempt 2; attempt 1 FAIL on hand-added `COMMENT`s) — see `execution.md`; migration `1789478669369-BilateralHandoffCodes.ts` awaits the owner's `migration:run`; commit held
- **Type:** `db`
- **Description:** Create `BilateralHandoffCode` entity (`design.md` §3.1 incl. the `auth_method` column from S5′), register it in `BilateralModule`'s `TypeOrmModule.forFeature`, generate the migration with `npm run migration:generate -- --name=bilateral-handoff-codes` and **prune it to this table only** (the generator emits unrelated tables). `down` drops the table.
- **Implements:** R-3 (storage clause; *database dump* scenario incl. `AND IT MUST NOT contain the user's e-mail or any claim payload`), R-4 (index enabling invalidation), R-11 (audit columns), DD-3, DD-4
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/entities/bilateral-handoff-code.entity.ts`, `onecgiar-pr-server/src/migrations/<ts>-bilateral-handoff-codes.ts`, `onecgiar-pr-server/src/api/bilateral/bilateral.module.ts`
- **Depends on:** —
- **Blocks:** T-4
- **Estimate:** S
- **Skills:** `nestjs-expert`
- **Verification:** `cd onecgiar-pr-server && npm run migration:check` exits 0 **and** the migration file contains exactly one `CREATE TABLE` (`grep -c "CREATE TABLE" <file>` = 1). *Disqualifier:* a green `migration:check` with more than one table in the file is not evidence — the generator drifted; prune and re-check. *Falsifying input:* an entity column with no migration column makes `migration:check` fail.
- **Definition of done:**
  - [x] Entity has no `email`, no claims column, no plaintext code column (0 hits in declarations; doc comments mention what is not stored, as the OTP exemplar does).
  - [x] Unique index on `code_hash`; composite index `(user_id, consumed_at, expires_at)`.
  - [ ] `down` verified locally: `migration:run` then `migration:revert` leaves no table (owner runs migrations; agents never do).
  - [x] Commit `✨ feat(bilateral-handoff) [P2-XXXX]: add handoff code table` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-2` — `VerifiedSessionGuard` — [x]

- **Status:** [x] PASS 2026-09-14 (attempt 2; attempt 1 FAIL on spec falsifiability) — see `execution.md`; commit held until the Jira key exists
- **Type:** `server`
- **Description:** Guard that passes iff `req.user?.id` is a positive number **as set by `JwtMiddleware`**; otherwise throws `401` with the middleware's `shouldRedirectToLogin` shape. It never reads the `auth` header. TDD: write the spec first.
- **Implements:** R-1 (all of it: *forged header* scenario; `BUT it must NOT fall back to decoding the header payload`; `AND IT MUST behave identically for a missing header, an expired token and a malformed token`), DD-6
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/guards/verified-session.guard.ts`, `…/verified-session.guard.spec.ts`
- **Depends on:** —
- **Blocks:** T-5
- **Estimate:** S
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:** `npx jest --testPathPattern="verified-session" --silent --reporters=summary` green with ≥ 4 cases: no `req.user` → 401; `req.user = {id: 0}` → 401; header present but no `req.user` (the unverified case) → 401; `req.user = {id: 7}` → pass. *Disqualifier:* a spec that constructs `req.user` from the header itself tests the wrong thing — the guard must be fed `req.user` directly, as the middleware would. *Falsifying input:* an implementation that calls `processUserToken`/`@UserToken()` turns case 3 red.
- **Definition of done:**
  - [x] `grep -n "UserToken\|headers\['auth'\]\|headers.auth" verified-session.guard.ts` = 0 hits.
  - [x] Commit `✨ feat(bilateral-handoff) [P2-XXXX]: verified-session guard` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-3` — `auth_method` claim in the session JWT — [x]

- **Status:** [x] PASS 2026-09-14 (attempt 1) — see `execution.md`; commit held until the Jira key exists
- **Type:** `server`
- **Description:** Add an `authMethod` parameter to `createSuccessfulLoginResponse` and include `auth_method` in the `sign()` payload. Callers: `validateCognitoCode` → `'saml'`; `singIn` and `completePasswordChallenge` → `'password'`; `verifyOtp` → `'otp'`. Additive: no other payload field or option changes.
- **Implements:** R-10 (*three paths* scenario; `AND IT MUST NOT change id, email, first_name, last_name or the token's expiry`), R-9 legacy prerequisite
- **Files (expected):** `onecgiar-pr-server/src/auth/auth.service.ts`, `onecgiar-pr-server/src/auth/auth.service.spec.ts`
- **Depends on:** —
- **Blocks:** T-4 (reads `req.user.auth_method`)
- **Estimate:** S
- **Skills:** `nestjs-expert`
- **Verification:** `npx jest --testPathPattern="auth.service" --silent --reporters=summary` green, with assertions on the `JwtService.sign` spy's first argument for each of the four callers, plus one assertion that the payload keys are exactly `{id,email,first_name,last_name,auth_method}`. *Disqualifier:* asserting only `toHaveBeenCalled()` proves nothing about the claim. *Falsifying input:* removing the argument from one caller turns that caller's assertion red. Also run `npx jest --testPathPattern="app.module" --silent` because a constructor/signature in `auth` changed (repo rule).
- **Definition of done:**
  - [x] Four callers pass a method; no caller left with the old arity.
  - [x] `expiresIn` and `secret` options untouched (diff shows only the payload line and the parameter).
  - [x] Commit `✨ feat(auth) [P2-XXXX]: record auth_method in the session JWT` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-4` — `BilateralHandoffService` (start, exchange, claims, purge) — [x]

- **Status:** [x] PASS 2026-09-15 (attempt 3 — reopened by the local HITL: `expires_at` was written on the Node clock vs MySQL `NOW()`; now computed in SQL and verified live. Attempt 2 PASS; attempt 1 FAIL: `is_admin` null, `audience` missing) — see `execution.md`; commit held
- **Type:** `server`
- **Description:** Service implementing `design.md` §5 S2–S7, S5′, E1–E3. Public methods: `start(user, dto)`, `exchange(dto, platform)`. Uses `RoleByUserRepository` (`isUserAdmin`, `validationCenterPermissions`), `ClarisaCentersRepository` + `ClarisaInstitutionsRepository`, `VersioningService.$_findActivePhase(AppModuleIdEnum.REPORTING)`, `UserRepository`, the new entity repository, and `crypto`. Config from `BULK_HANDOFF_CALLBACK_URL`, `BULK_HANDOFF_AUDIENCES`, `BULK_HANDOFF_ENV`, `FRONT_END_PDF_ENDPOINT` (for `iss`). TDD.
- **Implements:** R-2, R-3, R-4, R-5, R-7, R-8, R-9, R-11, R-20, R-21, R-30, DD-2, DD-3, DD-4, DD-7 — clause detail:
  - R-2 — *user of another centre* (403, no row, `BUT it must NOT reveal whether the centre exists`), *admin* scenario
  - R-3 — 32 bytes CSPRNG, base64url 43 chars, expiry exactly 120 s, SHA-256 stored, plaintext only in the response
  - R-4 — *double click* scenario (A → 400, B → 200)
  - R-5 — *happy path* (`expires_in 120`, `redirect_url` with trailing slash, `?code=&env=`; `BUT it must NOT include any claim data`)
  - R-7 — *replay* scenario (row unchanged), *race* scenario **at the mechanism level** (`AND IT MUST NOT rely on application-level locking or a read-then-write` — verified by asserting a single `UPDATE` and no preceding `SELECT`); the live race itself is T-9
  - R-8 — *probing* scenario (four misses → identical body; `BUT it must NOT log the submitted code value`)
  - R-9 — *claims for an OTP user* (all `AND`/`AND IT MUST NOT` clauses incl. no `project`/`programs`), *legacy session* (`auth_method` null, `BUT it must NOT fail`)
  - R-11 — *failed redemption is logged without the code* (platform + outcome present; `BUT it must NOT include the submitted code or its hash`), success audit fields
  - R-20 (purge best-effort, failure swallowed), R-21 (`iat` at redemption), R-30 (audience allow-list → 400)
  - DD-2, DD-3, DD-4, DD-7
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/bilateral-handoff.service.ts`, `…/bilateral-handoff.service.spec.ts`, `onecgiar-pr-server/src/api/bilateral/bilateral.module.ts` (provider)
- **Depends on:** T-1, T-3
- **Blocks:** T-5
- **Estimate:** L
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd`
- **Verification:** `npx jest --testPathPattern="bilateral-handoff.service" --silent --reporters=summary` green, covering every bullet above (≥ 18 cases). Claims shape asserted against a **checked-in fixture** `onecgiar-pr-server/src/api/bilateral/fixtures/handoff-claims.v0.3.json` with `toEqual` on keys (values from mocks). Logger asserted with a spy that **never** receives the plaintext code or its hash in any argument (`JSON.stringify(call).includes(code)` false for every call). *Disqualifier:* a claims test that snapshots whatever the service returned (`toMatchSnapshot()` written on first run) is circular — the fixture must be authored from contract v0.3 §4 by hand. *Falsifying input:* renaming `clarisa_code` to `code` in the service turns the fixture test red; interpolating the DTO into a log turns the logger test red.
- **Definition of done:**
  - [x] `grep -n "SELECT" bilateral-handoff.service.ts` shows no read of the code row before the consume `UPDATE`.
  - [x] `grep -n "randomBytes(32)" bilateral-handoff.service.ts` = 1 hit; no `Math.random`.
  - [ ] Fixture file committed; reviewer compares it to contract v0.3 §4 (**HITL, T-9**) — fixture written and key-tree verified by the Reviewer against the §4 copy; commit held.
  - [x] Commit `✨ feat(bilateral-handoff) [P2-XXXX]: mint and exchange handoff codes` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-5` — Controller, DTOs, guards, Swagger — [x]

- **Status:** [x] PASS 2026-09-15 (attempt 1) — see `execution.md` (Pivot Record on R-6's 503 clause; contract-envelope escalation pending the owner); commit held
- **Type:** `server`
- **Description:** `BilateralHandoffController` (`@Controller()`, registered in `BilateralModule.controllers`) with `POST center/handoff` (`@UseGuards(VerifiedSessionGuard)`, `@DecodedUser()`) and `POST handoff/exchange` (`@UseGuards(ClarisaApiKeyGuard)`, `@BilateralClarisaEndpoint('/api/bilateral/handoff/exchange')`, `@ExternalPlatform()`). DTOs with `class-validator`; `ResponseInterceptor` envelope; `@ApiTags('Bilateral handoff')`. Error mapping per `design.md` §4.1 (401/403/400/503 with the fixed `400` body).
- **Implements:** R-1 (guard applied), R-6 (*no key* scenario: 401 **and** `AND IT MUST leave the code unconsumed` — the guard rejects before the service runs), R-8 (single 400 body at the HTTP layer), R-5 (envelope), R-12 prerequisite (route the client calls), DD-1
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/bilateral-handoff.controller.ts`, `…/bilateral-handoff.controller.spec.ts`, `onecgiar-pr-server/src/api/bilateral/dto/handoff-start.dto.ts`, `…/dto/handoff-exchange.dto.ts`, `onecgiar-pr-server/src/api/bilateral/bilateral.module.ts` (controller)
- **Depends on:** T-2, T-4
- **Blocks:** T-6, T-9
- **Estimate:** M
- **Skills:** `nestjs-expert`, `api-design-principles`, `error-handling-patterns`
- **Verification:** `npx jest --testPathPattern="bilateral-handoff.controller|bilateral.module|app.module" --silent --reporters=summary` green. Controller spec asserts guard **metadata** via `Reflect.getMetadata('__guards__', handler)` for both routes and the endpoint label on `exchange`; asserts that when the guard throws, the service is **not called** (R-6 unconsumed clause); asserts DTO validation rejects an extra property and a 42-char code. *Disqualifier:* a spec that only checks `controller.exchange()` returns the service's value has not tested any guard. *Falsifying input:* removing `@UseGuards(ClarisaApiKeyGuard)` turns the metadata assertion red.
- **Definition of done:**
  - [x] `grep -n "UserToken" bilateral-handoff.controller.ts` = 0 hits (R-1 DoD from the proposal).
  - [ ] Swagger renders both routes with request/response schemas (`GET /api-docs` locally) — decorators asserted via metadata in the spec; visual check when the owner next runs the app.
  - [x] `npx eslint "src/api/bilateral/**/*.ts" --quiet` clean (touched files; pre-existing prettier debt in `bilateral-center.*` untouched).
  - [x] Commit `✨ feat(bilateral-handoff) [P2-XXXX]: handoff start and exchange routes` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-6` — Client API method — [x]

- **Status:** [x] PASS 2026-09-15 (attempt 1) — see `execution.md`; commit held
- **Type:** `client`
- **Description:** `POST_bilateralHandoffStart(body: { center_code: string; audience?: string })` on `shared/services/api/auth.service.ts`, calling `${environment.apiBaseUrl}api/bilateral/center/handoff` through `HttpClient` (the `general-interceptor` attaches the `auth` header). Typed response `{ code: string; expires_in: number; redirect_url: string }` inside the standard envelope.
- **Implements:** R-12 prerequisite (transport for the CTA), ADR-003 (`auth` header, never `Authorization: Bearer`)
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/api/auth.service.ts`, `…/auth.service.spec.ts` (if present; else covered by T-7's `HttpTestingController`)
- **Depends on:** T-5 (contract), parallel-safe with T-5 in practice
- **Blocks:** T-7
- **Estimate:** S
- **Skills:** `angular-developer`
- **Verification:** `npx jest src/app/shared/services/api/auth.service --silent --no-coverage` green (or T-7's test flushes the exact URL and method). *Disqualifier:* asserting against a hard-coded `localhost` URL — assert against `environment.apiBaseUrl` (repo rule). *Falsifying input:* changing the method to `GET` or the path segment turns the `expectOne` red.
- **Definition of done:**
  - [x] Name follows `HTTP_METHOD_descriptiveName`; no `Authorization` header set manually.
  - [x] Commit `✨ feat(auth-service) [P2-XXXX]: POST_bilateralHandoffStart` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-7` — CTA: link → button with mint-then-navigate — [x]

- **Status:** [x] PASS 2026-09-15 (attempt 1; design §6.2 `noopener` wording amended — see `execution.md`); commit held
- **Type:** `client`
- **Description:** In `bilateral-page-header`: `<a>` → `<button type="button">` keeping classes, icon, labels and `data-testid`; add `isMinting` signal, `[disabled]`, `[attr.aria-busy]`, spinner glyph while minting; `openBulkUploader()` per `design.md` §6.2 steps (1)–(6) — open tab **synchronously** with `noopener,noreferrer`, null-check for a blocked popup, call T-6, on success assign `location.href`, on error `close()` + `CustomizedAlertsFeService.show({ status: 'error' })`, always reset. Rewrite the CTA block of the spec. Tailwind utilities only; Material Icons Round; cite `onecgiar-pr-client/CLAUDE.md` §5 in the PR (KZ-BOR-1).
- **Implements:** R-12 — *mint fails* scenario (tab closed, alert, re-enabled; `BUT it must NOT navigate anywhere and must NOT leave a blank tab open`), *order of operations* scenario (`window.open` before HTTP; `AND IT MUST open with noopener`), hidden-when-empty (unchanged, re-asserted), blocked-popup branch; NFR Accessibility (`aria-label`, `aria-busy`, focus ring); DD-5, DD-7
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.ts`, `….html`, `….spec.ts`
- **Depends on:** T-6
- **Blocks:** T-9
- **Estimate:** M
- **Skills:** `angular-developer`
- **Verification:** `npx jest src/app/pages/bilateral/components/bilateral-page-header --silent --no-coverage` green **twice**: once with `bulkUploaderUrl` set in `beforeEach`, once with the key deleted (repo rule from the CTA note; the negative test also lives inside the suite). Spec asserts: (a) `window.open` spy call **index** < the index at which `HttpTestingController.expectOne` is flushed; (b) `open` called with `'noopener,noreferrer'`; (c) success → stub `location.href` equals `redirect_url` from the flushed response; (d) `403` → `close()` called once, `show` called with `status: 'error'`, `isMinting()` false, `location.href` unchanged; (e) `open` returns `null` → `show` called, **no** HTTP request (`expectNone`). *Disqualifier:* jsdom cannot observe a real popup blocker — (a) is a proxy; the real behaviour is T-9. A spec that asserts `href` on an `<a>` is testing the reverted design. *Falsifying input:* moving `window.open` inside the `subscribe` callback turns (a) red.
- **Definition of done:**
  - [x] Existing tests for `href`/`target`/`rel` removed **and** replaced (not merely deleted) — DD-5.
  - [x] No new `.scss`; `grep -c "class=" html` unchanged ±1 (43 → 44).
  - [x] `npx ng lint --quiet` clean.
  - [x] Commit `♻️ refactor(bilateral-page-header) [P2-XXXX]: mint a handoff code before opening the Bulk Uploader` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-8` — Configuration and documentation — [~]

- **Status:** [~] repo part (a)+(b) PASS 2026-09-15 — see `execution.md`; ops part (c)+(d) owner-pending (keys in TEST, contract v0.3 to the partner); commit held
- **Type:** `docs` + `rollout`
- **Description:** (a) List `BULK_HANDOFF_CALLBACK_URL`, `BULK_HANDOFF_AUDIENCES`, `BULK_HANDOFF_ENV` in `onecgiar-pr-server/README.md` → Environment with one-line semantics (first audience is the default). (b) One change-log row in `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` (OQ-1): date, the two routes, "contract maintained externally". (c) Ops request (out of repo): set the three server keys in TEST and `bulkUploaderUrl` = `https://staging.bilateral-results-uploader.synapsis-analytics.com/entry/` in the TEST client config; confirm both point at the same host (design G-2). (d) Send contract v0.3 to the partner (design G-1) with the path change called out.
- **Implements:** R-5 (config source of the redirect), OQ-1, DD-7, G-1/G-2/G-4/G-5
- **Files (expected):** `onecgiar-pr-server/README.md`, `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** T-5 (route names final)
- **Blocks:** T-9
- **Estimate:** S
- **Skills:** `cognitive-doc-design`
- **Verification:** `grep -c "BULK_HANDOFF_" onecgiar-pr-server/README.md` = 3; `grep -n "handoff" onecgiar-pr-server/docs/bilateral-result-summaries.en.md` = 1 row. Ops items are **manual**: confirmation message from DevOps/owner that the four keys exist in TEST. *Disqualifier:* keys present in the README but not in TEST — the CTA will not render and T-9 cannot run; do not mark done on the README alone. *Falsifying input:* a fourth key referenced in code but absent from the README turns the count assertion wrong.
- **Definition of done:**
  - [x] No secret value in any doc (`.cursorrules`); only key names.
  - [ ] Partner acknowledged v0.3 path (owner; decide the `exchange` envelope question first — see `execution.md` T-5).
  - [ ] Keys set in TEST (server ×3 + client `bulkUploaderUrl`), same host (owner / DevOps).
  - [x] Commit `📝 docs(bilateral) [P2-XXXX]: handoff env keys and contract change-log row` — landed 2026-09-15 without a Jira key (owner's call); add `[P2-XXXX]` when the ticket exists.

### `BIL-HO-T-9` — HITL verification on TEST

- **Type:** `tests` (manual gate)
- **Description:** The four checks no CI harness can perform (`requirements.md` §Defect classes D3, D5, D7, D9), run on TEST after deploy and config.
- **Implements:** R-7 *race* scenario live (AC-14); R-9 phase clause (`reporting_phase` is the open TEST phase); R-12 real popup behaviour; contract v0.3 §4 ↔ fixture equality (T-4 DoD)
- **Files (expected):** none in repo; results recorded in the vault note `w3-bilateral-bulk-handoff-auth.md` and on the Jira ticket
- **Depends on:** T-5, T-7, T-8
- **Blocks:** —
- **Estimate:** S
- **Skills:** —
- **Verification (each with its disqualifier):**
  1. **Race:** mint one code as a Center User in TEST; fire two `curl -X POST …/api/bilateral/handoff/exchange` **in parallel** (`&` + `wait`) with the partner TEST key. Pass = exactly one `200` and one `400`. *Disqualifier:* sequential runs prove nothing; two `200`s is a **FATAL_FAIL** (DD-2 broken). Repeat 5 times.
  2. **Phase:** the `200` body's `reporting_phase.phase_id` equals `SELECT id FROM version WHERE status=1 AND is_active=1 AND app_module_id=1` on TEST, **and is a JSON number, not a string** (`version.id` is `bigint`; TypeORM may return it as a string — T-4 Reviewer). *Disqualifier:* comparing against a PROD id or a memorised number (phase ids differ per environment).
  3. **Popup:** in Chrome with default settings, signed in via each of the three methods (CGIAR account, password user, OTP user from an allow-listed centre domain), click the CTA on `/bilateral/<center>/home`. Pass = a new tab lands on `/entry/?code=…&env=test` with no blank tab left behind and no blocker banner, **and in that tab's console `window.opener === null`** (T-7 Reviewer: jsdom cannot certify the browser honours the severance). *Disqualifier:* testing only the federated account; a blocker banner on any path is a fail of DD-5's order assumption.
  5. **Expiry window (timezone):** mint a code on TEST, wait 121 s, redeem → must answer `400` (`expires_at` is a JS `Date` compared to MySQL `NOW()`; T-4 Reviewer). *Disqualifier:* redeeming at 60 s proves nothing.
  4. **Fixture ↔ contract:** diff `handoff-claims.v0.3.json` keys against contract v0.3 §4 by eye; every key present both ways. *Disqualifier:* comparing against v0.2.
- **Definition of done:**
  - [ ] All four recorded with date, branch, environment and outcome in the vault note; ticket comment states what shipped (not what is pending).
  - [ ] Any fail → reopen the owning task; no fix in this task.

## 4. Dependency graph

```
BIL-HO-T-1 (entity + migration) ─┐
BIL-HO-T-3 (auth_method claim) ──┼──▶ BIL-HO-T-4 (service) ──┐
BIL-HO-T-2 (session guard) ──────┼───────────────────────────┼──▶ BIL-HO-T-5 (controller) ──┬──▶ BIL-HO-T-6 (client API) ──▶ BIL-HO-T-7 (CTA) ──┐
                                 │                           │                              └──▶ BIL-HO-T-8 (docs/config) ────────────────────┼──▶ BIL-HO-T-9 (HITL)
                                 └───────────────────────────┘                                                                                  ┘
```

Parallel-friendly: **T-1, T-2, T-3** together (no shared files) · **T-6/T-7 and T-8** after T-5. T-6 can start against the contract as soon as T-5's DTOs are committed.

## 5. Scenario- and clause-level coverage

| Requirement → scenario / clause | Owning task |
|---|---|
| R-1 forged header · `BUT … NOT fall back to decoding` · `AND IT MUST behave identically` (missing/expired/malformed) | T-2 (guard); applied on the route in T-5 |
| R-2 user of another centre (403, no row) · `BUT … NOT reveal whether the centre exists` | T-4 |
| R-2 admin | T-4 |
| R-3 CSPRNG 32 bytes / base64url 43 / 120 s / SHA-256 only / plaintext only in response | T-4; storage columns T-1 |
| R-3 database dump · `AND IT MUST NOT contain e-mail or claims` | T-1 (schema) |
| R-4 double click | T-4 |
| R-5 happy path · `BUT … NOT include any claim data` | T-4 (body), T-5 (envelope), T-8 (config source) |
| R-6 no key (401) · `AND IT MUST leave the code unconsumed` | T-5 |
| R-7 replay (row unchanged) | T-4 |
| R-7 race · `AND IT MUST NOT rely on locking or read-then-write` | T-4 (mechanism assertion) + **T-9 #1 (live)** |
| R-8 probing (4 identical) · `BUT … NOT log the submitted code` | T-4 (+ T-5 HTTP body) |
| R-9 claims for an OTP user (every `AND`, incl. no `project`/`programs`) | T-4 (fixture) + **T-9 #4** |
| R-9 open Reporting phase clause | T-4 (mock) + **T-9 #2 (env)** |
| R-9 legacy session (`null`, `BUT … NOT fail`) | T-4; prerequisite T-3 |
| R-10 three paths · `AND IT MUST NOT change id/email/names/expiry` | T-3 |
| R-11 failed redemption logged without code · success audit fields | T-4; columns T-1 |
| R-12 mint fails · `BUT … NOT navigate and NOT leave a blank tab` | T-7 |
| R-12 order of operations · `AND IT MUST sever the opener link` (amended) | T-7 (proxy) + **T-9 #3 (real)** |
| R-12 hidden when `bulkUploaderUrl` empty | T-7 |
| R-12 blocked popup branch | T-7 |
| R-20 purge best-effort | T-4 |
| R-21 `iat` at redemption | T-4 |
| R-30 audience allow-list | T-4 (+ DTO in T-5) |
| NFR Accessibility (`aria-busy`, focus ring, live-region alert) | T-7 |
| NFR Observability (structured events) | T-4 |
| OQ-1 change-log row · G-1 contract send · G-4 env keys | T-8 |

No clause is discharged by citing a different requirement; every row names its own scenario.

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `BIL-HO-TEST-1` | unit (server) | R-1 | `src/api/bilateral/guards/verified-session.guard.spec.ts` |
| `BIL-HO-TEST-2` | unit (server) | R-2, R-3, R-4, R-5, R-7, R-8, R-9, R-11, R-20, R-21, R-30 | `src/api/bilateral/services/bilateral-handoff.service.spec.ts` |
| `BIL-HO-TEST-3` | unit (server) | R-1/R-6 guard wiring, R-8 HTTP body, DTO validation | `src/api/bilateral/bilateral-handoff.controller.spec.ts` |
| `BIL-HO-TEST-4` | unit (server) | R-10 | `src/auth/auth.service.spec.ts` |
| `BIL-HO-TEST-5` | unit (client) | R-12 (all scenarios) | `src/app/pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.spec.ts` |
| `BIL-HO-TEST-6` | manual (TEST) | AC-14, phase, popup, fixture↔contract | T-9 |

Scoped runs only: `npx jest --testPathPattern="bilateral|auth.service|app.module" --silent --reporters=summary --forceExit` (server) · `npx jest src/app/pages/bilateral/components/bilateral-page-header src/app/shared/services/api/auth.service --silent --no-coverage` (client). Never the whole server suite.

## 7. PR strategy

~1,050 LOC > 400 → **two PRs against `performance-refactor`**, both from the same spec branch:

| PR | Contents | Review first | Out of scope |
|---|---|---|---|
| **PR 1 — server** | T-1, T-2, T-3, T-4, T-5, T-8 (repo docs) | `verified-session.guard.ts` (R-1), then the consume `UPDATE` in the service (DD-2), then the logger spy test (R-11) | Anything under `onecgiar-pr-client/` |
| **PR 2 — client** | T-6, T-7 | The order-of-operations test, then the template diff | Server files; the env key itself (ops) |

PR 2's description links PR 1 and states it is inert until `bulkUploaderUrl` exists in the environment. T-9 runs after both are deployed to TEST.

## 8. Rollout & verification

- [ ] Ticket key in every commit; branch re-verified before each commit.
- [ ] PR 1 CI green (lint, scoped tests, build, `migration:check:ci`, Sonar); PR 2 CI green.
- [ ] Deploy server → deploy client → ops sets the four keys in TEST → T-9.
- [ ] Partner confirms `/entry/` redeems against the v0.3 path.
- [ ] Ticket → Ready For UAT only after merge to `performance-refactor` (Jira transition = "Merged into test/staging").

## 9. Roll-back plan

1. Revert PR 2 (client): the CTA returns to the plain external link (DD-5 reversibility); no data impact.
2. Revert PR 1 (server) and `npm run migration:revert` drops `bilateral_handoff_codes` (loses only in-flight 120 s codes). Sessions keep working; the `auth_method` claim simply stops being issued and nothing reads it.
3. Remove the four config keys or leave them — with the routes gone they are inert.
4. Tell the partner the exchange is unavailable.
