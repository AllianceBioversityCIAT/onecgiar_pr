import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultStatus } from './entities/result-status.entity';

@Injectable()
export class ResultStatusRepository extends Repository<ResultStatus> {
  constructor(private dataSource: DataSource) {
    super(ResultStatus, dataSource.createEntityManager());
  }
}
