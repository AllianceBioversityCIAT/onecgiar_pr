import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TocLevelService } from './toc-level.service';
import { CreateTocLevelDto } from './dto/create-toc-level.dto';
import { UpdateTocLevelDto } from './dto/update-toc-level.dto';

@Controller('toc-level')
export class TocLevelController {
  constructor(private readonly tocLevelService: TocLevelService) {}

  @Post()
  create(@Body() createTocLevelDto: CreateTocLevelDto) {
    return this.tocLevelService.create(createTocLevelDto);
  }

  @Get()
  findAll() {
    return this.tocLevelService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tocLevelService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTocLevelDto: UpdateTocLevelDto) {
    return this.tocLevelService.update(+id, updateTocLevelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tocLevelService.remove(+id);
  }
}
