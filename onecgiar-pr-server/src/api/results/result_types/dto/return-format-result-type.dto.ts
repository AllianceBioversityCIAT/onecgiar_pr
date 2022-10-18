import { ResultType } from '../entities/result_type.entity';
import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';

export class returnFormatResultType extends returnFormatService {
  public response!: ResultType[] | {};
}
