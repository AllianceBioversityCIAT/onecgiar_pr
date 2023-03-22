import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaSdgsService } from './clarisa-sdgs.service';
import { CreateClarisaSdgDto } from './dto/create-clarisa-sdg.dto';
import { UpdateClarisaSdgDto } from './dto/update-clarisa-sdg.dto';

@Controller('clarisa-sdgs')
export class ClarisaSdgsController {
  constructor(private readonly clarisaSdgsService: ClarisaSdgsService) {}

  @Post()
  create(@Body() createClarisaSdgDto: CreateClarisaSdgDto) {
    return this.clarisaSdgsService.create(createClarisaSdgDto);
  }

  @Get()
  findAll() {
    return this.clarisaSdgsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaSdgsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaSdgDto: UpdateClarisaSdgDto) {
    return this.clarisaSdgsService.update(+id, updateClarisaSdgDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaSdgsService.remove(+id);
  }
}
