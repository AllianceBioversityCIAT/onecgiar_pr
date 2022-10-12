import { retunFormatService } from 'src/shared/extendsGlobalDTO/retunServices.dto';
import { User } from '../entities/user.entity';

export class retunrFormatUser extends retunFormatService {
  public response!: User | {};
}
