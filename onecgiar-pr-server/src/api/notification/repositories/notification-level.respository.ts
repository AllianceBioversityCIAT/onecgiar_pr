import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { NotificationLevel } from '../entities/notification_level.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class NotificationLevelRepository extends Repository<NotificationLevel> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NotificationLevel, dataSource.createEntityManager());
  }
}
