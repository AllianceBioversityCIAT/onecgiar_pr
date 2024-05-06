import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { TocLevelService } from './toc-level.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class TocLevelController {
  constructor(private readonly tocLevelService: TocLevelService) {}

  @Get('get/all')
  findAll() {
    return this.tocLevelService.findAll();
  }
}
