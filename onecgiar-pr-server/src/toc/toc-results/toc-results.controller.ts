import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { CreateTocResultDto } from './dto/create-toc-result.dto';
import { UpdateTocResultDto } from './dto/update-toc-result.dto';

@Controller()
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

  @Get('get/all/result/:resultId/level/:levelId')
  async getTocResultByInitiativeAndLevels(
    @Param('resultId') resultId: number,
    @Param('levelId') levelId: number
    ) {
    const { message, response, status } =
      await this.tocResultsService.findAllByinitiativeId(resultId, levelId);
    throw new HttpException({ message, response }, status);
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
