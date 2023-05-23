import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AssessedDuringExpertWorkshop } from './entities/assessed-during-expert-workshop.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class AssessedDuringExpertWorkshopRepository extends Repository<AssessedDuringExpertWorkshop> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(AssessedDuringExpertWorkshop, dataSource.createEntityManager());
  }
}
