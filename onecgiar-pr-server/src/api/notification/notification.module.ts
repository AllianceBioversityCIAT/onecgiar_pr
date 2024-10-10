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

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationLevelRepository,
    NotificationTypeRepository,
    NotificationRepository,
    UserRepository,
    HandlersError,
  ],
  exports: [NotificationService],
  imports: [SocketManagementModule, ShareResultRequestModule, VersioningModule],
})
export class NotificationModule {}
