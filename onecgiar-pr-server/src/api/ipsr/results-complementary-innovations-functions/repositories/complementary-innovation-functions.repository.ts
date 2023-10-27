import { Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { DataSource, Repository } from 'typeorm';
import { ComplementaryInnovationFunctions } from '../entities/complementary-innovation-functions.entity';

@Injectable()
export class ComplementaryInnovationFunctionsRepository extends Repository<ComplementaryInnovationFunctions> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ComplementaryInnovationFunctions, dataSource.createEntityManager());
  }
}
