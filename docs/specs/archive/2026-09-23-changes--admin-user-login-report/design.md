# Design: Admin User Login Report

Companion to [`requirements.md`](./requirements.md) (approved) and [`proposal.md`](./proposal.md). Prefix `ULR`. No code snippets by rule; behavior and file targets only.

---

## 1. Summary

Add one admin-only, JWT-verified endpoint under the existing admin-panel report surface that returns the eight reference columns for every **active** user, and one download button on User Management that turns that response into an `.xlsx` through the existing `ExportTablesService.exportExcel`. No migration, no change to the `/auth/*` endpoints, no change to the on-screen table.

The biggest constraint accepted: the data must live under `/api/*` (not next to the user endpoints in `/auth/*`) because only `/api/*` gets signature-verified JWTs, and the repo's `ValidRoleGuard` does not verify signatures itself (`ULR-DD-1`).

Related docs: `docs/prd.md` (`AC-3`, `AC-9`), `docs/trd/trd.md` (auth + admin-section rows), `onecgiar-pr-server/CLAUDE.md` §3–4.

---

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| `ULR-P-1` | `ValidRoleGuard` can be applied to `AdminPanelController` once `AdminPanelModule` provides `RoleByUserRepository` | `admin-panel.module.ts` providers list; `versioning.module.ts:105,169`; `versioning.controller.ts:91-92` | Read `admin-panel.module.ts`: `RoleByUserRepository` is **not** in its providers (only in `ResultsModule`, line 195). `VersioningModule` provides it and its controller uses the same `@Roles(ADMIN, APPLICATION)` + `@UseGuards(ValidRoleGuard)` pair | `verified` | Nest fails at boot with an unresolved dependency; caught by the app/module spec and by `ULR-T-1`'s first run |
| `ULR-P-2` | "Admin" on the server (`role <= RoleEnum.ADMIN` at Application level) equals what `CheckAdminGuard` checks on the client (`application.role_id === 1`) | `onecgiar-pr-client/CLAUDE.md`/`src/CLAUDE.md` §7 (`CheckAdminGuard`), `onecgiar-pr-server/src/CLAUDE.md` §3.2 (`ADMIN = 1`, lower = more privileged) | Read both docs; matches the user's answer to `ULR-OQ-3` | `verified` | Endpoint would reject users the page lets in (or vice versa); adjust the `@Roles` argument |
| `ULR-P-3` | `RoleByUserRepository.$_isValidRole` returns the minimum Application-level role, but its `OR` branch (`role = 1` for the user with no initiative/action-area/center) does **not** check `active`, so a de-provisioned admin whose role row is inactive still passes | `auth/modules/role-by-user/RoleByUser.repository.ts:260-285` | Read the SQL text; **not** run against data | `verified` (by reading) | If the `OR` branch respects `active`, the gate is stricter than described — safe. If it is as read, parity with the versioning endpoints; tracked as follow-up, not fixed here (`ULR-DD-1`) |
| `ULR-P-4` | `ExportTablesService.exportExcel` replaces `null`/`undefined` cell values with the text `Not provided` | `export-tables.service.ts:49` | Read the line: `value ?? 'Not provided'` per cell | `verified` | A null `last_login` would be written as "Not provided", violating `ULR-R-9`; the mapper must send an empty string instead (`ULR-DD-5`) |
| `ULR-P-5` | `formatWorksheet` only styles cells (fonts, fills, borders, alignment) and does not change values | `export-tables.service.ts:471-501` | Read the method | `verified` | Empty-string cells could be altered; the workbook spec (`ULR-T-4`) would catch it |
| `ULR-P-6` | `JwtMiddleware` on `api/*path` rejects a token with an invalid signature before the controller runs | `app.module.ts` `configure()` (`forRoutes('api/*path', …)`); `onecgiar-pr-server/CLAUDE.md` §3 ("Token verify via `JwtService.verifyAsync`") | Read the route binding and the docs; **middleware source not read this session** | `assumed` | A forged token with an admin id would pass the role guard. Covered by the live forged-token request in `ULR-T-6`; also in §13 |
| `ULR-P-7` | The DB session timezone that `NOW()` (write) and `CURDATE()` (report) use is the same, so the calendar-day difference is consistent | Reference CSV values (id 1913 → `1`, id 71 → `0`) | Inferred from the reference file only; timezone never observed | `assumed` | Off-by-one near midnight. Covered by the manual DB check in `ULR-T-5`; also in §13 |
| `ULR-P-8` | The mysql driver would return the `timestamp` `last_login` as a JS `Date` that Nest serializes to a UTC ISO string | `user.entity.ts` (`type: 'timestamp'`); driver options not read | Not checked | `assumed` | No harm: the design formats `last_login` to text in SQL (`ULR-DD-3`) so it does not depend on this |

