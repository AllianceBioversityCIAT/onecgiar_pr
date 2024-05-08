import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { OstMeliaStudiesService } from './ost-melia-studies.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class OstMeliaStudiesController {
  constructor(
    private readonly ostMeliaStudiesService: OstMeliaStudiesService,
  ) {}

  @Get('get/all/result/:resultId')
  getMeliaStudiesFromResultId(@Param('resultId') resultId: number) {
    return this.ostMeliaStudiesService.getMeliaStudiesFromResultId(resultId);
  }
}
