# Tasks: Admin User Login Report

Linked spec: [`requirements.md`](./requirements.md) + [`design.md`](./design.md) (both approved) · [`proposal.md`](./proposal.md). Prefix `ULR`. Status: `done`. Depth: Standard. Approval Mode: gated.

Rules for every task: no `git commit` without the user's explicit go-ahead; when committed, format `<emoji> <type>(<scope>) [ticket]: <description>` with **no apostrophes, `$` or quotes in the subject** (Jenkins breaks on them). Never run an unscoped test suite; always `--testPathPattern`. Never print tokens or the `auth` header. DB-connected steps are handed to the user.

---

## 1. Pre-flight

- [x] `requirements.md` approved (user answered `ULR-OQ-1..4`).
- [ ] `design.md` approved (this is the Phase 3 gate's companion; approved by continuing).
- [x] No conflicting spec on the same files (`docs/specs/` searched by path: only `bugfix/bilateral-project-catalog-sync/`, untracked, unrelated).
- [x] No migration (`migration:check` unaffected).

---

## 2. Task list

### `ULR-T-1` — Server: repository query + service + unit specs [x]

- **Type:** server
- **Description:** Add the repository method that reads the eight columns for active users (formatted `last_login` text, SQL-computed `days_since_last_login`, required ordering, no joins) and the service method that wraps it in the standard response shape, logs only the row count, and returns the handled error on failure.
- **Implements:** `ULR-R-1` (active only, eight fields, external + never-logged-in kept), `ULR-R-2`, `ULR-R-3`, `ULR-R-5`, `ULR-R-9` (server-side text format), `ULR-R-12`, `ULR-R-14`; `ULR-AC-1`, `ULR-AC-2`, `ULR-AC-3`, `ULR-AC-4` (SQL shape only; row values in `ULR-T-5`)
- **Files (expected):** `onecgiar-pr-server/src/api/results/admin-panel/admin-panel.repository.ts`, `admin-panel.service.ts`, new `admin-panel.user-last-login.spec.ts`
- **Depends on:** —
- **Blocks:** `ULR-T-2`, `ULR-T-5`
- **Estimate:** M
- **Review:** full (SQL correctness is the core of the feature)
- **Verification:**
  - **Falsifier:** the spec captures the SQL text passed to the query call and fails if it: lacks an active-users filter; contains a `JOIN`; selects any column outside the eight (e.g. `password`, `created_date`); lacks the calendar-day difference expression or the date formatting; or lacks the ordering "has-last-login first, newest first, `id` ascending". Service: fails if a logged message contains a row value (email/name) or if a repository error is not turned into the handled error result.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern=admin-panel.user-last-login` — fails before the change (methods do not exist), passes after.
  - **Disqualifier:** a passing spec is **not** evidence the rows are right — it only sees the SQL string. If the SQL cannot express the calendar-day difference or null-last ordering in the database's dialect, stop and re-specify rather than moving the logic into Node (`ULR-DD-2`). Row correctness is proven only by `ULR-T-5`.
  - **What this presence-check cannot prove:** that the query returns the right users/values (D1) or the right day count near midnight (D2) — `ULR-T-5` proves them.
  - **Consumers:** none (`AdminPanelRepository` / `AdminPanelService` gain new methods; no shared symbol changed).
- **Definition of done:**
  - [ ] Spec green, scoped; `npx eslint` on touched server files clean (`--quiet`).
  - [ ] Only the eight fields returned; no new dependency.
  - [ ] No secret/PII in logs.

### `ULR-T-2` — Server: controller route, guard wiring, module provider [x]

- **Type:** server
- **Description:** Add the `GET report/users/last-login` handler to `AdminPanelController` with Swagger metadata and the admin role gate (`@Roles(ADMIN, APPLICATION)` + `ValidRoleGuard`), and add `RoleByUserRepository` to `AdminPanelModule` providers so the guard resolves.
- **Implements:** `ULR-R-4` (wiring half), `ULR-R-6` (nothing added to `/auth/*`), `ULR-R-11` (server side), `ULR-AC-5`/`ULR-AC-6` (wiring half; live proof in `ULR-T-6`), `ULR-AC-12`
- **Files (expected):** `admin-panel.controller.ts`, `admin-panel.module.ts`, the spec from `ULR-T-1` (extend)
- **Depends on:** `ULR-T-1`
- **Blocks:** `ULR-T-6`
- **Estimate:** S
- **Review:** full (auth-gated route, module DI)
- **Verification:**
  - **Falsifier:** the spec fails if the new handler does **not** carry `ValidRoleGuard` metadata or the role metadata is not `ADMIN`/`APPLICATION`; if the guard, given a mocked repository returning no role or a non-admin role, allows the request; or if the Nest testing module cannot resolve the controller (missing `RoleByUserRepository`). `ULR-AC-12`: `grep -rn "last_login\|days_since_last_login" onecgiar-pr-server/src/auth/modules/user/user.service.ts user.controller.ts` must return **no** match for the new field names (a hit fails the task), and `user.service.spec.ts` still passes.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --reporters=summary --forceExit --testPathPattern="admin-panel.user-last-login|user.service.spec"` — new assertions fail before, all pass after.
  - **Disqualifier:** metadata assertions are a presence-check. They do **not** prove a forged token is rejected (that is the middleware, `ULR-P-6`) or that the real guard denies a real non-admin — if the metadata test is the only evidence offered for `ULR-AC-5..7`, the task is **not** done; `ULR-T-6` is required. If `RoleByUserRepository` cannot be provided without a circular-import error, stop and re-specify the module wiring instead of exporting from `ResultsModule`.
  - **Consumers:** none (`AdminPanelModule` provider list gains one entry; no shared symbol changed).
- **Definition of done:**
  - [ ] Scoped specs green; lint clean.
  - [ ] Swagger `@ApiOperation` + `@ApiOkResponse` present.
  - [ ] App boots (module spec / `app.module.spec` scoped run) with the new provider.

### `ULR-T-3` — Client: API method + row interface  [x]

- **Type:** client
- **Description:** Add `GET_userLastLoginReport()` to `ResultsApiService` (base `apiBaseUrl`, path `admin-panel/report/users/last-login`) and a typed row interface beside the other user interfaces.
- **Implements:** `ULR-R-7` (data source), `ULR-R-8` (no filter params sent)
- **Files (expected):** `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts`, its spec, `onecgiar-pr-client/src/app/shared/interfaces/user.interface.ts`
- **Depends on:** — (contract fixed in `design.md` §4.1)
- **Blocks:** `ULR-T-4`
- **Estimate:** S
- **Review:** checklist
- **Verification:**
  - **Falsifier:** the spec fails if the request URL is anything other than `<apiBaseUrl>admin-panel/report/users/last-login`, if the method is not GET, or if the request carries query params or a body.
  - **Red run:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="results-api.service.spec"` — new case fails before, passes after.
  - **Disqualifier:** if the response envelope in the running server differs from `{ response: [...] }` (checked in `ULR-T-6`), the interface and mapper must be re-specified, not patched with `any`.
  - **Consumers:** none (new method; `GET_reportUsers` untouched).
- **Definition of done:**
  - [ ] Scoped spec green; `npx ng lint --quiet` clean for touched files.
  - [ ] Method named `HTTP_METHOD_descriptiveName`; no `any` in the new types.

### `ULR-T-4` — Client: download method, mapper, button, spec [x]

- **Type:** client
- **Description:** In `UserManagementComponent`, add the in-progress signal and `downloadLastLoginReport`: single-flight, calls the API, maps rows (null → empty string, `last_login` text passed through untouched), calls `exportTablesSE.exportExcel(rows, 'last_login', columns)` with the reference header names, shows an error alert and exports nothing on failure. Add the second `app-pr-button` in the existing `.export-button` container with `loading`/`disabled`, plus a Tailwind `gap` utility on that container.
- **Implements:** `ULR-R-7`, `ULR-R-8`, `ULR-R-9`, `ULR-R-10`, `ULR-R-11` (client side), `ULR-R-13`; `ULR-AC-8`, `ULR-AC-9`, `ULR-AC-10`, `ULR-AC-11`, `ULR-AC-12` (client half); accessibility NFR (button, accessible name)
- **Files (expected):** `user-management.component.ts`, `user-management.component.html`, `user-management.component.spec.ts`
- **Depends on:** `ULR-T-3`
- **Blocks:** `ULR-T-6`
- **Estimate:** M
- **Review:** checklist
- **Verification:**
  - **Falsifier:** the spec fails if: a row with null `last_login`/`days_since_last_login` reaches `exportExcel` as `null`/`undefined`/`'Not provided'`/`0` instead of `''`; `last_login` reaches it as anything but the server's exact string; a second click while a request is pending triggers a second API call; an API error still calls `exportExcel`, or leaves the in-progress flag set, or shows no alert; the call depends on `users()`, `searchQuery`, `selectedStatus`, `selectedCgiar` or the entity/role filter signals (set them to non-default values and assert the same rows/columns are exported); the file base name is not `last_login`; the export column keys/headers differ from `id, first_name, last_name, email, is_cgiar, active, last_login, days_since_last_login`. Existing `exportExcel`, `getUsers` and filter specs in the same file still pass unchanged.
  - **Red run:** `cd onecgiar-pr-client && npm run test -- --testPathPattern="user-management.component.spec"` — new cases fail before, all pass after.
  - **Disqualifier:** the `exportExcel` argument is a presence-check of what the mapper hands to the shared service; it does **not** prove the written `.xlsx` cell is empty (the service applies its own `??` and styling, `ULR-P-4/5`). If a real workbook read-back (build the workbook from the mapped rows and inspect the cell values) is feasible in the spec, do it; otherwise record the gap and rely on the manual open of the downloaded file in `ULR-T-6`. Layout/focus ring are not measurable in jsdom (D6) — not evidence.
  - **Consumers:** none (component-local additions; `ExportTablesService` and `app-pr-button` unchanged).
- **Definition of done:**
  - [ ] Scoped spec green (whole file, since existing cases share the mock setup); lint clean.
  - [ ] Only the new button/handler added; existing table, filters and `user_report` export unchanged.
  - [ ] No hard-coded hex or new SCSS class; Tailwind utility only for the gap.

### `ULR-T-5` — Verify SQL against real data (handed to the user) [x]

- **Type:** rollout (manual, DB-connected — **the agent does not run this**)
- **Description:** The user runs the exact query from `ULR-T-1` on the test database and compares it with the reference CSV.
- **Implements:** `ULR-AC-1`, `ULR-AC-2`, `ULR-AC-3`, `ULR-AC-4`; defect classes D1, D2; premise `ULR-P-7`
- **Files (expected):** none (evidence noted in `execution.md` later)
- **Depends on:** `ULR-T-1`
- **Blocks:** — (gates "done", not the client work)
- **Estimate:** S
- **Review:** skip-eligible (no code)
- **Verification:**
  - **Falsifier:** any of: row count ≠ (reference rows with `active = 1`); ids 835, 294, 607 present; id 1913 (`last_login` on the previous calendar day) not `1`; id 71 (same-day) not `0`; id 1936 (never logged in) not sorted last with both fields null; ids 1896, 1897, 1899, 1900, 1901 not in `id` ascending order; `last_login` text not `YYYY-MM-DD HH:mm:ss`. Note the DB `users` table may have changed since the reference was exported, so compare **structure and the specific ids above**, and re-derive the expected active-count with `SELECT COUNT(*) FROM users WHERE active = 1` rather than trusting a stale number.
  - **Red run:** `n/a (no test gate)`
  - **Disqualifier:** if the DB clock's date differs from the reference run date, day values shift uniformly — judge by the relationship between `last_login` and the value (calendar-day difference), not by matching the reference numbers literally; if id 1913 gives `0` on a day when its `last_login` is the previous calendar date, `ULR-P-7`/`ULR-DD-2` is refuted and the design must be revisited.
  - **Consumers:** none.
- **Definition of done:**
  - [ ] User reports the observation (each falsifier item checked) to the session.

### `ULR-T-6` — Live auth check + browser check (handed to the user) [x]

- **Type:** rollout (manual; needs a running server and tokens — **not run by the agent**)
- **Description:** With the server and client running: (a) request the endpoint with no `auth` header, with a valid non-admin token, with a forged token (payload naming an admin id, wrong signature), and with a valid admin token; (b) open User Management as an admin, click the new button, open the downloaded file; (c) look at the toolbar at the default 12px base font.
- **Implements:** `ULR-R-4` (live half), `ULR-AC-5`, `ULR-AC-6`, `ULR-AC-7`, `ULR-AC-8`–`ULR-AC-11` (end to end), performance NFR (observe response time), defect classes D3, D4, D6; premise `ULR-P-6`
- **Files (expected):** none
- **Depends on:** `ULR-T-2`, `ULR-T-4`
- **Blocks:** —
- **Estimate:** S
- **Review:** skip-eligible (no code)
- **Verification:**
  - **Falsifier:** any of: no-token request returns anything but 401; non-admin returns anything but 403 or returns user rows; **forged token returns 200** (this refutes `ULR-P-6` and blocks the release — escalate, do not patch around it); admin response is not 200 with the eight fields; the downloaded workbook shows `Not provided`, `Invalid Date`, or `0` for a never-logged-in user, or a shifted `last_login` time; applying a table filter changes the file's row count; the second button touches or overlaps the first, has no visible focus ring, or does not show a loading/disabled state while pending; the response takes over ~2 s on the test environment.
  - **Red run:** `n/a (no test gate)`
  - **Disqualifier:** if tokens for a non-admin/forged case cannot be produced, the auth check is **not done** — do not mark `ULR-AC-5..7` covered by the metadata unit test. Never paste a real token into the conversation or logs; describe the outcome (status code) only.
  - **Consumers:** none.
- **Definition of done:**
  - [ ] Status codes and observations reported by the user; screenshot/notes for the layout check.

---

## 3. Dependency graph

```
ULR-T-1 ── ULR-T-2 ────────────┐
   └── ULR-T-5 (user, DB)      ├── ULR-T-6 (user, live server + browser)
ULR-T-3 ── ULR-T-4 ────────────┘
```

Parallel-friendly: the server chain (`T-1 → T-2`) and the client chain (`T-3 → T-4`) are independent (contract fixed in `design.md` §4.1) and can be executed in either order or in parallel. `T-5` can run as soon as `T-1` lands; `T-6` needs both chains.

---

## 4. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `ULR-TEST-1` | unit (server, repository SQL text) | `ULR-R-1/2/3/5/9/12`, `ULR-AC-1..4` (shape) | `onecgiar-pr-server/src/api/results/admin-panel/admin-panel.user-last-login.spec.ts` |
| `ULR-TEST-2` | unit (server, service) | `ULR-R-14`, error path | same file |
| `ULR-TEST-3` | unit (server, controller/guard wiring + DI) | `ULR-R-4` (wiring), `ULR-AC-5/6` (wiring), `ULR-R-6` | same file; plus `user.service.spec.ts` rerun for `ULR-AC-12` |
| `ULR-TEST-4` | unit (client, API method) | `ULR-R-7/8` | `onecgiar-pr-client/src/app/shared/services/api/results-api.service.spec.ts` |
| `ULR-TEST-5` | unit (client, component) | `ULR-R-7/8/9/10/11/13`, `ULR-AC-8..12` | `onecgiar-pr-client/src/app/pages/admin-section/pages/user-management/user-management.component.spec.ts` |
| `ULR-MAN-1` | manual (DB) | `ULR-AC-1..4`, D1/D2, `ULR-P-7` | `ULR-T-5` |
| `ULR-MAN-2` | manual (live server) | `ULR-AC-5..7`, D3, `ULR-P-6` | `ULR-T-6` |
| `ULR-MAN-3` | manual (browser + downloaded file) | `ULR-AC-8..11` end to end, D4, D6, performance NFR | `ULR-T-6` |

### Scenario / clause ownership (coverage closes here, not at requirement id)

| Clause | Owner |
|---|---|
| `ULR-AC-1` active only, inactive absent, count | `T-1` (SQL shape) + `T-5` (rows) |
| `ULR-AC-2` calendar-day values 0 / 1 | `T-5` (values) — `T-1` asserts the expression exists |
| `ULR-AC-3` null last login → null fields, sorted last | `T-1` (order/expression) + `T-5` (rows) |
| `ULR-AC-4` tie order by id | `T-1` (order clause) + `T-5` (rows) |
| `ULR-AC-5` no token → 401 | `T-6` (live); `T-2` wiring only |
| `ULR-AC-6` non-admin → 403, no data | `T-2` (guard denies mocked non-admin) + `T-6` (live) |
| `ULR-AC-7` forged token → 401 | `T-6` only (no unit test can see the middleware) |
| `ULR-AC-8` filter-independent, `YYYY-MM-DD HH:mm:ss` text | `T-4` (+ `T-6` end to end) |
| `ULR-AC-9` null → empty cell | `T-4` (mapper) + `T-6` (opened file) |
| `ULR-AC-10` error → message, no file, control re-enabled | `T-4` |
| `ULR-AC-11` disabled + loading, no second request | `T-4` (+ `T-6` visual) |
| `ULR-AC-12` `/auth/*` unchanged, table/export unchanged | `T-2` (grep + `user.service.spec`) + `T-4` (existing specs) |
| `ULR-R-1` "Inactive users MUST NOT appear" | `T-1` (filter asserted) + `T-5` |
| `ULR-R-1` "external and never-logged-in kept" | `T-1` (no `is_cgiar`/last-login filter asserted) + `T-5` |
| `ULR-R-5` only eight fields | `T-1` |
| `ULR-R-6` nothing added to `/auth/*` | `T-2` |
| Performance NFR (p95 < 2 s) | `T-6` (observed, not asserted) |
| Accessibility NFR | `T-4` (button accessible name/disabled attr) + `T-6` (focus ring, visual) |

Server coverage floors (5/20/35/40) and client floors (50/60/60/60) must not drop; new code is fully unit-tested.

---

## 5. Rollout & verification

- [ ] Server and client scoped specs green; lint clean on both packages.
- [ ] `ULR-T-5` and `ULR-T-6` reported by the user (DB values, status codes, downloaded file, layout).
- [ ] Commit(s) only on the user's go-ahead, subject without apostrophes, `$` or quotes.
- [ ] PR: single PR (~330 LOC estimate, under the 400 threshold); if the diff exceeds 400 LOC, split server / client. PR description: what to review first (`T-1` SQL, `T-2` guard wiring), out of scope (pre-existing `/auth/*` exposure).
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] Downstream notice: none (no bilateral/platform-report change); tell admins the new button exists.

## 6. Cleanup & follow-ups

- [ ] Set spec status to `shipped`.
- [ ] Update the local module note `docs/architecture/modules/client-admin-section.md` (local-only, optional).
- [ ] Raise the follow-ups from `requirements.md` §11 / `design.md` §13 with the team (unguarded `/auth/*` user endpoints, role check on `report/users`, `ValidRoleGuard` signature/`active` behavior).

## 7. Roll-back plan

1. Revert the PR (server + client together).
2. No migration, flag or backfill to undo.
3. Verify the User Management page shows only the original "Download .xlsx" button and `GET /api/results/admin-panel/report/users/last-login` returns 404.

---

## Required cross-references

- [`requirements.md`](./requirements.md), [`design.md`](./design.md), [`proposal.md`](./proposal.md)
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`
- `onecgiar-pr-server/CLAUDE.md` §3–4, `onecgiar-pr-client/CLAUDE.md` (commit format, scoped tests)
