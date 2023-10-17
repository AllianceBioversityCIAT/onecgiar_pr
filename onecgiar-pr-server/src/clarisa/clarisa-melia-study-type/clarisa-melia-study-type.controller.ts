import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';
import { CreateClarisaMeliaStudyTypeDto } from './dto/create-clarisa-melia-study-type.dto';
import { UpdateClarisaMeliaStudyTypeDto } from './dto/update-clarisa-melia-study-type.dto';

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
