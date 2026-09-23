# Requirements: Admin User Login Report

## 1. Module / Feature

- **Module:** admin (server: `api/results/admin-panel/`; client: `pages/admin-section/pages/user-management/`)
- **Sub-feature:** User login activity report (last login + days since last login), downloadable from User Management
- **Owner:** Platform admin tooling (requested by the team; drafted by Santiago Sanchez)
- **Status:** approved (Phase 1 gate passed; user answered `ULR-OQ-1..4`, see §10)
- **Depth:** Standard
- **Type / Approval Mode:** Change / gated (inherited from `proposal.md`)
- **Ticket(s):** none yet
- **Proposal:** [`proposal.md`](./proposal.md) — this spec **deviates from it on the approach** (see §11 and `ULR-DD` in design). Reason: security discovery below.

---

## 2. Context

Admins today obtain "who has not logged in lately" by running SQL by hand and exporting a CSV (reference: `last_login_20260923_SS.csv`, 1,579 rows, columns `id, first_name, last_name, email, is_cgiar, active, last_login, days_since_last_login`). The data exists (`users.last_login`, written on every authenticated request by `JwtMiddleware` and on login flows by `AuthService`) but no endpoint returns it.

Facts observed in the reference file that drive the requirements (read from the file, not assumed):

- It contains **inactive users** (`active = 0`, e.g. ids 835, 294, 607) — **the requester decided the app report excludes them** (`ULR-OQ-4`), so this is the one deliberate difference from the reference — and **CGIAR and external** accounts (`is_cgiar` 0 and 1), which are kept.
- It contains **users who never logged in**: `last_login` and `days_since_last_login` are both empty (e.g. ids 1936–1963, ~the last rows of the file).
- Order is `last_login` newest first; users with equal timestamps (ids 1896, 1897, 1899, 1900, 1901 at `2026-08-14 23:16:21`) appear by `id` ascending; never-logged-in users come last, also by `id` ascending.
- `days_since_last_login` is a **calendar-day difference**, not elapsed 24-hour periods: id 1913 (`2026-09-22 22:28:43`, report run on 2026-09-23) shows `1` although only hours elapsed; id 71 (`2026-09-23 02:44:43`) shows `0`.

**Security discovery that shapes the scope (verified by reading code, not by a live request):**

- `UserController` (`auth/modules/user/user.controller.ts:47`) carries no `@UseGuards`, and `/auth/*` is not bound to `JwtMiddleware` (`app.module.ts` `configure()`; `src/CLAUDE.md` §3.1: "every route under `/auth/*` … is public by construction and MUST gate itself"). The endpoints the User Management table uses (`GET /auth/search`, `GET /auth/get/users_list`) therefore return names, emails and roles without a verified token.
- `ValidRoleGuard` (`shared/guards/valid-role.guard.ts:34-39`) **base64-decodes the JWT payload without verifying the signature**. It is only safe behind `JwtMiddleware`, i.e. on `/api/*` routes. Placing an admin-only route under `/auth/*` and gating it with `ValidRoleGuard` would accept a forged token.
- Consequence: the proposal's Option A (add `last_login` to `/auth/search`) would publish every user's login activity to unauthenticated callers. This spec instead requires a **new endpoint under `/api/*`** (JWT-verified) with a server-side admin role check.

References: `docs/prd.md` — persona *Platform admin*, `US-A1` (manage roles and AD users; this is an admin oversight capability adjacent to it, not a listed story), `AC-3` (Authorization), `AC-9` (no secrets/PII leakage in logs). `docs/ux-ui/design.md` — admin-section table/export patterns. `docs/trd/trd.md` §modules — `auth/modules/user`, `admin-section` → `auth/modules/user`.

---

## 3. In Scope / Out of Scope

### In scope

- New admin-only, JWT-verified endpoint returning the eight reference columns for **all** users.
- A download control on the User Management page that produces an `.xlsx` with those columns, using the existing `ExportTablesService.exportExcel` pattern.
- Loading and error states for that control.
- Tests for the query shape, the authorization behavior, and the export mapping.

### Out of scope

