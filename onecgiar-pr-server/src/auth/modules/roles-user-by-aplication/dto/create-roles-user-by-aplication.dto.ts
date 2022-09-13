import { User } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';
export class CreateRolesUserByAplicationDto {
  user_id: User;
  role_id: number;
  active!: boolean;
}
