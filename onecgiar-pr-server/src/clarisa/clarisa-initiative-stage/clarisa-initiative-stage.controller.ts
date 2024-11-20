import { Controller, Get, Param } from '@nestjs/common';
import { ClarisaInitiativeStageService } from './clarisa-initiative-stage.service';

@Controller()
export class ClarisaInitiativeStageController {
  constructor(
    private readonly clarisaInitiativeStageService: ClarisaInitiativeStageService,
  ) {}
  @Get()
  findAll() {
    return this.clarisaInitiativeStageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInitiativeStageService.findOne(+id);
  }
}
