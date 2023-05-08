import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { InnovationPackagingExpert } from '../entities/innovation-packaging-expert.entity';

@Injectable()
export class InnovationPackagingExpertRepository extends Repository<InnovationPackagingExpert> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(InnovationPackagingExpert, dataSource.createEntityManager());
  }
}
