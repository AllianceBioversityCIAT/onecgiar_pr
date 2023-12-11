import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { TypeOneReportService } from './type-one-report.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class TypeOneReportController {
  constructor(private readonly typeOneReportService: TypeOneReportService) {}

  @Get('fact-sheet/initiative/:initId')
  getFactSheetByInit(@Param('initId') initId: number) {
    return this.typeOneReportService.getFactSheetByInit(initId);
  }

  @Get('key-result-story/initiative/:initId')
  getKeyResultStoryByInt(
    @Param('initId') initId: number,
    @Query('phase') phase: string,
  ) {
    return this.typeOneReportService.getKeyResultStory(initId, +phase);
  }
}
