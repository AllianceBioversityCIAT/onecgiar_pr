import { v4 as uuidv4 } from 'uuid';
import { RoleByUser } from '../../auth/modules/role-by-user/entities/role-by-user.entity';
import { User } from '../../auth/modules/user/entities/user.entity';

export class PayloadDto {
  constructor(
    public id: number,
    public first_name: string,
    public last_name: string,
    public roles?: RoleByUser[],
  ) {}
}

export class AccessTokenDto {
  public refresh_token: string;
  constructor(
    public access_token: string,
    public user: User,
  ) {
    this.refresh_token = uuidv4();
  }
}

export class ResponseAccessTokenDto {
  public user: Partial<User>;
  constructor(
    public access_token: string,
    public refresh_token: string,
  ) {}
}

export class ValidJwtResponse {
  public isValid: boolean;
  public user?: Partial<User>;
}
