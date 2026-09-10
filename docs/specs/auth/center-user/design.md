# Module Spec — Center User Role — Design

## 1. Data model

### New catalog rows

| Table | Row |
|---|---|
| `role_levels` | `Center` |
| `role` | `Center User`, `role_level_id` → Center, `id = 9` |

### `role_by_user` extension

```text
center_id VARCHAR(15) NULL → FK clarisa_center(code)
```

Mutual exclusivity: per row, exactly one of `initiative_id`, `action_area_id`, `center_id` is non-null.

### Enums

- `RoleTypeEnum.CENTER = 'Center'`
- `RoleEnum.CENTER_USER = 9`

---

## 2. API contracts

### GET `/auth/role-by-user/get/user/:id`

Extended response:

```typescript
{
  user_id: number;
  application: RoleRow | null;
  initiative: RoleRow[];
  action_area: RoleRow[];
  center: {
    center_id: string;
    center_name: string;
    center_acronym: string;
    role_id: number;
    role_name: string;
  }[];
}
```

### PATCH user roles (admin)

Extended body:

```typescript
{
  email: string;
  role_assignments?: { entity_id: number; role_id: number }[];
  center_assignments?: { center_id: string }[];
  role_platform?: number;
  first_name?: string;
  last_name?: string;
}
```

---

## 3. Backend modules

| File | Change |
|---|---|
| `role-by-user.entity.ts` | `center_id` + relation to `ClarisaCenter` |
| `RoleByUser.repository.ts` | Queries include `center_id`; `validationCenterPermissions`; `$_isValidRole` CENTER branch |
| `role-by-user.service.ts` | Map `center[]` in `allRolesByUser` |
| `user.service.ts` | `validateAndAssignCenterRoles`, email builders, updateUserRoles diff for centers |
| `role-type.enum.ts` | CENTER, CENTER_USER |

---

## 4. Frontend

| Surface | Change |
|---|---|
| `manage-user-modal` | `p-tabs`: Science Program \| Center; multi center dropdown |
| `result-framework-reporting-home` | Section "My CGIAR Centers" + Report stub link |
| `header-panel` | "My Centers" list |
| `roles.service.ts` | Cache `center[]`; `hasCenterRole()`, `getCenterIds()` |
| `api.service.ts` | Persist centers from roles API |

---

## 5. Email

Extend Handlebars template `email_template_roles_update` with:

- `new_centers_assigned`: `{ center_code, center_name, role_name }[]`
- `revoked_centers`: same shape

---

## 6. Security

- `validationCenterPermissions(userId, centerCode)` used by future bilateral create/edit endpoints.
- Admin assignment endpoints remain behind existing admin auth.
- Aligns with **AC-3** (`docs/prd.md`): server-side enforcement required.
