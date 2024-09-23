import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserNotificationSetting } from './entities/user-notification-settings.entity';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class UserNotificationSettingRepository extends Repository<UserNotificationSetting> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(UserNotificationSetting, dataSource.createEntityManager());
  }
}
