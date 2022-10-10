import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultByIntitutionsRepository extends Repository<ResultsByInstitution> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
  ) {
    super(ResultsByInstitution, dataSource.createEntityManager());
  }

}