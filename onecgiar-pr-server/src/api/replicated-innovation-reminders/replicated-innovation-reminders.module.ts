// @akili-spec changes/replicated-innovation-reminders
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleByUserModule } from '../../auth/modules/role-by-user/role-by-user.module';
import { HandlersError } from '../../shared/handlers/error.utils';
import { EmailNotificationManagementModule } from '../../shared/microservices/email-notification-management/email-notification-management.module';
import { GlobalParameterRepository } from '../global-parameter/repositories/global-parameter.repository';
import { TemplateRepository } from '../platform-report/repositories/template.repository';
import { Version } from '../versioning/entities/version.entity';
import { PendingInnovationRepository } from './repositories/pending-innovation.repository';
import { ReminderCampaignRepository } from './repositories/reminder-campaign.repository';
import { ReminderDispatcher } from './reminder-dispatcher.service';
import { ReplicatedInnovationReminderCron } from './replicated-innovation-reminders.cron';
import { ReplicatedInnovationRemindersController } from './replicated-innovation-reminders.controller';
import { ReplicatedInnovationRemindersService } from './replicated-innovation-reminders.service';

/**
 * `RIR-T-5` — a leaf module (design RIR-DD-5): nothing imports it and it imports no feature module.
 * `RoleByUserModule` supplies the `RoleByUserRepository` that `ValidRoleGuard` needs; the two
 * repositories the dispatcher shares with other modules are provided locally, as
 * `WebhookDispatchModule` does.
 */
@Module({
  imports: [
    RoleByUserModule,
    EmailNotificationManagementModule,
    TypeOrmModule.forFeature([Version]),
  ],
  controllers: [ReplicatedInnovationRemindersController],
  providers: [
    ReplicatedInnovationRemindersService,
    ReminderDispatcher,
    ReplicatedInnovationReminderCron,
    ReminderCampaignRepository,
    PendingInnovationRepository,
    TemplateRepository,
    GlobalParameterRepository,
    HandlersError,
  ],
})
export class ReplicatedInnovationRemindersModule {}
