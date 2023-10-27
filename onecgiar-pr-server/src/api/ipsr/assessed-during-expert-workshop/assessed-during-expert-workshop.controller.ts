import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { AssessedDuringExpertWorkshopService } from './assessed-during-expert-workshop.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class AssessedDuringExpertWorkshopController {
  constructor(
    private readonly assessedDuringExpertWorkshopService: AssessedDuringExpertWorkshopService,
  ) {}

  @Get()
  findAll() {
    return this.assessedDuringExpertWorkshopService.findAll();
  }
}
