import { HttpStatus } from '@nestjs/common';

export class returnFormatService {
  public response: object;
  public message: string;
  public status: HttpStatus;
}
