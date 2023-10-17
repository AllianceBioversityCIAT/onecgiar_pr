import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';
import { Version } from '../../../versioning/entities/version.entity';

export class returnFormatVersion extends returnFormatService {
  public response!: any; //FIXME workaround until we find a better solution
}
