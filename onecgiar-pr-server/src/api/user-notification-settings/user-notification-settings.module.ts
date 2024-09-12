import { Module } from '@nestjs/common';
import { UserNotificationSettingsService } from './user-notification-settings.service';
import { UserNotificationSettingsController } from './user-notification-settings.controller';
import { UserNotificationSettingRepository } from './user-notification-settings.repository';
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
  exports: [UserNotificationSettingRepository, UserNotificationSettingsService],
})
export class UserNotificationSettingsModule {}
