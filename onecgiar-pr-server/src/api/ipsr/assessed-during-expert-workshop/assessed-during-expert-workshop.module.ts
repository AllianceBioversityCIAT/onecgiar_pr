import { Module } from '@nestjs/common';
import { AssessedDuringExpertWorkshopService } from './assessed-during-expert-workshop.service';
import { AssessedDuringExpertWorkshopController } from './assessed-during-expert-workshop.controller';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { AssessedDuringExpertWorkshopRepository } from './assessed-during-expert-workshop.repository';

@Module({
  controllers: [AssessedDuringExpertWorkshopController],
  providers: [
    AssessedDuringExpertWorkshopService,
    ResponseInterceptor,
    HandlersError,
    AssessedDuringExpertWorkshopRepository,
    ReturnResponse,
  ],
})
export class AssessedDuringExpertWorkshopModule {}
