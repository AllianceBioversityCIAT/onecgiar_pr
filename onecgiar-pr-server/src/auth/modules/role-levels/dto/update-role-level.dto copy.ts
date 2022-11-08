import { returnFormatService } from 'src/shared/extendsGlobalDTO/returnServices.dto';
import { RoleLevel } from '../entities/role-level.entity';

export class returnFormatRoleLevels extends returnFormatService {
  public response!: RoleLevel | RoleLevel[] | {};
}
