import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Interface } from 'readline';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const result: any | string = exception.getResponse();

    response
      .status(status)
      .json({
        response: result?.response? result.response: {},
        statusCode: status,
        message: result?.message? result.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
  }
}

export class ExceptionFormat{
  responses: object;
  message: string;
}