import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ResultByLevelService } from './result-by-level.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultByLevelController {
  constructor(private readonly resultByLevelService: ResultByLevelService) {}

  @Get('get/all')
  findAll() {
    return this.resultByLevelService.findAll();
  }
}