---

## 2. Architecture Overview

### 2.1 Where this lives

- **Server:** `api/results/admin-panel/` (controller, service, repository, module). Mounted at `/api/results/admin-panel/*`; `JwtMiddleware` already covers `api/*path`.
- **Client:** `pages/admin-section/pages/user-management/` (component, template, spec) and `shared/services/api/results-api.service.ts` (one new method). `ExportTablesService` is reused unchanged.
- **External integrations:** none. **Migrations:** none (`users.last_login` exists).

### 2.2 Flow

```
[Admin on /admin-module/user-management]   (CheckAdminGuard already applied)
  └── click "Download last login report (.xlsx)"
        └── GET /api/results/admin-panel/report/users/last-login
              ├── JwtMiddleware        → 401 if token missing/invalid
              ├── ValidRoleGuard       → 403 unless Application-level ADMIN
              ├── AdminPanelController → AdminPanelService
              │     └── AdminPanelRepository: one SELECT over users
              └── ResponseInterceptor envelope { response: [rows…], … }
        └── client maps rows (null → '') → ExportTablesService.exportExcel(rows, 'last_login', columns)
              └── .xlsx saved by the browser
```

---

## 3. Data Model Changes

None. No entity change, no migration (`migration:check` unaffected). Source column: `users.last_login` (`timestamp`, nullable), plus `users.id/first_name/last_name/email/is_cgiar/active`.

---

## 4. API Surface

