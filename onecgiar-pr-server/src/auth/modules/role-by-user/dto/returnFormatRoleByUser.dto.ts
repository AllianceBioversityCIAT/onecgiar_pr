import { returnFormatService } from 'src/shared/extendsGlobalDTO/returnServices.dto';
import { RoleByUser } from '../entities/role-by-user.entity';
import { ResultRolesDto } from './resultRoles.dto';

export class ReturnFormatRoleByUser extends returnFormatService {
  public response!:
    | RoleByUser
    | ResultRolesDto
    | RoleByUser[]
    | ResultRolesDto[];
}
