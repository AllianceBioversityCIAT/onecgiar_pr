import { Module } from '@nestjs/common';
import { AuthMicroserviceService } from './auth-microservice.service';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from '../../../auth/modules/user/user.module';

@Module({
  imports: [
    HttpModule,
  ],
  providers: [AuthMicroserviceService],
  exports: [AuthMicroserviceService],
})
export class AuthMicroserviceModule {}
