import { Type, HttpStatus, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class HandlersError {
  private readonly _logger = new Logger(HandlersError.name);

  public returnErrorRes(config: configReturnError): returnErrorDto {
    const { error, debug } = config;
    if (debug) {
      this._logger.error(error);
    }
    return {
      response: error?.response ? error.response : { error: true },
      message: error?.message ? error.message : 'INTERNAL_SERVER_ERROR',
      status: error?.status ? error.status : HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  public returnData(config: configReturnError): returnDataDto {
    const { error, debug } = config;
    if (debug) {
      this._logger.error(error);
    }
    return {
      data: error.response,
      logs: {
        response: error?.response ? error.response : { error: true },
        message: error?.message ? error.message : 'INTERNAL_SERVER_ERROR',
        status: error?.status ? error.status : HttpStatus.INTERNAL_SERVER_ERROR,
      }
    };
  }

  public returnErrorRepository(
    config: configReturnRepositoryError,
  ): returnErrorDto {
    const { error, className, debug } = config;
    if (debug) {
      this._logger.error(error);
    }
    return {
      response: error?.response ? error.response : { error: true },
      message: `[${className}] => error: ${error}`,
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }
}

export class configReturnError {
  error: any;
  debug?: boolean = false;
}

export class configReturnRepositoryError {
  error: any;
  className: string;
  debug?: boolean = false;
}

export class returnErrorDto {
  public response: Type;
  public message: string;
  public status: HttpStatus;
}

export class returnDataDto {
  public data: Type;
  public logs: returnErrorDto;
}

export class ReturnResponseDto<T>{
  public response: T;
  public message: string;
  public statusCode: HttpStatus;
}
