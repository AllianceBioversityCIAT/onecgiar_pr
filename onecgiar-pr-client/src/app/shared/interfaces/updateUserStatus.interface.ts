export interface UpdateUserStatus {
  email: string;
  activate: true | false;
  entityRoles: EntityRole[];
  role_platform?: number;
}

interface EntityRole {
  id: number;
  role_id?: number;
}
