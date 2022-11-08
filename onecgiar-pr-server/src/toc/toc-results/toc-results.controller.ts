import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { CreateTocResultDto } from './dto/create-toc-result.dto';
import { UpdateTocResultDto } from './dto/update-toc-result.dto';

@Controller('toc-results')
export class TocResultsController {
  constructor(private readonly tocResultsService: TocResultsService) {}

  @Post()
  create(@Body() createTocResultDto: CreateTocResultDto) {
    return this.tocResultsService.create(createTocResultDto);
  }

  @Get()
  findAll() {
    return this.tocResultsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tocResultsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTocResultDto: UpdateTocResultDto) {
    return this.tocResultsService.update(+id, updateTocResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tocResultsService.remove(+id);
  }
}
