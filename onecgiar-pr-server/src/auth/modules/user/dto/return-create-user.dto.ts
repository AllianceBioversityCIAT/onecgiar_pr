import { returnFormatService } from 'src/shared/extendsGlobalDTO/returnServices.dto';
import { User } from '../entities/user.entity';

export class returnFormatUser extends returnFormatService {
  public response!: User | User[] | Pick<User, 'id' | 'email'>;
}
