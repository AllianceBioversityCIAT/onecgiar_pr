import { RoleByUser } from '../entities/role-by-user.entity';

export class CenterRoleRow {
  center_id: string;
  center_name: string;
  center_acronym: string;
  role_id: number;
  role_name: string;
}

export class ResultRolesDto {
  public user_id: number;
  public application: RoleByUser;
  public initiative: RoleByUser[];
  public action_area: RoleByUser[];
  public center: CenterRoleRow[];
}
