import { Module } from '@nestjs/common';
import { AuthMicroserviceService } from './auth-microservice.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [AuthMicroserviceService],
  exports: [AuthMicroserviceService],
})
export class AuthMicroserviceModule {}
