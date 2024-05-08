import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ResultsCentersService } from './results-centers.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsCentersController {
  constructor(private readonly resultsCentersService: ResultsCentersService) {}

  @Get('get/result/:resultId')
  findREsultCenterByResultId(@Param('resultId') resultId: number) {
    return this.resultsCentersService.findREsultCenterByResultId(resultId);
  }
}
