import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';
import { Version } from '../entities/version.entity';

export class returnFormatVersion extends returnFormatService {
  public response!: Version[] | {};
}