- Changing `GET /auth/search`, `GET /auth/get/users_list`, or any `/auth/*` route (no `last_login` is added to them).
- Adding "Last login" columns to the on-screen User Management table (deferred, `ULR-R-20`).
- A literal `text/csv` export (the codebase's export mechanism is `.xlsx`; see `ULR-OQ-1`).
- Changing how or when `users.last_login` is written.
- Retrofitting guards onto the existing `/auth/*` user endpoints — a **pre-existing exposure recorded as a follow-up** (§11), not fixed here.
- Filters on the report (it is global, like the reference file).

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Platform admin | Can download the login-activity report from User Management instead of requesting a manual DB export. |
| Any non-admin user / anonymous caller | Nothing visible; MUST NOT be able to reach the new data (`ULR-R-4`). |

---

## 5. User Stories

- **`ULR-US-1`** — As a platform admin, I want to download every active user's last login and days since last login, so that I can identify dormant accounts without asking for a database export. *(Adjacent to `US-A1`.)*

---

## 6. Functional Requirements

### Required (MUST)

- **`ULR-R-1`** The system MUST provide an endpoint that returns, for **every active user** (`users.active = 1`), exactly these fields: `id`, `first_name`, `last_name`, `email`, `is_cgiar`, `active`, `last_login`, `days_since_last_login` — including external (non-CGIAR) users and users who never logged in. Inactive users (`active = 0`) MUST NOT appear. (`active` is kept as a column for parity with the reference file; it is always `1` here.)
- **`ULR-R-2`** The endpoint MUST order rows by `last_login` descending, placing users with no `last_login` after all others, breaking ties (equal `last_login`, and within the never-logged-in group) by `id` ascending.
- **`ULR-R-3`** `days_since_last_login` MUST be the whole number of calendar days between the database's current date and the date part of `last_login`, computed on the server; it MUST be `null` (not `0`, not an empty string) when `last_login` is null.
- **`ULR-R-4`** The endpoint MUST be mounted under `/api/*` so `JwtMiddleware` verifies the token signature, AND MUST enforce Application-level `ADMIN` role server-side. A request with no/invalid token MUST be rejected 401; an authenticated non-admin MUST be rejected 403 and MUST receive no user data.
- **`ULR-R-5`** The response MUST NOT include any field other than the eight in `ULR-R-1` (in particular no password hash, no created/updated audit columns, no tokens).
- **`ULR-R-6`** `last_login` MUST NOT be added to `GET /auth/search`, `GET /auth/get/users_list`, or any route reachable without a verified token.
- **`ULR-R-7`** The User Management page MUST offer admins a control that downloads an `.xlsx` containing the eight columns of `ULR-R-1`, in the order returned by the endpoint. The page is already behind `CheckAdminGuard`; the server check in `ULR-R-4` remains the enforcement point.
- **`ULR-R-8`** The report MUST be global: the currently applied table filters/search on the page MUST NOT change its content.
- **`ULR-R-9`** In the `.xlsx`, `last_login` MUST be written as text `YYYY-MM-DD HH:mm:ss` exactly as the server returned it (no browser-timezone conversion), and a null `last_login` / `days_since_last_login` MUST be an empty cell (not `Not applicable`, not `Invalid Date`, not `0`).
- **`ULR-R-10`** While the request is in flight the control MUST be disabled and show a loading indicator. On failure the page MUST show an error message and MUST NOT download a file (no empty or partial file).
- **`ULR-R-11`** Existing behavior MUST be unchanged: the User Management table, its filters, and its existing "user_report" export keep their current columns and output.

### Should (SHOULD)

- **`ULR-R-12`** The endpoint SHOULD read the data with a single query (no per-user follow-up queries).
- **`ULR-R-13`** The downloaded file SHOULD use base name `last_login`; the suffix is whatever `ExportTablesService.exportExcel` appends today (an epoch-derived number, same as the existing `user_report` export). The shared service is not modified.
- **`ULR-R-14`** The server SHOULD log only the fact and row count of a report request (no emails, names or tokens).

### Could / Nice-to-have (MAY)

- **`ULR-R-20`** The page MAY later show "Last login" and "Days since last login" columns in the on-screen table (would need the same admin-gated source; deferred).
- **`ULR-R-21`** The control MAY additionally offer a literal `.csv` download if the requester needs it (`ULR-OQ-1`).

---

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Performance** | With the current 1,579 users and up to 5,000, the endpoint MUST respond in under 2 s at p95 (single indexed-scan query, no pagination, no joins). The client MUST not freeze the page while building the workbook (`exceljs` is already lazy-loaded). |
| **Security** | JWT-verified via `JwtMiddleware` + server-side `ADMIN` role check (`AC-3`); no reliance on the frontend guard; endpoint not added to any public/excluded path list. |
| **Privacy** | Response limited to the eight whitelisted fields; no PII in logs or error bodies (`AC-9`). |
| **Backwards compatibility** | Purely additive: one new route, one new client method, one new button. No existing payload changes (`AC-4` unaffected — not a bilateral/platform-report surface). |
| **Accessibility** | The new control MUST be keyboard reachable with a visible focus ring and an accessible name; disabled state exposed via the `disabled` attribute (`docs/ux-ui/design.md` §10). |
| **Internationalization** | Existing User Management labels are plain English; the new label follows the surrounding convention (no P22/P25 wording difference applies). |
| **Observability** | Count-only log line per request; failures surface through the standard `HttpExceptionFilter` envelope. |

---

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `ULR-AC-1` | A `users` table with active, inactive, CGIAR, external, and never-logged-in users | An admin calls the endpoint | Every **active** user appears exactly once with the eight fields; no `active = 0` user appears; row count equals `SELECT COUNT(*) FROM users WHERE active = 1`. |
| `ULR-AC-2` | Users with `last_login` `2026-09-23 02:44:43` and `2026-09-22 22:28:43` and the DB date `2026-09-23` | The endpoint runs | They return `days_since_last_login` `0` and `1` respectively (calendar-day difference, as in the reference file). |
| `ULR-AC-3` | A user with `last_login = NULL` | The endpoint runs | `last_login` and `days_since_last_login` are `null`, and the row sorts after every user that has a `last_login`. |
| `ULR-AC-4` | Users 1896, 1897, 1899 share `last_login` `2026-08-14 23:16:21` | The endpoint runs | They appear in `id` ascending order. |
| `ULR-AC-5` | No `auth` header | The endpoint is called | Response is 401 and contains no user data. |
| `ULR-AC-6` | A valid token of a user without Application-level `ADMIN` | The endpoint is called | Response is 403 and contains no user data. |
| `ULR-AC-7` | A token whose payload names an admin id but whose signature is invalid | The endpoint is called | Response is 401 (the middleware, not the role guard, rejects it). |
| `ULR-AC-8` | An admin on User Management with a filter applied (e.g. Is CGIAR = No) | They click the download control | The `.xlsx` still contains every active user regardless of the filter, with the eight columns and `last_login` as `YYYY-MM-DD HH:mm:ss` text. |
| `ULR-AC-9` | A row with null `last_login` | The workbook is built | Its `last_login` and `days_since_last_login` cells are empty. |
| `ULR-AC-10` | The request fails (5xx / network) | The admin clicks the control | An error message shows, no file downloads, and the control is enabled again. |
| `ULR-AC-11` | The request is in flight | The admin looks at / tabs to the control | It is disabled and shows a loading indicator; a second click does not send a second request. |
| `ULR-AC-12` | Any request to `GET /auth/search` or `GET /auth/get/users_list` after this change | The response is inspected | Neither contains `last_login` or `days_since_last_login`; the User Management table and existing export behave as before. |

Cross-cutting project ACs that apply (referenced, not restated): `AC-3` Authorization, `AC-9` Security and secrets.

### Defect classes this spec can produce, and what catches each

| # | Defect class | Caught by | Coverage |
|---|---|---|---|
| D1 | Wrong SQL: missing users (inner join, filter on `active`), wrong order, null handling | Repository spec asserting the built SQL text + **manual run of the same SQL on the test DB, compared row-by-row to the reference CSV** (row count = reference rows minus its `active = 0` rows; ids 71/1913/1936 present with the reference values; ids 835/294/607 absent; tie order 1896–1901) | Jest sees the SQL string only; row correctness is a **DB-connected manual check handed to the user** (the agent does not connect to the DB) |
| D2 | `days_since_last_login` off by one around midnight / DB timezone | Manual SQL check on rows with late-evening `last_login` (id 1913 → `1`) | **No automated check** can see the DB session timezone; substitute = the manual check above; accepted risk if skipped |
| D3 | Authorization hole (anonymous or non-admin reads the data; forged token accepted) | Controller/guard spec (401/403 paths) + **live unauthenticated / forged-token request against a running server** | Jest with mocked guard proves wiring only; the forged-token case (`ULR-AC-7`) needs a real request — listed as a verification task, not assumed |
| D4 | Null `last_login` rendered as `Invalid Date` / `0` / `Not applicable` in the workbook, or timezone-shifted by the browser | Client Jest spec on the export mapper with null and non-null rows | Covered; the actual `.xlsx` cell type is checked by unzipping/reading the generated workbook in the spec or manually |
| D5 | Regression in the existing table/export (columns, filters) | Existing `user-management.component.spec.ts` + `user.service.spec.ts` (`searchUsers`) rerun scoped to touched files | Covered |
| D6 | Layout: new toolbar control overflowing/wrapping at the 12px base font, focus ring missing | **Browser check by the user/QA at the HITL pause** (jsdom cannot measure layout) | Explicit gap: not automatable here; recorded as accepted risk if not done |

---

## 9. Dependencies & Assumptions

### Upstream dependencies

- `users` table and `last_login` column (`auth/modules/user/entities/user.entity.ts`); no migration needed (column exists).
- `JwtMiddleware` on `/api/*`; `ValidRoleGuard` + `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)` (`shared/guards`, `shared/decorators`).
- Client: `ExportTablesService.exportExcel`, `ResultsApiService`, `CheckAdminGuard`.

### Downstream consumers

- None (a leaf report). The reference CSV consumers (admins) move from manual SQL to the page.

### Assumptions

- **`ULR-P-1` (unverified):** `ValidRoleGuard` can be used in `AdminPanelController` (i.e. `RoleByUserRepository` is resolvable in the results/admin-panel module) — verify in design before tasks.
- **`ULR-P-2` (unverified):** the DB session timezone used by `NOW()` (when `last_login` is written) and `CURDATE()` (when the report runs) are the same, so the day difference is consistent; the reference file suggests so but the timezone was not observed.
- The 1,579-row reference is representative of production scale; 5,000 rows is the planning ceiling.

---

## 10. Open Questions

All four resolved by the user at the Phase 1 gate:

- **`ULR-OQ-1` — resolved: `.xlsx`.** No literal CSV; `ULR-R-21` stays a MAY that is not planned.
- **`ULR-OQ-2` — resolved: no new columns in the on-screen table.** v1 is download-only; `ULR-R-20` stays deferred.
- **`ULR-OQ-3` — resolved: "admin" = the same role `CheckAdminGuard` checks** (Application-level role id 1). The server enforces the equivalent (`@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)`).
- **`ULR-OQ-4` — resolved: inactive users are NOT included** (`users.active = 0` excluded). Never-logged-in **active** users are still included (the answer did not exclude them; they are the main target of a "who never logged in" report). If that reading is wrong, it is a one-clause change to `ULR-R-1`.

---

## 11. Out-of-Band Notes

- **Deviation from the proposal.** `proposal.md` recommended Option A (extend `/auth/search`). Reading the auth wiring showed that would expose login activity to unauthenticated callers, so this spec adopts a new admin-gated `/api/*` endpoint (the proposal's Option B/C family, placed under the existing admin-panel report surface). The proposal's other conclusions (reuse `ExportTablesService`, no migration, follow the `.xlsx` convention) stand.
- **Pre-existing exposure, not fixed here (follow-up for the team, needs a live check to confirm).** By code reading, `GET /auth/search`, `GET /auth/get/users_list`, `GET /auth/get/all`, `PATCH /auth/change/status` and `PATCH /auth/update/roles` have no guard and no `JwtMiddleware`. This was **not** confirmed with a live request. Recommend raising it separately; it is a security decision outside this feature.
- **Adjacent pre-existing gap.** `GET /api/results/admin-panel/report/users` sits behind `JwtMiddleware` but has no role check, so any logged-in user can call it. Out of scope; noted for the same follow-up.

---

## Required cross-references

- `docs/prd.md` — persona *Platform admin*, `US-A1`, `AC-3`, `AC-9`
- `docs/ux-ui/design.md` — admin-section table/export patterns, §10 accessibility
- `docs/trd/trd.md` — auth (`auth/modules/user`) and admin-section module rows
- `onecgiar-pr-server/CLAUDE.md` §3–4 (JWT enforcement, `ValidRoleGuard`) and `onecgiar-pr-server/src/CLAUDE.md` §3.1
- Companion docs in this folder: [`proposal.md`](./proposal.md), `design.md`, `tasks.md` (to follow)
