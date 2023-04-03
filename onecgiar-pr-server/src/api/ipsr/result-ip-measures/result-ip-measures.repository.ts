import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultIpMeasure } from './entities/result-ip-measure.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultIpMeasureRepository extends Repository<ResultIpMeasure> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultIpMeasure, dataSource.createEntityManager());
  }
}
