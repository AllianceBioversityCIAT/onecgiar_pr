import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';
import { ResultLevel } from '../entities/result_level.entity';

export class returnFormatResultLevel extends returnFormatService {
  public response!: any; //FIXME workaround until we find a better solution
}
