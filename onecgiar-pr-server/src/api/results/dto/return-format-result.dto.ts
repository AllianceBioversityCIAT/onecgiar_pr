import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';
import { Result } from '../entities/result.entity';

export class returnFormatResult extends returnFormatService {
  public response!: Result;
}
