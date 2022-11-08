import { returnFormatService } from 'src/shared/extendsGlobalDTO/returnServices.dto';
import { resultRolesDto } from './resultRoles.dto';

export class returnFormatRoleByUser extends returnFormatService {
  public response!: resultRolesDto | {};
}
