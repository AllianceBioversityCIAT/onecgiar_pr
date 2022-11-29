import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Interface } from 'readline';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly _logger: Logger = new Logger('System');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const result: any | string = exception.getResponse();
    const ip =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    if (status > 300) {
      this._logger.warn(
        `[${request.method}]: ${request.url} status: ${status} - By ${ip}`,
      );
    } else {
      this._logger.verbose(
        `[${request.method}]: ${request.url} status: ${status} - By ${ip}`,
      );
    }

    response.status(status).json({
      response: result?.response ? result.response : {},
      statusCode: status,
      message: result?.message ? result.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

export class ExceptionFormat {
  responses: object;
  message: string;
}
