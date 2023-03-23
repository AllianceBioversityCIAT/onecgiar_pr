import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { Ipsr } from '../../entities/ipsr.entity';
import { ResultIpEoiOutcome } from '../entities/result-ip-eoi-outcome.entity';

@Injectable()
export class ResultIpEoiOutcomeRepository extends Repository<ResultIpEoiOutcome> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpEoiOutcome, dataSource.createEntityManager());
  }
}
