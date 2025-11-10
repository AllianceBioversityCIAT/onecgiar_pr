import { Controller, Get, UseInterceptors, Version } from '@nestjs/common';
import { TocLevelService } from './toc-level.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('ToC Levels')
@UseInterceptors(ResponseInterceptor)
export class TocLevelController {
  constructor(private readonly tocLevelService: TocLevelService) {}

  @Get('get/all')
  findAll() {
    return this.tocLevelService.findAll();
  }

  @Version('2')
  @Get('get/all')
  findAllV2() {
    return this.tocLevelService.findAllV2();
  }
}
