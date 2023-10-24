import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';

export class returnFormatResultType<T> extends returnFormatService {
  public response: T;
}
