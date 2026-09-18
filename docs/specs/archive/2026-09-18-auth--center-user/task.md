# Module Spec — Center User Role — Tasks

> **Status:** Phase 1 items moved to **TBR** (To Be Reviewed) — assigned to Ángel Jarrín for QA.

## Phase 1 — Foundation (P2-3096)

- [TBR] AUTH-T-1 — SDD spec triplet under `docs/specs/auth/center-user/`
  <!-- EN: requirements.md, design.md, task.md created and linked to P2-3096 / P2-3098 / P2-3099. -->

- [TBR] AUTH-T-2 — Migration: role level, role id 9, `center_id` column + FK
  <!-- EN: Migrations 1783357000400 (schema: role_by_user.center_id FK → clarisa_center.code) and 1783357000401 (seed role_levels Center + role id 9 Center User). Must be run manually: npm run migration:run. -->

- [TBR] AUTH-T-3 — Entity + enum updates
  <!-- EN: RoleTypeEnum.CENTER, RoleEnum.CENTER_USER = 9, ROLE_IDS.CENTER_USER; role-by-user.entity center_id + obj_center relation. -->

- [TBR] AUTH-T-4 — Repository: `getAllRolesByUser`, `getSpecificRole`, `$_isValidRole`, `validationCenterPermissions`
  <!-- EN: RoleByUser.repository includes center_id in queries; admin listing excludes center rows from initiative queries; validationCenterPermissions for center-scoped access. -->

- [TBR] AUTH-T-5 — Service: `allRolesByUser.center[]`
  <!-- EN: role-by-user.service returns center[] alongside initiative/action-area roles in allRolesByUser response. -->

- [TBR] AUTH-T-6 — UserService: center assign/remove + ROLES_UPDATE email
  <!-- EN: create/update user supports center_assignments; diff logic for initiatives vs centers; sendUserRolesUpdatedEmail with new_centers_assigned / revoked_centers. Email HTML template: onecgiar-pr-server/docs/email-templates/email_template_roles_update.html (paste into DB template name email_template_roles_update). -->

- [TBR] AUTH-T-7 — Admin modal tabs + PATCH payload + user list UX
  <!-- EN: manage-user-modal Science Program | Center tabs; auto Center User role; center_assignments on PATCH. User Management list: auth/user/search returns separate entities + centers arrays; table columns Science Programs | Centers with compact chips + View all popover list. -->

- [TBR] AUTH-T-8 — RFR home + header profile centers
  <!-- EN: Result Framework Reporting home "My CGIAR Centers" section with Report button (stub route /result-framework-reporting/center/:centerCode/report). Header profile popover "My Centers" section. -->

- [TBR] AUTH-T-9 — RolesService center helpers
  <!-- EN: getMyCenters(), validateCenterAccess() on client RolesService. -->

- [TBR] AUTH-T-10 — Unit tests (server + client)
  <!-- EN: user.service, RoleByUser.repository, role-by-user.service; manage-user-modal, roles.service, result-framework-reporting-home, user-management specs. -->

## Phase 2 — Deferred (P2-3100+)

- [ ] AUTH-T-11 — Bilateral create route + guard using `validationCenterPermissions`
- [ ] AUTH-T-12 — Result edit gates for center-scoped bilateral results

## QA checklist (for reviewer)

1. Run both migrations on test/staging DB before testing.
2. Admin → User Management → edit user → Center tab: assign one or more centers, save, verify list shows centers column.
3. Log in as assigned user → RFR home shows My CGIAR Centers; profile menu shows My Centers.
4. Change center assignment → user receives ROLES_UPDATE email (after DB template update).
5. Export .xlsx includes Science Programs and Centers columns.

## Verification (dev)

```bash
cd onecgiar-pr-server && npm run migration:check && npm run test -- --testPathPattern="user.service|role-by-user"
cd onecgiar-pr-client && npm run test -- --testPathPattern="manage-user-modal|roles.service|result-framework-reporting-home|user-management"
```
