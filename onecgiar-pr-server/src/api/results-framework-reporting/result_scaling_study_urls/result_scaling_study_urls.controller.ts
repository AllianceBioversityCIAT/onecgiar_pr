import { Controller, Get, Post, Patch, Param, Delete } from '@nestjs/common';
import { ResultScalingStudyUrlsService } from './result_scaling_study_urls.service';

@Controller('result-scaling-study-urls')
export class ResultScalingStudyUrlsController {
  constructor(
    private readonly resultScalingStudyUrlsService: ResultScalingStudyUrlsService,
  ) {}

  @Post()
  create() {
    return this.resultScalingStudyUrlsService.create();
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
  update(@Param('id') id: string) {
    return this.resultScalingStudyUrlsService.update(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultScalingStudyUrlsService.remove(+id);
  }
}
