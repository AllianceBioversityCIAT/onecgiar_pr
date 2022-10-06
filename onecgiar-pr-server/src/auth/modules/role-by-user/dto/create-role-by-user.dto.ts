export class CreateRoleByUserDto {
    public user:number;
    public target!:targetRoleByUser;
    public role: number;
    public created_by:number;
    public last_updated_by:number;
}

class targetRoleByUser{
    public initiative_id!: number;
    public action_area_id!: number;
}
