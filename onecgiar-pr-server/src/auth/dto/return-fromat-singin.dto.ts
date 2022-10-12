import { returnFormatService } from 'src/shared/extendsGlobalDTO/returnServices.dto';

export class returnFormatSingin extends returnFormatService {
  public response: returnFormatSinginInterface;
}

interface returnFormatSinginInterface {
  valid: boolean;
  token?: string | null;
  user?: userJwtInterface;
}

interface userJwtInterface {
  id: number;
  user_name: string;
  email: string;
}
