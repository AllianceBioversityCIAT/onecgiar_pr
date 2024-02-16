import { HttpStatus, Logger } from '@nestjs/common';
import { ReturnResponseDto } from '../handlers/error.utils';
import { ObjectType } from 'typeorm';

export class ReturnResponseUtil {
  public static format<T>(
    { message, statusCode, response }: ReturnResponseDto<T>,
    customEntity?: ObjectType<T>,
  ): ReturnResponseDto<T> {
    const _logger = new Logger(customEntity?.name || ReturnResponseUtil?.name);

    if (statusCode >= 400) {
      _logger.debug(message);
    }
    return {
      response: response,
      message: message,
      statusCode: statusCode,
    };
  }
}