### 4.1 New endpoint

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/admin-panel/report/users/last-login` |
| **Version** | Legacy `api` (same as the sibling `report/users`); no `v2` |
| **Auth** | JWT required (via `JwtMiddleware`); **not** added to any exclusion list |
| **Role** | Application-level `ADMIN` (`@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)` + `ValidRoleGuard`) |
| **Request** | No body, no query params (report is global, `ULR-R-8`) |
| **Response** | Standard envelope; `response` is an array of rows with exactly `id`, `first_name`, `last_name`, `email`, `is_cgiar` (1/0), `active` (always 1), `last_login` (`YYYY-MM-DD HH:mm:ss` string or `null`), `days_since_last_login` (integer or `null`) |
| **Errors** | 401 (no/invalid token, from the middleware), 403 (authenticated non-admin, from the guard), 500 via the existing error handler envelope — no stack or SQL in the body |
| **Telemetry** | One log line with the row count only; no names, emails or tokens (`ULR-R-14`) |

Swagger: `@ApiOperation` + `@ApiOkResponse` matching the sibling `report/users` style. Route order note: `report/users` and `report/users/last-login` are distinct static paths, so no shadowing.

### 4.2 Bilateral / platform-report impact

None (`AC-4` not involved).

---

## 5. Server Workflow / Business Rules

- **Controller:** new handler with the two role decorators and Swagger metadata; delegates to the service; no DTO (no input).
- **Service:** calls the repository, returns the standard `{ response, message, status }` shape, and on error returns the same handled-error result the sibling `userReport` uses. Logs the row count.
- **Repository:** a single raw query over `users` — **no joins** — with these rules, each traced to a requirement:
  - only rows where the user is active (`ULR-R-1`);
  - `last_login` returned pre-formatted as `YYYY-MM-DD HH:mm:ss` text in the database's own timezone, null preserved (`ULR-R-9`, `ULR-P-8`);
  - `days_since_last_login` computed in SQL as the calendar-day difference between the current database date and the stored `last_login` (`ULR-R-3`); the database yields null for a null `last_login`, which is the required behavior;
  - ordered: users with a `last_login` first, newest first; users without one after; ties by `id` ascending in both groups (`ULR-R-2`).
- **Transactions / concurrency / jobs:** none (read-only, no side effects).
- **Module wiring:** `AdminPanelModule` gains `RoleByUserRepository` in `providers` so the guard resolves (`ULR-P-1`).

---

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. The page is already lazy-loaded and guarded by `CheckAdminGuard` (`extraRoutingApp`).

### 6.2 Components & services

- **API method** on `ResultsApiService`, named `GET_userLastLoginReport` (`HTTP_METHOD_descriptiveName`), hitting `admin-panel/report/users/last-login` on the existing `apiBaseUrl`, typed with a small row interface placed beside the other user interfaces under `shared/interfaces/`.
- **Component (`user-management.component.ts`):**
  - a boolean signal for "download in progress";
  - a `downloadLastLoginReport` method: returns immediately if one is already running (`ULR-AC-11`); sets the flag; calls the API; on success maps rows and calls `exportTablesSE.exportExcel`; on error shows a message through the existing `api.alertsFe` and writes no file (`ULR-R-10`); clears the flag in both outcomes.
  - **Row mapping:** copy the eight fields as returned; `last_login` and `days_since_last_login` become an empty string when null (`ULR-DD-5`); `last_login` is passed through as the server's text with no `Date` conversion (`ULR-R-9`).
  - **Columns passed to the export:** headers use the reference file's own names (`id, first_name, last_name, email, is_cgiar, active, last_login, days_since_last_login`) with widths sized to content (`ULR-DD-4`).
  - **Independent of table state:** it reads nothing from `users()`, the search text, or any filter signal (`ULR-R-8`).
- **Template:** a second `app-pr-button` next to the existing "Download .xlsx" inside the existing `.export-button` container, using the button's `disabled`, `loading` and `loadingText` inputs. Add a Tailwind `gap` utility to that container so the two buttons do not touch (Tailwind-first rule; no new SCSS).
- **State boundary:** component-local signal; no shared service state.

### 6.3 Design system usage

Reuses `app-pr-button` (its `loading`/`disabled` inputs already provide the disabled state and a loading indicator, `ULR-R-10`). No new tokens, no PrimeNG, no native controls. Focus ring and accessible name come from `app-pr-button`; the label text is the accessible name. Label copy is plain English like the neighboring button (no P22/P25 variant).

### 6.4 Real-time / notification UX

None.

---

## 7. Security & Authorization

- Verified token: `JwtMiddleware` on `api/*path` (`ULR-P-6`, verified live in `ULR-T-6`).
- Role: `ValidRoleGuard` + `@Roles(ADMIN, APPLICATION)`, safe **only** because it sits behind the middleware; that dependency is the reason for the `/api/*` placement (`ULR-DD-1`).
- Whitelisted columns only; no password/audit fields (`ULR-R-5`); no PII in logs (`ULR-R-14`, `AC-9`); no new secrets.
- `last_login` is not added to any `/auth/*` route (`ULR-R-6`). The pre-existing exposures found (see `requirements.md` §11) are **not** touched here.
- Known residual: `ULR-P-3` (a de-provisioned admin whose role row is inactive may still satisfy the guard). Same behavior as the existing versioning admin endpoints; reported, not fixed.

---

## 8. Performance & Capacity

One query over `users` (1,579 rows today, planning ceiling 5,000), no joins, no pagination, no N+1 (`ULR-R-12`). Payload ≈ 150 bytes/row → well under 1 MB. No index needed for this size; a full scan and in-memory sort is acceptable. `exceljs` is already lazy-imported by the export service, so no bundle change. Target: p95 < 2 s (`requirements.md` §7), to be observed on the test environment, not asserted by Jest.

---

## 9. Observability

One `Logger` line per successful request with the row count only. Failures are logged by the existing `HttpExceptionFilter`/handler path. Moves no `docs/prd.md` metric.

---

## 10. Testing Plan (forward-looking)

| Layer | What | Notes |
|---|---|---|
| Server unit (repository) | Query text: filters `active`, formats `last_login`, computes days, no joins, order clause | Asserts the SQL string only — cannot prove row results (defect D1/D2 gap, covered by the DB check in `ULR-T-5`) |
| Server unit (service) | Wraps rows in the standard shape; error path returns the handled error; logs a count, not row data | |
| Server unit (controller/guard wiring) | The handler carries `ValidRoleGuard` and the `ADMIN`/`APPLICATION` role metadata; the guard denies a mocked non-admin | Presence assertion: proves wiring, **cannot** prove a forged token is rejected (needs `ULR-T-6`) |
| Client unit | API method URL; mapper turns null into `''` and keeps the server text; download method: success calls the export once, error shows a message and exports nothing, second click while running does nothing, filters/`users()` untouched | Run scoped with `--testPathPattern` |
| Client workbook | The rows handed to the export produce empty cells (not `Not provided`) for null | Uses the real mapping output; `exceljs` cell inspection if practical, else asserted at the `exportExcel` argument |
| Manual (DB) | Run the same SQL on the test DB; compare to the reference CSV (`ULR-AC-1..4`) | **Handed to the user** (agents do not connect to the DB) |
| Manual (live server) | Unauthenticated, non-admin, and forged-token requests (`ULR-AC-5..7`) | Needs a running server and tokens; **handed to the user** |
| Manual (browser) | Two buttons side by side, focus ring, loading state at the 12px base font (defect D6) | jsdom cannot measure layout |

Coverage stays above the floors (server 5/20/35/40, client 50/60/60/60); new code is fully unit-tested.

---

## 11. Backwards Compatibility & Migration Plan

Additive only: one route, one client method, one button. No DB migration, no flag, no backfill, no downstream consumer. Rollback = revert the PR (nothing to undo in the database).

---

## 12. Design Decisions

### `ULR-DD-1` — New admin-gated endpoint under `/api/*`, not an extension of `/auth/search`

- **Context:** `/auth/*` carries no `JwtMiddleware` and `UserController` has no guards; `ValidRoleGuard` decodes the JWT without verifying its signature (`valid-role.guard.ts:34-39`). Extending `/auth/search` would put login activity behind no authentication; gating a `/auth` route with `ValidRoleGuard` would accept a forged token.
- **Decision:** new route in `api/results/admin-panel/`, behind `JwtMiddleware` + `ValidRoleGuard`.
- **Alternatives considered:** (a) add `last_login` to `/auth/search` — rejected, exposes data anonymously; (b) new route under `/auth/*` with `ValidRoleGuard` — rejected, forgeable; (c) fix the guard to verify signatures — rejected here, shared infrastructure with wider blast radius and its own spec; (d) new module/controller — rejected, the admin-panel already hosts `report/users` and the same client surface.
- **Consequences:** the feature is safe with no change to shared auth code. The report lives in a "results" folder though it is about users (naming debt, accepted). Overturns the proposal's recommended Option A.

### `ULR-DD-2` — Server computes `days_since_last_login`

- **Context:** the reference values are calendar-day differences (id 1913: hours elapsed, value `1`).
- **Decision:** compute in SQL against the database's current date.
- **Alternatives:** client-side from the timestamp — rejected (browser timezone would shift the day boundary; 24-hour floor would give `0` for id 1913); server-side in Node — rejected (JS timezone vs DB timezone mismatch).
- **Consequences:** correctness depends on `ULR-P-7` (same DB timezone for write and read), checked manually.

### `ULR-DD-3` — Return `last_login` as formatted text from SQL

- **Context:** a JS `Date` crossing JSON becomes a UTC ISO string and the browser would re-render it in local time (`ULR-P-8`).
- **Decision:** format to `YYYY-MM-DD HH:mm:ss` in the query; the client passes it through untouched.
- **Alternatives:** ISO string + client formatting — rejected (timezone drift vs the reference); epoch number — rejected (needs conversion, no benefit).
- **Consequences:** the value is in the database's timezone, exactly like the reference CSV.

### `ULR-DD-4` — Keep the reference file's column names as the export headers

- **Context:** existing admin exports use Title Case headers ("First name"), the reference uses snake_case.
- **Decision:** snake_case, identical to the reference.
- **Alternatives:** Title Case for visual consistency — rejected: anyone with a sheet, pivot or script built on the manual CSV keeps working unchanged.
- **Consequences:** slightly different look from the neighboring "user_report" export; trivial to change later.

### `ULR-DD-5` — Mapper sends an empty string for null instead of relying on the export service

- **Context:** `exportExcel` turns null/undefined into `Not provided` (`ULR-P-4`), which would misrepresent "never logged in" and break numeric sorting of the days column.
- **Decision:** the component maps null to `''` before calling the shared service; the shared service is not modified.
- **Alternatives:** change `exportExcel` to accept a "null as blank" option — rejected: shared service used by many exports, wider blast radius for one column; write `Never` text — rejected: differs from the reference and pollutes a numeric column.
- **Consequences:** an empty-string cell may lack the thin border that `formatWorksheet` applies to non-empty cells (cosmetic, noted in §13).

### `ULR-DD-6` — Single button, no filters, no on-screen columns

- **Context:** user answers `ULR-OQ-1/2`; reference is a global dump.
- **Decision:** one download button; report ignores table state.
- **Alternatives:** honor current filters — rejected (reference is global; a filtered report silently misses users); add table columns — deferred by the user.
- **Consequences:** no risk to the existing table layout or existing specs beyond the toolbar.

**Reversion challenge (Step 2.3):** none of these decisions removes, disables or inverts already-shipped behavior; nothing to challenge.

---

## 13. Open Gaps & Follow-ups

- **Assumed premises to check:** `ULR-P-6` (middleware rejects a forged signature) → live request `ULR-T-6`; `ULR-P-7` (DB timezone consistency) → manual SQL check `ULR-T-5`; `ULR-P-8` needs no action.
- **Cosmetic:** empty-string cells may render without the thin border (`ULR-DD-5`).
- **Follow-ups for the team (not this spec):** (1) `/auth/*` user endpoints without guard/JWT (needs a live confirmation); (2) `GET /api/results/admin-panel/report/users` without a role check; (3) `ValidRoleGuard` not verifying signatures and `$_isValidRole` ignoring `active` in its `OR` branch (`ULR-P-3`).
- **Accepted risk if skipped:** the browser layout check (D6) and the timezone check (D2) have no automated substitute.

### Budget (tripwire for `/akili-execute`)

| Measure | Estimate |
|---|---|
| Expected tasks | 6 (server 2, client 2, verification handoffs 2) |
| Expected LOC | ~330 total: ~110 production (server ~60, client ~50) + ~220 tests |
| Expected review rounds | 1–2 |

Depth check: matches **Standard** (two packages, a security-relevant endpoint, several distinct test layers); not small enough for `/akili-quick`, not risky enough for Full (no migration, no shared-infra change). Exceeding the LOC estimate by >50% or a third review round means stop and escalate.

---

## Required cross-references

- [`requirements.md`](./requirements.md), [`proposal.md`](./proposal.md), `tasks.md` (to follow)
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`
- `onecgiar-pr-server/CLAUDE.md`, `onecgiar-pr-server/src/CLAUDE.md`, `onecgiar-pr-client/CLAUDE.md`
