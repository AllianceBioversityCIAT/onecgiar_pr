# Execution Log: Admin User Login Report

## Document Control

- Spec: `changes/admin-user-login-report` (prefix `ULR`)
- Approval Mode: gated
- Started: 2026-09-23
- Roles: Leader (session), Implementer `akili-implementer`, Reviewer `akili-reviewer`

## Task Execution History

### ULR-T-3 — Client: API method + row interface — PASS (2026-09-23)

- Implementer attempts: 1
- Attempt 1
  - Files changed: `onecgiar-pr-client/src/app/shared/services/api/results-api.service.ts`, `results-api.service.spec.ts`, `onecgiar-pr-client/src/app/shared/interfaces/user.interface.ts`
  - Implementer verification: red run before the method existed (1 failed / 305 passed); green `npx jest --silent --reporters=summary --no-coverage --testPathPattern=results-api.service.spec` gave 1 suite passed, 306 tests passed; `npx ng lint --quiet` gave all files pass (whole project).
  - Reviewer verdict: STATUS: PASS. Method and `UserLastLoginRow` match design.md §4.1 and §6.2. The spec asserts exact URL, GET, no params, `urlWithParams === url`, and null body. Naming follows `HTTP_METHOD_descriptiveName`; no `any`; `GET_reportUsers` untouched.
- Requirements covered: `ULR-R-7` (data source), `ULR-R-8` (no filter params sent)
- Decisions: none. Interface named `UserLastLoginRow`; method named `GET_userLastLoginReport`, placed above `GET_reportUsers`.
- Issues: none. `npx eslint <file>` does not work directly in the client (no `eslint.config.js`), so `ng lint` was used.
- Skill selection: `angular-developer` (Leader-selected).
- Forward pointers (carry into the briefs of later tasks):
  - `ULR-T-4` consumes `UserLastLoginRow` and `GET_userLastLoginReport()`.
  - The `{ response: [...] }` envelope is assumed from design.md §4.1. Confirm it in `ULR-T-6`; if it differs, re-specify the interface, do not patch with `any`.
- ADVISORY: none.
- Final verification: scoped Jest green (306 tests), lint clean.

### ULR-T-1 — Server: repository query + service + unit specs — PASS (2026-09-23)

- Implementer attempts: 1
- Attempt 1
  - Files changed (under `onecgiar-pr-server/src/api/results/admin-panel/`): `admin-panel.repository.ts` (`userLastLoginReport()`), `admin-panel.service.ts` (`userLastLoginReport()`), new `admin-panel.user-last-login.spec.ts` (10 tests).
  - Implementer verification: red run failed to compile (methods missing); green `npx jest --silent --reporters=summary --forceExit --testPathPattern=admin-panel.user-last-login` gave 1 suite, 10 tests passed; `npx eslint <3 files> --quiet` exit 0. One mid-run spec failure was a bug in the spec's own column-count helper, fixed; the query was not at fault.
  - Reviewer verdict: STATUS: PASS (full depth). Single join-free query on `users` with the 8 whitelisted columns; `WHERE u.active = 1`; `DATE_FORMAT(... '%Y-%m-%d %H:%i:%s')`; `DATEDIFF(CURDATE(), DATE(u.last_login))` returns NULL for NULL last_login; `ORDER BY u.last_login IS NULL, u.last_login DESC, u.id ASC` is valid MySQL. Entity columns and table name checked against `user.entity.ts`. Service logs the row count only and routes failures through `returnErrorRes`.
- Requirements covered: `ULR-R-1`, `ULR-R-2`, `ULR-R-3`, `ULR-R-5`, `ULR-R-9` (server-side format), `ULR-R-12`, `ULR-R-14`; `ULR-AC-1..4` (SQL shape only).
- Decisions: names `AdminPanelRepository.userLastLoginReport()` and `AdminPanelService.userLastLoginReport()` (no arguments; returns `{ response, message, status }`).
- Skills selected (Leader): `nestjs-expert`, `tdd`.
- ADVISORY (recorded only, not tasks, never gates):
  - RELIABILITY: `users.length` in the log line would throw on a non-array; the catch turns that into a handled error. `users?.length ?? 0` is optional.
  - READABILITY: sibling `userReport` uses `u.active > 0`; the new query uses `u.active = 1` (matches requirement text).
  - READABILITY (tests): `sql.match(/select (.*) from/i)` is greedy and unanchored; it is fine while the query has one `from`.
