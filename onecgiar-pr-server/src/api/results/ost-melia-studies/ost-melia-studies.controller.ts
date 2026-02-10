import { Controller, Get, Param, UseInterceptors, Version } from '@nestjs/common';
import { OstMeliaStudiesService } from './ost-melia-studies.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('MELIA Studies')
@UseInterceptors(ResponseInterceptor)
export class OstMeliaStudiesController {
  constructor(
    private readonly ostMeliaStudiesService: OstMeliaStudiesService,
  ) { }

  @Get('get/all/result/:resultId')
  getMeliaStudiesFromResultId(@Param('resultId') resultId: number) {
    return this.ostMeliaStudiesService.getMeliaStudiesFromResultId(resultId);
  }

  @Version('2')
  @Get('get/all/toc/:programId')
  getMeliaStudiesFromToC(@Param('programId') programId: string) {
    return this.ostMeliaStudiesService.getMeliaStudiesFromToC(programId);
  }
}
