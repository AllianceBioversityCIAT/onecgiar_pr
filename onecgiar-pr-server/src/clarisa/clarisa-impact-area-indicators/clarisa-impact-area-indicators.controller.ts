import { Controller, Get } from '@nestjs/common';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaImpactAreaIndicatorsController {
  constructor(
    private readonly clarisaImpactAreaIndicatorsService: ClarisaImpactAreaIndicatorsService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaImpactAreaIndicatorsService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