- Forward pointers:
  - `ULR-T-2`: the controller must call `AdminPanelService.userLastLoginReport()`.
  - `ULR-T-5` (user-run, DB): proves row membership, day counts and null-last order (D1/D2, `ULR-P-7`). Confirm `users.is_cgiar` and `users.active` exist on the real DB.
- Issues: none.
- Final verification: scoped Jest green (10 tests), lint clean. Row correctness is NOT proven here; it is proven only by `ULR-T-5`.

### ULR-T-2 — Server: controller route, guard wiring, module provider — PASS (2026-09-23)

- Implementer attempts: 1
- Attempt 1
  - Files changed (under `onecgiar-pr-server/src/api/results/admin-panel/`): `admin-panel.controller.ts` (`GET report/users/last-login`, `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)` + `@UseGuards(ValidRoleGuard)`, Swagger metadata, delegates to `userLastLoginReport()`), `admin-panel.module.ts` (`RoleByUserRepository` added to providers), `admin-panel.user-last-login.spec.ts` (extended; the ULR-T-1 blocks are intact).
  - Implementer verification: red run failed to compile (controller method missing); green `--testPathPattern="admin-panel.user-last-login|user.service.spec"` gave 3 suites, 64 tests passed; `--testPathPattern=admin-panel` gave 2 suites, 34 passed; `npx eslint` on the 3 files exit 0. No circular import.
  - AC-12 grep: `days_since_last_login` has no match in the `/auth` tree. Bare `last_login` matches only at `user.service.ts:886` (existing select list) and `:1641` (existing write on login); `user.controller.ts` has none; `git status` shows nothing under `src/auth` modified.
  - Reviewer verdict: STATUS: PASS (full depth). The role decorator argument order was checked against `valid-role.guard.ts` and `roles.decorator.ts` (admits only role 1 at APPLICATION level). The Reviewer adjudicated the AC-12 grep as satisfied, since the Falsifier's intent is "no match for the NEW field names". `ULR-AC-6` wiring is behavioral (real guard, mocked repository: denies no-role and GUEST, allows ADMIN).
- Requirements covered: `ULR-R-4` (wiring half), `ULR-R-6`, `ULR-R-11` (server), `ULR-AC-5/6` (wiring half), `ULR-AC-12`.
- Not proven here: `ULR-AC-5` and `ULR-AC-7` (401 for no or forged token) need the live `ULR-T-6` check; no metadata test is offered as their proof. A full DI boot of `AdminPanelModule` needs a live MySQL DataSource and is not possible in a repo spec, so DI evidence is the testing-module resolve plus the provider-metadata assertion; the real boot proof is CI startup and `ULR-T-6`.
- Skills selected (Leader): `nestjs-expert`, `tdd`. Effort: high.
- ADVISORY (recorded only, not tasks, never gates):
  - RELIABILITY: the DI test supplies `RoleByUserRepository` itself, so it would stay green if the module never declared it; the provider-metadata assertion is what covers the wiring.
  - RISK: `AdminPanelModule` already imports `VersioningModule`, which exports `RoleByUserRepository`, so the guard would have resolved without the new provider. The added entry is a second module-local stateless instance, mandated by `ULR-P-1` / design §5. It is not load-bearing.
  - RESILIENCE: `valid-role.guard.ts:36` calls `headerValue.split('.')` with no null check. A request with no `auth` header would 500 instead of 403 if it reached the guard. It is safe only because `JwtMiddleware` on `api/*path` returns 401 first (`ULR-DD-1`); excluding this path from that middleware would change the failure mode.
