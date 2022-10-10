import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByEvidence } from './entities/results_by_evidence.entity';

@Injectable()
export class ResultByEvidencesRepository extends Repository<ResultsByEvidence> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
  ) {
    super(ResultsByEvidence, dataSource.createEntityManager());
  }

}