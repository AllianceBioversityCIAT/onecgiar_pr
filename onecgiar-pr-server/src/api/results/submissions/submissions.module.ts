import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { submissionRepository } from './submissions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { resultValidationRepository } from '../results-validation-module/results-validation-module.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { IpsrModule } from '../../ipsr/ipsr.module';
import { ResultsInnovationPackagesValidationModuleModule } from '../../ipsr/results-innovation-packages-validation-module/results-innovation-packages-validation-module.module';
import { NotificationModule } from '../../notification/notification.module';
import { UserNotificationSettingsModule } from '../../user-notification-settings/user-notification-settings.module';

@Module({
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    submissionRepository,
    ResultRepository,
    resultValidationRepository,
    RoleByUserRepository,
    HandlersError,
  ],
  exports: [submissionRepository],
  imports: [
    IpsrModule,
    ResultsInnovationPackagesValidationModuleModule,
    NotificationModule,
    UserNotificationSettingsModule,
  ],
})
export class SubmissionsModule {}
