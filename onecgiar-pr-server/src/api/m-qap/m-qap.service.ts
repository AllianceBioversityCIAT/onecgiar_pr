import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { env } from 'process';
import { lastValueFrom, map } from 'rxjs';
import { MQAPResultDto } from './dtos/m-qap.dto';

@Injectable()
export class MQAPService {
  private readonly _logger: Logger = new Logger(MQAPService.name);
  private readonly _mqapUrl: string = env.MQAP_URL;
  private readonly configAuth = {};
  constructor(private readonly _httpService: HttpService) {}

  public async getDataFromCGSpaceHandle(
    handle: string,
  ): Promise<MQAPResultDto> {
    try {
      return lastValueFrom(
        this._httpService
          .get(`${this._mqapUrl}${handle}`, this.configAuth)
          .pipe(map((resp) => resp.data))
          .pipe(
            map((resp) => {
              delete resp['ORCID_Data'];
              return resp as MQAPResultDto;
            }),
          ),
      );
    } catch (err) {
      this._logger.error(err);
    }
  }
}
