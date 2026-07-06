# Module Spec — Center User Role — Tasks

## Phase 1 — Foundation (P2-3096)

- [x] AUTH-T-1 — SDD spec triplet under `docs/specs/auth/center-user/`
- [ ] AUTH-T-2 — Migration: role level, role id 9, `center_id` column + FK
- [ ] AUTH-T-3 — Entity + enum updates
- [ ] AUTH-T-4 — Repository: `getAllRolesByUser`, `getSpecificRole`, `$_isValidRole`, `validationCenterPermissions`
- [ ] AUTH-T-5 — Service: `allRolesByUser.center[]`
- [ ] AUTH-T-6 — UserService: center assign/remove + ROLES_UPDATE email
- [ ] AUTH-T-7 — Admin modal tabs + PATCH payload
- [ ] AUTH-T-8 — RFR home + header profile centers
- [ ] AUTH-T-9 — RolesService center helpers
- [ ] AUTH-T-10 — Unit tests (server + client)

## Phase 2 — Deferred (P2-3100+)

- [ ] AUTH-T-11 — Bilateral create route + guard using `validationCenterPermissions`
- [ ] AUTH-T-12 — Result edit gates for center-scoped bilateral results

## Verification

```bash
cd onecgiar-pr-server && npm run migration:check && npm run test -- --testPathPattern="user.service|role-by-user"
cd onecgiar-pr-client && npm run test -- --testPathPattern="manage-user-modal|roles.service|result-framework-reporting-home"
```