- Final verification: scoped Jest green, lint clean.

### ULR-T-4 — Client: download method, mapper, button, spec — PASS (2026-09-23)

- Implementer attempts: 1
- Attempt 1
  - Files changed (under `onecgiar-pr-client/src/app/pages/admin-section/pages/user-management/`): `user-management.component.ts` (signal `downloadingLastLogin`, single-flight `downloadLastLoginReport()`), `.html` (second `app-pr-button`, `gap-3` on `.export-button`), `.spec.ts` (new describe with 7 cases).
  - Implementer verification: red run whole file 7 failed / 69 passed; green `npx jest --silent --reporters=summary --no-coverage --testPathPattern=user-management.component.spec` gave 75 passed; `npx ng lint --quiet` clean.
  - Reviewer verdict: STATUS: PASS (checklist depth). Adjudicated: (1) `?? ''` avoids `Not provided` (`export-tables.service.ts:49` uses `??`, `''` is not nullish) and preserves a `0` day count; (2) clearing the flag just before `exportExcel` is acceptable, since the in-flight window is the request; (3) no leakage into the existing table, filters or `user_report` export (only `class="export-button gap-3"` changed on existing markup; the SCSS already sets flex).
- Requirements covered: `ULR-R-7`, `ULR-R-8`, `ULR-R-9`, `ULR-R-10`, `ULR-R-11` (client), `ULR-R-13`; `ULR-AC-8`, `ULR-AC-9`, `ULR-AC-10`, `ULR-AC-11`, `ULR-AC-12` (client half).
- Decisions: alert copy chosen by the Implementer ("Could not download the report" / short retry text); button label "Download last login report (.xlsx)"; loading text "Preparing report...".
- Not proven here (recorded gaps):
  - The written `.xlsx` cell emptiness: exceljs cannot load under this Jest config (ESM `uuid`), so proof stops at the mapper handing `''` to `exportExcel`. Rely on opening the downloaded file in `ULR-T-6`.
  - `app-pr-button` renders a div, so there is no native `disabled` attribute; the spec asserts the component's `disabled`/`loading`/`blocked` state.
  - Focus ring and layout are not measurable in jsdom (D6): `ULR-T-6`.
- Skills selected (Leader): `angular-developer`, `spartan`. Effort: medium.
- ADVISORY (recorded only, not tasks, never gates):
  - RELIABILITY: `exportExcel` is not awaited, so the button re-enables while the workbook is still being built. A double click in that window would issue a second request and produce two files. `ULR-T-6` visual check can judge it.
  - RELIABILITY: `(keydown.enter)` calls `downloadLastLoginReport()` directly, bypassing the button's `blocked` gate. The component flag is the only keyboard-path protection; the neighbouring button has the same pattern.
  - TEST: no fixture row has `days_since_last_login: 0`, so a future `||` regression would still pass. A two-line case would pin it.
- Forward pointers for `ULR-T-6`: confirm the `{ response: [...] }` envelope and open the downloaded file to confirm empty cells for never-logged-in users (no `Not provided`, no `0`) and that `last_login` text is not time-shifted.
- Final verification: scoped Jest green (75 tests, whole file), lint clean.

## User Feedback (2026-09-23)

- After `ULR-T-1..4` PASSed, the user reported informally that the feature "funciona bien" and that they like it.
- This is a general confirmation, not a per-item report. `ULR-T-5` (DB values) and `ULR-T-6` (401/403/forged-token status codes, downloaded file cells, layout) stay open until the user reports each falsifier item.

## Manual verification confirmed by the user (2026-09-23)

- `ULR-T-5` (DB check) and `ULR-T-6` (live auth check + browser check) were confirmed as done by the user when asked at `/akili-archive` readiness ("Confirmo T-5 y T-6 ya").
- The user did not send per-item detail (row counts, ids 1913/71/1936, status codes for no-token, non-admin and forged-token, downloaded-file cells). This log records the confirmation only, not the individual observations.
