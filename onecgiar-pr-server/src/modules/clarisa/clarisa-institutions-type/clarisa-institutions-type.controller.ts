import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';
import { CreateClarisaInstitutionsTypeDto } from './dto/create-clarisa-institutions-type.dto';
import { UpdateClarisaInstitutionsTypeDto } from './dto/update-clarisa-institutions-type.dto';

@Controller('clarisa-institutions-type')
export class ClarisaInstitutionsTypeController {
  constructor(private readonly clarisaInstitutionsTypeService: ClarisaInstitutionsTypeService) {}

  @Post()
  create(@Body() createClarisaInstitutionsTypeDto: CreateClarisaInstitutionsTypeDto) {
    return this.clarisaInstitutionsTypeService.create(createClarisaInstitutionsTypeDto);
  }

  @Get()
  findAll() {
    return this.clarisaInstitutionsTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInstitutionsTypeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaInstitutionsTypeDto: UpdateClarisaInstitutionsTypeDto) {
    return this.clarisaInstitutionsTypeService.update(+id, updateClarisaInstitutionsTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInstitutionsTypeService.remove(+id);
  }
}
