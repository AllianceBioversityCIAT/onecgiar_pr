import { Controller, Get, Param, HttpException } from '@nestjs/common';
import { OstMeliaStudiesService } from './ost-melia-studies.service';

@Controller()
export class OstMeliaStudiesController {
  constructor(
    private readonly ostMeliaStudiesService: OstMeliaStudiesService,
  ) {}

  @Get('get/all/result/:resultId')
  async getMeliaStudiesFromResultId(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.ostMeliaStudiesService.getMeliaStudiesFromResultId(resultId);
    throw new HttpException({ message, response }, status);
  }
}
