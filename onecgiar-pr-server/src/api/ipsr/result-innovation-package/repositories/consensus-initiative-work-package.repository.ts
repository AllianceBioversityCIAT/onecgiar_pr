import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { consensusInitiativeWorkPackage } from '../entities/consensus-initiative-work-package.entity';

@Injectable()
export class consensusInitiativeWorkPackageRepository extends Repository<consensusInitiativeWorkPackage> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(consensusInitiativeWorkPackage, dataSource.createEntityManager());
  }
}
