import { Module } from '@nestjs/common';
import { AssessedDuringExpertWorkshopService } from './assessed-during-expert-workshop.service';
import { AssessedDuringExpertWorkshopController } from './assessed-during-expert-workshop.controller';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Module({
  controllers: [AssessedDuringExpertWorkshopController],
  providers: [AssessedDuringExpertWorkshopService, ResponseInterceptor],
})
export class AssessedDuringExpertWorkshopModule {}
