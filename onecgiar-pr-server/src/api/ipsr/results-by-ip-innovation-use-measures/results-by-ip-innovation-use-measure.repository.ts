import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByIpInnovationUseMeasure } from './entities/results-by-ip-innovation-use-measure.entity';

@Injectable()
export class ResultsByIpInnovationUseMeasureRepository extends Repository<ResultsByIpInnovationUseMeasure> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsByIpInnovationUseMeasure, dataSource.createEntityManager());
  }
}
