import { Result } from '../entities/result.entity';
import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';

export class returnFormatResult extends returnFormatService {
  public response!: Result[] | {};
}
