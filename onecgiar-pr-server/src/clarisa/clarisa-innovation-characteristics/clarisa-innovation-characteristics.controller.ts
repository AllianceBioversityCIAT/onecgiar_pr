import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaInnovationCharacteristicsController {
  constructor(
    private readonly clarisaInnovationCharacteristicsService: ClarisaInnovationCharacteristicsService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaInnovationCharacteristicsService.findAll();
  }
}
