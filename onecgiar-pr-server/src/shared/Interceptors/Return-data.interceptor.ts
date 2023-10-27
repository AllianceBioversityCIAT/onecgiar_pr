import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly _logger: Logger = new Logger('System');
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const request: Request = ctx.getRequest<Request>();
    const ip = request.socket.remoteAddress;
    return next.handle().pipe(
      map((data: any) => {
        const modifiedData = {
          response: data?.response || {},
          statusCode: (data?.status ? data?.status : data?.statusCode) || 200,
          message: data?.message || 'Unknown message',
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        if (modifiedData.statusCode > 300) {
          this._logger.warn(
            `[${request.method}]: ${request.url} status: ${modifiedData.statusCode} - By ${ip}`,
          );
        } else {
          this._logger.verbose(
            `[${request.method}]: ${request.url} status: ${modifiedData.statusCode} - By ${ip}`,
          );
        }

        response.status(modifiedData.statusCode);
        return modifiedData;
      }),
    );
  }
}
