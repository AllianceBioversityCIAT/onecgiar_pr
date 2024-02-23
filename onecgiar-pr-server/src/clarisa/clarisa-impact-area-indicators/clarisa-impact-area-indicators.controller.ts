import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaImpactAreaIndicatorsController {
  constructor(
    private readonly clarisaImpactAreaIndicatorsService: ClarisaImpactAreaIndicatorsService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaImpactAreaIndicatorsService.findAll();
  }
}
