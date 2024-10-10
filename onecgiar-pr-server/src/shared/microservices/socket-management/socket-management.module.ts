import { Module } from '@nestjs/common';
import { SocketManagementService } from './socket-management.service';

@Module({
  providers: [SocketManagementService],
  exports: [SocketManagementService],
})
export class SocketManagementModule {}
