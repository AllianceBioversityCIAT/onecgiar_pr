export class CreateRoleByUserDto {
  public user: number;
  public target!: TargetRoleByUser;
  public role: number;
  public created_by: number;
  public last_updated_by: number;
}

class TargetRoleByUser {
  public initiative_id!: number;
  public action_area_id!: number;
  public center_id!: string;
}
