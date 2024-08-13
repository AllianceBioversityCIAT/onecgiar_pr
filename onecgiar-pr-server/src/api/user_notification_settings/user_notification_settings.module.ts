import { Module } from '@nestjs/common';
import { UserNotificationSettingsService } from './user_notification_settings.service';
import { UserNotificationSettingsController } from './user_notification_settings.controller';
import { UserNotificationSettingRepository } from './user_notification_settings.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { UserModule } from '../../auth/modules/user/user.module';
import { ClarisaInitiativesModule } from '../../clarisa/clarisa-initiatives/clarisa-initiatives.module';
import { RoleByUserModule } from '../../auth/modules/role-by-user/role-by-user.module';

@Module({
  controllers: [UserNotificationSettingsController],
  providers: [
    HandlersError,
    UserNotificationSettingsService,
    UserNotificationSettingRepository,
  ],
  imports: [UserModule, ClarisaInitiativesModule, RoleByUserModule],
})
export class UserNotificationSettingsModule {}
