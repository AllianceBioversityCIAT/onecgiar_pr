import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsIpInstitutionType } from './entities/results-ip-institution-type.entity';

@Injectable()
export class ResultsIpInstitutionTypeRepository extends Repository<ResultsIpInstitutionType> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsIpInstitutionType, dataSource.createEntityManager());
  }
}
