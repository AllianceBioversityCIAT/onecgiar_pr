import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Ipsr } from '../entities/ipsr.entity';

@Injectable()
export class IpsrRepository extends Repository<Ipsr> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Ipsr, dataSource.createEntityManager());
  }
}
