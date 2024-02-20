import {
  Controller,
  Get,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { InnovationPackagingExpertsService } from './innovation-packaging-experts.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class InnovationPackagingExpertsController {
  constructor(
    private readonly innovationPackagingExpertsService: InnovationPackagingExpertsService,
  ) {}
  @Get('expertises')
  findAllExpertises() {
    return this.innovationPackagingExpertsService.findAllExpertises();
  }
}
