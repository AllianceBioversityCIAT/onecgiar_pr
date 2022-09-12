/*
https://docs.nestjs.com/exception-filters#custom-exceptions
*/

import { HttpException, HttpStatus } from '@nestjs/common';

export class ErrorException extends HttpException {
  constructor() {
    super('Error', HttpStatus.I_AM_A_TEAPOT);
  }
}
