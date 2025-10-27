import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultScalingStudyUrlsService } from './result_scaling_study_urls.service';
import { CreateResultScalingStudyUrlDto } from './dto/create-result_scaling_study_url.dto';
import { UpdateResultScalingStudyUrlDto } from './dto/update-result_scaling_study_url.dto';

@Controller('result-scaling-study-urls')
export class ResultScalingStudyUrlsController {
  constructor(private readonly resultScalingStudyUrlsService: ResultScalingStudyUrlsService) {}

  @Post()
  create(@Body() createResultScalingStudyUrlDto: CreateResultScalingStudyUrlDto) {
    return this.resultScalingStudyUrlsService.create(createResultScalingStudyUrlDto);
  }

  @Get()
  findAll() {
    return this.resultScalingStudyUrlsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultScalingStudyUrlsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultScalingStudyUrlDto: UpdateResultScalingStudyUrlDto) {
    return this.resultScalingStudyUrlsService.update(+id, updateResultScalingStudyUrlDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultScalingStudyUrlsService.remove(+id);
  }
}
