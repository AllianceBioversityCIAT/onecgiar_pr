import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, IsNull, Repository, TreeRepository } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';
import { lastValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { env } from 'process';
import {
  OrderAministrativeDivisionDto,
  geonameResponseDto,
} from '../../shared/extendsGlobalDTO/order-administrative-division.dto';
import { AxiosResponse } from 'axios';
import { ClarisaFirstOrderAdministrativeDivision } from './entities/clarisa-first-order-administrative-division.entity';

@Injectable()
export class ClarisaFirstOrderAdministrativeDivisionRepository extends Repository<ClarisaFirstOrderAdministrativeDivision> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
    private readonly _httpService: HttpService,
  ) {
    super(
      ClarisaFirstOrderAdministrativeDivision,
      dataSource.createEntityManager(),
    );
  }

  async getIsoAlpha2(
    isoAlpha2: string,
  ): Promise<OrderAministrativeDivisionDto[]> {
    const response = await (<Promise<geonameResponseDto>>(
      lastValueFrom(
        await this._httpService
          .get(
            `${env.CLA_URL}/api/first-order-administrative-division/iso-alpha-2/${isoAlpha2}`,
          )
          .pipe(map((resp) => resp.data)),
      )
    ));
    return response.geonames;
  }
}
