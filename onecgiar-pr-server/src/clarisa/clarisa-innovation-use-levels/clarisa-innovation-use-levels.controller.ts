import { Controller, Get } from '@nestjs/common';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';

@Controller()
export class ClarisaInnovationUseLevelsController {
  constructor(
    private readonly clarisaInnovationUseLevelsService: ClarisaInnovationUseLevelsService,
  ) {}

  @Get()
  async findAll() {
    return this.clarisaInnovationUseLevelsService.findAll();
  }
}
