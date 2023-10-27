import { Controller, Get, Param, HttpException } from '@nestjs/common';
import { ResultsCentersService } from './results-centers.service';

@Controller()
export class ResultsCentersController {
  constructor(private readonly resultsCentersService: ResultsCentersService) {}

  @Get('get/result/:resultId')
  async findREsultCenterByResultId(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsCentersService.findREsultCenterByResultId(resultId);
    throw new HttpException({ message, response }, status);
  }
}
