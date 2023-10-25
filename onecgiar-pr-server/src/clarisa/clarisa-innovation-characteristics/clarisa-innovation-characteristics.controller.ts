import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';

@Controller()
export class ClarisaInnovationCharacteristicsController {
  constructor(
    private readonly clarisaInnovationCharacteristicsService: ClarisaInnovationCharacteristicsService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaInnovationCharacteristicsService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
