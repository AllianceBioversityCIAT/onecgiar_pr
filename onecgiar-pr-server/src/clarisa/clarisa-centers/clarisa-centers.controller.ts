import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaCentersService } from './clarisa-centers.service';
import { CreateClarisaCenterDto } from './dto/create-clarisa-center.dto';
import { UpdateClarisaCenterDto } from './dto/update-clarisa-center.dto';

@Controller('clarisa-centers')
export class ClarisaCentersController {
  constructor(private readonly clarisaCentersService: ClarisaCentersService) {}

  @Post()
  create(@Body() createClarisaCenterDto: CreateClarisaCenterDto) {
    return this.clarisaCentersService.create(createClarisaCenterDto);
  }

  @Get()
  findAll() {
    return this.clarisaCentersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaCentersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaCenterDto: UpdateClarisaCenterDto) {
    return this.clarisaCentersService.update(+id, updateClarisaCenterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaCentersService.remove(+id);
  }
}
