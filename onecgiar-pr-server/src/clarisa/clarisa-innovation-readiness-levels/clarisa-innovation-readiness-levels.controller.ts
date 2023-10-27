import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';

@Controller()
export class ClarisaInnovationReadinessLevelsController {
  constructor(
    private readonly clarisaInnovationReadinessLevelsService: ClarisaInnovationReadinessLevelsService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaInnovationReadinessLevelsService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
