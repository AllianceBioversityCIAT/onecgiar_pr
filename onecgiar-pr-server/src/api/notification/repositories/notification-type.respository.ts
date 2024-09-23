import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { NotificationType } from '../entities/notification_type.entity';

@Injectable()
export class NotificationTypeRepository extends Repository<NotificationType> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NotificationType, dataSource.createEntityManager());
  }
}
