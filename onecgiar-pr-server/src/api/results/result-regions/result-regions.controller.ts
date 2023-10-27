import { Controller, Post, Body } from '@nestjs/common';
import { ResultRegionsService } from './result-regions.service';
import { CreateResultRegionDto } from './dto/create-result-region.dto';

@Controller('result-regions')
export class ResultRegionsController {
  constructor(private readonly resultRegionsService: ResultRegionsService) {}

  @Post()
  create(@Body() createResultRegionDto: CreateResultRegionDto) {
    return this.resultRegionsService.create(createResultRegionDto);
  }
}
