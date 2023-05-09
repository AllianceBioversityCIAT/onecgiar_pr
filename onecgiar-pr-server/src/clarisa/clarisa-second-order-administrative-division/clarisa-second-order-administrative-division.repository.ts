import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, IsNull, Repository, TreeRepository } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaSecondOrderAdministrativeDivision } from './entities/clarisa-second-order-administrative-division.entity';
import { lastValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { env } from 'process';
import { OrderAministrativeDivisionDto, geonameResponseDto } from '../../shared/extendsGlobalDTO/order-administrative-division.dto';
import { AxiosResponse } from 'axios';

@Injectable()
export class ClarisaSecondOrderAdministrativeDivisionRepository extends Repository<ClarisaSecondOrderAdministrativeDivision> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
    private readonly _httpService: HttpService
  ) {
    super(ClarisaSecondOrderAdministrativeDivision, dataSource.createEntityManager());
  }

  async getIsoAlpha2AdminCode(isoAlpha2: string, adminCode1: string): Promise<OrderAministrativeDivisionDto[]> {
    const response = await <Promise<geonameResponseDto>>lastValueFrom(
      await this._httpService.get(
        `${env.CLA_URL}/api/second-order-administrative-division/iso-alpha-2/${isoAlpha2}/admin-code-1/${adminCode1}`
      ).pipe(map((resp) => resp.data))
    );
    return response.geonames;
  }

}
