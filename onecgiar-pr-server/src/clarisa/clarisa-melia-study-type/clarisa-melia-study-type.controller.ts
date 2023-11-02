import { Controller, Get } from '@nestjs/common';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';

@Controller()
export class ClarisaMeliaStudyTypeController {
  constructor(
    private readonly clarisaMeliaStudyTypeService: ClarisaMeliaStudyTypeService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaMeliaStudyTypeService.findAll();
  }
}
