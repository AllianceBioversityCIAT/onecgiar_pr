import { retunFormatService } from '../../../../shared/extendsGlobalDTO/retunServices.dto';
import { Version } from '../entities/version.entity';

export class retunrFormatVersion extends retunFormatService {
  public response!: Version[] | {};
}
