import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { env } from 'process';
import { lastValueFrom, map } from 'rxjs';

export class ClarisaApiConnection {
  private clarisaHost: string;
  private http: HttpService;
  private logger: Logger = new Logger(ClarisaApiConnection.name);
  private readonly configAuth: AxiosRequestConfig = {
    auth: {
      username: env.CLA_USER,
      password: env.CLA_PASSWORD,
    },
  };
  constructor(http: HttpService) {
    this.clarisaHost = env.CLA_URL + 'api/';
    this.http = http;
  }

  public async post<T, X>(
    path: string,
    data: T,
    additionalConfig?: AxiosRequestConfig,
  ): Promise<X> {
    return lastValueFrom(
      this.http
        .post<X>(
          this.clarisaHost + path,
          data,
          additionalConfig
            ? {
                ...this.configAuth,
                ...additionalConfig,
              }
            : this.configAuth,
        )
        .pipe(
          map(({ data }) => {
            return data;
          }),
        ),
    ).catch((err) => {
      this.logger.error(err);
      return null as unknown as X;
    });
  }

  public async get<T>(
    path: string,
    additionalConfig?: AxiosRequestConfig,
  ): Promise<T> {
    return lastValueFrom(
      this.http
        .get<T>(
          this.clarisaHost + path,
          additionalConfig
            ? {
                ...this.configAuth,
                ...additionalConfig,
              }
            : this.configAuth,
        )
        .pipe(
          map(({ data }) => {
            return data;
          }),
        ),
    ).catch((err) => {
      this.logger.error(err);
      return null as unknown as T;
    });
  }
}
