import { Module } from '@nestjs/common';
import { SocketManagementModule } from './shared/microservices/socket-management/socket-management.module';

@Module({
  imports: [SocketManagementModule],
  controllers: [],
  providers: [],
})
export class AppMicroserviceModule { }
