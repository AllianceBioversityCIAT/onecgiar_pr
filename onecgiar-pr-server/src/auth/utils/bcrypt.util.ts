import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BcryptPasswordEncoder {
  public matches(hashedPassword: string, incomingPassword: any): boolean {
    try {
      return bcrypt.compareSync(incomingPassword, hashedPassword);
    } catch (_error) {
      return false;
    }
  }

  public encode(incomingPassword: any): string {
    const salt = bcrypt.genSaltSync(8);
    return bcrypt.hashSync(incomingPassword, salt);
  }
}
