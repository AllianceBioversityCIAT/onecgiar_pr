import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly _logger: Logger = new Logger('System');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception?.statusCode ||
      exception?.status ||
      HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception?.message || exception?.name || 'Internal Server Error';

    const ip =
      request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    if (status > 300) {
      this._logger.warn(
        `[${request.method}]: ${request.url} status: ${status} - By ${ip}`,
      );
      this._logger.error((exception as Error)?.stack || message);
    } else {
      this._logger.verbose(
        `[${request.method}]: ${request.url} status: ${status} - By ${ip}`,
      );
    }

    response.status(status).json({
      response: exception?.response,
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

export class ExceptionFormat {
  responses: object;
  message: string;
}
