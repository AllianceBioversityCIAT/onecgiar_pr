import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import { lastValueFrom, map } from 'rxjs';
import { MQAPResultDto } from './dtos/m-qap.dto';
import { AxiosRequestConfig } from 'axios';
import { MQAPBodyDto } from './dtos/m-qap-body.dto';
@Injectable()
export class MQAPService {
  private readonly _logger: Logger = new Logger(MQAPService.name);
  private readonly _mqapUrl: string = env.MQAP_URL;
  constructor(private readonly _httpService: HttpService) {}

  public async getDataFromCGSpaceHandle(
    body: MQAPBodyDto,
  ): Promise<MQAPResultDto> {
    try {
      const requestConfig: AxiosRequestConfig = {
        params: {
          apiKey: env.MQAP_KEY,
        },
      };
      return lastValueFrom(
        this._httpService
          .post(`${this._mqapUrl}`, body, requestConfig)
          .pipe(
            map((resp) => {
              return resp.data;
            }),
          )
          .pipe(
            map((resp) => {
              delete resp['ORCID_Data'];
              return resp as MQAPResultDto;
            }),
          ),
      ).catch((error) => {
        this._logger.error(
          `${error} (for Handle ${body.link}): ${JSON.stringify(
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
