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

  @Post()
  create(
    @Body() createClarisaMeliaStudyTypeDto: CreateClarisaMeliaStudyTypeDto,
  ) {
    return this.clarisaMeliaStudyTypeService.create(
      createClarisaMeliaStudyTypeDto,
    );
  }

  @Get()
  findAll() {
    return this.clarisaMeliaStudyTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaMeliaStudyTypeService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClarisaMeliaStudyTypeDto: UpdateClarisaMeliaStudyTypeDto,
  ) {
    return this.clarisaMeliaStudyTypeService.update(
      +id,
      updateClarisaMeliaStudyTypeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaMeliaStudyTypeService.remove(+id);
  }
}
