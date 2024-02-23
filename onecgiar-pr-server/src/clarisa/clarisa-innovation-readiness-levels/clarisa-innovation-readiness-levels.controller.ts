import {
  Controller,
  Get,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaInnovationReadinessLevelsController {
  constructor(
    private readonly clarisaInnovationReadinessLevelsService: ClarisaInnovationReadinessLevelsService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaInnovationReadinessLevelsService.findAll();
  }
}
