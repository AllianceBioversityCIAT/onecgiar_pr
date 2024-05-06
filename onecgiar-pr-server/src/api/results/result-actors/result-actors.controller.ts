import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ResultActorsService } from './result-actors.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultActorsController {
  constructor(private readonly resultActorsService: ResultActorsService) {}

  @Get('type/all')
  findAll() {
    return this.resultActorsService.findAll();
  }
}
