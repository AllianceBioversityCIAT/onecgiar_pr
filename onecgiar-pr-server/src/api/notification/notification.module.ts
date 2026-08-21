import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationLevelRepository } from './repositories/notification-level.respository';
import { NotificationTypeRepository } from './repositories/notification-type.respository';
import { NotificationRepository } from './repositories/notification.respository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { SocketManagementModule } from '../../shared/microservices/socket-management/socket-management.module';
import { ShareResultRequestModule } from '../results/share-result-request/share-result-request.module';
import { VersioningModule } from '../versioning/versioning.module';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultTaggedNotificationService } from './services/result-tagged-notification.service';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { Result } from '../results/entities/result.entity';
import { ClarisaCenter } from '../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { ClarisaProject } from '../../clarisa/clarisa-projects/entity/clarisa-projects.entity';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationLevelRepository,
    NotificationTypeRepository,
    NotificationRepository,
    UserRepository,
    HandlersError,
    ResultByInitiativesRepository,
    ResultTaggedNotificationService,
    RoleByUserRepository,
  ],
  exports: [NotificationService, ResultTaggedNotificationService],
  imports: [
    SocketManagementModule,
    ShareResultRequestModule,
    VersioningModule,
    // Entity-level registration on purpose: importing the owning feature modules
    // (results, clarisa) from here would risk a cycle back into the services that
    // emit these notifications.
    TypeOrmModule.forFeature([Result, ClarisaCenter, ClarisaProject]),
  ],
})
export class NotificationModule {}
