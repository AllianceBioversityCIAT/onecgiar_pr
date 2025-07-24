export interface UpdateUserStatus {
  activate: true | false;
  entityRoles: EntityRole[];
  role_platform?: number;
}

interface EntityRole {
  id: number;
  role_id?: number;
}
