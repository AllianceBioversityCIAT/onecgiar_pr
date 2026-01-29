import { Module } from '@nestjs/common';
import { SocketManagementService } from './socket-management.service';
import { SocketManagementController } from './socket-management.controller';
import { SelfApp } from '../../broker/self.app';

@Module({
  controllers: [SocketManagementController],
  providers: [SocketManagementService, SelfApp],
  exports: [SocketManagementService, SelfApp],
})
export class SocketManagementModule { }
