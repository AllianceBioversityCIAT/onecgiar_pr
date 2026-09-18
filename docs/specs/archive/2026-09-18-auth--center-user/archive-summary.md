# Archive Summary — Center User Role (deferred)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `auth/center-user` |
| Archive date | 2026-09-18 |
| Branch at archive | `qa-development-2026` |
| Default branch pin | `master` |
| Archive run | 1 (manual defer — no active owner) |

## 2. Original Spec Path

`docs/specs/auth/center-user/`

**New path:** `docs/specs/archive/2026-09-18-auth--center-user/`

## 3. Final Status

**Deferred — not shipped as a spec.** Phase 1 tasks remain **TBR** (To Be Reviewed). No AKILI execute cycle was completed. Archive reason: no active owner; bilateral work proceeded without this spec being maintained.

**Partial implementation exists in code** (do not assume the spec reflects production state):

| Area | Evidence |
|---|---|
| Schema | Migration `1783357000400-AddCenterUserRoleAndRoleByUserCenterId` — `role_by_user.center_id` FK |
| Enums | `RoleEnum.CENTER_USER = 9`, `RoleTypeEnum.CENTER` |
| Repository | `RoleByUser.repository.ts` — center-scoped queries, `validationCenterPermissions` |

Phase 2 items (AUTH-T-11/T-12) and several Phase 1 UX/admin tasks were never verified under this spec.

## 4. Jira / Tickets

P2-3096, P2-3098, P2-3099 (Phase 1) · P2-3100+ (Phase 2 deferred in `task.md`)

## 5. Downstream Spec References (historical)

These specs cite `auth/center-user` as context; update links only if those specs are edited again:

- `docs/specs/notifications/bilateral-review-decision/`
- `docs/specs/bilateral/bulk-uploader-handoff/`
- `docs/specs/archive/2026-09-14-changes--cognito-email-otp-login/`
- `docs/specs/archive/2026-08-29-changes--reporting-entry-hub/`

## 6. Resume Path

To revive: copy or reference this archive, re-baseline against live code (migrations + `RoleByUser` already landed), run `/akili-resume auth/center-user` or open a fresh proposal under `docs/specs/auth/` if the module folder is recreated.
