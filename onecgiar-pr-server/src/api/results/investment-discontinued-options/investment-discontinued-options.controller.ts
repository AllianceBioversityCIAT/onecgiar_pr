import { Controller, Get, Param, Query } from '@nestjs/common';
import { InvestmentDiscontinuedOptionsService } from './investment-discontinued-options.service';
import { UseInterceptors } from '@nestjs/common';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class InvestmentDiscontinuedOptionsController {
  constructor(
    private readonly investmentDiscontinuedOptionsService: InvestmentDiscontinuedOptionsService,
  ) {}

  /**
   * `phaseYear` is optional on purpose (P2-3292): without it the endpoint answers
   * exactly what it answered before the phase axis existed, so the IPSR caller and
   * anything else that does not know about phases keeps working untouched.
   */
  @Get('/:resultTypeId')
  findAll(
    @Param('resultTypeId') resultTypeId: number,
    @Query('phaseYear') phaseYear?: string,
  ) {
    const year = phaseYear == null ? undefined : Number(phaseYear);

    return this.investmentDiscontinuedOptionsService.findAll(
      resultTypeId,
      Number.isFinite(year) ? year : undefined,
    );
  }
}
