import { ResultType } from '../entities/result_type.entity';
import { retunFormatService } from '../../../../shared/extendsGlobalDTO/retunServices.dto';

export class retunrFormatResultType extends retunFormatService {
  public response!: ResultType[] | {};
}
