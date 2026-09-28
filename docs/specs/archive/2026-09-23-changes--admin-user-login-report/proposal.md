# Proposal: Admin User Login Report

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/admin-user-login-report` |
| Slug | `admin-user-login-report` — derived from free-text argument ("añadir funcionalidad de un reporte similar a last_login CSV en el admin module user management") |
| Type | Change |
| Approval Mode | gated |
| Parent Spec | none |
| Date | 2026-09-23 |
| Author | Santiago Sanchez (proposal drafted by AKILI) |

## 2. Intent

Give admins a report, inside **Admin > User Management**, showing each user's last login and how many days it has been since that login — matching the shape of the reference export `last_login_20260923_SS.csv` (columns: `id, first_name, last_name, email, is_cgiar, active, last_login, days_since_last_login`), which today is produced manually (ad-hoc SQL/DB export) instead of from the app.

## 3. Problem / Current Behavior

- The `users` table already tracks `last_login` (`onecgiar-pr-server/src/auth/modules/user/entities/user.entity.ts`), updated on every login (`JwtMiddleware`, `AuthService`).
- No existing endpoint exposes it: `GET /auth/get/users_list` and `GET /auth/search` (consumed by `user-management.component.ts`) omit `last_login` from both the repository `SELECT` and the response DTO.
- The only other "user report" surface, `GET /api/results/admin-panel/report/users` (backs `user-report.component.ts`), returns per-initiative role rows (name/email/initiative/role) — it has nothing to do with login activity and also omits `last_login`.
- Result: whoever needs "who hasn't logged in lately" today pulls it by hand from the DB (as the reference CSV shows), instead of from the admin UI.

## 4. Proposed Outcome

An admin on **User Management** can view and export a login-activity report equivalent to the reference CSV, generated from the live `users` table (no manual DB pull), with a computed "days since last login" column, exportable the same way every other admin report is (client-side `.xlsx` via `ExportTablesService.exportExcel`).

## 5. Scope

- Backend: extend the existing `auth/modules/user/` listing path (repository `SELECT` + service mapping + response DTO) to include `last_login`, OR add a small dedicated endpoint (see Approach Options) returning `id, first_name, last_name, email, is_cgiar, active, last_login`. `days_since_last_login` is derived client-side (or server-side) from `last_login`, not stored.
- Frontend: add a login-activity view/table to `pages/admin-section/pages/user-management/` (or a new tab/sub-view alongside it), with an export button reusing `ExportTablesService.exportExcel` — same pattern already used by `user-management.component.ts` and `user-report.component.ts`.
- Include both CGIAR and external accounts (`is_cgiar` flag preserved as a column, not filtered out), and both active/inactive users (`active` flag preserved), matching the reference file, which includes both.

## 6. Non-Goals

- No change to how/when `last_login` is written (JwtMiddleware / AuthService logic untouched).
- No true `text/csv` export mechanism is introduced — the codebase's established "export" pattern is `.xlsx` via `exceljs`, and this proposal follows that convention rather than adding a new one.
- No changes to the unrelated `ad_users` (Active Directory cache) entity/module.
- No new role/permission model — reuses the existing `CheckAdminGuard`-gated `/admin-module/*` route.

## 7. Affected Users, Systems, And Specs

- **Backend:** `onecgiar-pr-server/src/auth/modules/user/` (controller, service, repository, DTOs).
- **Frontend:** `onecgiar-pr-client/src/app/pages/admin-section/pages/user-management/` (and/or `user-report/`), `shared/services/export-tables.service.ts` (reused, not modified).
- **Docs:** `docs/architecture/modules/client-admin-section.md` should be updated once implemented (no server-side `auth`/user module note currently exists to update).
- No other module depends on this data path today (per `client-admin-section.md`, admin-section has no cross-page dependencies beyond `client-shared` + `custom-fields`).

## 8. Visual Reference

- Source: None
- Location: n/a
- Notes: This is an additive column/report on an existing admin table (`user-management`), following the same table + export-button pattern already on screen — no new visual design needed. If the team wants a distinct sub-view instead of adding columns to the existing table, a quick mockup can be generated at `/akili-specify` time.

## 9. Requirement Delta Preview

### ADDED Requirements

- Expose `last_login` (and a computed `days_since_last_login`) for every user via the admin user-listing path.
- Add a UI affordance (column and/or dedicated view) in User Management to see last-login recency per user.
- Allow exporting that view to `.xlsx` via the existing `ExportTablesService.exportExcel`.

### MODIFIED Requirements

- `auth/modules/user/user.repository.ts` `SELECT`s for the listing/search paths gain `last_login`.
- `user-management.component.ts` response mapping/columns gain `last_login` / `days_since_last_login`.

### REMOVED Requirements

- None.

## 10. Approach Options

| Option | Description | Trade-off |
|---|---|---|
| **A. Extend existing listing (`get/users_list` / `search`)** | Add `last_login` to the repository `SELECT` and response DTO already used by `user-management.component.ts`; compute `days_since_last_login` in the component (or a small pipe). | Smallest change; reuses an endpoint already loaded on that page — no new route. Slight risk: response DTO is a shared shape, so an added field must stay optional for other consumers. |
| **B. New dedicated endpoint** (e.g. `GET /auth/get/login-activity` or a report endpoint mirroring `admin-panel`'s `report/users`) | A purpose-built endpoint returning exactly the reference CSV's shape. | Cleaner separation, safer for the existing shared DTO, but adds a new route + service method for what is fundamentally one extra column. |
| **C. Mirror `admin-panel` report pattern with server-side `.xlsx` stream** | New endpoint under `api/results/admin-panel/` returning a binary `.xlsx`, following `excelFullReportByResultCodes`. | Consistent with that module's "report" precedent, but this report is about users/auth, not results — puts it in the wrong module and duplicates the client-side export logic that already exists. |

## 11. Recommended Approach

**Option A**, extending `get/users_list` (or `search`, whichever the User Management table actually calls) to include `last_login`, with `days_since_last_login` computed on the client. It is the smallest safe path: no new route, no new module boundary, reuses the table/export pattern already on the page. If product wants this as a clearly separate "login activity" report rather than extra columns on the existing table, fall back to Option B — that decision should be confirmed with the requester before `/akili-specify`.

## 12. Risks, Dependencies, And Open Questions

- **Open question:** should this be new columns on the existing `user-management` table, or a separate report view/tab (like `user-report` is separate from `user-management` today)? Affects whether Option A or B is chosen.
- **Open question:** does "similar to the CSV" mean an on-screen table with an export button (matching every other admin report), or literally a download-only report? Assumed: on-screen table + `.xlsx` export, consistent with existing conventions.
- Risk: the response DTO/mapping touched by Option A (`getAllUsers()` / `searchUsers()`) is shared by other UI pieces on `user-management.component.ts` — adding a field must not break existing column bindings (additive change only).
- No architecture-note conflicts found; `docs/architecture/modules/client-admin-section.md` has no cross-module dependency that this would break.

## 13. Success Criteria

- Admin User Management shows, per user, `last_login` and `days_since_last_login`, for both CGIAR and external accounts, active and inactive.
- Data is pulled live from the `users` table (no manual DB export needed to reproduce the reference CSV).
- Export button produces an `.xlsx` with the same columns as the reference CSV (`id, first_name, last_name, email, is_cgiar, active, last_login, days_since_last_login`), consistent with the existing `ExportTablesService.exportExcel` pattern.

## 14. Next Step

```text
/akili-specify changes/admin-user-login-report
```
