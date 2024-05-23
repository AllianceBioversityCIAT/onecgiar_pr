import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ResultStatusService } from './result-status.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultStatusController {
  constructor(private readonly resultStatusService: ResultStatusService) {}

  @Get('all')
  findAll() {
    return this.resultStatusService.findAll();
  }
}
