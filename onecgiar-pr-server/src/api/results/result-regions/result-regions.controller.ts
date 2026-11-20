import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { ResultRegionsService } from './result-regions.service';
import { CreateResultRegionDto } from './dto/create-result-region.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { LockedWhileInQa } from '../../../shared/guards/qa-review-lock.guard';

@Controller('result-regions')
@UseInterceptors(ResponseInterceptor)
export class ResultRegionsController {
  constructor(private readonly resultRegionsService: ResultRegionsService) {}

  @LockedWhileInQa({ body: 'result_id' })
  @Post()
  create(@Body() createResultRegionDto: CreateResultRegionDto) {
    return this.resultRegionsService.create(createResultRegionDto);
  }
}
