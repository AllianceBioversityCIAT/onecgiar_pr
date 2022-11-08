import { RoleByUser } from '../entities/role-by-user.entity';
export class resultRolesDto {
  public user_id: number;
  public application: RoleByUser;
  public initiative: RoleByUser[];
  public action_area: RoleByUser[];
}
