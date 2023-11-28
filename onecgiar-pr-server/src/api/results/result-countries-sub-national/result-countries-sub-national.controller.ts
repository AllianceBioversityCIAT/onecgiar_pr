import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ResultCountrySubnationalService } from './result-countries-sub-national.service';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultCountrySubnationalController {
  constructor(
    private readonly resultCountrySubnationalService: ResultCountrySubnationalService,
  ) {}

  @Get('get/all')
  async findAll() {
    return await this.resultCountrySubnationalService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.resultCountrySubnationalService.findOne(id);
  }
}
