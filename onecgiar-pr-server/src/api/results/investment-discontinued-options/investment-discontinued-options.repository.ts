import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { InvestmentDiscontinuedOption } from './entities/investment-discontinued-option.entity';

@Injectable()
export class InvestmentDiscontinuedOptionRepository extends Repository<InvestmentDiscontinuedOption> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(InvestmentDiscontinuedOption, dataSource.createEntityManager());
  }
}
