import { retunFormatService } from 'src/shared/extendsGlobalDTO/retunServices.dto';
import { RoleLevel } from '../entities/role-level.entity';

export class retunrFormatRoleLevels extends retunFormatService{
    public response!: RoleLevel | RoleLevel[] | {} ;
}