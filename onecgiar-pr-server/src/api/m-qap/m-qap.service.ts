import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import { lastValueFrom, map } from 'rxjs';
import { MQAPResultDto } from './dtos/m-qap.dto';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class MQAPService {
  private readonly _logger: Logger = new Logger(MQAPService.name);
  private readonly _mqapUrl: string = env.MQAP_URL;
  constructor(private readonly _httpService: HttpService) {}

  public async getDataFromCGSpaceHandle(
    handle: string,
  ): Promise<MQAPResultDto> {
    try {
      const queryParams: AxiosRequestConfig = {
        params: {
          apiKey: env.MQAP_KEY,
          link: handle,
        },
      };
      return lastValueFrom(
        this._httpService
          .get(`${this._mqapUrl}`, queryParams)
          .pipe(map((resp) => resp.data))
          .pipe(
            map((resp) => {
              delete resp['ORCID_Data'];
              return resp as MQAPResultDto;
            }),
          ),
      ).catch((error) => {
        this._logger.error(
          `${error} (for Handle ${handle}): ${JSON.stringify(
            error.response?.data,
          )}`,
        );
        return null;
      });
    } catch (err) {
      this._logger.error(err);
    }
  }
}
