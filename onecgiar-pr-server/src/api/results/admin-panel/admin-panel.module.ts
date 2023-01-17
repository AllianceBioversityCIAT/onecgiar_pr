import { Module } from '@nestjs/common';
import { AdminPanelService } from './admin-panel.service';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelRepository } from './admin-panel.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [AdminPanelController],
  providers: [AdminPanelService, AdminPanelRepository, HandlersError],
  exports: [
    AdminPanelRepository
  ]
})
export class AdminPanelModule {}
