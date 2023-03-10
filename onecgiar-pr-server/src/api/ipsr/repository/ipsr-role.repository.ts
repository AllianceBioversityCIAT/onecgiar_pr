import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { IpsrRole } from '../entities/ipsr-role.entity';

@Injectable()
export class IpsrRoleRepository extends Repository<IpsrRole> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(IpsrRole, dataSource.createEntityManager());
  }
}
