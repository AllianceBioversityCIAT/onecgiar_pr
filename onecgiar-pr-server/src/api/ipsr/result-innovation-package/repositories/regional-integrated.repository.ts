import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { RegionalIntegrated } from '../entities/regional-integrated.entity';

@Injectable()
export class RegionalIntegratedRepository extends Repository<RegionalIntegrated> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(RegionalIntegrated, dataSource.createEntityManager());
  }
}
