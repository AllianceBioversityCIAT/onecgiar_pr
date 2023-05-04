import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { Expertises } from '../entities/expertises.entity';
import { ResultIpExpertises } from '../entities/result_ip_expertises.entity';

@Injectable()
export class ResultIpExpertisesRepository extends Repository<ResultIpExpertises> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultIpExpertises, dataSource.createEntityManager());
  }
}
