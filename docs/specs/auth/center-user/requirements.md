# Module Spec — Center User Role (AUTH)

## 1. Module / Feature

- **Module:** `auth`
- **Sub-feature:** `center-user`
- **Owner:** Platform admin / PRMS engineering
- **Status:** `in-progress`
- **Ticket(s):** P2-3096, P2-3098, P2-3099

---

## 2. Context

Epic P2-3096 introduces a **Center User** role so CGIAR Center staff can report bilateral (W3) project results in PRMS. Today, `role_by_user` scopes users only to Application, Initiative, or Action Area levels. Center assignment requires a new role level, API shape, admin UI, home/profile surfacing, email notification on assignment, and backend permission checks.

This refines project goals **G2** (structured reporting) and **G4** (role-based access). It implements **AC-3** (backend MUST enforce roles; frontend gates are cosmetic only) from `docs/prd.md`.

References: `docs/detailed-design/detailed-design.md` (Identity: User, Role, RoleByUser), `docs/system-design/design.md` (admin user management, RFR home).

---

## 3. In Scope / Out of Scope

### In scope

- New `Center` role level and `Center User` role (id 9)
- `role_by_user.center_id` FK to `clarisa_center.code`
- Admin tabbed assignment (Science Program + Center)
- `GET role-by-user` response includes `center[]`
- ROLES_UPDATE email includes assigned/revoked centers
- RFR home "My CGIAR Centers" + profile menu "My Centers"
- `validationCenterPermissions` for bilateral center-scoped actions
- Frontend `RolesService` center awareness

### Out of scope

- P2-3100/3101 bilateral result creation form and MDS sections
- P2-3102 AI workflow
- Initiative pooled-funding permission hardening (separate debt)

---

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Platform admin | Assign users to Centers via User Management tab |
| Center User | See assigned centers on home/profile; report bilateral results (P2-3100+) |
| Result submitter (initiative) | Unchanged unless also assigned as Center User |
| PMU / QA | Unchanged in P2-3096 |

---

## 5. User Stories

- **AUTH-US-1** — As a platform admin, I want to assign users to Centers with automatic Center User role, so that they can report bilateral results. (Refines P2-3098)
- **AUTH-US-2** — As a Center User, I want to see my Centers on the RFR home and profile menu, so that I can start reporting. (Refines P2-3099)
- **AUTH-US-3** — As a Center User, I want to receive email when my center role is assigned, so that I know I can access PRMS. (Product decision: extend ROLES_UPDATE)

---

## 6. Functional Requirements

- **AUTH-R-1** — System MUST store center assignments in `role_by_user` with exactly one scope column set (`initiative_id`, `action_area_id`, or `center_id`).
- **AUTH-R-2** — Assigning a Center MUST auto-set role to Center User (id 9); admin MUST NOT pick another role on the Center tab.
- **AUTH-R-3** — `allRolesByUser` MUST return `center[]` with `center_id`, name, acronym, and role metadata.
- **AUTH-R-4** — On role update including centers, system MUST send ROLES_UPDATE email listing new/revoked centers.
- **AUTH-R-5** — Backend MUST expose `validationCenterPermissions(userId, centerCode)` for center-scoped bilateral operations.
- **AUTH-R-6** — RFR home MUST show "My CGIAR Centers" above Science Programs when user has center roles.
- **AUTH-R-7** — Profile dropdown MUST list "My Centers" for users with center roles.

---

## 7. Acceptance Criteria

- **AUTH-AC-1** — Admin saves two centers for one user; DB has two active `role_by_user` rows with `center_id` set and `role = 9`.
- **AUTH-AC-2** — User login succeeds; API roles payload includes both centers.
- **AUTH-AC-3** — ROLES_UPDATE email includes center names/codes for newly assigned centers.
- **AUTH-AC-4** — User without center roles does not see "My CGIAR Centers" section.
- **AUTH-AC-5** — `validationCenterPermissions` returns true only for active Center User on matching `center_id`.

---

## 8. Assumptions & Open Questions

- Center FK uses `clarisa_center.code` (varchar PK).
- Users typically retain Application Guest role alongside Center User.
- External users (`is_cgiar = false`) may be Center Users (same as CGIAR unless product restricts later).
- Report button navigates to stub route until P2-3100 ships.
