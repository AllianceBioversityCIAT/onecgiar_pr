import { Controller, Get, Param } from '@nestjs/common';
import { InvestmentDiscontinuedOptionsService } from './investment-discontinued-options.service';
import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class InvestmentDiscontinuedOptionsController {
  constructor(
    private readonly investmentDiscontinuedOptionsService: InvestmentDiscontinuedOptionsService,
  ) {}

  @Get('/:resultTypeId')
  findAll(@Param('resultTypeId') resultTypeId: number) {
    return this.investmentDiscontinuedOptionsService.findAll(resultTypeId);
  }
}
