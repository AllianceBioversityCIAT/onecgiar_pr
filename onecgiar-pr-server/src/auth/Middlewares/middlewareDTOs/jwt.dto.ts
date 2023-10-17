import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';
export class returnJwtMiddlewareDto extends returnFormatService {
  public response: any; //FIXME workaround until we find a better solution
}
