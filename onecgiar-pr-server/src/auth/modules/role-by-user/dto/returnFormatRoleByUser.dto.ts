import { returnFormatService } from 'src/shared/extendsGlobalDTO/returnServices.dto';
import { RoleByUser } from '../entities/role-by-user.entity';
import { resultRolesDto } from './resultRoles.dto';

export class returnFormatRoleByUser extends returnFormatService {
  public response!:
    | RoleByUser
    | resultRolesDto
    | RoleByUser[]
    | resultRolesDto[];
}
